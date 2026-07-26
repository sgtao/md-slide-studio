import { describe, expect, it } from 'vitest';
import { parseSlideMarkdown } from './slideMarkdown';
import type { FeatureShowcaseSlide } from './types';

const fm = (body: string) => `---\ntitle: テスト\npalette: ocean\n---\n${body}`;

const baseYaml = `left:
  eyebrow: A
  heading: 見出しL
  lead: リードL
right:
  num: "1"
  eyebrow: B
  heading: 見出しR
  items:
    - { label: X, desc: Y }`;

describe('feature-showcase: layout reverse', () => {
  it('layout: reverse をパースできる', () => {
    const md = fm(`<!-- slide: feature-showcase, layout: reverse -->\n${baseYaml}`);
    const s = parseSlideMarkdown(md).slides[0] as FeatureShowcaseSlide;
    expect(s.layout).toBe('reverse');
  });

  it('reverse指定でも left/right のデータは入れ替わらない', () => {
    const md = fm(`<!-- slide: feature-showcase, layout: reverse -->\n${baseYaml}`);
    const s = parseSlideMarkdown(md).slides[0] as FeatureShowcaseSlide;
    expect(s.left.heading).toBe('見出しL');
    expect(s.right.heading).toBe('見出しR');
  });

  it('layout未指定なら layout は undefined のまま', () => {
    const md = fm(`<!-- slide: feature-showcase -->\n${baseYaml}`);
    const s = parseSlideMarkdown(md).slides[0] as FeatureShowcaseSlide;
    expect(s.layout).toBeUndefined();
  });

  it('未知のlayout値は無視される（前方互換方針）', () => {
    const md = fm(`<!-- slide: feature-showcase, layout: reverze -->\n${baseYaml}`);
    const s = parseSlideMarkdown(md).slides[0] as FeatureShowcaseSlide;
    expect(s.layout).toBeUndefined();
  });
});
