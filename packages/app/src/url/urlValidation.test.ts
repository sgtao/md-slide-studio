import { describe, expect, it } from 'vitest';
import { validateUrlFormat } from './urlValidation';

// v0.5.1: URL指定によるMD取得の入力URL形式検証（DOM非依存部分）。
// fetch・LINT・確認ダイアログを含むモーダル全体の振る舞いはE2E（e2e/url-load.spec.ts）で検証する。

describe('validateUrlFormat', () => {
  it('不正なURL文字列は invalid-url エラー', () => {
    expect(validateUrlFormat('not a url')).toBe('invalid-url');
  });

  it('http: プロトコルは not-https エラー', () => {
    expect(validateUrlFormat('http://example.com/file.md')).toBe('not-https');
  });

  it('.md 以外の拡張子は not-markdown エラー', () => {
    expect(validateUrlFormat('https://example.com/file.txt')).toBe('not-markdown');
  });

  it('拡張子が無いURLは not-markdown エラー', () => {
    expect(validateUrlFormat('https://example.com/file')).toBe('not-markdown');
  });

  it('.md で終わる https URL は許可する', () => {
    const url = 'https://raw.githubusercontent.com/user/repo/main/file.md';
    expect(validateUrlFormat(url)).toBeNull();
  });

  it('.markdown で終わる https URL も許可する', () => {
    expect(validateUrlFormat('https://example.com/file.markdown')).toBeNull();
  });

  it('大文字拡張子（.MD）も許可する', () => {
    expect(validateUrlFormat('https://example.com/FILE.MD')).toBeNull();
  });

  it('クエリ・ハッシュが付いていても拡張子（.md）で判定する', () => {
    expect(validateUrlFormat('https://example.com/file.md?raw=1#L10')).toBeNull();
  });

  it('拡張子が.mdでもクエリ側は無視して判定する（末尾が.md以外ならNG）', () => {
    expect(validateUrlFormat('https://example.com/file.md.txt')).toBe('not-markdown');
  });
});
