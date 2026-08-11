import { expect, test } from '@playwright/test';

test.describe('エディタ自動スクロール', () => {
  test('スライドを進めるとエディタのscrollTopが変化する', async ({ page }) => {
    await page.goto('/');
    const textarea = page.locator('.editor-pane textarea');
    await expect(textarea).toBeVisible();
    const before = await textarea.evaluate((el: HTMLTextAreaElement) => el.scrollTop);

    await page.locator('.preview-pane').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');

    await expect
      .poll(() => textarea.evaluate((el: HTMLTextAreaElement) => el.scrollTop))
      .not.toBe(before);
  });

  test('「編集のみ」レイアウトでは自動スクロールしない（プレビュー非表示のため対象外）', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('[data-layout-opt="editor"]').click();
    await expect(page.locator('.workspace')).toHaveAttribute('data-layout', 'editor');

    const textarea = page.locator('.editor-pane textarea');
    const before = await textarea.evaluate((el: HTMLTextAreaElement) => el.scrollTop);
    // splitでない＝.preview-paneが無いのでキー操作はできないが、
    // レイアウトを戻してから念のためscrollTopが変化していないことを確認する
    await page.locator('[data-layout-opt="split"]').click();
    const after = await textarea.evaluate((el: HTMLTextAreaElement) => el.scrollTop);
    expect(after).toBe(before);
  });
});
