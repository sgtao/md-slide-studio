/**
 * standalone.ts — スタンドアロン単一HTMLの組み立て（DOM非依存の純関数群）。
 *
 * 出典: packages/app/src/export/exporters.ts の以下をそのまま移設したもの。
 *   - PALETTE_META_STANDALONE / escapeHtml / buildControlClusterHtml / buildInlineScript
 * これらは元々 document/window を参照しない純テキスト組み立てで、ブラウザ export と
 * CLI で共有できる。CLIでは collectCss(DOM走査) の代わりに themeCss(ファイル連結) を、
 * cloneNode の代わりに renderToStaticMarkup の出力を assembleStandaloneHtml に渡す。
 *
 * ※ v1では逐語コピーで独立性を優先。将来 app と共有する場合は本ファイルを
 *   @mdss/app 側 standaloneTemplate.ts に一本化し、exporters.ts と CLI の双方から
 *   import する（CHANGELOG / 計画のフォローアップ項目を参照）。
 */

const PALETTE_META_STANDALONE: { id: string; icon: string; label: string }[] = [
  { id: 'ocean', icon: '🌊', label: 'Ocean（既定）' },
  { id: 'forest', icon: '🌲', label: 'Forest' },
  { id: 'sunset', icon: '🌅', label: 'Sunset' },
  { id: 'plum', icon: '🍇', label: 'Plum' },
  { id: 'graphite', icon: '⬛', label: 'Graphite' },
];

function escapeHtml(s: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return s.replace(/[&<>"']/g, (c) => map[c]);
}

function buildControlClusterHtml(palette: string): string {
  const paletteButtons = PALETTE_META_STANDALONE.map((p) => {
    const active = p.id === palette ? ' is-active' : '';
    return (
      '<button type="button" role="menuitem" class="pal-' +
      p.id +
      active +
      '" data-palette-opt="' +
      p.id +
      '" onclick="setPalette(\'' +
      p.id +
      '\')"><span class="palette-ico">' +
      p.icon +
      '</span>' +
      escapeHtml(p.label) +
      '</button>'
    );
  }).join('\n        ');

  return [
    '<div class="control-cluster">',
    '  <button id="theme-toggle" onclick="toggleTheme()" title="テーマ切替"><span id="theme-icon">🌙</span></button>',
    '  <button id="view-toggle" onclick="toggleView()" title="表示切替（V）">▭</button>',
    '  <div class="palette-menu">',
    '    <button id="palette-toggle" onclick="togglePaletteMenu()" title="カラーパレット">🎨</button>',
    '    <div id="palette-dropdown" class="palette-dropdown" hidden role="menu">',
    '        ' + paletteButtons,
    '    </div>',
    '  </div>',
    '  <div class="export-menu">',
    '    <button id="export-toggle" onclick="toggleExportMenu()" title="エクスポート">📥</button>',
    '    <div id="export-dropdown" class="export-dropdown" hidden role="menu">',
    '      <button type="button" role="menuitem" onclick="exportPDF(); closeExportMenu();">📄 PDFとして印刷 <span class="kbd">P</span></button>',
    '      <button type="button" role="menuitem" onclick="exportSinglePNG(); closeExportMenu();">🖼️ このスライドをPNG <span class="kbd">Shift+S</span></button>',
    '      <button type="button" role="menuitem" onclick="exportAllPNG(); closeExportMenu();">📦 全スライドをZIP <span class="kbd">Shift+P</span></button>',
    '      <button type="button" role="menuitem" onclick="saveMd(); closeExportMenu();">📝 スライドMDを保存</button>',
    '    </div>',
    '  </div>',
    '</div>',
  ].join('\n');
}

function buildInlineScript(deckTitleJson: string, deckMdJson: string): string {
  return `
const DECK_TITLE = ${deckTitleJson};
const DECK_MD = ${deckMdJson};
const PALETTES = ['ocean', 'forest', 'sunset', 'plum', 'graphite'];

const slides = document.querySelectorAll('.slide');
const total = slides.length;
let cur = 0;
let currentView = (document.documentElement.dataset.view === 'hero') ? 'hero' : 'list';
let openMenu = null; // 'palette' | 'export' | null

/* ─── ユーティリティ（exporters.ts の sanitize/timestamp と同一ロジック） ─── */
function sanitizeName(s) {
  return s.replace(/[\\\\\\/:*?"<>|]/g, '_').slice(0, 60);
}
function timestampStr() {
  var now = new Date();
  function pad(n) { return String(n).padStart(2, '0'); }
  return String(now.getFullYear()).slice(2) + pad(now.getMonth() + 1) + pad(now.getDate()) +
    pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
}
function downloadBlob(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── fit-slide.js ─── */
function fitSlide() {
  var scaler = document.querySelector('.slide-scaler');
  if (!scaler) return;
  var vw = window.innerWidth;
  var vh = window.innerHeight;
  var ratio = Math.min(vw / 960, vh / 540) * 0.92;
  scaler.style.transform = 'translate(-50%, -50%) scale(' + ratio + ')';
}
window.addEventListener('resize', function () {
  if (currentView === 'hero') fitSlide();
  if (currentView === 'list') scaleListSlides();
});

/* ─── theme-toggle.js ─── */
function toggleTheme() {
  var isDark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
  document.getElementById('theme-icon').textContent = isDark ? '🌙' : '☀️';
}

/* ─── view-toggle.js ─── */
function toggleView() {
  currentView = (currentView === 'hero') ? 'list' : 'hero';
  applyView();
}
function applyView() {
  document.documentElement.dataset.view = currentView;
  document.body.dataset.view = currentView;
  document.getElementById('view-toggle').textContent = (currentView === 'hero') ? '☰' : '▭';
  if (currentView === 'hero') {
    slides.forEach(function (s, i) { s.classList.toggle('active', i === cur); });
    fitSlide();
    update();
  } else {
    scaleListSlides();
  }
}
function scaleListSlides() {
  requestAnimationFrame(function () {
    slides.forEach(function (slide) {
      var inner = slide.querySelector('.slide-inner');
      if (!inner) return;
      var ratio = slide.clientWidth / 960;
      inner.style.transform = 'scale(' + ratio + ')';
    });
  });
}
slides.forEach(function (slide, i) {
  slide.addEventListener('click', function () {
    if (currentView !== 'list') return;
    cur = i;
    currentView = 'hero';
    applyView();
  });
});

/* ─── navigation.js ─── */
function navigate(dir) {
  if (currentView === 'list') return;
  slides[cur].classList.remove('active');
  cur = Math.max(0, Math.min(total - 1, cur + dir));
  slides[cur].classList.add('active');
  update();
}
function update() {
  var bar = document.getElementById('progress-bar');
  if (bar) bar.style.width = ((cur + 1) / total * 100) + '%';
  var counter = document.getElementById('slide-counter');
  if (counter) counter.textContent = (cur + 1) + ' / ' + total;
  updateArrows();
}
function updateArrows() {
  var prev = document.getElementById('btn-prev');
  var next = document.getElementById('btn-next');
  if (prev) prev.hidden = (currentView === 'list') || (cur === 0);
  if (next) next.hidden = (currentView === 'list') || (cur === total - 1);
}
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

document.addEventListener('keydown', function (e) {
  var t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (e.ctrlKey || e.metaKey) return;
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); navigate(1); return; }
  if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1); return; }
  if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); return; }
  if (e.key === 'v' || e.key === 'V') { toggleView(); return; }
  if (e.shiftKey && e.key === 'P') { e.preventDefault(); exportAllPNG(); return; }
  if (e.shiftKey && (e.key === 'S' || e.key === 's')) { e.preventDefault(); exportSinglePNG(); return; }
  if (!e.shiftKey && (e.key === 'p' || e.key === 'P')) { e.preventDefault(); exportPDF(); return; }
  if (e.key === 'Escape' && openMenu) { closeAllMenus(); e.preventDefault(); }
});

/* ─── palette-toggle.js ─── */
function setPalette(p) {
  if (PALETTES.indexOf(p) === -1) return;
  document.documentElement.dataset.palette = p;
  document.querySelectorAll('[data-palette-opt]').forEach(function (btn) {
    btn.classList.toggle('is-active', btn.getAttribute('data-palette-opt') === p);
  });
}
function togglePaletteMenu() {
  openMenu = (openMenu === 'palette') ? null : 'palette';
  syncMenus();
}

/* ─── メニュー開閉共通（export-menu.js相当） ─── */
function toggleExportMenu() {
  openMenu = (openMenu === 'export') ? null : 'export';
  syncMenus();
}
function closeExportMenu() { openMenu = null; syncMenus(); }
function closeAllMenus() { openMenu = null; syncMenus(); }
function syncMenus() {
  var pd = document.getElementById('palette-dropdown');
  var ed = document.getElementById('export-dropdown');
  if (pd) pd.hidden = (openMenu !== 'palette');
  if (ed) ed.hidden = (openMenu !== 'export');
}
document.addEventListener('click', function (e) {
  if (!e.target.closest('.palette-menu') && !e.target.closest('.export-menu')) {
    closeAllMenus();
  }
});

/* ─── export-pdf.js ─── */
function exportPDF() {
  var prevView = currentView;
  currentView = 'list';
  applyView();
  var restore = function () {
    currentView = prevView;
    applyView();
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);
  requestAnimationFrame(function () { requestAnimationFrame(function () { window.print(); }); });
}

/* ─── export-png.js ─── */
var HTML2CANVAS_CDN = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
var JSZIP_CDN = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';

function loadScript(src) {
  return new Promise(function (resolve, reject) {
    if (document.querySelector('script[src="' + src + '"]')) return resolve();
    var s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = function () { resolve(); };
    s.onerror = function () { reject(new Error('Failed to load: ' + src)); };
    document.head.appendChild(s);
  });
}
function buildCanvasOptions() {
  return {
    width: 960,
    height: 540,
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: getComputedStyle(document.body).backgroundColor,
    logging: false,
    onclone: function (clonedDoc) {
      var el = clonedDoc.querySelectorAll('.slide-inner');
      el.forEach(function (n) { n.style.transform = 'none'; });
    },
  };
}
function showExportError(action, error) {
  var message = [
    action + 'に失敗しました。', '',
    '考えられる原因：',
    '・ネットワーク接続が不安定（CDN ロード失敗）',
    '・外部画像が CORS 未対応',
    '・ブラウザがダウンロードをブロックした', '',
    'オフライン環境では P キーから PDF エクスポートをご利用ください。', '',
    '詳細: ' + (error.message || error),
  ].join('\\n');
  alert(message);
  console.error('[' + action + '] ' + (error.message || error), error);
}
async function exportSinglePNG() {
  try {
    await loadScript(HTML2CANVAS_CDN);
    var target = currentView === 'list' ? slides[0] : slides[cur];
    var canvas = await html2canvas(target, buildCanvasOptions());
    canvas.toBlob(function (blob) {
      if (!blob) return showExportError('PNGエクスポート', new Error('PNG生成に失敗しました'));
      downloadBlob(blob, sanitizeName(DECK_TITLE) + '-slide' + (cur + 1) + '.png');
    }, 'image/png');
  } catch (e) {
    showExportError('PNGエクスポート', e);
  }
}
async function exportAllPNG() {
  try {
    await Promise.all([loadScript(HTML2CANVAS_CDN), loadScript(JSZIP_CDN)]);
    var zip = new JSZip();
    for (var i = 0; i < slides.length; i++) {
      var canvas = await html2canvas(slides[i], buildCanvasOptions());
      var dataUrl = canvas.toDataURL('image/png');
      var base64 = dataUrl.split(',')[1];
      zip.file('slide-' + String(i + 1).padStart(2, '0') + '.png', base64, { base64: true });
    }
    var blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, sanitizeName(DECK_TITLE) + '-slides.zip');
  } catch (e) {
    showExportError('ZIPエクスポート', e);
  }
}

/* ─── MD保存（アプリ固有・埋め込んだ原稿をそのままダウンロード） ─── */
function saveMd() {
  var ts = timestampStr();
  var safe = sanitizeName(DECK_TITLE);
  var filename = safe ? ('MD-' + ts + '_Slide-' + safe + '.md') : ('MD-' + ts + '_Slide.md');
  downloadBlob(new Blob([DECK_MD], { type: 'text/markdown;charset=utf-8' }), filename);
}

/* ─── 初期化 ─── */
applyView();
`;
}

/** スタンドアロンHTMLの最終組み立て。ブラウザ/CLI共通の純関数。 */
export function assembleStandaloneHtml(args: {
  title: string;
  theme: string;
  palette: string;
  md: string;
  css: string;
  sectionsHtml: string;
  total: number;
}): string {
  const { theme, palette, md, css, sectionsHtml, total } = args;
  const title = args.title || 'MD Slide Studio Export';
  const controlCluster = buildControlClusterHtml(palette);
  const themeIcon = theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19';
  const controlClusterWithTheme = controlCluster.replace(
    '<span id="theme-icon">\uD83C\uDF19</span>',
    `<span id="theme-icon">${themeIcon}</span>`,
  );
  const script = buildInlineScript(JSON.stringify(title), JSON.stringify(md));

  return `<!doctype html>
<html lang="ja" data-view="list" data-theme="${theme}" data-palette="${palette}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${css}</style>
</head>
<body data-view="list">
${controlClusterWithTheme}
<div id="progress-bar"></div>
<div class="slide-scaler">
<button class="nav-arrow nav-prev" id="btn-prev" onclick="navigate(-1)" hidden>&#8249;</button>
<button class="nav-arrow nav-next" id="btn-next" onclick="navigate(1)" hidden>&#8250;</button>
${sectionsHtml}
<div id="slide-counter">1 / ${total}</div>
</div>
<script>${script}</script>
</body>
</html>
`;
}
