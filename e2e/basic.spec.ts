import { test, expect } from '@playwright/test';

test('初期表示: sample.mdが読み込まれtitleスライドが描画される', async ({ page }) => {
  await page.goto('/');
  const editor = page.locator('textarea');
  expect(await editor.inputValue()).toContain('MD Slide Studio');
  await expect(page.locator('.slide h1').first()).toBeVisible();
});

test('タイトルスライドの内容描画（h1・subtitle・badges）', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.slide h1').first()).toBeVisible();
  await expect(page.locator('.slide .subtitle').first()).toBeVisible();
  await expect(page.locator('.slide .badge').first()).toBeVisible();
});

test('エディタ編集がデバウンス後にプレビューへ反映される', async ({ page }) => {
  await page.goto('/');
  const editor = page.locator('textarea');
  const md = await editor.inputValue();
  await editor.fill(md.replace(/# .*/, '# E2E-TEST-TITLE'));
  await expect(page.locator('.slide h1').first()).toContainText('E2E-TEST-TITLE');
});
