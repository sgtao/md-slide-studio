#!/usr/bin/env bash
# apply-v0.2.8-fix.sh — ヘルプモーダルのチートシート表示改善（v0.2.8フォローアップ）
#
# 内容: src/components/HelpModal.tsx の記法チートシートタブを以下の2点で改善する。
#   1. 各スニペットの先頭に区切り線 `-----` を追加して表示
#   2. コード領域の右上にコピーアイコンボタンを追加
#      （クリックでクリップボードにコピー。コピー直後は✅に切り替わり1.5秒後に戻る）
#
# 前提: v0.2.8（apply-v0.2.8.sh）適用済みであること。
# 実行方法: リポジトリルートで bash /path/to/apply-v0.2.8-fix.sh
# 冪等: 複数回実行しても2回目以降は [SKIP] になる。

set -euo pipefail

HELP_MODAL_FILE="src/components/HelpModal.tsx"
CSS_FILE="src/theme/app.css"

if [ ! -f "$HELP_MODAL_FILE" ]; then
  echo "[ERROR] $HELP_MODAL_FILE が見つかりません。v0.2.8（apply-v0.2.8.sh）が適用済みか確認してください。"
  exit 1
fi
if [ ! -f "$CSS_FILE" ]; then
  echo "[ERROR] $CSS_FILE が見つかりません。リポジトリルートで実行しているか確認してください。"
  exit 1
fi

# ------------------------------------------------------------------
# 1. HelpModal.tsx: コピー状態の追加・cheatsheetブロックの差し替え
# ------------------------------------------------------------------
python3 << 'PYEOF'
import sys

path = "src/components/HelpModal.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

if "copiedTemplateId" in content:
    print("[SKIP] HelpModal.tsx はすでに本フィックス適用済みです")
    sys.exit(0)

# --- 1-1. copiedTemplateId state 追加（tab state の直後） ---
TAB_STATE_ANCHOR = "const [tab, setTab] = useState<HelpTab>('cheatsheet');"
if TAB_STATE_ANCHOR not in content:
    print("[ERROR] HelpModal.tsx にtab stateの定義行が見つかりません。手動確認してください。")
    sys.exit(1)
STATE_BLOCK = """
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
  };"""
content = content.replace(TAB_STATE_ANCHOR, TAB_STATE_ANCHOR + STATE_BLOCK, 1)

# --- 1-2. cheatsheetブロックを差し替え（区切り線＋コピーボタン） ---
OLD_CHEATSHEET = """          {tab === 'cheatsheet' && (
            <ul className="help-modal__cheatsheet">
              {SLIDE_TEMPLATES.map((t) => (
                <li key={t.id}>
                  <div className="help-modal__cheat-label">{t.label}</div>
                  <pre>{t.snippet}</pre>
                </li>
              ))}
            </ul>
          )}"""
if OLD_CHEATSHEET not in content:
    print("[ERROR] HelpModal.tsx に想定するcheatsheetブロック（v0.2.8適用時のもの）が見つかりません。")
    sys.exit(1)

NEW_CHEATSHEET = """          {tab === 'cheatsheet' && (
            <ul className="help-modal__cheatsheet">
              {SLIDE_TEMPLATES.map((t) => {
                // 先頭に区切り線を付けて表示・コピーする（コピー時も同じ内容になるようにする）
                const displayText = `-----\\n${t.snippet}`;
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
          )}"""
content = content.replace(OLD_CHEATSHEET, NEW_CHEATSHEET, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] HelpModal.tsx を更新しました（区切り線・コピーボタン追加）")
PYEOF

# ------------------------------------------------------------------
# 2. app.css: コピーボタン用のセレクタを追記
# ------------------------------------------------------------------
python3 << 'PYEOF'
import sys

path = "src/theme/app.css"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

MARKER = "/* v0.2.8-fix: help-modal cheat-code copy button */"
if MARKER in content:
    print("[SKIP] app.css はすでに本フィックス分のCSSが追記済みです")
    sys.exit(0)

APPEND = """
""" + MARKER + """
.help-modal__cheat-code {
  position: relative;
}
.help-modal__copy-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 1;
  font-size: 0.8rem;
  line-height: 1;
  padding: 4px 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-slide);
  color: var(--text-secondary);
  cursor: pointer;
  opacity: 0.7;
}
.help-modal__copy-btn:hover {
  opacity: 1;
  border-color: var(--accent);
  color: var(--accent);
}
"""

with open(path, "a", encoding="utf-8") as f:
    f.write(APPEND)

print("[OK] app.css にコピーボタン用のセレクタを追記しました")
PYEOF

echo ""
echo "=== 検証 ==="
grep -q "copiedTemplateId" "$HELP_MODAL_FILE" && echo "[OK] copiedTemplateIdあり" || echo "[ERROR] 見つかりません"
grep -q -- "-----" "$HELP_MODAL_FILE" && echo "[OK] 区切り線(-----)の埋め込みあり" || echo "[ERROR] 見つかりません"
grep -q "help-modal__copy-btn" "$CSS_FILE" && echo "[OK] app.cssにコピーボタン用CSSあり" || echo "[ERROR] 見つかりません"
