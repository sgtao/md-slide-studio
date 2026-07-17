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

test('テンプレート挿入: カーソル位置に挿入される（末尾ではなくカーソル直後）', async ({
  page,
}) => {
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
