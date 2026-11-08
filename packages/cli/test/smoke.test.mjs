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
import { readFileSync } from 'node:fs';
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

test('note: 付きMD → .slide-notes が hidden の aside として入る（段落ごとに <p>・インライン対応）', () => {
  const md = [
    '---', 'title: notes', 'palette: ocean', '---',
    '<!-- slide: points -->',
    '## 要点',
    '- **A**：説明',
    'note: 全体の結論を3点にまとめたスライドです。',
    'note: 数字は==11月5日時点==です。',
    '---',
    '<!-- slide: sources -->',
    '## 出典',
    '- [例](https://example.com) — 補足',
    '',
  ].join('\n');
  const html = run(['-', '--quiet'], md);
  assert.match(html, /<aside class="slide-notes" aria-label="スピーカーノート" hidden="">/);
  assert.ok(html.includes('<p>全体の結論を3点にまとめたスライドです。</p>'));
  assert.match(html, /<p>数字は<span class="hl">11月5日時点<\/span>です。<\/p>/);
  assert.equal((html.match(/<aside class="slide-notes"/g) ?? []).length, 1, 'ノートの無いスライドには出力しない');
  assert.ok(!html.includes('<p>note:'), '`note:` 行が本文の段落に漏れない');
  assert.ok(html.includes('note: 全体の結論'), '元MD（DECK_MD）には note: 行がそのまま残る（往復）');
});

test('note: 付きサンプルは6枚にノートが入り、note: を除いた同じMDには入らない（後方互換）', () => {
  const withNotes = run([SAMPLE, '--quiet']);
  assert.equal((withNotes.match(/<aside class="slide-notes"/g) ?? []).length, 6);
  const stripped = readFileSync(SAMPLE, 'utf-8')
    .split('\n')
    .filter((l) => !l.startsWith('note:'))
    .join('\n');
  const html = run(['-', '--quiet'], stripped);
  assert.ok(!html.includes('<aside class="slide-notes"'));
});

test('スタンドアロン出力のPNGキャプチャは .slide-notes を除外する', () => {
  const html = run([SAMPLE, '--quiet']);
  assert.ok(html.includes("el.classList.contains('slide-notes')"));
});

const NOTES_MD = [
  '---', 'title: notes', 'palette: ocean', '---',
  '<!-- slide: points -->', '## 要点', '- **A**：説明', 'note: ノートです',
  '---',
  '<!-- slide: sources -->', '## 出典', '- [例](https://example.com)', '',
].join('\n');

test('ノートがあるデッキには 🗒️ ボタン・ポップアップ・スクリプトが入る', () => {
  const html = run(['-', '--quiet'], NOTES_MD);
  assert.ok(html.includes('id="notes-toggle"'));
  assert.ok(html.includes('id="notes-popup"'));
  assert.ok(html.includes('function toggleNotes()'));
  assert.ok(html.includes('function refreshNotes()'));
  // 🗒️ ボタン・ポップアップは .control-cluster の中（右上のボタン群の子）にある
  const cluster = html.match(/<div class="control-cluster">([\s\S]*?)<\/div>\s*<div id="progress-bar">/);
  assert.ok(cluster && cluster[1].includes('id="notes-toggle"') && cluster[1].includes('id="notes-popup"'));
});

test('ノートが無いデッキには 🗒️ もポップアップもスクリプトも入らない（後方互換）', () => {
  const html = run(['-', '--quiet'], NOTES_MD.replace('note: ノートです\n', ''));
  assert.ok(!html.includes('id="notes-toggle"'));
  assert.ok(!html.includes('id="notes-popup"'));
  assert.ok(!html.includes('function toggleNotes()'));
});

test('ノートポップアップは外部URLを読み込まない（S4）', () => {
  const html = run(['-', '--quiet'], NOTES_MD);
  const popup = html.slice(html.indexOf('id="notes-popup"'), html.indexOf('id="notes-popup"') + 900);
  assert.ok(!/https?:\/\//.test(popup));
});
