import type { AppConfig } from '../config.js';

interface MailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Resend üzerinden e-posta gönderir. Anahtar yoksa geliştirmede URL'yi loglar;
 * production'da e-posta gitmezse işlem başarısız sayılmaz, fakat operatör logda görür.
 */
export async function sendMail(
  config: AppConfig,
  input: MailInput,
): Promise<{ sent: boolean; error?: string }> {
  if (!config.resendApiKey) {
    console.info(`[mail:dev] ${input.subject} -> ${input.to}\n${input.text}`);
    return { sent: false, error: 'RESEND_API_KEY tanımlı değil.' };
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.mailFrom,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[mail] Resend ${response.status}: ${body.slice(0, 300)}`);
      return { sent: false, error: `E-posta servisi ${response.status} döndürdü.` };
    }
    return { sent: true };
  } catch (error) {
    console.error('[mail] gönderilemedi', error);
    return { sent: false, error: 'E-posta servisine ulaşılamadı.' };
  }
}

export function verificationMail(displayName: string, url: string): MailInput {
  return {
    to: '',
    subject: 'Meydan hesabını doğrula',
    text: `Merhaba ${displayName},\n\nMeydan hesabını doğrulamak için: ${url}\n\nBu bağlantı 24 saat geçerlidir.`,
    html: `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#17161d"><h2>Meydan hesabını doğrula</h2><p>Merhaba ${displayName},</p><p>Hesabını doğrulamak için aşağıdaki bağlantıya tıkla.</p><p><a href="${url}" style="display:inline-block;background:#0f8a72;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">E-postamı doğrula</a></p><p style="color:#6b7280;font-size:12px">Bu bağlantı 24 saat geçerlidir. Bu isteği sen yapmadıysan e-postayı yok say.</p></div>`,
  };
}

export function resetMail(displayName: string, url: string): MailInput {
  return {
    to: '',
    subject: 'Meydan şifre sıfırlama',
    text: `Merhaba ${displayName},\n\nŞifreni sıfırlamak için: ${url}\n\nBu bağlantı 1 saat geçerlidir.`,
    html: `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#17161d"><h2>Şifreni sıfırla</h2><p>Merhaba ${displayName},</p><p>Yeni şifre belirlemek için aşağıdaki bağlantıya tıkla.</p><p><a href="${url}" style="display:inline-block;background:#0f8a72;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">Şifremi sıfırla</a></p><p style="color:#6b7280;font-size:12px">Bu bağlantı 1 saat geçerlidir. Bu isteği sen yapmadıysan e-postayı yok say.</p></div>`,
  };
}
