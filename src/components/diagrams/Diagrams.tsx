/**
 * Diagrams.tsx — diagram-generation.md の既定座標テーブルに基づく決定論的SVG図解。
 * viewBox 960×480 / 外部依存ゼロ / 色は diagram-* クラス経由。
 * marker id はスライド番号でスコープ（arrow-sN）して文書内一意を保証。
 *
 * v0.2.1: TimelineDiagramSvg（水平軸＋Start円＋上下交互マイルストーン）を追加
 */
import { Fragment } from 'react';
import type { DiagramBlock, TimelineBlock } from '../../parser/types';

// ─── 横フロー座標テーブル（N=2〜5） ───
const FLOW_TABLE: Record<number, { width: number; xs: number[]; arrows: [number, number][] }> = {
  2: { width: 420, xs: [40, 500], arrows: [[460, 500]] },
  3: {
    width: 267,
    xs: [40, 347, 653],
    arrows: [
      [307, 347],
      [614, 654],
    ],
  },
  4: {
    width: 190,
    xs: [40, 270, 500, 730],
    arrows: [
      [230, 270],
      [460, 500],
      [690, 730],
    ],
  },
  5: {
    width: 144,
    xs: [40, 224, 408, 592, 776],
    arrows: [
      [184, 224],
      [368, 408],
      [552, 592],
      [736, 776],
    ],
  },
};

// ─── 縦レイヤー座標テーブル（L=2〜4層） ───
const LAYER_Y: Record<number, { ys: number[]; h: number }> = {
  2: { ys: [50, 245], h: 175 },
  3: { ys: [50, 180, 310], h: 110 },
  4: { ys: [50, 147, 245, 342], h: 77 },
};
const LAYER_X: Record<number, { width: number; xs: number[] }> = {
  1: { width: 880, xs: [40] },
  2: { width: 428, xs: [40, 492] },
  3: { width: 277, xs: [40, 341, 642] },
  4: { width: 202, xs: [40, 266, 492, 718] },
};

// ─── サイクル座標テーブル（N=3〜4） ───
const CYCLE_NODES: Record<number, [number, number][]> = {
  3: [
    [480, 85],
    [610, 310],
    [350, 310],
  ],
  4: [
    [480, 85],
    [630, 235],
    [480, 385],
    [330, 235],
  ],
};
const CYCLE_ARROWS: Record<number, [number, number, number, number][]> = {
  3: [
    [509, 135, 577, 253],
    [552, 310, 416, 310],
    [379, 260, 447, 142],
  ],
  4: [
    [521, 126, 583, 188],
    [589, 276, 527, 338],
    [439, 344, 377, 282],
    [371, 194, 433, 132],
  ],
};

// ─── タイムライン座標テーブル（v0.2.1, N=2〜6） ───
// 水平軸: y=240, 左端の Start 円: cx=80
// マイルストーンの x 座標（個数別の等間隔配置）
const TL_AXIS_Y = 240;
const TL_START_CX = 80;
const TL_X: Record<number, number[]> = {
  2: [340, 680],
  3: [280, 480, 680],
  4: [240, 400, 560, 720],
  5: [220, 360, 500, 640, 780],
  6: [200, 330, 460, 590, 720, 850],
};
// ラベルの上下交互配置: 偶数indexは上（y=140）、奇数indexは下（y=340）
const TL_LABEL_Y_ABOVE = 135;
const TL_LABEL_Y_BELOW = 345;
const TL_WHEN_Y_ABOVE = 160;
const TL_WHEN_Y_BELOW = 320;
const TL_TICK_TOP = 220;
const TL_TICK_BOTTOM = 260;

/** SVG <text> は自動折返ししないため、長いラベルは手動2行分割（tspan） */
function NodeLabel({
  x,
  y,
  text,
  className = 'diagram-label',
}: {
  x: number;
  y: number;
  text: string;
  className?: string;
}) {
  if (text.length <= 8) {
    return (
      <text className={className} x={x} y={y}>
        {text}
      </text>
    );
  }
  const mid = Math.ceil(text.length / 2);
  return (
    <text className={className} x={x} y={y}>
      <tspan x={x} dy="-0.6em">
        {text.slice(0, mid)}
      </tspan>
      <tspan x={x} dy="1.2em">
        {text.slice(mid)}
      </tspan>
    </text>
  );
}

function DiagramFrame({
  markerId,
  title,
  source,
  children,
}: {
  markerId: string;
  title: string;
  source?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 960 480"
      xmlns="http://www.w3.org/2000/svg"
      className="diagram-svg"
      role="img"
    >
      <title>{title}</title>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" className="diagram-arrowhead" />
        </marker>
      </defs>
      {children}
      {source && (
        <text x={920} y={470} className="diagram-source" textAnchor="end">
          出典: {source}
        </text>
      )}
    </svg>
  );
}

export function FlowDiagramSvg({
  diagram,
  slideIndex,
  source,
}: {
  diagram: DiagramBlock;
  slideIndex: number;
  source?: string;
}) {
  const n = Math.min(Math.max(diagram.nodes.length, 2), 5) as 2 | 3 | 4 | 5;
  const t = FLOW_TABLE[n];
  const nodes = diagram.nodes.slice(0, n);
  const markerId = `arrow-s${slideIndex}`;
  return (
    <DiagramFrame markerId={markerId} title={`フロー図: ${nodes.join(' → ')}`} source={source}>
      {nodes.map((label, i) => {
        const cx = t.xs[i] + t.width / 2;
        return (
          <Fragment key={i}>
            <rect className="diagram-node" x={t.xs[i]} y={185} width={t.width} height={90} rx={8} />
            <NodeLabel x={cx} y={235} text={label} />
            {diagram.labels?.[i] ? (
              <text className="diagram-sublabel" x={cx} y={300}>
                {diagram.labels[i]}
              </text>
            ) : null}
          </Fragment>
        );
      })}
      {t.arrows.slice(0, nodes.length - 1).map(([x1, x2], i) => (
        <path
          key={`e${i}`}
          className="diagram-edge"
          markerEnd={`url(#${markerId})`}
          d={`M${x1},230 L${x2},230`}
        />
      ))}
    </DiagramFrame>
  );
}

export function LayerDiagramSvg({
  diagram,
  slideIndex,
  source,
}: {
  diagram: DiagramBlock;
  slideIndex: number;
  source?: string;
}) {
  const layers: string[][] = diagram.layers ?? diagram.nodes.map((n) => [n]);
  const L = Math.min(Math.max(layers.length, 2), 4);
  const ly = LAYER_Y[L];
  const markerId = `arrow-s${slideIndex}`;
  return (
    <DiagramFrame markerId={markerId} title={`レイヤー図（${L}層）`} source={source}>
      {layers.slice(0, L).map((boxes, li) => {
        const k = Math.min(Math.max(boxes.length, 1), 4);
        const lx = LAYER_X[k];
        const y = ly.ys[li];
        return (
          <Fragment key={li}>
            {boxes.slice(0, k).map((label, bi) => (
              <Fragment key={bi}>
                <rect
                  className={li === L - 1 ? 'diagram-node diagram-node-accent' : 'diagram-node'}
                  x={lx.xs[bi]}
                  y={y}
                  width={lx.width}
                  height={ly.h}
                  rx={8}
                />
                <NodeLabel x={lx.xs[bi] + lx.width / 2} y={y + ly.h / 2 + 5} text={label} />
              </Fragment>
            ))}
          </Fragment>
        );
      })}
    </DiagramFrame>
  );
}

export function CycleDiagramSvg({
  diagram,
  slideIndex,
  source,
  centerLabel,
}: {
  diagram: DiagramBlock;
  slideIndex: number;
  source?: string;
  centerLabel?: string;
}) {
  const n = Math.min(Math.max(diagram.nodes.length, 3), 4) as 3 | 4;
  const nodes = diagram.nodes.slice(0, n);
  const centers = CYCLE_NODES[n];
  const arrows = CYCLE_ARROWS[n];
  const markerId = `arrow-s${slideIndex}`;
  return (
    <DiagramFrame
      markerId={markerId}
      title={`サイクル図: ${nodes.join(' → ')} → …`}
      source={source}
    >
      {centerLabel && (
        <NodeLabel x={480} y={240} text={centerLabel} className="diagram-label diagram-center" />
      )}
      {nodes.map((label, i) => (
        <Fragment key={i}>
          <circle className="diagram-node" cx={centers[i][0]} cy={centers[i][1]} r={58} />
          <NodeLabel x={centers[i][0]} y={centers[i][1] + 5} text={label} />
        </Fragment>
      ))}
      {arrows.map(([x1, y1, x2, y2], i) => (
        <path
          key={`e${i}`}
          className="diagram-edge"
          markerEnd={`url(#${markerId})`}
          d={`M${x1},${y1} L${x2},${y2}`}
        />
      ))}
    </DiagramFrame>
  );
}

/**
 * v0.2.1: タイムライン図（水平軸＋Start円＋上下交互マイルストーン）
 * 座標は個数別テーブル（TL_X）を参照。計算しない（決定論的描画の原則）。
 */
export function TimelineDiagramSvg({
  timeline,
  slideIndex,
  source,
}: {
  timeline: TimelineBlock;
  slideIndex: number;
  source?: string;
}) {
  const n = Math.min(Math.max(timeline.milestones.length, 2), 6) as 2 | 3 | 4 | 5 | 6;
  const ms = timeline.milestones.slice(0, n);
  const xs = TL_X[n];
  const markerId = `arrow-s${slideIndex}`;
  const axisEnd = xs[n - 1] + 40;

  return (
    <DiagramFrame
      markerId={markerId}
      title={`タイムライン: ${ms.map((m) => m.label).join(' → ')}`}
      source={source}
    >
      {/* 水平軸 */}
      <line
        className="diagram-edge"
        x1={TL_START_CX}
        y1={TL_AXIS_Y}
        x2={axisEnd}
        y2={TL_AXIS_Y}
      />

      {/* Start 円 */}
      <circle
        className="diagram-node diagram-node-accent"
        cx={TL_START_CX}
        cy={TL_AXIS_Y}
        r={28}
      />
      <text className="diagram-label" x={TL_START_CX} y={TL_AXIS_Y + 4} textAnchor="middle">
        {timeline.start}
      </text>

      {/* マイルストーン */}
      {ms.map((m, i) => {
        const x = xs[i];
        const above = i % 2 === 0;
        const labelY = above ? TL_LABEL_Y_ABOVE : TL_LABEL_Y_BELOW;
        const whenY = above ? TL_WHEN_Y_ABOVE : TL_WHEN_Y_BELOW;
        const tickY1 = above ? TL_TICK_TOP : TL_AXIS_Y;
        const tickY2 = above ? TL_AXIS_Y : TL_TICK_BOTTOM;
        return (
          <Fragment key={i}>
            {/* 縦チック（軸から上下へ） */}
            <line className="diagram-edge tl-tick" x1={x} y1={tickY1} x2={x} y2={tickY2} />
            {/* チック先端の丸 */}
            <circle className="diagram-node-accent tl-dot" cx={x} cy={above ? TL_TICK_TOP : TL_TICK_BOTTOM} r={5} />
            {/* ラベル（8文字超は2行分割） */}
            <NodeLabel x={x} y={labelY} text={m.label} />
            {/* when テキスト */}
            <text className="diagram-sublabel" x={x} y={whenY} textAnchor="middle">
              {m.when}
            </text>
          </Fragment>
        );
      })}
    </DiagramFrame>
  );
}
