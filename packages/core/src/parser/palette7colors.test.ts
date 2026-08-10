import { describe, expect, it } from 'vitest';
import { parseSlideMarkdown } from './slideMarkdown';

// v0.4.9: パレット5色 -> 7色（Ruby / Gold 追加）。
// 既存の palette フォールバックテスト（slideMarkdown.test.ts）とは別ファイルとして新設。
const fm = (palette: string) =>
  `---\ntitle: テスト\npalette: ${palette}\n---\n<!-- slide: title -->\n# A`;

describe('palette: 7色対応（v0.4.9）', () => {
  it('ruby を正しいパレットとして読む', () => {
    const deck = parseSlideMarkdown(fm('ruby'));
    expect(deck.frontmatter.palette).toBe('ruby');
    expect(deck.warnings.some((w) => w.includes('不正値'))).toBe(false);
  });

  it('gold を正しいパレットとして読む', () => {
    const deck = parseSlideMarkdown(fm('gold'));
    expect(deck.frontmatter.palette).toBe('gold');
    expect(deck.warnings.some((w) => w.includes('不正値'))).toBe(false);
  });

  it('既存5色は引き続き有効（回帰確認）', () => {
    for (const p of ['ocean', 'forest', 'sunset', 'plum', 'graphite']) {
      const deck = parseSlideMarkdown(fm(p));
      expect(deck.frontmatter.palette).toBe(p);
    }
  });

  it('依然として不正値は ocean にフォールバックする', () => {
    const deck = parseSlideMarkdown(fm('neon'));
    expect(deck.frontmatter.palette).toBe('ocean');
    expect(deck.warnings.some((w) => w.includes('neon'))).toBe(true);
  });
});
