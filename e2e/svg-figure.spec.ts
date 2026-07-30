import { expect, test } from '@playwright/test';

// svg-figure type（journey / gantt）の描画確認。既存e2eファイルは変更せず新規ファイルで完結させる。

const journeyDeck = `---
title: E2E svg-figure deck
palette: ocean
---
<!-- slide: svg-figure -->
## Signup ジャーニー
\`\`\`mermaid
journey
  title Signup Journey
  section Access
    LPを見る: 5: User
    会員登録: 4: User
  section Use
    初回ログイン: 3: User
\`\`\`
notes:
  - 初回接触からログインまでの主要導線
  - 離脱ポイントは会員登録直後
---
<!-- slide: sources -->
## 出典
- [example](https://example.com)
`;

const ganttDeck = `---
title: E2E svg-figure gantt deck
palette: ocean
---
<!-- slide: svg-figure -->
## Q3 開発スケジュール
\`\`\`mermaid
gantt
  title Project Plan
  dateFormat YYYY-MM-DD
  section Design
    要件整理 :a1, 2026-07-01, 3d
  section Dev
    実装 :after a1, 5d
\`\`\`
---
<!-- slide: sources -->
## 出典
- [example](https://example.com)
`;

const noNotesDeck = `---
title: E2E svg-figure no-notes
palette: ocean
---
<!-- slide: svg-figure -->
## タイトル
\`\`\`mermaid
journey
  A: 3: User
\`\`\`
---
<!-- slide: sources -->
## 出典
- [example](https://example.com)
`;

test('svg-figure(journey): SVGとnotesが描画される', async ({ page }) => {
  await page.goto('/');
  await page.locator('textarea').fill(journeyDeck);
  const active = page.locator('.slide.active');
  await expect(active.locator('.svg-figure-svg')).toBeVisible();
  await expect(active.locator('.svg-journey-dot')).toHaveCount(3);
  await expect(active.locator('.svg-figure-notes li')).toHaveCount(2);
});

test('svg-figure(gantt): SVGが描画される', async ({ page }) => {
  await page.goto('/');
  await page.locator('textarea').fill(ganttDeck);
  const active = page.locator('.slide.active');
  await expect(active.locator('.svg-figure-svg')).toBeVisible();
  await expect(active.locator('.svg-gantt-bar')).toHaveCount(2);
});

test('svg-figure: notes 省略時は with-notes クラスが付かない', async ({ page }) => {
  await page.goto('/');
  await page.locator('textarea').fill(noNotesDeck);
  const active = page.locator('.slide.active');
  await expect(active.locator('.svg-figure-body.with-notes')).toHaveCount(0);
  await expect(active.locator('.svg-figure-svg')).toBeVisible();
});
