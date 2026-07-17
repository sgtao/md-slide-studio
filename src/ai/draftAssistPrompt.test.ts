import { describe, it, expect } from 'vitest';
import { buildDraftAssistPrompt, MINIMAL_EXAMPLE } from './draftAssistPrompt';

// v0.2.6: sample.md統合（v0.2.5）で確定した全16 typeがプロンプトに反映されているかを
// 機械的に検証する。文面のスナップショットは取らない（記法追加のたびに壊れるため）。
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
});
