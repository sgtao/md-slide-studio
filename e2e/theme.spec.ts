import { test, expect } from '@playwright/test';

test.describe('テーマ・パレット永続化', () => {
  test('テーマ切替がリロード後も保持される（localStorage: slide-theme）', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');

    await page.locator('#theme-toggle').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // 後始末：他テストに影響しないよう light に戻す
    await page.locator('#theme-toggle').click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('パレット切替がリロード後も保持される（localStorage: mdss-palette-override）', async ({
    page,
  }) => {
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-palette', 'ocean');

    await page.locator('#palette-toggle').click();
    await page.locator('.palette-dropdown button.pal-forest').click();
    await expect(html).toHaveAttribute('data-palette', 'forest');

    await page.reload();
    await expect(html).toHaveAttribute('data-palette', 'forest');

    // 後始末
    await page.locator('#palette-toggle').click();
    await page.locator('.palette-dropdown button.pal-ocean').click();
    await expect(html).toHaveAttribute('data-palette', 'ocean');
  });

  test('view（hero/list）切替がリロード後も保持される（localStorage: slide-view）', async ({
    page,
  }) => {
    await page.goto('/');
    const deckContainer = page.locator('.deck-container');
    await expect(deckContainer).toHaveAttribute('data-view', 'hero');

    await page.locator('#view-toggle').click();
    await expect(deckContainer).toHaveAttribute('data-view', 'list');

    await page.reload();
    await expect(deckContainer).toHaveAttribute('data-view', 'list');

    // 後始末
    await page.locator('#view-toggle').click();
    await expect(deckContainer).toHaveAttribute('data-view', 'hero');
  });
});
