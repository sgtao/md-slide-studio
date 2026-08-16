import { describe, expect, it } from 'vitest';
import { normalizeGitHubBlobUrl, validateUrlFormat } from './urlValidation';

// v0.5.1: URL指定によるMD取得の入力URL形式検証（DOM非依存部分）。
// fetch・LINT・確認ダイアログを含むモーダル全体の振る舞いはE2E（e2e/url-load.spec.ts）で検証する。

describe('validateUrlFormat', () => {
  it('不正なURL文字列は invalid-url エラー', () => {
    expect(validateUrlFormat('not a url')).toBe('invalid-url');
  });

  it('http: プロトコルは not-https エラー', () => {
    expect(validateUrlFormat('http://example.com/file.md')).toBe('not-https');
  });

  it('.md で終わる https URL は許可する', () => {
    const url = 'https://raw.githubusercontent.com/user/repo/main/file.md';
    expect(validateUrlFormat(url)).toBeNull();
  });

  it('.markdown で終わる https URL も許可する', () => {
    expect(validateUrlFormat('https://example.com/file.markdown')).toBeNull();
  });

  it('拡張子が無いURLも許可する（Google Driveの直接ダウンロードURL等を想定）', () => {
    expect(validateUrlFormat('https://example.com/file')).toBeNull();
  });

  it('拡張子が.md/.markdown以外のURLも許可する（テキストとして取得する方針のため）', () => {
    expect(validateUrlFormat('https://example.com/file.txt')).toBeNull();
  });

  it('クエリ・ハッシュが付いていても許可する', () => {
    expect(validateUrlFormat('https://example.com/file?export=download#L10')).toBeNull();
  });
});

describe('normalizeGitHubBlobUrl', () => {
  it('github.comのblob URLをraw.githubusercontent.comへ変換する', () => {
    const url = 'https://github.com/user/repo/blob/main/file.md';
    const expected = 'https://raw.githubusercontent.com/user/repo/main/file.md';
    expect(normalizeGitHubBlobUrl(url)).toBe(expected);
  });

  it('サブディレクトリを含むpathでも変換できる', () => {
    const url = 'https://github.com/user/repo/blob/main/docs/refs/file.md';
    const expected = 'https://raw.githubusercontent.com/user/repo/main/docs/refs/file.md';
    expect(normalizeGitHubBlobUrl(url)).toBe(expected);
  });

  it('クエリ・ハッシュを保持したまま変換する', () => {
    const url = 'https://github.com/user/repo/blob/main/file.md?plain=1#L10';
    const expected = 'https://raw.githubusercontent.com/user/repo/main/file.md?plain=1#L10';
    expect(normalizeGitHubBlobUrl(url)).toBe(expected);
  });

  it('既にraw.githubusercontent.com形式のURLは無変換', () => {
    const url = 'https://raw.githubusercontent.com/user/repo/main/file.md';
    expect(normalizeGitHubBlobUrl(url)).toBe(url);
  });

  it('github.com以外のホストは無変換', () => {
    const url = 'https://example.com/user/repo/blob/main/file.md';
    expect(normalizeGitHubBlobUrl(url)).toBe(url);
  });

  it('blobを含まないgithub.com URL（例: tree）は無変換', () => {
    const url = 'https://github.com/user/repo/tree/main/docs';
    expect(normalizeGitHubBlobUrl(url)).toBe(url);
  });

  it('不正なURL文字列はそのまま返す', () => {
    expect(normalizeGitHubBlobUrl('not a url')).toBe('not a url');
  });
});
