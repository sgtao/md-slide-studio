import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// GitHub Pages（プロジェクトサイト）配信のため相対パスでビルドする。
// v0.5.2〜: hashベースルーター（wouter）使用。base相対パスと非干渉
// （ハッシュはサーバーに送られないため、リライト設定なしでリロード/直接アクセスに対応できる）。
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
