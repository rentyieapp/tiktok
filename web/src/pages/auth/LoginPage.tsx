import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { ApiError } from '../../lib/api';
import { Button, Field, TextInput } from '../../components/ui';
import { AuthShell } from './AuthShell';

export function LoginPage() {
  const { me, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') ?? '';
  const packageId = params.get('paket') ?? '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    if (next) navigate(next, { replace: true });
    else navigate(me.user.role === 'admin' ? '/admin' : '/panel', { replace: true });
  }, [me, navigate, next]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const loggedIn = await login(email.trim(), password);
      navigate(next || (loggedIn.role === 'admin' ? '/admin' : '/panel'), { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Giriş yapılamadı. Lütfen tekrar dene.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('yayinci@demo.com');
    setPassword('Demo1234');
    setError(null);
  };

  return (
    <AuthShell
      title="Tekrar hoş geldin, yayıncı."
      subtitle="Stüdyona giriş yap; takımlarını yönet, yayın bağlantını al ve arenayı canlandır."
      footer={
        <>
          Hesabın yok mu?{' '}
          <Link
            to={`/kayit${packageId ? `?paket=${encodeURIComponent(packageId)}` : ''}`}
            className="font-semibold text-brand-600 hover:text-brand-500"
          >
            Ücretsiz hesap oluştur
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
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

        <Button type="submit" variant="brand" className="w-full" loading={loading} size="lg">
          Giriş yap
        </Button>

        <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold text-ink-700">Demo hesabıyla dene</p>
              <p className="mt-0.5 text-[11px] text-ink-400">yayinci@demo.com · Demo1234</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={fillDemo}>
              Doldur
            </Button>
          </div>
        </div>
      </form>
    </AuthShell>
  );
}
