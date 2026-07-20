#!/usr/bin/env bash
# apply-v0.2.5.sh — sample.md 統合デッキ実装。
# 決定事項（0715-15_handoff）を反映:
#   B: sample.md を統合版で置き換える（別名併存はしない）
#   C: 物語性を優先し、全type網羅は「参考」として後半に配置
#   D: 異常系・境界値のデモは含めない（Vitestで担保済みのため）
#   A: 枚数制約は設けない
#
# 実装方針: 既存 sample.md（v0.2.3時点で13枚・物語として完成済み）を活かし、
# 全文置換ではなく「contrast の直後・sources の直前」に
# 不足typeの参考セクション（title split-image / chart-line / diagram-layer /
# diagram-cycle / figure）と summary スライドを挿入する形で統合する。
# 冪等: 複数回実行しても安全。
set -uo pipefail

if [ ! -f "package.json" ] || [ ! -d "src/parser" ]; then
  echo "[ERROR] リポジトリルートで実行してください（package.json / src/parser が見つかりません）"
  echo "        現在のディレクトリ: $(pwd)"
  exit 1
fi

STATUS=0
ok()   { echo "[OK]    $1"; }
skip() { echo "[SKIP]  $1"; }
err()  { echo "[ERROR] $1"; STATUS=1; }

SAMPLE=src/samples/sample.md
if [ ! -f "$SAMPLE" ]; then
  err "$SAMPLE が見つかりません"
  exit 1
fi

python3 << 'PYEOF'
import sys

path = "src/samples/sample.md"
with open(path, encoding="utf-8") as f:
    src = f.read()

MARK = "<!-- slide: diagram-layer -->"
if MARK in src:
    print("[SKIP]  src/samples/sample.md は既に v0.2.5 の参考セクションを含んでいます")
    sys.exit(0)

# 1) badges の更新（v0.2.1固定表記 → 統合サンプルであることを明示）
old_badges = "badges: [v0.2.1, React + TypeScript, websearch-slide-ja 移植]"
new_badges = "badges: [全16type網羅サンプル, React + TypeScript, websearch-slide-ja 移植]"
if old_badges not in src:
    print("[ERROR] sample.md: title の badges 行が見つかりませんでした（手動確認要）")
    sys.exit(1)
src = src.replace(old_badges, new_badges, 1)

# 2) 対応スライドtype一覧テーブルに comparison-chart / contrast の行を追加
old_table_row = "| figure / feature-showcase / sources | 画像・機能紹介・出典 | 専用記法 |"
new_table_row = (
    "| figure / feature-showcase / sources | 画像・機能紹介・出典 | 専用記法 |\n"
    "| comparison-chart / ==contrast== | 比較・対比構造 | 専用記法 |"
)
if old_table_row not in src:
    print("[ERROR] sample.md: type一覧テーブルの figure 行が見つかりませんでした（手動確認要）")
    sys.exit(1)
src = src.replace(old_table_row, new_table_row, 1)

# 3) contrast スライドの直後・sources スライドの直前に「参考」セクションを挿入
anchor = """---
<!-- slide: sources -->"""

reference_section = """---
<!-- slide: title, layout: split-image, tone: dark -->
# 参考｜==記法リファレンス==
subtitle: ここから先は、残りのtype・layoutバリアントの記法サンプルです
image: https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg
---
<!-- slide: chart-line -->
## 折れ線グラフ（chart-line）
```chart
type: line
title: 月次アクティブユーザー数（例示データ）
unit: 人
data:
  - { label: 1月, value: 120 }
  - { label: 2月, value: 180 }
  - { label: 3月, value: 260 }
  - { label: 4月, value: 340 }
source: { name: 社内ダッシュボード（例）, url: https://example.com }
```
---
<!-- slide: diagram-layer -->
## レイヤー図（diagram-layer）
```diagram
type: layer
nodes: [[プレゼンテーション層], [アプリケーション層], [データアクセス層], [データベース]]
```
---
<!-- slide: diagram-cycle -->
## サイクル図（diagram-cycle）
```diagram
type: cycle
nodes: [計画, 実装, 計測, 改善]
```
---
<!-- slide: figure -->
## 図版と出典（figure）
![猫の写真（例示画像）](https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg)
source: [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Cat03.jpg)
---
<!-- slide: summary, layout: compact -->
## まとめ
1. **MDが唯一の情報源**：HTMLを直接編集しない
2. **崩れないパーサー**：未知の値も警告付きでフォールバックする
3. **PDF/PNG/ZIPでそのまま共有**：エクスポートまで一貫している
"""

if anchor not in src:
    print("[ERROR] sample.md: sources スライドの直前アンカーが見つかりませんでした（手動確認要）")
    sys.exit(1)
src = src.replace(anchor, reference_section + anchor, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)
print("[OK]    src/samples/sample.md に参考セクション（title split-image / chart-line /")
print("        diagram-layer / diagram-cycle / figure / summary）を追加しました")
PYEOF
RC=$?
if [ $RC -ne 0 ]; then STATUS=1; fi

# ---------------------------------------------------------------------------
# 新規: src/samples/sample.test.ts（統合デッキが lintDeck で error 0件であることの回帰テスト）
# ---------------------------------------------------------------------------
SAMPLE_TEST=src/samples/sample.test.ts
if [ -f "$SAMPLE_TEST" ]; then
  skip "$SAMPLE_TEST は既に存在します"
else
  cat > "$SAMPLE_TEST" << 'TEST_EOF'
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseSlideMarkdown } from '../parser/slideMarkdown';
import { lintDeck } from '../parser/deckLint';

const samplePath = fileURLToPath(new URL('./sample.md', import.meta.url));
const sampleMd = readFileSync(samplePath, 'utf-8');

describe('sample.md（v0.2.5 統合デッキ）', () => {
  it('lintDeck の結果に error が1件も無い', () => {
    const deck = parseSlideMarkdown(sampleMd);
    const results = lintDeck(deck);
    const errors = results.filter((r) => r.level === 'error');
    expect(errors).toEqual([]);
  });

  it('先頭スライドは title、最終スライドは sources', () => {
    const deck = parseSlideMarkdown(sampleMd);
    expect(deck.slides[0].type).toBe('title');
    expect(deck.slides[deck.slides.length - 1].type).toBe('sources');
  });

  it('全16 type が最低1回は登場する', () => {
    const deck = parseSlideMarkdown(sampleMd);
    const types = new Set(deck.slides.map((s) => s.type));
    const expected = [
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
      'contrast',
      'sources',
    ];
    for (const t of expected) {
      expect(types.has(t), `type "${t}" が sample.md に含まれていません`).toBe(true);
    }
  });
});
TEST_EOF
  ok "$SAMPLE_TEST を作成しました"
fi

echo ""
echo "===== 検証 ====="
grep -q "diagram-layer" "$SAMPLE" 2>/dev/null && ok "sample.md: diagram-layer セクションを確認" || err "sample.md: diagram-layer が見つかりません"
grep -q "diagram-cycle" "$SAMPLE" 2>/dev/null && ok "sample.md: diagram-cycle セクションを確認" || err "sample.md: diagram-cycle が見つかりません"
grep -q "chart-line" "$SAMPLE" 2>/dev/null && ok "sample.md: chart-line セクションを確認" || err "sample.md: chart-line が見つかりません"
grep -q "slide: figure" "$SAMPLE" 2>/dev/null && ok "sample.md: figure セクションを確認" || err "sample.md: figure が見つかりません"
grep -q "slide: summary" "$SAMPLE" 2>/dev/null && ok "sample.md: summary セクションを確認" || err "sample.md: summary が見つかりません"
grep -q "layout: split-image" "$SAMPLE" 2>/dev/null && ok "sample.md: title split-image セクションを確認" || err "sample.md: split-image が見つかりません"
tail -5 "$SAMPLE" | grep -q "MD Slide Studio リポジトリ" && ok "sample.md: sources が最終スライドのまま維持されている" || err "sample.md: sources が末尾にありません"

echo ""
if [ $STATUS -eq 0 ]; then
  echo "===== すべて成功 ====="
else
  echo "===== エラーあり（上記 [ERROR] を確認してください） ====="
fi
exit $STATUS
