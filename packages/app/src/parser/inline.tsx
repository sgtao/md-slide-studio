/**
 * inline.tsx — インライン装飾のReactレンダラ。
 * `==テキスト==` → <span class="hl">（accent色・全typeで使用可）
 * `**テキスト**` → <strong>
 * `` `code` ``  → <code>
 * `[label](url)` → <a target="_blank">
 * `<br>` → <br />（見出し限定。renderInline(text, { allowBr: true }) を呼んだ箇所のみ有効。
 * h1(title) / .slide-title(SlideHeading) / h2(feature-showcase左) の3箇所から使用）
 * dangerouslySetInnerHTML は使わず、必ずReact要素として組み立てる（XSS防止）。
 */
import { Fragment, type ReactNode } from 'react';

const BASE_PATTERN = '==[^=]+==|\\*\\*[^*]+\\*\\*|`[^`]+`|\\[[^\\]]+\\]\\([^)\\s]+\\)';
const TOKEN_RE = new RegExp(`(${BASE_PATTERN})`, 'g');
const TOKEN_RE_BR = new RegExp(`(<br\\s*/?>|${BASE_PATTERN})`, 'g');
const BR_RE = /^<br\s*\/?>$/i;

/** allowBr: true の呼び出し元でのみ <br> を改行として解釈する（見出し専用。既定 false） */
export interface RenderInlineOptions {
  allowBr?: boolean;
}

export function renderInline(text: string | undefined, opts: RenderInlineOptions = {}): ReactNode {
  if (!text) return null;
  const parts = text.split(opts.allowBr ? TOKEN_RE_BR : TOKEN_RE);
  return parts.map((part, i) => {
    if (!part) return null;
    if (opts.allowBr && BR_RE.test(part)) {
      return <br key={i} />;
    }
    if (part.startsWith('==') && part.endsWith('==')) {
      return (
        <span key={i} className="hl">
          {part.slice(2, -2)}
        </span>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      return (
        <a key={i} href={safeUrl(link[2])} target="_blank" rel="noreferrer">
          {link[1]}
        </a>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

/** javascript: 等の危険スキームを無害化 */
export function safeUrl(url: string): string {
  return /^(https?:)?\/\//i.test(url) ? url : '#';
}
