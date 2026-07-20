/**
 * render.tsx — MD → スタンドアロンHTML のCLI描画パイプライン。
 *
 * 設計の要:
 * - パース: @mdss/core の parseSlideMarkdown（ブラウザ版と同一の1実装）
 * - 描画:   @mdss/app の SlideRenderer / slideSectionClass（同上・1実装）を
 *           react-dom/server の renderToStaticMarkup で静的HTML化
 * - 外装:   standalone.ts の assembleStandaloneHtml（ブラウザ export と同一テンプレ）
 *
 * これによりブラウザ版（SlideDeck.tsx が組み立てる .slide セクション）と
 * バイト等価に近い .slide セクションをNodeだけで再現する。
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { lintDeck, parseSlideMarkdown, sortLintResults, type SlideDeck } from '@mdss/core';
import { SlideRenderer, slideSectionClass } from '@mdss/app-ssr';
import { THEME_CSS } from './generated/themeCss';
import { assembleStandaloneHtml } from './standalone';

const PALETTES = ['ocean', 'forest', 'sunset', 'plum', 'graphite'] as const;
export type Palette = (typeof PALETTES)[number];
export type Theme = 'light' | 'dark';

export interface ConvertOptions {
  /** 明示指定があれば frontmatter.palette より優先 */
  palette?: string;
  /** 既定 light */
  theme?: string;
}

export interface ConvertResult {
  html: string;
  title: string;
  palette: string;
  theme: string;
  slideCount: number;
  /** パーサが積んだ非クラッシュ警告（値のフォールバック等） */
  warnings: string[];
  /** deckLint の結果（レベル付き） */
  lint: { level: string; message: string; slide?: number }[];
}

function isPalette(v: string | undefined): v is Palette {
  return !!v && (PALETTES as readonly string[]).includes(v);
}

/** deck の全 .slide セクションを静的HTML文字列にする（SlideDeck.tsx と同一構造）。 */
function renderSections(deck: SlideDeck): string {
  const total = deck.slides.length;
  return deck.slides
    .map((slide, i) => {
      const inner = renderToStaticMarkup(
        createElement(SlideRenderer, { slide, index: i + 1 }),
      );
      const cls = slideSectionClass(slide, i === 0); // 先頭のみ active（外装JSがlist/heroで管理）
      const dataNum = `${i + 1} / ${total}`;
      return (
        `<section id="s${i + 1}" class="${cls}" data-num="${dataNum}">` +
        inner +
        `</section>`
      );
    })
    .join('\n');
}

/** MD文字列 → スタンドアロンHTML（＋メタ情報）。純関数・副作用なし。 */
export function convertMarkdown(md: string, opts: ConvertOptions = {}): ConvertResult {
  const deck = parseSlideMarkdown(md);
  const total = deck.slides.length;

  const theme: Theme = opts.theme === 'dark' ? 'dark' : 'light';
  const palette: string = isPalette(opts.palette)
    ? opts.palette
    : deck.frontmatter.palette || 'ocean';
  const title = deck.frontmatter.title || '';

  const sectionsHtml = renderSections(deck);
  const html = assembleStandaloneHtml({
    title,
    theme,
    palette,
    md,
    css: THEME_CSS,
    sectionsHtml,
    total,
  });

  const lint = sortLintResults(lintDeck(deck)).map((r) => ({
    level: r.level,
    message: r.message,
    slide: r.slideIndex,
  }));

  return {
    html,
    title,
    palette,
    theme,
    slideCount: total,
    warnings: deck.warnings,
    lint,
  };
}
