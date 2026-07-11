# MD Slide Studio

Markdown原稿（スライドMD）から **HTMLスライド／PDF／PNG** を生成するWebアプリ。

- 参考：[websearch-slide-ja スキル](https://github.com/sgtao/skill-websearch-slide-ja) スキル（v0.7系）のスライドMD仕様・デザイントークン・
レイアウト定義を利用
  - React + TypeScript に移植し、MD→HTML のLLM変換をパーサー＋コンポーネントに置換

## 特徴

- **エディタ＋プレビュー2ペイン**: MDを編集すると右のスライドに即時反映（300msデバウンス）
- **全14スライドtype対応**: title / points / summary / table / chart-bar / chart-line /
  chart-donut / comparison-chart / diagram-flow / diagram-layer / diagram-cycle /
  figure / feature-showcase / sources
- **決定論的レンダリング**: 同じMDからは常に同じスライドが生成される
  （グラフ・図解は座標テーブル準拠のSVG生成関数。外部グラフライブラリ不使用）
- **テーマ・パレット**: ライト/ダーク × 5パレット（ocean / forest / sunset / plum / graphite）。
  色はすべてCSS変数経由（ハードコード禁止ルールを踏襲）
- **エクスポート**: PDF（`P`・印刷経由）/ 現在スライドPNG（`Shift+S`）/
  全スライドZIP（`Shift+P`）/ スライドMD保存
- **AI原稿支援**: 🤖ボタンでLLM用の原稿作成プロンプトを生成・コピー

## セットアップ

```bash
npm install
npm run dev      # 開発サーバー
npm test         # パーサー・グラフ生成の単体テスト
npm run build    # 本番ビルド（dist/）
```

## デプロイ（GitHub Pages）

1. このリポジトリを GitHub に push
2. リポジトリの **Settings → Pages → Source** を **GitHub Actions** に設定
3. `main` ブランチへの push で `.github/workflows/deploy.yml` が
   テスト → ビルド → Pages公開 を自動実行

Vite の `base: './'`（相対パス）でビルドするため、リポジトリ名に関わらず動作します。

## スライドMD仕様（要約）

```markdown
---
title: デッキタイトル
palette: ocean          # ocean / forest / sunset / plum / graphite
---
<!-- slide: title -->
# メイン==タイトル==
subtitle: サブタイトル
badges: [2026年版]
---
<!-- slide: points, layout: two-col -->
## 見出し
- **リード**：説明文
> 補足ノート
---
<!-- slide: chart-donut -->
## グラフ
```chart
type: donut
title: 使用率
unit: "%"
data:
  - { label: React, value: 45 }
source: { name: 出典名, url: https://... }
```
---
<!-- slide: sources -->
## 出典・参考リンク
- [記事タイトル](https://...) — 補足
```

- スライド区切りは行全体が `---` の行（frontmatter・コードフェンス内は除外）
- `==テキスト==` はアクセント色の強調
- `fit` オプションで内容過多スライドを自動縮小、`layout:` で two-col / title-xl / compact
- 図解は ```` ```diagram ````（type: flow / layer / cycle）または
  mermaidサブセット（`graph LR/TD` の直線・循環のみ）
- 制約: 枚数3〜12 / 1スライド1グラフ / 最終スライドは sources 推奨 /
  生の `<script>` `<style>` は無視される

完全な仕様は移植元スキルの `references/markdown-format.md` を参照。
LLMに原稿を書かせるプロンプト例は [`docs/prompts/draft-slide-md.md`](docs/prompts/draft-slide-md.md)。

## アーキテクチャ

```
スライドMD ──parseSlideMarkdown()──▶ SlideDeck(AST) ──SlideRenderer──▶ React DOM
                （純関数・型付き）        │                    │
                                        │              charts/ diagrams/
                                        ▼              （決定論的SVG生成）
                                   警告リスト（UI表示）
```

```
src/
├── parser/          # スライドMD → AST（純関数・単体テスト対象）
│   ├── slideMarkdown.ts
│   ├── inline.tsx   # ==hl== / **bold** / `code` / リンク
│   └── types.ts
├── components/
│   ├── SlideDeck.tsx        # スケーラー・ナビ・hero/list
│   ├── ControlCluster.tsx   # テーマ/パレット/エクスポートUI
│   ├── slides/              # type別コンポーネント（slide-layouts.md 移植）
│   ├── charts/              # 座標テーブル準拠のSVGグラフ（chart-generation.md）
│   └── diagrams/            # 固定座標のSVG図解（diagram-generation.md）
├── theme/           # 元スキルのCSS 8ファイル + content.css + app.css
├── hooks/           # useFitSlide / useKeyboardNav / usePersistentState
├── export/          # PDF（print CSS）/ PNG（html2canvas）/ ZIP（jszip）
└── ai/              # LLM原稿作成支援プロンプト
```

元スキルとの対応関係・移植方針の詳細は移植元の `references/` を参照してください。
LLM生成で必要だった「コンテンツ漏洩チェック」「JS構文チェック」は、
型システムとコンポーネント境界により原理的に発生しなくなっています。

## キーボードショートカット

| キー | 動作 |
|---|---|
| ← / → / Space | スライド移動 |
| F | フルスクリーン |
| V | hero ⇄ list 表示切替 |
| P | PDF印刷 |
| Shift+S | 現在スライドをPNG |
| Shift+P | 全スライドをZIP |

## ロードマップ

- **Phase 1（本リポジトリ）**: MD → HTML(React) → PDF/PNG、全14type、GitHub Pages
- **Phase 1.5**: HTML→MD逆抽出、chart-line複数系列、scatter
- **Phase 2**: AI原稿支援の強化（API連携での下書き生成・レビュー）
- **Phase 3**: PPTXエクスポート

## License

MIT
