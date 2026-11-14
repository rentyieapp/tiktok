import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Gamepad2,
  ShieldAlert,
  ShieldCheck,
  Search,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { ARCADE_GAME_LIST } from '@shared/arcade';
import type { PackageDTO } from '@shared/types';
import { api } from '../../lib/api';
import { Button } from '../../components/ui';
import { MarketingFooter, MarketingHeader } from '../../components/MarketingHeader';
import { ArcadeGameCard } from '../../components/ArcadeGameCard';

const FILTERS = ['Tümü', 'Eğlence', 'Bilgi', 'Arena', 'Yarış', 'Favoriler'];

export function GamesPage() {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('kategori') ?? '';
  const [filter, setFilter] = useState(
    FILTERS.includes(initialCategory) && initialCategory !== 'Favoriler' ? initialCategory : 'Tümü',
  );
  const [query, setQuery] = useState('');
  const [offers, setOffers] = useState<PackageDTO[]>([]);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('meydan_favorites') ?? '[]') as string[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    api
      .get<{ offers: PackageDTO[] }>('/api/arcade/offers')
      .then((result) => setOffers(result.offers.filter((offer) => offer.isActive !== false)))
      .catch(() => setOffers([]));
  }, []);
  const games = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('tr');
    return ARCADE_GAME_LIST.filter((game) => {
      if (filter === 'Favoriler' && !favorites.includes(game.key)) return false;
      if (filter !== 'Tümü' && filter !== 'Favoriler' && game.category !== filter) return false;
      if (!term) return true;
      return `${game.name} ${game.tagline} ${game.category}`
        .toLocaleLowerCase('tr')
        .includes(term);
    });
  }, [filter, query, favorites]);

  const toggleFavorite = (key: string) => {
    setFavorites((current) => {
      const next = current.includes(key)
        ? current.filter((entry) => entry !== key)
        : [...current, key];
      try {
        localStorage.setItem('meydan_favorites', JSON.stringify(next));
      } catch {
        /* yoksay */
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#fbf7f0] text-ink-900">
      <MarketingHeader />

      <section className="relative overflow-hidden border-b border-[#eee7dc] bg-[#fffaf4]">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#ffe3ef] blur-[80px]" />
        <div className="absolute -bottom-24 left-0 h-80 w-80 rounded-full bg-[#dff5ea] blur-[90px]" />
        <div className="container-page relative py-14 sm:py-20">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_0.7fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e4dccf] bg-white/80 px-3.5 py-1.5 text-[11px] font-semibold text-ink-600">
                <Gamepad2 size={12} className="text-brand-600" /> Oyun platformu
              </span>
              <h1 className="mt-5 max-w-2xl text-balance font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink-950 sm:text-5xl">
                24 oyun. Tek yayın bağlantısı.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-500 sm:text-base">
                İzleyicilerin yorum, beğeni ve hediyeleriyle oynanan oyunlar. Her oyunun kendi
                sahnesi, kendi kuralları ve aynı sade kurulumu var. Beğen, dene, yayınına ekle.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/satin-al">
                  <Button variant="brand" icon={<ArrowRight size={15} />}>
                    Mağazayı gör
                  </Button>
                </Link>
                <Link to="/oyun/sahne-90">
                  <Button variant="secondary" icon={<Sparkles size={15} />}>
                    Canlı bir oyun dene
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: String(ARCADE_GAME_LIST.length), label: 'oynanabilir oyun' },
                { value: '2 dk', label: 'ortalama kurulum' },
                { value: '9:16', label: 'OBS / LIVE Studio' },
                { value: '0', label: 'indirme' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-[#e9e1d5] bg-white/80 p-4">
                  <p className="font-display text-2xl font-bold text-ink-950">{stat.value}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-400">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="container-page py-12 sm:py-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">
              Katalog
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
              Bütün oyunlar
            </h2>
            <p className="mt-1.5 text-sm text-ink-500">
              Hepsi tarayıcıda çalışır. Oyun sayfasında canlı demo kalabalığına katılabilirsin.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <label className="relative block w-full sm:w-64">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
              <input
                className="input h-9 w-full pl-9 text-[11px]"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Oyun ara..."
                aria-label="Oyun ara"
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition ${
                  filter === item
                    ? 'bg-ink-950 text-white'
                    : 'border border-[#e4dccf] bg-white text-ink-500 hover:border-[#cfc3b2]'
                }`}
              >
                {item}
              </button>
            ))}
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {games.map((game) => (
            <div key={game.key} className="relative">
              <ArcadeGameCard game={game} offers={offers.filter((offer) => offer.gameKey === game.key)} />
              <button
                type="button"
                onClick={() => toggleFavorite(game.key)}
                aria-label={favorites.includes(game.key) ? `${game.name} favorilerden çıkar` : `${game.name} favorilere ekle`}
                className={`absolute right-12 top-3 z-10 grid h-7 w-7 place-items-center rounded-full backdrop-blur transition ${
                  favorites.includes(game.key)
                    ? 'bg-amber-400 text-white'
                    : 'bg-white/85 text-ink-400 hover:text-amber-500'
                }`}
              >
                <Star size={12} fill={favorites.includes(game.key) ? 'currentColor' : 'none'} />
              </button>
            </div>
          ))}
        </div>
        {games.length === 0 ? (
          <div className="mt-7 rounded-2xl border border-[#e9e1d5] bg-white p-8 text-center">
            <p className="text-[13px] font-semibold text-ink-700">Aramanla eşleşen oyun yok.</p>
            <button type="button" onClick={() => { setQuery(''); setFilter('Tümü'); }} className="mt-2 text-[11px] font-semibold text-brand-700">
              Filtreleri temizle
            </button>
          </div>
        ) : null}

        <div className="mt-10 grid gap-4 rounded-3xl border border-[#e9e1d5] bg-white p-5 sm:grid-cols-3 sm:p-6">
          {[
            {
              icon: Users,
              title: 'İzleyici katılır',
              text: 'Yorum yazan izleyici oyun sahnesine kendi adıyla girer.',
            },
            {
              icon: Gamepad2,
              title: 'Oyun kendi akar',
              text: 'Sahne sunucuda yönetilir; OBS’te hep aynı bağlantı kalır.',
            },
            {
              icon: ShieldCheck,
              title: 'Kurallar görünür',
              text: 'Yüksek etkileşimli oyunlarda uyarılar oyun sayfasında yer alır.',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f7f2e9] text-brand-700">
                  <Icon size={16} />
                </span>
                <div>
                  <p className="text-[12px] font-semibold text-ink-800">{item.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <h3 className="text-sm font-bold text-amber-950">Yayın öncesi önemli notlar</h3>
              <ul className="mt-2 grid gap-1.5 text-[11px] leading-relaxed text-amber-900/75 sm:grid-cols-2">
                {[
                  'TikTok kurallarına uyum ve yayın içeriği yayıncının sorumluluğundadır.',
                  'Oyun ekranında hediye talebi veya hediye karşılığı vaat gösterilmez.',
                  'Profil görseli gösteren oyunlarda ihlal riski daha yüksektir.',
                  'Dijital ürünlerde iade koşulları satın alma öncesinde açıkça belirtilir.',
                  'TikTok, YouTube veya Twitch ile resmî bir bağlantımız yoktur.',
                  'Oyunlar eğlence amaçlıdır; sonuçlar garanti edilmez.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <Check size={11} className="mt-0.5 shrink-0 text-amber-700" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
