/**
 * exporters.ts — export-recipes.md 相当のエクスポート機能。
 * PDF: window.print() + print.css（1ページ=1スライド）
 * PNG: html2canvas で現在スライドを 1920×1080 相当でキャプチャ
 * ZIP: 全スライドPNGを JSZip でまとめる
 * 元スキルはCDN動的ロードだったが、リポジトリ化に伴い npm 依存に置き換え。
 */
// html2canvas / JSZip はエクスポート実行時のみ動的ロード（初期バンドル削減。
// 元スキルの「閲覧は自己完結・エクスポート時のみ追加ロード」の思想を踏襲）

/**
 * PDF出力。print.css が body[data-view] を見て1ページ=1スライドに整形する。
 * 印刷中は list ビュー相当に切り替える（元 export-pdf.js の挙動）。
 */
export function exportToPdf() {
  const html = document.documentElement;
  const body = document.body;
  const prev = { html: html.dataset.view, body: body.dataset.view };
  html.dataset.view = 'list';
  body.dataset.view = 'list';
  const restore = () => {
    if (prev.html) html.dataset.view = prev.html;
    else delete html.dataset.view;
    if (prev.body) body.dataset.view = prev.body;
    else delete body.dataset.view;
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);
  // レイアウト反映を待ってから印刷ダイアログ
  requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
}

async function captureSlide(slideEl: HTMLElement): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import('html2canvas');
  return html2canvas(slideEl, {
    scale: 2, // 960×540 → 1920×1080
    width: 960,
    height: 540,
    backgroundColor: null,
    useCORS: true,
    logging: false,
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('PNG生成に失敗しました'))),
      'image/png',
    );
  });
}

const sanitize = (s: string) => s.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);

/** タイムスタンプ文字列 YYMMDDhhmmss を生成 */
function timestamp(): string {
  const now = new Date();
  return [
    String(now.getFullYear()).slice(2),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
}

/** 現在スライドをPNGダウンロード */
export async function exportToPng(slideEl: HTMLElement, deckTitle: string, index: number) {
  try {
    const canvas = await captureSlide(slideEl);
    downloadBlob(await canvasToBlob(canvas), `${sanitize(deckTitle)}-slide${index + 1}.png`);
  } catch (e) {
    alert(
      `PNGエクスポートに失敗しました: ${(e as Error).message}\n（外部画像のCORS制限が原因の場合があります）`,
    );
  }
}

/** 全スライドをPNG化してZIPダウンロード */
export async function exportAllToZip(
  slideEls: HTMLElement[],
  deckTitle: string,
  onProgress?: (done: number, total: number) => void,
) {
  try {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    for (let i = 0; i < slideEls.length; i++) {
      const canvas = await captureSlide(slideEls[i]);
      zip.file(`slide-${String(i + 1).padStart(2, '0')}.png`, await canvasToBlob(canvas));
      onProgress?.(i + 1, slideEls.length);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `${sanitize(deckTitle)}-slides.zip`);
  } catch (e) {
    alert(`ZIPエクスポートに失敗しました: ${(e as Error).message}`);
  }
}

/** スライドMD（原稿）自体のダウンロード（タイムスタンプ付きファイル名） */
export function exportMarkdown(md: string, deckTitle: string) {
  const ts = timestamp();
  const safeName = sanitize(deckTitle);
  const filename = safeName ? `MD-${ts}_Slide-${safeName}.md` : `MD-${ts}_Slide.md`;
  downloadBlob(new Blob([md], { type: 'text/markdown;charset=utf-8' }), filename);
}

// ─────────────────────────────────────────────────────────────
// HTMLエクスポート（スタンドアロン単一HTMLファイル）
// ─────────────────────────────────────────────────────────────

/**
 * document.styleSheets を走査し、適用中の全CSSルールを1つの文字列に連結する。
 * 同一オリジン配信のスタイルシート（Vite bundle・<style>タグ）はそのまま読める。
 * クロスオリジン（例: Google Fonts の <link>）で cssRules にアクセスできない
 * シートは黙ってスキップする（フォールバックとしてシステムフォント表示になる）。
 */
function collectCss(): string {
  const parts: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      for (const rule of Array.from(rules)) parts.push(rule.cssText);
    } catch {
      // クロスオリジン等でアクセス不可のシートはスキップ
    }
  }
  return parts.join('\n');
}

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

/**
 * .slide-scaler 全体をクローンし、実行時JSに依存する要素を取り除いた
 * スタンドアロンHTML文字列を組み立てる。
 *
 * - data-view="list" を <html> に固定し、CSS側の list 表示レイアウトに委ねる
 *   （hero表示はJSのResizeObserver前提のため、静的ファイルには不向き）
 * - .slide-inner の inline transform（実行時のコンテナ幅で計算された値）は
 *   開封環境のウィンドウ幅と一致する保証がないため除去する
 *   → 既知の制約: list表示の自動フィットはJS前提のため、ウィンドウ幅次第で
 *     横スクロールが発生する場合がある
 * - ナビ矢印・進捗バー・スライド番号などJS操作前提のUIは除去
 * - active クラスは list 表示では不要なため除去
 */
function buildStandaloneHtml(scalerEl: HTMLElement, deckTitle: string): string {
  const css = collectCss();
  const root = document.documentElement;
  const theme = root.dataset.theme ?? 'light';
  const palette = root.dataset.palette ?? 'ocean';

  const clone = scalerEl.cloneNode(true) as HTMLElement;
  clone.querySelectorAll<HTMLElement>('.slide-inner').forEach((el) => {
    el.style.removeProperty('transform');
  });
  clone.querySelectorAll<HTMLElement>('.slide').forEach((el) => {
    el.classList.remove('active');
  });
  clone
    .querySelectorAll('.nav-arrow, #progress-bar, #slide-counter')
    .forEach((el) => el.remove());

  const title = deckTitle || 'MD Slide Studio Export';
  return `<!doctype html>
<html lang="ja" data-view="list" data-theme="${theme}" data-palette="${palette}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${css}</style>
</head>
<body>
${clone.outerHTML}
</body>
</html>
`;
}

/** 現在のデッキをスタンドアロンHTML（1ファイル・JS不要）として保存 */
export function exportHtml(scalerEl: HTMLElement, deckTitle: string) {
  try {
    const html = buildStandaloneHtml(scalerEl, deckTitle);
    const ts = timestamp();
    const safeName = sanitize(deckTitle);
    const filename = safeName ? `HTML-${ts}_Slide-${safeName}.html` : `HTML-${ts}_Slide.html`;
    downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), filename);
  } catch (e) {
    alert(`HTMLエクスポートに失敗しました: ${(e as Error).message}`);
  }
}
