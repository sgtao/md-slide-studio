/**
 * helpPopup.ts — 書き出しHTML用「ショートカットのヘルプ」（`?` キーで開閉するポップアップ）の部品。
 *
 * 書き出したHTMLにはアプリの ？ アイコン（HelpModal）が無いため、キー操作の一覧を `?` で出す。
 * 右上のボタンは増やさない（ボタンの数と位置はビューで変えない方針・v0.6.1）。
 *
 * 配置の理由: notesPopup.ts・overviewRuntime.ts と同じく、書き出しHTMLのランタイムが
 * app（export/exporters.ts）と cli（src/standalone.ts）に二重にあるため、1か所に置いて両方から取り込む。
 * DOM に触れない「文字列を返すだけ」のモジュール。スタイルは theme/overview.css（両方に同梱される）。
 */

/** ヘルプに並べるショートカット（書き出しHTMLで効くものだけ。1/2/3 の画面レイアウト切替はアプリのみ） */
export function exportShortcuts(hasNotes: boolean): { keys: string; desc: string }[] {
  return [
    { keys: '→ / Space', desc: '次のスライドへ（一覧表示ではスクロール）' },
    { keys: '← / Shift+Space', desc: '前のスライドへ（一覧表示ではスクロール）' },
    { keys: 'Home / End', desc: '先頭・末尾のスライドへ' },
    { keys: 'Enter', desc: '一覧表示で、現在のスライドを1枚表示で開く' },
    { keys: 'J', desc: 'ページ番号を入力して移動（右下の「3 / 22」をクリックでも可）' },
    { keys: 'V', desc: '一覧表示 ⇄ 1枚表示' },
    { keys: 'G', desc: '一覧グリッドを開閉（矢印で選び、Enter で開く）' },
    { keys: 'T', desc: 'サムネ帯を開閉（画面下部。クリックでそのページへ）' },
    ...(hasNotes ? [{ keys: 'N', desc: 'スピーカーノートを開閉' }] : []),
    { keys: 'F', desc: '全画面表示' },
    { keys: 'P', desc: 'PDFとして印刷' },
    { keys: 'Shift+S', desc: '現在のスライドをPNGで保存' },
    { keys: 'Shift+P', desc: '全スライドをZIP（PNG）で保存' },
    { keys: 'Esc', desc: 'ヘルプ・グリッド・ノート・メニューを閉じる' },
    { keys: '?', desc: 'このヘルプを開閉' },
  ];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** ヘルプのポップアップ本体（body 直下に置く。既定は閉）。 */
export function buildHelpPopupHtml(hasNotes: boolean): string {
  const rows = exportShortcuts(hasNotes)
    .map((s) => {
      const keys = s.keys
        .split(' / ')
        .map((k) => '<kbd>' + escapeHtml(k) + '</kbd>')
        .join(' / ');
      return '      <tr><th scope="row">' + keys + '</th><td>' + escapeHtml(s.desc) + '</td></tr>';
    })
    .join('\n');
  return [
    '<div id="help-popup" class="help-popup" hidden>',
    '  <div class="help-panel" role="dialog" aria-modal="true" aria-labelledby="help-title">',
    '    <div class="help-header">',
    '      <h2 id="help-title">キーボードショートカット</h2>',
    '      <button id="help-close" type="button" onclick="closeHelp()" aria-label="ヘルプを閉じる" title="閉じる（Esc）">✕</button>',
    '    </div>',
    '    <table class="help-table">',
    '      <tbody>',
    rows,
    '      </tbody>',
    '    </table>',
    '  </div>',
    '</div>',
  ].join('\n');
}

/**
 * 書き出しHTMLのインラインscriptの末尾（閲覧UIの後）へ追加するコード。
 * `?` で開閉、`Esc`・✕・背景クリックで閉じる。開いている間の `Esc` はヘルプを閉じるだけにする
 * （グリッド・ノートの `Esc` より先に、キャプチャ段階で受けて止める）。
 * 外側のテンプレートリテラルへそのまま埋め込めるよう、バッククォートと `${` は使わない。
 */
export const HELP_POPUP_SCRIPT = String.raw`

/* ─── ショートカットのヘルプ（? キー・v0.6.1） ─── */
function helpEl() { return document.getElementById('help-popup'); }
function isHelpOpen() { var h = helpEl(); return !!h && !h.hidden; }
var helpReturnFocus = null;
function openHelp() {
  var h = helpEl();
  if (!h) return;
  helpReturnFocus = document.activeElement;
  h.hidden = false;
  var c = document.getElementById('help-close');
  if (c) c.focus({ preventScroll: true });
}
function closeHelp() {
  var h = helpEl();
  if (!h || h.hidden) return;
  h.hidden = true;
  /* 開く前のフォーカスへ戻す（グリッドのサムネなど）。戻せなければ外す */
  if (helpReturnFocus && helpReturnFocus.focus && document.contains(helpReturnFocus)) {
    helpReturnFocus.focus({ preventScroll: true });
  } else if (document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }
  helpReturnFocus = null;
}
function toggleHelp() { if (isHelpOpen()) closeHelp(); else openHelp(); }
(function () {
  var h = helpEl();
  if (!h) return;
  /* 背景（パネルの外）をクリックで閉じる */
  h.addEventListener('click', function (e) { if (e.target === h) closeHelp(); });
})();
document.addEventListener('keydown', function (e) {
  var t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === '?') {
    e.preventDefault();
    e.stopPropagation();
    toggleHelp();
    return;
  }
  if (!isHelpOpen()) return;
  /* 開いている間は Esc で閉じるだけ。他のキー（ページ送りなど）も裏の画面へ渡さない（Tab は通す） */
  if (e.key === 'Escape') closeHelp();
  if (e.key === 'Tab') return;
  e.stopPropagation();
  /* ✕ ボタン上の Enter / Space は既定の動作（押す）を残す */
  var onHelpButton = t && t.tagName === 'BUTTON' && helpEl().contains(t);
  if (!(onHelpButton && (e.key === 'Enter' || e.key === ' '))) e.preventDefault();
}, true);
`;
