import { expect, test, type Page } from '@playwright/test';

/**
 * MDファイルアップロード（v0.5.0）。
 * ボタン経由（input[type=file]、page.waitForEvent('filechooser')で捕捉）・
 * ドロップ経由（.editor-pane）の両ルートと、拡張子NG／サイズ超過／読み込み失敗の
 * 3エラーパターンを検証する。確認ダイアログは常に表示される仕様
 * （02_migration-plan 0815-01 Q1）。
 */

async function openViaButton(
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer },
) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('.side-menu__item', { hasText: '開く' }).click(),
  ]);
  await chooser.setFiles(file);
}

test.describe('MDファイルアップロード', () => {
  test('ボタン経由: 選択→確認→OKでエディタの内容が置き換わる', async ({ page }) => {
    await page.goto('/');
    const textarea = page.locator('.editor-pane textarea');
    await expect(textarea).toBeVisible();

    await openViaButton(page, {
      name: 'uploaded.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('---\ntitle: Uploaded\n---\n<!-- slide: title -->\n# Uploaded'),
    });

    const modal = page.locator('.confirm-modal[data-modal-kind="confirm"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('uploaded.md');

    await modal.getByRole('button', { name: '置き換える' }).click();
    await expect(modal).toHaveCount(0);
    await expect(textarea).toHaveValue(/title: Uploaded/);
  });

  test('確認ダイアログでキャンセルすると内容は変わらない', async ({ page }) => {
    await page.goto('/');
    const textarea = page.locator('.editor-pane textarea');
    const before = await textarea.inputValue();

    await openViaButton(page, {
      name: 'uploaded.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Should not apply'),
    });

    const modal = page.locator('.confirm-modal[data-modal-kind="confirm"]');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'キャンセル' }).click();

    await expect(modal).toHaveCount(0);
    await expect(textarea).toHaveValue(before);
  });

  test('ドロップ経由: .editor-pane へドロップ→確認→OKで反映される', async ({ page }) => {
    await page.goto('/');
    const textarea = page.locator('.editor-pane textarea');

    await page.locator('.editor-pane').evaluate((el) => {
      const dt = new DataTransfer();
      dt.items.add(new File(['# Dropped content'], 'dropped.md', { type: 'text/markdown' }));
      el.dispatchEvent(
        new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }),
      );
    });

    const modal = page.locator('.confirm-modal[data-modal-kind="confirm"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('dropped.md');
    await modal.getByRole('button', { name: '置き換える' }).click();

    await expect(textarea).toHaveValue(/Dropped content/);
  });

  test('ドラッグ中は .editor-pane にハイライト属性が付く', async ({ page }) => {
    await page.goto('/');
    const editorPane = page.locator('.editor-pane');

    await editorPane.evaluate((el) => {
      el.dispatchEvent(
        new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          dataTransfer: new DataTransfer(),
        }),
      );
    });
    await expect(editorPane).toHaveAttribute('data-drag-over', 'true');

    await editorPane.evaluate((el) => {
      el.dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true }));
    });
    await expect(editorPane).not.toHaveAttribute('data-drag-over', 'true');
  });

  test('エラー: 許可拡張子以外（.txt）はエラーモーダルが表示される', async ({ page }) => {
    await page.goto('/');
    await openViaButton(page, {
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('plain text'),
    });

    const modal = page.locator('.confirm-modal[data-modal-kind="error"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('.md または .markdown');
    await modal.getByRole('button', { name: '閉じる' }).click();
    await expect(modal).toHaveCount(0);
  });

  test('エラー: 2MB超のファイルはエラーモーダルが表示される', async ({ page }) => {
    await page.goto('/');
    await openViaButton(page, {
      name: 'huge.md',
      mimeType: 'text/markdown',
      buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
    });

    const modal = page.locator('.confirm-modal[data-modal-kind="error"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('上限（2MB）');
  });

  test('エラー: 読み込み失敗時もエラーモーダルが表示される', async ({ page }) => {
    // FileReaderをテスト用に差し替え、readAsText呼び出しで必ずonerrorが発火するようにする
    // （実ファイルで読み込み失敗を再現するのは困難なための代替手段）。
    await page.addInitScript(() => {
      class FailingFileReader {
        onerror: ((ev: unknown) => void) | null = null;
        onload: ((ev: unknown) => void) | null = null;
        readAsText() {
          setTimeout(() => this.onerror?.(new Event('error')), 0);
        }
      }
      Object.defineProperty(window, 'FileReader', { value: FailingFileReader, writable: true });
    });
    await page.goto('/');

    await openViaButton(page, {
      name: 'sample.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# ok'),
    });

    const modal = page.locator('.confirm-modal[data-modal-kind="error"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('読み込みに失敗しました');
  });
});
