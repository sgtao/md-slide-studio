/**
 * geometry/chart.ts — chart描画の座標計算・数値整形の純関数（DOM非依存）。
 * Charts.tsx（app側のJSX組み立て）から座標ロジックのみを切り出したもの。
 * v0.6のCLI/PPTX等、React非依存の環境でも同じ座標計算を使えるようにするための土台。
 */

/**
 * ドーナツ/円弧のSVGパス文字列を生成する。
 * 12時方向起点・時計回り。角度はラジアン（0 = 12時）。
 */
export function donutSegmentPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
): string {
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

/** 数値を日本語ロケールで整形（1万/1億で単位付与）。 */
export function formatValue(v: number): string {
  if (Math.abs(v) >= 100000000)
    return `${(v / 100000000).toLocaleString('ja-JP', { maximumFractionDigits: 1 })}億`;
  if (Math.abs(v) >= 10000)
    return `${(v / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 1 })}万`;
  return v.toLocaleString('ja-JP');
}
