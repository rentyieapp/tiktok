import type { AppConfig } from '../config.js';

export interface ShopierCatalogProduct {
  id: string;
  title: string;
  url: string;
  price: string | null;
}

export interface ShopierCatalogResult {
  products: ShopierCatalogProduct[];
  source: 'api' | 'storefront';
  message: string;
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
}

async function shopSlug(config: AppConfig): Promise<string | null> {
  if (!config.shopierPat) return null;
  try {
    const response = await fetch('https://api.shopier.com/v1/shop/settings', {
      headers: {
        Authorization: `Bearer ${config.shopierPat}`,
        Accept: 'application/json',
        'User-Agent': 'RookWorks/1.0',
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { url?: string };
    const match = data.url?.match(/shopier\.com\/([^/?#]+)/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function parseStorefront(html: string): ShopierCatalogProduct[] {
  const products = new Map<string, ShopierCatalogProduct>();
  const pattern = /href="https:\/\/www\.shopier\.com\/([^"/]+)\/(\d+)"[\s\S]{0,5000}?<h3[^>]*>(.*?)<\/h3>/gi;
  for (const match of html.matchAll(pattern)) {
    const id = match[2]!;
    const title = match[3]!.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!title) continue;
    products.set(id, {
      id,
      title,
      url: `https://www.shopier.com/${match[1]}/${id}`,
      price: null,
    });
  }
  return [...products.values()];
}

/**
 * Ürün listesi için önce resmi API denenir. Shopier bu hesapta GET /products
 * için 403 döndürdüğünde, herkese açık mağaza vitrinindeki ürün kartları
 * okunur. Bu bir endpoint uydurması değildir; aynı ürün vitrininin HTML'idir.
 */
export async function listShopierProducts(config: AppConfig): Promise<ShopierCatalogResult> {
  if (!config.shopierPat) {
    return { products: [], source: 'storefront', message: 'SHOPIER_PAT tanımlı değil.' };
  }
  try {
    const response = await fetch('https://api.shopier.com/v1/products?limit=100', {
      headers: {
        Authorization: `Bearer ${config.shopierPat}`,
        Accept: 'application/json',
        'User-Agent': 'RookWorks/1.0',
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (response.ok) {
      const payload = (await response.json()) as Array<Record<string, unknown>>;
      return {
        products: payload.map((product) => ({
          id: String(product.id ?? ''),
          title: typeof product.title === 'string' ? product.title : '',
          url: typeof product.url === 'string' ? product.url : '',
          price: typeof product.priceData === 'object' && product.priceData && 'price' in product.priceData
            ? String((product.priceData as { price?: unknown }).price ?? '')
            : null,
        })).filter((product) => product.id),
        source: 'api',
        message: 'Shopier ürün API’si okundu.',
      };
    }
  } catch {
    /* vitrin fallback */
  }
  const slug = await shopSlug(config);
  if (!slug) return { products: [], source: 'storefront', message: 'Shopier mağaza adresi alınamadı.' };
  try {
    const response = await fetch(`https://www.shopier.com/${encodeURIComponent(slug)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RookWorks/1.0)' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return { products: [], source: 'storefront', message: 'Shopier vitrini okunamadı.' };
    const products = parseStorefront(await response.text());
    return {
      products,
      source: 'storefront',
      message: products.length > 0
        ? `Shopier ürün API’si 403 verdi; vitrinden ${products.length} ürün okundu.`
        : 'Shopier vitrininde ürün bulunamadı.',
    };
  } catch {
    return { products: [], source: 'storefront', message: 'Shopier vitrini okunamadı.' };
  }
}

export function matchPackagesToProducts(
  packages: Array<{ id: string; name: string; shopier_product_id: string | null }>,
  products: ShopierCatalogProduct[],
): Array<{ packageId: string; productId: string; title: string }> {
  const byTitle = new Map(products.map((product) => [normalize(product.title), product]));
  return packages
    .filter((pkg) => !pkg.shopier_product_id)
    .flatMap((pkg) => {
      const product = byTitle.get(normalize(pkg.name));
      return product ? [{ packageId: pkg.id, productId: product.id, title: product.title }] : [];
    });
}
