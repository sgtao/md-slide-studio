import { describe, expect, it } from 'vitest';
import { parseSlideMarkdown, parseDirective } from './slideMarkdown';
import type { StepsSlide } from './types';

const fm = (body: string) => `---\ntitle: テスト\npalette: ocean\n---\n${body}`;

const stepsGridMd = (block: string) =>
  fm(`<!-- slide: steps, layout: grid -->\n## 手順\n\`\`\`steps\n${block}\n\`\`\``);

const stepsPlainMd = (block: string) => fm(`<!-- slide: steps -->\n## 手順\n\`\`\`steps\n${block}\n\`\`\``);

describe('steps: layout: grid', () => {
  it('ディレクティブで layout: grid を読む', () => {
    const d = parseDirective('<!-- slide: steps, layout: grid -->')!;
    expect(d.type).toBe('steps');
    expect(d.layout).toBe('grid');
  });

  it('layout: grid でも items のパースは通常どおり行われる', () => {
    const md = stepsGridMd(
      [
        'style: cards',
        'items:',
        '  - { icon: "✍️", title: A, desc: descA }',
        '  - { icon: "🌐", title: B, desc: descB }',
        '  - { icon: "🖼️", title: C, desc: descC }',
        '  - { icon: "👤", title: D, desc: descD }',
      ].join('\n'),
    );
    const s = parseSlideMarkdown(md).slides[0] as StepsSlide;
    expect(s.type).toBe('steps');
    expect(s.layout).toBe('grid');
    expect(s.items).toHaveLength(4);
  });

  it('layout: grid は style（cards/circled）と直交する（circled + grid も成立する）', () => {
    const md = fm(
      '<!-- slide: steps, layout: grid -->\n## 手順\n```steps\nstyle: circled\nitems:\n  - { title: A }\n  - { title: B }\n```',
    );
    const s = parseSlideMarkdown(md).slides[0] as StepsSlide;
    expect(s.layout).toBe('grid');
    expect(s.stepStyle).toBe('circled');
  });
});

describe('steps: items上限（layout: grid のみ 2〜8個・cards/circledは2〜6個）', () => {
  it('layout: grid では items が8個までは切り捨てられない（2行x4列を想定）', () => {
    const items = Array.from({ length: 8 }, (_, i) => `  - { title: S${i + 1} }`).join('\n');
    const md = stepsGridMd(`items:\n${items}`);
    const s = parseSlideMarkdown(md).slides[0] as StepsSlide;
    expect(s.items).toHaveLength(8);
    expect(s.warnings.some((w) => w.includes('上限'))).toBe(false);
  });

  it('layout: grid で items が9個以上は先頭8個に切り捨てて警告する', () => {
    const items = Array.from({ length: 9 }, (_, i) => `  - { title: S${i + 1} }`).join('\n');
    const md = stepsGridMd(`items:\n${items}`);
    const s = parseSlideMarkdown(md).slides[0] as StepsSlide;
    expect(s.items).toHaveLength(8);
    expect(s.warnings.some((w) => w.includes('上限8件'))).toBe(true);
  });

  it('layout未指定（cards既定）では、items 7個で従来どおり上限6件の警告が出る（gridの拡張は継承しない）', () => {
    const items = Array.from({ length: 7 }, (_, i) => `  - { title: S${i + 1} }`).join('\n');
    const md = stepsPlainMd(`items:\n${items}`);
    const s = parseSlideMarkdown(md).slides[0] as StepsSlide;
    expect(s.items).toHaveLength(6);
    expect(s.warnings.some((w) => w.includes('上限6件'))).toBe(true);
  });
});
