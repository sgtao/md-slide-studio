/**
 * urlValidation.ts — URL指定によるMD取得（v0.5.1）の入力URL形式検証。
 *
 * fetch前に同期で検証する（存在しないURLへの無駄なリクエストや、http:指定による
 * mixed content即時ブロックをUI側で先に弾くため）。
 */
export type UrlErrorKind = 'invalid-url' | 'not-https' | 'not-markdown';

export const URL_LOAD_ERROR_MESSAGES: Record<UrlErrorKind, string> = {
  'invalid-url': 'URLの形式が正しくありません。',
  'not-https': 'https から始まるURLのみ指定できます。',
  'not-markdown':
    '.md または .markdown で終わるURLを指定してください（GitHubの場合は raw.githubusercontent.com 形式か確認してください）。',
};

const ALLOWED_URL_EXTENSIONS = ['.md', '.markdown'];

/** URL形式を検証する（DOM非依存の純粋関数。fetch実行前に呼ぶ）。 */
export function validateUrlFormat(input: string): UrlErrorKind | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return 'invalid-url';
  }
  if (url.protocol !== 'https:') return 'not-https';
  const pathname = url.pathname.toLowerCase();
  const hasAllowedExt = ALLOWED_URL_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  if (!hasAllowedExt) return 'not-markdown';
  return null;
}

const GITHUB_BLOB_PATH = /^\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/;

/**
 * github.com のblob URL（ブラウザで開くページのリンク）を、直接取得可能な
 * raw.githubusercontent.com のURLへ書き換える（fetch実行前に呼ぶ）。
 * blobページはtext/html・CORSヘッダー無しのため直接fetchできないため
 * （02_migration-plan 0816-02 Q1）。マッチしないURL（既にraw形式・他ホスト・
 * 不正URL等）はそのまま返す。
 */
export function normalizeGitHubBlobUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return input;
  }
  if (url.hostname !== 'github.com') return input;
  const match = GITHUB_BLOB_PATH.exec(url.pathname);
  if (!match) return input;
  const [, owner, repo, ref, path] = match;
  const raw = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
  return `${raw}${url.search}${url.hash}`;
}
