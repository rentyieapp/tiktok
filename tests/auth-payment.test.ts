import { afterEach, describe, expect, it } from 'vitest';
import type { BuiltApp } from '../server/src/app';
import { findPaymentById } from '../server/src/db/repo';
import {
  makeApp,
  listen,
  registerUser,
  buyPackage,
  activatePublisher,
  signTestWebhook,
  TEST_WEBHOOK_SECRET,
  type GameFixture,
} from './helpers';

let built: BuiltApp | null = null;

async function app(): Promise<BuiltApp> {
  built = await makeApp();
  return built;
}

afterEach(async () => {
  if (built) {
    await built.app.close();
    built = null;
  }
});

describe('kayıt, oturum ve abonelik kapısı', () => {
  it('kayıt olur, oturum açar ve panel ödeme olmadan kilitli kalır', async () => {
    const { app: server } = await app();
    const user = await registerUser(server, 'publisher@example.com');

    const me = await server.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: user.cookie } });
    expect(me.statusCode).toBe(200);
    const meBody = me.json();
    expect(meBody.user.email).toBe('publisher@example.com');
    expect(meBody.hasPanelAccess).toBe(false);
    expect(meBody.subscription).toBeNull();

    const game = await server.inject({ method: 'GET', url: '/api/game', headers: { cookie: user.cookie } });
    expect(game.statusCode).toBe(402);
    expect(game.json().error).toBe('PAYMENT_REQUIRED');

    const create = await server.inject({
      method: 'POST',
      url: '/api/game',
      headers: { cookie: user.cookie },
      payload: { gameName: 'Yetkisiz Arena', language: 'tr', teamCount: 2 },
    });
    expect(create.statusCode).toBe(402);
  });

  it('giriş ve çıkış çalışır, hatalı şifre reddedilir', async () => {
    const { app: server } = await app();
    const user = await registerUser(server, 'login@example.com');

    const bad = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'login@example.com', password: 'YanlisSifre1' },
    });
    expect(bad.statusCode).toBe(401);

    const good = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'login@example.com', password: 'Test1234' },
    });
    expect(good.statusCode).toBe(200);

    const logout = await server.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: user.cookie },
    });
    expect(logout.statusCode).toBe(200);
  });

  it('başarılı test ödemesi aboneliği açar ve panel erişimi verir', async () => {
    const { app: server, runtime } = await app();
    void runtime;
    const user = await registerUser(server);
    const { paymentId, status } = await buyPackage(server, user.cookie, 'pkg_starter');
    expect(status).toBe('succeeded');
    expect(paymentId).toMatch(/^pay_/);

    const me = await server.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: user.cookie } });
    const body = me.json();
    expect(body.hasPanelAccess).toBe(true);
    expect(body.subscription.packageName).toBe('Başlangıç');

    const game = await server.inject({ method: 'GET', url: '/api/game', headers: { cookie: user.cookie } });
    expect(game.statusCode).toBe(200);
    expect(game.json().game).toBeNull();
  });

  it('başarısız ödeme abonelik açmaz ve ayrı durumda tutulur', async () => {
    const { app: server } = await app();
    const user = await registerUser(server);
    const checkout = await server.inject({
      method: 'POST',
      url: '/api/billing/checkout',
      headers: { cookie: user.cookie },
      payload: { packageId: 'pkg_starter' },
    });
    const paymentId = checkout.json().payment.id as string;
    const pay = await server.inject({
      method: 'POST',
      url: `/api/test-payments/${paymentId}/pay`,
      headers: { cookie: user.cookie },
      payload: { outcome: 'failure' },
    });
    expect(pay.statusCode).toBe(200);
    expect(pay.json().paymentStatus).toBe('failed');

    const me = await server.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: user.cookie } });
    expect(me.json().hasPanelAccess).toBe(false);
    expect(me.json().subscription).toBeNull();

    const payments = await server.inject({
      method: 'GET',
      url: '/api/billing/payments',
      headers: { cookie: user.cookie },
    });
    expect(payments.json().payments[0].status).toBe('failed');
  });

  it('bekleyen ödeme panel erişimi açmaz', async () => {
    const { app: server } = await app();
    const user = await registerUser(server);
    await server.inject({
      method: 'POST',
      url: '/api/billing/checkout',
      headers: { cookie: user.cookie },
      payload: { packageId: 'pkg_pro' },
    });
    const me = await server.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: user.cookie } });
    expect(me.json().hasPanelAccess).toBe(false);
    const payments = await server.inject({
      method: 'GET',
      url: '/api/billing/payments',
      headers: { cookie: user.cookie },
    });
    expect(payments.json().payments[0].status).toBe('pending');
  });
});

describe('webhook güvenliği ve idempotency', () => {
  it('aynı imzalı webhook iki kez işlenmez, tek abonelik oluşur', async () => {
    const { app: server, db } = await app();
    const user = await registerUser(server);
    const checkout = await server.inject({
      method: 'POST',
      url: '/api/billing/checkout',
      headers: { cookie: user.cookie },
      payload: { packageId: 'pkg_starter' },
    });
    const paymentId = checkout.json().payment.id as string;
    const payment = findPaymentById(db, paymentId)!;
    const event = {
      id: `evt_manual_${Date.now()}`,
      type: 'payment.succeeded',
      data: {
        paymentId,
        amountCents: payment.amount_cents,
        currency: payment.currency,
        transactionId: `txn_manual_${Date.now()}`,
      },
    };
    const signed = signTestWebhook(event);
    const first = await server.inject({
      method: 'POST',
      url: '/api/webhooks/payments/test',
      payload: signed.body,
      headers: signed.headers,
    });
    expect(first.statusCode).toBe(200);
    expect(first.json().handled).toBe(true);
    expect(first.json().subscriptionCreated).toBe(true);

    const second = await server.inject({
      method: 'POST',
      url: '/api/webhooks/payments/test',
      payload: signed.body,
      headers: signed.headers,
    });
    expect(second.statusCode).toBe(200);
    expect(second.json().duplicate).toBe(true);

    const subscriptions = db
      .prepare('SELECT COUNT(*) AS count FROM subscriptions WHERE user_id = ?')
      .get(user.userId) as { count: number };
    expect(subscriptions.count).toBe(1);
    const paid = findPaymentById(db, paymentId)!;
    expect(paid.status).toBe('succeeded');
  });

  it('geçersiz imza reddedilir, ödeme beklemede kalır', async () => {
    const { app: server, db } = await app();
    const user = await registerUser(server);
    const checkout = await server.inject({
      method: 'POST',
      url: '/api/billing/checkout',
      headers: { cookie: user.cookie },
      payload: { packageId: 'pkg_starter' },
    });
    const paymentId = checkout.json().payment.id as string;
    const payment = findPaymentById(db, paymentId)!;
    const signed = signTestWebhook(
      {
        id: `evt_bad_${Date.now()}`,
        type: 'payment.succeeded',
        data: { paymentId, amountCents: payment.amount_cents, currency: payment.currency },
      },
      'wrong-secret',
    );
    const response = await server.inject({
      method: 'POST',
      url: '/api/webhooks/payments/test',
      payload: signed.body,
      headers: signed.headers,
    });
    expect(response.statusCode).toBe(400);
    expect(findPaymentById(db, paymentId)!.status).toBe('pending');
    const subscriptions = db
      .prepare('SELECT COUNT(*) AS count FROM subscriptions WHERE user_id = ?')
      .get(user.userId) as { count: number };
    expect(subscriptions.count).toBe(0);
  });

  it('tutar uyuşmazlığında aktivasyon yapılmaz', async () => {
    const { app: server, db } = await app();
    const user = await registerUser(server);
    const checkout = await server.inject({
      method: 'POST',
      url: '/api/billing/checkout',
      headers: { cookie: user.cookie },
      payload: { packageId: 'pkg_pro' },
    });
    const paymentId = checkout.json().payment.id as string;
    const signed = signTestWebhook({
      id: `evt_amount_${Date.now()}`,
      type: 'payment.succeeded',
      data: { paymentId, amountCents: 1, currency: 'TRY' },
    });
    const response = await server.inject({
      method: 'POST',
      url: '/api/webhooks/payments/test',
      payload: signed.body,
      headers: signed.headers,
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('AMOUNT_MISMATCH');
    expect(findPaymentById(db, paymentId)!.status).toBe('pending');
    const subscriptions = db
      .prepare('SELECT COUNT(*) AS count FROM subscriptions WHERE user_id = ?')
      .get(user.userId) as { count: number };
    expect(subscriptions.count).toBe(0);
  });

  it('başka kullanıcının ödeme kaydına erişilemez', async () => {
    const { app: server } = await app();
    const userA = await registerUser(server, 'owner@example.com');
    const userB = await registerUser(server, 'intruder@example.com');
    const checkout = await server.inject({
      method: 'POST',
      url: '/api/billing/checkout',
      headers: { cookie: userA.cookie },
      payload: { packageId: 'pkg_starter' },
    });
    const paymentId = checkout.json().payment.id as string;
    const read = await server.inject({
      method: 'GET',
      url: `/api/test-payments/${paymentId}`,
      headers: { cookie: userB.cookie },
    });
    expect(read.statusCode).toBe(404);
    const pay = await server.inject({
      method: 'POST',
      url: `/api/test-payments/${paymentId}/pay`,
      headers: { cookie: userB.cookie },
      payload: { outcome: 'success' },
    });
    expect(pay.statusCode).toBe(404);
  });

  it('süresi dolan abonelik paneli kilitler', async () => {
    const { app: server, db } = await app();
    const user = await registerUser(server);
    await buyPackage(server, user.cookie, 'pkg_starter');
    db.prepare(
      "UPDATE subscriptions SET expires_at = '2000-01-01T00:00:00.000Z' WHERE user_id = ?",
    ).run(user.userId);
    const me = await server.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: user.cookie } });
    expect(me.json().hasPanelAccess).toBe(false);
    expect(me.json().subscription).toBeNull();
    const game = await server.inject({ method: 'GET', url: '/api/game', headers: { cookie: user.cookie } });
    expect(game.statusCode).toBe(402);
  });

  it('amblem yüklemesi görsel türünü doğrular ve dosyayı sunar', async () => {
    const { app: server } = await app();
    const user = await activatePublisher(server, 'pkg_pro');
    const port = await listen(server);
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+XkZkAAAAASUVORK5CYII=',
      'base64',
    );
    const form = new FormData();
    form.append('file', new Blob([png], { type: 'image/png' }), 'emblem.png');
    const upload = await fetch(`http://127.0.0.1:${port}/api/uploads/emblem`, {
      method: 'POST',
      headers: { cookie: user.cookie },
      body: form,
    });
    expect(upload.status).toBe(201);
    const payload = (await upload.json()) as { url: string };
    expect(payload.url).toMatch(/^\/uploads\/emblem-[a-z0-9]+\.png$/);
    const served = await fetch(`http://127.0.0.1:${port}${payload.url}`);
    expect(served.status).toBe(200);
    expect(served.headers.get('content-type')).toContain('image/png');

    const fakeForm = new FormData();
    fakeForm.append('file', new Blob([Buffer.from('bu bir resim degil')], { type: 'image/png' }), 'fake.png');
    const rejected = await fetch(`http://127.0.0.1:${port}/api/uploads/emblem`, {
      method: 'POST',
      headers: { cookie: user.cookie },
      body: fakeForm,
    });
    expect(rejected.status).toBe(400);
  });

  it('test ödeme uç noktası test anahtarı olmadan imza üretmez', async () => {
    const { app: server, providers } = await app();
    const provider = providers.get('test');
    expect(provider).toBeDefined();
    const badSignature = await server.inject({
      method: 'POST',
      url: '/api/webhooks/payments/test',
      payload: JSON.stringify({ id: 'evt_x', type: 'payment.succeeded', data: { paymentId: 'x' } }),
      headers: { 'content-type': 'application/json', 'x-test-signature': 't=1,v1=deadbeef' },
    });
    expect(badSignature.statusCode).toBe(400);
  });
});
