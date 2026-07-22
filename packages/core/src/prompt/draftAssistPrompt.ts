// ssot-applied
/**
 * draftAssistPrompt.ts — LLMサービス（Claude / ChatGPT 等）にスライドMD原稿を
 * 作成してもらうためのプロンプトテンプレート。
 *
 * 移設元: packages/app/src/ai/draftAssistPrompt.ts。
 * app の「AIプロンプト」ボタンと `mdss-convert --guide-prompt` の**両方**がこの1実装を
 * 参照する（app側は再exportのみ・ロジックの二重管理をしない）。
 *
 * 型別の数値制約（系列数上限・ノード数上限・items数上限・example要否等）は
 * schema/*.ts の meta を単一の情報源として `buildTypeReferenceTable()` が
 * 生成する（下記「型別の詳細仕様」節）。ここに数値を直接書き足さないこと。
 *
 * 「テーマ」節を末尾へ移動した（CLI利用時はテーマをその場で渡せず、
 * 生成済みプロンプトの末尾にユーザーが追記する運用を想定するため）。
 */
import { buildTypeReferenceTable } from '../schema/describe';

export function buildDraftAssistPrompt(theme: string = '（ここにテーマを記入）'): string {
  return `あなたはプレゼン資料の構成作家です。以下の仕様に**厳密に**準拠した「スライドMD」を生成してください。テーマを後述してます。

# 出力仕様（スライドMD v0.7 + Studio拡張 v0.2.3）
- 先頭に YAML frontmatter: \`title\`（必須）, \`palette\`（ocean / forest / sunset / plum / graphite）
- スライドは行全体が \`---\` の行で区切る
- 各スライドの先頭行はディレクティブ: \`<!-- slide: <type>[, fit][, layout: ...][, tone: dark] -->\`
  - \`tone: dark\` はそのスライドだけ地色を反転する（強調したい1〜2枚のみに使用）
- 使用可能な type（全16種）:
  - \`title\`: \`# 見出し\` + \`subtitle:\` + \`badges: [a, b]\`。
    \`layout: title-xl\`（大見出し）／\`layout: split-image\`（右半分に画像。\`image:\` にURL指定。
    外部画像はPNG出力時にCORS失敗の可能性があるため多用しない）
  - \`points\`: \`## 見出し\` + \`- **リード**：説明\` の箇条書き（末尾 \`>\` 行は補足ノート）。
    \`layout: two-col\` で2カラム化可
  - \`summary\`: 番号付きリスト（\`1.\`）でまとめ。\`layout: compact\` で余白を詰める
  - \`table\`: \`## 見出し\` + Markdownテーブル（5列以下）。\`layout: compact\` 可
  - \`chart-bar\` / \`chart-line\` / \`chart-donut\`: \`\`\`chart フェンスに type / title / unit / data
    （label, value）/ source（name, url）をYAMLで記述。**数値は実在の出典に基づく実数のみ**
    （推定値の捏造禁止。系列数の上限は下記「型別の詳細仕様」参照）。
    \`chart-bar\`・\`chart-line\`は\`layout: side-list\`で前提条件パネルを併記可
  - \`diagram-flow\` / \`diagram-layer\` / \`diagram-cycle\` / \`diagram-timeline\`: \`\`\`diagram
    フェンスに type（flow|layer|cycle|timeline）と nodes 配列（ノード数上限は下記「型別の詳細仕様」参照）。
    **抽象的な処理の流れはflow、階層構造はlayer、循環プロセスはcycle、時系列・ロードマップはtimeline**
  - \`steps\`: 手順・プロセス・ワークフローのカード型フロー。\`\`\`steps フェンスに
    style（cards|circled）と items（icon / title / desc、任意で tone: dark|outline）をYAMLで記述
    （items数の上限は下記「型別の詳細仕様」参照）。任意の ratio（label, value の配列）で
    セグメント比率帯を描画（合計は100を推奨）。**手順の説明には diagram-flow より steps を優先する**
  - \`contrast\`: 「思い込み・誤解 → 実際の強み/弱点」のような**対比構造**を示す専用type。
    \`\`\`contrast フェンスに example（title, rows[tag, text]）と verdict（label/text/tone、
    または connector）をYAMLで記述（example の要否は下記「型別の詳細仕様」参照）。**頻用しない**：
    単なる比較にはcomparison-chart、単なる列挙にはpointsを優先し、対比構造が明確な場合のみ使う
  - \`figure\`: \`![alt](画像URL)\` + \`source: [出典名](URL)\`（source必須）
  - \`feature-showcase\`: left（eyebrow / heading / lead）とright
    （num / eyebrow / heading / sub / items[label, desc]）のYAML
  - \`comparison-chart\`: \`\`\`comparison フェンスに left/right（title, items[]）をYAML
  - \`sources\`: \`- [タイトル](URL) — 補足\` のリンクリスト
- 全typeで使える共通ヘッダキー（本文の行頭に書く）:
  - \`badge: Step 1\` … 見出し左のピル（工程番号・WHY等の一言ラベル）
  - \`lead: 補足文\` … 見出し直下のグレー1行
  - \`point: 要点\` … スライド下部の💡強調帯（1スライドの結論・注意点）
- 強調は \`==テキスト==\`（アクセント色になる）
- 制約: **枚数は8〜16枚を推奨**（アプリ自体に厳密な上限はないが、AIに依頼する際の目安として
  詰め込みすぎず・省略しすぎない範囲を示す） /
  1スライド1グラフ / グラフ・図解・画像は同一スライドに共存させない /
  **最終スライドは必ず sources** / 先頭スライドは title を推奨 /
  MD内に生の<script><style>を書かない

# 型別の詳細仕様（制約は自動生成・schemaが単一の情報源）
${buildTypeReferenceTable()}

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
  \`（要確認: ○○の最新値）\`のように明記してください

# テーマ
${theme}`;
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
