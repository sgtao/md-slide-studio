import { expect, test } from '@playwright/test';

// v0.4.4: figure の layout: split-image / image-side が実際に左右を入れ替えることを確認する。
//
// 注意: 1テスト内で textarea を連続 fill() すると、2回目以降の fill 直後は
// デバウンス再描画が終わっていない可能性がある（既存の「エディタ編集はデバウンス後に
// プレビューへ反映される」仕様のため）。安全のため、テストごとに page.goto() から
// やり直し、1テストにつき fill() は1回だけにする。

const deckFor = (side: 'left' | 'right') => `---
title: E2E figure-split deck
palette: ocean
---
<!-- slide: figure, layout: split-image -->
## E2E-FIGURE-SPLIT
image-side: ${side}
![E2E-ALT](https://images.unsplash.com/photo-1518770660439-4636190af475?w=400)
- **ポイント**：説明文
source: [出典](https://example.com)
---
<!-- slide: sources -->
## 出典
- [example](https://example.com)
`;

test('figure(split-image): 箇条書きが .points に描画される', async ({ page }) => {
  await page.goto('/');
  await page.locator('textarea').fill(deckFor('left'));
  const active = page.locator('.slide.active');
  await expect(active.locator('.points li')).toHaveCount(1);
});

test('figure(split-image, image-side: left): 画像が左・テキストが右', async ({ page }) => {
  await page.goto('/');
  await page.locator('textarea').fill(deckFor('left'));
  const active = page.locator('.slide.active');
  // デバウンス後の再描画を明示的に待つ（対象要素が出現するまで）
  await expect(active.locator('.figure-split-image')).toBeVisible();
  const imageBox = await active.locator('.figure-split-image').boundingBox();
  const bodyBox = await active.locator('.figure-split-body').boundingBox();
  expect(imageBox).not.toBeNull();
  expect(bodyBox).not.toBeNull();
  expect(imageBox!.x).toBeLessThan(bodyBox!.x);
});

test('figure(split-image, image-side: right): 画像が右・テキストが左', async ({ page }) => {
  await page.goto('/');
  await page.locator('textarea').fill(deckFor('right'));
  const active = page.locator('.slide.active');
  await expect(active.locator('.figure-split-image')).toBeVisible();
  const imageBox = await active.locator('.figure-split-image').boundingBox();
  const bodyBox = await active.locator('.figure-split-body').boundingBox();
  expect(imageBox).not.toBeNull();
  expect(bodyBox).not.toBeNull();
  expect(imageBox!.x).toBeGreaterThan(bodyBox!.x);
});
