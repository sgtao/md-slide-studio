#!/usr/bin/env bash
# apply-v0.2.6.sh — draftAssistPrompt.ts 更新（v0.2.6: ③-1）
#
# 内容:
#   1. src/ai/draftAssistPrompt.ts のプロンプト文字列を、v0.2.0〜v0.2.3で追加された
#      記法（steps / contrast / diagram-timeline / split-image / 共通ヘッダ）に同期。
#      枚数目安は deckLint 側の撤去(論点A)と切り離し、LLM向けには「8〜16枚推奨」を明記。
#   2. src/ai/draftAssistPrompt.test.ts を新規追加（type網羅・テーマ埋め込みの検証のみ）。
#   3. src/App.tsx の PromptModal 説明文に「アプリ自体には枚数上限はない」旨の注記を追加。
#   4. CHANGELOG に [v0.2.6] エントリを追記。
#
# 実行方法: リポジトリルート（21_dev_md-slide-studio/）で ./apply-v0.2.6.sh
# 冪等: 複数回実行しても2回目以降は [SKIP] になる。

set -euo pipefail

# 注意: このスクリプトは「実行時のカレントディレクトリ」をリポジトリルートとして扱う。
# スクリプト自身がどこに置かれているか（.idea/ 配下等）は無関係。
# 必ずリポジトリルート（package.json や src/ がある場所）で実行すること:
#   cd /path/to/21_dev_md-slide-studio
#   bash /path/to/apply-v0.2.6.sh   （相対パス・絶対パスどちらでも可）

PROMPT_FILE="src/ai/draftAssistPrompt.ts"
TEST_FILE="src/ai/draftAssistPrompt.test.ts"
APP_FILE="src/App.tsx"
CHANGELOG_FILE="CHANGELOG"

for f in "$PROMPT_FILE" "$APP_FILE" "$CHANGELOG_FILE"; do
  if [ ! -f "$f" ]; then
    echo "[ERROR] $f が見つかりません。リポジトリルートで実行しているか確認してください。"
    exit 1
  fi
done

# ------------------------------------------------------------------
# 1. draftAssistPrompt.ts の本体を更新
# ------------------------------------------------------------------
python3 << 'PYEOF'
import sys

path = "src/ai/draftAssistPrompt.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

NEW_MARKER = "Studio拡張 v0.2.3"
OLD_MARKER = "Studio拡張 v0.2）"

if NEW_MARKER in content:
    print("[SKIP] draftAssistPrompt.ts はすでにv0.2.6内容が適用済みです")
    sys.exit(0)

if OLD_MARKER not in content:
    print("[ERROR] draftAssistPrompt.ts に想定アンカー（旧仕様マーカー）が見つかりません。手動確認してください。")
    sys.exit(1)

NEW_FILE_CONTENT = '''/**
 * draftAssistPrompt.ts — LLMサービス（Claude / ChatGPT 等）にスライドMD原稿を
 * 作成してもらうためのプロンプトテンプレート。
 * アプリの「AIプロンプト」ボタンからコピーして使う。
 * 仕様の詳細版は docs/prompts/draft-slide-md.md と
 * docs/references/markdown-format-ext.md（v0.2.0 拡張）を参照。
 */

export function buildDraftAssistPrompt(theme: string = '（ここにテーマを記入）'): string {
  return `あなたはプレゼン資料の構成作家です。以下の仕様に**厳密に**準拠した「スライドMD」を生成してください。

# テーマ
${theme}

# 出力仕様（スライドMD v0.7 + Studio拡張 v0.2.3）
- 先頭に YAML frontmatter: \\`title\\`（必須）, \\`palette\\`（ocean / forest / sunset / plum / graphite）
- スライドは行全体が \\`---\\` の行で区切る
- 各スライドの先頭行はディレクティブ: \\`<!-- slide: <type>[, fit][, layout: ...][, tone: dark] -->\\`
  - \\`tone: dark\\` はそのスライドだけ地色を反転する（強調したい1〜2枚のみに使用）
- 使用可能な type（全16種）:
  - \\`title\\`: \\`# 見出し\\` + \\`subtitle:\\` + \\`badges: [a, b]\\`。
    \\`layout: title-xl\\`（大見出し）／\\`layout: split-image\\`（右半分に画像。\\`image:\\` にURL指定。
    外部画像はPNG出力時にCORS失敗の可能性があるため多用しない）
  - \\`points\\`: \\`## 見出し\\` + \\`- **リード**：説明\\` の箇条書き（末尾 \\`>\\` 行は補足ノート）。
    \\`layout: two-col\\` で2カラム化可
  - \\`summary\\`: 番号付きリスト（\\`1.\\`）でまとめ。\\`layout: compact\\` で余白を詰める
  - \\`table\\`: \\`## 見出し\\` + Markdownテーブル（5列以下）。\\`layout: compact\\` 可
  - \\`chart-bar\\` / \\`chart-line\\` / \\`chart-donut\\`: \\`\\`\\`chart フェンスに type / title / unit / data
    （label, value）/ source（name, url）をYAMLで記述。**数値は実在の出典に基づく実数のみ**
    （推定値の捏造禁止）。系列は最大5。\\`chart-bar\\`・\\`chart-line\\`は\\`layout: side-list\\`で
    前提条件パネルを併記可
  - \\`diagram-flow\\` / \\`diagram-layer\\` / \\`diagram-cycle\\` / \\`diagram-timeline\\`: \\`\\`\\`diagram
    フェンスに type（flow|layer|cycle|timeline）と nodes 配列。flow≤5 / layer≤4 / cycle≤4 / timeline≤6。
    **抽象的な処理の流れはflow、階層構造はlayer、循環プロセスはcycle、時系列・ロードマップはtimeline**
  - \\`steps\\`: 手順・プロセス・ワークフローのカード型フロー。\\`\\`\\`steps フェンスに
    style（cards|circled）と items（icon / title / desc、任意で tone: dark|outline）をYAMLで記述。
    items は2〜5個。任意の ratio（label, value の配列）でセグメント比率帯を描画（合計は100を推奨）。
    **手順の説明には diagram-flow より steps を優先する**
  - \\`contrast\\`: 「思い込み・誤解 → 実際の強み/弱点」のような**対比構造**を示す専用type。
    \\`\\`\\`contrast フェンスに example（title, rows[tag, text]）と verdict（label/text/tone、
    または connector）をYAMLで記述。example は必須。**頻用しない**：単なる比較には
    comparison-chart、単なる列挙にはpointsを優先し、対比構造が明確な場合のみ使う
  - \\`figure\\`: \\`![alt](画像URL)\\` + \\`source: [出典名](URL)\\`（source必須）
  - \\`feature-showcase\\`: left（eyebrow / heading / lead）とright
    （num / eyebrow / heading / sub / items[label, desc]）のYAML
  - \\`comparison-chart\\`: \\`\\`\\`comparison フェンスに left/right（title, items[]）をYAML
  - \\`sources\\`: \\`- [タイトル](URL) — 補足\\` のリンクリスト
- 全typeで使える共通ヘッダキー（本文の行頭に書く）:
  - \\`badge: Step 1\\` … 見出し左のピル（工程番号・WHY等の一言ラベル）
  - \\`lead: 補足文\\` … 見出し直下のグレー1行
  - \\`point: 要点\\` … スライド下部の💡強調帯（1スライドの結論・注意点）
- 強調は \\`==テキスト==\\`（アクセント色になる）
- 制約: **枚数は8〜16枚を推奨**（アプリ自体に厳密な上限はないが、AIに依頼する際の目安として
  詰め込みすぎず・省略しすぎない範囲を示す） /
  1スライド1グラフ / グラフ・図解・画像は同一スライドに共存させない /
  **最終スライドは必ず sources** / 先頭スライドは title を推奨 /
  MD内に生の<script><style>を書かない

# 構成フレーム
1. title（タイトル・サブタイトル・バッジ）
2. points（概要・背景。なぜ重要かを数字やトレンドで）
3〜N-2. メインコンテンツ（points / table / chart / diagram / steps / feature-showcase /
   contrast / comparison-chart を内容に応じて。手順はsteps優先、時系列はtimeline優先）
N-1. summary（まとめ）
N. sources（出典。必須・最終スライド）

# 出力形式
- 上記仕様に沿った完全なスライドMDのみを出力してください（説明文や前置きは不要）
- 数値・固有名詞は根拠のあるものだけを使い、不明な場合はプレースホルダーではなく
  \\`（要確認: ○○の最新値）\\`のように明記してください`;
}

export const MINIMAL_EXAMPLE = `---
title: サンプル
palette: ocean
---

<!-- slide: title -->
# サンプルタイトル
subtitle: サブタイトル

---

<!-- slide: points -->
## 要点
- **要点1**：説明
- **要点2**：説明

---

<!-- slide: sources -->
## 出典
- [出典1](https://example.com)
`;
'''

with open(path, "w", encoding="utf-8") as f:
    f.write(NEW_FILE_CONTENT)

print("[OK] draftAssistPrompt.ts を更新しました")
PYEOF

# ------------------------------------------------------------------
# 2. draftAssistPrompt.test.ts を新規追加（既存なら SKIP）
# ------------------------------------------------------------------
if [ -f "$TEST_FILE" ]; then
  echo "[SKIP] $TEST_FILE は既に存在します"
else
  cat > "$TEST_FILE" << 'TSEOF'
import { describe, it, expect } from 'vitest';
import { buildDraftAssistPrompt, MINIMAL_EXAMPLE } from './draftAssistPrompt';

// v0.2.6: sample.md統合（v0.2.5）で確定した全16 typeがプロンプトに反映されているかを
// 機械的に検証する。文面のスナップショットは取らない（記法追加のたびに壊れるため）。
const ALL_TYPES = [
  'title',
  'points',
  'summary',
  'table',
  'chart-bar',
  'chart-line',
  'chart-donut',
  'comparison-chart',
  'diagram-flow',
  'diagram-layer',
  'diagram-cycle',
  'diagram-timeline',
  'steps',
  'contrast',
  'figure',
  'feature-showcase',
  'sources',
];

describe('buildDraftAssistPrompt', () => {
  it('全16 type名がプロンプトに含まれる', () => {
    const prompt = buildDraftAssistPrompt('テストテーマ');
    for (const type of ALL_TYPES) {
      expect(prompt).toContain(type);
    }
  });

  it('テーマ文字列が埋め込まれる', () => {
    const prompt = buildDraftAssistPrompt('社内向けAI活用提案');
    expect(prompt).toContain('社内向けAI活用提案');
  });

  it('テーマ省略時はプレースホルダーが入る', () => {
    const prompt = buildDraftAssistPrompt();
    expect(prompt).toContain('（ここにテーマを記入）');
  });

  it('枚数目安として8〜16枚が明記されている', () => {
    const prompt = buildDraftAssistPrompt();
    expect(prompt).toContain('8〜16枚');
  });

  it('MINIMAL_EXAMPLE がtitle/points/sourcesの最小構成である', () => {
    expect(MINIMAL_EXAMPLE).toContain('slide: title');
    expect(MINIMAL_EXAMPLE).toContain('slide: points');
    expect(MINIMAL_EXAMPLE).toContain('slide: sources');
  });
});
TSEOF
  echo "[OK] $TEST_FILE を新規作成しました"
fi

# ------------------------------------------------------------------
# 3. App.tsx の PromptModal 説明文に注記を追加
# ------------------------------------------------------------------
python3 << 'PYEOF'
import sys

path = "src/App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

NEW_MARKER = "アプリ自体にはスライド枚数の上限はありません"
OLD_ANCHOR = "スライドMDが返ってきます。返ってきたMDを左のエディタに貼り付けてください。\n          </p>"

if NEW_MARKER in content:
    print("[SKIP] App.tsx の PromptModal 注記はすでに追加済みです")
    sys.exit(0)

if OLD_ANCHOR not in content:
    print("[ERROR] App.tsx に想定アンカー（PromptModal説明文）が見つかりません。手動確認してください。")
    sys.exit(1)

NEW_ANCHOR = (
    "スライドMDが返ってきます。返ってきたMDを左のエディタに貼り付けてください。\n"
    "            <br />\n"
    "            なお、アプリ自体にはスライド枚数の上限はありません。8〜16枚は\n"
    "            AIへ依頼する際の読みやすさの目安です。\n"
    "          </p>"
)

content = content.replace(OLD_ANCHOR, NEW_ANCHOR)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] App.tsx の PromptModal に注記を追加しました")
PYEOF

# ------------------------------------------------------------------
# 4. CHANGELOG に [v0.2.6] エントリを追記
# ------------------------------------------------------------------
python3 << 'PYEOF'
import sys

path = "CHANGELOG"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

if "## [0.2.6]" in content:
    print("[SKIP] CHANGELOG に [0.2.6] エントリはすでに存在します")
    sys.exit(0)

ANCHOR = "# Changelog\n\nAll notable changes to this project will be documented in this file.\n"
if ANCHOR not in content:
    print("[ERROR] CHANGELOG に想定アンカー（見出し部）が見つかりません。手動確認してください。")
    sys.exit(1)

ENTRY = """
## [0.2.6] - 2026-07-17

### 変更｜draftAssistPrompt.ts をv0.2.3拡張記法に同期

- 変更: `src/ai/draftAssistPrompt.ts`
  - steps / contrast / diagram-timeline / title(split-image) / 共通ヘッダ(badge・lead・point)を
    プロンプト仕様に反映（全16 type網羅）
  - 枚数目安を「推奨6〜10枚」から**「推奨8〜16枚」**に変更
    （deckLintからは枚数制約を撤去済みだが、LLM生成時の目安としては表紙・出典を含めると
    8〜16枚程度が実用的と判断）
  - `comparison-chart` の記述を追加、diagram種別の使い分け（flow/layer/cycle/timeline）を明記
- 変更: `src/App.tsx`
  - PromptModalの説明文に「アプリ自体には枚数上限がない」旨の注記を追加
    （deckLint側の無制限方針とAI推奨枚数の二重基準による混乱を防止）
- 新規: `src/ai/draftAssistPrompt.test.ts`
  - 全16 type名の網羅・テーマ埋め込み・枚数目安記載をVitestで検証（文面スナップショットは避けた）
"""

content = content.replace(ANCHOR, ANCHOR + ENTRY, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] CHANGELOG に [0.2.6] エントリを追記しました")
PYEOF

echo ""
echo "=== 検証 ==="
grep -q "8〜16枚" "$PROMPT_FILE" && echo "[OK] draftAssistPrompt.ts に8〜16枚の記載あり" || echo "[ERROR] 記載が見つかりません"
grep -q "diagram-timeline" "$PROMPT_FILE" && echo "[OK] diagram-timeline の記載あり" || echo "[ERROR] 記載が見つかりません"
grep -q "contrast" "$PROMPT_FILE" && echo "[OK] contrast の記載あり" || echo "[ERROR] 記載が見つかりません"
grep -q "アプリ自体にはスライド枚数の上限はありません" "$APP_FILE" && echo "[OK] App.tsx に注記あり" || echo "[ERROR] 注記が見つかりません"
grep -q "\[0.2.6\]" "$CHANGELOG_FILE" && echo "[OK] CHANGELOG にv0.2.6エントリあり" || echo "[ERROR] エントリが見つかりません"
test -f "$TEST_FILE" && echo "[OK] draftAssistPrompt.test.ts 存在確認" || echo "[ERROR] テストファイルが存在しません"
