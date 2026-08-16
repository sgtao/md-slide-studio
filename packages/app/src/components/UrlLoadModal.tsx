/**
 * UrlLoadModal.tsx — URL指定によるMD取得（v0.5.1）。
 *
 * 入力→形式検証（同期）→fetch（ローディング・中断）→LINT→確認、の4段階を
 * 1コンポーネント内のstageで管理する。LINTでerrorが1件でもあれば反映をブロックし、
 * 読み取り専用の一覧を表示する（LintPanelはonJump必須propのため、反映前のMDには
 * ジャンプ先スライドが無くこの用途では使えない — 02_migration-plan 0816-02 §4-3）。
 * 反映確認はv0.5.0のConfirmModalを再利用する。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { parseSlideMarkdown, lintDeck, sortLintResults, type LintResult } from '@mdss/core';
import { ConfirmModal } from './ConfirmModal';
import {
  normalizeGitHubBlobUrl,
  validateUrlFormat,
  URL_LOAD_ERROR_MESSAGES,
} from '../url/urlValidation';
import { fetchMarkdownFromUrl, FETCH_ERROR_MESSAGES, type FetchedDoc } from '../url/fetchMarkdown';

type Stage = 'input' | 'loading' | 'lint-blocked' | 'confirm';

const LINT_ICON: Record<LintResult['level'], string> = { error: '🔴', warn: '🟡', info: '🔵' };

interface Props {
  onReplace: (text: string) => void;
  onClose: () => void;
}

export function UrlLoadModal({ onReplace, onClose }: Props) {
  const [url, setUrl] = useState('');
  const [stage, setStage] = useState<Stage>('input');
  const [fetchErrorMessage, setFetchErrorMessage] = useState<string | null>(null);
  const [fetchedDoc, setFetchedDoc] = useState<FetchedDoc | null>(null);
  const [lintResults, setLintResults] = useState<LintResult[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const userAbortedRef = useRef(false);

  useEffect(() => {
    // Reactの開発モード（StrictMode）はmount→cleanup→mountを1回余分に行うため、
    // setup側でも明示的にtrueへ戻す（cleanupだけだと二重実行後にfalseのまま固定される）。
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const formatError = url.trim() ? validateUrlFormat(url.trim()) : null;

  const handleFetch = useCallback(async () => {
    // github.comのblob URLはraw.githubusercontent.comへ変換してからfetchする
    // （blobページはtext/html・CORSヘッダー無しのため直接fetchできないため）。
    // 変換が起きた場合は入力欄の表示も書き換え、実際に取得するURLを利用者に示す。
    const normalized = normalizeGitHubBlobUrl(url.trim());
    if (normalized !== url) setUrl(normalized);
    if (validateUrlFormat(normalized)) return;
    setStage('loading');
    setFetchErrorMessage(null);
    const controller = new AbortController();
    abortRef.current = controller;
    const result = await fetchMarkdownFromUrl(normalized, controller.signal);
    abortRef.current = null;
    if (!mountedRef.current) return;
    if (!result.ok) {
      if (userAbortedRef.current) {
        userAbortedRef.current = false;
        return;
      }
      setFetchErrorMessage(FETCH_ERROR_MESSAGES[result.error]);
      setStage('input');
      return;
    }
    const deck = parseSlideMarkdown(result.doc.content);
    const results = lintDeck(deck);
    setFetchedDoc(result.doc);
    setLintResults(results);
    setStage(results.some((r) => r.level === 'error') ? 'lint-blocked' : 'confirm');
  }, [url]);

  const handleAbort = useCallback(() => {
    userAbortedRef.current = true;
    abortRef.current?.abort();
    setStage('input');
  }, []);

  const handleBackToInput = useCallback(() => {
    setFetchedDoc(null);
    setLintResults([]);
    setStage('input');
  }, []);

  const handleConfirm = useCallback(() => {
    if (!fetchedDoc) return;
    onReplace(fetchedDoc.content);
    onClose();
  }, [fetchedDoc, onReplace, onClose]);

  if (stage === 'confirm' && fetchedDoc) {
    const lineCount = fetchedDoc.content.split('\n').length;
    const charCount = fetchedDoc.content.length;
    const message =
      `取得したMD（${lineCount}行 / ${charCount}文字・警告${lintResults.length}件）` +
      'で現在の内容を置き換えます。この操作は元に戻せません。';
    return (
      <ConfirmModal
        kind="confirm"
        title="🔗 取得したMDで置き換えますか？"
        message={message}
        confirmLabel="置き換える"
        cancelLabel="キャンセル"
        onConfirm={handleConfirm}
        onCancel={handleBackToInput}
      />
    );
  }

  if (stage === 'lint-blocked') {
    const sorted = sortLintResults(lintResults);
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal url-load-modal"
          data-modal-kind="url-lint-blocked"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-head">⚠ LINTエラー（反映できません）</div>
          <div className="modal-body">
            <p>MDを修正して再取得してください。</p>
            <ul className="lint-panel">
              {sorted.map((r, i) => (
                <li key={i} className={`lint-item lint-item--${r.level}`}>
                  <span className="lint-icon">{LINT_ICON[r.level]}</span>
                  <span className="lint-message">{r.message}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="modal-foot">
            <button onClick={onClose}>閉じる</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal url-load-modal"
        data-modal-kind="url-load-input"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          🔗 URLで取得
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (fetchErrorMessage) setFetchErrorMessage(null);
            }}
            placeholder="https://raw.githubusercontent.com/user/repo/main/path/to/file.md"
            disabled={stage === 'loading'}
            aria-label="MDファイルのURL"
          />
        </div>
        <div className="modal-body">
          {stage === 'loading' && <p className="url-load-modal__loading">取得中…</p>}
          {stage !== 'loading' && formatError && (
            <p className="url-load-modal__error">{URL_LOAD_ERROR_MESSAGES[formatError]}</p>
          )}
          {stage !== 'loading' && !formatError && fetchErrorMessage && (
            <p className="url-load-modal__error">{fetchErrorMessage}</p>
          )}
          {stage !== 'loading' && !formatError && !fetchErrorMessage && (
            <p className="url-load-modal__hint">
              GitHubの場合、raw.githubusercontent.com 形式に加え、通常のファイルページURL
              （blob/...）も自動変換して取得できます。拡張子が.md/.markdownでないURL （Google
              Driveの直接ダウンロードURL等）もテキストとして取得できます。
            </p>
          )}
        </div>
        <div className="modal-foot">
          {stage === 'loading' ? (
            <button onClick={handleAbort}>中断</button>
          ) : (
            <>
              <button onClick={onClose}>キャンセル</button>
              <button
                className="primary"
                disabled={!url.trim() || !!formatError}
                onClick={() => void handleFetch()}
              >
                取得
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
