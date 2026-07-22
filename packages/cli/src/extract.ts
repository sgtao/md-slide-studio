/**
 * extract.ts — スタンドアロンHTMLに同梱された原稿MD（DECK_MD）を取り出す。
 *
 * mdss-convert（standalone.ts）と Web版のHTMLエクスポート（exporters.ts）は、
 * どちらも埋め込みJSの先頭付近に `const DECK_MD = <JSON文字列>;` を書き出している。
 * JSON文字列リテラルは改行を含まない（\\n にエスケープ済み）ため、1行の正規表現で拾える。
 *
 * HTML→MDを推論なしで完全復元するための唯一の入口。パース失敗時は null を返し、
 * 呼び出し側（cli.ts）が終了コード4で「対象外のHTML」と報告する。
 */
const DECK_MD_RE = /const DECK_MD = ("(?:\\.|[^"\\])*");/;

export function extractDeckMd(html: string): string | null {
  const m = DECK_MD_RE.exec(html);
  if (!m) return null;
  try {
    const parsed: unknown = JSON.parse(m[1]);
    return typeof parsed === 'string' ? parsed : null;
  } catch {
    return null;
  }
}
