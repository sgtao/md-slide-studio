#!/usr/bin/env bash
# apply-contrast.sh — v0.2.3 Step②: 新type `contrast`
#
# 使い方: cd <リポジトリルート> && bash apply-contrast.sh
# 冪等: 2回目以降は [SKIP] を出力して何もしない
#
# 設計方針の教訓（apply-split-image.sh の反省を反映）:
#   `python3 -c "..."` は bash の二重引用符展開と python の文字列エスケープが
#   二重に効き、\n 等の「python にとって有効なエスケープ」だけが実改行に
#   化けるバグを踏んだ（\s 等の無効エスケープは無事だった非対称性が原因）。
#   本スクリプトは全面的に `python3 << 'PYEOF' ... PYEOF`
#   （クォート付きヒアドキュメント）を使い、bash のエスケープ処理を無効化する。
#
# 変更ファイル:
#   src/parser/types.ts                      — SlideType に 'contrast' 追加、
#                                               ContrastExampleRow/ContrastExample/
#                                               ContrastVerdictItem/ContrastSlide 新設
#   src/parser/slideMarkdown.ts               — SLIDE_TYPES 追加・import追加・
#                                               parseSlide() dispatch追加・
#                                               parseContrastSlide() 新設
#   src/components/slides/SlideRenderer.tsx   — ContrastView 新設・dispatch追加
#   src/theme/contrast.css                    — 新規（2カラムgrid・タグピル・
#                                               connector矢印・tone: warn）
#   src/main.tsx                              — contrast.css の import 追加
#   src/parser/contrast.test.ts               — 新規（正常系・異常系テスト）
set -euo pipefail

CHECK_FILE="src/parser/types.ts"

# --- 冪等チェック ---
if [ -f "$CHECK_FILE" ] && grep -q "ContrastSlide" "$CHECK_FILE" 2>/dev/null; then
  echo "[SKIP] contrast 型は既に適用済みです"
  exit 0
fi

echo "=== apply-contrast.sh ==="

# ─────────────────────────────────────────────
# 1. types.ts — SlideType に 'contrast' 追加、Contrast系インターフェース新設
# ─────────────────────────────────────────────
echo "[1/6] types.ts"

python3 << 'PYEOF'
import sys
path = 'src/parser/types.ts'
with open(path, 'r') as f:
    content = f.read()

# SlideType union に 'contrast' を追加（'sources' の直前に挿入）
anchor = "  | 'steps'\n  | 'sources';"
if anchor not in content:
    print('[ERROR] SlideType anchor not found', file=sys.stderr)
    sys.exit(1)
content = content.replace(
    anchor,
    "  | 'steps'\n  | 'contrast'\n  | 'sources';",
    1,
)

# SourcesSlide interface の直前に Contrast系の型定義を挿入
anchor2 = "export interface SourcesSlide extends SlideBase {"
if anchor2 not in content:
    print('[ERROR] SourcesSlide anchor not found', file=sys.stderr)
    sys.exit(1)

contrast_types = """/** contrast（v0.2.3）: 例示 vs 結論の対比構図 */
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

"""
content = content.replace(anchor2, contrast_types + anchor2, 1)

# Slide Union 型に ContrastSlide を追加（SourcesSlide の直前）
anchor3 = "  | StepsSlide\n  | SourcesSlide;"
if anchor3 not in content:
    print('[ERROR] Slide union anchor not found', file=sys.stderr)
    sys.exit(1)
content = content.replace(
    anchor3,
    "  | StepsSlide\n  | ContrastSlide\n  | SourcesSlide;",
    1,
)

# バージョンコメント更新
content = content.replace(
    'v0.2.1: diagram-timeline・ChartSlide.sidePanel・layout: side-list\n * v0.2.3: TitleSlide.image（layout: split-image）',
    'v0.2.1: diagram-timeline・ChartSlide.sidePanel・layout: side-list\n * v0.2.3: TitleSlide.image（layout: split-image）・ContrastSlide（新type）',
)
# split-image 未適用でも通るように、単独パターンでも更新を試みる
if 'v0.2.3: ContrastSlide' not in content:
    content = content.replace(
        'v0.2.1: diagram-timeline・ChartSlide.sidePanel・layout: side-list',
        'v0.2.1: diagram-timeline・ChartSlide.sidePanel・layout: side-list\n * v0.2.3: ContrastSlide（新type）',
        1,
    )

with open(path, 'w') as f:
    f.write(content)
print('[OK] types.ts')
PYEOF

# ─────────────────────────────────────────────
# 2. slideMarkdown.ts — SLIDE_TYPES・import・dispatch・parseContrastSlide()
# ─────────────────────────────────────────────
echo "[2/6] slideMarkdown.ts"

python3 << 'PYEOF'
import sys
path = 'src/parser/slideMarkdown.ts'
with open(path, 'r') as f:
    content = f.read()

# import に Contrast系型を追加
anchor_import = "  ComparisonLeft,\n  DiagramBlock,"
if anchor_import not in content:
    print('[ERROR] import anchor not found', file=sys.stderr)
    sys.exit(1)
content = content.replace(
    anchor_import,
    "  ComparisonLeft,\n  ContrastExample,\n  ContrastExampleRow,\n  ContrastVerdictItem,\n  DiagramBlock,",
    1,
)

# SLIDE_TYPES 配列に 'contrast' を追加（'steps' の直後）
anchor_types = "  'steps',\n  'sources',\n];"
if anchor_types not in content:
    print('[ERROR] SLIDE_TYPES anchor not found', file=sys.stderr)
    sys.exit(1)
content = content.replace(
    anchor_types,
    "  'steps',\n  'contrast',\n  'sources',\n];",
    1,
)

# parseSlide() の dispatch に 'contrast' を追加（'sources' case の直前）
anchor_dispatch = "    case 'sources':\n      return { ...base, type: 'sources', ...parseSources(body) };"
if anchor_dispatch not in content:
    print('[ERROR] dispatch anchor not found', file=sys.stderr)
    sys.exit(1)
content = content.replace(
    anchor_dispatch,
    "    case 'contrast':\n      return { ...base, type: 'contrast', ...parseContrastSlide(body, d.warnings) };\n"
    + anchor_dispatch,
    1,
)

# parseContrastSlide() 関数本体を末尾付近（parseSources の直前）に追加
anchor_func = "// --- sources ---"
if anchor_func not in content:
    print('[ERROR] sources function anchor not found', file=sys.stderr)
    sys.exit(1)

parse_contrast_fn = '''// --- contrast（v0.2.3: 例示 vs 結論の対比） ---

function parseContrastSlide(body: string, warnings: string[]) {
  const fence = extractFence(body, 'contrast');
  const { heading } = pickHeadingAndNote(fence ? fence.rest : body);
  const empty = {
    heading,
    example: undefined as ContrastExample | undefined,
    verdict: [] as ContrastVerdictItem[],
  };
  if (!fence) {
    warnings.push('```contrast ブロックが見つかりません');
    return empty;
  }
  const y = parseYamlBlock(fence.content, warnings);
  if (!y) return empty;

  let example: ContrastExample | undefined;
  if (y.example && typeof y.example === 'object') {
    const ex = y.example as Record<string, unknown>;
    const rowsRaw = Array.isArray(ex.rows) ? ex.rows : [];
    const rows: ContrastExampleRow[] = rowsRaw
      .filter((it) => it && typeof it === 'object')
      .map((it) => {
        const r = it as Record<string, unknown>;
        return { tag: String(r.tag ?? ''), text: String(r.text ?? '') };
      });
    if (rows.length === 0) {
      warnings.push('contrast の example.rows が空です');
    }
    example = { title: ex.title != null ? String(ex.title) : undefined, rows };
  } else {
    warnings.push('contrast の example がありません');
  }

  const verdictRaw = Array.isArray(y.verdict) ? y.verdict : [];
  const verdict: ContrastVerdictItem[] = verdictRaw
    .filter((it) => it && typeof it === 'object')
    .map((it) => {
      const r = it as Record<string, unknown>;
      const tone = r.tone === 'warn' ? ('warn' as const) : undefined;
      if (r.tone != null && tone === undefined) {
        warnings.push(`contrast verdict item の tone "${String(r.tone)}" は未対応です（warn のみ）`);
      }
      return {
        label: r.label != null ? String(r.label) : undefined,
        text: r.text != null ? String(r.text) : undefined,
        connector: r.connector != null ? String(r.connector) : undefined,
        tone,
      };
    });
  if (verdict.length === 0) {
    warnings.push('contrast の verdict が空です');
  }

  return { heading, example, verdict };
}

'''
content = content.replace(anchor_func, parse_contrast_fn + anchor_func, 1)

# バージョンコメント更新
content = content.replace(
    "Studio拡張 v0.2.3）のパーサー。",
    "Studio拡張 v0.2.3）のパーサー。",
)
if 'Studio拡張 v0.2.1）のパーサー' in content:
    content = content.replace(
        'Studio拡張 v0.2.1）のパーサー。',
        'Studio拡張 v0.2.3）のパーサー。',
        1,
    )
content = content.replace(
    "* - chart / diagram / mermaid（サブセット）/ steps フェンスブロックを構造化",
    "* - chart / diagram / mermaid（サブセット）/ steps / contrast フェンスブロックを構造化",
    1,
)

with open(path, 'w') as f:
    f.write(content)
print('[OK] slideMarkdown.ts')
PYEOF

# ─────────────────────────────────────────────
# 3. SlideRenderer.tsx — ContrastView 新設・dispatch追加
# ─────────────────────────────────────────────
echo "[3/6] SlideRenderer.tsx"

python3 << 'PYEOF'
import sys
path = 'src/components/slides/SlideRenderer.tsx'
with open(path, 'r') as f:
    content = f.read()

# import に ContrastSlide を追加
anchor_import = "import type {\n  ChartSlide,\n  ComparisonChartSlide,\n  DiagramSlide,"
if anchor_import not in content:
    print('[ERROR] import anchor not found', file=sys.stderr)
    sys.exit(1)
content = content.replace(
    anchor_import,
    "import type {\n  ChartSlide,\n  ComparisonChartSlide,\n  ContrastSlide,\n  DiagramSlide,",
    1,
)

# ContrastView コンポーネントを SourcesView の直前に追加
anchor_view = "// --- sources ---"
if anchor_view not in content:
    print('[ERROR] sources view anchor not found', file=sys.stderr)
    sys.exit(1)

contrast_view = '''// --- contrast (v0.2.3) ---

function ContrastView({ slide }: { slide: ContrastSlide }) {
  return (
    <div className="slide-inner">
      <SlideHeading text={slide.heading} badge={slide.badge} lead={slide.lead} />
      <div className="contrast-grid">
        <div className="contrast-left">
          {slide.example ? (
            <div className="contrast-example">
              {slide.example.title && (
                <div className="contrast-example-title">{renderInline(slide.example.title)}</div>
              )}
              <div className="contrast-rows">
                {slide.example.rows.map((row, i) => (
                  <div key={i} className="contrast-row">
                    <span className="contrast-tag">{row.tag}</span>
                    <span className="contrast-text">{renderInline(row.text)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="note">（example が未定義のため表示できません）</p>
          )}
        </div>
        <div className="contrast-right">
          {slide.verdict.length > 0 ? (
            <div className="contrast-verdict">
              {slide.verdict.map((v, i) =>
                v.connector ? (
                  <div key={i} className="contrast-connector">
                    {renderInline(v.connector)}
                  </div>
                ) : (
                  <div
                    key={i}
                    className={`contrast-verdict-item${v.tone ? ` contrast-verdict-item--${v.tone}` : ''}`}
                  >
                    {v.label && <span className="contrast-verdict-label">{v.label}</span>}
                    {v.text && <span className="contrast-verdict-text">{renderInline(v.text)}</span>}
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="note">（verdict が未定義のため表示できません）</p>
          )}
        </div>
      </div>
    </div>
  );
}

'''
content = content.replace(anchor_view, contrast_view + anchor_view, 1)

# renderSlideBody の switch に 'contrast' dispatch を追加（'sources' case の直前）
anchor_dispatch = "    case 'sources':\n      return <SourcesView slide={slide} />;"
if anchor_dispatch not in content:
    print('[ERROR] dispatch anchor not found', file=sys.stderr)
    sys.exit(1)
content = content.replace(
    anchor_dispatch,
    "    case 'contrast':\n      return <ContrastView slide={slide} />;\n" + anchor_dispatch,
    1,
)

with open(path, 'w') as f:
    f.write(content)
print('[OK] SlideRenderer.tsx')
PYEOF

# ─────────────────────────────────────────────
# 4. theme/contrast.css — 新規ファイル
# ─────────────────────────────────────────────
echo "[4/6] contrast.css"

if [ -f "src/theme/contrast.css" ]; then
  echo "[SKIP] contrast.css は既に存在します"
else
  cat > src/theme/contrast.css << 'CSSEOF'
/* contrast.css
 * contrast type（v0.2.3）: 「例示（左）vs 結論の連鎖（右）」の対比構図。
 * - 左: タグ付き行のリスト（AIの推測、など）
 * - 右: label/text の連鎖 + connector（矢印）+ tone: warn（弱点強調）
 * 色は theme-vars.css の変数を参照し、ハードコード禁止規約に準拠。
 */

.contrast-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: start;
  margin-top: 1rem;
}

/* ─── 左: 例示ボックス ─── */
.contrast-example {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-surface);
  padding: 1.2rem 1.4rem;
}

.contrast-example-title {
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 0.8rem;
  color: var(--text-primary);
}

.contrast-rows {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.contrast-row {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  font-size: 0.85rem;
}

.contrast-tag {
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.15em 0.6em;
  border-radius: 999px;
  background: var(--accent-soft, var(--bg-surface));
  color: var(--accent);
  border: 1px solid var(--accent);
  white-space: nowrap;
}

.contrast-text {
  color: var(--text-secondary);
  line-height: 1.5;
}

/* ─── 右: 結論の連鎖 ─── */
.contrast-verdict {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.contrast-verdict-item {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-surface);
  padding: 0.9rem 1.2rem;
}

.contrast-verdict-label {
  flex-shrink: 0;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--accent);
}

.contrast-verdict-text {
  font-size: 0.9rem;
  color: var(--text-primary);
  line-height: 1.5;
}

/* tone: warn（弱点の強調表示） */
.contrast-verdict-item--warn {
  border-color: var(--warn, #d97757);
  background: var(--warn-soft, var(--bg-surface));
}
.contrast-verdict-item--warn .contrast-verdict-label {
  color: var(--warn, #d97757);
}

/* connector（矢印・「↓ でも」等） */
.contrast-connector {
  font-size: 0.82rem;
  color: var(--text-secondary);
  font-weight: 600;
}

/* ダークトーン（tone: dark ディレクティブとの併存） */
.slide--dark .contrast-example,
.slide--dark .contrast-verdict-item {
  background: var(--bg-surface-dark, var(--bg-surface));
  border-color: var(--border-dark, var(--border));
}
CSSEOF
  echo "[OK] contrast.css"
fi

# ─────────────────────────────────────────────
# 5. main.tsx — contrast.css の import 追加
# ─────────────────────────────────────────────
echo "[5/6] main.tsx"

python3 << 'PYEOF'
import sys
path = 'src/main.tsx'
with open(path, 'r') as f:
    content = f.read()

if "theme/contrast.css" in content:
    print('[SKIP] main.tsx は既に contrast.css を import 済みです')
else:
    anchor = "import './theme/timeline-sidelist.css';"
    if anchor not in content:
        print('[ERROR] main.tsx anchor not found', file=sys.stderr)
        sys.exit(1)
    content = content.replace(
        anchor,
        anchor + "\nimport './theme/contrast.css';",
        1,
    )
    # CSS統合順コメントも更新
    content = content.replace(
        "// list-view → print（必ず最後）→ content（旧デッキ側CSS）→ app（シェル）\n// → steps（v0.2.0）→ timeline-sidelist（v0.2.1）",
        "// list-view → print（必ず最後）→ content（旧デッキ側CSS）→ app（シェル）\n// → steps（v0.2.0）→ timeline-sidelist（v0.2.1）→ contrast（v0.2.3）",
    )
    with open(path, 'w') as f:
        f.write(content)
    print('[OK] main.tsx')
PYEOF

# ─────────────────────────────────────────────
# 6. contrast.test.ts — 新規テストファイル
# ─────────────────────────────────────────────
echo "[6/6] contrast.test.ts"

if [ -f "src/parser/contrast.test.ts" ]; then
  echo "[SKIP] contrast.test.ts は既に存在します"
else
  cat > src/parser/contrast.test.ts << 'TESTEOF'
import { describe, expect, it } from 'vitest';
import { parseSlideMarkdown } from './slideMarkdown';
import type { ContrastSlide } from './types';

const fm = (body: string) => `---\ntitle: テスト\npalette: ocean\n---\n${body}`;

const contrastMd = (block: string, directive = '<!-- slide: contrast -->') =>
  fm(`${directive}\nbadge: WHY\n## AIは、足りない情報を==勝手に補う==\n${block}`);

const FULL_BLOCK = [
  '```contrast',
  'example:',
  '  title: 「タスク管理アプリを作って」',
  '  rows:',
  '    - { tag: AIの推測, text: ログイン → たぶん必要だろう }',
  '    - { tag: AIの推測, text: 通知 → 入れておこう }',
  'verdict:',
  '  - { label: 強み, text: それっぽく作れる }',
  '  - { connector: ↓ でも }',
  '  - { label: 弱点, text: 意図と合うとは限らない, tone: warn }',
  '```',
].join('\n');

describe('contrast: 正常系', () => {
  it('example / verdict を正しくパースする', () => {
    const md = contrastMd(FULL_BLOCK);
    const s = parseSlideMarkdown(md).slides[0] as ContrastSlide;
    expect(s.type).toBe('contrast');
    expect(s.badge).toBe('WHY');
    expect(s.heading).toContain('勝手に補う');
    expect(s.example?.title).toBe('「タスク管理アプリを作って」');
    expect(s.example?.rows).toHaveLength(2);
    expect(s.example?.rows[0]).toEqual({ tag: 'AIの推測', text: 'ログイン → たぶん必要だろう' });
    expect(s.verdict).toHaveLength(3);
    expect(s.verdict[0]).toEqual({ label: '強み', text: 'それっぽく作れる', connector: undefined, tone: undefined });
    expect(s.verdict[1].connector).toBe('↓ でも');
    expect(s.verdict[2].tone).toBe('warn');
  });

  it('SlideType の一覧に contrast が含まれる（未知typeフォールバックされない）', () => {
    const md = contrastMd(FULL_BLOCK);
    const s = parseSlideMarkdown(md).slides[0];
    expect(s.type).toBe('contrast');
    expect(s.warnings.some((w) => w.includes('未知の type'))).toBe(false);
  });
});

describe('contrast: 異常系（落ちないパーサー）', () => {
  it('```contrast ブロックが無い場合は警告して空データで描画継続', () => {
    const md = fm('<!-- slide: contrast -->\n## 見出しのみ');
    const s = parseSlideMarkdown(md).slides[0] as ContrastSlide;
    expect(s.type).toBe('contrast');
    expect(s.example).toBeUndefined();
    expect(s.verdict).toHaveLength(0);
    expect(s.warnings.some((w) => w.includes('contrast ブロック'))).toBe(true);
  });

  it('example が無い場合は警告し example は undefined', () => {
    const block = ['```contrast', 'verdict:', '  - { label: 強み, text: OK }', '```'].join('\n');
    const md = contrastMd(block);
    const s = parseSlideMarkdown(md).slides[0] as ContrastSlide;
    expect(s.example).toBeUndefined();
    expect(s.verdict).toHaveLength(1);
    expect(s.warnings.some((w) => w.includes('example がありません'))).toBe(true);
  });

  it('example.rows が空の場合は警告するが example 自体は残る', () => {
    const block = [
      '```contrast',
      'example:',
      '  title: タイトルのみ',
      'verdict:',
      '  - { label: X, text: Y }',
      '```',
    ].join('\n');
    const md = contrastMd(block);
    const s = parseSlideMarkdown(md).slides[0] as ContrastSlide;
    expect(s.example?.title).toBe('タイトルのみ');
    expect(s.example?.rows).toHaveLength(0);
    expect(s.warnings.some((w) => w.includes('example.rows が空'))).toBe(true);
  });

  it('verdict が空の場合は警告する', () => {
    const block = [
      '```contrast',
      'example:',
      '  rows:',
      '    - { tag: A, text: B }',
      '```',
    ].join('\n');
    const md = contrastMd(block);
    const s = parseSlideMarkdown(md).slides[0] as ContrastSlide;
    expect(s.verdict).toHaveLength(0);
    expect(s.warnings.some((w) => w.includes('verdict が空'))).toBe(true);
  });

  it('未知の tone 値は無視して警告し、tone は undefined になる', () => {
    const block = [
      '```contrast',
      'example:',
      '  rows:',
      '    - { tag: A, text: B }',
      'verdict:',
      '  - { label: X, text: Y, tone: neon }',
      '```',
    ].join('\n');
    const md = contrastMd(block);
    const s = parseSlideMarkdown(md).slides[0] as ContrastSlide;
    expect(s.verdict[0].tone).toBeUndefined();
    expect(s.warnings.some((w) => w.includes('tone "neon"'))).toBe(true);
  });

  it('不正な YAML でも落ちずに空データで継続する', () => {
    const block = ['```contrast', 'example: [', '```'].join('\n');
    const md = contrastMd(block);
    const s = parseSlideMarkdown(md).slides[0] as ContrastSlide;
    expect(s.type).toBe('contrast');
    expect(s.example).toBeUndefined();
    expect(s.verdict).toHaveLength(0);
  });
});

describe('contrast: 共通ヘッダ・tone: dark との併存', () => {
  it('tone: dark ディレクティブと lead/point が併用できる', () => {
    const md = fm(
      '<!-- slide: contrast, tone: dark -->\nbadge: WHY\nlead: 補足\n## 見出し\n' +
        FULL_BLOCK +
        '\npoint: ==重要==な帯',
    );
    const s = parseSlideMarkdown(md).slides[0] as ContrastSlide;
    expect(s.tone).toBe('dark');
    expect(s.lead).toBe('補足');
    expect(s.point).toBe('==重要==な帯');
  });
});
TESTEOF
  echo "[OK] contrast.test.ts"
fi

# ─────────────────────────────────────────────
# 検証
# ─────────────────────────────────────────────
echo ""
echo "=== 検証 ==="

echo -n "[CHECK] types.ts に 'contrast' (SlideType): "
grep -q "| 'contrast'" src/parser/types.ts && echo "OK" || echo "ERROR"

echo -n "[CHECK] types.ts に ContrastSlide interface: "
grep -q "export interface ContrastSlide" src/parser/types.ts && echo "OK" || echo "ERROR"

echo -n "[CHECK] types.ts の Slide union に ContrastSlide: "
grep -q "| ContrastSlide" src/parser/types.ts && echo "OK" || echo "ERROR"

echo -n "[CHECK] slideMarkdown.ts SLIDE_TYPES に 'contrast': "
grep -q "'contrast'," src/parser/slideMarkdown.ts && echo "OK" || echo "ERROR"

echo -n "[CHECK] slideMarkdown.ts に parseContrastSlide: "
grep -q "function parseContrastSlide" src/parser/slideMarkdown.ts && echo "OK" || echo "ERROR"

echo -n "[CHECK] slideMarkdown.ts dispatch に case 'contrast': "
grep -q "case 'contrast':" src/parser/slideMarkdown.ts && echo "OK" || echo "ERROR"

echo -n "[CHECK] SlideRenderer.tsx に ContrastView: "
grep -q "function ContrastView" src/components/slides/SlideRenderer.tsx && echo "OK" || echo "ERROR"

echo -n "[CHECK] SlideRenderer.tsx dispatch に case 'contrast': "
grep -q "case 'contrast':" src/components/slides/SlideRenderer.tsx && echo "OK" || echo "ERROR"

echo -n "[CHECK] contrast.css の存在: "
[ -f "src/theme/contrast.css" ] && echo "OK" || echo "ERROR"

echo -n "[CHECK] main.tsx に contrast.css の import: "
grep -q "theme/contrast.css" src/main.tsx && echo "OK" || echo "ERROR"

echo -n "[CHECK] contrast.test.ts の存在: "
[ -f "src/parser/contrast.test.ts" ] && echo "OK" || echo "ERROR"

echo -n "[CHECK] contrast.test.ts に実改行事故が無い（単一行の describe）: "
if grep -q "^describe('contrast: 正常系'" src/parser/contrast.test.ts; then
  echo "OK"
else
  echo "ERROR"
fi

echo ""
echo "=== 完了 ==="
echo "次のステップ:"
echo "  npx tsc --noEmit           # 型チェック"
echo "  npx vitest run             # 単体テスト（新規7件）"
echo "  npm run lint               # ESLint 0 errors"
echo "  npx prettier --write .     # 整形"
echo "  npm run dev                # sample.md に contrast 例を追加後、目視確認"
