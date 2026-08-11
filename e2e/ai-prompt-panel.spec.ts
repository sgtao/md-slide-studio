import { expect, test } from '@playwright/test';

/**
 * 左サイドメニュー「AIプロンプト」のメインパネル化。
 *
 * 確認すること:
 *   - サイドメニューから開くと editor-pane/preview-pane の代わりにパネルが出る
 *   - ヘッダーの🤖ボタンは従来どおりポップアップのまま（回帰確認）
 *   - パネル表示中は view切替・エクスポートが無効、テーマ・パレットは有効
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

  test('ヘッダーの🤖ボタンは従来どおりポップアップのまま', async ({ page }) => {
    await page.goto('/');
    await page.locator('.app-header button', { hasText: 'AIプロンプト' }).click();

    await expect(page.locator('.modal-backdrop')).toBeVisible();
    await expect(page.locator('.ai-prompt-pane')).toHaveCount(0);

    await page.locator('.modal-foot button', { hasText: '閉じる' }).click();
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);
  });

  test('パネル表示中はビュー切替・エクスポートが無効、テーマ・パレットは有効', async ({ page }) => {
    await page.goto('/');
    await page.locator('.side-menu__item', { hasText: 'AIプロンプト' }).click();

    await expect(page.locator('#view-toggle')).toBeDisabled();
    await expect(page.locator('#export-toggle')).toBeDisabled();
    await expect(page.locator('#theme-toggle')).toBeEnabled();
    await expect(page.locator('#palette-toggle')).toBeEnabled();

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
