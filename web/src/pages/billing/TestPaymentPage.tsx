import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  CreditCard,
  FlaskConical,
  Loader2,
  Lock,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type { PackageDTO, PaymentDTO } from '@shared/types';
import { formatPrice } from '@shared/defaults';
import { api, ApiError } from '../../lib/api';
import { Button, Field, Spinner, TextInput } from '../../components/ui';
import { Logo } from '../../components/Logo';

interface TestPaymentResponse {
  payment: PaymentDTO;
  package: PackageDTO;
  providerName: string;
  testMode: boolean;
}

export function TestPaymentPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<TestPaymentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<'success' | 'failure' | null>(null);
  const [result, setResult] = useState<'success' | 'failure' | null>(null);

  useEffect(() => {
    if (!paymentId) return;
    api
      .get<TestPaymentResponse>(`/api/test-payments/${paymentId}`)
      .then(setData)
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : 'Ödeme bulunamadı.'),
      )
      .finally(() => setLoading(false));
  }, [paymentId]);

  const pay = async (outcome: 'success' | 'failure') => {
    if (!paymentId) return;
    setProcessing(outcome);
    setError(null);
    try {
      await api.post(`/api/test-payments/${paymentId}/pay`, { outcome });
      setResult(outcome);
      if (outcome === 'success') {
        window.setTimeout(() => {
          navigate(`/odeme/basarili?payment=${paymentId}`);
        }, 900);
      }
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Test ödeme simülasyonu tamamlanamadı.',
      );
      setProcessing(null);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void pay('success');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <Spinner label="Ödeme yükleniyor..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 px-5">
        <div className="card card-pad max-w-md text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-500">
            <XCircle size={22} />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-ink-900">Ödeme bulunamadı</h1>
          <p className="mt-2 text-sm text-ink-500">{error}</p>
          <Link to="/panel/odeme" className="mt-5 inline-block">
            <Button variant="secondary">Ödeme sayfasına dön</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { payment, package: pkg } = data;
  const alreadySucceeded = payment.status === 'succeeded' || result === 'success';
  const alreadyFailed = payment.status === 'failed' || result === 'failure';

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <Logo />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
            <FlaskConical size={12} /> Test ödeme modu
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8 sm:py-12">
        <Link
          to="/panel/odeme"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft size={14} /> Paket sayfasına dön
        </Link>

        <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <div className="card overflow-hidden">
            <div className="border-b border-ink-100 px-6 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                Test Ödeme Sağlayıcısı
              </p>
              <h1 className="mt-1 text-xl font-bold text-ink-950">Ödemeyi tamamla</h1>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">
                Gerçek kart bilgisi kullanma. Bu sayfa yalnızca geliştirme ortamında, imzalı webhook
                akışını test etmek için gösterilir.
              </p>
            </div>

            {alreadySucceeded ? (
              <div className="px-6 py-10 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <BadgeCheck size={26} />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-ink-900">Ödeme doğrulandı</h2>
                <p className="mt-1.5 text-sm text-ink-500">
                  Aboneliğin aktif edildi. Panele yönlendiriliyorsun...
                </p>
                <div className="mt-5 flex justify-center">
                  <Loader2 size={18} className="animate-spin text-brand-500" />
                </div>
                <Link to="/panel" className="mt-5 inline-block">
                  <Button variant="secondary">Panele git</Button>
                </Link>
              </div>
            ) : alreadyFailed ? (
              <div className="px-6 py-10 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-500">
                  <XCircle size={26} />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-ink-900">Ödeme başarısız</h2>
                <p className="mt-1.5 text-sm text-ink-500">
                  Test kartı reddedildi. Bu ödeme kaydı başarısız olarak tutulur; panel erişimi
                  açılmaz.
                </p>
                <Link to="/panel/odeme" className="mt-5 inline-block">
                  <Button variant="primary">Yeni ödeme başlat</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4 px-6 py-5">
                <Field label="Kart numarası">
                  <div className="relative">
                    <CreditCard size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                    <TextInput
                      value="4242 4242 4242 4242"
                      readOnly
                      className="bg-ink-50 pl-10 font-mono text-xs text-ink-500"
                      aria-label="Test kart numarası"
                    />
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Son kullanma">
                    <TextInput value="12 / 34" readOnly className="bg-ink-50 text-center font-mono text-xs text-ink-500" />
                  </Field>
                  <Field label="CVC">
                    <TextInput value="123" readOnly className="bg-ink-50 text-center font-mono text-xs text-ink-500" />
                  </Field>
                </div>

                {error ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-700">
                    {error}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  variant="brand"
                  size="lg"
                  className="w-full"
                  loading={processing === 'success'}
                  disabled={processing !== null}
                  icon={<Lock size={15} />}
                >
                  {formatPrice(pkg.priceCents, pkg.currency)} öde
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-xs"
                  loading={processing === 'failure'}
                  disabled={processing !== null}
                  onClick={() => void pay('failure')}
                >
                  Başarısız ödeme senaryosunu dene
                </Button>
                <p className="flex items-center justify-center gap-1.5 text-[10px] text-ink-400">
                  <ShieldCheck size={11} />
                  Kart bilgileri hiçbir sunucuya gönderilmez.
                </p>
              </form>
            )}
          </div>

          <div className="card h-fit">
            <div className="border-b border-ink-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-ink-900">Sipariş özeti</h2>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{pkg.name} paketi</p>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    {pkg.maxTeams} takım · {pkg.durationDays} gün lisans
                  </p>
                </div>
                <span className="font-display text-lg font-bold text-ink-950">
                  {formatPrice(pkg.priceCents, pkg.currency)}
                </span>
              </div>
              <div className="h-px bg-ink-100" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-500">Ara toplam</span>
                <span className="font-medium text-ink-800">{formatPrice(pkg.priceCents, pkg.currency)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-500">KDV</span>
                <span className="font-medium text-ink-800">Dahil</span>
              </div>
              <div className="h-px bg-ink-100" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink-900">Toplam</span>
                <span className="font-display text-xl font-bold text-ink-950">
                  {formatPrice(pkg.priceCents, pkg.currency)}
                </span>
              </div>
              <div className="rounded-xl bg-ink-50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                  Ödeme kimliği
                </p>
                <p className="mt-1 break-all font-mono text-[10px] text-ink-600">{payment.id}</p>
              </div>
              <ul className="space-y-2 text-[11px] text-ink-500">
                {[
                  'Webhook imzası HMAC ile doğrulanır',
                  'Aynı olay kimliği tekrar işlenmez',
                  'Aktivasyon yalnızca sunucuda yapılır',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <ShieldCheck size={12} className="mt-0.5 shrink-0 text-brand-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
