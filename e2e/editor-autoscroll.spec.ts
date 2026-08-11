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

  test('preview で進めてから editor へ切替えると該当行までスクロールする', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-layout-opt="preview"]').click();
    await expect(page.locator('.workspace')).toHaveAttribute('data-layout', 'preview');

    // 3枚進める（preview-pane内のControlClusterに隠れないようクリック位置に注意）
    const deck = page.locator('.deck-container');
    await deck.click({ position: { x: 5, y: 200 } });
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');

    await page.locator('[data-layout-opt="editor"]').click();
    await expect(page.locator('.workspace')).toHaveAttribute('data-layout', 'editor');

    const textarea = page.locator('.editor-pane textarea');
    await expect(textarea).toBeVisible();
    await expect
      .poll(() => textarea.evaluate((el: HTMLTextAreaElement) => el.scrollTop))
      .toBeGreaterThan(0);

    await page.locator('[data-layout-opt="split"]').click();
  });

  test('preview で進めてから split へ切替えても該当行までスクロールする', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-layout-opt="preview"]').click();
    const deck = page.locator('.deck-container');
    await deck.click({ position: { x: 5, y: 200 } });
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');

    await page.locator('[data-layout-opt="split"]').click();
    await expect(page.locator('.workspace')).toHaveAttribute('data-layout', 'split');

    const textarea = page.locator('.editor-pane textarea');
    await expect
      .poll(() => textarea.evaluate((el: HTMLTextAreaElement) => el.scrollTop))
      .toBeGreaterThan(0);
  });
});
