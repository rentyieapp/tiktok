import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Mail, RefreshCw, ArrowRight } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { Button, Field, TextInput } from '../../components/ui';
import { AuthShell } from './AuthShell';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const sent = params.get('sent') === '1';
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [state, setState] = useState<'idle' | 'verifying' | 'verified' | 'error'>(token ? 'verifying' : 'idle');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .post('/api/auth/verify-email', { token })
      .then(() => setState('verified'))
      .catch((caught) => {
        setState('error');
        setMessage(caught instanceof ApiError ? caught.message : 'Doğrulama başarısız.');
      });
  }, [token]);

  const resend = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    try {
      await api.post('/api/auth/resend-verification', { email });
      setMessage('Doğrulama e-postası tekrar gönderildi. Gelen kutunu kontrol et.');
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : 'E-posta gönderilemedi.');
    } finally {
      setSending(false);
    }
  };

  if (state === 'verifying') {
    return <AuthShell title="E-posta doğrulanıyor" subtitle="Bir saniye, hesabını doğruluyoruz."><div className="h-10 animate-pulse rounded-xl bg-ink-100" /></AuthShell>;
  }

  if (state === 'verified') {
    return (
      <AuthShell title="E-posta doğrulandı" subtitle="Hesabın artık yayına hazır.">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
          <p className="mt-3 text-sm font-semibold text-emerald-900">Doğrulama tamamlandı.</p>
          <Link to="/giris" className="mt-4 inline-flex"><Button variant="brand">Giriş yap <ArrowRight size={14} /></Button></Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="E-posta doğrulama"
      title={sent ? 'E-postanı kontrol et.' : 'Doğrulama bağlantısı'}
      subtitle={sent ? 'Sana bir doğrulama bağlantısı gönderdik. Gelen kutunda ve spam klasöründe kontrol et.' : 'E-posta adresini yaz, doğrulama bağlantısını yeniden gönderelim.'}
    >
      <div className="space-y-4">
        {state === 'error' ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">{message}</div> : null}
        <form onSubmit={resend} className="space-y-3">
          <Field label="E-posta">
            <div className="relative">
              <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <TextInput type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ornek@mail.com" className="pl-9" />
            </div>
          </Field>
          <Button variant="brand" className="w-full" loading={sending} icon={<RefreshCw size={14} />}>Doğrulama e-postasını gönder</Button>
        </form>
        {message ? <p className="text-[11px] leading-relaxed text-ink-500">{message}</p> : null}
        <p className="text-center text-[11px] text-ink-400">Zaten doğruladıysan <Link to="/giris" className="font-semibold text-brand-700">giriş yap</Link>.</p>
      </div>
    </AuthShell>
  );
}
