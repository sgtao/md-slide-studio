---
title: MD Slide Studio デモ
palette: ocean
---
<!-- slide: title -->
# Markdownから、==スライドを生成する。==
subtitle: MD Slide Studio — スライドMD → HTML / PDF / PNG 変換デモ（全typeサンプル）
badges: [v0.1.0, React + TypeScript, websearch-slide-ja 移植]
---
<!-- slide: points -->
## このアプリでできること
- **即時プレビュー**：左のエディタでMDを編集すると、右のスライドが即座に更新される
- **14種のスライドtype**：タイトル・箇条書き・表・グラフ・図解・画像などを宣言的に記述
- **テーマ切替**：🌙でライト／ダーク、🎨で5色パレットを即座に切替
- **エクスポート**：📥メニューからPDF / PNG / ZIPをダウンロード
- **AI原稿支援**：🤖ボタンでLLM用プロンプトを生成し、下書きをAIに任せることも可能
> このスライド自体がエディタ内のMDから生成されています。編集して試してください。
---
<!-- slide: summary -->
## 使い方（3ステップ）
1. **原稿を書く**：左ペインにスライドMDを書く（AIプロンプト🤖でLLMに下書きさせてもOK）
1. **確認する**：右ペインで確認。🎨でパレット、🌙でテーマを切替
1. **書き出す**：📥メニューからPDF / PNG / ZIPをエクスポート
---
<!-- slide: table -->
## 対応スライドtype一覧
| type | 用途 | 記法 |
|---|---|---|
| title / points / summary | 表紙・箇条書き・まとめ | `#` / `-` / `1.` |
| table | 比較表 | Markdownテーブル |
| chart-bar / line / donut | グラフ | ```chart ブロック |
| diagram-flow / layer / cycle | 図解 | ```diagram / mermaid |
| figure / feature-showcase / sources | 画像・機能紹介・出典 | 専用記法 |
---
<!-- slide: chart-donut -->
## グラフはYAMLデータから自動描画
```chart
type: donut
title: フロントエンド フレームワーク使用率（例示データ）
unit: "%"
data:
  - { label: React,  value: 45 }
  - { label: Vue,    value: 30 }
  - { label: Svelte, value: 15 }
  - { label: その他, value: 10 }
source: { name: サンプルデータ, url: https://example.com }
```
---
<!-- slide: chart-bar -->
## 横棒グラフの例
```chart
type: bar
title: リポジトリ別スター数（例示データ）
unit: "k"
data:
  - { label: project-a, value: 98 }
  - { label: project-b, value: 74 }
  - { label: project-c, value: 51 }
  - { label: project-d, value: 33 }
source: { name: サンプルデータ, url: https://example.com }
```
---
<!-- slide: diagram-flow -->
## 変換パイプライン
```diagram
type: flow
nodes: ["スライドMD", "パーサー", "React AST", "レンダラ", "PDF / PNG"]
labels: ["", "parseSlideMarkdown", "型付きSlide[]", "SVG含む", "エクスポート"]
```
---
<!-- slide: diagram-cycle -->
## 制作サイクル
```diagram
type: cycle
nodes: [下書き, プレビュー, 修正, 共有]
```
---
<!-- slide: feature-showcase -->
left:
  eyebrow: FEATURE
  heading: AIに下書きさせて、==人が仕上げる。==
  lead: 🤖ボタンのプロンプトをLLMに渡すと、この仕様に準拠したスライドMDが返ってくる。貼り付ければ即プレビュー。
right:
  num: "01"
  eyebrow: WORKFLOW
  heading: AI原稿支援
  sub: LLM → スライドMD → このアプリ
  items:
    - label: プロンプト生成
      desc: テーマを埋めるだけの定型プロンプト
    - label: 仕様準拠の下書き
      desc: type・制約込みでLLMが構成
    - label: 決定論的レンダリング
      desc: 貼り付ければ常に同じ見た目に
---
<!-- slide: comparison-chart -->
left:
  big: 225GB
  big_unit: 解放
  heading: 空き容量が ==321GB → 546GB== へ。
  lead: 整理前は605GB使用。クラウド移行と重複削除で380GBまで削減（例示データ）。
  stats:
    - { num: 65% → 41%, label: 使用率 }
    - { num: 926GB, label: SSD容量 }
```chart
type: comparison-donut
labels: { before: Before, after: After }
center: { before: 605GB, after: 380GB }
data:
  - { label: Drive, before: 326, after: 128, class: 1 }
  - { label: 空き, before: 321, after: 546, class: neutral }
source: { name: 計測メモ }
```
---
<!-- slide: sources -->
## 出典・参考リンク
- [websearch-slide-ja スキル](https://github.com/sgtao/skill-websearch-slide-ja) — 元スキル（v0.7系）
- [React 公式ドキュメント](https://react.dev) — コンポーネント設計の参照
- [Vite 公式ドキュメント](https://vite.dev) — ビルド・開発サーバー設定
