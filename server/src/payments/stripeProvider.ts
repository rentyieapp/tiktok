import { verifyHmacSignature } from '../lib/tokens.js';
import type {
  CheckoutParams,
  CheckoutSession,
  PaymentProvider,
  WebhookHeaders,
  WebhookVerification,
} from './provider.js';

/**
 * Stripe adapter'ı. API anahtarları yalnızca sunucuda, environment
 * değişkenlerinden okunur; istemciye asla gönderilmez.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly id = 'stripe' as const;
  readonly displayName = 'Stripe';

  constructor(
    private readonly secretKey: string,
    private readonly webhookSecret: string,
  ) {}

  async createCheckout(params: CheckoutParams): Promise<CheckoutSession> {
    if (!this.secretKey) throw new Error('Stripe yapılandırılmamış (STRIPE_SECRET_KEY).');
    const form = new URLSearchParams();
    form.set('mode', 'payment');
    form.set('success_url', params.successUrl);
    form.set('cancel_url', params.cancelUrl);
    form.set('client_reference_id', params.paymentId);
    form.set('metadata[paymentId]', params.paymentId);
    form.set('payment_intent_data[metadata][paymentId]', params.paymentId);
    form.set('line_items[0][quantity]', '1');
    form.set('line_items[0][price_data][currency]', params.currency.toLowerCase());
    form.set('line_items[0][price_data][unit_amount]', String(params.amountCents));
    form.set('line_items[0][price_data][product_data][name]', params.packageName);
    form.set('customer_email', params.userEmail);

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    const payload = (await response.json()) as {
      id?: string;
      url?: string;
      error?: { message?: string };
    };
    if (!response.ok || !payload.url || !payload.id) {
      throw new Error(payload.error?.message || 'Stripe ödeme oturumu oluşturulamadı.');
    }
    return { redirectUrl: payload.url, providerCheckoutId: payload.id };
  }

  verifyWebhook(headers: WebhookHeaders, rawBody: string): WebhookVerification {
    const rawHeader = headers['stripe-signature'];
    const header = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    if (!header || !this.webhookSecret) {
      return this.invalid('İmza veya webhook anahtarı yok.');
    }
    const parts: Record<string, string[]> = {};
    for (const segment of header.split(',')) {
      const [key, value] = segment.split('=');
      if (!key || !value) continue;
      const bucket = parts[key.trim()] ?? [];
      bucket.push(value.trim());
      parts[key.trim()] = bucket;
    }
    const timestamp = Number(parts.t?.[0]);
    const signatures = parts.v1 ?? [];
    if (!Number.isFinite(timestamp) || signatures.length === 0) {
      return this.invalid('İmza başlığı geçersiz.');
    }
    const signatureValid = signatures.some((signature) =>
      verifyHmacSignature(this.webhookSecret, timestamp, rawBody, signature, 300),
    );
    if (!signatureValid) return this.invalid('İmza doğrulanamadı.');

    let event: {
      id?: string;
      type?: string;
      created?: number;
      data?: { object?: Record<string, unknown> };
    };
    try {
      event = JSON.parse(rawBody);
    } catch {
      return this.invalid('Gövde JSON değil.');
    }
    if (!event.id || !event.type) return this.invalid('Olay bilgisi eksik.');
    const object = (event.data?.object ?? {}) as Record<string, unknown>;
    const metadata = (object.metadata ?? {}) as Record<string, unknown>;
    const paymentId =
      (typeof metadata.paymentId === 'string' ? metadata.paymentId : null) ??
      (typeof object.client_reference_id === 'string' ? object.client_reference_id : null);

    let status: WebhookVerification['status'] = 'pending';
    if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
      status = 'succeeded';
    } else if (
      event.type === 'payment_intent.payment_failed' ||
      event.type === 'checkout.session.expired'
    ) {
      status = 'failed';
    }
    const amount =
      typeof object.amount_total === 'number'
        ? object.amount_total
        : typeof object.amount_received === 'number'
          ? object.amount_received
          : typeof object.amount === 'number'
            ? object.amount
            : null;
    const currency = typeof object.currency === 'string' ? object.currency.toUpperCase() : null;
    const transactionId =
      typeof object.payment_intent === 'string'
        ? object.payment_intent
        : typeof object.id === 'string'
          ? object.id
          : null;

    return {
      valid: true,
      eventId: event.id,
      eventType: event.type,
      occurrence: event.created ? new Date(event.created * 1000).toISOString() : undefined,
      paymentId,
      status,
      providerTransactionId: transactionId,
      amountCents: amount,
      currency,
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
