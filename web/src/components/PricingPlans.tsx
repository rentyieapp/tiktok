import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Clock3, Sparkles, Users } from 'lucide-react';
import type { PackageDTO } from '@shared/types';
import { formatPrice } from '@shared/defaults';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button } from './ui';

function durationLabel(days: number): string {
  if (days === 1) return '1 gün';
  if (days === 7) return '7 gün';
  if (days === 30) return '30 gün';
  if (days === 90) return '3 ay';
  if (days === 365) return '1 yıl';
  return `${days} gün`;
}

export function PricingPlans({
  showHeader = true,
  className = '',
}: {
  showHeader?: boolean;
  className?: string;
}) {
  const { me } = useAuth();
  const [packages, setPackages] = useState<PackageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<{ packages: PackageDTO[] }>('/api/packages')
      .then((data) => {
        setPackages(data.packages);
        const unique = Array.from(new Set(data.packages.map((pkg) => pkg.durationDays))).sort(
          (a, b) => a - b,
        );
        const preferred = unique.includes(30) ? 30 : unique[0] ?? null;
        setDuration(preferred);
      })
      .catch(() => setPackages([]))
      .finally(() => setLoading(false));
  }, []);

  const durations = useMemo(
    () =>
      Array.from(new Set(packages.map((pkg) => pkg.durationDays))).sort((a, b) => a - b),
    [packages],
  );

  const activeDuration = duration ?? durations[0] ?? 30;
  const visible = packages
    .filter((pkg) => pkg.durationDays === activeDuration)
    .sort((a, b) => a.maxTeams - b.maxTeams);

  return (
    <div className={className}>
      {showHeader ? (
        <div className="mx-auto max-w-2xl text-center">
          <span className="badge-neutral">Paketler</span>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
            Günlük, haftalık veya aylık. Ne kadar yayın yaparsan o kadar.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-500 sm:text-base">
            Yirmi dört oyun, tek yayıncı hesabı ve kalıcı OBS bağlantısı. Süre bitmeden yenilersen
            kalan günlerin üzerine eklenir.
          </p>
        </div>
      ) : null}

      {durations.length > 1 ? (
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {durations.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setDuration(days)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] font-semibold transition ${
                activeDuration === days
                  ? 'border-ink-900 bg-ink-900 text-white'
                  : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
              }`}
            >
              <Clock3 size={12} /> {durationLabel(days)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {loading
          ? [0, 1, 2].map((index) => <div key={index} className="card h-[420px] animate-pulse bg-white/70" />)
          : visible.map((pkg) => {
              const href = me ? `/panel/odeme?paket=${pkg.id}` : `/kayit?paket=${pkg.id}`;
              return (
                <div
                  key={pkg.id}
                  className={`relative flex flex-col rounded-3xl border p-7 transition duration-200 hover:-translate-y-0.5 ${
                    pkg.highlight
                      ? 'border-brand-300 bg-[#effbf5] text-ink-950 shadow-[0_30px_80px_-38px_rgba(16,185,129,0.35)]'
                      : 'border-[#e9e1d5] bg-white shadow-card'
                  }`}
                >
                  {pkg.highlight ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-500 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                      En çok tercih edilen
                    </span>
                  ) : null}
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-[11px] font-bold uppercase tracking-[0.18em] ${
                        pkg.highlight ? 'text-brand-700' : 'text-ink-400'
                      }`}
                    >
                      {pkg.name}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold ${
                        pkg.highlight ? 'bg-white text-ink-500 ring-1 ring-inset ring-brand-200' : 'bg-ink-100 text-ink-500'
                      }`}
                    >
                      <Clock3 size={9} /> {durationLabel(pkg.durationDays)}
                    </span>
                  </div>
                  <p className={`mt-2 text-sm ${pkg.highlight ? 'text-ink-600' : 'text-ink-500'}`}>
                    {pkg.tagline}
                  </p>
                  <div className="mt-6 flex items-end gap-1.5">
                    <span className="font-display text-4xl font-bold tracking-tight">
                      {formatPrice(pkg.priceCents, pkg.currency)}
                    </span>
                    <span className={`pb-1 text-xs ${pkg.highlight ? 'text-ink-400' : 'text-ink-400'}`}>
                      / {durationLabel(pkg.durationDays)}
                    </span>
                  </div>
                  <p className={`mt-1 text-[11px] ${pkg.highlight ? 'text-ink-400' : 'text-ink-400'}`}>
                    <Users size={10} className="mr-1 inline" />
                    Tüm oyunlar · {pkg.durationDays} gün lisans
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-[13px]">
                        <span
                          className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${
                            pkg.highlight ? 'bg-brand-100 text-brand-700' : 'bg-brand-50 text-brand-600'
                          }`}
                        >
                          <Check size={10} strokeWidth={3} />
                        </span>
                        <span className={pkg.highlight ? 'text-ink-700' : 'text-ink-600'}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to={href} className="mt-7">
                    <Button
                      variant={pkg.highlight ? 'brand' : 'primary'}
                      className="w-full"
                      icon={<ArrowRight size={16} />}
                    >
                      {me ? 'Bu paketle devam et' : 'Bu paketle başla'}
                    </Button>
                  </Link>
                </div>
              );
            })}
      </div>

      {!loading && visible.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-8 text-center text-sm text-ink-500">
          Bu süre için aktif paket bulunmuyor. Admin panelinden yeni bir paket ekleyebilirsin.
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-ink-400">
        <span className="inline-flex items-center gap-1.5">
          <Check size={12} className="text-brand-600" /> KDV dahil
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Check size={12} className="text-brand-600" /> Otomatik yenileme yok
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Sparkles size={12} className="text-brand-600" /> Süre bitmeden yenile, kalan günler eklensin
        </span>
      </div>
    </div>
  );
}
