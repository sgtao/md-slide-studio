/**
 * helpContent.ts — HelpModalに表示するショートカット・制約ルールの定義。
 * 記法チートシートタブは templates/slideTemplates.ts の SLIDE_TEMPLATES を
 * そのまま再利用するため、ここでは定義しない（二重管理を避ける）。
 *
 * SHORTCUTSは実際の hooks/hooks.ts の useKeyboardNav の割当と一致させている。
 * CONSTRAINT_RULESの枚数目安は v0.2.6 でLLM向けプロンプトに設定した「8〜16枚」と統一。
 */
export interface ShortcutItem {
  keys: string;
  desc: string;
}

export const SHORTCUTS: ShortcutItem[] = [
  { keys: '→ / Space', desc: '次のスライドへ' },
  { keys: '←', desc: '前のスライドへ' },
  { keys: 'F', desc: 'フルスクリーン切替' },
  { keys: 'V', desc: 'エディタ⇔プレビュー表示切替' },
  { keys: 'P', desc: 'PDF出力（印刷ダイアログ）' },
  { keys: 'Shift+S', desc: '現在スライドをPNG出力' },
  { keys: 'Shift+P', desc: '全スライドをZIP出力' },
];

export const CONSTRAINT_RULES: string[] = [
  '最終スライドは sources（出典）を推奨',
  '先頭スライドは title を推奨',
  'steps の items は2〜5個',
  'chart系（bar / line / donut）の系列は最大5（6件目以降は切り捨て）',
  'contrast は example が必須（無いとerror）。verdict も推奨（無いとwarn）',
  'グラフ・図解・画像は同一スライドに共存させない',
  '枚数の厳密な上限はなし。AIへ依頼する際の目安は8〜16枚',
];
