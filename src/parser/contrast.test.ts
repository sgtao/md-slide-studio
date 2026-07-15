import { describe, expect, it } from 'vitest';
import { parseSlideMarkdown } from './slideMarkdown';
import type { ContrastSlide } from './types';

const fm = (body: string) => `---\ntitle: テスト\npalette: ocean\n---\n${body}`;

const contrastMd = (block: string, directive = '<!-- slide: contrast -->') =>
  fm(`${directive}\nbadge: WHY\n## AIは、足りない情報を==勝手に補う==\n${block}`);

const FULL_BLOCK = [
  '```contrast',
  'example:',
  '  title: 「タスク管理アプリを作って」',
  '  rows:',
  '    - { tag: AIの推測, text: ログイン → たぶん必要だろう }',
  '    - { tag: AIの推測, text: 通知 → 入れておこう }',
  'verdict:',
  '  - { label: 強み, text: それっぽく作れる }',
  '  - { connector: ↓ でも }',
  '  - { label: 弱点, text: 意図と合うとは限らない, tone: warn }',
  '```',
].join('\n');

describe('contrast: 正常系', () => {
  it('example / verdict を正しくパースする', () => {
    const md = contrastMd(FULL_BLOCK);
    const s = parseSlideMarkdown(md).slides[0] as ContrastSlide;
    expect(s.type).toBe('contrast');
    expect(s.badge).toBe('WHY');
    expect(s.heading).toContain('勝手に補う');
    expect(s.example?.title).toBe('「タスク管理アプリを作って」');
    expect(s.example?.rows).toHaveLength(2);
    expect(s.example?.rows[0]).toEqual({ tag: 'AIの推測', text: 'ログイン → たぶん必要だろう' });
    expect(s.verdict).toHaveLength(3);
    expect(s.verdict[0]).toEqual({ label: '強み', text: 'それっぽく作れる', connector: undefined, tone: undefined });
    expect(s.verdict[1].connector).toBe('↓ でも');
    expect(s.verdict[2].tone).toBe('warn');
  });

  it('SlideType の一覧に contrast が含まれる（未知typeフォールバックされない）', () => {
    const md = contrastMd(FULL_BLOCK);
    const s = parseSlideMarkdown(md).slides[0];
    expect(s.type).toBe('contrast');
    expect(s.warnings.some((w) => w.includes('未知の type'))).toBe(false);
  });
});

describe('contrast: 異常系（落ちないパーサー）', () => {
  it('```contrast ブロックが無い場合は警告して空データで描画継続', () => {
    const md = fm('<!-- slide: contrast -->\n## 見出しのみ');
    const s = parseSlideMarkdown(md).slides[0] as ContrastSlide;
    expect(s.type).toBe('contrast');
    expect(s.example).toBeUndefined();
    expect(s.verdict).toHaveLength(0);
    expect(s.warnings.some((w) => w.includes('contrast ブロック'))).toBe(true);
  });

  it('example が無い場合は警告し example は undefined', () => {
    const block = ['```contrast', 'verdict:', '  - { label: 強み, text: OK }', '```'].join('\n');
    const md = contrastMd(block);
    const s = parseSlideMarkdown(md).slides[0] as ContrastSlide;
    expect(s.example).toBeUndefined();
    expect(s.verdict).toHaveLength(1);
    expect(s.warnings.some((w) => w.includes('example がありません'))).toBe(true);
  });

  it('example.rows が空の場合は警告するが example 自体は残る', () => {
    const block = [
      '```contrast',
      'example:',
      '  title: タイトルのみ',
      'verdict:',
      '  - { label: X, text: Y }',
      '```',
    ].join('\n');
    const md = contrastMd(block);
    const s = parseSlideMarkdown(md).slides[0] as ContrastSlide;
    expect(s.example?.title).toBe('タイトルのみ');
    expect(s.example?.rows).toHaveLength(0);
    expect(s.warnings.some((w) => w.includes('example.rows が空'))).toBe(true);
  });

  it('verdict が空の場合は警告する', () => {
    const block = [
      '```contrast',
      'example:',
      '  rows:',
      '    - { tag: A, text: B }',
      '```',
    ].join('\n');
    const md = contrastMd(block);
    const s = parseSlideMarkdown(md).slides[0] as ContrastSlide;
    expect(s.verdict).toHaveLength(0);
    expect(s.warnings.some((w) => w.includes('verdict が空'))).toBe(true);
  });

  it('未知の tone 値は無視して警告し、tone は undefined になる', () => {
    const block = [
      '```contrast',
      'example:',
      '  rows:',
      '    - { tag: A, text: B }',
      'verdict:',
      '  - { label: X, text: Y, tone: neon }',
      '```',
    ].join('\n');
    const md = contrastMd(block);
    const s = parseSlideMarkdown(md).slides[0] as ContrastSlide;
    expect(s.verdict[0].tone).toBeUndefined();
    expect(s.warnings.some((w) => w.includes('tone "neon"'))).toBe(true);
  });

  it('不正な YAML でも落ちずに空データで継続する', () => {
    const block = ['```contrast', 'example: [', '```'].join('\n');
    const md = contrastMd(block);
    const s = parseSlideMarkdown(md).slides[0] as ContrastSlide;
    expect(s.type).toBe('contrast');
    expect(s.example).toBeUndefined();
    expect(s.verdict).toHaveLength(0);
  });
});

describe('contrast: 共通ヘッダ・tone: dark との併存', () => {
  it('tone: dark ディレクティブと lead/point が併用できる', () => {
    const md = fm(
      '<!-- slide: contrast, tone: dark -->\nbadge: WHY\nlead: 補足\n## 見出し\n' +
        FULL_BLOCK +
        '\npoint: ==重要==な帯',
    );
    const s = parseSlideMarkdown(md).slides[0] as ContrastSlide;
    expect(s.tone).toBe('dark');
    expect(s.lead).toBe('補足');
    expect(s.point).toBe('==重要==な帯');
  });
});
