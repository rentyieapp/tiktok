import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarDays,
  Gamepad2,
  Gift,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { ARCADE_GAME_LIST, type ArcadeKey } from '@shared/arcade';
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

interface AdminGameLicenseRow {
  id: string;
  email: string;
  displayName: string;
  gameKey: string;
  gameName: string;
  packageName: string | null;
  startsAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'revoked';
}

type EditorState =
  | { mode: 'create'; row?: undefined }
  | { mode: 'edit'; row: AdminGameLicenseRow }
  | null;

export function AdminPublishersPage() {
  const { success, error: toastError } = useToast();
  const [publishers, setPublishers] = useState<AdminPublisherRow[]>([]);
  const [packages, setPackages] = useState<PackageDTO[]>([]);
  const [licenses, setLicenses] = useState<AdminGameLicenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [licenseQuery, setLicenseQuery] = useState('');
  const [editor, setEditor] = useState<EditorState>(null);
  const [kind, setKind] = useState<'game' | 'package'>('game');
  const [email, setEmail] = useState('');
  const [gameKey, setGameKey] = useState<ArcadeKey>(ARCADE_GAME_LIST[0]?.key ?? 'dance');
  const [durationDays, setDurationDays] = useState(30);
  const [packageId, setPackageId] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [publisherResult, packageResult, licenseResult] = await Promise.all([
        api.get<{ publishers: AdminPublisherRow[] }>('/api/admin/publishers'),
        api.get<{ packages: PackageDTO[] }>('/api/admin/packages'),
        api.get<{ licenses: AdminGameLicenseRow[] }>('/api/admin/game-licenses'),
      ]);
      setPublishers(publisherResult.publishers);
      setPackages(packageResult.packages.filter((pkg) => pkg.isActive !== false));
      setLicenses(licenseResult.licenses);
      setPackageId((current) => current || packageResult.packages.find((pkg) => pkg.isActive !== false)?.id || '');
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

  const filteredLicenses = useMemo(() => {
    const term = licenseQuery.trim().toLocaleLowerCase('tr');
    if (!term) return licenses;
    return licenses.filter(
      (license) =>
        license.email.toLocaleLowerCase('tr').includes(term) ||
        license.displayName.toLocaleLowerCase('tr').includes(term) ||
        license.gameName.toLocaleLowerCase('tr').includes(term),
    );
  }, [licenses, licenseQuery]);

  const activeCount = licenses.filter((license) => license.status === 'active' && Date.parse(license.expiresAt) > Date.now()).length;
  const gameDurations = [...new Set(packages.filter((pkg) => pkg.gameKey === gameKey).map((pkg) => pkg.durationDays))].sort((a, b) => a - b);

  const openCreate = (publisher?: AdminPublisherRow) => {
    setKind('game');
    setEditor({ mode: 'create' });
    setEmail(publisher?.email ?? '');
    setNote('');
    const firstGame: ArcadeKey = ARCADE_GAME_LIST[0]?.key ?? 'dance';
    setGameKey(firstGame);
    const firstDuration = [...new Set(packages.filter((pkg) => pkg.gameKey === firstGame).map((pkg) => pkg.durationDays))].sort((a, b) => a - b)[0];
    setDurationDays(firstDuration ?? 30);
  };

  const openEdit = (row: AdminGameLicenseRow) => {
    setEditor({ mode: 'edit', row });
    setKind('game');
    setEmail(row.email);
    setGameKey(row.gameKey as ArcadeKey);
    setDurationDays(30);
    setNote('');
  };

  useEffect(() => {
    if (editor?.mode !== 'create') return;
    if (!gameDurations.includes(durationDays)) setDurationDays(gameDurations[0] ?? 30);
  }, [gameKey, gameDurations, durationDays, editor]);

  const save = async () => {
    if (!editor) return;
    setSaving(true);
    try {
      if (editor.mode === 'edit') {
        const result = await api.put<{ license: AdminGameLicenseRow }>(
          `/api/admin/game-licenses/${editor.row.id}`,
          { durationDays, note },
        );
        success('Lisans güncellendi', `${result.license.gameName} · yeni bitiş ${formatDate(result.license.expiresAt)}.`);
      } else if (kind === 'game') {
        const result = await api.post<{ license: AdminGameLicenseRow }>('/api/admin/game-licenses', {
          email,
          gameKey,
          durationDays,
          note,
        });
        success('Oyun lisansı tanımlandı', `${result.license.displayName} · ${result.license.gameName} · ${formatDate(result.license.expiresAt)}.`);
      } else {
        const result = await api.post<{ packageName: string; expiresAt: string }>('/api/admin/licenses', {
          email,
          packageId,
          note,
        });
        success('Paket lisansı tanımlandı', `${result.packageName} · ${formatDate(result.expiresAt)} tarihine kadar.`);
      }
      setEditor(null);
      await load();
    } catch (caught) {
      toastError('Lisans kaydedilemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (row: AdminGameLicenseRow) => {
    if (!window.confirm(`${row.displayName} için ${row.gameName} lisansını iptal etmek istiyor musun?`)) return;
    try {
      await api.delete(`/api/admin/game-licenses/${row.id}`);
      success('Lisans iptal edildi', `${row.displayName} · ${row.gameName}`);
      await load();
    } catch (caught) {
      toastError('Lisans iptal edilemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Süper admin"
        title="Yayıncılar"
        description="Kayıtlı yayıncılar, oyunları ve lisans durumları. Oyun lisanslarını oluştur, süre ekle veya iptal et."
        actions={
          <Button variant="secondary" icon={<RefreshCw size={15} />} loading={loading} onClick={() => void load()}>
            Yenile
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <span className="badge-neutral"><Users size={11} /> {publishers.length} yayıncı</span>
          <span className="badge-ok"><BadgeCheck size={11} /> {activeCount} aktif oyun lisansı</span>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9 text-xs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="E-posta, ad veya oyun ara..." />
        </div>
      </div>

      <SectionCard title="Yayıncı listesi" icon={<Users size={16} />} bodyClassName="p-0">
        {loading ? (
          <div className="space-y-2 p-4">{[0, 1, 2].map((index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-ink-50" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users size={20} />} title="Yayıncı bulunamadı" description={query ? 'Aramanla eşleşen yayıncı yok.' : 'Henüz kayıtlı yayıncı yok.'} />
        ) : (
          <div className="table-wrap border-0 shadow-none">
            <table className="table-base">
              <thead><tr><th>Yayıncı</th><th>Oyun</th><th>Paket</th><th>Bitiş</th><th>Maç</th><th className="text-right">İşlem</th></tr></thead>
              <tbody>
                {filtered.map((publisher) => (
                  <tr key={publisher.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={publisher.displayName} size={30} />
                        <div className="min-w-0"><p className="truncate text-[12px] font-medium text-ink-800">{publisher.displayName}</p><p className="truncate text-[10px] text-ink-400">{publisher.email}</p></div>
                      </div>
                    </td>
                    <td>{publisher.gameName ? <div><p className="flex items-center gap-1 text-[11px] font-medium text-ink-700"><Gamepad2 size={11} /> {publisher.gameName}</p><p className="text-[9px] text-ink-400">{publisher.teamCount ?? 0} takım</p></div> : <span className="text-[10px] text-ink-400">Oyun yok</span>}</td>
                    <td>{publisher.packageName ? <StatusBadge status="ok">{publisher.packageName}</StatusBadge> : <span className="text-[10px] text-ink-400">Paket yok</span>}</td>
                    <td className="whitespace-nowrap text-[10px] text-ink-500">{publisher.expiresAt ? formatDate(publisher.expiresAt) : '—'}</td>
                    <td className="text-[11px] text-ink-600">{publisher.totalMatches}</td>
                    <td><div className="flex justify-end"><Button variant="secondary" size="sm" icon={<Gift size={12} />} onClick={() => openCreate(publisher)}>Lisans ver</Button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="mt-6">
        <SectionCard
          title="Oyun lisansları"
          icon={<ShieldCheck size={16} />}
          bodyClassName="p-0"
          action={<Button variant="brand" size="sm" icon={<Plus size={13} />} onClick={() => openCreate()}>Yeni lisans</Button>}
        >
          <div className="flex flex-col gap-2 border-b border-ink-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-ink-500">Oluşturma, süre uzatma ve iptal işlemleri burada.</p>
            <div className="relative w-full sm:max-w-xs">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input className="input pl-9 text-xs" value={licenseQuery} onChange={(event) => setLicenseQuery(event.target.value)} placeholder="Yayıncı veya oyun ara..." />
            </div>
          </div>
          {filteredLicenses.length === 0 ? (
            <EmptyState icon={<CalendarDays size={20} />} title="Oyun lisansı yok" description="Yeni lisans ile bir yayıncıya oyun erişimi tanımla." />
          ) : (
            <div className="table-wrap border-0 shadow-none">
              <table className="table-base">
                <thead><tr><th>Yayıncı</th><th>Oyun</th><th>Paket</th><th>Bitiş</th><th>Durum</th><th className="text-right">İşlem</th></tr></thead>
                <tbody>
                  {filteredLicenses.map((license) => (
                    <tr key={license.id}>
                      <td><p className="text-[11px] font-medium text-ink-800">{license.displayName}</p><p className="text-[9px] text-ink-400">{license.email}</p></td>
                      <td className="text-[11px] font-medium text-ink-700">{license.gameName}</td>
                      <td className="text-[10px] text-ink-500">{license.packageName ?? '—'}</td>
                      <td className="whitespace-nowrap text-[10px] text-ink-500">{formatDate(license.expiresAt)}</td>
                      <td><StatusBadge status={license.status === 'active' && Date.parse(license.expiresAt) > Date.now() ? 'ok' : 'bad'}>{license.status === 'revoked' ? 'İptal' : license.status === 'active' && Date.parse(license.expiresAt) > Date.now() ? 'Aktif' : 'Süresi doldu'}</StatusBadge></td>
                      <td>
                        <div className="flex justify-end gap-1.5">
                          <Button variant="secondary" size="sm" icon={<Pencil size={11} />} onClick={() => openEdit(license)}>Düzenle</Button>
                          {license.status !== 'revoked' ? <Button variant="secondary" size="sm" icon={<Trash2 size={11} />} onClick={() => void revoke(license)}>İptal</Button> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-ink-100 bg-white p-4 text-[11px] leading-relaxed text-ink-500 shadow-card">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-brand-600" />
        Oyun lisansı işlemleri anında yayıncı paneline yansır. “Düzenle” mevcut bitiş tarihinin üzerine süre ekler; “İptal” lisansı geçmişi silmeden devre dışı bırakır.
      </div>

      <Modal
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        title={editor?.mode === 'edit' ? 'Lisansı düzenle' : 'Manuel lisans ver'}
        description={editor?.mode === 'edit' ? `${editor.row.displayName} · ${editor.row.gameName}` : 'Oyun erişimi veya paket aboneliği tanımla.'}
        size="md"
        footer={<><Button variant="secondary" onClick={() => setEditor(null)}>Vazgeç</Button><Button variant="brand" icon={<UserPlus size={14} />} loading={saving} disabled={!email || (kind === 'game' ? !gameKey : !packageId)} onClick={() => void save()}>{editor?.mode === 'edit' ? 'Süre ekle' : 'Lisansı tanımla'}</Button></>}
      >
        <div className="space-y-4">
          {editor?.mode === 'create' ? (
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-ink-50 p-1">
              <button type="button" onClick={() => setKind('game')} className={`rounded-lg px-3 py-2 text-[11px] font-semibold ${kind === 'game' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400'}`}>Oyun lisansı</button>
              <button type="button" onClick={() => setKind('package')} className={`rounded-lg px-3 py-2 text-[11px] font-semibold ${kind === 'package' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400'}`}>Paket aboneliği</button>
            </div>
          ) : null}
          <Field label="Yayıncı e-postası">
            <input className="input text-xs" type="email" value={email} disabled={editor?.mode === 'edit'} onChange={(event) => setEmail(event.target.value)} placeholder="yayinci@ornek.com" />
          </Field>
          {editor?.mode === 'edit' ? (
            <>
              <Field label="Oyun"><input className="input text-xs" value={editor.row.gameName} disabled /></Field>
              <Field label="Eklenecek süre (gün)" hint="Mevcut bitiş tarihinin üzerine eklenir."><input className="input text-xs" type="number" min={1} max={3650} value={durationDays} onChange={(event) => setDurationDays(Number(event.target.value))} /></Field>
            </>
          ) : kind === 'game' ? (
            <>
              <Field label="Oyun">
                <select className="select text-xs" value={gameKey} onChange={(event) => setGameKey(event.target.value as ArcadeKey)}>
                  {ARCADE_GAME_LIST.map((game) => <option key={game.key} value={game.key}>{game.name}</option>)}
                </select>
              </Field>
              <Field label="Süre">
                <select className="select text-xs" value={durationDays} onChange={(event) => setDurationDays(Number(event.target.value))}>
                  {gameDurations.length === 0 ? <option value={30}>30 gün (paket yok)</option> : gameDurations.map((days) => <option key={days} value={days}>{days} gün</option>)}
                </select>
              </Field>
            </>
          ) : (
            <Field label="Paket">
              <select className="select text-xs" value={packageId} onChange={(event) => setPackageId(event.target.value)}>
                {packages.filter((pkg) => pkg.isActive !== false).map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name} · {pkg.durationDays} gün · {formatPrice(pkg.priceCents, pkg.currency)}</option>)}
              </select>
            </Field>
          )}
          <Field label="Not (opsiyonel)" hint="Shopier sipariş no, ödeme referansı vb."><input className="input text-xs" value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} placeholder="Örn. Shopier sipariş #12345" /></Field>
          <div className="rounded-xl bg-ink-50 p-3 text-[11px] leading-relaxed text-ink-500">Bu işlem yayıncıya anında erişim verir. Oyun lisansı seçilen oyunun süresini uzatır; paket aboneliği tüm oyunları kapsar.</div>
        </div>
      </Modal>
    </div>
  );
}
