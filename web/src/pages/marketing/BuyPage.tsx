import { Link } from 'react-router-dom';
import { ArrowRight, Check, CreditCard, ShieldAlert, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui';
import { MarketingFooter, MarketingHeader } from '../../components/MarketingHeader';
import { GameStoreGrid } from '../../components/GameStoreGrid';
import { BundlePlans } from '../../components/BundlePlans';
import { OverlayProPlans } from '../../components/OverlayProPlans';

export function BuyPage() {
  return (
    <div className="min-h-screen bg-[#fbf7f0] text-ink-900">
      <MarketingHeader />
      <section className="relative overflow-hidden border-b border-[#eee7dc] bg-[#fffaf4]">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#ffe2ef] blur-[90px]" />
        <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-[#dff5ea] blur-[90px]" />
        <div className="container-page relative py-14 text-center sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e4dccf] bg-white px-3.5 py-1.5 text-[11px] font-semibold text-ink-600">
            <ShoppingBag size={12} className="text-brand-600" /> Oyun mağazası
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance font-display text-4xl font-bold leading-[1.06] tracking-tight text-ink-950 sm:text-5xl">
            Oyunu satın al. Kendine uyarla. Yayına al.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ink-500 sm:text-base">
            İstersen tek bir oyunun 1/30 günlük lisansını al, istersen tüm oyunları günlük, aylık
            veya yıllık paketle aç. Lisans süresince oyunu özelleştirip kendi yayın odanda kullan.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-ink-400">
            <span className="inline-flex items-center gap-1.5">
              <Check size={12} className="text-brand-600" /> Oyun bazlı lisans
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check size={12} className="text-brand-600" /> Otomatik yenileme yok
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-brand-600" /> Sunucu doğrulamalı ödeme
            </span>
          </div>
        </div>
      </section>

      <section className="container-page pt-10 sm:pt-12">
        <BundlePlans />
      </section>

      <OverlayProPlans />

      <section className="container-page py-12 sm:py-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">Katalog</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink-950">Oyun lisansları</h2>
            <p className="mt-1 text-xs text-ink-500">
              Önce oyunu seç, lisans süresini belirle. Ödeme sonrası oyun panelinde açılır.
            </p>
          </div>
          <Link to="/panel/arcade" className="text-[11px] font-semibold text-brand-700">
            Lisanslarım →
          </Link>
        </div>
        <GameStoreGrid />
      </section>

      <section className="container-page pb-16">
        <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <div className="rounded-3xl border border-[#e9e1d5] bg-white p-6 shadow-card sm:p-8">
            <h2 className="text-xl font-bold tracking-tight text-ink-950">Satın alma sonrası</h2>
            <ul className="mt-4 space-y-3">
              {[
                'Lisans, sunucu tarafında doğrulanan ödeme ile anında aktifleşir.',
                'Panelde oyunun odasını açar, adını ve karşılama metnini özelleştirirsin.',
                'OBS bağlantısını yayınına ekler, platform sohbetini bağlarsın.',
                'Lisans bitince oda kapanır; yenilersen ayarların korunur.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[12px] leading-relaxed text-ink-600">
                  <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                    <Check size={10} strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-[#fffaf0] p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-amber-600" />
              <h2 className="text-lg font-bold text-amber-950">Önemli uyarı</h2>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-amber-900/75">
              Lisanssız oyunlarda yayın odası açılamaz. Oyun ekranında hediye talebi gösterilmez;
              TikTok kurallarına uyum yayıncının sorumluluğundadır. Bağımsız bir platformuz.
            </p>
            <Link to="/uyarilar" className="mt-4 inline-flex">
              <Button variant="secondary" size="sm" icon={<ArrowRight size={13} />}>
                Uyarıları oku
              </Button>
            </Link>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
