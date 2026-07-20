import type { LintResult } from '@mdss/core';
import { sortLintResults } from '@mdss/core';

const ICON: Record<LintResult['level'], string> = { error: '🔴', warn: '🟡', info: '🔵' };

export function LintPanel({
  results,
  onJump,
}: {
  results: LintResult[];
  onJump: (slideIndex: number) => void;
}) {
  if (results.length === 0) {
    return <div className="lint-panel lint-panel--empty">警告はありません ✅</div>;
  }
  const sorted = sortLintResults(results);
  return (
    <ul className="lint-panel">
      {sorted.map((r, i) => (
        <li key={i} className={`lint-item lint-item--${r.level}`}>
          <span className="lint-icon">{ICON[r.level]}</span>
          <span className="lint-message">{r.message}</span>
          {r.slideIndex !== undefined && (
            <button
              type="button"
              className="lint-jump"
              onClick={() => onJump(r.slideIndex as number)}
            >
              #{r.slideIndex + 1}へ
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
