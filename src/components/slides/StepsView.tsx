/**
 * StepsView.tsx — steps type（カード型ステップフロー、v0.2.0）の描画。
 *
 * 設計判断:
 * - diagram-flow（SVGノード）と異なり HTML/CSS（flexbox）で組む。
 *   SVG の <text> は自動折返し不可のため、アイコン＋複数行テキスト＋説明文の
 *   リッチなカード内容には不向き（feature-showcase で実証済みの方式を踏襲）
 * - カード間の矢印は CSS 疑似要素で自動挿入（MDには書かない）
 * - カード・ratio帯の系統色は nth-child × CSS変数（--chart-1〜5）で
 *   順繰り割当（決定論・色ハードコード禁止規約に準拠）
 * - ratio は値合計で正規化（合計≠100でも比率として成立させる。警告はパーサー側）
 */
import type { StepRatioItem, StepsSlide } from '../../parser/types';
import { renderInline } from '../../parser/inline';
import { Note, SlideHeading } from './common';

export function StepsView({ slide }: { slide: StepsSlide }) {
  return (
    <div className="slide-inner">
      <SlideHeading text={slide.heading} badge={slide.badge} lead={slide.lead} />
      {slide.items.length > 0 ? (
        <div className={`steps-flow steps-${slide.stepStyle}`}>
          {slide.items.map((it, i) => (
            <div key={i} className={`steps-item${it.tone ? ` steps-item--${it.tone}` : ''}`}>
              {slide.stepStyle === 'circled' && <div className="steps-num">{i + 1}</div>}
              {it.icon && <div className="steps-icon">{it.icon}</div>}
              <div className="steps-title">{renderInline(it.title)}</div>
              {it.desc && <div className="steps-desc">{renderInline(it.desc)}</div>}
            </div>
          ))}
        </div>
      ) : (
        <p className="note">（steps ブロックが未定義のため表示できません）</p>
      )}
      {slide.ratio && slide.ratio.length > 0 && <StepsRatio ratio={slide.ratio} />}
      <Note text={slide.note} />
    </div>
  );
}

function StepsRatio({ ratio }: { ratio: StepRatioItem[] }) {
  const total = ratio.reduce((a, b) => a + b.value, 0);
  const widthOf = (v: number) => `${((v / total) * 100).toFixed(2)}%`;
  return (
    <div className="steps-ratio-wrap">
      <div className="steps-ratio" role="presentation">
        {ratio.map((r, i) => (
          <div key={i} className="steps-ratio-seg" style={{ width: widthOf(r.value) }} />
        ))}
      </div>
      <div className="steps-ratio-legend">
        {ratio.map((r, i) => (
          <div key={i} className="steps-ratio-label" style={{ width: widthOf(r.value) }}>
            {r.label}
          </div>
        ))}
      </div>
    </div>
  );
}
