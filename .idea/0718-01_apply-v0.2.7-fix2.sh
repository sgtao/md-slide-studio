#!/usr/bin/env bash
# apply-v0.2.7-fix2.sh — テンプレート挿入機能の追加修正（v0.2.7フォローアップ2）
#
# 内容:
#   1. src/App.tsx: textareaが一度もフォーカスされていない状態でテンプレート挿入すると
#      selectionStart が既定値の0を返し、frontmatterの直前に挿入されてしまうバグを修正。
#      「一度でもフォーカスされたか」をrefで追跡し、フォーカス実績が無い場合は
#      常に末尾へ追記する（当初の仕様どおり）。
#   2. e2e/templates.spec.ts をPrettier整形済みの内容で上書き
#      （`npx prettier --check .` で warn が出ていたため）。
#
# 前提: v0.2.7（apply-v0.2.7.sh）・v0.2.7フォローアップ（apply-v0.2.7-fix.sh）適用済みであること。
# 実行方法: リポジトリルートで bash /path/to/apply-v0.2.7-fix2.sh
# 冪等: 複数回実行しても2回目以降は [SKIP] になる。

set -euo pipefail

APP_FILE="src/App.tsx"
E2E_FILE="e2e/templates.spec.ts"

if [ ! -f "$APP_FILE" ]; then
  echo "[ERROR] $APP_FILE が見つかりません。リポジトリルートで実行しているか確認してください。"
  exit 1
fi

# ------------------------------------------------------------------
# 1. App.tsx: hasFocusedTextareaRef の追加とinsertSnippetの挿入位置ロジック修正
# ------------------------------------------------------------------
python3 << 'PYEOF'
import sys

path = "src/App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

if "hasFocusedTextareaRef" in content:
    print("[SKIP] App.tsx はすでに本フィックス(2)適用済みです")
    sys.exit(0)

# --- 1-1. textareaRef 宣言の直後に hasFocusedTextareaRef を追加 ---
REF_ANCHOR = "const textareaRef = useRef<HTMLTextAreaElement>(null);"
if REF_ANCHOR not in content:
    print("[ERROR] App.tsx にtextareaRefの定義行が見つかりません。v0.2.7が適用済みか確認してください。")
    sys.exit(1)
content = content.replace(
    REF_ANCHOR,
    REF_ANCHOR + "\n  // テンプレート挿入ボタンはtextarea外の要素なので、クリック時には\n"
    "  // textareaがフォーカスを失っている（= document.activeElement !== el）。\n"
    "  // selectionStartはfocus有無に関わらず最後の値を保持するが、\n"
    "  // 一度もフォーカスされたことが無い場合は既定値の0を返すため、\n"
    "  // 「一度でもフォーカスされたか」を別途追跡し、未フォーカス時は末尾追記にフォールバックする。\n"
    "  const hasFocusedTextareaRef = useRef(false);",
    1,
)

# --- 1-2. insertSnippet内の pos 算出ロジックを修正 ---
OLD_POS_LINE = "      const pos = el?.selectionStart ?? prev.length;"
if OLD_POS_LINE not in content:
    print("[ERROR] App.tsx に想定するinsertSnippetの実装（v0.2.7-fix適用時のもの）が見つかりません。")
    sys.exit(1)
NEW_POS_LINE = (
    "      const pos =\n"
    "        hasFocusedTextareaRef.current && el ? (el.selectionStart ?? prev.length) : prev.length;"
)
content = content.replace(OLD_POS_LINE, NEW_POS_LINE, 1)

# --- 1-3. textarea に onFocus ハンドラを追加 ---
import re
TEXTAREA_PATTERN = re.compile(
    r'(<textarea\s*\n(\s*)ref=\{textareaRef\}\s*\n\s*value=\{md\}\s*\n\s*)(onChange=\{\(e\) => setMd\(e\.target\.value\)\}\s*\n)'
)
m = TEXTAREA_PATTERN.search(content)
if not m:
    print("[ERROR] App.tsx にtextarea/onChangeの想定構造が見つかりません。手動確認してください。")
    sys.exit(1)
indent = m.group(2)
content = TEXTAREA_PATTERN.sub(
    lambda mm: mm.group(1) + mm.group(3) + f"{indent}onFocus={{() => {{\n{indent}  hasFocusedTextareaRef.current = true;\n{indent}}}}}\n",
    content,
    count=1,
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] App.tsx を更新しました（未フォーカス時は末尾追記にフォールバック）")
PYEOF

# ------------------------------------------------------------------
# 2. e2e/templates.spec.ts をPrettier整形済み内容で上書き
# ------------------------------------------------------------------
mkdir -p "$(dirname "$E2E_FILE")"
cat > "$E2E_FILE" << 'TSEOF'
import { test, expect } from '@playwright/test';

// v0.2.7: テンプレート挿入機能のE2E。
// 既存 e2e/basic.spec.ts への追記ではなく独立ファイルにしている
// （アンカーベースのapply-*.shスクリプトが既存ファイルの正確な内容に依存せずに済むため）。

test('テンプレート挿入: contrastテンプレートを末尾に挿入するとスライドが1枚増える', async ({
  page,
}) => {
  await page.goto('/');
  const before = await page.locator('.slide').count();

  await page.getByRole('button', { name: '➕ テンプレート挿入' }).click();
  await page.getByRole('button', { name: '対比（contrast）' }).click();

  await expect(page.locator('.slide')).toHaveCount(before + 1);
});

test('テンプレート挿入: カーソル位置に挿入される（末尾ではなくカーソル直後）', async ({ page }) => {
  await page.goto('/');
  const editor = page.locator('textarea');
  await editor.click();
  await editor.evaluate((el: HTMLTextAreaElement) => {
    el.setSelectionRange(0, 0); // カーソルを先頭へ
  });

  await page.getByRole('button', { name: '➕ テンプレート挿入' }).click();
  await page.getByRole('button', { name: 'タイトル', exact: true }).click();

  const value = await editor.inputValue();
  expect(value.indexOf('<!-- slide: title -->')).toBeLessThan(50);
});
TSEOF
echo "[OK] $E2E_FILE をPrettier整形済み内容で上書きしました"

echo ""
echo "=== 検証 ==="
grep -q "hasFocusedTextareaRef" "$APP_FILE" && echo "[OK] hasFocusedTextareaRefあり" || echo "[ERROR] 見つかりません"
grep -q "onFocus" "$APP_FILE" && echo "[OK] textareaのonFocusハンドラあり" || echo "[ERROR] 見つかりません"
test -f "$E2E_FILE" && echo "[OK] e2e/templates.spec.ts 存在確認" || echo "[ERROR] 存在しません"
