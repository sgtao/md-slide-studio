/**
 * スライドMD（markdown-format.md v0.7.0）のAST型定義。
 * MD が Single Source of Truth。HTML(React) はこのASTから毎回フル再生成する。
 */

export type Palette = 'ocean' | 'forest' | 'sunset' | 'plum' | 'graphite';
export type Purpose = 'self-study' | 'team-share' | 'outreach';

export type SlideType =
  | 'title'
  | 'points'
  | 'summary'
  | 'table'
  | 'chart-bar'
  | 'chart-line'
  | 'chart-donut'
  | 'comparison-chart'
  | 'diagram-flow'
  | 'diagram-layer'
  | 'diagram-cycle'
  | 'figure'
  | 'feature-showcase'
  | 'sources';

export type LayoutVariant = 'two-col' | 'title-xl' | 'compact';

export interface Frontmatter {
  title: string;
  palette: Palette;
  purpose?: Purpose;
}

/** インライン装飾（==hl== / **bold** / `code` / [link](url)）は描画時に解決する生テキスト */
export type InlineText = string;

export interface PointItem {
  lead?: InlineText; // `**リード**：説明` のリード部
  text: InlineText; // 説明本文（リードなしの場合は全文）
  children: PointItem[]; // ネスト（2段まで）
}

export interface ChartDataItem {
  label: string;
  value: number;
}

export interface ChartSource {
  name: string;
  url?: string;
}

export interface ChartBlock {
  type: 'bar' | 'line' | 'donut';
  title: string;
  unit?: string;
  data: ChartDataItem[];
  source: ChartSource;
}

export interface ComparisonChartItem {
  label: string;
  before: number;
  after: number;
  class: string; // '1'〜'5' | 'neutral'
}

export interface ComparisonChartBlock {
  type: 'comparison-donut';
  labels: { before: string; after: string };
  center: { before: string; after: string };
  data: ComparisonChartItem[];
  source: ChartSource;
}

export interface DiagramBlock {
  type: 'flow' | 'layer' | 'cycle';
  nodes: string[];
  labels?: string[];
  /** layer 型のみ: 層ごとの箱ラベル（外側=層、内側=箱） */
  layers?: string[][];
}

export interface FeatureShowcaseLeft {
  eyebrow?: string;
  heading: InlineText;
  lead?: InlineText;
}

export interface FeatureShowcaseRightItem {
  label: string;
  desc: string;
}

export interface FeatureShowcaseRight {
  num?: string;
  eyebrow?: string;
  heading: string;
  sub?: string;
  items: FeatureShowcaseRightItem[];
}

export interface ComparisonLeft {
  big?: string;
  bigUnit?: string;
  heading?: InlineText;
  lead?: InlineText;
  stats: { num: string; label: string }[];
}

export interface SourceLink {
  label: string;
  url: string;
  note?: string;
}

interface SlideBase {
  type: SlideType;
  fit: boolean;
  layout?: LayoutVariant;
  /** パース時の警告（未知type・不正ブロック等）。UIに表示する */
  warnings: string[];
}

export interface TitleSlide extends SlideBase {
  type: 'title';
  heading: InlineText;
  subtitle?: InlineText;
  badges: string[];
}

export interface PointsSlide extends SlideBase {
  type: 'points';
  heading?: InlineText;
  items: PointItem[];
  note?: InlineText;
}

export interface SummarySlide extends SlideBase {
  type: 'summary';
  heading?: InlineText;
  items: PointItem[];
  note?: InlineText;
}

export interface TableSlide extends SlideBase {
  type: 'table';
  heading?: InlineText;
  header: InlineText[];
  rows: InlineText[][];
  note?: InlineText;
}

export interface ChartSlide extends SlideBase {
  type: 'chart-bar' | 'chart-line' | 'chart-donut';
  heading?: InlineText;
  chart?: ChartBlock;
  note?: InlineText;
}

export interface ComparisonChartSlide extends SlideBase {
  type: 'comparison-chart';
  left: ComparisonLeft;
  chart?: ComparisonChartBlock;
}

export interface DiagramSlide extends SlideBase {
  type: 'diagram-flow' | 'diagram-layer' | 'diagram-cycle';
  heading?: InlineText;
  diagram?: DiagramBlock;
  note?: InlineText;
  sourceText?: string;
}

export interface FigureSlide extends SlideBase {
  type: 'figure';
  heading?: InlineText;
  alt: string;
  url: string;
  source?: SourceLink;
}

export interface FeatureShowcaseSlide extends SlideBase {
  type: 'feature-showcase';
  left: FeatureShowcaseLeft;
  right: FeatureShowcaseRight;
}

export interface SourcesSlide extends SlideBase {
  type: 'sources';
  heading?: InlineText;
  links: SourceLink[];
}

export type Slide =
  | TitleSlide
  | PointsSlide
  | SummarySlide
  | TableSlide
  | ChartSlide
  | ComparisonChartSlide
  | DiagramSlide
  | FigureSlide
  | FeatureShowcaseSlide
  | SourcesSlide;

export interface SlideDeck {
  frontmatter: Frontmatter;
  slides: Slide[];
  /** デッキ全体の警告（frontmatter欠落・枚数超過等） */
  warnings: string[];
}
