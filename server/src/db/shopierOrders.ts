import type { DB } from './index.js';

export interface ShopierOrderRow {
  id: string;
  order_id: string;
  email: string | null;
  buyer_name: string | null;
  status: string;
  payment_status: string | null;
  order_status: string | null;
  currency: string | null;
  amount_cents: number | null;
  product_ids_json: string;
  product_titles_json: string;
  raw_json: string;
  matched_package_id: string | null;
  matched_user_id: string | null;
  activation_message: string | null;
  received_at: string;
  processed_at: string | null;
}

export function insertShopierOrder(db: DB, order: ShopierOrderRow): boolean {
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO shopier_orders (
        id, order_id, email, buyer_name, status, payment_status, order_status, currency,
        amount_cents, product_ids_json, product_titles_json, raw_json,
        matched_package_id, matched_user_id, activation_message, received_at, processed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      order.id,
      order.order_id,
      order.email,
      order.buyer_name,
      order.status,
      order.payment_status,
      order.order_status,
      order.currency,
      order.amount_cents,
      order.product_ids_json,
      order.product_titles_json,
      order.raw_json,
      order.matched_package_id,
      order.matched_user_id,
      order.activation_message,
      order.received_at,
      order.processed_at,
    );
  return result.changes > 0;
}

export function listShopierOrders(db: DB, limit = 25): ShopierOrderRow[] {
  const safeLimit = Math.min(100, Math.max(1, limit));
  return db
    .prepare(`SELECT * FROM shopier_orders ORDER BY received_at DESC LIMIT ${safeLimit}`)
    .all() as ShopierOrderRow[];
}

export function updateShopierOrder(
  db: DB,
  orderId: string,
  fields: {
    status?: string;
    matchedPackageId?: string | null;
    matchedUserId?: string | null;
    activationMessage?: string | null;
    processedAt?: string | null;
  },
): void {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (fields.status !== undefined) {
    sets.push('status = ?');
    params.push(fields.status);
  }
  if (fields.matchedPackageId !== undefined) {
    sets.push('matched_package_id = ?');
    params.push(fields.matchedPackageId);
  }
  if (fields.matchedUserId !== undefined) {
    sets.push('matched_user_id = ?');
    params.push(fields.matchedUserId);
  }
  if (fields.activationMessage !== undefined) {
    sets.push('activation_message = ?');
    params.push(fields.activationMessage);
  }
  if (fields.processedAt !== undefined) {
    sets.push('processed_at = ?');
    params.push(fields.processedAt);
  }
  if (sets.length === 0) return;
  params.push(orderId);
  db.prepare(`UPDATE shopier_orders SET ${sets.join(', ')} WHERE order_id = ?`).run(...params);
}
