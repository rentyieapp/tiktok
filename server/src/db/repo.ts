import type { DB } from './index.js';

/* ------------------------------------------------------------------ */
/* Satır tipleri                                                       */
/* ------------------------------------------------------------------ */

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: 'publisher' | 'admin';
  status: 'active' | 'suspended';
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PackageRow {
  id: string;
  code: string;
  name: string;
  tagline: string;
  description: string;
  price_cents: number;
  currency: string;
  max_teams: 2 | 4 | 8;
  duration_days: number;
  features_json: string;
  highlight: number;
  sort_order: number;
  is_active: number;
  shopier_url: string | null;
  shopier_product_id: string | null;
  game_key: string | null;
}

export interface PaymentRow {
  id: string;
  user_id: string;
  package_id: string;
  provider: string;
  provider_transaction_id: string | null;
  provider_checkout_id: string | null;
  amount_cents: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  idempotency_key: string;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  package_id: string;
  payment_id: string | null;
  status: 'active' | 'expired' | 'canceled';
  starts_at: string;
  expires_at: string;
  created_at: string;
}

export interface GameRow {
  id: string;
  user_id: string;
  public_slug: string;
  game_name: string;
  language: 'tr' | 'en' | 'es' | 'de' | 'fr';
  team_count: 2 | 4 | 8;
  settings_json: string;
  command_overrides_json: string;
  status: 'draft' | 'ready' | 'live' | 'disabled';
  live_enabled: number;
  wizard_completed: number;
  config_version: number;
  active_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamRow {
  id: string;
  game_id: string;
  slot: number;
  name: string;
  primary_color: string;
  secondary_color: string;
  emblem_url: string | null;
  symbol: string;
  soldier_look: string;
  castle_look: string;
  join_command: string;
  join_command_norm: string;
  description: string;
  configuration_json: string;
  created_at: string;
  updated_at: string;
}

export interface SessionRow {
  id: string;
  game_id: string;
  status: 'running' | 'finished' | 'abandoned';
  round_index: number;
  started_at: string;
  ended_at: string | null;
  winner_team_id: string | null;
  is_draw: number;
  end_reason: string | null;
  participant_count: number;
  config_version: number;
  config_snapshot_json: string;
  summary_json: string;
  created_at: string;
}

export interface PlayerRow {
  id: string;
  game_id: string;
  external_player_id: string;
  display_name: string;
  team_id: string | null;
  score: number;
  created_at: string;
  updated_at: string;
}

export interface ParticipantRow {
  session_id: string;
  player_id: string;
  team_id: string | null;
  team_slot: number;
  team_name: string;
  team_color: string;
  score: number;
}

export interface GameVersionRow {
  id: string;
  game_id: string;
  version: number;
  reason: string;
  snapshot_json: string;
  created_at: string;
}

export interface WebhookEventRow {
  id: string;
  provider: string;
  event_id: string;
  event_type: string;
  payment_id: string | null;
  status: 'received' | 'processed' | 'ignored' | 'failed';
  payload_json: string;
  received_at: string;
  processed_at: string | null;
}

export function transaction<T>(db: DB, fn: () => T): T {
  const wrapped = db.transaction(fn);
  return wrapped();
}

/* ------------------------------------------------------------------ */
/* Kullanıcılar                                                        */
/* ------------------------------------------------------------------ */

export function createUser(
  db: DB,
  user: {
    id: string;
    email: string;
    passwordHash: string;
    displayName: string;
    now: string;
    role?: 'publisher' | 'admin';
    emailVerifiedAt?: string | null;
  },
): UserRow {
  db.prepare(
    `INSERT INTO users (id, email, password_hash, display_name, role, status, email_verified_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, COALESCE(?, 'publisher'), 'active', ?, ?, ?)`,
  ).run(user.id, user.email, user.passwordHash, user.displayName, user.role ?? null, user.emailVerifiedAt ?? null, user.now, user.now);
  return findUserById(db, user.id)!;
}

export function findUserById(db: DB, id: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

export function findUserByEmail(db: DB, email: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
}

export function updateUserProfile(db: DB, userId: string, displayName: string, now: string): void {
  db.prepare('UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?').run(
    displayName,
    now,
    userId,
  );
}

export function updateUserEmail(db: DB, userId: string, email: string, now: string): void {
  db.prepare('UPDATE users SET email = ?, updated_at = ? WHERE id = ?').run(email, now, userId);
}

export function updateUserPassword(db: DB, userId: string, hash: string, now: string): void {
  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
    hash,
    now,
    userId,
  );
}

export function updateUserRole(db: DB, userId: string, role: 'publisher' | 'admin', now: string): void {
  db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(role, now, userId);
}

export function listPublishers(db: DB): UserRow[] {
  return db
    .prepare("SELECT * FROM users WHERE role = 'publisher' ORDER BY created_at DESC LIMIT 200")
    .all() as UserRow[];
}

export function countUsers(db: DB, role?: 'publisher' | 'admin'): number {
  const row = role
    ? (db.prepare('SELECT COUNT(*) AS count FROM users WHERE role = ?').get(role) as { count: number })
    : (db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number });
  return Number(row.count);
}

export function listAllPayments(db: DB): Array<PaymentRow & { user_email: string; display_name: string; package_name: string }> {
  return db
    .prepare(
      `SELECT p.*, u.email AS user_email, u.display_name, pk.name AS package_name
       FROM payments p
       JOIN users u ON u.id = p.user_id
       JOIN packages pk ON pk.id = p.package_id
       ORDER BY p.created_at DESC LIMIT 300`,
    )
    .all() as Array<PaymentRow & { user_email: string; display_name: string; package_name: string }>;
}

export function sumSucceededRevenue(db: DB): { revenue: number; count: number } {
  const row = db
    .prepare(
      "SELECT COALESCE(SUM(amount_cents), 0) AS revenue, COUNT(*) AS count FROM payments WHERE status = 'succeeded'",
    )
    .get() as { revenue: number; count: number };
  return { revenue: Number(row.revenue), count: Number(row.count) };
}

export function countActiveSubscriptions(db: DB, nowIso: string): number {
  const row = db
    .prepare(
      "SELECT COUNT(*) AS count FROM subscriptions WHERE status = 'active' AND expires_at > ?",
    )
    .get(nowIso) as { count: number };
  return Number(row.count);
}

export function countGames(db: DB): number {
  const row = db.prepare('SELECT COUNT(*) AS count FROM games').get() as { count: number };
  return Number(row.count);
}

export function listPackageSales(db: DB): Array<{ package_id: string; name: string; sales: number; revenue_cents: number }> {
  return db
    .prepare(
      `SELECT p.package_id, pk.name, COUNT(*) AS sales, COALESCE(SUM(p.amount_cents), 0) AS revenue_cents
       FROM payments p JOIN packages pk ON pk.id = p.package_id
       WHERE p.status = 'succeeded'
       GROUP BY p.package_id ORDER BY revenue_cents DESC LIMIT 20`,
    )
    .all() as Array<{ package_id: string; name: string; sales: number; revenue_cents: number }>;
}

/* ------------------------------------------------------------------ */
/* Paketler                                                            */
/* ------------------------------------------------------------------ */

export function listPackages(db: DB, activeOnly = true): PackageRow[] {
  const where = activeOnly ? 'WHERE is_active = 1' : '';
  return db
    .prepare(`SELECT * FROM packages ${where} ORDER BY sort_order ASC, price_cents ASC`)
    .all() as PackageRow[];
}

export function findPackageByShopierProductId(db: DB, productId: string): PackageRow | undefined {
  return db
    .prepare('SELECT * FROM packages WHERE shopier_product_id = ? AND is_active = 1 ORDER BY sort_order ASC LIMIT 1')
    .get(productId) as PackageRow | undefined;
}

export function setPackageShopierProductId(db: DB, id: string, productId: string): boolean {
  const result = db
    .prepare('UPDATE packages SET shopier_product_id = ? WHERE id = ?')
    .run(productId.trim() || null, id);
  return result.changes > 0;
}

export function findPackageById(db: DB, id: string): PackageRow | undefined {
  return db.prepare('SELECT * FROM packages WHERE id = ?').get(id) as PackageRow | undefined;
}

export function findPackageByCode(db: DB, code: string): PackageRow | undefined {
  return db.prepare('SELECT * FROM packages WHERE code = ?').get(code) as PackageRow | undefined;
}

/* ------------------------------------------------------------------ */
/* Ödemeler                                                           */
/* ------------------------------------------------------------------ */

export function createPayment(db: DB, payment: PaymentRow): void {
  db.prepare(
    `INSERT INTO payments (
      id, user_id, package_id, provider, provider_transaction_id, provider_checkout_id,
      amount_cents, currency, status, idempotency_key, metadata_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    payment.id,
    payment.user_id,
    payment.package_id,
    payment.provider,
    payment.provider_transaction_id,
    payment.provider_checkout_id,
    payment.amount_cents,
    payment.currency,
    payment.status,
    payment.idempotency_key,
    payment.metadata_json,
    payment.created_at,
    payment.updated_at,
  );
}

export function findPaymentById(db: DB, id: string): PaymentRow | undefined {
  return db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as PaymentRow | undefined;
}

export function findPaymentForUser(db: DB, id: string, userId: string): PaymentRow | undefined {
  return db.prepare('SELECT * FROM payments WHERE id = ? AND user_id = ?').get(id, userId) as
    | PaymentRow
    | undefined;
}

export function listPaymentsForUser(db: DB, userId: string): PaymentRow[] {
  return db
    .prepare('SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 100')
    .all(userId) as PaymentRow[];
}

export function updatePaymentCheckout(
  db: DB,
  paymentId: string,
  fields: { providerCheckoutId?: string | null; providerTransactionId?: string | null; now: string },
): void {
  db.prepare(
    `UPDATE payments SET provider_checkout_id = COALESCE(?, provider_checkout_id),
      provider_transaction_id = COALESCE(?, provider_transaction_id), updated_at = ?
     WHERE id = ?`,
  ).run(fields.providerCheckoutId ?? null, fields.providerTransactionId ?? null, fields.now, paymentId);
}

export function markPaymentStatus(
  db: DB,
  paymentId: string,
  from: 'pending' | 'succeeded' | 'failed',
  to: 'succeeded' | 'failed' | 'refunded',
  now: string,
  transactionId?: string | null,
): boolean {
  const result = db
    .prepare(
      `UPDATE payments SET status = ?, provider_transaction_id = COALESCE(?, provider_transaction_id), updated_at = ?
       WHERE id = ? AND status = ?`,
    )
    .run(to, transactionId ?? null, now, paymentId, from);
  return result.changes > 0;
}

export function forcePaymentStatus(
  db: DB,
  paymentId: string,
  status: 'pending' | 'succeeded' | 'failed' | 'refunded',
  now: string,
): void {
  db.prepare('UPDATE payments SET status = ?, updated_at = ? WHERE id = ?').run(status, now, paymentId);
}

/* ------------------------------------------------------------------ */
/* Abonelikler                                                        */
/* ------------------------------------------------------------------ */

export function expireOldSubscriptions(db: DB, userId: string, nowIso: string): void {
  db.prepare(
    `UPDATE subscriptions SET status = 'expired'
     WHERE user_id = ? AND status = 'active' AND expires_at <= ?`,
  ).run(userId, nowIso);
}

export function findActiveSubscription(db: DB, userId: string, nowIso: string): SubscriptionRow | undefined {
  return db
    .prepare(
      `SELECT * FROM subscriptions
       WHERE user_id = ? AND status = 'active' AND expires_at > ?
       ORDER BY expires_at DESC LIMIT 1`,
    )
    .get(userId, nowIso) as SubscriptionRow | undefined;
}

export function listSubscriptionsForUser(db: DB, userId: string): SubscriptionRow[] {
  return db
    .prepare('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(userId) as SubscriptionRow[];
}

export function createSubscription(
  db: DB,
  subscription: {
    id: string;
    userId: string;
    packageId: string;
    paymentId: string | null;
    startsAt: string;
    expiresAt: string;
  },
): void {
  db.prepare(
    `INSERT INTO subscriptions (id, user_id, package_id, payment_id, status, starts_at, expires_at, created_at)
     VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`,
  ).run(
    subscription.id,
    subscription.userId,
    subscription.packageId,
    subscription.paymentId,
    subscription.startsAt,
    subscription.expiresAt,
    subscription.startsAt,
  );
}

export function cancelOtherSubscriptions(
  db: DB,
  userId: string,
  keepId: string,
  nowIso: string,
): void {
  db.prepare(
    `UPDATE subscriptions SET status = 'canceled'
     WHERE user_id = ? AND id <> ? AND status = 'active' AND expires_at > ?`,
  ).run(userId, keepId, nowIso);
}

/* ------------------------------------------------------------------ */
/* Webhook olayları                                                   */
/* ------------------------------------------------------------------ */

export function insertWebhookEvent(
  db: DB,
  event: {
    id: string;
    provider: string;
    eventId: string;
    eventType: string;
    paymentId: string | null;
    status: WebhookEventRow['status'];
    payloadJson: string;
    now: string;
  },
): boolean {
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO webhook_events
        (id, provider, event_id, event_type, payment_id, status, payload_json, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      event.id,
      event.provider,
      event.eventId,
      event.eventType,
      event.paymentId,
      event.status,
      event.payloadJson,
      event.now,
    );
  return result.changes > 0;
}

export function markWebhookEvent(
  db: DB,
  id: string,
  status: WebhookEventRow['status'],
  now: string,
): void {
  db.prepare('UPDATE webhook_events SET status = ?, processed_at = ? WHERE id = ?').run(
    status,
    now,
    id,
  );
}

/* ------------------------------------------------------------------ */
/* Oyunlar                                                             */
/* ------------------------------------------------------------------ */

export function createGameTx(
  db: DB,
  game: GameRow,
  teams: TeamRow[],
): void {
  transaction(db, () => {
    db.prepare(
      `INSERT INTO games (
        id, user_id, public_slug, game_name, language, team_count, settings_json,
        command_overrides_json, status, live_enabled, wizard_completed, config_version,
        active_session_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      game.id,
      game.user_id,
      game.public_slug,
      game.game_name,
      game.language,
      game.team_count,
      game.settings_json,
      game.command_overrides_json,
      game.status,
      game.live_enabled,
      game.wizard_completed,
      game.config_version,
      game.active_session_id,
      game.created_at,
      game.updated_at,
    );
    const insertTeam = db.prepare(
      `INSERT INTO teams (
        id, game_id, slot, name, primary_color, secondary_color, emblem_url, symbol,
        soldier_look, castle_look, join_command, join_command_norm, description,
        configuration_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const team of teams) {
      insertTeam.run(
        team.id,
        team.game_id,
        team.slot,
        team.name,
        team.primary_color,
        team.secondary_color,
        team.emblem_url,
        team.symbol,
        team.soldier_look,
        team.castle_look,
        team.join_command,
        team.join_command_norm,
        team.description,
        team.configuration_json,
        team.created_at,
        team.updated_at,
      );
    }
  });
}

export function findGameByUserId(db: DB, userId: string): GameRow | undefined {
  return db.prepare('SELECT * FROM games WHERE user_id = ?').get(userId) as GameRow | undefined;
}

export function findGameById(db: DB, gameId: string): GameRow | undefined {
  return db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as GameRow | undefined;
}

export function findGameBySlug(db: DB, slug: string): GameRow | undefined {
  return db.prepare('SELECT * FROM games WHERE public_slug = ?').get(slug) as GameRow | undefined;
}

export function updateGameRow(
  db: DB,
  gameId: string,
  fields: {
    gameName: string;
    language: GameRow['language'];
    teamCount: number;
    settingsJson: string;
    overridesJson: string;
    status: GameRow['status'];
    liveEnabled: number;
    wizardCompleted: number;
    configVersion: number;
    now: string;
  },
): void {
  db.prepare(
    `UPDATE games SET game_name = ?, language = ?, team_count = ?, settings_json = ?,
      command_overrides_json = ?, status = ?, live_enabled = ?, wizard_completed = ?,
      config_version = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    fields.gameName,
    fields.language,
    fields.teamCount,
    fields.settingsJson,
    fields.overridesJson,
    fields.status,
    fields.liveEnabled,
    fields.wizardCompleted,
    fields.configVersion,
    fields.now,
    gameId,
  );
}

export function setGameLiveEnabled(db: DB, gameId: string, enabled: boolean, now: string): void {
  db.prepare(
    `UPDATE games SET live_enabled = ?, status = ?, updated_at = ? WHERE id = ?`,
  ).run(enabled ? 1 : 0, enabled ? 'ready' : 'disabled', now, gameId);
}

export function setActiveSession(db: DB, gameId: string, sessionId: string | null, now: string): void {
  db.prepare('UPDATE games SET active_session_id = ?, updated_at = ? WHERE id = ?').run(
    sessionId,
    now,
    gameId,
  );
}

/* ------------------------------------------------------------------ */
/* Takımlar                                                            */
/* ------------------------------------------------------------------ */

export function listTeams(db: DB, gameId: string): TeamRow[] {
  return db
    .prepare('SELECT * FROM teams WHERE game_id = ? ORDER BY slot ASC')
    .all(gameId) as TeamRow[];
}

export function findTeamById(db: DB, teamId: string): TeamRow | undefined {
  return db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as TeamRow | undefined;
}

/** Takımları slot bazında senkronize eder; mevcut takım ID'lerini korur. */
export function syncTeamsTx(db: DB, gameId: string, teams: TeamRow[]): void {
  transaction(db, () => {
    const existing = listTeams(db, gameId);
    const existingBySlot = new Map(existing.map((team) => [team.slot, team]));
    const keepIds = new Set(teams.map((team) => team.id));
    const insert = db.prepare(
      `INSERT INTO teams (
        id, game_id, slot, name, primary_color, secondary_color, emblem_url, symbol,
        soldier_look, castle_look, join_command, join_command_norm, description,
        configuration_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const update = db.prepare(
      `UPDATE teams SET slot = ?, name = ?, primary_color = ?, secondary_color = ?,
        emblem_url = ?, symbol = ?, soldier_look = ?, castle_look = ?, join_command = ?,
        join_command_norm = ?, description = ?, configuration_json = ?, updated_at = ?
       WHERE id = ? AND game_id = ?`,
    );
    const remove = db.prepare('DELETE FROM teams WHERE id = ? AND game_id = ?');
    for (const team of teams) {
      const current = existingBySlot.get(team.slot);
      if (current) {
        update.run(
          team.slot,
          team.name,
          team.primary_color,
          team.secondary_color,
          team.emblem_url,
          team.symbol,
          team.soldier_look,
          team.castle_look,
          team.join_command,
          team.join_command_norm,
          team.description,
          team.configuration_json,
          team.updated_at,
          current.id,
          gameId,
        );
      } else {
        insert.run(
          team.id,
          gameId,
          team.slot,
          team.name,
          team.primary_color,
          team.secondary_color,
          team.emblem_url,
          team.symbol,
          team.soldier_look,
          team.castle_look,
          team.join_command,
          team.join_command_norm,
          team.description,
          team.configuration_json,
          team.created_at,
          team.updated_at,
        );
      }
    }
    for (const team of existing) {
      if (!keepIds.has(team.id)) remove.run(team.id, gameId);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Yapılandırma sürümleri                                              */
/* ------------------------------------------------------------------ */

export function addConfigVersion(
  db: DB,
  version: {
    id: string;
    gameId: string;
    version: number;
    reason: string;
    snapshotJson: string;
    now: string;
  },
): void {
  db.prepare(
    `INSERT OR IGNORE INTO game_config_versions (id, game_id, version, reason, snapshot_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(version.id, version.gameId, version.version, version.reason, version.snapshotJson, version.now);
}

export function listConfigVersions(db: DB, gameId: string): GameVersionRow[] {
  return db
    .prepare(
      'SELECT * FROM game_config_versions WHERE game_id = ? ORDER BY version DESC LIMIT 30',
    )
    .all(gameId) as GameVersionRow[];
}

export function findConfigVersion(db: DB, gameId: string, version: number): GameVersionRow | undefined {
  return db
    .prepare('SELECT * FROM game_config_versions WHERE game_id = ? AND version = ?')
    .get(gameId, version) as GameVersionRow | undefined;
}

/* ------------------------------------------------------------------ */
/* Oyun oturumları                                                     */
/* ------------------------------------------------------------------ */

export function createGameSession(db: DB, session: SessionRow): void {
  db.prepare(
    `INSERT INTO game_sessions (
      id, game_id, status, round_index, started_at, ended_at, winner_team_id, is_draw,
      end_reason, participant_count, config_version, config_snapshot_json, summary_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    session.id,
    session.game_id,
    session.status,
    session.round_index,
    session.started_at,
    session.ended_at,
    session.winner_team_id,
    session.is_draw,
    session.end_reason,
    session.participant_count,
    session.config_version,
    session.config_snapshot_json,
    session.summary_json,
    session.created_at,
  );
}

export interface SessionWithWinner extends SessionRow {
  winner_name: string | null;
  winner_color: string | null;
}

export function listGameSessions(db: DB, gameId: string, limit = 25): SessionWithWinner[] {
  return db
    .prepare(
      `SELECT s.*, t.name AS winner_name, t.primary_color AS winner_color
       FROM game_sessions s
       LEFT JOIN teams t ON t.id = s.winner_team_id
       WHERE s.game_id = ? AND s.status = 'finished'
       ORDER BY s.started_at DESC LIMIT ?`,
    )
    .all(gameId, limit) as SessionWithWinner[];
}

export function findGameSession(db: DB, sessionId: string): SessionRow | undefined {
  return db.prepare('SELECT * FROM game_sessions WHERE id = ?').get(sessionId) as
    | SessionRow
    | undefined;
}

export function updateSessionProgress(
  db: DB,
  sessionId: string,
  participantCount: number,
): void {
  db.prepare('UPDATE game_sessions SET participant_count = ? WHERE id = ?').run(
    participantCount,
    sessionId,
  );
}

export function finishSessionRow(
  db: DB,
  sessionId: string,
  fields: {
    endedAt: string;
    winnerTeamId: string | null;
    isDraw: boolean;
    endReason: string;
    participantCount: number;
    summaryJson: string;
  },
): void {
  db.prepare(
    `UPDATE game_sessions SET status = 'finished', ended_at = ?, winner_team_id = ?,
      is_draw = ?, end_reason = ?, participant_count = ?, summary_json = ?
     WHERE id = ? AND status = 'running'`,
  ).run(
    fields.endedAt,
    fields.winnerTeamId,
    fields.isDraw ? 1 : 0,
    fields.endReason,
    fields.participantCount,
    fields.summaryJson,
    sessionId,
  );
}

export function abandonSessionRow(db: DB, sessionId: string, now: string): void {
  db.prepare(
    `UPDATE game_sessions SET status = 'abandoned', ended_at = ?, end_reason = 'server_restart'
     WHERE id = ? AND status = 'running'`,
  ).run(now, sessionId);
}

export function markAllRunningSessionsAbandoned(db: DB, now: string): number {
  const result = db
    .prepare(
      `UPDATE game_sessions SET status = 'abandoned', ended_at = ?, end_reason = 'server_restart'
       WHERE status = 'running'`,
    )
    .run(now);
  db.prepare('UPDATE games SET active_session_id = NULL WHERE active_session_id IS NOT NULL').run();
  return result.changes;
}

/* ------------------------------------------------------------------ */
/* Oyuncular ve katılımlar                                             */
/* ------------------------------------------------------------------ */

export function upsertPlayer(
  db: DB,
  player: {
    id: string;
    gameId: string;
    externalId: string;
    displayName: string;
    teamId: string | null;
    now: string;
  },
): PlayerRow {
  db.prepare(
    `INSERT INTO players (id, game_id, external_player_id, display_name, team_id, score, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)
     ON CONFLICT(game_id, external_player_id) DO UPDATE SET
       display_name = excluded.display_name,
       team_id = excluded.team_id,
       updated_at = excluded.updated_at`,
  ).run(
    player.id,
    player.gameId,
    player.externalId,
    player.displayName,
    player.teamId,
    player.now,
    player.now,
  );
  return db
    .prepare('SELECT * FROM players WHERE game_id = ? AND external_player_id = ?')
    .get(player.gameId, player.externalId) as PlayerRow;
}

export function addPlayerCumulativeScore(db: DB, playerId: string, score: number, now: string): void {
  db.prepare('UPDATE players SET score = score + ?, updated_at = ? WHERE id = ?').run(
    score,
    now,
    playerId,
  );
}

export function listPlayersForGame(db: DB, gameId: string): PlayerRow[] {
  return db
    .prepare('SELECT * FROM players WHERE game_id = ? ORDER BY score DESC LIMIT 500')
    .all(gameId) as PlayerRow[];
}

export function upsertParticipant(db: DB, participant: ParticipantRow): void {
  db.prepare(
    `INSERT INTO session_participants
      (session_id, player_id, team_id, team_slot, team_name, team_color, score)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(session_id, player_id) DO UPDATE SET
       team_id = excluded.team_id, team_slot = excluded.team_slot,
       team_name = excluded.team_name, team_color = excluded.team_color, score = excluded.score`,
  ).run(
    participant.session_id,
    participant.player_id,
    participant.team_id,
    participant.team_slot,
    participant.team_name,
    participant.team_color,
    participant.score,
  );
}

export function listParticipants(db: DB, sessionId: string): ParticipantRow[] {
  return db
    .prepare('SELECT * FROM session_participants WHERE session_id = ? ORDER BY score DESC')
    .all(sessionId) as ParticipantRow[];
}

/* ------------------------------------------------------------------ */
/* Oyun olayları                                                       */
/* ------------------------------------------------------------------ */

export function insertGameEvent(
  db: DB,
  event: {
    id: string;
    gameId: string;
    sessionId: string | null;
    playerId: string | null;
    eventType: string;
    eventDataJson: string;
    externalEventId: string | null;
    now: string;
  },
): boolean {
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO game_events
        (id, game_id, session_id, player_id, event_type, event_data_json, external_event_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      event.id,
      event.gameId,
      event.sessionId,
      event.playerId,
      event.eventType,
      event.eventDataJson,
      event.externalEventId,
      event.now,
    );
  return result.changes > 0;
}

export function countEvents(db: DB, gameId: string): number {
  const row = db
    .prepare("SELECT COUNT(*) AS count FROM game_events WHERE game_id = ? AND event_type IN ('gift','like','comment')")
    .get(gameId) as { count: number };
  return row.count;
}


/* ------------------------------------------------------------------ */
/* Oyun kataloğu (admin tarafından yönetilir)                          */
/* ------------------------------------------------------------------ */

export interface GameProductRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  symbol: string;
  cover_url: string | null;
  status: 'live' | 'coming_soon' | 'hidden';
  engine_key: 'fan_battle' | 'coming_soon';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function listGameProducts(db: DB, includeHidden = true): GameProductRow[] {
  const where = includeHidden ? '' : "WHERE status <> 'hidden'";
  return db
    .prepare(`SELECT * FROM game_products ${where} ORDER BY sort_order ASC, name ASC`)
    .all() as GameProductRow[];
}

export function findGameProductById(db: DB, id: string): GameProductRow | undefined {
  return db.prepare('SELECT * FROM game_products WHERE id = ?').get(id) as GameProductRow | undefined;
}

export function findGameProductBySlug(db: DB, slug: string): GameProductRow | undefined {
  return db.prepare('SELECT * FROM game_products WHERE slug = ?').get(slug) as
    | GameProductRow
    | undefined;
}

export function createGameProduct(db: DB, product: GameProductRow): void {
  db.prepare(
    `INSERT INTO game_products (
      id, slug, name, category, tagline, description, symbol, cover_url, status, engine_key,
      sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    product.id,
    product.slug,
    product.name,
    product.category,
    product.tagline,
    product.description,
    product.symbol,
    product.cover_url,
    product.status,
    product.engine_key,
    product.sort_order,
    product.created_at,
    product.updated_at,
  );
}

export function updateGameProduct(
  db: DB,
  id: string,
  fields: {
    slug: string;
    name: string;
    category: string;
    tagline: string;
    description: string;
    symbol: string;
    coverUrl: string | null;
    status: 'live' | 'coming_soon' | 'hidden';
    engineKey: 'fan_battle' | 'coming_soon';
    sortOrder: number;
    now: string;
  },
): boolean {
  const result = db
    .prepare(
      `UPDATE game_products SET slug = ?, name = ?, category = ?, tagline = ?, description = ?,
        symbol = ?, cover_url = ?, status = ?, engine_key = ?, sort_order = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      fields.slug,
      fields.name,
      fields.category,
      fields.tagline,
      fields.description,
      fields.symbol,
      fields.coverUrl,
      fields.status,
      fields.engineKey,
      fields.sortOrder,
      fields.now,
      id,
    );
  return result.changes > 0;
}

export function deleteGameProduct(db: DB, id: string): boolean {
  const result = db.prepare('DELETE FROM game_products WHERE id = ?').run(id);
  return result.changes > 0;
}

export function countGameProducts(db: DB): { total: number; live: number } {
  const total = db.prepare('SELECT COUNT(*) AS count FROM game_products WHERE status <> \'hidden\'').get() as { count: number };
  const live = db.prepare("SELECT COUNT(*) AS count FROM game_products WHERE status = 'live'").get() as { count: number };
  return { total: Number(total.count), live: Number(live.count) };
}

/* ------------------------------------------------------------------ */
/* Paket CRUD (admin)                                                  */
/* ------------------------------------------------------------------ */

export function createPackage(db: DB, pkg: PackageRow): void {
  db.prepare(
    `INSERT INTO packages (
      id, code, name, tagline, description, price_cents, currency, max_teams, duration_days,
      features_json, highlight, sort_order, is_active, shopier_url, shopier_product_id, game_key
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    pkg.id,
    pkg.code,
    pkg.name,
    pkg.tagline,
    pkg.description,
    pkg.price_cents,
    pkg.currency,
    pkg.max_teams,
    pkg.duration_days,
    pkg.features_json,
    pkg.highlight,
    pkg.sort_order,
    pkg.is_active,
    pkg.shopier_url,
    pkg.shopier_product_id,
    pkg.game_key,
  );
}

export function updatePackage(
  db: DB,
  id: string,
  fields: {
    name: string;
    tagline: string;
    description: string;
    priceCents: number;
    currency: string;
    maxTeams: 2 | 4 | 8;
    durationDays: number;
    featuresJson: string;
    highlight: boolean;
    sortOrder: number;
    isActive: boolean;
    shopierUrl: string | null;
    shopierProductId: string | null;
    gameKey: string | null;
  },
): boolean {
  const result = db
    .prepare(
      `UPDATE packages SET name = ?, tagline = ?, description = ?, price_cents = ?,
        currency = ?, max_teams = ?, duration_days = ?, features_json = ?, highlight = ?,
        sort_order = ?, is_active = ?, shopier_url = ?, shopier_product_id = ?, game_key = ? WHERE id = ?`,
    )
    .run(
      fields.name,
      fields.tagline,
      fields.description,
      fields.priceCents,
      fields.currency,
      fields.maxTeams,
      fields.durationDays,
      fields.featuresJson,
      fields.highlight ? 1 : 0,
      fields.sortOrder,
      fields.isActive ? 1 : 0,
      fields.shopierUrl,
      fields.shopierProductId,
      fields.gameKey,
      id,
    );
  return result.changes > 0;
}

export function findPackageByCodeOrId(db: DB, value: string): PackageRow | undefined {
  return db.prepare('SELECT * FROM packages WHERE id = ? OR code = ?').get(value, value) as
    | PackageRow
    | undefined;
}

/* ------------------------------------------------------------------ */
/* Uygulama ayarları                                                   */
/* ------------------------------------------------------------------ */

export function getAppSetting(db: DB, key: string): string | null {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setAppSetting(db: DB, key: string, value: string, now: string): void {
  db.prepare(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(key, value, now);
}

export function listAppSettings(db: DB): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM app_settings').all() as Array<{
    key: string;
    value: string;
  }>;
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

/* ------------------------------------------------------------------ */
/* Yayıncıya özel arcade odaları                                       */
/* ------------------------------------------------------------------ */

export interface ArcadeRoomRow {
  id: string;
  user_id: string;
  game_key: string;
  public_slug: string;
  name: string;
  status: 'live' | 'disabled';
  settings_json: string;
  rounds_played: number;
  last_winner_name: string | null;
  last_played_at: string | null;
  created_at: string;
  updated_at: string;
}

export function createArcadeRoom(db: DB, row: ArcadeRoomRow): void {
  db.prepare(
    `INSERT INTO arcade_rooms (
      id, user_id, game_key, public_slug, name, status, settings_json,
      rounds_played, last_winner_name, last_played_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    row.id,
    row.user_id,
    row.game_key,
    row.public_slug,
    row.name,
    row.status,
    row.settings_json,
    row.rounds_played,
    row.last_winner_name,
    row.last_played_at,
    row.created_at,
    row.updated_at,
  );
}

export function findArcadeRoomById(db: DB, id: string): ArcadeRoomRow | undefined {
  return db.prepare('SELECT * FROM arcade_rooms WHERE id = ?').get(id) as ArcadeRoomRow | undefined;
}

export function findArcadeRoomBySlug(db: DB, slug: string): ArcadeRoomRow | undefined {
  return db.prepare('SELECT * FROM arcade_rooms WHERE public_slug = ?').get(slug) as
    | ArcadeRoomRow
    | undefined;
}

export function findArcadeRoomByUserAndGame(
  db: DB,
  userId: string,
  gameKey: string,
): ArcadeRoomRow | undefined {
  return db
    .prepare('SELECT * FROM arcade_rooms WHERE user_id = ? AND game_key = ?')
    .get(userId, gameKey) as ArcadeRoomRow | undefined;
}

export function listArcadeRoomsByUser(db: DB, userId: string): ArcadeRoomRow[] {
  return db
    .prepare('SELECT * FROM arcade_rooms WHERE user_id = ? ORDER BY created_at ASC')
    .all(userId) as ArcadeRoomRow[];
}

export function listArcadeRoomsForUser(db: DB, userId: string): ArcadeRoomRow[] {
  return db
    .prepare(
      `SELECT r.* FROM arcade_rooms r
       LEFT JOIN arcade_room_hosts h ON h.room_id = r.id AND h.user_id = ?
       WHERE r.user_id = ? OR h.id IS NOT NULL
       ORDER BY r.created_at ASC`,
    )
    .all(userId, userId) as ArcadeRoomRow[];
}

export interface ArcadeRoomHostRow {
  id: string;
  room_id: string;
  user_id: string;
  created_at: string;
  display_name: string;
}

export function listArcadeRoomHosts(db: DB, roomId: string): ArcadeRoomHostRow[] {
  return db
    .prepare(
      `SELECT h.*, u.display_name FROM arcade_room_hosts h
       JOIN users u ON u.id = h.user_id
       WHERE h.room_id = ? ORDER BY h.created_at ASC`,
    )
    .all(roomId) as ArcadeRoomHostRow[];
}

export function findArcadeRoomHost(
  db: DB,
  roomId: string,
  userId: string,
): ArcadeRoomHostRow | undefined {
  return db
    .prepare('SELECT * FROM arcade_room_hosts WHERE room_id = ? AND user_id = ?')
    .get(roomId, userId) as ArcadeRoomHostRow | undefined;
}

export function addArcadeRoomHost(
  db: DB,
  row: { id: string; roomId: string; userId: string; now: string },
): void {
  db.prepare(
    'INSERT INTO arcade_room_hosts (id, room_id, user_id, created_at) VALUES (?, ?, ?, ?)',
  ).run(row.id, row.roomId, row.userId, row.now);
}

export function removeArcadeRoomHost(db: DB, roomId: string, userId: string): boolean {
  return db
    .prepare('DELETE FROM arcade_room_hosts WHERE room_id = ? AND user_id = ?')
    .run(roomId, userId).changes > 0;
}

export function countArcadeRooms(db: DB): number {
  const row = db.prepare('SELECT COUNT(*) AS count FROM arcade_rooms').get() as { count: number };
  return Number(row.count);
}

export function updateArcadeRoom(
  db: DB,
  id: string,
  fields: { name: string; status: 'live' | 'disabled'; settingsJson: string; now: string },
): void {
  db.prepare(
    'UPDATE arcade_rooms SET name = ?, status = ?, settings_json = ?, updated_at = ? WHERE id = ?',
  ).run(fields.name, fields.status, fields.settingsJson, fields.now, id);
}

export function recordArcadeRoomRound(
  db: DB,
  id: string,
  winnerName: string | null,
  playedAt: string,
): void {
  db.prepare(
    `UPDATE arcade_rooms
     SET rounds_played = rounds_played + 1, last_winner_name = ?, last_played_at = ?, updated_at = ?
     WHERE id = ?`,
  ).run(winnerName, playedAt, playedAt, id);
}

/* ------------------------------------------------------------------ */
/* Platform bağlantıları                                              */
/* ------------------------------------------------------------------ */

export interface PlatformConnectionRow {
  id: string;
  user_id: string;
  room_id: string;
  platform: 'twitch' | 'youtube' | 'tiktok';
  channel: string;
  status: 'connecting' | 'connected' | 'error' | 'disconnected';
  config_json: string;
  connector_token: string | null;
  last_event_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export function createPlatformConnection(db: DB, row: PlatformConnectionRow): void {
  db.prepare(
    `INSERT INTO platform_connections (
      id, user_id, room_id, platform, channel, status, config_json, connector_token,
      last_event_at, last_error, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    row.id,
    row.user_id,
    row.room_id,
    row.platform,
    row.channel,
    row.status,
    row.config_json,
    row.connector_token,
    row.last_event_at,
    row.last_error,
    row.created_at,
    row.updated_at,
  );
}

export function findPlatformConnectionById(db: DB, id: string): PlatformConnectionRow | undefined {
  return db.prepare('SELECT * FROM platform_connections WHERE id = ?').get(id) as
    | PlatformConnectionRow
    | undefined;
}

export function findPlatformConnectionByRoom(
  db: DB,
  roomId: string,
  platform: string,
): PlatformConnectionRow | undefined {
  return db
    .prepare('SELECT * FROM platform_connections WHERE room_id = ? AND platform = ?')
    .get(roomId, platform) as PlatformConnectionRow | undefined;
}

export function findPlatformConnectionByToken(
  db: DB,
  token: string,
): PlatformConnectionRow | undefined {
  return db
    .prepare('SELECT * FROM platform_connections WHERE connector_token = ?')
    .get(token) as PlatformConnectionRow | undefined;
}

export function listPlatformConnectionsByRoom(db: DB, roomId: string): PlatformConnectionRow[] {
  return db
    .prepare('SELECT * FROM platform_connections WHERE room_id = ? ORDER BY created_at ASC')
    .all(roomId) as PlatformConnectionRow[];
}

export function listActivePlatformConnections(db: DB): PlatformConnectionRow[] {
  return db
    .prepare("SELECT * FROM platform_connections WHERE status IN ('connecting', 'connected')")
    .all() as PlatformConnectionRow[];
}

export function updatePlatformConnectionStatus(
  db: DB,
  id: string,
  status: PlatformConnectionRow['status'],
  lastError: string | null,
  now: string,
): void {
  db.prepare(
    'UPDATE platform_connections SET status = ?, last_error = ?, updated_at = ? WHERE id = ?',
  ).run(status, lastError, now, id);
}

export function updatePlatformConnectionChannel(
  db: DB,
  id: string,
  channel: string,
  configJson: string,
  connectorToken: string | null,
  now: string,
): void {
  db.prepare(
    `UPDATE platform_connections
     SET channel = ?, config_json = ?, connector_token = ?, status = 'connecting',
         last_error = NULL, updated_at = ?
     WHERE id = ?`,
  ).run(channel, configJson, connectorToken, now, id);
}

export function markPlatformConnectionEvent(db: DB, id: string, now: string): void {
  db.prepare(
    "UPDATE platform_connections SET last_event_at = ?, status = 'connected', last_error = NULL, updated_at = ? WHERE id = ?",
  ).run(now, now, id);
}

export function deletePlatformConnection(db: DB, id: string): void {
  db.prepare('DELETE FROM platform_connections WHERE id = ?').run(id);
}

/* ------------------------------------------------------------------ */
/* Arcade oturumları                                                   */
/* ------------------------------------------------------------------ */

export interface ArcadeSessionRow {
  id: string;
  room_id: string;
  game_key: string;
  status: 'running' | 'finished' | 'abandoned';
  started_at: string;
  ended_at: string | null;
  winner_name: string | null;
  player_count: number;
  summary_json: string;
  created_at: string;
}

export function createArcadeSession(
  db: DB,
  row: {
    id: string;
    roomId: string;
    gameKey: string;
    startedAt: string;
    playerCount: number;
  },
): void {
  db.prepare(
    `INSERT INTO arcade_sessions (
      id, room_id, game_key, status, started_at, ended_at, winner_name,
      player_count, summary_json, created_at
    ) VALUES (?, ?, ?, 'running', ?, NULL, NULL, ?, '{}', ?)`,
  ).run(row.id, row.roomId, row.gameKey, row.startedAt, row.playerCount, row.startedAt);
}

export function finishArcadeSession(
  db: DB,
  id: string,
  winnerName: string | null,
  summaryJson: string,
  endedAt: string,
): void {
  db.prepare(
    `UPDATE arcade_sessions SET status = 'finished', ended_at = ?, winner_name = ?,
      summary_json = ? WHERE id = ?`,
  ).run(endedAt, winnerName, summaryJson, id);
}

export function listArcadeSessions(db: DB, roomId: string, limit = 20): ArcadeSessionRow[] {
  return db
    .prepare('SELECT * FROM arcade_sessions WHERE room_id = ? ORDER BY started_at DESC LIMIT ?')
    .all(roomId, limit) as ArcadeSessionRow[];
}


/* ------------------------------------------------------------------ */
/* Oyun bazlı lisanslar                                               */
/* ------------------------------------------------------------------ */

export interface GameLicenseRow {
  id: string;
  user_id: string;
  game_key: string;
  package_id: string;
  payment_id: string | null;
  starts_at: string;
  expires_at: string;
  status: 'active' | 'expired' | 'revoked';
  created_at: string;
  updated_at: string;
}

export function createGameLicense(
  db: DB,
  row: {
    id: string;
    userId: string;
    gameKey: string;
    packageId: string;
    paymentId: string | null;
    startsAt: string;
    expiresAt: string;
    now: string;
  },
): void {
  db.prepare(
    `INSERT INTO game_licenses (
      id, user_id, game_key, package_id, payment_id, starts_at, expires_at,
      status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
  ).run(
    row.id,
    row.userId,
    row.gameKey,
    row.packageId,
    row.paymentId,
    row.startsAt,
    row.expiresAt,
    row.now,
    row.now,
  );
}

export interface TrialUsageRow {
  id: string;
  user_id: string;
  game_key: string;
  day: string;
  started_at: string;
  expires_at: string;
  created_at: string;
}

export function findTrialUsageForDay(
  db: DB,
  userId: string,
  day: string,
): TrialUsageRow | undefined {
  return db
    .prepare('SELECT * FROM trial_usage WHERE user_id = ? AND day = ? LIMIT 1')
    .get(userId, day) as TrialUsageRow | undefined;
}

export function findActiveTrialUsage(
  db: DB,
  userId: string,
  nowIsoValue: string,
): TrialUsageRow | undefined {
  return db
    .prepare(
      `SELECT * FROM trial_usage WHERE user_id = ? AND expires_at > ?
       ORDER BY expires_at DESC LIMIT 1`,
    )
    .get(userId, nowIsoValue) as TrialUsageRow | undefined;
}

export function createTrialUsage(
  db: DB,
  row: {
    id: string;
    userId: string;
    gameKey: string;
    day: string;
    startedAt: string;
    expiresAt: string;
    now: string;
  },
): void {
  db.prepare(
    `INSERT INTO trial_usage (id, user_id, game_key, day, started_at, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(row.id, row.userId, row.gameKey, row.day, row.startedAt, row.expiresAt, row.now);
}

export function findActiveGameLicense(
  db: DB,
  userId: string,
  gameKey: string,
  nowIsoValue: string,
): GameLicenseRow | undefined {
  return db
    .prepare(
      `SELECT * FROM game_licenses
       WHERE user_id = ? AND game_key = ? AND status = 'active' AND expires_at > ?
       ORDER BY expires_at DESC LIMIT 1`,
    )
    .get(userId, gameKey, nowIsoValue) as GameLicenseRow | undefined;
}

export function listActiveGameLicenses(
  db: DB,
  userId: string,
  nowIsoValue: string,
): GameLicenseRow[] {
  return db
    .prepare(
      `SELECT * FROM game_licenses
       WHERE user_id = ? AND status = 'active' AND expires_at > ?
       ORDER BY expires_at ASC`,
    )
    .all(userId, nowIsoValue) as GameLicenseRow[];
}

export function listGameLicenses(db: DB, userId: string): GameLicenseRow[] {
  return db
    .prepare('SELECT * FROM game_licenses WHERE user_id = ? ORDER BY expires_at DESC')
    .all(userId) as GameLicenseRow[];
}


export interface AdminGameLicenseRow extends GameLicenseRow {
  email: string;
  display_name: string;
  package_name: string | null;
}

export function listAllGameLicenses(db: DB): AdminGameLicenseRow[] {
  return db
    .prepare(
      `SELECT gl.*, u.email, u.display_name, p.name AS package_name
       FROM game_licenses gl
       JOIN users u ON u.id = gl.user_id
       LEFT JOIN packages p ON p.id = gl.package_id
       ORDER BY gl.expires_at DESC, gl.created_at DESC`,
    )
    .all() as AdminGameLicenseRow[];
}

export function findGameLicenseById(db: DB, id: string): GameLicenseRow | undefined {
  return db.prepare('SELECT * FROM game_licenses WHERE id = ?').get(id) as
    | GameLicenseRow
    | undefined;
}

export function updateGameLicense(
  db: DB,
  id: string,
  patch: { expiresAt?: string; status?: 'active' | 'expired' | 'revoked' },
  now: string,
): void {
  const current = findGameLicenseById(db, id);
  if (!current) return;
  db.prepare(
    'UPDATE game_licenses SET expires_at = ?, status = ?, updated_at = ? WHERE id = ?',
  ).run(patch.expiresAt ?? current.expires_at, patch.status ?? current.status, now, id);
}

export function countActiveGameLicenses(db: DB, nowIsoValue: string): number {
  const row = db
    .prepare(
      "SELECT COUNT(*) AS count FROM game_licenses WHERE status = 'active' AND expires_at > ?",
    )
    .get(nowIsoValue) as { count: number };
  return Number(row.count);
}

/* ------------------------------------------------------------------ */
/* Kuponlar                                                           */
/* ------------------------------------------------------------------ */

export interface CouponRow {
  id: string;
  code: string;
  percent_off: number;
  fixed_off_cents: number;
  active: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export function findCouponByCode(db: DB, code: string): CouponRow | undefined {
  return db
    .prepare('SELECT * FROM coupons WHERE UPPER(code) = UPPER(?)')
    .get(code.trim()) as CouponRow | undefined;
}

export function consumeCoupon(db: DB, code: string, now: string): boolean {
  return (
    db
      .prepare(
        'UPDATE coupons SET used_count = used_count + 1, updated_at = ? WHERE UPPER(code) = UPPER(?) AND active = 1 AND (max_uses IS NULL OR used_count < max_uses)',
      )
      .run(now, code.trim()).changes > 0
  );
}


/* ------------------------------------------------------------------ */
/* Oda banları                                                        */
/* ------------------------------------------------------------------ */

export interface ArcadeRoomBanRow {
  id: string;
  room_id: string;
  viewer_id: string;
  viewer_name: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export function findArcadeRoomBan(
  db: DB,
  roomId: string,
  viewerId: string,
): ArcadeRoomBanRow | undefined {
  return db
    .prepare('SELECT * FROM arcade_room_bans WHERE room_id = ? AND viewer_id = ? LIMIT 1')
    .get(roomId, viewerId) as ArcadeRoomBanRow | undefined;
}

export function listArcadeRoomBans(db: DB, roomId: string): ArcadeRoomBanRow[] {
  return db
    .prepare('SELECT * FROM arcade_room_bans WHERE room_id = ? ORDER BY created_at DESC LIMIT 200')
    .all(roomId) as ArcadeRoomBanRow[];
}

export function addArcadeRoomBan(
  db: DB,
  row: {
    id: string;
    roomId: string;
    viewerId: string;
    viewerName: string;
    reason: string | null;
    createdBy: string;
    now: string;
  },
): void {
  db.prepare(
    `INSERT INTO arcade_room_bans (id, room_id, viewer_id, viewer_name, reason, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(room_id, viewer_id) DO UPDATE SET
       viewer_name = excluded.viewer_name,
       reason = excluded.reason,
       created_by = excluded.created_by,
       created_at = excluded.created_at`,
  ).run(row.id, row.roomId, row.viewerId, row.viewerName, row.reason, row.createdBy, row.now);
}

export function removeArcadeRoomBan(db: DB, roomId: string, viewerId: string): boolean {
  return db
    .prepare('DELETE FROM arcade_room_bans WHERE room_id = ? AND viewer_id = ?')
    .run(roomId, viewerId).changes > 0;
}


/* ------------------------------------------------------------------ */
/* E-posta doğrulama / şifre sıfırlama                                 */
/* ------------------------------------------------------------------ */

export interface EmailTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  type: 'verify_email' | 'reset_password';
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export function createEmailToken(
  db: DB,
  row: {
    id: string;
    userId: string;
    tokenHash: string;
    type: 'verify_email' | 'reset_password';
    expiresAt: string;
    now: string;
  },
): void {
  db.prepare(
    `INSERT INTO email_tokens (id, user_id, token_hash, type, expires_at, used_at, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?)`,
  ).run(row.id, row.userId, row.tokenHash, row.type, row.expiresAt, row.now);
}

export function findValidEmailToken(
  db: DB,
  tokenHash: string,
  type: 'verify_email' | 'reset_password',
  now: string,
): EmailTokenRow | undefined {
  return db
    .prepare(
      `SELECT * FROM email_tokens
       WHERE token_hash = ? AND type = ? AND used_at IS NULL AND expires_at > ?
       LIMIT 1`,
    )
    .get(tokenHash, type, now) as EmailTokenRow | undefined;
}

export function markEmailTokenUsed(db: DB, id: string, now: string): void {
  db.prepare('UPDATE email_tokens SET used_at = ? WHERE id = ?').run(now, id);
}

export function deleteEmailTokens(db: DB, userId: string, type: 'verify_email' | 'reset_password'): void {
  db.prepare('DELETE FROM email_tokens WHERE user_id = ? AND type = ?').run(userId, type);
}

export function markUserEmailVerified(db: DB, userId: string, now: string): void {
  db.prepare('UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?').run(now, now, userId);
}

/* ------------------------------------------------------------------ */
/* Aktivite olayları / retention                                       */
/* ------------------------------------------------------------------ */

export interface ActivityEventRow {
  id: string;
  user_id: string;
  event: string;
  metadata_json: string;
  created_at: string;
}

export function trackActivity(
  db: DB,
  userId: string,
  event: string,
  now: string,
  metadata: Record<string, unknown> = {},
): void {
  db.prepare(
    'INSERT INTO activity_events (id, user_id, event, metadata_json, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(`evt_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`, userId, event, JSON.stringify(metadata), now);
}

export function listActivityEvents(db: DB): ActivityEventRow[] {
  return db.prepare('SELECT * FROM activity_events ORDER BY created_at DESC').all() as ActivityEventRow[];
}
