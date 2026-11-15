# Kabul Kriterleri ve Faz Raporu

Tarih: 2026-11-14 · Sürüm: MVP 1.0

Bu belge, proje brief'indeki 17 kabul senaryosunu ve 12 fazın durumunu özetler.
Tüm otomatik testler `npm test` ile çalışır; son sonuç **88/88 geçti**.

## Faz durumu

| Faz | Kapsam | Durum | Kanıt |
| --- | --- | --- | --- |
| 1 | Kullanıcı kayıt, giriş, oturum, SQLite migration ve tenant veri katmanı | ✅ Tamam | `auth-payment.test.ts`, `security-settings.test.ts` |
| 2 | Paketler, test/Stripe ödeme adapter'ı, imzalı webhook, idempotency, abonelik kapısı | ✅ Tamam | `auth-payment.test.ts` |
| 3 | Mobil uyumlu yayıncı paneli (genel bakış, yayın, istatistik, geçmiş, ödeme, hesap) | ✅ Tamam | Panel ekran görüntüleri, `ui-*` taramaları |
| 4 | Oyun oluşturma sihirbazı, 2/4/8 takım, takım/renk/arma/komut özelleştirme | ✅ Tamam | `game-config.test.ts`, sihirbaz görselleri |
| 5 | 5 dilli komut motoru, normalizasyon, çakışma, spam/rate limit, tek takım kuralı | ✅ Tamam | `commands-engine.test.ts`, `live-flow.test.ts` |
| 6 | Kalıcı, tahmin edilemez `/live/:slug`, link aç/kapat, OBS sahnesi | ✅ Tamam | `game-config.test.ts`, OBS görseli |
| 7 | Yayıncı bazlı istatistikler, maç geçmişi, sürüm yönetimi | ✅ Tamam | `live-flow.test.ts`, panel |
| 8 | 3D oyun motoru, OBS Browser Source, canlı event webhook'u, test stüdyosu | ✅ Tamam | WebSocket testleri, 4/8 takım görselleri |
| 10 | Açık temalı 30 oyunlu platform, oyun sayfaları, canlı demo odaları, uyarılar | ✅ Tamam | `arcade.test.ts`, 30 oyun sahnesi |
| 11 | Yayıncıya özel arcade odaları, lisans kapısı, Twitch/YouTube/TikTok bağlantıları | ✅ Tamam | `arcade-rooms.test.ts`, oda/bağlantı ekranları |
| 12 | Oyun bazlı 1/30 günlük lisans, mağaza, lisans kapısı ve oda özelleştirme | ✅ Tamam | `arcade-rooms.test.ts`, mağaza/panel ekranları |
| 13 | Tüm Oyunlar günlük/aylık/yıllık bundle ve 30 oyun lisansı | ✅ Tamam | `arcade-rooms.test.ts` |
| 14 | Kurulum rehberi, public liderlik, katalog arama/favoriler | ✅ Tamam | Tarayıcı görsel kontrolü, `/api/leaderboard` |
| 15 | Günde 30 dk ücretsiz deneme, overlay/TTS, ortak yayıncı | ✅ Tamam | `arcade-rooms.test.ts` |
| 16 | PWA kurulum, kupon, WhatsApp destek, moderasyon/avatar | ✅ Tamam | `arcade-rooms.test.ts`, tarayıcı |
| 17 | Bilgi Arenası 24 hazır soru + yayıncı soru editörü + karıştırma | ✅ Tamam | `arcade.test.ts`, `arcade-rooms.test.ts` |
| 18 | Arcade 5 dil, özel katılım/ayrılma/takım komutları ve OBS HUD çevirisi | ✅ Tamam | `arcade-rooms.test.ts`, oyun paneli |
| 19 | Tüm arayüz için TR/EN dil değiştirici ve İngilizce vitrin/panel | ✅ Tamam | Tarayıcı görsel kontrolü |

Her faz sonunda tip kontrolü, testler ve tarayıcı görsel kontrolü yapıldı. Mevcut
özellikler sonraki fazlarda bozulmadı; test paketi bunu doğrular.

## 17 kabul senaryosu + Faz 9 + Faz 10

| # | Senaryo | Durum | Nasıl doğrulandı |
| --- | --- | --- | --- |
| 1 | Yeni kullanıcı kayıt olabilmeli | ✅ | `auth-payment.test.ts` → kayıt 201, `/api/auth/me` 200; tarayıcı kayıt akışı |
| 2 | Test ortamında ödeme yapılabilmeli | ✅ | Checkout → test checkout sayfası → sunucu tarafı simüle edilmiş imzalı webhook |
| 3 | Ödeme onaylanınca panel erişimi açılmalı | ✅ | `hasPanelAccess=true`, `GET /api/game` 200 |
| 4 | Ödeme yapılmadan ücretli özelliklere erişilememeli | ✅ | `GET /api/game` ve oyun oluşturma 402 |
| 5 | Yayıncı oyun oluşturabilmeli | ✅ | POST `/api/game` 201; sihirbaz UI testi `/panel/yayin`'e yönlendirdi |
| 6 | 2, 4 ve 8 takım seçebilmeli | ✅ | Starter 2, Pro 4, Legend 8; paket limitleri 403 ile korunuyor |
| 7 | Takımların adını ve renklerini değiştirebilmeli | ✅ | PUT `/api/game`; UI'da modal + kaydet + yenileme sonrası kalıcılık |
| 8 | Takım komutlarını özelleştirebilmeli | ✅ | Takım komutu güncellendi; bootstrap ve OBS yansıması doğrulandı |
| 9 | Dil değiştiğinde sistem komutları doğru dile dönüşmeli | ✅ | 5 dilde JOIN; EN'de `join`, TR'de `gir`; public bootstrap kontrolü |
| 10 | Komut çakışmaları engellenmeli | ✅ | Sistem/takım, takım/takım ve normalize edilmiş çakışmalar 400 |
| 11 | Önizleme çalışmalı | ✅ | `/panel/onizleme` istemci simülasyonu; test modu; ekran görüntüsü |
| 12 | Yayıncıya özel oyun URL'si oluşturulmalı | ✅ | `publicSlug` üretildi; `/live/:slug` bootstrap 200 |
| 13 | Ayarlar değiştiğinde URL değişmemeli | ✅ | Takım/ayar/dil değişimlerinden sonra slug aynı |
| 14 | Yayıncı başka bir yayıncının verilerine erişememeli | ✅ | İki yayıncı; B kendi oyununu görüyor, A'nın verisi değişmiyor; IDOR testleri |
| 15 | İstatistikler yayıncı bazında ayrı hesaplanmalı | ✅ | A'da 1 maç, B'de 0; geçmiş B'de boş |
| 16 | OBS Browser Source ekranı doğru görüntülenmeli | ✅ | 1080×1920 Chrome ekran görüntüsü; panel öğeleri yok; 4 ve 8 takım |
| 17 | Test oyununda oyuncu katılımı ve maç sonuçları çalışmalı | ✅ | WebSocket katılım, takım değişimi, durdurma, kazanan, istatistik ve geçmiş |

## Faz 9 ek doğrulamaları

- Admin olmayan kullanıcı `/api/admin/*` uçlarında 403 alır.
- Admin fiyat/süre güncellemesi vitrine ve yeni checkout tutarına yansır.
- Sunucu yeniden başlasa da seed verisi admin fiyatını ezmez.
- Oyun kataloğunda tek canlı motor kuralı ve gizli/yayında filtreleri çalışır.
- Manuel lisans, Shopier satışı için anında panel erişimi açar.
- Shopier mağaza ayarı yalnızca admin tarafından yazılabilir.

## Faz 11 ek doğrulamaları

- Lisanssız yayıncı oda açamaz (403); lisans bitince public oda `licensed=false`.
- Başka yayıncı odayı güncelleyemez/bağlantı kuramaz (403).
- Oda duraklatılınca WebSocket istemcileri kapatılır ve public erişim kapanır.
- TikTok connector token’ı olmadan webhook 404; yalnızca geçerli token olay kabul eder.
- Twitch IRC anonim bağlantısı ve mesaj parser’ı; YouTube Super Chat eşlemesi test edildi.
- İlk platform olayı odayı başlatır; olay oyuna işlenir.

## Güvenlik doğrulamaları

- Ödeme webhook imzası yanlışsa 400; ödeme beklemede kalıyor.
- Aynı webhook iki kez gönderildiğinde ikinci yanıt `duplicate=true`; tek abonelik.
- Tutar uyuşmazlığında `AMOUNT_MISMATCH`; abonelik oluşmuyor.
- Başka kullanıcının ödeme kaydına erişim 404.
- Süresi dolan abonelik paneli 402'ye kilitliyor.
- Şifre hash'i `scrypt$...`; çerez `HttpOnly; SameSite=Lax`.
- Yabancı Origin ile mutasyon 403.
- Sunucu aralık dışı ayarları reddediyor; maç sırasında değişiklik sonraki tura erteleniyor.
- Canlı event imzası yanlışsa 401; aynı event ID tek kez uygulanıyor.
- Üretim modunda doğrudan WebSocket komutları `COMMAND_DISABLED` ile reddediliyor.

## Bilinen sınırlar (MVP)

- 3D yayıncı stüdyosunda yayıncı başına tek oyun; arcade için her oyun ayrı oda.
- TikTok doğrudan resmî API ile bağlanmaz; TikFinity/TikTools connector webhook’u gerekir.
- Oyun bazlı lisanslar 1/30 gün; 3D Taraftar stüdyosu ayrı paketlerle satılır.
- Arcade demo odaları 7 botla açılır; gerçek izleyici aynı odaya katılır.
- Twitch anonim IRC, YouTube Data API ve TikTok connector adaptörleri eklendi.
- YouTube canlı testi için `YOUTUBE_API_KEY`; TikTok için TikFinity/TikTools köprüsü gerekir.
- Stripe adapter'ı kodlanmış ancak canlı Stripe hesabıyla uçtan uca test edilmedi.
- E-posta doğrulama, şifre sıfırlama, 2FA ve iade akışı yok.
- 3D varlıklar prosedürel; GLTF model yükleme yok.
- Arcade sahneleri Three.js 3D; WebGL yoksa Canvas 2D yedek sahne kullanılır.
- 3D varlıklar prosedürel low-poly; GLTF/modelleme pipeline'ı yok.
- Shopier otomatik webhook’u henüz bağlı değil; manuel lisans akışı aktiftir.
- SQLite tek düğüm; yatay ölçekleme için PostgreSQL önerilir.
- Aynı anda binlerce yayıncı için Redis/kuyruk tabanlı altyapı gerekir; veri modeli
  ve tenant sorguları buna uygun ayrılmıştır.
