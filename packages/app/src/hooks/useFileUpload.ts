/**
 * useFileUpload.ts — MDファイルアップロード（v0.5.0）。
 *
 * ボタン経由（<input type=file>）・ドラッグ&ドロップ経由、どちらも
 * handleFile() に集約する（検証→FileReader→確認待ち、のロジックを二重管理しないため）。
 *
 * 検証（拡張子・サイズ）はFileReader実行前に同期で行う
 * （巨大ファイルを読み込んでからNG判定してUIを一瞬フリーズさせないため）。
 *
 * 確認ダイアログは常に表示する（dirty判定は実装しない。usePersistentState型の
 * md自動保存には「未保存」概念が無いため、都度確認が安全側 — 02_migration-plan
 * 0815-01 Q1／確認ダイアログの発火条件）。
 */
import { useCallback, useState, type RefObject } from 'react';

export type UploadErrorKind = 'extension' | 'size' | 'read';

export const ALLOWED_UPLOAD_EXTENSIONS = ['.md', '.markdown'] as const;
export const MAX_UPLOAD_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export const UPLOAD_ERROR_MESSAGES: Record<UploadErrorKind, string> = {
  extension: '.md または .markdown ファイルのみアップロードできます。',
  size: 'ファイルサイズが上限（2MB）を超えています。',
  read: 'ファイルの読み込みに失敗しました。もう一度お試しください。',
};

/** 拡張子・サイズを検証する（DOM非依存の純粋関数。FileReader実行前に呼ぶ）。 */
export function validateUploadFile(file: Pick<File, 'name' | 'size'>): UploadErrorKind | null {
  const lower = file.name.toLowerCase();
  const hasAllowedExt = ALLOWED_UPLOAD_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!hasAllowedExt) return 'extension';
  if (file.size > MAX_UPLOAD_FILE_SIZE) return 'size';
  return null;
}

export interface UseFileUploadResult {
  /** 確認ダイアログ表示中のファイル名（nullなら非表示） */
  pendingFileName: string | null;
  /** エラーダイアログ表示中の種別（nullなら非表示） */
  error: UploadErrorKind | null;
  /** input[type=file]のonChange・ドロップのonDrop共通のエントリポイント */
  handleFile: (file: File) => void;
  /** 確認ダイアログのOK: 保持していたテキストを反映して閉じる */
  confirmReplace: () => void;
  /** 確認ダイアログのキャンセル／エラーダイアログの「閉じる」 */
  cancel: () => void;
}

export function useFileUpload(
  onReplace: (text: string) => void,
  textareaRef?: RefObject<HTMLTextAreaElement | null>,
): UseFileUploadResult {
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [error, setError] = useState<UploadErrorKind | null>(null);

  const handleFile = useCallback((file: File) => {
    const err = validateUploadFile(file);
    if (err) {
      // 検証NG時は確認待ち状態をクリアし、エラーモーダルと確認モーダルが
      // 同時に表示される状態を作らない。
      setPendingText(null);
      setPendingFileName(null);
      setError(err);
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      if (typeof text !== 'string') {
        setError('read');
        return;
      }
      setPendingText(text);
      setPendingFileName(file.name);
    };
    reader.onerror = () => setError('read');
    reader.readAsText(file);
  }, []);

  const confirmReplace = useCallback(() => {
    if (pendingText === null) return;
    onReplace(pendingText);
    setPendingText(null);
    setPendingFileName(null);
    // 反映直後はscrollTopが不定になりうるため、明示的に先頭へ戻す
    // （v0.4.10のtextarea scrollTopリセット既知パターンへの対策）。
    requestAnimationFrame(() => {
      if (textareaRef?.current) textareaRef.current.scrollTop = 0;
    });
  }, [pendingText, onReplace, textareaRef]);

  const cancel = useCallback(() => {
    setPendingText(null);
    setPendingFileName(null);
    setError(null);
  }, []);

  return { pendingFileName, error, handleFile, confirmReplace, cancel };
}
