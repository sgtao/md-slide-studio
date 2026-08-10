import { describe, expect, it } from 'vitest';
import { parseRawSvg, SVG_RAW_LIMITS } from './svgRaw';

describe('parseRawSvg', () => {
  it('正常なSVGをパースする', () => {
    const warnings: string[] = [];
    const src = `<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="80" height="60" fill="#4f8ff7" />
  <circle cx="150" cy="40" r="20" fill="#f76c4f" />
</svg>`;
    const r = parseRawSvg(src, warnings);
    expect(r?.type).toBe('raw');
    expect(r?.root.tag).toBe('svg');
    expect(r?.root.attrs.viewBox).toBe('0 0 200 100');
    expect(r?.root.children).toHaveLength(2);
    expect(warnings).toHaveLength(0);
  });

  it('<script> は除去され警告になる', () => {
    const warnings: string[] = [];
    const src = `<svg viewBox="0 0 10 10"><script>alert(1)</script><rect x="0" y="0" width="5" height="5" /></svg>`;
    const r = parseRawSvg(src, warnings);
    expect(r?.root.children).toHaveLength(1);
    expect(r?.root.children[0]).toMatchObject({ tag: 'rect' });
    expect(warnings.some((w) => w.includes('script'))).toBe(true);
  });

  it('on* イベントハンドラ属性は除去される', () => {
    const warnings: string[] = [];
    const src = `<svg viewBox="0 0 10 10"><rect x="0" y="0" width="5" height="5" onclick="alert(1)" fill="red" /></svg>`;
    const r = parseRawSvg(src, warnings);
    const rect = r?.root.children[0];
    expect(rect && 'attrs' in rect ? rect.attrs.onclick : undefined).toBeUndefined();
    expect(rect && 'attrs' in rect ? rect.attrs.fill : undefined).toBe('red');
  });

  it('javascript: の href は除去され、#idの内部参照は許可される', () => {
    const warnings: string[] = [];
    const src = `<svg viewBox="0 0 10 10">
  <defs><linearGradient id="g1"></linearGradient></defs>
  <rect x="0" y="0" width="5" height="5" href="javascript:alert(1)" />
  <rect x="0" y="0" width="5" height="5" href="#g1" />
</svg>`;
    const r = parseRawSvg(src, warnings);
    const rects = r?.root.children.filter((c) => 'tag' in c && c.tag === 'rect') as {
      attrs: Record<string, string>;
    }[];
    expect(rects[0].attrs.href).toBeUndefined();
    expect(rects[1].attrs.href).toBe('#g1');
  });

  it('viewBoxが無い場合はwidth/heightから自動補完する', () => {
    const warnings: string[] = [];
    const src = `<svg width="120" height="60"><rect x="0" y="0" width="5" height="5" /></svg>`;
    const r = parseRawSvg(src, warnings);
    expect(r?.root.attrs.viewBox).toBe('0 0 120 60');
  });

  it('viewBoxもwidth/heightも無い場合は警告のみで描画継続', () => {
    const warnings: string[] = [];
    const src = `<svg><rect x="0" y="0" width="5" height="5" /></svg>`;
    const r = parseRawSvg(src, warnings);
    expect(r).not.toBeNull();
    expect(r?.root.attrs.viewBox).toBeUndefined();
    expect(warnings.some((w) => w.includes('viewBox'))).toBe(true);
  });

  it('許可リスト外の要素はサブツリーごと除去され、種類ごとに1回だけ警告する', () => {
    const warnings: string[] = [];
    const src = `<svg viewBox="0 0 10 10">
  <filter id="f1"><feGaussianBlur stdDeviation="2" /></filter>
  <rect x="0" y="0" width="5" height="5" />
</svg>`;
    const r = parseRawSvg(src, warnings);
    expect(r?.root.children).toHaveLength(1);
    expect(warnings.filter((w) => w.includes('filter'))).toHaveLength(1);
  });

  it('不正なXML（閉じタグ不整合）は null を返す', () => {
    const warnings: string[] = [];
    const src = `<svg viewBox="0 0 10 10"><rect x="0" y="0"></svg>`;
    const r = parseRawSvg(src, warnings);
    expect(r).toBeNull();
    expect(warnings.some((w) => w.includes('XMLが不正'))).toBe(true);
  });

  it('ルート要素が<svg>でない場合は null を返す', () => {
    const warnings: string[] = [];
    const r = parseRawSvg('<g><rect x="0" y="0" width="5" height="5" /></g>', warnings);
    expect(r).toBeNull();
    expect(warnings.some((w) => w.includes('<svg>'))).toBe(true);
  });

  it('文字数上限を超えると警告するが、パースは継続する', () => {
    const filler = 'x'.repeat(SVG_RAW_LIMITS.maxSourceLength + 1);
    const warnings: string[] = [];
    const src = `<svg viewBox="0 0 10 10"><title>${filler}</title></svg>`;
    const r = parseRawSvg(src, warnings);
    expect(r).not.toBeNull();
    expect(warnings.some((w) => w.includes('20,000') || w.includes('20000'))).toBe(true);
  });
});
