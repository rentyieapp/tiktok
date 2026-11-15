import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export type PaymentProviderId = 'test' | 'stripe';

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  isProduction: boolean;
  isTest: boolean;
  port: number;
  host: string;
  appUrl: string;
  webOrigin: string;
  allowedOrigins: string[];
  cookieSecure: boolean;
  sessionSecret: string;
  databasePath: string;
  uploadsDir: string;
  paymentProvider: PaymentProviderId;
  testPaymentsEnabled: boolean;
  testPaymentWebhookSecret: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripePriceId: string;
  liveWebhookSecret: string;
  shopierWebhookToken: string;
  youtubeApiKey: string;
  resendApiKey: string;
  mailFrom: string;
  requireEmailVerification: boolean;
  rateLimitEnabled: boolean;
  allowViewerCommands: boolean;
  adminEmail: string;
  adminPassword: string;
  seedDemo: boolean;
  sessionTtlDays: number;
  lobbyAutoStartMs: number;
  finishedToLobbyMs: number;
}

function numberFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv =
    env.NODE_ENV === 'production' ? 'production' : env.NODE_ENV === 'test' ? 'test' : 'development';
  const isProduction = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';
  const appUrl = (env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const webOrigin = (env.WEB_ORIGIN || appUrl).replace(/\/+$/, '');
  const allowedOrigins = new Set([appUrl, webOrigin]);
  if (!isProduction) {
    // Geliştirmede localhost ve 127.0.0.1 aynı sunucuya işaret eder.
    for (const origin of Array.from(allowedOrigins)) {
      try {
        const parsed = new URL(origin);
        if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
          const alternate = new URL(origin);
          alternate.hostname = parsed.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
          allowedOrigins.add(alternate.origin);
        }
      } catch {
        /* geçersiz origin yoksayılır */
      }
    }
  }
  const allowedOriginsList = Array.from(allowedOrigins);

  if (isProduction && (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32)) {
    throw new Error(
      'Üretim ortamında SESSION_SECRET en az 32 karakterlik rastgele bir değer olmalıdır.',
    );
  }
  if (isProduction && !env.LIVE_WEBHOOK_SECRET) {
    throw new Error('Üretim ortamında LIVE_WEBHOOK_SECRET zorunludur.');
  }

  const paymentProvider: PaymentProviderId =
    env.PAYMENT_PROVIDER === 'stripe' ? 'stripe' : 'test';

  if (isProduction && paymentProvider === 'stripe' && !env.STRIPE_SECRET_KEY) {
    throw new Error('PAYMENT_PROVIDER=stripe için STRIPE_SECRET_KEY zorunludur.');
  }
  if (isProduction && paymentProvider === 'stripe' && !env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('PAYMENT_PROVIDER=stripe için STRIPE_WEBHOOK_SECRET zorunludur.');
  }

  const configuredDatabasePath = env.DATABASE_PATH || (isTest ? ':memory:' : './data/taraftar-savasi.db');
  const databasePath =
    configuredDatabasePath === ':memory:' ? ':memory:' : resolve(configuredDatabasePath);
  const uploadsDir = resolve(env.UPLOADS_DIR || './data/uploads');
  if (!isTest && !existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

  return {
    nodeEnv,
    isProduction,
    isTest,
    port: numberFromEnv(env.PORT, 8787),
    host: env.HOST || '0.0.0.0',
    appUrl,
    webOrigin,
    allowedOrigins: allowedOriginsList,
    cookieSecure: env.COOKIE_SECURE === 'true' || isProduction,
    sessionSecret:
      env.SESSION_SECRET || 'gelistirme-icin-gecici-oturum-anahtari-32-karakter',
    databasePath,
    uploadsDir,
    paymentProvider,
    testPaymentsEnabled:
      !isProduction &&
      (env.TEST_PAYMENTS_ENABLED !== 'false') &&
      (paymentProvider === 'test' || env.TEST_PAYMENTS_ENABLED === 'true'),
    testPaymentWebhookSecret: env.TEST_PAYMENT_WEBHOOK_SECRET || 'test-webhook-secret',
    stripeSecretKey: env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
    stripePriceId: env.STRIPE_PRICE_ID || '',
    liveWebhookSecret: env.LIVE_WEBHOOK_SECRET || 'live-webhook-secret',
    shopierWebhookToken: env.SHOPIER_WEBHOOK_TOKEN || '',
    youtubeApiKey: env.YOUTUBE_API_KEY || '',
    resendApiKey: env.RESEND_API_KEY || '',
    mailFrom: env.MAIL_FROM || 'Meydan <no-reply@meydan.local>',
    requireEmailVerification: env.REQUIRE_EMAIL_VERIFICATION === 'true',
    adminEmail: (env.ADMIN_EMAIL || '').trim().toLowerCase(),
    adminPassword: env.ADMIN_PASSWORD || '',
    rateLimitEnabled: env.RATE_LIMIT_ENABLED !== 'false' && !isTest,
    // OBS ekranındaki doğrudan WebSocket komutları geliştirme/test içindir.
    // Üretimde gerçek izleyici komutları imzalı canlı yayın webhook'undan gelir.
    allowViewerCommands:
      env.LIVE_COMMANDS_ENABLED === 'true' ||
      (env.LIVE_COMMANDS_ENABLED !== 'false' && !isProduction),
    seedDemo: env.SEED_DEMO === 'true',
    sessionTtlDays: 7,
    lobbyAutoStartMs: numberFromEnv(env.LOBBY_AUTO_START_MS, 10000),
    finishedToLobbyMs: numberFromEnv(env.FINISHED_TO_LOBBY_MS, 12000),
  };
}
