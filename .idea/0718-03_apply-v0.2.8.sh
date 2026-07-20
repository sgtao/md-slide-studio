#!/usr/bin/env bash
# apply-v0.2.8.sh — ヘルプチートシート機能（v0.2.8: ③-4）
#
# 内容:
#   1. src/help/helpContent.ts を新規作成
#      （SHORTCUTSは実際の useKeyboardNav の割当と一致させている／
#       CONSTRAINT_RULESの枚数目安はv0.2.6の「8〜16枚」に統一）
#   2. src/components/HelpModal.tsx を新規作成
#      （既存 PromptModal と同じ .modal-backdrop/.modal/.modal-head/.modal-body/.modal-foot
#       構造を踏襲。記法チートシートタブは v0.2.7 の SLIDE_TEMPLATES をそのまま再利用）
#   3. src/App.tsx を変更
#      - ❓ ヘルプボタンをヘッダーに追加
#      - helpOpen（モーダル開閉）・helpSeen（'seen'|'unseen', usePersistentState）を追加
#      - 初回訪問時のみ画面右下にトースト表示（6秒後に自動フェードアウト＝seen化）
#   4. src/theme/app.css に .help-modal / .help-toast 系セレクタを追記
#   5. e2e/help.spec.ts を新規作成（既存e2eファイルは変更しない）
#
# 前提: v0.2.7（apply-v0.2.7.sh・fix・fix2）適用済みであること。
# 実行方法: リポジトリルートで bash /path/to/apply-v0.2.8.sh
# 冪等: 複数回実行しても2回目以降は [SKIP] になる。
#
# 注意: CHANGELOGへの追記は本スクリプトには含めない
#（改修タスクの区切りごとに別途文面を確認してから追記する運用のため）。

set -euo pipefail

HELP_CONTENT_FILE="src/help/helpContent.ts"
HELP_MODAL_FILE="src/components/HelpModal.tsx"
APP_FILE="src/App.tsx"
CSS_FILE="src/theme/app.css"
E2E_FILE="e2e/help.spec.ts"

for f in "$APP_FILE" "$CSS_FILE"; do
  if [ ! -f "$f" ]; then
    echo "[ERROR] $f が見つかりません。リポジトリルート（package.jsonのある場所）で実行しているか確認してください。"
    exit 1
  fi
done

mkdir -p "$(dirname "$HELP_CONTENT_FILE")" "$(dirname "$HELP_MODAL_FILE")" "$(dirname "$E2E_FILE")"

# ------------------------------------------------------------------
# 1. helpContent.ts を新規作成
# ------------------------------------------------------------------
if [ -f "$HELP_CONTENT_FILE" ]; then
  echo "[SKIP] $HELP_CONTENT_FILE は既に存在します"
else
  cat > "$HELP_CONTENT_FILE" << 'TSEOF'
/**
 * helpContent.ts — HelpModalに表示するショートカット・制約ルールの定義。
 * 記法チートシートタブは templates/slideTemplates.ts の SLIDE_TEMPLATES を
 * そのまま再利用するため、ここでは定義しない（二重管理を避ける）。
 *
 * SHORTCUTSは実際の hooks/hooks.ts の useKeyboardNav の割当と一致させている。
 * CONSTRAINT_RULESの枚数目安は v0.2.6 でLLM向けプロンプトに設定した「8〜16枚」と統一。
 */
export interface ShortcutItem {
  keys: string;
  desc: string;
}

export const SHORTCUTS: ShortcutItem[] = [
  { keys: '→ / Space', desc: '次のスライドへ' },
  { keys: '←', desc: '前のスライドへ' },
  { keys: 'F', desc: 'フルスクリーン切替' },
  { keys: 'V', desc: 'エディタ⇔プレビュー表示切替' },
  { keys: 'P', desc: 'PDF出力（印刷ダイアログ）' },
  { keys: 'Shift+S', desc: '現在スライドをPNG出力' },
  { keys: 'Shift+P', desc: '全スライドをZIP出力' },
];

export const CONSTRAINT_RULES: string[] = [
  '最終スライドは sources（出典）を推奨',
  '先頭スライドは title を推奨',
  'steps の items は2〜5個',
  'chart系（bar / line / donut）の系列は最大5（6件目以降は切り捨て）',
  'contrast は example が必須（無いとerror）。verdict も推奨（無いとwarn）',
  'グラフ・図解・画像は同一スライドに共存させない',
  '枚数の厳密な上限はなし。AIへ依頼する際の目安は8〜16枚',
];
TSEOF
  echo "[OK] $HELP_CONTENT_FILE を新規作成しました"
fi

# ------------------------------------------------------------------
# 2. HelpModal.tsx を新規作成
# ------------------------------------------------------------------
if [ -f "$HELP_MODAL_FILE" ]; then
  echo "[SKIP] $HELP_MODAL_FILE は既に存在します"
else
  cat > "$HELP_MODAL_FILE" << 'TSEOF'
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
              {SLIDE_TEMPLATES.map((t) => (
                <li key={t.id}>
                  <div className="help-modal__cheat-label">{t.label}</div>
                  <pre>{t.snippet}</pre>
                </li>
              ))}
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
TSEOF
  echo "[OK] $HELP_MODAL_FILE を新規作成しました"
fi

# ------------------------------------------------------------------
# 3. App.tsx を変更
# ------------------------------------------------------------------
python3 << 'PYEOF'
import re
import sys

path = "src/App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

if "HelpModal" in content:
    print("[SKIP] App.tsx はすでにv0.2.8内容が適用済みです")
    sys.exit(0)

original = content

# --- 3-1. import HelpModal（TemplateMenuのimport直後） ---
IMPORT_ANCHOR = "import { TemplateMenu } from './components/TemplateMenu';"
if IMPORT_ANCHOR not in content:
    print("[ERROR] App.tsx にTemplateMenuのimport行が見つかりません。v0.2.7が適用済みか確認してください。")
    sys.exit(1)
content = content.replace(
    IMPORT_ANCHOR,
    IMPORT_ANCHOR + "\nimport { HelpModal } from './components/HelpModal';",
    1,
)

# --- 3-2. helpOpen / helpSeen state（promptOpen宣言の直後） ---
PROMPT_STATE_ANCHOR = "const [promptOpen, setPromptOpen] = useState(false);"
if PROMPT_STATE_ANCHOR not in content:
    print("[ERROR] App.tsx にpromptOpenの定義行が見つかりません。手動確認してください。")
    sys.exit(1)
HELP_STATE_BLOCK = """
  const [helpOpen, setHelpOpen] = useState(false);
  // 初回訪問時のみトーストを出すためのフラグ。usePersistentStateは文字列限定の型のため
  // 'seen' | 'unseen' で管理する（mode/theme/view と同じ既存パターン）。
  const [helpSeen, setHelpSeen] = usePersistentState<'seen' | 'unseen'>('help-seen', 'unseen');

  // トーストは一定時間後に自動でseen化する（クリックされなくても再表示されないように）
  useEffect(() => {
    if (helpSeen !== 'unseen') return;
    const t = setTimeout(() => setHelpSeen('seen'), 6000);
    return () => clearTimeout(t);
  }, [helpSeen, setHelpSeen]);"""
content = content.replace(PROMPT_STATE_ANCHOR, PROMPT_STATE_ANCHOR + HELP_STATE_BLOCK, 1)

# --- 3-3. ❓ヘルプボタン（サンプルボタンの直後） ---
SAMPLE_BTN_PATTERN = re.compile(
    r'(<button onClick=\{\(\) => setMd\(sampleMd\)\} title="サンプル原稿を読み込む">\s*\n\s*サンプル\s*\n\s*</button>)'
)
m = SAMPLE_BTN_PATTERN.search(content)
if not m:
    print("[ERROR] App.tsx にサンプルボタンの想定構造が見つかりません。手動確認してください。")
    sys.exit(1)
HELP_BUTTON = """
        <button
          onClick={() => {
            setHelpOpen(true);
            setHelpSeen('seen');
          }}
          title="記法チートシート・ショートカット・制約ルールを表示"
        >
          ❓ ヘルプ
        </button>"""
content = SAMPLE_BTN_PATTERN.sub(lambda mm: mm.group(1) + HELP_BUTTON, content, count=1)

# --- 3-4. HelpModal・トーストの描画（PromptModal描画の直後） ---
PROMPT_RENDER_ANCHOR = "{promptOpen && <PromptModal onClose={() => setPromptOpen(false)} />}"
if PROMPT_RENDER_ANCHOR not in content:
    print("[ERROR] App.tsx にPromptModalの描画行が見つかりません。手動確認してください。")
    sys.exit(1)
HELP_RENDER_BLOCK = """
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      {helpSeen === 'unseen' && !helpOpen && (
        <div
          className="help-toast"
          onClick={() => {
            setHelpOpen(true);
            setHelpSeen('seen');
          }}
        >
          ❓ 使い方・記法はヘルプで確認できます
        </div>
      )}"""
content = content.replace(PROMPT_RENDER_ANCHOR, PROMPT_RENDER_ANCHOR + HELP_RENDER_BLOCK, 1)

if content == original:
    print("[ERROR] App.tsx への変更が反映されませんでした。手動確認してください。")
    sys.exit(1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] App.tsx を更新しました（❓ヘルプボタン・HelpModal結線・初回トースト）")
PYEOF

# ------------------------------------------------------------------
# 4. app.css に .help-modal / .help-toast 系セレクタを追記
# ------------------------------------------------------------------
python3 << 'PYEOF'
import sys

path = "src/theme/app.css"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

MARKER = "/* v0.2.8: help-modal / help-toast */"
if MARKER in content:
    print("[SKIP] app.css はすでにv0.2.8分のCSSが追記済みです")
    sys.exit(0)

APPEND = """
""" + MARKER + """
.help-modal {
  width: min(720px, 92vw);
  max-height: 82vh;
  display: flex;
  flex-direction: column;
}
.help-modal__tabs {
  display: flex;
  gap: 6px;
  margin-left: auto;
}
.help-modal__tabs button {
  font-size: 0.72rem;
  font-family: inherit;
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-slide);
  color: var(--text-secondary);
  cursor: pointer;
}
.help-modal__tabs button.active,
.help-modal__tabs button[aria-pressed='true'] {
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}
.help-modal__body {
  flex: 1 1 auto;
  overflow-y: auto;
}
.help-modal__cheatsheet {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.help-modal__cheatsheet li {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
}
.help-modal__cheat-label {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.help-modal__cheatsheet pre {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.help-modal__shortcuts {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}
.help-modal__shortcuts td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
}
.help-modal__shortcuts kbd {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.76rem;
  padding: 2px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-surface);
}
.help-modal__rules {
  margin: 0;
  padding-left: 20px;
  font-size: 0.86rem;
  line-height: 1.9;
}

.help-toast {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 1400;
  padding: 10px 16px;
  border-radius: 10px;
  background: var(--text-primary);
  color: var(--bg-slide);
  font-size: 0.8rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24);
  cursor: pointer;
  animation: help-toast-fade 6s ease forwards;
}
@keyframes help-toast-fade {
  0% {
    opacity: 0;
    transform: translateY(6px);
  }
  10% {
    opacity: 1;
    transform: translateY(0);
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
"""

with open(path, "a", encoding="utf-8") as f:
    f.write(APPEND)

print("[OK] app.css に .help-modal / .help-toast 系セレクタを追記しました")
PYEOF

# ------------------------------------------------------------------
# 5. e2e/help.spec.ts を新規作成
# ------------------------------------------------------------------
if [ -f "$E2E_FILE" ]; then
  echo "[SKIP] $E2E_FILE は既に存在します"
else
  cat > "$E2E_FILE" << 'TSEOF'
import { test, expect } from '@playwright/test';

// v0.2.8: ヘルプモーダルのE2E。既存e2eファイルは変更せず独立ファイルにしている。

test('ヘルプ: ❓ボタンでモーダルが開き、タブを切り替えられる', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '❓ ヘルプ' }).click();

  await expect(page.getByText('記法チートシート')).toBeVisible();

  await page.getByRole('button', { name: 'キーボードショートカット' }).click();
  await expect(page.getByText('Shift+P')).toBeVisible();

  await page.getByRole('button', { name: '制約ルール' }).click();
  await expect(page.getByText('先頭スライドは title を推奨')).toBeVisible();
});

test('ヘルプ: 初回訪問時のみトーストが表示され、閉じると再表示されない', async ({ page }) => {
  await page.goto('/');
  const toast = page.locator('.help-toast');
  await expect(toast).toBeVisible();
  await toast.click();

  await page.reload();
  await expect(page.locator('.help-toast')).toHaveCount(0);
});
TSEOF
  echo "[OK] $E2E_FILE を新規作成しました"
fi

echo ""
echo "=== 検証 ==="
test -f "$HELP_CONTENT_FILE" && echo "[OK] helpContent.ts 存在確認" || echo "[ERROR] 存在しません"
test -f "$HELP_MODAL_FILE" && echo "[OK] HelpModal.tsx 存在確認" || echo "[ERROR] 存在しません"
grep -q "HelpModal" "$APP_FILE" && echo "[OK] App.tsxにHelpModal結線あり" || echo "[ERROR] 見つかりません"
grep -q "helpSeen" "$APP_FILE" && echo "[OK] App.tsxにhelpSeenあり" || echo "[ERROR] 見つかりません"
grep -q "help-modal" "$CSS_FILE" && echo "[OK] app.cssに.help-modalあり" || echo "[ERROR] 見つかりません"
grep -q "help-toast" "$CSS_FILE" && echo "[OK] app.cssに.help-toastあり" || echo "[ERROR] 見つかりません"
test -f "$E2E_FILE" && echo "[OK] e2e/help.spec.ts 存在確認" || echo "[ERROR] 存在しません"
