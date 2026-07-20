/**
 * ssr.tsx — サーバーサイド／CLI 用の描画エントリ（DOM非依存の部分だけを再export）。
 *
 * ブラウザ実行時（main.tsx 経由）とは別に、Node（`react-dom/server`）から
 * SlideRenderer を直接呼び出して静的HTMLを得るための公開点。
 * ここでは CSS import・hooks・export（html2canvas 等）は一切引き込まない。
 * 引き込むのは type別Viewの純描画（SlideRenderer / slideSectionClass）のみで、
 * これらは window/document を参照しないため node 上で安全に renderToStaticMarkup できる。
 *
 * SSOT注意: 描画の正はあくまで SlideRenderer.tsx（1実装）。CLIはこの1実装を
 * そのまま再利用するため、ブラウザ版とCLI版でスライドDOMがドリフトしない。
 */
export { SlideRenderer, slideSectionClass } from './components/slides/SlideRenderer';
