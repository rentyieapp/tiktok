import type { DB } from './index.js';
import { ARCADE_GAME_LIST } from '../../../shared/arcade.js';

interface SeedPackage {
  id: string;
  code: string;
  name: string;
  tagline: string;
  description: string;
  priceCents: number;
  maxTeams: 2 | 4 | 8;
  durationDays: number;
  features: string[];
  highlight: number;
  sortOrder: number;
  gameKey?: string | null;
}

const STARTER_FEATURES = [
  '2 takımlı 3D Taraftar Savaşı',
  'Kalıcı OBS yayın bağlantısı',
  'Temel yayıncı istatistikleri',
  'Takım ve renk özelleştirme',
];

const PRO_FEATURES = [
  '4 takımlı 3D Taraftar Savaşı',
  'Çok dilli komut motoru',
  'Hediye, beğeni ve yorum destekleri',
  'Gelişmiş yayıncı istatistikleri',
  'Oyun geçmişi ve oturum kayıtları',
];

const LEGEND_FEATURES = [
  '8 takımlı 3D Taraftar Savaşı',
  'Tüm Profesyonel özellikler',
  'Sınırsız izleyici katılımı',
  'Gelişmiş canlı yayın eventleri',
  'Öncelikli destek',
];

const PACKAGES: SeedPackage[] = [
  {
    id: 'pkg_starter',
    code: 'starter',
    name: 'Başlangıç',
    tagline: 'Yayına hızlı bir başlangıç',
    description: 'Taraftar Savaşı 3D için 2 takımlı, 30 günlük yayıncı paketi. Kendi takımlarını kur ve OBS bağlantını al.',
    priceCents: 29900,
    maxTeams: 2,
    durationDays: 30,
    features: STARTER_FEATURES,
    highlight: 0,
    sortOrder: 1,
  },
  {
    id: 'pkg_pro',
    code: 'pro',
    name: 'Profesyonel',
    tagline: 'Büyüyen yayıncılar için',
    description: 'Taraftar Savaşı 3D için 4 takım, gelişmiş istatistikler ve çok dilli komut motoru. 30 günlük lisans.',
    priceCents: 49900,
    maxTeams: 4,
    durationDays: 30,
    features: PRO_FEATURES,
    highlight: 1,
    sortOrder: 2,
  },
  {
    id: 'pkg_legend',
    code: 'legend',
    name: 'Efsane',
    tagline: 'En büyük sahneler için',
    description: 'Taraftar Savaşı 3D için 8 takımlı dev savaşlar, sınırsız oyuncu ve tüm canlı yayın entegrasyonları.',
    priceCents: 79900,
    maxTeams: 8,
    durationDays: 30,
    features: LEGEND_FEATURES,
    highlight: 0,
    sortOrder: 3,
  },
  {
    id: 'pkg_starter_1d',
    code: 'starter_1d',
    name: 'Başlangıç 1 Gün',
    tagline: 'Tek günlük deneme yayını',
    description: '1 günlük, 2 takımlı yayıncı lisansı. Tek gecelik özel yayınlar için.',
    priceCents: 4900,
    maxTeams: 2,
    durationDays: 1,
    features: ['2 takımlı 3D Taraftar Savaşı', '1 günlük yayıncı lisansı', 'Kalıcı OBS bağlantısı', 'Temel istatistikler'],
    highlight: 0,
    sortOrder: 10,
  },
  {
    id: 'pkg_starter_7d',
    code: 'starter_7d',
    name: 'Başlangıç 7 Gün',
    tagline: 'Haftalık yayın paketi',
    description: '7 günlük, 2 takımlı yayıncı lisansı. Düzenli ama küçük yayınlar için.',
    priceCents: 12900,
    maxTeams: 2,
    durationDays: 7,
    features: ['2 takımlı 3D Taraftar Savaşı', '7 günlük yayıncı lisansı', 'Kalıcı OBS bağlantısı', 'Temel istatistikler'],
    highlight: 0,
    sortOrder: 11,
  },
  {
    id: 'pkg_pro_1d',
    code: 'pro_1d',
    name: 'Profesyonel 1 Gün',
    tagline: 'Tek gün, tam güç',
    description: '1 günlük, 4 takımlı yayıncı lisansı. Özel etkinlik ve turnuvalar için.',
    priceCents: 7900,
    maxTeams: 4,
    durationDays: 1,
    features: ['4 takımlı 3D Taraftar Savaşı', '1 günlük lisans', 'Tüm komut özelleştirmeleri', 'Canlı destekler'],
    highlight: 0,
    sortOrder: 12,
  },
  {
    id: 'pkg_pro_7d',
    code: 'pro_7d',
    name: 'Profesyonel 7 Gün',
    tagline: 'Haftalık profesyonel yayın',
    description: '7 günlük, 4 takımlı yayıncı lisansı.',
    priceCents: 19900,
    maxTeams: 4,
    durationDays: 7,
    features: ['4 takımlı 3D Taraftar Savaşı', '7 günlük lisans', 'Çok dilli komut motoru', 'Gelişmiş istatistikler'],
    highlight: 0,
    sortOrder: 13,
  },
  {
    id: 'pkg_legend_1d',
    code: 'legend_1d',
    name: 'Efsane 1 Gün',
    tagline: 'Tek günlük büyük arena',
    description: '1 günlük, 8 takımlı yayıncı lisansı. Büyük özel yayınlar için.',
    priceCents: 12900,
    maxTeams: 8,
    durationDays: 1,
    features: ['8 takımlı 3D Taraftar Savaşı', '1 günlük lisans', 'Sınırsız izleyici', 'Tüm destekler'],
    highlight: 0,
    sortOrder: 14,
  },
  {
    id: 'pkg_legend_7d',
    code: 'legend_7d',
    name: 'Efsane 7 Gün',
    tagline: 'Bir hafta boyunca dev arena',
    description: '7 günlük, 8 takımlı yayıncı lisansı.',
    priceCents: 34900,
    maxTeams: 8,
    durationDays: 7,
    features: ['8 takımlı 3D Taraftar Savaşı', '7 günlük lisans', 'Sınırsız izleyici', 'Öncelikli destek'],
    highlight: 0,
    sortOrder: 15,
  },
  {
    id: 'pkg_starter_365d',
    code: 'starter_365d',
    name: 'Başlangıç Yıllık',
    tagline: 'Yıl boyunca 2 takımlı stüdyo',
    description: 'Taraftar Savaşı 3D için 2 takımlı, 365 günlük yayıncı paketi.',
    priceCents: 249900,
    maxTeams: 2,
    durationDays: 365,
    features: ['2 takımlı 3D Taraftar Savaşı', '365 günlük yayıncı lisansı', 'Kalıcı OBS bağlantısı', 'Temel istatistikler'],
    highlight: 0,
    sortOrder: 20,
  },
  {
    id: 'pkg_pro_365d',
    code: 'pro_365d',
    name: 'Profesyonel Yıllık',
    tagline: 'Yıl boyunca tam güç',
    description: 'Taraftar Savaşı 3D için 4 takım, çok dilli komutlar ve 365 günlük yayıncı lisansı.',
    priceCents: 399900,
    maxTeams: 4,
    durationDays: 365,
    features: ['4 takımlı 3D Taraftar Savaşı', '365 günlük lisans', 'Tüm komut özelleştirmeleri', 'Gelişmiş istatistikler'],
    highlight: 1,
    sortOrder: 21,
  },
  {
    id: 'pkg_legend_365d',
    code: 'legend_365d',
    name: 'Efsane Yıllık',
    tagline: 'Yıl boyunca en büyük sahne',
    description: 'Taraftar Savaşı 3D için 8 takım, sınırsız izleyici ve 365 günlük yayıncı lisansı.',
    priceCents: 599900,
    maxTeams: 8,
    durationDays: 365,
    features: ['8 takımlı 3D Taraftar Savaşı', '365 günlük lisans', 'Sınırsız izleyici', 'Öncelikli destek'],
    highlight: 0,
    sortOrder: 22,
  },
];

/**
 * Varsayılan paketleri yalnızca yoksa ekler.
 * Admin panelinden yapılan fiyat/süre değişiklikleri sunucu yeniden başlayınca
 * EZİLMEZ; bu yüzden INSERT OR IGNORE kullanılır.
 */
export function seedPackages(db: DB): void {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO packages (
      id, code, name, tagline, description, price_cents, currency, max_teams,
      duration_days, features_json, highlight, sort_order, is_active, shopier_url, game_key
    ) VALUES (?, ?, ?, ?, ?, ?, 'TRY', ?, ?, ?, ?, ?, 1, NULL, ?)`,
  );
  const tx = db.transaction(() => {
    for (const pkg of PACKAGES) {
      insert.run(
        pkg.id,
        pkg.code,
        pkg.name,
        pkg.tagline,
        pkg.description,
        pkg.priceCents,
        pkg.maxTeams,
        pkg.durationDays,
        JSON.stringify(pkg.features),
        pkg.highlight,
        pkg.sortOrder,
        pkg.gameKey ?? null,
      );
    }
  });
  tx();
}

/**
 * Oyun bazlı 1 gün / 30 gün lisansları. Bunlar ayrı `packages` satırlarıdır;
 * `game_key` dolu olduğu için platform aboneliği sayılmaz, oyun lisansı açar.
 */
export function seedGameOffers(db: DB): void {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO packages (
      id, code, name, tagline, description, price_cents, currency, max_teams,
      duration_days, features_json, highlight, sort_order, is_active, shopier_url, game_key
    ) VALUES (?, ?, ?, ?, ?, ?, 'TRY', 8, ?, ?, 0, ?, 1, NULL, ?)`,
  );
  const tx = db.transaction(() => {
    ARCADE_GAME_LIST.forEach((game, gameIndex) => {
      [
        { days: 1, price: 10000 },
        { days: 30, price: 39900 },
        { days: 365, price: 299900 },
      ].forEach((offer, offerIndex) => {
        const id = `offer_${game.key}_${offer.days}d`;
        insert.run(
          id,
          `offer_${game.key}_${offer.days}d`,
          `${game.name} · ${offer.days === 1 ? '1 Gün' : offer.days === 30 ? '30 Gün' : '1 Yıl'}`,
          offer.days === 1 ? 'Tek günlük oyun lisansı' : offer.days === 30 ? 'Aylık oyun lisansı' : 'Yıllık oyun lisansı',
          `${game.name} oyununu kendi yayın odanda kullanmak için ${offer.days === 365 ? '1 yıllık' : `${offer.days} günlük`} lisans.`,
          offer.price,
          offer.days,
          JSON.stringify(['Oyun lisansı', 'Yayıncıya özel oda', '3D sahne', 'OBS bağlantısı']),
          120 + gameIndex * 3 + offerIndex,
          game.key,
        );
      });
    });

    const bundleOffers = [
      { days: 1, price: 19900, code: 'bundle_all_1d', label: 'Günlük' },
      { days: 30, price: 59900, code: 'bundle_all_30d', label: 'Aylık' },
      { days: 365, price: 399900, code: 'bundle_all_365d', label: 'Yıllık' },
    ];
    bundleOffers.forEach((offer, index) => {
      insert.run(
        `offer_${offer.code}`,
        `offer_${offer.code}`,
        `Tüm Oyunlar · ${offer.label}`,
        `${ARCADE_GAME_LIST.length} oyunun tamamı`,
        `Tüm arcade oyunlarına ${offer.label.toLocaleLowerCase('tr')} erişim. Satın alınca tüm oyunlar için lisans açılır.`,
        offer.price,
        offer.days,
        JSON.stringify([`${ARCADE_GAME_LIST.length} oyunun tamamı`, 'Yayıncıya özel oda', '3D sahneler', 'OBS bağlantısı']),
        1 + index,
        '*',
      );
    });

    // Mevcut kurulumlarda oyun sayısı değişince paket açıklamalarını güncelle.
    db.prepare(
      `UPDATE packages SET
         tagline = ?,
         description = ?,
         features_json = ?
       WHERE id IN ('offer_bundle_all_1d', 'offer_bundle_all_30d', 'offer_bundle_all_365d')`,
    ).run(
      `${ARCADE_GAME_LIST.length} oyunun tamamı`,
      `Tüm arcade oyunlarına günlük, aylık veya yıllık erişim. Satın alınca ${ARCADE_GAME_LIST.length} oyun için lisans açılır.`,
      JSON.stringify([`${ARCADE_GAME_LIST.length} oyunun tamamı`, 'Yayıncıya özel oda', '3D sahneler', 'OBS bağlantısı']),
    );

    // Ücretsiz deneme lisanslarının bağlı olduğu gizli paket.
    db.prepare(
      `INSERT OR IGNORE INTO packages (
        id, code, name, tagline, description, price_cents, currency, max_teams,
        duration_days, features_json, highlight, sort_order, is_active, shopier_url, game_key
      ) VALUES ('pkg_trial', 'pkg_trial', 'Ücretsiz Deneme', 'Günde 30 dakika',
        'Yayıncıların oyunları denemesi için 30 dakikalık ücretsiz lisans.',
        0, 'TRY', 8, 1, '[]', 0, 0, 0, NULL, NULL)`,
    ).run();
  });
  tx();
}

const GAME_PRODUCTS = [
  {
    id: 'gprod_fan_battle',
    slug: 'taraftar-savasi',
    name: 'Taraftar Savaşı',
    category: 'arena',
    tagline: 'Takımını seç, kaleni savun.',
    description:
      'Dört takımın kalelerini koruduğu, izleyicilerin yorum, beğeni ve hediyelerle savaştığı 3D arena oyunu.',
    symbol: '🛡️',
    status: 'live' as const,
    engineKey: 'fan_battle' as const,
    sortOrder: 1,
  },
  {
    id: 'gprod_turbo',
    slug: 'turbo-yaris',
    name: 'Turbo Yarış',
    category: 'yaris',
    tagline: 'Hediye geldikçe hızlanan yarış.',
    description: 'İzleyicilerin destekleriyle araçları hızlanan, canlı yayın için tasarlanmış yarış oyunu.',
    symbol: '🏎️',
    status: 'coming_soon' as const,
    engineKey: 'coming_soon' as const,
    sortOrder: 2,
  },
  {
    id: 'gprod_disco',
    slug: 'disco-dukkani',
    name: 'Disco Dükkanı',
    category: 'eglence',
    tagline: 'Yayınını dans pistine çevir.',
    description: 'İzleyici etkileşimleriyle büyüyen eğlenceli bir canlı yayın oyunu.',
    symbol: '🪩',
    status: 'coming_soon' as const,
    engineKey: 'coming_soon' as const,
    sortOrder: 3,
  },
  {
    id: 'gprod_horon',
    slug: 'horon-halkasi',
    name: 'Horon Halkası',
    category: 'eglence',
    tagline: 'Hep birlikte horona dur.',
    description: 'Yorum ve beğenilerle büyüyen horon halkası; eğlence odaklı yayınlar için.',
    symbol: '🕺',
    status: 'coming_soon' as const,
    engineKey: 'coming_soon' as const,
    sortOrder: 4,
  },
  {
    id: 'gprod_quiz',
    slug: 'bilgi-duellosu',
    name: 'Bilgi Düellosu',
    category: 'bilgi',
    tagline: 'Bilgi yarışmasında yayıncıya karşı.',
    description: 'İzleyicilerin sorulara yorumla cevap verdiği, puan topladığı bilgi oyunu.',
    symbol: '🧠',
    status: 'coming_soon' as const,
    engineKey: 'coming_soon' as const,
    sortOrder: 5,
  },
  {
    id: 'gprod_cark',
    slug: 'carkifelek',
    name: 'Çarkıfelek',
    category: 'eglence',
    tagline: 'Şansı yayına getir.',
    description: 'Hediye ve yorumlarla dönen çark; izleyicilere anlık ödüller ve sansasyon.',
    symbol: '🎡',
    status: 'coming_soon' as const,
    engineKey: 'coming_soon' as const,
    sortOrder: 6,
  },
];

export function seedGameProducts(db: DB): void {
  // Katalog yalnızca ilk kurulumda doldurulur. Admin bir oyunu silerse
  // sunucu yeniden başladığında geri gelmez.
  const existing = db.prepare('SELECT COUNT(*) AS count FROM game_products').get() as {
    count: number;
  };
  if (Number(existing.count) > 0) return;
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT OR IGNORE INTO game_products (
      id, slug, name, category, tagline, description, symbol, cover_url, status, engine_key,
      sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
  );
  const tx = db.transaction(() => {
    for (const product of GAME_PRODUCTS) {
      insert.run(
        product.id,
        product.slug,
        product.name,
        product.category,
        product.tagline,
        product.description,
        product.symbol,
        product.status,
        product.engineKey,
        product.sortOrder,
        now,
        now,
      );
    }
  });
  tx();
}

export function seedAppSettings(db: DB): void {
  const now = new Date().toISOString();
  const insert = db.prepare(
    'INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)',
  );
  const tx = db.transaction(() => {
    insert.run('shopier_store_url', '', now);
    insert.run('shopier_enabled', 'false', now);
  });
  tx();
}


export function seedCoupons(db: DB): void {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT OR IGNORE INTO coupons (
      id, code, percent_off, fixed_off_cents, active, max_uses, used_count,
      expires_at, created_at, updated_at
    ) VALUES ('coupon_meydan10', 'MEYDAN10', 10, 0, 1, 1000, 0, NULL, ?, ?)`,
  ).run(now, now);
}
