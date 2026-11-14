import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Download, Laptop, MonitorPlay, Smartphone, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui';
import { MarketingFooter, MarketingHeader } from '../../components/MarketingHeader';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallAppPage() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setPrompt(null);
  };

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
                <Download size={12} className="text-brand-600" /> Meydan uygulaması
              </span>
              <h1 className="mt-5 max-w-2xl text-balance font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink-950 sm:text-5xl">
                Tarayıcıda kal, uygulama gibi kullan.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-500 sm:text-base">
                Ayrı bir .exe indirmeden Meydan’ı masaüstüne veya telefonuna yükle. Oyun
                penceresi tam ekran açılır, OBS bağlantın değişmez.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="brand" icon={<Download size={15} />} onClick={() => void install()} disabled={!prompt}>
                  {installed ? 'Uygulama yüklü' : prompt ? 'Uygulamayı yükle' : 'Tarayıcı menüsünden yükle'}
                </Button>
                <Link to="/kurulum">
                  <Button variant="secondary" icon={<ArrowRight size={15} />}>
                    Kurulum rehberi
                  </Button>
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-ink-400">
                <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-brand-600" /> Ayrı launcher gerekmez</span>
                <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-brand-600" /> Tam ekran PWA</span>
                <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-brand-600" /> Windows / macOS / mobil</span>
              </div>
            </div>
            <div className="rounded-3xl border border-[#e9e1d5] bg-white p-5 shadow-card">
              <div className="mx-auto max-w-[220px] rounded-[28px] border-[6px] border-ink-950 bg-[#fffaf4] p-3">
                <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-ink-200" />
                <div className="flex items-center gap-2">
                  <img src="/icon-192.png" alt="" className="h-8 w-8 rounded-xl" />
                  <div>
                    <p className="text-[11px] font-bold">Meydan</p>
                    <p className="text-[8px] text-ink-400">Oyun Platformu</p>
                  </div>
                </div>
                <div className="mt-3 h-24 rounded-xl bg-[radial-gradient(circle_at_50%_20%,#ffe6f1,#f7efe4)]" />
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <div className="h-8 rounded-md bg-[#f3ede3]" />
                  <div className="h-8 rounded-md bg-[#f3ede3]" />
                </div>
              </div>
              <p className="mt-4 text-center text-[10px] text-ink-400">
                {installed ? 'Uygulama olarak açık' : 'Ana ekran / masaüstü kısayolu'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="container-page py-12 sm:py-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Laptop, title: 'Windows / macOS', text: 'Chrome veya Edge’de adres çubuğundaki yükle simgesine bas. Uygulama ayrı pencerede açılır.' },
            { icon: Smartphone, title: 'Android', text: 'Chrome menüsü → Ana ekrana ekle. Uygulama gibi tam ekran çalışır.' },
            { icon: Smartphone, title: 'iPhone / iPad', text: 'Safari’de Paylaş → Ana Ekrana Ekle. Yayın için telefon modu rehberini kullan.' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-2xl border border-[#e9e1d5] bg-white p-5 shadow-card">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f3ede3] text-brand-700">
                  <Icon size={18} />
                </span>
                <h2 className="mt-3 text-[14px] font-bold text-ink-950">{item.title}</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{item.text}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-2xl border border-amber-200 bg-[#fffaf0] p-5 text-[11px] leading-relaxed text-amber-900/80">
          <Sparkles size={15} className="mt-0.5 shrink-0 text-amber-600" />
          <p>
            Bu bir PWA kurulumudur; ayrı Windows launcher veya Steam benzeri bir mağaza değildir.
            Oyun motoru ve OBS sahnesi tarayıcıda çalışmaya devam eder.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-ink-950 p-6 text-white sm:p-8">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              <MonitorPlay size={11} /> Yayına hazır
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Uygulamayı aç, oyunu başlat.</h2>
          </div>
          <Link to="/panel/arcade">
            <Button variant="brand" icon={<ArrowRight size={14} />}>Oyunlarıma git</Button>
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
