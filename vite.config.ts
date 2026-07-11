import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages（プロジェクトサイト）配信のため相対パスでビルドする。
// ルーターを使わないSPAなので base: './' で全環境（Pages / ローカル / 任意サブパス）に対応。
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
} as never);
