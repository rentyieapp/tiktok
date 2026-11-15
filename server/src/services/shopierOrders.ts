import { randomId } from '../lib/tokens.js';
import { isoPlusDays, nowIso, type DB } from '../db/index.js';
import {
  cancelOtherSubscriptions,
  createGameLicense,
  createPayment,
  createSubscription,
  findActiveGameLicense,
  findActiveSubscription,
  findPackageByShopierProductId,
  findUserByEmail,
  getAppSetting,
  listPackages,
  setAppSetting,
  type PackageRow,
  type UserRow,
} from '../db/repo.js';
import { findShopierOrderByOrderId, insertShopierOrder, updateShopierOrder, type ShopierOrderRow } from '../db/shopierOrders.js';
import { ARCADE_GAME_LIST } from '../../../shared/arcade.js';
import type { AppConfig } from '../config.js';

interface ShopierLineItem {
  productId?: string | number;
  title?: string;
  quantity?: number;
  price?: string;
  total?: string;
}

interface ShopierAddress {
  email?: string;
  firstName?: string;
  lastName?: string;
}

export interface ShopierApiOrder {
  id?: string;
  status?: string;
  paymentStatus?: string;
  currency?: string;
  dateCreated?: string;
  totals?: { total?: string };
  billingInfo?: ShopierAddress;
  shippingInfo?: ShopierAddress;
  lineItems?: ShopierLineItem[];
}

export interface ShopierSyncResult {
  fetched: number;
  inserted: number;
  activated: number;
  needsMapping: number;
  message: string;
}

let syncInFlight = false;
let lastSyncAt: string | null = null;

function parseAmountCents(value: string | undefined): number | null {
  if (!value) return null;
  const normalized = value.replace(/[^\d.,-]/g, '').replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function normalizeEmail(order: ShopierApiOrder): string | null {
  const raw = order.billingInfo?.email ?? order.shippingInfo?.email;
  return typeof raw === 'string' && raw.trim() ? raw.trim().toLowerCase() : null;
}

function productIds(order: ShopierApiOrder): string[] {
  return (order.lineItems ?? [])
    .map((item) => (item.productId === undefined ? '' : String(item.productId)))
    .filter(Boolean);
}

function extractProductIdFromUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:product|urun|p)\/(\d{3,})/i) ?? url.match(/(\d{5,})/);
  return match?.[1] ?? null;
}

function resolvePackage(db: DB, ids: string[]): PackageRow | undefined {
  for (const id of ids) {
    const byField = findPackageByShopierProductId(db, id);
    if (byField) return byField;
    const byUrl = listPackages(db, true).find((pkg) => extractProductIdFromUrl(pkg.shopier_url) === id);
    if (byUrl) return byUrl;
  }
  return undefined;
}

function activateForUser(
  db: DB,
  user: UserRow,
  pkg: PackageRow,
  order: ShopierOrderRow,
  amountCents: number,
  currency: string,
): { ok: boolean; message: string } {
  const now = nowIso();
  const existing = db
    .prepare('SELECT id FROM payments WHERE idempotency_key = ? LIMIT 1')
    .get(`shopier:${order.order_id}`) as { id: string } | undefined;
  if (existing) return { ok: true, message: 'Bu sipariş daha önce aktive edilmiş.' };

  const paymentId = randomId('pay');
  db.transaction(() => {
    createPayment(db, {
      id: paymentId,
      user_id: user.id,
      package_id: pkg.id,
      provider: 'shopier',
      provider_transaction_id: order.order_id,
      provider_checkout_id: null,
      amount_cents: amountCents,
      currency: currency || pkg.currency,
      status: 'succeeded',
      idempotency_key: `shopier:${order.order_id}`,
      metadata_json: JSON.stringify({
        source: 'shopier_order_poll',
        orderId: order.order_id,
        buyerEmail: order.email,
      }),
      created_at: now,
      updated_at: now,
    });

    if (pkg.game_key === '*') {
      for (const game of ARCADE_GAME_LIST) {
        const current = findActiveGameLicense(db, user.id, game.key, now);
        const base = current ? Math.max(Date.now(), Date.parse(current.expires_at) || 0) : Date.now();
        createGameLicense(db, {
          id: randomId('lic'),
          userId: user.id,
          gameKey: game.key,
          packageId: pkg.id,
          paymentId,
          startsAt: now,
          expiresAt: isoPlusDays(pkg.duration_days, new Date(base)),
          now,
        });
      }
    } else if (pkg.game_key) {
      const current = findActiveGameLicense(db, user.id, pkg.game_key, now);
      const base = current ? Math.max(Date.now(), Date.parse(current.expires_at) || 0) : Date.now();
      createGameLicense(db, {
        id: randomId('lic'),
        userId: user.id,
        gameKey: pkg.game_key,
        packageId: pkg.id,
        paymentId,
        startsAt: now,
        expiresAt: isoPlusDays(pkg.duration_days, new Date(base)),
        now,
      });
    } else {
      const current = findActiveSubscription(db, user.id, now);
      const base = current ? Math.max(Date.now(), Date.parse(current.expires_at) || 0) : Date.now();
      const subscriptionId = randomId('sub');
      createSubscription(db, {
        id: subscriptionId,
        userId: user.id,
        packageId: pkg.id,
        paymentId,
        startsAt: now,
        expiresAt: isoPlusDays(pkg.duration_days, new Date(base)),
      });
      cancelOtherSubscriptions(db, user.id, subscriptionId, now);
    }
  })();
  return { ok: true, message: 'Shopier ödemesi doğrulandı ve lisans açıldı.' };
}

export async function fetchShopierOrder(pat: string, orderId: string): Promise<ShopierApiOrder | null> {
  if (!pat || !orderId) return null;
  try {
    const response = await fetch(`https://api.shopier.com/v1/orders/${encodeURIComponent(orderId)}`, {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/json',
        'User-Agent': 'RookWorks/1.0',
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return null;
    return (await response.json()) as ShopierApiOrder;
  } catch {
    return null;
  }
}

export function handleShopierOrder(db: DB, apiOrder: ShopierApiOrder): { inserted: boolean; status: string } {
  const orderId = typeof apiOrder.id === 'string' ? apiOrder.id : '';
  if (!orderId) return { inserted: false, status: 'ignored' };
  const email = normalizeEmail(apiOrder);
  const ids = productIds(apiOrder);
  const titles = (apiOrder.lineItems ?? []).map((item) => item.title ?? '').filter(Boolean);
  const amountCents = parseAmountCents(apiOrder.totals?.total) ?? 0;
  const now = nowIso();
  const row: ShopierOrderRow = {
    id: randomId('sord'),
    order_id: orderId,
    email,
    buyer_name: [apiOrder.billingInfo?.firstName, apiOrder.billingInfo?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() || null,
    status: 'received',
    payment_status: apiOrder.paymentStatus ?? null,
    order_status: apiOrder.status ?? null,
    currency: apiOrder.currency ?? null,
    amount_cents: amountCents || null,
    product_ids_json: JSON.stringify(ids),
    product_titles_json: JSON.stringify(titles),
    raw_json: JSON.stringify(apiOrder),
    matched_package_id: null,
    matched_user_id: null,
    activation_message: null,
    received_at: now,
    processed_at: null,
  };
  const inserted = insertShopierOrder(db, row);
  const existing = inserted ? undefined : findShopierOrderByOrderId(db, orderId);
  if (!inserted && existing?.status === 'activated') return { inserted: false, status: 'activated' };
  if (apiOrder.paymentStatus !== 'paid') {
    updateShopierOrder(db, orderId, { status: 'awaiting_payment', activationMessage: 'Ödeme henüz tamamlanmadı.' });
    return { inserted: true, status: 'awaiting_payment' };
  }
  if (!email) {
    updateShopierOrder(db, orderId, { status: 'needs_mapping', activationMessage: 'Sipariş e-postası yok.' });
    return { inserted: true, status: 'needs_mapping' };
  }
  const user = findUserByEmail(db, email);
  const pkg = resolvePackage(db, ids);
  if (!user || !pkg) {
    updateShopierOrder(db, orderId, {
      status: 'needs_mapping',
      matchedPackageId: pkg?.id ?? null,
      matchedUserId: user?.id ?? null,
      activationMessage: !user
        ? 'Bu e-posta ile kayıtlı yayıncı yok.'
        : 'Sipariş ürünü bir pakete eşleşmedi.',
      processedAt: now,
    });
    return { inserted: true, status: 'needs_mapping' };
  }
  try {
    const result = activateForUser(db, user, pkg, row, amountCents || pkg.price_cents, row.currency ?? pkg.currency);
    updateShopierOrder(db, orderId, {
      status: result.ok ? 'activated' : 'failed',
      matchedPackageId: pkg.id,
      matchedUserId: user.id,
      activationMessage: result.message,
      processedAt: nowIso(),
    });
    return { inserted: true, status: result.ok ? 'activated' : 'failed' };
  } catch (error) {
    updateShopierOrder(db, orderId, {
      status: 'failed',
      matchedPackageId: pkg.id,
      matchedUserId: user.id,
      activationMessage: error instanceof Error ? error.message.slice(0, 240) : 'Aktivasyon hatası.',
      processedAt: nowIso(),
    });
    return { inserted: true, status: 'failed' };
  }
}

export async function syncShopierOrders(db: DB, config: AppConfig): Promise<ShopierSyncResult> {
  if (!config.shopierPat) {
    return { fetched: 0, inserted: 0, activated: 0, needsMapping: 0, message: 'SHOPIER_PAT tanımlı değil.' };
  }
  if (syncInFlight) return { fetched: 0, inserted: 0, activated: 0, needsMapping: 0, message: 'Senkronizasyon zaten çalışıyor.' };
  syncInFlight = true;
  try {
    const stored = getAppSetting(db, 'shopier_last_sync');
    const sinceCandidate = stored && Date.parse(stored) > Date.now() - 3_600_000
      ? stored
      : new Date(Date.now() - 3_600_000).toISOString();
    const since = sinceCandidate.replace(/\.\d{3}Z$/, 'Z');
    const response = await fetch(
      `https://api.shopier.com/v1/orders?dateStart=${encodeURIComponent(since)}&limit=50`,
      {
        headers: {
          Authorization: `Bearer ${config.shopierPat}`,
          Accept: 'application/json',
          'User-Agent': 'Rook Works/1.0',
        },
        signal: AbortSignal.timeout(12_000),
      },
    );
    if (!response.ok) {
      return { fetched: 0, inserted: 0, activated: 0, needsMapping: 0, message: `Shopier API HTTP ${response.status}.` };
    }
    const payload = (await response.json()) as unknown;
    const orders = Array.isArray(payload) ? (payload as ShopierApiOrder[]) : [];
    let inserted = 0;
    let activated = 0;
    let needsMapping = 0;
    for (const order of orders) {
      const result = handleShopierOrder(db, order);
      if (result.inserted) inserted += 1;
      if (result.status === 'activated') activated += 1;
      if (result.status === 'needs_mapping') needsMapping += 1;
    }
    lastSyncAt = nowIso();
    setAppSetting(db, 'shopier_last_sync', lastSyncAt, lastSyncAt);
    return { fetched: orders.length, inserted, activated, needsMapping, message: 'Shopier siparişleri kontrol edildi.' };
  } catch (error) {
    return {
      fetched: 0,
      inserted: 0,
      activated: 0,
      needsMapping: 0,
      message: error instanceof Error ? `Shopier API: ${error.message.slice(0, 120)}` : 'Shopier API hatası.',
    };
  } finally {
    syncInFlight = false;
  }
}

export function startShopierOrderSync(db: DB, config: AppConfig): () => void {
  if (!config.shopierPat) return () => {};
  const intervalMs = Math.max(5, config.shopierPollSeconds) * 1000;
  const tick = () => {
    void syncShopierOrders(db, config).catch((error) => {
      console.error('Shopier sipariş senkronizasyonu başarısız:', error instanceof Error ? error.message : error);
    });
  };
  const initial = setTimeout(tick, 2_000);
  const timer = setInterval(tick, intervalMs);
  return () => {
    clearTimeout(initial);
    clearInterval(timer);
  };
}
