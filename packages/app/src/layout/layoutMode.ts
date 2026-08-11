/**
 * layoutMode.ts — 表示モード（2分割／編集のみ／プレビューのみ）の単一情報源。
 *
 * ここを唯一の定義元とし、SideMenuのボタン・キーボードショートカット・
 * ヘルプの説明文をすべて導出する（同じ内容を3箇所に手書きしないための措置）。
 *
 * 軸の関係:
 *   mode   'edit' | 'present'            … アプリUIを見せるか／全画面発表か
 *   layout 'split'|'editor'|'preview'    … 編集時にどのペインを出すか（このファイル）
 *   view   'hero' | 'list'               … プレビューの見せ方（1枚／一覧）
 *   present 中は layout を 'preview' へ一時上書きするが、保存値は変更しない
 *   （プレゼンから戻ったとき、元の作業レイアウトへ復帰させるため）。
 *
 * 注意: usePersistentState は localStorage の値を無検証で `as T` キャストする。
 *       3値以上を扱う layout では未知の値が data-layout に流れ込みうるため、
 *       読み出し側で必ず coerceLayoutMode() / resolveLayout() を通すこと。
 */

export const LAYOUT_MODES = ['split', 'editor', 'preview'] as const;
export type LayoutMode = (typeof LAYOUT_MODES)[number];

export const DEFAULT_LAYOUT_MODE: LayoutMode = 'split';

export interface LayoutModeMeta {
  /** サイドメニューのアイコン */
  icon: string;
  /** サイドメニューのラベル・ヘルプの説明文に使う */
  label: string;
  /** キーボードショートカット（単独キー） */
  key: string;
  /** tooltip 用の補足 */
  desc: string;
}

export const LAYOUT_MODE_META: Record<LayoutMode, LayoutModeMeta> = {
  split: {
    icon: '◫',
    label: '2分割',
    key: '1',
    desc: 'エディタとプレビューを並べる',
  },
  editor: {
    icon: '✎',
    label: '編集のみ',
    key: '2',
    desc: 'Markdownエディタのみを表示する',
  },
  preview: {
    icon: '▭',
    label: 'プレビューのみ',
    key: '3',
    desc: 'スライドプレビューのみを表示する',
  },
};

export function isLayoutMode(v: unknown): v is LayoutMode {
  return typeof v === 'string' && (LAYOUT_MODES as readonly string[]).includes(v);
}

/** localStorage 等の外部由来の値を安全な LayoutMode に丸める。 */
export function coerceLayoutMode(
  v: unknown,
  fallback: LayoutMode = DEFAULT_LAYOUT_MODE,
): LayoutMode {
  return isLayoutMode(v) ? v : fallback;
}

/** キー入力（'1' | '2' | '3'）から LayoutMode を引く。該当なしは null。 */
export function layoutModeFromKey(key: string): LayoutMode | null {
  return LAYOUT_MODES.find((m) => LAYOUT_MODE_META[m].key === key) ?? null;
}

/**
 * 実効レイアウトを決める。
 * present モード中はプレビュー固定だが、保存値（作業レイアウト）は変更しない。
 */
export function resolveLayout(stored: unknown, mode: 'edit' | 'present'): LayoutMode {
  return mode === 'present' ? 'preview' : coerceLayoutMode(stored);
}

/**
 * DOM実体を html2canvas / window.print() に渡す書き出しが可能か。
 * 'editor' では .preview-pane がアンマウントされているため不可。
 * ボタンだけでなくキーボードショートカット側も、この判定で無効化すること。
 * （無効化しないと P キーで白紙PDFが出るなどの無言failureになる）
 */
export function canExportFromDom(effective: LayoutMode): boolean {
  return effective !== 'editor';
}
