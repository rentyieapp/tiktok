import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Clock,
  Gift,
  Globe2,
  Heart,
  Languages,
  Link2,
  Lock,
  MessageSquare,
  MonitorPlay,
  Play,
  Radio,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import type { PackageDTO } from '@shared/types';
import { formatPrice } from '@shared/defaults';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Button } from '../../components/ui';
import { Logo } from '../../components/Logo';
import { PricingPlans } from '../../components/PricingPlans';

/* ------------------------------------------------------------------ */
/* Görsel sahne maketi                                                  */
/* ------------------------------------------------------------------ */

function HeroStageMock() {
  return (
    <div className="relative mx-auto w-full max-w-[400px] lg:max-w-[430px]">
      <div className="absolute -inset-10 rounded-full bg-brand-500/20 blur-[80px]" />

      <div className="stage-shadow relative rounded-[42px] border border-white/10 bg-gradient-to-b from-ink-800 to-ink-950 p-2.5">
        <div className="relative overflow-hidden rounded-[34px] bg-[#050b12]">
          <img
            src="/hero-arena.webp"
            alt="Taraftar Savaşı canlı 3D oyun ekranı: dört takım, kaleler, askerler ve komut paneli"
            className="aspect-[9/16] w-full object-cover"
            loading="eager"
          />
          <div className="pointer-events-none absolute inset-0 rounded-[34px] ring-1 ring-inset ring-white/10" />
        </div>
      </div>

      <div className="absolute -bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-ink-900/90 px-3.5 py-1.5 text-[9px] font-medium text-white/50 shadow-float backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
        Gerçek oyun ekranı · OBS Browser Source
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Navigasyon                                                          */
/* ------------------------------------------------------------------ */

function MarketingNav() {
  const { me } = useAuth();
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-ink-950/80 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between">
        <Logo theme="dark" />
        <nav className="hidden items-center gap-7 text-[13px] font-medium text-white/60 md:flex">
          <Link to="/oyunlar" className="transition hover:text-white">
            Oyunlar
          </Link>
          <a href="#nasil" className="transition hover:text-white">
            Nasıl çalışır
          </a>
          <Link to="/satin-al" className="transition hover:text-white">
            Paketler
          </Link>
          <a href="#sss" className="transition hover:text-white">
            SSS
          </a>
        </nav>
        <div className="flex items-center gap-2">
          {me ? (
            <Link to="/panel">
              <Button variant="brand" size="sm" className="px-4">
                Panele git <ArrowRight size={14} />
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/giris" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="text-white/70 hover:bg-white/10 hover:text-white">
                  Giriş yap
                </Button>
              </Link>
              <Link to="/kayit">
                <Button variant="brand" size="sm" className="px-4">
                  Hemen başla
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Paketler                                                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Ana sayfa                                                           */
/* ------------------------------------------------------------------ */

export function HomePage() {
  const { me } = useAuth();

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <MarketingNav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-marketing-grid opacity-50" />
        <div className="absolute -left-40 top-10 h-[420px] w-[420px] rounded-full bg-brand-500/20 blur-[120px]" />
        <div className="absolute -right-32 top-40 h-[480px] w-[480px] rounded-full bg-amber-400/10 blur-[130px]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink-950 to-transparent" />
        <div className="container-page relative grid items-center gap-14 pb-20 pt-16 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold text-white/70 backdrop-blur">
              <span className="flex h-1.5 w-1.5">
                <span className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              </span>
              Yayıncılar için çok kiracılı oyun stüdyosu
            </span>
            <h1 className="mt-6 text-balance font-display text-[42px] font-bold leading-[1.02] tracking-[-0.03em] sm:text-6xl lg:text-[64px]">
              Taraftarlarını sahaya sür.{' '}
              <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-amber-300 bg-clip-text text-transparent">
                Yayınını arenaya
              </span>{' '}
              çevir.
            </h1>
            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/55 sm:text-base">
              Kendi markan, kendi takımların, kendi komutların. 9:16 dikey 3D savaş alanını OBS’e
              ekle; izleyicilerin sohbetten takım seçip kalelerini savunsun. Kurulum 2 dakika.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to={me ? '/panel' : '/kayit'}>
                <Button variant="brand" size="lg" icon={<Play size={16} />} className="w-full sm:w-auto">
                  {me ? 'Stüdyoya dön' : 'Yayıncı olarak başla'}
                </Button>
              </Link>
              <a href="#nasil">
                <Button
                  variant="ghost"
                  size="lg"
                  icon={<MonitorPlay size={16} />}
                  className="w-full border border-white/10 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
                >
                  Nasıl çalışır?
                </Button>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[12px] text-white/45">
              {['OBS Browser Source uyumlu', 'Kalıcı yayın bağlantısı', '5 dilde komut motoru'].map(
                (item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <Check size={13} className="text-brand-400" /> {item}
                  </span>
                ),
              )}
            </div>
            <div className="mt-10 grid max-w-lg grid-cols-4 gap-4 border-t border-white/10 pt-6">
              {[
                { value: '2–8', label: 'Takım' },
                { value: '90 sn', label: 'Varsayılan tur' },
                { value: '5', label: 'Dil' },
                { value: '3D', label: 'WebGL motor' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="font-display text-xl font-bold text-white">{stat.value}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-white/35">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative animate-fade-up [animation-delay:120ms]">
            <HeroStageMock />
          </div>
        </div>
      </section>

      {/* GÜVEN ŞERİDİ */}
      <div className="border-y border-white/5 bg-white/[0.02]">
        <div className="container-page flex flex-wrap items-center justify-center gap-x-10 gap-y-4 py-5 text-[11px] font-medium uppercase tracking-[0.16em] text-white/30">
          <span className="inline-flex items-center gap-2">
            <Lock size={13} /> Kiracı izolasyonu
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck size={13} /> İmzalı ödeme webhook’ları
          </span>
          <span className="inline-flex items-center gap-2">
            <Zap size={13} /> Sunucu otoriteli oyun motoru
          </span>
          <span className="inline-flex items-center gap-2">
            <Radio size={13} /> OBS’e hazır 9:16 sahne
          </span>
        </div>
      </div>

      {/* NASIL ÇALIŞIR */}
      <section id="nasil" className="scroll-mt-24 bg-white py-20 text-ink-900 sm:py-28">
        <div className="container-page">
          <div className="max-w-2xl">
            <span className="badge-ok">3 adımda yayında</span>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Paketini seç, oyununu kur, OBS’e ekle.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-500 sm:text-base">
              Teknik bilgi gerekmez. Sihirbaz takımlarını, renklerini ve komutlarını adım adım
              oluşturur; gerisini motor halleder.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Users,
                step: '01',
                title: 'Hesabını aç, paketini seç',
                text: 'Kayıt ol, sana uygun paketi seç. Ödeme sağlayıcı tarafından doğrulandığında panelin anında açılır.',
              },
              {
                icon: Swords,
                step: '02',
                title: 'Oyununu ve takımlarını kur',
                text: '2, 4 veya 8 takım. İsimler, renkler, armalar, asker ve kale görünümleri; katılma komutları tamamen senin.',
              },
              {
                icon: Radio,
                step: '03',
                title: 'Yayın bağlantını OBS’e ekle',
                text: 'Kalıcı /live adresini Browser Source olarak ekle. İzleyiciler sohbetten komutla katılır, sen sadece yayını yönetirsin.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="group relative rounded-3xl border border-ink-100 bg-ink-50/60 p-7 transition hover:border-ink-200 hover:bg-white hover:shadow-card">
                  <span className="font-display text-xs font-bold tracking-[0.18em] text-brand-600">
                    {item.step}
                  </span>
                  <span className="mt-4 grid h-11 w-11 place-items-center rounded-2xl bg-ink-900 text-white shadow-sm">
                    <Icon size={20} />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-ink-950">{item.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-500">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ÖZELLİKLER */}
      <section id="ozellikler" className="scroll-mt-24 bg-ink-50 py-20 sm:py-28">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <span className="badge-neutral">Özellikler</span>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
              Yayıncı stüdyosu, oyun motoru ve ödeme sistemi — tek platformda.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <div className="card card-pad md:col-span-2 lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-md">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <Languages size={19} />
                  </span>
                  <h3 className="mt-4 text-xl font-semibold text-ink-950">Çok dilli komut motoru</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
                    Aynı işlem, her dilde farklı komut. Türkçe I/İ, aksan ve boşluk normalizasyonu;
                    yayıncıya özel komutlar ve çakışma kontrolü.
                  </p>
                </div>
                <div className="w-full max-w-[300px] rounded-2xl border border-ink-100 bg-ink-50 p-4 font-mono text-[11px]">
                  {[
                    ['🇹🇷', '!gir aslan'],
                    ['🇬🇧', '!join aslan'],
                    ['🇪🇸', '!entrar aslan'],
                    ['🇩🇪', '!beitreten aslan'],
                    ['🇫🇷', '!rejoindre aslan'],
                  ].map(([flag, command]) => (
                    <div key={flag} className="flex items-center gap-3 border-b border-ink-100 py-1.5 last:border-0">
                      <span className="text-sm">{flag}</span>
                      <span className="text-ink-600">{command}</span>
                      <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-brand-600">
                        JOIN
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card card-pad overflow-hidden bg-gradient-to-br from-ink-900 to-ink-950 text-white">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-brand-300">
                <Gift size={19} />
              </span>
              <h3 className="mt-4 text-xl font-semibold">Canlı yayın etkileşimleri</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-white/55">
                Hediye özel saldırı, beğeni savunma kalkanı, yorum asker desteği. Event ID
                deduplication ile her olay yalnızca bir kez işlenir.
              </p>
              <div className="mt-5 space-y-2">
                {[
                  { icon: Gift, label: 'Hediye → özel saldırı', color: 'text-rose-300 bg-rose-400/10' },
                  { icon: Heart, label: 'Beğeni → kalkan', color: 'text-pink-300 bg-pink-400/10' },
                  { icon: MessageSquare, label: 'Yorum → asker', color: 'text-sky-300 bg-sky-400/10' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/70">
                      <span className={`grid h-6 w-6 place-items-center rounded-md ${item.color}`}>
                        <Icon size={12} />
                      </span>
                      {item.label}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card card-pad">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
                <Link2 size={19} />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-ink-950">Kalıcı yayın bağlantısı</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
                Tahmin edilemez slug, tek tıkla kopyala. Ayarlar değişse de URL sabit kalır;
                istediğin an devre dışı bırak.
              </p>
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-ink-100 bg-ink-50 px-3 py-2.5 font-mono text-[10px] text-ink-500">
                <Lock size={12} className="shrink-0 text-brand-600" />
                <span className="truncate">/live/aslan-arena-x7k2m9p4</span>
              </div>
            </div>

            <div className="card card-pad">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
                <BarChart3 size={19} />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-ink-950">Yayıncıya özel istatistikler</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
                Kazanan takımlar, en aktif izleyiciler, maç geçmişi. Her yayıncı yalnızca kendi
                verisini görür.
              </p>
              <div className="mt-5 flex items-end gap-1.5">
                {[38, 62, 48, 84, 66, 92, 74].map((height, index) => (
                  <span
                    key={index}
                    className="flex-1 rounded-t bg-gradient-to-t from-brand-500/30 to-brand-500"
                    style={{ height: `${height * 0.5}px` }}
                  />
                ))}
              </div>
            </div>

            <div className="card card-pad">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-600">
                <ShieldCheck size={19} />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-ink-950">Güvenli çok kiracılı yapı</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
                Her sorguda oyun sahipliği doğrulanır. Ödeme sadece imzalı webhook ile aktifleşir;
                API anahtarları istemciye gitmez.
              </p>
              <ul className="mt-4 space-y-1.5 text-[11px] text-ink-500">
                {['Tenant izolasyonu', 'İmzalı webhook + idempotency', 'Rate limiting', 'scrypt şifre hash’i'].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check size={11} className="text-brand-600" /> {item}
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-y border-white/5 bg-ink-950 py-16">
        <div className="absolute inset-0 bg-marketing-grid opacity-40" />
        <div className="absolute left-1/2 top-0 h-64 w-[600px] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[100px]" />
        <div className="container-page relative flex flex-col items-center gap-6 text-center">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300">
            <Sparkles size={13} /> Sahne senin
          </span>
          <h2 className="max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Bir sonraki yayınında taraftarların savaşsın.
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-white/50">
            Kendi takımlarını kur, kalıcı bağlantını al ve OBS’e ekle. İlk turunu 2 dakika içinde
            başlat.
          </p>
          <Link to={me ? '/panel' : '/kayit'}>
            <Button variant="brand" size="lg" icon={<ArrowRight size={17} />}>
              {me ? 'Stüdyoya git' : 'Hemen başla'}
            </Button>
          </Link>
        </div>
      </section>

      <section id="paketler" className="scroll-mt-24 bg-ink-50 py-20 sm:py-28">
        <div className="container-page">
          <PricingPlans />
        </div>
      </section>

      {/* SSS */}
      <section id="sss" className="scroll-mt-24 bg-white py-20 text-ink-900 sm:py-24">
        <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <span className="badge-neutral">SSS</span>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight">
              Merak edilenler.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">
              Aradığını bulamadıysan yayıncı desteğimize yazabilirsin.
            </p>
          </div>
          <div className="divide-y divide-ink-100 border-y border-ink-100">
            {[
              {
                q: 'OBS’e nasıl ekliyorum?',
                a: 'Paneldeki “Yayın bağlantım” sayfasından kalıcı adresini kopyala. OBS’te Kaynaklar → Ekle → Tarayıcı (Browser Source) seç, genişlik 1080, yükseklik 1920 gir. Sahne tam ekran dikey olarak ölçeklenir.',
              },
              {
                q: 'İzleyiciler nasıl katılıyor?',
                a: 'Canlı yayın sohbetinden komut yazarlar: örneğin “!gir aslan”. Komutlar seçtiğin dile göre değişir; panelde tüm komutları özelleştirebilirsin. Aynı izleyici aynı anda yalnızca bir takımda olabilir.',
              },
              {
                q: 'Ödeme sonrası panel ne zaman açılır?',
                a: 'Ödeme sağlayıcısından gelen imzalı webhook sunucuda doğrulandığında abonelik aktifleşir. Başarılı ödeme bildirimi tekrar gelse bile ikinci kez işlenmez; tarayıcıdan gelen “başarılı” bilgisine güvenilmez.',
              },
              {
                q: 'Takım sayısını sonradan değiştirebilir miyim?',
                a: 'Paketinin izin verdiği ölçüde evet. 2, 4 veya 8 takım arasında geçiş yapabilirsin. Oyun bağlantın değişmez; aktif maç varsa değişiklikler bir sonraki turda uygulanır.',
              },
              {
                q: 'Logolar ve armalar konusunda nelere dikkat etmeliyim?',
                a: 'Yalnızca kullanım hakkına sahip olduğun görselleri yükle. Kulüp ve marka armaları gibi lisans gerektiren varlıklar için gerekli izinleri almak yayıncının sorumluluğundadır.',
              },
            ].map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-ink-900">
                  {item.q}
                  <ChevronDown
                    size={18}
                    className="shrink-0 text-ink-400 transition group-open:rotate-180"
                  />
                </summary>
                <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-ink-500">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-ink-950 py-10">
        <div className="container-page flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3">
            <Logo theme="dark" />
            <p className="max-w-xs text-[11px] leading-relaxed text-white/35">
              Yayıncılar için çok kiracılı 3D taraftar savaşı platformu. Her yayıncıya kendi arenası.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-white/40">
            <a href="#ozellikler" className="hover:text-white">
              Özellikler
            </a>
            <Link to="/oyunlar" className="hover:text-white">
              Oyunlar
            </Link>
            <Link to="/satin-al" className="hover:text-white">
              Paketler
            </Link>
            <Link to="/giris" className="hover:text-white">
              Yayıncı girişi
            </Link>
            <span className="text-white/25">© {new Date().getFullYear()} Taraftar Savaşı</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
