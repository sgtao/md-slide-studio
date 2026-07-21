/**
 * clean-tgz.mjs — dist/ 配下に残った古い .tgz を削除する。
 *
 * 理由: package.json の "files" は ["dist", "README.md"] のため、
 * dist/ 内に前回の .tgz が残っていると、次の `npm pack` がそれごと
 * 新しいtarballに巻き込んでしまう（tarball-in-tarball）。
 * "prepack" フックから呼ばれ、`npm pack` / `npm publish` の直前に必ず実行される。
 */
import { existsSync, readdirSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, '..', 'dist');

if (existsSync(distDir)) {
  const removed = [];
  for (const f of readdirSync(distDir)) {
    if (f.endsWith('.tgz')) {
      unlinkSync(resolve(distDir, f));
      removed.push(f);
    }
  }
  if (removed.length) {
    console.log(`cleaned old tarballs: ${removed.join(', ')}`);
  }
}
