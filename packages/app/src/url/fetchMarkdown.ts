/**
 * fetchMarkdown.ts — URL指定によるMD取得（v0.5.1）のfetch＋レスポンス検証。
 *
 * サイズ上限は v0.5.0 のアップロード機能と同じ定数を共有する（二重管理を避けるため
 * useFileUpload.ts から import する — 02_migration-plan 0816-02 リスクテーブル）。
 * タイムアウトはAbortControllerで10秒。UI側の中断ボタンから渡されるsignalも
 * abortイベントで同じcontrollerに合流させ、同一経路で中断できるようにする。
 */
import { MAX_UPLOAD_FILE_SIZE } from '../hooks/useFileUpload';

const FETCH_TIMEOUT_MS = 10_000;
const ALLOWED_CONTENT_TYPES = ['text/plain', 'text/markdown', 'application/octet-stream'];

/** 取得済みドキュメントの1件（02_migration-plan 0816-02 §3: 将来の複数ファイル管理への布石）。 */
export interface FetchedDoc {
  name: string;
  sourceUrl?: string;
  content: string;
  fetchedAt: string;
}

export type FetchErrorKind =
  'network' | 'not-found' | 'forbidden' | 'server-error' | 'content-type' | 'size' | 'timeout';

export const FETCH_ERROR_MESSAGES: Record<FetchErrorKind, string> = {
  network:
    '取得できませんでした。URLが直接ダウンロード可能か確認してください（GitHubの場合は raw.githubusercontent.com 形式）。',
  'not-found': 'ファイルが見つかりません（404）。',
  forbidden: 'アクセス権がありません（403・プライベートリポジトリの可能性）。',
  'server-error': 'サーバー側でエラーが発生しました。',
  'content-type':
    'MDファイルではなくHTMLページが返りました（GitHubの場合は raw.githubusercontent.com 形式か確認してください）。',
  size: 'ファイルサイズが上限（2MB）を超えています。',
  timeout: '取得がタイムアウトしました。',
};

export type FetchMarkdownResult =
  { ok: true; doc: FetchedDoc } | { ok: false; error: FetchErrorKind };

function basenameFromUrl(url: string): string {
  const { pathname } = new URL(url);
  return pathname.split('/').filter(Boolean).pop() || 'downloaded.md';
}

/** URLからMDを取得し、レスポンスを検証する（02_migration-plan 0816-02 §4-2）。 */
export async function fetchMarkdownFromUrl(
  url: string,
  externalSignal?: AbortSignal,
): Promise<FetchMarkdownResult> {
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort);
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { ok: false, error: 'timeout' };
    }
    return { ok: false, error: 'network' };
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }

  if (!res.ok) {
    if (res.status === 404) return { ok: false, error: 'not-found' };
    if (res.status === 403) return { ok: false, error: 'forbidden' };
    return { ok: false, error: 'server-error' };
  }

  const contentType = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (contentType && !ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return { ok: false, error: 'content-type' };
  }

  const contentLength = res.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_UPLOAD_FILE_SIZE) {
    return { ok: false, error: 'size' };
  }

  const content = await res.text();
  if (content.length > MAX_UPLOAD_FILE_SIZE) {
    return { ok: false, error: 'size' };
  }

  return {
    ok: true,
    doc: {
      name: basenameFromUrl(url),
      sourceUrl: url,
      content,
      fetchedAt: new Date().toISOString(),
    },
  };
}
