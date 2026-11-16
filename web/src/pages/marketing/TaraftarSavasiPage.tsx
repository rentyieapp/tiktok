import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Crown,
  Gamepad2,
  Play,
  Radio,
  Shield,
  Sparkles,
  Swords,
  Users,
} from 'lucide-react';
import type { PackageDTO } from '@shared/types';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { startCheckout } from '../../lib/checkout';
import { formatPrice } from '@shared/defaults';
import { Button } from '../../components/ui';
import { MarketingFooter, MarketingHeader } from '../../components/MarketingHeader';
import { FanBattleDemo } from '../../components/FanBattleDemo';

const PLAN_IDS = ['pkg_starter', 'pkg_pro', 'pkg_legend'];

export function TaraftarSavasiPage() {
  const { me } = useAuth();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<PackageDTO[]>([]);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<{ packages: PackageDTO[] }>('/api/packages')
      .then((result) => setPackages(result.packages.filter((pkg) => PLAN_IDS.includes(pkg.id))))
      .catch(() => setPackages([]));
  }, []);

  const buy = async (pkg: PackageDTO) => {
    if (!me) {
      navigate('/kayit?next=/oyun/taraftar-savasi');
      return;
    }
    setError('');
    setBuying(pkg.id);
    try {
      await startCheckout(pkg.id);
    } catch {
      setError('Ödeme başlatılamadı. Lütfen tekrar dene.');
      setBuying(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf7f0] text-ink-900">
      <MarketingHeader />

      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div className="absolute -right-24 top-0 h-96 w-96 rounded-full bg-brand-500/20 blur-[100px]" />
        <div className="absolute -left-28 bottom-0 h-80 w-80 rounded-full bg-violet-500/15 blur-[100px]" />
        <div className="container-page relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_0.9fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-300">
              <Swords size={12} /> 3D arena · takım savaşı
            </span>
            <h1 className="mt-5 max-w-2xl font-display text-4xl font-bold leading-[1.03] tracking-tight sm:text-6xl">
              Taraftar Savaşı <span className="text-brand-300">3D</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/55 sm:text-base">
              İzleyicilerin takımını seçtiği, kaleleri savunduğu ve komutlarla arenayı yönettiği
              gerçek 3D canlı yayın oyunu. Yayıncı panelinden takımlarını kur, OBS bağlantını al ve
              yayına başla.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <a href="#paketler">
                <Button variant="brand" icon={<ArrowRight size={14} />}>Paketleri gör</Button>
              </a>
              <Link to={me ? '/panel/3d' : '/giris?next=/panel/3d'}>
                <Button variant="secondary" icon={<Play size={14} />}>3D oyun paneli</Button>
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-white/35">
              <span className="inline-flex items-center gap-1.5"><Check size={11} className="text-brand-400" /> 2 / 4 / 8 takım</span>
              <span className="inline-flex items-center gap-1.5"><Check size={11} className="text-brand-400" /> Kalıcı OBS bağlantısı</span>
              <span className="inline-flex items-center gap-1.5"><Check size={11} className="text-brand-400" /> Türkçe + çok dilli komutlar</span>
            </div>
          </div>
          <div className="relative">
            <FanBattleDemo />
          </div>
        </div>
      </section>

      <section className="container-page py-14 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">Nasıl oynanır?</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink-950">Yayıncı kurar, izleyici oynar.</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Taraftar Savaşı, arcade oyunlarından ayrı bir 3D stüdyo deneyimidir. Takım sayısını,
            renkleri ve komutları sen belirlersin; izleyiciler yorum, beğeni ve hediyelerle oyuna
            dahil olur.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Users, title: 'Takımları kur', text: '2, 4 veya 8 takım; isim, renk ve komutlarını panelden özelleştir.' },
            { icon: Gamepad2, title: 'İzleyici katılsın', text: 'Yorumla takım seçenekleri; beğeni ve hediyeler oyun içinde güce dönüşür.' },
            { icon: Radio, title: 'OBS’e ekle', text: 'Kalıcı bağlantıyı OBS veya TikTok LIVE Studio’ya browser source olarak ekle.' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-2xl border border-[#e9e1d5] bg-white p-5 shadow-card">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon size={18} /></span>
                <h3 className="mt-3 text-sm font-bold text-ink-950">{item.title}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="paketler" className="scroll-mt-24 border-y border-[#eee7dc] bg-white py-14 sm:py-20">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">3D stüdyo paketleri</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight text-ink-950">Takım sayına göre seç.</h2>
              <p className="mt-2 max-w-xl text-sm text-ink-500">Tüm paketler 30 günlük yayıncı lisansı içerir. Ödeme Shopier üzerinden alınır.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] text-ink-400"><Shield size={12} /> Güvenli ödeme</span>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {packages.map((pkg, index) => (
              <div key={pkg.id} className={`relative flex flex-col rounded-3xl border p-5 ${index === 1 ? 'border-brand-300 bg-brand-50/40 shadow-card' : 'border-[#e9e1d5] bg-[#fffaf4]'}`}>
                {index === 1 ? <span className="absolute right-4 top-4 rounded-full bg-brand-600 px-2.5 py-1 text-[9px] font-bold text-white">POPÜLER</span> : null}
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand-700"><Crown size={18} /></span>
                <h3 className="mt-4 text-xl font-bold text-ink-950">{pkg.name}</h3>
                <p className="mt-1 text-[11px] text-ink-500">{pkg.tagline}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight text-ink-950">{formatPrice(pkg.priceCents, pkg.currency)}</span>
                  <span className="text-[10px] text-ink-400">/ {pkg.durationDays} gün</span>
                </div>
                <ul className="mt-4 flex-1 space-y-2">
                  {pkg.features.slice(0, 5).map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-[11px] text-ink-600"><Check size={12} className="mt-0.5 shrink-0 text-brand-600" />{feature}</li>
                  ))}
                </ul>
                <Button variant={index === 1 ? 'brand' : 'secondary'} className="mt-5 w-full" loading={buying === pkg.id} onClick={() => void buy(pkg)} icon={<ArrowRight size={13} />}>
                  {me ? 'Satın al' : 'Ücretsiz hesap aç ve al'}
                </Button>
              </div>
            ))}
            {packages.length === 0 ? (
              <div className="rounded-2xl border border-[#e9e1d5] bg-[#fffaf4] p-6 text-sm text-ink-500 md:col-span-3">
                Paketler yükleniyor… <Link to="/satin-al" className="font-semibold text-brand-700">Mağazaya git</Link>
              </div>
            ) : null}
          </div>
          {error ? <p className="mt-3 text-[11px] text-red-600">{error}</p> : null}
          <p className="mt-5 text-[10px] leading-relaxed text-ink-400">
            Satın alma sonrası 3D oyun paneli açılır. Daha uzun süreler ve farklı paketler için <Link to="/satin-al" className="font-semibold text-brand-700">tüm paketlere</Link> bakabilirsin.
          </p>
        </div>
      </section>

      <section className="container-page py-14 sm:py-20">
        <div className="rounded-3xl bg-ink-950 p-6 text-white sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-300"><Sparkles size={12} /> 3D stüdyo</span>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Kaleleri kur, arenayı başlat.</h2>
              <p className="mt-2 max-w-xl text-sm text-white/45">Panelde takımlarını ve komutlarını hazırla; gerisini canlı yayın ve izleyiciler halleder.</p>
            </div>
            <Link to={me ? '/panel/3d' : '/giris?next=/panel/3d'}>
              <Button variant="brand" icon={<Play size={14} />}>Panele git</Button>
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
