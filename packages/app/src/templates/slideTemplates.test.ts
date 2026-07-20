import { describe, it, expect } from 'vitest';
import { parseSlideMarkdown } from '@mdss/core';
import { lintDeck } from '@mdss/core';
import { SLIDE_TEMPLATES } from './slideTemplates';

// v0.2.7: 各テンプレートを単体で実際のパーサー・deckLintに通し、
// 記法が陳腐化していないかを機械的に検知する。
// 単体スライドのみのデッキになるため、deckLint側の「先頭title」「最終sources」等の
// 構成的な warn/info は出うるが、error（構文・必須項目の欠落）は0件であることを確認する。
describe('SLIDE_TEMPLATES', () => {
  it('20テンプレートが登録されている（全17type網羅・一部typeは複数バリエーション）', () => {
    expect(SLIDE_TEMPLATES.length).toBeGreaterThanOrEqual(17);
  });

  it.each(SLIDE_TEMPLATES)('$id: パース・lintでerrorが出ない', ({ snippet }) => {
    const md = `---\ntitle: テスト\npalette: ocean\n---\n${snippet}\n`;
    const deck = parseSlideMarkdown(md);
    expect(deck.warnings).toEqual([]);
    expect(deck.slides.length).toBe(1);

    const results = lintDeck(deck);
    const errors = results.filter((r) => r.level === 'error');
    expect(errors).toEqual([]);
  });
});
