/**
 * ConfirmModal.tsx — 確認／エラー共用の汎用モーダル（v0.5.0）。
 *
 * 既存 .modal-backdrop/.modal/.modal-head/.modal-body/.modal-foot（app.css、
 * AiPromptPanel・HelpModalが使うのと同じCSS）をそのまま流用する。
 * onConfirm未指定ならエラー表示（「閉じる」ボタンのみ）になる
 * （02_migration-plan 0815-01: alert()を使わずモーダルでエラー表示する方針）。
 */
interface Props {
  /** E2Eでのモーダル種別判定用（表示スタイルには影響しない） */
  kind: 'confirm' | 'error';
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  kind,
  title,
  message,
  confirmLabel,
  cancelLabel = '閉じる',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal confirm-modal"
        data-modal-kind={kind}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">{title}</div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-foot">
          <button onClick={onCancel}>{cancelLabel}</button>
          {onConfirm && confirmLabel && (
            <button className="primary" onClick={onConfirm}>
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
