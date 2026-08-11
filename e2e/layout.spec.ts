import { expect, test } from '@playwright/test';

/**
 * 表示モード（2分割／編集のみ／プレビューのみ）と左サイドメニューのE2E。
 *
 * 方針:
 *   - 既存specを壊さないため、各テストは page.goto('/') から始め、最後に既定（2分割・
 *     メニュー展開）へ戻してから終える。
 *   - PNG/ZIP の実書き出し検証は既存 export.spec.ts のflaky事情を踏まえ、ここには含めない
 *     （「編集のみ」でボタンが無効になっていることの確認までにとどめる）。
 */
test.describe('表示モード切替（左サイドメニュー）', () => {
  test('既定は2分割でエディタとプレビューが両方見える', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.workspace')).toHaveAttribute('data-layout', 'split');
    await expect(page.locator('.editor-pane')).toBeVisible();
    await expect(page.locator('.preview-pane')).toBeVisible();
    await expect(page.locator('[data-layout-opt="split"]')).toHaveAttribute('aria-checked', 'true');
  });

  test('「編集のみ」でプレビューが消え、書き出しとビュー切替が無効になる', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-layout-opt="editor"]').click();

    await expect(page.locator('.workspace')).toHaveAttribute('data-layout', 'editor');
    await expect(page.locator('.editor-pane')).toBeVisible();
    await expect(page.locator('.preview-pane')).toHaveCount(0);

    // ControlCluster は .preview-pane の外に出したので存在し続ける
    await expect(page.locator('#theme-toggle')).toBeEnabled();
    await expect(page.locator('#palette-toggle')).toBeEnabled();
    await expect(page.locator('#view-toggle')).toBeDisabled();
    await expect(page.locator('#export-toggle')).toBeDisabled();

    await page.locator('[data-layout-opt="split"]').click();
  });

  test('「プレビューのみ」でエディタが消える', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-layout-opt="preview"]').click();

    await expect(page.locator('.workspace')).toHaveAttribute('data-layout', 'preview');
    await expect(page.locator('.editor-pane')).toHaveCount(0);
    await expect(page.locator('.preview-pane')).toBeVisible();
    await expect(page.locator('#export-toggle')).toBeEnabled();

    await page.locator('[data-layout-opt="split"]').click();
  });

  test('選択がリロード後も保持される（localStorage: mdss-layout）', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-layout-opt="preview"]').click();
    await expect(page.locator('.workspace')).toHaveAttribute('data-layout', 'preview');

    await page.reload();
    await expect(page.locator('.workspace')).toHaveAttribute('data-layout', 'preview');

    await page.locator('[data-layout-opt="split"]').click();
  });

  test('1 / 2 / 3 キーで切り替わる', async ({ page }) => {
    await page.goto('/');
    // キー入力はクリックと異なりPlaywrightの自動待機が効かないため、
    // useKeyboardNav の keydown リスナー登録（＝アプリのマウント完了）を
    // 明示的に待ってから送る。待たずに送ると、マウント直前の一瞬でイベントが
    // 失われ、以後アサーションが何度ポーリングしても変化しない
    // （アサーションは状態の再確認であり、キー入力を再送しないため）。
    await expect(page.locator('.side-menu')).toBeVisible();
    await page.keyboard.press('2');
    await expect(page.locator('.workspace')).toHaveAttribute('data-layout', 'editor');
    await page.keyboard.press('3');
    await expect(page.locator('.workspace')).toHaveAttribute('data-layout', 'preview');
    await page.keyboard.press('1');
    await expect(page.locator('.workspace')).toHaveAttribute('data-layout', 'split');
  });

  test('エディタ入力中は 1/2/3 が効かない（既存のキーガード仕様）', async ({ page }) => {
    await page.goto('/');
    await page.locator('.editor-pane textarea').click();
    await page.keyboard.press('2');
    await expect(page.locator('.workspace')).toHaveAttribute('data-layout', 'split');
  });

  test('サイドメニューの開閉がリロード後も保持される', async ({ page }) => {
    await page.goto('/');
    const menu = page.locator('.side-menu');
    await expect(menu).toHaveAttribute('data-expanded', 'true');

    await page.locator('.side-menu__toggle').click();
    await expect(menu).toHaveAttribute('data-expanded', 'false');

    await page.reload();
    await expect(menu).toHaveAttribute('data-expanded', 'false');

    await page.locator('.side-menu__toggle').click();
    await expect(menu).toHaveAttribute('data-expanded', 'true');
  });

  test('プレゼンモードではプレビュー固定になり、戻ると作業レイアウトへ復帰する', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('[data-layout-opt="editor"]').click();
    await expect(page.locator('.workspace')).toHaveAttribute('data-layout', 'editor');

    await page.locator('.app-header button.primary').click();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'present');
    await expect(page.locator('.workspace')).toHaveAttribute('data-layout', 'preview');
    await expect(page.locator('.editor-pane')).toHaveCount(0);

    await page.locator('.app-header button.primary').click();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'edit');
    await expect(page.locator('.workspace')).toHaveAttribute('data-layout', 'editor');

    await page.locator('[data-layout-opt="split"]').click();
  });
});
