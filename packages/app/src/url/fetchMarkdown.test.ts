import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMarkdownFromUrl } from './fetchMarkdown';
import { MAX_UPLOAD_FILE_SIZE } from '../hooks/useFileUpload';

// v0.5.1: fetchMarkdownFromUrl のレスポンス検証分岐（DOM非依存部分、global.fetchをモック）。
// UI（UrlLoadModal）経由の振る舞いはE2E（e2e/url-load.spec.ts）で検証する。

const SAMPLE_URL = 'https://raw.githubusercontent.com/user/repo/main/sample.md';

function mockResponse(opts: {
  ok: boolean;
  status?: number;
  contentType?: string;
  contentLength?: string;
  body?: string;
}): Response {
  const headers = new Map<string, string>();
  if (opts.contentType !== undefined) headers.set('content-type', opts.contentType);
  if (opts.contentLength !== undefined) headers.set('content-length', opts.contentLength);
  return {
    ok: opts.ok,
    status: opts.status ?? (opts.ok ? 200 : 500),
    headers: { get: (key: string) => headers.get(key) ?? null },
    text: () => Promise.resolve(opts.body ?? ''),
  } as unknown as Response;
}

describe('fetchMarkdownFromUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('200 + text/plain で取得成功する', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          mockResponse({ ok: true, contentType: 'text/plain; charset=utf-8', body: '# ok' }),
        ),
    );
    const result = await fetchMarkdownFromUrl(SAMPLE_URL);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.content).toBe('# ok');
      expect(result.doc.name).toBe('sample.md');
      expect(result.doc.sourceUrl).toBe(SAMPLE_URL);
    }
  });

  it('404 は not-found エラー', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({ ok: false, status: 404 })));
    const result = await fetchMarkdownFromUrl(SAMPLE_URL);
    expect(result).toEqual({ ok: false, error: 'not-found' });
  });

  it('403 は forbidden エラー', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({ ok: false, status: 403 })));
    const result = await fetchMarkdownFromUrl(SAMPLE_URL);
    expect(result).toEqual({ ok: false, error: 'forbidden' });
  });

  it('500 は server-error エラー', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({ ok: false, status: 500 })));
    const result = await fetchMarkdownFromUrl(SAMPLE_URL);
    expect(result).toEqual({ ok: false, error: 'server-error' });
  });

  it('Content-Type が text/html の場合は content-type エラー', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mockResponse({ ok: true, contentType: 'text/html' })),
    );
    const result = await fetchMarkdownFromUrl(SAMPLE_URL);
    expect(result).toEqual({ ok: false, error: 'content-type' });
  });

  it('Content-Length が上限超過なら本文を読まずに size エラー', async () => {
    const textSpy = vi.fn();
    const res = mockResponse({
      ok: true,
      contentType: 'text/plain',
      contentLength: String(MAX_UPLOAD_FILE_SIZE + 1),
    });
    (res as unknown as { text: typeof textSpy }).text = textSpy;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res));
    const result = await fetchMarkdownFromUrl(SAMPLE_URL);
    expect(result).toEqual({ ok: false, error: 'size' });
    expect(textSpy).not.toHaveBeenCalled();
  });

  it('Content-Length が無くても本文サイズで size エラーを判定する', async () => {
    const huge = 'a'.repeat(MAX_UPLOAD_FILE_SIZE + 1);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mockResponse({ ok: true, contentType: 'text/plain', body: huge })),
    );
    const result = await fetchMarkdownFromUrl(SAMPLE_URL);
    expect(result).toEqual({ ok: false, error: 'size' });
  });

  it('fetch が AbortError を投げた場合は timeout エラー', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')));
    const result = await fetchMarkdownFromUrl(SAMPLE_URL);
    expect(result).toEqual({ ok: false, error: 'timeout' });
  });

  it('fetch が TypeError を投げた場合は network エラー', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const result = await fetchMarkdownFromUrl(SAMPLE_URL);
    expect(result).toEqual({ ok: false, error: 'network' });
  });
});
