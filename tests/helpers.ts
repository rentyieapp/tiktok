import type { FastifyInstance } from 'fastify';
import WebSocket from 'ws';
import { buildApp, type BuiltApp } from '../server/src/app';
import { loadConfig } from '../server/src/config';
import { hmacSignature } from '../server/src/lib/tokens';

export const TEST_WEBHOOK_SECRET = 'test-webhook-secret';
export const TEST_LIVE_SECRET = 'live-webhook-secret';

export async function makeApp(overrides: Partial<BuiltApp['config']> = {}): Promise<BuiltApp> {
  const base = loadConfig({
    NODE_ENV: 'test',
    DATABASE_PATH: ':memory:',
    SESSION_SECRET: 'test-session-secret-0123456789abcdef',
    TEST_PAYMENT_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
    LIVE_WEBHOOK_SECRET: TEST_LIVE_SECRET,
    PAYMENT_PROVIDER: 'test',
    APP_URL: 'http://localhost:5173',
    WEB_ORIGIN: 'http://localhost:5173',
  });
  const built = await buildApp({
    config: {
      ...base,
      isTest: true,
      isProduction: false,
      rateLimitEnabled: false,
      testPaymentsEnabled: true,
      lobbyAutoStartMs: 120,
      finishedToLobbyMs: 200,
      ...overrides,
    },
  });
  await built.app.ready();
  return built;
}

export function cookieFrom(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const raw = Array.isArray(header) ? header[0] : String(header ?? '');
  return raw.split(';')[0] ?? '';
}

let emailCounter = 0;
export function uniqueEmail(prefix = 'user'): string {
  emailCounter += 1;
  return `${prefix}${Date.now()}_${emailCounter}@example.com`;
}

export async function registerUser(
  app: FastifyInstance,
  email = uniqueEmail(),
  password = 'Test1234',
): Promise<{ cookie: string; email: string; userId: string }> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password, displayName: 'Test Yayıncı' },
  });
  if (response.statusCode !== 201) {
    throw new Error(`Kayıt başarısız: ${response.statusCode} ${response.body}`);
  }
  const body = response.json() as { user: { id: string } };
  return { cookie: cookieFrom(response), email, userId: body.user.id };
}

export async function loginUser(
  app: FastifyInstance,
  email: string,
  password = 'Test1234',
): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password },
  });
  if (response.statusCode !== 200) throw new Error(`Giriş başarısız: ${response.body}`);
  return cookieFrom(response);
}

export async function buyPackage(
  app: FastifyInstance,
  cookie: string,
  packageId: string,
): Promise<{ paymentId: string; status: string }> {
  const checkout = await app.inject({
    method: 'POST',
    url: '/api/billing/checkout',
    headers: { cookie },
    payload: { packageId },
  });
  if (checkout.statusCode !== 201) {
    throw new Error(`Checkout başarısız: ${checkout.statusCode} ${checkout.body}`);
  }
  const body = checkout.json() as { payment: { id: string } };
  const paymentId = body.payment.id;
  const pay = await app.inject({
    method: 'POST',
    url: `/api/test-payments/${paymentId}/pay`,
    headers: { cookie },
    payload: { outcome: 'success' },
  });
  if (pay.statusCode !== 200) throw new Error(`Test ödeme başarısız: ${pay.body}`);
  return { paymentId, status: (pay.json() as { paymentStatus: string }).paymentStatus };
}

export async function activatePublisher(
  app: FastifyInstance,
  packageId = 'pkg_pro',
): Promise<{ cookie: string; email: string; userId: string; paymentId: string }> {
  const user = await registerUser(app);
  const { paymentId } = await buyPackage(app, user.cookie, packageId);
  return { ...user, paymentId };
}

export function signTestWebhook(
  body: Record<string, unknown>,
  secret = TEST_WEBHOOK_SECRET,
): { body: string; headers: Record<string, string>; timestamp: number } {
  const timestamp = Math.floor(Date.now() / 1000);
  const raw = JSON.stringify(body);
  const signature = hmacSignature(secret, timestamp, raw);
  return {
    body: raw,
    timestamp,
    headers: {
      'content-type': 'application/json',
      'x-test-signature': `t=${timestamp},v1=${signature}`,
    },
  };
}

export function signLiveEvent(
  body: Record<string, unknown>,
  secret = TEST_LIVE_SECRET,
): { body: string; headers: Record<string, string> } {
  const timestamp = Math.floor(Date.now() / 1000);
  const raw = JSON.stringify(body);
  const signature = hmacSignature(secret, timestamp, raw);
  return {
    body: raw,
    headers: {
      'content-type': 'application/json',
      'x-live-signature': `t=${timestamp},v1=${signature}`,
    },
  };
}

export interface GameFixture {
  gameId: string;
  slug: string;
  publicUrl: string;
}

export async function createGame(
  app: FastifyInstance,
  cookie: string,
  body: Record<string, unknown> = {},
): Promise<GameFixture> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/game',
    headers: { cookie },
    payload: {
      gameName: 'Test Arena',
      language: 'tr',
      teamCount: 2,
      ...body,
    },
  });
  if (response.statusCode !== 201) {
    throw new Error(`Oyun oluşturulamadı: ${response.statusCode} ${response.body}`);
  }
  const parsed = response.json() as { game: { id: string; publicSlug: string }; publicUrl: string };
  return { gameId: parsed.game.id, slug: parsed.game.publicSlug, publicUrl: parsed.publicUrl };
}

export class LiveClient {
  private socket: WebSocket;
  private messages: any[] = [];
  private waiters: Array<() => void> = [];
  closed = false;
  closeCode: number | null = null;

  private constructor(socket: WebSocket) {
    this.socket = socket;
    socket.on('message', (data) => {
      try {
        this.messages.push(JSON.parse(data.toString()));
      } catch {
        /* yoksay */
      }
      this.wake();
    });
    socket.on('close', (code) => {
      this.closed = true;
      this.closeCode = code;
      this.wake();
    });
  }

  static connect(port: number, slug: string): Promise<LiveClient> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/game/${slug}`);
      const client = new LiveClient(socket);
      const timer = setTimeout(() => reject(new Error('WebSocket bağlantısı zaman aşımına uğradı.')), 4000);
      socket.once('open', () => {
        clearTimeout(timer);
        resolve(client);
      });
      socket.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  private wake(): void {
    const waiters = [...this.waiters];
    this.waiters = [];
    waiters.forEach((waiter) => waiter());
  }

  send(message: unknown): void {
    this.socket.send(JSON.stringify(message));
  }

  hello(externalId = 'viewer_test_0001', displayName = 'Test İzleyici'): void {
    this.send({ type: 'viewer', externalId, displayName });
  }

  chat(text: string, msgId = `msg_${Math.random().toString(36).slice(2)}`): void {
    this.send({ type: 'chat', text, msgId });
  }

  async waitFor<T = any>(
    predicate: (message: any) => boolean,
    timeout = 5000,
  ): Promise<T> {
    const existing = this.messages.find(predicate);
    if (existing) return existing as T;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Beklenen WebSocket mesajı gelmedi.')), timeout);
      const check = () => {
        const found = this.messages.find(predicate);
        if (found) {
          clearTimeout(timer);
          resolve(found as T);
          return;
        }
        if (this.closed) {
          clearTimeout(timer);
          reject(new Error(`WebSocket kapandı (${this.closeCode}).`));
          return;
        }
        this.waiters.push(check);
      };
      this.waiters.push(check);
    });
  }

  async waitState(predicate: (state: any) => boolean, timeout = 5000): Promise<any> {
    const message = await this.waitFor((candidate) => candidate.type === 'state' && predicate(candidate.state), timeout);
    return message.state;
  }

  async waitNotice(code: string, timeout = 5000): Promise<any> {
    const message = await this.waitFor(
      (candidate) => candidate.type === 'notice' && candidate.notice?.code === code,
      timeout,
    );
    return message.notice;
  }

  close(): void {
    try {
      this.socket.close();
    } catch {
      /* yoksay */
    }
  }
}

export async function listen(app: FastifyInstance): Promise<number> {
  await app.listen({ port: 0, host: '127.0.0.1' });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('Test sunucusu dinlenemedi.');
  return address.port;
}

export async function waitUntil(
  predicate: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 50,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error('Koşul zaman aşımına uğradı.');
}
