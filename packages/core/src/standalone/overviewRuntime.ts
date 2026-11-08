/**
 * overviewRuntime.ts — 書き出しHTML用「閲覧UI」（サムネ帯・一覧グリッド・ページ指定移動）の部品。
 *
 * 設計: 22_design-mdss-migrate/03_migration-plan/02_viewer-ui-plan.md §4-1〜§4-5・§4-7。
 *   - サムネ帯（T）: hero の下部に出す縮小版の帯。クリックでそのページへ移動
 *   - 一覧グリッド（G）: 全スライドを格子状に並べる overlay。クリック／Enter で hero のそのページへ
 *   - ページ指定移動: カウンタークリック or J で番号入力、Home / End、URL `#番号`
 *
 * 配置の理由（notesPopup.ts と同じ）:
 *   書き出しHTMLのランタイムは app（export/exporters.ts）と cli（src/standalone.ts）に二重にある。
 *   統合前に二重実装を増やさないよう、この部品を1か所に置いて両方から取り込む。
 *   DOM に触れない「文字列を返すだけ」のモジュール。アプリのプレビュー側は React
 *   （app/src/components/Overview*.tsx）で別実装だが、DOM の id・クラス名・キーは同じで、
 *   CSS（overview.css）を共有する。
 *
 * サムネの作り方: `section.slide` を cloneNode して 960×540 の箱ごと `scale()` で縮小する。
 *   見える位置に来たサムネだけ IntersectionObserver で複製する（遅延生成）。
 *   複製なのでパレット・ライト/ダークには CSS だけで追従し、画像は埋め込まない。
 */

/**
 * `.control-cluster` の view-toggle の直後に置くボタン。
 * strip は hero 以外では隠さず `disabled`（薄く表示）にする: ビューを切り替えてもボタンの数・位置を変えない。
 */
export function buildOverviewButtonsHtml(): string {
  return [
    '  <button id="grid-toggle" type="button" onclick="toggleGrid()" title="一覧グリッド（G）" aria-label="一覧グリッド" aria-expanded="false">▦</button>',
    '  <button id="strip-toggle" type="button" onclick="toggleStrip()" title="サムネ帯（T・1枚表示で使用）" aria-label="サムネ帯" aria-expanded="false" disabled>🎞️</button>',
  ].join('\n');
}

/**
 * サムネ帯と一覧グリッドの入れ物（`.slide-scaler` の後ろに置く）。
 * 中身（サムネ）は初めて開いたときに JS が組み立てる。どちらも既定は閉。
 */
export function buildOverviewContainersHtml(): string {
  return [
    '<div id="thumb-strip" class="thumb-strip" role="toolbar" aria-label="サムネイル帯" hidden></div>',
    '<div id="overview-grid" class="overview-grid" role="group" aria-label="スライド一覧" hidden></div>',
  ].join('\n');
}

/**
 * 書き出しHTMLのインラインscriptの末尾（`applyView();` の後、ノートポップアップの後）へ追加するコード。
 * 既存の fitSlide() / update() / applyView() / navigate() を包んで拡張する（元のscriptは変更しない）。
 * 外側のテンプレートリテラルへそのまま埋め込めるよう、バッククォートと `${` は使わない。
 */
export const OVERVIEW_SCRIPT = String.raw`

/* ─── 閲覧UI: サムネ帯・一覧グリッド・ページ指定移動（v0.6.1） ─── */
var stripOpen = false;
var prevViewBeforeGrid = 'hero';
var thumbBuilt = { strip: false, grid: false };
var thumbObserver = null;
var gridWasOpen = false;

function stripEl() { return document.getElementById('thumb-strip'); }
function gridEl() { return document.getElementById('overview-grid'); }
function clampIndex(i) { return Math.max(0, Math.min(total - 1, i)); }

/* スライド表示領域: サムネ帯が開いている間はその高さ分だけ上に縮める */
fitSlide = function () {
  var scaler = document.querySelector('.slide-scaler');
  if (!scaler) return;
  var strip = stripEl();
  var inset = (stripOpen && currentView === 'hero' && strip) ? strip.offsetHeight : 0;
  var vw = window.innerWidth;
  var vh = window.innerHeight - inset;
  var ratio = Math.min(vw / 960, vh / 540) * 0.92;
  scaler.style.top = inset ? (vh / 2) + 'px' : '';
  scaler.style.transform = 'translate(-50%, -50%) scale(' + ratio + ')';
};

/* ── サムネの生成（複製・縮小・遅延） ── */
function cloneForThumb(slide, tag) {
  var c = slide.cloneNode(true);
  c.classList.remove('active');
  c.removeAttribute('id');
  c.removeAttribute('data-capture');
  c.setAttribute('aria-hidden', 'true');
  c.querySelectorAll('.slide-notes').forEach(function (n) { n.remove(); });
  /* SVG 内の id（グラデーション・マーカー）が複製で重複しないよう付け替え、参照も書き換える */
  var map = {};
  c.querySelectorAll('[id]').forEach(function (el) {
    var nid = tag + '-' + el.id;
    map[el.id] = nid;
    el.id = nid;
  });
  var keys = Object.keys(map);
  if (keys.length) {
    c.querySelectorAll('*').forEach(function (el) {
      Array.prototype.forEach.call(el.attributes, function (a) {
        if (a.value.indexOf('#') === -1) return;
        var v = a.value;
        keys.forEach(function (k) {
          v = v.split('url(#' + k + ')').join('url(#' + map[k] + ')');
          if (v === '#' + k) v = '#' + map[k];
        });
        if (v !== a.value) a.value = v;
      });
    });
  }
  return c;
}
function layoutThumb(frame) {
  var stage = frame.firstChild;
  var w = frame.clientWidth;
  if (stage && w) stage.style.transform = 'scale(' + (w / 960) + ')';
}
function layoutThumbs(container) {
  container.querySelectorAll('.thumb-frame').forEach(layoutThumb);
}
function fillThumb(frame) {
  if (frame.dataset.filled) return;
  frame.dataset.filled = '1';
  var i = parseInt(frame.dataset.index, 10);
  frame.firstChild.appendChild(cloneForThumb(slides[i], frame.dataset.tag + (i + 1)));
  layoutThumb(frame);
}
function getThumbObserver() {
  if (thumbObserver || typeof IntersectionObserver === 'undefined') return thumbObserver;
  thumbObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      fillThumb(en.target);
      thumbObserver.unobserve(en.target);
    });
  }, { rootMargin: '160px' });
  return thumbObserver;
}
function buildThumbs(container, tag) {
  var obs = getThumbObserver();
  for (var i = 0; i < total; i++) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.dataset.index = String(i);
    b.setAttribute('aria-label', (i + 1) + '枚目');
    var frame = document.createElement('span');
    frame.className = 'thumb-frame';
    frame.dataset.index = String(i);
    frame.dataset.tag = tag;
    var stage = document.createElement('span');
    stage.className = 'thumb-stage';
    frame.appendChild(stage);
    var num = document.createElement('span');
    num.className = 'thumb-num';
    num.textContent = String(i + 1);
    b.appendChild(frame);
    b.appendChild(num);
    container.appendChild(b);
    if (obs) obs.observe(frame); else fillThumb(frame);
  }
}
function markCurrentThumbs() {
  [stripEl(), gridEl()].forEach(function (c) {
    if (!c) return;
    c.querySelectorAll('.thumb').forEach(function (b) {
      var on = (parseInt(b.dataset.index, 10) === cur);
      b.classList.toggle('is-current', on);
      if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
  });
}
function centerCurrentThumb(container, horizontal) {
  var b = container.querySelector('.thumb[data-index="' + cur + '"]');
  if (!b) return;
  if (horizontal) container.scrollLeft = b.offsetLeft - (container.clientWidth - b.offsetWidth) / 2;
  else container.scrollTop = b.offsetTop - (container.clientHeight - b.offsetHeight) / 2;
}

/* ── 表示の同期（ビュー切替・移動のたびに呼ぶ） ── */
function syncOverview() {
  var strip = stripEl();
  var grid = gridEl();
  if (!strip || !grid) return;
  var hero = (currentView === 'hero');
  var showStrip = hero && stripOpen;
  var showGrid = (currentView === 'grid');
  if (showStrip && !thumbBuilt.strip) { buildThumbs(strip, 's'); thumbBuilt.strip = true; }
  if (showGrid && !thumbBuilt.grid) { buildThumbs(grid, 'g'); thumbBuilt.grid = true; }
  strip.hidden = !showStrip;
  grid.hidden = !showGrid;
  var st = document.getElementById('strip-toggle');
  if (st) { st.disabled = !hero; st.setAttribute('aria-expanded', String(showStrip)); }
  var gt = document.getElementById('grid-toggle');
  if (gt) gt.setAttribute('aria-expanded', String(showGrid));
  if (showStrip) { layoutThumbs(strip); markCurrentThumbs(); centerCurrentThumb(strip, true); }
  if (showGrid) {
    layoutThumbs(grid);
    markCurrentThumbs();
    centerCurrentThumb(grid, false);
    if (!gridWasOpen) {
      var cb = grid.querySelector('.thumb.is-current');
      if (cb) cb.focus({ preventScroll: true });
    }
  }
  gridWasOpen = showGrid;
  if (hero) fitSlide();
}

var overviewBaseUpdate = update;
update = function () {
  overviewBaseUpdate();
  /* URL #番号 を現在ページに更新（履歴は増やさない）。hero のときだけ */
  if (currentView === 'hero') {
    try { history.replaceState(null, '', '#' + (cur + 1)); } catch (e) { /* file:// 等で不可なら諦める */ }
  }
  syncOverview();
};
var overviewBaseApplyView = applyView;
applyView = function () { overviewBaseApplyView(); syncOverview(); };
var overviewBaseNavigate = navigate;
navigate = function (dir) {
  if (currentView === 'grid') return; /* グリッド中の矢印・Space はフォーカス移動に使う */
  overviewBaseNavigate(dir);
};
window.addEventListener('resize', function () {
  if (currentView === 'grid' && gridEl()) layoutThumbs(gridEl());
  if (currentView === 'hero' && stripOpen && stripEl()) layoutThumbs(stripEl());
});

/* ── 開閉・移動 ── */
function toggleStrip() {
  if (currentView !== 'hero') return;
  stripOpen = !stripOpen;
  syncOverview();
}
function toggleGrid() {
  if (currentView === 'grid') { closeGrid(); return; }
  prevViewBeforeGrid = currentView;
  currentView = 'grid';
  applyView();
}
function closeGrid() {
  currentView = prevViewBeforeGrid;
  applyView();
}
function goTo(i) {
  if (currentView !== 'hero') return;
  navigate(clampIndex(i) - cur);
}
function openFromGrid(i) {
  cur = clampIndex(i);
  currentView = 'hero';
  applyView();
}

/* ── ページ指定移動: カウンターを数字入力欄に ── */
function startJump() {
  if (currentView !== 'hero') return;
  var counter = document.getElementById('slide-counter');
  if (!counter || counter.querySelector('input')) return;
  var input = document.createElement('input');
  input.type = 'number';
  input.min = '1';
  input.max = String(total);
  input.value = String(cur + 1);
  input.className = 'counter-input';
  input.setAttribute('aria-label', '移動先のページ番号');
  counter.textContent = '';
  counter.appendChild(input);
  counter.appendChild(document.createTextNode(' / ' + total));
  input.focus();
  input.select();
  var done = false;
  function finish(go) {
    if (done) return;
    done = true;
    var v = parseInt(input.value, 10);
    if (go && !isNaN(v)) goTo(v - 1); else update();
  }
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
  });
  input.addEventListener('blur', function () { finish(false); });
}
(function () {
  var counter = document.getElementById('slide-counter');
  if (counter) {
    counter.title = 'クリックでページ番号を入力（J）';
    counter.addEventListener('click', function (e) {
      if (e.target && e.target.tagName === 'INPUT') return;
      startJump();
    });
  }
})();

/* ── クリック・フォーカスの扱い ── */
(function () {
  var strip = stripEl();
  var grid = gridEl();
  if (strip) {
    strip.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.thumb') : null;
      if (b) goTo(parseInt(b.dataset.index, 10));
    });
    /* マウスで押してもフォーカスを奪わない（押したあとも Space がスライド送りのまま効く） */
    strip.addEventListener('mousedown', function (e) {
      if (e.target.closest && e.target.closest('.thumb')) e.preventDefault();
    });
  }
  if (grid) {
    grid.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.thumb') : null;
      if (b) openFromGrid(parseInt(b.dataset.index, 10));
    });
    /* 矢印キーでフォーカス移動、Enter / Space で開く（document 側の →/Space 送りへ伝えない） */
    grid.addEventListener('keydown', function (e) {
      var b = e.target.closest ? e.target.closest('.thumb') : null;
      var idx = b ? parseInt(b.dataset.index, 10) : cur;
      var k = e.key;
      if (k === 'Enter' || k === ' ') {
        e.preventDefault();
        e.stopPropagation();
        openFromGrid(idx);
        return;
      }
      var cols = gridColumns(grid);
      var next = null;
      if (k === 'ArrowRight') next = idx + 1;
      else if (k === 'ArrowLeft') next = idx - 1;
      else if (k === 'ArrowDown') next = idx + cols;
      else if (k === 'ArrowUp') next = idx - cols;
      else if (k === 'Home') next = 0;
      else if (k === 'End') next = total - 1;
      else return;
      e.preventDefault();
      e.stopPropagation();
      if (next < 0 || next > total - 1) return;
      var nb = grid.querySelector('.thumb[data-index="' + next + '"]');
      if (nb) nb.focus();
    });
  }
})();
function gridColumns(grid) {
  var bs = grid.querySelectorAll('.thumb');
  if (!bs.length) return 1;
  var top = bs[0].offsetTop;
  var n = 0;
  for (var i = 0; i < bs.length; i++) {
    if (bs[i].offsetTop === top) n++; else break;
  }
  return Math.max(1, n);
}

/* ── キー: G グリッド / T サムネ帯 / J 番号入力 / Home・End / Esc でグリッドを閉じる ── */
document.addEventListener('keydown', function (e) {
  var t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
  if (e.key === 'Escape') {
    if (currentView === 'grid') { closeGrid(); e.preventDefault(); }
    return;
  }
  if (e.shiftKey) return;
  var k = e.key;
  if (k === 'g' || k === 'G') { toggleGrid(); return; }
  if (currentView !== 'hero') return;
  if (k === 'Home') { e.preventDefault(); goTo(0); }
  else if (k === 'End') { e.preventDefault(); goTo(total - 1); }
  else if (k === 'j' || k === 'J') { e.preventDefault(); startJump(); }
  else if (k === 't' || k === 'T') { toggleStrip(); }
});

/* ── URL #番号: 開いたときのページ指定と、アドレス欄での変更への追従 ── */
function hashIndex() {
  var m = /^#(\d+)$/.exec(location.hash);
  if (!m) return -1;
  return clampIndex(parseInt(m[1], 10) - 1);
}
window.addEventListener('hashchange', function () {
  var h = hashIndex();
  if (h < 0) return;
  cur = h;
  currentView = 'hero';
  applyView();
});
(function () {
  var h = hashIndex();
  if (h >= 0) cur = h;
  if (h >= 0) currentView = 'hero';
})();
applyView();
`;
