import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// GitHub Pages（プロジェクトサイト）配信のため相対パスでビルドする。
// ルーターを使わないSPAなので base: './' で全環境に対応。
// @mdss/core はソース直接参照（workspace）なので alias で core/src を指す。
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@mdss/core': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
    },
  },
} as never);
