import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Clipboard,
  ExternalLink,
  Gamepad2,
  Laptop,
  Link2,
  MonitorPlay,
  Radio,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Wifi,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { MarketingFooter, MarketingHeader } from '../../components/MarketingHeader';

type Mode = 'obs' | 'studio' | 'phone';

const TABS: Array<{ key: Mode; label: string; icon: typeof Laptop }> = [
  { key: 'obs', label: 'OBS', icon: Laptop },
  { key: 'studio', label: 'LIVE Studio', icon: MonitorPlay },
  { key: 'phone', label: 'Telefon', icon: Smartphone },
];

const STEPS: Record<Mode, Array<{ title: string; body: string }>> = {
  obs: [
    {
      title: 'Oyunu seç ve lisansını al',
      body: 'Mağazadan tek oyun veya Tüm Oyunlar paketini al. Lisans ödeme onayından hemen sonra hesabına tanımlanır.',
    },
    {
      title: 'Panelde yayın odasını aç',
      body: 'Panel → Oyunlarım ekranında oyunun kartından oda oluştur. Oda adını ve rengini istediğin gibi özelleştir.',
    },
    {
      title: 'OBS bağlantısını kopyala',
      body: 'Oda kartındaki OBS bağlantısını kopyala. Bu bağlantı yayın boyunca sabit kalır; her yayında yeniden ayar gerekmez.',
    },
    {
      title: 'Browser Source olarak ekle',
      body: 'OBS → Kaynak ekle → Tarayıcı. Genişlik 1080, yükseklik 1920 gir; bağlantıyı yapıştır. Sahne 9:16 dikey yayına hazırdır.',
    },
  ],
  studio: [
    {
      title: 'Lisansını ve odanı hazırla',
      body: 'Oyunu satın al, panelde oda oluştur ve oda kartındaki yayın bağlantısını kopyala.',
    },
    {
      title: 'LIVE Studio’da kaynak ekle',
      body: 'TikTok LIVE Studio → Kaynak ekle → Bağlantı. Kopyaladığın oda bağlantısını yapıştır.',
    },
    {
      title: '9:16 sahneyi yerleştir',
      body: 'Oyun sahnesini dikey yayın alanına oturt. Üstte TikTok simgeleri, altta sohbet için boşluk kalır.',
    },
    {
      title: 'Platform sohbetini bağla',
      body: 'Panel → Platform bağlantıları’ndan TikTok köprünü veya Twitch/YouTube bağlantını kur. İlk olay turu otomatik başlatır.',
    },
  ],
  phone: [
    {
      title: 'Oyunu telefon tarayıcısında aç',
      body: 'Panelden oda bağlantısını telefonunda aç. Tarayıcı menüsünden “Ana ekrana ekle” ile uygulama gibi tam ekran kullan.',
    },
    {
      title: 'Yayın odasını hazırla',
      body: 'Oda adını ve karşılama metnini panelden özelleştir. OBS bilgisayarın olmasa da oyun aynı odadan yayına gider.',
    },
    {
      title: 'TikTok’ta Mobil oyun yayını başlat',
      body: 'TikTok → Canlı → Mobil oyun. Oyun sekmesini ekran paylaşımına seç; sohbet ve hediye olayları oyuna bağlanır.',
    },
    {
      title: 'Sohbeti test et',
      body: 'Test bağlantısından bir yorum/hediye gönder. Oyun ekranında göründüğünde yayına hazırsın.',
    },
  ],
};

export function SetupGuidePage() {
  const [mode, setMode] = useState<Mode>('obs');
  const steps = STEPS[mode];

  return (
    <div className="min-h-screen bg-[#fbf7f0] text-ink-900">
      <MarketingHeader />
      <section className="relative overflow-hidden border-b border-[#eee7dc] bg-[#fffaf4]">
        <div className="absolute -right-24 top-0 h-80 w-80 rounded-full bg-[#dff5ea] blur-[90px]" />
        <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-[#ffe2ef] blur-[90px]" />
        <div className="container-page relative py-14 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e4dccf] bg-white px-3.5 py-1.5 text-[11px] font-semibold text-ink-600">
                <Wifi size={12} className="text-brand-600" /> Kurulum rehberi
              </span>
              <h1 className="mt-5 max-w-2xl text-balance font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink-950 sm:text-5xl">
                İki dakikada yayına hazır.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-500 sm:text-base">
                Oyunu satın al, odanı aç, bağlantıyı OBS veya LIVE Studio’ya ekle. İndirme,
                eklenti ve TikTok şifresi yok.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/satin-al">
                  <Button variant="brand" icon={<Gamepad2 size={15} />}>
                    Oyun seç
                  </Button>
                </Link>
                <Link to="/panel/arcade">
                  <Button variant="secondary" icon={<ArrowRight size={15} />}>
                    Oyunlarıma git
                  </Button>
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-ink-400">
                <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-brand-600" /> İndirme yok</span>
                <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-brand-600" /> Şifre istenmez</span>
                <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-brand-600" /> 9:16 OBS / LIVE Studio</span>
              </div>
            </div>
            <div className="rounded-3xl border border-[#e9e1d5] bg-white p-4 shadow-card">
              <div className="rounded-2xl bg-[#17161d] p-4 text-white">
                <div className="flex items-center gap-2 text-[10px] text-white/50">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> canlı oda · 9:16
                </div>
                <div className="mt-3 aspect-[9/16] max-h-[300px] overflow-hidden rounded-xl bg-[#fffaf4]">
                  <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between bg-white px-3 py-2">
                      <span className="text-[9px] font-bold text-ink-800">Rook Works · Sahne 90</span>
                      <span className="text-[8px] text-ink-400">CANLI</span>
                    </div>
                    <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_50%_20%,#ffe6f1,#f7efe4)]">
                      <Gamepad2 size={44} className="text-pink-500/60" />
                    </div>
                    <div className="bg-white px-3 py-2 text-center text-[8px] text-ink-400">OBS Browser Source</div>
                  </div>
                </div>
              </div>
              <p className="mt-3 flex items-center justify-between text-[10px] text-ink-400">
                <span>Örnek sahne</span>
                <span className="font-mono">1080 × 1920</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="container-page py-10 sm:py-14">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = mode === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMode(tab.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold transition ${
                  active
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-[#e4dccf] bg-white text-ink-500 hover:border-[#cbbda9]'
                }`}
              >
                <Icon size={13} /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-2xl border border-[#e9e1d5] bg-white p-5 shadow-card">
              <div className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f3ede3] text-[11px] font-bold text-brand-700">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h2 className="text-[14px] font-bold text-ink-950">{step.title}</h2>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{step.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#e9e1d5] bg-white p-5">
            <div className="flex items-center gap-2 text-[13px] font-bold text-ink-950">
              <Clipboard size={15} className="text-brand-600" /> OBS bağlantısı nerede?
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
              Panel → <strong>Oyunlarım</strong> oda kartındaki kopyala düğmesi, o odaya ait sabit
              OBS URL’sini panoya alır. Oda adı/status değişse bile URL değişmez.
            </p>
            <code className="mt-3 block truncate rounded-lg bg-[#f7f2e9] px-3 py-2 text-[10px] text-ink-600">
              https://.../canli/oda-adresin?obs=1
            </code>
          </div>
          <div className="rounded-2xl border border-[#e9e1d5] bg-white p-5">
            <div className="flex items-center gap-2 text-[13px] font-bold text-ink-950">
              <Link2 size={15} className="text-brand-600" /> Platform bağlantısı
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
              Twitch kullanıcı adı, YouTube kanal kimliği veya TikTok köprüsü ile izleyici
              olaylarını odaya bağla. TikTok için TikFinity/TikTools webhook köprüsü kullanılır.
            </p>
            <Link to="/panel/baglantilar" className="mt-3 inline-flex text-[11px] font-semibold text-brand-700">
              Bağlantıları aç →
            </Link>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-2xl border border-amber-200 bg-[#fffaf0] p-5 text-[11px] leading-relaxed text-amber-900/80">
          <ShieldAlert size={15} className="mt-0.5 shrink-0 text-amber-600" />
          <p>
            Oyun ekranında hediye talebi gösterilmez. TikTok kurallarına uyum ve yayın
            sorumluluğu yayıncıya aittir. Bağımsız bir platformuz; TikTok, YouTube veya Twitch
            ile resmî bağlantımız yoktur.
          </p>
        </div>

        <div className="mt-8 rounded-3xl bg-ink-950 p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                <Sparkles size={11} /> Hazırsan başlayalım
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">Oyunu seç, odanı aç, yayına al.</h2>
            </div>
            <div className="flex gap-2">
              <Link to="/oyunlar"><Button variant="secondary">Oyunları keşfet</Button></Link>
              <Link to="/satin-al"><Button variant="brand" icon={<Radio size={14} />}>Mağazaya git</Button></Link>
            </div>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
