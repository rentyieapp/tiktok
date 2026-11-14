import { randomBytes } from 'node:crypto';
import { hmacSignature, verifyHmacSignature } from '../lib/tokens.js';
import type {
  CheckoutParams,
  CheckoutSession,
  PaymentProvider,
  WebhookHeaders,
  WebhookVerification,
} from './provider.js';
import type { PaymentRow } from '../db/repo.js';

export interface SimulatedWebhook {
  body: string;
  headers: Record<string, string>;
}

/**
 * Geliştirme/test ödeme sağlayıcısı.
 *
 * Tarayıcıdaki "öde" düğmesi hesabı doğrudan aktive etmez. Sunucu, sağlayıcı
 * sunucusunu taklit ederek imzalı bir webhook üretir ve gerçek webhook
 * işleyicisine gönderir. Böylece canlı sağlayıcıya geçişte aynı kod yolu
 * kullanılmış olur.
 */
export class TestPaymentProvider implements PaymentProvider {
  readonly id = 'test' as const;
  readonly displayName = 'Test Ödeme Sağlayıcısı';
  private readonly secret: string;
  private readonly webOrigin: string;

  constructor(secret: string, webOrigin: string) {
    this.secret = secret;
    this.webOrigin = webOrigin.replace(/\/+$/, '');
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutSession> {
    // Test sağlayıcısı aynı origin'de barınır; göreli yönlendirme host
    // değişiminden kaynaklanan oturum kaybını önler.
    return {
      redirectUrl: `/odeme/test/${params.paymentId}`,
      providerCheckoutId: `testco_${randomBytes(8).toString('hex')}`,
      providerTransactionId: null,
    };
  }

  verificationFromRaw(
    headers: WebhookHeaders,
    rawBody: string,
  ): WebhookVerification {
    const header = headers['x-test-signature'];
    const signatureHeader = Array.isArray(header) ? header[0] : header;
    if (!signatureHeader) {
      return this.invalid('İmza başlığı yok.');
    }
    const parts: Record<string, string> = {};
    for (const segment of signatureHeader.split(',')) {
      const [key, value] = segment.split('=');
      if (key && value) parts[key.trim()] = value.trim();
    }
    const timestamp = Number(parts.t);
    if (!parts.v1 || !Number.isFinite(timestamp)) {
      return this.invalid('İmza başlığı geçersiz.');
    }
    if (!verifyHmacSignature(this.secret, timestamp, rawBody, parts.v1)) {
      return this.invalid('İmza doğrulanamadı.');
    }
    let payload: {
      id?: string;
      type?: string;
      data?: {
        paymentId?: string;
        amountCents?: number;
        currency?: string;
        transactionId?: string;
      };
    };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return this.invalid('Gövde JSON değil.');
    }
    if (!payload.id || !payload.data?.paymentId) {
      return this.invalid('Olay kimliği veya ödeme kimliği eksik.');
    }
    const succeeded = payload.type === 'payment.succeeded';
    const failed = payload.type === 'payment.failed';
    return {
      valid: true,
      eventId: payload.id,
      eventType: payload.type ?? 'unknown',
      paymentId: payload.data.paymentId,
      status: succeeded ? 'succeeded' : failed ? 'failed' : 'pending',
      providerTransactionId: payload.data.transactionId ?? null,
      amountCents: typeof payload.data.amountCents === 'number' ? payload.data.amountCents : null,
      currency: payload.data.currency ?? null,
    };
  }

  verifyWebhook(headers: WebhookHeaders, rawBody: string): WebhookVerification {
    return this.verificationFromRaw(headers, rawBody);
  }

  /** Test sağlayıcısının sunucu tarafını taklit eder. */
  createSimulatedWebhook(
    payment: PaymentRow,
    outcome: 'success' | 'failure',
  ): SimulatedWebhook {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = {
      id: `evt_test_${randomBytes(12).toString('hex')}`,
      type: outcome === 'success' ? 'payment.succeeded' : 'payment.failed',
      created: new Date().toISOString(),
      data: {
        paymentId: payment.id,
        amountCents: payment.amount_cents,
        currency: payment.currency,
        transactionId: `txn_test_${randomBytes(8).toString('hex')}`,
        failureReason: outcome === 'failure' ? 'test_card_declined' : undefined,
      },
    };
    const body = JSON.stringify(payload);
    const signature = hmacSignature(this.secret, timestamp, body);
    return {
      body,
      headers: {
        'content-type': 'application/json',
        'x-test-signature': `t=${timestamp},v1=${signature}`,
      },
    };
  }

  private invalid(reason: string): WebhookVerification {
    return {
      valid: false,
      eventId: null,
      eventType: 'invalid',
      paymentId: null,
      status: null,
      providerTransactionId: null,
      amountCents: null,
      currency: null,
      reason,
    };
  }
}
