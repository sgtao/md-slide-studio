/**
 * inline-br.test.tsx: renderInline の allowBr オプション（見出し限定の <br> 対応）。
 * 既存 inline.tsx のテストファイルには追記せず、新規ファイルとして分離する
 * （既存ファイルの内容へのanchor依存を避けるための規約）。
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { renderInline } from './inline';

function toHtml(text: string, opts?: { allowBr?: boolean }): string {
  return renderToStaticMarkup(createElement('div', null, renderInline(text, opts)));
}

describe('renderInline: allowBr', () => {
  it('allowBr未指定（既定）では <br> は改行にならず文字列のまま出力される', () => {
    const html = toHtml('1行目<br>2行目');
    expect(html).not.toContain('<br/>');
    expect(html).toContain('&lt;br&gt;');
  });

  it('allowBr: true では <br> が改行要素になる', () => {
    const html = toHtml('1行目<br>2行目', { allowBr: true });
    expect(html).toContain('<br/>');
    expect(html).not.toContain('&lt;br&gt;');
  });

  it('allowBr: true でも ==強調== 等の既存記法は変わらず解釈される', () => {
    const html = toHtml('前段<br>==強調==の後段', { allowBr: true });
    expect(html).toContain('<br/>');
    expect(html).toContain('class="hl"');
  });

  it('<br/> のような自己終了タグ表記も解釈できる', () => {
    const html = toHtml('1行目<br/>2行目', { allowBr: true });
    expect(html).toContain('<br/>');
  });
});
