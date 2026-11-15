import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Check, Eye, EyeOff, LockKeyhole, Mail, User } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { ApiError } from '../../lib/api';
import { Button, Field, TextInput } from '../../components/ui';
import { AuthShell } from './AuthShell';

const PASSWORD_RULES = [
  { key: 'length', label: 'En az 8 karakter', test: (value: string) => value.length >= 8 },
  { key: 'letter', label: 'Bir harf', test: (value: string) => /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(value) },
  { key: 'digit', label: 'Bir rakam', test: (value: string) => /\d/.test(value) },
];

export function RegisterPage() {
  const { me, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const packageId = params.get('paket') ?? '';
  const next = params.get('next') ?? '';
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (!me || submitted.current) return;
    navigate(next || '/panel', { replace: true });
  }, [me, navigate, next]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    submitted.current = true;
    try {
      await register(email.trim(), password, displayName.trim());
      navigate(`/eposta-dogrula?sent=1&email=${encodeURIComponent(email.trim())}`, { replace: true });
    } catch (caught) {
      submitted.current = false;
      setError(
        caught instanceof ApiError
          ? caught.firstDetail() ?? caught.message
          : 'Hesap oluşturulamadı. Lütfen tekrar dene.',
      );
    } finally {
      setLoading(false);
    }
  };

  const rulesPassed = PASSWORD_RULES.every((rule) => rule.test(password));

  return (
    <AuthShell
      eyebrow="2 dakikada yayında"
      title="Yayıncı hesabını oluştur."
      subtitle="Oyununu kur, takımlarını tasarla ve kalıcı yayın bağlantını al. Paket seçimi bir sonraki adımda."
      footer={
        <>
          Hesabın var mı?{' '}
          <Link
            to={`/giris${packageId ? `?paket=${encodeURIComponent(packageId)}` : ''}`}
            className="font-semibold text-brand-600 hover:text-brand-500"
          >
            Giriş yap
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <Field label="Yayıncı adı" htmlFor="displayName" hint="Yayınlarında ve panelinde görünecek isim.">
          <div className="relative">
            <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <TextInput
              id="displayName"
              autoComplete="nickname"
              required
              minLength={2}
              maxLength={60}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Ahmet Yılmaz"
              className="pl-10"
            />
          </div>
        </Field>

        <Field label="E-posta" htmlFor="email">
          <div className="relative">
            <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <TextInput
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ornek@yayinci.com"
              className="pl-10"
            />
          </div>
        </Field>

        <Field label="Şifre" htmlFor="password">
          <div className="relative">
            <LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <TextInput
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="En az 8 karakter"
              className="pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-400 hover:text-ink-700"
              aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {PASSWORD_RULES.map((rule) => {
            const passed = rule.test(password);
            return (
              <span
                key={rule.key}
                className={`inline-flex items-center gap-1 text-[11px] ${
                  passed ? 'text-brand-600' : 'text-ink-400'
                }`}
              >
                <Check size={11} className={passed ? 'opacity-100' : 'opacity-30'} />
                {rule.label}
              </span>
            );
          })}
        </div>

        <Button
          type="submit"
          variant="brand"
          className="w-full"
          size="lg"
          loading={loading}
          disabled={password.length > 0 && !rulesPassed}
        >
          Hesabı oluştur
        </Button>

        <p className="text-center text-[10px] leading-relaxed text-ink-400">
          Devam ederek hizmet şartlarını ve gizlilik politikasını kabul etmiş olursun. Yalnızca
          kullanım hakkına sahip olduğun takım görsellerini yükle.
        </p>
      </form>
    </AuthShell>
  );
}
