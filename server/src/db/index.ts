import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type DB = Database.Database;

const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS packages (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    tagline TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    currency TEXT NOT NULL DEFAULT 'TRY',
    max_teams INTEGER NOT NULL CHECK (max_teams IN (2, 4, 8)),
    duration_days INTEGER NOT NULL DEFAULT 30 CHECK (duration_days > 0),
    features_json TEXT NOT NULL DEFAULT '[]',
    highlight INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id TEXT NOT NULL REFERENCES packages(id),
    provider TEXT NOT NULL,
    provider_transaction_id TEXT UNIQUE,
    provider_checkout_id TEXT,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    currency TEXT NOT NULL DEFAULT 'TRY',
    status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    idempotency_key TEXT NOT NULL UNIQUE,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_payments_user ON payments (user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);

  CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT '',
    payment_id TEXT REFERENCES payments(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
    payload_json TEXT NOT NULL DEFAULT '{}',
    received_at TEXT NOT NULL,
    processed_at TEXT,
    UNIQUE (provider, event_id)
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id TEXT NOT NULL REFERENCES packages(id),
    payment_id TEXT REFERENCES payments(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'canceled')),
    starts_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id, expires_at DESC);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);

  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    public_slug TEXT NOT NULL UNIQUE,
    game_name TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'tr' CHECK (language IN ('tr', 'en', 'es', 'de', 'fr')),
    team_count INTEGER NOT NULL CHECK (team_count IN (2, 4, 8)),
    settings_json TEXT NOT NULL,
    command_overrides_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'live', 'disabled')),
    live_enabled INTEGER NOT NULL DEFAULT 1,
    wizard_completed INTEGER NOT NULL DEFAULT 0,
    config_version INTEGER NOT NULL DEFAULT 1,
    active_session_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_games_slug ON games (public_slug);

  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    slot INTEGER NOT NULL,
    name TEXT NOT NULL,
    primary_color TEXT NOT NULL,
    secondary_color TEXT NOT NULL,
    emblem_url TEXT,
    symbol TEXT NOT NULL DEFAULT '⭐',
    soldier_look TEXT NOT NULL DEFAULT 'knight',
    castle_look TEXT NOT NULL DEFAULT 'classic',
    join_command TEXT NOT NULL,
    join_command_norm TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    configuration_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (game_id, slot),
    UNIQUE (game_id, join_command_norm)
  );
  CREATE INDEX IF NOT EXISTS idx_teams_game ON teams (game_id, slot);

  CREATE TABLE IF NOT EXISTS game_config_versions (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    reason TEXT NOT NULL DEFAULT 'save',
    snapshot_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (game_id, version)
  );
  CREATE INDEX IF NOT EXISTS idx_versions_game ON game_config_versions (game_id, version DESC);

  CREATE TABLE IF NOT EXISTS game_sessions (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'finished', 'abandoned')),
    round_index INTEGER NOT NULL DEFAULT 1,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    winner_team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
    is_draw INTEGER NOT NULL DEFAULT 0,
    end_reason TEXT,
    participant_count INTEGER NOT NULL DEFAULT 0,
    config_version INTEGER NOT NULL DEFAULT 1,
    config_snapshot_json TEXT NOT NULL DEFAULT '{}',
    summary_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_game ON game_sessions (game_id, started_at DESC);
  CREATE INDEX IF NOT EXISTS idx_sessions_status ON game_sessions (status);

  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    external_player_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
    score INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (game_id, external_player_id)
  );
  CREATE INDEX IF NOT EXISTS idx_players_game ON players (game_id, score DESC);

  CREATE TABLE IF NOT EXISTS session_participants (
    session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
    team_slot INTEGER NOT NULL DEFAULT 0,
    team_name TEXT NOT NULL DEFAULT '',
    team_color TEXT NOT NULL DEFAULT '#64748b',
    score INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (session_id, player_id)
  );
  CREATE INDEX IF NOT EXISTS idx_participants_player ON session_participants (player_id);

  CREATE TABLE IF NOT EXISTS game_events (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    session_id TEXT REFERENCES game_sessions(id) ON DELETE SET NULL,
    player_id TEXT REFERENCES players(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_data_json TEXT NOT NULL DEFAULT '{}',
    external_event_id TEXT,
    created_at TEXT NOT NULL,
    UNIQUE (game_id, external_event_id)
  );
  CREATE INDEX IF NOT EXISTS idx_events_game ON game_events (game_id, created_at DESC);
  `,
  `
  ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'publisher';

  ALTER TABLE packages ADD COLUMN shopier_url TEXT;

  CREATE TABLE IF NOT EXISTS game_products (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'arena',
    tagline TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    symbol TEXT NOT NULL DEFAULT '🎮',
    cover_url TEXT,
    status TEXT NOT NULL DEFAULT 'coming_soon' CHECK (status IN ('live', 'coming_soon', 'hidden')),
    engine_key TEXT NOT NULL DEFAULT 'coming_soon' CHECK (engine_key IN ('fan_battle', 'coming_soon')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_products_status ON game_products (status, sort_order);

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS arcade_rooms (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_key TEXT NOT NULL,
    public_slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'disabled')),
    settings_json TEXT NOT NULL DEFAULT '{}',
    rounds_played INTEGER NOT NULL DEFAULT 0,
    last_winner_name TEXT,
    last_played_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (user_id, game_key)
  );
  CREATE INDEX IF NOT EXISTS idx_arcade_rooms_user ON arcade_rooms (user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_arcade_rooms_slug ON arcade_rooms (public_slug);

  CREATE TABLE IF NOT EXISTS platform_connections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id TEXT NOT NULL REFERENCES arcade_rooms(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('twitch', 'youtube', 'tiktok')),
    channel TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'connecting' CHECK (status IN ('connecting', 'connected', 'error', 'disconnected')),
    config_json TEXT NOT NULL DEFAULT '{}',
    connector_token TEXT UNIQUE,
    last_event_at TEXT,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (room_id, platform)
  );
  CREATE INDEX IF NOT EXISTS idx_platform_connections_room ON platform_connections (room_id);
  CREATE INDEX IF NOT EXISTS idx_platform_connections_token ON platform_connections (connector_token);

  CREATE TABLE IF NOT EXISTS arcade_sessions (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES arcade_rooms(id) ON DELETE CASCADE,
    game_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'finished', 'abandoned')),
    started_at TEXT NOT NULL,
    ended_at TEXT,
    winner_name TEXT,
    player_count INTEGER NOT NULL DEFAULT 0,
    summary_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_arcade_sessions_room ON arcade_sessions (room_id, started_at DESC);
  `,
  `
  ALTER TABLE packages ADD COLUMN game_key TEXT;

  CREATE TABLE IF NOT EXISTS game_licenses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_key TEXT NOT NULL,
    package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
    payment_id TEXT REFERENCES payments(id) ON DELETE SET NULL,
    starts_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_game_licenses_user ON game_licenses (user_id, game_key, expires_at DESC);
  CREATE INDEX IF NOT EXISTS idx_game_licenses_game ON game_licenses (game_key, status);
  `,
  `
  CREATE TABLE IF NOT EXISTS trial_usage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_key TEXT NOT NULL,
    day TEXT NOT NULL,
    started_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (user_id, day)
  );
  CREATE INDEX IF NOT EXISTS idx_trial_usage_user ON trial_usage (user_id, day);
  `,
  `
  CREATE TABLE IF NOT EXISTS arcade_room_hosts (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES arcade_rooms(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    UNIQUE (room_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_arcade_room_hosts_user ON arcade_room_hosts (user_id);
  `,
  `
  CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    percent_off INTEGER NOT NULL DEFAULT 0 CHECK (percent_off >= 0 AND percent_off <= 100),
    fixed_off_cents INTEGER NOT NULL DEFAULT 0 CHECK (fixed_off_cents >= 0),
    active INTEGER NOT NULL DEFAULT 1,
    max_uses INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code);
  `,
  `
  CREATE TABLE IF NOT EXISTS arcade_room_bans (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES arcade_rooms(id) ON DELETE CASCADE,
    viewer_id TEXT NOT NULL,
    viewer_name TEXT NOT NULL,
    reason TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    UNIQUE (room_id, viewer_id)
  );
  CREATE INDEX IF NOT EXISTS idx_arcade_room_bans_room ON arcade_room_bans (room_id, created_at DESC);
  `,
];

export function openDatabase(path: string): DB {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  return db;
}

export function migrate(db: DB): void {
  const current = Number(db.pragma('user_version', { simple: true }) ?? 0);
  for (let index = current; index < MIGRATIONS.length; index += 1) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[index]);
      db.pragma(`user_version = ${index + 1}`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function isoPlusDays(days: number, from = new Date()): string {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function isIsoExpired(iso: string, now = Date.now()): boolean {
  const time = Date.parse(iso);
  return !Number.isFinite(time) || time <= now;
}
