import type { DB } from '../db/index.js';
import { nowIso } from '../db/index.js';
import {
  countActiveSubscriptions,
  countGameProducts,
  countGames,
  countUsers,
  createPackage,
  createPayment,
  createSubscription,
  findActiveSubscription,
  findPackageById,
  findUserByEmail,
  listAllPayments,
  listGameProducts,
  listPackageSales,
  listPackages,
  listPublishers,
  sumSucceededRevenue,
  type PackageRow,
  type UserRow,
} from '../db/repo.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { randomId } from '../lib/tokens.js';
import { isoPlusDays } from '../db/index.js';
import type {
  AdminOverviewDTO,
  AdminPaymentRow,
  AdminPublisherRow,
} from '../../../shared/types.js';
import { rowToPackage, rowToPayment } from '../game/mappers.js';
import { ARCADE_GAME_LIST } from '../../../shared/arcade.js';

export function requireAdmin(user: UserRow): void {
  if (user.role !== 'admin') {
    throw forbidden('Bu işlem yalnızca süper admin tarafından yapılabilir.');
  }
}

export function getAdminOverview(db: DB): AdminOverviewDTO {
  const now = nowIso();
  const revenue = sumSucceededRevenue(db);
  const products = { total: ARCADE_GAME_LIST.length, live: ARCADE_GAME_LIST.length };
  const payments = listAllPayments(db).slice(0, 6).map((row) => ({
    ...rowToPayment(row, row.package_name),
    userEmail: row.user_email,
    displayName: row.display_name,
  }));
  return {
    totalUsers: countUsers(db),
    totalPublishers: countUsers(db, 'publisher'),
    totalGames: countGames(db),
    activeSubscriptions: countActiveSubscriptions(db, now),
    totalRevenueCents: revenue.revenue,
    currency: 'TRY',
    liveProducts: products.live,
    totalProducts: products.total,
    recentPayments: payments,
    packageSales: listPackageSales(db).map((row) => ({
      packageId: row.package_id,
      name: row.name,
      sales: Number(row.sales),
      revenueCents: Number(row.revenue_cents),
    })),
  };
}

export function listAdminPublishers(db: DB): AdminPublisherRow[] {
  const now = nowIso();
  const rows = db
    .prepare(
      `SELECT u.*,
        g.game_name AS game_name, g.public_slug AS game_slug, g.team_count AS team_count,
        (SELECT COUNT(*) FROM game_sessions s WHERE s.game_id = g.id AND s.status = 'finished') AS total_matches,
        pkg.name AS package_name, sub.status AS subscription_status, sub.expires_at AS expires_at
       FROM users u
       LEFT JOIN games g ON g.user_id = u.id
       LEFT JOIN subscriptions sub ON sub.id = (
         SELECT id FROM subscriptions WHERE user_id = u.id AND status = 'active' AND expires_at > ?
         ORDER BY expires_at DESC LIMIT 1
       )
       LEFT JOIN packages pkg ON pkg.id = sub.package_id
       WHERE u.role = 'publisher'
       ORDER BY u.created_at DESC LIMIT 250`,
    )
    .all(now) as Array<
    UserRow & {
      game_name: string | null;
      game_slug: string | null;
      team_count: number | null;
      total_matches: number;
      package_name: string | null;
      subscription_status: string | null;
      expires_at: string | null;
    }
  >;
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    status: row.status,
    role: row.role,
    createdAt: row.created_at,
    gameName: row.game_name,
    gameSlug: row.game_slug,
    teamCount: row.team_count,
    packageName: row.package_name,
    subscriptionStatus: row.subscription_status,
    expiresAt: row.expires_at,
    totalMatches: Number(row.total_matches ?? 0),
  }));
}

export function listAdminPayments(db: DB): AdminPaymentRow[] {
  return listAllPayments(db).map((row) => ({
    ...rowToPayment(row, row.package_name),
    userEmail: row.user_email,
    displayName: row.display_name,
    providerTransactionId: row.provider_transaction_id,
  }));
}

export interface ManualLicenseInput {
  email: string;
  packageId: string;
  note?: string;
  displayName?: string;
}

/** Shopier/manuel satışlar için admin tarafından lisans tanımlama. */
export function grantManualLicense(
  db: DB,
  input: ManualLicenseInput,
  admin: UserRow,
): { subscriptionId: string; expiresAt: string; packageName: string; email: string } {
  const email = input.email.trim().toLowerCase();
  const user = findUserByEmail(db, email);
  if (!user) {
    throw notFound(
      'Bu e-posta ile kayıtlı yayıncı yok. Önce yayıncının kayıt olmasını sağla.',
    );
  }
  if (user.role !== 'publisher') {
    throw badRequest('Admin hesaplarına lisans tanımlanamaz.');
  }
  const pkg = findPackageById(db, input.packageId);
  if (!pkg || pkg.is_active !== 1) throw notFound('Aktif paket bulunamadı.');
  const now = nowIso();
  const current = findActiveSubscription(db, user.id, now);
  const base = current ? Math.max(Date.now(), Date.parse(current.expires_at) || 0) : Date.now();
  const expiresAt = isoPlusDays(pkg.duration_days, new Date(base));
  const subscriptionId = randomId('sub');
  const paymentId = randomId('pay');
  db.transaction(() => {
    createPayment(db, {
      id: paymentId,
      user_id: user.id,
      package_id: pkg.id,
      provider: 'manual',
      provider_transaction_id: `manual_${randomId('txn')}`,
      provider_checkout_id: null,
      amount_cents: pkg.price_cents,
      currency: pkg.currency,
      status: 'succeeded',
      idempotency_key: `manual:${paymentId}`,
      metadata_json: JSON.stringify({
        note: input.note ?? '',
        grantedBy: admin.email,
        adminId: admin.id,
        source: 'admin_manual',
      }),
      created_at: now,
      updated_at: now,
    });
    createSubscription(db, {
      id: subscriptionId,
      userId: user.id,
      packageId: pkg.id,
      paymentId,
      startsAt: now,
      expiresAt,
    });
    db.prepare(
      "UPDATE subscriptions SET status = 'canceled' WHERE user_id = ? AND id <> ? AND status = 'active' AND expires_at > ?",
    ).run(user.id, subscriptionId, now);
  })();
  return { subscriptionId, expiresAt, packageName: pkg.name, email };
}

/** Public katalog: yalnızca görünür oyunlar ve aktif paketler. */
export function getCatalog(db: DB) {
  const games = listGameProducts(db, false);
  const packages = listPackages(db, true).filter((pkg) => !pkg.game_key);
  const durations = Array.from(new Set(packages.map((pkg) => pkg.duration_days))).sort(
    (a, b) => a - b,
  );
  return {
    games: games.map((game) => ({
      id: game.id,
      slug: game.slug,
      name: game.name,
      category: game.category,
      tagline: game.tagline,
      description: game.description,
      symbol: game.symbol,
      coverUrl: game.cover_url,
      status: game.status,
      engineKey: game.engine_key,
      sortOrder: game.sort_order,
      createdAt: game.created_at,
      updatedAt: game.updated_at,
    })),
    packages: packages.map((pkg) => ({
      ...rowToPackage(pkg),
      shopierUrl: pkg.shopier_url,
      isActive: pkg.is_active === 1,
    })),
    durations,
  };
}

export function findPackageOrThrow(db: DB, id: string): PackageRow {
  const pkg = findPackageById(db, id);
  if (!pkg) throw notFound('Paket bulunamadı.');
  return pkg;
}

export function createAdminPackagePlaceholder(): PackageRow {
  // Yalnızca tip yardımcısı; gerçek oluşturma route içinde yapılır.
  void createPackage;
  throw new Error('not implemented');
}
