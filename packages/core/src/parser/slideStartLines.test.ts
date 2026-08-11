import { describe, expect, it } from 'vitest';
import { getSlideStartLines, parseSlideMarkdown } from './slideMarkdown';

// エディタ自動スクロール機能用。getSlideStartLinesの契約
// 「戻り値の配列長は parseSlideMarkdown(src).slides.length と必ず一致する」を中心に検証する。

describe('getSlideStartLines（エディタ自動スクロール）', () => {
  it('複数スライドの先頭行を返す', () => {
    const src = [
      '---',
      'title: Test',
      '---',
      '<!-- slide: title -->',
      '# A',
      '---',
      '<!-- slide: title -->',
      '# B',
    ].join('\n');

    expect(getSlideStartLines(src)).toEqual([3, 6]);
    expect(parseSlideMarkdown(src).slides.length).toBe(2);
  });

  it('コードフェンス内の --- は区切りとして扱わない', () => {
    const src = ['---', 'title: T', '---', '<!-- slide: table -->', '```', '---', '```'].join('\n');

    expect(getSlideStartLines(src)).toEqual([3]);
    expect(parseSlideMarkdown(src).slides.length).toBe(1);
  });

  it('スライド先頭の空行はスキップし、実際のディレクティブ行を指す', () => {
    const src = ['---', 'title: T', '---', '', '', '<!-- slide: title -->', '# Second'].join('\n');

    expect(getSlideStartLines(src)).toEqual([5]);
  });

  it('空チャンク（連続する---）はフィルタされ、配列長がslides.lengthと一致する', () => {
    const src = [
      '---',
      'title: T',
      '---',
      '<!-- slide: title -->',
      '# A',
      '---',
      '---',
      '<!-- slide: title -->',
      '# B',
    ].join('\n');

    const lines = getSlideStartLines(src);
    const deck = parseSlideMarkdown(src);
    expect(lines).toEqual([3, 7]);
    expect(lines.length).toBe(deck.slides.length);
  });
});
