import { defineConfig } from 'vitest/config';

// @mdss/core はDOM非依存。node環境単体でテストが通ることを担保する。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/**'],
  },
});
