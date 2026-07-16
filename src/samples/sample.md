---
title: MD Slide Studio デモ
palette: ocean
---
<!-- slide: title -->
# Markdownから、==スライドを生成する。==
subtitle: MD Slide Studio — スライドMD → HTML / PDF / PNG 変換デモ（全typeサンプル）
badges: [全16type網羅サンプル, React + TypeScript, websearch-slide-ja 移植]
---
<!-- slide: points -->
## このアプリでできること
- **即時プレビュー**：左のエディタでMDを編集すると、右のスライドが即座に更新される
- **16種のスライドtype**：タイトル・箇条書き・表・グラフ・図解・手順カード・タイムラインなどを宣言的に記述
- **決定論的な変換**：LLM変換と違い、同じMDからは常に同じスライドが生成される
- **エクスポート**：PDF（P）・PNG（Shift+S）・ZIP（Shift+P）・MD保存に対応
> このスライド自体がエディタ内のMDから生成されています。編集して試してください。
---
<!-- slide: table -->
## 対応スライドtype一覧
| type | 用途 | 記法 |
|---|---|---|
| title / points / summary | 表紙・箇条書き・まとめ | ` # ` / ` - ` / ` 1. ` |
| table | 比較表 | Markdownテーブル |
| chart-bar / line / donut | グラフ | ` ```chart ` ブロック |
| diagram-flow / layer / cycle / ==timeline== | 図解・タイムライン | ` ```diagram ` ブロック |
| ==steps== | 手順カードフロー | ` ```steps ` ブロック |
| figure / feature-showcase / sources | 画像・機能紹介・出典 | 専用記法 |
| comparison-chart / ==contrast== | 比較・対比構造 | 専用記法 |
> 全typeで `badge:` / `lead:` / `point:` と `tone: dark` が使えます（v0.2.0+）
---
<!-- slide: chart-bar, layout: side-list -->
## 売上目標と達成の前提条件
lead: layout: side-list — グラフ左60%＋テキストパネル右40% の2カラム表示（v0.2.1）
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
point: ==badge / lead / point== は全typeで使える共通ヘッダ拡張です（v0.2.0）
---
<!-- slide: steps, tone: dark -->
## 番号丸スタイル ＋ 比率帯 ＋ tone: dark
lead: ディレクティブに tone: dark を付けると、このスライドだけ地色を反転できる
```steps
style: circled
items:
  - { icon: "🔍", title: デザインガイド生成 }
  - { icon: "📄", title: スライド一括生成 }
  - { icon: "💬", title: Connector で修正 }
  - { icon: "✋", title: 手動仕上げ }
ratio:
  - { label: AI 自動, value: 30 }
  - { label: AI 自動, value: 30 }
  - { label: AI + 指示, value: 30 }
  - { label: 手動 10%, value: 10 }
```
---
<!-- slide: diagram-timeline -->
## MD Slide Studio 開発ロードマップ
lead: マイルストーンは上下交互に自動配置されます（2〜6個対応）
```diagram
type: timeline
start: v0.1
milestones:
  - { label: 共通ヘッダ・steps, when: v0.2.0 }
  - { label: timeline・side-list, when: v0.2.1 }
  - { label: contrast・split-image, when: v0.2.2 }
  - { label: Zod SSOT化, when: v0.3 }
  - { label: AI下書き支援, when: v0.4 }
  - { label: PPTX出力, when: v0.7 }
```
point: このデモ自体が ==diagram-timeline== で描かれています
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
<!-- slide: contrast -->
badge: WHY
## AIは、足りない情報を==勝手に補う==
```contrast
example:
  title: 「タスク管理アプリを作って」
  rows:
    - { tag: AIの推測, text: ログイン → たぶん必要だろう }
verdict:
  - { label: 強み, text: それっぽく作れる }
  - { connector: ↓ でも }
  - { label: 弱点, text: 意図と合うとは限らない, tone: warn }
```
---
<!-- slide: title, layout: split-image, tone: dark -->
# 参考｜==記法リファレンス==
subtitle: ここから先は、残りのtype・layoutバリアントの記法サンプルです
image: https://upload.wikimedia.org/wikipedia/commons/c/c3/Chrysanthemum01s3872.jpg
---
<!-- slide: chart-line -->
## 折れ線グラフ（chart-line）
```chart
type: line
title: 月次アクティブユーザー数（例示データ）
unit: 人
data:
  - { label: 1月, value: 120 }
  - { label: 2月, value: 180 }
  - { label: 3月, value: 260 }
  - { label: 4月, value: 340 }
source: { name: 社内ダッシュボード（例）, url: https://example.com }
```
---
<!-- slide: diagram-layer -->
## レイヤー図（diagram-layer）
```diagram
type: layer
nodes: [[プレゼンテーション層], [アプリケーション層], [データアクセス層], [データベース]]
```
---
<!-- slide: diagram-cycle -->
## サイクル図（diagram-cycle）
```diagram
type: cycle
nodes: [計画, 実装, 計測, 改善]
```
---
<!-- slide: figure -->
## 図版と出典（figure）
![image](https://upload.wikimedia.org/wikipedia/commons/c/c3/Chrysanthemum01s3872.jpg)
source: [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Chrysanthemum01s3872.jpg)
---
<!-- slide: summary, layout: compact -->
## まとめ
1. **MDが唯一の情報源**：HTMLを直接編集しない
2. **崩れないパーサー**：未知の値も警告付きでフォールバックする
3. **PDF/PNG/ZIPでそのまま共有**：エクスポートまで一貫している
---
<!-- slide: sources -->
## 出典・参考リンク
- [websearch-slide-ja スキル](https://github.com/) — 本アプリの移植元スキル（スライドMD仕様 v0.7）
- [MD Slide Studio リポジトリ](https://github.com/) — ソースコード・Issue はこちら
