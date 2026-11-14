import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { formatDate } from '../../lib/format';
import { Button, Spinner } from '../../components/ui';
import { Logo } from '../../components/Logo';

export function PaymentSuccessPage() {
  const { me, refresh } = useAuth();
  const [params] = useSearchParams();
  const paymentId = params.get('payment');
  const [attempts, setAttempts] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const gameLicenses = me?.licenses ?? [];
  const hasLicense = gameLicenses.length > 0;
  const groupedLicenses = Object.values(
    gameLicenses.reduce<Record<string, { key: string; packageName: string; expiresAt: string; count: number }>>(
      (groups, license) => {
        const existing = groups[license.packageId];
        if (existing) existing.count += 1;
        else
          groups[license.packageId] = {
            key: license.packageId,
            packageName: license.packageName,
            expiresAt: license.expiresAt,
            count: 1,
          };
        return groups;
      },
      {},
    ),
  );

  useEffect(() => {
    if (me?.subscription || hasLicense) return;
    if (attempts >= 6) return;
    const timer = window.setTimeout(async () => {
      await refresh();
      setAttempts((value) => value + 1);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [me?.subscription, hasLicense, attempts, refresh]);

  const active = Boolean(me?.subscription || hasLicense);
  const waiting = !active && attempts < 6;

  return (
    <div className="min-h-screen bg-[#fbf7f0] text-ink-900">
      <header className="border-b border-[#eee7dc] bg-[#fffaf4]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Logo />
          <Link to="/panel" className="text-xs font-medium text-ink-500 hover:text-ink-900">
            Panele git
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-lg text-center">
          {waiting ? (
            <Spinner label="Ödeme doğrulanıyor..." />
          ) : (
            <>
              <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-brand-200 bg-brand-50 text-brand-700 shadow-[0_20px_60px_-30px_rgba(16,185,129,0.5)]">
                <BadgeCheck size={38} />
              </span>
              <h1 className="mt-7 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                {active
                  ? me?.subscription
                    ? 'Ödemen doğrulandı. Arena senin.'
                    : 'Oyun lisansın aktif.'
                  : 'Ödeme alındı, doğrulanıyor.'}
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-500">
                {active
                  ? me?.subscription
                    ? 'Aboneliğin sunucu tarafında imzalı webhook ile doğrulandı ve aktifleştirildi. Artık oyununu oluşturabilirsin.'
                    : 'Satın aldığın oyun lisansı sunucu tarafında doğrulandı. Oyunu özelleştirip yayına alabilirsin.'
                  : 'Sağlayıcı doğrulaması birkaç saniye sürebilir. Bu sayfa otomatik olarak güncellenecek.'}
              </p>

              {active && hasLicense ? (
                <div className="mx-auto mt-8 grid max-w-sm gap-2 rounded-2xl border border-[#e9e1d5] bg-white p-4 text-left shadow-card">
                  {groupedLicenses.map((license) => (
                    <div key={license.key} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-ink-400">Oyun lisansı</p>
                        <p className="mt-1 text-sm font-semibold">
                          {license.packageName}
                          {license.count > 1 ? ` · ${license.count} oyun` : ''}
                        </p>
                      </div>
                      <p className="text-[10px] text-ink-400">{formatDate(license.expiresAt)}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {active && me?.subscription ? (
                <div className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-3 rounded-2xl border border-[#e9e1d5] bg-white p-4 text-left shadow-card">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-ink-400">Paket</p>
                    <p className="mt-1 text-sm font-semibold">{me.subscription.packageName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-ink-400">Takım hakkı</p>
                    <p className="mt-1 text-sm font-semibold">{me.subscription.maxTeams} takım</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-ink-400">Bitiş</p>
                    <p className="mt-1 text-sm font-semibold">{formatDate(me.subscription.expiresAt)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-ink-400">Durum</p>
                    <p className="mt-1 text-sm font-semibold text-brand-700">Aktif</p>
                  </div>
                </div>
              ) : null}

              {paymentId ? (
                <p className="mt-5 break-all font-mono text-[10px] text-ink-300">Ödeme: {paymentId}</p>
              ) : null}

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to={hasLicense && !me?.subscription ? '/panel/arcade' : '/panel'}>
                  <Button variant="brand" size="lg" icon={<ArrowRight size={16} />} className="w-full sm:w-auto">
                    {hasLicense && !me?.subscription ? 'Oyunlarına git' : 'Yayıncı paneline git'}
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  size="lg"
                  icon={<RefreshCw size={15} />}
                  loading={refreshing}
                  onClick={async () => {
                    setRefreshing(true);
                    await refresh();
                    setAttempts(0);
                    setRefreshing(false);
                  }}
                >
                  Durumu yenile
                </Button>
              </div>

              {!active ? (
                <div className="mx-auto mt-6 flex max-w-md items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-[11px] leading-relaxed text-amber-800">
                  <Loader2 size={14} className="mt-0.5 shrink-0 animate-spin" />
                  Webhook hâlâ işlenmediyse lisans açılmaz. Birkaç saniye sonra tekrar deneyebilir
                  veya ödeme geçmişinden durumu kontrol edebilirsin.
                </div>
              ) : (
                <p className="mt-6 text-[11px] text-ink-400">
                  Sıradaki adım: oyununu oluştur ve yayın bağlantını al.
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
