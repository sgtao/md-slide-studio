import { test, expect } from '@playwright/test';

test.describe('モバイル幅（500x800）でのControlCluster', () => {
  test.use({ viewport: { width: 500, height: 800 } });

  test('ControlClusterがpreview-pane右上に収まる', async ({ page }) => {
    await page.goto('/');
    const cluster = page.locator('.control-cluster');
    await expect(cluster).toBeVisible();
    const box = await cluster.boundingBox();
    expect(box).not.toBeNull();
    // 500px幅の画面内に収まっていること（右端がviewportをはみ出さない）
    expect(box!.x + box!.width).toBeLessThanOrEqual(500);
  });

  test('ボタンサイズが縮小されている', async ({ page }) => {
    await page.goto('/');
    const btn = page.locator('.control-cluster button').first();
    const box = await btn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(32);
  });
});
