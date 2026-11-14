import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  ExternalLink,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import type { AdminPaymentRow } from '@shared/types';
import { formatPrice } from '@shared/defaults';
import { api, ApiError } from '../../lib/api';
import { formatDateTime, paymentStatusLabel } from '../../lib/format';
import { useToast } from '../../lib/toast';
import {
  Button,
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
} from '../../components/ui';

export function AdminPaymentsPage() {
  const { error: toastError } = useToast();
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'succeeded' | 'pending' | 'failed'>('all');

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.get<{ payments: AdminPaymentRow[] }>('/api/admin/payments');
      setPayments(result.payments);
    } catch (caught) {
      toastError('Ödemeler yüklenemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      statusFilter === 'all'
        ? payments
        : payments.filter((payment) => payment.status === statusFilter),
    [payments, statusFilter],
  );

  const succeeded = payments.filter((payment) => payment.status === 'succeeded');
  const revenue = succeeded.reduce((sum, payment) => sum + payment.amountCents, 0);
  const pending = payments.filter((payment) => payment.status === 'pending').length;
  const failed = payments.filter((payment) => payment.status === 'failed').length;

  return (
    <div>
      <PageHeader
        eyebrow="Süper admin"
        title="Ödemeler"
        description="Tüm yayıncıların ödeme hareketleri. Shopier ve manuel lisanslar da burada görünür."
        actions={
          <Button variant="secondary" icon={<RefreshCw size={15} />} loading={loading} onClick={() => void load()}>
            Yenile
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Toplam ciro" value={formatPrice(revenue)} icon={<Wallet size={17} />} />
        <StatCard label="Başarılı ödeme" value={succeeded.length} icon={<ShieldCheck size={17} />} accent="ink" />
        <StatCard label="Bekleyen" value={pending} icon={<ReceiptText size={17} />} accent="amber" />
        <StatCard label="Başarısız" value={failed} icon={<CreditCard size={17} />} accent="violet" />
      </div>

      <SectionCard
        title="Ödeme geçmişi"
        description="Tüm sağlayıcılar; test, Stripe, Shopier ve manuel lisanslar."
        icon={<ReceiptText size={16} />}
        action={
          <div className="flex flex-wrap gap-1">
            {[
              { value: 'all', label: 'Tümü' },
              { value: 'succeeded', label: 'Başarılı' },
              { value: 'pending', label: 'Bekleyen' },
              { value: 'failed', label: 'Başarısız' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setStatusFilter(item.value as typeof statusFilter)}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
                  statusFilter === item.value
                    ? 'bg-ink-900 text-white'
                    : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
        bodyClassName="p-0"
      >
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="h-10 animate-pulse rounded-lg bg-ink-50" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<ReceiptText size={20} />} title="Ödeme bulunamadı" description="Bu filtreyle eşleşen kayıt yok." />
        ) : (
          <div className="table-wrap border-0 shadow-none">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Yayıncı</th>
                  <th>Paket</th>
                  <th>Tutar</th>
                  <th>Sağlayıcı</th>
                  <th>Durum</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((payment) => {
                  const status = paymentStatusLabel(payment.status);
                  return (
                    <tr key={payment.id}>
                      <td>
                        <p className="text-[12px] font-medium text-ink-800">{payment.displayName}</p>
                        <p className="text-[10px] text-ink-400">{payment.userEmail}</p>
                      </td>
                      <td className="text-[11px] text-ink-600">{payment.packageName}</td>
                      <td className="whitespace-nowrap text-[12px] font-semibold text-ink-800">
                        {formatPrice(payment.amountCents, payment.currency)}
                      </td>
                      <td>
                        <span className="badge-neutral text-[9px] uppercase">{providerLabel(payment.provider)}</span>
                      </td>
                      <td>
                        <StatusBadge status={status.tone}>{status.label}</StatusBadge>
                      </td>
                      <td className="whitespace-nowrap text-[10px] text-ink-400">
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

      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-ink-100 bg-white p-4 text-[11px] leading-relaxed text-ink-500 shadow-card">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-brand-600" />
        <span>
          Shopier webhook’u bağlanana kadar Shopier satışlarını
          <Link to="/admin/yayincilar" className="mx-1 font-semibold text-brand-600">
            Yayıncılar → Manuel lisans
          </Link>
          ekranından aktive edebilirsin.
        </span>
      </div>
    </div>
  );
}

function providerLabel(provider: string): string {
  if (provider === 'test') return 'Test';
  if (provider === 'stripe') return 'Stripe';
  if (provider === 'shopier') return 'Shopier';
  if (provider === 'manual') return 'Manuel';
  return provider;
}
