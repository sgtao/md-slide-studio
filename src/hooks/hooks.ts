/**
 * hooks.ts — 元スキルの assets/scripts/*.js をReactカスタムフックに分解。
 * fit-slide.js → useFitSlide / navigation.js → useKeyboardNav /
 * theme-toggle.js・palette-toggle.js → usePersistentState（data属性はApp側で反映）
 */
import { useCallback, useEffect, useState, type RefObject } from 'react';

/**
 * useFitSlide — コンテナ幅・高さに合わせて .slide-scaler をスケーリング。
 * 元実装は window 基準だったが、エディタ2ペイン埋め込みに対応するため
 * ResizeObserver でコンテナ基準に一般化（present モードではコンテナ＝全画面）。
 */
export function useFitSlide(containerRef: RefObject<HTMLElement | null>, enabled: boolean) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;
    const fit = () => {
      const { clientWidth: vw, clientHeight: vh } = el;
      setScale(Math.min(vw / 960, vh / 540) * 0.92);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, enabled]);
  return scale;
}

export interface KeyboardNavHandlers {
  onNavigate: (dir: 1 | -1) => void;
  onToggleView: () => void;
  onExportPdf?: () => void;
  onExportPng?: () => void;
  onExportZip?: () => void;
}

/**
 * useKeyboardNav — navigation.js のショートカット移植。
 * ← / → / Space / F（フルスクリーン） / V（ビュー切替） /
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
