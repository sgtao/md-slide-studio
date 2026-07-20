#!/usr/bin/env bash
# apply-v0.2.4.sh — deckLint.ts 実装（構造化デッキLINT導入）
# 冪等: 複数回実行しても安全。各ステップで [OK]/[SKIP]/[ERROR] を出力する。
set -uo pipefail

# 重要: このスクリプトはリポジトリの「ルート」で実行してください。
#   例: cd /path/to/md-slide-studio && bash .idea/apply-v0.2.4.sh
# 旧版は `cd "$(dirname "$0")"` によりスクリプト自身の置き場所（.idea/等）へ
# 移動してしまい、実行ディレクトリに関わらず誤った場所にファイルを作成するバグがあった。
# v2ではこれを廃止し、実行時のカレントディレクトリをそのままリポジトリルートとして扱う。
if [ ! -f "package.json" ] || [ ! -d "src/parser" ]; then
  echo "[ERROR] リポジトリルートで実行してください（package.json / src/parser が見つかりません）"
  echo "        現在のディレクトリ: $(pwd)"
  echo "        例: cd /path/to/md-slide-studio && bash .idea/apply-v0.2.4.sh"
  exit 1
fi

STATUS=0
ok()   { echo "[OK]    $1"; }
skip() { echo "[SKIP]  $1"; }
err()  { echo "[ERROR] $1"; STATUS=1; }

# ---------------------------------------------------------------------------
# 1) 新規ファイル: src/parser/deckLint.ts
# ---------------------------------------------------------------------------
DECKLINT=src/parser/deckLint.ts
if [ -f "$DECKLINT" ]; then
  skip "$DECKLINT は既に存在します"
else
  mkdir -p src/parser
  cat > "$DECKLINT" << 'DECKLINT_EOF'
/**
 * deckLint.ts — デッキ全体のルール検証（構文パーサーとは独立した設計レベルの検証）。
 * parseSlideMarkdown() が返す SlideDeck を受け取る純関数のみで構成する。
 * パーサー本体（slideMarkdown.ts）へは一切手を入れない。
 *
 * 論点A（スライド枚数の推奨閾値）の決定: 閾値はここにも一切持たせない（案1採用）。
 * 「3〜12枚推奨」等のハード/ソフト制約は、LLM支援側（draftAssistPrompt.ts）の
 * 目安としてのみ扱う。deckLint に枚数ルールを追加しないこと。
 */
import type { Slide, SlideDeck } from './types';

export type LintLevel = 'error' | 'warn' | 'info';

export interface LintResult {
  level: LintLevel;
  slideIndex?: number;
  rule: string;
  message: string;
}

/** deck.warnings（構造的エラー）を error として取り込む */
function lintDeckStructure(deck: SlideDeck): LintResult[] {
  return deck.warnings.map((message) => ({
    level: 'error' as const,
    rule: 'deck-structure',
    message,
  }));
}

/** 各スライドの既存 warnings を warn として取り込む */
function lintSlideWarnings(deck: SlideDeck): LintResult[] {
  const results: LintResult[] = [];
  deck.slides.forEach((slide, i) => {
    for (const message of slide.warnings) {
      results.push({ level: 'warn', slideIndex: i, rule: 'slide-parse', message });
    }
  });
  return results;
}

/** デッキ構成ルール：最終スライド sources／先頭スライド title */
function lintDeckComposition(deck: SlideDeck): LintResult[] {
  const results: LintResult[] = [];
  const { slides } = deck;
  if (slides.length === 0) return results;

  const last = slides[slides.length - 1];
  if (last.type !== 'sources') {
    results.push({
      level: 'warn',
      slideIndex: slides.length - 1,
      rule: 'sources-last',
      message: '最終スライドが sources（出典）ではありません（推奨: sources で終える）',
    });
  }

  if (slides[0].type !== 'title') {
    results.push({
      level: 'info',
      slideIndex: 0,
      rule: 'title-first',
      message: '先頭スライドが title ではありません（推奨: title で始める）',
    });
  }

  return results;
}

/** 個別type向けの追加ルール（contrast / steps / title split-image） */
function lintSlideRules(deck: SlideDeck): LintResult[] {
  const results: LintResult[] = [];

  deck.slides.forEach((slide: Slide, i) => {
    if (slide.type === 'contrast') {
      if (!slide.example) {
        results.push({
          level: 'error',
          slideIndex: i,
          rule: 'contrast-example-missing',
          message: 'contrast の example ブロックがありません',
        });
      }
      if (!slide.verdict || slide.verdict.length === 0) {
        results.push({
          level: 'warn',
          slideIndex: i,
          rule: 'contrast-verdict-missing',
          message: 'contrast の verdict ブロックがありません',
        });
      }
    }

    if (slide.type === 'steps' && slide.ratio && slide.ratio.length > 0) {
      const sum = slide.ratio.reduce((acc, r) => acc + r.value, 0);
      if (Math.round(sum) !== 100) {
        results.push({
          level: 'warn',
          slideIndex: i,
          rule: 'steps-ratio-sum',
          message: `ratio の合計が ${sum} です（自動正規化されますが、100 での記述を推奨）`,
        });
      }
    }

    if (slide.type === 'title' && slide.layout === 'split-image' && slide.image) {
      results.push({
        level: 'info',
        slideIndex: i,
        rule: 'split-image-cors',
        message: '外部画像を含むため、PNG/ZIP出力が失敗する可能性があります（CORS制約）',
      });
    }
  });

  return results;
}

export function lintDeck(deck: SlideDeck): LintResult[] {
  return [
    ...lintDeckStructure(deck),
    ...lintSlideWarnings(deck),
    ...lintDeckComposition(deck),
    ...lintSlideRules(deck),
  ];
}

export const LINT_LEVEL_ORDER: Record<LintLevel, number> = { error: 0, warn: 1, info: 2 };

export function sortLintResults(results: LintResult[]): LintResult[] {
  return [...results].sort((a, b) => LINT_LEVEL_ORDER[a.level] - LINT_LEVEL_ORDER[b.level]);
}
DECKLINT_EOF
  ok "$DECKLINT を作成しました"
fi

# ---------------------------------------------------------------------------
# 2) 新規ファイル: src/parser/deckLint.test.ts
# ---------------------------------------------------------------------------
DECKLINT_TEST=src/parser/deckLint.test.ts
if [ -f "$DECKLINT_TEST" ]; then
  skip "$DECKLINT_TEST は既に存在します"
else
  cat > "$DECKLINT_TEST" << 'TEST_EOF'
import { describe, it, expect } from 'vitest';
import { lintDeck } from './deckLint';
import type { Slide, SlideDeck } from './types';

function deck(slides: Slide[], warnings: string[] = []): SlideDeck {
  return { frontmatter: { title: 'T', palette: 'ocean' }, slides, warnings };
}

function slide(partial: Partial<Slide> & { type: Slide['type'] }): Slide {
  return { warnings: [], ...partial };
}

describe('lintDeck — 構成ルール', () => {
  it('title始まり・sources終わりの正常デッキは error/warn を出さない', () => {
    const d = deck([slide({ type: 'title' }), slide({ type: 'sources' })]);
    const results = lintDeck(d);
    expect(results.filter((r) => r.level === 'error' || r.level === 'warn')).toHaveLength(0);
  });

  it('最終スライドが sources でない場合 sources-last を warn で出す', () => {
    const d = deck([slide({ type: 'title' }), slide({ type: 'points' })]);
    const results = lintDeck(d);
    expect(results.some((r) => r.rule === 'sources-last' && r.level === 'warn')).toBe(true);
  });

  it('先頭スライドが title でない場合 title-first を info で出す', () => {
    const d = deck([slide({ type: 'points' }), slide({ type: 'sources' })]);
    const results = lintDeck(d);
    expect(results.some((r) => r.rule === 'title-first' && r.level === 'info')).toBe(true);
  });
});

describe('lintDeck — 枚数ルールを一切持たない（論点A: 案1確定の回帰防止）', () => {
  it('13枚のデッキでも枚数由来の LintResult を生成しない', () => {
    const slides: Slide[] = [
      slide({ type: 'title' }),
      ...Array.from({ length: 11 }, () => slide({ type: 'points' })),
      slide({ type: 'sources' }),
    ];
    const results = lintDeck(deck(slides));
    expect(results.some((r) => /枚/.test(r.message))).toBe(false);
  });
});

describe('lintDeck — contrast / steps / split-image', () => {
  it('contrast の example 欠落は error', () => {
    const d = deck([slide({ type: 'title' }), slide({ type: 'contrast' }), slide({ type: 'sources' })]);
    const results = lintDeck(d);
    expect(results.some((r) => r.rule === 'contrast-example-missing' && r.level === 'error')).toBe(
      true,
    );
  });

  it('contrast の verdict 欠落は warn', () => {
    const d = deck([
      slide({ type: 'title' }),
      slide({ type: 'contrast', example: { title: 'x', rows: [] } }),
      slide({ type: 'sources' }),
    ]);
    const results = lintDeck(d);
    expect(results.some((r) => r.rule === 'contrast-verdict-missing' && r.level === 'warn')).toBe(
      true,
    );
  });

  it('steps の ratio 合計が100以外なら warn', () => {
    const d = deck([
      slide({ type: 'title' }),
      slide({ type: 'steps', ratio: [{ label: 'a', value: 40 }, { label: 'b', value: 50 }] }),
      slide({ type: 'sources' }),
    ]);
    const results = lintDeck(d);
    expect(results.some((r) => r.rule === 'steps-ratio-sum' && r.level === 'warn')).toBe(true);
  });

  it('title split-image + 外部画像は split-image-cors を info で出す', () => {
    const d = deck([
      slide({ type: 'title', layout: 'split-image', image: 'https://example.com/a.jpg' }),
      slide({ type: 'sources' }),
    ]);
    const results = lintDeck(d);
    expect(results.some((r) => r.rule === 'split-image-cors' && r.level === 'info')).toBe(true);
  });
});

describe('lintDeck — 既存 warnings の引き継ぎ', () => {
  it('deck.warnings は error として引き継がれる', () => {
    const d = deck([slide({ type: 'title' }), slide({ type: 'sources' })], ['frontmatterが見つかりません']);
    const results = lintDeck(d);
    expect(results.some((r) => r.rule === 'deck-structure' && r.level === 'error')).toBe(true);
  });

  it('slide.warnings は warn として slideIndex 付きで引き継がれる', () => {
    const d = deck([slide({ type: 'title', warnings: ['未知のlayoutです'] }), slide({ type: 'sources' })]);
    const results = lintDeck(d);
    expect(
      results.some((r) => r.rule === 'slide-parse' && r.level === 'warn' && r.slideIndex === 0),
    ).toBe(true);
  });
});
TEST_EOF
  ok "$DECKLINT_TEST を作成しました"
fi

# ---------------------------------------------------------------------------
# 3) 新規ファイル: src/components/LintPanel.tsx
# ---------------------------------------------------------------------------
LINTPANEL=src/components/LintPanel.tsx
if [ -f "$LINTPANEL" ]; then
  skip "$LINTPANEL は既に存在します"
else
  mkdir -p src/components
  cat > "$LINTPANEL" << 'PANEL_EOF'
import type { LintResult } from '../parser/deckLint';
import { sortLintResults } from '../parser/deckLint';

const ICON: Record<LintResult['level'], string> = { error: '🔴', warn: '🟡', info: '🔵' };

export function LintPanel({
  results,
  onJump,
}: {
  results: LintResult[];
  onJump: (slideIndex: number) => void;
}) {
  if (results.length === 0) {
    return <div className="lint-panel lint-panel--empty">警告はありません ✅</div>;
  }
  const sorted = sortLintResults(results);
  return (
    <ul className="lint-panel">
      {sorted.map((r, i) => (
        <li key={i} className={`lint-item lint-item--${r.level}`}>
          <span className="lint-icon">{ICON[r.level]}</span>
          <span className="lint-message">{r.message}</span>
          {r.slideIndex !== undefined && (
            <button
              type="button"
              className="lint-jump"
              onClick={() => onJump(r.slideIndex as number)}
            >
              #{r.slideIndex + 1}へ
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
PANEL_EOF
  ok "$LINTPANEL を作成しました"
fi

# ---------------------------------------------------------------------------
# 4) 変更: src/parser/slideMarkdown.ts（12枚警告・sources警告を撤去）
# ---------------------------------------------------------------------------
SLIDE_MD=src/parser/slideMarkdown.ts
if [ -f "$SLIDE_MD" ]; then
  python3 << 'PYEOF'
import re, sys

path = "src/parser/slideMarkdown.ts"
with open(path, encoding="utf-8") as f:
    src = f.read()

marker_count = "if (slides.length > 12)"
marker_sources = "!== 'sources'"

if marker_count not in src and marker_sources not in src:
    print("[SKIP]  src/parser/slideMarkdown.ts は既に v0.2.4 適用済みです")
    sys.exit(0)

pattern = re.compile(
    r"\n\s*if \(slides\.length > 12\) \{\n.*?\n\s*\}\n"
    r"(\s*if \(slides\.length > 0 && slides\[slides\.length - 1\]\.type !== 'sources'\) \{\n.*?\n\s*\}\n)?",
    re.DOTALL,
)
new_src, n = pattern.subn("\n", src, count=1)

if n == 0:
    print("[ERROR] src/parser/slideMarkdown.ts: 想定パターンが見つかりませんでした（手動確認要）")
    sys.exit(1)

with open(path, "w", encoding="utf-8") as f:
    f.write(new_src)
print("[OK]    src/parser/slideMarkdown.ts から12枚警告・sources警告を撤去しました")
PYEOF
  RC=$?
  if [ $RC -ne 0 ]; then STATUS=1; fi
else
  err "$SLIDE_MD が見つかりません"
fi

# ---------------------------------------------------------------------------
# 5) 変更: src/parser/slideMarkdown.test.ts（sourcesテストをdeckLint.test.tsへ移設済みのため撤去）
# ---------------------------------------------------------------------------
SLIDE_MD_TEST=src/parser/slideMarkdown.test.ts
if [ -f "$SLIDE_MD_TEST" ]; then
  python3 << 'PYEOF'
import re, sys

path = "src/parser/slideMarkdown.test.ts"
with open(path, encoding="utf-8") as f:
    src = f.read()

needle = "最終スライドが sources でないと警告する"
if needle not in src:
    print("[SKIP]  src/parser/slideMarkdown.test.ts は既に v0.2.4 適用済みです")
    sys.exit(0)

pattern = re.compile(
    r"\s*it\('最終スライドが sources でないと警告する', \(\) => \{\n.*?\n\s*\}\);\n",
    re.DOTALL,
)
new_src, n = pattern.subn("\n", src, count=1)

if n == 0:
    print("[ERROR] src/parser/slideMarkdown.test.ts: 対象テストブロックが見つかりませんでした（手動確認要）")
    sys.exit(1)

with open(path, "w", encoding="utf-8") as f:
    f.write(new_src)
print("[OK]    src/parser/slideMarkdown.test.ts から sources テストを撤去しました（deckLint.test.ts へ移設済み）")
PYEOF
  RC=$?
  if [ $RC -ne 0 ]; then STATUS=1; fi
else
  skip "$SLIDE_MD_TEST が見つかりません（スキップ）"
fi

# ---------------------------------------------------------------------------
# 6) 変更: src/App.tsx（lintDeck呼び出しを追加）
#    ※ LintPanel の実際の描画差し込み位置は既存UI構造に依存するため、
#      ここでは「lintResults の計算」までを自動適用し、JSXへの組み込みは
#      手動確認ポイントとして明示する（不正確なJSX差し込みによる破壊を避けるため）。
# ---------------------------------------------------------------------------
APP_TSX=src/App.tsx
if [ -f "$APP_TSX" ]; then
  python3 << 'PYEOF'
import sys

path = "src/App.tsx"
with open(path, encoding="utf-8") as f:
    src = f.read()

import_marker = "import { parseSlideMarkdown } from './parser/slideMarkdown';"
new_import = (
    "import { parseSlideMarkdown } from './parser/slideMarkdown';\n"
    "import { lintDeck } from './parser/deckLint';\n"
    "import { LintPanel } from './components/LintPanel';"
)

deck_marker = "const deck = useMemo(() => parseSlideMarkdown(debouncedMd), [debouncedMd]);"
new_deck_block = (
    "const deck = useMemo(() => parseSlideMarkdown(debouncedMd), [debouncedMd]);\n"
    "  const lintResults = useMemo(() => lintDeck(deck), [deck]);"
)

changed = False

if "from './parser/deckLint'" not in src:
    if import_marker not in src:
        print("[ERROR] src/App.tsx: import アンカーが見つかりませんでした（手動確認要）")
        sys.exit(1)
    src = src.replace(import_marker, new_import, 1)
    changed = True
else:
    print("[SKIP]  src/App.tsx: deckLint の import は既に追加済みです")

if "lintDeck(deck)" not in src:
    if deck_marker not in src:
        print("[ERROR] src/App.tsx: deck useMemo アンカーが見つかりませんでした（手動確認要）")
        sys.exit(1)
    src = src.replace(deck_marker, new_deck_block, 1)
    changed = True
else:
    print("[SKIP]  src/App.tsx: lintResults の計算は既に追加済みです")

if changed:
    with open(path, "w", encoding="utf-8") as f:
        f.write(src)
    print("[OK]    src/App.tsx に lintDeck/LintPanel の import と lintResults 計算を追加しました")
    print("[NOTE]  <LintPanel results={lintResults} onJump={...} /> のJSX組み込みは")
    print("        既存の警告表示箇所を確認のうえ手動で差し替えてください（自動適用対象外）")
PYEOF
  RC=$?
  if [ $RC -ne 0 ]; then STATUS=1; fi
else
  err "$APP_TSX が見つかりません"
fi

# ---------------------------------------------------------------------------
# 7) 変更: src/theme/app.css（.lint-panel系セレクタを末尾追加）
# ---------------------------------------------------------------------------
APP_CSS=src/theme/app.css
if [ -f "$APP_CSS" ]; then
  if grep -q "lint-panel" "$APP_CSS"; then
    skip "$APP_CSS には既に .lint-panel 系セレクタがあります"
  else
    cat >> "$APP_CSS" << 'CSS_EOF'

/* v0.2.4: deckLint 警告パネル */
.lint-panel {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lint-panel--empty {
  color: var(--text-secondary);
  font-size: 0.8rem;
}
.lint-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  padding: 4px 6px;
  border-radius: 4px;
}
.lint-item--error { background: rgba(220, 38, 38, 0.08); }
.lint-item--warn { background: rgba(217, 119, 6, 0.08); }
.lint-item--info { background: rgba(37, 99, 235, 0.08); }
.lint-message { flex: 1; }
.lint-jump {
  border: 1px solid var(--border);
  background: var(--bg-surface);
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 0.72rem;
  cursor: pointer;
}
CSS_EOF
    ok "$APP_CSS に .lint-panel 系セレクタを追加しました"
  fi
else
  err "$APP_CSS が見つかりません"
fi

# ---------------------------------------------------------------------------
# 8) 変更: CHANGELOG.md（v0.2.4セクションを先頭に追加）
# ---------------------------------------------------------------------------
CHANGELOG=CHANGELOG.md
if [ -f "$CHANGELOG" ]; then
  if grep -q "## \[v0.2.4\]" "$CHANGELOG"; then
    skip "$CHANGELOG には既に v0.2.4 セクションがあります"
  else
    python3 << 'PYEOF'
path = "CHANGELOG.md"
with open(path, encoding="utf-8") as f:
    src = f.read()

entry = """## [v0.2.4] - 2026-07-15

### 追加｜デッキレベルLINT（deckLint.ts）
- `lintDeck(deck): LintResult[]` を新設。error/warn/info の重要度・対象スライド番号・
  ルールIDを持つ構造化警告に刷新
- ルール: 最終スライドsources推奨／先頭スライドtitle推奨／contrastのexample・verdict欠落／
  stepsのratio合計／title split-imageの外部画像CORS info
- 警告パネル（LintPanel）でアイコン表示＋クリックで該当スライドへジャンプ

### 変更｜スライド枚数の推奨閾値を撤去
- `slideMarkdown.ts` の「12枚超で警告」「最終スライドsourcesでない」ロジックを撤去
  （後者はdeckLintへ移設。前者は完全撤去し、LLM支援側の目安としてのみ残す）

### ファイル構成の変更
```
新規:
  src/parser/deckLint.ts
  src/parser/deckLint.test.ts
  src/components/LintPanel.tsx
変更:
  src/parser/slideMarkdown.ts
  src/parser/slideMarkdown.test.ts
  src/App.tsx
  src/theme/app.css
```

"""

marker = "# Changelog\n"
if marker in src:
    idx = src.index(marker) + len(marker)
    new_src = src[:idx] + "\n" + entry + src[idx:]
else:
    new_src = entry + src

with open(path, "w", encoding="utf-8") as f:
    f.write(new_src)
print("[OK]    CHANGELOG.md に v0.2.4 セクションを追加しました")
PYEOF
  fi
else
  err "$CHANGELOG が見つかりません"
fi

# ---------------------------------------------------------------------------
# 検証セクション
# ---------------------------------------------------------------------------
echo ""
echo "===== 検証 ====="
grep -q "export function lintDeck" src/parser/deckLint.ts 2>/dev/null && ok "deckLint.ts: lintDeck export 確認" || err "deckLint.ts: lintDeck export 未検出"
grep -q "export function LintPanel" src/components/LintPanel.tsx 2>/dev/null && ok "LintPanel.tsx: export 確認" || err "LintPanel.tsx: export 未検出"
grep -q "slides.length > 12" src/parser/slideMarkdown.ts 2>/dev/null && err "slideMarkdown.ts: 12枚警告が残存しています" || ok "slideMarkdown.ts: 12枚警告の撤去を確認"
grep -q "!== 'sources'" src/parser/slideMarkdown.ts 2>/dev/null && err "slideMarkdown.ts: sources警告が残存しています" || ok "slideMarkdown.ts: sources警告の撤去を確認"
grep -q "lintDeck(deck)" src/App.tsx 2>/dev/null && ok "App.tsx: lintResults 計算を確認" || err "App.tsx: lintResults 計算が未検出"
grep -q "lint-panel" src/theme/app.css 2>/dev/null && ok "app.css: .lint-panel セレクタを確認" || err "app.css: .lint-panel セレクタが未検出"
grep -q "\[v0.2.4\]" CHANGELOG.md 2>/dev/null && ok "CHANGELOG.md: v0.2.4 セクションを確認" || err "CHANGELOG.md: v0.2.4 セクションが未検出"

echo ""
if [ $STATUS -eq 0 ]; then
  echo "===== すべて成功 ====="
else
  echo "===== エラーあり（上記 [ERROR] を確認してください） ====="
fi
exit $STATUS
