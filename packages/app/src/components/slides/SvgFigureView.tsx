/**
 * SvgFigureView.tsx — svg-figure type（v0.4.6〜）の描画。
 *
 * mermaid journey / gantt 記法から生成された JourneyBlock / GanttBlock を、
 * 外部レンダリングエンジンなしで独自SVGとして描画する。座標計算は決定論的。
 * 色は theme-vars.css の CSS変数（--chart-* 等）経由のみ（ハードコード禁止規約に準拠）。
 */
import { createElement, Fragment, type ReactNode } from 'react';
import type {
  GanttBlock,
  GanttTask,
  JourneyBlock,
  SvgElementNode,
  SvgFigureSlide,
} from '@mdss/core';
import { parseDuration } from '@mdss/core';
import { renderInline } from '../../parser/inline';
import { Note, SlideHeading } from './common';

// ─── journey 座標定数 ───
const J_TASK_GAP = 130;
const J_MARGIN_X = 60;
const J_SCORE_Y: Record<number, number> = { 5: 40, 4: 80, 3: 120, 2: 160, 1: 200 };
const J_LABEL_Y = 250;
const J_SECTION_LABEL_Y = 288;
// スコア(1〜5) → chart-series-N（5=系列2, 4=系列1(accent), 3=系列3, 2=系列4, 1=系列5）
const J_SCORE_SERIES: Record<number, number> = { 5: 2, 4: 1, 3: 3, 2: 4, 1: 5 };

/** SVG <text> は自動折返ししないため、長いラベルは手動2行分割する。 */
function SvgLabel({
  x,
  y,
  text,
  className,
}: {
  x: number;
  y: number;
  text: string;
  className: string;
}) {
  if (text.length <= 8) {
    return (
      <text className={className} x={x} y={y} textAnchor="middle">
        {text}
      </text>
    );
  }
  const mid = Math.ceil(text.length / 2);
  return (
    <text className={className} x={x} y={y} textAnchor="middle">
      <tspan x={x} dy="-0.5em">
        {text.slice(0, mid)}
      </tspan>
      <tspan x={x} dy="1.1em">
        {text.slice(mid)}
      </tspan>
    </text>
  );
}

function JourneySvg({ journey, slideIndex }: { journey: JourneyBlock; slideIndex: number }) {
  const flat = journey.sections.flatMap((sec) => sec.tasks.map((task) => ({ sec, task })));
  const n = flat.length;
  const width = J_MARGIN_X * 2 + Math.max(n - 1, 0) * J_TASK_GAP;
  const height = 320;
  const points = flat
    .map((f, i) => `${J_MARGIN_X + i * J_TASK_GAP},${J_SCORE_Y[f.task.score]}`)
    .join(' ');

  // セクション背景帯の範囲（開始x・幅）を、フラット化したタスク列上で算出する
  const bands: { x: number; w: number; label: string; even: boolean }[] = [];
  let cursor = 0;
  journey.sections.forEach((sec, si) => {
    const count = sec.tasks.length;
    if (count === 0) return;
    const x = J_MARGIN_X + cursor * J_TASK_GAP - J_TASK_GAP / 2;
    const w = count * J_TASK_GAP;
    bands.push({ x, w, label: sec.name, even: si % 2 === 0 });
    cursor += count;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      className="svg-figure-svg"
      id={`svg-figure-svg-s${slideIndex}`}
      role="img"
    >
      <title>{journey.title ?? 'ジャーニーマップ'}</title>
      {bands.map((b, i) => (
        <rect
          key={`band${i}`}
          className={`svg-journey-band${b.even ? '' : ' svg-journey-band--alt'}`}
          x={b.x}
          y={20}
          width={b.w}
          height={210}
        />
      ))}
      {bands.map((b, i) => (
        <text
          key={`bl${i}`}
          className="svg-journey-section-label"
          x={b.x + b.w / 2}
          y={J_SECTION_LABEL_Y}
          textAnchor="middle"
        >
          {b.label || '　'}
        </text>
      ))}
      <polyline className="svg-journey-line" points={points} />
      {flat.map((f, i) => {
        const x = J_MARGIN_X + i * J_TASK_GAP;
        const y = J_SCORE_Y[f.task.score];
        return (
          <Fragment key={i}>
            <circle
              className={`svg-journey-dot chart-series-${J_SCORE_SERIES[f.task.score]}`}
              cx={x}
              cy={y}
              r={6}
            />
            <SvgLabel x={x} y={J_LABEL_Y} text={f.task.label} className="svg-journey-task-label" />
          </Fragment>
        );
      })}
    </svg>
  );
}

// ─── gantt 座標定数 ───
const G_ROW_H = 36;
const G_BAR_H = 20;
const G_LABEL_COL = 160;
const G_DAY_PX = 26;
const G_MARGIN_X = 16;
const G_MARGIN_TOP = 30;
const G_SECTION_ROW_H = 26;

interface GanttRow {
  sectionName: string;
  sectionIndex: number;
  isSectionHeader: boolean;
  task?: GanttTask;
  startDay: number;
  durationDays: number;
}

/**
 * gantt の行レイアウトを計算する。
 * 日付の厳密な計算はせず、相対的な長さ・位置で表現する（`after <id>` は id 参照で解決、
 * それ以外は上から順にカーソルを進める簡略化）。
 */
function computeGanttRows(gantt: GanttBlock): GanttRow[] {
  const rows: GanttRow[] = [];
  const idIndex = new Map<string, { startDay: number; durationDays: number }>();
  let cursor = 0;
  let epochBase: number | null = null;

  gantt.sections.forEach((sec, sectionIndex) => {
    if (sec.tasks.length === 0) return;
    rows.push({
      sectionName: sec.name,
      sectionIndex,
      isSectionHeader: true,
      startDay: 0,
      durationDays: 0,
    });
    for (const task of sec.tasks) {
      const durationDays = task.tags.includes('milestone')
        ? 0
        : parseDuration(task.duration ?? '1d');
      let startDay = cursor;
      const afterMatch = task.start?.match(/^after\s+(\S+)$/);
      if (afterMatch) {
        const ref = idIndex.get(afterMatch[1]);
        if (ref) startDay = ref.startDay + ref.durationDays;
      } else if (task.start && /^\d{4}-\d{2}-\d{2}$/.test(task.start)) {
        const epoch = Date.parse(task.start) / 86400000;
        if (epochBase === null) epochBase = epoch;
        startDay = Math.max(0, epoch - epochBase);
      }
      rows.push({
        sectionName: sec.name,
        sectionIndex,
        isSectionHeader: false,
        task,
        startDay,
        durationDays,
      });
      if (task.id) idIndex.set(task.id, { startDay, durationDays });
      cursor = Math.max(cursor, startDay + Math.max(durationDays, 1));
    }
  });
  return rows;
}

function GanttSvg({ gantt, slideIndex }: { gantt: GanttBlock; slideIndex: number }) {
  const rows = computeGanttRows(gantt);
  const maxDay = rows.reduce((m, r) => Math.max(m, r.startDay + r.durationDays), 1);
  const width = G_LABEL_COL + G_MARGIN_X * 2 + maxDay * G_DAY_PX;
  const height = G_MARGIN_TOP + rows.length * G_ROW_H + 20;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      className="svg-figure-svg"
      id={`svg-figure-svg-s${slideIndex}`}
      role="img"
    >
      <title>{gantt.title ?? 'ガントチャート'}</title>
      {rows.map((row, i) => {
        const y = G_MARGIN_TOP + i * G_ROW_H;
        if (row.isSectionHeader) {
          return (
            <text key={i} className="svg-gantt-section-label" x={6} y={y + G_SECTION_ROW_H / 2}>
              {row.sectionName || '　'}
            </text>
          );
        }
        const t = row.task!;
        const barX = G_LABEL_COL + G_MARGIN_X + row.startDay * G_DAY_PX;
        const isMilestone = t.tags.includes('milestone');
        const barW = Math.max(row.durationDays * G_DAY_PX, isMilestone ? 0 : 8);
        const seriesClass = `chart-series-${(row.sectionIndex % 5) + 1}`;
        const barClasses = ['svg-gantt-bar', seriesClass];
        if (t.tags.includes('done')) barClasses.push('svg-gantt-bar--done');
        if (t.tags.includes('active')) barClasses.push('svg-gantt-bar--active');
        if (t.tags.includes('crit')) barClasses.push('svg-gantt-bar--crit');
        return (
          <Fragment key={i}>
            <text className="svg-gantt-row-label" x={6} y={y + G_BAR_H / 2 + 4}>
              {t.label}
            </text>
            {isMilestone ? (
              <rect
                className={`svg-gantt-milestone ${seriesClass}`}
                x={barX - 7}
                y={y - 1}
                width={14}
                height={14}
                transform={`rotate(45 ${barX} ${y + 6})`}
              />
            ) : (
              <rect
                className={barClasses.join(' ')}
                x={barX}
                y={y}
                width={barW}
                height={G_BAR_H}
                rx={4}
              />
            )}
          </Fragment>
        );
      })}
    </svg>
  );
}

// ─── raw（v0.4.8）: ```svg フェンスに貼り付けた任意SVGの描画 ───
// dangerouslySetInnerHTML は使わず、サニタイズ済みツリーからReact要素を再構築する。
const SVG_ATTR_TO_PROP: Record<string, string> = {
  'stroke-width': 'strokeWidth',
  'stroke-dasharray': 'strokeDasharray',
  'font-size': 'fontSize',
  'text-anchor': 'textAnchor',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  class: 'className',
};

function renderSvgNode(node: SvgElementNode | { text: string }, key: number): ReactNode {
  if ('text' in node) return node.text;
  const props: Record<string, string> = { key: String(key) };
  for (const [k, v] of Object.entries(node.attrs)) {
    props[SVG_ATTR_TO_PROP[k] ?? k] = v;
  }
  return createElement(
    node.tag,
    props,
    node.children.map((c, i) => renderSvgNode(c, i)),
  );
}

function RawSvgFigure({ root, slideIndex }: { root: SvgElementNode; slideIndex: number }) {
  const { viewBox } = root.attrs; // width/height属性は使わない（CSSでスケール）
  return (
    <svg
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      className="svg-figure-svg"
      id={`svg-figure-svg-s${slideIndex}`}
      role="img"
    >
      {root.children.map((c, i) => renderSvgNode(c, i))}
    </svg>
  );
}

export function SvgFigureView({ slide, index }: { slide: SvgFigureSlide; index: number }) {
  const fig = slide.figure;
  const hasNotes = !!slide.notes && slide.notes.length > 0;

  return (
    <div className="slide-inner">
      <SlideHeading text={slide.heading} badge={slide.badge} lead={slide.lead} />
      <div className={`svg-figure-body${hasNotes ? ' with-notes' : ''}`}>
        <div className="svg-figure-diagram">
          {fig?.type === 'journey' && <JourneySvg journey={fig} slideIndex={index} />}
          {fig?.type === 'gantt' && <GanttSvg gantt={fig} slideIndex={index} />}
          {fig?.type === 'raw' && <RawSvgFigure root={fig.root} slideIndex={index} />}
          {!fig && (
            <p className="note">
              （```svg / ```mermaid ブロックを解析できませんでした。有効なSVG、または journey /
              gantt 記法が必要です）
            </p>
          )}
        </div>
        {hasNotes && (
          <div className="svg-figure-notes">
            <ul className="points">
              {slide.notes!.map((n, i) => (
                <li key={i}>{renderInline(n)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <Note text={slide.note} />
    </div>
  );
}
