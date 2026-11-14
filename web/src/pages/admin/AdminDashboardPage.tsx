import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  Gamepad2,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { AdminOverviewDTO } from '@shared/types';
import { formatPrice } from '@shared/defaults';
import { api, ApiError } from '../../lib/api';
import { formatDateTime, paymentStatusLabel } from '../../lib/format';
import {
  Button,
  PageHeader,
  SectionCard,
  Spinner,
  StatCard,
  StatusBadge,
} from '../../components/ui';

export function AdminDashboardPage() {
  const [data, setData] = useState<AdminOverviewDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AdminOverviewDTO>('/api/admin/overview')
      .then(setData)
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : 'Admin verileri yüklenemedi.'),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Süper admin"
        title="Platform kontrol merkezi"
        description="Fiyatları, süreleri ve oyun vitrinini buradan yönet. Yayıncı hesapları, ödemeler ve manuel lisanslar tek ekranda."
        actions={
          <>
            <Link to="/admin/paketler">
              <Button variant="secondary" icon={<CreditCard size={15} />}>
                Fiyatları yönet
              </Button>
            </Link>
            <Link to="/admin/oyunlar">
              <Button variant="brand" icon={<Gamepad2 size={15} />}>
                Oyun kataloğu
              </Button>
            </Link>
          </>
        }
      />

      {error ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <Spinner label="Admin paneli yükleniyor..." />
      ) : data ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              label="Toplam ciro"
              value={formatPrice(data.totalRevenueCents, data.currency)}
              hint="Başarılı ödemeler"
              icon={<TrendingUp size={17} />}
            />
            <StatCard
              label="Yayıncı"
              value={data.totalPublishers}
              hint={`${data.totalUsers} toplam hesap`}
              icon={<Users size={17} />}
              accent="ink"
            />
            <StatCard
              label="Aktif abonelik"
              value={data.activeSubscriptions}
              hint="Süresi devam eden lisanslar"
              icon={<BadgeCheck size={17} />}
              accent="violet"
            />
            <StatCard
              label="Katalog"
              value={`${data.liveProducts} / ${data.totalProducts}`}
              hint="Yayında / toplam oyun"
              icon={<Gamepad2 size={17} />}
              accent="amber"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
            <SectionCard
              title="Son ödemeler"
              description="Tüm yayıncıların ödeme hareketleri."
              icon={<ReceiptText size={16} />}
              action={
                <Link to="/admin/odemeler" className="text-[11px] font-medium text-brand-600">
                  Tümünü gör
                </Link>
              }
              bodyClassName="p-0"
            >
              <div className="table-wrap border-0 shadow-none">
                <table className="table-base min-w-0">
                  <thead>
                    <tr>
                      <th>Yayıncı</th>
                      <th>Paket</th>
                      <th>Tutar</th>
                      <th>Durum</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentPayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-ink-400">
                          Henüz ödeme yok.
                        </td>
                      </tr>
                    ) : (
                      data.recentPayments.map((payment) => {
                        const status = paymentStatusLabel(payment.status);
                        return (
                          <tr key={payment.id}>
                            <td>
                              <p className="text-[12px] font-medium text-ink-800">{payment.displayName}</p>
                              <p className="text-[10px] text-ink-400">{payment.userEmail}</p>
                            </td>
                            <td className="text-[11px] text-ink-600">{payment.packageName}</td>
                            <td className="text-[11px] font-semibold text-ink-800">
                              {formatPrice(payment.amountCents, payment.currency)}
                            </td>
                            <td>
                              <StatusBadge status={status.tone}>{status.label}</StatusBadge>
                            </td>
                            <td className="whitespace-nowrap text-[10px] text-ink-400">
                              {formatDateTime(payment.createdAt)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard
              title="Paket satışları"
              description="Gelire göre ilk paketler."
              icon={<BarChart3Icon />}
            >
              {data.packageSales.length === 0 ? (
                <p className="text-xs text-ink-400">Henüz satış yok.</p>
              ) : (
                <div className="space-y-3">
                  {data.packageSales.slice(0, 6).map((row) => {
                    const max = Math.max(1, data.packageSales[0]?.revenueCents ?? 1);
                    return (
                      <div key={row.packageId}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[11px] font-medium text-ink-700">{row.name}</span>
                          <span className="text-[10px] text-ink-400">
                            {row.sales} satış · {formatPrice(row.revenueCents)}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{ width: `${Math.max(4, (row.revenueCents / max) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Link
              to="/admin/paketler"
              className="card card-pad group flex items-center gap-3 transition hover:border-ink-200 hover:shadow-float"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <CreditCard size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink-900">Fiyat ve süre ekle</p>
                <p className="text-[10px] text-ink-400">1 gün, 7 gün, 30 gün veya özel</p>
              </div>
              <ArrowRight size={14} className="text-ink-300 group-hover:text-brand-500" />
            </Link>
            <Link
              to="/admin/oyunlar"
              className="card card-pad group flex items-center gap-3 transition hover:border-ink-200 hover:shadow-float"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
                <Gamepad2 size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink-900">Oyun vitrini</p>
                <p className="text-[10px] text-ink-400">Yeni oyun ekle veya “yakında” yap</p>
              </div>
              <ArrowRight size={14} className="text-ink-300 group-hover:text-brand-500" />
            </Link>
            <Link
              to="/admin/yayincilar"
              className="card card-pad group flex items-center gap-3 transition hover:border-ink-200 hover:shadow-float"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
                <ShieldCheck size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink-900">Manuel lisans ver</p>
                <p className="text-[10px] text-ink-400">Shopier satışını elle aktive et</p>
              </div>
              <ArrowRight size={14} className="text-ink-300 group-hover:text-brand-500" />
            </Link>
          </div>

          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-ink-100 bg-white p-4 text-[11px] leading-relaxed text-ink-500 shadow-card">
            <Sparkles size={14} className="mt-0.5 shrink-0 text-brand-600" />
            <span>
              Fiyat değişiklikleri <strong>yeni ödemeleri</strong> etkiler; mevcut aboneliklerin
              bitiş tarihini değiştirmez. Paket pasifleştirildiğinde yeni satış durur, mevcut
              lisanslar devam eder.
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}

function BarChart3Icon() {
  return <TrendingUp size={16} />;
}
