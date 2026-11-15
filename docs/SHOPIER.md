# Shopier sipariş otomasyonu

Shopier webhook token’ı bu hesapta alınamadığı için (`POST /v1/webhooks` → 403) 10 saniyelik sipariş kontrolü kullanılıyor.

## Akış

1. `SHOPIER_PAT` sunucuda environment değişkeninden okunur; hiçbir zaman frontend’e veya repoya yazılmaz.
2. Uygulama 10 saniyede bir `GET https://api.shopier.com/v1/orders` çağırır.
3. Yeni sipariş `shopier_orders` tablosuna yazılır.
4. Ödeme `paid` ise:
   - siparişteki ürün ID’si bir paketin **Shopier ürün ID** alanıyla eşleşmeli,
   - alıcı e-postası kayıtlı bir yayıncıya ait olmalı.
5. Eşleşme varsa ödeme kaydı + abonelik/oyun lisansı otomatik oluşturulur.
6. Eşleşme yoksa sipariş `needs_mapping` olarak admin ekranında görünür; manuel lisans verilebilir.

## Ürün ID’si tanımlama

Admin → Paketler ve fiyatlar → ilgili paket → **Shopier ürün ID**.

Örnek: Shopier ürün linki `https://shopier.com/.../48260043` ise ürün ID `48260043`.

## Ortam değişkenleri

```env
SHOPIER_PAT=...
SHOPIER_POLL_SECONDS=10
```

`SHOPIER_POLL_SECONDS` en az 5’tir. 10 saniye, dakikada 6 istek demektir; Shopier rate limitine takılmamak için daha da düşürme.

## Webhook alternatifi

Shopier dokümanına göre webhook token’ı yalnızca `POST /v1/webhooks` oluşturma yanıtında bir kez döner. Mevcut PAT bu uçta 403 verdiği için polling kullanılıyor. Webhook açılırsa aynı `shopier_orders` akışına bağlanabilir; o zaman 10 saniyelik gecikme olmaz.
