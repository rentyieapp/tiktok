# Rook Works — SEO ve AI Arama Denetimi

Tarih: 2026-11-16  
Araç: [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) v2.6.2 (MIT), `scripts/agentic_check.py` ve `scripts/page_checks.py`

## Önce

- `server-rendered`: **FAIL** — ilk HTML 6 kelime; JavaScript çalıştırmayan AI/arama botları içerik göremiyordu.
- `llms.txt`: **FAIL** — SPA catch-all nedeniyle HTML dönüyordu.
- `http-404`: **FAIL** — bilinmeyen URL'ler 200 dönüyordu.
- `ai-catalog.json`: **FAIL** — gerçek dosya yoktu.
- `robots.txt`: AI botları için özel grup yoktu.
- Canonical/OG/Twitter/JSON-LD yoktu.
- Sitemap yoktu.

## Sonra

- `/robots.txt`: AI arama botları için açık gruplar ve sitemap.
- `/llms.txt` + `/llms-full.txt`: 33 oyun, temel sayfalar, fiyatlandırma, AI kullanım notu.
- `/sitemap.xml`: 41 genel URL (8 pazarlama + 33 oyun).
- `/.well-known/ai-catalog.json`: ARD kataloğu.
- `/` ve sosyal meta: canonical, OG, Twitter, robots, JSON-LD (`Organization`, `WebSite`, `SoftwareApplication`).
- `seo-home.html`: botlara sunulan, JavaScript'siz okunabilir HTML.
- `index.html` içinde ilk HTML fallback içeriği; React açılışta değiştiriyor.
- Bilinmeyen URL'ler gerçek **404**; geçerli SPA rotaları korunuyor.

## Claude SEO son denetimi

```text
P0: 3 pass / 0 fail
P1: 3 pass / 0 fail
P2: 1 info / 4 n/a
P3: 1 warn (ARD text/html type)
```

`page_checks.py`:
- Başlık 35 karakter, meta açıklama 154 karakter
- Tek H1, canonical, 1 JSON-LD bloğu
- 212 kelime sunucu HTML'i
- Tek yüksek uyarı: canonical `https://rookworks.tr/` iken test URL'si geçici `sslip.io`; domain yayına geçince kalkacak.

## Kalanlar

- `rookworks.tr` delegasyonu yayılınca canonical/OG/sitemap adresleriyle aynı domainde doğrula.
- ARD `text/html` tipi P3 uyarısı; ARD ajan kaynakları için tasarlandığından pazarlama sayfalarını temsil etmek için özel medya tipi kullanılabilir veya katalog kaldırılabilir.
- WebMCP/agentic browsing için form tabanlı araç kaydı henüz yok; öncelik değil.
- Google Search Console/IndexNow gönderimi için hesap anahtarı gerekli.
