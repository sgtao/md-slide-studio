#!/usr/bin/env bash
# =============================================================================
# apply-html-export.sh — 📥エクスポートメニューに「HTMLとして保存」を追加
#
# 本スクリプトが変更する既存ファイル（4ファイル）:
#   src/export/exporters.ts
#     - exportHtml() ＋ collectCss() ＋ escapeHtml() ＋ buildStandaloneHtml() を追加
#       （exportMarkdown() の直後に追記）
#   src/components/SlideDeck.tsx
#     - SlideDeckHandle に getScalerEl() を追加（.slide-scaler 全体を取得）
#   src/components/ControlCluster.tsx
#     - Props に onExportHtml を追加
#     - export-dropdown の先頭（PDFボタンの直前）に「🌐 HTMLとして保存」を追加
#   src/App.tsx
#     - import に exportHtml を追加
#     - doHtml ハンドラを追加（doMd の直後）
#     - <ControlCluster> に onExportHtml={doHtml} を配線
#
# 保存ファイル名規則: HTML-{YYMMDDhhmmss}_Slide-{デッキタイトル}.html
#   （既存の MD 保存 `MD-...` と対になる命名。exportMarkdown と同じ
#    timestamp() / sanitize() ヘルパーを再利用する）
#
# 前提: v0.2.1（0715-03_md-slide-studio-v0.2.1.md）適用後の状態に対して実行。
# Usage: bash scripts/apply-html-export.sh
# 冪等 : 適用済みは [SKIP]。 Exit: 0=OK/SKIP / 1=ERROR（アンカー不一致）
# =============================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)"
S="${ROOT}"
[[ -f "${S}/src/App.tsx" ]] || { echo "[ERROR] ${S}/src/App.tsx が見つかりません" >&2; exit 1; }

echo "=================================================="
echo " apply-html-export.sh — 「HTMLとして保存」メニュー追加"
echo " ROOT: ${ROOT}"
echo "=================================================="

python3 - "${ROOT}" <<'PYEOF'
import io, os, sys
ROOT = sys.argv[1]
S = ROOT
ok = skip = err = 0

def load(p):
    with io.open(p, encoding="utf-8") as f: return f.read()

def save(p, t):
    with io.open(p, "w", encoding="utf-8") as f: f.write(t)

def do(path, label, marker, fn):
    global ok, skip, err
    rel = os.path.relpath(path, ROOT)
    if not os.path.isfile(path):
        print(f"  [ERROR] {label}: ファイルなし {rel}"); err += 1; return
    t = load(path)
    if marker in t:
        print(f"  [SKIP] {label}（適用済み）"); skip += 1; return
    n = fn(t)
    if n is None or n == t:
        print(f"  [ERROR] {label}: アンカー不一致 {rel}（手動確認）"); err += 1; return
    save(path, n); print(f"  [OK]   {label}"); ok += 1

def replace_once(old, new):
    def fn(t):
        return t.replace(old, new, 1) if old in t else None
    return fn

def insert_after(anchor, block):
    def fn(t):
        i = t.find(anchor)
        if i < 0: return None
        j = i + len(anchor)
        return t[:j] + block + t[j:]
    return fn

EXPORTERS = os.path.join(S, "src/export/exporters.ts")
SLIDEDECK = os.path.join(S, "src/components/SlideDeck.tsx")
CONTROLCLUSTER = os.path.join(S, "src/components/ControlCluster.tsx")
APP = os.path.join(S, "src/App.tsx")

# ─── (1) exporters.ts: exportHtml() 一式を追記 ──────────────────────────────
print("\n[1] exporters.ts: exportHtml() ＋ ヘルパー関数を追加")
EXPORT_MD_ANCHOR = """/** スライドMD（原稿）自体のダウンロード（タイムスタンプ付きファイル名） */
export function exportMarkdown(md: string, deckTitle: string) {
  const ts = timestamp();
  const safeName = sanitize(deckTitle);
  const filename = safeName ? `MD-${ts}_Slide-${safeName}.md` : `MD-${ts}_Slide.md`;
  downloadBlob(new Blob([md], { type: 'text/markdown;charset=utf-8' }), filename);
}"""
EXPORT_HTML_BLOCK = """

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
  return parts.join('\\n');
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
"""
do(EXPORTERS, "exporters.ts: exportHtml() を追加",
   "export function exportHtml(scalerEl: HTMLElement, deckTitle: string)",
   insert_after(EXPORT_MD_ANCHOR, EXPORT_HTML_BLOCK))

# ─── (2) SlideDeck.tsx: getScalerEl() を追加 ────────────────────────────────
print("\n[2] SlideDeck.tsx: SlideDeckHandle に getScalerEl() を追加")
HANDLE_OLD = """export interface SlideDeckHandle {
  /** 現在表示中の .slide 要素（PNGエクスポート用） */
  getActiveSlideEl: () => HTMLElement | null;
  getAllSlideEls: () => HTMLElement[];
}"""
HANDLE_NEW = """export interface SlideDeckHandle {
  /** 現在表示中の .slide 要素（PNGエクスポート用） */
  getActiveSlideEl: () => HTMLElement | null;
  getAllSlideEls: () => HTMLElement[];
  /** .slide-scaler 全体（HTMLエクスポート用） */
  getScalerEl: () => HTMLElement | null;
}"""
do(SLIDEDECK, "SlideDeck.tsx: SlideDeckHandle interface",
   "getScalerEl: () => HTMLElement | null;",
   replace_once(HANDLE_OLD, HANDLE_NEW))

IMPL_OLD = """  useImperativeHandle(ref, () => ({
    getActiveSlideEl: () => scalerRef.current?.querySelector<HTMLElement>('.slide.active') ?? null,
    getAllSlideEls: () =>
      Array.from(scalerRef.current?.querySelectorAll<HTMLElement>('.slide') ?? []),
  }));"""
IMPL_NEW = """  useImperativeHandle(ref, () => ({
    getActiveSlideEl: () => scalerRef.current?.querySelector<HTMLElement>('.slide.active') ?? null,
    getAllSlideEls: () =>
      Array.from(scalerRef.current?.querySelectorAll<HTMLElement>('.slide') ?? []),
    getScalerEl: () => scalerRef.current,
  }));"""
do(SLIDEDECK, "SlideDeck.tsx: useImperativeHandle 実装",
   "getScalerEl: () => scalerRef.current,",
   replace_once(IMPL_OLD, IMPL_NEW))

# ─── (3) ControlCluster.tsx: Props ＋ ボタン追加 ────────────────────────────
print("\n[3] ControlCluster.tsx: onExportHtml プロップとメニューボタンを追加")
PROPS_OLD = """interface Props {
  theme: 'light' | 'dark';
  view: 'hero' | 'list';
  palette: Palette;
  onToggleTheme: () => void;
  onToggleView: () => void;
  onSetPalette: (p: Palette) => void;
  onExportPdf: () => void;
  onExportPng: () => void;
  onExportZip: () => void;
  onExportMd: () => void;
}"""
PROPS_NEW = """interface Props {
  theme: 'light' | 'dark';
  view: 'hero' | 'list';
  palette: Palette;
  onToggleTheme: () => void;
  onToggleView: () => void;
  onSetPalette: (p: Palette) => void;
  onExportHtml: () => void;
  onExportPdf: () => void;
  onExportPng: () => void;
  onExportZip: () => void;
  onExportMd: () => void;
}"""
do(CONTROLCLUSTER, "ControlCluster.tsx: Props interface に onExportHtml",
   "onExportHtml: () => void;",
   replace_once(PROPS_OLD, PROPS_NEW))

BTN_OLD = """        <div
          id="export-dropdown"
          className="export-dropdown"
          hidden={openMenu !== 'export'}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              props.onExportPdf();
              setOpenMenu(null);
            }}
          >
            📄 PDFとして印刷 <span className="kbd">P</span>
          </button>"""
BTN_NEW = """        <div
          id="export-dropdown"
          className="export-dropdown"
          hidden={openMenu !== 'export'}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              props.onExportHtml();
              setOpenMenu(null);
            }}
          >
            🌐 HTMLとして保存
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              props.onExportPdf();
              setOpenMenu(null);
            }}
          >
            📄 PDFとして印刷 <span className="kbd">P</span>
          </button>"""
do(CONTROLCLUSTER, "ControlCluster.tsx: 🌐HTMLとして保存 ボタン（先頭配置）",
   "🌐 HTMLとして保存",
   replace_once(BTN_OLD, BTN_NEW))

# ─── (4) App.tsx: import・ハンドラ・配線 ────────────────────────────────────
print("\n[4] App.tsx: import ＋ doHtml ハンドラ ＋ ControlCluster への配線")
IMPORT_OLD = "import { exportAllToZip, exportMarkdown, exportToPdf, exportToPng } from './export/exporters';"
IMPORT_NEW = "import { exportAllToZip, exportHtml, exportMarkdown, exportToPdf, exportToPng } from './export/exporters';"
do(APP, "App.tsx: import に exportHtml を追加",
   "exportAllToZip, exportHtml, exportMarkdown",
   replace_once(IMPORT_OLD, IMPORT_NEW))

DOMD_ANCHOR = "  const doMd = useCallback(() => exportMarkdown(md, title), [md, title]);"
DOHTML_BLOCK = """
  const doHtml = useCallback(() => {
    const el = deckRef.current?.getScalerEl();
    if (el) void exportHtml(el, title);
  }, [title]);"""
do(APP, "App.tsx: doHtml ハンドラを追加",
   "const doHtml = useCallback(",
   insert_after(DOMD_ANCHOR, DOHTML_BLOCK))

CLUSTER_OLD = """          <ControlCluster
            theme={theme}
            view={view}
            palette={palette}
            onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            onToggleView={toggleView}
            onSetPalette={setPalette}
            onExportPdf={doPdf}
            onExportPng={doPng}
            onExportZip={doZip}
            onExportMd={doMd}
          />"""
CLUSTER_NEW = """          <ControlCluster
            theme={theme}
            view={view}
            palette={palette}
            onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            onToggleView={toggleView}
            onSetPalette={setPalette}
            onExportHtml={doHtml}
            onExportPdf={doPdf}
            onExportPng={doPng}
            onExportZip={doZip}
            onExportMd={doMd}
          />"""
do(APP, "App.tsx: <ControlCluster onExportHtml={doHtml}> を配線",
   "onExportHtml={doHtml}",
   replace_once(CLUSTER_OLD, CLUSTER_NEW))

print("\n--------------------------------------------------")
print(f" 適用結果: OK {ok} / SKIP {skip} / ERROR {err}")
print("--------------------------------------------------")
sys.exit(1 if err else 0)
PYEOF
PY_STATUS=$?

echo ""
echo "[検証] 残留・整合チェック"
V=0
EXPORTERS="${S}/src/export/exporters.ts"
SLIDEDECK="${S}/src/components/SlideDeck.tsx"
CONTROLCLUSTER="${S}/src/components/ControlCluster.tsx"
APP="${S}/src/App.tsx"

grep -q "export function exportHtml" "$EXPORTERS" && echo "  [PASS] exporters.ts: exportHtml() 定義" || { echo "  [FAIL] exportHtml定義"; V=$((V+1)); }
grep -q "function collectCss" "$EXPORTERS" && echo "  [PASS] exporters.ts: collectCss() 定義" || { echo "  [FAIL] collectCss定義"; V=$((V+1)); }
grep -q "HTML-\${ts}_Slide-" "$EXPORTERS" && echo "  [PASS] ファイル名規則がMD保存と対になっている" || { echo "  [FAIL] ファイル名規則"; V=$((V+1)); }
grep -q "getScalerEl: () => HTMLElement | null;" "$SLIDEDECK" && echo "  [PASS] SlideDeck.tsx: getScalerEl 型定義" || { echo "  [FAIL] getScalerEl型定義"; V=$((V+1)); }
grep -q "getScalerEl: () => scalerRef.current," "$SLIDEDECK" && echo "  [PASS] SlideDeck.tsx: getScalerEl 実装" || { echo "  [FAIL] getScalerEl実装"; V=$((V+1)); }
grep -q "onExportHtml: () => void;" "$CONTROLCLUSTER" && echo "  [PASS] ControlCluster.tsx: Props定義" || { echo "  [FAIL] Props定義"; V=$((V+1)); }
grep -q "🌐 HTMLとして保存" "$CONTROLCLUSTER" && echo "  [PASS] ControlCluster.tsx: メニューボタン" || { echo "  [FAIL] メニューボタン"; V=$((V+1)); }
grep -q "exportHtml" "$APP" && echo "  [PASS] App.tsx: exportHtml import" || { echo "  [FAIL] import"; V=$((V+1)); }
grep -q "const doHtml = useCallback" "$APP" && echo "  [PASS] App.tsx: doHtml ハンドラ" || { echo "  [FAIL] doHtmlハンドラ"; V=$((V+1)); }
grep -q "onExportHtml={doHtml}" "$APP" && echo "  [PASS] App.tsx: ControlCluster への配線" || { echo "  [FAIL] 配線"; V=$((V+1)); }

# 既存機能が壊れていないことの確認（PDF/PNG/ZIP/MDボタンが残っているか）
grep -q "📄 PDFとして印刷" "$CONTROLCLUSTER" && echo "  [PASS] 既存 PDFボタンを保持" || { echo "  [FAIL] PDFボタンが消えた"; V=$((V+1)); }
grep -q "📝 スライドMDを保存" "$CONTROLCLUSTER" && echo "  [PASS] 既存 MD保存ボタンを保持" || { echo "  [FAIL] MD保存ボタンが消えた"; V=$((V+1)); }
grep -q "export function exportMarkdown" "$EXPORTERS" && echo "  [PASS] 既存 exportMarkdown() を保持" || { echo "  [FAIL] exportMarkdownが消えた"; V=$((V+1)); }
grep -q "getAllSlideEls: () => HTMLElement\[\];" "$SLIDEDECK" && echo "  [PASS] 既存 getAllSlideEls 型を保持" || { echo "  [FAIL] getAllSlideEls型が消えた"; V=$((V+1)); }

echo ""
if [[ "$PY_STATUS" -eq 0 && "$V" -eq 0 ]]; then
  echo "=================================================="
  echo " ✅ 「HTMLとして保存」メニュー追加: 完了"
  echo "=================================================="
  echo ""
  echo " 次のステップ:"
  echo "   1. npm run dev で 📥メニュー最上部に「🌐 HTMLとして保存」が"
  echo "      表示されることを目視確認"
  echo "   2. クリックしてダウンロードされた .html を単体でブラウザに"
  echo "      ドラッグ&ドロップし、CSSが当たった状態で全スライドが"
  echo "      縦スクロール表示されることを確認"
  echo "   3. npx tsc --noEmit / npm run lint / npm test"
  exit 0
else
  echo " ❌ 問題あり（PY=$PY_STATUS / VERIFY=$V）"
  echo "    ERRORが出た場合は該当ファイルの現状コードとアンカー文字列の"
  echo "    差異を確認し、このスクリプトの該当 do(...) 呼び出しを"
  echo "    手元のコードに合わせて調整してください。"
  exit 1
fi
