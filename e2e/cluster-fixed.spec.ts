import { expect, test, type Page } from '@playwright/test';

// 書き出しHTMLの右上ボタン（.control-cluster）は、list でスクロールしても画面右上に固定される。
// 共有CSS（nav-controls.css）はアプリの .preview-pane 内を前提に position: absolute のため、
// 書き出しHTMLでは position: fixed に上書きする（CLI・アプリの書き出しの両方）。

const deck = `---\ntitle: E2E cluster\npalette: ocean\n---\n${Array.from(
  { length: 12 },
  (_, i) => `<!-- slide: points -->\n## スライド${i + 1}\n- **要点**：説明`,
).join('\n---\n')}\n`;

async function exportFromApp(page: Page, file: string) {
  await page.goto('/');
  await page.locator('textarea').fill(deck);
  await expect(page.locator('.slide-scaler .slide')).toHaveCount(12);
  await page.locator('#export-toggle').click();
  const dl = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /HTMLとして保存/ }).click();
  await (await dl).saveAs(file);
}

test('アプリから書き出したHTML: list でスクロールしても右上ボタンが画面内に固定される', async ({
  page,
}, testInfo) => {
  const file = testInfo.outputPath('cluster.html');
  await exportFromApp(page, file);
  await page.goto(`file://${file}`);
  await expect(page.locator('html')).toHaveAttribute('data-view', 'list');
  const cluster = page.locator('.control-cluster');
  expect(await cluster.evaluate((el) => getComputedStyle(el).position)).toBe('fixed');
  const before = await cluster.boundingBox();

  // 末尾までスクロール（End）しても、同じ位置に見えている
  await page.keyboard.press('End');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
  await expect(cluster).toBeInViewport();
  const after = await cluster.boundingBox();
  expect(after?.y).toBeCloseTo(before?.y ?? -1, 0);
  expect(after?.x).toBeCloseTo(before?.x ?? -1, 0);
  // ボタンも押せる（テーマ切替）
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('アプリの書き出しHTMLにも CLI と同じ上書き規則（.control-cluster{position:fixed}）が入る', async ({
  page,
}, testInfo) => {
  // アプリの書き出しと CLI の書き出しで同じ上書きを持つことを、HTML文字列でも確かめる
  const file = testInfo.outputPath('cluster2.html');
  await exportFromApp(page, file);
  const fs = await import('node:fs');
  const html = fs.readFileSync(file, 'utf-8');
  expect(html).toContain('.control-cluster{position:fixed}');
});
