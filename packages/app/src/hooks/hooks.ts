/**
 * hooks.ts — 元スキルの assets/scripts/*.js をReactカスタムフックに分解。
 * fit-slide.js → useFitSlide / navigation.js → useKeyboardNav /
 * theme-toggle.js・palette-toggle.js → usePersistentState（data属性はApp側で反映）
 */
import { useCallback, useEffect, useState, type RefObject } from 'react';
import { layoutModeFromKey, type LayoutMode } from '../layout/layoutMode';

/**
 * useFitSlide — コンテナ幅・高さに合わせて .slide-scaler をスケーリング。
 * 元実装は window 基準だったが、エディタ2ペイン埋め込みに対応するため
 * ResizeObserver でコンテナ基準に一般化（present モードではコンテナ＝全画面）。
 */
export function useFitSlide(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  /** 下部に重ねる UI（サムネ帯）の高さ。その分だけスライド表示領域を縮める */
  bottomInset = 0,
) {
  const [fit, setFit] = useState<{ scale: number; top: number | undefined }>({
    scale: 1,
    top: undefined,
  });
  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;
    const apply = () => {
      const vw = el.clientWidth;
      const vh = el.clientHeight - bottomInset;
      setFit({
        scale: Math.min(vw / 960, vh / 540) * 0.92,
        // 帯が開いているときは、残った領域の中央へスライドを置く
        top: bottomInset ? vh / 2 : undefined,
      });
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, enabled, bottomInset]);
  return fit;
}

export interface KeyboardNavHandlers {
  onNavigate: (dir: 1 | -1) => void;
  /** Enter（ボタン・リンク以外にフォーカスがあるとき）。list で現在のスライドを1枚表示で開く */
  onEnter?: () => void;
  onToggleView: () => void;
  /** ノートポップアップの開閉（N）。未指定ならキーを無視する。 */
  onToggleNotes?: () => void;
  /** Esc（一覧グリッド・ノートポップアップを閉じる）。未指定なら無視する。 */
  onEscape?: () => void;
  /** 先頭・末尾へ（Home / End）。未指定ならキーを無視する。 */
  onHome?: () => void;
  onEnd?: () => void;
  /** ページ番号の入力（J）。 */
  onJump?: () => void;
  /** 一覧グリッドの開閉（G）。 */
  onToggleGrid?: () => void;
  /** サムネ帯の開閉（T）。 */
  onToggleStrip?: () => void;
  /** 表示モード切替（1/2/3）。未指定ならキーを無視する。 */
  onSetLayout?: (m: LayoutMode) => void;
  onExportPdf?: () => void;
  onExportPng?: () => void;
  onExportZip?: () => void;
}

/**
 * useKeyboardNav — navigation.js のショートカット移植。
 * ← / → / Space / Shift+Space / Enter（list で1枚表示を開く） / Home / End / J（ページ番号入力） / F（フルスクリーン） / V（ビュー切替） /
 * G（一覧グリッド） / T（サムネ帯） / N（ノートポップアップ） / Esc（グリッド・ポップアップを閉じる） /
 * 1 / 2 / 3（表示モード切替） /
 * P（PDF） / Shift+S（PNG） / Shift+P（ZIP）
 * 入力フィールド内・Ctrl/Cmd 押下時は無効（ブラウザ標準を尊重）。
 */
export function useKeyboardNav(handlers: KeyboardNavHandlers, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey) return;

      // Shift+Space は前へ（Space の逆）
      if (e.key === ' ' && e.shiftKey) {
        e.preventDefault();
        handlers.onNavigate(-1);
        return;
      }
      if (
        e.key === 'Enter' &&
        handlers.onEnter &&
        !(t && (t.tagName === 'BUTTON' || t.tagName === 'A'))
      ) {
        e.preventDefault();
        handlers.onEnter();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handlers.onNavigate(1);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlers.onNavigate(-1);
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
        return;
      }
      if (e.key === 'v' || e.key === 'V') {
        handlers.onToggleView();
        return;
      }
      if (!e.shiftKey && !e.altKey && (e.key === 'n' || e.key === 'N') && handlers.onToggleNotes) {
        handlers.onToggleNotes();
        return;
      }
      if (e.key === 'Escape' && handlers.onEscape) {
        handlers.onEscape();
        return;
      }
      if (!e.shiftKey && !e.altKey) {
        const k = e.key;
        if (k === 'Home' && handlers.onHome) {
          e.preventDefault();
          handlers.onHome();
          return;
        }
        if (k === 'End' && handlers.onEnd) {
          e.preventDefault();
          handlers.onEnd();
          return;
        }
        if ((k === 'j' || k === 'J') && handlers.onJump) {
          e.preventDefault();
          handlers.onJump();
          return;
        }
        if ((k === 'g' || k === 'G') && handlers.onToggleGrid) {
          handlers.onToggleGrid();
          return;
        }
        if ((k === 't' || k === 'T') && handlers.onToggleStrip) {
          handlers.onToggleStrip();
          return;
        }
      }
      // 1/2/3 で表示モード切替。Shift併用時は e.key が記号になるため衝突しない。
      if (!e.shiftKey && handlers.onSetLayout) {
        const layoutMode = layoutModeFromKey(e.key);
        if (layoutMode) {
          e.preventDefault();
          handlers.onSetLayout(layoutMode);
          return;
        }
      }
      if (e.shiftKey && e.key === 'P') {
        e.preventDefault();
        handlers.onExportZip?.();
        return;
      }
      if (e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        handlers.onExportPng?.();
        return;
      }
      if (!e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handlers.onExportPdf?.();
        return;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handlers, enabled]);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  else document.exitFullscreen().catch(() => {});
}

/** localStorage 永続化つき useState（theme / palette / view / 原稿の保存に使用） */
export function usePersistentState<T extends string>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      return (localStorage.getItem(key) as T) ?? initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        localStorage.setItem(key, v);
      } catch {
        /* private mode 等 */
      }
    },
    [key],
  );
  return [value, set];
}
