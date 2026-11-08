import { statSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// 既知の不具合の回帰テスト（v0.6.1）: list ビューの狭い幅で、`point:` の吹き出し（.slide-point）が
// 本文と重ならない。list は 960×540 の箱ごと scale するので、絶対配置の point も同じ比率で縮む。

interface Report {
  withPoint: number;
  overlaps: number[];
  widths: number[];
}

/** 全スライドのうち .slide-point を持つものについて、本文の末端要素と矩形が交差する枚数を数える */
async function measure(page: Page): Promise<Report> {
  return page.evaluate(() => {
    const report: Report = { withPoint: 0, overlaps: [], widths: [] };
    document.querySelectorAll<HTMLElement>('.slide-scaler .slide').forEach((slide, i) => {
      const point = slide.querySelector<HTMLElement>('.slide-point');
      if (!point) return;
      report.withPoint++;
      report.widths.push(Math.round(slide.getBoundingClientRect().width));
      const p = point.getBoundingClientRect();
      let hits = 0;
      slide.querySelectorAll<HTMLElement>('*').forEach((el) => {
        if (el === point || point.contains(el) || el.contains(point)) return;
        if (el.closest('.slide-notes') || el.children.length > 0) return;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        if (r.left < p.right && r.right > p.left && r.top < p.bottom && r.bottom > p.top) hits++;
      });
      if (hits > 0) report.overlaps.push(i + 1);
    });
    return report;
  });
}

test.describe('list ビューの point 吹き出し', () => {
  test('アプリのプレビュー（狭いペイン）で point が本文と重ならず、スライドが 960×540 の比率を保つ', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto('/');
    await page.locator('.preview-pane').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('v');
    await expect(page.locator('.deck-container')).toHaveAttribute('data-view', 'list');
    await expect
      .poll(() =>
        page.locator('.slide-scaler').evaluate((el) => el.style.getPropertyValue('--list-scale')),
      )
      .not.toBe('');
    const r = await measure(page);
    expect(r.withPoint).toBeGreaterThan(0);
    expect(r.overlaps).toEqual([]);
    // 実際に縮んでいる（元の 960px より狭い）ことの確認
    expect(Math.max(...r.widths)).toBeLessThan(960);
    const box = (await page.locator('.slide-scaler .slide').first().boundingBox())!;
    expect(box.width / box.height).toBeCloseTo(16 / 9, 1);
  });

  test('書き出しHTMLの狭い画面（幅 480px）で point が本文と重ならない', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await page.locator('#export-toggle').click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: /HTMLとして保存/ }).click();
    const file = testInfo.outputPath('list-point.html');
    await (await downloadPromise).saveAs(file);

    await page.setViewportSize({ width: 480, height: 900 });
    await page.goto(`file://${file}`);
    await expect(page.locator('html')).toHaveAttribute('data-view', 'list');
    await expect
      .poll(() =>
        page.locator('.slide-scaler').evaluate((el) => el.style.getPropertyValue('--list-scale')),
      )
      .not.toBe('');
    const r = await measure(page);
    expect(r.withPoint).toBeGreaterThan(0);
    expect(r.overlaps).toEqual([]);
    expect(Math.max(...r.widths)).toBeLessThan(480);
    // 横スクロールが出ない
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('広い画面では list の見た目は等倍（960px）のまま', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.locator('#export-toggle').click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: /HTMLとして保存/ }).click();
    const file = testInfo.outputPath('list-wide.html');
    await (await downloadPromise).saveAs(file);

    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`file://${file}`);
    await expect
      .poll(() =>
        page.locator('.slide-scaler').evaluate((el) => el.style.getPropertyValue('--list-scale')),
      )
      .toBe('1');
    const box = (await page.locator('.slide-scaler .slide').first().boundingBox())!;
    expect(Math.round(box.width)).toBe(960);
    expect(Math.round(box.height)).toBe(540);
  });
  test('list ビューからの PNG 書き出しは hero と同じ絵（縮小・番号バッジが写らない）', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto('/');
    await page.locator('.preview-pane').click({ position: { x: 5, y: 5 } });
    const capture = async (name: string) => {
      const downloadPromise = page.waitForEvent('download');
      await page.keyboard.press('Shift+S');
      const file = testInfo.outputPath(name);
      await (await downloadPromise).saveAs(file);
      return statSync(file).size;
    };
    const hero = await capture('hero.png');
    await page.keyboard.press('v');
    await expect(page.locator('.deck-container')).toHaveAttribute('data-view', 'list');
    const list = await capture('list.png');
    // 同じスライドを同じ 1920×1080 で撮るので、ほぼ同じサイズになる（バッジが写ると数%ずれる）
    expect(Math.abs(list - hero) / hero).toBeLessThan(0.01);
  });
});
