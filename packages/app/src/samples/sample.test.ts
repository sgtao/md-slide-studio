import { describe, it, expect } from 'vitest';
import { parseSlideMarkdown } from '@mdss/core';
import { lintDeck } from '@mdss/core';
import sampleMd from './sample.md?raw';

describe('sample.md（v0.2.5 統合デッキ）', () => {
  it('lintDeck の結果に error が1件も無い', () => {
    const deck = parseSlideMarkdown(sampleMd);
    const results = lintDeck(deck);
    const errors = results.filter((r) => r.level === 'error');
    expect(errors).toEqual([]);
  });

  it('先頭スライドは title、最終スライドは sources', () => {
    const deck = parseSlideMarkdown(sampleMd);
    expect(deck.slides[0].type).toBe('title');
    expect(deck.slides[deck.slides.length - 1].type).toBe('sources');
  });

  it('全16 type が最低1回は登場する', () => {
    const deck = parseSlideMarkdown(sampleMd);
    const types = new Set(deck.slides.map((s) => s.type));
    const expected = [
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
      'figure',
      'feature-showcase',
      'steps',
      'contrast',
      'sources',
    ] as const;
    for (const t of expected) {
      expect(types.has(t), `type "${t}" が sample.md に含まれていません`).toBe(true);
    }
  });
});
