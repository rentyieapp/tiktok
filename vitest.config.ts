import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
    testTimeout: 20000,
    pool: 'forks',
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@shared': new URL('./shared', import.meta.url).pathname,
      '@web': new URL('./web/src', import.meta.url).pathname,
    },
  },
});
