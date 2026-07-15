/**
 * App.tsx — アプリシェル。
 * 編集モード（エディタ＋プレビュー2ペイン）⇄ プレゼンモード（全画面デッキ）。
 * テーマ / パレット / ビューは localStorage に永続化（元スキルの挙動を踏襲）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseSlideMarkdown } from './parser/slideMarkdown';
import type { Palette } from './parser/types';
import { SlideDeckView, type SlideDeckHandle } from './components/SlideDeck';
import { ControlCluster } from './components/ControlCluster';
import { useKeyboardNav, usePersistentState } from './hooks/hooks';
import { exportAllToZip, exportHtml, exportMarkdown, exportToPdf, exportToPng } from './export/exporters';
import { buildDraftAssistPrompt } from './ai/draftAssistPrompt';
import sampleMd from './samples/sample.md?raw';

const MD_STORAGE_KEY = 'mdss-draft';
const PALETTE_OVERRIDE_KEY = 'mdss-palette-override';

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function App() {
  // --- 原稿（localStorage 復元、初回はサンプル） ---
  const [md, setMd] = useState<string>(() => {
    try {
      return localStorage.getItem(MD_STORAGE_KEY) ?? sampleMd;
    } catch {
      return sampleMd;
    }
  });
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(MD_STORAGE_KEY, md);
      } catch {
        /* quota */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [md]);

  // --- パース（300ms デバウンス） ---
  const debouncedMd = useDebounced(md, 300);
  const deck = useMemo(() => parseSlideMarkdown(debouncedMd), [debouncedMd]);

  // --- 表示状態 ---
  const [mode, setMode] = usePersistentState<'edit' | 'present'>('mdss-mode', 'edit');
  const [theme, setTheme] = usePersistentState<'light' | 'dark'>('slide-theme', 'light');
  const [view, setView] = usePersistentState<'hero' | 'list'>('slide-view', 'hero');
  const [paletteOverride, setPaletteOverride] = useState<Palette | ''>(() => {
    try {
      return (localStorage.getItem(PALETTE_OVERRIDE_KEY) as Palette) ?? '';
    } catch {
      return '';
    }
  });
  // 初回表示は frontmatter、ユーザーが🎨操作後は保存値が優先（markdown-format.md §1）
  const palette: Palette = paletteOverride || deck.frontmatter.palette;
  const [current, setCurrent] = useState(0);
  const deckRef = useRef<SlideDeckHandle>(null);

  // スライド枚数変化時に現在位置をクランプ
  const maxIndex = Math.max(0, deck.slides.length - 1);
  const clampedCurrent = Math.min(current, maxIndex);
  // useEffect(() => {
  //   setCurrent((c) => Math.min(c, Math.max(0, deck.slides.length - 1)));
  // }, [deck.slides.length]);

  // data属性反映（元スキルの html[data-theme] / [data-palette] と同一）
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    document.documentElement.dataset.palette = palette;
  }, [palette]);
  useEffect(() => {
    document.documentElement.dataset.mode = mode;
  }, [mode]);
  useEffect(() => {
    document.title = `${deck.frontmatter.title} | MD Slide Studio`;
  }, [deck.frontmatter.title]);

  const setPalette = (p: Palette) => {
    setPaletteOverride(p);
    try {
      localStorage.setItem(PALETTE_OVERRIDE_KEY, p);
    } catch {
      /* noop */
    }
  };

  // --- ナビゲーション ---
  const navigate = useCallback(
    (dir: 1 | -1) => {
      if (view === 'list') return; // 一覧モード中は無効（元 navigation.js）
      setCurrent((c) => Math.max(0, Math.min(deck.slides.length - 1, c + dir)));
    },
    [view, deck.slides.length],
  );

  const toggleView = useCallback(() => setView(view === 'hero' ? 'list' : 'hero'), [view, setView]);

  // --- エクスポート ---
  const title = deck.frontmatter.title;
  const doPdf = useCallback(() => exportToPdf(), []);
  const doPng = useCallback(() => {
    const el = deckRef.current?.getActiveSlideEl();
    if (el) void exportToPng(el, title, clampedCurrent);
  }, [title, clampedCurrent]);
  const doZip = useCallback(() => {
    const els = deckRef.current?.getAllSlideEls() ?? [];
    if (els.length) void exportAllToZip(els, title);
  }, [title]);
  const doMd = useCallback(() => exportMarkdown(md, title), [md, title]);
  const doHtml = useCallback(() => {
    const el = deckRef.current?.getScalerEl();
    if (el) void exportHtml(el, title, md);
  }, [title, md]);

  useKeyboardNav(
    useMemo(
      () => ({
        onNavigate: navigate,
        onToggleView: toggleView,
        onExportPdf: doPdf,
        onExportPng: doPng,
        onExportZip: doZip,
      }),
      [navigate, toggleView, doPdf, doPng, doZip],
    ),
    true,
  );

  // --- AIプロンプトモーダル ---
  const [promptOpen, setPromptOpen] = useState(false);

  const allWarnings = [
    ...deck.warnings,
    ...deck.slides.flatMap((s, i) => s.warnings.map((w) => `Slide ${i + 1}: ${w}`)),
  ];

  return (
    <>
      <header className="app-header">
        <span className="app-logo">
          MD <span className="hl">Slide</span> Studio
        </span>
        <span className="deck-title">
          {title} ・ {deck.slides.length}枚
        </span>
        <button onClick={() => setPromptOpen(true)} title="LLM用の原稿作成プロンプトを表示">
          🤖 AIプロンプト
        </button>
        <button onClick={() => setMd(sampleMd)} title="サンプル原稿を読み込む">
          サンプル
        </button>
        <button className="primary" onClick={() => setMode(mode === 'edit' ? 'present' : 'edit')}>
          {mode === 'edit' ? '▶ プレゼン' : '✎ 編集に戻る'}
        </button>
      </header>

      <div className="workspace">
        {mode === 'edit' && (
          <div className="editor-pane">
            <textarea
              value={md}
              onChange={(e) => setMd(e.target.value)}
              spellCheck={false}
              aria-label="スライドMDエディタ"
            />
            {allWarnings.length > 0 && (
              <div className="warnings-panel">
                {allWarnings.map((w, i) => (
                  <div key={i} className="warn-item">
                    {w}
                  </div>
                ))}
              </div>
            )}
            <div className="editor-status">
              <span>{md.length.toLocaleString()} 文字</span>
              <span>palette: {palette}</span>
              <span>← ↑ MDを編集すると右に即時反映</span>
              <button className="status-save-btn" onClick={doMd} title="スライドMDをダウンロード">
                💾 MD保存
              </button>
            </div>
          </div>
        )}

        <div className="preview-pane">
          {deck.slides.length > 0 ? (
            <SlideDeckView
              ref={deckRef}
              deck={deck}
              current={clampedCurrent}
              view={view}
              onSelect={(i) => {
                setCurrent(i);
                setView('hero');
              }}
              onNavigate={navigate}
            />
          ) : (
            <div className="empty-deck">
              スライドがありません。
              <br />
              frontmatter と <code>&lt;!-- slide: type --&gt;</code>{' '}
              ディレクティブを記述してください。
            </div>
          )}
          <ControlCluster
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
          />
        </div>
      </div>

      {promptOpen && <PromptModal onClose={() => setPromptOpen(false)} />}
    </>
  );
}

function PromptModal({ onClose }: { onClose: () => void }) {
  const [themeText, setThemeText] = useState('');
  const [copied, setCopied] = useState(false);
  const prompt = buildDraftAssistPrompt(themeText || undefined);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      alert('コピーに失敗しました。テキストを選択して手動でコピーしてください。');
    }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          🤖 原稿作成プロンプト
          <input
            placeholder="スライドのテーマを入力（例: Claude Codeの社内導入提案）"
            value={themeText}
            onChange={(e) => setThemeText(e.target.value)}
          />
        </div>
        <div className="modal-body">
          <p
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              marginBottom: 10,
              lineHeight: 1.7,
            }}
          >
            このプロンプトを Claude / ChatGPT 等のLLMに送ると、本アプリの仕様に準拠した
            スライドMDが返ってきます。返ってきたMDを左のエディタに貼り付けてください。
          </p>
          <pre>{prompt}</pre>
        </div>
        <div className="modal-foot">
          <button onClick={onClose}>閉じる</button>
          <button
            className="primary"
            onClick={() => {
              void copy();
            }}
          >
            {copied ? '✓ コピーしました' : 'プロンプトをコピー'}
          </button>
        </div>
      </div>
    </div>
  );
}
