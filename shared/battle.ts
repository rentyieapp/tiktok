import type {
  BattleFeedItem,
  BattlePlayerView,
  BattleStateView,
  BattleTeamView,
  FeedKind,
  GameSettings,
  Locale,
  SystemCommand,
  TeamDTO,
  WsNoticeCode,
} from './types.js';
import {
  findTeamByToken,
  noticeText,
  parseCommand,
  type SystemOverrideMap,
} from './commands.js';
import { clampSettings } from './defaults.js';

/* ------------------------------------------------------------------ */
/* İç durum                                                            */
/* ------------------------------------------------------------------ */

export interface BattlePlayer {
  id: string;
  name: string;
  teamSlot: number; // 0 = takımsız
  score: number;
  joinedAt: number;
  lastCommandAt: number;
  windowStartedAt: number;
  windowCount: number;
  lastText: string;
  firstJoinRound: number;
}

export interface BattleTeam extends BattleTeamView {
  joinCommand: string;
  teamId: string | null;
  damageDealt: number;
}

export interface BattleState {
  gameId: string;
  gameName: string;
  publicSlug: string;
  locale: Locale;
  phase: 'lobby' | 'running' | 'finished';
  roundIndex: number;
  startedAt: number | null;
  endsAt: number | null;
  lobbyStartsAt: number | null;
  now: number;
  durationMs: number;
  teams: BattleTeam[];
  players: BattlePlayer[];
  feed: BattleFeedItem[];
  winnerSlot: number | null;
  isDraw: boolean;
  endReason: 'elimination' | 'time' | 'manual' | null;
  settings: GameSettings;
  sessionId: string | null;
  testMode: boolean;
  lastTickAt: number;
  commandOverrides: SystemOverrideMap;
  seenEventIds: Set<string>;
  rngState: number;
  feedSeq: number;
}

export interface CreateBattleParams {
  gameId: string;
  gameName: string;
  publicSlug: string;
  locale: Locale;
  teams: Array<TeamDTO | (Omit<TeamDTO, 'id'> & { id?: string })>;
  settings: GameSettings;
  commandOverrides?: SystemOverrideMap;
  sessionId?: string | null;
  testMode?: boolean;
  now?: number;
  seed?: number;
}

/* ------------------------------------------------------------------ */
/* Yardımcılar                                                         */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: number): () => number {
  return mulberry32(seed);
}

function feed(state: BattleState, kind: FeedKind, data: Omit<BattleFeedItem, 'id' | 'seq' | 'at' | 'kind'> = {}, now = state.now): BattleFeedItem {
  state.feedSeq += 1;
  const item: BattleFeedItem = {
    id: `${state.gameId}-${state.feedSeq}`,
    seq: state.feedSeq,
    at: now,
    kind,
    ...data,
  };
  state.feed.push(item);
  if (state.feed.length > 40) state.feed.splice(0, state.feed.length - 40);
  return item;
}

export function createBattleState(params: CreateBattleParams): BattleState {
  const now = params.now ?? Date.now();
  const settings = clampSettings(params.settings);
  const teams: BattleTeam[] = params.teams.map((team) => ({
    slot: team.slot,
    name: team.name,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
    symbol: team.symbol,
    emblemUrl: team.emblemUrl ?? null,
    soldierLook: team.soldierLook,
    castleLook: team.castleLook,
    joinCommand: team.joinCommand,
    teamId: team.id ?? null,
    soldiers: settings.startingSoldiers,
    castleHp: settings.castleHp,
    maxCastleHp: settings.castleHp,
    score: 0,
    damageDealt: 0,
    playerCount: 0,
    alive: true,
    shieldStrength: 0,
    shieldUntil: 0,
    attackBonusPercent: 0,
  }));

  return {
    gameId: params.gameId,
    gameName: params.gameName,
    publicSlug: params.publicSlug,
    locale: params.locale,
    phase: 'lobby',
    roundIndex: 0,
    startedAt: null,
    endsAt: null,
    lobbyStartsAt: null,
    now,
    durationMs: settings.roundDurationSec * 1000,
    teams,
    players: [],
    feed: [],
    winnerSlot: null,
    isDraw: false,
    endReason: null,
    settings,
    sessionId: params.sessionId ?? null,
    testMode: params.testMode ?? false,
    lastTickAt: now,
    commandOverrides: params.commandOverrides ?? {},
    seenEventIds: new Set(),
    rngState: params.seed ?? Math.floor(Math.random() * 0xffffffff),
    feedSeq: 0,
  };
}

function teamBySlot(state: BattleState, slot: number): BattleTeam | undefined {
  return state.teams.find((team) => team.slot === slot);
}

function recomputePlayerCounts(state: BattleState): void {
  for (const team of state.teams) team.playerCount = 0;
  for (const player of state.players) {
    if (player.teamSlot > 0) {
      const team = teamBySlot(state, player.teamSlot);
      if (team) team.playerCount += 1;
    }
  }
  for (const team of state.teams) {
    team.attackBonusPercent = Math.min(
      100,
      team.playerCount * state.settings.playerAttackBonusPercent,
    );
  }
}

function resetTeamForRound(team: BattleTeam, state: BattleState): void {
  team.castleHp = state.settings.castleHp;
  team.maxCastleHp = state.settings.castleHp;
  team.soldiers = Math.min(
    400,
    state.settings.startingSoldiers + team.playerCount * state.settings.joinSoldierBonus,
  );
  team.score = 0;
  team.damageDealt = 0;
  team.alive = true;
  team.shieldStrength = 0;
  team.shieldUntil = 0;
  team.attackBonusPercent = Math.min(
    100,
    team.playerCount * state.settings.playerAttackBonusPercent,
  );
}

export function startRound(state: BattleState, now = Date.now()): void {
  if (state.phase === 'running') return;
  recomputePlayerCounts(state);
  state.roundIndex += 1;
  state.phase = 'running';
  state.startedAt = now;
  state.endsAt = now + state.settings.roundDurationSec * 1000;
  state.lobbyStartsAt = null;
  state.durationMs = state.settings.roundDurationSec * 1000;
  state.winnerSlot = null;
  state.isDraw = false;
  state.endReason = null;
  state.lastTickAt = now;
  state.now = now;
  state.feed = [];
  state.feedSeq = 0;
  state.seenEventIds.clear();
  for (const team of state.teams) resetTeamForRound(team, state);
  for (const player of state.players) {
    player.score = 0;
    player.firstJoinRound = 0;
  }
  feed(state, 'round_start', { amount: state.roundIndex }, now);
}

function rankTeams(state: BattleState): BattleTeam[] {
  const condition = state.settings.winCondition;
  const primary = (team: BattleTeam): number => {
    if (condition === 'highest_score') return team.score;
    if (condition === 'highest_castle_hp') return team.castleHp;
    return team.alive ? 1 : 0;
  };
  return [...state.teams].sort((a, b) => {
    const pa = primary(a);
    const pb = primary(b);
    if (pb !== pa) return pb - pa;
    if (b.castleHp !== a.castleHp) return b.castleHp - a.castleHp;
    if (b.score !== a.score) return b.score - a.score;
    if (b.soldiers !== a.soldiers) return b.soldiers - a.soldiers;
    return a.slot - b.slot;
  });
}

function finishRoundInternal(
  state: BattleState,
  now: number,
  reason: 'elimination' | 'time' | 'manual',
): void {
  if (state.phase !== 'running') return;
  const ranked = rankTeams(state);
  const first = ranked[0];
  const second = ranked[1];
  const tied =
    Boolean(first && second) &&
    first.alive === second.alive &&
    Math.abs(first.castleHp - second.castleHp) < 0.5 &&
    Math.abs(first.score - second.score) < 0.5 &&
    Math.abs(first.soldiers - second.soldiers) < 0.5;

  state.phase = 'finished';
  state.endReason = reason;
  state.endsAt = now;
  state.now = now;
  state.winnerSlot = tied ? null : first?.slot ?? null;
  state.isDraw = Boolean(tied);
  state.lastTickAt = now;

  if (state.winnerSlot !== null) {
    for (const player of state.players) {
      if (player.teamSlot === state.winnerSlot) player.score += 100;
    }
  }
  feed(
    state,
    'round_end',
    {
      teamSlot: state.winnerSlot ?? undefined,
      teamName: state.winnerSlot ? teamBySlot(state, state.winnerSlot)?.name : undefined,
      code: state.isDraw ? 'DRAW' : 'WINNER',
    },
    now,
  );
}

/** Maçı elle bitirir (yayıncı durdurduğunda). */
export function finishRound(
  state: BattleState,
  now = Date.now(),
  reason: 'manual' | 'time' | 'elimination' = 'manual',
): void {
  finishRoundInternal(state, now, reason);
}

export function resetToLobby(state: BattleState, now = Date.now()): void {
  state.phase = 'lobby';
  state.startedAt = null;
  state.endsAt = null;
  state.lobbyStartsAt = null;
  state.winnerSlot = null;
  state.isDraw = false;
  state.endReason = null;
  state.now = now;
  state.lastTickAt = now;
  state.feed = [];
  state.feedSeq = 0;
  recomputePlayerCounts(state);
  for (const team of state.teams) {
    team.castleHp = state.settings.castleHp;
    team.maxCastleHp = state.settings.castleHp;
    team.soldiers = state.settings.startingSoldiers + team.playerCount * state.settings.joinSoldierBonus;
    team.score = 0;
    team.damageDealt = 0;
    team.alive = true;
    team.shieldStrength = 0;
    team.shieldUntil = 0;
  }
}

/** Kalesi yıkılan takımları işaretler; maç bitebilir. */
function evaluateEliminations(state: BattleState, now: number): void {
  for (const team of state.teams) {
    if (team.alive && team.castleHp <= 0) {
      team.castleHp = 0;
      team.alive = false;
      team.soldiers = 0;
      feed(state, 'castle_down', { teamSlot: team.slot, teamName: team.name }, now);
    }
  }
  const alive = state.teams.filter((team) => team.alive);
  if (alive.length <= 1 && state.teams.length > 1) {
    finishRoundInternal(state, now, 'elimination');
  }
}

/**
 * Sunucu tarafı simülasyon adımı. İstemciden gelen hiçbir değer bu hesaba
 * doğrudan girmez; tüm ayarlar sunucudaki state'ten okunur.
 */
export function tickBattle(state: BattleState, now = Date.now()): void {
  if (state.phase !== 'running') return;
  const dt = Math.min(1.5, Math.max(0, (now - state.lastTickAt) / 1000));
  state.now = now;
  if (dt <= 0) return;
  state.lastTickAt = now;
  const random = createRng(state.rngState);
  state.rngState = Math.floor(random() * 0xffffffff);

  const aliveTeams = state.teams.filter((team) => team.alive);
  const damageBySlot = new Map<number, number>();

  for (const attacker of aliveTeams) {
    attacker.soldiers = Math.min(400, attacker.soldiers + state.settings.soldierProductionRate * dt);
    if (attacker.shieldUntil > 0 && now > attacker.shieldUntil) {
      attacker.shieldStrength = 0;
      attacker.shieldUntil = 0;
    }
    // Sıradaki canlı takım hedef alınır (takım sayısından bağımsız çalışır).
    const others = aliveTeams.filter((team) => team.slot !== attacker.slot);
    if (others.length === 0) continue;
    const attackerIndex = aliveTeams.findIndex((team) => team.slot === attacker.slot);
    const target = aliveTeams[(attackerIndex + 1) % aliveTeams.length];
    const targetTeam = target.slot === attacker.slot ? others[0] : target;
    if (!targetTeam) continue;

    const variance = 0.94 + random() * 0.12;
    const attackBonus = 1 + Math.min(1, attacker.playerCount * state.settings.playerAttackBonusPercent / 100);
    let damage =
      attacker.soldiers *
      state.settings.attackPower *
      0.02 *
      attackBonus *
      dt *
      variance;
    damage *= 1 - Math.min(0.6, state.settings.defensePower * 0.02);
    damage *= 1 - Math.min(0.5, targetTeam.shieldStrength);
    if (!Number.isFinite(damage) || damage <= 0) continue;

    damageBySlot.set(targetTeam.slot, (damageBySlot.get(targetTeam.slot) ?? 0) + damage);
    attacker.score += damage;
    attacker.damageDealt += damage;
  }

  for (const [slot, damage] of damageBySlot) {
    const team = teamBySlot(state, slot);
    if (team && team.alive) team.castleHp = Math.max(0, team.castleHp - damage);
  }

  evaluateEliminations(state, now);

  if (state.phase === 'running' && state.endsAt !== null && now >= state.endsAt) {
    // Süre bittiğinde son kez yıkılan kaleleri işaretle, sonra koşula göre bitir.
    for (const team of state.teams) {
      if (team.castleHp <= 0 && team.alive) {
        team.alive = false;
        team.soldiers = 0;
      }
    }
    const alive = state.teams.filter((team) => team.alive);
    if (alive.length <= 1 && state.teams.length > 1) {
      finishRoundInternal(state, now, 'elimination');
    } else {
      finishRoundInternal(state, now, 'time');
    }
  }
}

/* ------------------------------------------------------------------ */
/* Komutlar                                                            */
/* ------------------------------------------------------------------ */

export interface ApplyCommandInput {
  playerId: string;
  playerName: string;
  text: string;
  now?: number;
  msgId?: string;
}

export interface CommandOutcome {
  ok: boolean;
  action: SystemCommand | 'UNKNOWN';
  notice?: {
    code: WsNoticeCode;
    message?: string;
    teamName?: string;
    retryAfterMs?: number;
    teamSlot?: number;
  };
  feed?: BattleFeedItem | null;
  /** Sunucu tarafında üretilen komut olay kimliği (dedupe için). */
  eventId?: string;
}

function findOrCreatePlayer(state: BattleState, id: string, name: string, now: number): BattlePlayer {
  let player = state.players.find((candidate) => candidate.id === id);
  if (!player) {
    player = {
      id,
      name: name.slice(0, 32) || 'İzleyici',
      teamSlot: 0,
      score: 0,
      joinedAt: now,
      lastCommandAt: 0,
      windowStartedAt: now,
      windowCount: 0,
      lastText: '',
      firstJoinRound: 0,
    };
    state.players.push(player);
  } else if (name && player.name !== name) {
    player.name = name.slice(0, 32);
  }
  return player;
}

function rateLimitCheck(
  state: BattleState,
  player: BattlePlayer,
  now: number,
): { limited: boolean; retryAfterMs: number } {
  const cooldown = Math.max(300, state.settings.commandCooldownMs);
  if (player.lastCommandAt > 0 && now - player.lastCommandAt < cooldown) {
    return { limited: true, retryAfterMs: cooldown - (now - player.lastCommandAt) };
  }
  if (now - player.windowStartedAt > 20000) {
    player.windowStartedAt = now;
    player.windowCount = 0;
  }
  if (player.windowCount >= 8) {
    return { limited: true, retryAfterMs: Math.max(1000, 20000 - (now - player.windowStartedAt)) };
  }
  player.windowCount += 1;
  player.lastCommandAt = now;
  return { limited: false, retryAfterMs: 0 };
}

/**
 * İzleyici komutunu uygular. Komut metni yalnızca eşleştirme için kullanılır;
 * tüm etkiler sunucudaki state üzerinde hesaplanır.
 */
export function applyCommand(state: BattleState, input: ApplyCommandInput): CommandOutcome {
  const now = input.now ?? Date.now();
  state.now = now;
  // Mesaj kimliği dedupe (aynı WebSocket mesajı iki kez işlenmesin).
  if (input.msgId) {
    const dedupeKey = `msg:${input.msgId}`;
    if (state.seenEventIds.has(dedupeKey)) {
      return { ok: false, action: 'UNKNOWN', notice: { code: 'UNKNOWN_COMMAND', message: 'Tekrarlanan komut yok sayıldı.' } };
    }
    state.seenEventIds.add(dedupeKey);
    if (state.seenEventIds.size > 5000) {
      const first = state.seenEventIds.values().next().value;
      if (first) state.seenEventIds.delete(first);
    }
  }

  const player = findOrCreatePlayer(state, input.playerId, input.playerName, now);
  const limited = rateLimitCheck(state, player, now);
  if (limited.limited) {
    return {
      ok: false,
      action: 'UNKNOWN',
      notice: {
        code: 'RATE_LIMITED',
        message: noticeText('RATE_LIMITED', state.locale),
        retryAfterMs: limited.retryAfterMs,
      },
    };
  }

  const teamRefs = state.teams.map((team) => ({
    slot: team.slot,
    name: team.name,
    joinCommand: team.joinCommand,
  }));
  const parsed = parseCommand(input.text, state.locale, teamRefs, state.commandOverrides);
  if (parsed.action === 'UNKNOWN') {
    return {
      ok: false,
      action: 'UNKNOWN',
      notice: { code: 'UNKNOWN_COMMAND', message: noticeText('UNKNOWN_COMMAND', state.locale) },
    };
  }
  if (parsed.action === 'HELP') {
    return { ok: true, action: 'HELP', notice: { code: 'HELP_SHEET' } };
  }
  if (parsed.action === 'SHOW_SCORE') {
    return { ok: true, action: 'SHOW_SCORE', notice: { code: 'SCORE_SHEET' } };
  }

  if (parsed.action === 'LEAVE_TEAM') {
    if (player.teamSlot === 0) {
      return {
        ok: false,
        action: parsed.action,
        notice: { code: 'NOT_IN_TEAM', message: noticeText('NOT_IN_TEAM', state.locale) },
      };
    }
    const previous = teamBySlot(state, player.teamSlot);
    player.teamSlot = 0;
    recomputePlayerCounts(state);
    const feedItem = feed(state, 'leave', {
      playerName: player.name,
      teamSlot: previous?.slot,
      teamName: previous?.name,
    });
    return {
      ok: true,
      action: parsed.action,
      notice: { code: 'LEFT', message: noticeText('LEFT', state.locale) },
      feed: feedItem,
    };
  }

  // JOIN_TEAM veya CHANGE_TEAM
  const isChange = parsed.action === 'CHANGE_TEAM';
  const matchedTeam = parsed.impliedTeamSlot
    ? teamBySlot(state, parsed.impliedTeamSlot)
    : findTeamByToken(parsed.teamToken, teamRefs);
  const team = matchedTeam ? teamBySlot(state, matchedTeam.slot) : undefined;
  if (!team) {
    const code: WsNoticeCode = parsed.teamToken || parsed.impliedTeamSlot ? 'TEAM_NOT_FOUND' : 'TEAM_REQUIRED';
    return {
      ok: false,
      action: parsed.action,
      notice: { code, message: noticeText(code, state.locale) },
    };
  }
  if (player.teamSlot === team.slot) {
    return {
      ok: false,
      action: parsed.action,
      notice: {
        code: 'ALREADY_IN_TEAM',
        message: noticeText('ALREADY_IN_TEAM', state.locale, { teamName: team.name }),
        teamName: team.name,
      },
    };
  }
  if (!isChange && player.teamSlot > 0) {
    return {
      ok: false,
      action: parsed.action,
      notice: {
        code: 'USE_CHANGE_TEAM',
        message: noticeText('USE_CHANGE_TEAM', state.locale),
      },
    };
  }
  if (
    state.settings.maxPlayersPerTeam > 0 &&
    team.playerCount >= state.settings.maxPlayersPerTeam
  ) {
    return {
      ok: false,
      action: parsed.action,
      notice: { code: 'TEAM_FULL', message: noticeText('TEAM_FULL', state.locale) },
    };
  }

  const previousSlot = player.teamSlot;
  player.teamSlot = team.slot;
  player.joinedAt = now;
  const canEarnPoints = player.firstJoinRound !== state.roundIndex && state.phase === 'running';
  if (canEarnPoints) {
    player.score += 10;
    player.firstJoinRound = state.roundIndex;
    if (state.settings.joinSoldierBonus > 0) {
      team.soldiers = Math.min(400, team.soldiers + state.settings.joinSoldierBonus);
    }
  }
  recomputePlayerCounts(state);

  const kind: FeedKind = isChange && previousSlot > 0 ? 'switch' : 'join';
  const feedItem = feed(state, kind, {
    playerName: player.name,
    teamSlot: team.slot,
    teamName: team.name,
  });
  const code: WsNoticeCode = kind === 'switch' ? 'SWITCHED' : 'JOINED';
  return {
    ok: true,
    action: parsed.action,
    notice: {
      code,
      message: noticeText(code, state.locale, { teamName: team.name }),
      teamName: team.name,
      teamSlot: team.slot,
    },
    feed: feedItem,
    eventId: feedItem.id,
  };
}

/* ------------------------------------------------------------------ */
/* Canlı yayın olayları (hediye / beğeni / yorum)                      */
/* ------------------------------------------------------------------ */

export type LiveEventType = 'gift' | 'like' | 'comment';

export interface IncomingLiveEvent {
  externalId: string;
  type: LiveEventType;
  playerExternalId?: string | null;
  playerName?: string | null;
  teamSlot?: number | null;
  /** Hediye adedi / beğeni sayısı gibi çarpan. */
  amount?: number;
  at?: number;
}

export interface LiveEventOutcome {
  ok: boolean;
  duplicate?: boolean;
  reason?: string;
  feed?: BattleFeedItem | null;
}

/** Canlı yayın olaylarını uygular. Aynı event ID iki kez işlenmez. */
export function applyLiveEvent(state: BattleState, event: IncomingLiveEvent): LiveEventOutcome {
  if (!event.externalId || state.seenEventIds.has(event.externalId)) {
    return { ok: false, duplicate: true, reason: 'DUPLICATE' };
  }
  state.seenEventIds.add(event.externalId);
  if (state.seenEventIds.size > 5000) {
    const first = state.seenEventIds.values().next().value;
    if (first) state.seenEventIds.delete(first);
  }

  const now = event.at ?? state.now;
  state.now = now;
  const amount = Math.min(50, Math.max(1, Math.round(event.amount ?? 1)));
  const player = event.playerExternalId
    ? findOrCreatePlayer(state, event.playerExternalId, event.playerName ?? 'İzleyici', now)
    : null;
  const resolvedSlot = event.teamSlot ?? player?.teamSlot ?? 0;
  const team = resolvedSlot ? teamBySlot(state, resolvedSlot) : undefined;
  if (!team) return { ok: false, reason: 'NO_TEAM' };
  // Destek gönderen izleyicinin henüz takımı yoksa desteklediği takıma bağlanır.
  if (player && player.teamSlot === 0) {
    player.teamSlot = team.slot;
    recomputePlayerCounts(state);
  }

  if (event.type === 'gift') {
    if (!state.settings.enableGifts) return { ok: false, reason: 'DISABLED' };
    const totalDamage = state.settings.giftAttackDamage * amount;
    for (const enemy of state.teams) {
      if (!enemy.alive || enemy.slot === team.slot) continue;
      const mitigated = totalDamage * (1 - Math.min(0.5, enemy.shieldStrength));
      enemy.castleHp = Math.max(0, enemy.castleHp - mitigated);
      team.score += mitigated;
    }
    if (player) player.score += 50;
    const feedItem = feed(state, 'gift', {
      playerName: player?.name ?? team.name,
      teamSlot: team.slot,
      teamName: team.name,
      amount,
    });
    evaluateEliminations(state, now);
    return { ok: true, feed: feedItem };
  }

  if (event.type === 'like') {
    if (!state.settings.enableLikes) return { ok: false, reason: 'DISABLED' };
    team.shieldStrength = Math.min(0.5, team.shieldStrength + state.settings.likeShieldStrength * amount);
    team.shieldUntil = now + state.settings.likeShieldDurationSec * 1000;
    if (player) player.score += 2;
    const feedItem = feed(state, 'like', {
      playerName: player?.name ?? team.name,
      teamSlot: team.slot,
      teamName: team.name,
      amount,
    });
    return { ok: true, feed: feedItem };
  }

  if (!state.settings.enableComments) return { ok: false, reason: 'DISABLED' };
  team.soldiers = Math.min(400, team.soldiers + state.settings.commentSoldierBonus * amount);
  if (player) player.score += 5;
  const feedItem = feed(state, 'comment', {
    playerName: player?.name ?? team.name,
    teamSlot: team.slot,
    teamName: team.name,
    amount,
  });
  return { ok: true, feed: feedItem };
}

/* ------------------------------------------------------------------ */
/* Görünüm                                                             */
/* ------------------------------------------------------------------ */

export function toBattleStateView(state: BattleState): BattleStateView {
  const teams: BattleTeamView[] = state.teams.map((team) => ({
    slot: team.slot,
    name: team.name,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
    symbol: team.symbol,
    emblemUrl: team.emblemUrl,
    soldierLook: team.soldierLook,
    castleLook: team.castleLook,
    soldiers: Math.round(team.soldiers),
    castleHp: Math.round(team.castleHp),
    maxCastleHp: team.maxCastleHp,
    score: Math.round(team.score),
    playerCount: team.playerCount,
    alive: team.alive,
    shieldStrength: Number(team.shieldStrength.toFixed(3)),
    shieldUntil: team.shieldUntil,
    attackBonusPercent: team.attackBonusPercent,
  }));
  const players: BattlePlayerView[] = state.players
    .filter((player) => player.teamSlot > 0)
    .map((player) => ({
      id: player.id,
      name: player.name,
      teamSlot: player.teamSlot,
      score: Math.round(player.score),
    }))
    .sort((a, b) => b.score - a.score);
  return {
    gameId: state.gameId,
    gameName: state.gameName,
    publicSlug: state.publicSlug,
    locale: state.locale,
    phase: state.phase,
    serverTime: state.now,
    roundIndex: state.roundIndex,
    startedAt: state.startedAt,
    endsAt: state.endsAt,
    lobbyStartsAt: state.lobbyStartsAt,
    durationMs: state.durationMs,
    teams,
    players,
    feed: state.feed.slice(-30),
    winnerSlot: state.winnerSlot,
    isDraw: state.isDraw,
    endReason: state.endReason,
    settings: state.settings,
    sessionId: state.sessionId,
    testMode: state.testMode,
  };
}

export function getWinningTeam(state: BattleState): BattleTeam | null {
  if (state.winnerSlot === null) return null;
  return teamBySlot(state, state.winnerSlot) ?? null;
}

export function setSessionId(state: BattleState, sessionId: string | null): void {
  state.sessionId = sessionId;
}

/** Sunucu yeniden başladığında oyuncuları geri yüklemek için. */
export function hydratePlayers(
  state: BattleState,
  players: Array<{ externalId: string; displayName: string; teamSlot: number; score: number }>,
): void {
  state.players = players.map((player) => ({
    id: player.externalId,
    name: player.displayName.slice(0, 32),
    teamSlot: player.teamSlot,
    score: player.score,
    joinedAt: state.now,
    lastCommandAt: 0,
    windowStartedAt: state.now,
    windowCount: 0,
    lastText: '',
    firstJoinRound: 0,
  }));
  recomputePlayerCounts(state);
}
