/**
 * Ortak domain tipleri.
 *
 * Bu tipler hem sunucu (Fastify) hem de istemci (React / Three.js) tarafından
 * kullanılır. Oyun motorunun tek bir doğruluk kaynağı vardır: sunucu.
 * İstemci yalnızca bu tipleri okur ve gösterir.
 */

export const LOCALES = ['tr', 'en', 'es', 'de', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];

export const SYSTEM_COMMANDS = [
  'JOIN_TEAM',
  'LEAVE_TEAM',
  'HELP',
  'SHOW_SCORE',
  'CHANGE_TEAM',
] as const;
export type SystemCommand = (typeof SYSTEM_COMMANDS)[number];

export const TEAM_COUNT_OPTIONS = [2, 4, 8] as const;
export type TeamCount = (typeof TEAM_COUNT_OPTIONS)[number];

export const WIN_CONDITIONS = ['last_standing', 'highest_castle_hp', 'highest_score'] as const;
export type WinCondition = (typeof WIN_CONDITIONS)[number];

export const SOLDIER_LOOKS = ['knight', 'warrior', 'archer', 'guard'] as const;
export type SoldierLook = (typeof SOLDIER_LOOKS)[number];

export const CASTLE_LOOKS = ['classic', 'tower', 'fortress'] as const;
export type CastleLook = (typeof CASTLE_LOOKS)[number];

export const GAME_STATUSES = ['draft', 'ready', 'live', 'disabled'] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

export const CATALOG_STATUSES = ['live', 'coming_soon', 'hidden'] as const;
export type CatalogStatus = (typeof CATALOG_STATUSES)[number];

export const CATALOG_ENGINES = ['fan_battle', 'coming_soon'] as const;
export type CatalogEngine = (typeof CATALOG_ENGINES)[number];

export interface GameProductDTO {
  id: string;
  slug: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  symbol: string;
  coverUrl: string | null;
  status: CatalogStatus;
  engineKey: CatalogEngine;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Sunucu tarafından uygulanan oyun ayarları. */
export interface GameSettings {
  /** Tur süresi (saniye). Varsayılan 90. */
  roundDurationSec: number;
  /** Takım başına başlangıç asker sayısı. */
  startingSoldiers: number;
  /** Saniyede üretilen asker. */
  soldierProductionRate: number;
  /** Kalenin toplam canı. */
  castleHp: number;
  /** Saldırı gücü. */
  attackPower: number;
  /** Savunma gücü (gelen hasarı azaltır). */
  defensePower: number;
  /** İzleyici takıma katıldığında eklenen asker. */
  joinSoldierBonus: number;
  /** Her oyuncunun takıma verdiği saldırı bonusu (%). */
  playerAttackBonusPercent: number;
  /** Hediye karşılığı özel saldırı hasarı. */
  giftAttackDamage: number;
  /** Beğeni karşılığı kalkan gücü (0-0.5). */
  likeShieldStrength: number;
  /** Kalkan süresi (saniye). */
  likeShieldDurationSec: number;
  /** Yorum karşılığı asker desteği. */
  commentSoldierBonus: number;
  /** Hediye → özel saldırı aktif mi? */
  enableGifts: boolean;
  /** Beğeni → savunma desteği aktif mi? */
  enableLikes: boolean;
  /** Yorum → asker desteği aktif mi? */
  enableComments: boolean;
  /** Kazanma koşulu. */
  winCondition: WinCondition;
  /** Komut başına bekleme süresi (ms). */
  commandCooldownMs: number;
  /** Takım başına maksimum oyuncu (0 = sınırsız). */
  maxPlayersPerTeam: number;
}

export interface TeamConfig {
  slot: number;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  emblemUrl: string | null;
  symbol: string;
  soldierLook: SoldierLook;
  castleLook: CastleLook;
  joinCommand: string;
  description: string;
}

export interface TeamDTO extends TeamConfig {
  id: string;
}

export interface GameConfig {
  gameName: string;
  language: Locale;
  teamCount: TeamCount;
  settings: GameSettings;
  teams: TeamConfig[];
}

export interface GameDTO extends GameConfig {
  id: string;
  teams: TeamDTO[];
  publicSlug: string;
  liveEnabled: boolean;
  status: GameStatus;
  configVersion: number;
  wizardCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Komut sistemi                                                       */
/* ------------------------------------------------------------------ */

export interface CommandDefinition {
  action: SystemCommand;
  /** Arayüzde gösterilen insan-okunur ad. */
  label: string;
  /** Varsayılan komut yazımları (dil bazlı). */
  phrases: string[];
}

export type CommandDictionary = Record<Locale, Record<SystemCommand, CommandDefinition>>;

export interface CommandSheetRow {
  action: SystemCommand;
  label: string;
  /** Etkin birincil komut (öneksiz). */
  command: string;
  isCustom: boolean;
}

export interface TeamCommandSheetRow {
  slot: number;
  teamName: string;
  color: string;
  command: string;
}

export interface CommandSheet {
  language: Locale;
  prefix: string;
  system: CommandSheetRow[];
  teams: TeamCommandSheetRow[];
}

/* ------------------------------------------------------------------ */
/* Ödeme / paket                                                       */
/* ------------------------------------------------------------------ */

export type SubscriptionStatus = 'active' | 'expired' | 'canceled';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type PaymentProviderId = 'test' | 'stripe' | 'manual' | 'shopier';

export interface PackageDTO {
  id: string;
  code: string;
  name: string;
  tagline: string;
  description: string;
  priceCents: number;
  currency: string;
  maxTeams: TeamCount;
  durationDays: number;
  features: string[];
  highlight: boolean;
  sortOrder: number;
  /** Admin tarafından yönetilen Shopier ürün bağlantısı (public DTO'da opsiyonel). */
  shopierUrl?: string | null;
  shopierProductId?: string | null;
  isActive?: boolean;
  gameKey?: string | null;
}

export interface SubscriptionDTO {
  status: SubscriptionStatus;
  packageId: string;
  packageName: string;
  maxTeams: TeamCount;
  startsAt: string;
  expiresAt: string;
}

export interface PaymentDTO {
  id: string;
  packageId: string;
  packageName: string;
  provider: PaymentProviderId;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'publisher' | 'admin';

export interface UserDTO {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: 'active' | 'suspended';
  emailVerified: boolean;
  createdAt: string;
}

export interface MeDTO {
  user: UserDTO;
  subscription: SubscriptionDTO | null;
  hasPanelAccess: boolean;
  game: GameDTO | null;
  packages: PackageDTO[];
  licenses: GameLicenseDTO[];
}

export interface GameLicenseDTO {
  id: string;
  gameKey: string;
  packageId: string;
  packageName: string;
  startsAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'revoked';
}

/* ------------------------------------------------------------------ */
/* Canlı oyun                                                          */
/* ------------------------------------------------------------------ */

export type BattlePhase = 'lobby' | 'running' | 'finished';

export type FeedKind =
  | 'join'
  | 'leave'
  | 'switch'
  | 'gift'
  | 'like'
  | 'comment'
  | 'castle_down'
  | 'round_start'
  | 'round_end'
  | 'system';

export interface BattleFeedItem {
  id: string;
  seq: number;
  at: number;
  kind: FeedKind;
  playerName?: string;
  teamSlot?: number;
  teamName?: string;
  amount?: number;
  /** Sistem mesajları için dil-bağımsız kod. */
  code?: string;
}

export interface BattleTeamView {
  slot: number;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  symbol: string;
  emblemUrl: string | null;
  soldierLook: SoldierLook;
  castleLook: CastleLook;
  soldiers: number;
  castleHp: number;
  maxCastleHp: number;
  score: number;
  playerCount: number;
  alive: boolean;
  shieldStrength: number;
  shieldUntil: number;
  attackBonusPercent: number;
}

export interface BattlePlayerView {
  id: string;
  name: string;
  teamSlot: number;
  score: number;
}

export interface BattleStateView {
  gameId: string;
  gameName: string;
  publicSlug: string;
  locale: Locale;
  phase: BattlePhase;
  /** Sunucunun o anki zamanı (ms). */
  serverTime: number;
  roundIndex: number;
  startedAt: number | null;
  endsAt: number | null;
  /** Lobi otomatik başlangıç zamanı (epoch ms). */
  lobbyStartsAt: number | null;
  durationMs: number;
  teams: BattleTeamView[];
  players: BattlePlayerView[];
  feed: BattleFeedItem[];
  winnerSlot: number | null;
  isDraw: boolean;
  endReason: 'elimination' | 'time' | 'manual' | null;
  settings: GameSettings;
  sessionId: string | null;
  /** Test/önizleme modunda üretilen state. */
  testMode: boolean;
}

/* ------------------------------------------------------------------ */
/* WebSocket mesajları                                                 */
/* ------------------------------------------------------------------ */

export interface WsClientHello {
  type: 'viewer';
  externalId: string;
  displayName: string;
}

export interface WsChatMessage {
  type: 'chat';
  text: string;
  /** İstemci tarafından üretilen benzersiz mesaj kimliği (dedupe). */
  msgId: string;
}

export interface WsPing {
  type: 'ping';
}

export type WsInbound = WsClientHello | WsChatMessage | WsPing;

export type WsNoticeCode =
  | 'TEAM_REQUIRED'
  | 'TEAM_NOT_FOUND'
  | 'ALREADY_IN_TEAM'
  | 'NOT_IN_TEAM'
  | 'USE_CHANGE_TEAM'
  | 'UNKNOWN_COMMAND'
  | 'RATE_LIMITED'
  | 'TEAM_FULL'
  | 'MATCH_NOT_RUNNING'
  | 'HELP_SHEET'
  | 'SCORE_SHEET'
  | 'JOINED'
  | 'LEFT'
  | 'SWITCHED'
  | 'COMMAND_DISABLED';

export interface WsServerMessage {
  type: 'state' | 'notice' | 'hello' | 'error' | 'pong';
  state?: BattleStateView;
  notice?: { code: WsNoticeCode; message?: string; teamName?: string; retryAfterMs?: number; teamSlot?: number };
  error?: string;
  serverTime?: number;
}

/* ------------------------------------------------------------------ */
/* İstatistikler                                                       */
/* ------------------------------------------------------------------ */

export interface TeamStatDTO {
  teamId: string;
  name: string;
  color: string;
  wins: number;
  losses: number;
  played: number;
  totalScore: number;
}

export interface PlayerStatDTO {
  id: string;
  name: string;
  teamName: string;
  teamColor: string;
  score: number;
  matches: number;
}

export interface MatchDTO {
  id: string;
  startedAt: string;
  endedAt: string | null;
  winnerTeamName: string | null;
  winnerColor: string | null;
  isDraw: boolean;
  participantCount: number;
  durationSec: number;
}

export interface PublisherStatsDTO {
  totalMatches: number;
  totalPlayers: number;
  totalUniquePlayers: number;
  averageParticipants: number;
  topTeam: TeamStatDTO | null;
  topPlayers: PlayerStatDTO[];
  highestScores: PlayerStatDTO[];
  recentMatches: MatchDTO[];
  teamStats: TeamStatDTO[];
  lastMatchAt: string | null;
}

export interface GameVersionDTO {
  version: number;
  createdAt: string;
  reason: string;
}

export interface CommandSettingsDTO {
  language: Locale;
  overrides: Partial<Record<SystemCommand, string>>;
  teams: Array<{ slot: number; name: string; joinCommand: string }>;
  effective: Array<{ action: SystemCommand; label: string; command: string; isCustom: boolean }>;
  sheet: CommandSheet;
}

export interface LiveSummaryDTO {
  phase: BattlePhase;
  roundIndex: number;
  players: number;
  viewers: number;
  endsAt: number | null;
  lobbyStartsAt: number | null;
}

export interface GameStateResponse {
  game: GameDTO | null;
  publicUrl: string | null;
  pendingApply: boolean;
  live: LiveSummaryDTO | null;
  commands: CommandSettingsDTO | null;
}

export interface CheckoutResponse {
  payment: PaymentDTO | null;
  redirectUrl: string;
}

export interface SessionHistoryDTO {
  id: string;
  roundIndex: number;
  startedAt: string;
  endedAt: string | null;
  winnerTeamName: string | null;
  winnerColor: string | null;
  isDraw: boolean;
  participantCount: number;
  durationSec: number;
  endReason: string | null;
}

export interface CatalogDTO {
  games: GameProductDTO[];
  packages: PackageDTO[];
  durations: number[];
}

export interface AdminOverviewDTO {
  totalUsers: number;
  totalPublishers: number;
  totalGames: number;
  activeSubscriptions: number;
  totalRevenueCents: number;
  currency: string;
  liveProducts: number;
  totalProducts: number;
  recentPayments: Array<PaymentDTO & { userEmail: string; displayName: string }>;
  packageSales: Array<{ packageId: string; name: string; sales: number; revenueCents: number }>;
}

export interface AdminPublisherRow {
  id: string;
  email: string;
  displayName: string;
  status: 'active' | 'suspended';
  role: UserRole;
  createdAt: string;
  gameName: string | null;
  gameSlug: string | null;
  teamCount: number | null;
  packageName: string | null;
  subscriptionStatus: string | null;
  expiresAt: string | null;
  totalMatches: number;
}

export interface AdminPaymentRow extends PaymentDTO {
  userEmail: string;
  displayName: string;
  providerTransactionId: string | null;
}

export interface AdminSettingsDTO {
  shopierStoreUrl: string;
  shopierWebhookConfigured: boolean;
  shopierApiConfigured?: boolean;
  shopierProviderActive: boolean;
  paymentProvider: string;
  webhookUrl: string;
}

export interface LiveBootstrapDTO {
  slug: string;
  gameName: string;
  locale: Locale;
  teamCount: TeamCount;
  teams: TeamDTO[];
  settings: GameSettings;
  commands: CommandSheet;
  liveEnabled: boolean;
  gameStatus: GameStatus;
}

/* ------------------------------------------------------------------ */
/* Hata cevabı                                                         */
/* ------------------------------------------------------------------ */

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, string[]>;
}


/* ------------------------------------------------------------------ */
/* Yayıncıya özel arcade odaları ve platform bağlantıları              */
/* ------------------------------------------------------------------ */

export const LIVE_PLATFORMS = ['twitch', 'youtube', 'tiktok'] as const;
export type LivePlatform = (typeof LIVE_PLATFORMS)[number];

export const PLATFORM_CONNECTION_STATUSES = [
  'connecting',
  'connected',
  'error',
  'disconnected',
] as const;
export type PlatformConnectionStatus = (typeof PLATFORM_CONNECTION_STATUSES)[number];

export interface ArcadeRoomDTO {
  id: string;
  gameKey: string;
  slug: string;
  name: string;
  status: 'live' | 'disabled';
  roundsPlayed: number;
  lastWinnerName: string | null;
  lastPlayedAt: string | null;
  settings: Record<string, unknown>;
  hosts: Array<{ id: string; name: string }>;
  isOwner: boolean;
  createdAt: string;
  publicUrl: string;
  obsUrl: string;
  overlayUrl: string;
}

export interface PlatformConnectionDTO {
  id: string;
  platform: LivePlatform;
  channel: string;
  status: PlatformConnectionStatus;
  lastEventAt: string | null;
  lastError: string | null;
  connectorUrl: string | null;
  createdAt: string;
}

export interface ArcadeRoomPublicDTO {
  room: ArcadeRoomDTO;
  game: import('./arcade.js').ArcadeGameDef;
  licensed: boolean;
  overlayPro?: boolean;
  connections: Array<Pick<PlatformConnectionDTO, 'platform' | 'channel' | 'status'>>;
  activePlayers: number;
}
