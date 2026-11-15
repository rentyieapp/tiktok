import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { badRequest, notFound } from '../lib/errors.js';
import { processPaymentWebhook } from '../services/billing.js';
import { findPlatformConnectionByToken } from '../db/repo.js';
import { fetchShopierOrder, handleShopierOrder } from '../services/shopierOrders.js';

export async function paymentWebhookRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  app.post(
    '/api/webhooks/tiktok/:token',
    { config: { rateLimit: { max: 240, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const connection = findPlatformConnectionByToken(ctx.db, token);
      if (!connection || connection.platform !== 'tiktok') {
        throw notFound('TikTok connector bulunamadı.');
      }
      const result = ctx.platformHub.handleTikTokWebhook(token, request.body);
      return reply.send({ received: true, ...result });
    },
  );

  app.post('/api/webhooks/payments/shopier', async (request, reply) => {
    const rawBody = (request as typeof request & { rawBody?: string }).rawBody;
    const signatureHeader = request.headers['shopier-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    if (!ctx.config.shopierWebhookToken) {
      return reply.code(503).send({ error: 'SHOPIER_WEBHOOK_NOT_CONFIGURED', message: 'Shopier webhook anahtarı tanımlı değil.' });
    }
    if (typeof rawBody !== 'string' || !signature) {
      return reply.code(400).send({ error: 'INVALID_SIGNATURE', message: 'Shopier imzası eksik.' });
    }
    const expected = createHmac('sha256', ctx.config.shopierWebhookToken).update(rawBody).digest();
    let provided: Buffer;
    try {
      provided = Buffer.from(signature, 'hex');
    } catch {
      return reply.code(400).send({ error: 'INVALID_SIGNATURE', message: 'Shopier imzası geçersiz.' });
    }
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return reply.code(400).send({ error: 'INVALID_SIGNATURE', message: 'Shopier imzası doğrulanamadı.' });
    }
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD', message: 'Shopier gövdesi JSON değil.' });
    }
    const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const bodyOrder = (record.data && typeof record.data === 'object' ? record.data : record) as Record<string, unknown>;
    const orderId = typeof bodyOrder.id === 'string' ? bodyOrder.id : '';
    if (!orderId) {
      return reply.code(400).send({ error: 'INVALID_PAYLOAD', message: 'Shopier sipariş ID’si eksik.' });
    }
    // order.created yalnızca bir bildirimdir; ödeme durumu Shopier API’sinden
    // yetkili sipariş kaydı okunarak doğrulanır. Body’deki paymentStatus’a güvenilmez.
    const verifiedOrder = await fetchShopierOrder(ctx.config.shopierPat, orderId);
    if (!verifiedOrder) {
      return reply.send({ received: true, verified: false, status: 'verification_pending' });
    }
    const result = handleShopierOrder(ctx.db, verifiedOrder);
    return reply.send({ received: true, verified: true, inserted: result.inserted, status: result.status });
  });

  app.post('/api/webhooks/payments/:providerId', async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    const provider = ctx.providers.get(providerId);
    if (!provider) throw notFound('Bilinmeyen ödeme sağlayıcısı.');
    const rawBody = (request as typeof request & { rawBody?: string }).rawBody;
    if (typeof rawBody !== 'string' || rawBody.length === 0) {
      throw badRequest('Webhook gövdesi okunamadı.');
    }
    const result = processPaymentWebhook(ctx.db, provider, request.headers, rawBody);
    return reply.send({
      received: true,
      duplicate: result.duplicate,
      handled: result.handled,
      paymentStatus: result.paymentStatus,
      subscriptionCreated: result.subscriptionCreated,
      licenseCreated: result.licenseCreated,
      message: result.message,
    });
  });
}
