import type { DB } from './index.js';

export interface ShopierCheckoutIntentRow {
  id: string;
  user_id: string;
  package_id: string;
  product_id: string;
  expected_email: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export function createShopierCheckoutIntent(
  db: DB,
  intent: ShopierCheckoutIntentRow,
): void {
  db.prepare(
    `INSERT INTO shopier_checkout_intents (
      id, user_id, package_id, product_id, expected_email, status, created_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
  ).run(
    intent.id,
    intent.user_id,
    intent.package_id,
    intent.product_id,
    intent.expected_email,
    intent.created_at,
    intent.expires_at,
  );
}

export function listPendingShopierIntents(
  db: DB,
  productId: string,
  now: string,
): ShopierCheckoutIntentRow[] {
  return db
    .prepare(
      `SELECT * FROM shopier_checkout_intents
       WHERE product_id = ? AND status = 'pending' AND expires_at > ?
       ORDER BY created_at DESC`,
    )
    .all(productId, now) as ShopierCheckoutIntentRow[];
}

export function updateShopierIntentStatus(db: DB, id: string, status: string): void {
  db.prepare('UPDATE shopier_checkout_intents SET status = ? WHERE id = ?').run(status, id);
}
