/**
 * SlideDeck.tsx — スライド表示本体。
 * base-template.html の .slide-scaler / .nav-arrow / #progress-bar / #slide-counter
 * と同一のDOM構造を出力する（元CSSをそのまま適用するため）。
 * list ビューは 960×540 の箱ごと scale する（元 view-toggle.js の scaleListSlides() を
 * CSS 変数 --list-scale の設定に置き換え、デッキ単位の effect として移植。v0.6.1）。
 * 閲覧UI（サムネ帯・一覧グリッド・ページ番号入力）もここに載せる。
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
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
  /** list ビューで、指定ページ（0始まり）のスライドが見える位置までスクロールする */
  scrollToSlide: (index: number) => void;
}

/** list ビューのスクロール領域の上 padding（app.css の .slide-scaler と同じ値） */
const LIST_TOP_PADDING = 56;

interface Props {
  deck: Deck;
  current: number;
  view: 'hero' | 'list';
  /** 一覧グリッド（G）を開いているか。開いている間は全画面に重ねて表示する */
  grid?: boolean;
  /** サムネ帯（T）を開いているか。hero・list で表示する（グリッド中は出さない） */
  strip?: boolean;
  /** ページ番号の入力中か（カウンターが数字入力欄になる） */
  jumping?: boolean;
  onSelect: (index: number) => void;
  /** list ビューで、画面の上寄りに見えているスライド（＝現在のスライド）が変わったとき（サムネ帯のクリックも含む） */
  onTrack?: (index: number) => void;
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
    onTrack,
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
  const showStrip = strip && !grid;
  const { scale, top } = useFitSlide(
    containerRef,
    view === 'hero',
    showStrip && view === 'hero' ? THUMB_STRIP_HEIGHT : 0,
  );
  const total = deck.slides.length;
  const currentRef = useRef(current);
  const onTrackRef = useRef(onTrack);
  const expectedScrollTopRef = useRef(-1); // 自分で動かしたスクロール位置。この位置のスクロールは現在ページの追従に使わない
  useEffect(() => {
    currentRef.current = current;
    onTrackRef.current = onTrack;
  });

  const scrollToSlide = useCallback((index: number) => {
    const c = containerRef.current;
    const s = scalerRef.current?.querySelectorAll<HTMLElement>('.slide')[index];
    if (!c || !s) return;
    const y = s.getBoundingClientRect().top - c.getBoundingClientRect().top + c.scrollTop;
    c.scrollTop = Math.max(0, y - LIST_TOP_PADDING);
    expectedScrollTopRef.current = c.scrollTop;
  }, []);

  useImperativeHandle(ref, () => ({
    getActiveSlideEl: () => scalerRef.current?.querySelector<HTMLElement>('.slide.active') ?? null,
    getAllSlideEls: () =>
      Array.from(scalerRef.current?.querySelectorAll<HTMLElement>('.slide') ?? []),
    getScalerEl: () => scalerRef.current,
    scrollToSlide,
  }));

  // list ビュー: 画面の上から数えて半分より多く見えている最初のスライドを「現在のスライド」にする。
  // サムネ帯の強調・N／J で hero に移るときの行き先・PNG の対象になる。
  const listActive = view === 'list' && !grid;
  useEffect(() => {
    const c = containerRef.current;
    const scaler = scalerRef.current;
    if (!listActive || !c || !scaler) return;
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        if (Math.abs(c.scrollTop - expectedScrollTopRef.current) <= 2) return;
        const els = scaler.querySelectorAll<HTMLElement>('.slide');
        let idx: number;
        if (c.scrollTop <= 1) idx = 0;
        else if (c.scrollTop + c.clientHeight >= c.scrollHeight - 2) idx = els.length - 1;
        else {
          // 画面の上から数えて、半分より多く見えている最初のスライド
          const top = c.getBoundingClientRect().top;
          idx = els.length - 1;
          for (let i = 0; i < els.length; i++) {
            const r = els[i].getBoundingClientRect();
            if (r.bottom - top > r.height * 0.5) {
              idx = i;
              break;
            }
          }
        }
        if (idx !== currentRef.current) onTrackRef.current?.(idx);
      });
    };
    c.addEventListener('scroll', onScroll, { passive: true });
    return () => c.removeEventListener('scroll', onScroll);
  }, [listActive, deck]);

  // list に入った（hero・グリッドから戻った）ら、現在のスライドが見える位置までスクロールする
  useEffect(() => {
    if (!listActive) return;
    const id = requestAnimationFrame(() => scrollToSlide(currentRef.current));
    return () => cancelAnimationFrame(id);
  }, [listActive, scrollToSlide]);

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
      {showStrip && onPick && (
        <ThumbStrip
          deck={deck}
          current={current}
          onPick={
            view === 'list'
              ? (i) => {
                  // list では1枚表示へ切り替えず、そのスライドまでスクロールする
                  scrollToSlide(i);
                  onTrack?.(i);
                }
              : onPick
          }
        />
      )}
      {grid && onPick && <OverviewGrid deck={deck} current={current} onPick={onPick} />}
    </div>
  );
});
