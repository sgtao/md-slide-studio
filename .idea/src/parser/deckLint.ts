/**
 * deckLint.ts — デッキ全体のルール検証（構文パーサーとは独立した設計レベルの検証）。
 * parseSlideMarkdown() が返す SlideDeck を受け取る純関数のみで構成する。
 * パーサー本体（slideMarkdown.ts）へは一切手を入れない。
 *
 * 論点A（スライド枚数の推奨閾値）の決定: 閾値はここにも一切持たせない（案1採用）。
 * 「3〜12枚推奨」等のハード/ソフト制約は、LLM支援側（draftAssistPrompt.ts）の
 * 目安としてのみ扱う。deckLint に枚数ルールを追加しないこと。
 */
import type { Slide, SlideDeck } from './types';

export type LintLevel = 'error' | 'warn' | 'info';

export interface LintResult {
  level: LintLevel;
  slideIndex?: number;
  rule: string;
  message: string;
}

/** deck.warnings（構造的エラー）を error として取り込む */
function lintDeckStructure(deck: SlideDeck): LintResult[] {
  return deck.warnings.map((message) => ({
    level: 'error' as const,
    rule: 'deck-structure',
    message,
  }));
}

/** 各スライドの既存 warnings を warn として取り込む */
function lintSlideWarnings(deck: SlideDeck): LintResult[] {
  const results: LintResult[] = [];
  deck.slides.forEach((slide, i) => {
    for (const message of slide.warnings) {
      results.push({ level: 'warn', slideIndex: i, rule: 'slide-parse', message });
    }
  });
  return results;
}

/** デッキ構成ルール：最終スライド sources／先頭スライド title */
function lintDeckComposition(deck: SlideDeck): LintResult[] {
  const results: LintResult[] = [];
  const { slides } = deck;
  if (slides.length === 0) return results;

  const last = slides[slides.length - 1];
  if (last.type !== 'sources') {
    results.push({
      level: 'warn',
      slideIndex: slides.length - 1,
      rule: 'sources-last',
      message: '最終スライドが sources（出典）ではありません（推奨: sources で終える）',
    });
  }

  if (slides[0].type !== 'title') {
    results.push({
      level: 'info',
      slideIndex: 0,
      rule: 'title-first',
      message: '先頭スライドが title ではありません（推奨: title で始める）',
    });
  }

  return results;
}

/** 個別type向けの追加ルール（contrast / steps / title split-image） */
function lintSlideRules(deck: SlideDeck): LintResult[] {
  const results: LintResult[] = [];

  deck.slides.forEach((slide: Slide, i) => {
    if (slide.type === 'contrast') {
      if (!slide.example) {
        results.push({
          level: 'error',
          slideIndex: i,
          rule: 'contrast-example-missing',
          message: 'contrast の example ブロックがありません',
        });
      }
      if (!slide.verdict || slide.verdict.length === 0) {
        results.push({
          level: 'warn',
          slideIndex: i,
          rule: 'contrast-verdict-missing',
          message: 'contrast の verdict ブロックがありません',
        });
      }
    }

    if (slide.type === 'steps' && slide.ratio && slide.ratio.length > 0) {
      const sum = slide.ratio.reduce((acc, r) => acc + r.value, 0);
      if (Math.round(sum) !== 100) {
        results.push({
          level: 'warn',
          slideIndex: i,
          rule: 'steps-ratio-sum',
          message: `ratio の合計が ${sum} です（自動正規化されますが、100 での記述を推奨）`,
        });
      }
    }

    if (slide.type === 'title' && slide.layout === 'split-image' && slide.image) {
      results.push({
        level: 'info',
        slideIndex: i,
        rule: 'split-image-cors',
        message: '外部画像を含むため、PNG/ZIP出力が失敗する可能性があります（CORS制約）',
      });
    }
  });

  return results;
}

export function lintDeck(deck: SlideDeck): LintResult[] {
  return [
    ...lintDeckStructure(deck),
    ...lintSlideWarnings(deck),
    ...lintDeckComposition(deck),
    ...lintSlideRules(deck),
  ];
}

export const LINT_LEVEL_ORDER: Record<LintLevel, number> = { error: 0, warn: 1, info: 2 };

export function sortLintResults(results: LintResult[]): LintResult[] {
  return [...results].sort((a, b) => LINT_LEVEL_ORDER[a.level] - LINT_LEVEL_ORDER[b.level]);
}
