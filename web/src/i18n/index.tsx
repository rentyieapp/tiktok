import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { EN_TEXT } from './en';

export type Locale = 'tr' | 'en';

const STORAGE_KEY = 'rookworks_locale';

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: 'tr',
  setLocale: () => undefined,
});

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'tr') return saved;
  } catch {
    /* yoksay */
  }
  return 'tr';
}

const OVERRIDES: Record<string, string> = {
  'Rook Works': 'Rook Works',
  'Taraftar Savaşı': 'Fan Battle',
  'Taraftar Savaşı 3D': 'Fan Battle 3D',
  'Sahne 90': 'Stage 90',
  'Profil Matbaası': 'Profile Press',
  'Bilgi Arenası': 'Knowledge Arena',
  'Harf Şehir': 'Letter City',
  'Arena Ustaları': 'Arena Masters',
  'Çubuk Hayatta Kalma': 'Stick Survival',
  'Piksel Yarış': 'Pixel Race',
  'Çarkıfelek': 'Wheel of Fortune',
  'Halat Çekme': 'Tug of War',
  'Kızlar vs Erkekler': 'Girls vs Boys',
  'At Yarışı': 'Horse Race',
  Halka: 'The Circle',
  Sahne: 'Stage',
  Matbaa: 'Press',
  Bilgi: 'Knowledge',
  Arena: 'Arena',
  Harf: 'Letter',
  Çubuk: 'Stick',
  Piksel: 'Pixel',
  Çark: 'Wheel',
  Halat: 'Tug',
  Kızlar: 'Girls',
  Erkekler: 'Boys',
};

const PHRASE_EN: Record<string, string> = {
  'Lisans yok': 'No license',
  'Lisanslı': 'Licensed',
  'Kilitli': 'Locked',
  'Yayında': 'Live',
  'Yayına hazır': 'Ready to publish',
  'Duraklatıldı': 'Paused',
  'Aktif oyun': 'Active games',
  'Canlı oda': 'Live room',
  'Oynanan tur': 'Rounds played',
  '3D stüdyo': '3D studio',
  'Oyun Platformu': 'Game Platform',
  'Profesyonel': 'Professional',
  'Son kazanan': 'Last winner',
  'Bitiş': 'Expires',
  'Oyun lisansı gerekli': 'Game license required',
  'Oyun lisansın aktif': 'Your game license is active',
  'Bu oyun lisans gerektirir': 'This game requires a license',
  'Günde 30 dk ücretsiz dene': 'Try 30 minutes free per day',
  'Önizleme': 'Preview',
  'Kalan süre': 'Time left',
  'Bilet sıralaması': 'Ticket ranking',
  'Bilet': 'Tickets',
  'Kırmızı': 'Red',
  'Mavi': 'Blue',
  'Kızlar': 'Girls',
  'Erkekler': 'Boys',
  'Beraberlik': 'Draw',
  'arena': 'Arena',
  'Arena': 'Arena',
  'takım': 'teams',
  'oyuncu': 'players',
  'izleyici': 'viewers',
  'tur': 'rounds',
  'oda': 'room',
  'maç': 'match',
  'gün': 'days',
  'dk': 'min',
  'ay': 'months',
  'yıl': 'years',
  'kişi': 'people',
  'Pixel Yarış': 'Pixel Race',
  'oda toplam': 'total rooms',
  'arcade toplamı': 'arcade total',
  'arcade sum': 'arcade total',
  '1 oda toplam': '1 room total',
};

const TOKEN_EN: Array<[RegExp, string]> = [
  [/^Merhaba,\s*(.+)$/i, 'Hello, $1'],
  [/^(\d+)\s+takım\s+·\s+3D\s+stüdyo$/i, '$1 teams · 3D studio'],
  [/^(\d+)\s+tur$/i, '$1 rounds'],
  [/^(\d+)\s+takım$/i, '$1 teams'],
  [/^(\d+)\s+oyuncu$/i, '$1 players'],
  [/^(\d+)\s+oyun$/i, '$1 games'],
  [/^(\d+)\s+game$/i, '$1 games'],
  [/^(\d+)\s+takım$/i, '$1 teams'],
  [/^(\d+)\s+gün$/i, '$1 days'],
  [/^(\d+)\s+saat$/i, '$1 hours'],
  [/^(\d+)\s+dk$/i, '$1 min'],
  [/\bTaraftar Savaşı 3D\b/g, 'Fan Battle 3D'],
  [/\bSahne 90\b/g, 'Stage 90'],
  [/\bProfil Matbaası\b/g, 'Profile Press'],
  [/\bBilgi Arenası\b/g, 'Knowledge Arena'],
  [/\bHarf Şehir\b/g, 'Letter City'],
  [/\bArena Ustaları\b/g, 'Arena Masters'],
  [/\bÇubuk Hayatta Kalma\b/g, 'Stick Survival'],
  [/\bPiksel Yarış\b/g, 'Pixel Race'],
  [/\bÇarkıfelek\b/g, 'Wheel of Fortune'],
  [/\bHalat Çekme\b/g, 'Tug of War'],
  [/\bKızlar vs Erkekler\b/g, 'Girls vs Boys'],
  [/\bAt Yarışı\b/g, 'Horse Race'],
  [/\bTaraftar Savaşı\b/g, 'Fan Battle'],
  [/\bHalka\b/g, 'The Circle'],
  [/\bSahne\b/g, 'Stage'],
  [/\bMatbaa\b/g, 'Press'],
  [/\bBilgi\b/g, 'Knowledge'],
  [/\bHarf\b/g, 'Letter'],
  [/\bÇubuk\b/g, 'Stick'],
  [/\bPiksel\b/g, 'Pixel'],
  [/\bÇark\b/g, 'Wheel'],
  [/\bHalat\b/g, 'Tug'],
  [/\bKızlar\b/g, 'Girls'],
  [/\bErkekler\b/g, 'Boys'],
];

const EN_NORMALIZED = new Map(
  Object.entries({ ...EN_TEXT, ...OVERRIDES }).map(([key, value]) => [key.replace(/\s+/g, ' ').trim(), value]),
);

const DYNAMIC: Array<[RegExp, string]> = [
  [/^(\d+)\s+oyuncu\s+·\s+Tur\s+(\d+)$/i, '$1 players · Round $2'],
  [/^(\d+)\s+oyuncu$/i, '$1 players'],
  [/^(\d+)\s+izleyici$/i, '$1 viewers'],
  [/^(\d+)\s+tur$/i, '$1 rounds'],
  [/^(\d+)\s+takım$/i, '$1 teams'],
  [/^Tur\s+(\d+)$/i, 'Round $1'],
  [/^(\d+)\s+gün$/i, '$1 days'],
  [/^(\d+)\s+dk$/i, '$1 min'],
  [/^(\d+)\s+saat$/i, '$1 hours'],
  [/^(\d+)\s+ay$/i, '$1 months'],
  [/^(\d+)\s+yıl$/i, '$1 years'],
  [/^(\d+)\s+kişi$/i, '$1 people'],
  [/^(\d+)\s+oyun$/i, '$1 games'],
  [/^(\d+)\s+game$/i, '$1 games'],
  [/^(\d+)\s+kategori$/i, '$1 categories'],
  [/^(\d+)\s+oda toplam$/i, '$1 rooms total'],
  [/^(\d+)\s+arcade toplamı$/i, '$1 arcade total'],
];

function translateValue(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  for (const [pattern, replacement] of DYNAMIC) {
    if (pattern.test(value)) return value.replace(pattern, replacement);
  }
  if (OVERRIDES[value]) return OVERRIDES[value];
  if (PHRASE_EN[value]) return PHRASE_EN[value];
  if (EN_TEXT[value]) return EN_TEXT[value];
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (EN_NORMALIZED.has(normalized)) return EN_NORMALIZED.get(normalized) ?? null;
  let tokenized = value;
  for (const [pattern, replacement] of TOKEN_EN) tokenized = tokenized.replace(pattern, replacement);
  for (const [source, target] of Object.entries(PHRASE_EN)) {
    tokenized = tokenized.replace(new RegExp(`\\b${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), target);
  }
  tokenized = tokenized.replace(/\b(Oca|Şub|Mar|Nis|May|Haz|Tem|Ağu|Eyl|Eki|Kas|Ara)\b/g, (month: string) => ({
    Oca: 'Jan', Şub: 'Feb', Mar: 'Mar', Nis: 'Apr', May: 'May', Haz: 'Jun',
    Tem: 'Jul', Ağu: 'Aug', Eyl: 'Sep', Eki: 'Oct', Kas: 'Nov', Ara: 'Dec',
  }[month] ?? month));
  return tokenized !== value ? tokenized : null;
}

function shouldSkip(node: Node): boolean {
  const parent = node.parentElement;
  if (!parent) return true;
  return Boolean(parent.closest('script, style, pre, code, [data-i18n-skip]'));
}

function translateAttributes(element: Element): void {
  if (element.matches('script, style, pre, code, [data-i18n-skip]')) return;
  for (const attribute of ['placeholder', 'title', 'aria-label', 'alt']) {
    const current = element.getAttribute(attribute);
    if (!current) continue;
    const translated = translateValue(current);
    if (translated && translated !== current) element.setAttribute(attribute, translated);
  }
}

function translateSubtree(root: Node): void {
  if (root instanceof Element) translateAttributes(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let current: Node | null = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      if (!shouldSkip(current)) {
        const raw = current.nodeValue ?? '';
        const translated = translateValue(raw);
        if (translated) {
          const leading = raw.match(/^\s*/)?.[0] ?? '';
          const trailing = raw.match(/\s*$/)?.[0] ?? '';
          const next = `${leading}${translated}${trailing}`;
          if (next !== raw) current.nodeValue = next;
        }
      }
    } else if (current instanceof Element) {
      translateAttributes(current);
    }
    current = walker.nextNode();
  }
}
function DomTranslator({ locale }: { locale: Locale }) {
  const observer = useRef<MutationObserver | null>(null);

  useEffect(() => {
    document.documentElement.lang = locale;
    if (locale === 'tr') return;
    const title = translateValue(document.title);
    if (title) document.title = title;
    let frame = 0;
    const apply = () => {
      frame = 0;
      translateSubtree(document.body);
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };
    apply();
    observer.current = new MutationObserver(schedule);
    observer.current.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label', 'alt'],
    });
    return () => {
      observer.current?.disconnect();
      observer.current = null;
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [locale]);

  return null;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const setLocale = (next: Locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* yoksay */
    }
    setLocaleState(next);
    // Çeviri DOM katmanı yeniden yüklenirken temiz bir TR ağacından başlar.
    window.location.reload();
  };
  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      <DomTranslator locale={locale} />
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage();
  return (
    <div
      className={`inline-flex items-center rounded-full border border-[#e4dccf] bg-white p-0.5 text-[10px] font-bold ${
        compact ? 'scale-95' : ''
      }`}
      data-i18n-skip
    >
      {(['tr', 'en'] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`rounded-full px-2 py-1 transition ${
            locale === code ? 'bg-ink-950 text-white' : 'text-ink-400 hover:text-ink-800'
          }`}
          aria-label={code === 'tr' ? 'Türkçe' : 'English'}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
