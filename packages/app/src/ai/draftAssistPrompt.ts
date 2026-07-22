// ssot-applied
/**
 * draftAssistPrompt.ts — アプリの「AIプロンプト」ボタンが使う薄い再export。
 *
 * 実装本体は v0.4.2 で @mdss/core（packages/core/src/prompt/draftAssistPrompt.ts）へ移設した。
 * `mdss-convert --guide-prompt`（CLI）も同じ実装を参照するため、ここでロジックを
 * 複製しない（SSOT: buildDraftAssistPrompt は core の1実装のみ）。
 */
export { buildDraftAssistPrompt, MINIMAL_EXAMPLE } from '@mdss/core';
