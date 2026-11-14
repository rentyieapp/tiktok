import { useEffect, useMemo, useState } from 'react';
import { Check, Crown, Sparkles } from 'lucide-react';
import type { PackageDTO } from '@shared/types';
import { ARCADE_GAME_LIST } from '@shared/arcade';
import { formatPrice } from '@shared/defaults';
import { useAuth } from '../lib/auth';
import { api, ApiError } from '../lib/api';
import { Button } from './ui';
import { useToast } from '../lib/toast';
import { getStoredCoupon, setStoredCoupon, startCheckout } from '../lib/checkout';

export function BundlePlans({ compact = false }: { compact?: boolean }) {
  const { me } = useAuth();
  const { error: toastError } = useToast();
  const [offers, setOffers] = useState<PackageDTO[]>([]);
  const [buying, setBuying] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [coupon, setCoupon] = useState(() => getStoredCoupon());
  const [couponSaved, setCouponSaved] = useState(false);

  useEffect(() => {
    api
      .get<{ offers: PackageDTO[] }>('/api/arcade/offers')
      .then((result) =>
        setOffers(
          result.offers
            .filter((offer) => offer.gameKey === '*' && offer.isActive !== false)
            .sort((a, b) => a.durationDays - b.durationDays),
        ),
      )
      .catch(() => setOffers([]))
      .finally(() => setLoading(false));
  }, []);

  const ownedKeys = useMemo(
    () => new Set((me?.licenses ?? []).map((license) => license.gameKey)),
    [me?.licenses],
  );
  const allOwned = ARCADE_GAME_LIST.every((game) => ownedKeys.has(game.key));

  const buy = async (offer: PackageDTO) => {
    if (!me) {
      window.location.assign('/kayit?next=/satin-al');
      return;
    }
    setBuying(offer.id);
    try {
      await startCheckout(offer.id);
    } catch (caught) {
      setBuying(null);
      toastError(
        'Paket başlatılamadı',
        caught instanceof ApiError ? caught.message : 'Tekrar dene.',
      );
    }
  };

  if (loading || offers.length === 0) return null;

  return (
    <section
      className={`overflow-hidden rounded-3xl border border-[#e9e1d5] bg-white ${
        compact ? 'p-4 sm:p-5' : 'p-5 sm:p-7'
      } shadow-card`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600">
            <Crown size={12} /> Tüm oyunlar paketi
          </p>
          <h2 className={`mt-1 font-bold tracking-tight text-ink-950 ${compact ? 'text-lg' : 'text-2xl'}`}>
            Tek lisans, {ARCADE_GAME_LIST.length} oyun.
          </h2>
          <p className="mt-1 max-w-lg text-[11px] leading-relaxed text-ink-500">
            Tüm arcade oyunlarına birlikte eriş. Günlük, aylık veya yıllık seç; süre boyunca
            istediğin oyunun odasını aç, özelleştir ve yayına al.
          </p>
        </div>
        {allOwned ? (
          <span className="badge-ok text-[10px]">
            <Check size={11} /> Tüm oyunlar aktif
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-semibold text-amber-800">
            <Sparkles size={10} /> Tek tek almaktan avantajlı
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          className="input h-8 w-full max-w-[180px] text-[11px] uppercase"
          value={coupon}
          onChange={(event) => {
            setCoupon(event.target.value.toUpperCase());
            setCouponSaved(false);
          }}
          placeholder="Kupon kodu"
          aria-label="Kupon kodu"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setStoredCoupon(coupon);
            setCouponSaved(true);
          }}
        >
          {couponSaved ? 'Kaydedildi' : 'Uygula'}
        </Button>
        {couponSaved && coupon ? (
          <span className="text-[10px] font-semibold text-emerald-700">Kupon ödeme adımında uygulanacak.</span>
        ) : null}
      </div>

      <div className={`mt-4 grid gap-2.5 ${compact ? 'sm:grid-cols-3' : 'sm:grid-cols-3'}`}>
        {offers.map((offer) => {
          const isYearly = offer.durationDays >= 365;
          return (
            <div
              key={offer.id}
              className={`relative rounded-2xl border p-3.5 ${
                isYearly
                  ? 'border-amber-300 bg-[#fffaf0]'
                  : 'border-[#eee7dc] bg-[#fffaf4]'
              }`}
            >
              {isYearly ? (
                <span className="absolute -top-2 right-3 rounded-full bg-amber-500 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
                  En avantajlı
                </span>
              ) : null}
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                {offer.durationDays === 1
                  ? 'Günlük'
                  : offer.durationDays === 30
                    ? 'Aylık'
                    : 'Yıllık'}
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-ink-950">
                {formatPrice(offer.priceCents, offer.currency)}
              </p>
              <p className="mt-0.5 text-[9px] text-ink-400">
                {offer.durationDays === 1
                  ? '24 saat tüm oyunlar'
                  : offer.durationDays === 30
                    ? '30 gün tüm oyunlar'
                    : '365 gün tüm oyunlar'}
              </p>
              <Button
                variant={isYearly ? 'brand' : 'secondary'}
                size="sm"
                className="mt-3 w-full"
                loading={buying === offer.id}
                onClick={() => void buy(offer)}
              >
                {allOwned ? 'Süreyi uzat' : 'Paketi al'}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
