/**
 * SideMenu.tsx — 左サイドメニュー。
 *
 * 役割分担:
 *   左（このコンポーネント） … 「どの画面を、どう出すか」＋ドキュメント操作
 *   右上（ControlCluster）   … 「スライドの見た目と書き出し」
 *
 * 表示モードのボタンのラベル・アイコン・ショートカット表示は layout/layoutMode.ts の
 * LAYOUT_MODE_META から生成する（手で列挙すると値の同期漏れが起きるため）。
 * ただしこのメニュー内の並び順だけは SIDE_MENU_LAYOUT_ORDER で個別に定義する
 * （キーボードショートカット表示の正順とメニューの見せ方が異なるため）。
 *
 * 配置は .workspace の最初の子。.workspace は既に display:flex（横並び）なので、
 * 専用のラッパー要素は設けていない。present モード中は app-shell.css 側で非表示。
 *
 * ヘッダーの 🤖 / サンプル / ❓ ボタンは併存させる
 * （既存E2Eのセレクタを維持するため。整理はヘッダー改修とセットで行う）。
 */
import { LAYOUT_MODE_META, type LayoutMode } from '../layout/layoutMode';

/**
 * サイドメニュー内の表示モード並び順（開く→編集のみ→プレビューのみ→2分割→プレゼン）。
 * layout/layoutMode.ts の LAYOUT_MODES（キーボードショートカット・ヘルプ表示の
 * 正順=2分割/編集のみ/プレビューのみ）とは独立の、このメニュー専用の表示順。
 */
const SIDE_MENU_LAYOUT_ORDER: readonly LayoutMode[] = ['editor', 'preview', 'split'];

interface Props {
  layout: LayoutMode;
  expanded: boolean;
  onSetLayout: (m: LayoutMode) => void;
  onToggleExpanded: () => void;
  onStartPresent: () => void;
  /** メインパネル版AIプロンプトが表示中か（ボタンの選択状態表示に使う） */
  aiPromptOpen: boolean;
  onOpenPromptPanel: () => void;
  onOpenFile: () => void;
  onOpenUrlLoad: () => void;
  onLoadSample: () => void;
  onOpenHelp: () => void;
}

export function SideMenu(props: Props) {
  return (
    <nav
      className="side-menu"
      data-expanded={props.expanded ? 'true' : 'false'}
      aria-label="表示メニュー"
    >
      <button
        type="button"
        className="side-menu__toggle"
        onClick={props.onToggleExpanded}
        aria-expanded={props.expanded}
        title={props.expanded ? 'メニューを畳む' : 'メニューを開く'}
      >
        <span className="side-menu__ico" aria-hidden="true">
          ☰
        </span>
        <span className="side-menu__label">メニュー</span>
      </button>

      <div className="side-menu__group">
        <button
          type="button"
          className="side-menu__item"
          onClick={props.onOpenFile}
          title="MDファイルを開く（.md / .markdown、現在の原稿を置き換えます）"
        >
          <span className="side-menu__ico" aria-hidden="true">
            📂
          </span>
          <span className="side-menu__label">開く</span>
        </button>

        <button
          type="button"
          className="side-menu__item"
          onClick={props.onOpenUrlLoad}
          title="URLを指定してMDファイルを取得（.md / .markdown、現在の原稿を置き換えます）"
        >
          <span className="side-menu__ico" aria-hidden="true">
            🔗
          </span>
          <span className="side-menu__label">URLで取得</span>
        </button>
      </div>

      <div className="side-menu__group">
        <div className="side-menu__subgroup" role="radiogroup" aria-label="表示モード">
          {SIDE_MENU_LAYOUT_ORDER.map((m) => {
            const meta = LAYOUT_MODE_META[m];
            return (
              <button
                key={m}
                type="button"
                role="radio"
                className="side-menu__item"
                data-layout-opt={m}
                aria-checked={props.layout === m}
                onClick={() => props.onSetLayout(m)}
                title={`${meta.desc}（${meta.key}）`}
              >
                <span className="side-menu__ico" aria-hidden="true">
                  {meta.icon}
                </span>
                <span className="side-menu__label">{meta.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="side-menu__item"
          onClick={props.onStartPresent}
          title="プレゼンモードで全画面表示"
        >
          <span className="side-menu__ico" aria-hidden="true">
            ▶
          </span>
          <span className="side-menu__label">プレゼン</span>
        </button>
      </div>

      <div className="side-menu__group">
        <button
          type="button"
          className="side-menu__item"
          aria-pressed={props.aiPromptOpen}
          onClick={props.onOpenPromptPanel}
          title="AIプロンプトをメインパネルに表示（複数行のテーマ入力に対応）"
        >
          <span className="side-menu__ico" aria-hidden="true">
            🤖
          </span>
          <span className="side-menu__label">AIプロンプト</span>
        </button>
        <button
          type="button"
          className="side-menu__item"
          onClick={props.onLoadSample}
          title="サンプル原稿を読み込む"
        >
          <span className="side-menu__ico" aria-hidden="true">
            📄
          </span>
          <span className="side-menu__label">サンプル</span>
        </button>
        <button
          type="button"
          className="side-menu__item"
          onClick={props.onOpenHelp}
          title="記法チートシート・ショートカット・制約ルールを表示"
        >
          <span className="side-menu__ico" aria-hidden="true">
            ❓
          </span>
          <span className="side-menu__label">ヘルプ</span>
        </button>
      </div>
    </nav>
  );
}
