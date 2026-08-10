/**
 * スライドMD（markdown-format.md v0.7.0 + Studio拡張 v0.2.3）のAST型定義。
 * MD が Single Source of Truth。HTML(React) はこのASTから毎回フル再生成する。
 *
 * v0.2.0: badge/lead/point（共通ヘッダ）・tone・StepsSlide
 * v0.2.1: diagram-timeline・ChartSlide.sidePanel・layout: side-list
 * v0.2.3: ContrastSlide（新type）
 * v0.2.3: TitleSlide.image（layout: split-image）・ContrastSlide（新type）
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
  | 'diagram-timeline'
  | 'figure'
  | 'feature-showcase'
  | 'steps'
  | 'contrast'
  | 'sources'
  | 'svg-figure';

export type LayoutVariant =
  'two-col' | 'title-xl' | 'compact' | 'side-list' | 'split-image' | 'reverse' | 'grid';

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
  lead?: InlineText;
  text: InlineText;
  children: PointItem[];
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
  class: string;
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

/** timeline 型（v0.2.1）: 水平軸＋Start円＋上下交互マイルストーン */
export interface TimelineBlock {
  type: 'timeline';
  start: string;
  milestones: { label: string; when: string }[];
}

/** journey 型（v0.4.6）: mermaid journey 記法から生成する感情推移グラフ */
export interface JourneyTask {
  label: string;
  score: number;
  actors: string[];
}

export interface JourneySection {
  name: string;
  tasks: JourneyTask[];
}

export interface JourneyBlock {
  type: 'journey';
  title?: string;
  sections: JourneySection[];
}

/** gantt 型（v0.4.7）: mermaid gantt 記法から生成する簡易ガントチャート */
export interface GanttTask {
  label: string;
  id?: string;
  tags: string[];
  start?: string;
  duration?: string;
}

export interface GanttSection {
  name: string;
  tasks: GanttTask[];
}

export interface GanttBlock {
  type: 'gantt';
  title?: string;
  dateFormat?: string;
  sections: GanttSection[];
}

export type SvgFigureBlock = JourneyBlock | GanttBlock | RawSvgBlock;

/** raw 型（v0.4.8）: ```svg フェンスに直接貼り付けた任意SVGを許可リスト経由で保持するツリー */
export interface SvgElementNode {
  tag: string;
  attrs: Record<string, string>;
  children: (SvgElementNode | { text: string })[];
}

export interface RawSvgBlock {
  type: 'raw';
  root: SvgElementNode;
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
  icon?: string;
  title: InlineText;
  desc?: InlineText;
  tone?: 'dark' | 'outline';
}

export interface StepRatioItem {
  label: string;
  value: number;
}

/** chart のサイドパネル（v0.2.1: layout: side-list） */
export interface ChartSidePanel {
  heading: string;
  items: PointItem[];
}

interface SlideBase {
  type: SlideType;
  fit: boolean;
  layout?: LayoutVariant;
  warnings: string[];

  // v0.2.0 共通ヘッダ拡張
  badge?: string;
  lead?: InlineText;
  point?: InlineText;
  tone?: SlideTone;
}

export interface TitleSlide extends SlideBase {
  type: 'title';
  heading: InlineText;
  subtitle?: InlineText;
  badges: string[];
  /** split-image レイアウト時の画像URL（v0.2.3） */
  image?: string;
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
  /** v0.2.1: layout: side-list 時の右パネル */
  sidePanel?: ChartSidePanel;
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

export interface TimelineSlide extends SlideBase {
  type: 'diagram-timeline';
  heading?: InlineText;
  timeline?: TimelineBlock;
  note?: InlineText;
  sourceText?: string;
}

export interface FigureSlide extends SlideBase {
  type: 'figure';
  heading?: InlineText;
  alt: string;
  url: string;
  source?: SourceLink;
  // layout: split-image 時のみ有効
  imageSide?: 'left' | 'right';
  items?: PointItem[];
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
  ratio?: StepRatioItem[];
  note?: InlineText;
}

/** contrast（v0.2.3）: 例示 vs 結論の対比構図 */
export interface ContrastExampleRow {
  tag: string;
  text: InlineText;
}

export interface ContrastExample {
  title?: InlineText;
  rows: ContrastExampleRow[];
}

export interface ContrastVerdictItem {
  /** label/text 行、または connector 行のどちらか */
  label?: string;
  text?: InlineText;
  connector?: InlineText;
  tone?: 'warn';
}

export interface ContrastSlide extends SlideBase {
  type: 'contrast';
  heading?: InlineText;
  example?: ContrastExample;
  verdict: ContrastVerdictItem[];
}

export interface SourcesSlide extends SlideBase {
  type: 'sources';
  heading?: InlineText;
  links: SourceLink[];
}

/** svg-figure（v0.4.6）: mermaid journey/gantt 記法を独自SVGで描画する専用type */
export interface SvgFigureSlide extends SlideBase {
  type: 'svg-figure';
  heading?: InlineText;
  figure?: SvgFigureBlock;
  notes?: string[];
  note?: InlineText;
}

export type Slide =
  | TitleSlide
  | PointsSlide
  | SummarySlide
  | TableSlide
  | ChartSlide
  | ComparisonChartSlide
  | DiagramSlide
  | TimelineSlide
  | FigureSlide
  | FeatureShowcaseSlide
  | StepsSlide
  | ContrastSlide
  | SourcesSlide
  | SvgFigureSlide;

export interface SlideDeck {
  frontmatter: Frontmatter;
  slides: Slide[];
  warnings: string[];
}
