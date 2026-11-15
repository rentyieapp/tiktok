import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CreditCard,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import type { PackageDTO } from '@shared/types';
import { formatPrice } from '@shared/defaults';
import { api, ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import {
  Button,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  SectionCard,
  StatusBadge,
} from '../../components/ui';

interface PackageForm {
  id?: string;
  name: string;
  tagline: string;
  description: string;
  priceTl: string;
  currency: string;
  maxTeams: 2 | 4 | 8;
  durationDays: number;
  featuresText: string;
  highlight: boolean;
  sortOrder: number;
  isActive: boolean;
  shopierUrl: string;
}

const EMPTY_FORM: PackageForm = {
  name: '',
  tagline: '',
  description: '',
  priceTl: '299',
  currency: 'TRY',
  maxTeams: 2,
  durationDays: 30,
  featuresText: '2 takımlı 3D savaş alanı\nKalıcı OBS bağlantısı',
  highlight: false,
  sortOrder: 20,
  isActive: true,
  shopierUrl: '',
};

function formFromPackage(pkg: PackageDTO): PackageForm {
  return {
    id: pkg.id,
    name: pkg.name,
    tagline: pkg.tagline,
    description: pkg.description,
    priceTl: (pkg.priceCents / 100).toString(),
    currency: pkg.currency,
    maxTeams: pkg.maxTeams,
    durationDays: pkg.durationDays,
    featuresText: pkg.features.join('\n'),
    highlight: pkg.highlight,
    sortOrder: pkg.sortOrder,
    isActive: pkg.isActive !== false,
    shopierUrl: pkg.shopierUrl ?? '',
  };
}

export function AdminPackagesPage() {
  const { success, error: toastError } = useToast();
  const [packages, setPackages] = useState<PackageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PackageForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState<PackageDTO | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.get<{ packages: PackageDTO[] }>('/api/admin/packages');
      setPackages(result.packages);
    } catch (caught) {
      toastError(
        'Paketler yüklenemedi',
        caught instanceof ApiError ? caught.message : 'Tekrar dene.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<number, PackageDTO[]>();
    for (const pkg of packages) {
      const list = map.get(pkg.durationDays) ?? [];
      list.push(pkg);
      map.set(pkg.durationDays, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [packages]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, sortOrder: packages.length + 1 });
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (pkg: PackageDTO) => {
    setForm(formFromPackage(pkg));
    setFormError(null);
    setOpen(true);
  };

  const save = async () => {
    const price = Number(form.priceTl.replace(',', '.'));
    if (!form.name.trim() || form.name.trim().length < 2) {
      setFormError('Paket adı en az 2 karakter olmalı.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setFormError('Geçerli bir fiyat gir.');
      return;
    }
    if (form.durationDays < 1 || form.durationDays > 365) {
      setFormError('Süre 1 ile 365 gün arasında olmalı.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name.trim(),
        tagline: form.tagline.trim() || 'Yayıncı paketi',
        description: form.description.trim(),
        priceCents: Math.round(price * 100),
        currency: form.currency || 'TRY',
        maxTeams: form.maxTeams,
        durationDays: form.durationDays,
        features: form.featuresText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        highlight: form.highlight,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
        shopierUrl: form.shopierUrl.trim() || null,
      };
      if (form.id) {
        await api.put(`/api/admin/packages/${form.id}`, payload);
        success('Paket güncellendi', 'Yeni fiyat ve süre hemen geçerli.');
      } else {
        await api.post('/api/admin/packages', payload);
        success('Paket eklendi', 'Paket satışa açıldı.');
      }
      setOpen(false);
      await load();
    } catch (caught) {
      setFormError(
        caught instanceof ApiError ? caught.firstDetail() ?? caught.message : 'Kaydedilemedi.',
      );
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async () => {
    if (!deactivating) return;
    try {
      await api.delete(`/api/admin/packages/${deactivating.id}`);
      success('Paket pasifleştirildi', 'Yeni satışlar durduruldu; mevcut lisanslar korunuyor.');
      setDeactivating(null);
      await load();
    } catch (caught) {
      toastError('Pasifleştirilemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Süper admin"
        title="Paketler ve fiyatlar"
        description="1 gün, 7 gün, 30 gün veya istediğin süre için paket oluştur. Fiyat, takım hakkı ve Shopier bağlantısını buradan yönet."
        actions={
          <>
            <Link to="/satin-al" target="_blank">
              <Button variant="secondary" icon={<ArrowUpRight size={15} />}>
                Vitrini gör
              </Button>
            </Link>
            <Button variant="brand" icon={<Plus size={16} />} onClick={openCreate}>
              Yeni paket
            </Button>
          </>
        }
      />

      <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[11px] leading-relaxed text-amber-900">
        <TriangleAlert size={14} className="mt-0.5 shrink-0 text-amber-600" />
        <span>
          Fiyat değişikliği yalnızca bundan sonraki ödemeleri etkiler. Mevcut aboneliklerin süresi
          değişmez. Seed verisi admin düzenlemelerinin üzerine yazmaz.
        </span>
      </div>

      <SectionCard
        title="Tüm paketler"
        description="Süreye göre gruplanmış paketler; pasif paketler satışta görünmez."
        icon={<CreditCard size={16} />}
        action={
          <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={() => void load()}>
            Yenile
          </Button>
        }
      >
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-16 animate-pulse rounded-xl bg-ink-50" />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <EmptyState
            icon={<CreditCard size={20} />}
            title="Henüz paket yok"
            description="Yayıncıların satın alabileceği ilk paketi oluştur."
            action={<Button variant="brand" onClick={openCreate}>Paket oluştur</Button>}
          />
        ) : (
          <div className="space-y-6">
            {grouped.map(([duration, rows]) => (
              <div key={duration}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-md bg-ink-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    {duration} gün
                  </span>
                  <span className="text-[10px] text-ink-400">{rows.length} paket</span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-ink-100">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-ink-50 text-[10px] uppercase tracking-wider text-ink-500">
                      <tr>
                        <th className="px-4 py-2.5">Paket</th>
                        <th className="px-4 py-2.5">Fiyat</th>
                        <th className="px-4 py-2.5">Takım</th>
                        <th className="px-4 py-2.5">Durum</th>
                        <th className="px-4 py-2.5">Shopier</th>
                        <th className="px-4 py-2.5 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100 bg-white">
                      {rows.map((pkg) => (
                        <tr key={pkg.id} className={pkg.isActive === false ? 'opacity-55' : ''}>
                          <td className="px-4 py-3">
                            <p className="text-[12px] font-semibold text-ink-900">{pkg.name}</p>
                            <p className="text-[10px] text-ink-400">{pkg.tagline}</p>
                            <span className="mt-1 inline-flex rounded-full bg-ink-50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-ink-400">
                              {!pkg.gameKey ? '3D Stüdyo paketi' : pkg.gameKey === '*' ? 'Tüm Oyunlar' : 'Oyun lisansı'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[12px] font-semibold text-ink-800">
                            {formatPrice(pkg.priceCents, pkg.currency)}
                          </td>
                          <td className="px-4 py-3 text-[11px] text-ink-600">{pkg.maxTeams}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {pkg.isActive === false ? (
                                <StatusBadge status="neutral">Pasif</StatusBadge>
                              ) : (
                                <StatusBadge status="ok">Satışta</StatusBadge>
                              )}
                              {pkg.highlight ? (
                                <span className="badge bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
                                  Öne çıkan
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {pkg.shopierUrl ? (
                              <a
                                href={pkg.shopierUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-brand-600 hover:text-brand-500"
                              >
                                Bağlı <ArrowUpRight size={10} />
                              </a>
                            ) : (
                              <span className="text-[10px] text-ink-400">Tanımsız</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEdit(pkg)}
                                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-800"
                                title="Düzenle"
                                aria-label={`${pkg.name} paketini düzenle`}
                              >
                                <Pencil size={13} />
                              </button>
                              {pkg.isActive !== false ? (
                                <button
                                  type="button"
                                  onClick={() => setDeactivating(pkg)}
                                  className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
                                  title="Pasifleştir"
                                  aria-label={`${pkg.name} paketini pasifleştir`}
                                >
                                  <Power size={13} />
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'Paketi düzenle' : 'Yeni paket oluştur'}
        description="Fiyat, süre ve takım hakkı anında tüm satın alma akışına yansır."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button variant="brand" loading={saving} onClick={() => void save()}>
              {form.id ? 'Değişiklikleri kaydet' : 'Paketi oluştur'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] text-red-700">
              {formError}
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Paket adı">
              <input
                className="input"
                value={form.name}
                maxLength={60}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Örn. Başlangıç 1 Gün"
              />
            </Field>
            <Field label="Kısa açıklama">
              <input
                className="input"
                value={form.tagline}
                maxLength={100}
                onChange={(event) => setForm((current) => ({ ...current, tagline: event.target.value }))}
                placeholder="Tek günlük deneme yayını"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Fiyat (TL)">
              <input
                className="input"
                inputMode="decimal"
                value={form.priceTl}
                onChange={(event) => setForm((current) => ({ ...current, priceTl: event.target.value }))}
                placeholder="299"
              />
            </Field>
            <Field label="Süre (gün)">
              <input
                className="input"
                type="number"
                min={1}
                max={365}
                value={form.durationDays}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    durationDays: Math.max(1, Math.min(365, Number(event.target.value) || 1)),
                  }))
                }
              />
            </Field>
            <Field label="Takım hakkı">
              <select
                className="select"
                value={form.maxTeams}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    maxTeams: Number(event.target.value) as 2 | 4 | 8,
                  }))
                }
              >
                <option value={2}>2 takım</option>
                <option value={4}>4 takım</option>
                <option value={8}>8 takım</option>
              </select>
            </Field>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[1, 7, 30, 90].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setForm((current) => ({ ...current, durationDays: days }))}
                className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition ${
                  form.durationDays === days
                    ? 'border-ink-900 bg-ink-900 text-white'
                    : 'border-ink-200 bg-white text-ink-500 hover:border-ink-300'
                }`}
              >
                {days} gün
              </button>
            ))}
          </div>

          <Field label="Açıklama">
            <textarea
              className="textarea"
              rows={2}
              maxLength={300}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </Field>

          <Field label="Özellikler" hint="Her satır bir özellik. Yayıncı paket kartında görünür.">
            <textarea
              className="textarea font-mono text-xs"
              rows={5}
              value={form.featuresText}
              onChange={(event) =>
                setForm((current) => ({ ...current, featuresText: event.target.value }))
              }
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Shopier ürün bağlantısı" hint="Mağaza açıldığında bu paketin Shopier ürün URL’si.">
              <input
                className="input text-xs"
                value={form.shopierUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, shopierUrl: event.target.value }))
                }
                placeholder="https://shopier.com/..."
              />
            </Field>
            <Field label="Sıralama">
              <input
                className="input"
                type="number"
                min={0}
                max={999}
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sortOrder: Math.max(0, Number(event.target.value) || 0),
                  }))
                }
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-5 rounded-xl border border-ink-100 bg-ink-50/60 p-3.5">
            <label className="flex items-center gap-2 text-[12px] font-medium text-ink-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isActive: event.target.checked }))
                }
                className="h-4 w-4 rounded border-ink-300 accent-brand-500"
              />
              Satışta
            </label>
            <label className="flex items-center gap-2 text-[12px] font-medium text-ink-700">
              <input
                type="checkbox"
                checked={form.highlight}
                onChange={(event) =>
                  setForm((current) => ({ ...current, highlight: event.target.checked }))
                }
                className="h-4 w-4 rounded border-ink-300 accent-brand-500"
              />
              Öne çıkan paket
            </label>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deactivating)}
        onClose={() => setDeactivating(null)}
        title="Paketi pasifleştir"
        description={
          deactivating
            ? `${deactivating.name} artık satın alınamayacak. Mevcut abonelikler etkilenmez.`
            : ''
        }
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeactivating(null)}>
              Vazgeç
            </Button>
            <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => void deactivate()}>
              Pasifleştir
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-2 rounded-xl bg-ink-50 p-3 text-[11px] leading-relaxed text-ink-500">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-brand-600" />
          Paket kaydı silinmez; geçmiş ödemeler ve abonelikler bozulmaz.
        </div>
      </Modal>
    </div>
  );
}
