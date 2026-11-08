import { describe, expect, it } from 'vitest';
import {
  buildOverviewButtonsHtml,
  buildOverviewContainersHtml,
  OVERVIEW_SCRIPT,
} from './overviewRuntime';

describe('閲覧UIの部品（書き出しHTML）', () => {
  it('ボタンは 一覧(G)・サムネ帯(T) の2つで、サムネ帯は既定で hidden（hero になるまで JS が出す）', () => {
    const html = buildOverviewButtonsHtml();
    expect(html).toContain('id="grid-toggle"');
    expect(html).toContain('onclick="toggleGrid()"');
    expect(html).toContain('id="strip-toggle"');
    expect(html).toContain('onclick="toggleStrip()"');
    expect(html).toMatch(/id="strip-toggle"[^>]*hidden/);
    expect(html).not.toMatch(/id="grid-toggle"[^>]*hidden/);
  });

  it('入れ物（サムネ帯・グリッド）は空で hidden から始まる（既定は閉・サムネは開くまで作らない）', () => {
    const html = buildOverviewContainersHtml();
    expect(html).toMatch(/<div id="thumb-strip" class="thumb-strip"[^>]*hidden><\/div>/);
    expect(html).toMatch(/<div id="overview-grid" class="overview-grid"[^>]*hidden><\/div>/);
  });
});

describe('OVERVIEW_SCRIPT', () => {
  it('外側のテンプレートリテラルに埋め込めるよう、バッククォートと ${ を含まない', () => {
    expect(OVERVIEW_SCRIPT).not.toContain('`');
    expect(OVERVIEW_SCRIPT).not.toContain('${');
  });

  it('G / T / J / Home / End のキーと #番号・遅延生成・replaceState を扱う', () => {
    for (const needle of [
      "k === 'g'",
      "k === 't'",
      "k === 'j'",
      "k === 'Home'",
      "k === 'End'",
      'IntersectionObserver',
      'history.replaceState',
      'hashchange',
      'cloneNode(true)',
    ]) {
      expect(OVERVIEW_SCRIPT, needle).toContain(needle);
    }
  });

  it('外部URLを読み込まない（S4: 画像もライブラリも足さない）', () => {
    expect(OVERVIEW_SCRIPT).not.toMatch(/https?:\/\//);
  });

  it('既存のランタイム関数（update / applyView / navigate / fitSlide）を包んで拡張する', () => {
    for (const fn of ['update', 'applyView', 'navigate', 'fitSlide']) {
      expect(OVERVIEW_SCRIPT, fn).toMatch(new RegExp(`\\b${fn} = function`));
    }
  });
});
