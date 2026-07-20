import { test, expect } from '@playwright/test';

test.describe('ナビゲーション', () => {
  test('→ / Space でスライドが進み、← で戻る', async ({ page }) => {
    await page.goto('/');
    const counter = page.locator('#slide-counter');
    await expect(counter).toBeVisible();
    const initial = await counter.textContent();

    await page.keyboard.press('ArrowRight');
    await expect(counter).not.toHaveText(initial ?? '');
    const afterRight = await counter.textContent();

    await page.keyboard.press(' ');
    const afterSpace = await counter.textContent();
    expect(afterSpace).not.toBe(afterRight);

    await page.keyboard.press('ArrowLeft');
    await expect(counter).toHaveText(afterRight ?? '');
  });

  test('進んだ先のスライドが .slide.active クラスを持つ', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.slide.active')).toHaveCount(1);
    const firstActiveId = await page.locator('.slide.active').getAttribute('id');

    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.slide.active')).toHaveCount(1);
    const secondActiveId = await page.locator('.slide.active').getAttribute('id');
    expect(secondActiveId).not.toBe(firstActiveId);
  });

  test('V キーで hero ⇔ list 表示が切り替わる', async ({ page }) => {
    await page.goto('/');
    const deckContainer = page.locator('.deck-container');
    await expect(deckContainer).toHaveAttribute('data-view', 'hero');
    await expect(page.locator('#slide-counter')).toBeVisible();

    // フォーカスがテキストエリア内だとキー操作が無視されるため、プレビュー側へ移す
    await page.locator('.preview-pane').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('v');
    await expect(deckContainer).toHaveAttribute('data-view', 'list');
    await expect(page.locator('#slide-counter')).toHaveCount(0);

    await page.keyboard.press('v');
    await expect(deckContainer).toHaveAttribute('data-view', 'hero');
  });

  test('入力欄にフォーカス中は矢印キーのナビゲーションが無効', async ({ page }) => {
    await page.goto('/');
    const counter = page.locator('#slide-counter');
    const before = await counter.textContent();
    await page.locator('textarea').click();
    await page.keyboard.press('ArrowRight');
    await expect(counter).toHaveText(before ?? '');
  });
});
