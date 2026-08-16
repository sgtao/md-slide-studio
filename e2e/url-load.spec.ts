import { expect, test, type Page } from '@playwright/test';

/**
 * URL指定によるMD取得（v0.5.1）。
 * 実ネットワークには一切出ず、page.route()でfetchをintercept・モックする
 * （02_migration-plan 0816-02 リスクテーブル：Playwright E2Eで実ネットワークに依存しない）。
 */

const OK_URL = 'https://raw.githubusercontent.com/example/repo/main/ok.md';
const MISSING_URL = 'https://raw.githubusercontent.com/example/repo/main/missing.md';
const BROKEN_URL = 'https://raw.githubusercontent.com/example/repo/main/broken.md';
const BLOB_URL = 'https://github.com/example/repo/blob/main/ok.md';

const VALID_MD = '---\ntitle: Loaded\npalette: ocean\n---\n<!-- slide: title -->\n# Loaded';
const LINT_BLOCKED_MD =
  '---\ntitle: Broken\npalette: ocean\n---\n<!-- slide: contrast -->\n## 見出しのみ';

async function openModal(page: Page) {
  await page.locator('.side-menu__item', { hasText: 'URLで取得' }).click();
  const modal = page.locator('.url-load-modal[data-modal-kind="url-load-input"]');
  await expect(modal).toBeVisible();
  return modal;
}

test.describe('URL指定によるMD取得', () => {
  test('エラー: 404を返すURLはエラーメッセージが表示され、モーダルは閉じない', async ({ page }) => {
    await page.route(MISSING_URL, (route) => route.fulfill({ status: 404, body: 'not found' }));
    await page.goto('/');
    const modal = await openModal(page);

    await modal.locator('input[aria-label="MDファイルのURL"]').fill(MISSING_URL);
    await modal.getByRole('button', { name: '取得' }).click();

    await expect(modal.locator('.url-load-modal__error')).toContainText('見つかりません');
    await expect(modal).toBeVisible();
  });

  test('エラー後にURLを直して再取得すると正常に反映される', async ({ page }) => {
    await page.route(MISSING_URL, (route) => route.fulfill({ status: 404, body: 'not found' }));
    await page.route(OK_URL, (route) =>
      route.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: VALID_MD }),
    );
    await page.goto('/');
    const textarea = page.locator('.editor-pane textarea');
    const modal = await openModal(page);
    const input = modal.locator('input[aria-label="MDファイルのURL"]');

    await input.fill(MISSING_URL);
    await modal.getByRole('button', { name: '取得' }).click();
    await expect(modal.locator('.url-load-modal__error')).toBeVisible();

    await input.fill(OK_URL);
    await modal.getByRole('button', { name: '取得' }).click();

    const confirmModal = page.locator('.confirm-modal[data-modal-kind="confirm"]');
    await expect(confirmModal).toBeVisible();
    await confirmModal.getByRole('button', { name: '置き換える' }).click();
    await expect(textarea).toHaveValue(/title: Loaded/);
  });

  test('正常反映: 取得→確認→OKでエディタの内容が置き換わる', async ({ page }) => {
    await page.route(OK_URL, (route) =>
      route.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: VALID_MD }),
    );
    await page.goto('/');
    const textarea = page.locator('.editor-pane textarea');
    const modal = await openModal(page);

    await modal.locator('input[aria-label="MDファイルのURL"]').fill(OK_URL);
    await modal.getByRole('button', { name: '取得' }).click();

    const confirmModal = page.locator('.confirm-modal[data-modal-kind="confirm"]');
    await expect(confirmModal).toBeVisible();
    await expect(confirmModal).toContainText('置き換えます');
    await confirmModal.getByRole('button', { name: '置き換える' }).click();

    await expect(confirmModal).toHaveCount(0);
    await expect(textarea).toHaveValue(/title: Loaded/);
  });

  test('blob URL: github.comのblob URLを自動でraw形式へ変換して取得する', async ({ page }) => {
    // raw.githubusercontent.com側のルートのみ登録する。blob URLのまま
    // fetchされていた場合はこのルートに一致せず実ネットワークへ出てしまい
    // 反映まで到達しないため、正規化が効いていることの検証になる。
    await page.route(OK_URL, (route) =>
      route.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: VALID_MD }),
    );
    await page.goto('/');
    const textarea = page.locator('.editor-pane textarea');
    const modal = await openModal(page);

    await modal.locator('input[aria-label="MDファイルのURL"]').fill(BLOB_URL);
    await modal.getByRole('button', { name: '取得' }).click();

    const confirmModal = page.locator('.confirm-modal[data-modal-kind="confirm"]');
    await expect(confirmModal).toBeVisible();
    await confirmModal.getByRole('button', { name: '置き換える' }).click();
    await expect(textarea).toHaveValue(/title: Loaded/);
  });

  test('LINTブロック: errorを含むMDは一覧表示のみで反映されない', async ({ page }) => {
    await page.route(BROKEN_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: LINT_BLOCKED_MD,
      }),
    );
    await page.goto('/');
    const textarea = page.locator('.editor-pane textarea');
    const before = await textarea.inputValue();
    const modal = await openModal(page);

    await modal.locator('input[aria-label="MDファイルのURL"]').fill(BROKEN_URL);
    await modal.getByRole('button', { name: '取得' }).click();

    const lintModal = page.locator('.url-load-modal[data-modal-kind="url-lint-blocked"]');
    await expect(lintModal).toBeVisible();
    await expect(lintModal).toContainText('example');
    await lintModal.getByRole('button', { name: '閉じる' }).click();

    await expect(lintModal).toHaveCount(0);
    await expect(textarea).toHaveValue(before);
  });
});
