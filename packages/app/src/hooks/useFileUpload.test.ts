import { describe, expect, it } from 'vitest';
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  MAX_UPLOAD_FILE_SIZE,
  validateUploadFile,
} from './useFileUpload';

// v0.5.0: MDファイルアップロードの検証ロジック単体（DOM非依存部分）。
// FileReader・確認ダイアログ配線を含むフック全体の振る舞いはE2E（e2e/file-upload.spec.ts）で検証する。

describe('validateUploadFile', () => {
  it('許可拡張子（.md / .markdown）は通す', () => {
    for (const ext of ALLOWED_UPLOAD_EXTENSIONS) {
      const file = new File(['# hi'], `sample${ext}`);
      expect(validateUploadFile(file)).toBeNull();
    }
  });

  it('大文字拡張子（.MD）も許可する', () => {
    const file = new File(['# hi'], 'sample.MD');
    expect(validateUploadFile(file)).toBeNull();
  });

  it('許可拡張子以外は extension エラー', () => {
    const file = new File(['# hi'], 'sample.txt');
    expect(validateUploadFile(file)).toBe('extension');
  });

  it('拡張子が無いファイルは extension エラー', () => {
    const file = new File(['# hi'], 'sample');
    expect(validateUploadFile(file)).toBe('extension');
  });

  it('上限ちょうど（2MB）は通す', () => {
    const file = new File([new Uint8Array(MAX_UPLOAD_FILE_SIZE)], 'sample.md');
    expect(file.size).toBe(MAX_UPLOAD_FILE_SIZE);
    expect(validateUploadFile(file)).toBeNull();
  });

  it('上限超過（2MB + 1byte）は size エラー', () => {
    const file = new File([new Uint8Array(MAX_UPLOAD_FILE_SIZE + 1)], 'sample.md');
    expect(validateUploadFile(file)).toBe('size');
  });

  it('拡張子NGとサイズ超過が両方該当する場合は extension を優先する', () => {
    const file = new File([new Uint8Array(MAX_UPLOAD_FILE_SIZE + 1)], 'sample.txt');
    expect(validateUploadFile(file)).toBe('extension');
  });
});
