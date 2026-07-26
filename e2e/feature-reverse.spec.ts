import { expect, test } from '@playwright/test';

// feature-showcase の layout: reverse が実際に表示位置を反転させることを確認する。

const NORMAL_DECK = `---
title: E2E reverse deck
palette: ocean
---
<!-- slide: feature-showcase -->
left:
  eyebrow: L
  heading: E2E-LEFT-NORMAL
right:
  heading: E2E-RIGHT-NORMAL
  items:
    - { label: X, desc: Y }
---
<!-- slide: sources -->
## 出典
- [example](https://example.com)
`;

const REVERSE_DECK = NORMAL_DECK.replace(
  '<!-- slide: feature-showcase -->',
  '<!-- slide: feature-showcase, layout: reverse -->',
);

test('feature-showcase: layout未指定では left が画面左に来る', async ({ page }) => {
  await page.goto('/');
  await page.locator('textarea').fill(NORMAL_DECK);
  const left = page.locator('.slide.active .feature-left');
  const right = page.locator('.slide.active .feature-right');
  const leftBox = await left.boundingBox();
  const rightBox = await right.boundingBox();
  expect(leftBox).not.toBeNull();
  expect(rightBox).not.toBeNull();
  expect(leftBox!.x).toBeLessThan(rightBox!.x);
});

test('feature-showcase: layout: reverse で left が画面右に来る', async ({ page }) => {
  await page.goto('/');
  await page.locator('textarea').fill(REVERSE_DECK);
  const active = page.locator('.slide.active');
  await expect(active).toHaveClass(/layout-reverse|feature-showcase/);
  const left = active.locator('.feature-left');
  const right = active.locator('.feature-right');
  const leftBox = await left.boundingBox();
  const rightBox = await right.boundingBox();
  expect(leftBox).not.toBeNull();
  expect(rightBox).not.toBeNull();
  expect(leftBox!.x).toBeGreaterThan(rightBox!.x);
});
