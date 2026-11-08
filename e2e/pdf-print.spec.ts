import { expect, test } from '@playwright/test';

// PDF（印刷）が全スライドを1ページ=1スライドで出力すること。
// 以前は html[data-mode='edit'] の overflow:hidden / height:100%（app.css）が印刷でも効き、
// 1ページ目しか PDF にならなかった。さらに最終スライドの break-after で空白ページも出ていた。
// page.pdf() は Chromium 専用。ページ数は PDF 内の /Type /Page オブジェクト数で数える。

const pageCount = (pdf: Buffer) =>
  (pdf.toString('latin1').match(/\/Type \/Page\b(?!s)/g) ?? []).length;

const deck = `---
title: E2E pdf
palette: ocean
---
<!-- slide: title -->
# A
---
<!-- slide: points -->
## B
- **x**：y
---
<!-- slide: sources -->
## C
- [e](https://example.com)
`;

const pdfOptions = {
  width: '1280px',
  height: '720px',
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
  printBackground: true,
};

test.describe('PDF（印刷）の全ページ出力', () => {
  test('3枚のデッキが3ページになる（hero のまま）', async ({ page }) => {
    await page.goto('/');
    await page.locator('textarea').fill(deck);
    await expect(page.locator('.slide')).toHaveCount(3);
    expect(pageCount(await page.pdf(pdfOptions))).toBe(3);
  });

  test('list ビューに切り替えた状態（exportToPdf 相当）でも3ページ', async ({ page }) => {
    await page.goto('/');
    await page.locator('textarea').fill(deck);
    await expect(page.locator('.slide')).toHaveCount(3);
    await page.evaluate(() => {
      document.documentElement.dataset.view = 'list';
      document.body.dataset.view = 'list';
    });
    expect(pageCount(await page.pdf(pdfOptions))).toBe(3);
  });

  test('サンプルデッキは「スライド枚数＝ページ数」になる', async ({ page }) => {
    await page.goto('/');
    const slides = await page.locator('.slide').count();
    expect(slides).toBeGreaterThan(10);
    expect(pageCount(await page.pdf(pdfOptions))).toBe(slides);
  });
});
