import { expect, test } from '@playwright/test';

// steps の layout: grid が矢印非表示・複数列折り返しで描画されることを確認する。
//
// 注意: 1テスト1fill・テストごとに page.goto() からやり直す方針（教訓6）。

const GRID_DECK = `---
title: E2E steps grid deck
palette: ocean
---
<!-- slide: steps, layout: grid -->
badge: FEATURES
## E2E-STEPS-GRID
\`\`\`steps
style: cards
items:
  - { icon: "✍️", title: 自然な文字, desc: 説明1 }
  - { icon: "🌐", title: 日本語対応, desc: 説明2 }
  - { icon: "🖼️", title: 最大2K対応, desc: 説明3 }
  - { icon: "👤", title: 高精度な画像, desc: 説明4 }
  - { icon: "⚡", title: 高速生成, desc: 説明5 }
  - { icon: "🎨", title: 色調補正, desc: 説明6 }
\`\`\`
---
<!-- slide: sources -->
## 出典
- [example](https://example.com)
`;

test('steps(layout: grid): 6件のカードが描画され、矢印疑似要素が非表示になる', async ({ page }) => {
  await page.goto('/');
  await page.locator('textarea').fill(GRID_DECK);
  const active = page.locator('.slide.active');
  await expect(active.locator('.slide-title')).toContainText('E2E-STEPS-GRID');
  await expect(active.locator('.steps-item')).toHaveCount(6);

  const flow = active.locator('.steps-flow');
  await expect(flow).toHaveClass(/steps-grid/);

  // 2枚目以降のカードに矢印（::before）が表示されていないことを、
  // 疑似要素の content が none であることで確認する。
  const secondItem = active.locator('.steps-item').nth(1);
  const beforeContent = await secondItem.evaluate((el) => getComputedStyle(el, '::before').content);
  expect(beforeContent === 'none' || beforeContent === '""').toBe(true);
});

test('steps(layout: grid): flex-wrap により複数列に折り返される（1行に全カードが収まらない）', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('textarea').fill(GRID_DECK);
  const items = page.locator('.slide.active .steps-item');
  const firstBox = await items.nth(0).boundingBox();
  const lastBox = await items.nth(5).boundingBox();
  expect(firstBox).not.toBeNull();
  expect(lastBox).not.toBeNull();
  // 折り返されていれば、最後のカードのy座標は最初のカードより下に来る
  expect(lastBox!.y).toBeGreaterThan(firstBox!.y);
});
