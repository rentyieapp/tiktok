import type { DB } from '../db/index.js';
import type { AppConfig } from '../config.js';
import { findPackageById, setPackageShopierProductId } from '../db/repo.js';

export interface ShopierProductCreateResult {
  productId: string;
  productUrl: string | null;
}

export class ShopierProductError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ShopierProductError';
  }
}

/**
 * Shopier ürün oluşturma ucu. Bu çağrı PAT ile yapılır; token istemciye
 * gönderilmez. Shopier ürün okuma/güncelleme uçları ayrı izinlere tabidir.
 */
export async function createShopierProduct(
  config: AppConfig,
  input: { title: string; description: string; priceCents: number; currency: string; imageUrl: string },
): Promise<ShopierProductCreateResult> {
  if (!config.shopierPat) throw new ShopierProductError('SHOPIER_PAT tanımlı değil.', 503);
  const price = (Math.max(0, input.priceCents) / 100).toFixed(2);
  const payload = {
    title: input.title.slice(0, 120),
    description: input.description.slice(0, 1000) || input.title,
    type: 'digital',
    media: [{ type: 'image', url: input.imageUrl, placement: 1 }],
    priceData: { currency: input.currency.toUpperCase(), price },
    stockQuantity: 9999,
    shippingPayer: 'sellerPays',
  };
  const response = await fetch('https://api.shopier.com/v1/products', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.shopierPat}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'RookWorks/1.0',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await response.json().catch(() => ({}))) as {
    id?: string | number;
    url?: string;
    error?: string;
    message?: string;
  };
  if (!response.ok || data.id === undefined) {
    throw new ShopierProductError(
      data.message || data.error || `Shopier ürün oluşturma başarısız (HTTP ${response.status}).`,
      response.status,
    );
  }
  return { productId: String(data.id), productUrl: data.url ?? null };
}

export async function createAndMapShopierProduct(
  db: DB,
  config: AppConfig,
  packageId: string,
): Promise<{ packageId: string; productId: string; productUrl: string | null }> {
  const pkg = findPackageById(db, packageId);
  if (!pkg || pkg.is_active !== 1) throw new ShopierProductError('Aktif paket bulunamadı.', 404);
  const created = await createShopierProduct(config, {
    title: pkg.name,
    description: pkg.description || pkg.tagline,
    priceCents: pkg.price_cents,
    currency: pkg.currency,
    imageUrl: `${config.appUrl}/rook-profile.png`,
  });
  setPackageShopierProductId(db, pkg.id, created.productId);
  return { packageId: pkg.id, ...created };
}
