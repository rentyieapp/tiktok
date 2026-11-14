import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const PARAMS = { N: 16384, r: 8, p: 1, keylen: 64, saltBytes: 16 };

/** scrypt ile şifre hash'i. Format: scrypt$N$r$p$salt$hash */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(PARAMS.saltBytes).toString('hex');
  const derived = await scrypt(password, salt, PARAMS.keylen);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, N, r, p, salt, hash] = stored.split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    if (Number(N) !== PARAMS.N || Number(r) !== PARAMS.r || Number(p) !== PARAMS.p) {
      // Farklı parametrelerle üretilmiş eski kayıtlar için yine de dene.
      const derived = await scrypt(password, salt, hash.length / 2);
      return timingSafeEqual(derived, Buffer.from(hash, 'hex'));
    }
    const derived = await scrypt(password, salt, PARAMS.keylen);
    const expected = Buffer.from(hash, 'hex');
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** Kullanıcı bulunamasa bile benzer süre harcamak için sahte doğrulama. */
export async function dummyVerify(password: string): Promise<void> {
  await scrypt(password, '00000000000000000000000000000000', PARAMS.keylen);
}
