import { expect, test } from '@playwright/test';

/**
 * v0.5.2: hashベースルーター（wouter）導入のE2E。
 *
 * 対象ルート: `/`（edit・既定） / `/present` / `/settings`（プレースホルダー）。
 * hashベースのため直接アクセスは `/#/present` のように明示的にハッシュを含める
 * （`/present` へのgotoはハッシュが空になり実際にはeditモードが描画されてしまうため）。
 */
test.describe('ルーター（/, /present, /settings）', () => {
  test('/ ではeditモードが起動する（既定）', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'edit');
    await expect(page.locator('.editor-pane')).toBeVisible();
  });

  test('/#/present に直接アクセスするとpresentモードで起動する', async ({ page }) => {
    await page.goto('/#/present');
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'present');
    await expect(page.locator('.editor-pane')).toHaveCount(0);
    const headerButtons = page.locator('.app-header button');
    await expect(headerButtons).toHaveCount(1);
    await expect(headerButtons.first()).toHaveText('✎ 編集に戻る');
  });

  test('/#/settings に直接アクセスすると設定ページ（準備中）が表示され、戻るリンクで/に戻れる', async ({
    page,
  }) => {
    await page.goto('/#/settings');
    await expect(page.locator('.settings-page')).toContainText('準備中');

    await page.locator('.settings-page__back').click();
    await expect(page).toHaveURL(/\/#\/?$/);
    await expect(page.locator('.editor-pane')).toBeVisible();
  });

  test('サイドメニューの⚙️設定から遷移できる', async ({ page }) => {
    await page.goto('/');
    await page.locator('.side-menu__item', { hasText: '設定' }).click();
    await expect(page.locator('.settings-page')).toContainText('準備中');
  });

  test('ブラウザの戻る/進むボタンでedit⇄present間を行き来できる', async ({ page }) => {
    await page.goto('/');
    await page.locator('.side-menu__item', { hasText: 'プレゼン' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'present');

    await page.goBack();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'edit');

    await page.goForward();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'present');

    await page.locator('.app-header button.primary').click();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'edit');
  });
});
