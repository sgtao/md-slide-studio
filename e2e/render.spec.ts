import { test, expect } from '@playwright/test';

// 既存 e2e/basic.spec.ts と同じ方式（textarea.fill() で最小デッキを注入）を採用する。
// sample.md 内の絶対スライド位置に依存するとナビゲーション回数の前提が崩れやすいため、
// 各typeにつき単一スライドの最小デッキを用意し、常に1枚目（デフォルトで active）を検証する。

const CHART_DECK = `---
title: E2E render deck
palette: ocean
---
<!-- slide: chart-bar -->
## E2E-CHART
\`\`\`chart
type: bar
title: 売上
data:
  - { label: A, value: 10 }
  - { label: B, value: 20 }
source: { name: 計測 }
\`\`\`
`;

const DIAGRAM_FLOW_DECK = `---
title: E2E render deck
palette: ocean
---
<!-- slide: diagram-flow -->
## E2E-DIAGRAM
\`\`\`diagram
type: flow
nodes: [調査, 設計, 実装]
\`\`\`
`;

const STEPS_DECK = `---
title: E2E render deck
palette: ocean
---
<!-- slide: steps -->
## E2E-STEPS
\`\`\`steps
style: cards
items:
  - { title: 調査, desc: 説明1 }
  - { title: 実装, desc: 説明2 }
\`\`\`
`;

const CONTRAST_DECK = `---
title: E2E render deck
palette: ocean
---
<!-- slide: contrast -->
## E2E-CONTRAST
\`\`\`contrast
example:
  rows:
    - { tag: 誤解, text: よくある思い込み }
verdict:
  - { label: 実際, text: 本当はこう }
\`\`\`
`;

test.describe('type別レンダリング（代表type固有のDOM目印）', () => {
  test('chart-bar: svg.chart-svg が描画される', async ({ page }) => {
    await page.goto('/');
    await page.locator('textarea').fill(CHART_DECK);
    const active = page.locator('.slide.active');
    await expect(active.locator('.slide-title')).toContainText('E2E-CHART');
    await expect(active.locator('svg.chart-svg')).toBeVisible();
  });

  test('diagram-flow: svg.diagram-svg が描画される', async ({ page }) => {
    await page.goto('/');
    await page.locator('textarea').fill(DIAGRAM_FLOW_DECK);
    const active = page.locator('.slide.active');
    await expect(active.locator('.slide-title')).toContainText('E2E-DIAGRAM');
    await expect(active.locator('svg.diagram-svg')).toBeVisible();
  });

  test('steps(cards): .steps-item が複数描画される', async ({ page }) => {
    await page.goto('/');
    await page.locator('textarea').fill(STEPS_DECK);
    const active = page.locator('.slide.active');
    await expect(active.locator('.slide-title')).toContainText('E2E-STEPS');
    const items = active.locator('.steps-item');
    await expect(items.first()).toBeVisible();
    expect(await items.count()).toBe(2);
  });

  test('contrast: .contrast-verdict-item が描画される', async ({ page }) => {
    await page.goto('/');
    await page.locator('textarea').fill(CONTRAST_DECK);
    const active = page.locator('.slide.active');
    await expect(active.locator('.slide-title')).toContainText('E2E-CONTRAST');
    await expect(active.locator('.contrast-example')).toBeVisible();
    await expect(active.locator('.contrast-verdict-item').first()).toBeVisible();
  });
});
