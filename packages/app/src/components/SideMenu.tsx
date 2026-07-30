/**
 * SideMenu.tsx — 左サイドメニュー（v0.4.7 追加）。
 *
 * 役割分担:
 *   左（このコンポーネント） … 「どの画面を、どう出すか」＋ドキュメント操作
 *   右上（ControlCluster）   … 「スライドの見た目と書き出し」
 *
 * 表示モードのボタンは layout/layoutMode.ts の LAYOUT_MODES から生成する
 * （手で列挙するとモード追加時に同期漏れが起きるため）。
 *
 * 配置は .workspace の最初の子。.workspace は既に display:flex（横並び）なので、
 * 専用のラッパー要素は設けていない。present モード中は app-shell.css 側で非表示。
 *
 * ヘッダーの 🤖 / サンプル / ❓ ボタンとは v0.4.7 時点では併存させる
 * （既存E2Eのセレクタを維持するため。整理は v0.4.8 のヘッダー改修とセットで行う）。
 */
import { LAYOUT_MODES, LAYOUT_MODE_META, type LayoutMode } from '../layout/layoutMode';

interface Props {
  layout: LayoutMode;
  expanded: boolean;
  onSetLayout: (m: LayoutMode) => void;
  onToggleExpanded: () => void;
  onStartPresent: () => void;
  onOpenPrompt: () => void;
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

      <div className="side-menu__group" role="radiogroup" aria-label="表示モード">
        {LAYOUT_MODES.map((m) => {
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

      <div className="side-menu__group">
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
        <button
          type="button"
          className="side-menu__item"
          onClick={props.onOpenPrompt}
          title="LLM用の原稿作成プロンプトを表示"
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
