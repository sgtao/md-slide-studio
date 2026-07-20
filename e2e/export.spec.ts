import { test, expect } from '@playwright/test';

// エクスポートは実ファイルの中身までは検証せず、ハンドラが起動したことだけを確認する。
// - PDF: window.print() を差し替えて呼び出し回数を記録
// - PNG/ZIP: html2canvas/JSZip 経由の Blob ダウンロード（<a>.click()）を download イベントで検知

async function focusPreview(page: import('@playwright/test').Page) {
  // フォーカスがテキストエリア内だとキーボードショートカットが無視されるため、プレビュー側へ移す
  await page.locator('.preview-pane').click({ position: { x: 5, y: 5 } });
}

test.describe('エクスポート', () => {
  test('P キーで PDF 出力（window.print）が起動する', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __printCalls: number }).__printCalls = 0;
      const orig = window.print.bind(window);
      window.print = () => {
        (window as unknown as { __printCalls: number }).__printCalls += 1;
        orig();
      };
    });
    await page.goto('/');
    await focusPreview(page);
    await page.keyboard.press('p');
    await expect
      .poll(async () =>
        page.evaluate(() => (window as unknown as { __printCalls: number }).__printCalls),
      )
      .toBeGreaterThan(0);
  });

  test('Shift+S で現在スライドのPNGダウンロードが起動する', async ({ page }) => {
    await page.goto('/');
    await focusPreview(page);
    const downloadPromise = page.waitForEvent('download');
    await page.keyboard.press('Shift+S');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/i);
  });

  test('Shift+P で全スライドのZIPダウンロードが起動する', async ({ page }) => {
    await page.goto('/');
    await focusPreview(page);
    const downloadPromise = page.waitForEvent('download');
    await page.keyboard.press('Shift+P');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.zip$/i);
  });

  test('エクスポートメニューのボタンからもPNG出力が起動する（メニュー内スコープでstrict mode回避）', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('#export-toggle').click();
    const dropdown = page.locator('#export-dropdown');
    await expect(dropdown).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await dropdown.getByRole('menuitem', { name: /このスライドをPNG/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/i);
  });
});
