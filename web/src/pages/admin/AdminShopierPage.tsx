import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BadgeCheck,
  Copy,
  CreditCard,
  ExternalLink,
  Info,
  Link2,
  RefreshCw,
  Save,
  ShieldCheck,
  ShoppingBag,
  TriangleAlert,
} from 'lucide-react';
import type { AdminSettingsDTO, PackageDTO } from '@shared/types';
import { formatPrice } from '@shared/defaults';
import { api, ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import {
  Button,
  CopyButton,
  Field,
  PageHeader,
  SectionCard,
  StatusBadge,
} from '../../components/ui';

interface ShopierOrder {
  id: string;
  orderId: string;
  email: string | null;
  buyerName: string | null;
  status: string;
  paymentStatus: string | null;
  amountCents: number | null;
  currency: string | null;
  productIds: string[];
  productTitles: string[];
  activationMessage: string | null;
  receivedAt: string;
}

export function AdminShopierPage() {
  const { success, error: toastError } = useToast();
  const [settings, setSettings] = useState<AdminSettingsDTO | null>(null);
  const [packages, setPackages] = useState<PackageDTO[]>([]);
  const [storeUrl, setStoreUrl] = useState('');
  const [apiStatus, setApiStatus] = useState<{ configured: boolean; connected: boolean; orderCount: number; message: string } | null>(null);
  const [orders, setOrders] = useState<ShopierOrder[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [mapPackageId, setMapPackageId] = useState('');
  const [mapProductId, setMapProductId] = useState('');
  const [mapping, setMapping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [settingsResult, packageResult, statusResult] = await Promise.all([
        api.get<AdminSettingsDTO>('/api/admin/settings'),
        api.get<{ packages: PackageDTO[] }>('/api/admin/packages'),
        api.get<{ configured: boolean; connected: boolean; orderCount: number; message: string }>('/api/admin/shopier/status'),
      ]);
      setSettings(settingsResult);
      setStoreUrl(settingsResult.shopierStoreUrl);
      setPackages(packageResult.packages);
      setApiStatus(statusResult);
    } catch (caught) {
      toastError('Shopier ayarları yüklenemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const result = await api.get<{ orders: ShopierOrder[] }>('/api/admin/shopier/orders');
      setOrders(result.orders);
    } catch {
      /* sayfa ilk yüklemede bildirir */
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      await api.post('/api/admin/shopier/sync', {});
      await loadOrders();
      success('Shopier kontrol edildi', 'Son siparişler güncellendi.');
    } catch (caught) {
      toastError('Shopier kontrol edilemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setSyncing(false);
    }
  };

  const mapProduct = async () => {
    const productId = mapProductId.match(/(\d{4,})/)?.[1] ?? mapProductId.trim();
    if (!mapPackageId || !productId) {
      toastError('Eksik bilgi', 'Paket ve Shopier ürün ID/link gerekli.');
      return;
    }
    setMapping(true);
    try {
      await api.put('/api/admin/shopier/map', { packageId: mapPackageId, shopierProductId: productId });
      success('Ürün eşleştirildi', `Shopier ürün ID: ${productId}`);
      setMapProductId('');
      await load();
    } catch (caught) {
      toastError('Eşleştirilemedi', caught instanceof ApiError ? caught.firstDetail() ?? caught.message : 'Tekrar dene.');
    } finally {
      setMapping(false);
    }
  };

  useEffect(() => {
    void load();
    void loadOrders();
    const timer = window.setInterval(() => void loadOrders(), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const result = await api.put<AdminSettingsDTO>('/api/admin/settings', {
        shopierStoreUrl: storeUrl.trim(),
      });
      setSettings(result);
      success('Shopier ayarları kaydedildi', 'Mağaza bağlantısı güncellendi.');
    } catch (caught) {
      toastError('Kaydedilemedi', caught instanceof ApiError ? caught.firstDetail() ?? caught.message : 'Tekrar dene.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Süper admin"
        title="Shopier hazırlığı"
        description="Mağaza adresini ve paket bağlantılarını hazırla. Webhook anahtarları geldiğinde otomatik lisans aktivasyonu açılacak."
        actions={
          <Button variant="secondary" icon={<RefreshCw size={15} />} loading={loading} onClick={() => void load()}>
            Yenile
          </Button>
        }
      />

      <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[11px] leading-relaxed text-amber-900">
        <TriangleAlert size={14} className="mt-0.5 shrink-0 text-amber-600" />
        <span>
          Şu an ödeme sağlayıcısı <strong>{settings?.shopierProviderActive ? 'Shopier' : settings?.paymentProvider ?? 'test'}</strong>.
          Shopier webhook’u bağlanana kadar Shopier satışlarını
          <Link to="/admin/yayincilar" className="mx-1 font-semibold underline">
            Yayıncılar → Manuel lisans
          </Link>
          ile aktive edebilirsin. Mağazayı açman sorun değil; bu ekran yalnızca hazırlık içindir.
        </span>
      </div>

      <div className="mb-5">
        <SectionCard
          title="Manuel ürün eşleştirme"
          description="Shopier ürün API’si 403 verdiği için ürün ID’sini panelden bir kez eşleştir. Siparişler bu ID ile otomatik eşleşir."
          icon={<Link2 size={16} />}
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Rook Works paketi">
              <select className="input text-xs" value={mapPackageId} onChange={(event) => setMapPackageId(event.target.value)}>
                <option value="">Paket seç</option>
                {packages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name} · {formatPrice(pkg.priceCents, pkg.currency)}</option>)}
              </select>
            </Field>
            <Field label="Shopier ürün ID veya link" hint="Örn. 52979758 veya https://www.shopier.com/rookworks/52979758">
              <input className="input text-xs" value={mapProductId} onChange={(event) => setMapProductId(event.target.value)} placeholder="52979758" />
            </Field>
            <Button variant="brand" icon={<Link2 size={14} />} loading={mapping} onClick={() => void mapProduct()}>Eşleştir</Button>
          </div>
        </SectionCard>
      </div>

      <div className="mb-5">
        <SectionCard
          title="Shopier siparişleri · 10 saniyelik kontrol"
          description="Webhook olmadan yeni siparişleri 10 saniyede bir çeker; ürün ID eşleşirse lisansı otomatik açar."
          icon={<BadgeCheck size={16} />}
          action={<Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} loading={syncing} onClick={() => void syncNow()}>Şimdi kontrol et</Button>}
          bodyClassName="p-0"
        >
          {orders.length === 0 ? (
            <div className="p-5 text-[11px] text-ink-400">Henüz Shopier siparişi görünmüyor.</div>
          ) : (
            <div className="table-wrap border-0 shadow-none">
              <table className="table-base min-w-0">
                <thead><tr><th>Sipariş</th><th>Alıcı</th><th>Ürün</th><th>Tutar</th><th>Durum</th></tr></thead>
                <tbody>
                  {orders.slice(0, 10).map((order) => (
                    <tr key={order.id}>
                      <td className="whitespace-nowrap font-mono text-[10px]">{order.orderId}<p className="mt-1 text-[9px] text-ink-400">{new Date(order.receivedAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</p></td>
                      <td className="text-[10px]">{order.email ?? '—'}</td>
                      <td className="max-w-[180px] truncate text-[10px]">{order.productTitles.join(', ') || order.productIds.join(', ') || '—'}</td>
                      <td className="whitespace-nowrap text-[10px]">{order.amountCents === null ? '—' : formatPrice(order.amountCents, order.currency ?? 'TRY')}</td>
                      <td><StatusBadge status={order.status === 'activated' ? 'ok' : order.status === 'failed' ? 'bad' : 'warn'}>{order.status === 'activated' ? 'Lisans açıldı' : order.status === 'failed' ? 'Hata' : order.status === 'awaiting_payment' ? 'Ödeme bekliyor' : 'Eşleşme bekliyor'}</StatusBadge>{order.activationMessage ? <p className="mt-1 max-w-[180px] text-[9px] leading-snug text-ink-400">{order.activationMessage}</p> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <SectionCard title="Mağaza ayarları" description="Shopier mağazan hazır olduğunda buraya bağla." icon={<ShoppingBag size={16} />}>
            <div className="space-y-4">
              <Field
                label="Shopier mağaza adresi"
                hint="Örn. https://shopier.com/magaza-adin. Vitrinde satın alma yönlendirmesi için kullanılacak."
              >
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Link2 size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                      className="input pl-9 text-xs"
                      value={storeUrl}
                      onChange={(event) => setStoreUrl(event.target.value)}
                      placeholder="https://shopier.com/..."
                    />
                  </div>
                  <Button variant="brand" icon={<Save size={14} />} loading={saving} onClick={() => void save()}>
                    Kaydet
                  </Button>
                </div>
              </Field>

              <div className="rounded-xl border border-ink-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Shopier API bağlantısı</p>
                  <StatusBadge status={apiStatus?.connected ? 'ok' : apiStatus?.configured ? 'warn' : 'neutral'}>
                    {apiStatus?.connected ? 'Bağlı' : apiStatus?.configured ? 'Kontrol et' : 'Tanımsız'}
                  </StatusBadge>
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-ink-500">
                  {apiStatus?.message ?? 'SHOPIER_PAT ortam değişkeni bekleniyor.'}
                </p>
                <p className="mt-1 text-[9px] leading-relaxed text-ink-400">
                  Anahtar yalnızca sunucuda tutulur; panelde veya tarayıcıda görünmez.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-ink-100 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                    Webhook adresi
                  </p>
                  <p className="mt-1 break-all font-mono text-[10px] text-ink-700">
                    {settings?.webhookUrl ?? '—'}
                  </p>
                  {settings?.webhookUrl ? (
                    <CopyButton value={settings.webhookUrl} label="Kopyala" size="sm" variant="secondary" className="mt-2" />
                  ) : null}
                </div>
                <div className="rounded-xl border border-ink-100 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                    Webhook belirteci
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-ink-700">
                    {settings?.shopierWebhookConfigured ? (
                      <StatusBadge status="ok">Ortam değişkeninde tanımlı</StatusBadge>
                    ) : (
                      <StatusBadge status="warn">Henüz tanımlı değil</StatusBadge>
                    )}
                  </p>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-ink-400">
                    <code>SHOPIER_WEBHOOK_TOKEN</code> ile .env üzerinden verilir; panelde saklanmaz.
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Paket → Shopier ürün eşleştirmesi"
            description="Her paket için Shopier ürün bağlantısını paket düzenleme ekranından girebilirsin."
            icon={<CreditCard size={16} />}
            bodyClassName="p-0"
          >
            <div className="table-wrap border-0 shadow-none">
              <table className="table-base min-w-0">
                <thead>
                  <tr>
                    <th>Paket</th>
                    <th>Süre</th>
                    <th>Fiyat</th>
                    <th>Ürün ID</th>
                    <th>Shopier</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map((pkg) => (
                    <tr key={pkg.id}>
                      <td>
                        <p className="text-[11px] font-medium text-ink-800">{pkg.name}</p>
                        <p className="text-[9px] text-ink-400">{pkg.maxTeams} takım</p>
                      </td>
                      <td className="text-[10px] text-ink-500">{pkg.durationDays} gün</td>
                      <td className="text-[10px] font-medium text-ink-700">
                        {formatPrice(pkg.priceCents, pkg.currency)}
                      </td>
                      <td className="font-mono text-[10px] text-ink-500">{pkg.shopierProductId || '—'}</td>
                      <td>
                        {pkg.shopierUrl ? (
                          <a
                            href={pkg.shopierUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-brand-600"
                          >
                            Ürünü aç <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="text-[10px] text-ink-400">Bağlantı yok</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-ink-100 p-4">
              <Link to="/admin/paketler">
                <Button variant="secondary" size="sm" icon={<ArrowUpRight size={13} />}>
                  Paket bağlantılarını düzenle
                </Button>
              </Link>
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-4">
          <SectionCard title="Otomatik lisans durumu" icon={<ShieldCheck size={16} />}>
            <div className="space-y-2.5 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-500">Mağaza adresi</span>
                <StatusBadge status={settings?.shopierStoreUrl ? 'ok' : 'warn'}>
                  {settings?.shopierStoreUrl ? 'Hazır' : 'Bekliyor'}
                </StatusBadge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-500">Ürün eşleştirme</span>
                <StatusBadge status={packages.some((pkg) => pkg.shopierUrl) ? 'ok' : 'warn'}>
                  {packages.filter((pkg) => pkg.shopierUrl).length}/{packages.length}
                </StatusBadge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-500">Webhook belirteci</span>
                <StatusBadge status={settings?.shopierWebhookConfigured ? 'ok' : 'warn'}>
                  {settings?.shopierWebhookConfigured ? 'Tanımlı' : 'Bekliyor'}
                </StatusBadge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-500">Aktif sağlayıcı</span>
                <StatusBadge status={settings?.shopierProviderActive ? 'ok' : 'neutral'}>
                  {settings?.shopierProviderActive ? 'Shopier' : settings?.paymentProvider ?? 'Test'}
                </StatusBadge>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-ink-50 p-3 text-[10px] leading-relaxed text-ink-500">
              Webhook bağlandığında Shopier siparişi <code>order.created</code> ile gelir, imza
              doğrulanır ve alıcı e-postasına göre lisans otomatik tanımlanır. O zamana kadar manuel
              lisans akışı hazır.
            </div>
          </SectionCard>

          <SectionCard title="Yapılacaklar" icon={<Info size={16} />}>
            <ol className="space-y-2 text-[11px] leading-relaxed text-ink-500">
              {[
                'Shopier mağazasını aç ve ürünleri oluştur.',
                'Mağaza adresini ve her paketin ürün bağlantısını gir.',
                'Shopier geliştirici panelinden webhook adresini tanımla.',
                'SHOPIER_WEBHOOK_TOKEN değerini .env’e ekle.',
                'Webhook bağlandığında otomatik lisans aktive olur.',
              ].map((item, index) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-ink-100 text-[8px] font-bold text-ink-600">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </SectionCard>

          <div className="rounded-2xl border border-brand-200/60 bg-brand-50/50 p-4 text-[11px] leading-relaxed text-brand-800/80">
            <p className="flex items-center gap-1.5 font-semibold text-brand-800">
              <BadgeCheck size={13} /> Şimdilik güvenli yol
            </p>
            <p className="mt-1.5">
              Shopier’den satış geldiğinde Yayıncılar sayfasından manuel lisans ver. Kayıt ve
              ödeme geçmişi otomatik oluşur, panel anında açılır.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
