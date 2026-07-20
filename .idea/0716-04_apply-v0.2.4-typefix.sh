#!/usr/bin/env bash
# apply-v0.2.4-typefix.sh
#
# 目的: v0.2.4 デプロイ失敗（tsc -b の型エラー）の修正パッチ
#   1. src/parser/deckLint.test.ts: slide() ヘルパーを判別共用体対応に変更
#   2. src/samples/sample.test.ts: expected 配列に as const を付与
#   3. package.json: typecheck / verify スクリプトを追加（再発防止）
#
# 使い方: リポジトリのルートで実行してください
#   bash apply-v0.2.4-typefix.sh
#
# 冪等性: 既にパッチ済みの箇所は [SKIP] を表示してスキップします。
set -euo pipefail

REPO_ROOT="$(pwd)"
DECKLINT_TEST="${REPO_ROOT}/src/parser/deckLint.test.ts"
SAMPLE_TEST="${REPO_ROOT}/src/samples/sample.test.ts"
PACKAGE_JSON="${REPO_ROOT}/package.json"

for f in "$DECKLINT_TEST" "$SAMPLE_TEST" "$PACKAGE_JSON"; do
  if [ ! -f "$f" ]; then
    echo "[ERROR] ファイルが見つかりません: $f"
    exit 1
  fi
done

python3 << 'PYEOF'
import io
import json
import sys

def read(path):
    with io.open(path, "r", encoding="utf-8") as fh:
        return fh.read()

def write(path, text):
    with io.open(path, "w", encoding="utf-8") as fh:
        fh.write(text)

results = []

# ─────────────────────────────────────────────
# 1. deckLint.test.ts: slide() ヘルパー修正
# ─────────────────────────────────────────────
decklint_path = "src/parser/deckLint.test.ts"
text = read(decklint_path)

old_slide_fn = (
    "function slide(partial: Partial<Slide> & { type: Slide['type'] }): Slide {\n"
    "  return { warnings: [], ...partial };\n"
    "}"
)
new_slide_fn = (
    "// テスト用スタブファクトリ。T ごとに Extract<Slide, {type: T}> の\n"
    "// 専用フィールド（example / ratio / image 等）を型として認識できるようにする。\n"
    "// 戻り値の Slide は意図的に不完全なスタブのため as で明示的にキャストする。\n"
    "function slide<T extends Slide['type']>(\n"
    "  partial: Partial<Extract<Slide, { type: T }>> & { type: T },\n"
    "): Slide {\n"
    "  return { warnings: [], ...partial } as Slide;\n"
    "}"
)

if new_slide_fn in text:
    results.append(("[SKIP]", decklint_path, "slide() は既にパッチ適用済み"))
elif old_slide_fn in text:
    text = text.replace(old_slide_fn, new_slide_fn, 1)
    write(decklint_path, text)
    results.append(("[OK]", decklint_path, "slide() を判別共用体対応に変更"))
else:
    results.append(("[ERROR]", decklint_path, "slide() のアンカーが見つかりません。手動確認が必要です"))

# ─────────────────────────────────────────────
# 2. sample.test.ts: expected 配列に as const
# ─────────────────────────────────────────────
sample_path = "src/samples/sample.test.ts"
text = read(sample_path)

old_expected = (
    "    const expected = [\n"
    "      'title',\n"
    "      'points',\n"
    "      'summary',\n"
    "      'table',\n"
    "      'chart-bar',\n"
    "      'chart-line',\n"
    "      'chart-donut',\n"
    "      'comparison-chart',\n"
    "      'diagram-flow',\n"
    "      'diagram-layer',\n"
    "      'diagram-cycle',\n"
    "      'diagram-timeline',\n"
    "      'figure',\n"
    "      'feature-showcase',\n"
    "      'steps',\n"
    "      'contrast',\n"
    "      'sources',\n"
    "    ];"
)
new_expected = (
    "    const expected = [\n"
    "      'title',\n"
    "      'points',\n"
    "      'summary',\n"
    "      'table',\n"
    "      'chart-bar',\n"
    "      'chart-line',\n"
    "      'chart-donut',\n"
    "      'comparison-chart',\n"
    "      'diagram-flow',\n"
    "      'diagram-layer',\n"
    "      'diagram-cycle',\n"
    "      'diagram-timeline',\n"
    "      'figure',\n"
    "      'feature-showcase',\n"
    "      'steps',\n"
    "      'contrast',\n"
    "      'sources',\n"
    "    ] as const;"
)

if new_expected in text:
    results.append(("[SKIP]", sample_path, "expected は既に as const 適用済み"))
elif old_expected in text:
    text = text.replace(old_expected, new_expected, 1)
    write(sample_path, text)
    results.append(("[OK]", sample_path, "expected 配列に as const を付与"))
else:
    results.append(("[ERROR]", sample_path, "expected のアンカーが見つかりません。手動確認が必要です"))

# ─────────────────────────────────────────────
# 3. package.json: typecheck / verify スクリプト追加
# ─────────────────────────────────────────────
pkg_path = "package.json"
text = read(pkg_path)
data = json.loads(text)

changed = False
if "typecheck" not in data.get("scripts", {}):
    data["scripts"]["typecheck"] = "tsc -b --noEmit"
    changed = True
if "verify" not in data.get("scripts", {}):
    data["scripts"]["verify"] = "npm run typecheck && npm test && npm run lint && npm run test:e2e"
    changed = True

if changed:
    write(pkg_path, json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    results.append(("[OK]", pkg_path, "typecheck / verify スクリプトを追加"))
else:
    results.append(("[SKIP]", pkg_path, "typecheck / verify は既に存在"))

for status, path, msg in results:
    print(f"{status} {path}: {msg}")

if any(status == "[ERROR]" for status, _, _ in results):
    sys.exit(1)
PYEOF

echo ""
echo "── 検証 ─────────────────────────────────────"

echo "[1] deckLint.test.ts の slide() シグネチャ確認:"
grep -n "function slide<T extends Slide\['type'\]>" src/parser/deckLint.test.ts \
  && echo "  → OK" || echo "  → 見つかりません（要確認）"

echo "[2] sample.test.ts の as const 確認:"
grep -n "] as const;" src/samples/sample.test.ts \
  && echo "  → OK" || echo "  → 見つかりません（要確認）"

echo "[3] package.json の typecheck / verify 確認:"
grep -n '"typecheck"' package.json && echo "  → OK" || echo "  → 見つかりません（要確認）"
grep -n '"verify"' package.json && echo "  → OK" || echo "  → 見つかりません（要確認）"

echo ""
echo "── 次のステップ ─────────────────────────────"
echo "  npm run typecheck   # tsc -b --noEmit のみ実行し、まず型エラーが消えたか確認"
echo "  npm run verify      # typecheck + test + lint + e2e を一括実行"
