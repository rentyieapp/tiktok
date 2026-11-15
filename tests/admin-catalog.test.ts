import { afterEach, describe, expect, it } from 'vitest';
import type { BuiltApp } from '../server/src/app';
import { seedPackages } from '../server/src/db/seed';
import { findPaymentById } from '../server/src/db/repo';
import {
  makeApp,
  registerUser,
  loginUser,
  uniqueEmail,
} from './helpers';

let built: BuiltApp | null = null;

async function app(): Promise<BuiltApp> {
  built = await makeApp({
    adminEmail: 'admin@test.local',
    adminPassword: 'Admin1234',
  });
  return built;
}

afterEach(async () => {
  if (built) {
    await built.app.close();
    built = null;
  }
});

async function adminCookie(server: BuiltApp['app']): Promise<string> {
  return loginUser(server, 'admin@test.local', 'Admin1234');
}

describe('süper admin erişimi', () => {
  it('admin oluşturulur ve publisher admin uçlarına erişemez', async () => {
    const { app: server } = await app();
    const admin = await adminCookie(server);
    const overview = await server.inject({
      method: 'GET',
      url: '/api/admin/overview',
      headers: { cookie: admin },
    });
    expect(overview.statusCode).toBe(200);
    expect(overview.json().totalProducts).toBeGreaterThan(0);

    const publisher = await registerUser(server);
    const forbidden = await server.inject({
      method: 'GET',
      url: '/api/admin/packages',
      headers: { cookie: publisher.cookie },
    });
    expect(forbidden.statusCode).toBe(403);
    const forbiddenRevision = await server.inject({
      method: 'PUT',
      url: '/api/admin/packages/pkg_starter',
      headers: { cookie: publisher.cookie },
      payload: {
        name: 'Ele Geçirildi',
        tagline: 'x',
        description: '',
        priceCents: 1,
        currency: 'TRY',
        maxTeams: 2,
        durationDays: 1,
        features: [],
        highlight: false,
        sortOrder: 0,
        isActive: true,
        shopierUrl: null,
      },
    });
    expect(forbiddenRevision.statusCode).toBe(403);
  });
});

describe('admin fiyat ve süre yönetimi', () => {
  it('fiyat/süre güncellenir, vitrine yansır ve seed tarafından ezilmez', async () => {
    const { app: server, db } = await app();
    const admin = await adminCookie(server);
    const update = await server.inject({
      method: 'PUT',
      url: '/api/admin/packages/pkg_pro_1d',
      headers: { cookie: admin },
      payload: {
        name: 'Profesyonel 1 Gün',
        tagline: 'Günlük özel yayın',
        description: 'Test güncellemesi',
        priceCents: 9500,
        currency: 'TRY',
        maxTeams: 4,
        durationDays: 1,
        features: ['4 takımlı arena', '1 gün lisans'],
        highlight: false,
        sortOrder: 12,
        isActive: true,
        shopierUrl: 'https://shopier.com/ornek-urun',
      },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().package.priceCents).toBe(9500);
    expect(update.json().package.shopierUrl).toBe('https://shopier.com/ornek-urun');

    const publicPackages = await server.inject({ method: 'GET', url: '/api/packages' });
    const oneDay = publicPackages.json().packages.find((pkg: any) => pkg.id === 'pkg_pro_1d');
    expect(oneDay.priceCents).toBe(9500);
    expect(publicPackages.json().durations).toContain(1);
    expect(publicPackages.json().durations).toContain(30);

    // Farklı bir kullanıcı paketi satın aldığında yeni fiyat kullanılmalı.
    const buyer = await registerUser(server);
    const checkout = await server.inject({
      method: 'POST',
      url: '/api/billing/checkout',
      headers: { cookie: buyer.cookie },
      payload: { packageId: 'pkg_pro_1d' },
    });
    expect(checkout.statusCode).toBe(201);
    const paymentId = checkout.json().payment.id as string;
    expect(checkout.json().payment.amountCents).toBe(9500);
    expect(findPaymentById(db, paymentId)!.amount_cents).toBe(9500);
    await server.inject({
      method: 'POST',
      url: `/api/test-payments/${paymentId}/pay`,
      headers: { cookie: buyer.cookie },
      payload: { outcome: 'success' },
    });
    const buyerMe = await server.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: buyer.cookie } });
    expect(buyerMe.json().hasPanelAccess).toBe(true);
    const expires = Date.parse(buyerMe.json().subscription.expiresAt) - Date.now();
    expect(expires).toBeLessThanOrEqual(25 * 60 * 60 * 1000);
    expect(expires).toBeGreaterThan(20 * 60 * 60 * 1000);

    // Sunucu yeniden başladığında varsayılan seed admin değişikliğini ezmemeli.
    seedPackages(db);
    const row = db.prepare('SELECT price_cents, duration_days, shopier_url FROM packages WHERE id = ?').get('pkg_pro_1d') as {
      price_cents: number;
      duration_days: number;
      shopier_url: string;
    };
    expect(row.price_cents).toBe(9500);
    expect(row.duration_days).toBe(1);
    expect(row.shopier_url).toBe('https://shopier.com/ornek-urun');
  });

  it('yeni paket oluşturulur ve pasifleştirilebilir', async () => {
    const { app: server } = await app();
    const admin = await adminCookie(server);
    const create = await server.inject({
      method: 'POST',
      url: '/api/admin/packages',
      headers: { cookie: admin },
      payload: {
        name: 'Özel 3 Gün',
        tagline: 'Özel kampanya',
        description: '',
        priceCents: 39900,
        currency: 'TRY',
        maxTeams: 8,
        durationDays: 3,
        features: ['8 takımlı arena', '3 gün lisans'],
        highlight: false,
        sortOrder: 30,
        isActive: true,
        shopierUrl: null,
      },
    });
    expect(create.statusCode).toBe(201);
    const id = create.json().package.id as string;
    const publicAfter = await server.inject({ method: 'GET', url: '/api/packages' });
    expect(publicAfter.json().packages.some((pkg: any) => pkg.id === id)).toBe(true);

    const deactivate = await server.inject({
      method: 'DELETE',
      url: `/api/admin/packages/${id}`,
      headers: { cookie: admin },
    });
    expect(deactivate.statusCode).toBe(200);
    const publicFinal = await server.inject({ method: 'GET', url: '/api/packages' });
    expect(publicFinal.json().packages.some((pkg: any) => pkg.id === id)).toBe(false);
  });
});

describe('oyun kataloğu', () => {
  it('varsayılan katalogda oynanabilir oyun ve yakında oyunları vardır', async () => {
    const { app: server } = await app();
    const catalog = await server.inject({ method: 'GET', url: '/api/catalog' });
    expect(catalog.statusCode).toBe(200);
    const games = catalog.json().games as any[];
    expect(games.some((game) => game.status === 'live' && game.engineKey === 'fan_battle')).toBe(true);
    expect(games.filter((game) => game.status === 'coming_soon').length).toBeGreaterThanOrEqual(4);
    expect(catalog.json().packages.length).toBeGreaterThanOrEqual(6);
    expect(catalog.json().durations).toEqual(expect.arrayContaining([1, 7, 30]));
  });

  it('admin oyun ekler, gizler ve ikinci canlı motoru engeller', async () => {
    const { app: server } = await app();
    const admin = await adminCookie(server);
    const add = await server.inject({
      method: 'POST',
      url: '/api/admin/games',
      headers: { cookie: admin },
      payload: {
        name: 'Yeni Arena',
        slug: 'yeni-arena',
        category: 'eglence',
        tagline: 'Test oyunu',
        description: 'Vitrin testi',
        symbol: '🎯',
        coverUrl: null,
        status: 'coming_soon',
        engineKey: 'coming_soon',
        sortOrder: 20,
      },
    });
    expect(add.statusCode).toBe(201);
    const id = add.json().game.id as string;

    const publicCatalog = await server.inject({ method: 'GET', url: '/api/catalog' });
    expect(publicCatalog.json().games.some((game: any) => game.id === id)).toBe(true);

    const hide = await server.inject({
      method: 'PUT',
      url: `/api/admin/games/${id}`,
      headers: { cookie: admin },
      payload: {
        name: 'Yeni Arena',
        slug: 'yeni-arena',
        category: 'eglence',
        tagline: 'Test oyunu',
        description: 'Vitrin testi',
        symbol: '🎯',
        coverUrl: null,
        status: 'hidden',
        engineKey: 'coming_soon',
        sortOrder: 20,
      },
    });
    expect(hide.statusCode).toBe(200);
    const hiddenCatalog = await server.inject({ method: 'GET', url: '/api/catalog' });
    expect(hiddenCatalog.json().games.some((game: any) => game.id === id)).toBe(false);

    const secondLive = await server.inject({
      method: 'POST',
      url: '/api/admin/games',
      headers: { cookie: admin },
      payload: {
        name: 'İkinci Arena',
        slug: 'ikinci-arena',
        category: 'arena',
        tagline: 'Çakışma',
        description: '',
        symbol: '⚔️',
        coverUrl: null,
        status: 'live',
        engineKey: 'fan_battle',
        sortOrder: 21,
      },
    });
    expect(secondLive.statusCode).toBe(409);

    const deleteFan = await server.inject({
      method: 'DELETE',
      url: '/api/admin/games/gprod_fan_battle',
      headers: { cookie: admin },
    });
    expect(deleteFan.statusCode).toBe(400);
  });
});

describe('manuel lisans ve Shopier hazırlığı', () => {
  it('admin Shopier satışı için manuel lisans tanımlar', async () => {
    const { app: server } = await app();
    const admin = await adminCookie(server);
    const buyerEmail = uniqueEmail('shopier');
    const buyer = await registerUser(server, buyerEmail);
    const license = await server.inject({
      method: 'POST',
      url: '/api/admin/licenses',
      headers: { cookie: admin },
      payload: {
        email: buyerEmail,
        packageId: 'pkg_pro_1d',
        note: 'Shopier #TEST-1',
      },
    });
    expect(license.statusCode).toBe(201);
    expect(license.json().email).toBe(buyerEmail);
    const me = await server.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: buyer.cookie } });
    expect(me.json().hasPanelAccess).toBe(true);
    expect(me.json().subscription.packageName).toContain('Profesyonel');
    const payments = await server.inject({ method: 'GET', url: '/api/admin/payments', headers: { cookie: admin } });
    expect(payments.json().payments.some((payment: any) => payment.provider === 'manual')).toBe(true);
  });

  it('admin oyun lisansını oluşturur, süre ekler ve iptal eder', async () => {
    const { app: server } = await app();
    const admin = await adminCookie(server);
    const buyerEmail = uniqueEmail('license');
    const buyer = await registerUser(server, buyerEmail);

    const created = await server.inject({
      method: 'POST',
      url: '/api/admin/game-licenses',
      headers: { cookie: admin },
      payload: { email: buyerEmail, gameKey: 'dance', durationDays: 30, note: 'Shopier #CRUD-1' },
    });
    expect(created.statusCode).toBe(201);
    const license = created.json().license;
    expect(license.gameKey).toBe('dance');
    expect(license.status).toBe('active');

    const access = await server.inject({
      method: 'GET',
      url: '/api/arcade/access',
      headers: { cookie: buyer.cookie },
    });
    expect(access.json().licenses.some((row: any) => row.gameKey === 'dance')).toBe(true);

    const listed = await server.inject({
      method: 'GET',
      url: '/api/admin/game-licenses',
      headers: { cookie: admin },
    });
    expect(listed.json().licenses.some((row: any) => row.id === license.id)).toBe(true);

    const updated = await server.inject({
      method: 'PUT',
      url: `/api/admin/game-licenses/${license.id}`,
      headers: { cookie: admin },
      payload: { durationDays: 1 },
    });
    expect(updated.statusCode).toBe(200);
    expect(Date.parse(updated.json().license.expiresAt)).toBeGreaterThan(Date.parse(license.expiresAt));

    const revoked = await server.inject({
      method: 'DELETE',
      url: `/api/admin/game-licenses/${license.id}`,
      headers: { cookie: admin },
    });
    expect(revoked.statusCode).toBe(200);
    const after = await server.inject({
      method: 'GET',
      url: '/api/admin/game-licenses',
      headers: { cookie: admin },
    });
    expect(after.json().licenses.find((row: any) => row.id === license.id)?.status).toBe('revoked');
  });

  it('admin retention ve analitik metriklerini görür', async () => {
    const { app: server } = await app();
    const admin = await adminCookie(server);
    await registerUser(server);
    const analytics = await server.inject({
      method: 'GET',
      url: '/api/admin/analytics?days=30',
      headers: { cookie: admin },
    });
    expect(analytics.statusCode).toBe(200);
    expect(analytics.json().totals.users).toBeGreaterThan(0);
    expect(analytics.json().daily).toHaveLength(30);
    expect(Array.isArray(analytics.json().retention)).toBe(true);
    expect(analytics.json().recentActivity.length).toBeGreaterThan(0);
  });

  it('Shopier mağaza adresi yalnızca admin tarafından kaydedilir', async () => {
    const { app: server } = await app();
    const admin = await adminCookie(server);
    const publisher = await registerUser(server);
    const read = await server.inject({
      method: 'GET',
      url: '/api/admin/settings',
      headers: { cookie: publisher.cookie },
    });
    expect(read.statusCode).toBe(403);

    const save = await server.inject({
      method: 'PUT',
      url: '/api/admin/settings',
      headers: { cookie: admin },
      payload: { shopierStoreUrl: 'https://shopier.com/taraftar-savasi' },
    });
    expect(save.statusCode).toBe(200);
    expect(save.json().shopierStoreUrl).toBe('https://shopier.com/taraftar-savasi');
    expect(save.json().webhookUrl).toContain('/api/webhooks/payments/shopier');
  });
});
