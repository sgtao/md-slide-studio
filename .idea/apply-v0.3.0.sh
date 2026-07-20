#!/usr/bin/env bash
# apply-v0.3.0.sh — zod導入・schema基盤・chart/comparison系のzod検証化
# 冪等（1回目=OK・2回目=SKIP）。実行後に typecheck / vitest まで通す。
set -euo pipefail
cd "$(dirname "$0")/.."

# ---------------------------------------------------------------------------
# 1. package.json に zod を追加
# ---------------------------------------------------------------------------
python3 - << 'PY'
import pathlib
p = pathlib.Path('package.json')
s = p.read_text(encoding='utf-8')
if '"zod"' in s:
    print('[SKIP] package.json: zod already present')
else:
    anchor = '"react-dom": "^18.3.1",'
    if anchor not in s:
        print('[ERROR] package.json: anchor not found'); raise SystemExit(1)
    s = s.replace(anchor, anchor + '\n    "zod": "^4.4.3",', 1)
    p.write_text(s, encoding='utf-8')
    print('[OK] package.json: zod added')
PY

# ---------------------------------------------------------------------------
# 2. src/schema/*.ts を新規作成
# ---------------------------------------------------------------------------
mkdir -p src/schema

python3 - << 'PY'
import pathlib

files = {}

files['src/schema/primitives.ts'] = '''import { z } from 'zod';

/**
 * 「型としては妥当だが、必須情報が欠けている」判定は zod の外（parser側）で行う。
 * 理由：'source が無い→出典未記載＋warning' のような業務ルールの文言・判定は
 * schema の責務（オブジェクト形状の記述）ではなく、parser（アダプタ）の責務として残す。
 * schema はあくまで「渡された値が正しい形か」だけを見る。
 */
export const zChartSource = z.object({
  name: z.coerce.string(),
  url: z.coerce.string().optional(),
});
export type ChartSource = z.infer<typeof zChartSource>;
'''

files['src/schema/chart.ts'] = '''import { z } from 'zod';
import { zChartSource } from './primitives';

/** chart系の1データ点。文字列数値も許容（現行 Number()/String() 挙動を維持）。 */
export const zChartDataItem = z.object({
  label: z.coerce.string(),
  value: z.coerce.number(),
});
export type ChartDataItem = z.infer<typeof zChartDataItem>;

/** chart フェンスのYAML形状（source/dataの中身の妥当性チェックは parser 側で行う）。 */
export const zChartYaml = z
  .object({
    type: z.coerce.string().optional(),
    title: z.coerce.string().optional(),
    unit: z.coerce.string().optional(),
    data: z.array(z.unknown()).optional(),
    source: z.unknown().optional(),
  })
  .meta({
    id: 'chart-yaml',
    summary: 'bar/line/donut。data(label,value)最大5・source必須',
    maxSeries: 5,
  });
export type ChartYaml = z.infer<typeof zChartYaml>;

export const zComparisonChartYaml = z
  .object({
    type: z.coerce.string().optional(),
    labels: z.object({ before: z.unknown().optional(), after: z.unknown().optional() }).optional(),
    center: z.object({ before: z.unknown().optional(), after: z.unknown().optional() }).optional(),
    data: z.array(z.unknown()).optional(),
    source: z.unknown().optional(),
  })
  .meta({
    id: 'comparison-chart-yaml',
    summary: 'comparison-donut。left(big/heading/stats)＋chart(data[before,after,class])',
  });
export type ComparisonChartYaml = z.infer<typeof zComparisonChartYaml>;

export const zComparisonDataItem = z.object({
  label: z.coerce.string().catch(''),
  before: z.coerce.number().catch(0),
  after: z.coerce.number().catch(0),
  class: z.coerce.string().catch('1'),
});
export type ComparisonDataItem = z.infer<typeof zComparisonDataItem>;

export const zComparisonLeftYaml = z
  .object({
    big: z.unknown().optional(),
    big_unit: z.unknown().optional(),
    heading: z.unknown().optional(),
    lead: z.unknown().optional(),
    stats: z.array(z.unknown()).optional(),
  })
  .optional();
export type ComparisonLeftYaml = z.infer<typeof zComparisonLeftYaml>;
'''

files['src/schema/issues.ts'] = '''import type { ZodSafeParseResult } from 'zod';

/**
 * 個別データ項目（chart data 等）の safeParse 失敗を warning へ写像する。
 * 「型が違えばエラーで落とす」のではなく「その項目だけ捨てて warning」という
 * 非クラッシュ規約を維持するためのヘルパー。
 */
export function itemParseWarning(label: string, rawItem: unknown): string {
  return `${label}に変換できない項目をスキップ: ${JSON.stringify(rawItem)}`;
}

/** safeParse結果から成功値だけを取り出し、失敗は warning を積みつつ捨てる汎用ヘルパー。 */
export function collectValid<T>(
  rawItems: unknown[],
  parseOne: (item: unknown) => ZodSafeParseResult<T>,
  warnLabel: string,
  warnings: string[],
): T[] {
  const out: T[] = [];
  for (const raw of rawItems) {
    const r = parseOne(raw);
    if (r.success) out.push(r.data);
    else warnings.push(itemParseWarning(warnLabel, raw));
  }
  return out;
}
'''

files['src/schema/chart.test.ts'] = '''import { describe, it, expect } from 'vitest';
import { zChartDataItem, zChartYaml } from './chart';
import { zChartSource } from './primitives';

describe('zChartDataItem', () => {
  it('文字列数値も許容する', () => {
    expect(zChartDataItem.safeParse({ label: 'a', value: '3' }).success).toBe(true);
  });
  it('数値化できないvalueは失敗する', () => {
    expect(zChartDataItem.safeParse({ label: 'a', value: 'abc' }).success).toBe(false);
  });
});

describe('zChartSource', () => {
  it('nameが無いと失敗する（parser側でフォールバック処理する前提）', () => {
    expect(zChartSource.safeParse({}).success).toBe(false);
  });
});

describe('zChartYaml meta', () => {
  it('maxSeries制約がmetaに載っている（v0.3.2のSSOT生成が読む値）', () => {
    expect(zChartYaml.meta()?.maxSeries).toBe(5);
  });
});
'''

created, skipped = 0, 0
for relpath, content in files.items():
    p = pathlib.Path(relpath)
    if p.exists():
        print(f'[SKIP] {relpath} already exists')
        skipped += 1
    else:
        p.write_text(content, encoding='utf-8')
        print(f'[OK] {relpath} created')
        created += 1
print(f'--- schema files: {created} created, {skipped} skipped ---')
PY

# ---------------------------------------------------------------------------
# 3. src/parser/slideMarkdown.ts の関数置換
# ---------------------------------------------------------------------------
python3 - << 'PY'
import pathlib
p = pathlib.Path('src/parser/slideMarkdown.ts')
s = p.read_text(encoding='utf-8')

MARKER = '// v0.3.0-zod-applied'
if MARKER in s:
    print('[SKIP] slideMarkdown.ts: already patched')
    raise SystemExit(0)

# --- 3-1. import追加 ---
import_anchor = "import { parseSlideHeader } from './slideHeader';\n"
if import_anchor not in s:
    print('[ERROR] slideMarkdown.ts: import anchor not found'); raise SystemExit(1)
new_imports = (
    import_anchor
    + "import { zChartYaml, zChartDataItem, zComparisonChartYaml, zComparisonDataItem, zComparisonLeftYaml } from '../schema/chart';\n"
    + "import { zChartSource } from '../schema/primitives';\n"
    + "import { collectValid } from '../schema/issues';\n"
)
s = s.replace(import_anchor, new_imports, 1)

# --- 3-2. normalizeChartData / normalizeSource を置換 ---
old_normalize = '''function normalizeChartData(raw: unknown, warnings: string[]): { label: string; value: number }[] {
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
}'''

new_normalize = MARKER + '''
function normalizeSource(raw: unknown, warnings: string[]): { name: string; url?: string } {
  const r = zChartSource.safeParse(raw);
  if (r.success) return r.data;
  warnings.push('chart の source（出典）がありません（出典明記は必須ルール）');
  return { name: '出典未記載' };
}

function normalizeChartData(raw: unknown, warnings: string[]): { label: string; value: number }[] {
  if (!Array.isArray(raw)) return [];
  return collectValid(raw, (item) => zChartDataItem.safeParse(item), 'value', warnings);
}'''

if old_normalize not in s:
    print('[ERROR] slideMarkdown.ts: normalizeChartData/normalizeSource anchor not found'); raise SystemExit(1)
s = s.replace(old_normalize, new_normalize, 1)

# --- 3-3. parseChartSlide 内の y アクセスを shape 検証つきに ---
old_parse_chart_body = '''  const y = parseYamlBlock(fence.content, warnings);
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
  };'''

new_parse_chart_body = '''  const raw = parseYamlBlock(fence.content, warnings);
  if (!raw) return { heading, note, chart: undefined };
  const shaped = zChartYaml.safeParse(raw);
  if (!shaped.success) {
    warnings.push('chart ブロックの形式が不正です');
    return { heading, note, chart: undefined };
  }
  const y = shaped.data;

  const expected = slideType.replace('chart-', ''); // bar | line | donut
  const type = y.type ?? expected;
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
    title: y.title ?? heading ?? '',
    unit: y.unit,
    data: data.slice(0, 5),
    source: normalizeSource(y.source, warnings),
  };'''

if old_parse_chart_body not in s:
    print('[ERROR] slideMarkdown.ts: parseChartSlide body anchor not found'); raise SystemExit(1)
s = s.replace(old_parse_chart_body, new_parse_chart_body, 1)

# --- 3-4. parseComparisonChart を置換 ---
old_comparison_chart = '''function parseComparisonChart(body: string, warnings: string[]) {
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
}'''

new_comparison_chart = '''function parseComparisonChart(body: string, warnings: string[]) {
  const fence = extractFence(body, 'chart');
  const rest = fence ? fence.rest : body;
  const left = parseComparisonLeft(rest, warnings);
  if (!fence) {
    warnings.push('```chart ブロック（comparison-donut）が見つかりません');
    return { left, chart: undefined };
  }
  const raw = parseYamlBlock(fence.content, warnings);
  if (!raw) return { left, chart: undefined };
  const shaped = zComparisonChartYaml.safeParse(raw);
  if (!shaped.success) {
    warnings.push('comparison-chart ブロックの形式が不正です');
    return { left, chart: undefined };
  }
  const y = shaped.data;
  const rawData = Array.isArray(y.data) ? y.data : [];
  const data = collectValid(
    rawData,
    (item) => zComparisonDataItem.safeParse(item),
    'comparisonデータ',
    warnings,
  );
  if (data.length === 0) {
    warnings.push('comparison-chart の data が空です');
    return { left, chart: undefined };
  }
  const labels = y.labels ?? {};
  const center = y.center ?? {};
  const chart: ComparisonChartBlock = {
    type: 'comparison-donut',
    labels: {
      before: labels.before != null ? String(labels.before) : 'Before',
      after: labels.after != null ? String(labels.after) : 'After',
    },
    center: {
      before: center.before != null ? String(center.before) : '',
      after: center.after != null ? String(center.after) : '',
    },
    data,
    source: normalizeSource(y.source, warnings),
  };
  return { left, chart };
}'''

if old_comparison_chart not in s:
    print('[ERROR] slideMarkdown.ts: parseComparisonChart anchor not found'); raise SystemExit(1)
s = s.replace(old_comparison_chart, new_comparison_chart, 1)

# --- 3-5. parseComparisonLeft を置換 ---
old_comparison_left = '''function parseComparisonLeft(rest: string, warnings: string[]): ComparisonLeft {
  // left: ブロック（YAML）を取り出す。`left:` 行から次の非インデント行まで
  const m = rest.match(/(^|\\n)left:\\s*\\n((?:[ \\t]+.*(?:\\n|$))+)/);
  const out: ComparisonLeft = { stats: [] };
  if (!m) return out;
  const y = parseYamlBlock('left:\\n' + m[2], warnings);
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
}'''

new_comparison_left = '''function parseComparisonLeft(rest: string, warnings: string[]): ComparisonLeft {
  // left: ブロック（YAML）を取り出す。`left:` 行から次の非インデント行まで
  const m = rest.match(/(^|\\n)left:\\s*\\n((?:[ \\t]+.*(?:\\n|$))+)/);
  const out: ComparisonLeft = { stats: [] };
  if (!m) return out;
  const raw = parseYamlBlock('left:\\n' + m[2], warnings);
  if (!raw) return out;
  const shaped = zComparisonLeftYaml.safeParse((raw as { left?: unknown }).left);
  if (!shaped.success || !shaped.data) return out;
  const left = shaped.data;
  out.big = left.big != null ? String(left.big) : undefined;
  out.bigUnit = left.big_unit != null ? String(left.big_unit) : undefined;
  out.heading = left.heading != null ? String(left.heading) : undefined;
  out.lead = left.lead != null ? String(left.lead) : undefined;
  if (Array.isArray(left.stats)) {
    out.stats = left.stats
      .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
      .map((r) => ({ num: String(r.num ?? ''), label: String(r.label ?? '') }));
  }
  return out;
}'''

if old_comparison_left not in s:
    print('[ERROR] slideMarkdown.ts: parseComparisonLeft anchor not found'); raise SystemExit(1)
s = s.replace(old_comparison_left, new_comparison_left, 1)

p.write_text(s, encoding='utf-8')
print('[OK] slideMarkdown.ts: patched (import + normalize + parseChartSlide + parseComparisonChart + parseComparisonLeft)')
PY

# ---------------------------------------------------------------------------
# 4. 依存インストール
# ---------------------------------------------------------------------------
npm install --silent

# ---------------------------------------------------------------------------
# 5. 検証（grepベース）
# ---------------------------------------------------------------------------
echo '--- verify ---'
grep -q '"zod"' package.json && echo '[OK] zod dependency present'
test -f src/schema/chart.ts && echo '[OK] src/schema/chart.ts exists'
test -f src/schema/primitives.ts && echo '[OK] src/schema/primitives.ts exists'
test -f src/schema/issues.ts && echo '[OK] src/schema/issues.ts exists'
grep -q "from '../schema/chart'" src/parser/slideMarkdown.ts && echo '[OK] slideMarkdown.ts imports schema/chart'
grep -q 'v0.3.0-zod-applied' src/parser/slideMarkdown.ts && echo '[OK] patch marker present'

echo '--- typecheck ---'
npx tsc -b --noEmit

echo '--- vitest ---'
npx vitest run

echo '--- prettier ---'
npx prettier --check "src/**/*.{ts,tsx}" || echo '[WARN] prettier formatting differs (run: npm run format)'

echo '=== apply-v0.3.0.sh completed ==='
