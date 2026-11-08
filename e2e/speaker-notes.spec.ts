import { expect, test } from '@playwright/test';

// スピーカーノート（note:）: 既定で非表示・DOMには存在・PNG/ZIPには写さない・PDF（印刷）は data-notes に従う。

const deck = `---
title: E2E speaker notes
palette: ocean
---
<!-- slide: points -->
## 要点
- **A**：説明
note: 全体の結論を3点にまとめたスライドです。
note: 数字は==11月5日時点==です。
---
<!-- slide: sources -->
## 出典
- [example](https://example.com)
`;

test.describe('スピーカーノート（note:）', () => {
  test('既定では非表示で、ノート付きスライドだけに aside が出る', async ({ page }) => {
    await page.goto('/');
    await page.locator('textarea').fill(deck);
    const notes = page.locator('.slide .slide-notes');
    await expect(notes).toHaveCount(1);
    await expect(notes).toBeHidden();
    await expect(notes).toHaveAttribute('aria-label', 'スピーカーノート');
    await expect(notes.locator('p')).toHaveCount(2);
    await expect(notes.locator('.hl')).toHaveText('11月5日時点');
  });

  test('PNG書き出しはノートの有無で影響を受けない（ダウンロードが起動する）', async ({ page }) => {
    await page.goto('/');
    await page.locator('textarea').fill(deck);
    await page.locator('.preview-pane').click({ position: { x: 5, y: 5 } });
    const downloadPromise = page.waitForEvent('download');
    await page.keyboard.press('Shift+S');
    expect((await downloadPromise).suggestedFilename()).toMatch(/\.png$/i);
  });

  test('印刷: 既定はスライドのみ／data-notes="on" のときだけスライド下にノートが出る', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('textarea').fill(deck);
    await page.emulateMedia({ media: 'print' });
    const notes = page.locator('.slide .slide-notes');
    await expect(notes).toBeHidden();

    await page.evaluate(() => document.body.setAttribute('data-notes', 'on'));
    await expect(notes).toBeVisible();
    const noteBox = await notes.boundingBox();
    const slideBox = await page.locator('.slide').first().locator('.slide-inner').boundingBox();
    expect(noteBox && slideBox && noteBox.y >= slideBox.y + slideBox.height - 1).toBe(true);

    await page.evaluate(() => document.body.removeAttribute('data-notes'));
    await expect(notes).toBeHidden();
  });
});
