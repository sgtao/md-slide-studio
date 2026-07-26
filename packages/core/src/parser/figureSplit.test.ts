import { describe, expect, it } from 'vitest';
import { parseSlideMarkdown } from './slideMarkdown';
import type { FigureSlide } from './types';

const fm = (body: string) => `---\ntitle: テスト\npalette: ocean\n---\n${body}`;

describe('figure: split-image', () => {
  it('image-side: right を読む', () => {
    const md = fm(
      '<!-- slide: figure, layout: split-image -->\n## 見出し\nimage-side: right\n![alt](https://example.com/a.png)\nsource: [出典](https://example.com)',
    );
    const s = parseSlideMarkdown(md).slides[0] as FigureSlide;
    expect(s.layout).toBe('split-image');
    expect(s.imageSide).toBe('right');
  });

  it('image-side 未指定なら undefined（描画側でleft扱い）', () => {
    const md = fm(
      '<!-- slide: figure, layout: split-image -->\n## 見出し\n![alt](https://example.com/a.png)\nsource: [出典](https://example.com)',
    );
    const s = parseSlideMarkdown(md).slides[0] as FigureSlide;
    expect(s.imageSide).toBeUndefined();
  });

  it('不正なimage-side値は無視される（前方互換方針・警告なし）', () => {
    const md = fm(
      '<!-- slide: figure, layout: split-image -->\n## 見出し\nimage-side: center\n![alt](https://example.com/a.png)\nsource: [出典](https://example.com)',
    );
    const deck = parseSlideMarkdown(md);
    const s = deck.slides[0] as FigureSlide;
    expect(s.imageSide).toBeUndefined();
    expect(s.warnings.some((x) => x.includes('image-side'))).toBe(false);
  });

  it('箇条書き（items）を読む', () => {
    const md = fm(
      '<!-- slide: figure, layout: split-image -->\n## 見出し\n![alt](https://example.com/a.png)\n- **A**：説明1\n- **B**：説明2\nsource: [出典](https://example.com)',
    );
    const s = parseSlideMarkdown(md).slides[0] as FigureSlide;
    expect(s.items).toHaveLength(2);
  });

  it('image: 記法の誤用で警告が出る', () => {
    const md = fm(
      '<!-- slide: figure, layout: split-image -->\n## 見出し\nimage: https://example.com/a.png\nsource: [出典](https://example.com)',
    );
    const s = parseSlideMarkdown(md).slides[0] as FigureSlide;
    expect(s.warnings.some((w) => w.includes('title の split-image 専用'))).toBe(true);
  });

  it('後方互換: layout未指定の従来記法は alt/url/source が従来通り', () => {
    const md = fm(
      '<!-- slide: figure -->\n## 見出し\n![alt](https://example.com/a.png)\nsource: [出典](https://example.com)',
    );
    const s = parseSlideMarkdown(md).slides[0] as FigureSlide;
    expect(s.alt).toBe('alt');
    expect(s.url).toBe('https://example.com/a.png');
    expect(s.source?.label).toBe('出典');
    expect(s.imageSide).toBeUndefined();
    expect(s.items).toBeUndefined();
  });

  it('後方互換: 既存の警告（画像なし・sourceなし）は変化しない', () => {
    const md = fm('<!-- slide: figure -->\n## 見出し');
    const s = parseSlideMarkdown(md).slides[0] as FigureSlide;
    expect(s.warnings.some((w) => w.includes('画像'))).toBe(true);
    expect(s.warnings.some((w) => w.includes('source'))).toBe(true);
  });
});
