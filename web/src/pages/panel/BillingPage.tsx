import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  CreditCard,
  ExternalLink,
  Info,
  Loader2,
  Lock,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import type { CheckoutResponse, PackageDTO, PaymentDTO, SubscriptionDTO } from '@shared/types';
import { formatPrice } from '@shared/defaults';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate, formatDateTime, paymentStatusLabel } from '../../lib/format';
import { useToast } from '../../lib/toast';
import { Button, EmptyState, PageHeader, SectionCard, StatusBadge } from '../../components/ui';

interface SubscriptionHistoryRow {
  id: string;
  status: string;
  startsAt: string;
  expiresAt: string;
  packageName: string;
}

export function BillingPage() {
  const { me, refresh } = useAuth();
  const { success, error: toastError, toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const selectedPackageId = params.get('paket');
  const statusParam = params.get('durum');

  const [packages, setPackages] = useState<PackageDTO[]>([]);
  const [payments, setPayments] = useState<PaymentDTO[]>([]);
  const [history, setHistory] = useState<SubscriptionHistoryRow[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionDTO | null>(me?.subscription ?? null);
  const [loading, setLoading] = useState(true);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [durationFilter, setDurationFilter] = useState<number | null>(null);

  useEffect(() => {
    if (statusParam === 'iptal') {
      toast('Ödeme iptal edildi', { kind: 'info', description: 'Dilediğin zaman tekrar deneyebilirsin.' });
    }
    if (statusParam === 'basari') {
      success('Ödemen doğrulandı', 'Paketin aktif. Stüdyonu kullanmaya başlayabilirsin.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    try {
      const [packagesResult, paymentsResult, subscriptionResult] = await Promise.all([
        api.get<{ packages: PackageDTO[] }>('/api/packages'),
        api.get<{ payments: PaymentDTO[] }>('/api/billing/payments'),
        api.get<{ subscription: SubscriptionDTO | null; history: SubscriptionHistoryRow[] }>(
          '/api/billing/subscription',
        ),
      ]);
      setPackages(packagesResult.packages);
      setDurationFilter((current) => {
        if (current !== null) return current;
        const selected = packagesResult.packages.find((pkg) => pkg.id === selectedPackageId);
        if (selected) return selected.durationDays;
        const thirty = packagesResult.packages.find((pkg) => pkg.durationDays === 30);
        return thirty?.durationDays ?? packagesResult.packages[0]?.durationDays ?? 30;
      });
      setPayments(paymentsResult.payments);
      setSubscription(subscriptionResult.subscription);
      setHistory(subscriptionResult.history);
      await refresh();
    } catch (caught) {
      toastError(
        'Ödeme bilgileri yüklenemedi',
        caught instanceof ApiError ? caught.message : 'Lütfen sayfayı yenile.',
      );
    } finally {
      setLoading(false);
      setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const durations = useMemo(
    () =>
      Array.from(new Set(packages.map((pkg) => pkg.durationDays))).sort((a, b) => a - b),
    [packages],
  );
  const sortedPackages = useMemo(
    () =>
      [...packages]
        .filter((pkg) => durationFilter === null || pkg.durationDays === durationFilter)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.maxTeams - b.maxTeams),
    [packages, durationFilter],
  );

  const startCheckout = async (pkg: PackageDTO) => {
    setCheckoutId(pkg.id);
    try {
      const result = await api.post<CheckoutResponse>('/api/billing/checkout', { packageId: pkg.id });
      if (result.redirectUrl.startsWith('http')) {
        window.location.assign(result.redirectUrl);
      } else {
        navigate(result.redirectUrl);
      }
    } catch (caught) {
      toastError(
        'Ödeme başlatılamadı',
        caught instanceof ApiError ? caught.message : 'Lütfen tekrar dene.',
      );
      setCheckoutId(null);
    }
  };

  const activePackageId = subscription?.packageId ?? null;
  const hasAccess = Boolean(subscription);
  const pendingPayment = payments.find((payment) => payment.status === 'pending') ?? null;

  return (
    <div>
      <PageHeader
        eyebrow="Hesap"
        title="Paketim ve ödemeler"
        description="Paketini yükselt, ödeme geçmişini görüntüle. Panel erişimi yalnızca sunucuda doğrulanan başarılı ödeme ile açılır."
        actions={
          <Button
            variant="secondary"
            icon={<RefreshCw size={15} />}
            onClick={() => {
              setPaymentsLoading(true);
              void load();
            }}
            loading={paymentsLoading}
          >
            Yenile
          </Button>
        }
      />

      {!hasAccess ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <Lock size={17} />
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-900">Stüdyo henüz kilitli</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-800/80">
                Aşağıdan bir paket seçip ödemeyi tamamla. Başarılı ödeme sağlayıcıdan imzalı webhook
                olarak geldiğinde hesabın otomatik aktifleşir. Tarayıcıdan gelen başarı bilgisi tek
                başına yeterli değildir.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Mevcut paket */}
      <div className="mb-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="card relative overflow-hidden bg-ink-950 p-6 text-white sm:p-7">
          <div className="absolute inset-0 bg-marketing-grid opacity-40" />
          <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Mevcut paket
                </p>
                <h2 className="mt-1.5 text-2xl font-bold">{subscription?.packageName ?? 'Aktif paket yok'}</h2>
              </div>
              {subscription ? (
                <span className="badge bg-brand-400/15 text-brand-300 ring-1 ring-inset ring-brand-400/30">
                  <BadgeCheck size={12} /> Aktif
                </span>
              ) : (
                <span className="badge bg-white/10 text-white/60">Kilitli</span>
              )}
            </div>

            {subscription ? (
              <>
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/35">Takım hakkı</p>
                    <p className="mt-1 text-lg font-semibold">{subscription.maxTeams} takım</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/35">Başlangıç</p>
                    <p className="mt-1 text-sm font-medium text-white/80">{formatDate(subscription.startsAt)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/35">Bitiş</p>
                    <p className="mt-1 text-sm font-medium text-white/80">{formatDate(subscription.expiresAt)}</p>
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
                  <Link to="/panel">
                    <Button variant="brand" size="sm" icon={<ArrowRight size={14} />}>
                      Stüdyoya git
                    </Button>
                  </Link>
                  <span className="text-[11px] text-white/35">
                    Kalan süre: {Math.max(0, Math.ceil((Date.parse(subscription.expiresAt) - Date.now()) / 86400000))} gün
                  </span>
                </div>
              </>
            ) : (
              <div className="mt-auto pt-6">
                <p className="text-sm text-white/50">
                  Paket seçerek kendi arenanı kurmaya başla.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="card card-pad">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <ShieldCheck size={17} />
            </span>
            <div>
              <h3 className="text-[15px] font-semibold text-ink-900">Ödeme güvenliği</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">
                Ödeme sonucu yalnızca sağlayıcı webhook’u ile doğrulanır; aynı olay ID’si ikinci kez
                işlenmez.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-[12px] text-ink-600">
            {[
              'Sunucu tarafı imza doğrulaması',
              'Tutar ve para birimi eşleşme kontrolü',
              'Bekleyen / başarısız ödemeler ayrı takip',
              'API anahtarları yalnızca sunucuda',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check size={12} className="mt-0.5 shrink-0 text-brand-600" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-ink-50 p-3 text-[11px] leading-relaxed text-ink-500">
            <Info size={13} className="mt-0.5 shrink-0" />
            <span>
              Bu ortamda test ödeme sağlayıcısı etkin. Kart bilgisi istenmez; ödeme sonucu güvenli
              webhook akışıyla simüle edilir.
            </span>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink-950">
              {hasAccess ? 'Paketini yükselt' : 'Paketini seç'}
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              Aynı oyun motoru; süre, takım sayısı ve özellikler pakete göre değişir.
            </p>
          </div>
          {durations.length > 1 ? (
            <div className="flex flex-wrap gap-1.5">
              {durations.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setDurationFilter(days)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                    durationFilter === days
                      ? 'bg-ink-900 text-white'
                      : 'border border-ink-200 bg-white text-ink-500 hover:border-ink-300'
                  }`}
                >
                  {days === 1 ? '1 gün' : days === 7 ? '7 gün' : days === 30 ? '30 gün' : `${days} gün`}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="card h-72 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {sortedPackages.map((pkg) => {
              const isCurrent = activePackageId === pkg.id;
              const isSelected = selectedPackageId === pkg.id;
              const isLower = Boolean(subscription && pkg.maxTeams < subscription.maxTeams);
              return (
                <div
                  key={pkg.id}
                  className={`relative flex flex-col rounded-2xl border bg-white p-5 transition ${
                    isSelected
                      ? 'border-brand-500 shadow-glow'
                      : pkg.highlight
                        ? 'border-ink-900'
                        : 'border-ink-100 shadow-card'
                  }`}
                >
                  {pkg.highlight ? (
                    <span className="absolute -top-2.5 left-5 rounded-full bg-ink-900 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                      Popüler
                    </span>
                  ) : null}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                        {pkg.name}
                      </p>
                      <p className="mt-1 text-sm font-medium text-ink-600">{pkg.tagline}</p>
                    </div>
                    {isCurrent ? <StatusBadge status="ok">Mevcut</StatusBadge> : null}
                  </div>
                  <div className="mt-4 flex items-end gap-1">
                    <span className="font-display text-3xl font-bold tracking-tight text-ink-950">
                      {formatPrice(pkg.priceCents, pkg.currency)}
                    </span>
                    <span className="pb-1 text-[11px] text-ink-400">
                      / {pkg.durationDays === 1 ? 'gün' : `${pkg.durationDays} gün`}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-ink-500">
                    {pkg.maxTeams} takım · 3D stüdyo
                  </p>
                  <ul className="mt-4 flex-1 space-y-1.5">
                    {pkg.features.slice(0, 4).map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-[12px] text-ink-600">
                        <Check size={11} className="mt-0.5 shrink-0 text-brand-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={isCurrent ? 'secondary' : isSelected ? 'brand' : 'primary'}
                    className="mt-5 w-full"
                    disabled={isCurrent || isLower}
                    loading={checkoutId === pkg.id}
                    onClick={() => void startCheckout(pkg)}
                    icon={isCurrent ? <BadgeCheck size={15} /> : <CreditCard size={15} />}
                  >
                    {isCurrent
                      ? 'Mevcut paketin'
                      : isLower
                        ? 'Daha küçük paket'
                        : hasAccess
                          ? `${pkg.name} paketine geç`
                          : 'Bu paketle başla'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        {pendingPayment ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <TriangleAlert size={15} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-xs leading-relaxed text-amber-900">
                <span className="font-semibold">Bekleyen ödeme:</span>{' '}
                {pendingPayment.packageName} · {formatPrice(pendingPayment.amountCents, pendingPayment.currency)}.
                Ödeme tamamlanmadığı için panel erişimi açılmadı.
              </p>
            </div>
            {pendingPayment.provider === 'test' ? (
              <Link to={`/odeme/test/${pendingPayment.id}`}>
                <Button size="sm" variant="secondary" icon={<ExternalLink size={13} />}>
                  Ödemeye devam et
                </Button>
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <SectionCard
          title="Ödeme geçmişi"
          description="Tüm ödeme denemeleri; başarısız ve bekleyen ödemeler ayrı durumlarda tutulur."
          icon={<ReceiptText size={17} />}
          bodyClassName="p-0"
        >
          {paymentsLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-ink-400">
              <Loader2 size={14} className="animate-spin" /> Yükleniyor...
            </div>
          ) : payments.length === 0 ? (
            <EmptyState
              icon={<ReceiptText size={20} />}
              title="Henüz ödeme yok"
              description="Paket seçtiğinde ödeme denemeleri burada listelenir."
            />
          ) : (
            <div className="table-wrap border-0 shadow-none">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Paket</th>
                    <th>Tutar</th>
                    <th>Sağlayıcı</th>
                    <th>Durum</th>
                    <th>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const status = paymentStatusLabel(payment.status);
                    return (
                      <tr key={payment.id}>
                        <td>
                          <span className="font-medium text-ink-900">{payment.packageName}</span>
                        </td>
                        <td className="whitespace-nowrap font-medium">
                          {formatPrice(payment.amountCents, payment.currency)}
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
                            <CreditCard size={12} />
                            {payment.provider === 'test'
                              ? 'Test sağlayıcı'
                              : payment.provider === 'stripe'
                                ? 'Stripe'
                                : payment.provider === 'shopier'
                                  ? 'Shopier'
                                  : payment.provider === 'manual'
                                    ? 'Manuel lisans'
                                    : payment.provider}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={status.tone}>
                            {status.label}
                          </StatusBadge>
                        </td>
                        <td className="whitespace-nowrap text-xs text-ink-500">
                          {formatDateTime(payment.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Abonelik geçmişi"
          description="Lisans dönemleri ve durumları."
          icon={<CalendarClock size={17} />}
        >
          {history.length === 0 ? (
            <p className="text-xs leading-relaxed text-ink-400">
              Başarılı bir ödemeden sonra abonelik kayıtların burada görünür.
            </p>
          ) : (
            <ul className="space-y-3">
              {history.map((row) => (
                <li key={row.id} className="rounded-xl border border-ink-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-ink-800">{row.packageName}</span>
                    <StatusBadge
                      status={
                        row.status === 'active'
                          ? 'ok'
                          : row.status === 'expired'
                            ? 'neutral'
                            : 'bad'
                      }
                    >
                      {row.status === 'active' ? 'Aktif' : row.status === 'expired' ? 'Süresi doldu' : 'İptal'}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-[11px] text-ink-400">
                    {formatDate(row.startsAt)} → {formatDate(row.expiresAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-brand-50/60 p-3 text-[11px] leading-relaxed text-brand-800">
            <Sparkles size={13} className="mt-0.5 shrink-0 text-brand-600" />
            Yükseltme yaptığında kalan günlerin korunur; yeni lisans süresi mevcut bitiş tarihinin
            üzerine eklenir.
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
