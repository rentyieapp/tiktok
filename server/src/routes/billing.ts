import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import {
  findPackageById,
  findPaymentById,
  findPaymentForUser,
  listPaymentsForUser,
  listSubscriptionsForUser,
  expireOldSubscriptions,
  findActiveSubscription,
} from '../db/repo.js';
import { nowIso } from '../db/index.js';
import { conflict, notFound } from '../lib/errors.js';
import { checkoutSchema, parseBody, testPaymentSchema } from '../lib/schemas.js';
import { rowToPackage, rowToPayment, rowToSubscription } from '../game/mappers.js';
import { requireUser } from '../services/session.js';
import { getAccountOverview } from '../services/account.js';
import {
  assertPaymentOwner,
  packageDtoById,
  paymentDto,
  startCheckout,
} from '../services/billing.js';
import { TestPaymentProvider } from '../payments/testProvider.js';

export async function billingRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  const { db, config, providers, app: rootApp } = ctx;

  app.post(
    '/api/billing/checkout',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const user = requireUser(request, db, config);
      const body = parseBody(checkoutSchema, request.body);
      const result = await startCheckout(db, config, providers, user, body.packageId, body.couponCode);
      return reply.code(201).send(result);
    },
  );

  app.get('/api/billing/payments', async (request, reply) => {
    const user = requireUser(request, db, config);
    const payments = listPaymentsForUser(db, user.id).map((payment) => {
      const pkg = findPackageById(db, payment.package_id);
      return rowToPayment(payment, pkg?.name ?? 'Bilinmeyen paket');
    });
    return reply.send({ payments });
  });

  app.get('/api/billing/subscription', async (request, reply) => {
    const user = requireUser(request, db, config);
    const account = getAccountOverview(db, user);
    return reply.send({
      subscription:
        account.subscriptionRow && account.packageRow
          ? rowToSubscription(account.subscriptionRow, account.packageRow)
          : null,
      hasPanelAccess: account.hasPanelAccess,
      history: listSubscriptionsForUser(db, user.id).map((subscription) => {
        const pkg = findPackageById(db, subscription.package_id);
        return {
          id: subscription.id,
          status: subscription.status,
          startsAt: subscription.starts_at,
          expiresAt: subscription.expires_at,
          packageName: pkg?.name ?? 'Bilinmeyen paket',
        };
      }),
    });
  });

  app.get('/api/test-payments/:paymentId', async (request, reply) => {
    if (!config.testPaymentsEnabled) throw notFound();
    const user = requireUser(request, db, config);
    const { paymentId } = request.params as { paymentId: string };
    const payment = assertPaymentOwner(findPaymentForUser(db, paymentId, user.id), user);
    if (payment.provider !== 'test') throw notFound();
    const pkg = findPackageById(db, payment.package_id);
    if (!pkg) throw notFound('Paket bulunamadı.');
    return reply.send({
      payment: paymentDto(db, payment),
      package: rowToPackage(pkg),
      providerName: 'Test Ödeme Sağlayıcısı',
      testMode: true,
    });
  });

  /**
   * Test sağlayıcısının "öde" uç noktası. Tarayıcı yalnızca sağlayıcıyı
   * tetikler; hesap, imzalı webhook işlendikten sonra aktive olur.
   */
  app.post(
    '/api/test-payments/:paymentId/pay',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request, reply) => {
      if (!config.testPaymentsEnabled) throw notFound();
      const user = requireUser(request, db, config);
      const { paymentId } = request.params as { paymentId: string };
      const payment = assertPaymentOwner(findPaymentForUser(db, paymentId, user.id), user);
      if (payment.provider !== 'test') throw notFound();
      if (payment.status === 'succeeded') {
        return reply.send({
          ok: true,
          alreadyProcessed: true,
          paymentStatus: 'succeeded',
          message: 'Bu ödeme zaten doğrulanmış.',
        });
      }
      if (payment.status !== 'pending') {
        throw conflict('Bu ödeme artık işlenemez durumda.');
      }
      const provider = providers.get('test');
      if (!(provider instanceof TestPaymentProvider)) throw notFound();
      const body = parseBody(testPaymentSchema, request.body);
      const webhook = provider.createSimulatedWebhook(payment, body.outcome ?? 'success');
      const response = await rootApp.inject({
        method: 'POST',
        url: '/api/webhooks/payments/test',
        payload: webhook.body,
        headers: webhook.headers,
      });
      let parsed: Record<string, unknown> = {};
      try {
        parsed = response.json() as Record<string, unknown>;
      } catch {
        parsed = {};
      }
      if (response.statusCode >= 400) {
        return reply.code(502).send({
          ok: false,
          paymentStatus: findPaymentById(db, payment.id)?.status ?? 'pending',
          message: 'Test webhook işlenemedi.',
        });
      }
      return reply.send({
        ok: true,
        alreadyProcessed: false,
        paymentStatus: findPaymentById(db, payment.id)?.status ?? 'pending',
        webhook: parsed,
      });
    },
  );

  app.get('/api/billing/payment/:paymentId', async (request, reply) => {
    const user = requireUser(request, db, config);
    const { paymentId } = request.params as { paymentId: string };
    const payment = assertPaymentOwner(findPaymentForUser(db, paymentId, user.id), user);
    return reply.send({ payment: paymentDto(db, payment) });
  });

  app.post('/api/billing/subscription/refresh', async (request, reply) => {
    const user = requireUser(request, db, config);
    expireOldSubscriptions(db, user.id, nowIso());
    const subscription = findActiveSubscription(db, user.id, nowIso());
    return reply.send({
      active: Boolean(subscription),
      subscription: subscription
        ? {
            id: subscription.id,
            packageId: subscription.package_id,
            expiresAt: subscription.expires_at,
          }
        : null,
    });
  });
}
