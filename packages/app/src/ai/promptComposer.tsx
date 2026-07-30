/**
 * promptComposer.tsx — 原稿作成プロンプトの共通ロジック・共通表示部品。
 *
 * ヘッダーの🤖ポップアップ（App.tsx内 PromptModal）と、左サイドメニューから開く
 * AiPromptPanel（メインパネル版）の両方から使う。差はテーマ入力欄の見た目
 * （<input> 1行 か <textarea> 複数行か）と外枠（backdropで包むか否か）だけで、
 * プロンプト生成・クリップボードコピー・説明文は完全に同一にする。
 */
import { useState } from 'react';
import { buildDraftAssistPrompt } from './draftAssistPrompt';

export interface PromptComposer {
  themeText: string;
  setThemeText: (v: string) => void;
  prompt: string;
  copied: boolean;
  copy: () => Promise<void>;
}

export function usePromptComposer(): PromptComposer {
  const [themeText, setThemeText] = useState('');
  const [copied, setCopied] = useState(false);
  const prompt = buildDraftAssistPrompt(themeText || undefined);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      alert('コピーに失敗しました。テキストを選択して手動でコピーしてください。');
    }
  };
  return { themeText, setThemeText, prompt, copied, copy };
}

/** ポップアップ／パネル共通の説明文（.modal-body の先頭に置く）。 */
export function PromptExplanation() {
  return (
    <p
      style={{
        fontSize: '0.78rem',
        color: 'var(--text-secondary)',
        marginBottom: 10,
        lineHeight: 1.7,
      }}
    >
      このプロンプトを Claude / ChatGPT 等のLLMに送ると、本アプリの仕様に準拠した
      スライドMDが返ってきます。返ってきたMDを左のエディタに貼り付けてください。
      <br />
      なお、アプリ自体にはスライド枚数の上限はありません。8〜16枚は
      AIへ依頼する際の読みやすさの目安です。
    </p>
  );
}
