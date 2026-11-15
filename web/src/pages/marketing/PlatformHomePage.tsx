import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Gamepad2,
  Heart,
  Layers,
  MessageCircle,
  PartyPopper,
  Swords,
  Flag,
  Brain,
  Play,
  Radio,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Users,
  Zap,
} from 'lucide-react';
import { ARCADE_GAMES, ARCADE_GAME_LIST } from '@shared/arcade';
import { MarketingFooter, MarketingHeader } from '../../components/MarketingHeader';
import { ArcadeGameCard } from '../../components/ArcadeGameCard';
import { GameArt } from '../../components/GameArt';
import { GameStoreGrid } from '../../components/GameStoreGrid';
import { Button } from '../../components/ui';

const STEPS = [
  {
    icon: Gamepad2,
    title: 'Oyunu seç',
    text: 'On iki oyundan birini aç. Her oyunun kendi sahnesi ve kuralları var.',
  },
  {
    icon: Radio,
    title: 'Yayınını bağla',
    text: 'OBS veya TikTok LIVE Studio’ya 9:16 tarayıcı kaynağı olarak ekle.',
  },
  {
    icon: MessageCircle,
    title: 'Sohbet oynasın',
    text: 'İzleyiciler yorum, beğeni ve hediyelerle oyuna anında dahil olur.',
  },
  {
    icon: Zap,
    title: 'Tur başlasın',
    text: 'Oyun kendi akar; sen sadece yayını yönetirsin. İndirme veya eklenti gerekmez.',
  },
];

const FAQ = [
  {
    q: 'Oyunları yayınıma nasıl eklerim?',
    a: 'Oyun sayfasındaki 9:16 sahneyi OBS’te Browser Source, TikTok LIVE Studio’da Bağlantı kaynağı olarak ekleyebilirsin. Aynı bağlantı yayın boyunca açık kalır.',
  },
  {
    q: 'İzleyiciler nasıl katılır?',
    a: 'Yoruma oyunun istediği kelimeyi veya cevabı yazar. Beğeni ve hediyeler enerji, hız ya da kalkan etkisi yaratır. Her oyunun katılım kuralı oyun sayfasında yazar.',
  },
  {
    q: 'Oyun ekranında hediye talebi var mı?',
    a: 'Hayır. Oyun ekranında izleyiciden hediye isteyen veya hediye karşılığı vaat eden bir yazı gösterilmez. Yayın kurallarına uyum yayıncının sorumluluğundadır.',
  },
  {
    q: 'Hangi oyunlar yüksek etkileşimli?',
    a: 'Profil görseli veya kullanıcı adı gösteren oyunlarda ihlal riski daha yüksektir. Bu oyunların sayfasında ayrıca uyarı ve risk etiketi bulunur.',
  },
  {
    q: 'Oyun lisansları ne kadar?',
    a: 'Her oyun 1 günlük veya 30 günlük lisansla satılır. Fiyatlar mağazada gösterilir; admin panelinden güncellenebilir.',
  },
  {
    q: 'TikTok ile resmî bağlantınız var mı?',
    a: 'Hayır. Bağımsız bir hizmetiz; TikTok, YouTube veya Twitch tarafından onaylanmış ya da sponsorlu değiliz.',
  },
];

const CATEGORIES = [
  {
    name: 'Eğlence',
    icon: PartyPopper,
    color: '#e0558f',
    soft: '#fff0f6',
    text: 'Dans, çark, matbaa ve sosyal sahneler.',
  },
  {
    name: 'Bilgi',
    icon: Brain,
    color: '#2563eb',
    soft: '#eef4ff',
    text: 'Quiz ve kelime oyunlarıyla sohbeti yarıştır.',
  },
  {
    name: 'Arena',
    icon: Swords,
    color: '#dc2626',
    soft: '#fff1f1',
    text: 'Dövüş, halat çekme ve duvar itme kapışmaları.',
  },
  {
    name: 'Yarış',
    icon: Flag,
    color: '#b45309',
    soft: '#fff8e7',
    text: 'Piksel araçlar ve jokeyler bitişe koşar.',
  },
];

export function PlatformHomePage() {
  return (
    <div className="min-h-screen bg-[#fbf7f0] text-ink-900">
      <MarketingHeader />

      <section className="relative overflow-hidden border-b border-[#eee7dc]">
        <div className="absolute -right-40 -top-32 h-[420px] w-[420px] rounded-full bg-[#ffe2ef] blur-[100px]" />
        <div className="absolute -left-32 top-40 h-[380px] w-[380px] rounded-full bg-[#d9f5e8] blur-[100px]" />
        <div className="container-page relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e4dccf] bg-white/80 px-3.5 py-1.5 text-[11px] font-semibold text-ink-600">
              <Sparkles size={12} className="text-brand-600" /> Yayıncılar için oyun platformu
            </span>
            <h1 className="mt-5 max-w-2xl text-balance font-display text-[42px] font-bold leading-[1.02] tracking-tight text-ink-950 sm:text-6xl">
              Sohbetin oynadığı
              <span className="relative mt-1 block w-fit text-brand-700">
                {ARCADE_GAME_LIST.length} oyun.
                <svg viewBox="0 0 200 14" className="absolute -bottom-1 left-0 h-3 w-full" aria-hidden>
                  <path d="M3 10 Q60 2 100 7 T197 4" fill="none" stroke="#34b58b" strokeWidth="5" strokeLinecap="round" opacity="0.35" />
                </svg>
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink-500 sm:text-base">
              Yorum, beğeni ve hediyelerle büyüyen canlı yayın oyunları. İndirme yok, eklenti yok:
              oyunu seç, 9:16 bağlantıyı OBS’e ekle, sohbet oynasın.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/oyunlar">
                <Button variant="brand" icon={<Play size={16} />}>
                  Oyunları keşfet
                </Button>
              </Link>
              <Link to="/satin-al">
                <Button variant="secondary" icon={<ArrowRight size={15} />}>
                  Mağazayı gör
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-ink-400">
              <span className="inline-flex items-center gap-1.5">
                <Check size={12} className="text-brand-600" /> 30 oynanabilir oyun
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={12} className="text-brand-600" /> Günde 30 dk ücretsiz deneme
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={12} className="text-brand-600" /> OBS / LIVE Studio
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[430px]">
            <div className="absolute -left-6 -top-5 z-10 rounded-2xl border border-[#e9e1d5] bg-white px-3 py-2 shadow-card">
              <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-ink-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Canlı
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-ink-800">Demo kalabalığı oyunda</p>
            </div>
            <div className="absolute -bottom-4 -right-3 z-10 flex items-center gap-2 rounded-2xl border border-[#e9e1d5] bg-white px-3 py-2 shadow-card">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-pink-50 text-pink-600">
                <Heart size={13} />
              </span>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-ink-400">Sahne enerjisi</p>
                <p className="text-[11px] font-bold text-ink-800">+ 248</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-[34px] border border-[#e5dccf] bg-white p-3 shadow-[0_30px_80px_-35px_rgba(48,38,25,0.4)]">
              <GameArt game={ARCADE_GAMES.dance} className="rounded-[24px]" />
              <div className="flex items-center justify-between px-2 py-2">
                <div>
                  <p className="text-[12px] font-bold text-ink-950">Sahne 90</p>
                  <p className="text-[9px] text-ink-400">Eğlence · 90 saniye</p>
                </div>
                <span className="rounded-full bg-[#eafaf5] px-2.5 py-1 text-[9px] font-bold text-[#0f6b55]">
                  9:16 hazır
                </span>
              </div>
            </div>
            <div className="absolute -bottom-8 left-6 hidden w-[150px] overflow-hidden rounded-2xl border border-[#e9e1d5] bg-white p-1.5 shadow-card sm:block">
              <GameArt game={ARCADE_GAMES.quiz} className="rounded-xl" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#eee7dc] bg-white/60">
        <div className="container-page grid grid-cols-2 divide-x divide-[#eee7dc] py-5 sm:grid-cols-4">
          {[
            { value: String(ARCADE_GAME_LIST.length), label: 'oynanabilir oyun' },
            { value: '4', label: 'kategori' },
            { value: '2 dk', label: 'kurulum' },
            { value: '0', label: 'indirme' },
          ].map((stat) => (
            <div key={stat.label} className="px-4 text-center">
              <p className="font-display text-xl font-bold text-ink-950 sm:text-2xl">{stat.value}</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-wider text-ink-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="kategoriler" className="scroll-mt-20 border-b border-[#eee7dc] bg-white/50 py-12 sm:py-16">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">Kategoriler</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
                Yayınına göre bir kategori seç.
              </h2>
              <p className="mt-1.5 max-w-xl text-sm text-ink-500">
                Eğlence, bilgi, arena veya yarış. Kategoriye tıkla, filtrelenmiş oyun kataloğuna git.
              </p>
            </div>
            <Link to="/oyunlar" className="text-[11px] font-semibold text-brand-700 hover:text-brand-600">
              Bütün oyunlar →
            </Link>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              const games = ARCADE_GAME_LIST.filter((game) => game.category === category.name);
              return (
                <Link
                  key={category.name}
                  to={`/oyunlar?kategori=${encodeURIComponent(category.name)}`}
                  className="group relative overflow-hidden rounded-2xl border border-[#e9e1d5] p-4 transition hover:-translate-y-0.5 hover:shadow-card"
                  style={{ background: `linear-gradient(135deg, ${category.soft}, #ffffff)` }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="grid h-9 w-9 place-items-center rounded-xl text-white"
                      style={{ background: category.color }}
                    >
                      <Icon size={17} />
                    </span>
                    <span className="text-[10px] font-bold text-ink-400">{games.length} oyun</span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-ink-950">{category.name}</h3>
                  <p className="mt-1 text-[10px] leading-relaxed text-ink-500">{category.text}</p>
                  <p className="mt-2 truncate text-[9px] text-ink-400">
                    {games.slice(0, 3).map((game) => game.shortName).join(' · ')}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[9px] font-semibold" style={{ color: category.color }}>
                    Oyunları gör <ArrowRight size={10} className="transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container-page py-14 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">Katalog</p>
            <h2 className="mt-1 text-balance text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
              Her yayına uygun bir oyun.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-ink-500">
              Dans, bilgi, arena ve yarış. Hepsini canlı deneyebilir, beğendiğini yayınına
              ekleyebilirsin.
            </p>
          </div>
          <Link to="/oyunlar" className="text-[11px] font-semibold text-brand-700 hover:text-brand-600">
            Bütün oyunları gör →
          </Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ARCADE_GAME_LIST.slice(0, 8).map((game) => (
            <ArcadeGameCard key={game.key} game={game} compact />
          ))}
        </div>
      </section>

      <section id="nasil" className="scroll-mt-20 border-y border-[#eee7dc] bg-[#fffaf4] py-14 sm:py-20">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">Nasıl çalışır?</p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
              Dört adımda yayına hazır.
            </h2>
            <p className="mt-2 text-sm text-ink-500">
              Oyunu seç, bağlantıyı ekle, sohbeti aç. Geri kalanı sahne tarafında.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="rounded-2xl border border-[#e9e1d5] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f7f2e9] text-brand-700">
                      <Icon size={18} />
                    </span>
                    <span className="text-[10px] font-bold text-ink-300">0{index + 1}</span>
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-ink-950">{step.title}</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{step.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container-page py-14 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">Neden burada?</p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
              Yayıncıyı yormayan, izleyiciyi sahneye alan tasarım.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">
              Her oyun 9:16 dikey yayın için çizildi. Üstte TikTok arayüzü, altta sohbet için
              güvenli boşluk bırakır. Oyun durumu sunucuda tutulur; yenileme sahneyi bozmaz.
            </p>
            <div className="mt-5 space-y-2.5">
              {[
                'Tek tıkla yayın bağlantısı; OBS’te kalıcı kaynak.',
                'Dokunmatik ve masaüstünde aynı sahne.',
                'Oyun başına ayrı kurallar ve uyarılar.',
                'Yüksek etkileşimli oyunlarda görünür risk etiketi.',
              ].map((item) => (
                <p key={item} className="flex items-start gap-2 text-[12px] text-ink-600">
                  <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                    <Check size={10} strokeWidth={3} />
                  </span>
                  {item}
                </p>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Smartphone, title: 'Telefondan yayın', text: 'Oyunu telefonda aç, ekran paylaşımıyla yayına ver.' },
              { icon: Layers, title: 'Sahne + sohbet', text: '9:16 sahne, altında güvenli sohbet alanı.' },
              { icon: ShieldCheck, title: 'Kurallar görünür', text: 'Her oyunda hediye ve moderasyon uyarıları.' },
              { icon: Rocket, title: 'Hızlı kurulum', text: 'İndirme, eklenti veya ayrı program gerekmez.' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-[#e9e1d5] bg-white p-5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f7f2e9] text-brand-700">
                    <Icon size={16} />
                  </span>
                  <h3 className="mt-3 text-[13px] font-bold text-ink-950">{item.title}</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="magaza" className="scroll-mt-20 border-y border-[#eee7dc] bg-[#f3ede3] py-14 sm:py-20">
        <div className="container-page">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">Mağaza</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">Her oyun kendi lisansıyla.</h2>
              <p className="mt-2 max-w-xl text-sm text-ink-500">
                Oyunu 1 günlük veya 30 günlük lisansla satın al; panelde özelleştir, sonra yayına al.
              </p>
            </div>
            <Link to="/satin-al" className="text-[11px] font-semibold text-brand-700">Mağazayı gör →</Link>
          </div>
          <GameStoreGrid limit={4} />
        </div>
      </section>

      <section id="uyarilar" className="container-page scroll-mt-20 py-14 sm:py-20">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-amber-200 bg-[#fffaf0] p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-amber-600" />
              <h2 className="text-lg font-bold text-amber-950">Yayın öncesi uyarılar</h2>
            </div>
            <ul className="mt-4 space-y-3">
              {[
                'TikTok kurallarına uyum ve yayın içeriğinin sorumluluğu yayıncıya aittir.',
                'Oyun ekranında hediye talebi veya hediye karşılığı vaat gösterilmez.',
                'Profil görseli gösteren oyunlarda ihlal riski daha yüksektir.',
                'Dijital ürünlerde iade koşulları satın alma öncesinde belirtilir.',
                'Bağımsız bir hizmetiz; platformlarla resmî bağlantımız yoktur.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[11px] leading-relaxed text-amber-900/75">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div id="sss">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">SSS</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink-950">
              Merak edilenler
            </h2>
            <div className="mt-4 divide-y divide-[#eee7dc] rounded-2xl border border-[#e9e1d5] bg-white">
              {FAQ.map((item) => (
                <details key={item.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 text-[12px] font-semibold text-ink-800">
                    {item.q}
                    <span className="text-ink-300 transition group-open:rotate-45">＋</span>
                  </summary>
                  <p className="mt-2 text-[11px] leading-relaxed text-ink-500">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page pb-16">
        <div className="relative overflow-hidden rounded-[34px] border border-[#dcefe6] bg-[#eafaf3] px-6 py-10 sm:px-10 sm:py-12">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/60 blur-2xl" />
          <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0f6b55]">
                <Users size={12} /> Yayınını oyuna çevir
              </p>
              <h2 className="mt-2 max-w-xl text-2xl font-bold tracking-tight text-[#073b31] sm:text-3xl">
                Sohbetin hazır. Sahne senin.
              </h2>
              <p className="mt-2 max-w-lg text-[12px] leading-relaxed text-[#2f5f52]">
                Oyunlardan birini dene, paketini seç, kalıcı yayın bağlantını al. Kurulum iki
                dakika; geri kalanı yayın keyfi.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/oyunlar">
                <Button variant="primary" icon={<Gamepad2 size={15} />}>
                  Oyunları gör
                </Button>
              </Link>
              <Link to="/satin-al">
                <Button variant="brand" icon={<ArrowRight size={15} />}>
                  Paket seç
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
