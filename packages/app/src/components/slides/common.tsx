/**
 * common.tsx — スライドtype横断の描画部品（v0.2.0）。
 *
 * 従来 SlideRenderer.tsx 内のプライベート関数だった SlideHeading / Note を、
 * 共通ヘッダ拡張（badge / lead / point）とともにここへ集約する。
 * StepsView など type 別コンポーネントを別ファイル化しても
 * 循環importが起きないよう、SlideRenderer には依存しない。
 */
import { renderInline } from '../../parser/inline';

/**
 * 見出しブロック: badge（ピル）＋ slide-title ＋ lead（補足1行）＋ divider。
 * badge / lead は v0.2.0 の共通ヘッダ拡張（markdown-format-ext.md §1）。
 */
export function SlideHeading({
  text,
  badge,
  lead,
}: {
  text?: string;
  badge?: string;
  lead?: string;
}) {
  if (!text && !badge && !lead) return null;
  return (
    <>
      {(badge || text) && (
        <div className="slide-title-row">
          {badge && <span className="slide-badge">{badge}</span>}
          {text && <div className="slide-title">{renderInline(text, { allowBr: true })}</div>}
        </div>
      )}
      {lead && <p className="slide-lead">{renderInline(lead)}</p>}
      {text && <div className="slide-divider" />}
    </>
  );
}

export function Note({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="note">{renderInline(text)}</p>;
}

/**
 * スライド下部の強調帯（point: キー）。💡 は CSS ::before で付与する。
 * .slide 直下に絶対配置されるため、全typeで同じ位置に描画される。
 */
export function PointBand({ text }: { text?: string }) {
  if (!text) return null;
  return <div className="slide-point">{renderInline(text)}</div>;
}

/**
 * スピーカーノート（`note:` 行）。既定は非表示（hidden 属性＋CSS）。
 * 1要素＝1段落。ノートが無いスライドでは要素自体を出力しない（既存MDの出力HTMLを変えない）。
 * クラス名は `.slide-notes`（`.note` は見える補足ノートで使用済みのため避ける）。
 */
export function SpeakerNotes({ notes }: { notes?: string[] }) {
  if (!notes || notes.length === 0) return null;
  return (
    <aside className="slide-notes" aria-label="スピーカーノート" hidden>
      {notes.map((n, i) => (
        <p key={i}>{renderInline(n)}</p>
      ))}
    </aside>
  );
}
