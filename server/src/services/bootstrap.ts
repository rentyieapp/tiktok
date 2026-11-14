import type { AppConfig } from '../config.js';
import type { DB } from '../db/index.js';
import { nowIso } from '../db/index.js';
import { createUser, findUserByEmail, updateUserRole } from '../db/repo.js';
import { hashPassword } from '../lib/password.js';
import { randomId } from '../lib/tokens.js';

/**
 * ADMIN_EMAIL / ADMIN_PASSWORD tanımlıysa süper admin hesabını hazırlar.
 * Mevcut yayıncı aynı e-postayı kullanıyorsa rolü admin'e yükseltir;
 * şifresini değiştirmez.
 */
export async function ensureAdminUser(db: DB, config: AppConfig): Promise<void> {
  if (!config.adminEmail || !config.adminPassword) return;
  const existing = findUserByEmail(db, config.adminEmail);
  if (existing) {
    if (existing.role !== 'admin') updateUserRole(db, existing.id, 'admin', nowIso());
    return;
  }
  const passwordHash = await hashPassword(config.adminPassword);
  const now = nowIso();
  createUser(db, {
    id: randomId('usr'),
    email: config.adminEmail,
    passwordHash,
    displayName: 'Platform Yöneticisi',
    role: 'admin',
    now,
  });
}
