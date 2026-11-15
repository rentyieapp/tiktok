/**
 * Platform arcade: birden fazla canlı yayın mini oyunu için ortak tanımlar ve
 * sunucu taraflı, deterministik olmayan (canlı) simülasyon.
 *
 * Oyunlar TikMax / TikPlay ürünlerinden esinlenmiştir; isimler, görseller,
 * metinler ve mekanik yorumları bu proje için özgün olarak yazılmıştır.
 */

export const ARCADE_KEYS = [
  'dance',
  'press',
  'circle',
  'quiz',
  'word',
  'gladiator',
  'stick',
  'kart',
  'wheel',
  'tug',
  'versus',
  'horse',
  'horon',
  'sira',
  'latina',
  'concert',
  'ramwong',
  'hill',
  'grandprix',
  'town',
  'melon',
  'gold',
  'animal',
  'clash',
  'crowd',
  'balloon',
  'brick',
  'chest',
  'manor',
  'egg',
] as const;

export type ArcadeKey = (typeof ARCADE_KEYS)[number];
export type ArcadeMode =
  | 'dance'
  | 'press'
  | 'circle'
  | 'quiz'
  | 'word'
  | 'battle'
  | 'race'
  | 'wheel'
  | 'tug'
  | 'versus'
  | 'horse'
  | 'town'
  | 'melon'
  | 'gold';

export type ArcadeRisk = 'normal' | 'yuksek';

export interface ArcadeGameDef {
  key: ArcadeKey;
  slug: string;
  name: string;
  shortName: string;
  category: 'Eğlence' | 'Bilgi' | 'Arena' | 'Yarış';
  mode: ArcadeMode;
  symbol: string;
  accent: string;
  soft: string;
  ink: string;
  tagline: string;
  description: string;
  howTo: string[];
  controls: string[];
  warnings: string[];
  risk: ArcadeRisk;
  durationSec: number;
  maxPlayers: number;
  note?: string;
}

const GENERAL_WARNING =
  'TikTok kurallarına uyum ve yayın içeriğinin sorumluluğu yayıncıya aittir. Oyun ekranında hediye talebi veya hediye karşılığı vaat gösterilmez.';

export const ARCADE_GAMES: Record<ArcadeKey, ArcadeGameDef> = {
  dance: {
    key: 'dance',
    slug: 'sahne-90',
    name: 'Sahne 90',
    shortName: 'Sahne',
    category: 'Eğlence',
    mode: 'dance',
    symbol: '🪩',
    accent: '#e0558f',
    soft: '#fff0f6',
    ink: '#4a1530',
    tagline: 'Kalabalık pistte herkes kendi ritmini bulur.',
    description:
      'Yorum yazan izleyici pistteki yerini alır. Beğeniler tempo çubuğunu doldurur, hediyeler sahneye ışık ve özel figür gönderir. Süre bitince en çok enerji toplayan dansçı sahnede kalır.',
    howTo: [
      'Yoruma adını yaz, pistteki yerini al.',
      'Beğeni gönder, tempo çubuğu dolsun.',
      'Hediye ile sahneye ışık ve figür aç.',
      '90 saniye sonunda en yüksek enerji kazanır.',
    ],
    controls: ['Katıl', 'Beğen', 'Hediye', 'Yorum'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 90,
    maxPlayers: 30,
  },
  press: {
    key: 'press',
    slug: 'profil-matbaasi',
    name: 'Profil Matbaası',
    shortName: 'Matbaa',
    category: 'Eğlence',
    mode: 'press',
    symbol: '🖨️',
    accent: '#d97706',
    soft: '#fff8e8',
    ink: '#492c06',
    tagline: 'Profil kartın baskıdan çıksın.',
    description:
      'Yoruma “ben” yazan izleyicinin kartı matbaaya girer. Beğeni ve hediyeler baskıyı hızlandırır; her kart kendi çerçevesiyle ekranda birikir. En çok baskı yapan turu kazanır.',
    howTo: [
      'Yoruma “ben” yaz, kartın matbaaya gelsin.',
      'Beğeni ile baskı hızını artır.',
      'Hediye ile özel çerçeve ve renk aç.',
      'Tur sonunda en çok kartı basan kazanır.',
    ],
    controls: ['Katıl', 'Beğen', 'Hediye', 'Yorum'],
    warnings: [
      'Profil görsellerinin veya kullanıcı adlarının ekranda gösterilmesi bazı yayınlarda ihlal riski taşır. Kullanım sorumluluğu yayıncıdadır.',
      GENERAL_WARNING,
    ],
    risk: 'yuksek',
    durationSec: 75,
    maxPlayers: 20,
  },
  circle: {
    key: 'circle',
    slug: 'halka',
    name: 'Halka',
    shortName: 'Halka',
    category: 'Eğlence',
    mode: 'circle',
    symbol: '🕯️',
    accent: '#0f8a72',
    soft: '#eafaf5',
    ink: '#073b31',
    tagline: 'Kalabalık, merkezdeki fenerin çevresinde buluşur.',
    description:
      'Yorum yazan izleyici halkanın bir parçası olur ve sakin tempoda merkezdeki fenerin çevresinde döner. Amaç ritmi bozmadan halkayı büyütmek; en çok tur atan turu kazanır.',
    howTo: [
      'Yoruma adını yaz, halkaya katıl.',
      'Beğeni ile ritmi güçlendir.',
      'Hediye ile halkaya ışık taşı.',
      'Süre bitince en çok tur atan kazanır.',
    ],
    controls: ['Katıl', 'Beğen', 'Hediye'],
    warnings: [
      'Bu sahne dini bir ritüelin birebir kopyası değildir; merkezdeki soyut bir fener çevresinde dönen özgün bir kalabalık animasyonudur.',
      GENERAL_WARNING,
    ],
    risk: 'normal',
    durationSec: 80,
    maxPlayers: 36,
    note: 'Saygılı, soyut ve dinî olmayan bir kalabalık sahnesi.',
  },
  quiz: {
    key: 'quiz',
    slug: 'bilgi-arenasi',
    name: 'Bilgi Arenası',
    shortName: 'Bilgi',
    category: 'Bilgi',
    mode: 'quiz',
    symbol: '🧠',
    accent: '#2563eb',
    soft: '#eef4ff',
    ink: '#102a56',
    tagline: 'A, B, C, D: bilgiyi yayına taşı.',
    description:
      'Sunucu soruyu okur; izleyiciler yoruma doğru şıkkı yazar. Hızlı ve doğru cevap puan kazandırır. Beş sorunun sonunda en yüksek puan turun şampiyonu olur.',
    howTo: [
      'Yoruma A, B, C veya D yaz.',
      'Doğru cevap anında puan kazandırır.',
      'Üst üste doğru cevaplar seri bonusu verir.',
      'Beş soru sonunda en yüksek puan kazanır.',
    ],
    controls: ['Katıl', 'Yorum (A/B/C/D)'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 100,
    maxPlayers: 60,
  },
  word: {
    key: 'word',
    slug: 'harf-sehir',
    name: 'Harf Şehir',
    shortName: 'Harf',
    category: 'Bilgi',
    mode: 'word',
    symbol: '🔤',
    accent: '#7c3aed',
    soft: '#f5f0ff',
    ink: '#2e1065',
    tagline: 'Harf verilir, sen yazarsın.',
    description:
      'Kategori ve başlangıç harfi ekranda belirir. İzleyiciler şehir, isim, hayvan gibi cevapları yoruma yazar. Doğru ve hızlı cevap puan kazandırır; altı tur sonunda en yüksek puan kazanır.',
    howTo: [
      'Ekrandaki kategori ve harfe bak.',
      'O harfle başlayan bir cevap yaz.',
      'Doğru cevap puan kazandırır.',
      'Altı tur sonunda en yüksek puan kazanır.',
    ],
    controls: ['Katıl', 'Yorum'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 100,
    maxPlayers: 60,
  },
  gladiator: {
    key: 'gladiator',
    slug: 'arena-ustalari',
    name: 'Arena Ustaları',
    shortName: 'Arena',
    category: 'Arena',
    mode: 'battle',
    symbol: '⚔️',
    accent: '#b45309',
    soft: '#fff7ed',
    ink: '#431407',
    tagline: 'Otomatik dövüşte son kalan usta.',
    description:
      'Yoruma katılan izleyici arenaya bir usta olarak girer. Ustalar kendi kendine dövüşür; son ayakta kalan turu kazanır. Hediyeler kalkan, can ve güç verir.',
    howTo: [
      'Yoruma katıl, arenaya in.',
      'Ustan kendi kendine dövüşür.',
      'Hediye ile kalkan ve can desteği al.',
      'Son ayakta kalan şampiyon olur.',
    ],
    controls: ['Katıl', 'Beğen', 'Hediye'],
    warnings: [
      'Sanal, stilize bir dövüş animasyonu içerir; gerçek şiddet veya yaralanma tasviri yoktur.',
      GENERAL_WARNING,
    ],
    risk: 'normal',
    durationSec: 75,
    maxPlayers: 24,
  },
  stick: {
    key: 'stick',
    slug: 'cubuk-hayatta-kalma',
    name: 'Çubuk Hayatta Kalma',
    shortName: 'Çubuk',
    category: 'Arena',
    mode: 'battle',
    symbol: '🥢',
    accent: '#0e7490',
    soft: '#ecfeff',
    ink: '#083344',
    tagline: 'Küçük çubuklar, büyük kapışma.',
    description:
      'Çubuk savaşçılar aynı arenada, hepsi kendi kendine savaşır. Kalabalık büyüdükçe arena hareketlenir; son kalan çubuk şampiyon olur.',
    howTo: [
      'Yoruma katıl, çubuğun arenaya gelsin.',
      'Savaşçın otomatik dövüşsün.',
      'Beğeni ve hediye ile dayanıklılığını artır.',
      'Son kalan çubuk kazanır.',
    ],
    controls: ['Katıl', 'Beğen', 'Hediye'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 70,
    maxPlayers: 32,
  },
  kart: {
    key: 'kart',
    slug: 'piksel-yaris',
    name: 'Piksel Yarış',
    shortName: 'Piksel',
    category: 'Yarış',
    mode: 'race',
    symbol: '🏁',
    accent: '#dc2626',
    soft: '#fff1f1',
    ink: '#450a0a',
    tagline: 'Pikseller hızlanır, pist karışır.',
    description:
      'İzleyiciler kendi piksel aracıyla yarışır. Beğeni hız, hediye turbo etkisi kazandırır; pistteki engeller yarışı son saniyeye kadar değiştirir. Bitişe ilk ulaşan kazanır.',
    howTo: [
      'Yoruma katıl, aracın piste gelsin.',
      'Beğeni ile hızlan.',
      'Hediye ile turbo ve kısa kalkan aç.',
      'Bitişe ilk ulaşan kazanır.',
    ],
    controls: ['Katıl', 'Beğen', 'Hediye'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 80,
    maxPlayers: 24,
  },
  wheel: {
    key: 'wheel',
    slug: 'carkifelek',
    name: 'Çarkıfelek',
    shortName: 'Çark',
    category: 'Eğlence',
    mode: 'wheel',
    symbol: '🎡',
    accent: '#d97706',
    soft: '#fff7e8',
    ink: '#4a2c06',
    tagline: 'Şans, kalabalığın elinde döner.',
    description:
      'Yorum, beğeni ve hediyelerle çark bileti topla. Her turda çark döner; biletin arttıkça kazanma şansın yükselir. En çok çark turu kazanan yayının şanslısı olur.',
    howTo: [
      'Yoruma adını yaz, çarkta bir dilim kap.',
      'Beğeni ve hediye ile bilet topla.',
      'Çark her turda otomatik döner.',
      'En çok tur kazanan şanslı yayıncı olur.',
    ],
    controls: ['Katıl', 'Beğen', 'Hediye', 'Yorum'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 75,
    maxPlayers: 30,
  },
  tug: {
    key: 'tug',
    slug: 'halat-cekme',
    name: 'Halat Çekme',
    shortName: 'Halat',
    category: 'Arena',
    mode: 'tug',
    symbol: '🪢',
    accent: '#dc2626',
    soft: '#fff1f1',
    ink: '#450a0a',
    tagline: 'İki takım, tek halat, tek kazanan.',
    description:
      'İzleyiciler kırmızı veya mavi takıma dağılır. Beğeni ve hediyeler halatı kendi tarafına çeker. Ortadaki işareti rakip tarafa geçiren takım turu kazanır.',
    howTo: [
      'Yoruma adını yaz; takımın otomatik seçilir.',
      'Beğeni ile halatı çek.',
      'Hediye ile takımına güç ver.',
      'İşareti rakip tarafa geçiren takım kazanır.',
    ],
    controls: ['Katıl', 'Beğen', 'Hediye'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 70,
    maxPlayers: 40,
  },
  versus: {
    key: 'versus',
    slug: 'kizlar-vs-erkekler',
    name: 'Kızlar vs Erkekler',
    shortName: 'VS',
    category: 'Arena',
    mode: 'versus',
    symbol: '🚧',
    accent: '#db2777',
    soft: '#fff1f6',
    ink: '#4a0d2a',
    tagline: 'Duvarı karşı tarafa iten takım kazanır.',
    description:
      'İzleyiciler kızlar veya erkekler takımına katılır. Beğeni ve hediyelerle ortadaki duvarı rakip tarafa iter. Duvarı en ileri götüren takım turu kazanır.',
    howTo: [
      'Takımını seç: Kızlar veya Erkekler.',
      'Beğeni ile duvarı 0,5 metre it.',
      'Hediye ile duvara 8 metre güç ver.',
      'Duvarı rakip tarafa en çok iten takım kazanır.',
    ],
    controls: ['Katıl', 'Takım seç', 'Beğen', 'Hediye', 'Yorum'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 70,
    maxPlayers: 40,
  },
  horse: {
    key: 'horse',
    slug: 'at-yarisi',
    name: 'At Yarışı',
    shortName: 'At Yarışı',
    category: 'Yarış',
    mode: 'horse',
    symbol: '🏇',
    accent: '#b45309',
    soft: '#fff8e7',
    ink: '#422006',
    tagline: 'Jokeyini seç, atını zafere taşı.',
    description:
      'İzleyiciler 10 jokeyden birini seçer. Beğeni ve hediyelerle kendi jokeyinin atını ileri iter. Bitişe en önce ulaşan jokey turu kazanır; en çok destek veren izleyici yayının şampiyonu olur.',
    howTo: [
      'Yoruma jokey numarasını yaz (1–10).',
      'Beğeni ile atını 1 birim ileri it.',
      'Hediye ile 10 birim güç ver.',
      'Bitişe en önce ulaşan jokey kazanır.',
    ],
    controls: ['Katıl', 'Jokey seç', 'Beğen', 'Hediye', 'Yorum'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 80,
    maxPlayers: 40,
  },
  horon: {
    key: 'horon',
    slug: 'horon-halay',
    name: 'Horon & Halay',
    shortName: 'Horon',
    category: 'Eğlence',
    mode: 'dance',
    symbol: '🕺',
    accent: '#dc2626',
    soft: '#fff1f0',
    ink: '#450a0a',
    tagline: 'Horon, halay ve düğün coşkusu.',
    description:
      'İzleyiciler yorumla meydana iner; horon, halay ve düğün danslarıyla tempoyu yükseltir. Beğeni ve hediyeler müziği hızlandırır, en coşkulu dansçı turu kazanır.',
    howTo: ['Yoruma adını yaz.', 'Beğeniyle tempoyu artır.', 'Hediye ile sahneye coşku ver.', 'En yüksek puanı toplayan kazanır.'],
    controls: ['Katıl', 'Beğen', 'Hediye', 'Yorum'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 80,
    maxPlayers: 40,
  },
  sira: {
    key: 'sira',
    slug: 'sira-gecesi',
    name: 'Sıra Gecesi',
    shortName: 'Sıra',
    category: 'Eğlence',
    mode: 'dance',
    symbol: '🪕',
    accent: '#b45309',
    soft: '#fef7e7',
    ink: '#451a03',
    tagline: 'Saz, çay ve sohbet bir arada.',
    description:
      'Urfa sıra gecesi atmosferinde izleyiciler sıralara oturur. Saz ve türkü eşliğinde beğeni ve hediyelerle geceyi coşturur; en çok katkı veren geceyi kazanır.',
    howTo: ['Yoruma adını yaz.', 'Beğeniyle ritme katıl.', 'Hediye ile çalgıcıları coştur.', 'En yüksek puanı toplayan kazanır.'],
    controls: ['Katıl', 'Beğen', 'Hediye', 'Yorum'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 80,
    maxPlayers: 40,
  },
  latina: {
    key: 'latina',
    slug: 'noche-latina',
    name: 'Noche Latina',
    shortName: 'Latina',
    category: 'Eğlence',
    mode: 'dance',
    symbol: '💃',
    accent: '#db2777',
    soft: '#fdf2f8',
    ink: '#500724',
    tagline: 'Salsa, bachata, reggaetón.',
    description:
      'Latin dans kulübünde izleyiciler 3D dansçı olarak piste çıkar. Salsa, bachata ve reggaetón ritimleriyle yarışır; hediyeler DJ’i ve pisti coşturur.',
    howTo: ['Yoruma adını yaz.', 'Beğeniyle ritmi tut.', 'Hediye ile DJ’i coştur.', 'En yüksek puanı toplayan kazanır.'],
    controls: ['Katıl', 'Beğen', 'Hediye', 'Yorum'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 80,
    maxPlayers: 40,
  },
  concert: {
    key: 'concert',
    slug: 'live-concert',
    name: 'Live Concert',
    shortName: 'Konser',
    category: 'Eğlence',
    mode: 'dance',
    symbol: '🎤',
    accent: '#7c3aed',
    soft: '#f5f3ff',
    ink: '#2e1065',
    tagline: 'Sahne, ışıklar ve kalabalık.',
    description:
      'İzleyiciler sahnenin önünde 3D hayranlar olarak konsere katılır. Ritimle zıplar, kalabalıkta sörf yapar; hediyeler ışık gösterisini ve enerjiyi yükseltir.',
    howTo: ['Yoruma adını yaz.', 'Beğeniyle enerji ver.', 'Hediye ile sahneyi patlat.', 'En yüksek puanı toplayan kazanır.'],
    controls: ['Katıl', 'Beğen', 'Hediye', 'Yorum'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 80,
    maxPlayers: 50,
  },
  ramwong: {
    key: 'ramwong',
    slug: 'ramwong-fair',
    name: 'Ramwong Fair',
    shortName: 'Ramwong',
    category: 'Eğlence',
    mode: 'dance',
    symbol: '🏮',
    accent: '#ea580c',
    soft: '#fff7ed',
    ink: '#431407',
    tagline: 'Fenerler altında dans eden panayır.',
    description:
      'Tay tapınak panayırında izleyiciler fenerler altında Ramwong dansına katılır. Hediyeler sahneye fener, çiçek ve ritim getirir; en coşkulu dansçı kazanır.',
    howTo: ['Yoruma adını yaz.', 'Beğeniyle dans et.', 'Hediye ile fenerleri yak.', 'En yüksek puanı toplayan kazanır.'],
    controls: ['Katıl', 'Beğen', 'Hediye', 'Yorum'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 80,
    maxPlayers: 40,
  },
  hill: {
    key: 'hill',
    slug: 'tepe-firlamasi',
    name: 'Tepe Fırlaması',
    shortName: 'Tepe',
    category: 'Yarış',
    mode: 'race',
    symbol: '⛰️',
    accent: '#16a34a',
    soft: '#f0fdf4',
    ink: '#052e16',
    tagline: 'Gazı kökle, tepeyi fethet.',
    description: 'İzleyiciler kendi araçlarıyla tepeye tırmanır. Beğeni gaz, hediye nitro verir; zirveye ilk ulaşan kazanır.',
    howTo: ['Yoruma katıl.', 'Beğeni ile gaz ver.', 'Hediye ile nitro bas.', 'Zirveye ilk ulaşan kazanır.'],
    controls: ['Katıl', 'Beğen', 'Hediye', 'Yorum'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 75,
    maxPlayers: 30,
  },
  grandprix: {
    key: 'grandprix',
    slug: 'grand-prix',
    name: 'Grand Prix',
    shortName: 'GP',
    category: 'Yarış',
    mode: 'race',
    symbol: '🏎️',
    accent: '#dc2626',
    soft: '#fff1f2',
    ink: '#450a0a',
    tagline: 'Pistte zafer, sohbette güç.',
    description: 'F1 temalı pistte izleyiciler araçlarını ileri iter. Beğeni hız, hediye nitro etkisi yaratır; bitişe ilk ulaşan kazanır.',
    howTo: ['Yoruma katıl.', 'Beğeni ile hızlan.', 'Hediye ile nitro al.', 'Bitişe ilk gelen kazanır.'],
    controls: ['Katıl', 'Beğen', 'Hediye'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 70,
    maxPlayers: 20,
  },
  town: {
    key: 'town',
    slug: 'izleyici-kasabasi',
    name: 'İzleyici Kasabası',
    shortName: 'Kasaba',
    category: 'Eğlence',
    mode: 'town',
    symbol: '🏙️',
    accent: '#0e7490',
    soft: '#ecfeff',
    ink: '#083344',
    tagline: 'Kulübenden gökdelene yüksel.',
    description: 'Her izleyici kendi binasını büyütür. Beğeni ve hediyeler kat ekler; en yüksek binaya ulaşan kasabanın mimarı olur.',
    howTo: ['Yoruma katıl.', 'Beğeni ile kat ekle.', 'Hediye ile binanı büyüt.', 'En yüksek bina kazanır.'],
    controls: ['Katıl', 'Beğen', 'Hediye'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 75,
    maxPlayers: 30,
  },
  melon: {
    key: 'melon',
    slug: 'karpuz-patlatma',
    name: 'Karpuz Patlatma',
    shortName: 'Karpuz',
    category: 'Eğlence',
    mode: 'melon',
    symbol: '🍉',
    accent: '#15803d',
    soft: '#f0fdf4',
    ink: '#052e16',
    tagline: 'Bantlar gerildikçe karpuz çatlar.',
    description: 'İzleyiciler dev karpuzun etrafına lastik bant geçirir. Beğeni ve hediyeler gerginliği artırır; karpuzu patlatan turu kazanır.',
    howTo: ['Yoruma katıl.', 'Beğeni ile bant ekle.', 'Hediye ile gerginliği yükselt.', 'Karpuzu patlatan kazanır.'],
    controls: ['Katıl', 'Beğen', 'Hediye', 'Yorum'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 65,
    maxPlayers: 40,
  },
  gold: {
    key: 'gold',
    slug: 'altin-miknatisi',
    name: 'Altın Mıknatısı',
    shortName: 'Altın',
    category: 'Eğlence',
    mode: 'gold',
    symbol: '🧲',
    accent: '#d97706',
    soft: '#fffbeb',
    ink: '#451a03',
    tagline: 'Kasayı boşalt, altını çek.',
    description: 'İzleyiciler dev mıknatısla altın kasasını boşaltır. Beğeni ve hediyeler mıknatısı güçlendirir; en çok altın çeken kazanır.',
    howTo: ['Yoruma katıl.', 'Beğeni ile mıknatısı çek.', 'Hediye ile kasayı boşalt.', 'En çok altın çeken kazanır.'],
    controls: ['Katıl', 'Beğen', 'Hediye'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 70,
    maxPlayers: 40,
  },
  animal: {
    key: 'animal',
    slug: 'animal-run',
    name: 'Animal Run',
    shortName: 'Animal',
    category: 'Yarış',
    mode: 'race',
    symbol: '🐾',
    accent: '#ca8a04',
    soft: '#fefce8',
    ink: '#422006',
    tagline: 'Vahşi doğada hediye yarışı.',
    description: 'İzleyiciler hayvan yarışçılarını seçer. Beğeni hız, hediye roket etkisi verir; orman pistinde bitişe ilk ulaşan kazanır.',
    howTo: ['Yoruma katıl.', 'Beğeni ile koş.', 'Hediye ile roket al.', 'Bitişe ilk gelen kazanır.'],
    controls: ['Katıl', 'Beğen', 'Hediye'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 70,
    maxPlayers: 20,
  },
  clash: {
    key: 'clash',
    slug: 'team-clash',
    name: 'Team Clash',
    shortName: 'Clash',
    category: 'Arena',
    mode: 'versus',
    symbol: '⚔️',
    accent: '#b91c1c',
    soft: '#fef2f2',
    ink: '#450a0a',
    tagline: 'İki takım, tek meydan.',
    description: 'İzleyiciler A veya B yazarak kırmızı ya da mavi takıma katılır. Beğeni ve hediyeler duvarı iter; karşı tarafa geçiren takım kazanır.',
    howTo: ['A veya B yazarak takım seç.', 'Beğeni ile duvarı it.', 'Hediye ile özel saldırı yap.', 'Duvarı karşıya geçiren kazanır.'],
    controls: ['Katıl', 'Beğen', 'Hediye'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 80,
    maxPlayers: 60,
  },
  crowd: {
    key: 'crowd',
    slug: 'kalabalik-kosusu',
    name: 'Kalabalık Koşusu',
    shortName: 'Kalabalık',
    category: 'Yarış',
    mode: 'race',
    symbol: '🏃',
    accent: '#0d9488',
    soft: '#f0fdfa',
    ink: '#042f2e',
    tagline: 'Kalabalığın içinden öne fırla.',
    description: 'İzleyiciler kendi koşucularıyla şehir sokaklarında yarışır. Beğeni hız, hediye jetpack etkisi verir; bitişe ilk ulaşan kazanır.',
    howTo: ['Yoruma katıl.', 'Beğeni ile koş.', 'Hediye ile jetpack al.', 'Bitişe ilk gelen kazanır.'],
    controls: ['Katıl', 'Beğen', 'Hediye'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 70,
    maxPlayers: 50,
  },
  balloon: {
    key: 'balloon',
    slug: 'balon-savasi',
    name: 'Balon Savaşı',
    shortName: 'Balon',
    category: 'Arena',
    mode: 'race',
    symbol: '🎈',
    accent: '#e11d48',
    soft: '#fff1f2',
    ink: '#4c0519',
    tagline: 'Ülkenin balonu zirveye uçsun.',
    description: 'İzleyiciler ülkelerinin sıcak hava balonuna biner. Beğeni ve hediyeler balonu yükseltir; zirveye ilk ulaşan ülke kazanır.',
    howTo: ['Yoruma ülkeni yaz.', 'Beğeni ile balonu ısıt.', 'Hediye ile rüzgâr al.', 'Zirveye ilk ulaşan kazanır.'],
    controls: ['Katıl', 'Beğen', 'Hediye', 'Yorum'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 75,
    maxPlayers: 40,
  },
  brick: {
    key: 'brick',
    slug: 'tugla-kutusu',
    name: 'Brick Box',
    shortName: 'Brick',
    category: 'Eğlence',
    mode: 'town',
    symbol: '🧱',
    accent: '#2563eb',
    soft: '#eff6ff',
    ink: '#172554',
    tagline: 'Cam kutuyu tuğlalarla doldur.',
    description: 'Her yorum izleyicinin bloğunu kutuya bırakır. Beğeni ve hediyeler kutuyu hızla doldurur; en yüksek kuleyi yapan kazanır.',
    howTo: ['Yoruma katıl.', 'Yorumla blok bırak.', 'Hediye ile kutuyu doldur.', 'En yüksek kule kazanır.'],
    controls: ['Katıl', 'Beğen', 'Hediye', 'Yorum'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 70,
    maxPlayers: 40,
  },
  chest: {
    key: 'chest',
    slug: 'sandik-koyu',
    name: 'Chest Cove',
    shortName: 'Sandık',
    category: 'Eğlence',
    mode: 'gold',
    symbol: '🏴‍☠️',
    accent: '#b45309',
    soft: '#fffbeb',
    ink: '#451a03',
    tagline: 'Koyun sandıklarını tek tek aç.',
    description: 'Güneşli bir koyda dev sandık yığını var. İzleyiciler hediyelerle sandık açar; en çok hazineyi çıkaran korsan kazanır.',
    howTo: ['Yoruma katıl.', 'Beğeni ile sandığı yokla.', 'Hediye ile sandık aç.', 'En çok hazineyi çıkaran kazanır.'],
    controls: ['Katıl', 'Beğen', 'Hediye'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 70,
    maxPlayers: 40,
  },
  manor: {
    key: 'manor',
    slug: 'gece-konagi',
    name: 'Midnight Manor',
    shortName: 'Manor',
    category: 'Arena',
    mode: 'battle',
    symbol: '🕯️',
    accent: '#7c3aed',
    soft: '#f5f3ff',
    ink: '#2e1065',
    tagline: 'Perili konakta sabaha kadar kal.',
    description: 'İzleyiciler perili konakta hayatta kalmaya çalışır. Beğeni ve hediyeler savunma gücü verir; son kalan konaktan sağ çıkar.',
    howTo: ['Yoruma katıl.', 'Beğeni ile savun.', 'Hediye ile can topla.', 'Son kalan kazanır.'],
    controls: ['Katıl', 'Beğen', 'Hediye'],
    warnings: [GENERAL_WARNING],
    risk: 'yuksek',
    durationSec: 85,
    maxPlayers: 40,
  },
  egg: {
    key: 'egg',
    slug: 'yumurta-kirma',
    name: 'Egg Smash',
    shortName: 'Egg',
    category: 'Eğlence',
    mode: 'melon',
    symbol: '🥚',
    accent: '#d97706',
    soft: '#fffbeb',
    ink: '#451a03',
    tagline: 'Çelik tepside yumurtayı kır.',
    description: 'Dev yumurta çelik tepside asılı durur. İzleyiciler çivi ve toplarla vurur; çatlaklar yayılır, en çok hasarı veren kazanır.',
    howTo: ['Yoruma katıl.', 'Beğeni ile vur.', 'Hediye ile ağır darbe indir.', 'Yumurtayı kıran kazanır.'],
    controls: ['Katıl', 'Beğen', 'Hediye'],
    warnings: [GENERAL_WARNING],
    risk: 'normal',
    durationSec: 65,
    maxPlayers: 30,
  },
};

export interface HorseRacer {
  id: number;
  name: string;
  color: string;
  style: string;
}

/** Ülke yerine özgün jokey karakterleri. */
export const HORSE_RACERS: HorseRacer[] = [
  { id: 1, name: 'Deniz', color: '#dc2626', style: 'Kızıl' },
  { id: 2, name: 'Kaan', color: '#111827', style: 'Gece' },
  { id: 3, name: 'Elif', color: '#2563eb', style: 'Mavi' },
  { id: 4, name: 'Mert', color: '#16a34a', style: 'Yeşil' },
  { id: 5, name: 'Selin', color: '#f59e0b', style: 'Altın' },
  { id: 6, name: 'Bora', color: '#15803d', style: 'Orman' },
  { id: 7, name: 'Ece', color: '#e11d48', style: 'Gül' },
  { id: 8, name: 'Can', color: '#1d4ed8', style: 'Lacivert' },
  { id: 9, name: 'Nil', color: '#7c3aed', style: 'Mor' },
  { id: 10, name: 'Tuna', color: '#059669', style: 'Turkuaz' },
];

export const ARCADE_GAME_LIST: ArcadeGameDef[] = ARCADE_KEYS.map((key) => ARCADE_GAMES[key]);

export function isArcadeKey(value: string): value is ArcadeKey {
  return (ARCADE_KEYS as readonly string[]).includes(value);
}

export function findArcadeGameBySlug(slug: string): ArcadeGameDef | undefined {
  return ARCADE_GAME_LIST.find((game) => game.slug === slug || game.key === slug);
}

/* ------------------------------------------------------------------ */
/* Oyun içeriği                                                        */
/* ------------------------------------------------------------------ */

export interface QuizQuestion {
  id: string;
  category: string;
  question: string;
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
}

export function sanitizeQuizQuestions(value: unknown): QuizQuestion[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 50)
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      const category = String(row.category ?? '').trim().slice(0, 40);
      const question = String(row.question ?? '').trim().slice(0, 220);
      const rawOptions = Array.isArray(row.options) ? row.options : [];
      const options = rawOptions.slice(0, 4).map((option) => String(option ?? '').trim().slice(0, 90));
      const answer = Number(row.answer);
      if (
        category.length < 2 ||
        question.length < 5 ||
        options.length !== 4 ||
        options.some((option) => option.length < 1) ||
        !Number.isInteger(answer) ||
        answer < 0 ||
        answer > 3
      ) {
        return null;
      }
      return {
        id: String(row.id ?? `custom-${index + 1}`).slice(0, 40),
        category,
        question,
        options: options as [string, string, string, string],
        answer: answer as 0 | 1 | 2 | 3,
      };
    })
    .filter((row): row is QuizQuestion => Boolean(row));
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap]!, copy[index]!];
  }
  return copy;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    category: 'Coğrafya',
    question: 'Türkiye’nin en yüksek dağı hangisidir?',
    options: ['Erciyes', 'Ağrı Dağı', 'Uludağ', 'Süphan'],
    answer: 1,
  },
  {
    id: 'q2',
    category: 'Bilim',
    question: 'Su molekülü kaç atomdan oluşur?',
    options: ['2', '3', '4', '5'],
    answer: 1,
  },
  {
    id: 'q3',
    category: 'Tarih',
    question: 'Türkiye Cumhuriyeti hangi yıl kuruldu?',
    options: ['1919', '1920', '1923', '1928'],
    answer: 2,
  },
  {
    id: 'q4',
    category: 'Sanat',
    question: '“Mona Lisa” tablosu kime aittir?',
    options: ['Van Gogh', 'Picasso', 'Leonardo da Vinci', 'Michelangelo'],
    answer: 2,
  },
  {
    id: 'q5',
    category: 'Spor',
    question: 'Futbolda bir takım sahaya kaç oyuncuyla çıkar?',
    options: ['9', '10', '11', '12'],
    answer: 2,
  },
  {
    id: 'q6',
    category: 'Coğrafya',
    question: 'Türkiye’nin en uzun nehri hangisidir?',
    options: ['Kızılırmak', 'Fırat', 'Sakarya', 'Dicle'],
    answer: 0,
  },
  {
    id: 'q7',
    category: 'Bilim',
    question: 'Güneş sistemindeki en büyük gezegen hangisidir?',
    options: ['Satürn', 'Jüpiter', 'Neptün', 'Dünya'],
    answer: 1,
  },
  {
    id: 'q8',
    category: 'Tarih',
    question: 'İstanbul hangi yıl fethedildi?',
    options: ['1071', '1453', '1517', '1923'],
    answer: 1,
  },
  {
    id: 'q9',
    category: 'Edebiyat',
    question: '“İnce Memed” romanının yazarı kimdir?',
    options: ['Yaşar Kemal', 'Orhan Pamuk', 'Sabahattin Ali', 'Halide Edip'],
    answer: 0,
  },
  {
    id: 'q10',
    category: 'Bilim',
    question: 'İnsan vücudundaki en büyük organ hangisidir?',
    options: ['Karaciğer', 'Beyin', 'Deri', 'Akciğer'],
    answer: 2,
  },
  {
    id: 'q11',
    category: 'Coğrafya',
    question: 'Türkiye’nin başkenti neresidir?',
    options: ['İstanbul', 'İzmir', 'Ankara', 'Bursa'],
    answer: 2,
  },
  {
    id: 'q12',
    category: 'Eğlence',
    question: 'Bir yılda kaç mevsim vardır?',
    options: ['2', '3', '4', '5'],
    answer: 2,
  },
  {
    id: 'q13',
    category: 'Coğrafya',
    question: 'Japonya’nın başkenti hangisidir?',
    options: ['Kyoto', 'Tokyo', 'Osaka', 'Seul'],
    answer: 1,
  },
  {
    id: 'q14',
    category: 'Coğrafya',
    question: 'Amazon Nehri hangi kıtadadır?',
    options: ['Afrika', 'Asya', 'Güney Amerika', 'Kuzey Amerika'],
    answer: 2,
  },
  {
    id: 'q15',
    category: 'Tarih',
    question: 'Türkiye Cumhuriyeti’nin ilk cumhurbaşkanı kimdir?',
    options: ['İsmet İnönü', 'Mustafa Kemal Atatürk', 'Celal Bayar', 'Fevzi Çakmak'],
    answer: 1,
  },
  {
    id: 'q16',
    category: 'Bilim',
    question: 'Dünyanın en büyük okyanusu hangisidir?',
    options: ['Atlantik', 'Hint', 'Pasifik', 'Arktik'],
    answer: 2,
  },
  {
    id: 'q17',
    category: 'Bilim',
    question: 'Bitkiler fotosentezde hangi gazı kullanır?',
    options: ['Oksijen', 'Karbondioksit', 'Azot', 'Hidrojen'],
    answer: 1,
  },
  {
    id: 'q18',
    category: 'Edebiyat',
    question: '“Harry Potter” serisinin yazarı kimdir?',
    options: ['J. R. R. Tolkien', 'J. K. Rowling', 'George Orwell', 'Agatha Christie'],
    answer: 1,
  },
  {
    id: 'q19',
    category: 'Spor',
    question: '2024 Yaz Olimpiyatları hangi şehirde yapıldı?',
    options: ['Tokyo', 'Paris', 'Londra', 'Los Angeles'],
    answer: 1,
  },
  {
    id: 'q20',
    category: 'Sanat',
    question: 'İstiklal Marşı’nın sözleri kime aittir?',
    options: ['Mehmet Akif Ersoy', 'Yahya Kemal Beyatlı', 'Nazım Hikmet', 'Orhan Veli'],
    answer: 0,
  },
  {
    id: 'q21',
    category: 'Bilim',
    question: 'Karada yaşayan en hızlı hayvan hangisidir?',
    options: ['Aslan', 'Çita', 'At', 'Kurt'],
    answer: 1,
  },
  {
    id: 'q22',
    category: 'Coğrafya',
    question: 'Dünyada kaç kıta vardır?',
    options: ['5', '6', '7', '8'],
    answer: 2,
  },
  {
    id: 'q23',
    category: 'Bilim',
    question: 'Bilgisayarın “beyni” olarak bilinen parça hangisidir?',
    options: ['RAM', 'İşlemci', 'Ekran kartı', 'Hard disk'],
    answer: 1,
  },
  {
    id: 'q24',
    category: 'Eğlence',
    question: 'Bir yılda kaç ay vardır?',
    options: ['10', '11', '12', '13'],
    answer: 2,
  },
];

export const WORD_CATEGORIES: Record<string, string[]> = {
  Şehir: [
    'ADANA', 'ADAPAZARI', 'ADIYAMAN', 'AFYON', 'AKSARAY', 'AMASYA', 'ANKARA', 'ANTALYA',
    'ARDAHAN', 'ARTVİN', 'AYDIN', 'BALIKESİR', 'BARTIN', 'BATMAN', 'BAYBURT', 'BİLECİK',
    'BİNGÖL', 'BİTLİS', 'BOLU', 'BURDUR', 'BURSA', 'ÇANAKKALE', 'ÇANKIRI', 'ÇORUM',
    'DENİZLİ', 'DİYARBAKIR', 'DÜZCE', 'EDİRNE', 'ELAZIĞ', 'ERZİNCAN', 'ERZURUM', 'ESKİŞEHİR',
    'GAZİANTEP', 'GİRESUN', 'GÜMÜŞHANE', 'HAKKARİ', 'HATAY', 'IĞDIR', 'ISPARTA', 'İSTANBUL',
    'İZMİR', 'KAHİRAMANMARAŞ', 'KARABÜK', 'KARAMAN', 'KARS', 'KASTAMONU', 'KAYSERİ', 'KIRIKKALE',
    'KIRKLARELİ', 'KIRŞEHİR', 'KİLİS', 'KOCAELİ', 'KONYA', 'KÜTAHYA', 'MALATYA', 'MANİSA',
    'MARDİN', 'MERSİN', 'MUĞLA', 'MUŞ', 'NEVŞEHİR', 'NİĞDE', 'ORDU', 'OSMANİYE', 'RİZE',
    'SAKARYA', 'SAMSUN', 'SİİRT', 'SİNOP', 'SİVAS', 'ŞANLIURFA', 'ŞIRNAK', 'TEKİRDAĞ',
    'TOKAT', 'TRABZON', 'TUNCELİ', 'UŞAK', 'VAN', 'YALOVA', 'YOZGAT', 'ZONGULDAK',
  ],
  İsim: [
    'AHMET', 'ALİ', 'AYŞE', 'BANU', 'BURAK', 'CAN', 'CEM', 'DENİZ', 'DİLAN', 'ECE',
    'EDA', 'ELİF', 'EMRE', 'EZGİ', 'FATMA', 'GİZEM', 'HASAN', 'HÜLYA', 'İBRAHİM', 'İREM',
    'KEREM', 'LEYLA', 'MEHMET', 'MELİS', 'MERT', 'MİRA', 'MURAT', 'NAZ', 'NİL', 'ONUR',
    'ÖZGE', 'SELİN', 'SERKAN', 'SİNEM', 'TUNA', 'UTKU', 'YASEMİN', 'YUSUF', 'ZEYNEP', 'ZÜMRA',
  ],
  Hayvan: [
    'ARI', 'ASLAN', 'AYI', 'BALIK', 'BAYKUŞ', 'CEYLAN', 'DEVE', 'DOMUZ', 'EŞEK', 'FARE',
    'FİL', 'GERGEDAN', 'GÜVERCİN', 'HOROZ', 'KAPLAN', 'KARINCA', 'KARTAL', 'KEDİ', 'KEÇİ',
    'KIRLANGIÇ', 'KÖPEK', 'KOYUN', 'KUĞU', 'KURBAĞA', 'KURT', 'LEYLEK', 'MAYMUN', 'ÖRDEK',
    'PAPAĞAN', 'SERÇE', 'SİNCAP', 'TAVŞAN', 'TAVUK', 'TİLKİ', 'TİMSAH', 'YILAN', 'ZEBRA', 'ZÜRAFA',
  ],
  Bitki: [
    'AKASYA', 'ALG', 'ARDIÇ', 'AYÇİÇEĞİ', 'BAMBU', 'BEGONYA', 'ÇAM', 'ÇİĞDEM', 'DEFNE', 'DOMATES',
    'FESLEĞEN', 'FİDAN', 'GÜL', 'KAKTÜS', 'KARANFİL', 'KEKİK', 'LALE', 'LAVANTA', 'MANOLYA',
    'MENEKŞE', 'NANE', 'ORKİDE', 'PAPATYA', 'REYHAN', 'SARDUNYA', 'SÜMBÜL', 'ZAMBAK', 'ZEYTİN',
  ],
  Eşya: [
    'ANAHTAR', 'ARABA', 'AYNA', 'BALON', 'BARDAK', 'BATTANİYE', 'BİSİKLET', 'BULUT', 'ÇANTA',
    'ÇATAL', 'DEFTER', 'DOLAP', 'FENER', 'FINCAN', 'HALI', 'KALEM', 'KAPI', 'KASIK', 'KİTAP',
    'LAMBA', 'MAKAS', 'MASA', 'MİNARE', 'PERDE', 'SANDALYE', 'SAAT', 'TELEFON', 'TERLİK',
    'VALİZ', 'YASTIK', 'ZİL',
  ],
  Yemek: [
    'BAKLAVA', 'BÖREK', 'ÇORBA', 'DOLMA', 'DONDURMA', 'EKMEK', 'FASULYE', 'HURMA', 'İSKENDER',
    'KADAYIF', 'KEBAP', 'KÖFTE', 'KURU FASULYE', 'LAHMACUN', 'MANTI', 'MENEMEN', 'MERCİMEK',
    'PİLAV', 'PİZZA', 'SALATA', 'SİMİT', 'SOSİS', 'SÜTLAÇ', 'TATLI', 'TULUMBA', 'YOĞURT',
  ],
};

const WORD_SETS: Record<string, Set<string>> = Object.fromEntries(
  Object.entries(WORD_CATEGORIES).map(([key, words]) => [key, new Set(words)]),
);

export function normalizeWord(value: string): string {
  return value
    .trim()
    .toLocaleUpperCase('tr')
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:'"()]/g, '');
}

export function validWordAnswers(category: string, letter: string): string[] {
  return (WORD_CATEGORIES[category] ?? []).filter((word) => word.startsWith(letter));
}

/* ------------------------------------------------------------------ */
/* Simülasyon durumu                                                   */
/* ------------------------------------------------------------------ */

export type ArcadePhase = 'lobby' | 'running' | 'finished';

export interface ArcadePlayer {
  id: string;
  name: string;
  color: string;
  score: number;
  hp: number;
  maxHp: number;
  progress: number;
  eliminated: boolean;
  isBot: boolean;
  platform?: 'web' | 'twitch' | 'youtube' | 'tiktok';
  side?: 'red' | 'blue' | 'girls' | 'boys';
  lane?: number;
  avatar?: string;
  joinedAt: number;
  lastActionAt: number;
  answeredPrompt: number;
  rank: number;
  x: number;
  y: number;
  wins: number;
}

export interface ArcadePrompt {
  id: number;
  kind: 'quiz' | 'word';
  title: string;
  question: string;
  options?: string[];
  answerIndex?: number;
  category?: string;
  letter?: string;
  endsAt: number;
  reveal: boolean;
  nextAt: number | null;
}

export type ArcadeFeedKind = 'join' | 'like' | 'gift' | 'answer' | 'system' | 'win';

export interface ArcadeFeedItem {
  id: string;
  text: string;
  kind: ArcadeFeedKind;
  at: number;
}

export interface ArcadeWinner {
  playerId: string;
  name: string;
  score: number;
  label: string;
}

export interface WheelSpin {
  id: number;
  startedAt: number;
  endsAt: number;
  winnerId: string;
  winnerName: string;
  segment: number;
}

export interface WheelState {
  nextSpinAt: number;
  spin: WheelSpin | null;
}

export interface HorseLane {
  id: number;
  name: string;
  color: string;
  style: string;
  progress: number;
}

export interface HorseState {
  lanes: HorseLane[];
  winnerLane: number | null;
}

export interface WallState {
  girls: number;
  boys: number;
  position: number;
  winningSide: 'girls' | 'boys' | null;
  lastPushAt: number;
}

export interface TugState {
  red: number;
  blue: number;
  position: number;
  winningSide: 'red' | 'blue' | null;
  lastPullAt: number;
}

export interface ArcadeState {
  key: ArcadeKey;
  phase: ArcadePhase;
  round: number;
  now: number;
  lobbyEndsAt: number | null;
  startedAt: number | null;
  endsAt: number | null;
  finishedAt: number | null;
  players: ArcadePlayer[];
  prompt: ArcadePrompt | null;
  feed: ArcadeFeedItem[];
  winner: ArcadeWinner | null;
  promptCount: number;
  tick: number;
  wheel?: WheelState;
  tug?: TugState;
  quizPool?: QuizQuestion[];
  quizOrder?: number[];
  melon?: { tension: number };
  gold?: { pulled: number };
  wall?: WallState;
  horse?: HorseState;
  lastAction?: {
    id: string;
    playerId: string;
    kind: 'like' | 'gift' | 'comment';
    at: number;
  };
}

export interface ArcadeStateView extends ArcadeState {
  serverTime: number;
  me?: string;
}

const PLAYER_COLORS = [
  '#e0558f', '#2563eb', '#0f8a72', '#d97706', '#7c3aed', '#dc2626',
  '#0891b2', '#65a30d', '#c026d3', '#ea580c', '#4f46e5', '#0d9488',
];

const BOT_NAMES = [
  'Merve', 'Kaan', 'Elif', 'Deniz', 'Burak', 'Selin', 'Emre', 'Zeynep',
  'Can', 'İrem', 'Mert', 'Ece', 'Onur', 'Nil', 'Tuna', 'Yasemin',
];

let feedCounter = 0;

function feed(state: ArcadeState, text: string, kind: ArcadeFeedKind, at: number): void {
  feedCounter += 1;
  state.feed.unshift({ id: `f_${feedCounter}`, text, kind, at });
  if (state.feed.length > 12) state.feed.length = 12;
}

function rankPlayers(state: ArcadeState): void {
  const sorted = [...state.players].sort((a, b) => {
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    if (['gladiator', 'stick', 'manor'].includes(state.key)) {
      if (b.hp !== a.hp) return b.hp - a.hp;
    }
    if (['kart', 'hill', 'grandprix', 'animal', 'crowd', 'balloon'].includes(state.key)) return b.progress - a.progress;
    return b.score - a.score;
  });
  sorted.forEach((player, index) => {
    player.rank = index + 1;
  });
}

function ensurePositions(state: ArcadeState): void {
  const count = Math.max(1, state.players.length);
  state.players.forEach((player, index) => {
    const angle = (Math.PI * 2 * index) / count;
    player.x = Math.cos(angle) * 38;
    player.y = Math.sin(angle) * 30;
  });
}

export function createArcadeState(key: ArcadeKey, now = Date.now()): ArcadeState {
  return {
    key,
    phase: 'lobby',
    round: 1,
    now,
    lobbyEndsAt: null,
    startedAt: null,
    endsAt: null,
    finishedAt: null,
    players: [],
    prompt: null,
    feed: [],
    winner: null,
    promptCount: 0,
    tick: 0,
    wheel:
      key === 'wheel'
        ? { nextSpinAt: now + 6000, spin: null }
        : undefined,
    tug:
      key === 'tug'
        ? { red: 0, blue: 0, position: 0, winningSide: null, lastPullAt: now }
        : undefined,
    wall:
      ['versus', 'clash'].includes(key) || key === 'clash'
        ? { girls: 0, boys: 0, position: 0, winningSide: null, lastPushAt: now }
        : undefined,
    horse:
      key === 'horse'
        ? { lanes: HORSE_RACERS.map((racer) => ({ ...racer, progress: 0 })), winnerLane: null }
        : undefined,
    melon: ['melon', 'egg'].includes(key) ? { tension: 0 } : undefined,
    gold: ['gold', 'chest'].includes(key) ? { pulled: 0 } : undefined,
  };
}

export function addArcadePlayer(
  state: ArcadeState,
  input: {
    id: string;
    name: string;
    isBot?: boolean;
    platform?: 'web' | 'twitch' | 'youtube' | 'tiktok';
    now?: number;
    side?: 'red' | 'blue' | 'girls' | 'boys';
    lane?: number;
    avatar?: string;
  },
): ArcadePlayer | null {
  const now = input.now ?? Date.now();
  if (state.players.length >= ARCADE_GAMES[state.key].maxPlayers) return null;
  const existing = state.players.find((player) => player.id === input.id);
  if (existing) return existing;
  const cleanName = input.name.trim().slice(0, 18) || 'İzleyici';
  const redCount = state.players.filter((entry) => entry.side === 'red').length;
  const blueCount = state.players.filter((entry) => entry.side === 'blue').length;
  const girlsCount = state.players.filter((entry) => entry.side === 'girls').length;
  const boysCount = state.players.filter((entry) => entry.side === 'boys').length;
  const player: ArcadePlayer = {
    id: input.id,
    name: cleanName,
    color: PLAYER_COLORS[state.players.length % PLAYER_COLORS.length]!,
    score: 0,
    hp: 100,
    maxHp: 100,
    progress: 0,
    eliminated: false,
    isBot: Boolean(input.isBot),
    platform: input.platform ?? 'web',
    side:
      state.key === 'tug'
        ? (redCount <= blueCount ? 'red' : 'blue')
        : ['versus', 'clash'].includes(state.key)
          ? input.side === 'girls' || input.side === 'boys'
            ? input.side
            : girlsCount <= boysCount
              ? 'girls'
              : 'boys'
          : undefined,
    avatar: input.avatar,
    lane:
      state.key === 'horse'
        ? input.lane && input.lane >= 1 && input.lane <= HORSE_RACERS.length
          ? input.lane
          : 1 + Math.floor(Math.random() * HORSE_RACERS.length)
        : undefined,
    joinedAt: now,
    lastActionAt: 0,
    answeredPrompt: 0,
    rank: state.players.length + 1,
    x: 0,
    y: 0,
    wins: 0,
  };
  state.players.push(player);
  ensurePositions(state);
  feed(state, `${cleanName} ${state.key === 'press' ? 'matbaaya girdi' : 'oyuna katıldı'}.`, 'join', now);
  if (state.phase === 'lobby' && !state.lobbyEndsAt) {
    state.lobbyEndsAt = now + 5000;
  }
  rankPlayers(state);
  return player;
}

export function addDemoBots(state: ArcadeState, now = Date.now(), count = 7): void {
  const existingBots = state.players.filter((player) => player.isBot).length;
  for (let index = existingBots; index < count; index += 1) {
    const name = `${BOT_NAMES[index % BOT_NAMES.length]}`;
    addArcadePlayer(state, { id: `bot_${state.key}_${index}`, name, isBot: true, now });
  }
  state.feed = state.feed.filter((item) => !item.text.includes('katıldı') && !item.text.includes('matbaaya girdi'));
  feed(state, 'Demo kalabalığı sahneye yerleşti.', 'system', now);
}

function nextQuizPrompt(state: ArcadeState, now: number): void {
  const pool = state.quizPool?.length ? state.quizPool : QUIZ_QUESTIONS;
  if (!state.quizOrder || state.quizOrder.length !== pool.length) {
    state.quizOrder = shuffle(pool.map((_question, index) => index));
  }
  const index = state.quizOrder[state.promptCount % state.quizOrder.length]!;
  const question = pool[index % pool.length]!;
  state.promptCount += 1;
  state.prompt = {
    id: state.promptCount,
    kind: 'quiz',
    title: question.category,
    question: question.question,
    options: [...question.options],
    answerIndex: question.answer,
    endsAt: Math.min(state.endsAt ?? now + 18_000, now + 18_000),
    reveal: false,
    nextAt: null,
  };
}

function nextWordPrompt(state: ArcadeState, now: number): void {
  const categories = Object.keys(WORD_CATEGORIES);
  const category = categories[state.promptCount % categories.length]!;
  const words = WORD_CATEGORIES[category]!;
  const word = words[Math.floor(Math.random() * words.length)]!;
  state.promptCount += 1;
  state.prompt = {
    id: state.promptCount,
    kind: 'word',
    title: category,
    question: `${category} · “${word[0]}” harfiyle başlayan bir cevap yaz.`,
    category,
    letter: word[0],
    endsAt: Math.min(state.endsAt ?? now + 15_000, now + 15_000),
    reveal: false,
    nextAt: null,
  };
}

export function startArcadeRound(state: ArcadeState, now = Date.now()): void {
  if (state.players.length === 0) return;
  state.phase = 'running';
  state.round = state.round || 1;
  state.startedAt = now;
  state.endsAt = now + ARCADE_GAMES[state.key].durationSec * 1000;
  state.finishedAt = null;
  state.winner = null;
  state.prompt = null;
  state.promptCount = 0;
  for (const player of state.players) {
    player.score = 0;
    player.hp = 100;
    player.maxHp = 100;
    player.progress = 0;
    player.eliminated = false;
    player.answeredPrompt = 0;
    player.rank = 1;
    player.wins = 0;
  }
  ensurePositions(state);
  if (state.key === 'quiz') {
    state.quizOrder = [];
    nextQuizPrompt(state, now);
  }
  if (state.key === 'word') nextWordPrompt(state, now);
  if (state.key === 'wheel') state.wheel = { nextSpinAt: now + 5000, spin: null };
  if (state.key === 'tug') {
    state.tug = { red: 0, blue: 0, position: 0, winningSide: null, lastPullAt: now };
  }
  if (['versus', 'clash'].includes(state.key)) {
    state.wall = { girls: 0, boys: 0, position: 0, winningSide: null, lastPushAt: now };
  }
  if (state.key === 'horse') {
    state.horse = {
      lanes: HORSE_RACERS.map((racer) => ({ ...racer, progress: 0 })),
      winnerLane: null,
    };
  }
  if (['melon', 'egg'].includes(state.key)) state.melon = { tension: 0 };
  if (['gold', 'chest'].includes(state.key)) state.gold = { pulled: 0 };
  feed(state, 'Tur başladı. Kalabalık hazır!', 'system', now);
}

function finishArcadeRound(state: ArcadeState, now: number): void {
  state.phase = 'finished';
  state.finishedAt = now;
  state.endsAt = now;
  const alive = state.players.filter((player) => !player.eliminated);
  let winner: ArcadePlayer | undefined;
  if (['gladiator', 'stick', 'manor'].includes(state.key)) {
    winner = alive.length === 1 ? alive[0] : [...state.players].sort((a, b) => b.hp - a.hp)[0];
  } else if (['kart', 'hill', 'grandprix', 'animal', 'crowd', 'balloon', 'town', 'brick'].includes(state.key)) {
    winner = [...state.players].sort((a, b) => b.progress - a.progress)[0];
  } else if (['melon', 'egg'].includes(state.key) || ['gold', 'chest'].includes(state.key)) {
    winner = [...state.players].sort((a, b) => b.score - a.score)[0];
  } else if (state.key === 'wheel') {
    winner = [...state.players].sort(
      (a, b) => b.wins - a.wins || b.score - a.score,
    )[0];
  } else if (state.key === 'tug') {
    const side = state.tug?.winningSide ?? ((state.tug?.position ?? 0) >= 0 ? 'blue' : 'red');
    const team = state.players.filter((player) => player.side === side);
    winner = [...(team.length ? team : state.players)].sort((a, b) => b.score - a.score)[0];
    if (state.tug) state.tug.winningSide = side;
  } else if (['versus', 'clash'].includes(state.key)) {
    const side = state.wall?.winningSide ?? ((state.wall?.position ?? 0) >= 0 ? 'boys' : 'girls');
    const team = state.players.filter((player) => player.side === side);
    winner = [...(team.length ? team : state.players)].sort((a, b) => b.score - a.score)[0];
    if (state.wall) state.wall.winningSide = side;
  } else if (state.key === 'horse') {
    const lanes = state.horse?.lanes ?? [];
    const lane = [...lanes].sort((a, b) => b.progress - a.progress)[0];
    if (lane) {
      if (state.horse) state.horse.winnerLane = lane.id;
      const backers = state.players.filter((player) => player.lane === lane.id);
      winner = [...(backers.length ? backers : state.players)].sort((a, b) => b.score - a.score)[0];
    }
  } else {
    winner = [...state.players].sort((a, b) => b.score - a.score)[0];
  }
  if (winner) {
    winner.wins += 1;
    state.winner = {
      playerId: winner.id,
      name: winner.name,
      score: winner.score,
      label:
        state.key === 'quiz' || state.key === 'word'
          ? 'Bilgi şampiyonu'
          : state.key === 'kart'
            ? 'Pistin kazananı'
            : state.key === 'dance'
              ? 'Sahnenin yıldızı'
              : state.key === 'press'
                ? 'Matbaa ustası'
                : state.key === 'circle'
                  ? 'Halkanın kalbi'
                  : state.key === 'horon'
                    ? 'Meydanın yıldızı'
                    : state.key === 'sira'
                      ? 'Gecenin sesi'
                      : state.key === 'latina'
                        ? 'Pistin yıldızı'
                        : state.key === 'concert'
                          ? 'Sahnenin yıldızı'
                          : state.key === 'ramwong'
                            ? 'Panayırın yıldızı'
                            : state.key === 'hill'
                    ? 'Tepenin kralı'
                    : state.key === 'grandprix'
                      ? 'Pistin şampiyonu'
                      : state.key === 'animal'
                        ? 'Ormanın hızırı'
                        : state.key === 'crowd'
                          ? 'Sokağın hızırı'
                          : state.key === 'balloon'
                            ? 'Gökyüzünün fatihi'
                            : state.key === 'brick'
                              ? 'Kutunun ustası'
                              : state.key === 'chest'
                                ? 'Korsan hazinecisi'
                                : state.key === 'manor'
                                  ? 'Konağın bekçisi'
                                  : state.key === 'egg'
                                    ? 'Yumurta kırıcı'
                        : state.key === 'town'
                          ? 'Kasabanın mimarı'
                          : ['melon', 'egg'].includes(state.key)
                            ? 'Karpuzu patlatan'
                            : ['gold', 'chest'].includes(state.key)
                              ? 'Altın avcısı'
                              : state.key === 'clash'
                                ? 'Meydanın fatihi'
                                : state.key === 'wheel'
                    ? 'Çarkın şanslısı'
                    : state.key === 'tug'
                      ? state.tug?.winningSide === 'red'
                        ? 'Kırmızı Takım kazandı'
                        : 'Mavi Takım kazandı'
                      : ['versus', 'clash'].includes(state.key)
                        ? state.wall?.winningSide === 'girls'
                          ? 'Kızlar Takımı kazandı'
                          : 'Erkekler Takımı kazandı'
                        : state.key === 'horse'
                          ? `${state.horse?.lanes.find((lane) => lane.id === state.horse?.winnerLane)?.name ?? 'Jokey'} kazandı`
                          : 'Arenanın ustası',
    };
    feed(state, `${winner.name} turu kazandı!`, 'win', now);
  }
  rankPlayers(state);
}

function promptExpired(state: ArcadeState, now: number): void {
  const prompt = state.prompt;
  if (!prompt) return;
  if (now < prompt.endsAt) return;
  if (!prompt.reveal) {
    prompt.reveal = true;
    prompt.nextAt = now + 2600;
    return;
  }
  if (prompt.nextAt && now < prompt.nextAt) return;
  if (state.key === 'quiz') {
    if (state.promptCount >= 5) {
      finishArcadeRound(state, now);
      return;
    }
    nextQuizPrompt(state, now);
  } else if (state.key === 'word') {
    if (state.promptCount >= 6) {
      finishArcadeRound(state, now);
      return;
    }
    nextWordPrompt(state, now);
  }
}

export function arcadeTick(state: ArcadeState, now = Date.now()): void {
  state.now = now;
  state.tick += 1;

  if (state.phase === 'finished') {
    if (state.finishedAt && now - state.finishedAt > 7000) {
      state.phase = 'lobby';
      state.round += 1;
      state.winner = null;
      state.startedAt = null;
      state.endsAt = null;
      state.finishedAt = null;
      state.lobbyEndsAt = now + 5000;
      state.prompt = null;
      if (state.wheel) state.wheel = { nextSpinAt: now + 5000, spin: null };
      if (state.tug) {
        state.tug = { red: 0, blue: 0, position: 0, winningSide: null, lastPullAt: now };
      }
      if (state.wall) {
        state.wall = { girls: 0, boys: 0, position: 0, winningSide: null, lastPushAt: now };
      }
      if (state.horse) {
        state.horse = {
          lanes: HORSE_RACERS.map((racer) => ({ ...racer, progress: 0 })),
          winnerLane: null,
        };
      }
      if (state.melon) state.melon = { tension: 0 };
      if (state.gold) state.gold = { pulled: 0 };
      for (const player of state.players) {
        player.score = 0;
        player.hp = 100;
        player.progress = 0;
        player.eliminated = false;
        player.answeredPrompt = 0;
        player.rank = 1;
      }
      ensurePositions(state);
    }
    return;
  }

  if (state.phase === 'lobby') {
    if (state.players.length > 0 && state.lobbyEndsAt && now >= state.lobbyEndsAt) {
      startArcadeRound(state, now);
    }
    return;
  }

  if (state.endsAt && now >= state.endsAt) {
    finishArcadeRound(state, now);
    return;
  }

  if (state.prompt) {
    promptExpired(state, now);
    if (state.phase !== 'running') return;
  }

  if (state.key === 'quiz' || state.key === 'word') {
    if (!state.prompt) {
      if (state.key === 'quiz') {
    state.quizOrder = [];
    nextQuizPrompt(state, now);
  }
      else nextWordPrompt(state, now);
    }
    rankPlayers(state);
    return;
  }

  if (state.key === 'wheel') {
    const wheel = state.wheel;
    if (wheel && now >= wheel.nextSpinAt && state.players.length > 0) {
      const tickets = state.players.map((player) => Math.max(1, player.score));
      const total = tickets.reduce((sum, value) => sum + value, 0);
      let pick = Math.random() * total;
      let segment = 0;
      for (let index = 0; index < tickets.length; index += 1) {
        pick -= tickets[index]!;
        if (pick <= 0) {
          segment = index;
          break;
        }
      }
      const winner = state.players[segment];
      if (winner) {
        winner.wins += 1;
        winner.score += 60;
        wheel.spin = {
          id: state.tick,
          startedAt: now,
          endsAt: now + 3200,
          winnerId: winner.id,
          winnerName: winner.name,
          segment,
        };
        wheel.nextSpinAt = now + 6800;
        feed(state, `Çark ${winner.name} için durdu!`, 'win', now);
      }
    }
    rankPlayers(state);
    return;
  }

  if (state.key === 'tug') {
    const tug = state.tug;
    if (tug) {
      tug.position = Math.max(-1, Math.min(1, (tug.blue - tug.red) / 100));
      if (Math.abs(tug.position) >= 1) {
        tug.winningSide = tug.position >= 0 ? 'blue' : 'red';
        finishArcadeRound(state, now);
        return;
      }
    }
    rankPlayers(state);
    return;
  }

  if (['versus', 'clash'].includes(state.key)) {
    const wall = state.wall;
    if (wall) {
      wall.position = Math.max(-1, Math.min(1, (wall.boys - wall.girls) / 20));
      if (Math.abs(wall.position) >= 1) {
        wall.winningSide = wall.position >= 0 ? 'boys' : 'girls';
        finishArcadeRound(state, now);
        return;
      }
    }
    rankPlayers(state);
    return;
  }

  if (state.key === 'horse') {
    const horse = state.horse;
    if (horse) {
      for (const lane of horse.lanes) {
        lane.progress = Math.min(100, lane.progress + 0.045 + Math.random() * 0.045);
      }
      const leader = [...horse.lanes].sort((a, b) => b.progress - a.progress)[0];
      if (leader && leader.progress >= 100) {
        horse.winnerLane = leader.id;
        finishArcadeRound(state, now);
        return;
      }
    }
    rankPlayers(state);
    return;
  }

  if (['kart', 'hill', 'grandprix', 'animal', 'crowd', 'balloon', 'town', 'brick'].includes(state.key)) {
    for (const player of state.players) {
      if (player.eliminated) continue;
      const base = state.key === 'town' ? 0.5 : state.key === 'grandprix' ? 0.7 : 0.62;
      player.progress += base + (player.isBot ? 0.08 : 0.04) + Math.random() * 0.24;
      if (player.progress >= 100) {
        player.progress = 100;
        finishArcadeRound(state, now);
        return;
      }
    }
    rankPlayers(state);
    return;
  }

  if (['melon', 'egg'].includes(state.key)) {
    if (state.melon) {
      state.melon.tension = Math.min(100, state.melon.tension + 0.18 + Math.random() * 0.12);
      if (state.melon.tension >= 100) {
        finishArcadeRound(state, now);
        return;
      }
    }
    rankPlayers(state);
    return;
  }

  if (['gold', 'chest'].includes(state.key)) {
    if (state.gold) {
      state.gold.pulled = Math.min(100, state.gold.pulled + 0.22 + Math.random() * 0.1);
      if (state.gold.pulled >= 100) {
        finishArcadeRound(state, now);
        return;
      }
    }
    rankPlayers(state);
    return;
  }

  if (['gladiator', 'stick', 'manor'].includes(state.key)) {
    state.players.forEach((player) => {
      if (player.eliminated || Math.random() > 0.22) return;
      const targets = state.players.filter((other) => other.id !== player.id && !other.eliminated);
      if (targets.length === 0) return;
      const target = targets[Math.floor(Math.random() * targets.length)]!;
      const damage = 5 + Math.floor(Math.random() * 9);
      target.hp = Math.max(0, target.hp - damage);
      if (target.hp === 0) {
        target.eliminated = true;
        feed(state, `${target.name} arenadan çekildi.`, 'system', now);
      }
    });
    const alive = state.players.filter((player) => !player.eliminated);
    if (alive.length <= 1 && state.players.length > 1) {
      finishArcadeRound(state, now);
      return;
    }
    rankPlayers(state);
    return;
  }

  // dance / press / circle: yavaş pasif enerji, izleyici etkileşimiyle hızlanır.
  for (const player of state.players) {
    const passive = player.isBot ? 0.16 : 0.05;
    player.score += passive + (player.score < 40 ? 0.03 : 0);
    player.progress = Math.min(100, player.score);
  }
  rankPlayers(state);
}

export type ArcadeActionKind = 'like' | 'gift' | 'comment';

export interface ArcadeActionResult {
  ok: boolean;
  message?: string;
  correct?: boolean;
}

export function arcadeAction(
  state: ArcadeState,
  playerId: string,
  action: ArcadeActionKind,
  payload: string,
  now = Date.now(),
): ArcadeActionResult {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) return { ok: false, message: 'Önce oyuna katıl.' };
  if (state.phase !== 'running') return { ok: false, message: 'Tur henüz başlamadı.' };
  if (now - player.lastActionAt < 350) return { ok: false, message: 'Biraz yavaş.' };
  player.lastActionAt = now;
  state.lastAction = {
    id: `act_${now}_${player.id}_${action}`,
    playerId: player.id,
    kind: action,
    at: now,
  };

  if (action === 'like') {
    if (state.key === 'wheel') player.score += 3;
    else if (state.key === 'tug' && state.tug) addTugPull(state, player, 1.2);
    else if (['versus', 'clash'].includes(state.key) && state.wall) addWallPush(state, player, 0.5);
    else if (state.key === 'horse') pushHorse(state, player, 1);
    else if (['hill', 'grandprix', 'animal', 'crowd', 'balloon', 'town', 'brick'].includes(state.key)) player.progress = Math.min(100, player.progress + 1.2);
    else if (['melon', 'egg'].includes(state.key) && state.melon) { state.melon.tension = Math.min(100, state.melon.tension + 1); player.score += 1; }
    else if (['gold', 'chest'].includes(state.key) && state.gold) { state.gold.pulled = Math.min(100, state.gold.pulled + 1); player.score += 1; }
    else player.score += state.key === 'quiz' || state.key === 'word' ? 0 : 1.5;
    feed(
      state,
      state.key === 'tug'
        ? `${player.name} halatı çekti (${player.side === 'red' ? 'kırmızı' : 'mavi'}).`
        : ['versus', 'clash'].includes(state.key)
          ? `${player.name} duvarı itti (${player.side === 'girls' ? 'kızlar' : 'erkekler'}).`
          : state.key === 'horse'
            ? `${player.name} atını ileri itti (${state.horse?.lanes.find((lane) => lane.id === player.lane)?.name ?? 'jokey'}).`
            : `${player.name} beğeni gönderdi.`,
      'like',
      now,
    );
    return { ok: true };
  }

  if (action === 'gift') {
    if (['kart', 'hill', 'grandprix', 'animal', 'crowd', 'balloon'].includes(state.key)) player.progress = Math.min(100, player.progress + 7);
    if (['gladiator', 'stick', 'manor'].includes(state.key)) {
      player.hp = Math.min(player.maxHp, player.hp + 16);
    }
    if (state.key === 'wheel') player.score += 25;
    else if (state.key === 'tug' && state.tug) addTugPull(state, player, 13);
    else if (['versus', 'clash'].includes(state.key) && state.wall) addWallPush(state, player, 8);
    else if (state.key === 'horse') pushHorse(state, player, 10);
    else if (['hill', 'grandprix', 'animal', 'crowd', 'balloon', 'town', 'brick'].includes(state.key)) player.progress = Math.min(100, player.progress + 12);
    else if (['melon', 'egg'].includes(state.key) && state.melon) { state.melon.tension = Math.min(100, state.melon.tension + 10); player.score += 10; }
    else if (['gold', 'chest'].includes(state.key) && state.gold) { state.gold.pulled = Math.min(100, state.gold.pulled + 10); player.score += 10; }
    else player.score += state.key === 'quiz' || state.key === 'word' ? 0 : 12;
    feed(
      state,
      state.key === 'tug'
        ? `${player.name} takımına güç verdi (${player.side === 'red' ? 'kırmızı' : 'mavi'}).`
        : ['versus', 'clash'].includes(state.key)
          ? `${player.name} duvara 8 metre güç verdi.`
          : state.key === 'horse'
            ? `${player.name} atına hediye gücü verdi.`
            : `${player.name} hediye gönderdi.`,
      'gift',
      now,
    );
    return { ok: true };
  }

  // comment
  if (['hill', 'grandprix', 'animal', 'crowd', 'balloon', 'town', 'brick'].includes(state.key)) {
    player.progress = Math.min(100, player.progress + 0.5);
    feed(state, `${player.name} tempoyu artırdı.`, 'answer', now);
    return { ok: true };
  }
  if (['melon', 'egg'].includes(state.key) && state.melon) {
    state.melon.tension = Math.min(100, state.melon.tension + 0.4);
    player.score += 0.4;
    feed(state, state.key === 'egg' ? `${player.name} yumurtaya çivi fırlattı.` : `${player.name} bir bant daha gerdi.`, 'answer', now);
    return { ok: true };
  }
  if (['gold', 'chest'].includes(state.key) && state.gold) {
    state.gold.pulled = Math.min(100, state.gold.pulled + 0.4);
    player.score += 0.4;
    feed(state, `${player.name} mıknatısı çekti.`, 'answer', now);
    return { ok: true };
  }
  if (state.key === 'horse') {
    const laneNumber = Number.parseInt(payload.trim(), 10);
    if (laneNumber >= 1 && laneNumber <= HORSE_RACERS.length) {
      player.lane = laneNumber;
      feed(state, `${player.name} ${HORSE_RACERS[laneNumber - 1]!.name} hattına geçti.`, 'answer', now);
      return { ok: true };
    }
    pushHorse(state, player, 0.5);
    feed(state, `${player.name} atını dürttü.`, 'answer', now);
    return { ok: true };
  }
  if (state.key === 'wheel') {
    player.score += 1;
    feed(state, `${player.name} çarka bilet ekledi.`, 'answer', now);
    return { ok: true };
  }
  if (state.key === 'tug' && state.tug) {
    addTugPull(state, player, 0.5);
    feed(state, `${player.name} halata asıldı.`, 'answer', now);
    return { ok: true };
  }
  if (['versus', 'clash'].includes(state.key) && state.wall) {
    addWallPush(state, player, 0.2);
    feed(state, `${player.name} duvarı dürttü.`, 'answer', now);
    return { ok: true };
  }
  if (state.key === 'quiz' && state.prompt?.kind === 'quiz') {
    if (state.prompt.reveal) return { ok: false, message: 'Bu sorunun süresi doldu.' };
    if (player.answeredPrompt === state.prompt.id) {
      return { ok: false, message: 'Bu soruya zaten cevap verdin.' };
    }
    const text = payload.trim().toLocaleUpperCase('tr');
    const optionIndex = ['A', 'B', 'C', 'D'].indexOf(text);
    const byText = state.prompt.options?.findIndex(
      (option) => option.toLocaleUpperCase('tr') === text,
    );
    const chosen = optionIndex >= 0 ? optionIndex : byText ?? -1;
    if (chosen < 0) {
      return { ok: false, message: 'A, B, C veya D yaz.' };
    }
    player.answeredPrompt = state.prompt.id;
    const correct = chosen === state.prompt.answerIndex;
    if (correct) {
      player.score += 100;
      player.hp = Math.min(100, player.hp + 2);
      feed(state, `${player.name} doğru cevabı buldu.`, 'answer', now);
    } else {
      feed(state, `${player.name} yanlış şık seçti.`, 'answer', now);
    }
    return { ok: true, correct };
  }

  if (state.key === 'word' && state.prompt?.kind === 'word') {
    if (state.prompt.reveal) return { ok: false, message: 'Bu turun süresi doldu.' };
    if (player.answeredPrompt === state.prompt.id) {
      return { ok: false, message: 'Bu turda zaten cevap verdin.' };
    }
    const normalized = normalizeWord(payload);
    const category = state.prompt.category ?? '';
    const letter = state.prompt.letter ?? '';
    const words = WORD_SETS[category];
    const correct = Boolean(
      words?.has(normalized) && normalized.startsWith(letter) && normalized.length >= 3,
    );
    player.answeredPrompt = state.prompt.id;
    if (correct) {
      player.score += 100;
      feed(state, `${player.name} “${normalized}” dedi.`, 'answer', now);
    } else {
      feed(state, `${player.name} cevap denedi.`, 'answer', now);
    }
    return { ok: true, correct };
  }

  player.score += 0.5;
  feed(state, `${player.name}: ${payload.slice(0, 60)}`, 'answer', now);
  return { ok: true };
}

function pushHorse(state: ArcadeState, player: ArcadePlayer, amount: number): void {
  if (!state.horse || !player.lane) return;
  const lane = state.horse.lanes.find((entry) => entry.id === player.lane);
  if (!lane) return;
  lane.progress = Math.min(100, lane.progress + amount);
  player.score += amount;
}

function addWallPush(state: ArcadeState, player: ArcadePlayer, amount: number): void {
  if (!state.wall) return;
  const side = player.side === 'boys' ? 'boys' : 'girls';
  player.side = side;
  if (side === 'girls') state.wall.girls += amount;
  else state.wall.boys += amount;
  player.score += amount;
  state.wall.position = Math.max(-1, Math.min(1, (state.wall.boys - state.wall.girls) / 20));
  state.wall.lastPushAt = state.now;
}

function addTugPull(state: ArcadeState, player: ArcadePlayer, amount: number): void {
  if (!state.tug) return;
  const side = player.side ?? (state.tug.red <= state.tug.blue ? 'red' : 'blue');
  player.side = side;
  if (side === 'red') state.tug.red += amount;
  else state.tug.blue += amount;
  player.score += amount;
  state.tug.position = Math.max(-1, Math.min(1, (state.tug.blue - state.tug.red) / 100));
  state.tug.lastPullAt = state.now;
}

export function arcadeRunBots(state: ArcadeState, now = Date.now()): void {
  if (state.phase !== 'running') return;
  for (const player of state.players) {
    if (!player.isBot || Math.random() > 0.09) continue;
    const roll = Math.random();
    if (state.key === 'wheel') {
      player.score += roll < 0.75 ? 2 : 8;
      continue;
    }
    if (state.key === 'tug' && state.tug) {
      addTugPull(state, player, roll < 0.75 ? 1 : 7);
      continue;
    }
    if (['versus', 'clash'].includes(state.key)) {
      addWallPush(state, player, roll < 0.75 ? 0.5 : 4);
      continue;
    }
    if (state.key === 'horse') {
      pushHorse(state, player, roll < 0.75 ? 1 : 6);
      continue;
    }
    if (['hill', 'grandprix', 'animal', 'crowd', 'balloon', 'town', 'brick'].includes(state.key)) {
      player.progress = Math.min(100, player.progress + (roll < 0.75 ? 1 : 6));
      continue;
    }
    if (['melon', 'egg'].includes(state.key) && state.melon) {
      state.melon.tension = Math.min(100, state.melon.tension + (roll < 0.75 ? 1 : 5));
      player.score += roll < 0.75 ? 1 : 5;
      continue;
    }
    if (['gold', 'chest'].includes(state.key) && state.gold) {
      state.gold.pulled = Math.min(100, state.gold.pulled + (roll < 0.75 ? 1 : 5));
      player.score += roll < 0.75 ? 1 : 5;
      continue;
    }
    if (state.key === 'quiz' && state.prompt?.kind === 'quiz') {
      if (player.answeredPrompt === state.prompt.id) continue;
      const correct = roll < 0.38;
      const answer = correct
        ? state.prompt.answerIndex ?? 0
        : Math.floor(Math.random() * 4);
      player.answeredPrompt = state.prompt.id;
      if (answer === state.prompt.answerIndex) player.score += 100;
      continue;
    }
    if (state.key === 'word' && state.prompt?.kind === 'word') {
      if (player.answeredPrompt === state.prompt.id) continue;
      const options = validWordAnswers(state.prompt.category ?? '', state.prompt.letter ?? '');
      if (options.length === 0) continue;
      player.answeredPrompt = state.prompt.id;
      player.score += 100;
      continue;
    }
  if (['kart', 'hill', 'grandprix', 'animal', 'crowd', 'balloon'].includes(state.key)) {
      player.progress = Math.min(100, player.progress + 2);
      continue;
    }
    if (['gladiator', 'stick', 'manor'].includes(state.key)) {
      if (roll < 0.5) player.hp = Math.min(player.maxHp, player.hp + 4);
      continue;
    }
    player.score += roll < 0.75 ? 1 : 6;
  }
}

export function arcadeView(state: ArcadeState, me?: string): ArcadeStateView {
  const view: ArcadeStateView = {
    ...state,
    players: state.players.map((player) => ({ ...player })),
    feed: [...state.feed],
    prompt: state.prompt ? { ...state.prompt } : null,
    serverTime: Date.now(),
    me,
  };
  if (view.prompt && !view.prompt.reveal) {
    delete view.prompt.answerIndex;
  }
  return view;
}
