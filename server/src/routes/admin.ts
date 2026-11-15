import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { nowIso } from '../db/index.js';
import {
  createGameProduct,
  createPackage,
  deleteGameProduct,
  findGameProductById,
  findGameProductBySlug,
  findPackageById,
  findUserByEmail,
  getAppSetting,
  listAllPayments,
  listGameProducts,
  listPackages,
  setAppSetting,
  updateGameProduct,
  updatePackage,
  type GameProductRow,
  type PackageRow,
} from '../db/repo.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { randomId } from '../lib/tokens.js';
import {
  adminGameProductSchema,
  adminPackageSchema,
  adminSettingsSchema,
  manualLicenseSchema,
  adminGameLicenseCreateSchema,
  adminGameLicenseUpdateSchema,
  parseBody,
} from '../lib/schemas.js';
import { rowToGameProduct, rowToPackage } from '../game/mappers.js';
import { requireUser } from '../services/session.js';
import {
  getAdminOverview,
  grantManualLicense,
  grantAdminGameLicense,
  listAdminGameLicenses,
  revokeAdminGameLicense,
  updateAdminGameLicense,
  listAdminPayments,
  listAdminPublishers,
  requireAdmin,
} from '../services/admin.js';

function toAdminPackage(row: PackageRow) {
  return {
    ...rowToPackage(row),
    shopierUrl: row.shopier_url,
    isActive: row.is_active === 1,
    gameKey: row.game_key,
  };
}

export async function adminRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  const { db, config } = ctx;

  const adminUser = (request: Parameters<typeof requireUser>[0]) => {
    const user = requireUser(request, db, config);
    requireAdmin(user);
    return user;
  };

  app.get('/api/admin/overview', async (request, reply) => {
    adminUser(request);
    return reply.send(getAdminOverview(db));
  });

  /* ---------------------------- Oyun kataloğu --------------------------- */

  app.get('/api/admin/games', async (request, reply) => {
    adminUser(request);
    return reply.send({ games: listGameProducts(db, true).map(rowToGameProduct) });
  });

  app.post('/api/admin/games', async (request, reply) => {
    adminUser(request);
    const body = parseBody(adminGameProductSchema, request.body);
    if (findGameProductBySlug(db, body.slug)) {
      throw conflict('Bu slug zaten kullanılıyor.');
    }
    assertSingleLiveEngine(db, body.engineKey, body.status, null);
    const now = nowIso();
    const row: GameProductRow = {
      id: randomId('gprod'),
      slug: body.slug,
      name: body.name,
      category: body.category,
      tagline: body.tagline,
      description: body.description,
      symbol: body.symbol,
      cover_url: body.coverUrl?.trim() ? body.coverUrl : null,
      status: body.status,
      engine_key: body.engineKey,
      sort_order: body.sortOrder,
      created_at: now,
      updated_at: now,
    };
    createGameProduct(db, row);
    return reply.code(201).send({ game: rowToGameProduct(row) });
  });

  app.put('/api/admin/games/:id', async (request, reply) => {
    adminUser(request);
    const { id } = request.params as { id: string };
    const existing = findGameProductById(db, id);
    if (!existing) throw notFound('Oyun bulunamadı.');
    const body = parseBody(adminGameProductSchema, request.body);
    const slugOwner = findGameProductBySlug(db, body.slug);
    if (slugOwner && slugOwner.id !== id) throw conflict('Bu slug zaten kullanılıyor.');
    assertSingleLiveEngine(db, body.engineKey, body.status, id);
    updateGameProduct(db, id, {
      slug: body.slug,
      name: body.name,
      category: body.category,
      tagline: body.tagline,
      description: body.description,
      symbol: body.symbol,
      coverUrl: body.coverUrl?.trim() ? body.coverUrl : null,
      status: body.status,
      engineKey: body.engineKey,
      sortOrder: body.sortOrder,
      now: nowIso(),
    });
    return reply.send({ game: rowToGameProduct(findGameProductById(db, id)!) });
  });

  app.delete('/api/admin/games/:id', async (request, reply) => {
    adminUser(request);
    const { id } = request.params as { id: string };
    const existing = findGameProductById(db, id);
    if (!existing) throw notFound('Oyun bulunamadı.');
    if (existing.engine_key === 'fan_battle') {
      throw badRequest('Oynanabilir ana oyun silinemez; gizlemek için durumunu “hidden” yap.');
    }
    deleteGameProduct(db, id);
    return reply.send({ ok: true });
  });

  /* ------------------------------- Paketler ----------------------------- */

  app.get('/api/admin/packages', async (request, reply) => {
    adminUser(request);
    return reply.send({ packages: listPackages(db, false).map(toAdminPackage) });
  });

  app.post('/api/admin/packages', async (request, reply) => {
    adminUser(request);
    const body = parseBody(adminPackageSchema, request.body);
    const now = nowIso();
    const row: PackageRow = {
      id: randomId('pkg'),
      code: `custom_${randomId('code').replace('code_', '')}`,
      name: body.name,
      tagline: body.tagline,
      description: body.description,
      price_cents: body.priceCents,
      currency: body.currency.toUpperCase(),
      max_teams: body.maxTeams,
      duration_days: body.durationDays,
      features_json: JSON.stringify(body.features),
      highlight: body.highlight ? 1 : 0,
      sort_order: body.sortOrder,
      is_active: body.isActive ? 1 : 0,
      shopier_url: body.shopierUrl?.trim() ? body.shopierUrl : null,
      game_key: null,
    };
    createPackage(db, row);
    return reply.code(201).send({ package: toAdminPackage(row) });
  });

  app.put('/api/admin/packages/:id', async (request, reply) => {
    adminUser(request);
    const { id } = request.params as { id: string };
    const existing = findPackageById(db, id);
    if (!existing) throw notFound('Paket bulunamadı.');
    const body = parseBody(adminPackageSchema, request.body);
    updatePackage(db, id, {
      name: body.name,
      tagline: body.tagline,
      description: body.description,
      priceCents: body.priceCents,
      currency: body.currency.toUpperCase(),
      maxTeams: body.maxTeams,
      durationDays: body.durationDays,
      featuresJson: JSON.stringify(body.features),
      highlight: body.highlight,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
      shopierUrl: body.shopierUrl?.trim() ? body.shopierUrl : null,
      gameKey: existing.game_key,
    });
    return reply.send({ package: toAdminPackage(findPackageById(db, id)!) });
  });

  app.delete('/api/admin/packages/:id', async (request, reply) => {
    adminUser(request);
    const { id } = request.params as { id: string };
    const existing = findPackageById(db, id);
    if (!existing) throw notFound('Paket bulunamadı.');
    db.prepare('UPDATE packages SET is_active = 0 WHERE id = ?').run(id);
    return reply.send({ ok: true, deactivated: true });
  });

  /* ------------------------------- Ödemeler ----------------------------- */

  app.get('/api/admin/payments', async (request, reply) => {
    adminUser(request);
    return reply.send({ payments: listAdminPayments(db) });
  });

  app.get('/api/admin/publishers', async (request, reply) => {
    adminUser(request);
    return reply.send({ publishers: listAdminPublishers(db) });
  });

  app.post('/api/admin/licenses', async (request, reply) => {
    const admin = adminUser(request);
    const body = parseBody(manualLicenseSchema, request.body);
    const user = findUserByEmail(db, body.email);
    if (!user) throw notFound('Bu e-posta ile kayıtlı yayıncı bulunamadı.');
    const result = grantManualLicense(db, body, admin);
    return reply.code(201).send(result);
  });

  app.get('/api/admin/game-licenses', async (request, reply) => {
    adminUser(request);
    return reply.send({ licenses: listAdminGameLicenses(db) });
  });

  app.post('/api/admin/game-licenses', async (request, reply) => {
    const admin = adminUser(request);
    const body = parseBody(adminGameLicenseCreateSchema, request.body);
    const license = grantAdminGameLicense(db, body, admin);
    return reply.code(201).send({ license });
  });

  app.put('/api/admin/game-licenses/:id', async (request, reply) => {
    adminUser(request);
    const { id } = request.params as { id: string };
    const body = parseBody(adminGameLicenseUpdateSchema, request.body);
    return reply.send({ license: updateAdminGameLicense(db, id, body) });
  });

  app.delete('/api/admin/game-licenses/:id', async (request, reply) => {
    adminUser(request);
    const { id } = request.params as { id: string };
    revokeAdminGameLicense(db, id);
    return reply.send({ ok: true, revoked: true });
  });

  /* ------------------------------- Ayarlar ------------------------------ */

  app.get('/api/admin/settings', async (request, reply) => {
    adminUser(request);
    return reply.send(getShopierSettings(db, config));
  });

  app.put('/api/admin/settings', async (request, reply) => {
    adminUser(request);
    const body = parseBody(adminSettingsSchema, request.body);
    if (body.shopierStoreUrl !== undefined) {
      setAppSetting(db, 'shopier_store_url', body.shopierStoreUrl?.trim() ?? '', nowIso());
    }
    return reply.send(getShopierSettings(db, config));
  });

  app.get('/api/admin/health', async (request, reply) => {
    adminUser(request);
    const payments = listAllPayments(db);
    return reply.send({
      db: 'ok',
      payments: payments.length,
      provider: config.paymentProvider,
      testPayments: config.testPaymentsEnabled,
      shopierWebhookConfigured: Boolean(config.shopierWebhookToken),
    });
  });
}

function assertSingleLiveEngine(
  db: AppContext['db'],
  engineKey: 'fan_battle' | 'coming_soon',
  status: 'live' | 'coming_soon' | 'hidden',
  excludeId: string | null,
): void {
  if (engineKey !== 'fan_battle' || status !== 'live') return;
  const live = listGameProducts(db, true).filter(
    (product) =>
      product.engine_key === 'fan_battle' &&
      product.status === 'live' &&
      product.id !== excludeId,
  );
  if (live.length > 0) {
    throw conflict('Aynı motorda zaten canlı bir oyun var. Önce onu gizle.');
  }
}

function getShopierSettings(db: AppContext['db'], config: AppContext['config']) {
  const storeUrl = getAppSetting(db, 'shopier_store_url') ?? '';
  return {
    shopierStoreUrl: storeUrl,
    shopierWebhookConfigured: Boolean(config.shopierWebhookToken),
    shopierProviderActive: String(config.paymentProvider) === 'shopier',
    paymentProvider: config.paymentProvider,
    webhookUrl: `${config.appUrl}/api/webhooks/payments/shopier`,
  };
}
