/**
 * NotesPopup.tsx — スピーカーノート（note:）のポップアップ（右上 🗒️ ボタン）。
 *
 * hero ビューで、現在のスライドのノートを浮かぶパネル（非モーダル）で見せる。
 * パネル内の「前へ／次へ」でページ移動もできる。
 * 書き出しHTML側（core/standalone/notesPopup.ts）と DOM の id・クラス名・文言を揃え、
 * CSS（nav-controls.css）を共有する。設計: 02_viewer-ui-plan.md §4-6。
 *
 * ControlCluster の子として描画される（.control-cluster 内の絶対配置）。
 */
import { renderInline } from '../parser/inline';

export interface NotesPopupProps {
  /** 現在のスライドのノート（1要素＝1段落）。無ければ空配列 */
  notes: string[];
  /** 現在のスライド番号（0始まり）と総数 */
  current: number;
  total: number;
  onNavigate: (dir: 1 | -1) => void;
  onClose: () => void;
}

/** ボタンをマウスで押してもフォーカスを奪わない（押したあとも Space がスライド送りのまま効く） */
const keepFocus = (e: React.MouseEvent) => e.preventDefault();

export function NotesPopup({ notes, current, total, onNavigate, onClose }: NotesPopupProps) {
  return (
    <div id="notes-popup" className="notes-popup" role="dialog" aria-label="スピーカーノート">
      <div className="notes-header">
        <span className="notes-title">🗒️ ノート</span>
        <span id="notes-page" className="notes-page">
          {current + 1} / {total}
        </span>
        <button
          id="notes-close"
          type="button"
          onMouseDown={keepFocus}
          onClick={onClose}
          aria-label="ノートを閉じる"
          title="閉じる（Esc）"
        >
          ✕
        </button>
      </div>
      <div id="notes-body" className="notes-body" key={current}>
        {notes.length > 0 ? (
          notes.map((n, i) => <p key={i}>{renderInline(n)}</p>)
        ) : (
          <p className="notes-empty">（ノートなし）</p>
        )}
      </div>
      <div className="notes-footer">
        <button
          id="notes-prev"
          type="button"
          onMouseDown={keepFocus}
          onClick={() => onNavigate(-1)}
          disabled={current === 0}
        >
          ◀ 前へ
        </button>
        <button
          id="notes-next"
          type="button"
          onMouseDown={keepFocus}
          onClick={() => onNavigate(1)}
          disabled={current >= total - 1}
        >
          次へ ▶
        </button>
      </div>
    </div>
  );
}
