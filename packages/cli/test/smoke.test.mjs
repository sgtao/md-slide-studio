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
import { Script } from 'node:vm';
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

test('ノート付き出力のインラインscriptは文法的に正しい（実行せずコンパイルのみ・ポップアップ部分を含む）', () => {
  const html = run(['-', '--quiet'], NOTES_MD);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.ok(scripts.length >= 1, 'インラインscriptが見つかる');
  const inline = scripts[scripts.length - 1];
  assert.ok(inline.includes('function refreshNotes()'), 'ノートポップアップのコードを含む');
  assert.doesNotThrow(() => new Script(inline));
  // 検出力の確認: 壊れたコードは落ちる
  assert.throws(() => new Script(inline + '\nfunction ('));
});

// ─── 閲覧UI（サムネ帯・一覧グリッド・ページ指定移動 / v0.6.1） ───

const PLAIN_MD = [
  '---', 'title: T', 'palette: ocean', '---',
  '<!-- slide: title -->', '# 表紙', '---',
  '<!-- slide: points -->', '## 2枚目', '- **a**：b', '',
].join('\n');

test('どのデッキにも 一覧・サムネ帯のボタンと入れ物・スクリプトが入る（ノートの有無に依らない）', () => {
  for (const md of [PLAIN_MD, NOTES_MD]) {
    const html = run(['-', '--quiet'], md);
    assert.ok(html.includes('id="grid-toggle"'));
    assert.ok(html.includes('id="strip-toggle"'));
    assert.ok(html.includes('id="thumb-strip"'));
    assert.ok(html.includes('id="overview-grid"'));
    assert.ok(html.includes('function toggleGrid()'));
    assert.ok(html.includes('function startJump()'));
    // ボタンは .control-cluster の中（view-toggle の直後）
    const cluster = html.match(/<div class="control-cluster">([\s\S]*?)<\/div>\s*<div id="progress-bar">/);
    assert.ok(cluster && cluster[1].includes('id="grid-toggle"') && cluster[1].includes('id="strip-toggle"'));
    // 既定は閉（hidden）。サムネは開いたときに JS が作るので静的HTMLには無い
    assert.match(html, /<div id="thumb-strip"[^>]*hidden><\/div>/);
    assert.match(html, /<div id="overview-grid"[^>]*hidden><\/div>/);
    assert.ok(!html.includes('class="thumb"'), '静的HTMLにサムネは含まれない（遅延生成）');
  }
});

test('? キーのショートカットヘルプ（閉じた状態）とスクリプトが入り、N の行はノートのあるデッキだけ', () => {
  const plain = run(['-', '--quiet'], PLAIN_MD);
  const notes = run(['-', '--quiet'], NOTES_MD);
  for (const html of [plain, notes]) {
    assert.match(html, /<div id="help-popup" class="help-popup" hidden>/);
    assert.ok(html.includes('function toggleHelp()'));
    assert.ok(html.includes('.help-popup'), 'CSS も同梱');
    // 右上のボタンは増やさない
    const cluster = html.match(/<div class="control-cluster">([\s\S]*?)<\/div>\s*<div id="progress-bar">/);
    assert.ok(cluster && !cluster[1].includes('help'));
  }
  assert.ok(!plain.includes('<kbd>N</kbd>'));
  assert.ok(notes.includes('<kbd>N</kbd>'));
});

test('overview.css（サムネ帯・グリッド・サムネ）が埋め込まれ、印刷では非表示にする', () => {
  const html = run(['-', '--quiet'], PLAIN_MD);
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  for (const sel of ['.thumb-strip', '.overview-grid', '.thumb-stage', '.counter-input']) {
    assert.ok(css.includes(sel), sel);
  }
  const printBlock = css.slice(css.indexOf('@media print'));
  assert.match(printBlock, /\.thumb-strip,\s*\.overview-grid,\s*\.help-popup/, '印刷では帯・グリッド・ヘルプを非表示にする');
});

test('list の縮小は 960×540 の箱ごと（--list-scale）。.slide-inner の個別 scale は使わない', () => {
  const html = run(['-', '--quiet'], PLAIN_MD);
  assert.ok(html.includes("setProperty('--list-scale'"));
  assert.ok(!html.includes("inner.style.transform = 'scale("), '旧方式（.slide-inner だけ縮小）は残っていない');
  assert.ok(html.includes('transform: scale(var(--s))'));
});

test('閲覧UIは外部URLを増やさない（S4: 外部URLは従来どおりPNG用のCDN 2つだけ）', () => {
  const html = run(['-', '--quiet'], PLAIN_MD);
  const urls = new Set(
    [...html.matchAll(/https?:\/\/[^"'\s)<>]+/g)]
      .map((m) => m[0])
      // SVG の名前空間宣言は読み込みではない
      .filter((u) => !u.startsWith('http://www.w3.org/')),
  );
  assert.deepEqual([...urls].sort(), [
    'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
    'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
  ]);
});

test('閲覧UI付き出力のインラインscriptは文法的に正しい（ノートの有無どちらも）', () => {
  for (const md of [PLAIN_MD, NOTES_MD]) {
    const html = run(['-', '--quiet'], md);
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    const inline = scripts[scripts.length - 1];
    assert.ok(inline.includes('function syncOverview()'));
    assert.doesNotThrow(() => new Script(inline));
    assert.throws(() => new Script(inline + '\nfunction ('));
  }
});

test('スライド本体のHTMLは閲覧UIの追加で変わらない（S5: スライド部分に新しい属性・要素が入らない）', () => {
  const html = run(['-', '--quiet'], PLAIN_MD);
  const sections = [...html.matchAll(/<section id="s\d+"[\s\S]*?<\/section>/g)].map((m) => m[0]);
  assert.equal(sections.length, 2);
  for (const s of sections) {
    assert.ok(!/thumb|overview|list-scale/.test(s), 'スライドHTMLにサムネ関連の記述が無い');
  }
});
