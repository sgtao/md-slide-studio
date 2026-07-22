/**
 * guidePrompt.test.mjs — v0.4.2 で追加した --guide-prompt の統合テスト。
 * 既存の smoke.test.mjs / features.test.mjs は変更せず、別ファイルとして追加している。
 *
 *   実行: node --test test/*.test.mjs   （事前に build.mjs 済みであること）
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

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

function runExpectFail(args, input) {
  try {
    const stdout = run(args, input);
    return { status: 0, stdout };
  } catch (e) {
    return { status: e.status, stdout: e.stdout ?? '' };
  }
}

test('--guide-prompt: Webアプリ「AIプロンプト」ボタンと同じ本文を出力する', () => {
  const prompt = run(['--guide-prompt']);
  assert.match(
    prompt,
    /^あなたはプレゼン資料の構成作家です。以下の仕様に\*\*厳密に\*\*準拠した「スライドMD」を生成してください。テーマを後述してます。/,
  );
  assert.ok(prompt.includes('# 出力仕様'), '出力仕様の節がある');
  assert.ok(prompt.includes('# 構成フレーム'), '構成フレームの節がある');
  assert.ok(prompt.includes('# 出力形式'), '出力形式の節がある');
});

test('--guide-prompt: 「# テーマ」節が最後に来て、プレースホルダーで終わる', () => {
  const prompt = run(['--guide-prompt']);
  const themeIdx = prompt.lastIndexOf('# テーマ');
  assert.ok(themeIdx > -1, '# テーマ 見出しがある');
  for (const heading of ['# 出力仕様', '# 型別の詳細仕様', '# 構成フレーム', '# 出力形式']) {
    const idx = prompt.indexOf(heading);
    assert.ok(idx > -1, `見出し ${heading} がある`);
    assert.ok(idx < themeIdx, `${heading} は # テーマ より前にある`);
  }
  assert.ok(
    prompt.trimEnd().endsWith('（ここにテーマを記入）'),
    'テーマ節はプレースホルダーで終わる',
  );
});

test('--guide-prompt: 全16 type名が含まれる（buildTypeReferenceTable経由の型を含む）', () => {
  const prompt = run(['--guide-prompt']);
  const types = [
    'title',
    'points',
    'summary',
    'table',
    'chart-bar',
    'chart-line',
    'chart-donut',
    'comparison-chart',
    'diagram-flow',
    'diagram-layer',
    'diagram-cycle',
    'diagram-timeline',
    'steps',
    'contrast',
    'figure',
    'feature-showcase',
    'sources',
  ];
  for (const t of types) {
    assert.ok(prompt.includes(t), `type "${t}" が含まれる`);
  }
});

test('--guide-prompt -o: ファイルへ書き出せる', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mdss-'));
  const out = join(dir, 'prompt.md');
  run(['--guide-prompt', '-o', out, '--quiet']);
  assert.ok(existsSync(out));
  assert.ok(readFileSync(out, 'utf-8').includes('# テーマ'));
  rmSync(dir, { recursive: true, force: true });
});

test('--guide-prompt: 決定論的（2回実行で完全一致）', () => {
  assert.equal(run(['--guide-prompt']), run(['--guide-prompt']));
});

test('--guide-prompt に入力MDを渡すと exit 2', () => {
  assert.equal(runExpectFail(['--guide-prompt', SAMPLE]).status, 2);
});

test('--guide-prompt は他のテキスト出力モードと同時指定できない（exit 2）', () => {
  assert.equal(runExpectFail(['--guide-prompt', '--sample-md']).status, 2);
  assert.equal(runExpectFail(['--guide-prompt', '--print-spec']).status, 2);
});
