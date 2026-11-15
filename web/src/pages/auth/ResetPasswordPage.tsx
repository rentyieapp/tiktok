import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, LockKeyhole } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { Button, Field, TextInput } from '../../components/ui';
import { AuthShell } from './AuthShell';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setDone(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.firstDetail() ?? caught.message : 'Şifre sıfırlanamadı.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <AuthShell title="Geçersiz bağlantı" subtitle="Şifre sıfırlama bağlantısı eksik veya bozulmuş."><Link to="/sifremi-unuttum" className="text-sm font-semibold text-brand-700">Yeni bağlantı iste →</Link></AuthShell>;
  }

  if (done) {
    return (
      <AuthShell title="Şifren güncellendi" subtitle="Yeni şifrenle giriş yapabilirsin.">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <CheckCircle2 size={30} className="mx-auto text-emerald-600" />
          <p className="mt-2 text-sm font-semibold text-emerald-900">İşlem tamam.</p>
          <Link to="/giris" className="mt-4 inline-flex"><Button variant="brand">Giriş yap</Button></Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Yeni şifre" title="Şifreni belirle." subtitle="En az 8 karakter, bir harf ve bir rakam kullan.">
      <form onSubmit={submit} className="space-y-4">
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">{error}</div> : null}
        <Field label="Yeni şifre">
          <div className="relative"><LockKeyhole size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" /><TextInput type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="pl-9" /></div>
        </Field>
        <Field label="Yeni şifre (tekrar)">
          <div className="relative"><LockKeyhole size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" /><TextInput type="password" required minLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value)} className="pl-9" /></div>
        </Field>
        <Button variant="brand" className="w-full" loading={loading}>Şifreyi güncelle</Button>
      </form>
    </AuthShell>
  );
}
