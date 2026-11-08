/**
 * Overview.tsx — 閲覧UI: サムネ帯（T）と一覧グリッド（G）。
 *
 * 書き出しHTML側（core/standalone/overviewRuntime.ts）と DOM の id・クラス名・キーを揃え、
 * CSS（theme/overview.css）を共有する。設計: 02_viewer-ui-plan.md §4-1〜§4-4。
 *
 * サムネは SlideRenderer の描画結果を 960×540 の箱（.thumb-stage）に入れて scale() で縮小する
 * （画像は作らない）。見える位置に来たサムネだけ IntersectionObserver で描画する（遅延生成）。
 * 色は CSS 変数だけで決まるので、パレット・ライト/ダークには自動で追従する。
 */
import { useEffect, useRef, useState } from 'react';
import type { SlideDeck as Deck } from '@mdss/core';
import { SlideRenderer, slideSectionClass } from './slides/SlideRenderer';

/** サムネ帯の高さ（overview.css の .thumb-strip の height と同じ値） */
export const THUMB_STRIP_HEIGHT = 112;

type Slide = Deck['slides'][number];

function ThumbFrame({ slide, index, total }: { slide: Slide; index: number; total: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  // 一度見えたら描画したままにする（スクロールで行き来しても作り直さない）
  // （IntersectionObserver が無い環境では最初から描画する）
  const [visible, setVisible] = useState(typeof IntersectionObserver === 'undefined');
  const [scale, setScale] = useState(0.15);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth) setScale(el.clientWidth / 960);
    });
    ro.observe(el);
    if (typeof IntersectionObserver === 'undefined') return () => ro.disconnect();
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '160px' },
    );
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <span
      ref={ref}
      className="thumb-frame"
      data-index={index}
      data-filled={visible ? '1' : undefined}
    >
      <span className="thumb-stage" style={{ transform: `scale(${scale})` }}>
        {visible && (
          <section
            className={slideSectionClass(slide, false)}
            data-num={`${index + 1} / ${total}`}
            aria-hidden="true"
          >
            <SlideRenderer slide={slide} index={index + 1} />
          </section>
        )}
      </span>
    </span>
  );
}

function Thumb({
  slide,
  index,
  total,
  current,
  onPick,
  keepFocus,
}: {
  slide: Slide;
  index: number;
  total: number;
  current: boolean;
  onPick: (index: number) => void;
  /** マウスで押してもフォーカスを奪わない（押したあとも Space がスライド送りのまま効く） */
  keepFocus?: boolean;
}) {
  return (
    <button
      type="button"
      className={`thumb${current ? ' is-current' : ''}`}
      data-index={index}
      aria-label={`${index + 1}枚目`}
      aria-current={current ? 'true' : undefined}
      onMouseDown={keepFocus ? (e) => e.preventDefault() : undefined}
      onClick={() => onPick(index)}
    >
      <ThumbFrame slide={slide} index={index} total={total} />
      <span className="thumb-num">{index + 1}</span>
    </button>
  );
}

/** サムネ帯（hero の下部）。現在のページを枠で強調し、移動に合わせて中央へスクロールする。 */
export function ThumbStrip({
  deck,
  current,
  onPick,
}: {
  deck: Deck;
  current: number;
  onPick: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = ref.current;
    const b = strip?.querySelector<HTMLElement>(`.thumb[data-index="${current}"]`);
    if (!strip || !b) return;
    strip.scrollLeft = b.offsetLeft - (strip.clientWidth - b.offsetWidth) / 2;
  }, [current]);

  return (
    <div
      ref={ref}
      id="thumb-strip"
      className="thumb-strip"
      role="toolbar"
      aria-label="サムネイル帯"
      style={{ height: THUMB_STRIP_HEIGHT }}
    >
      {deck.slides.map((slide, i) => (
        <Thumb
          key={i}
          slide={slide}
          index={i}
          total={deck.slides.length}
          current={i === current}
          onPick={onPick}
          keepFocus
        />
      ))}
    </div>
  );
}

/** グリッドの列数（先頭と同じ高さに並んでいるサムネの数） */
function gridColumns(grid: HTMLElement): number {
  const thumbs = grid.querySelectorAll<HTMLElement>('.thumb');
  if (!thumbs.length) return 1;
  const top = thumbs[0].offsetTop;
  let n = 0;
  for (const t of Array.from(thumbs)) {
    if (t.offsetTop === top) n++;
    else break;
  }
  return Math.max(1, n);
}

/**
 * 一覧グリッド（画面全体に重ねる）。開いたときに現在のページまでスクロールしてフォーカスする。
 * 矢印キーでフォーカス移動、Enter / Space で hero のそのページを開く（Esc は呼び出し側）。
 */
export function OverviewGrid({
  deck,
  current,
  onPick,
}: {
  deck: Deck;
  current: number;
  onPick: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const total = deck.slides.length;

  useEffect(() => {
    const grid = ref.current;
    const b = grid?.querySelector<HTMLElement>(`.thumb[data-index="${current}"]`);
    if (!grid || !b) return;
    grid.scrollTop = b.offsetTop - (grid.clientHeight - b.offsetHeight) / 2;
    b.focus({ preventScroll: true });
    // 開いたときだけ。開いている間の current は変わらない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const grid = ref.current;
    if (!grid) return;
    const b = (e.target as HTMLElement).closest<HTMLElement>('.thumb');
    const idx = b ? Number(b.dataset.index) : current;
    const k = e.key;
    if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onPick(idx);
      return;
    }
    const cols = gridColumns(grid);
    let next: number;
    if (k === 'ArrowRight') next = idx + 1;
    else if (k === 'ArrowLeft') next = idx - 1;
    else if (k === 'ArrowDown') next = idx + cols;
    else if (k === 'ArrowUp') next = idx - cols;
    else if (k === 'Home') next = 0;
    else if (k === 'End') next = total - 1;
    else return;
    // document 側の →/Space 送り・Home/End へ伝えない
    e.preventDefault();
    e.stopPropagation();
    if (next < 0 || next > total - 1) return;
    grid.querySelector<HTMLElement>(`.thumb[data-index="${next}"]`)?.focus();
  };

  return (
    <div
      ref={ref}
      id="overview-grid"
      className="overview-grid"
      role="group"
      aria-label="スライド一覧"
      onKeyDown={onKeyDown}
    >
      {deck.slides.map((slide, i) => (
        <Thumb
          key={i}
          slide={slide}
          index={i}
          total={total}
          current={i === current}
          onPick={onPick}
        />
      ))}
    </div>
  );
}
