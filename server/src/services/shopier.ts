export interface ShopierApiStatus {
  configured: boolean;
  connected: boolean;
  orderCount: number;
  message: string;
}

/**
 * Shopier PAT yalnızca sunucuda kullanılır. Bu fonksiyon yalnızca bağlantı
 * durumunu döndürür; token veya sipariş kişisel verisi istemciye gitmez.
 */
export async function getShopierApiStatus(pat: string): Promise<ShopierApiStatus> {
  if (!pat) {
    return {
      configured: false,
      connected: false,
      orderCount: 0,
      message: 'SHOPIER_PAT tanımlı değil.',
    };
  }
  const dateStart = new Date(Date.now() - 30 * 86_400_000)
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z');
  try {
    const response = await fetch(
      `https://api.shopier.com/v1/orders?dateStart=${encodeURIComponent(dateStart)}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: 'application/json',
          'User-Agent': 'Rook Works/1.0',
        },
        signal: AbortSignal.timeout(12_000),
      },
    );
    if (!response.ok) {
      return {
        configured: true,
        connected: false,
        orderCount: 0,
        message:
          response.status === 401 || response.status === 403
            ? 'Shopier anahtarı reddedildi veya sipariş okuma izni yok.'
            : `Shopier API yanıtı: HTTP ${response.status}.`,
      };
    }
    const payload = (await response.json()) as unknown;
    const orders = Array.isArray(payload) ? payload : [];
    return {
      configured: true,
      connected: true,
      orderCount: orders.length,
      message: 'Shopier sipariş API bağlantısı aktif.',
    };
  } catch {
    return {
      configured: true,
      connected: false,
      orderCount: 0,
      message: 'Shopier API’ye ulaşılamadı.',
    };
  }
}
