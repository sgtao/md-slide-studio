import { describe, expect, it } from 'vitest';
import {
  buildNotesButtonHtml,
  buildNotesPopupHtml,
  htmlHasSpeakerNotes,
  NOTES_POPUP_SCRIPT,
} from './notesPopup';

describe('htmlHasSpeakerNotes', () => {
  it('slide-notes 要素があれば true（renderToStaticMarkup / outerHTML のどちらの形でも）', () => {
    expect(htmlHasSpeakerNotes('<aside class="slide-notes" aria-label="x" hidden="">')).toBe(true);
    expect(htmlHasSpeakerNotes('<aside hidden="" class="slide-notes">')).toBe(true);
  });
  it('無ければ false（既存MDの出力にポップアップを足さない）', () => {
    expect(
      htmlHasSpeakerNotes('<section class="slide"><p class="note">見える補足</p></section>'),
    ).toBe(false);
    expect(htmlHasSpeakerNotes('')).toBe(false);
  });
});

describe('ノートポップアップの部品', () => {
  it('ボタンは既定で hidden（hero になるまで JS が出す）で、押すと toggleNotes を呼ぶ', () => {
    const html = buildNotesButtonHtml();
    expect(html).toContain('id="notes-toggle"');
    expect(html).toContain('onclick="toggleNotes()"');
    expect(html).toMatch(/aria-expanded="false"[^>]*hidden/);
  });

  it('ポップアップは hidden で始まり、前へ／次へ／閉じるのIDを持つ', () => {
    const html = buildNotesPopupHtml();
    expect(html).toMatch(/id="notes-popup"[^>]*role="dialog"[^>]*hidden/);
    for (const id of ['notes-page', 'notes-body', 'notes-prev', 'notes-next', 'notes-close']) {
      expect(html, id).toContain(`id="${id}"`);
    }
    expect(html).toContain('onclick="navigate(-1)"');
    expect(html).toContain('onclick="navigate(1)"');
    expect(html).toContain('onclick="closeNotes()"');
  });

  it('スクリプトは外側のテンプレートリテラルに埋め込めるよう、バッククォートと ${ を含まない', () => {
    expect(NOTES_POPUP_SCRIPT).not.toContain('`');
    expect(NOTES_POPUP_SCRIPT).not.toContain('${');
  });

  it('スクリプトは文法的に正しい（関数として構築できる）', () => {
    expect(() => new Function(NOTES_POPUP_SCRIPT)).not.toThrow();
  });
});
