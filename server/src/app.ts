import { existsSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import { loadConfig, type AppConfig } from './config.js';
import { migrate, nowIso, openDatabase, type DB } from './db/index.js';
import { seedAppSettings, seedCoupons, seedGameOffers, seedGameProducts, seedOverlayOffers, seedPackages } from './db/seed.js';
import { listActivePlatformConnections, markAllRunningSessionsAbandoned } from './db/repo.js';
import { GameRuntime } from './game/runtime.js';
import { ArcadeRuntime } from './arcade/runtime.js';
import { PlatformHub } from './platforms/hub.js';
import { HttpError } from './lib/errors.js';
import { createLiveEventProvider, type LiveEventProvider } from './live/provider.js';
import { buildProviderRegistry } from './services/billing.js';
import type { PaymentProvider } from './payments/provider.js';
import { authRoutes } from './routes/auth.js';
import { accountRoutes } from './routes/account.js';
import { packageRoutes } from './routes/packages.js';
import { billingRoutes } from './routes/billing.js';
import { paymentWebhookRoutes } from './routes/webhooks.js';
import { gameRoutes } from './routes/game.js';
import { liveRoutes } from './routes/live.js';
import { websocketRoutes } from './routes/websocket.js';
import { uploadRoutes } from './routes/uploads.js';
import { runDemoSeed } from './seed/demo.js';
import { adminRoutes } from './routes/admin.js';
import { arcadeRoutes } from './routes/arcade.js';
import { arcadeRoomRoutes } from './routes/arcadeRooms.js';
import { ensureAdminUser } from './services/bootstrap.js';
import { startShopierOrderSync } from './services/shopierOrders.js';

export interface BuiltApp {
  app: FastifyInstance;
  db: DB;
  config: AppConfig;
  runtime: GameRuntime;
  arcade: ArcadeRuntime;
  platformHub: PlatformHub;
  providers: Map<string, PaymentProvider>;
  liveProvider: LiveEventProvider;
}

export interface BuildAppOptions {
  config?: Partial<AppConfig>;
  db?: DB;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<BuiltApp> {
  const config: AppConfig = { ...loadConfig(), ...options.config };
  const db = options.db ?? openDatabase(config.databasePath);
  migrate(db);
  seedPackages(db);
  seedGameOffers(db);
  seedOverlayOffers(db);
  seedCoupons(db);
  seedGameProducts(db);
  seedAppSettings(db);
  await ensureAdminUser(db, config);
  markAllRunningSessionsAbandoned(db, nowIso());
  mkdirSync(config.uploadsDir, { recursive: true });

  const app = Fastify({
    logger: config.isTest
      ? false
      : {
          level: process.env.LOG_LEVEL || 'info',
        },
    bodyLimit: 1024 * 1024,
    trustProxy: false,
  });

  const providers = buildProviderRegistry(config);
  const liveProvider = createLiveEventProvider(config.liveWebhookSecret);
  const runtime = new GameRuntime(db, config, {
    info: (message) => app.log.info(message),
    error: (message) => app.log.error(message),
  });
  const arcade = new ArcadeRuntime(db, {
    error: (message) => app.log.error(message),
  });
  const platformHub = new PlatformHub(db, config, arcade, {
    info: (message) => app.log.info(message),
    error: (message) => app.log.error(message),
  });

  await app.register(cookie);
  await app.register(cors, {
    origin: config.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  if (config.rateLimitEnabled) {
    await app.register(rateLimit, {
      global: true,
      max: 600,
      timeWindow: '1 minute',
      keyGenerator: (request) => request.ip,
    });
  }
  await app.register(multipart, {
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  });
  await app.register(websocket, {
    options: { maxPayload: 64 * 1024 },
  });

  await app.register(fastifyStatic, {
    root: config.uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
    cacheControl: true,
    maxAge: '1d',
    index: false,
  });

  // JSON gövdesini ham metin olarak da sakla; webhook imzaları ham gövde
  // üzerinden doğrulanır.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (request: FastifyRequest, body: string, done) => {
      (request as FastifyRequest & { rawBody?: string }).rawBody = body;
      if (!body || body.trim() === '') {
        done(null, {});
        return;
      }
      try {
        done(null, JSON.parse(body));
      } catch (error) {
        const parseError = error as Error & { statusCode?: number };
        parseError.statusCode = 400;
        done(parseError);
      }
    },
  );

  app.addHook('onRequest', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('X-Frame-Options', 'SAMEORIGIN');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (config.isProduction) {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  });

  // CSRF savunması: çerez tabanlı oturumlarda Origin kontrolü.
  // Webhook ve canlı yayın uç noktaları HMAC imzasıyla korunur.
  app.addHook('onRequest', async (request) => {
    const method = request.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;
    const path = (request.raw.url ?? '').split('?')[0];
    if (path.startsWith('/api/webhooks/') || path.startsWith('/api/live/')) return;
    const origin = request.headers.origin;
    if (origin && !config.allowedOrigins.includes(origin)) {
      throw new HttpError(403, 'CSRF_ORIGIN', 'Geçersiz istek kaynağı.');
    }
    if (!origin && config.isProduction) {
      throw new HttpError(403, 'CSRF_ORIGIN', 'Origin başlığı eksik.');
    }
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send({
        error: error.code,
        message: error.message,
        details: error.details,
      });
    }
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 429) {
      return reply.code(429).send({
        error: 'RATE_LIMITED',
        message: 'Çok fazla istek gönderdin. Lütfen biraz bekle.',
      });
    }
    if (statusCode === 413) {
      return reply.code(413).send({
        error: 'PAYLOAD_TOO_LARGE',
        message: 'Yüklenen dosya izin verilen boyuttan büyük.',
      });
    }
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return reply.code(statusCode).send({
        error: 'BAD_REQUEST',
        message: (error as Error).message || 'İstek işlenemedi.',
      });
    }
    if ((error as { code?: string }).code?.startsWith('SQLITE_CONSTRAINT')) {
      return reply.code(409).send({
        error: 'CONFLICT',
        message: 'Bu kayıt başka bir kayıtla çakışıyor.',
      });
    }
    request.log.error(error);
    return reply.code(500).send({
      error: 'INTERNAL_ERROR',
      message: 'Beklenmeyen bir sunucu hatası oluştu. Lütfen tekrar dene.',
    });
  });

  const ctx = { app, db, config, providers, runtime, arcade, platformHub, liveProvider };

  await app.register(async (api) => {
    await packageRoutes(api, ctx);
    await authRoutes(api, ctx);
    await accountRoutes(api, ctx);
    await billingRoutes(api, ctx);
    await paymentWebhookRoutes(api, ctx);
    await gameRoutes(api, ctx);
    await liveRoutes(api, ctx);
    await adminRoutes(api, ctx);
    await uploadRoutes(api, ctx);
    await websocketRoutes(api, ctx);
    await arcadeRoutes(api, ctx);
    await arcadeRoomRoutes(api, ctx);
  });

  app.get('/api/health', async () => ({
    ok: true,
    service: 'rookworks',
    time: nowIso(),
  }));

  const webDist = process.env.WEB_DIST
    ? fileURLToPath(new URL(`file://${process.env.WEB_DIST}`))
    : fileURLToPath(new URL('../../web/dist', import.meta.url));
  const hasWebBuild = existsSync(`${webDist}/index.html`);
  if (hasWebBuild) {
    await app.register(fastifyStatic, {
      root: webDist,
      prefix: '/',
      wildcard: true,
      cacheControl: true,
      maxAge: '1h',
      setHeaders: (response, path) => {
        if (path.endsWith('index.html')) response.setHeader('Cache-Control', 'no-store');
      },
    });
  }

  app.setNotFoundHandler(async (request, reply) => {
    const path = (request.raw.url ?? '').split('?')[0];
    if (path.startsWith('/api/')) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'İstenen uç nokta bulunamadı.' });
    }
    if (hasWebBuild && request.method === 'GET') {
      return reply.sendFile('index.html');
    }
    return reply.code(404).send({ error: 'NOT_FOUND', message: 'Sayfa bulunamadı.' });
  });



  let stopShopierSync: (() => void) | null = null;

  app.addHook('onClose', async () => {
    stopShopierSync?.();
    runtime.shutdown();
    arcade.shutdown();
    platformHub.shutdown();
    try {
      db.close();
    } catch {
      /* zaten kapalı olabilir */
    }
  });

  platformHub.start(listActivePlatformConnections(db));
  stopShopierSync = startShopierOrderSync(db, config);

  if (config.seedDemo) {
    try {
      await runDemoSeed({ db, config });
      app.log.info('Demo yayıncı verisi hazır.');
    } catch (error) {
      app.log.error(`Demo verisi oluşturulamadı: ${String(error)}`);
    }
  }

  return { app, db, config, runtime, arcade, platformHub, providers, liveProvider };
}
