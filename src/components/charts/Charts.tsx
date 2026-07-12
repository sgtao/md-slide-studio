/**
 * Charts.tsx — chart-generation.md の座標テーブルに基づく決定論的SVG生成。
 * - viewBox 720×360、本文領域 ≒ 160-680, 50-310
 * - 色はハードコード禁止: chart-series-N / chart-line-N クラス経由（CSS変数追従）
 * - タイトル・軸ラベル・数値ラベル・出典は必須要素として常に描画
 */
import type { ChartBlock, ComparisonChartBlock } from '../../parser/types';

const VB = { w: 720, h: 360 };

function ChartFrame({
  title,
  source,
  children,
}: {
  title: string;
  source: { name: string; url?: string };
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      xmlns="http://www.w3.org/2000/svg"
      className="chart-svg"
      role="img"
    >
      <title>{title}</title>
      <text x={VB.w / 2} y={28} className="chart-title" textAnchor="middle">
        {title}
      </text>
      {children}
      <text x={VB.w - 10} y={VB.h - 8} className="chart-source" textAnchor="end">
        出典: {source.name}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 横棒グラフ: width = (val / max) × 480、カテゴリ行は固定間隔
// ---------------------------------------------------------------------------

export function BarChartSvg({ chart }: { chart: ChartBlock }) {
  const data = chart.data;
  const max = Math.max(...data.map((d) => d.value), 1);
  const x0 = 160;
  const areaTop = 56;
  const areaBottom = 306;
  const rowH = (areaBottom - areaTop) / data.length;
  const barH = Math.min(30, rowH * 0.55);
  return (
    <ChartFrame title={chart.title} source={chart.source}>
      {data.map((d, i) => {
        const y = areaTop + rowH * i + (rowH - barH) / 2;
        const w = Math.max(2, (d.value / max) * 480);
        return (
          <g key={i}>
            <text x={x0 - 12} y={y + barH / 2 + 4} className="chart-label" textAnchor="end">
              {d.label}
            </text>
            <rect
              x={x0}
              y={y}
              width={w}
              height={barH}
              rx={3}
              className={`chart-series-${(i % 5) + 1}`}
            />
            <text x={x0 + w + 8} y={y + barH / 2 + 4} className="chart-value">
              {formatValue(d.value)}
              {chart.unit ?? ''}
            </text>
          </g>
        );
      })}
      <text x={VB.w / 2} y={340} className="chart-axis-label" textAnchor="middle">
        {chart.unit ? `値（${chart.unit}）` : '値'}
      </text>
      <text
        className="chart-axis-label"
        transform="rotate(-90 24 190)"
        x={24}
        y={190}
        textAnchor="middle"
      >
        項目
      </text>
    </ChartFrame>
  );
}

// ---------------------------------------------------------------------------
// 折れ線: x = 160 + (i/(N-1))×480, y = 290 - ((val-min)/(max-min))×220
// ---------------------------------------------------------------------------

export function LineChartSvg({ chart }: { chart: ChartBlock }) {
  const data = chart.data;
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const range = max - min || 1;
  const pt = (i: number, v: number) => ({
    x: data.length === 1 ? 400 : 160 + (i / (data.length - 1)) * 480,
    y: 290 - ((v - min) / range) * 220,
  });
  const points = data.map((d, i) => pt(i, d.value));
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  return (
    <ChartFrame title={chart.title} source={chart.source}>
      {/* グリッド */}
      {[0, 0.5, 1].map((t) => (
        <line
          key={t}
          x1={160}
          x2={640}
          y1={290 - t * 220}
          y2={290 - t * 220}
          className="chart-grid-line"
        />
      ))}
      <path d={path} className="chart-line-1" fill="none" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={5} className="chart-series-1" />
          <text x={p.x} y={p.y - 12} className="chart-value" textAnchor="middle">
            {formatValue(data[i].value)}
            {chart.unit ?? ''}
          </text>
          <text x={p.x} y={312} className="chart-label" textAnchor="middle">
            {data[i].label}
          </text>
        </g>
      ))}
      <text x={VB.w / 2} y={344} className="chart-axis-label" textAnchor="middle">
        時点
      </text>
      <text
        className="chart-axis-label"
        transform="rotate(-90 24 190)"
        x={24}
        y={190}
        textAnchor="middle"
      >
        {chart.unit ? `値（${chart.unit}）` : '値'}
      </text>
    </ChartFrame>
  );
}

// ---------------------------------------------------------------------------
// ドーナツ: 中心(260,180) 外径110 内径60、12時起点で時計回り
// ---------------------------------------------------------------------------

export function donutSegmentPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
): string {
  // 12時方向起点・時計回り。角度はラジアン（0 = 12時）
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  const p = (r: number, a: number) => ({
    x: cx + r * Math.sin(a),
    y: cy - r * Math.cos(a),
  });
  const o1 = p(rOuter, startAngle);
  const o2 = p(rOuter, endAngle);
  const i1 = p(rInner, endAngle);
  const i2 = p(rInner, startAngle);
  return [
    `M${o1.x.toFixed(2)},${o1.y.toFixed(2)}`,
    `A${rOuter},${rOuter} 0 ${large} 1 ${o2.x.toFixed(2)},${o2.y.toFixed(2)}`,
    `L${i1.x.toFixed(2)},${i1.y.toFixed(2)}`,
    `A${rInner},${rInner} 0 ${large} 0 ${i2.x.toFixed(2)},${i2.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function donutSegments(
  data: { value: number; className: string; label: string }[],
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
) {
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0) || 1;
  let angle = 0;
  return data.map((d, i) => {
    const sweep = (Math.max(0, d.value) / total) * Math.PI * 2;
    const seg = {
      key: i,
      path: donutSegmentPath(cx, cy, rOuter, rInner, angle, angle + Math.max(sweep - 0.004, 0)),
      className: d.className,
      mid: angle + sweep / 2,
      value: d.value,
      label: d.label,
    };
    angle += sweep;
    return seg;
  });
}

export function DonutChartSvg({ chart }: { chart: ChartBlock }) {
  const cx = 260,
    cy = 180,
    rO = 110,
    rI = 60;
  const segs = donutSegments(
    chart.data.map((d, i) => ({
      value: d.value,
      className: `chart-series-${(i % 5) + 1}`,
      label: d.label,
    })),
    cx,
    cy,
    rO,
    rI,
  );
  const total = chart.data.reduce((s, d) => s + d.value, 0);
  return (
    <ChartFrame title={chart.title} source={chart.source}>
      {segs.map((s) => (
        <path key={s.key} d={s.path} className={s.className} />
      ))}
      {/* 数値ラベル（セグメント外側） */}
      {segs.map((s) => {
        const lx = cx + (rO + 22) * Math.sin(s.mid);
        const ly = cy - (rO + 22) * Math.cos(s.mid);
        return (
          <text key={`v${s.key}`} x={lx} y={ly + 4} className="chart-value" textAnchor="middle">
            {formatValue(s.value)}
            {chart.unit ?? ''}
          </text>
        );
      })}
      {/* 凡例（右側） */}
      {chart.data.map((d, i) => (
        <g key={`l${i}`}>
          <rect
            x={470}
            y={90 + i * 34}
            width={14}
            height={14}
            rx={3}
            className={`chart-series-${(i % 5) + 1}`}
          />
          <text x={492} y={102 + i * 34} className="chart-legend">
            {d.label}（{total ? Math.round((d.value / total) * 100) : 0}%）
          </text>
        </g>
      ))}
    </ChartFrame>
  );
}

// ---------------------------------------------------------------------------
// comparison-chart: Before(190,175) / After(530,175)、外径100・内径55
// 凡例テーブル y=300〜326、矢印 (300,175)→(410,175)
// ---------------------------------------------------------------------------

export function ComparisonDonutSvg({ chart }: { chart: ComparisonChartBlock }) {
  const cls = (c: string) => (c === 'neutral' ? 'chart-neutral' : `chart-series-${c}`);
  const before = donutSegments(
    chart.data.map((d) => ({ value: d.before, className: cls(d.class), label: d.label })),
    190,
    175,
    100,
    55,
  );
  const after = donutSegments(
    chart.data.map((d) => ({ value: d.after, className: cls(d.class), label: d.label })),
    530,
    175,
    100,
    55,
  );
  const legendCols = chart.data.slice(0, 4);
  return (
    <svg viewBox="0 0 720 360" xmlns="http://www.w3.org/2000/svg" className="chart-svg" role="img">
      <title>
        {chart.labels.before} / {chart.labels.after} 比較
      </title>
      <defs>
        <marker
          id="ba-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M0,0 L10,5 L0,10 z" className="chart-arrowhead" />
        </marker>
      </defs>
      <text x={190} y={30} className="chart-title" textAnchor="middle">
        {chart.labels.before}
      </text>
      <text x={530} y={30} className="chart-title" textAnchor="middle">
        {chart.labels.after}
      </text>
      {before.map((s) => (
        <path key={`b${s.key}`} d={s.path} className={s.className} />
      ))}
      {after.map((s) => (
        <path key={`a${s.key}`} d={s.path} className={s.className} />
      ))}
      <text x={190} y={170} className="chart-center-big" textAnchor="middle">
        {chart.center.before}
      </text>
      <text x={530} y={170} className="chart-center-big" textAnchor="middle">
        {chart.center.after}
      </text>
      <path d="M300,175 L410,175" className="chart-ba-arrow" markerEnd="url(#ba-arrow)" />
      {/* 凡例テーブル（2列 × 2行） */}
      {legendCols.map((d, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const bx = col === 0 ? 70 : 270;
        const y = 300 + row * 26;
        return (
          <g key={`lg${i}`}>
            <rect x={bx} y={y - 11} width={14} height={14} rx={3} className={cls(d.class)} />
            <text x={bx + 22} y={y} className="chart-legend">
              {d.label}: {formatValue(d.before)} → {formatValue(d.after)}
            </text>
          </g>
        );
      })}
      <text x={710} y={352} className="chart-source" textAnchor="end">
        出典: {chart.source.name}
      </text>
    </svg>
  );
}

export function formatValue(v: number): string {
  if (Math.abs(v) >= 100000000)
    return `${(v / 100000000).toLocaleString('ja-JP', { maximumFractionDigits: 1 })}億`;
  if (Math.abs(v) >= 10000)
    return `${(v / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 1 })}万`;
  return v.toLocaleString('ja-JP');
}
