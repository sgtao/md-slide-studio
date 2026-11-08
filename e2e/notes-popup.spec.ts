import { expect, test, type Page } from '@playwright/test';

// スピーカーノートのポップアップ（hero ビュー右上の 🗒️）。
// アプリのプレビュー（React）と、アプリから書き出したHTML（core/standalone/notesPopup.ts）の
// 両方で同じ操作を確認する。DOM の id・クラス名は両者で共通。

const deck = `---
title: E2E notes popup
palette: ocean
---
<!-- slide: title -->
# 表紙
note: 1枚目のノートA
note: 1枚目のノートB ==強調==
---
<!-- slide: points -->
## ノート無し
- **x**：y
---
<!-- slide: points -->
## 3枚目
- **x**：y
note: 3枚目のノート
---
<!-- slide: sources -->
## 出典
- [e](https://example.com)
`;

const deckWithoutNotes = deck.replace(/^note:.*\n/gm, '');

const toggle = (page: Page) => page.locator('#notes-toggle');
const popup = (page: Page) => page.locator('#notes-popup');
const pageLabel = (page: Page) => page.locator('#notes-page');

/** アプリ・書き出しHTML 共通の操作シナリオ（hero ビューで開始している前提） */
async function exerciseHero(page: Page) {
  // 既定は閉。🗒️ だけが出ている（現在のスライドにノートがあるので薄くない）
  await expect(toggle(page)).toBeVisible();
  await expect(toggle(page)).not.toHaveClass(/is-empty/);
  await expect(popup(page)).toBeHidden();
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');

  // 🗒️ で開く: 現在（1枚目）のノートが段落ごとに出る。強調も効く
  await toggle(page).click();
  await expect(popup(page)).toBeVisible();
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(pageLabel(page)).toHaveText('1 / 4');
  await expect(page.locator('#notes-body p')).toHaveText(['1枚目のノートA', '1枚目のノートB 強調']);
  await expect(page.locator('#notes-body .hl')).toHaveText('強調');
  await expect(page.locator('#notes-prev')).toBeDisabled();
  await expect(page.locator('#notes-next')).toBeEnabled();

  // 「次へ」でポップアップを開いたまま2枚目へ。ノートが無いので「（ノートなし）」と薄い 🗒️
  await page.locator('#notes-next').click();
  await expect(popup(page)).toBeVisible();
  await expect(pageLabel(page)).toHaveText('2 / 4');
  await expect(page.locator('#notes-body')).toHaveText('（ノートなし）');
  await expect(toggle(page)).toHaveClass(/is-empty/);
  await expect(page.locator('#notes-prev')).toBeEnabled();

  // ボタンを押したあとも Space は1回分だけスライド送りになる（フォーカスを奪わない）
  await page.keyboard.press('Space');
  await expect(pageLabel(page)).toHaveText('3 / 4');
  await expect(page.locator('#notes-body p')).toHaveText(['3枚目のノート']);
  await expect(toggle(page)).not.toHaveClass(/is-empty/);

  // ← → キーでも中身が追従し、「前へ」でも戻れる
  await page.keyboard.press('ArrowRight');
  await expect(pageLabel(page)).toHaveText('4 / 4');
  await expect(page.locator('#notes-next')).toBeDisabled();
  await page.locator('#notes-prev').click();
  await expect(pageLabel(page)).toHaveText('3 / 4');
  await page.keyboard.press('ArrowLeft');
  await expect(pageLabel(page)).toHaveText('2 / 4');

  // Esc で閉じる／N で開閉
  await page.keyboard.press('Escape');
  await expect(popup(page)).toBeHidden();
  await page.keyboard.press('n');
  await expect(popup(page)).toBeVisible();
  await page.keyboard.press('n');
  await expect(popup(page)).toBeHidden();

  // ✕ で閉じる
  await toggle(page).click();
  await expect(popup(page)).toBeVisible();
  await page.locator('#notes-close').click();
  await expect(popup(page)).toBeHidden();

  // list ビュー（V）では 🗒️ もポップアップも隠れ、hero に戻ると開いていたポップアップも戻る
  await toggle(page).click();
  await expect(popup(page)).toBeVisible();
  await page.keyboard.press('v');
  await expect(toggle(page)).toBeHidden();
  await expect(popup(page)).toBeHidden();
  await page.keyboard.press('n'); // list では N は無効
  await page.keyboard.press('v');
  await expect(toggle(page)).toBeVisible();
  await expect(popup(page)).toBeVisible();
}

test.describe('ノートポップアップ（アプリのプレビュー）', () => {
  test('hero で 🗒️ から開閉・ページ移動・キー操作ができる', async ({ page }) => {
    await page.goto('/');
    await page.locator('textarea').fill(deck);
    await expect(page.locator('.slide')).toHaveCount(4);
    await page.locator('.preview-pane').click({ position: { x: 5, y: 5 } });
    await exerciseHero(page);
  });

  test('ノートが1つも無いデッキでは 🗒️ もポップアップも出ず、N キーも効かない', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('textarea').fill(deckWithoutNotes);
    await expect(page.locator('.slide')).toHaveCount(4);
    await page.locator('.preview-pane').click({ position: { x: 5, y: 5 } });
    await expect(toggle(page)).toHaveCount(0);
    await page.keyboard.press('n');
    await expect(popup(page)).toHaveCount(0);
  });

  test('サンプルデッキ（note: あり）では 🗒️ が出る', async ({ page }) => {
    await page.goto('/');
    await expect(toggle(page)).toBeVisible();
    await toggle(page).click();
    await expect(popup(page)).toBeVisible();
    await expect(page.locator('#notes-body p').first()).toContainText('サンプル');
  });

  test('7パレット × ライト/ダークでポップアップが読める（文字色と背景色が異なる）', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('textarea').fill(deck);
    await expect(page.locator('.slide')).toHaveCount(4);
    await toggle(page).click();
    await expect(popup(page)).toBeVisible();
    for (const theme of ['light', 'dark']) {
      for (const palette of ['ocean', 'ruby', 'forest', 'sunset', 'plum', 'gold', 'graphite']) {
        await page.evaluate(
          ([t, p]) => {
            document.documentElement.dataset.theme = t;
            document.documentElement.dataset.palette = p;
          },
          [theme, palette],
        );
        const { fg, bg } = await popup(page).evaluate((el) => ({
          fg: getComputedStyle(el).color,
          bg: getComputedStyle(el).backgroundColor,
        }));
        expect(fg, `${theme}/${palette}`).not.toBe(bg);
        await expect(popup(page)).toBeVisible();
      }
    }
  });

  test('ポップアップは .control-cluster の中・右上ボタン群の下にあり、画面外にはみ出さない', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('textarea').fill(deck);
    await expect(page.locator('.slide')).toHaveCount(4);
    await toggle(page).click();
    await expect(popup(page)).toBeVisible();
    const box = await popup(page).boundingBox();
    const btn = await toggle(page).boundingBox();
    const vp = page.viewportSize()!;
    expect(box && btn).toBeTruthy();
    expect(box!.y).toBeGreaterThanOrEqual(btn!.y + btn!.height - 1);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height + 1);
  });
});

test.describe('ノートポップアップ（書き出しHTML）', () => {
  test('アプリから書き出したHTMLでも同じ操作ができる', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.locator('textarea').fill(deck);
    await expect(page.locator('.slide')).toHaveCount(4);
    await page.locator('#export-toggle').click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: /HTMLとして保存/ }).click();
    const download = await downloadPromise;
    const file = testInfo.outputPath('exported.html');
    await download.saveAs(file);

    await page.goto(`file://${file}`);
    // 書き出しHTMLは list ビューで開く。list では 🗒️ は出ない
    await expect(toggle(page)).toBeHidden();
    await page.keyboard.press('v');
    await exerciseHero(page);
  });

  test('ノートが無いデッキを書き出したHTMLには 🗒️ もポップアップも入らない', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await page.locator('textarea').fill(deckWithoutNotes);
    await expect(page.locator('.slide')).toHaveCount(4);
    await page.locator('#export-toggle').click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: /HTMLとして保存/ }).click();
    const file = testInfo.outputPath('exported-no-notes.html');
    await (await downloadPromise).saveAs(file);

    await page.goto(`file://${file}`);
    await page.keyboard.press('v');
    await expect(toggle(page)).toHaveCount(0);
    await expect(popup(page)).toHaveCount(0);
  });
});
