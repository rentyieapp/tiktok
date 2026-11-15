import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { Button, Field, TextInput } from '../../components/ui';
import { AuthShell } from './AuthShell';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'İstek gönderilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell eyebrow="Hesap erişimi" title="Şifreni sıfırla." subtitle="E-posta adresini yaz; sıfırlama bağlantısı gönderelim.">
      {sent ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <Mail size={28} className="mx-auto text-emerald-600" />
          <p className="mt-2 text-sm font-semibold text-emerald-900">Bağlantı gönderildi.</p>
          <p className="mt-1 text-[11px] leading-relaxed text-emerald-800/70">Gelen kutunu ve spam klasörünü kontrol et. Bağlantı 1 saat geçerli.</p>
          <Link to="/giris" className="mt-4 inline-flex text-[11px] font-semibold text-emerald-800">Girişe dön →</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">{error}</div> : null}
          <Field label="E-posta">
            <div className="relative">
              <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <TextInput type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="pl-9" placeholder="ornek@mail.com" />
            </div>
          </Field>
          <Button variant="brand" className="w-full" loading={loading} icon={<Send size={14} />}>Sıfırlama bağlantısı gönder</Button>
          <p className="text-center text-[11px] text-ink-400"><Link to="/giris" className="font-semibold text-brand-700">Girişe dön</Link></p>
        </form>
      )}
    </AuthShell>
  );
}
