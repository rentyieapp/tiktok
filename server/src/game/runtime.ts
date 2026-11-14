import type { WebSocket } from 'ws';
import type { AppConfig } from '../config.js';
import { nowIso, type DB } from '../db/index.js';
import {
  abandonSessionRow,
  addPlayerCumulativeScore,
  createGameSession,
  findGameById,
  findGameBySlug,
  finishSessionRow,
  insertGameEvent,
  listTeams,
  setActiveSession,
  updateSessionProgress,
  upsertParticipant,
  upsertPlayer,
  type GameRow,
  type TeamRow,
} from '../db/repo.js';
import {
  applyCommand,
  applyLiveEvent,
  createBattleState,
  finishRound,
  hydratePlayers,
  resetToLobby,
  startRound,
  tickBattle,
  toBattleStateView,
  type BattleState,
  type CommandOutcome,
} from '../../../shared/battle.js';
import { findTeamByToken } from '../../../shared/commands.js';
import { clampSettings } from '../../../shared/defaults.js';
import type {
  BattleStateView,
  GameSettings,
  Locale,
  SystemCommand,
  WsNoticeCode,
  WsServerMessage,
} from '../../../shared/types.js';
import type { SystemOverrideMap } from '../../../shared/commands.js';
import { parseOverrides, rowToTeam, safeJson } from './mappers.js';
import { randomId } from '../lib/tokens.js';
import type { LiveEventPayload } from '../live/provider.js';

interface RuntimeLogger {
  info: (message: string) => void;
  error: (message: string) => void;
}

interface SocketMeta {
  externalId: string | null;
  displayName: string | null;
  messageTimes: number[];
  warnedSlow: boolean;
}

interface Room {
  gameId: string;
  slug: string;
  state: BattleState;
  clients: Map<WebSocket, SocketMeta>;
  timer: NodeJS.Timeout | null;
  lastBroadcastAt: number;
  finishedAt: number | null;
  finalizedSessionId: string | null;
  pendingConfigReload: boolean;
  autoStartPaused: boolean;
  playerRowIds: Map<string, string>;
}

export interface LiveIngestResult {
  accepted: boolean;
  duplicate: boolean;
  applied: boolean;
  reason: string;
  feedKind?: string;
}

const MAX_CLIENTS_PER_GAME = 250;
const TICK_MS = 250;

export class GameRuntime {
  private rooms = new Map<string, Room>();

  constructor(
    private readonly db: DB,
    private readonly config: AppConfig,
    private readonly logger: RuntimeLogger = console,
  ) {}

  isRunning(gameId: string): boolean {
    return this.rooms.get(gameId)?.state.phase === 'running';
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getStateView(gameId: string): BattleStateView | null {
    const room = this.rooms.get(gameId);
    if (!room) return null;
    room.state.now = Date.now();
    return toBattleStateView(room.state);
  }

  getLiveSummary(gameId: string): Record<string, unknown> | null {
    const room = this.rooms.get(gameId);
    if (!room) return null;
    return {
      phase: room.state.phase,
      roundIndex: room.state.roundIndex,
      players: room.state.players.filter((player) => player.teamSlot > 0).length,
      viewers: room.clients.size,
      endsAt: room.state.endsAt,
      lobbyStartsAt: room.state.lobbyStartsAt,
    };
  }

  private buildState(row: GameRow): BattleState {
    const teamRows = listTeams(this.db, row.id);
    const settings = clampSettings(safeJson<Partial<GameSettings>>(row.settings_json, {}));
    return createBattleState({
      gameId: row.id,
      gameName: row.game_name,
      publicSlug: row.public_slug,
      locale: row.language as Locale,
      teams: teamRows.map((team) => rowToTeam(team)),
      settings,
      commandOverrides: parseOverrides(row.command_overrides_json),
      seed: Date.now() ^ Math.floor(Math.random() * 0xffffffff),
    });
  }

  private ensureRoom(game: GameRow): Room {
    const existing = this.rooms.get(game.id);
    if (existing) return existing;
    const room: Room = {
      gameId: game.id,
      slug: game.public_slug,
      state: this.buildState(game),
      clients: new Map(),
      timer: null,
      lastBroadcastAt: 0,
      finishedAt: null,
      finalizedSessionId: null,
      pendingConfigReload: false,
      autoStartPaused: false,
      playerRowIds: new Map(),
    };
    this.rooms.set(game.id, room);
    return room;
  }

  private getRoomOrThrow(gameId: string): Room {
    const room = this.rooms.get(gameId);
    if (!room) throw new Error('Canlı oyun odası bulunamadı.');
    return room;
  }

  /** Kaydedilen ayarları (maç yoksa) canlı odaya uygular. */
  refreshGame(gameId: string): void {
    const room = this.rooms.get(gameId);
    if (!room) return;
    if (room.state.phase !== 'lobby') {
      room.pendingConfigReload = true;
      return;
    }
    this.applyLatestConfig(room);
    this.broadcast(room, true);
  }

  private applyLatestConfig(room: Room, preservePlayers = true): void {
    const row = findGameById(this.db, room.gameId);
    if (!row) return;
    const previousPlayers = preservePlayers
      ? room.state.players.map((player) => ({
          externalId: player.id,
          displayName: player.name,
          teamSlot: player.teamSlot,
          score: 0,
        }))
      : [];
    const next = this.buildState(row);
    const validSlots = new Set(next.teams.map((team) => team.slot));
    hydratePlayers(
      next,
      previousPlayers.map((player) => ({
        ...player,
        teamSlot: validSlots.has(player.teamSlot) ? player.teamSlot : 0,
      })),
    );
    room.state = next;
    room.slug = row.public_slug;
    room.pendingConfigReload = false;
  }

  disableGame(gameId: string): void {
    const room = this.rooms.get(gameId);
    if (!room) return;
    if (room.state.phase === 'running') {
      finishRound(room.state, Date.now(), 'manual');
      this.finalizeSession(room);
    }
    for (const [socket] of room.clients) {
      try {
        socket.close(4004, 'Live link disabled');
      } catch {
        /* yoksay */
      }
    }
    this.stopTicker(room);
    this.rooms.delete(gameId);
  }

  attachClient(game: GameRow, socket: WebSocket): void {
    const room = this.ensureRoom(game);
    if (room.clients.size >= MAX_CLIENTS_PER_GAME) {
      socket.close(4008, 'Too many viewers');
      return;
    }
    const meta: SocketMeta = {
      externalId: null,
      displayName: null,
      messageTimes: [],
      warnedSlow: false,
    };
    room.clients.set(socket, meta);
    this.send(socket, { type: 'hello', serverTime: Date.now() });
    room.state.now = Date.now();
    this.send(socket, { type: 'state', state: toBattleStateView(room.state), serverTime: Date.now() });

    socket.on('message', (raw) => {
      try {
        const text = raw.toString();
        if (text.length > 4096) {
          this.send(socket, { type: 'error', error: 'Mesaj çok uzun.' });
          return;
        }
        this.handleSocketMessage(room, socket, meta, text);
      } catch (error) {
        this.logger.error(`WebSocket mesajı işlenemedi: ${String(error)}`);
      }
    });

    socket.on('close', () => {
      room.clients.delete(socket);
      if (room.clients.size === 0 && room.state.phase !== 'running') this.stopTicker(room);
    });

    socket.on('error', (error: Error) => {
      this.logger.error(`WebSocket hatası: ${error.message}`);
      room.clients.delete(socket);
    });

    this.ensureTicker(room);
    this.broadcast(room, false);
  }

  private handleSocketMessage(
    room: Room,
    socket: WebSocket,
    meta: SocketMeta,
    text: string,
  ): void {
    const now = Date.now();
    meta.messageTimes = meta.messageTimes.filter((time) => now - time < 3000);
    if (meta.messageTimes.length >= 12) {
      if (!meta.warnedSlow) {
        meta.warnedSlow = true;
        this.send(socket, {
          type: 'notice',
          notice: {
            code: 'RATE_LIMITED',
            message: 'Çok fazla mesaj gönderiyorsun. Lütfen biraz bekle.',
          },
        });
      }
      return;
    }
    meta.messageTimes.push(now);

    let parsed: { type?: string; externalId?: string; displayName?: string; text?: string; msgId?: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      this.send(socket, { type: 'error', error: 'Geçersiz mesaj formatı.' });
      return;
    }

    if (parsed.type === 'ping') {
      this.send(socket, { type: 'pong', serverTime: now });
      return;
    }

    if (parsed.type === 'viewer') {
      const externalId = String(parsed.externalId ?? '');
      const displayName = this.cleanName(String(parsed.displayName ?? ''));
      if (!/^[A-Za-z0-9_-]{8,64}$/.test(externalId)) {
        this.send(socket, { type: 'error', error: 'Geçersiz izleyici kimliği.' });
        return;
      }
      meta.externalId = externalId;
      meta.displayName = displayName || 'İzleyici';
      this.send(socket, { type: 'hello', serverTime: now });
      return;
    }

    if (parsed.type === 'chat') {
      if (!this.config.allowViewerCommands) {
        this.send(socket, {
          type: 'notice',
          notice: {
            code: 'COMMAND_DISABLED',
            message:
              'Doğrudan izleyici komutları bu ortamda kapalı. Komutlar imzalı canlı yayın sağlayıcısı üzerinden iletilir.',
          },
        });
        return;
      }
      if (!meta.externalId) {
        this.send(socket, { type: 'error', error: 'Önce izleyici olarak bağlanmalısın.' });
        return;
      }
      const commandText = String(parsed.text ?? '').slice(0, 200);
      const msgId = String(parsed.msgId ?? '').slice(0, 64);
      if (!commandText.trim() || !msgId) return;
      this.applyChat(room, meta.externalId, meta.displayName ?? 'İzleyici', commandText, msgId, socket);
      return;
    }

    this.send(socket, { type: 'error', error: 'Bilinmeyen mesaj tipi.' });
  }

  private cleanName(value: string): string {
    return value
      .replace(/[\u0000-\u001f\u007f<>]/g, '')
      .trim()
      .slice(0, 32);
  }

  applyChat(
    room: Room,
    externalId: string,
    displayName: string,
    text: string,
    msgId: string,
    socket?: WebSocket,
  ): CommandOutcome {
    const now = Date.now();
    room.state.now = now;
    const outcome = applyCommand(room.state, {
      playerId: externalId,
      playerName: displayName,
      text,
      msgId,
      now,
    });
    if (outcome.feed) {
      this.persistChatFeed(room, outcome, externalId, displayName);
    }
    if (outcome.ok && (outcome.action === 'JOIN_TEAM' || outcome.action === 'CHANGE_TEAM')) {
      room.autoStartPaused = false;
      if (room.state.phase === 'lobby' && !room.state.lobbyStartsAt) {
        room.state.lobbyStartsAt = now + this.config.lobbyAutoStartMs;
        this.ensureTicker(room);
      }
    }
    if (socket) {
      if (outcome.notice) {
        this.send(socket, { type: 'notice', notice: outcome.notice });
      }
    }
    this.broadcast(room, true);
    return outcome;
  }

  /** İzleyicinin sohbet komutunu DB'ye işler. */
  private persistChatFeed(
    room: Room,
    outcome: CommandOutcome,
    externalId: string,
    displayName: string,
  ): void {
    const feed = outcome.feed;
    if (!feed) return;
    const now = nowIso();
    const team = feed.teamSlot
      ? room.state.teams.find((candidate) => candidate.slot === feed.teamSlot)
      : undefined;
    const teamId = this.safeTeamId(team?.teamId);
    const playerRow = this.ensurePlayerRow(room, externalId, displayName, teamId);
    const sessionId = room.state.sessionId;
    insertGameEvent(this.db, {
      id: randomId('evt'),
      gameId: room.gameId,
      sessionId,
      playerId: playerRow.id,
      eventType: feed.kind,
      eventDataJson: JSON.stringify({
        playerName: displayName,
        teamSlot: feed.teamSlot ?? null,
        teamName: feed.teamName ?? null,
      }),
      externalEventId: null,
      now,
    });
    if (sessionId) {
      upsertParticipant(this.db, {
        session_id: sessionId,
        player_id: playerRow.id,
        team_id: teamId,
        team_slot: team?.slot ?? 0,
        team_name: team?.name ?? '',
        team_color: team?.primaryColor ?? '#64748b',
        score: Math.round(
          room.state.players.find((player) => player.id === externalId)?.score ?? 0,
        ),
      });
      this.updateParticipantCount(room);
    }
  }

  private ensurePlayerRow(
    room: Room,
    externalId: string,
    displayName: string,
    teamId: string | null,
  ) {
    const row = upsertPlayer(this.db, {
      id: randomId('plr'),
      gameId: room.gameId,
      externalId,
      displayName,
      teamId,
      now: nowIso(),
    });
    room.playerRowIds.set(externalId, row.id);
    return row;
  }

  private safeTeamId(teamId: string | null | undefined): string | null {
    if (!teamId) return null;
    const exists = this.db.prepare('SELECT 1 FROM teams WHERE id = ?').get(teamId);
    return exists ? teamId : null;
  }

  private updateParticipantCount(room: Room): void {
    if (!room.state.sessionId) return;
    const count = room.state.players.filter((player) => player.teamSlot > 0).length;
    updateSessionProgress(this.db, room.state.sessionId, count);
  }

  startRoundForGame(gameId: string): { sessionId: string; view: BattleStateView } {
    const row = findGameById(this.db, gameId);
    if (!row) throw new Error('Oyun bulunamadı.');
    const room = this.ensureRoom(row);
    if (room.state.phase === 'running') {
      throw new Error('Bu oyunda zaten devam eden bir tur var.');
    }
    if (room.pendingConfigReload || room.state.phase === 'finished') {
      this.applyLatestConfig(room);
      room.state.phase = 'lobby';
      room.state.sessionId = null;
    }
    const now = Date.now();
    room.autoStartPaused = false;
    const sessionId = this.createSessionRecord(room, now);
    room.state.sessionId = sessionId;
    room.finalizedSessionId = null;
    room.finishedAt = null;
    startRound(room.state, now);
    insertGameEvent(this.db, {
      id: randomId('evt'),
      gameId: room.gameId,
      sessionId,
      playerId: null,
      eventType: 'round_start',
      eventDataJson: JSON.stringify({ roundIndex: room.state.roundIndex }),
      externalEventId: `round:${sessionId}:start`,
      now: nowIso(),
    });
    this.updateParticipantCount(room);
    setActiveSession(this.db, room.gameId, sessionId, nowIso());
    this.db
      .prepare("UPDATE games SET status = 'live', updated_at = ? WHERE id = ?")
      .run(nowIso(), room.gameId);
    this.ensureTicker(room);
    room.state.now = now;
    this.broadcast(room, true);
    return { sessionId, view: toBattleStateView(room.state) };
  }

  private createSessionRecord(room: Room, now: number): string {
    const row = findGameById(this.db, room.gameId)!;
    const sessionId = randomId('sess');
    const teamRows = listTeams(this.db, room.gameId);
    createGameSession(this.db, {
      id: sessionId,
      game_id: room.gameId,
      status: 'running',
      round_index: room.state.roundIndex + 1,
      started_at: new Date(now).toISOString(),
      ended_at: null,
      winner_team_id: null,
      is_draw: 0,
      end_reason: null,
      participant_count: room.state.players.filter((player) => player.teamSlot > 0).length,
      config_version: row.config_version,
      config_snapshot_json: JSON.stringify({
        gameName: row.game_name,
        language: row.language,
        settings: room.state.settings,
        commandOverrides: room.state.commandOverrides,
        teams: teamRows.map((team) => ({
          id: team.id,
          slot: team.slot,
          name: team.name,
          primaryColor: team.primary_color,
          secondaryColor: team.secondary_color,
          joinCommand: team.join_command,
        })),
      }),
      summary_json: '{}',
      created_at: new Date(now).toISOString(),
    });
    return sessionId;
  }

  stopRound(gameId: string): boolean {
    const room = this.rooms.get(gameId);
    if (!room || room.state.phase !== 'running') return false;
    // Yayıncı elle durdurduğunda yeni tur otomatik başlamasın; yeni bir
    // izleyici katılımı veya panelden "Tur başlat" odağı yeniden açar.
    room.autoStartPaused = true;
    finishRound(room.state, Date.now(), 'manual');
    this.finalizeSession(room);
    this.broadcast(room, true);
    return true;
  }

  private finalizeSession(room: Room): void {
    if (room.state.phase !== 'finished') return;
    const sessionId = room.state.sessionId;
    room.finishedAt = Date.now();
    if (!sessionId || room.finalizedSessionId === sessionId) return;
    room.finalizedSessionId = sessionId;
    const now = nowIso();
    const winner = room.state.winnerSlot
      ? room.state.teams.find((team) => team.slot === room.state.winnerSlot)
      : undefined;
    const winnerTeamId = this.safeTeamId(winner?.teamId);
    let participantCount = 0;

    this.db.transaction(() => {
      for (const player of room.state.players) {
        const team = player.teamSlot
          ? room.state.teams.find((candidate) => candidate.slot === player.teamSlot)
          : undefined;
        if (!team && player.score <= 0) continue;
        const teamId = this.safeTeamId(team?.teamId);
        const playerRow = this.ensurePlayerRow(room, player.id, player.name, teamId);
        const roundScore = Math.max(0, Math.round(player.score));
        if (roundScore > 0) {
          addPlayerCumulativeScore(this.db, playerRow.id, roundScore, now);
        }
        participantCount += 1;
        upsertParticipant(this.db, {
          session_id: sessionId,
          player_id: playerRow.id,
          team_id: teamId,
          team_slot: team?.slot ?? 0,
          team_name: team?.name ?? '',
          team_color: team?.primaryColor ?? '#64748b',
          score: roundScore,
        });
      }
      finishSessionRow(this.db, sessionId, {
        endedAt: now,
        winnerTeamId,
        isDraw: room.state.isDraw,
        endReason: room.state.endReason ?? 'manual',
        participantCount,
        summaryJson: JSON.stringify({
          winnerName: winner?.name ?? null,
          winnerColor: winner?.primaryColor ?? null,
          isDraw: room.state.isDraw,
          endReason: room.state.endReason,
          teams: room.state.teams.map((team) => ({
            slot: team.slot,
            name: team.name,
            primaryColor: team.primaryColor,
            castleHp: Math.round(team.castleHp),
            score: Math.round(team.score),
            alive: team.alive,
          })),
          players: room.state.players
            .filter((player) => player.score > 0)
            .map((player) => ({
              name: player.name,
              teamSlot: player.teamSlot,
              score: Math.round(player.score),
            })),
        }),
      });
      insertGameEvent(this.db, {
        id: randomId('evt'),
        gameId: room.gameId,
        sessionId,
        playerId: null,
        eventType: 'round_end',
        eventDataJson: JSON.stringify({
          winnerSlot: room.state.winnerSlot,
          winnerName: winner?.name ?? null,
          isDraw: room.state.isDraw,
        }),
        externalEventId: `round:${sessionId}:end`,
        now,
      });
      setActiveSession(this.db, room.gameId, null, now);
      this.db
        .prepare("UPDATE games SET status = 'ready', updated_at = ? WHERE id = ? AND live_enabled = 1")
        .run(now, room.gameId);
    })();

    room.state.sessionId = sessionId;
    this.broadcast(room, true);
  }

  /** Canlı yayın webhook olayını uygular (imza doğrulaması çağıran tarafta). */
  ingestLiveEventBySlug(
    slug: string,
    event: LiveEventPayload,
    providerEventId?: string,
  ): LiveIngestResult {
    const game = findGameBySlug(this.db, slug);
    if (!game || game.live_enabled !== 1) {
      return { accepted: false, duplicate: false, applied: false, reason: 'GAME_NOT_FOUND' };
    }
    const room = this.ensureRoom(game);
    if (room.state.phase !== 'running') {
      return { accepted: true, duplicate: false, applied: false, reason: 'MATCH_NOT_RUNNING' };
    }
    const teamRefs = room.state.teams.map((team) => ({
      slot: team.slot,
      name: team.name,
      joinCommand: team.joinCommand,
    }));
    const resolved = event.teamSlot
      ? teamRefs.find((team) => team.slot === event.teamSlot)
      : findTeamByToken(event.teamCommand, teamRefs);
    if (!resolved) {
      return { accepted: true, duplicate: false, applied: false, reason: 'TEAM_NOT_FOUND' };
    }
    const externalId = providerEventId ?? event.id;
    const viewerId = event.viewer?.id?.slice(0, 120) || `live:${externalId}`;
    const viewerName = this.cleanName(event.viewer?.name ?? 'İzleyici') || 'İzleyici';
    const now = nowIso();
    const teamId = this.safeTeamId(
      room.state.teams.find((team) => team.slot === resolved.slot)?.teamId,
    );
    const playerRow = this.ensurePlayerRow(room, viewerId, viewerName, teamId);

    const inserted = insertGameEvent(this.db, {
      id: randomId('evt'),
      gameId: room.gameId,
      sessionId: room.state.sessionId,
      playerId: playerRow.id,
      eventType: event.type,
      eventDataJson: JSON.stringify({
        providerEventId: externalId,
        viewerId,
        viewerName,
        teamSlot: resolved.slot,
        amount: event.amount ?? 1,
      }),
      externalEventId: externalId,
      now,
    });
    if (!inserted) {
      return { accepted: true, duplicate: true, applied: false, reason: 'DUPLICATE' };
    }

    const outcome = applyLiveEvent(room.state, {
      externalId,
      type: event.type,
      playerExternalId: viewerId,
      playerName: viewerName,
      teamSlot: resolved.slot,
      amount: event.amount ?? 1,
      at: Date.now(),
    });
    if (outcome.ok) {
      this.persistLivePlayerState(room, viewerId, viewerName, teamId);
      this.updateParticipantCount(room);
      if ((room.state.phase as string) === 'finished') this.finalizeSession(room);
    }
    this.broadcast(room, true);
    return {
      accepted: true,
      duplicate: false,
      applied: outcome.ok,
      reason: outcome.reason ?? 'OK',
      feedKind: outcome.feed?.kind,
    };
  }

  private persistLivePlayerState(
    room: Room,
    externalId: string,
    displayName: string,
    teamId: string | null,
  ): void {
    const sessionId = room.state.sessionId;
    if (!sessionId) return;
    const player = room.state.players.find((candidate) => candidate.id === externalId);
    const row = this.ensurePlayerRow(room, externalId, displayName, teamId);
    const team = player?.teamSlot
      ? room.state.teams.find((candidate) => candidate.slot === player.teamSlot)
      : undefined;
    upsertParticipant(this.db, {
      session_id: sessionId,
      player_id: row.id,
      team_id: teamId,
      team_slot: team?.slot ?? 0,
      team_name: team?.name ?? '',
      team_color: team?.primaryColor ?? '#64748b',
      score: Math.round(player?.score ?? 0),
    });
  }

  private ensureTicker(room: Room): void {
    if (room.timer) return;
    room.timer = setInterval(() => this.onTick(room), TICK_MS);
    room.timer.unref?.();
  }

  private stopTicker(room: Room): void {
    if (room.timer) {
      clearInterval(room.timer);
      room.timer = null;
    }
  }

  private onTick(room: Room): void {
    const now = Date.now();
    try {
      if (room.state.phase === 'running') {
        tickBattle(room.state, now);
        if ((room.state.phase as string) === 'finished') this.finalizeSession(room);
      } else if (room.state.phase === 'finished') {
        if (room.finishedAt === null) room.finishedAt = now;
        if (now - room.finishedAt >= this.config.finishedToLobbyMs) {
          this.prepareNextLobby(room, now);
        }
      } else if (room.state.phase === 'lobby') {
        if (room.state.lobbyStartsAt && now >= room.state.lobbyStartsAt) {
          try {
            const row = findGameById(this.db, room.gameId);
            if (row && row.live_enabled === 1) this.startRoundForGame(room.gameId);
          } catch (error) {
            this.logger.error(`Otomatik tur başlatılamadı: ${String(error)}`);
            room.state.lobbyStartsAt = null;
          }
        }
      }
    } catch (error) {
      this.logger.error(`Oyun döngüsü hatası: ${String(error)}`);
    }

    this.broadcast(room, false);
    if (room.clients.size === 0 && room.state.phase !== 'running') {
      this.stopTicker(room);
    }
  }

  private prepareNextLobby(room: Room, now: number): void {
    if (room.pendingConfigReload) {
      this.applyLatestConfig(room);
    } else {
      resetToLobby(room.state, now);
      room.state.sessionId = null;
    }
    room.state.sessionId = null;
    room.finishedAt = null;
    room.finalizedSessionId = null;
    const hasPlayers = room.state.players.some((player) => player.teamSlot > 0);
    room.state.lobbyStartsAt =
      hasPlayers && !room.autoStartPaused ? now + this.config.lobbyAutoStartMs : null;
    this.broadcast(room, true);
  }

  private broadcast(room: Room, force: boolean): void {
    if (room.clients.size === 0) return;
    const now = Date.now();
    if (!force && now - room.lastBroadcastAt < 180) return;
    room.lastBroadcastAt = now;
    room.state.now = now;
    const payload = JSON.stringify({
      type: 'state',
      state: toBattleStateView(room.state),
      serverTime: now,
    } satisfies WsServerMessage);
    for (const socket of room.clients.keys()) {
      if (socket.readyState === 1) {
        try {
          socket.send(payload);
        } catch {
          /* bağlantı koptu */
        }
      }
    }
  }

  private send(socket: WebSocket, message: WsServerMessage): void {
    if (socket.readyState !== 1) return;
    try {
      socket.send(JSON.stringify(message));
    } catch {
      /* yoksay */
    }
  }

  sendNotice(socket: WebSocket, code: WsNoticeCode, message?: string): void {
    this.send(socket, { type: 'notice', notice: { code, message } });
  }

  shutdown(): void {
    for (const room of this.rooms.values()) {
      this.stopTicker(room);
      if (room.state.phase === 'running' && room.state.sessionId) {
        try {
          abandonSessionRow(this.db, room.state.sessionId, nowIso());
          setActiveSession(this.db, room.gameId, null, nowIso());
          this.db
            .prepare("UPDATE games SET status = 'ready' WHERE id = ? AND live_enabled = 1")
            .run(room.gameId);
        } catch (error) {
          this.logger.error(`Oturum kapatılamadı: ${String(error)}`);
        }
      }
      for (const socket of room.clients.keys()) {
        try {
          socket.close(1001, 'Server shutting down');
        } catch {
          /* yoksay */
        }
      }
      room.clients.clear();
    }
    this.rooms.clear();
  }

  /** Testler ve panel için: mevcut odada oyuncu listesi. */
  getPlayers(gameId: string): Array<{ id: string; name: string; teamSlot: number; score: number }> {
    const room = this.rooms.get(gameId);
    if (!room) return [];
    return room.state.players.map((player) => ({
      id: player.id,
      name: player.name,
      teamSlot: player.teamSlot,
      score: player.score,
    }));
  }

  getStateForTest(gameId: string): BattleState | null {
    return this.rooms.get(gameId)?.state ?? null;
  }
}
