// ssot-applied
/**
 * helpContent.ts — HelpModalに表示するショートカット・制約ルールの定義。
 * 記法チートシートタブは templates/slideTemplates.ts の SLIDE_TEMPLATES を
 * そのまま再利用するため、ここでは定義しない（二重管理を避ける）。
 *
 * SHORTCUTSは実際の hooks/hooks.ts の useKeyboardNav の割当と一致させている。
 *
 * CONSTRAINT_RULES:
 * - type別の数値制約（steps items数・chart系列数・contrast example必須 等）は
 *   src/schema/*.ts の meta を単一の情報源として `buildConstraintRules()` が生成する。
 *   これらを個別に手書きすると schema と食い違うリスクがあるため、生成に一本化した。
 * - デッキ全体に関わるルール（sources推奨・title推奨・グラフ/図解/画像の非共存・枚数目安）は
 *   @mdss/core の spec/markdownSpec.ts（DECK_LEVEL_RULES）を正とし、ここでは import して連結する。
 *   特定のtype schemaに属さない（deckLint.ts の責務）ため、ここに手書きで残す。
 *   枚数目安「8〜16枚」は draftAssistPrompt.ts と統一。
 */
import { buildConstraintRules, DECK_LEVEL_RULES } from '@mdss/core';
import { LAYOUT_MODES, LAYOUT_MODE_META } from '../layout/layoutMode';

export interface ShortcutItem {
  keys: string;
  desc: string;
}

// v0.4.7: 表示モードのキー・ラベルは layout/layoutMode.ts を単一の情報源とする
const LAYOUT_KEYS = LAYOUT_MODES.map((m) => LAYOUT_MODE_META[m].key).join(' / ');
const LAYOUT_LABELS = LAYOUT_MODES.map((m) => LAYOUT_MODE_META[m].label).join('／');

export const SHORTCUTS: ShortcutItem[] = [
  { keys: '→ / Space', desc: '次のスライドへ' },
  { keys: '←', desc: '前のスライドへ' },
  { keys: 'F', desc: 'フルスクリーン切替' },
  // v0.4.7: 実装は hero⇔list（プレビューの見せ方）の切替。旧説明
  // 「エディタ⇔プレビュー表示切替」は新設の表示モード（1/2/3）と紛らわしいため修正した。
  { keys: 'V', desc: 'プレビュー表示切替（1枚⇔一覧）' },
  { keys: LAYOUT_KEYS, desc: `表示モード切替（${LAYOUT_LABELS}）` },
  { keys: 'P', desc: 'PDF出力（印刷ダイアログ）' },
  { keys: 'Shift+S', desc: '現在スライドをPNG出力' },
  { keys: 'Shift+P', desc: '全スライドをZIP出力' },
];

export const CONSTRAINT_RULES: string[] = [...DECK_LEVEL_RULES, ...buildConstraintRules()];
