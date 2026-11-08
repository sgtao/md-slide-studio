/**
 * SlideDeck.tsx — スライド表示本体。
 * base-template.html の .slide-scaler / .nav-arrow / #progress-bar / #slide-counter
 * と同一のDOM構造を出力する（元CSSをそのまま適用するため）。
 * list ビューは 960×540 の箱ごと scale する（元 view-toggle.js の scaleListSlides() を
 * CSS 変数 --list-scale の設定に置き換え、デッキ単位の effect として移植。v0.6.1）。
 * 閲覧UI（サムネ帯・一覧グリッド・ページ番号入力）もここに載せる。
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { SlideDeck as Deck } from '@mdss/core';
import { SlideRenderer, slideSectionClass } from './slides/SlideRenderer';
import { OverviewGrid, THUMB_STRIP_HEIGHT, ThumbStrip } from './Overview';
import { useFitSlide } from '../hooks/hooks';

export interface SlideDeckHandle {
  /** 現在表示中の .slide 要素（PNGエクスポート用） */
  getActiveSlideEl: () => HTMLElement | null;
  getAllSlideEls: () => HTMLElement[];
  /** .slide-scaler 全体（HTMLエクスポート用） */
  getScalerEl: () => HTMLElement | null;
}

interface Props {
  deck: Deck;
  current: number;
  view: 'hero' | 'list';
  /** 一覧グリッド（G）を開いているか。開いている間は全画面に重ねて表示する */
  grid?: boolean;
  /** サムネ帯（T）を開いているか。hero のときだけ有効 */
  strip?: boolean;
  /** ページ番号の入力中か（カウンターが数字入力欄になる） */
  jumping?: boolean;
  onSelect: (index: number) => void;
  onNavigate: (dir: 1 | -1) => void;
  /** サムネ・グリッドのクリック／Enter。hero のそのページへ移動する */
  onPick?: (index: number) => void;
  onStartJump?: () => void;
  /** 入力した番号（1始まり）で移動する。範囲外の丸めは呼び出し側 */
  onJump?: (page: number) => void;
  onCancelJump?: () => void;
}

/** カウンターの数字入力欄（Enter で移動・Esc／フォーカス外れで取消） */
function JumpInput({
  current,
  total,
  onJump,
  onCancel,
}: {
  current: number;
  total: number;
  onJump: (page: number) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const finish = (go: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    const v = parseInt(ref.current?.value ?? '', 10);
    if (go && !Number.isNaN(v)) onJump(v);
    else onCancel();
  };
  return (
    <>
      <input
        ref={ref}
        type="number"
        className="counter-input"
        min={1}
        max={total}
        defaultValue={current + 1}
        aria-label="移動先のページ番号"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            finish(true);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            finish(false);
          }
        }}
        onBlur={() => finish(false)}
      />
      {` / ${total}`}
    </>
  );
}

export const SlideDeckView = forwardRef<SlideDeckHandle, Props>(function SlideDeckView(
  {
    deck,
    current,
    view,
    grid = false,
    strip = false,
    jumping = false,
    onSelect,
    onNavigate,
    onPick,
    onStartJump,
    onJump,
    onCancelJump,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scalerRef = useRef<HTMLDivElement>(null);
  const showStrip = strip && view === 'hero' && !grid;
  const { scale, top } = useFitSlide(
    containerRef,
    view === 'hero',
    showStrip ? THUMB_STRIP_HEIGHT : 0,
  );
  const total = deck.slides.length;

  useImperativeHandle(ref, () => ({
    getActiveSlideEl: () => scalerRef.current?.querySelector<HTMLElement>('.slide.active') ?? null,
    getAllSlideEls: () =>
      Array.from(scalerRef.current?.querySelectorAll<HTMLElement>('.slide') ?? []),
    getScalerEl: () => scalerRef.current,
  }));

  // list ビュー: 各スライドを 960×540 の箱ごと scale する。縮小率 --list-scale（= 表示幅 / 960）を
  // .slide-scaler に設定し、CSS（app.css）がスライドごと縮める（scaleListSlides 移植）。
  // .slide-inner を持たない型や .slide-point など絶対配置の要素も同じ比率で縮む。
  useEffect(() => {
    const scaler = scalerRef.current;
    const container = containerRef.current;
    if (!scaler || !container) return;
    if (view !== 'list') {
      scaler.style.removeProperty('--list-scale');
      return;
    }
    const apply = () => {
      // 幅は従来どおり「スケーラーの内側（左右の padding を除いた幅）の 90%、最大 960px」
      const cs = getComputedStyle(scaler);
      const content =
        scaler.clientWidth - parseFloat(cs.paddingLeft || '0') - parseFloat(cs.paddingRight || '0');
      const w = Math.min(content * 0.9, 960);
      scaler.style.setProperty('--list-scale', String(w / 960));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(container);
    return () => ro.disconnect();
  }, [view, deck]);

  return (
    <div ref={containerRef} className="deck-container" data-view={grid ? 'grid' : view}>
      <div id="progress-bar" style={{ width: `${total ? ((current + 1) / total) * 100 : 0}%` }} />
      <div
        ref={scalerRef}
        className="slide-scaler"
        style={
          view === 'hero'
            ? {
                transform: `translate(-50%, -50%) scale(${scale})`,
                ...(top !== undefined ? { top } : {}),
              }
            : undefined
        }
      >
        <button
          className="nav-arrow nav-prev"
          id="btn-prev"
          hidden={view === 'list' || current === 0}
          onClick={() => onNavigate(-1)}
          aria-label="前のスライド"
        >
          ‹
        </button>
        <button
          className="nav-arrow nav-next"
          id="btn-next"
          hidden={view === 'list' || current === total - 1}
          onClick={() => onNavigate(1)}
          aria-label="次のスライド"
        >
          ›
        </button>

        {deck.slides.map((slide, i) => (
          <section
            key={i}
            id={`s${i + 1}`}
            className={slideSectionClass(slide, i === current)}
            data-num={`${i + 1} / ${total}`}
            onClick={() => {
              if (view === 'list') onSelect(i);
            }}
          >
            <SlideRenderer slide={slide} index={i + 1} />
          </section>
        ))}

        {view === 'hero' && total > 0 && (
          <div
            id="slide-counter"
            title="クリックでページ番号を入力（J）"
            onClick={() => onStartJump?.()}
          >
            {jumping && onJump && onCancelJump ? (
              <JumpInput current={current} total={total} onJump={onJump} onCancel={onCancelJump} />
            ) : (
              `${current + 1} / ${total}`
            )}
          </div>
        )}
      </div>
      {showStrip && onPick && <ThumbStrip deck={deck} current={current} onPick={onPick} />}
      {grid && onPick && <OverviewGrid deck={deck} current={current} onPick={onPick} />}
    </div>
  );
});
