import { createHash, randomBytes } from 'node:crypto';
import type { DB } from '../db/index.js';
import {
  createEmailToken,
  deleteEmailTokens,
  findValidEmailToken,
  markEmailTokenUsed,
} from '../db/repo.js';
import { randomId } from '../lib/tokens.js';

export type AuthTokenType = 'verify_email' | 'reset_password';

export function hashAuthToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function issueAuthToken(
  db: DB,
  userId: string,
  type: AuthTokenType,
  ttlMinutes: number,
): string {
  deleteEmailTokens(db, userId, type);
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString();
  createEmailToken(db, {
    id: randomId('tok'),
    userId,
    tokenHash: hashAuthToken(token),
    type,
    expiresAt,
    now: now.toISOString(),
  });
  return token;
}

export function consumeAuthToken(
  db: DB,
  token: string,
  type: AuthTokenType,
): { userId: string } | null {
  const now = new Date().toISOString();
  const row = findValidEmailToken(db, hashAuthToken(token), type, now);
  if (!row) return null;
  markEmailTokenUsed(db, row.id, now);
  return { userId: row.user_id };
}
