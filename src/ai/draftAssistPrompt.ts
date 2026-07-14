/**
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

# 出力仕様（スライドMD v0.7 + Studio拡張 v0.2）
- 先頭に YAML frontmatter: \`title\`（必須）, \`palette\`（ocean / forest / sunset / plum / graphite）
- スライドは行全体が \`---\` の行で区切る
- 各スライドの先頭行はディレクティブ: \`<!-- slide: <type>[, fit][, layout: two-col|title-xl|compact][, tone: dark] -->\`
  - \`tone: dark\` はそのスライドだけ地色を反転する（強調したい1〜2枚のみに使用）
- 使用可能な type:
  - \`title\`: \`# 見出し\` + \`subtitle:\` + \`badges: [a, b]\`
  - \`points\`: \`## 見出し\` + \`- **リード**：説明\` の箇条書き（末尾 \`>\` 行は補足ノート）
  - \`summary\`: 番号付きリスト（\`1.\`）でまとめ
  - \`table\`: \`## 見出し\` + Markdownテーブル（5列以下）
  - \`chart-bar\` / \`chart-line\` / \`chart-donut\`: \`\`\`chart フェンスに type / title / unit / data（label, value）/ source（name, url）をYAMLで記述。**数値は実在の出典に基づく実数のみ**（推定値の捏造禁止）。系列は最大5
  - \`diagram-flow\` / \`diagram-layer\` / \`diagram-cycle\`: \`\`\`diagram フェンスに type（flow|layer|cycle）と nodes 配列。flow≤5 / layer≤4 / cycle≤4
  - \`steps\`: 手順・プロセス・ワークフローのカード型フロー。\`\`\`steps フェンスに style（cards|circled）と items（icon / title / desc、任意で tone: dark|outline）をYAMLで記述。items は2〜5個。任意の ratio（label, value の配列）でセグメント比率帯を描画。**手順の説明には diagram-flow より steps を優先する**（アイコン・説明文つきカードで表現力が高い）
  - \`figure\`: \`![alt](画像URL)\` + \`source: [出典名](URL)\`（source必須）
  - \`feature-showcase\`: left（eyebrow / heading / lead）とright（num / eyebrow / heading / sub / items[label, desc]）のYAML
  - \`sources\`: \`- [タイトル](URL) — 補足\` のリンクリスト
- 全typeで使える共通ヘッダキー（本文の行頭に書く）:
  - \`badge: Step 1\` … 見出し左のピル（工程番号・WHY等の一言ラベル）
  - \`lead: 補足文\` … 見出し直下のグレー1行
  - \`point: 要点\` … スライド下部の💡強調帯（1スライドの結論・注意点）
- 強調は \`==テキスト==\`（アクセント色になる）
- 制約: 枚数は6〜10枚 / 1スライド1グラフ / グラフ・図解・画像は同一スライドに共存させない / **最終スライドは必ず sources** / MD内に生の<script><style>を書かない

# 構成フレーム
1. title（タイトル・サブタイトル・バッジ）
2. points（概要・背景。なぜ重要かを数字やトレンドで）
3〜N-2. メインコンテンツ（points / table / chart / diagram / steps / feature-showcase を内容に応じて）
N-1. summary（3〜5個のキーポイント）
N. sources（出典URL一覧）

# 出力形式
コードブロックに **スライドMDのみ** を出力してください（前置き・解説は不要）。`;
}

/** サンプルの最小スライドMD（プロンプトに例として添付する用） */
export const MINIMAL_EXAMPLE = `---
title: サンプルデッキ
palette: ocean
---
<!-- slide: title -->
# タイトルを==ここに==
subtitle: サブタイトル
badges: [2026年版]
---
<!-- slide: points -->
## 見出し
- **リード**：説明文
- **リード2**：説明文
> 補足ノート
---
<!-- slide: steps -->
badge: Step 1
## 手順の見出し
lead: 手順の補足リード
\`\`\`steps
style: cards
items:
  - { icon: "🔍", title: 調査, desc: 説明文 }
  - { icon: "🛠️", title: 実装, desc: 説明文 }
  - { icon: "🚀", title: 公開, desc: 説明文 }
\`\`\`
point: このスライドの結論を1行で
---
<!-- slide: sources -->
## 出典・参考リンク
- [参考記事](https://example.com) — 補足
`;
