#!/usr/bin/env bash
# apply-v0.2.8-fix2.sh — ヘルプモーダルE2Eのロケーター修正（v0.2.8フォローアップ2）
#
# 内容: e2e/help.spec.ts の「Shift+P」等のショートカット文言検索が、
# 既存のエクスポートドロップダウン（#export-dropdown内の同一文言）と重複し
# strict mode violation を起こしていたため、検索対象をヘルプモーダル内
# （.help-modal）に限定するよう修正する。
#
# 前提: v0.2.8（apply-v0.2.8.sh）適用済みであること。
# 実行方法: リポジトリルートで bash /path/to/apply-v0.2.8-fix2.sh
# 冪等: 複数回実行しても2回目以降は [SKIP] になる。

set -euo pipefail

E2E_FILE="e2e/help.spec.ts"

if [ ! -f "$E2E_FILE" ]; then
  echo "[ERROR] $E2E_FILE が見つかりません。v0.2.8（apply-v0.2.8.sh）が適用済みか確認してください。"
  exit 1
fi

python3 << 'PYEOF'
import sys

path = "e2e/help.spec.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

MARKER = "helpModal.getByText"
if MARKER in content:
    print("[SKIP] e2e/help.spec.ts はすでに本フィックス適用済みです")
    sys.exit(0)

OLD = """test('ヘルプ: ❓ボタンでモーダルが開き、タブを切り替えられる', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '❓ ヘルプ' }).click();

  await expect(page.getByText('記法チートシート')).toBeVisible();

  await page.getByRole('button', { name: 'キーボードショートカット' }).click();
  await expect(page.getByText('Shift+P')).toBeVisible();

  await page.getByRole('button', { name: '制約ルール' }).click();
  await expect(page.getByText('先頭スライドは title を推奨')).toBeVisible();
});"""

if OLD not in content:
    print("[ERROR] e2e/help.spec.ts に想定するテスト本文（v0.2.8適用時のもの）が見つかりません。")
    sys.exit(1)

NEW = """test('ヘルプ: ❓ボタンでモーダルが開き、タブを切り替えられる', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '❓ ヘルプ' }).click();

  // 既存のエクスポートドロップダウン（#export-dropdown）にも同じショートカット文言
  // （Shift+P等）が表示されているため、検索対象をヘルプモーダル内に限定する。
  const helpModal = page.locator('.help-modal');
  await expect(helpModal.getByText('記法チートシート')).toBeVisible();

  await helpModal.getByRole('button', { name: 'キーボードショートカット' }).click();
  await expect(helpModal.getByText('Shift+P')).toBeVisible();

  await helpModal.getByRole('button', { name: '制約ルール' }).click();
  await expect(helpModal.getByText('先頭スライドは title を推奨')).toBeVisible();
});"""

content = content.replace(OLD, NEW, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] e2e/help.spec.ts を更新しました（ロケーターを.help-modal内に限定）")
PYEOF

echo ""
echo "=== 検証 ==="
grep -q "helpModal.getByText" "$E2E_FILE" && echo "[OK] .help-modalスコープのロケーターあり" || echo "[ERROR] 見つかりません"
