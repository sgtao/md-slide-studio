#!/usr/bin/env bash
# apply-v0.2.4b-wire-lintpanel.sh — App.tsx の警告表示を LintPanel へ差し替え。
# v0.2.4本体パッチ（apply-v0.2.4.sh, 2026-07-15版）を既に適用済みのリポジトリに対して実行する。
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

APP_TSX=src/App.tsx
if [ ! -f "$APP_TSX" ]; then
  err "$APP_TSX が見つかりません"
  exit 1
fi

python3 << 'PYEOF'
import sys

path = "src/App.tsx"
with open(path, encoding="utf-8") as f:
    src = f.read()

if "<LintPanel" in src:
    print("[SKIP]  src/App.tsx は既に LintPanel を組み込み済みです")
    sys.exit(0)

# 1) allWarnings の宣言ブロックを削除（lintResults に置き換わるため不要）
old_all_warnings = """  const allWarnings = [
    ...deck.warnings,
    ...deck.slides.flatMap((s, i) => s.warnings.map((w) => `Slide ${i + 1}: ${w}`)),
  ];

"""
if old_all_warnings not in src:
    print("[ERROR] src/App.tsx: allWarnings 宣言ブロックが見つかりませんでした（手動確認要）")
    sys.exit(1)
src = src.replace(old_all_warnings, "", 1)

# 2) 警告パネルのJSXを LintPanel に差し替え
old_panel = """            {allWarnings.length > 0 && (
              <div className="warnings-panel">
                {allWarnings.map((w, i) => (
                  <div key={i} className="warn-item">
                    {w}
                  </div>
                ))}
              </div>
            )}"""
new_panel = """            {lintResults.length > 0 && (
              <LintPanel
                results={lintResults}
                onJump={(i) => {
                  setCurrent(i);
                  setView('hero');
                }}
              />
            )}"""
if old_panel not in src:
    print("[ERROR] src/App.tsx: 警告パネルJSXが見つかりませんでした（手動確認要）")
    sys.exit(1)
src = src.replace(old_panel, new_panel, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)
print("[OK]    src/App.tsx: allWarnings を撤去し、警告表示を LintPanel に差し替えました")
PYEOF
RC=$?
if [ $RC -ne 0 ]; then STATUS=1; fi

echo ""
echo "===== 検証 ====="
grep -q "allWarnings" "$APP_TSX" 2>/dev/null && err "App.tsx: allWarnings がまだ残っています" || ok "App.tsx: allWarnings の撤去を確認"
grep -q "<LintPanel" "$APP_TSX" 2>/dev/null && ok "App.tsx: <LintPanel /> の組み込みを確認" || err "App.tsx: <LintPanel /> が見つかりません"
grep -q "warnings-panel" "$APP_TSX" 2>/dev/null && err "App.tsx: 旧 warnings-panel のJSXが残っています" || ok "App.tsx: 旧 warnings-panel JSXの撤去を確認"

echo ""
echo "[NOTE]  src/theme/app.css の .warnings-panel / .warn-item セレクタは"
echo "        未使用になりますが、削除は任意です（残しても動作に影響しません）"

if [ $STATUS -eq 0 ]; then
  echo ""
  echo "===== すべて成功 ====="
else
  echo ""
  echo "===== エラーあり（上記 [ERROR] を確認してください） ====="
fi
exit $STATUS
