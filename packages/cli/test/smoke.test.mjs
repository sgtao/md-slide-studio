/**
 * smoke.test.mjs — バンドル済み dist/cli.mjs を子プロセスで叩き、
 * MD→スタンドアロンHTMLの骨格が壊れていないことを検証する統合スモーク。
 * （描画の詳細は @mdss/core / @mdss/app 側の単体・E2Eが担保。ここは配線の担保）
 *
 *   実行: node --test test/smoke.test.mjs   （事前に build.mjs 済みであること）
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(here, '..', 'dist', 'cli.mjs');
const SAMPLE = resolve(here, '..', '..', 'app', 'src', 'samples', 'sample.md');

function run(args, input) {
  return execFileSync('node', [CLI, ...args], {
    input,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'ignore'],
  });
}

test('sample.md → スタンドアロンHTMLを生成できる', () => {
  const html = run([SAMPLE, '--quiet']);
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /<html lang="ja" data-view="list" data-theme="light" data-palette="ocean">/);
  assert.ok(html.includes('<style>'), 'CSSがインライン埋め込みされている');
  assert.ok(html.includes('class="control-cluster"'), 'コントロールクラスタがある');
  assert.ok(html.includes('function navigate'), 'ナビゲーションJSが埋め込まれている');
  const sections = html.match(/<section id="s\d+"/g) ?? [];
  assert.ok(sections.length >= 10, `スライドが十分に描画される (got ${sections.length})`);
});

test('.control-clusterはスタンドアロン出力ではposition:fixedに上書きされる（v0.4.10回帰対応）', () => {
  // 共有テーマCSS（nav-controls.css）はSPAの.preview-pane相対配置を前提に
  // position: absolute だが、CLIのスタンドアロンHTMLには.preview-paneが無いため
  // documentスクロール（listビュー等）でControlClusterが画面外へ流れてしまう。
  // standalone.ts側でposition: fixedへ上書きしていることを確認する。
  const html = run([SAMPLE, '--quiet']);
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  assert.ok(styleMatch, '<style>タグが見つかる');
  const css = styleMatch[1];
  const lastAbsolute = css.lastIndexOf('.control-cluster {\n  position: absolute;');
  const overrideIndex = css.indexOf('.control-cluster{position:fixed}');
  assert.ok(overrideIndex !== -1, 'position:fixed への上書き規則が埋め込まれている');
  assert.ok(overrideIndex > lastAbsolute, '上書き規則が元のabsolute宣言より後（カスケードで有効）に配置されている');
});

test('--theme dark --palette forest が html属性に反映される', () => {
  const html = run([SAMPLE, '--quiet', '--theme', 'dark', '--palette', 'forest']);
  assert.match(html, /data-theme="dark"/);
  assert.match(html, /data-palette="forest"/);
});

test('stdin（-）から読める', () => {
  const md = '---\ntitle: T\npalette: ocean\n---\n<!-- slide: title -->\n# Hello ==World==\n';
  const html = run(['-', '--quiet'], md);
  assert.match(html, /<title>T<\/title>/);
  assert.ok(html.includes('class="hl"'), '==強調== が hl spanになる');
});

test('--json-only はHTMLを出さずメタJSONを返す', () => {
  const out = run([SAMPLE, '--quiet', '--json-only']);
  const meta = JSON.parse(out);
  assert.equal(typeof meta.title, 'string');
  assert.ok(meta.slideCount >= 10);
  assert.ok(Array.isArray(meta.warnings));
  assert.ok(Array.isArray(meta.lint));
  assert.ok(!out.includes('<!doctype'), 'HTMLは含まれない');
});

test('不正なMDでもクラッシュしない（非クラッシュ規約）', () => {
  const md = '<!-- slide: chart-bar -->\n## broken\n```chart\n: : bad yaml : :\n```\n';
  const html = run(['-', '--quiet'], md);
  assert.match(html, /^<!doctype html>/i);
});
