import 'dotenv/config';
import { buildApp } from './app.js';

async function main(): Promise<void> {
  const { app, config } = await buildApp();
  const shutdown = async (signal: string) => {
    app.log.info(`${signal} alındı, sunucu kapatılıyor...`);
    try {
      await app.close();
      process.exit(0);
    } catch (error) {
      app.log.error(error);
      process.exit(1);
    }
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`Meydan API: http://localhost:${config.port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
