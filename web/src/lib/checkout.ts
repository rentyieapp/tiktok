import { api } from './api';

const KEY = 'rookworks_coupon';

export function getStoredCoupon(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function setStoredCoupon(code: string): void {
  try {
    if (code.trim()) localStorage.setItem(KEY, code.trim().toUpperCase());
    else localStorage.removeItem(KEY);
  } catch {
    /* yoksay */
  }
}

export async function startCheckout(packageId: string): Promise<void> {
  const couponCode = getStoredCoupon();
  const result = await api.post<{ redirectUrl: string }>('/api/billing/checkout', {
    packageId,
    ...(couponCode ? { couponCode } : {}),
  });
  window.location.assign(result.redirectUrl);
}
