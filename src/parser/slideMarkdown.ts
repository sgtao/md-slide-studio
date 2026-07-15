/**
 * slideMarkdown.ts — スライドMD（markdown-format.md v0.7.0 準拠 + Studio拡張 v0.2.3）のパーサー。
 *
 * 仕様の要点:
 * - 先頭に YAML frontmatter、以降は行全体が `---` の行でスライド区切り
 *   （frontmatter 内・コードフェンス内の `---` は区切りとみなさない）
 * - 各スライド先頭行は `<!-- slide: <type>[, fit][, layout: x][, tone: dark] -->`
 * - chart / diagram / mermaid（サブセット）/ steps フェンスブロックを構造化
 * - 全typeで共通ヘッダキー（badge / lead / point）を受け付ける（slideHeader.ts）
 * - MD 内の生 <script> / <style> は無視（禁止事項）
 */
import YAML from 'yaml';
import { parseSlideHeader } from './slideHeader';
import type {
  ChartBlock,
  ChartSidePanel,
  ComparisonChartBlock,
  ComparisonLeft,
  DiagramBlock,
  FeatureShowcaseLeft,
  FeatureShowcaseRight,
  Frontmatter,
  LayoutVariant,
  Palette,
  PointItem,
  Slide,
  SlideDeck,
  SlideTone,
  SlideType,
  SourceLink,
  StepItem,
  StepRatioItem,
  StepStyle,
  TimelineBlock,
} from './types';

const PALETTES: Palette[] = ['ocean', 'forest', 'sunset', 'plum', 'graphite'];
const SLIDE_TYPES: SlideType[] = [
  'title',
  'points',
  'summary',
  'table',
  'chart-bar',
  'chart-line',
  'chart-donut',
  'comparison-chart',
  'diagram-flow',
  'diagram-layer',
  'diagram-cycle',
  'diagram-timeline',
  'figure',
  'feature-showcase',
  'steps',
  'sources',
];
const LAYOUTS: LayoutVariant[] = ['two-col', 'title-xl', 'compact', 'side-list', 'split-image'];

// ---------------------------------------------------------------------------
// エントリポイント
// ---------------------------------------------------------------------------

export function parseSlideMarkdown(src: string): SlideDeck {
  const deckWarnings: string[] = [];
  const { frontmatter, body } = splitFrontmatter(src, deckWarnings);
  const rawSlides = splitSlides(body);
  const slides = rawSlides.map((raw) => parseSlide(raw)).filter((s): s is Slide => s !== null);

  if (slides.length === 0) {
    deckWarnings.push(
      'スライドが1枚もありません（<!-- slide: type --> ディレクティブを確認してください）',
    );
  }
  if (slides.length > 12) {
    deckWarnings.push(`スライド枚数が ${slides.length} 枚です（推奨は3〜12枚）`);
  }
  if (slides.length > 0 && slides[slides.length - 1].type !== 'sources') {
    deckWarnings.push('最終スライドが sources（出典）ではありません（推奨: sources で終える）');
  }

  return { frontmatter, slides, warnings: deckWarnings };
}

// ---------------------------------------------------------------------------
// frontmatter
// ---------------------------------------------------------------------------

function splitFrontmatter(
  src: string,
  warnings: string[],
): { frontmatter: Frontmatter; body: string } {
  const fallback: Frontmatter = { title: 'Untitled', palette: 'ocean' };
  const m = src.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) {
    warnings.push('frontmatter（--- title: ... ---）が見つかりません');
    return { frontmatter: fallback, body: src };
  }
  let fm: Record<string, unknown> = {};
  try {
    fm = (YAML.parse(m[1]) as Record<string, unknown>) ?? {};
  } catch {
    warnings.push('frontmatter の YAML 解析に失敗しました');
  }
  const title = typeof fm.title === 'string' && fm.title.trim() ? fm.title.trim() : fallback.title;
  if (title === 'Untitled') warnings.push('frontmatter に title がありません');

  let palette: Palette = 'ocean';
  if (typeof fm.palette === 'string') {
    if ((PALETTES as string[]).includes(fm.palette)) palette = fm.palette as Palette;
    else warnings.push(`palette "${fm.palette}" は不正値のため ocean として扱います`);
  }
  const purpose =
    fm.purpose === 'self-study' || fm.purpose === 'team-share' || fm.purpose === 'outreach'
      ? fm.purpose
      : undefined;

  return { frontmatter: { title, palette, purpose }, body: src.slice(m[0].length) };
}

// ---------------------------------------------------------------------------
// スライド区切り（コードフェンス内の --- は無視）
// ---------------------------------------------------------------------------

function splitSlides(body: string): string[] {
  const lines = body.split(/\r?\n/);
  const chunks: string[][] = [[]];
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (!inFence && /^---\s*$/.test(line)) {
      chunks.push([]);
      continue;
    }
    chunks[chunks.length - 1].push(line);
  }
  return chunks.map((c) => c.join('\n').trim()).filter((c) => c.length > 0);
}

// ---------------------------------------------------------------------------
// ディレクティブ
// ---------------------------------------------------------------------------

interface Directive {
  type: SlideType;
  fit: boolean;
  layout?: LayoutVariant;
  tone?: SlideTone;
  warnings: string[];
}

export function parseDirective(line: string): Directive | null {
  const m = line.match(/^<!--\s*slide:\s*([^>]*?)\s*-->/);
  if (!m) return null;
  const warnings: string[] = [];
  const parts = m[1]
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const typeStr = parts.shift() ?? '';
  let type: SlideType = 'points';
  if ((SLIDE_TYPES as string[]).includes(typeStr)) {
    type = typeStr as SlideType;
  } else {
    warnings.push(`未知の type "${typeStr}" は points として描画します`);
  }
  let fit = false;
  let layout: LayoutVariant | undefined;
  let tone: SlideTone | undefined;
  for (const p of parts) {
    if (p === 'fit') {
      fit = true;
      continue;
    }
    const lm = p.match(/^layout:\s*(\S+)$/);
    if (lm) {
      if ((LAYOUTS as string[]).includes(lm[1])) layout = lm[1] as LayoutVariant;
      // 未知の layout 値は無視して既定レイアウト（仕様どおりエラーにしない）
      continue;
    }
    const tm = p.match(/^tone:\s*(\S+)$/);
    if (tm) {
      if (tm[1] === 'dark') tone = 'dark';
      // 未知の tone 値は無視して既定表示（layout: と同じ前方互換方針）
      continue;
    }
    // その他の未知キーも無視（前方互換）
  }
  return { type, fit, layout, tone, warnings };
}

// ---------------------------------------------------------------------------
// スライド本体
// ---------------------------------------------------------------------------

function parseSlide(raw: string): Slide | null {
  const lines = raw.split('\n');
  // 先頭の空行を飛ばしてディレクティブを探す
  let idx = 0;
  while (idx < lines.length && lines[idx].trim() === '') idx++;
  const directive = parseDirective(lines[idx] ?? '');
  const bodyLines = directive ? lines.slice(idx + 1) : lines;
  const d: Directive = directive ?? {
    type: 'points',
    fit: false,
    warnings: ['スライドディレクティブがありません（points として描画します）'],
  };
  const stripped = stripRawHtml(bodyLines.join('\n'), d.warnings);
  // v0.2.0: 共通ヘッダ（badge / lead / point）を先に取り出し、残りを本文として解析する
  const { header, rest: body } = parseSlideHeader(stripped);

  const base = { fit: d.fit, layout: d.layout, tone: d.tone, warnings: d.warnings, ...header };

  switch (d.type) {
    case 'title':
      return { ...base, type: 'title', ...parseTitle(body) };
    case 'points':
      return { ...base, type: 'points', ...parseListBody(body, 'bullet') };
    case 'summary':
      return { ...base, type: 'summary', ...parseListBody(body, 'ordered') };
    case 'table':
      return { ...base, type: 'table', ...parseTable(body, d.warnings) };
    case 'chart-bar':
    case 'chart-line':
    case 'chart-donut':
      return { ...base, type: d.type, ...parseChartSlide(body, d.type, d.warnings) };
    case 'comparison-chart':
      return { ...base, type: 'comparison-chart', ...parseComparisonChart(body, d.warnings) };
    case 'diagram-flow':
    case 'diagram-layer':
    case 'diagram-cycle':
      return { ...base, type: d.type, ...parseDiagramSlide(body, d.type, d.warnings) };
    case 'diagram-timeline':
      return { ...base, type: 'diagram-timeline', ...parseTimelineSlide(body, d.warnings) };
    case 'figure':
      return { ...base, type: 'figure', ...parseFigure(body, d.warnings) };
    case 'feature-showcase':
      return { ...base, type: 'feature-showcase', ...parseFeatureShowcase(body, d.warnings) };
    case 'steps':
      return { ...base, type: 'steps', ...parseStepsSlide(body, d.warnings) };
    case 'sources':
      return { ...base, type: 'sources', ...parseSources(body) };
  }
}

/** MD 内の生 <script>/<style> は禁止 → 無視して警告 */
function stripRawHtml(body: string, warnings: string[]): string {
  if (/<(script|style)[\s>]/i.test(body)) {
    warnings.push('MD 内の <script>/<style> は無視されます（仕様上の禁止事項）');
    return body.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  }
  return body;
}

// --- title ---

function parseTitle(body: string) {
  const lines = body.split('\n');
  let heading = '';
  let subtitle: string | undefined;
  let badges: string[] = [];
  let image: string | undefined;
  for (const line of lines) {
    const h = line.match(/^#\s+(.+)$/);
    if (h) {
      heading = h[1].trim();
      continue;
    }
    const s = line.match(/^subtitle:\s*(.+)$/);
    if (s) {
      subtitle = s[1].trim();
      continue;
    }
    const b = line.match(/^badges:\s*\[(.*)\]\s*$/);
    if (b) {
      badges = b[1]
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      continue;
    }
    // v0.2.3: split-image レイアウト用の画像URL
    const im = line.match(/^image:\s*(.+)$/);
    if (im) {
      image = im[1].trim();
      continue;
    }
  }
  return { heading, subtitle, badges, image };
}

// --- points / summary ---

function parseListBody(body: string, kind: 'bullet' | 'ordered') {
  const lines = body.split('\n');
  let heading: string | undefined;
  const items: PointItem[] = [];
  const noteLines: string[] = [];
  const re = kind === 'bullet' ? /^(\s*)-\s+(.+)$/ : /^(\s*)(?:\d+[.)]|-)\s+(.+)$/;

  for (const line of lines) {
    const h = line.match(/^##\s+(.+)$/);
    if (h) {
      heading = h[1].trim();
      continue;
    }
    const q = line.match(/^>\s?(.*)$/);
    if (q) {
      noteLines.push(q[1]);
      continue;
    }
    const m = line.match(re);
    if (m) {
      const depth = Math.floor(m[1].replace(/\t/g, '  ').length / 2);
      const item = parsePointItem(m[2]);
      if (depth === 0 || items.length === 0) items.push(item);
      else {
        // ネストは2段まで。それより深いものは2段目として扱う
        const parent = items[items.length - 1];
        parent.children.push(item);
      }
    }
  }
  const note = noteLines.length ? noteLines.join(' ').trim() : undefined;
  return { heading, items, note };
}

function parsePointItem(text: string): PointItem {
  // `**リード**：説明` / `**リード**: 説明` 形式
  const m = text.match(/^\*\*(.+?)\*\*\s*[：:]\s*(.*)$/);
  if (m) return { lead: m[1].trim(), text: m[2].trim(), children: [] };
  return { text: text.trim(), children: [] };
}

// --- table ---

function parseTable(body: string, warnings: string[]) {
  const lines = body.split('\n');
  let heading: string | undefined;
  const tableLines: string[] = [];
  const noteLines: string[] = [];
  for (const line of lines) {
    const h = line.match(/^##\s+(.+)$/);
    if (h) {
      heading = h[1].trim();
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      tableLines.push(line.trim());
      continue;
    }
    const q = line.match(/^>\s?(.*)$/);
    if (q) noteLines.push(q[1]);
  }
  let header: string[] = [];
  let rows: string[][] = [];
  if (tableLines.length >= 2 && /^\|[\s:|-]+\|$/.test(tableLines[1])) {
    header = splitTableRow(tableLines[0]);
    rows = tableLines.slice(2).map(splitTableRow);
  } else if (tableLines.length > 0) {
    warnings.push('Markdown テーブルの区切り行（|---|）が見つかりません');
    rows = tableLines.map(splitTableRow);
  }
  if (header.length > 5) warnings.push(`テーブルが ${header.length} 列あります（推奨は5列以下）`);
  const note = noteLines.length ? noteLines.join(' ').trim() : undefined;
  return { heading, header, rows, note };
}

function splitTableRow(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

// --- フェンスブロック抽出 ---

function extractFence(body: string, lang: string): { content: string; rest: string } | null {
  const re = new RegExp('```' + lang + '\\s*\\n([\\s\\S]*?)\\n```', 'm');
  const m = body.match(re);
  if (!m) return null;
  return { content: m[1], rest: body.replace(m[0], '') };
}

function parseYamlBlock(content: string, warnings: string[]): Record<string, unknown> | null {
  try {
    const v = YAML.parse(content);
    if (v && typeof v === 'object') return v as Record<string, unknown>;
    warnings.push('chart/diagram/steps ブロックの内容が YAML マップではありません');
    return null;
  } catch (e) {
    warnings.push(`chart/diagram/steps ブロックの YAML 解析に失敗: ${(e as Error).message}`);
    return null;
  }
}

// --- chart（bar / line / donut） ---

function parseChartSlide(body: string, slideType: string, warnings: string[]) {
  const fence = extractFence(body, 'chart');
  const { heading, note } = pickHeadingAndNote(fence ? fence.rest : body);
  if (!fence) {
    warnings.push('```chart ブロックが見つかりません');
    return { heading, note, chart: undefined };
  }
  const y = parseYamlBlock(fence.content, warnings);
  if (!y) return { heading, note, chart: undefined };

  const expected = slideType.replace('chart-', ''); // bar | line | donut
  const type = typeof y.type === 'string' ? y.type : expected;
  if (type !== expected) {
    warnings.push(
      `chart type "${type}" とスライド type "${slideType}" が不一致です（chart 側を優先）`,
    );
  }
  const data = normalizeChartData(y.data, warnings);
  if (data.length === 0) {
    warnings.push('chart の data が空です');
    return { heading, note, chart: undefined };
  }
  if (data.length > 5)
    warnings.push(`chart の系列が ${data.length} 件あります（最大5件・6件目以降は切り捨て）`);
  const chart: ChartBlock = {
    type: (['bar', 'line', 'donut'].includes(type) ? type : expected) as ChartBlock['type'],
    title: String(y.title ?? heading ?? ''),
    unit: y.unit != null ? String(y.unit) : undefined,
    data: data.slice(0, 5),
    source: normalizeSource(y.source, warnings),
  };
  // v0.2.1: layout: side-list 用のサイドパネル（### 見出し + リスト）を後続から取り込む
  const sidePanel = parseSidePanel(fence ? fence.rest : body);
  return { heading, note, chart, sidePanel };
}

function normalizeChartData(raw: unknown, warnings: string[]): { label: string; value: number }[] {
  if (!Array.isArray(raw)) return [];
  const out: { label: string; value: number }[] = [];
  for (const item of raw) {
    if (item && typeof item === 'object' && 'label' in item && 'value' in item) {
      const v = Number((item as Record<string, unknown>).value);
      if (Number.isFinite(v)) {
        out.push({ label: String((item as Record<string, unknown>).label), value: v });
      } else {
        warnings.push(`数値に変換できない value をスキップ: ${JSON.stringify(item)}`);
      }
    }
  }
  return out;
}

function normalizeSource(raw: unknown, warnings: string[]): { name: string; url?: string } {
  if (raw && typeof raw === 'object' && 'name' in raw) {
    const r = raw as Record<string, unknown>;
    return { name: String(r.name), url: r.url != null ? String(r.url) : undefined };
  }
  warnings.push('chart の source（出典）がありません（出典明記は必須ルール）');
  return { name: '出典未記載' };
}


/** v0.2.1: chart ブロック後続の ### 見出し + リストをサイドパネルとして取り込む */
function parseSidePanel(rest: string): ChartSidePanel | undefined {
  // ### 見出し を探す
  const hMatch = rest.match(/^###\s+(.+)$/m);
  if (!hMatch) return undefined;
  const afterH = rest.slice(rest.indexOf(hMatch[0]) + hMatch[0].length);
  const items: PointItem[] = [];
  for (const line of afterH.split('\n')) {
    const m = line.match(/^(\s*)-\s+(.+)$/);
    if (m) {
      const depth = Math.floor(m[1].replace(/\t/g, '  ').length / 2);
      const item = parseSidePanelItem(m[2]);
      if (depth === 0 || items.length === 0) items.push(item);
      else items[items.length - 1].children.push(item);
    }
  }
  if (items.length === 0) return undefined;
  return { heading: hMatch[1].trim(), items };
}

function parseSidePanelItem(text: string): PointItem {
  const m = text.match(/^\*\*(.+?)\*\*\s*[：:]\s*(.*)$/);
  if (m) return { lead: m[1].trim(), text: m[2].trim(), children: [] };
  return { text: text.trim(), children: [] };
}

// --- comparison-chart ---

function parseComparisonChart(body: string, warnings: string[]) {
  const fence = extractFence(body, 'chart');
  const rest = fence ? fence.rest : body;
  const left = parseComparisonLeft(rest, warnings);
  if (!fence) {
    warnings.push('```chart ブロック（comparison-donut）が見つかりません');
    return { left, chart: undefined };
  }
  const y = parseYamlBlock(fence.content, warnings);
  if (!y) return { left, chart: undefined };
  const labels = (y.labels ?? {}) as Record<string, unknown>;
  const center = (y.center ?? {}) as Record<string, unknown>;
  const dataRaw = Array.isArray(y.data) ? y.data : [];
  const data = dataRaw
    .filter((it) => it && typeof it === 'object')
    .map((it) => {
      const r = it as Record<string, unknown>;
      return {
        label: String(r.label ?? ''),
        before: Number(r.before ?? 0),
        after: Number(r.after ?? 0),
        class: String(r.class ?? '1'),
      };
    })
    .filter((it) => Number.isFinite(it.before) && Number.isFinite(it.after));
  if (data.length === 0) {
    warnings.push('comparison-chart の data が空です');
    return { left, chart: undefined };
  }
  const chart: ComparisonChartBlock = {
    type: 'comparison-donut',
    labels: { before: String(labels.before ?? 'Before'), after: String(labels.after ?? 'After') },
    center: { before: String(center.before ?? ''), after: String(center.after ?? '') },
    data,
    source: normalizeSource(y.source, warnings),
  };
  return { left, chart };
}

function parseComparisonLeft(rest: string, warnings: string[]): ComparisonLeft {
  // left: ブロック（YAML）を取り出す。`left:` 行から次の非インデント行まで
  const m = rest.match(/(^|\n)left:\s*\n((?:[ \t]+.*(?:\n|$))+)/);
  const out: ComparisonLeft = { stats: [] };
  if (!m) return out;
  const y = parseYamlBlock('left:\n' + m[2], warnings);
  const left = (y?.left ?? null) as Record<string, unknown> | null;
  if (!left) return out;
  out.big = left.big != null ? String(left.big) : undefined;
  out.bigUnit = left.big_unit != null ? String(left.big_unit) : undefined;
  out.heading = left.heading != null ? String(left.heading) : undefined;
  out.lead = left.lead != null ? String(left.lead) : undefined;
  if (Array.isArray(left.stats)) {
    out.stats = left.stats
      .filter((s) => s && typeof s === 'object')
      .map((s) => {
        const r = s as Record<string, unknown>;
        return { num: String(r.num ?? ''), label: String(r.label ?? '') };
      });
  }
  return out;
}

// --- diagram（diagram ブロック / mermaid サブセット） ---

function parseDiagramSlide(body: string, slideType: string, warnings: string[]) {
  const expected = slideType.replace('diagram-', '') as DiagramBlock['type'];
  let fence = extractFence(body, 'diagram');
  let diagram: DiagramBlock | undefined;
  let rest = body;
  if (fence) {
    rest = fence.rest;
    const y = parseYamlBlock(fence.content, warnings);
    if (y) diagram = normalizeDiagram(y, expected, warnings);
  } else {
    fence = extractFence(body, 'mermaid');
    if (fence) {
      rest = fence.rest;
      diagram = parseMermaidSubset(fence.content, warnings) ?? undefined;
    } else {
      warnings.push('```diagram / ```mermaid ブロックが見つかりません');
    }
  }
  const { heading, note } = pickHeadingAndNote(rest);
  const sm = rest.match(/^source:\s*(.+)$/m);
  return { heading, note, diagram, sourceText: sm ? sm[1].trim() : undefined };
}

function normalizeDiagram(
  y: Record<string, unknown>,
  expected: DiagramBlock['type'],
  warnings: string[],
): DiagramBlock | undefined {
  const type = (typeof y.type === 'string' ? y.type : expected) as DiagramBlock['type'];
  if (!['flow', 'layer', 'cycle'].includes(type)) {
    warnings.push(`diagram type "${type}" は未対応です（flow / layer / cycle）`);
    return undefined;
  }
  // layer は nodes をネスト配列（層→箱）でも受け付ける
  if (type === 'layer' && Array.isArray(y.nodes) && y.nodes.some((n) => Array.isArray(n))) {
    const layers = (y.nodes as unknown[]).map((n) =>
      Array.isArray(n) ? n.map(String) : [String(n)],
    );
    if (layers.length > 4)
      warnings.push(`layer が ${layers.length} 層あります（上限4層・5層目以降は切り捨て）`);
    return { type, nodes: layers.flat(), layers: layers.slice(0, 4) };
  }
  const nodes = Array.isArray(y.nodes) ? y.nodes.map(String) : [];
  if (nodes.length === 0) {
    warnings.push('diagram の nodes が空です');
    return undefined;
  }
  const limits = { flow: 5, layer: 4, cycle: 4 } as const;
  if (nodes.length > limits[type]) {
    warnings.push(
      `${type} のノード数 ${nodes.length} は上限 ${limits[type]} を超えています（超過分は切り捨て）`,
    );
  }
  const labels = Array.isArray(y.labels) ? y.labels.map(String) : undefined;
  return { type, nodes: nodes.slice(0, limits[type]), labels };
}

/**
 * mermaid サブセット（graph LR / TD の直線・分岐なし、循環はサイクル図）。
 * 対応外の記法は null を返し、警告でフォールバックを通知する。
 */
export function parseMermaidSubset(src: string, warnings: string[]): DiagramBlock | null {
  const lines = src
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const headMatch = lines[0]?.match(/^graph\s+(LR|TD)$/);
  if (!headMatch) {
    warnings.push(
      'mermaid は graph LR / graph TD の直線フローのみ対応です（表・テキストで代替してください）',
    );
    return null;
  }
  const dir = headMatch[1];
  const unsupported = /subgraph|sequenceDiagram|classDiagram|\|/;
  if (lines.slice(1).some((l) => unsupported.test(l))) {
    warnings.push('mermaid の分岐・subgraph・ラベル付きエッジは未対応です');
    return null;
  }
  // ノード定義 A[ラベル] とエッジ A --> B を収集
  const labels = new Map<string, string>();
  const edges: [string, string][] = [];
  for (const line of lines.slice(1)) {
    // チェーン A[x] --> B[y] --> C[z] を分解
    const parts = line.split(/--+>/).map((p) => p.trim());
    const ids: string[] = [];
    for (const part of parts) {
      const m = part.match(/^([A-Za-z0-9_]+)(?:\[([^\]]*)\])?$/);
      if (!m) {
        warnings.push(`mermaid の解析不能な行: "${line}"`);
        return null;
      }
      ids.push(m[1]);
      if (m[2] != null) labels.set(m[1], m[2]);
    }
    for (let i = 0; i + 1 < ids.length; i++) edges.push([ids[i], ids[i + 1]]);
  }
  if (edges.length === 0) {
    warnings.push('mermaid にエッジがありません');
    return null;
  }

  // 出次数・入次数を確認し、直線 or 単一循環かを判定
  const outDeg = new Map<string, number>();
  const inDeg = new Map<string, number>();
  const nodesSet = new Set<string>();
  for (const [a, b] of edges) {
    nodesSet.add(a);
    nodesSet.add(b);
    outDeg.set(a, (outDeg.get(a) ?? 0) + 1);
    inDeg.set(b, (inDeg.get(b) ?? 0) + 1);
  }
  if ([...outDeg.values(), ...inDeg.values()].some((d) => d > 1)) {
    warnings.push('mermaid の分岐・合流は未対応です（表・テキストで代替してください）');
    return null;
  }
  const nodes = [...nodesSet];
  const isCycle = edges.length === nodes.length; // 直線なら edges = nodes - 1
  // 始点（入次数0）から辿って順序を確定
  let startId = nodes.find((n) => !inDeg.has(n));
  if (isCycle) startId = edges[0][0];
  if (!startId) {
    warnings.push('mermaid のグラフ構造を特定できません');
    return null;
  }
  const next = new Map(edges);
  const ordered: string[] = [];
  let curId: string | undefined = startId;
  while (curId && ordered.length <= nodes.length) {
    if (ordered.includes(curId)) break;
    ordered.push(curId);
    curId = next.get(curId);
  }
  if (ordered.length !== nodes.length) {
    warnings.push('mermaid のノードが連結ではありません');
    return null;
  }
  const nodeLabels = ordered.map((id) => labels.get(id) ?? id);
  if (isCycle) {
    if (nodeLabels.length > 4) {
      warnings.push('サイクル図はノード4以下のみ対応です');
      return null;
    }
    return { type: 'cycle', nodes: nodeLabels };
  }
  if (dir === 'LR') {
    if (nodeLabels.length > 5) {
      warnings.push('横フロー図はノード5以下のみ対応です');
      return null;
    }
    return { type: 'flow', nodes: nodeLabels };
  }
  if (nodeLabels.length > 4) {
    warnings.push('レイヤー図は4層以下のみ対応です');
    return null;
  }
  return { type: 'layer', nodes: nodeLabels };
}


// --- diagram-timeline（v0.2.1: タイムライン図） ---

const TIMELINE_MAX = 6;
const TIMELINE_MIN = 2;

function parseTimelineSlide(body: string, warnings: string[]) {
  const fence = extractFence(body, 'diagram');
  const { heading, note } = pickHeadingAndNote(fence ? fence.rest : body);
  const sm = (fence ? fence.rest : body).match(/^source:\s*(.+)$/m);
  const sourceText = sm ? sm[1].trim() : undefined;
  const empty = { heading, note, timeline: undefined as TimelineBlock | undefined, sourceText };
  if (!fence) {
    warnings.push('```diagram ブロックが見つかりません');
    return empty;
  }
  const y = parseYamlBlock(fence.content, warnings);
  if (!y) return empty;

  const start = typeof y.start === 'string' ? y.start : 'Start';
  const msRaw = Array.isArray(y.milestones) ? y.milestones : [];
  const milestones = msRaw
    .filter((it) => it && typeof it === 'object')
    .map((it) => {
      const r = it as Record<string, unknown>;
      return { label: String(r.label ?? ''), when: String(r.when ?? '') };
    });

  if (milestones.length < TIMELINE_MIN) {
    warnings.push(`timeline の milestones は ${TIMELINE_MIN} 個以上を推奨します`);
  }
  if (milestones.length > TIMELINE_MAX) {
    warnings.push(
      `timeline の milestones が ${milestones.length} 件あります（上限${TIMELINE_MAX}件・${TIMELINE_MAX + 1}件目以降は切り捨て）`,
    );
  }

  const timeline: TimelineBlock = {
    type: 'timeline',
    start,
    milestones: milestones.slice(0, TIMELINE_MAX),
  };
  return { heading, note, timeline, sourceText };
}

// --- figure ---

const NON_IMAGE_EXT = /\.(html?|php|aspx?|pdf|svgz)(\?|#|$)/i;

function parseFigure(body: string, warnings: string[]) {
  const { heading } = pickHeadingAndNote(body);
  const img = body.match(/!\[([^\]]*)\]\(([^)\s]+)\)/);
  const src = body.match(/^source:\s*\[([^\]]+)\]\(([^)\s]+)\)\s*$/m);
  if (!img) warnings.push('figure に画像（![alt](url)）がありません');
  if (img && NON_IMAGE_EXT.test(img[2])) {
    warnings.push(`画像URLの拡張子が画像ではない可能性があります: ${img[2]}`);
  }
  if (!src) warnings.push('figure に source:（出典）がありません（必須）');
  return {
    heading,
    alt: img?.[1] ?? '',
    url: img?.[2] ?? '',
    source: src ? { label: src[1], url: src[2] } : undefined,
  };
}

// --- feature-showcase ---

function parseFeatureShowcase(body: string, warnings: string[]) {
  const fallbackLeft: FeatureShowcaseLeft = { heading: '' };
  const fallbackRight: FeatureShowcaseRight = { heading: '', items: [] };
  const y = parseYamlBlock(body, warnings);
  if (!y) return { left: fallbackLeft, right: fallbackRight };
  const l = (y.left ?? {}) as Record<string, unknown>;
  const r = (y.right ?? {}) as Record<string, unknown>;
  const left: FeatureShowcaseLeft = {
    eyebrow: l.eyebrow != null ? String(l.eyebrow) : undefined,
    heading: String(l.heading ?? ''),
    lead: l.lead != null ? String(l.lead) : undefined,
  };
  const items = Array.isArray(r.items)
    ? r.items
        .filter((it) => it && typeof it === 'object')
        .map((it) => {
          const o = it as Record<string, unknown>;
          return { label: String(o.label ?? ''), desc: String(o.desc ?? '') };
        })
    : [];
  const right: FeatureShowcaseRight = {
    num: r.num != null ? String(r.num) : undefined,
    eyebrow: r.eyebrow != null ? String(r.eyebrow) : undefined,
    heading: String(r.heading ?? ''),
    sub: r.sub != null ? String(r.sub) : undefined,
    items,
  };
  if (!left.heading && !right.heading)
    warnings.push('feature-showcase の left/right の内容が読み取れません');
  return { left, right };
}

// --- steps（v0.2.0: カード型ステップフロー） ---

const STEP_STYLES: StepStyle[] = ['cards', 'circled'];
const STEPS_MAX_ITEMS = 5;

function parseStepsSlide(body: string, warnings: string[]) {
  const fence = extractFence(body, 'steps');
  const { heading, note } = pickHeadingAndNote(fence ? fence.rest : body);
  const empty = { heading, note, stepStyle: 'cards' as StepStyle, items: [] as StepItem[] };
  if (!fence) {
    warnings.push('```steps ブロックが見つかりません');
    return empty;
  }
  const y = parseYamlBlock(fence.content, warnings);
  if (!y) return empty;

  let stepStyle: StepStyle = 'cards';
  if (y.style != null) {
    if ((STEP_STYLES as string[]).includes(String(y.style))) {
      stepStyle = y.style as StepStyle;
    } else {
      warnings.push(`steps の style "${String(y.style)}" は未対応です（cards として描画）`);
    }
  }

  const itemsRaw = Array.isArray(y.items) ? y.items : [];
  const items: StepItem[] = itemsRaw
    .filter((it) => it && typeof it === 'object')
    .map((it) => {
      const r = it as Record<string, unknown>;
      const tone = r.tone === 'dark' || r.tone === 'outline' ? r.tone : undefined;
      if (r.tone != null && tone === undefined) {
        warnings.push(`steps item の tone "${String(r.tone)}" は未対応です（dark / outline）`);
      }
      return {
        icon: r.icon != null ? String(r.icon) : undefined,
        title: String(r.title ?? ''),
        desc: r.desc != null ? String(r.desc) : undefined,
        tone,
      };
    });
  if (items.length === 0) {
    warnings.push('steps の items が空です');
  } else if (items.length === 1) {
    warnings.push('steps の items は2個以上を推奨します');
  }
  if (items.length > STEPS_MAX_ITEMS) {
    warnings.push(
      `steps の items が ${items.length} 件あります（上限${STEPS_MAX_ITEMS}件・${STEPS_MAX_ITEMS + 1}件目以降は切り捨て）`,
    );
  }

  let ratio: StepRatioItem[] | undefined;
  if (Array.isArray(y.ratio)) {
    const rr = y.ratio
      .filter((it) => it && typeof it === 'object')
      .map((it) => {
        const r = it as Record<string, unknown>;
        return { label: String(r.label ?? ''), value: Number(r.value) };
      })
      .filter((it) => Number.isFinite(it.value) && it.value > 0);
    if (rr.length > 0) {
      ratio = rr;
      const sum = rr.reduce((a, b) => a + b.value, 0);
      if (Math.round(sum) !== 100) {
        warnings.push(`steps の ratio 合計が ${sum} です（比率として正規化して描画します）`);
      }
    } else {
      warnings.push('steps の ratio に有効な値がありません（帯は非表示）');
    }
  }

  return { heading, note, stepStyle, items: items.slice(0, STEPS_MAX_ITEMS), ratio };
}

// --- sources ---

function parseSources(body: string) {
  const { heading } = pickHeadingAndNote(body);
  const links: SourceLink[] = [];
  for (const line of body.split('\n')) {
    const m = line.match(/^-\s+\[([^\]]+)\]\(([^)\s]+)\)\s*(?:[—-]\s*(.+))?$/);
    if (m) links.push({ label: m[1], url: m[2], note: m[3]?.trim() });
  }
  return { heading: heading ?? '出典・参考リンク', links };
}

// --- 共通ヘルパ ---

function pickHeadingAndNote(body: string): { heading?: string; note?: string } {
  let heading: string | undefined;
  const noteLines: string[] = [];
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+)$/);
    if (h && !heading) heading = h[1].trim();
    const q = line.match(/^>\s?(.*)$/);
    if (q) noteLines.push(q[1]);
  }
  return { heading, note: noteLines.length ? noteLines.join(' ').trim() : undefined };
}
