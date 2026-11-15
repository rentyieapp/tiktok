# PostgreSQL ve Coolify production

Rook Works production ortamı Coolify üzerinde görünür bir uygulama + PostgreSQL 18 kaynağı olarak çalışır.

## Kaynaklar

- Coolify paneli: `http://173.212.247.226:8000`
- Proje: **Rook Works** → `production`
- Uygulama: **Rook Works** (Dockerfile build pack)
- PostgreSQL: **postgresql-database-ge2d…** (Coolify Database kaynağı)
- Public URL: `https://n142zj82jmky6axi2dupiqka.173.212.247.226.sslip.io`

Coolify domaini ve TLS sertifikasını yönetir; sertifika Let's Encrypt tarafından otomatik yenilenir. Uygulamayı, environment değişkenlerini, logları ve restart/redeploy işlemlerini panelden manuel yönetebilirsin.

## Uygulama ortam değişkenleri

```env
NODE_ENV=production
DB_DRIVER=postgres
DATABASE_URL=postgres://postgres:<sifre>@<postgres-container-ip>:5432/postgres
PG_POOL_MAX=5
APP_URL=https://n142zj82jmky6axi2dupiqka.173.212.247.226.sslip.io
WEB_ORIGIN=https://n142zj82jmky6axi2dupiqka.173.212.247.226.sslip.io
COOKIE_SECURE=true
UPLOADS_DIR=/app/data/uploads
REQUIRE_EMAIL_VERIFICATION=false
```

`DATABASE_URL` varsa SQLite yerine Postgres kullanılır. Yerel geliştirmede `DB_DRIVER` ve `DATABASE_URL` boş bırakılırsa SQLite (`data/app.db`) kullanılmaya devam eder.

## Neden derlenmiş CommonJS?

`better-sqlite3` senkron API'sini koruyan Postgres adaptörü `deasync` kullanıyor. ESM + `tsx` çalışma zamanında `pg` soket callback'leri güvenilir işlenmediği için production sunucusu `esbuild` ile CommonJS'e derlenir:

```bash
npm run build
node dist-server/index.cjs
```

Dockerfile bu adımları otomatik yapar. Geliştirmede `npm run dev` (tsx + SQLite) kullanılabilir.

## Yedekleme

Sunucuda günlük `pg_dump` yedeği alınır:

```bash
/root/meydan-backup.sh
ls -lh /root/meydan-backups
```

Varsayılan saklama: 14 gün. Coolify PostgreSQL kaynağının **Backups** sekmesinden ayrıca panel tabanlı yedek de açılabilir.

Geri yükleme (önce test ortamında dene):

```bash
docker exec -i <postgres-container> pg_restore -U postgres -d postgres --clean --if-exists < /root/meydan-backups/meydan-YYYYMMDD-HHMM.dump
```

## İlk kurulum doğrulaması

```bash
curl -fsS https://n142zj82jmky6axi2dupiqka.173.212.247.226.sslip.io/api/health
curl -fsS https://n142zj82jmky6axi2dupiqka.173.212.247.226.sslip.io/api/arcade/games | jq '.games | length'
```

Beklenen: health `{"ok":true,...}`, oyun sayısı `30`.

## E-posta doğrulama

`REQUIRE_EMAIL_VERIFICATION=true` yapmadan önce Coolify environment'a `RESEND_API_KEY` ve `MAIL_FROM` ekle. Aksi hâlde yeni kayıtlar doğrulama e-postası alamaz. Mevcut admin ve demo hesapları doğrulanmış durumdadır.
