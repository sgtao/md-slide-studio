import { describe, expect, it } from 'vitest';
import { buildHelpPopupHtml, exportShortcuts, HELP_POPUP_SCRIPT } from './helpPopup';

describe('ショートカットのヘルプ（書き出しHTML）', () => {
  it('ポップアップは hidden で始まり、閉じるボタンとショートカット表を持つ', () => {
    const html = buildHelpPopupHtml(false);
    expect(html).toMatch(/<div id="help-popup" class="help-popup" hidden>/);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('id="help-close"');
    expect(html).toContain('<kbd>?</kbd>');
    expect(html).toContain('<kbd>Shift+Space</kbd>');
    expect((html.match(/<tr>/g) ?? []).length).toBe(exportShortcuts(false).length);
  });

  it('N（ノート）の行は、ノートのあるデッキだけに出す', () => {
    expect(buildHelpPopupHtml(false)).not.toContain('<kbd>N</kbd>');
    expect(buildHelpPopupHtml(true)).toContain('<kbd>N</kbd>');
    expect(exportShortcuts(true).length).toBe(exportShortcuts(false).length + 1);
  });

  it('アプリ専用の 1 / 2 / 3（画面レイアウト切替）は載せない', () => {
    const keys = exportShortcuts(true).map((s) => s.keys);
    expect(keys.some((k) => /(^|\s)[123](\s|$)/.test(k))).toBe(false);
  });

  it('外側のテンプレートリテラルに埋め込めるよう、バッククォートと ${ を含まない', () => {
    expect(HELP_POPUP_SCRIPT).not.toContain('`');
    expect(HELP_POPUP_SCRIPT).not.toContain('${');
    expect(HELP_POPUP_SCRIPT).toContain("e.key === '?'");
  });
});
