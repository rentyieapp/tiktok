export interface CheckoutParams {
  paymentId: string;
  amountCents: number;
  currency: string;
  packageName: string;
  userEmail: string;
  userName: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  redirectUrl: string;
  providerCheckoutId: string | null;
  providerTransactionId?: string | null;
}

export interface WebhookVerification {
  valid: boolean;
  eventId: string | null;
  eventType: string;
  occurrence?: string;
  paymentId: string | null;
  status: 'succeeded' | 'failed' | 'pending' | null;
  providerTransactionId: string | null;
  amountCents: number | null;
  currency: string | null;
  reason?: string;
}

export type WebhookHeaders = Record<string, string | string[] | undefined>;

export interface PaymentProvider {
  readonly id: 'test' | 'stripe';
  readonly displayName: string;
  createCheckout(params: CheckoutParams): Promise<CheckoutSession>;
  verifyWebhook(headers: WebhookHeaders, rawBody: string): WebhookVerification;
}
