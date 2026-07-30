/**
 * AiPromptPanel.tsx — 左サイドメニュー「AIプロンプト」から開くメインパネル版（v0.4.7）。
 *
 * ヘッダーの🤖ポップアップとロジックを usePromptComposer() で共有しつつ、
 * テーマ入力を複数行の textarea にする（大量のテーマ文を貼り付けても
 * 内容を視認できるようにするため。5行表示・それ以上はスクロール）。
 *
 * レイアウトはポップアップの .modal-head / .modal-body / .modal-foot を
 * そのまま流用する（内側の余白・フォント指定のみで位置指定を持たないため、
 * オーバーレイ以外の文脈でも安全に再利用できる）。テーマ入力部分だけ
 * 専用の .ai-prompt-pane__theme を新設する（.modal-head input は1行前提のため）。
 *
 * .editor-pane / .preview-pane と排他で .workspace に直接置かれる
 * （App.tsx 側で showAiPromptPanel の間だけ表示を切り替える）。
 */
import { PromptExplanation, usePromptComposer } from '../ai/promptComposer';

interface Props {
  onClose: () => void;
}

export function AiPromptPanel({ onClose }: Props) {
  const { themeText, setThemeText, prompt, copied, copy } = usePromptComposer();
  return (
    <div className="ai-prompt-pane">
      <div className="modal-head">🤖 原稿作成プロンプト</div>
      <div className="ai-prompt-pane__theme">
        <textarea
          rows={5}
          placeholder="スライドのテーマを入力（例: Claude Codeの社内導入提案）"
          value={themeText}
          onChange={(e) => setThemeText(e.target.value)}
        />
      </div>
      <div className="modal-body">
        <PromptExplanation />
        <pre>{prompt}</pre>
      </div>
      <div className="modal-foot">
        <button onClick={onClose}>閉じる</button>
        <button
          className="primary"
          onClick={() => {
            void copy();
          }}
        >
          {copied ? '✓ コピーしました' : 'プロンプトをコピー'}
        </button>
      </div>
    </div>
  );
}
