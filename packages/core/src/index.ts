/**
 * @mdss/core — MD Slide Studio のDOM非依存コアライブラリ。
 * パーサー・zodスキーマ・deckLint・座標計算の純関数を提供する。
 * React / DOM / html2canvas 等のブラウザ依存は一切含まない（Node/ブラウザ両対応）。
 *
 * 公開APIはこのバレルファイル経由に集約する。app側は `@mdss/core` からのみ import する。
 */

// --- 型定義（types.ts の全public型） ---
export * from './parser/types';

// --- パーサー ---
export { parseSlideMarkdown, parseDirective, parseMermaidSubset } from './parser/slideMarkdown';
export { parseSlideHeader } from './parser/slideHeader';

// --- deckLint ---
export {
  lintDeck,
  sortLintResults,
  LINT_LEVEL_ORDER,
  type LintLevel,
  type LintResult,
} from './parser/deckLint';

// --- スキーマ由来のSSOT生成関数 ---
export { buildTypeReferenceTable, buildConstraintRules } from './schema/describe';
export { getAllSlideTypeMeta, type SlideTypeMeta } from './schema/registry';

// --- 記法仕様書の生成（--print-spec / 外部ドキュメント向け） ---
export {
  buildMarkdownSpec,
  DECK_LEVEL_RULES,
  MINIMAL_DECK_EXAMPLE,
  SLIDE_MD_SPEC_VERSION,
  type MarkdownSpecOptions,
} from './spec/markdownSpec';

// --- 座標計算・数値整形の純関数 ---
export { donutSegmentPath, formatValue } from './geometry/chart';
