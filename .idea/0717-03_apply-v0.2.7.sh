#!/usr/bin/env bash
# apply-v0.2.7-fix.sh — テンプレート挿入機能の改善（v0.2.7フォローアップ）
#
# 内容: src/App.tsx の insertSnippet を以下の2点で改善する。
#   1. 挿入位置の次の文字が改行以外のときは、テンプレ末尾に改行を1つ補って挿入する
#      （既存行の続きにテンプレ本文がくっついてしまうのを防ぐ）
#   2. テンプレ挿入後、カーソル位置だけでなくスクロール位置（scrollTop）も
#      挿入箇所へ明示的に復元する
#      （textarea.value の書き換えでブラウザがスクロール位置を先頭へリセットするため、
#      setSelectionRange だけでは見た目上「1行目に戻る」現象が起きていた）
#
# 前提: v0.2.7（apply-v0.2.7.sh）適用済みであること。
# 実行方法: リポジトリルートで bash /path/to/apply-v0.2.7-fix.sh
# 冪等: 複数回実行しても2回目以降は [SKIP] になる。

set -euo pipefail

APP_FILE="src/App.tsx"

if [ ! -f "$APP_FILE" ]; then
  echo "[ERROR] $APP_FILE が見つかりません。リポジトリルートで実行しているか確認してください。"
  exit 1
fi

python3 << 'PYEOF'
import sys

path = "src/App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

NEW_MARKER = "needsNewline"
if NEW_MARKER in content:
    print("[SKIP] App.tsx はすでに本フィックス適用済みです")
    sys.exit(0)

OLD_BLOCK = """  const insertSnippet = useCallback((snippet: string) => {
    const el = textareaRef.current;
    if (!el) {
      setMd((prev) => prev + snippet);
      return;
    }
    const pos = el.selectionStart ?? el.value.length;
    setMd((prev) => prev.slice(0, pos) + snippet + prev.slice(pos));
    // カーソルを挿入後の位置へ復元（DOM更新後の次tickで実行）
    requestAnimationFrame(() => {
      const newPos = pos + snippet.length;
      el.focus();
      el.setSelectionRange(newPos, newPos);
    });
  }, []);"""

if OLD_BLOCK not in content:
    print("[ERROR] App.tsx に想定するinsertSnippetの旧実装（v0.2.7適用時のもの）が見つかりません。")
    print("        先にv0.2.7（apply-v0.2.7.sh）が適用済みか、手動で改変されていないか確認してください。")
    sys.exit(1)

NEW_BLOCK = """  const insertSnippet = useCallback((snippet: string) => {
    const el = textareaRef.current;
    let newPos = 0;
    setMd((prev) => {
      const pos = el?.selectionStart ?? prev.length;
      const nextChar = prev.charAt(pos);
      // 挿入位置の次の文字がすでに改行（または文末）でなければ、テンプレ末尾に改行を補う。
      // 既存行にテンプレ本文が連結されてMarkdownの区切りが崩れるのを防ぐ。
      const needsNewline = nextChar !== '' && nextChar !== '\\n';
      const insertText = needsNewline ? `${snippet}\\n` : snippet;
      newPos = pos + snippet.length;
      return prev.slice(0, pos) + insertText + prev.slice(pos);
    });
    // カーソル位置とスクロール位置を、挿入した箇所へ復元する（DOM更新後の次フレームで実行）。
    // textarea.value を書き換えるとブラウザは既定でスクロール位置を先頭へリセットするため、
    // setSelectionRange だけでなく scrollTop も行数から明示的に計算し直す。
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(newPos, newPos);
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 18;
      const linesBefore = el.value.slice(0, newPos).split('\\n').length - 1;
      el.scrollTop = Math.max(0, linesBefore * lineHeight - el.clientHeight / 2);
    });
  }, []);"""

content = content.replace(OLD_BLOCK, NEW_BLOCK, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] App.tsx の insertSnippet を更新しました")
PYEOF

echo ""
echo "=== 検証 ==="
grep -q "needsNewline" "$APP_FILE" && echo "[OK] 改行補完ロジックあり" || echo "[ERROR] 見つかりません"
grep -q "el.scrollTop" "$APP_FILE" && echo "[OK] scrollTop復元ロジックあり" || echo "[ERROR] 見つかりません"
