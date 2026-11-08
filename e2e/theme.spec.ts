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

// 閲覧UI（サムネ帯・一覧グリッド）が 7パレット × ライト/ダークで読めること（v0.6.1）。
// サムネは DOM の複製なので、パレット・テーマには CSS 変数だけで追従する。
test.describe('閲覧UI（サムネ帯・一覧グリッド）の配色', () => {
  const PALETTES = ['ocean', 'ruby', 'forest', 'sunset', 'plum', 'gold', 'graphite'];

  /** 現在の配色で、番号バッジ・サムネ内のスライドが読めること */
  async function expectReadable(
    page: import('@playwright/test').Page,
    panel: string,
    label: string,
  ) {
    const r = await page.evaluate((sel) => {
      const root = document.querySelector<HTMLElement>(sel)!;
      const num = root.querySelector<HTMLElement>('.thumb:not(.is-current) .thumb-num')!;
      const cur = root.querySelector<HTMLElement>('.thumb.is-current .thumb-num')!;
      const clone = root.querySelector<HTMLElement>('.thumb-stage .slide')!;
      const main = document.querySelector<HTMLElement>('.slide-scaler .slide.active')!;
      const heading = clone.querySelector<HTMLElement>('h2, h1, .slide-title')!;
      const cs = (el: HTMLElement) => getComputedStyle(el);
      return {
        numFg: cs(num).color,
        numBg: cs(num).backgroundColor,
        curFg: cs(cur).color,
        curBg: cs(cur).backgroundColor,
        cloneBg: cs(clone).backgroundColor,
        mainBg: cs(main).backgroundColor,
        cloneOpacity: cs(clone).opacity,
        headingFg: cs(heading).color,
        panelBg: cs(root).backgroundColor,
      };
    }, panel);
    expect(r.numFg, `${label} 番号`).not.toBe(r.numBg);
    expect(r.curFg, `${label} 現在の番号`).not.toBe(r.curBg);
    expect(r.cloneOpacity, `${label} 複製の不透明度`).toBe('1');
    // 複製は元のスライドと同じ地色（テーマ・パレットへ追従している）
    expect(r.cloneBg, `${label} 複製の地色`).toBe(r.mainBg);
    expect(r.headingFg, `${label} 複製の見出し`).not.toBe(r.cloneBg);
    expect(r.panelBg, `${label} 帯/グリッドの背景`).not.toBe('rgba(0, 0, 0, 0)');
  }

  for (const [panel, key, name] of [
    ['#thumb-strip', 't', 'サムネ帯'],
    ['#overview-grid', 'g', '一覧グリッド'],
  ] as const) {
    test(`7パレット × ライト/ダークで${name}が読める`, async ({ page }) => {
      await page.goto('/');
      await page.locator('.preview-pane').click({ position: { x: 5, y: 5 } });
      await page.keyboard.press(key);
      await expect(page.locator(panel)).toBeVisible();
      await expect(page.locator(`${panel} .thumb-stage .slide`).first()).toBeVisible();
      for (const theme of ['light', 'dark']) {
        for (const palette of PALETTES) {
          await page.evaluate(
            ([t, p]) => {
              document.documentElement.dataset.theme = t;
              document.documentElement.dataset.palette = p;
            },
            [theme, palette],
          );
          await expectReadable(page, panel, `${theme}/${palette}`);
        }
      }
    });
  }
});
