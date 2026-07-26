import { expect, test } from '@playwright/test';

// title の <br> が h1 内で改行として描画されることを確認する。
// 既存 e2e ファイルには追記せず新規ファイルとして分離する（anchor依存を避ける規約）。

const BR_TITLE_DECK = `---
title: E2E br deck
palette: ocean
---
<!-- slide: title -->
# E2E-BR-LINE1<br>E2E-BR-LINE2
subtitle: サブタイトル
---
<!-- slide: sources -->
## 出典
- [example](https://example.com)
`;

test('title(h1): <br> が改行として描画される', async ({ page }) => {
  await page.goto('/');
  await page.locator('textarea').fill(BR_TITLE_DECK);
  const h1 = page.locator('.slide.active h1');
  await expect(h1).toContainText('E2E-BR-LINE1');
  await expect(h1).toContainText('E2E-BR-LINE2');
  await expect(h1.locator('br')).toHaveCount(1);
});
