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

/** スライドMD（原稿）自体のダウンロード */
export function exportMarkdown(md: string, deckTitle: string) {
  downloadBlob(
    new Blob([md], { type: 'text/markdown;charset=utf-8' }),
    `${sanitize(deckTitle)}-slides.md`,
  );
}
