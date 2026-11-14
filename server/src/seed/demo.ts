import type { AppConfig } from '../config.js';
import { nowIso, type DB } from '../db/index.js';
import {
  addConfigVersion,
  createGameTx,
  createPayment,
  createSubscription,
  createUser,
  findGameByUserId,
  findPackageByCode,
  findUserByEmail,
  upsertParticipant,
  upsertPlayer,
  type GameRow,
  type PlayerRow,
  type TeamRow,
} from '../db/repo.js';
import { hashPassword } from '../lib/password.js';
import { randomId, randomToken } from '../lib/tokens.js';
import { canonicalCommand } from '../../../shared/commands.js';
import { composePublicSlug, makeDefaultTeams, slugifyBase } from '../../../shared/defaults.js';
import { DEFAULT_SETTINGS } from '../../../shared/defaults.js';
import type { TeamConfig } from '../../../shared/types.js';

const DEMO_EMAIL = 'yayinci@demo.com';
const DEMO_PASSWORD = 'Demo1234';

/**
 * Geliştirme/demo ortamı için örnek yayıncı, paket, oyun ve geçmiş maçlar.
 * Idempotenttir: zaten varsa yeni kayıt oluşturmaz.
 */
export async function runDemoSeed({ db, config }: { db: DB; config: AppConfig }): Promise<{
  created: boolean;
  email: string;
  password: string;
  slug: string | null;
}> {
  const existing = findUserByEmail(db, DEMO_EMAIL);
  if (existing) {
    const game = findGameByUserId(db, existing.id);
    return {
      created: false,
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      slug: game?.public_slug ?? null,
    };
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const now = nowIso();
  const user = createUser(db, {
    id: randomId('usr'),
    email: DEMO_EMAIL,
    passwordHash,
    displayName: 'Ahmet Yılmaz',
    now,
  });
  const pkg = findPackageByCode(db, 'pro');
  if (!pkg) throw new Error('Demo paketi (pro) bulunamadı. Paketler seed edilmemiş.');

  const paymentId = randomId('pay');
  createPayment(db, {
    id: paymentId,
    user_id: user.id,
    package_id: pkg.id,
    provider: 'test',
    provider_transaction_id: `txn_demo_${randomToken(8)}`,
    provider_checkout_id: `testco_demo_${randomToken(6)}`,
    amount_cents: pkg.price_cents,
    currency: pkg.currency,
    status: 'succeeded',
    idempotency_key: `demo:${paymentId}`,
    metadata_json: JSON.stringify({ demo: true }),
    created_at: now,
    updated_at: now,
  });
  createSubscription(db, {
    id: randomId('sub'),
    userId: user.id,
    packageId: pkg.id,
    paymentId,
    startsAt: now,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  });

  const gameId = randomId('game');
  const slug = composePublicSlug(slugifyBase("Ahmet'in Taraftar Savaşı"), randomToken(10));
  const baseTeams = makeDefaultTeams(4, 'tr');
  const nowValue = nowIso();
  const game: GameRow = {
    id: gameId,
    user_id: user.id,
    public_slug: slug,
    game_name: "Ahmet'in Taraftar Savaşı",
    language: 'tr',
    team_count: 4,
    settings_json: JSON.stringify(DEFAULT_SETTINGS),
    command_overrides_json: '{}',
    status: 'ready',
    live_enabled: 1,
    wizard_completed: 1,
    config_version: 1,
    active_session_id: null,
    created_at: nowValue,
    updated_at: nowValue,
  };
  const teamRows: TeamRow[] = baseTeams.map((team: TeamConfig) => ({
    id: randomId('team'),
    game_id: gameId,
    slot: team.slot,
    name: team.name,
    primary_color: team.primaryColor,
    secondary_color: team.secondaryColor,
    emblem_url: null,
    symbol: team.symbol,
    soldier_look: team.soldierLook,
    castle_look: team.castleLook,
    join_command: team.joinCommand,
    join_command_norm: canonicalCommand(team.joinCommand),
    description: team.description,
    configuration_json: JSON.stringify({ soldierLook: team.soldierLook, castleLook: team.castleLook }),
    created_at: nowValue,
    updated_at: nowValue,
  }));
  createGameTx(db, game, teamRows);
  addConfigVersion(db, {
    id: randomId('ver'),
    gameId,
    version: 1,
    reason: 'demo',
    snapshotJson: JSON.stringify({
      gameName: game.game_name,
      language: game.language,
      teamCount: game.team_count,
      settings: DEFAULT_SETTINGS,
      teams: baseTeams,
      configVersion: 1,
    }),
    now: nowValue,
  });

  const demoViewers = [
    { externalId: 'demo_viewer_ali', name: 'Ali Veli', teamIndex: 0, score: 320 },
    { externalId: 'demo_viewer_ayse', name: 'Ayşe K.', teamIndex: 0, score: 280 },
    { externalId: 'demo_viewer_mehmet', name: 'Mehmet D.', teamIndex: 1, score: 260 },
    { externalId: 'demo_viewer_zeynep', name: 'Zeynep T.', teamIndex: 1, score: 240 },
    { externalId: 'demo_viewer_can', name: 'Can B.', teamIndex: 2, score: 180 },
    { externalId: 'demo_viewer_elif', name: 'Elif S.', teamIndex: 3, score: 150 },
  ];

  const playerRows: PlayerRow[] = [];
  db.transaction(() => {
    for (const viewer of demoViewers) {
      const team = teamRows[viewer.teamIndex];
      const row = upsertPlayer(db, {
        id: randomId('plr'),
        gameId,
        externalId: viewer.externalId,
        displayName: viewer.name,
        teamId: team?.id ?? null,
        now: nowValue,
      });
      db.prepare('UPDATE players SET score = ? WHERE id = ?').run(viewer.score, row.id);
      playerRows.push({ ...row, score: viewer.score });
    }

    const sessions = [
      { daysAgo: 8, winnerIndex: 0, scores: [170, 140, 60, 40], players: 6 },
      { daysAgo: 5, winnerIndex: 1, scores: [90, 210, 80, 50], players: 6 },
      { daysAgo: 2, winnerIndex: 0, scores: [180, 120, 90, 30], players: 6 },
    ];
    for (const session of sessions) {
      const sessionId = randomId('sess');
      const started = new Date(Date.now() - session.daysAgo * 24 * 60 * 60 * 1000);
      const ended = new Date(started.getTime() + 90_000);
      const winnerTeam = teamRows[session.winnerIndex];
      db.prepare(
        `INSERT INTO game_sessions (
          id, game_id, status, round_index, started_at, ended_at, winner_team_id, is_draw,
          end_reason, participant_count, config_version, config_snapshot_json, summary_json, created_at
        ) VALUES (?, ?, 'finished', 1, ?, ?, ?, 0, 'time', ?, 1, ?, ?, ?)`,
      ).run(
        sessionId,
        gameId,
        started.toISOString(),
        ended.toISOString(),
        winnerTeam?.id ?? null,
        session.players,
        JSON.stringify({ teams: teamRows.map((team) => ({ name: team.name, slot: team.slot })) }),
        JSON.stringify({
          winnerName: winnerTeam?.name ?? null,
          winnerColor: winnerTeam?.primary_color ?? null,
          isDraw: false,
          endReason: 'time',
        }),
        started.toISOString(),
      );
      demoViewers.forEach((viewer, index) => {
        const team = teamRows[viewer.teamIndex];
        const player = playerRows[index];
        const teamScore = session.scores[viewer.teamIndex] ?? 0;
        upsertParticipant(db, {
          session_id: sessionId,
          player_id: player.id,
          team_id: team?.id ?? null,
          team_slot: team?.slot ?? 0,
          team_name: team?.name ?? '',
          team_color: team?.primary_color ?? '#64748b',
          score: teamScore + (index % 3) * 5,
        });
      });
    }
  })();

  return { created: true, email: DEMO_EMAIL, password: DEMO_PASSWORD, slug };
}
