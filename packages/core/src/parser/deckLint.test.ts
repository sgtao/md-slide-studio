import { describe, it, expect } from 'vitest';
import { lintDeck } from './deckLint';
import type { Slide, SlideDeck } from './types';

function deck(slides: Slide[], warnings: string[] = []): SlideDeck {
  return { frontmatter: { title: 'T', palette: 'ocean' }, slides, warnings };
}

// テスト用スタブファクトリ。T ごとに Extract<Slide, {type: T}> の
// 専用フィールド（example / ratio / image 等）を型として認識できるようにする。
// 戻り値の Slide は意図的に不完全なスタブのため as で明示的にキャストする。
function slide<T extends Slide['type']>(
  partial: Partial<Extract<Slide, { type: T }>> & { type: T },
): Slide {
  return { warnings: [], ...partial } as Slide;
}

describe('lintDeck — 構成ルール', () => {
  it('title始まり・sources終わりの正常デッキは error/warn を出さない', () => {
    const d = deck([slide({ type: 'title' }), slide({ type: 'sources' })]);
    const results = lintDeck(d);
    expect(results.filter((r) => r.level === 'error' || r.level === 'warn')).toHaveLength(0);
  });

  it('最終スライドが sources でない場合 sources-last を warn で出す', () => {
    const d = deck([slide({ type: 'title' }), slide({ type: 'points' })]);
    const results = lintDeck(d);
    expect(results.some((r) => r.rule === 'sources-last' && r.level === 'warn')).toBe(true);
  });

  it('先頭スライドが title でない場合 title-first を info で出す', () => {
    const d = deck([slide({ type: 'points' }), slide({ type: 'sources' })]);
    const results = lintDeck(d);
    expect(results.some((r) => r.rule === 'title-first' && r.level === 'info')).toBe(true);
  });
});

describe('lintDeck — 枚数ルールを一切持たない（論点A: 案1確定の回帰防止）', () => {
  it('13枚のデッキでも枚数由来の LintResult を生成しない', () => {
    const slides: Slide[] = [
      slide({ type: 'title' }),
      ...Array.from({ length: 11 }, () => slide({ type: 'points' })),
      slide({ type: 'sources' }),
    ];
    const results = lintDeck(deck(slides));
    expect(results.some((r) => /枚/.test(r.message))).toBe(false);
  });
});

describe('lintDeck — contrast / steps / split-image', () => {
  it('contrast の example 欠落は error', () => {
    const d = deck([
      slide({ type: 'title' }),
      slide({ type: 'contrast' }),
      slide({ type: 'sources' }),
    ]);
    const results = lintDeck(d);
    expect(results.some((r) => r.rule === 'contrast-example-missing' && r.level === 'error')).toBe(
      true,
    );
  });

  it('contrast の verdict 欠落は warn', () => {
    const d = deck([
      slide({ type: 'title' }),
      slide({ type: 'contrast', example: { title: 'x', rows: [] } }),
      slide({ type: 'sources' }),
    ]);
    const results = lintDeck(d);
    expect(results.some((r) => r.rule === 'contrast-verdict-missing' && r.level === 'warn')).toBe(
      true,
    );
  });

  it('steps の ratio 合計が100以外なら warn', () => {
    const d = deck([
      slide({ type: 'title' }),
      slide({
        type: 'steps',
        ratio: [
          { label: 'a', value: 40 },
          { label: 'b', value: 50 },
        ],
      }),
      slide({ type: 'sources' }),
    ]);
    const results = lintDeck(d);
    expect(results.some((r) => r.rule === 'steps-ratio-sum' && r.level === 'warn')).toBe(true);
  });

  it('title split-image + 外部画像は split-image-cors を info で出す', () => {
    const d = deck([
      slide({ type: 'title', layout: 'split-image', image: 'https://example.com/a.jpg' }),
      slide({ type: 'sources' }),
    ]);
    const results = lintDeck(d);
    expect(results.some((r) => r.rule === 'split-image-cors' && r.level === 'info')).toBe(true);
  });
});

describe('lintDeck — 既存 warnings の引き継ぎ', () => {
  it('deck.warnings は error として引き継がれる', () => {
    const d = deck(
      [slide({ type: 'title' }), slide({ type: 'sources' })],
      ['frontmatterが見つかりません'],
    );
    const results = lintDeck(d);
    expect(results.some((r) => r.rule === 'deck-structure' && r.level === 'error')).toBe(true);
  });

  it('slide.warnings は warn として slideIndex 付きで引き継がれる', () => {
    const d = deck([
      slide({ type: 'title', warnings: ['未知のlayoutです'] }),
      slide({ type: 'sources' }),
    ]);
    const results = lintDeck(d);
    expect(
      results.some((r) => r.rule === 'slide-parse' && r.level === 'warn' && r.slideIndex === 0),
    ).toBe(true);
  });
});

describe('sortLintResults', () => {
  it('error → warn → info の順に安定ソートする', async () => {
    const { sortLintResults } = await import('./deckLint');
    const results = [
      { level: 'info' as const, slideIndex: 0, rule: 'r1', message: 'i' },
      { level: 'error' as const, slideIndex: 1, rule: 'r2', message: 'e' },
      { level: 'warn' as const, slideIndex: 2, rule: 'r3', message: 'w' },
    ];
    const sorted = sortLintResults(results);
    expect(sorted.map((r) => r.level)).toEqual(['error', 'warn', 'info']);
  });
});

describe('lintDeck — 追加の分岐カバー', () => {
  it('空デッキは何も報告しない', () => {
    const d = deck([]);
    expect(lintDeck(d)).toEqual([]);
  });

  it('contrast: example はあるが verdict が空だと warn', () => {
    const d = deck([
      slide<'contrast'>({
        type: 'contrast',
        example: { rows: [{ tag: 't', text: 'x' }] },
        verdict: [],
      }),
    ]);
    const results = lintDeck(d);
    expect(results.some((r) => r.rule === 'contrast-verdict-missing')).toBe(true);
    expect(results.some((r) => r.rule === 'contrast-example-missing')).toBe(false);
  });

  it('steps: ratio合計が100以外だとwarn（deckLint側の検知）', () => {
    const d = deck([
      slide({ type: 'title' }),
      slide<'steps'>({
        type: 'steps',
        stepStyle: 'cards',
        items: [{ title: 'a' }, { title: 'b' }],
        ratio: [
          { label: 'x', value: 30 },
          { label: 'y', value: 30 },
        ],
      }),
      slide({ type: 'sources' }),
    ]);
    const results = lintDeck(d);
    expect(results.some((r) => r.rule === 'steps-ratio-sum')).toBe(true);
  });
});
