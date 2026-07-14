---
title: MD Slide Studio デモ
palette: ocean
---
<!-- slide: title -->
# Markdownから、==スライドを生成する。==
subtitle: MD Slide Studio — スライドMD → HTML / PDF / PNG 変換デモ（全typeサンプル）
badges: [v0.2.1, React + TypeScript, websearch-slide-ja 移植]
---
<!-- slide: points -->
## このアプリでできること
- **即時プレビュー**：左のエディタでMDを編集すると、右のスライドが即座に更新される
- **16種のスライドtype**：タイトル・箇条書き・表・グラフ・図解・手順カード・タイムラインなどを宣言的に記述
- **決定論的な変換**：LLM変換と違い、同じMDからは常に同じスライドが生成される
- **エクスポート**：PDF（P）・PNG（Shift+S）・ZIP（Shift+P）・MD保存に対応
> このスライド自体がエディタ内のMDから生成されています。編集して試してください。
---
<!-- slide: summary -->
## 使い方 3ステップ
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
| diagram-flow / layer / cycle / timeline | 図解・タイムライン | ```diagram ブロック |
| steps | 手順カードフロー | ```steps ブロック |
| figure / feature-showcase / sources | 画像・機能紹介・出典 | 専用記法 |
> 全typeで共通ヘッダ `badge:` / `lead:` / `point:` とディレクティブ `tone: dark` が使えます
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
<!-- slide: chart-bar, layout: side-list -->
## 売上目標と達成の前提条件
```chart
type: bar
title: 売上目標推移（億円）
data:
  - { label: 1年目, value: 8 }
  - { label: 2年目, value: 18 }
  - { label: 3年目, value: 35 }
source: { name: 事業計画（例示データ）, url: https://example.com }
```
### 達成のための前提条件
- **1年目（8億円）**：P1法人向け500社、P2個人向け15,000台
- **2年目**：竹プラン（¥29,800）を売上構成比60%で維持
- **3年目（35億円）**：教育機関200校以上、海外展開開始
point: ==layout: side-list== でグラフ左＋テキスト右の2カラム表示
---
<!-- slide: steps -->
badge: Step 1
## カード型ステップフロー（steps）
lead: 手順・プロセス・ワークフローをアイコン付きカードの流れで表現する
```steps
style: cards
items:
  - icon: "🔍"
    title: Claude が Web検索
    desc: ブランドカラー／フォント情報／ロゴ・トーン
  - icon: "✨"
    title: Claude が自動整理
    desc: カラーパレット／フォント指定／レイアウトルール
  - icon: "🎨"
    title: design-guide.md 完成
    tone: outline
```
point: ==badge / lead / point== は全typeで使える共通ヘッダ拡張です
---
<!-- slide: diagram-timeline -->
## 開発マイルストーン
```diagram
type: timeline
start: Start
milestones:
  - { label: 要件定義, when: 1月 }
  - { label: 設計・実装, when: 2〜3月 }
  - { label: β公開, when: 4月 }
  - { label: 正式リリース, when: 6月 }
```
> マイルストーンは上下交互に自動配置されます（2〜6個対応）
---
<!-- slide: diagram-flow -->
## 変換パイプライン
```diagram
type: flow
nodes: ["スライドMD", "パーサー", "React AST", "レンダラ", "PDF / PNG"]
labels: ["", "parseSlideMarkdown", "型付きSlide[]", "SVG含む", "エクスポート"]
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
  - { label: Google Drive, before: 326, after: 128, class: 1 }
  - { label: 動画素材, before: 98, after: 80, class: 4 }
  - { label: デスクトップ, before: 61, after: 61, class: 3 }
  - { label: 空き, before: 321, after: 546, class: neutral }
source: { name: 計測メモ（例）, url: https://example.com }
```
---
<!-- slide: sources -->
## 出典・参考リンク
- [websearch-slide-ja スキル](https://github.com/) — 本アプリの移植元スキル（スライドMD仕様 v0.7）
- [MD Slide Studio リポジトリ](https://github.com/) — ソースコード・Issue はこちら
