/**
 * App.tsx — アプリシェル。
 * 編集モード（エディタ＋プレビュー2ペイン）⇄ プレゼンモード（全画面デッキ）。
 * テーマ / パレット / ビューは localStorage に永続化（元スキルの挙動を踏襲）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { parseSlideMarkdown, getSlideStartLines } from '@mdss/core';
import { lintDeck } from '@mdss/core';
import { LintPanel } from './components/LintPanel';
import type { Palette } from '@mdss/core';
import { SlideDeckView, type SlideDeckHandle } from './components/SlideDeck';
import { ControlCluster } from './components/ControlCluster';
import { SideMenu } from './components/SideMenu';
import { TemplateMenu } from './components/TemplateMenu';
import { HelpModal } from './components/HelpModal';
import { ConfirmModal } from './components/ConfirmModal';
import { UrlLoadModal } from './components/UrlLoadModal';
import { useKeyboardNav, usePersistentState } from './hooks/hooks';
import { useFileUpload, UPLOAD_ERROR_MESSAGES } from './hooks/useFileUpload';
import { canExportFromDom, resolveLayout, type LayoutMode } from './layout/layoutMode';
import {
  exportAllToZip,
  exportHtml,
  exportMarkdown,
  exportToPdf,
  exportToPng,
} from './export/exporters';
import { AiPromptPanel } from './components/AiPromptPanel';
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

function computeTextareaScrollTop(
  el: HTMLTextAreaElement,
  line: number,
  align: 'top' | 'center',
): number {
  const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 18;
  const y = line * lineHeight;
  return align === 'center' ? Math.max(0, y - el.clientHeight / 2) : Math.max(0, y);
}

export default function App({ mode }: { mode: 'edit' | 'present' }) {
  // wouterの navigate は、後述のスライド送り用 navigate(dir: 1|-1) と名前が衝突するため
  // goToRoute という別名で保持する。
  const [, goToRoute] = useLocation();
  const goEdit = useCallback(() => goToRoute('/'), [goToRoute]);
  const goPresent = useCallback(() => goToRoute('/present'), [goToRoute]);

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
  const slideStartLines = useMemo(() => getSlideStartLines(debouncedMd), [debouncedMd]);
  const lintResults = useMemo(() => lintDeck(deck), [deck]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // テンプレート挿入ボタンはtextarea外の要素なので、クリック時には
  // textareaがフォーカスを失っている（= document.activeElement !== el）。
  // selectionStartはfocus有無に関わらず最後の値を保持するが、
  // 一度もフォーカスされたことが無い場合は既定値の0を返すため、
  // 「一度でもフォーカスされたか」を別途追跡し、未フォーカス時は末尾追記にフォールバックする。
  const hasFocusedTextareaRef = useRef(false);

  // --- MDファイルアップロード（v0.5.0: ボタン／ドラッグ&ドロップ共通） ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const {
    pendingFileName,
    error: uploadError,
    handleFile,
    confirmReplace,
    cancel: cancelUpload,
  } = useFileUpload((text) => setMd(text), textareaRef);
  const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);
  // v0.5.4: ドロップ受付をエディタ領域だけでなく画面全体（window）に拡張。
  // 受付対象は「ファイルを含むドラッグ」のみ（テキスト選択のドラッグ等は無視）。
  // ブラウザ既定動作（ドロップしたファイルをタブで開く）は常に抑止する。
  useEffect(() => {
    const hasFiles = (e: globalThis.DragEvent) => e.dataTransfer?.types?.includes('Files') ?? false;
    const onDragOver = (e: globalThis.DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setDragOver(true);
    };
    const onDragLeave = (e: globalThis.DragEvent) => {
      // 子要素間の移動では relatedTarget が入る。ウィンドウ外へ出た時だけ解除する。
      if (e.relatedTarget === null) setDragOver(false);
    };
    const onDrop = (e: globalThis.DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer?.files[0];
      if (file) handleFile(file);
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [handleFile]);

  // --- URL指定によるMD取得（v0.5.1） ---
  const [urlLoadOpen, setUrlLoadOpen] = useState(false);
  const handleUrlLoadReplace = useCallback((text: string) => {
    setMd(text);
    // アップロード機能と同じくscrollTopを明示的に先頭へ戻す（v0.4.10由来の対策）。
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.scrollTop = 0;
    });
  }, []);

  // --- 表示状態 ---
  // v0.5.2: mode はルーター（AppRouter）から prop で受け取る。URLが唯一の正となるため
  // 内部stateは廃止（旧 usePersistentState('mdss-mode', ...) は非推奨化・移行処理なし）。
  // 表示モード（2分割／編集のみ／プレビューのみ）。present 中は 'preview' へ
  // 一時上書きするが保存値は変えない（プレゼンから戻ったとき作業レイアウトへ復帰させる）。
  const [layoutStored, setLayout] = usePersistentState<LayoutMode>('mdss-layout', 'split');
  const [menuOpen, setMenuOpen] = usePersistentState<'0' | '1'>('mdss-menu-expanded', '1');
  // 左サイドメニュー版AIプロンプト（メインパネル表示、非永続）。プレゼン中は無視してプレビュー優先。
  const [aiPromptPanelOpen, setAiPromptPanelOpen] = useState(false);
  const showAiPromptPanel = aiPromptPanelOpen && mode === 'edit';
  const effectiveLayout = resolveLayout(layoutStored, mode);
  // 'editor' では .preview-pane がアンマウントされ、DOM実体を必要とする書き出しが成立しない。
  // AIプロンプトパネル表示中も同様（editor-pane/preview-paneどちらも無い）。
  const canExport = canExportFromDom(effectiveLayout) && !showAiPromptPanel;
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

  // スライド送り/戻しに応じてエディタを対応するMarkdownブロックへスムーズスクロール。
  // clampedCurrent ではなく current を変化トリガーにする — clampedCurrent は
  // deck.slides.length が縮む（＝タイピング中）だけでも変わる派生値のため、
  // それを使うと「編集中に勝手にスクロールされる」事故になる。
  const prevScrollCurrentRef = useRef(current);
  useEffect(() => {
    const changed = prevScrollCurrentRef.current !== current;
    prevScrollCurrentRef.current = current;
    if (!changed) return;
    if (mode !== 'edit' || effectiveLayout !== 'split' || view !== 'hero') return;
    const el = textareaRef.current;
    const line = slideStartLines[clampedCurrent];
    if (!el || line === undefined) return;
    el.scrollTo({ top: computeTextareaScrollTop(el, line, 'top'), behavior: 'smooth' });
  }, [current, clampedCurrent, mode, effectiveLayout, view, slideStartLines]);

  // v0.4.10: preview → editor / split の遷移時に、現在スライドの先頭行へ
  // エディタをスクロールする。textarea は preview からの遷移で再マウントされるため
  // rAF で1フレーム待ってから scrollTo する。
  const prevLayoutForJumpRef = useRef<LayoutMode>(effectiveLayout);
  useEffect(() => {
    const prev = prevLayoutForJumpRef.current;
    prevLayoutForJumpRef.current = effectiveLayout;
    if (mode !== 'edit') return;
    if (view !== 'hero') return;
    if (prev !== 'preview' || effectiveLayout === 'preview') return;
    const line = slideStartLines[clampedCurrent];
    if (line === undefined) return;
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.scrollTo({ top: computeTextareaScrollTop(el, line, 'top'), behavior: 'smooth' });
    });
  }, [effectiveLayout, mode, view, clampedCurrent, slideStartLines]);

  const setPalette = (p: Palette) => {
    setPaletteOverride(p);
    try {
      localStorage.setItem(PALETTE_OVERRIDE_KEY, p);
    } catch {
      /* noop */
    }
  };

  // --- ナビゲーション ---
  // 一覧グリッド（G）・サムネ帯（T）・ページ番号入力（J）。いずれも既定は閉・保存しない。
  // 'editor' レイアウト・AIプロンプトパネル表示中は .preview-pane が無いので、状態は残っても無効扱い。
  const [gridOpen, setGridOpen] = useState(false);
  const [stripOpen, setStripOpen] = useState(false);
  const [jumping, setJumping] = useState(false);
  const previewVisible = effectiveLayout !== 'editor' && !showAiPromptPanel;
  const gridActive = gridOpen && previewVisible;
  const stripActive = stripOpen && view === 'hero' && previewVisible;
  const jumpActive = jumping && view === 'hero' && !gridActive && previewVisible;

  const lastIndex = Math.max(0, deck.slides.length - 1);
  const navigate = useCallback(
    (dir: 1 | -1) => {
      // 一覧モード・グリッド中は無効（元 navigation.js。グリッドでは矢印をフォーカス移動に使う）
      if (view === 'list' || gridActive) return;
      setCurrent((c) => Math.max(0, Math.min(deck.slides.length - 1, c + dir)));
    },
    [view, gridActive, deck.slides.length],
  );
  // 指定ページ（0始まり）へ。範囲外は先頭・末尾に丸める。hero のときだけ
  const goTo = useCallback(
    (index: number) => {
      if (view !== 'hero' || gridActive) return;
      setCurrent(Math.max(0, Math.min(lastIndex, index)));
    },
    [view, gridActive, lastIndex],
  );
  const goHome = useCallback(() => goTo(0), [goTo]);
  const goEnd = useCallback(() => goTo(lastIndex), [goTo, lastIndex]);
  const startJump = useCallback(() => {
    if (view === 'hero' && !gridActive && previewVisible && deck.slides.length > 0)
      setJumping(true);
  }, [view, gridActive, previewVisible, deck.slides.length]);
  const doJump = useCallback(
    (page: number) => {
      setJumping(false);
      goTo(page - 1);
    },
    [goTo],
  );
  const cancelJump = useCallback(() => setJumping(false), []);
  const toggleGrid = useCallback(() => {
    if (!previewVisible || deck.slides.length === 0) return;
    setJumping(false);
    setGridOpen((o) => !o);
  }, [previewVisible, deck.slides.length]);
  const toggleStrip = useCallback(() => {
    if (view !== 'hero' || gridActive || !previewVisible) return;
    setStripOpen((o) => !o);
  }, [view, gridActive, previewVisible]);
  // サムネ・グリッドのクリック／Enter: hero のそのページを開く
  const pickSlide = useCallback(
    (index: number) => {
      setCurrent(index);
      setView('hero');
      setGridOpen(false);
    },
    [setView],
  );

  const toggleView = useCallback(() => setView(view === 'hero' ? 'list' : 'hero'), [view, setView]);

  // --- スピーカーノートのポップアップ（hero ビューの右上 🗒️ / N キー） ---
  // 既定は閉・保存しない。デッキにノートが1つも無いときは 🗒️ もキーも無効。
  const [notesOpen, setNotesOpen] = useState(false);
  const hasAnyNotes = useMemo(
    () => deck.slides.some((s) => (s.speakerNotes?.length ?? 0) > 0),
    [deck.slides],
  );
  // 'editor' レイアウト・AIプロンプトパネル表示中は .preview-pane が無く、🗒️ も出ない
  const toggleNotes = useCallback(() => {
    if (view !== 'hero' || !hasAnyNotes || !previewVisible || gridActive) return;
    setNotesOpen((o) => !o);
  }, [view, hasAnyNotes, previewVisible, gridActive]);
  const closeNotes = useCallback(() => setNotesOpen(false), []);
  // Esc: 一覧グリッドを開いていればそれを閉じる（直前のビューへ戻る）。無ければノートポップアップを閉じる
  const onEscape = useCallback(() => {
    if (gridActive) setGridOpen(false);
    else closeNotes();
  }, [gridActive, closeNotes]);

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
      const linesBefore = el.value.slice(0, newPos).split('\n').length - 1;
      el.scrollTop = computeTextareaScrollTop(el, linesBefore, 'center');
    });
  }, []);
  const doHtml = useCallback(() => {
    const el = deckRef.current?.getScalerEl();
    if (el) void exportHtml(el, title, md);
  }, [title, md]);

  // レイアウトを選ぶ操作（クリック・キーボード共通）は、開いていれば
  // AIプロンプトパネルを閉じてから反映する（editor-pane/preview-paneと排他のDOM関係のため）。
  const applyLayout = useCallback(
    (m: LayoutMode) => {
      setAiPromptPanelOpen(false);
      setLayout(m);
    },
    [setLayout],
  );

  // present 中は表示モードを変えない（サイドメニュー自体もCSSで隠れている）。
  const onSetLayoutByKey = useCallback(
    (m: LayoutMode) => {
      if (mode === 'edit') applyLayout(m);
    },
    [mode, applyLayout],
  );

  // 'editor' ではボタンだけでなくショートカットも無効化する。
  // 無効化しないと P キーで白紙PDFが出るなどの無言failureになるため。
  useKeyboardNav(
    useMemo(
      () => ({
        onNavigate: navigate,
        onToggleView: toggleView,
        onToggleNotes: toggleNotes,
        onEscape,
        onHome: goHome,
        onEnd: goEnd,
        onJump: startJump,
        onToggleGrid: toggleGrid,
        onToggleStrip: toggleStrip,
        onSetLayout: onSetLayoutByKey,
        onExportPdf: canExport ? doPdf : undefined,
        onExportPng: canExport ? doPng : undefined,
        onExportZip: canExport ? doZip : undefined,
      }),
      [
        navigate,
        toggleView,
        toggleNotes,
        onEscape,
        goHome,
        goEnd,
        startJump,
        toggleGrid,
        toggleStrip,
        onSetLayoutByKey,
        canExport,
        doPdf,
        doPng,
        doZip,
      ],
    ),
    true,
  );

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
        {mode === 'present' && (
          <button className="primary" onClick={goEdit}>
            ✎ 編集に戻る
          </button>
        )}
      </header>

      <div className="workspace" data-layout={effectiveLayout}>
        <SideMenu
          layout={effectiveLayout}
          expanded={menuOpen === '1'}
          onSetLayout={applyLayout}
          onToggleExpanded={() => setMenuOpen(menuOpen === '1' ? '0' : '1')}
          onStartPresent={goPresent}
          aiPromptOpen={showAiPromptPanel}
          onOpenPromptPanel={() => setAiPromptPanelOpen(true)}
          onOpenFile={openFilePicker}
          onOpenUrlLoad={() => setUrlLoadOpen(true)}
          onLoadSample={() => setMd(sampleMd)}
          onOpenHelp={() => {
            setHelpOpen(true);
            setHelpSeen('seen');
          }}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />

        {showAiPromptPanel && <AiPromptPanel onClose={() => setAiPromptPanelOpen(false)} />}

        {!showAiPromptPanel && effectiveLayout !== 'preview' && (
          <div className="editor-pane" data-drag-over={dragOver ? 'true' : undefined}>
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

        {!showAiPromptPanel && effectiveLayout !== 'editor' && (
          <div className="preview-pane">
            <ControlCluster
              theme={theme}
              view={view}
              palette={palette}
              onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              onToggleView={toggleView}
              grid={gridActive}
              onToggleGrid={toggleGrid}
              strip={stripActive}
              onToggleStrip={toggleStrip}
              onSetPalette={setPalette}
              onExportHtml={doHtml}
              onExportPdf={doPdf}
              onExportPng={doPng}
              onExportZip={doZip}
              onExportMd={doMd}
              notes={
                hasAnyNotes
                  ? {
                      open: notesOpen,
                      onToggle: toggleNotes,
                      popup: {
                        notes: deck.slides[clampedCurrent]?.speakerNotes ?? [],
                        current: clampedCurrent,
                        total: deck.slides.length,
                        onNavigate: navigate,
                        onClose: closeNotes,
                      },
                    }
                  : undefined
              }
            />
            {deck.slides.length > 0 ? (
              <SlideDeckView
                ref={deckRef}
                deck={deck}
                current={clampedCurrent}
                view={view}
                grid={gridActive}
                strip={stripActive}
                jumping={jumpActive}
                onSelect={(i) => {
                  setCurrent(i);
                  setView('hero');
                }}
                onNavigate={navigate}
                onPick={pickSlide}
                onStartJump={startJump}
                onJump={doJump}
                onCancelJump={cancelJump}
              />
            ) : (
              <div className="empty-deck">
                スライドがありません。
                <br />
                frontmatter と <code>&lt;!-- slide: type --&gt;</code>{' '}
                ディレクティブを記述してください。
              </div>
            )}
          </div>
        )}
      </div>

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

      {dragOver && (
        <div className="drop-overlay" role="presentation" data-testid="drop-overlay">
          <div className="drop-overlay__label">📂 ここにMDファイルをドロップして読み込み</div>
        </div>
      )}

      {pendingFileName && (
        <ConfirmModal
          kind="confirm"
          title="📂 原稿を置き換えますか？"
          message={`「${pendingFileName}」の内容で現在の原稿を置き換えます。この操作は元に戻せません。`}
          confirmLabel="置き換える"
          cancelLabel="キャンセル"
          onConfirm={confirmReplace}
          onCancel={cancelUpload}
        />
      )}
      {uploadError && (
        <ConfirmModal
          kind="error"
          title="⚠ 読み込みエラー"
          message={UPLOAD_ERROR_MESSAGES[uploadError]}
          onCancel={cancelUpload}
        />
      )}
      {urlLoadOpen && (
        <UrlLoadModal onReplace={handleUrlLoadReplace} onClose={() => setUrlLoadOpen(false)} />
      )}
    </>
  );
}
