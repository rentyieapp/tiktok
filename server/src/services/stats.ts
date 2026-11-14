import type { DB } from '../db/index.js';
import type {
  MatchDTO,
  PlayerStatDTO,
  PublisherStatsDTO,
  TeamStatDTO,
} from '../../../shared/types.js';

/**
 * Yayıncı istatistikleri yalnızca verilen game_id üzerinden hesaplanır.
 * Fonksiyona dışarıdan başka bir kullanıcı/oyun kimliği geçilemez.
 */
export function getPublisherStats(db: DB, gameId: string): PublisherStatsDTO {
  const teams = db
    .prepare('SELECT id, name, primary_color, slot FROM teams WHERE game_id = ? ORDER BY slot')
    .all(gameId) as Array<{ id: string; name: string; primary_color: string; slot: number }>;

  const finishedSessions = db
    .prepare(
      `SELECT * FROM game_sessions WHERE game_id = ? AND status = 'finished' ORDER BY started_at DESC`,
    )
    .all(gameId) as Array<{
    id: string;
    round_index: number;
    started_at: string;
    ended_at: string | null;
    winner_team_id: string | null;
    is_draw: number;
    participant_count: number;
    config_snapshot_json: string;
    summary_json: string;
  }>;

  const winsRows = db
    .prepare(
      `SELECT winner_team_id AS team_id, COUNT(*) AS wins FROM game_sessions
       WHERE game_id = ? AND status = 'finished' AND winner_team_id IS NOT NULL
       GROUP BY winner_team_id`,
    )
    .all(gameId) as Array<{ team_id: string; wins: number }>;
  const winsByTeamId = new Map(winsRows.map((row) => [row.team_id, Number(row.wins)]));

  const scoreRows = db
    .prepare(
      `SELECT sp.team_slot AS slot, COALESCE(SUM(sp.score), 0) AS total_score
       FROM session_participants sp
       JOIN game_sessions s ON s.id = sp.session_id
       WHERE s.game_id = ? AND s.status = 'finished'
       GROUP BY sp.team_slot`,
    )
    .all(gameId) as Array<{ slot: number; total_score: number }>;
  const scoreBySlot = new Map(scoreRows.map((row) => [row.slot, Number(row.total_score)]));

  // Her maçta tüm takımlar sahadadır; oynanan maç sayısı oturumun takım
  // anlık görüntüsünden (config_snapshot_json) hesaplanır.
  const playedBySlot = new Map<number, number>();
  const drawsBySlot = new Map<number, number>();
  for (const session of finishedSessions) {
    let snapshotTeams: Array<{ slot?: number }> = [];
    try {
      const snapshot = JSON.parse(session.config_snapshot_json) as { teams?: Array<{ slot?: number }> };
      snapshotTeams = Array.isArray(snapshot.teams) ? snapshot.teams : [];
    } catch {
      snapshotTeams = [];
    }
    const slots = snapshotTeams.length
      ? snapshotTeams.map((team) => Number(team.slot)).filter((slot) => Number.isFinite(slot))
      : teams.map((team) => team.slot);
    for (const slot of slots) {
      playedBySlot.set(slot, (playedBySlot.get(slot) ?? 0) + 1);
      if (session.is_draw === 1) {
        drawsBySlot.set(slot, (drawsBySlot.get(slot) ?? 0) + 1);
      }
    }
  }

  const teamStats: TeamStatDTO[] = teams.map((team) => {
    const wins = winsByTeamId.get(team.id) ?? 0;
    const played = playedBySlot.get(team.slot) ?? 0;
    const draws = drawsBySlot.get(team.slot) ?? 0;
    return {
      teamId: team.id,
      name: team.name,
      color: team.primary_color,
      wins,
      losses: Math.max(0, played - wins - draws),
      played,
      totalScore: scoreBySlot.get(team.slot) ?? 0,
    };
  });

  const sortedTeams = [...teamStats].sort((a, b) => b.wins - a.wins || b.played - a.played);
  const topTeam = sortedTeams[0] && sortedTeams[0].wins > 0 ? sortedTeams[0] : null;

  const topPlayersRows = db
    .prepare(
      `SELECT p.id, p.display_name, p.score, p.team_id,
              t.name AS team_name, t.primary_color AS team_color,
              (SELECT COUNT(DISTINCT sp.session_id) FROM session_participants sp WHERE sp.player_id = p.id) AS matches
       FROM players p
       LEFT JOIN teams t ON t.id = p.team_id
       WHERE p.game_id = ?
       ORDER BY p.score DESC, p.updated_at DESC
       LIMIT 10`,
    )
    .all(gameId) as Array<{
    id: string;
    display_name: string;
    score: number;
    team_id: string | null;
    team_name: string | null;
    team_color: string | null;
    matches: number;
  }>;

  const topPlayers: PlayerStatDTO[] = topPlayersRows.map((row) => ({
    id: row.id,
    name: row.display_name,
    teamName: row.team_name ?? '—',
    teamColor: row.team_color ?? '#64748b',
    score: Number(row.score),
    matches: Number(row.matches),
  }));

  const bestScoreRows = db
    .prepare(
      `SELECT sp.player_id, sp.score, sp.team_name, sp.team_color, p.display_name
       FROM session_participants sp
       JOIN players p ON p.id = sp.player_id
       JOIN game_sessions s ON s.id = sp.session_id
       WHERE s.game_id = ? AND s.status = 'finished'
       ORDER BY sp.score DESC LIMIT 10`,
    )
    .all(gameId) as Array<{
    player_id: string;
    score: number;
    team_name: string;
    team_color: string;
    display_name: string;
  }>;

  const seen = new Set<string>();
  const highestScores: PlayerStatDTO[] = [];
  for (const row of bestScoreRows) {
    if (seen.has(row.player_id)) continue;
    seen.add(row.player_id);
    highestScores.push({
      id: row.player_id,
      name: row.display_name,
      teamName: row.team_name || '—',
      teamColor: row.team_color || '#64748b',
      score: Number(row.score),
      matches: 1,
    });
  }

  const winnerNames = new Map(teams.map((team) => [team.id, team.name]));
  const winnerColors = new Map(teams.map((team) => [team.id, team.primary_color]));
  const recentMatches: MatchDTO[] = finishedSessions.slice(0, 10).map((session) => {
    let summary: { winnerName?: string | null; winnerColor?: string | null } = {};
    try {
      summary = JSON.parse(session.summary_json) as typeof summary;
    } catch {
      summary = {};
    }
    const winnerName = session.winner_team_id
      ? winnerNames.get(session.winner_team_id) ?? summary.winnerName ?? null
      : summary.winnerName ?? null;
    const winnerColor = session.winner_team_id
      ? winnerColors.get(session.winner_team_id) ?? summary.winnerColor ?? null
      : summary.winnerColor ?? null;
    const started = Date.parse(session.started_at);
    const ended = session.ended_at ? Date.parse(session.ended_at) : NaN;
    const durationSec = Number.isFinite(started) && Number.isFinite(ended)
      ? Math.max(0, Math.round((ended - started) / 1000))
      : 0;
    return {
      id: session.id,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      winnerTeamName: winnerName,
      winnerColor,
      isDraw: session.is_draw === 1,
      participantCount: session.participant_count,
      durationSec,
    };
  });

  const totalMatches = finishedSessions.length;
  const totalPlayers = finishedSessions.reduce((sum, session) => sum + session.participant_count, 0);
  const uniquePlayersRow = db
    .prepare('SELECT COUNT(*) AS count FROM players WHERE game_id = ?')
    .get(gameId) as { count: number };

  return {
    totalMatches,
    totalPlayers,
    totalUniquePlayers: Number(uniquePlayersRow.count),
    averageParticipants: totalMatches > 0 ? Number((totalPlayers / totalMatches).toFixed(1)) : 0,
    topTeam,
    topPlayers,
    highestScores,
    recentMatches,
    teamStats,
    lastMatchAt: finishedSessions[0]?.started_at ?? null,
  };
}
