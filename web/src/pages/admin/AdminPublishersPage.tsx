import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Gamepad2,
  Gift,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import type { AdminPublisherRow, PackageDTO } from '@shared/types';
import { formatPrice } from '@shared/defaults';
import { api, ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { formatDate } from '../../lib/format';
import {
  Avatar,
  Button,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  SectionCard,
  StatusBadge,
} from '../../components/ui';

export function AdminPublishersPage() {
  const { success, error: toastError } = useToast();
  const [publishers, setPublishers] = useState<AdminPublisherRow[]>([]);
  const [packages, setPackages] = useState<PackageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [licensing, setLicensing] = useState<AdminPublisherRow | null>(null);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [note, setNote] = useState('');
  const [granting, setGranting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [publisherResult, packageResult] = await Promise.all([
        api.get<{ publishers: AdminPublisherRow[] }>('/api/admin/publishers'),
        api.get<{ packages: PackageDTO[] }>('/api/admin/packages'),
      ]);
      setPublishers(publisherResult.publishers);
      setPackages(packageResult.packages.filter((pkg) => pkg.isActive !== false));
    } catch (caught) {
      toastError('Yayıncılar yüklenemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('tr');
    if (!term) return publishers;
    return publishers.filter(
      (publisher) =>
        publisher.email.toLocaleLowerCase('tr').includes(term) ||
        publisher.displayName.toLocaleLowerCase('tr').includes(term) ||
        (publisher.gameName ?? '').toLocaleLowerCase('tr').includes(term),
    );
  }, [publishers, query]);

  const activeCount = publishers.filter((publisher) => publisher.packageName).length;

  const openLicense = (publisher: AdminPublisherRow) => {
    setLicensing(publisher);
    setSelectedPackage(packages[0]?.id ?? '');
    setNote('');
  };

  const grant = async () => {
    if (!licensing || !selectedPackage) return;
    setGranting(true);
    try {
      const result = await api.post<{ packageName: string; expiresAt: string }>(
        '/api/admin/licenses',
        { email: licensing.email, packageId: selectedPackage, note },
      );
      success(
        'Lisans tanımlandı',
        `${licensing.displayName} · ${result.packageName} · ${formatDate(result.expiresAt)} tarihine kadar.`,
      );
      setLicensing(null);
      await load();
    } catch (caught) {
      toastError('Lisans tanımlanamadı', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setGranting(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Süper admin"
        title="Yayıncılar"
        description="Kayıtlı yayıncılar, oyunları ve lisans durumları. Shopier satışlarını manuel lisansla anında aktive edebilirsin."
        actions={
          <Button variant="secondary" icon={<RefreshCw size={15} />} loading={loading} onClick={() => void load()}>
            Yenile
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <span className="badge-neutral">
            <Users size={11} /> {publishers.length} yayıncı
          </span>
          <span className="badge-ok">
            <BadgeCheck size={11} /> {activeCount} aktif lisans
          </span>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9 text-xs"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="E-posta, ad veya oyun ara..."
          />
        </div>
      </div>

      <SectionCard title="Yayıncı listesi" icon={<Users size={16} />} bodyClassName="p-0">
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-14 animate-pulse rounded-xl bg-ink-50" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={20} />}
            title="Yayıncı bulunamadı"
            description={query ? 'Aramanla eşleşen yayıncı yok.' : 'Henüz kayıtlı yayıncı yok.'}
          />
        ) : (
          <div className="table-wrap border-0 shadow-none">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Yayıncı</th>
                  <th>Oyun</th>
                  <th>Paket</th>
                  <th>Bitiş</th>
                  <th>Maç</th>
                  <th className="text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((publisher) => (
                  <tr key={publisher.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={publisher.displayName} size={30} />
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-medium text-ink-800">
                            {publisher.displayName}
                          </p>
                          <p className="truncate text-[10px] text-ink-400">{publisher.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      {publisher.gameName ? (
                        <div>
                          <p className="flex items-center gap-1 text-[11px] font-medium text-ink-700">
                            <Gamepad2 size={11} /> {publisher.gameName}
                          </p>
                          <p className="text-[9px] text-ink-400">
                            {publisher.teamCount ?? 0} takım
                          </p>
                        </div>
                      ) : (
                        <span className="text-[10px] text-ink-400">Oyun yok</span>
                      )}
                    </td>
                    <td>
                      {publisher.packageName ? (
                        <StatusBadge status="ok">{publisher.packageName}</StatusBadge>
                      ) : (
                        <span className="text-[10px] text-ink-400">Paket yok</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-[10px] text-ink-500">
                      {publisher.expiresAt ? formatDate(publisher.expiresAt) : '—'}
                    </td>
                    <td className="text-[11px] text-ink-600">{publisher.totalMatches}</td>
                    <td>
                      <div className="flex justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Gift size={12} />}
                          onClick={() => openLicense(publisher)}
                        >
                          Manuel lisans
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-ink-100 bg-white p-4 text-[11px] leading-relaxed text-ink-500 shadow-card">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-brand-600" />
        Manuel lisans, başarılı bir ödeme kaydı oluşturur ve aboneliği seçilen paketin süresi kadar
        uzatır. Aynı yayıncıya tekrar verirsen süre mevcut bitiş tarihinin üzerine eklenir.
      </div>

      <Modal
        open={Boolean(licensing)}
        onClose={() => setLicensing(null)}
        title="Manuel lisans tanımla"
        description={
          licensing
            ? `${licensing.displayName} (${licensing.email}) için Shopier veya harici satışa karşılık lisans.`
            : ''
        }
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setLicensing(null)}>
              Vazgeç
            </Button>
            <Button
              variant="brand"
              icon={<UserPlus size={14} />}
              loading={granting}
              disabled={!selectedPackage}
              onClick={() => void grant()}
            >
              Lisansı tanımla
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Paket">
            <select
              className="select"
              value={selectedPackage}
              onChange={(event) => setSelectedPackage(event.target.value)}
            >
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} · {pkg.durationDays} gün · {formatPrice(pkg.priceCents, pkg.currency)} ·{' '}
                  {pkg.maxTeams} takım
                </option>
              ))}
            </select>
          </Field>
          <Field label="Not (opsiyonel)" hint="Ödeme referansı, Shopier sipariş no vb.">
            <input
              className="input text-xs"
              value={note}
              maxLength={200}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Örn. Shopier sipariş #12345"
            />
          </Field>
          <div className="rounded-xl bg-ink-50 p-3 text-[11px] leading-relaxed text-ink-500">
            Bu işlem yayıncıya anında panel erişimi verir. Lisans süresi seçilen paketin gün sayısı
            kadar uzatılır.
          </div>
        </div>
      </Modal>
    </div>
  );
}
