import { describe, it, expect } from 'vitest';
import { parseSlideMarkdown } from '../parser/slideMarkdown';
import { SLIDE_TEMPLATES } from '../templates/slideTemplates';
import { buildTypeReferenceTable, buildConstraintRules } from './describe';
import sampleMd from '../samples/sample.md?raw';

const fm = (body: string) => `---\ntitle: roundtrip\npalette: ocean\n---\n${body}`;

describe('round-trip: SLIDE_TEMPLATES', () => {
  for (const t of SLIDE_TEMPLATES) {
    it(`テンプレ "${t.id}" は warnings 0 件でparseできる`, () => {
      const deck = parseSlideMarkdown(fm(t.snippet));
      const slideWarnings = deck.slides.flatMap((s) => s.warnings);
      expect(deck.warnings, `deck.warnings: ${JSON.stringify(deck.warnings)}`).toEqual([]);
      expect(
        slideWarnings,
        `slide.warnings for "${t.id}": ${JSON.stringify(slideWarnings)}`,
      ).toEqual([]);
    });
  }
});

describe('round-trip: sample.md（v0.2.5 統合デッキ）', () => {
  it('deck.warnings が空である', () => {
    const deck = parseSlideMarkdown(sampleMd);
    expect(deck.warnings).toEqual([]);
  });

  it('全スライドの warnings が空である', () => {
    const deck = parseSlideMarkdown(sampleMd);
    const withWarnings = deck.slides
      .map((s, i) => ({ i, type: s.type, warnings: s.warnings }))
      .filter((s) => s.warnings.length > 0);
    expect(withWarnings, JSON.stringify(withWarnings)).toEqual([]);
  });
});

// describe生成物のスナップショット（型表・制約リスト）。
// schema編集の波及先が変わったことを検知するための固定ポイント。
describe('describe() 生成物のスナップショット', () => {
  it('buildTypeReferenceTable のスナップショット', () => {
    expect(buildTypeReferenceTable()).toMatchSnapshot();
  });
  it('buildConstraintRules のスナップショット', () => {
    expect(buildConstraintRules()).toMatchSnapshot();
  });
});
