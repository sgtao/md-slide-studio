/**
 * SlideDeck.tsx — スライド表示本体。
 * base-template.html の .slide-scaler / .nav-arrow / #progress-bar / #slide-counter
 * と同一のDOM構造を出力する（元CSSをそのまま適用するため）。
 * list ビュー時の .slide-inner スケーリングは元 view-toggle.js の
 * scaleListSlides() をデッキ単位の effect として移植。
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { SlideDeck as Deck } from '../parser/types';
import { SlideRenderer, slideSectionClass } from './slides/SlideRenderer';
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
  onSelect: (index: number) => void;
  onNavigate: (dir: 1 | -1) => void;
}

export const SlideDeckView = forwardRef<SlideDeckHandle, Props>(function SlideDeckView(
  { deck, current, view, onSelect, onNavigate },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scalerRef = useRef<HTMLDivElement>(null);
  const scale = useFitSlide(containerRef, view === 'hero');
  const total = deck.slides.length;

  useImperativeHandle(ref, () => ({
    getActiveSlideEl: () => scalerRef.current?.querySelector<HTMLElement>('.slide.active') ?? null,
    getAllSlideEls: () =>
      Array.from(scalerRef.current?.querySelectorAll<HTMLElement>('.slide') ?? []),
    getScalerEl: () => scalerRef.current,
  }));

  // list ビュー: 各 .slide-inner を親スライド幅/960 でスケール（scaleListSlides 移植）
  useEffect(() => {
    const scaler = scalerRef.current;
    if (!scaler) return;
    const apply = () => {
      scaler.querySelectorAll<HTMLElement>('.slide').forEach((slide) => {
        const inner = slide.querySelector<HTMLElement>('.slide-inner');
        if (!inner) return;
        inner.style.transform = view === 'list' ? `scale(${slide.clientWidth / 960})` : '';
      });
    };
    requestAnimationFrame(apply);
    if (view !== 'list') return;
    const ro = new ResizeObserver(() => requestAnimationFrame(apply));
    ro.observe(scaler);
    return () => ro.disconnect();
  }, [view, deck]);

  return (
    <div ref={containerRef} className="deck-container" data-view={view}>
      <div id="progress-bar" style={{ width: `${total ? ((current + 1) / total) * 100 : 0}%` }} />
      <div
        ref={scalerRef}
        className="slide-scaler"
        style={view === 'hero' ? { transform: `translate(-50%, -50%) scale(${scale})` } : undefined}
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
          <div id="slide-counter">
            {current + 1} / {total}
          </div>
        )}
      </div>
    </div>
  );
});
