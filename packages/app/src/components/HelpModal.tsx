import { useState } from 'react';
import { SLIDE_TEMPLATES } from '../templates/slideTemplates';
import { SHORTCUTS, CONSTRAINT_RULES } from '../help/helpContent';

type HelpTab = 'cheatsheet' | 'shortcuts' | 'rules';

const TABS: { id: HelpTab; label: string }[] = [
  { id: 'cheatsheet', label: '記法チートシート' },
  { id: 'shortcuts', label: 'キーボードショートカット' },
  { id: 'rules', label: '制約ルール' },
];

export function HelpModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<HelpTab>('cheatsheet');
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);

  const copySnippet = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTemplateId(id);
      setTimeout(() => {
        setCopiedTemplateId((cur) => (cur === id ? null : cur));
      }, 1500);
    } catch {
      alert('コピーに失敗しました。テキストを選択して手動でコピーしてください。');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          ❓ ヘルプ
          <div className="help-modal__tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={t.id === tab ? 'active' : ''}
                aria-pressed={t.id === tab}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-body help-modal__body">
          {tab === 'cheatsheet' && (
            <ul className="help-modal__cheatsheet">
              {SLIDE_TEMPLATES.map((t) => {
                // 先頭に区切り線を付けて表示・コピーする（コピー時も同じ内容になるようにする）
                const displayText = `---\n${t.snippet}`;
                return (
                  <li key={t.id}>
                    <div className="help-modal__cheat-label">{t.label}</div>
                    <div className="help-modal__cheat-code">
                      <button
                        type="button"
                        className="help-modal__copy-btn"
                        title="コードをコピー"
                        onClick={() => {
                          void copySnippet(displayText, t.id);
                        }}
                      >
                        {copiedTemplateId === t.id ? '✅' : '📋'}
                      </button>
                      <pre>{displayText}</pre>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {tab === 'shortcuts' && (
            <table className="help-modal__shortcuts">
              <tbody>
                {SHORTCUTS.map((s) => (
                  <tr key={s.keys}>
                    <td>
                      <kbd>{s.keys}</kbd>
                    </td>
                    <td>{s.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'rules' && (
            <ul className="help-modal__rules">
              {CONSTRAINT_RULES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="modal-foot">
          <button onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
