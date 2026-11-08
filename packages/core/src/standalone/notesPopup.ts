/**
 * notesPopup.ts — 書き出しHTML用「ノートポップアップ」（右上 🗒️ ボタン）の部品。
 *
 * hero ビュー（V で切り替える1枚表示）で 🗒️ を押すと、現在のスライドのスピーカーノート
 * （`<aside class="slide-notes" hidden>`、`note:` 行）を浮かぶパネルで読める。
 * パネル内の「前へ／次へ」でページ移動もできる。設計: 22_design-mdss-migrate/03_migration-plan/
 * 02_viewer-ui-plan.md §4-6。
 *
 * 配置の理由:
 * - 書き出しHTMLのランタイム（ボタン群・インラインscript）は app（export/exporters.ts）と
 *   cli（src/standalone.ts）に二重にある。統合前に二重実装を増やさないよう、この部品を
 *   1か所に置いて両方から取り込む。DOM に触れない「文字列を返すだけ」のモジュール。
 * - アプリのプレビュー側は React（app/src/components/NotesPopup.tsx）で別実装だが、
 *   DOM の id・クラス名は同じ（CSS は nav-controls.css を共有）。
 *
 * 出力条件: ノートが1つも無いデッキでは何も出力しない（既存MDの出力を変えない）。
 */

/** 描画済みのスライドHTMLに、スピーカーノート要素が1つでもあるか。 */
export function htmlHasSpeakerNotes(sectionsHtml: string): boolean {
  return /class="slide-notes"/.test(sectionsHtml);
}

/** `.control-cluster` の先頭に置く 🗒️ ボタン。hero ビュー以外では JS が隠す。 */
export function buildNotesButtonHtml(): string {
  return '  <button id="notes-toggle" type="button" onclick="toggleNotes()" title="ノート（N）" aria-label="スピーカーノート" aria-expanded="false" hidden>🗒️</button>';
}

/**
 * ノートのポップアップ本体（`.control-cluster` の子として置く）。
 * 本文・ページ番号・前後ボタンの状態は JS（NOTES_POPUP_SCRIPT）が更新する。
 * メニュー（パレット・エクスポート）のドロップダウンより下に重なるよう、クラスタの先頭側に置く。
 */
export function buildNotesPopupHtml(): string {
  return [
    '  <div id="notes-popup" class="notes-popup" role="dialog" aria-label="スピーカーノート" hidden>',
    '    <div class="notes-header">',
    '      <span class="notes-title">🗒️ ノート</span>',
    '      <span id="notes-page" class="notes-page"></span>',
    '      <button id="notes-close" type="button" onclick="closeNotes()" aria-label="ノートを閉じる" title="閉じる（Esc）">✕</button>',
    '    </div>',
    '    <div id="notes-body" class="notes-body"></div>',
    '    <div class="notes-footer">',
    '      <button id="notes-prev" type="button" onclick="navigate(-1)">◀ 前へ</button>',
    '      <button id="notes-next" type="button" onclick="navigate(1)">次へ ▶</button>',
    '    </div>',
    '  </div>',
  ].join('\n');
}

/**
 * 書き出しHTMLのインラインscriptの末尾（`applyView();` の後）へ追加するコード。
 * 既存の update() / applyView() を包んで、移動・ビュー切替のたびにポップアップを更新する
 * （元のscriptは変更しない）。外側のテンプレートリテラルへそのまま埋め込めるよう、
 * バッククォートと `${` は使わない。
 */
export const NOTES_POPUP_SCRIPT = String.raw`

/* ─── ノートポップアップ（hero ビュー専用・v0.6.0） ─── */
var notesOpen = false;
function currentNotesHtml() {
  var aside = slides[cur] ? slides[cur].querySelector('.slide-notes') : null;
  return aside ? aside.innerHTML : '';
}
function refreshNotes() {
  var btn = document.getElementById('notes-toggle');
  var pop = document.getElementById('notes-popup');
  if (!btn || !pop) return;
  var hero = (currentView === 'hero');
  var html = currentNotesHtml();
  btn.hidden = !hero;
  btn.classList.toggle('is-empty', !html);
  btn.setAttribute('aria-expanded', String(hero && notesOpen));
  pop.hidden = !(hero && notesOpen);
  if (pop.hidden) return;
  var body = document.getElementById('notes-body');
  body.innerHTML = html || '<p class="notes-empty">（ノートなし）</p>';
  body.scrollTop = 0;
  document.getElementById('notes-page').textContent = (cur + 1) + ' / ' + total;
  document.getElementById('notes-prev').disabled = (cur === 0);
  document.getElementById('notes-next').disabled = (cur === total - 1);
}
function toggleNotes() {
  if (currentView !== 'hero') return;
  notesOpen = !notesOpen;
  refreshNotes();
}
function closeNotes() {
  notesOpen = false;
  refreshNotes();
}
var baseUpdate = update;
update = function () { baseUpdate(); refreshNotes(); };
var baseApplyView = applyView;
applyView = function () { baseApplyView(); refreshNotes(); };
(function () {
  var pop = document.getElementById('notes-popup');
  if (pop) {
    /* ボタンをマウスで押してもフォーカスを奪わない（Space がスライド送りのまま効く） */
    pop.addEventListener('mousedown', function (e) {
      if (e.target.closest('button')) e.preventDefault();
    });
  }
})();
document.addEventListener('keydown', function (e) {
  var t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
  if (!e.shiftKey && (e.key === 'n' || e.key === 'N')) { toggleNotes(); return; }
  if (e.key === 'Escape' && notesOpen) { closeNotes(); e.preventDefault(); }
});
refreshNotes();
`;
