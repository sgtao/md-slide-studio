import { test, expect } from '@playwright/test';

// v0.2.8: ヘルプモーダルのE2E。既存e2eファイルは変更せず独立ファイルにしている。

test('ヘルプ: ❓ボタンでモーダルが開き、タブを切り替えられる', async ({ page }) => {
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
});

test('ヘルプ: 初回訪問時のみトーストが表示され、閉じると再表示されない', async ({ page }) => {
  await page.goto('/');
  const toast = page.locator('.help-toast');
  await expect(toast).toBeVisible();
  await toast.click();

  await page.reload();
  await expect(page.locator('.help-toast')).toHaveCount(0);
});
