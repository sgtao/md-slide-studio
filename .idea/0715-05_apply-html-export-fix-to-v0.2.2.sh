#!/usr/bin/env bash
# =============================================================================
# apply-html-export-fix.sh — 「HTMLとして保存」の表示不具合（sectionが表示されない）を修正
#
# 原因: list-view.css の一覧表示ルールはすべて body[data-view='list'] を起点に
#       しているが、apply-html-export.sh で生成した exportHtml() は
#       <html> にしか data-view="list" を付けておらず、<body> に無いため
#       list表示用CSSが一切発火せず全スライドが非表示になっていた。
#
# 本スクリプトが変更する既存ファイル（1ファイル）:
#   src/export/exporters.ts
#     - buildStandaloneHtml() の <body> タグに data-view="list" を追加
#
# 前提: apply-html-export.sh 適用済みの状態に対して実行。
# Usage: bash scripts/apply-html-export-fix.sh
# 冪等 : 適用済みは [SKIP]。 Exit: 0=OK/SKIP / 1=ERROR（アンカー不一致）
# =============================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)"
S="${ROOT}"
EXPORTERS="${S}/src/export/exporters.ts"
[[ -f "${EXPORTERS}" ]] || { echo "[ERROR] ${EXPORTERS} が見つかりません" >&2; exit 1; }

echo "=================================================="
echo " apply-html-export-fix.sh — HTMLエクスポート表示不具合の修正"
echo " ROOT: ${ROOT}"
echo "=================================================="

python3 - "${EXPORTERS}" <<'PYEOF'
import io, sys
PATH = sys.argv[1]

def load(p):
    with io.open(p, encoding="utf-8") as f: return f.read()

def save(p, t):
    with io.open(p, "w", encoding="utf-8") as f: f.write(t)

OLD = """<body>
${clone.outerHTML}
</body>"""
NEW = """<body data-view="list">
${clone.outerHTML}
</body>"""
MARKER = '<body data-view="list">'

t = load(PATH)
if MARKER in t:
    print("  [SKIP] exporters.ts: <body data-view=\"list\">（適用済み）")
    sys.exit(0)
if OLD not in t:
    print(f"  [ERROR] exporters.ts: アンカー不一致（手動確認が必要）")
    sys.exit(1)
save(PATH, t.replace(OLD, NEW, 1))
print("  [OK]   exporters.ts: <body> に data-view=\"list\" を追加")
sys.exit(0)
PYEOF
PY_STATUS=$?

echo ""
echo "[検証]"
V=0
grep -q '<body data-view="list">' "$EXPORTERS" && echo "  [PASS] body タグに data-view=\"list\" が付与されている" || { echo "  [FAIL] body タグ"; V=$((V+1)); }
grep -q 'data-view="list" data-theme=' "$EXPORTERS" && echo "  [PASS] html タグの data-view はそのまま保持" || { echo "  [FAIL] html タグ"; V=$((V+1)); }
grep -q "export function exportHtml" "$EXPORTERS" && echo "  [PASS] exportHtml() 本体は無傷" || { echo "  [FAIL] exportHtml() が消えた"; V=$((V+1)); }

echo ""
if [[ "$PY_STATUS" -eq 0 && "$V" -eq 0 ]]; then
  echo "=================================================="
  echo " ✅ 修正完了"
  echo "=================================================="
  echo ""
  echo " 次のステップ:"
  echo "   1. npm run dev で再度「🌐 HTMLとして保存」を実行"
  echo "   2. ダウンロードした .html を開き、DevTools Elements で"
  echo "      <body data-view=\"list\"> になっていることを確認"
  echo "   3. 全スライドが縦スクロールで表示されることを確認"
  echo "   4. npx tsc --noEmit"
  exit 0
else
  echo " ❌ 問題あり（PY=$PY_STATUS / VERIFY=$V）"
  exit 1
fi
