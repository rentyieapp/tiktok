import type { WebSocket } from 'ws';
import {
  ARCADE_GAMES,
  addArcadePlayer,
  addDemoBots,
  arcadeAction,
  arcadeRunBots,
  arcadeTick,
  arcadeView,
  createArcadeState,
  sanitizeQuizQuestions,
  startArcadeRound,
  type ArcadeActionKind,
  type ArcadeKey,
  type ArcadeState,
  type ArcadeStateView,
} from '../../../shared/arcade.js';
import type { DB } from '../db/index.js';
import {
  findActiveGameLicense,
  findArcadeRoomBan,
  createArcadeSession,
  finishArcadeSession,
  recordArcadeRoomRound,
  updatePlatformConnectionStatus,
  type ArcadeRoomRow,
  type PlatformConnectionRow,
} from '../db/repo.js';
import { nowIso } from '../db/index.js';
import { randomId } from '../lib/tokens.js';
import {
  commandAppliesToGame,
  matchArcadeCommand,
  sanitizeArcadeRoomSettings,
  type ArcadeCommandSettings,
  type ArcadeLocale,
} from '../../../shared/arcadeSettings.js';

interface SocketMeta {
  playerId: string | null;
  joinedName: string | null;
  times: number[];
}

interface Room {
  key: string;
  gameKey: ArcadeKey;
  slug: string;
  state: ArcadeState;
  clients: Map<WebSocket, SocketMeta>;
  timer: NodeJS.Timeout | null;
  idleTimer: NodeJS.Timeout | null;
  lastBroadcastAt: number;
  demo: boolean;
  language: ArcadeLocale;
  commands: ArcadeCommandSettings;
  roomId: string | null;
  userId: string | null;
  sessionId: string | null;
  sessionStartedAt: string | null;
  recordedEventIds: Set<string>;
  lastPhase: ArcadeState['phase'];
  lastFinishedAt: number | null;
}

export interface NormalizedPlatformEvent {
  id: string;
  platform: 'twitch' | 'youtube' | 'tiktok';
  kind: 'comment' | 'like' | 'gift' | 'follow' | 'share';
  viewer: { id: string; name: string; avatar?: string };
  text?: string;
  giftName?: string;
  amount?: number;
}

export interface PlatformIngestResult {
  accepted: boolean;
  reason?: string;
  playerId?: string;
}

const TICK_MS = 250;
const MAX_CLIENTS = 200;
const MAX_RECORDED_EVENTS = 600;

export class ArcadeRuntime {
  private rooms = new Map<string, Room>();

  constructor(
    private readonly db: DB,
    private readonly logger: Pick<Console, 'error'> = console,
  ) {}

  /** Ortak demo odası (botlarla). */
  attachClient(key: ArcadeKey, socket: WebSocket): void {
    const room = this.ensureDemoRoom(key);
    this.attachSocket(room, socket, true);
  }

  livePlayers(roomId: string): Array<{ id: string; name: string; score: number; side?: string; avatar?: string }> {
    const room = this.rooms.get(`room:${roomId}`);
    if (!room) return [];
    return room.state.players.map((player) => ({
      id: player.id,
      name: player.name,
      score: Math.round(player.score),
      side: player.side,
      avatar: player.avatar,
    }));
  }

  kickPlayer(roomId: string, playerId: string): boolean {
    const room = this.rooms.get(`room:${roomId}`);
    if (!room) return false;
    const player = room.state.players.find((entry) => entry.id === playerId);
    if (!player || player.isBot) return false;
    room.state.players = room.state.players.filter((entry) => entry.id !== playerId);
    room.state.feed.unshift({
      id: `mod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text: `${player.name} moderasyon tarafından odadan çıkarıldı.`,
      kind: 'system',
      at: Date.now(),
    });
    room.state.feed = room.state.feed.slice(0, 40);
    for (const [socket, meta] of room.clients) {
      if (meta.playerId !== playerId) continue;
      this.send(socket, { type: 'notice', message: 'Moderatör seni odadan çıkardı.' });
      socket.close(4009, 'Moderation');
    }
    this.broadcast(room);
    return true;
  }

  /** Yayıncıya özel oda. */
  attachChannel(roomRow: ArcadeRoomRow, socket: WebSocket): void {
    const room = this.ensureChannelRoom(roomRow);
    this.attachSocket(room, socket, false);
  }

  private attachSocket(room: Room, socket: WebSocket, demo: boolean): void {
    if (room.clients.size >= MAX_CLIENTS) {
      socket.close(4008, 'Room is full');
      return;
    }
    if (room.idleTimer) {
      clearTimeout(room.idleTimer);
      room.idleTimer = null;
    }
    const meta: SocketMeta = { playerId: null, joinedName: null, times: [] };
    room.clients.set(socket, meta);
    this.send(socket, {
      type: 'hello',
      gameKey: room.gameKey,
      roomSlug: room.slug,
      demo,
      serverTime: Date.now(),
    });
    this.send(socket, {
      type: 'state',
      state: arcadeView(room.state),
      serverTime: Date.now(),
    });

    socket.on('message', (raw) => {
      if (raw.toString().length > 4096) return;
      let message: Record<string, unknown>;
      try {
        message = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        this.send(socket, { type: 'error', error: 'Geçersiz mesaj.' });
        return;
      }
      this.handleMessage(room, socket, meta, message);
    });

    socket.on('close', () => {
      room.clients.delete(socket);
      if (room.clients.size === 0) this.scheduleCleanup(room);
    });
    socket.on('error', () => {
      room.clients.delete(socket);
      if (room.clients.size === 0) this.scheduleCleanup(room);
    });
  }

  private handleMessage(
    room: Room,
    socket: WebSocket,
    meta: SocketMeta,
    message: Record<string, unknown>,
  ): void {
    const type = String(message.type ?? '');
    if (!room.demo && room.userId && !findActiveGameLicense(this.db, room.userId, room.gameKey, nowIso())) {
      this.send(socket, { type: 'error', error: 'Yayıncı lisansı sona erdi.' });
      socket.close(4003, 'Subscription expired');
      return;
    }
    if (type === 'ping') {
      this.send(socket, { type: 'pong', serverTime: Date.now() });
      return;
    }
    if (type === 'join') {
      const name = String(message.name ?? '').trim().slice(0, 18);
      const clientId = String(message.clientId ?? '').slice(0, 64) || randomId('viewer');
      if (name.length < 2) {
        this.send(socket, { type: 'error', error: 'En az 2 karakterlik bir ad yaz.' });
        return;
      }
      if (room.roomId && findArcadeRoomBan(this.db, room.roomId, clientId)) {
        this.send(socket, { type: 'error', error: 'Bu odadan kalıcı olarak çıkarıldın.' });
        socket.close(4009, 'Banned');
        return;
      }
      const requestedSide =
        message.side === 'girls' || message.side === 'boys' || message.side === 'red' || message.side === 'blue'
          ? message.side
          : undefined;
      const requestedLane = Number.isInteger(message.lane) ? Number(message.lane) : undefined;
      const player = addArcadePlayer(room.state, {
        id: clientId,
        name,
        isBot: false,
        platform: 'web',
        now: Date.now(),
        side: requestedSide,
        lane: requestedLane,
      });
      if (!player) {
        this.send(socket, { type: 'error', error: 'Oda dolu.' });
        return;
      }
      meta.playerId = player.id;
      meta.joinedName = player.name;
      this.send(socket, {
        type: 'joined',
        playerId: player.id,
        state: arcadeView(room.state, player.id),
        serverTime: Date.now(),
      });
      this.broadcast(room);
      return;
    }
    if (type === 'start') {
      if (room.state.phase === 'lobby') this.startRound(room);
      this.broadcast(room);
      return;
    }
    if (type === 'reset') {
      if (room.demo) {
        const previous = room.state.players.filter((player) => !player.isBot);
        room.state = createArcadeState(room.gameKey, Date.now());
        addDemoBots(room.state, Date.now(), 7);
        for (const player of previous) {
          addArcadePlayer(room.state, {
            id: player.id,
            name: player.name,
            isBot: false,
            platform: player.platform,
            now: Date.now(),
          });
        }
      } else {
        const previous = room.state.players.map((player) => ({
          id: player.id,
          name: player.name,
          platform: player.platform,
        }));
        room.state = createArcadeState(room.gameKey, Date.now());
        for (const player of previous) {
          addArcadePlayer(room.state, {
            id: player.id,
            name: player.name,
            isBot: false,
            platform: player.platform,
            now: Date.now(),
          });
        }
      }
      this.broadcast(room);
      return;
    }
    if (type === 'action') {
      if (!meta.playerId) {
        this.send(socket, { type: 'error', error: 'Önce oyuna katıl.' });
        return;
      }
      const now = Date.now();
      meta.times = meta.times.filter((time) => now - time < 5000);
      if (meta.times.length > 18) {
        this.send(socket, { type: 'error', error: 'Çok hızlısın, biraz bekle.' });
        return;
      }
      meta.times.push(now);
      const kind = String(message.kind ?? '') as ArcadeActionKind;
      if (!['like', 'gift', 'comment'].includes(kind)) return;
      const payload = String(message.payload ?? '').slice(0, 80);
      const result = arcadeAction(room.state, meta.playerId, kind, payload, now);
      if (!result.ok) {
        this.send(socket, { type: 'notice', message: result.message ?? 'İşlem yapılamadı.' });
      } else if (kind === 'comment') {
        this.send(socket, {
          type: 'answer',
          correct: Boolean(result.correct),
          message: result.correct ? 'Doğru!' : 'Cevap kaydedildi.',
        });
      }
      this.broadcast(room);
    }
  }

  private ensureDemoRoom(key: ArcadeKey): Room {
    const roomKey = `demo:${key}`;
    const existing = this.rooms.get(roomKey);
    if (existing) return existing;
    const state = createArcadeState(key, Date.now());
    addDemoBots(state, Date.now(), 7);
    const room: Room = {
      key: roomKey,
      gameKey: key,
      slug: `demo-${key}`,
      state,
      clients: new Map(),
      timer: null,
      idleTimer: null,
      lastBroadcastAt: 0,
      demo: true,
      language: 'tr',
      commands: sanitizeArcadeRoomSettings({}).commands,
      roomId: null,
      userId: null,
      sessionId: null,
      sessionStartedAt: null,
      recordedEventIds: new Set(),
      lastPhase: state.phase,
      lastFinishedAt: null,
    };
    this.rooms.set(roomKey, room);
    this.startTicker(room);
    return room;
  }

  ensureChannelRoom(roomRow: ArcadeRoomRow): Room {
    const roomKey = `room:${roomRow.id}`;
    const existing = this.rooms.get(roomKey);
    if (existing) return existing;
    const gameKey = roomRow.game_key as ArcadeKey;
    const state = createArcadeState(gameKey, Date.now());
    let parsedSettings: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(roomRow.settings_json) as unknown;
      if (parsed && typeof parsed === 'object') parsedSettings = parsed as Record<string, unknown>;
    } catch {
      parsedSettings = {};
    }
    const quizQuestions = sanitizeQuizQuestions(parsedSettings.quizQuestions);
    if (quizQuestions.length > 0) {
      state.quizPool = quizQuestions;
      state.quizOrder = [];
    }
    const arcadeSettings = sanitizeArcadeRoomSettings(parsedSettings);
    const room: Room = {
      key: roomKey,
      gameKey,
      slug: roomRow.public_slug,
      state,
      clients: new Map(),
      timer: null,
      idleTimer: null,
      lastBroadcastAt: 0,
      demo: false,
      language: arcadeSettings.language,
      commands: arcadeSettings.commands,
      roomId: roomRow.id,
      userId: roomRow.user_id,
      sessionId: null,
      sessionStartedAt: null,
      recordedEventIds: new Set(),
      lastPhase: state.phase,
      lastFinishedAt: null,
    };
    this.rooms.set(roomKey, room);
    this.startTicker(room);
    return room;
  }

  applyRoomSettings(roomRow: ArcadeRoomRow): void {
    const room = this.rooms.get(`room:${roomRow.id}`);
    if (!room) return;
    let parsed: Record<string, unknown> = {};
    try {
      const value = JSON.parse(roomRow.settings_json) as unknown;
      if (value && typeof value === 'object') parsed = value as Record<string, unknown>;
    } catch {
      parsed = {};
    }
    const settings = sanitizeArcadeRoomSettings(parsed);
    room.language = settings.language;
    room.commands = settings.commands;
    this.broadcast(room);
  }

  setQuizPool(roomId: string, questions: Array<unknown>): void {
    const room = this.rooms.get(`room:${roomId}`);
    if (!room) return;
    const clean = sanitizeQuizQuestions(questions);
    room.state.quizPool = clean.length > 0 ? clean : undefined;
    room.state.quizOrder = [];
    this.broadcast(room);
  }

  private startRound(room: Room): void {
    startArcadeRound(room.state, Date.now());
    if (!room.demo && room.roomId) {
      room.sessionId = randomId('ases');
      room.sessionStartedAt = nowIso();
      try {
        createArcadeSession(this.db, {
          id: room.sessionId,
          roomId: room.roomId,
          gameKey: room.gameKey,
          startedAt: room.sessionStartedAt,
          playerCount: room.state.players.length,
        });
      } catch (error) {
        this.logger.error(`Arcade session kaydı oluşturulamadı: ${String(error)}`);
      }
    }
    this.broadcast(room);
  }

  private handleRoundFinished(room: Room): void {
    if (room.demo || !room.roomId) return;
    const now = nowIso();
    if (room.sessionId) {
      try {
        finishArcadeSession(
          this.db,
          room.sessionId,
          room.state.winner?.name ?? null,
          JSON.stringify({
            players: room.state.players.length,
            winnerScore: room.state.winner?.score ?? 0,
            gameKey: room.gameKey,
          }),
          now,
        );
        recordArcadeRoomRound(this.db, room.roomId, room.state.winner?.name ?? null, now);
      } catch (error) {
        this.logger.error(`Arcade session kaydı kapatılamadı: ${String(error)}`);
      }
      room.sessionId = null;
      room.sessionStartedAt = null;
    }
  }

  private startTicker(room: Room): void {
    if (room.timer) return;
    room.timer = setInterval(() => {
      const now = Date.now();
      arcadeTick(room.state, now);
      if (room.demo) arcadeRunBots(room.state, now);
      if (room.state.phase === 'running' && room.lastPhase !== 'running' && !room.demo) {
        // Platformdan ilk oyuncu geldiğinde oturum kaydı başlat.
        if (room.roomId && !room.sessionId) {
          room.sessionId = randomId('ases');
          room.sessionStartedAt = nowIso();
          try {
            createArcadeSession(this.db, {
              id: room.sessionId,
              roomId: room.roomId,
              gameKey: room.gameKey,
              startedAt: room.sessionStartedAt,
              playerCount: room.state.players.length,
            });
          } catch (error) {
            this.logger.error(`Arcade session kaydı oluşturulamadı: ${String(error)}`);
          }
        }
      }
      if (room.state.phase === 'finished' && room.lastPhase !== 'finished') {
        this.handleRoundFinished(room);
      }
      room.lastPhase = room.state.phase;
      if (now - room.lastBroadcastAt >= TICK_MS) {
        room.lastBroadcastAt = now;
        this.broadcast(room);
      }
    }, TICK_MS);
  }

  private scheduleCleanup(room: Room): void {
    if (room.demo) {
      this.stopRoom(room);
      return;
    }
    if (room.idleTimer) return;
    room.idleTimer = setTimeout(() => {
      if (room.clients.size === 0) this.stopRoom(room);
    }, 10 * 60 * 1000);
  }

  private stopRoom(room: Room): void {
    if (room.timer) clearInterval(room.timer);
    if (room.idleTimer) clearTimeout(room.idleTimer);
    room.timer = null;
    room.idleTimer = null;
    this.rooms.delete(room.key);
  }

  private broadcast(room: Room): void {
    for (const [socket, meta] of room.clients) {
      this.send(socket, {
        type: 'state',
        state: arcadeView(room.state, meta.playerId ?? undefined),
        serverTime: Date.now(),
      });
    }
  }

  private send(socket: WebSocket, message: Record<string, unknown>): void {
    if (socket.readyState !== socket.OPEN) return;
    try {
      socket.send(JSON.stringify(message));
    } catch {
      /* soket kapanmış olabilir */
    }
  }

  private pushRoomFeed(room: Room, text: string): void {
    room.state.feed.unshift({
      id: `sys_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text,
      kind: 'system',
      at: Date.now(),
    });
    room.state.feed = room.state.feed.slice(0, 40);
  }

  ingestPlatformEvent(
    roomRow: ArcadeRoomRow,
    event: NormalizedPlatformEvent,
  ): PlatformIngestResult {
    if (roomRow.status !== 'live') return { accepted: false, reason: 'Oda yayında değil.' };
    const room = this.ensureChannelRoom(roomRow);
    const eventKey = `${event.platform}:${event.id}`;
    if (room.recordedEventIds.has(eventKey)) {
      return { accepted: false, reason: 'duplicate' };
    }
    room.recordedEventIds.add(eventKey);
    if (room.recordedEventIds.size > MAX_RECORDED_EVENTS) {
      const first = room.recordedEventIds.values().next().value;
      if (first) room.recordedEventIds.delete(first);
    }
    const playerId = `platform:${event.platform}:${event.viewer.id}`;
    if (findArcadeRoomBan(this.db, roomRow.id, playerId)) {
      return { accepted: false, reason: 'banned' };
    }
    const existing = room.state.players.find((player) => player.id === playerId);
    const command =
      event.kind === 'comment' ? matchArcadeCommand(event.text ?? '', room.commands) : null;
    const validCommand =
      command && commandAppliesToGame(command, room.state.key) ? command : null;

    const sideForCommand =
      validCommand === 'red'
        ? 'red'
        : validCommand === 'blue'
          ? 'blue'
          : validCommand === 'girls'
            ? 'girls'
            : validCommand === 'boys'
              ? 'boys'
              : undefined;

    if (validCommand === 'leave') {
      if (existing) {
        room.state.players = room.state.players.filter((entry) => entry.id !== playerId);
        this.pushRoomFeed(room, `${existing.name} odadan ayrıldı.`);
        this.broadcast(room);
      }
      return { accepted: true, reason: 'left', playerId };
    }

    if (sideForCommand && room.state.key === 'tug' || sideForCommand && room.state.key === 'versus') {
      let teamPlayer = existing;
      if (!teamPlayer) {
        teamPlayer = addArcadePlayer(room.state, {
          id: playerId,
          name: event.viewer.name || `${event.platform} izleyici`,
          isBot: false,
          platform: event.platform,
          now: Date.now(),
          avatar: event.viewer.avatar,
          side: sideForCommand,
        }) ?? undefined;
      } else {
        teamPlayer.side = sideForCommand;
      }
      if (!teamPlayer) return { accepted: false, reason: 'room_full' };
      if (event.viewer.avatar) teamPlayer.avatar = event.viewer.avatar;
      if (!room.demo && room.state.phase === 'lobby') this.startRound(room);
      const teamLabel =
        room.state.key === 'versus'
          ? sideForCommand === 'girls'
            ? 'kızlar'
            : 'erkekler'
          : sideForCommand === 'red'
            ? 'kırmızı'
            : 'mavi';
      this.pushRoomFeed(room, `${teamPlayer.name} ${teamLabel} tarafa geçti.`);
      this.broadcast(room);
      return { accepted: true, reason: 'team_joined', playerId };
    }

    if (validCommand === 'join') {
      let joined = existing;
      if (!joined) {
        joined = addArcadePlayer(room.state, {
          id: playerId,
          name: event.viewer.name || `${event.platform} izleyici`,
          isBot: false,
          platform: event.platform,
          now: Date.now(),
          avatar: event.viewer.avatar,
        }) ?? undefined;
      }
      if (!joined) return { accepted: false, reason: 'room_full' };
      if (event.viewer.avatar) joined.avatar = event.viewer.avatar;
      if (!room.demo && room.state.phase === 'lobby') this.startRound(room);
      this.pushRoomFeed(room, `${joined.name} oyuna katıldı.`);
      this.broadcast(room);
      return { accepted: true, reason: 'joined', playerId };
    }

    // Gece Yarısı'na özel, dile göre eşleşen komutlar.
    if (validCommand === 'hide' || validCommand === 'repair' || validCommand === 'rescue') {
      if (!existing && room.commands.requireJoin) {
        return { accepted: false, reason: 'join_required' };
      }
      let commandPlayer = existing;
      if (!commandPlayer) {
        commandPlayer = addArcadePlayer(room.state, {
          id: playerId,
          name: event.viewer.name || `${event.platform} izleyici`,
          isBot: false,
          platform: event.platform,
          now: Date.now(),
          avatar: event.viewer.avatar,
        }) ?? undefined;
      }
      if (!commandPlayer) return { accepted: false, reason: 'room_full' };
      if (!room.demo && room.state.phase === 'lobby') this.startRound(room);
      const internal = validCommand === 'hide' ? '!hide' : validCommand === 'repair' ? '!repair' : '!rescue';
      const result = arcadeAction(room.state, playerId, 'comment', internal, Date.now());
      this.broadcast(room);
      return { accepted: result.ok, reason: result.message, playerId };
    }

    if (!existing && event.kind === 'comment' && room.commands.requireJoin) {
      return { accepted: false, reason: 'join_required' };
    }

    const player =
      existing ??
      addArcadePlayer(room.state, {
        id: playerId,
        name: event.viewer.name || `${event.platform} izleyici`,
        isBot: false,
        platform: event.platform,
        now: Date.now(),
        avatar: event.viewer.avatar,
      });
    if (!player) return { accepted: false, reason: 'room_full' };
    if (event.viewer.avatar) player.avatar = event.viewer.avatar;
    // Yayıncı odasında ilk platform olayı turu hemen başlatır; ilk yorum kaybolmaz.
    if (!room.demo && room.state.phase === 'lobby') this.startRound(room);

    if (event.kind === 'comment') {
      const result = arcadeAction(room.state, playerId, 'comment', event.text ?? '', Date.now());
      this.broadcast(room);
      return { accepted: result.ok, reason: result.message, playerId };
    }
    if (event.kind === 'like') {
      const result = arcadeAction(room.state, playerId, 'like', '', Date.now());
      this.broadcast(room);
      return { accepted: result.ok, reason: result.message, playerId };
    }
    // gift, follow ve share oyun içinde hediye etkisi olarak işlenir.
    const result = arcadeAction(room.state, playerId, 'gift', event.giftName ?? '', Date.now());
    this.broadcast(room);
    return { accepted: result.ok, reason: result.message, playerId };
  }

  disconnectRoom(roomId: string): void {
    const room = this.rooms.get(`room:${roomId}`);
    if (!room) return;
    for (const [socket] of room.clients) {
      try {
        socket.close(4004, 'Room disabled');
      } catch {
        /* yoksay */
      }
    }
    this.stopRoom(room);
  }

  setConnectionStatus(
    connection: PlatformConnectionRow,
    status: 'connecting' | 'connected' | 'error' | 'disconnected',
    error: string | null,
  ): void {
    try {
      updatePlatformConnectionStatus(this.db, connection.id, status, error, nowIso());
    } catch (dbError) {
      this.logger.error(`Platform durumu yazılamadı: ${String(dbError)}`);
    }
  }

  getGameSummary(key: ArcadeKey): { players: number; phase: string } | null {
    const room = this.rooms.get(`demo:${key}`);
    if (!room) return null;
    return {
      players: room.state.players.filter((player) => !player.isBot).length,
      phase: room.state.phase,
    };
  }

  getSnapshot(key: ArcadeKey): ArcadeStateView | null {
    const room = this.rooms.get(`demo:${key}`);
    return room ? arcadeView(room.state) : null;
  }

  getRoomSnapshot(roomRow: ArcadeRoomRow): ArcadeStateView | null {
    const room = this.rooms.get(`room:${roomRow.id}`);
    return room ? arcadeView(room.state) : null;
  }

  getRoomSummary(roomRow: ArcadeRoomRow): { players: number; phase: string; online: number } | null {
    const room = this.rooms.get(`room:${roomRow.id}`);
    if (!room) return null;
    return {
      players: room.state.players.length,
      phase: room.state.phase,
      online: room.clients.size,
    };
  }

  getOnlineCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const key of Object.keys(ARCADE_GAMES) as ArcadeKey[]) {
      counts[key] = this.getGameSummary(key)?.players ?? 0;
    }
    return counts;
  }

  shutdown(): void {
    for (const room of this.rooms.values()) {
      if (room.timer) clearInterval(room.timer);
      if (room.idleTimer) clearTimeout(room.idleTimer);
    }
    this.rooms.clear();
  }
}
