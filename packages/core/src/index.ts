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
export {
  parseSlideMarkdown,
  parseDirective,
  parseMermaidSubset,
  getSlideStartLines,
} from './parser/slideMarkdown';
export { parseSlideHeader } from './parser/slideHeader';

// --- 書き出しHTML用のノートポップアップ部品（文字列を返すだけ・DOM非依存） ---
export {
  htmlHasSpeakerNotes,
  buildNotesButtonHtml,
  buildNotesPopupHtml,
  NOTES_POPUP_SCRIPT,
} from './standalone/notesPopup';

// --- 書き出しHTML用の閲覧UI部品（サムネ帯・一覧グリッド・ページ指定移動。文字列を返すだけ） ---
export {
  buildOverviewButtonsHtml,
  buildOverviewContainersHtml,
  OVERVIEW_SCRIPT,
} from './standalone/overviewRuntime';

// --- 書き出しHTML用のショートカットのヘルプ（? キー。文字列を返すだけ） ---
export { exportShortcuts, buildHelpPopupHtml, HELP_POPUP_SCRIPT } from './standalone/helpPopup';

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
// --- svg-figure（journey/gantt）の日数換算（app側SVG座標計算で再利用） ---
export { parseDuration } from './parser/svgFigure';
// --- svg-figure（任意SVG）のパース・サニタイズ ---
export { parseRawSvg } from './parser/svgRaw';
// --- AI原稿作成プロンプト（app「AIプロンプト」ボタン / CLI --guide-prompt 共用） ---
export { buildDraftAssistPrompt, MINIMAL_EXAMPLE } from './prompt/draftAssistPrompt';
