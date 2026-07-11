/**
 * inline.tsx — インライン装飾のReactレンダラ。
 * `==テキスト==` → <span class="hl">（accent色・全typeで使用可）
 * `**テキスト**` → <strong>
 * `` `code` ``  → <code>
 * `[label](url)` → <a target="_blank">
 * dangerouslySetInnerHTML は使わず、必ずReact要素として組み立てる（XSS防止）。
 */
import { Fragment, type ReactNode } from 'react';

const TOKEN_RE = /(==[^=]+==|\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

export function renderInline(text: string | undefined): ReactNode {
  if (!text) return null;
  const parts = text.split(TOKEN_RE);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('==') && part.endsWith('==')) {
      return <span key={i} className="hl">{part.slice(2, -2)}</span>;
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
