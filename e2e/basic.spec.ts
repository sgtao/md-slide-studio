import { test, expect } from '@playwright/test';

test('初期表示: sample.mdが読み込まれtitleスライドが描画される', async ({ page }) => {
  await page.goto('/');
  const editor = page.locator('textarea');
  expect(await editor.inputValue()).toContain('MD Slide Studio');
  await expect(page.locator('.slide h1').first()).toBeVisible();
});

test('タイトルスライドの内容描画（h1・subtitle・badges）', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.slide h1').first()).toBeVisible();
  await expect(page.locator('.slide .subtitle').first()).toBeVisible();
  await expect(page.locator('.slide .badge').first()).toBeVisible();
});

test('エディタ編集がデバウンス後にプレビューへ反映される', async ({ page }) => {
  await page.goto('/');
  const editor = page.locator('textarea');
  const md = await editor.inputValue();
  await editor.fill(md.replace(/# .*/, '# E2E-TEST-TITLE'));
  await expect(page.locator('.slide h1').first()).toContainText('E2E-TEST-TITLE');
});

// ─── v0.2.0: steps type ＋ 共通ヘッダ拡張 ＋ tone: dark ───

const STEPS_DECK = `---
title: E2E steps deck
palette: ocean
---
<!-- slide: steps -->
badge: Step 1
## E2E-STEPS-CARDS
lead: リード文
\`\`\`steps
style: cards
items:
  - { icon: "🔍", title: 調査, desc: 説明文 }
  - { icon: "🛠️", title: 実装 }
\`\`\`
point: E2E-POINT-BAND
---
<!-- slide: steps, tone: dark -->
## E2E-STEPS-CIRCLED
\`\`\`steps
style: circled
items:
  - { title: 生成 }
  - { title: 修正 }
  - { title: 仕上げ }
ratio:
  - { label: AI, value: 70 }
  - { label: 手動, value: 30 }
\`\`\`
---
<!-- slide: sources -->
## 出典
- [example](https://example.com)
`;

test('steps(cards): カード・badge・lead・point帯が描画される', async ({ page }) => {
  await page.goto('/');
  await page.locator('textarea').fill(STEPS_DECK);
  const active = page.locator('.slide.active');
  await expect(active.locator('.slide-title')).toContainText('E2E-STEPS-CARDS');
  await expect(active.locator('.steps-item')).toHaveCount(2);
  await expect(active.locator('.slide-badge')).toHaveText('Step 1');
  await expect(active.locator('.slide-lead')).toContainText('リード文');
  await expect(active.locator('.slide-point')).toContainText('E2E-POINT-BAND');
});

test('steps(circled) + tone: dark: 番号丸・ratio帯・slide--darkが適用される', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('textarea').fill(STEPS_DECK);
  await expect(page.locator('.slide.active .steps-item')).toHaveCount(2);
  // 2枚目（tone: dark）へ移動。
  // fill() 直後はフォーカスが textarea にあり、useKeyboardNav は
  // 入力フィールド内のキー操作を無視する仕様（hooks.ts）のため、
  // キーボードではなくナビゲーションボタン（#btn-next）で送る
  await page.locator('#btn-next').click();
  const active = page.locator('.slide.active');
  await expect(active).toHaveClass(/slide--dark/);
  await expect(active.locator('.steps-num')).toHaveCount(3);
  await expect(active.locator('.steps-ratio-seg')).toHaveCount(2);
  // ダーク反転の実効確認（--bg-slide が上書きされている）
  const bg = await active.evaluate((el) =>
    getComputedStyle(el).getPropertyValue('--bg-slide').trim(),
  );
  expect(bg).toBe('#161b22');
});

// ─── v0.2.1: diagram-timeline ＋ chart side-list ───

const TIMELINE_DECK = `---
title: E2E timeline deck
palette: ocean
---
<!-- slide: diagram-timeline -->
## E2E-TIMELINE
\`\`\`diagram
type: timeline
start: 開始
milestones:
  - { label: 要件定義, when: Q1 }
  - { label: 実装, when: Q2 }
  - { label: リリース, when: Q3 }
\`\`\`
---
<!-- slide: chart-bar, layout: side-list -->
## E2E-SIDELIST
\`\`\`chart
type: bar
title: 売上推移
data:
  - { label: 1年目, value: 8 }
  - { label: 2年目, value: 18 }
source: { name: 計画 }
\`\`\`
### 前提条件
- **1年目**：500社
- **2年目**：比率60%
---
<!-- slide: sources -->
## 出典
- [example](https://example.com)
`;

test('diagram-timeline: Start円＋3マイルストーン（上下交互チック）が描画される', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('textarea').fill(TIMELINE_DECK);
  const active = page.locator('.slide.active');
  await expect(active.locator('.slide-title')).toContainText('E2E-TIMELINE');
  // Start 円（diagram-node-accent circle）
  await expect(active.locator('.diagram-svg circle.diagram-node-accent').first()).toBeVisible();
  // 3つのマイルストーンのチック先端丸（tl-dot）
  await expect(active.locator('.tl-dot')).toHaveCount(3);
  // ラベルテキスト
  await expect(active.locator('.diagram-svg')).toContainText('要件定義');
  await expect(active.locator('.diagram-svg')).toContainText('Q2');
});

test('chart-bar + side-list: グラフ左＋テキストパネル右が描画される', async ({ page }) => {
  await page.goto('/');
  await page.locator('textarea').fill(TIMELINE_DECK);
  // 2枚目へ移動
  await page.locator('#btn-next').click();
  const active = page.locator('.slide.active');
  await expect(active.locator('.slide-title')).toContainText('E2E-SIDELIST');
  // side-list レイアウト
  await expect(active.locator('.chart-side-list')).toBeVisible();
  // チャートとサイドパネルが同時に存在
  await expect(active.locator('.slide-chart')).toBeVisible();
  await expect(active.locator('.chart-side-panel h3')).toHaveText('前提条件');
  await expect(active.locator('.chart-side-panel li')).toHaveCount(2);
});
