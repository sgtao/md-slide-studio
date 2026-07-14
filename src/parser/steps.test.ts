import { describe, expect, it } from 'vitest';
import { parseSlideMarkdown, parseDirective } from './slideMarkdown';
import type { StepsSlide } from './types';

const fm = (body: string) => `---\ntitle: テスト\npalette: ocean\n---\n${body}`;

const stepsMd = (block: string, directive = '<!-- slide: steps -->') =>
  fm(`${directive}\n## 手順\n\`\`\`steps\n${block}\n\`\`\``);

describe('steps: 正常系', () => {
  it('cards スタイルの items（icon / title / desc / tone）を読む', () => {
    const md = stepsMd(
      [
        'style: cards',
        'items:',
        '  - { icon: "🔍", title: Web検索, desc: ブランド情報を収集 }',
        '  - { icon: "✨", title: 自動整理 }',
        '  - { icon: "🎨", title: 完成, tone: outline }',
      ].join('\n'),
    );
    const s = parseSlideMarkdown(md).slides[0] as StepsSlide;
    expect(s.type).toBe('steps');
    expect(s.stepStyle).toBe('cards');
    expect(s.items).toHaveLength(3);
    expect(s.items[0]).toEqual({ icon: '🔍', title: 'Web検索', desc: 'ブランド情報を収集', tone: undefined });
    expect(s.items[2].tone).toBe('outline');
    expect(s.heading).toBe('手順');
  });

  it('circled スタイルと ratio 帯を読む', () => {
    const md = stepsMd(
      [
        'style: circled',
        'items:',
        '  - { title: 生成 }',
        '  - { title: 修正 }',
        'ratio:',
        '  - { label: AI 自動, value: 60 }',
        '  - { label: 手動, value: 40 }',
      ].join('\n'),
    );
    const s = parseSlideMarkdown(md).slides[0] as StepsSlide;
    expect(s.stepStyle).toBe('circled');
    expect(s.ratio).toHaveLength(2);
    expect(s.ratio?.[0]).toEqual({ label: 'AI 自動', value: 60 });
    // 合計100なので警告なし
    expect(s.warnings.filter((w) => w.includes('ratio'))).toHaveLength(0);
  });

  it('ディレクティブで tone: dark を読む（steps に限らず全type共通）', () => {
    const d = parseDirective('<!-- slide: steps, tone: dark -->')!;
    expect(d.type).toBe('steps');
    expect(d.tone).toBe('dark');
    const md = stepsMd('items:\n  - { title: A }\n  - { title: B }', '<!-- slide: steps, tone: dark -->');
    const s = parseSlideMarkdown(md).slides[0] as StepsSlide;
    expect(s.tone).toBe('dark');
  });

  it('未知の tone 値は無視して既定表示（エラーにしない）', () => {
    const d = parseDirective('<!-- slide: points, tone: neon -->')!;
    expect(d.tone).toBeUndefined();
    expect(d.warnings).toHaveLength(0);
  });
});

describe('steps: 異常系（落ちないパーサー）', () => {
  it('items 6件超は先頭5件に切り捨てて警告する', () => {
    const items = Array.from({ length: 7 }, (_, i) => `  - { title: S${i + 1} }`).join('\n');
    const md = stepsMd(`items:\n${items}`);
    const s = parseSlideMarkdown(md).slides[0] as StepsSlide;
    expect(s.items).toHaveLength(5);
    expect(s.warnings.some((w) => w.includes('上限5件'))).toBe(true);
  });

  it('未知の style は cards にフォールバックして警告する', () => {
    const md = stepsMd('style: hexagon\nitems:\n  - { title: A }\n  - { title: B }');
    const s = parseSlideMarkdown(md).slides[0] as StepsSlide;
    expect(s.stepStyle).toBe('cards');
    expect(s.warnings.some((w) => w.includes('hexagon'))).toBe(true);
  });

  it('ratio 合計が100でない場合は正規化前提の警告のみ（描画は継続）', () => {
    const md = stepsMd(
      'items:\n  - { title: A }\n  - { title: B }\nratio:\n  - { label: X, value: 3 }\n  - { label: Y, value: 1 }',
    );
    const s = parseSlideMarkdown(md).slides[0] as StepsSlide;
    expect(s.ratio).toHaveLength(2);
    expect(s.warnings.some((w) => w.includes('正規化'))).toBe(true);
  });

  it('```steps ブロックが無い場合は警告して空 items で描画継続', () => {
    const md = fm('<!-- slide: steps -->\n## 手順だけ');
    const s = parseSlideMarkdown(md).slides[0] as StepsSlide;
    expect(s.type).toBe('steps');
    expect(s.items).toHaveLength(0);
    expect(s.warnings.some((w) => w.includes('steps ブロック'))).toBe(true);
  });
});
