# Meydan — Oyun Platformu

Çok kiracılı (multi-tenant) bir canlı yayın oyun platformu. Yayıncılar kendi hesapları,
takımları, komutları ve kalıcı OBS bağlantılarıyla çalışır; izleyiciler yorum, beğeni ve
hediyelerle oyuna katılır.

Platformda **25 oynanabilir 3D tarayıcı oyunu** vardır: Sahne 90, Profil Matbaası, Halka,
Bilgi Arenası, Harf Şehir, Arena Ustaları, Çubuk Hayatta Kalma, Piksel Yarış, Çarkıfelek, Halat Çekme, Kızlar vs Erkekler, At Yarışı, Horon & Halay, Sıra Gecesi, Noche Latina, Live Concert, Ramwong Fair,
Tepe Fırlaması, Grand Prix, İzleyici Kasabası, Karpuz Patlatma, Altın Mıknatısı,
Animal Run, Team Clash ve Kalabalık Koşusu. Her oyun
Three.js ile ışıklı, gölgeli ve animasyonlu bir sahne kullanır; WebGL yoksa 2D yedek sahne
devreye girer. Mevcut 3D Taraftar Savaşı motoru yayıncı stüdyosunda korunur.

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS
- **Oyun motoru:** Three.js / WebGL, 9:16 dikey, izometrik 3D savaş alanı
- **Backend:** Node.js 22, TypeScript, Fastify 5, WebSocket
- **Veritabanı:** SQLite (better-sqlite3), migration + foreign key + index yapıları
- **Ödeme:** Değiştirilebilir adapter (test sağlayıcısı + Stripe adapter'ı)
- **Canlı yayın:** İmzalı webhook adapter'ı (YouTube/TikTok/Twitch adaptörleri için arayüz)

> Bu depo çalışan bir MVP'dir. Gerçek ödeme ve gerçek canlı yayın sağlayıcıları için
> environment değişkenleri ve adaptör bağlantıları hazır bırakılmıştır; test ortamında
> ödeme ve sohbet akışı uçtan uca simüle edilir.

---

## 1. Hızlı başlangıç

Gereksinim: **Node.js 22+** ve npm.

```bash
npm install
cp .env.example .env      # değerleri düzenle
npm run seed:demo         # örnek yayıncı + oyun verisi (opsiyonel)
npm run dev               # API :8787, web :5173
```

Aç: **http://localhost:5173**

Demo hesapları:

| Rol | E-posta | Şifre |
| --- | --- | --- |
| Yayıncı | `yayinci@demo.com` | `Demo1234` |
| Süper admin | `admin@demo.com` | `Admin1234` |

Admin paneline girişten sonra otomatik yönlendirilirsin: **http://localhost:5173/admin**

`.env` içinde `SEED_DEMO=true` yaparsan sunucu ilk açılışta demo verisini kendisi
oluşturur. Demo verisi idempotenttir; ikinci kez çalıştırmak yeni kayıt üretmez.

> **Not:** `.env` dosyası `.gitignore` içindedir; örnek değerler `.env.example`'dadır.
> Üretimde `SESSION_SECRET`, `LIVE_WEBHOOK_SECRET`, ödeme anahtarları ve
> `APP_URL`/`WEB_ORIGIN` mutlaka gerçek değerlerle değiştirilmelidir.

### Faydalı komutlar

```bash
npm run dev          # sunucu + Vite birlikte
npm run dev:server   # yalnız Fastify + WebSocket (:8787)
npm run dev:web      # yalnız Vite (:5173, /api ve /ws proxy)
npm run seed:demo    # demo yayıncı/oyun/geçmiş verisi
npm test             # 87 entegrasyon + birim testi
npm run typecheck    # tüm TS projesi
npm run build        # web production build (web/dist)
npm start            # web/dist varsa :8787 üzerinden uygulamayı servis eder
```

Üretimde (`NODE_ENV=production`) `SESSION_SECRET` en az 32 karakter ve
`LIVE_WEBHOOK_SECRET` zorunludur. Test ödeme sağlayıcısı üretimde otomatik devre dışıdır.

---

## 2. Ekran görüntüleri

| Platform ana sayfası | Oyun kataloğu |
| --- | --- |
| ![Platform ana sayfası](docs/screenshots/platform-home.png) | ![Oyun kataloğu](docs/screenshots/platform-games.png) |

| Yirmi dört oyunun 3D sahneleri |
| --- |
| ![Arcade sahneleri](docs/screenshots/arcade-stages.png) |

| Oynanabilir oyun sayfası | Oyun mağazası |
| --- | --- |
| ![Bilgi Arenası oyun sayfası](docs/screenshots/arcade-game-page.png) | ![Oyun mağazası](docs/screenshots/pricing.png) |

| Açık tema giriş | Uyarılar ve kullanım koşulları |
| --- | --- |
| ![Giriş ekranı](docs/screenshots/auth-light.png) | ![Uyarılar](docs/screenshots/warnings.png) |

| Kurulum rehberi | Topluluk liderlik tablosu |
| --- | --- |
| ![Kurulum rehberi](docs/screenshots/setup-guide.png) | ![Liderlik](docs/screenshots/leaderboard.png) |

| Uygulama olarak yükle (PWA) | OBS overlay + TTS |
| --- | --- |
| ![Uygulama](docs/screenshots/app-install.png) | ![OBS overlay](docs/screenshots/room-obs.png) |

| Bilgi Arenası soru editörü | Ana sayfa kategorileri |
| --- | --- |
| ![Soru editörü](docs/screenshots/quiz-editor.png) | ![Kategoriler](docs/screenshots/categories.png) |

| Arcade dil ve komut ayarları | English ana sayfa |
| --- | --- |
| ![Dil ve komutlar](docs/screenshots/panel-language.png) | ![English ana sayfa](docs/screenshots/home-en.png) |

| English yayıncı paneli |
| --- |
| ![English panel](docs/screenshots/panel-en.png) |

| Yayıncı oyun portföyü | Oyun bazlı panel |
| --- | --- |
| ![Oyun portföyü](docs/screenshots/portfolio.png) | ![Sahne 90 paneli](docs/screenshots/panel-game.png) |

| Taraftar Savaşı 3D paneli |
| --- |
| ![3D panel](docs/screenshots/panel-3d.png) |

| OBS canlı ekranı (3D motor) | 8 takımlı arena |
| --- | --- |
| ![OBS canlı ekranı](docs/screenshots/obs-live.png) | ![8 takımlı arena](docs/screenshots/8-teams.png) |

| Yayıncı oyun odaları | Platform bağlantıları |
| --- | --- |
| ![Oyun odaları](docs/screenshots/panel-arcade.png) | ![Platform bağlantıları](docs/screenshots/panel-connections.png) |

| Yayıncıya özel canlı oda | OBS görünümü |
| --- | --- |
| ![Canlı oda](docs/screenshots/room-live.png) | ![OBS](docs/screenshots/room-obs.png) |

| Lisanssız oyun önizlemesi | Süper admin — oyun kataloğu |
| --- | --- |
| ![Lisanssız oyun önizlemesi](docs/screenshots/locked-game.png) | ![Admin oyun kataloğu](docs/screenshots/admin-games.png) |

| Süper admin — paketler |
| --- |
| ![Admin paket yönetimi](docs/screenshots/admin-packages.png) |

---

## 3. Mimari

```
.
├── shared/                 # Sunucu ve istemcinin ortak kullandığı domain katmanı
│   ├── types.ts            # Tüm DTO'lar, battle state tipleri
│   ├── languages.ts        # 5 dilde sistem komutları + arayüz metinleri
│   ├── commands.ts         # Normalizasyon, parse, çakışma doğrulaması
│   ├── battle.ts           # Otoriter savaş simülasyonu (sunucu + preview)
│   ├── arcade.ts           # 25 oyun tanımı + ortak canlı oda simülasyonu
│   └── defaults.ts         # Varsayılan ayarlar, hazır takım paleti, slug
├── server/
│   └── src/
│       ├── app.ts          # Fastify, plugin'ler, güvenlik başlıkları, hata yönetimi
│       ├── config.ts       # Environment doğrulama
│       ├── db/             # Migration, seed, tipli repository
│       ├── services/       # Hesap/abonelik, ödeme, istatistik
│       ├── payments/       # PaymentProvider arayüzü + test/Stripe adapter
│       ├── live/           # LiveEventProvider (imzalı webhook)
│       ├── game/           # 3D savaş servisi, runtime, mapper'lar
│       ├── arcade/         # 25 oyun runtime'ı + yayıncı odaları/servisi
│       ├── platforms/      # Twitch IRC, YouTube Data API, TikTok connector hub'ı
│       └── routes/         # auth, billing, game, arcade, live, upload, websocket
├── web/
│   ├── src/pages/          # Marketing, arcade, auth, ödeme, panel, canlı yayın
│   ├── src/game/           # Taraftar Savaşı Three.js renderer + OBS overlay
│   ├── src/arcade/         # 25 oyunun Three.js sahne renderer'ı
│   ├── src/components/     # Arcade3DStage, 2D fallback, GameArt, panel layout
├── tests/                  # API + WebSocket + motor + admin + arcade + platform testleri (87)
└── scripts/seed-demo.ts
```

### Katman sınırları

1. **Sunucu** tüm oyun sonucunu hesaplar. İstemci yalnızca `BattleStateView` alır.
2. **Komut motoru** yalnızca metni işleme çevirir; işlem kimlikleri (`JOIN_TEAM` vb.)
   dilden bağımsızdır.
3. **Ödeme sağlayıcısı** `PaymentProvider` arayüzünü uygular. Yeni sağlayıcı eklemek
   için adapter yazıp registry'ye eklemek yeterlidir.
4. **Canlı yayın sağlayıcısı** `LiveEventProvider` arayüzünü uygular; MVP'de imzalı
   webhook adaptörü vardır. YouTube/TikTok API'leri bu arayüzün arkasına bağlanır.
5. **Oyun motoru** Three.js çizim katmanıdır; oyun mantığıyla ilgili karar vermez.

---

## 4. Kiracı (tenant) modeli

- Her yayıncı bir `users` kaydıdır.
- Her yayıncının **tek oyunu** vardır (`games.user_id UNIQUE`). MVP bilinçli olarak
  tek oyunla sınırlıdır; şema çoklu oyun için `UNIQUE` kaldırılarak genişletilebilir.
- Oyun sahipliği her sorguda `user_id`/`game_id` üzerinden doğrulanır.
- Yayıncı A, B'nin takımlarını, oyuncularını, maçlarını veya istatistiklerini göremez.
  Bu, `tests/game-config.test.ts` ve `tests/live-flow.test.ts` içinde test edilir.
- Canlı yayın sayfası (`/live/:slug`) doğası gereği herkese açıktır; tahmin edilemez
  slug (10 karakter rastgele token) erişim kontrolüdür. Yayıncı bağlantıyı kapatabilir.

Temel tablolar: `users`, `packages`, `payments`, `webhook_events`, `subscriptions`,
`games`, `teams`, `game_config_versions`, `game_sessions`, `players`,
`session_participants`, `game_events`.

Öne çıkan kısıtlar:

- `users.email UNIQUE`, `games.public_slug UNIQUE`, `games.user_id UNIQUE`
- `teams UNIQUE(game_id, slot)`, `teams UNIQUE(game_id, join_command_norm)`
- `game_events UNIQUE(game_id, external_event_id)` → event deduplication
- `webhook_events UNIQUE(provider, event_id)` → ödeme webhook idempotency
- `players UNIQUE(game_id, external_player_id)`
- Tüm ilişkilerde foreign key + `ON DELETE` kuralları, sorgu index'leri

---

## 5. Kullanıcı ve ödeme akışı

```
Paket seç → kayıt/giriş → checkout (pending payment)
   → sağlayıcı sayfası (test)
   → imzalı webhook (sunucu doğrular)
   → payment: pending → succeeded (idempotent)
   → subscription: active
   → panel erişimi açılır
```

### Önemli güvenlik kararları

- Tutar **her zaman sunucuda** paketten okunur; istemciden gelen tutar kullanılmaz.
- Webhook imzası ham gövde üzerinden HMAC ile doğrulanır.
- `webhook_events` tablosu aynı event ID'yi ikinci kez işlemez.
- Ödeme durumu yalnızca `pending → succeeded` geçişi ile ilerler; çift aktivasyon olmaz.
- Tutar/para birimi uyuşmazlığında aktivasyon yapılmaz.
- Başarısız ve bekleyen ödemeler ayrı durumlarda tutulur.
- Test ödeme "öde" düğmesi hesabı doğrudan açmaz; sunucu sağlayıcıyı taklit ederek
  **imzalı bir webhook** üretir ve gerçek webhook işleyicisine gönderir.
- API anahtarları yalnızca sunucudadır; frontend'e gönderilmez.

Test sağlayıcısı çalışma prensibi:

```text
POST /api/billing/checkout
  → payments(status=pending)
  → /odeme/test/:paymentId

POST /api/test-payments/:paymentId/pay {outcome:"success"}
  → test sağlayıcı imzalı event üretir
  → POST /api/webhooks/payments/test (app.inject)
  → imza + event ID + tutar kontrolü
  → payment succeeded + subscription active
```

Gerçek ödeme için `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET` ayarlanır. Stripe webhook uç noktası:
`POST /api/webhooks/payments/stripe`.

---

## 6. Yayıncı paneli

| Bölüm | Rota | İçerik |
| --- | --- | --- |
| Genel bakış | `/panel` | Durum, kalıcı link, hazırlık, son maçlar, KPI'lar |
| Oyunum | `/panel/oyun` | 4 adımlı oluşturma/düzenleme sihirbazı |
| Takım yönetimi | `/panel/takimlar` | İsim, renk, arma, sembol, asker/kale, komut |
| Oyun ayarları | `/panel/ayarlar` | Tur, ordu, kale, etkileşimler, sürüm geçmişi |
| Dil ve komutlar | `/panel/komutlar` | 5 dil, sistem komutları, takım komutları, çakışma |
| Yayın bağlantım | `/panel/yayin` | Link, OBS talimatı, aç/kapat, test stüdyosu |
| Oyun önizlemesi | `/panel/onizleme` | 9:16 test sahnesi, destek simülasyonu |
| İstatistikler | `/panel/istatistikler` | Takım/oyuncu/skor/maç metrikleri |
| Oyun geçmişi | `/panel/gecmis` | Tamamlanan turlar ve kazananlar |
| Genel bakış | `/panel` | Tüm oyunların portföy dashboard’u |
| Oyun paneli | `/panel/oyun/:gameKey` | Her arcade oyunu için ayrı oda/OBS/ayar paneli |
| 3D oyun paneli | `/panel/3d` | Taraftar Savaşı 3D stüdyosu |
| Paketim ve ödemeler | `/panel/odeme` | Abonelik, paket yükseltme, ödeme geçmişi |
| Hesap ayarları | `/panel/hesap` | Profil, şifre, oturum, abonelik özeti |

Panel mobil uyumludur; 390 px genişlikte yatay taşma yapmadığı doğrulanmıştır.

### Oyun oluşturma sihirbazı

1. **Oyun adı + dil** — 5 dil, örnek isimler.
2. **Takım sayısı** — 2 / 4 / 8; paket limiti aşılırsa kilitli.
3. **Takımlar** — her takım için ad, ana/ikincil renk, arma yükleme/URL, sembol,
   asker görünümü, kale görünümü, katılma komutu, açıklama.
4. **Özet** — tüm veriler; oluşturma veya kaydetme.

Yeni oyun taslağı `localStorage`'da tutulur; sayfa yenilenirse kaybolmaz. Ayarlar
kaydedildiğinde veritabanına yazılır ve oturum kapatılıp açılsa da korunur.

Takım sayısı/renk/komut değişiklikleri **yayın URL'sini değiştirmez**. Aktif maç
sırasında yapılan kritik ayar değişiklikleri mevcut maçı bozmaz; sunucu odayı eski
konfigürasyonun anlık görüntüsüyle çalıştırmaya devam eder ve yeni ayarlar bir
sonraki turda uygulanır. Bu davranış test edilmiştir.

### Yapılandırma sürümleri

Her kayıtta `game_config_versions` tablosuna tam anlık görüntü yazılır
(`create`, `save`, `commands`, `restore:N`). Panelden geçmiş sürüme dönülebilir;
geri yükleme yeni bir sürüm oluşturur ve URL'yi değiştirmez.

---

## 7. Çok dilli komut motoru

İşlem kimlikleri sabittir:

`JOIN_TEAM`, `LEAVE_TEAM`, `HELP`, `SHOW_SCORE`, `CHANGE_TEAM`

Varsayılan görünen komutlar:

| İşlem | 🇹🇷 | 🇬🇧 | 🇪🇸 | 🇩🇪 | 🇫🇷 |
| --- | --- | --- | --- | --- | --- |
| JOIN_TEAM | gir / katil | join / enter | entrar / unirse | beitreten / eintreten | rejoindre / entrer |
| LEAVE_TEAM | cik / ayril | leave / exit | salir | verlassen | quitter |
| HELP | yardim | help | ayuda | hilfe | aide |
| SHOW_SCORE | skor | score | puntuacion / marcador | punkte | score |
| CHANGE_TEAM | takimdegistir | switch / changeteam | cambiarequipo | teamwechsel | changerequipe |

Örnek kullanımlar:

```text
!gir aslan
!join aslan
!entrar aslan
!beitreten aslan
!rejoindre aslan
!aslan              ← doğrudan takım komutu da JOIN_TEAM sayılır
```

Normalizasyon:

- Büyük/küçük harf duyarsızlık (Türkçe `I/İ/ı` tek harfe indirilir)
- Aksanların kaldırılması (`Café` → `cafe`)
- `ß → ss`, `ø → o`, `æ → ae` gibi özel harfler
- Fazla boşluk, `_` ve `-` normalizasyonu
- `!` veya `/` öneki

Güvenlik/doğrulama:

- Sistem ve takım komutları normalize edilmiş biçimde çakışamaz.
- Takım komutları 2–24 karakter; harf, rakam, tire/alt çizgi.
- Aynı izleyici aynı anda tek takımda olabilir (`JOIN` yerine `CHANGE_TEAM`).
- Komut başına bekleme süresi (varsayılan 1200 ms) + 20 saniyede 8 komut sınırı.
- WebSocket başına mesaj hızı sınırı ve 4 KB mesaj sınırı.
- Aynı `msgId` iki kez işlenmez.
- Yayıncı kilitleme yapabilir; sistem işlemleri silinemez/bozulamaz.

Yayıncı panelde sistem komutlarının görünen yazımını değiştirebilir; dil değişince
özel yazımlar sıfırlanıp yeni dilin varsayılanları uygulanır (kaydetmeden önce uyarı
gösterilir). Takım komutları ayrıca düzenlenir.

---

## 8. Oyun ayarları ve sunucu otoritesi

Varsayılanlar:

| Ayar | Varsayılan | Aralık |
| --- | --- | --- |
| Tur süresi | 90 sn | 30–300 |
| Başlangıç asker | 20 | 5–100 |
| Üretim hızı | 2 asker/sn | 0.5–10 |
| Kale canı | 1000 | 200–5000 |
| Saldırı gücü | 5 | 1–20 |
| Savunma gücü | 5 | 0–20 |
| Katılım bonusu | 5 asker | 0–20 |
| Oyuncu başına saldırı | %4 | 0–10 |
| Hediye hasarı | 120 | 0–500 |
| Beğeni kalkanı | %8 / 12 sn | 0–50% / 0–30 sn |
| Yorum askeri | 3 | 0–20 |
| Komut bekleme | 1200 ms | 300–10000 |
| Kazanma koşulu | Son ayakta kalan | 3 seçenek |

- Tüm değerler Zod + sunucu tarafı sınırlarıyla doğrulanır.
- Simülasyon sunucuda 250 ms adımlarla çalışır.
- İstemci yalnızca görüntü/olay alır; skor, kale canı ve kazananı değiştiremez.
- Hediye/beğeni/yorum event'leri event ID ile tekilleştirilir.
- Oyun sonucu berabere olabilir; bu durumda `isDraw=true` döner.

Kazanma koşulları: `last_standing`, `highest_castle_hp`, `highest_score`.

---

## 9. Kalıcı yayın bağlantısı ve OBS

Oyun oluşturulduğunda:

```text
https://alanadin.com/live/ahmet-in-taraftar-savasi-x7k2m9p4
```

- Slug; oyun adından türetilen okunabilir kısım + 10 karakterlik rastgele token.
- Kullanıcı ID'si veya tahmin edilebilir sıra içermez.
- Takım/ayar değişikliklerinde **değişmez**.
- Yayıncı panelden kopyalayabilir, açabilir, devre dışı bırakabilir/açabilir.
- Devre dışı bırakıldığında `/api/live/:slug` 404 döner ve WebSocket `4004` ile kapanır.

OBS Browser Source ayarları:

```text
Genişlik:  1080
Yükseklik: 1920
URL:       https://alanadin.com/live/<slug>
```

Yayın ekranı yalnızca oyunu içerir: skorboard, süre, 3D arena, komut yardımı,
katılım akışı ve kazanan ekranı. Yönetim paneli öğeleri yoktur. Test sohbeti yalnızca
URL'ye `?test=1` eklendiğinde görünür. Paneldeki “Yayın bağlantım” sayfası aynı
sahneyi bir iframe içinde gösterir.

### Otomatik turlar

- İlk izleyici katıldığında lobi otomatik başlar (varsayılan 10 sn sonra).
- Tur bitince 12 sn sonra lobiye dönülür; oyuncular varsa yeni tur otomatik başlar.
- Yayıncı “Turu durdur” derse otomatik başlatma duraklar; yeni bir katılım veya
  panelden “Tur başlat” ile yeniden açılır.
- Yayıncı istediği an bağlantıyı kapatabilir.

### Canlı yayın event webhook'u

```http
POST /api/live/:slug/events
X-Live-Signature: t=<unix>,v1=<hmac_sha256(secret, "<t>.<raw_body>")>
Content-Type: application/json

{
  "id": "yt_event_123",
  "type": "gift",
  "viewer": { "id": "channel_user_1", "name": "Deniz" },
  "teamSlot": 2,
  "amount": 1
}
```

- `type`: `gift` | `like` | `comment`
- Aynı `id` ikinci kez uygulanmaz.
- İmza zaman toleransı 300 saniyedir.
- Event yalnızca maç sırasında uygulanır; aksi halde `MATCH_NOT_RUNNING` döner.
- Üretimde doğrudan WebSocket sohbet komutları varsayılan olarak kapalıdır
  (`LIVE_COMMANDS_ENABLED=false`); komutlar bu imzalı adaptörden gelmelidir.

---

## 10. İstatistikler

Yayıncı bazında hesaplanır:

- Toplam maç, toplam katılım, tekil oyuncu, maç başına ortalama oyuncu
- En çok kazanan takım, takım bazında galibiyet/mağlubiyet/oynanan
- En aktif oyuncular (kümülatif puan)
- Tek maçtaki en yüksek skorlar
- Son maçlar ve kazananlar/süre/katılımcı

Tüm sorgular `game_id` ile sınırlıdır. İki yayıncının verisi birbirine karışmaz.

---

## 11. Testler

```bash
npm test
```

**87 test**, 8 dosya:

| Dosya | Kapsam |
| --- | --- |
| `tests/auth-payment.test.ts` | Kayıt/giriş/çıkış, abonelik kapısı, başarılı/başarısız/bekleyen ödeme, webhook imzası, tekrar işleme, tutar uyuşmazlığı, IDOR, süre dolumu, amblem yükleme |
| `tests/game-config.test.ts` | 2/4/8 takım, paket limitleri, takım/renk/komut güncelleme, URL sabitliği, dil değişimi, özel komut, çakışma, canlı link aç/kapat, sürüm geri yükleme, takım sayısı değişimi, kiracı izolasyonu |
| `tests/commands-engine.test.ts` | Normalizasyon (TR I/İ, aksan), 5 dilde JOIN, takım komutu, çakışma, katılma/ayrılma/değiştirme, spam, dedupe, hediye/beğeni/yorum, tur sonu |
| `tests/live-flow.test.ts` | Gerçek WebSocket ile katılım, rate limit, takım değiştirme, imzalı canlı event + dedupe, maç durdurma, istatistik/geçmiş, otomatik lobi, devre dışı link, üretim komut politikası |
| `tests/security-settings.test.ts` | scrypt hash, HttpOnly çerez, şifre değişimi, CSRF Origin, ayar sınırları, maç sırasında ayar erteleme, çapraz kiracı yazma denemesi |
| `tests/admin-catalog.test.ts` | Süper admin yetkisi, fiyat/süre güncelleme, seed’in admin değişikliğini ezmemesi, katalog CRUD, tek canlı motor kuralı, manuel lisans, Shopier ayarları |
| `tests/arcade.test.ts` | 25 oyun kataloğu, quiz/kelime/yarış/arena/çark/halat/duvar/at simülasyonu, cevap gizleme, WebSocket katılımı |
| `tests/arcade-rooms.test.ts` | Yayıncıya özel oda, lisans kapısı, TikTok webhook, platform normalizasyonu, oda duraklatma |

Ek olarak TypeScript kontrolü:

```bash
npm run typecheck
```

Kabul kriterlerinin test/görsel eşlemesi: [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md).

---

## 12. API özeti

Kimlik doğrulama çerezi (`tt_session`, HttpOnly, SameSite=Lax) kullanılır.

| Metot | Yol | Açıklama |
| --- | --- | --- |
| POST | `/api/auth/register` | Kayıt + oturum |
| POST | `/api/auth/login` | Giriş |
| POST | `/api/auth/logout` | Çıkış |
| GET | `/api/auth/me` | Kullanıcı, abonelik, oyun, paketler |
| PATCH | `/api/account/profile` | Görünen ad |
| POST | `/api/account/password` | Şifre değiştir |
| GET | `/api/packages` | Aktif paketler + süre listesi |
| GET | `/api/catalog` | Public oyun vitrini |
| GET | `/api/admin/overview` | Admin özeti |
| GET/POST/PUT/DELETE | `/api/admin/games` | Oyun kataloğu yönetimi |
| GET/POST/PUT/DELETE | `/api/admin/packages` | Paket/fiyat/süre yönetimi |
| GET | `/api/admin/payments` | Tüm ödemeler |
| GET | `/api/admin/publishers` | Yayıncı listesi |
| POST | `/api/admin/licenses` | Manuel lisans tanımla |
| GET/PUT | `/api/admin/settings` | Shopier mağaza ayarları |
| POST | `/api/billing/checkout` | Ödeme başlat |
| GET | `/api/billing/payments` | Ödeme geçmişi |
| GET | `/api/billing/subscription` | Abonelik + geçmiş |
| POST | `/api/webhooks/payments/:provider` | İmzalı ödeme webhook'u |
| GET | `/api/test-payments/:id` | Test checkout bilgisi |
| POST | `/api/test-payments/:id/pay` | Test sağlayıcısını tetikle |
| GET | `/api/game` | Panel oyun verisi + komutlar |
| POST | `/api/game` | Oyun oluştur |
| PUT | `/api/game` | İsim/dil/takım/ayar güncelle |
| GET/PUT | `/api/game/commands` | Komut ayarları |
| GET | `/api/game/versions` | Sürümler |
| POST | `/api/game/versions/:v/restore` | Sürüme dön |
| POST | `/api/game/live` | Yayın linkini aç/kapat |
| POST | `/api/game/session/start` | Tur başlat |
| POST | `/api/game/session/stop` | Turu durdur |
| GET | `/api/game/live-state` | Anlık canlı durum |
| POST | `/api/game/test-event` | İmzalı test event'i gönder |
| GET | `/api/game/stats` | İstatistikler |
| GET | `/api/game/sessions` | Maç geçmişi |
| GET | `/api/live/:slug` | Public OBS bootstrap |
| POST | `/api/live/:slug/events` | İmzalı canlı event |
| POST | `/api/uploads/emblem` | Takım arması yükle |
| WS | `/ws/game/:slug` | OBS/izleyici WebSocket |

---

## 13. Güvenlik

- **Tenant izolasyonu:** Tüm oyun/takım/istatistik sorguları kullanıcıya bağlı oyun
  üzerinden çalışır; başka `game_id` parametresi kabul edilmez.
- **Yetkilendirme:** Backend'de `requireUser`, `requirePanelAccess`; ödeme olmadan
  oyun uçları 402 döner.
- **Şifreler:** Node `scrypt` (N=16384, r=8, p=1) + rastgele salt; düz metin yok.
- **Oturum:** HMAC-SHA256 imzalı token, HttpOnly + SameSite=Lax çerez; üretimde Secure.
- **CSRF:** Mutasyon isteklerinde Origin doğrulaması; SameSite=Lax.
- **Ödeme:** Ham gövde HMAC imza doğrulaması, event ID dedupe, tutar/para birimi
  eşleşmesi, yalnızca `pending → succeeded` geçişi.
- **Canlı event:** HMAC imza + zaman toleransı + event ID dedupe.
- **Rate limiting:** Global IP limiti + auth/checkout/test-event uçlarında ek limitler;
  WebSocket mesaj limiti, komut cooldown'u.
- **Girdi doğrulama:** Zod şemaları; renk/komut/URL/ayar aralıkları.
- **Dosya yükleme:** 2 MB limit, magic byte kontrolü (PNG/JPEG/WebP), rastgele dosya
  adı, çalıştırılabilir içerik yok, SVG kabul edilmez.
- **Sırlar:** API anahtarları yalnızca sunucu env'inde; frontend'e sızmaz.
- **WebSocket:** Tahmin edilemez slug + canlı link durumu; üretimde doğrudan izleyici
  komutları varsayılan kapalı.
- **Hata yönetimi:** Kullanıcıya genel mesaj; ayrıntılar sunucu logunda.

> Not: MVP'de e-posta doğrulama, şifre sıfırlama, 2FA ve CSRF token (çift gönderim)
> yoktur. Üretime alırken bunları ve HTTPS/HSTS/reverse proxy limitlerini ekleyin.

---

## 14. Üretim kontrol listesi

1. `NODE_ENV=production`
2. Güçlü `SESSION_SECRET` (≥32 karakter), `LIVE_WEBHOOK_SECRET`
3. `APP_URL` ve `WEB_ORIGIN` gerçek HTTPS alan adı; `COOKIE_SECURE=true`
4. `PAYMENT_PROVIDER=stripe` + `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
5. Stripe webhook adresi: `https://alanadin.com/api/webhooks/payments/stripe`
6. `LIVE_COMMANDS_ENABLED=false` (gerçek komutlar imzalı sağlayıcıdan)
7. `ADMIN_EMAIL` ve güçlü `ADMIN_PASSWORD` belirle
8. Shopier kullanılacaksa `SHOPIER_WEBHOOK_TOKEN` ve mağaza/ürün URL’lerini gir
9. `npm run build && npm start` veya reverse proxy arkasında `npm start`
10. SQLite dosyası ve `UPLOADS_DIR` için yedekleme
11. `npm test` + `npm run typecheck`
12. Uygulamayı HTTPS üzerinden aç, OBS Browser Source'u 1080×1920 ile test et

Çok kiracılı büyüme için sonraki adımlar: PostgreSQL'e geçiş, Redis tabanlı rate
limit/WS presence, S3 uyumlu görsel depolama, kuyruk tabanlı event işleme, gerçek
YouTube/TikTok adaptörleri, e-posta doğrulama/şifre sıfırlama, çoklu oyun desteği.

---

## 15. Admin paneli, katalog ve süre bazlı fiyatlandırma

### Süper admin paneli

`/admin` rotası yalnızca `role = admin` kullanıcılar içindir. `ADMIN_EMAIL` ve
`ADMIN_PASSWORD` environment değişkenleriyle ilk açılışta oluşturulur. Aynı e-posta
ile kayıtlı bir yayıncı varsa rolü admin’e yükseltilir; mevcut şifresi değiştirilmez.

Admin bölümleri:

| Bölüm | İşlev |
| --- | --- |
| Genel bakış | Ciro, yayıncı, aktif abonelik, katalog ve paket satış özeti |
| Oyun kataloğu | 25 oyunlu 3D vitrin; içerik/görsel kod tabanlı |
| Paketler ve fiyatlar | 3D stüdyo paketleri + oyun bazlı 1/30 günlük lisans teklifleri |
| Ödemeler | Tüm sağlayıcıların ödeme geçmişi |
| Yayıncılar | Yayıncı/oyun/lisans listesi + manuel lisans |
| Shopier hazırlığı | Mağaza adresi, ürün eşleştirme, webhook durumu |

- Fiyat/süre değişiklikleri **yeni ödemelere** uygulanır; mevcut aboneliklerin bitiş
  tarihi değişmez.
- Paket pasifleştirildiğinde yeni satış durur, geçmiş ödemeler ve mevcut lisanslar korunur.
- Varsayılan seed verisi admin düzenlemelerinin üzerine yazmaz (`INSERT OR IGNORE`).
- Oynanabilir ana oyun silinemez; gizlenebilir. Aynı motorda ikinci bir “canlı” oyun
  oluşturulamaz.
- Arcade oyunları oyun bazlı lisansla satılır; lisanssız oda açılamaz.
- 3D Taraftar Savaşı stüdyosu ayrı paketlerle çalışmaya devam eder.

### Fiyat ve süre modeli

Arcade oyunları için varsayılan teklifler (`packages.game_key` dolu):

| Süre | Oyun başına fiyat |
| --- | --- |
| 1 gün | ₺49 |
| 30 gün | ₺249 |

| Tüm Oyunlar paketi | Fiyat |
| --- | --- |
| Günlük | ₺99 |
| Aylık | ₺399 |
| Yıllık | ₺2.999 |

25 oyun × 2 süre = 50 oyun lisansı + 3 Tüm Oyunlar paketi seed edilir.

3D Taraftar Savaşı stüdyosu paketleri ayrıdır (`game_key` boş):

| Süre | Başlangıç (2 takım) | Profesyonel (4 takım) | Efsane (8 takım) |
| --- | --- | --- | --- |
| 1 gün | ₺49 | ₺79 | ₺129 |
| 7 gün | ₺129 | ₺199 | ₺349 |
| 30 gün | ₺299 | ₺499 | ₺799 |

Bu değerler admin panelinden değiştirilebilir; yeni süreler eklenebilir. Oyun lisansı
ödemesi `game_licenses`, 3D stüdyo ödemesi `subscriptions` tablosuna yazılır.

### Shopier

Şu an iki güvenli seçenek hazır:

1. **Manuel lisans (aktif, 3D stüdyo):** Shopier satışı geldiğinde `/admin/yayincilar` →
   “Manuel lisans” ile yayıncının e-postasına 3D stüdyo paketi tanımlanır. Sistem başarılı
   bir ödeme kaydı (`provider = manual`) ve abonelik oluşturur; panel anında açılır. Oyun
   bazlı lisansların Shopier eşleştirmesi sonraki adımdır.
2. **Otomatik webhook (sonraki adım):** Shopier mağazası açıldığında
   `SHOPIER_WEBHOOK_TOKEN` ve `PAYMENT_PROVIDER=shopier` ile `order.created`
   webhook’u bağlanacak. Panelde webhook adresi ve paket başına Shopier ürün URL’si
   alanları hazır.

Shopier mağazası açmak mevcut sistemi bozmaz; sağlayıcı `test`/Stripe olarak kalır.
Webhook bağlanana kadar **otomatik Shopier aktivasyonu yoktur**, manuel lisans kullanılır.

## 16. Oyun platformu (arcade)

Platform vitrini açık temalıdır: ana sayfa, `/oyunlar`, `/oyun/:slug`, `/satin-al`,
`/kurulum`, `/liderlik`, `/uygulama` ve `/uyarilar`. Oyunlar 9:16 dikey, Three.js tabanlı 3D sahnede çalışır; OBS Browser Source veya TikTok LIVE
Studio bağlantı kaynağı olarak kullanılabilir. Oyun bazlı lisanslar `/satin-al` mağazasından
1 veya 30 günlük satın alınır; lisanssız oda açılamaz. Işık, gölge, karakter animasyonları, hit ve
konfeti efektleri ortak renderer'dadır. WebGL yoksa 2D sahne yedeği kullanılır.

### Oyunlar

| Oyun | Kategori | Mekanik |
| --- | --- | --- |
| Sahne 90 | Eğlence | Dans pisti; beğeni enerji, hediye ışık/figür |
| Profil Matbaası | Eğlence | Profil kartı baskı atölyesi (yüksek etkileşim uyarısı) |
| Halka | Eğlence | Merkez fener çevresinde soyut, saygılı kalabalık turu |
| Bilgi Arenası | Bilgi | A/B/C/D quiz; doğru ve hızlı cevap puan |
| Harf Şehir | Bilgi | Kategori + harf; doğru kelime puan |
| Arena Ustaları | Arena | Otomatik dövüş; son kalan kazanır |
| Çubuk Hayatta Kalma | Arena | Çubuk battle royale |
| Piksel Yarış | Yarış | Piksel araç yarışı; turbo ve engeller |
| Çarkıfelek | Eğlence | Bilet topla; otomatik dönen çark, ağırlıklı kazanan |
| Halat Çekme | Arena | Kırmızı/mavi takım; beğeni ve hediye halatı çeker |
| Kızlar vs Erkekler | Arena | İki takım ortadaki duvarı rakip tarafa iter |
| At Yarışı | Yarış | 10 jokey; beğeni ve hediye atı ileri iter |
| Horon & Halay | Eğlence | Düğün/horon/halay coşkusu; dans puanı |
| Sıra Gecesi | Eğlence | Saz ve türkü eşliğinde sıra gecesi |
| Noche Latina | Eğlence | Salsa/bachata/reggaetón dans kulübü |
| Live Concert | Eğlence | Konser sahnesi ve kalabalık enerjisi |
| Ramwong Fair | Eğlence | Fenerler altında panayır dansı |
| Tepe Fırlaması | Yarış | Yokuş tırmanışı; gaz ve nitro |
| Grand Prix | Yarış | F1 pisti; hız yarışı |
| İzleyici Kasabası | Eğlence | Bina büyütme yarışı |
| Karpuz Patlatma | Eğlence | Bant gerginliğiyle karpuz patlatma |
| Altın Mıknatısı | Eğlence | Ortak altın kasası |
| Animal Run | Yarış | Hayvan yarışçıları |
| Team Clash | Arena | Kırmızı/mavi takım savaşı |
| Kalabalık Koşusu | Yarış | Şehir sokaklarında kalabalık yarışı |

### Bilgi Arenası soruları

- **24 hazır soru** ile gelir; her turda soru sırası karıştırılır.
- Yayıncı panelden oyunun **Sorular** düğmesiyle kendi havuzunu oluşturur.
- Her soru: kategori, soru metni, 4 seçenek ve doğru cevap.
- Özel havuz boşaltılırsa hazır havuza dönülür.
- Sorular ve cevaplar public oda DTO’suna gönderilmez; yalnızca panelde görünür.
- API: `PUT /api/arcade/rooms/:id/quiz`

Oyunların adları, görselleri, metinleri ve sahneleri bu proje için özgün üretildi;
hiçbir dış sitenin görseli veya metni kopyalanmadı.

### Canlı oda

- `GET /api/arcade/games` — oyun tanımları + online sayaçları
- `GET /api/arcade/games/:key` — oyun ve anlık snapshot
- `GET /api/arcade/offers` — oyun bazlı 1/30 günlük lisans fiyatları
- `GET /api/arcade/access` — giriş yapan yayıncının aktif oyun lisansları
- `POST /api/billing/checkout` — teklif paketiyle oyun lisansı ödemesi
- `WS /ws/arcade/:key` — demo odası katılımı, beğeni, hediye, yorum
- `GET/POST /api/arcade/rooms` — yayıncı odaları
- `PUT /api/arcade/rooms/:id` — ad/durum/ayar
- `GET /api/arcade/rooms/:slug/public` — public oda + lisans durumu
- `WS /ws/arcade/room/:slug` — yayıncıya özel canlı oda
- `GET/POST /api/platforms/rooms/:id` — platform bağlantıları
- `POST /api/webhooks/tiktok/:token` — TikTok connector webhook'u
- Sunucu 250 ms tick ile oyunu yönetir; istemci yalnızca state alır.
- Demo odaları 7 bot ile açılır; gerçek izleyici katıldığında aynı sahneye girer.
- Oyun başına süre, maksimum oyuncu, uyarı ve risk seviyesi `shared/arcade.ts` içinde.

### Oyun bazlı lisans ve mağaza

- Public mağaza: `/satin-al`; her oyun için **1 gün** ve **30 gün** lisansı listelenir.
- Lisans, `packages.game_key` dolu tekliflerden satın alınır; ödeme sonrası
  `game_licenses` kaydı oluşur. Platform aboneliği artık arcade oyunu açmaz.
- Lisanssız oyunun public sayfası yalnızca **önizleme**dir; oyuna katılma ve oda
  oluşturma kapalıdır.
- Satın alınan oyun `/panel/arcade` içinde açılır; oda adı, karşılama metni ve vurgu
  rengi özelleştirilir, ardından yayına alınır.
- Lisans bitince public oda ve WebSocket erişimi kapanır; yenileme oda ayarlarını korur.

### Yayıncıya özel oda durumu

Bu fazda oyun sayfaları **ortak demo odası** olarak çalışır. Yayıncıya özel oda,
lisans kontrolü ve TikTok canlı event bağlantısı sonraki fazın işidir. Mevcut yayıncı
stüdyosu (3D Taraftar Savaşı, takımlar, komutlar, istatistikler) çalışmaya devam eder.

### Uyarılar

`/uyarilar` sayfası ve her oyun sayfası şunları gösterir:

- TikTok/YouTube/Twitch kurallarına uyum yayıncının sorumluluğundadır.
- Oyun ekranında hediye talebi veya hediye karşılığı vaat yoktur.
- Profil görseli/kullanıcı adı gösteren oyunlarda ihlal riski daha yüksektir.
- Dijital ürün ve iade koşulları satın alma öncesi belirtilir.
- Platform bağımsızdır; TikTok/YouTube/Twitch ile resmî bağlantısı yoktur.

## 16.5 Rakip paritesi (2026)

- **Ücretsiz deneme:** günde bir kez 30 dakika; `/api/arcade/trial` 30 dakikalık lisans açar,
  süre bitince oda kapanır.
- **Overlay + TTS:** oda ayarlarında tam/sade overlay ve Türkçe sesli sunucu; OBS URL’sine
  `?tts=1` eklenebilir.
- **Ortak yayın:** oda sahibi başka bir yayıncıyı e-posta ile cohost olarak ekler; iki yayıncı
  aynı odaya kendi platform sohbetini bağlar.
- **PWA:** `/uygulama` üzerinden masaüstü/mobil uygulama gibi yükleme; ayrı Windows launcher
  yerine tarayıcı tabanlı PWA.
- **Kupon:** `MEYDAN10` %10 indirim; kupon kodu mağaza ve panelden girilir, ödeme tutarı
  sunucuda düşürülür.
- **WhatsApp destek:** `VITE_SUPPORT_WHATSAPP` tanımlanınca site genelinde canlı destek butonu.
- **Moderasyon:** canlı oyuncu listesi, odadan çıkarma ve **kalıcı ban/blocklist**;
  platform avatarları (YouTube/TikTok) varsa moderasyon ve top-3 HUD’ta gösterilir.

### Platform dili (TR / EN)

- Üst menüdeki **TR / EN** düğmesi tüm arayüz dilini değiştirir; tercih tarayıcıda saklanır.
- Ana sayfa, oyun kataloğu, oyun sayfaları, mağaza, kurulum, liderlik, giriş ve yayıncı paneli
  İngilizceye çevrilir; oyun adları ve kategoriler İngilizce karşılıklarıyla gösterilir.
- Sayfa başlığı ve tarih ayları da seçilen dile uyarlanır.
- Yayıncı tarafından girilen quiz/kelime içerikleri, kullanıcı adları ve API hata mesajları
  otomatik çevrilmez; bunlar içerik dilinde kalır.

### Arcade dil ve komutları

- Her arcade odasında dil: **Türkçe, English, Español, Deutsch, Français**.
- Varsayılan katılım komutu dile göre gelir; yayıncı panelden değiştirebilir:
  - Katılım: `katıl` / `join` / `unirse` / `beitreten` / `rejoindre`
  - Ayrılma: `ayrıl` / `leave` / ...
  - Takım oyunlarında kırmızı/mavi veya kızlar/erkekler komutları.
- “Önce katılım komutu yazılsın” seçeneği açılırsa normal yorumlar oyuncu oluşturmaz.
- OBS HUD’undaki temel durum etiketleri seçilen dile göre çevrilir.
- Quiz/kelime içeriği yayıncının girdiği dilde kalır; otomatik çeviri yapılmaz.

## 17. Yayıncıya özel odalar ve platform bağlantıları

### Oda modeli

Her yayıncı, yirmi beş oyunun her biri için **ayrı ve kalıcı** bir oda açabilir. Oda
oluşturmak için o oyunun **aktif lisansı** gerekir; lisans bitince public oda ve
WebSocket erişimi kapanır. Aynı oyun için ikinci oda açılamaz; her oda farklı `public_slug` alır.

- Panel: `/panel/arcade`
- Public/OBS: `/canli/:slug` (`?obs=1` yalnızca sahne)
- Her oda kendi durumunu, oyuncularını, tur geçmişini ve platform bağlantılarını tutar.
- İlk platform olayı geldiğinde tur otomatik başlar; demo botları yayıncı odasında yoktur.
- Oda duraklatıldığında bağlı istemciler kapatılır, public sayfa “kapalı” gösterir.

### Platform bağlantıları

| Platform | Yöntem | Gerekli |
| --- | --- | --- |
| Twitch | Anonim IRC WebSocket; public sohbet, bits ve abonelik bildirimleri | Kanal adı; OAuth gerekmez |
| YouTube | Data API v3 ile canlı sohbet poll; Super Chat/üyelik eşleme | `YOUTUBE_API_KEY` |
| TikTok | TikFinity/TikTools/Streamer.bot → connector webhook | TikTok köprüsü + panelde üretilen URL |

TikTok’un resmî canlı sohbet API’si yoktur. Bu nedenle doğrudan TikTok hesabı
bağlanmaz; connector webhook kullanılır. TikTok olayları `comment`, `like`, `gift`,
`follow` olarak normalize edilir (TikFinity’nin `content`, `commandParams`, `giftId`,
`giftName`, `repeatCount` alanları dahil).

Panel: `/panel/baglantilar`

- Twitch/YouTube için kanal bağla; durum ve son hata görünür.
- TikTok için connector URL üretilir; URL’yi köprüye tanımla.
- Test yorumu/beğeni/hediye/takip göndererek oyunu doğrula.
- TikTok connector URL’si gizli anahtar gibidir; paylaşma. Dış köprünün erişebilmesi için `APP_URL` public HTTPS adresi olmalı.

### Yeni environment değerleri

```bash
YOUTUBE_API_KEY=      # YouTube canlı sohbet okuma (Data API v3)
```

Twitch için ek anahtar gerekmez. TikTok connector token’ı panelden üretilir ve
veritabanında tutulur. Bağlantılar `platform_connections`, odalar `arcade_rooms`,
tur kayıtları `arcade_sessions` tablolarındadır.

## 18. Lisans ve marka notu

Bu projedeki takım isimleri, renkler ve semboller örnektir; oyun motoruna gömülü
değildir. Yayıncılar kendi takımlarını oluşturur. Kullanıcıların yüklediği görsellerin
kullanım hakkı kendilerine aittir. Kulüp/marka armaları gibi lisans gerektiren resmî
varlıklar için gerekli izinlerin alınması yayıncının sorumluluğundadır.
