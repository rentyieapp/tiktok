import { createHmac } from 'node:crypto';
import { z } from 'zod';
import type { WebhookHeaders } from '../payments/provider.js';

const liveEventSchema = z
  .object({
    id: z.string().min(3).max(120),
    type: z.enum(['gift', 'like', 'comment']),
    viewer: z
      .object({
        id: z.string().min(1).max(120).optional(),
        name: z.string().min(1).max(64).optional(),
      })
      .optional(),
    teamSlot: z.number().int().min(1).max(8).optional(),
    teamCommand: z.string().min(1).max(40).optional(),
    amount: z.number().int().min(1).max(100).optional(),
    createdAt: z.string().optional(),
  })
  .strict();

export type LiveEventPayload = z.infer<typeof liveEventSchema>;

export interface LiveVerification {
  valid: boolean;
  event: LiveEventPayload | null;
  reason?: string;
}

/**
 * Canlı yayın sağlayıcısı adapter arayüzü.
 *
 * YouTube / TikTok / Twitch gibi gerçek sağlayıcılar bu arayüzü uygulayan
 * adaptörlerle bağlanır. MVP'de imzalı webhook adaptörü kullanılır.
 */
export interface LiveEventProvider {
  readonly id: string;
  verify(headers: WebhookHeaders, rawBody: string): LiveVerification;
}

export function signLivePayload(
  secret: string,
  rawBody: string,
  timestamp = Math.floor(Date.now() / 1000),
): string {
  const signature = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

/**
 * HMAC imzalı canlı yayın webhook adaptörü.
 * Event ID zorunludur; aynı ID ikinci kez işlenmez.
 */
export class SignedLiveWebhookProvider implements LiveEventProvider {
  readonly id = 'signed-webhook';

  constructor(private readonly secret: string) {}

  verify(headers: WebhookHeaders, rawBody: string): LiveVerification {
    const header = headers['x-live-signature'];
    const signatureHeader = Array.isArray(header) ? header[0] : header;
    if (!signatureHeader) return { valid: false, event: null, reason: 'İmza başlığı yok.' };
    const parts: Record<string, string> = {};
    for (const segment of signatureHeader.split(',')) {
      const [key, value] = segment.split('=');
      if (key && value) parts[key.trim()] = value.trim();
    }
    const timestamp = Number(parts.t);
    if (!Number.isFinite(timestamp) || !parts.v1) {
      return { valid: false, event: null, reason: 'İmza başlığı geçersiz.' };
    }
    if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) {
      return { valid: false, event: null, reason: 'İmza zaman aşımına uğramış.' };
    }
    const expected = createHmac('sha256', this.secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');
    if (parts.v1.length !== expected.length) {
      return { valid: false, event: null, reason: 'İmza doğrulanamadı.' };
    }
    // timing-safe karşılaştırma
    let mismatch = 0;
    for (let index = 0; index < expected.length; index += 1) {
      mismatch |= expected.charCodeAt(index) ^ parts.v1.charCodeAt(index);
    }
    if (mismatch !== 0) return { valid: false, event: null, reason: 'İmza doğrulanamadı.' };
    try {
      const parsed = liveEventSchema.safeParse(JSON.parse(rawBody));
      if (!parsed.success) {
        return { valid: false, event: null, reason: 'Olay verisi geçersiz.' };
      }
      return { valid: true, event: parsed.data };
    } catch {
      return { valid: false, event: null, reason: 'Gövde JSON değil.' };
    }
  }
}

export function createLiveEventProvider(secret: string): LiveEventProvider {
  return new SignedLiveWebhookProvider(secret);
}
