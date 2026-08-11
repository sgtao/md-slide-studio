import { expect, test } from '@playwright/test';

/**
 * 左サイドメニュー「AIプロンプト」のメインパネル化。
 *
 * 確認すること:
 *   - サイドメニューから開くと editor-pane/preview-pane の代わりにパネルが出る
 *   - パネル表示中は ControlCluster（.preview-pane内部のため）もDOMごと消える
 *   - 複数行のテーマ入力がプロンプト内容に反映される
 *   - 「閉じる」／表示モード切替でパネルが閉じる
 *   - パネルの開閉状態はリロードで保持されない（非永続の一時ビュー）
 */
test.describe('AIプロンプト（左サイドメニュー・メインパネル）', () => {
  test('サイドメニューから開くとメインパネルに表示される', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.side-menu')).toBeVisible();

    await page.locator('.side-menu__item', { hasText: 'AIプロンプト' }).click();

    await expect(page.locator('.ai-prompt-pane')).toBeVisible();
    await expect(page.locator('.editor-pane')).toHaveCount(0);
    await expect(page.locator('.preview-pane')).toHaveCount(0);
    await expect(page.locator('.side-menu__item', { hasText: 'AIプロンプト' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // 後始末
    await page.locator('[data-layout-opt="split"]').click();
  });

  test('パネル表示中は ControlCluster がDOMごと消える', async ({ page }) => {
    await page.goto('/');
    await page.locator('.side-menu__item', { hasText: 'AIプロンプト' }).click();

    // v0.4.10: ControlClusterは.preview-pane内部へ移設したため、
    // .preview-pane自体が無いAIプロンプトパネル表示中はDOMごと消える。
    await expect(page.locator('.control-cluster')).toHaveCount(0);

    await page.locator('[data-layout-opt="split"]').click();
  });

  test('複数行のテーマ入力がプロンプト内容に反映される', async ({ page }) => {
    await page.goto('/');
    await page.locator('.side-menu__item', { hasText: 'AIプロンプト' }).click();

    const pre = page.locator('.ai-prompt-pane pre');
    const before = await pre.textContent();

    await page.locator('.ai-prompt-pane__theme textarea').fill('1行目のテーマ\n2行目の補足');
    await expect(pre).not.toHaveText(before ?? '');

    await page.locator('[data-layout-opt="split"]').click();
  });

  test('「閉じる」ボタンで split レイアウトへ戻る', async ({ page }) => {
    await page.goto('/');
    await page.locator('.side-menu__item', { hasText: 'AIプロンプト' }).click();
    await expect(page.locator('.ai-prompt-pane')).toBeVisible();

    await page.locator('.ai-prompt-pane .modal-foot button', { hasText: '閉じる' }).click();

    await expect(page.locator('.ai-prompt-pane')).toHaveCount(0);
    await expect(page.locator('.workspace')).toHaveAttribute('data-layout', 'split');
    await expect(page.locator('.editor-pane')).toBeVisible();
    await expect(page.locator('.preview-pane')).toBeVisible();
  });

  test('表示モード切替でパネルが閉じる', async ({ page }) => {
    await page.goto('/');
    await page.locator('.side-menu__item', { hasText: 'AIプロンプト' }).click();
    await expect(page.locator('.ai-prompt-pane')).toBeVisible();

    await page.locator('[data-layout-opt="preview"]').click();

    await expect(page.locator('.ai-prompt-pane')).toHaveCount(0);
    await expect(page.locator('.workspace')).toHaveAttribute('data-layout', 'preview');

    await page.locator('[data-layout-opt="split"]').click();
  });

  test('開閉状態はリロードで保持されない（非永続）', async ({ page }) => {
    await page.goto('/');
    await page.locator('.side-menu__item', { hasText: 'AIプロンプト' }).click();
    await expect(page.locator('.ai-prompt-pane')).toBeVisible();

    await page.reload();

    await expect(page.locator('.ai-prompt-pane')).toHaveCount(0);
    await expect(page.locator('.editor-pane')).toBeVisible();
    await expect(page.locator('.preview-pane')).toBeVisible();
  });
});
