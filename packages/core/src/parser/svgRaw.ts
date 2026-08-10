/**
 * svgRaw.ts — svg-figure の RawSvgBlock（v0.4.8〜）を生成する、DOM非依存の
 * 簡易SVGパーサー・サニタイザー。
 *
 * `DOMParser` / `jsdom` には依存せず、正規表現ベースの簡易タグトークナイザーを
 * スタック方式で実装する（Node/ブラウザ両対応が必須のため）。
 * 「落ちないパーサー原則」に従い、不正なXML（閉じタグ不整合等）のみ null を返し、
 * それ以外は警告を積みながら可能な限り描画を継続する。
 *
 * セキュリティ方針:
 *   - 要素・属性は許可リスト方式（このファイルの ALLOWED_TAGS / ALLOWED_ATTRS が全量）
 *   - `on*`（イベントハンドラ）・`style` 属性は無条件に除外
 *   - `href` / `xlink:href` は内部フラグメント参照（`#id` 形式）のみ許可
 *   - `dangerouslySetInnerHTML` は使わない前提（描画側は SvgElementNode ツリーから
 *     React 要素を再構築する）
 */
import type { RawSvgBlock, SvgElementNode } from './types';

/** 許可された要素タグ（全量。暗黙の追加なし） */
const ALLOWED_TAGS = new Set([
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'defs',
  'linearGradient',
  'radialGradient',
  'stop',
  'title',
  'desc',
]);

/** 許可された属性（全量。暗黙の追加なし。on* / style は無条件除外） */
const ALLOWED_ATTRS = new Set([
  'id',
  'class',
  'd',
  'x',
  'y',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x1',
  'y1',
  'x2',
  'y2',
  'points',
  'transform',
  'fill',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'opacity',
  'font-size',
  'text-anchor',
  'offset',
  'stop-color',
  'stop-opacity',
]);

export const SVG_RAW_LIMITS = {
  maxSourceLength: 20000,
} as const;

const FRAGMENT_HREF_RE = /^#[\w-]+$/;
const VIEW_BOX_RE = /^[\d.\-,\s]+$/;
const TAG_RE = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^<>]*?)?)\s*(\/?)>/g;
const ATTR_RE = /([\w:-]+)\s*=\s*"([^"]*)"|([\w:-]+)\s*=\s*'([^']*)'/g;

interface RawNode {
  tag: string;
  attrs: Record<string, string>;
  children: (RawNode | { text: string })[];
}

function isRawNode(n: RawNode | { text: string }): n is RawNode {
  return 'tag' in n;
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(raw))) {
    const name = m[1] ?? m[3];
    const value = m[2] ?? m[4];
    if (name != null && value != null) attrs[name] = value;
  }
  return attrs;
}

/**
 * タグ・テキストのトークン列から木構造を組み立てる。
 * 閉じタグの不整合（開始/終了タグの不一致・終了タグ不足）は null を返す。
 */
function buildTree(src: string): RawNode | null {
  const root: RawNode = { tag: '#root', attrs: {}, children: [] };
  const stack: RawNode[] = [root];
  let lastIndex = 0;
  TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(src))) {
    const [full, closing, tagName, attrRaw, selfClose] = m;
    const textBefore = src.slice(lastIndex, m.index);
    if (textBefore.trim()) {
      stack[stack.length - 1].children.push({ text: textBefore.trim() });
    }
    lastIndex = m.index + full.length;
    const tag = tagName.toLowerCase();
    if (closing) {
      const top = stack[stack.length - 1];
      if (stack.length <= 1 || top.tag !== tag) return null;
      stack.pop();
      continue;
    }
    const node: RawNode = { tag, attrs: parseAttrs(attrRaw), children: [] };
    stack[stack.length - 1].children.push(node);
    if (!selfClose) stack.push(node);
  }
  const trailing = src.slice(lastIndex);
  if (trailing.trim()) stack[stack.length - 1].children.push({ text: trailing.trim() });
  if (stack.length !== 1) return null; // 閉じタグ不足
  return root;
}

/** 許可リスト外の要素をサブツリーごと除去しつつ、子要素を SvgElementNode 化する。 */
function sanitizeChildren(
  children: (RawNode | { text: string })[],
  removedTags: Set<string>,
): (SvgElementNode | { text: string })[] {
  const out: (SvgElementNode | { text: string })[] = [];
  for (const child of children) {
    if (!isRawNode(child)) {
      out.push(child);
      continue;
    }
    if (!ALLOWED_TAGS.has(child.tag)) {
      removedTags.add(child.tag);
      continue;
    }
    out.push(sanitizeElement(child, removedTags));
  }
  return out;
}

function sanitizeElement(node: RawNode, removedTags: Set<string>): SvgElementNode {
  const attrs: Record<string, string> = {};
  for (const [rawKey, value] of Object.entries(node.attrs)) {
    const key = rawKey.toLowerCase();
    if (key === 'href' || key === 'xlink:href') {
      if (FRAGMENT_HREF_RE.test(value)) attrs[key] = value;
      continue;
    }
    if (ALLOWED_ATTRS.has(key)) attrs[key] = value;
  }
  return { tag: node.tag, attrs, children: sanitizeChildren(node.children, removedTags) };
}

/**
 * ```svg フェンスの中身をパース・サニタイズして RawSvgBlock を返す。
 * ルート要素が <svg> でない・XMLが不正な場合は null（非クラッシュ・lint側でerror扱い）。
 */
export function parseRawSvg(src: string, warnings: string[]): RawSvgBlock | null {
  if (src.length > SVG_RAW_LIMITS.maxSourceLength) {
    warnings.push(
      `svg ブロックが ${SVG_RAW_LIMITS.maxSourceLength.toLocaleString()} 文字を超えています（${src.length}文字）`,
    );
  }

  const stripped = src.replace(/<!--[\s\S]*?-->/g, '');
  const tree = buildTree(stripped);
  if (!tree) {
    warnings.push('svg ブロックのXMLが不正です（開始/終了タグの不整合など）');
    return null;
  }
  const rootCandidate = tree.children.find(isRawNode);
  if (!rootCandidate || rootCandidate.tag !== 'svg') {
    warnings.push('ルート要素が <svg> ではありません');
    return null;
  }

  const removedTags = new Set<string>();
  const root = sanitizeElement(rootCandidate, removedTags);
  if (removedTags.size > 0) {
    const names = [...removedTags].map((t) => `"${t}"`).join(', ');
    warnings.push(`未対応の要素 ${names} を除去しました`);
  }

  const rawViewBox = rootCandidate.attrs.viewBox;
  if (rawViewBox && VIEW_BOX_RE.test(rawViewBox.trim())) {
    root.attrs.viewBox = rawViewBox.trim();
  } else {
    const w = Number(rootCandidate.attrs.width);
    const h = Number(rootCandidate.attrs.height);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      root.attrs.viewBox = `0 0 ${w} ${h}`;
    } else {
      warnings.push(
        'viewBox が指定されておらず、width/height からも補完できません（スケール表示が正しく機能しない可能性があります）',
      );
    }
  }

  return { type: 'raw', root };
}
