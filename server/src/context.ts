import type { FastifyInstance } from 'fastify';
import type { AppConfig } from './config.js';
import type { DB } from './db/index.js';
import type { GameRuntime } from './game/runtime.js';
import type { ArcadeRuntime } from './arcade/runtime.js';
import type { PlatformHub } from './platforms/hub.js';
import type { PaymentProvider } from './payments/provider.js';
import type { LiveEventProvider } from './live/provider.js';

export interface AppContext {
  app: FastifyInstance;
  db: DB;
  config: AppConfig;
  providers: Map<string, PaymentProvider>;
  liveProvider: LiveEventProvider;
  runtime: GameRuntime;
  arcade: ArcadeRuntime;
  platformHub: PlatformHub;
}
