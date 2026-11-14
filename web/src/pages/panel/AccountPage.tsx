import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Check,
  CreditCard,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';
import type { UserDTO } from '@shared/types';
import { useAuth } from '../../lib/auth';
import { api, ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { formatDate } from '../../lib/format';
import { Avatar, Button, Field, PageHeader, SectionCard, StatusBadge } from '../../components/ui';

export function AccountPage() {
  const { me, refresh, logout } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(me?.user.displayName ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setProfileSaving(true);
    try {
      await api.patch<{ user: UserDTO }>('/api/account/profile', { displayName: displayName.trim() });
      await refresh();
      success('Profil güncellendi', 'Görünen adın kaydedildi.');
    } catch (caught) {
      toastError(
        'Profil güncellenemedi',
        caught instanceof ApiError ? caught.firstDetail() ?? caught.message : 'Tekrar dene.',
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (passwords.next !== passwords.confirm) {
      toastError('Şifreler uyuşmuyor', 'Yeni şifreyi iki kez aynı gir.');
      return;
    }
    setPasswordSaving(true);
    try {
      await api.post('/api/account/password', {
        currentPassword: passwords.current,
        newPassword: passwords.next,
      });
      setPasswords({ current: '', next: '', confirm: '' });
      success('Şifre güncellendi', 'Sonraki girişlerinde yeni şifreni kullan.');
    } catch (caught) {
      toastError(
        'Şifre güncellenemedi',
        caught instanceof ApiError ? caught.firstDetail() ?? caught.message : 'Tekrar dene.',
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/');
    } finally {
      setLoggingOut(false);
    }
  };

  if (!me) return null;
  const { user } = me;

  return (
    <div>
      <PageHeader
        eyebrow="Hesap"
        title="Hesap ayarları"
        description="Profilini, şifreni ve aboneliğini yönet. E-posta adresin giriş kimliğindir."
        actions={
          <Button
            variant="secondary"
            icon={<LogOut size={15} />}
            loading={loggingOut}
            onClick={() => void handleLogout()}
          >
            Çıkış yap
          </Button>
        }
      />

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <SectionCard title="Profil bilgileri" description="Yayınlarında ve panelinde görünen bilgiler." icon={<User size={16} />}>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar name={user.displayName} size={56} />
                <div>
                  <p className="text-sm font-semibold text-ink-900">{user.displayName}</p>
                  <p className="text-[11px] text-ink-400">
                    {me.subscription ? me.subscription.packageName : 'Paket yok'} · {formatDate(user.createdAt)} tarihinden beri üye
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Görünen ad" htmlFor="displayName">
                  <div className="relative">
                    <User size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                      id="displayName"
                      className="input pl-10"
                      value={displayName}
                      minLength={2}
                      maxLength={60}
                      onChange={(event) => setDisplayName(event.target.value)}
                      required
                    />
                  </div>
                </Field>
                <Field label="E-posta" htmlFor="email" hint="E-posta giriş kimliğin olduğu için panelden değiştirilemez.">
                  <div className="relative">
                    <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input id="email" className="input bg-ink-50 pl-10 text-ink-500" value={user.email} disabled />
                  </div>
                </Field>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="brand"
                  loading={profileSaving}
                  disabled={displayName.trim() === user.displayName || displayName.trim().length < 2}
                  icon={<Check size={15} />}
                >
                  Profili kaydet
                </Button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Şifre değiştir" description="Güçlü bir şifre kullan; en az 8 karakter, bir harf ve bir rakam." icon={<KeyRound size={16} />}>
            <form onSubmit={savePassword} className="space-y-4">
              <Field label="Mevcut şifre" htmlFor="currentPassword">
                <div className="relative">
                  <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    id="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    className="input pl-10"
                    value={passwords.current}
                    onChange={(event) => setPasswords((current) => ({ ...current, current: event.target.value }))}
                    required
                  />
                </div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Yeni şifre" htmlFor="newPassword">
                  <input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    className="input"
                    minLength={8}
                    value={passwords.next}
                    onChange={(event) => setPasswords((current) => ({ ...current, next: event.target.value }))}
                    required
                  />
                </Field>
                <Field label="Yeni şifre (tekrar)" htmlFor="confirmPassword">
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    className="input"
                    minLength={8}
                    value={passwords.confirm}
                    onChange={(event) => setPasswords((current) => ({ ...current, confirm: event.target.value }))}
                    required
                  />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  loading={passwordSaving}
                  disabled={!passwords.current || !passwords.next || !passwords.confirm}
                >
                  Şifreyi güncelle
                </Button>
              </div>
            </form>
          </SectionCard>
        </div>

        <aside className="min-w-0 space-y-4">
          <SectionCard title="Hesap özeti" icon={<User size={16} />}>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-ink-500">Hesap durumu</span>
                <StatusBadge status={user.status === 'active' ? 'ok' : 'bad'}>
                  {user.status === 'active' ? 'Aktif' : 'Askıda'}
                </StatusBadge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-ink-500">E-posta</span>
                <span className="truncate text-[11px] font-medium text-ink-800">{user.email}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-ink-500">Kayıt tarihi</span>
                <span className="text-[11px] font-medium text-ink-800">{formatDate(user.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-ink-500">Hesap kimliği</span>
                <span className="max-w-[150px] truncate font-mono text-[10px] text-ink-400">{user.id}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Paket ve abonelik" icon={<CreditCard size={16} />}>
            {me.subscription ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{me.subscription.packageName}</p>
                    <p className="mt-0.5 text-[11px] text-ink-400">
                      {me.subscription.maxTeams} takım hakkı
                    </p>
                  </div>
                  <StatusBadge status="ok">Aktif</StatusBadge>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-ink-50 p-3 text-[11px] text-ink-500">
                  <CalendarDays size={13} />
                  {formatDate(me.subscription.startsAt)} → {formatDate(me.subscription.expiresAt)}
                </div>
                <Link to="/panel/odeme" className="mt-3 block">
                  <Button variant="secondary" size="sm" className="w-full">
                    Paketi yönet
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <p className="text-[12px] leading-relaxed text-ink-500">
                  Aktif bir paketin yok. Yayıncı panelini kullanmak için paket seç.
                </p>
                <Link to="/panel/odeme" className="mt-3 block">
                  <Button variant="brand" size="sm" className="w-full">
                    Paket seç
                  </Button>
                </Link>
              </>
            )}
          </SectionCard>

          <div className="rounded-2xl border border-brand-200/60 bg-brand-50/50 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-800">
              <ShieldCheck size={13} /> Verilerin güvende
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-brand-800/70">
              Şifren güçlü scrypt hash’i ile saklanır. Oyun, takım, oyuncu ve istatistik
              verilerin diğer yayıncılardan izole edilir; oturum çerezi HttpOnly’dir.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
