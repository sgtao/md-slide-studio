/**
 * スライドMD（markdown-format.md v0.7.0 + Studio拡張 v0.2.0）のAST型定義。
 * MD が Single Source of Truth。HTML(React) はこのASTから毎回フル再生成する。
 *
 * v0.2.0 拡張（docs/references/markdown-format-ext.md）:
 * - SlideBase に badge / lead / point（全type共通ヘッダ）と tone（スライド単位ダーク）
 * - StepsSlide（カード型ステップフロー）を追加
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
  | 'steps'
  | 'sources';

export type LayoutVariant = 'two-col' | 'title-xl' | 'compact';

/** スライド単位の地色反転（v0.2.0）。未知値はディレクティブ解析時に無視される */
export type SlideTone = 'dark';

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

/** steps（v0.2.0）: カード型ステップフロー */
export type StepStyle = 'cards' | 'circled';

export interface StepItem {
  /** 絵文字1文字を想定（任意） */
  icon?: string;
  title: InlineText;
  desc?: InlineText;
  /** カード単位の見た目変種（任意）: dark=反転面 / outline=枠線強調 */
  tone?: 'dark' | 'outline';
}

export interface StepRatioItem {
  label: string;
  value: number;
}

interface SlideBase {
  type: SlideType;
  fit: boolean;
  layout?: LayoutVariant;
  /** パース時の警告（未知type・不正ブロック等）。UIに表示する */
  warnings: string[];

  // ─── v0.2.0 共通ヘッダ拡張（markdown-format-ext.md §1） ───
  /** 見出し左のピル（例: Step 1 / WHY） */
  badge?: string;
  /** 見出し直下の補足1行 */
  lead?: InlineText;
  /** スライド下部の強調帯（💡付き） */
  point?: InlineText;
  /** スライド単位の地色反転（ディレクティブ `tone: dark`） */
  tone?: SlideTone;
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

export interface StepsSlide extends SlideBase {
  type: 'steps';
  heading?: InlineText;
  stepStyle: StepStyle;
  items: StepItem[];
  /** 任意: セグメント比率帯（値合計で正規化して描画） */
  ratio?: StepRatioItem[];
  note?: InlineText;
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
  | StepsSlide
  | SourcesSlide;

export interface SlideDeck {
  frontmatter: Frontmatter;
  slides: Slide[];
  /** デッキ全体の警告（frontmatter欠落・枚数超過等） */
  warnings: string[];
}
