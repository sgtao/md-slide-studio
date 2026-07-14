import { describe, expect, it } from 'vitest';
import { parseSlideHeader } from './slideHeader';
import { parseSlideMarkdown } from './slideMarkdown';
import type { PointsSlide, TitleSlide } from './types';

const fm = (body: string) => `---\ntitle: テスト\npalette: ocean\n---\n${body}`;

describe('parseSlideHeader（純関数）', () => {
  it('badge / lead / point を抽出し本文から取り除く', () => {
    const { header, rest } = parseSlideHeader('badge: Step 1\n## 見出し\nlead: リード文\n- 項目\npoint: 帯テキスト');
    expect(header.badge).toBe('Step 1');
    expect(header.lead).toBe('リード文');
    expect(header.point).toBe('帯テキスト');
    expect(rest).toBe('## 見出し\n- 項目');
  });

  it('キーが無ければ空の header と元の本文を返す', () => {
    const src = '## 見出し\n- 項目';
    const { header, rest } = parseSlideHeader(src);
    expect(header).toEqual({});
    expect(rest).toBe(src);
  });

  it('コードフェンス内の同名キーは抽出しない', () => {
    const src = '## 見出し\n```steps\nstyle: cards\nitems:\n  - { title: A }\n```\npoint: 帯';
    const { header, rest } = parseSlideHeader(src);
    expect(header.point).toBe('帯');
    // フェンス内はそのまま残る
    expect(rest).toContain('style: cards');
    expect(rest).not.toContain('point: 帯');
  });

  it('インデントされた同名キー（YAML内想定）は抽出しない', () => {
    const src = 'left:\n  lead: YAMLの中\n  heading: 見出し';
    const { header, rest } = parseSlideHeader(src);
    expect(header.lead).toBeUndefined();
    expect(rest).toBe(src);
  });

  it('重複キーは後勝ち（警告なし・落ちない）', () => {
    const { header } = parseSlideHeader('badge: A\nbadge: B');
    expect(header.badge).toBe('B');
  });
});

describe('parseSlideHeader（デッキ統合）', () => {
  it('points スライドに badge / lead / point が載る', () => {
    const md = fm('<!-- slide: points -->\nbadge: WHY\n## 見出し\nlead: 補足リード\n- **A**：説明\npoint: ==重要==な帯');
    const s = parseSlideMarkdown(md).slides[0] as PointsSlide;
    expect(s.badge).toBe('WHY');
    expect(s.lead).toBe('補足リード');
    expect(s.point).toBe('==重要==な帯');
    expect(s.items).toHaveLength(1);
  });

  it('title スライドでも badge / point が使える（subtitle と併存）', () => {
    const md = fm('<!-- slide: title -->\nbadge: 2026\n# タイトル\nsubtitle: サブ\npoint: 帯');
    const s = parseSlideMarkdown(md).slides[0] as TitleSlide;
    expect(s.badge).toBe('2026');
    expect(s.subtitle).toBe('サブ');
    expect(s.point).toBe('帯');
  });
});
