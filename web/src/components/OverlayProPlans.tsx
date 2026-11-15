import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bot, Crown, Layers3, ListOrdered, Sparkles, Target, Volume2 } from 'lucide-react';
import type { PackageDTO } from '@shared/types';
import { formatPrice } from '@shared/defaults';
import { api } from '../lib/api';
import { startCheckout } from '../lib/checkout';
import { useAuth } from '../lib/auth';
import { Button } from './ui';

export function OverlayProPlans() {
  const { me } = useAuth();
  const [offers, setOffers] = useState<PackageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ offers: PackageDTO[] }>('/api/arcade/offers')
      .then((result) => setOffers(result.offers.filter((offer) => offer.gameKey === 'overlay_pro' && offer.isActive !== false)))
      .catch(() => setOffers([]))
      .finally(() => setLoading(false));
  }, []);

  const ordered = useMemo(() => [...offers].sort((a, b) => a.durationDays - b.durationDays), [offers]);
  const buy = async (offer: PackageDTO) => {
    if (!me) {
      window.location.assign('/kayit?next=/satin-al');
      return;
    }
    setBuying(offer.id);
    try {
      await startCheckout(offer.id);
    } catch {
      setBuying(null);
    }
  };

  return (
    <section className="container-page py-8">
      <div className="rounded-[32px] border border-violet-200 bg-[linear-gradient(135deg,#faf5ff_0%,#fff7ed_100%)] p-6 shadow-card sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700">
              <Sparkles size={11} /> Yeni ürün
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">Overlay Pro</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
              Oyun sahnesinin üstüne eklenen profesyonel OBS katmanı. Liderlik tablosu, hedef barı,
              kazanan kartı ve bot duyurularıyla yayınını tek bakışta zenginleştir.
            </p>
          </div>
          <span className="rounded-full border border-violet-200 bg-white/80 px-3 py-1.5 text-[10px] font-semibold text-violet-700">
            OBS Browser Source
          </span>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-ink-100 bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Oyun lisansına dahil</p>
            <h3 className="mt-1 text-lg font-bold text-ink-950">Temel overlay</h3>
            <ul className="mt-3 space-y-2 text-[11px] text-ink-500">
              <li className="flex gap-2"><Layers3 size={13} className="text-brand-600" /> Oda adı, oyuncu sayısı, tur</li>
              <li className="flex gap-2"><ListOrdered size={13} className="text-brand-600" /> Son olay kartı</li>
              <li className="flex gap-2"><Bot size={13} className="text-brand-600" /> Meydan Bot temel duyurusu</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-violet-300 bg-white p-5 shadow-[0_18px_50px_-30px_rgba(109,40,217,0.5)]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Pro katman</p>
            <h3 className="mt-1 text-lg font-bold text-ink-950">Overlay Pro</h3>
            <div className="mt-3 grid gap-2 text-[11px] text-ink-600 sm:grid-cols-2">
              <span className="flex gap-1.5"><Crown size={13} className="text-violet-600" /> Liderlik tablosu</span>
              <span className="flex gap-1.5"><Target size={13} className="text-violet-600" /> Canlı hedef barı</span>
              <span className="flex gap-1.5"><Sparkles size={13} className="text-violet-600" /> Kazanan kartı</span>
              <span className="flex gap-1.5"><Bot size={13} className="text-violet-600" /> Meydan Bot</span>
              <span className="flex gap-1.5"><Volume2 size={13} className="text-violet-600" /> TTS ile uyumlu</span>
              <span className="flex gap-1.5"><Layers3 size={13} className="text-violet-600" /> Gelişmiş katmanlar</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {loading ? (
            <div className="h-24 animate-pulse rounded-2xl bg-white/70" />
          ) : ordered.length === 0 ? (
            <p className="text-[11px] text-ink-500">Overlay Pro şu anda satışta değil.</p>
          ) : (
            ordered.map((offer) => (
              <div key={offer.id} className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${offer.durationDays >= 365 ? 'border-violet-300 bg-white' : 'border-ink-100 bg-white/80'}`}>
                <div>
                  <p className="text-[11px] font-semibold text-ink-800">{offer.name}</p>
                  <p className="mt-1 text-2xl font-bold text-ink-950">{formatPrice(offer.priceCents, offer.currency)}</p>
                  <p className="text-[9px] text-ink-400">{offer.durationDays >= 365 ? '365 gün · tek ödeme' : '30 gün · tek ödeme'}</p>
                </div>
                <Button variant={offer.durationDays >= 365 ? 'brand' : 'secondary'} size="sm" loading={buying === offer.id} icon={<ArrowRight size={13} />} onClick={() => void buy(offer)}>
                  Satın al
                </Button>
              </div>
            ))
          )}
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-ink-400">
          Overlay Pro, oyun lisansından ayrı bir üründür. Tüm oyun paketine dahil değildir; mevcut oyun
          lisansınla birlikte kullanılır. OBS’e oda bağlantısını ekledikten sonra otomatik görünür.
        </p>
      </div>
    </section>
  );
}
