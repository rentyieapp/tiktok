import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export interface SessionPayload {
  sub: string;
  iat: number;
  exp: number;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function sign(data: string, secret: string): string {
  return base64url(createHmac('sha256', secret).update(data).digest());
}

/** Basit, bağımlılıksız HS256 JWT (oturum çerezi için). */
export function createSessionToken(
  userId: string,
  secret: string,
  ttlDays = 7,
  now = Date.now(),
): string {
  const iat = Math.floor(now / 1000);
  const payload: SessionPayload = { sub: userId, iat, exp: iat + ttlDays * 24 * 60 * 60 };
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signature = sign(`${header}.${body}`, secret);
  return `${header}.${body}.${signature}`;
}

export function verifySessionToken(
  token: string,
  secret: string,
  now = Date.now(),
): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = sign(`${header}.${body}`, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(fromBase64url(body).toString('utf8')) as SessionPayload;
    if (!parsed.sub || !parsed.exp) return null;
    if (parsed.exp * 1000 <= now) return null;
    return parsed;
  } catch {
    return null;
  }
}

const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

/** Tahmin edilemez, URL-güvenli genel slug token'ı. */
export function randomToken(length = 10): string {
  const bytes = randomBytes(length);
  let output = '';
  for (let index = 0; index < length; index += 1) {
    output += BASE32_ALPHABET[bytes[index] % BASE32_ALPHABET.length];
  }
  return output;
}

export function randomId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString('hex')}`;
}

export function hmacSignature(secret: string, timestamp: number, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

export function verifyHmacSignature(
  secret: string,
  timestamp: number,
  body: string,
  signature: string,
  toleranceSeconds = 300,
  now = Date.now(),
): boolean {
  if (!secret || !signature) return false;
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Math.floor(now / 1000) - timestamp) > toleranceSeconds) return false;
  const expected = hmacSignature(secret, timestamp, body);
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function timingSafeStringEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
