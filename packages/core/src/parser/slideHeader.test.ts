import { describe, expect, it } from 'vitest';
import { parseSlideHeader } from './slideHeader';
import { parseSlideMarkdown } from './slideMarkdown';
import type { PointsSlide, SvgFigureSlide, TitleSlide } from './types';

const fm = (body: string) => `---\ntitle: テスト\npalette: ocean\n---\n${body}`;

describe('parseSlideHeader（純関数）', () => {
  it('badge / lead / point を抽出し本文から取り除く', () => {
    const { header, rest } = parseSlideHeader(
      'badge: Step 1\n## 見出し\nlead: リード文\n- 項目\npoint: 帯テキスト',
    );
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
    const md = fm(
      '<!-- slide: points -->\nbadge: WHY\n## 見出し\nlead: 補足リード\n- **A**：説明\npoint: ==重要==な帯',
    );
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

describe('note:（スピーカーノート）', () => {
  it('複数行の note: が出現順に speakerNotes 配列になり、本文から取り除かれる', () => {
    const { header, rest } = parseSlideHeader(
      '## 見出し\nnote: 1段落目\n- 項目\nnote: 2段落目 ==強調==',
    );
    expect(header.speakerNotes).toEqual(['1段落目', '2段落目 ==強調==']);
    expect(rest).toBe('## 見出し\n- 項目');
  });

  it('badge / lead / point と併用できる（note は上書きされず追記される）', () => {
    const { header } = parseSlideHeader('badge: A\nnote: x\npoint: P\nnote: y\nlead: L');
    expect(header).toEqual({ badge: 'A', lead: 'L', point: 'P', speakerNotes: ['x', 'y'] });
  });

  it('コードフェンス内の note: は無視する（本文に残る）', () => {
    const src = '## 見出し\n```steps\nnote: YAMLの中\n```\nnote: 外';
    const { header, rest } = parseSlideHeader(src);
    expect(header.speakerNotes).toEqual(['外']);
    expect(rest).toContain('note: YAMLの中');
  });

  it('インデントされた note: は対象外', () => {
    const src = 'left:\n  note: YAMLの中';
    const { header, rest } = parseSlideHeader(src);
    expect(header.speakerNotes).toBeUndefined();
    expect(rest).toBe(src);
  });

  it('空の note: は無視する（speakerNotes を作らず、本文にも残さない）', () => {
    const { header, rest } = parseSlideHeader('## 見出し\nnote:\nnote:   \n- 項目');
    expect(header.speakerNotes).toBeUndefined();
    expect(header).toEqual({});
    expect(rest).toBe('## 見出し\n- 項目');
  });

  it('notes:（svg-figure の複数形）は note: として拾わない', () => {
    const src = 'notes:\n  - 図の補足';
    const { header, rest } = parseSlideHeader(src);
    expect(header.speakerNotes).toBeUndefined();
    expect(rest).toBe(src);
  });

  it('note を含まないスライドは speakerNotes キー自体を持たない（後方互換）', () => {
    const s = parseSlideMarkdown(fm('<!-- slide: points -->\n## 見出し\n- **A**：説明')).slides[0];
    expect('speakerNotes' in s).toBe(false);
  });

  it('svg-figure は notes:（図の補足）と note:（スピーカーノート）を別々に保持する', () => {
    const md = fm(
      [
        '<!-- slide: svg-figure -->',
        '## 図',
        '```mermaid',
        'journey',
        '  section A',
        '    x: 5: U',
        '```',
        'notes:',
        '  - 見える補足',
        'note: 見えないノート',
      ].join('\n'),
    );
    const s = parseSlideMarkdown(md).slides[0] as SvgFigureSlide;
    expect(s.notes).toEqual(['見える補足']);
    expect(s.speakerNotes).toEqual(['見えないノート']);
  });

  it('points の本文末尾 > 引用（見える note）と note:（非表示）は別物', () => {
    const md = fm(
      '<!-- slide: points -->\n## 見出し\n- **A**：説明\n> 見える補足\nnote: 隠れた補足',
    );
    const s = parseSlideMarkdown(md).slides[0] as PointsSlide;
    expect(s.note).toBe('見える補足');
    expect(s.speakerNotes).toEqual(['隠れた補足']);
  });

  const TYPES = [
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
    'svg-figure',
  ] as const;
  it('全18型で speakerNotes が載る', () => {
    expect(TYPES).toHaveLength(18);
    for (const t of TYPES) {
      const md = fm(`<!-- slide: ${t} -->\n## 見出し\nnote: ノートA\nnote: ノートB`);
      const s = parseSlideMarkdown(md).slides[0];
      expect(s.type, t).toBe(t);
      expect(s.speakerNotes, t).toEqual(['ノートA', 'ノートB']);
    }
  });
});
