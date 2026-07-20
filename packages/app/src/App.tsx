/**
 * App.tsx — アプリシェル。
 * 編集モード（エディタ＋プレビュー2ペイン）⇄ プレゼンモード（全画面デッキ）。
 * テーマ / パレット / ビューは localStorage に永続化（元スキルの挙動を踏襲）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseSlideMarkdown } from '@mdss/core';
import { lintDeck } from '@mdss/core';
import { LintPanel } from './components/LintPanel';
import type { Palette } from '@mdss/core';
import { SlideDeckView, type SlideDeckHandle } from './components/SlideDeck';
import { ControlCluster } from './components/ControlCluster';
import { TemplateMenu } from './components/TemplateMenu';
import { HelpModal } from './components/HelpModal';
import { useKeyboardNav, usePersistentState } from './hooks/hooks';
import {
  exportAllToZip,
  exportHtml,
  exportMarkdown,
  exportToPdf,
  exportToPng,
} from './export/exporters';
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
  const lintResults = useMemo(() => lintDeck(deck), [deck]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // テンプレート挿入ボタンはtextarea外の要素なので、クリック時には
  // textareaがフォーカスを失っている（= document.activeElement !== el）。
  // selectionStartはfocus有無に関わらず最後の値を保持するが、
  // 一度もフォーカスされたことが無い場合は既定値の0を返すため、
  // 「一度でもフォーカスされたか」を別途追跡し、未フォーカス時は末尾追記にフォールバックする。
  const hasFocusedTextareaRef = useRef(false);

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
  const insertSnippet = useCallback((snippet: string) => {
    const el = textareaRef.current;
    let newPos = 0;
    setMd((prev) => {
      const pos =
        hasFocusedTextareaRef.current && el ? (el.selectionStart ?? prev.length) : prev.length;
      const nextChar = prev.charAt(pos);
      // 挿入位置の次の文字がすでに改行（または文末）でなければ、テンプレ末尾に改行を補う。
      // 既存行にテンプレ本文が連結されてMarkdownの区切りが崩れるのを防ぐ。
      const needsNewline = nextChar !== '' && nextChar !== '\n';
      const insertText = needsNewline ? `${snippet}\n` : snippet;
      newPos = pos + snippet.length;
      return prev.slice(0, pos) + insertText + prev.slice(pos);
    });
    // カーソル位置とスクロール位置を、挿入した箇所へ復元する（DOM更新後の次フレームで実行）。
    // textarea.value を書き換えるとブラウザは既定でスクロール位置を先頭へリセットするため、
    // setSelectionRange だけでなく scrollTop も行数から明示的に計算し直す。
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(newPos, newPos);
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 18;
      const linesBefore = el.value.slice(0, newPos).split('\n').length - 1;
      el.scrollTop = Math.max(0, linesBefore * lineHeight - el.clientHeight / 2);
    });
  }, []);
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
  const [helpOpen, setHelpOpen] = useState(false);
  // 初回訪問時のみトーストを出すためのフラグ。usePersistentStateは文字列限定の型のため
  // 'seen' | 'unseen' で管理する（mode/theme/view と同じ既存パターン）。
  const [helpSeen, setHelpSeen] = usePersistentState<'seen' | 'unseen'>('help-seen', 'unseen');

  // トーストは一定時間後に自動でseen化する（クリックされなくても再表示されないように）
  useEffect(() => {
    if (helpSeen !== 'unseen') return;
    const t = setTimeout(() => setHelpSeen('seen'), 6000);
    return () => clearTimeout(t);
  }, [helpSeen, setHelpSeen]);

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
        <button
          onClick={() => {
            setHelpOpen(true);
            setHelpSeen('seen');
          }}
          title="記法チートシート・ショートカット・制約ルールを表示"
        >
          ❓ ヘルプ
        </button>
        <button className="primary" onClick={() => setMode(mode === 'edit' ? 'present' : 'edit')}>
          {mode === 'edit' ? '▶ プレゼン' : '✎ 編集に戻る'}
        </button>
      </header>

      <div className="workspace">
        {mode === 'edit' && (
          <div className="editor-pane">
            <div className="editor-toolbar">
              <TemplateMenu onInsert={insertSnippet} />
            </div>
            <textarea
              ref={textareaRef}
              value={md}
              onChange={(e) => setMd(e.target.value)}
              onFocus={() => {
                hasFocusedTextareaRef.current = true;
              }}
              spellCheck={false}
              aria-label="スライドMDエディタ"
            />
            {lintResults.length > 0 && (
              <LintPanel
                results={lintResults}
                onJump={(i) => {
                  setCurrent(i);
                  setView('hero');
                }}
              />
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
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      {helpSeen === 'unseen' && !helpOpen && (
        <div
          className="help-toast"
          onClick={() => {
            setHelpOpen(true);
            setHelpSeen('seen');
          }}
        >
          ❓ 使い方・記法はヘルプで確認できます
        </div>
      )}
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
            <br />
            なお、アプリ自体にはスライド枚数の上限はありません。8〜16枚は
            AIへ依頼する際の読みやすさの目安です。
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
