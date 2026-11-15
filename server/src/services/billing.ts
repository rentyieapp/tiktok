import { randomId } from '../lib/tokens.js';
import { HttpError, badRequest, notFound } from '../lib/errors.js';
import {
  cancelOtherSubscriptions,
  createGameLicense,
  trackActivity,
  createPayment,
  createSubscription,
  findActiveGameLicense,
  findCouponByCode,
  consumeCoupon,
  findActiveSubscription,
  findPackageById,
  findPaymentById,
  insertWebhookEvent,
  markPaymentStatus,
  markWebhookEvent,
  type PaymentRow,
  type UserRow,
} from '../db/repo.js';
import { isoPlusDays, nowIso, type DB } from '../db/index.js';
import { rowToPayment, rowToPackage } from '../game/mappers.js';
import type { AppConfig } from '../config.js';
import type { PaymentProvider, WebhookHeaders } from '../payments/provider.js';
import type { PaymentDTO } from '../../../shared/types.js';
import { ARCADE_GAME_LIST } from '../../../shared/arcade.js';

export function buildProviderRegistry(config: AppConfig): Map<string, PaymentProvider> {
  const registry = new Map<string, PaymentProvider>();
  const { TestPaymentProvider } = requireTestProvider();
  const { StripePaymentProvider } = requireStripeProvider();
  if (config.testPaymentsEnabled) {
    registry.set('test', new TestPaymentProvider(config.testPaymentWebhookSecret, config.webOrigin));
  }
  if (config.stripeSecretKey && config.stripeWebhookSecret) {
    registry.set(
      'stripe',
      new StripePaymentProvider(config.stripeSecretKey, config.stripeWebhookSecret),
    );
  }
  return registry;
}

// Test/stripe sınıfları döngüsel import olmaması için fonksiyon içinde yüklenir.
import { TestPaymentProvider as TestProviderImpl } from '../payments/testProvider.js';
import { StripePaymentProvider as StripeProviderImpl } from '../payments/stripeProvider.js';

function requireTestProvider() {
  return { TestPaymentProvider: TestProviderImpl };
}
function requireStripeProvider() {
  return { StripePaymentProvider: StripeProviderImpl };
}

export interface CheckoutResult {
  payment: PaymentDTO | null;
  redirectUrl: string;
}

export async function startCheckout(
  db: DB,
  config: AppConfig,
  providers: Map<string, PaymentProvider>,
  user: UserRow,
  packageId: string,
  couponCode?: string,
): Promise<CheckoutResult> {
  const pkg = findPackageById(db, packageId);
  if (!pkg || pkg.is_active !== 1) throw notFound('Seçilen paket bulunamadı veya satışta değil.');
  // Shopier ürünü eşleşmişse ödeme sayfası olarak doğrudan Shopier kullanılır.
  // Ödeme kaydı webhook'ta yetkili sipariş doğrulandıktan sonra oluşturulur.
  if (pkg.shopier_url && /^https:\/\/(www\.)?shopier\.com\/(?:[^/?#]+\/)?\d{4,}(?:[/?#]|$)/i.test(pkg.shopier_url)) {
    if (couponCode?.trim()) {
      throw badRequest('Shopier ürününde kupon kodu uygulanamıyor.');
    }
    return { payment: null, redirectUrl: pkg.shopier_url };
  }
  const provider = providers.get(config.paymentProvider);
  if (!provider) {
    throw new HttpError(
      503,
      'PROVIDER_UNAVAILABLE',
      'Ödeme sağlayıcısı yapılandırılmamış. Lütfen yöneticiyle iletişime geç.',
    );
  }
  let amountCents = pkg.price_cents;
  let appliedCoupon: string | null = null;
  if (couponCode?.trim()) {
    const coupon = findCouponByCode(db, couponCode);
    if (!coupon || coupon.active !== 1) {
      throw badRequest('Kupon kodu geçersiz veya pasif.');
    }
    if (coupon.expires_at && Date.parse(coupon.expires_at) <= Date.now()) {
      throw badRequest('Kupon kodunun süresi dolmuş.');
    }
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      throw badRequest('Kupon kodunun kullanım limiti dolmuş.');
    }
    const discount = Math.min(
      amountCents,
      Math.round((amountCents * coupon.percent_off) / 100) + coupon.fixed_off_cents,
    );
    amountCents = Math.max(0, amountCents - discount);
    appliedCoupon = coupon.code;
  }
  const now = nowIso();
  const paymentId = randomId('pay');
  const payment: PaymentRow = {
    id: paymentId,
    user_id: user.id,
    package_id: pkg.id,
    provider: provider.id,
    provider_transaction_id: null,
    provider_checkout_id: null,
    amount_cents: amountCents,
    currency: pkg.currency,
    status: 'pending',
    idempotency_key: `checkout:${paymentId}`,
    metadata_json: JSON.stringify({ packageCode: pkg.code, couponCode: appliedCoupon }),
    created_at: now,
    updated_at: now,
  };
  createPayment(db, payment);

  try {
    const checkout = await provider.createCheckout({
      paymentId,
      amountCents,
      currency: pkg.currency,
      packageName: pkg.name,
      userEmail: user.email,
      userName: user.display_name,
      successUrl: `${config.webOrigin}/odeme/basarili?payment=${paymentId}`,
      cancelUrl: `${config.webOrigin}/panel/odeme?durum=iptal`,
    });
    db.prepare(
      'UPDATE payments SET provider_checkout_id = ?, updated_at = ? WHERE id = ?',
    ).run(checkout.providerCheckoutId, nowIso(), paymentId);
    return {
      payment: rowToPayment(
        { ...payment, provider_checkout_id: checkout.providerCheckoutId },
        pkg.name,
      ),
      redirectUrl: checkout.redirectUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ödeme oturumu oluşturulamadı.';
    db.prepare(
      `UPDATE payments SET status = 'failed', updated_at = ? WHERE id = ?`,
    ).run(nowIso(), paymentId);
    throw new HttpError(502, 'CHECKOUT_FAILED', message);
  }
}

export interface WebhookProcessResult {
  duplicate: boolean;
  handled: boolean;
  paymentStatus: string | null;
  subscriptionCreated: boolean;
  licenseCreated: boolean;
  message: string;
}

/**
 * İmza doğrulaması yapılmış webhook'u işler.
 *
 * - Aynı (provider, event_id) yalnızca bir kez işlenir.
 * - Ödeme durumu yalnızca `pending` iken ilerletilir; çift aktivasyon olmaz.
 * - Tutar/para birimi uyuşmazsa aktivasyon yapılmaz.
 */
export function processPaymentWebhook(
  db: DB,
  provider: PaymentProvider,
  headers: WebhookHeaders,
  rawBody: string,
): WebhookProcessResult {
  const verification = provider.verifyWebhook(headers, rawBody);
  if (!verification.valid || !verification.eventId) {
    throw new HttpError(
      400,
      'INVALID_SIGNATURE',
      `Webhook doğrulanamadı: ${verification.reason ?? 'geçersiz imza'}`,
    );
  }

  const now = nowIso();
  const webhookRowId = randomId('wh');
  const inserted = insertWebhookEvent(db, {
    id: webhookRowId,
    provider: provider.id,
    eventId: verification.eventId,
    eventType: verification.eventType,
    paymentId: verification.paymentId,
    status: 'received',
    payloadJson: rawBody.slice(0, 20000),
    now,
  });
  if (!inserted) {
    return {
      duplicate: true,
      handled: false,
      paymentStatus: null,
      subscriptionCreated: false,
      licenseCreated: false,
      message: 'Bu webhook daha önce işlendi.',
    };
  }

  const payment = verification.paymentId ? findPaymentById(db, verification.paymentId) : undefined;
  if (!payment) {
    markWebhookEvent(db, webhookRowId, 'ignored', now);
    return {
      duplicate: false,
      handled: false,
      paymentStatus: null,
      subscriptionCreated: false,
      licenseCreated: false,
      message: 'Webhook ile eşleşen ödeme bulunamadı.',
    };
  }
  if (payment.provider !== provider.id) {
    markWebhookEvent(db, webhookRowId, 'failed', now);
    throw new HttpError(400, 'PROVIDER_MISMATCH', 'Webhook sağlayıcısı ödeme kaydıyla uyuşmuyor.');
  }

  if (
    verification.amountCents !== null &&
    verification.amountCents !== payment.amount_cents
  ) {
    markWebhookEvent(db, webhookRowId, 'failed', now);
    throw new HttpError(400, 'AMOUNT_MISMATCH', 'Webhook tutarı ödeme kaydıyla uyuşmuyor.');
  }
  if (
    verification.currency &&
    verification.currency.toUpperCase() !== payment.currency.toUpperCase()
  ) {
    markWebhookEvent(db, webhookRowId, 'failed', now);
    throw new HttpError(400, 'CURRENCY_MISMATCH', 'Webhook para birimi ödeme kaydıyla uyuşmuyor.');
  }

  if (verification.status === 'succeeded') {
    let subscriptionCreated = false;
    let licenseCreated = false;
    let changed = false;
    db.transaction(() => {
      changed = markPaymentStatus(
        db,
        payment.id,
        'pending',
        'succeeded',
        now,
        verification.providerTransactionId,
      );
      if (!changed) return;
      const pkg = findPackageById(db, payment.package_id);
      if (!pkg) throw new HttpError(500, 'PACKAGE_MISSING', 'Ödeme paketi bulunamadı.');
      if (pkg.game_key === '*') {
        for (const game of ARCADE_GAME_LIST) {
          const currentLicense = findActiveGameLicense(db, payment.user_id, game.key, now);
          const base = currentLicense
            ? Math.max(Date.now(), Date.parse(currentLicense.expires_at) || 0)
            : Date.now();
          const expiresAt = isoPlusDays(pkg.duration_days, new Date(base));
          createGameLicense(db, {
            id: randomId('lic'),
            userId: payment.user_id,
            gameKey: game.key,
            packageId: pkg.id,
            paymentId: payment.id,
            startsAt: now,
            expiresAt,
            now,
          });
        }
        licenseCreated = true;
      } else if (pkg.game_key) {
        const currentLicense = findActiveGameLicense(db, payment.user_id, pkg.game_key, now);
        const base = currentLicense
          ? Math.max(Date.now(), Date.parse(currentLicense.expires_at) || 0)
          : Date.now();
        const expiresAt = isoPlusDays(pkg.duration_days, new Date(base));
        createGameLicense(db, {
          id: randomId('lic'),
          userId: payment.user_id,
          gameKey: pkg.game_key,
          packageId: pkg.id,
          paymentId: payment.id,
          startsAt: now,
          expiresAt,
          now,
        });
        licenseCreated = true;
      } else {
        const current = findActiveSubscription(db, payment.user_id, now);
        const base = current ? Math.max(Date.now(), Date.parse(current.expires_at) || 0) : Date.now();
        const expiresAt = isoPlusDays(pkg.duration_days, new Date(base));
        const subscriptionId = randomId('sub');
        createSubscription(db, {
          id: subscriptionId,
          userId: payment.user_id,
          packageId: payment.package_id,
          paymentId: payment.id,
          startsAt: now,
          expiresAt,
        });
        cancelOtherSubscriptions(db, payment.user_id, subscriptionId, now);
        subscriptionCreated = true;
      }
      try {
        const meta = JSON.parse(payment.metadata_json) as { couponCode?: string | null };
        if (meta.couponCode) consumeCoupon(db, meta.couponCode, now);
      } catch {
        /* kupon meta verisi yoksa yoksay */
      }
    })();
    if (changed) trackActivity(db, payment.user_id, 'payment', now, { amountCents: payment.amount_cents });
    markWebhookEvent(db, webhookRowId, changed ? 'processed' : 'ignored', now);
    return {
      duplicate: false,
      handled: changed,
      paymentStatus: 'succeeded',
      subscriptionCreated,
      licenseCreated,
      message: changed
        ? licenseCreated
          ? 'Ödeme doğrulandı ve oyun lisansı aktif edildi.'
          : 'Ödeme doğrulandı ve abonelik aktif edildi.'
        : 'Ödeme zaten başarıyla işlenmişti; yeni kayıt oluşturulmadı.',
    };
  }

  if (verification.status === 'failed') {
    const changed = markPaymentStatus(db, payment.id, 'pending', 'failed', now, null);
    if (changed) trackActivity(db, payment.user_id, 'payment', now, { amountCents: payment.amount_cents });
    markWebhookEvent(db, webhookRowId, changed ? 'processed' : 'ignored', now);
    return {
      duplicate: false,
      handled: changed,
      paymentStatus: 'failed',
      subscriptionCreated: false,
      licenseCreated: false,
      message: 'Ödeme başarısız olarak işaretlendi.',
    };
  }

  markWebhookEvent(db, webhookRowId, 'ignored', now);
  return {
    duplicate: false,
    handled: false,
    paymentStatus: payment.status,
    subscriptionCreated: false,
    licenseCreated: false,
    message: 'Ödeme henüz tamamlanmadı; kayıt beklemede tutuldu.',
  };
}

export function assertPaymentOwner(payment: PaymentRow | undefined, user: UserRow): PaymentRow {
  if (!payment || payment.user_id !== user.id) {
    throw notFound('Ödeme kaydı bulunamadı.');
  }
  return payment;
}

export function paymentDto(db: DB, payment: PaymentRow): PaymentDTO {
  const pkg = findPackageById(db, payment.package_id);
  if (!pkg) throw badRequest('Ödeme paketi bulunamadı.');
  return rowToPayment(payment, pkg.name);
}

export function packageDtoById(db: DB, packageId: string) {
  const pkg = findPackageById(db, packageId);
  if (!pkg) throw notFound('Paket bulunamadı.');
  return rowToPackage(pkg);
}
