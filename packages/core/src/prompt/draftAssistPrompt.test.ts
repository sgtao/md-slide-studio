import { describe, it, expect } from 'vitest';
import { buildDraftAssistPrompt, MINIMAL_EXAMPLE } from './draftAssistPrompt';

// v0.4.2: draftAssistPrompt を app から core へ移設した際の回帰テスト。
// v0.2.6 由来の「全16 type名を含む」検証はそのまま維持し、加えて
// v0.4.2 で変更した節の並び順（テーマを末尾へ）を検証する。
const ALL_TYPES = [
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

describe('buildDraftAssistPrompt', () => {
  it('全16 type名がプロンプトに含まれる', () => {
    const prompt = buildDraftAssistPrompt('テストテーマ');
    for (const type of ALL_TYPES) {
      expect(prompt).toContain(type);
    }
  });

  it('テーマ文字列が埋め込まれる', () => {
    const prompt = buildDraftAssistPrompt('社内向けAI活用提案');
    expect(prompt).toContain('社内向けAI活用提案');
  });

  it('テーマ省略時はプレースホルダーが入る', () => {
    const prompt = buildDraftAssistPrompt();
    expect(prompt).toContain('（ここにテーマを記入）');
  });

  it('枚数目安として8〜16枚が明記されている', () => {
    const prompt = buildDraftAssistPrompt();
    expect(prompt).toContain('8〜16枚');
  });

  it('MINIMAL_EXAMPLE がtitle/points/sourcesの最小構成である', () => {
    expect(MINIMAL_EXAMPLE).toContain('slide: title');
    expect(MINIMAL_EXAMPLE).toContain('slide: points');
    expect(MINIMAL_EXAMPLE).toContain('slide: sources');
  });

  it('冒頭で「テーマを後述してます」と予告し、# テーマ 節は最後に置かれる', () => {
    const prompt = buildDraftAssistPrompt('順序確認');
    expect(prompt).toContain('テーマを後述してます。');

    const themeHeadingIndex = prompt.lastIndexOf('# テーマ');
    expect(themeHeadingIndex).toBeGreaterThan(-1);

    for (const heading of ['# 出力仕様', '# 型別の詳細仕様', '# 構成フレーム', '# 出力形式']) {
      const idx = prompt.indexOf(heading);
      expect(idx, `見出し "${heading}" が見つかりません`).toBeGreaterThan(-1);
      expect(idx).toBeLessThan(themeHeadingIndex);
    }

    expect(prompt.endsWith(`# テーマ\n順序確認`)).toBe(true);
  });

  it('決定論的（同じテーマからは同じ文字列）', () => {
    expect(buildDraftAssistPrompt('X')).toBe(buildDraftAssistPrompt('X'));
  });
});
