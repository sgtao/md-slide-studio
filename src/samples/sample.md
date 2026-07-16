---
title: MD Slide Studio デモ
palette: ocean
---
<!-- slide: title -->
# Markdownから、==スライドを生成する。==
subtitle: MD Slide Studio — 内容はMarkdownで書き、見た目はレンダラが決める
badges: [全16type網羅サンプル, React + TypeScript, websearch-slide-ja 移植]
---
<!-- slide: contrast -->
badge: WHY
## 「いい感じにして」は、==毎回ちがう答え==を返す
```contrast
example:
  title: 「この資料をスライドにして」とLLMに頼むと
  rows:
    - tag: 毎回変わる
      text: 見出しのサイズと余白 — 同じ原稿でも出力ごとに違う
    - tag: 毎回変わる
      text: 配色とグラフの目盛 — そのつど選び直される
    - tag: 直せない
      text: 3枚目だけ直したい — 作り直すと他の11枚も変わる
verdict:
  - { label: 強み, text: 一発でそれっぽい形にはなる }
  - { connector: ↓ でも }
  - { label: 弱点, text: 同じ結果に何度でも戻れない, tone: warn }
```
point: 資料は==一度作って終わりではない==。差し替えと修正が何度も起きる
---
<!-- slide: points -->
## だから、==役割を分ける==
lead: 内容は人が書き、見た目は機械が決める。この境界を引くのが MD Slide Studio
- **内容＝Markdown**：何を言うかだけを書く。HTMLは直接編集しない（MD＝唯一の情報源）
- **見た目＝レンダラ**：typeごとに座標もCSS変数も固定済み。同じMDからは常に同じスライド
- **AI＝下書きまで**：仕上がりの再現性は、AIに預けない
> 3原則 ─ MD＝唯一の情報源／落ちないパーサー／決定論的描画
point: このスライド自体が、左のエディタのMDから生成されています
---
<!-- slide: diagram-flow -->
## 「決定論的」の中身
lead: 変換パイプラインにLLMは登場しない。だから同じMDからは常に同じスライドが出る
```diagram
type: flow
nodes: ["スライドMD", "パーサー", "型付きAST", "レンダラ", "HTML / PDF / PNG"]
labels: ["人が書く", "落ちない", "判別共用体", "座標は固定", "そのまま共有"]
```
point: 未知の値は==警告してフォールバック==。原稿の途中でもプレビューは壊れない
---
<!-- slide: table -->
## 宣言的に書ける範囲＝16type
lead: 「どう描くか」ではなく「何のスライドか」を宣言する。描画はtypeが引き受ける
| type | 用途 | 記法 |
|---|---|---|
| title / points / summary | 表紙・箇条書き・まとめ | ` # ` / ` - ` / ` 1. ` |
| table | 比較表 | Markdownテーブル |
| chart-bar / line / donut | グラフ | ` ```chart ` ブロック |
| diagram-flow / layer / cycle / timeline | 図解・タイムライン | ` ```diagram ` ブロック |
| steps | 手順カードフロー | ` ```steps ` ブロック |
| contrast / comparison-chart | 対比・前後比較 | 専用ブロック |
| figure / feature-showcase / sources | 画像・機能紹介・出典 | 専用記法 |
> 全typeで `badge:` / `lead:` / `point:` と `tone: dark` が使えます（v0.2.0+）
---
<!-- slide: chart-bar, layout: side-list -->
## 何の時間が減るのか
lead: 12枚のデッキを1本仕上げるまでの所要時間（例示データ）
```chart
type: bar
title: デッキ1本あたりの作業時間（分）
data:
  - { label: 手作業, value: 120 }
  - { label: LLMに直接生成, value: 95 }
  - { label: MD Slide Studio, value: 45 }
source: { name: 例示データ, url: https://example.com }
```
### 測定の前提
- **共通条件**：12枚・グラフ2点・図解1点。原稿の骨子は用意済み
- **手作業**：スライドツールで作成。体裁の微調整を含む
- **LLMに直接生成**：出力の手直しと再生成の往復を含む
---
<!-- slide: comparison-chart -->
left:
  big: 75分
  big_unit: 短縮
  heading: 減ったのは、==体裁の時間==だけ。
  lead: 構成を考える時間は変わらない。機械化できるのは、考えたあとの工程（例示データ）。
  stats:
    - { num: 120分 → 45分, label: 1本あたり }
    - { num: 50分 → 0分, label: 体裁を整える }
```chart
type: comparison-donut
labels: { before: 手作業, after: MD Slide Studio }
center: { before: 120分, after: 45分 }
data:
  - { label: 構成を考える, before: 30, after: 30, class: neutral }
  - { label: 体裁を整える, before: 50, after: 0, class: 1 }
  - { label: 図表を作る, before: 30, after: 5, class: 4 }
  - { label: 修正対応, before: 10, after: 10, class: 3 }
source: { name: 例示データ, url: https://example.com }
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
<!-- slide: steps -->
badge: HOW
## 使い方は、==4ステップ==
lead: プロンプトを取得 → LLMに下書きさせる → 貼り付けて手直し → 書き出す
```steps
style: cards
items:
  - icon: "🤖"
    title: プロンプトを取得
    desc: 🤖ボタンで、仕様込みの定型プロンプトをコピー
  - icon: "💬"
    title: LLMに下書きさせる
    desc: テーマを差し替えるだけ。返ってくるのはスライドMD
  - icon: "📋"
    title: 貼り付けて手直し
    desc: 左のエディタに貼ると右が即更新。文言はMDで直す
  - icon: "📤"
    title: 書き出す
    desc: PDF・PNG・ZIP・単一HTMLで共有
    tone: outline
```
point: 直すのは常に==MDだけ==。HTMLに戻って直す作業は発生しない
---
<!-- slide: steps, tone: dark -->
## 人の判断は、==3割に集約される==
lead: 4ステップのうち、どこをAIが担い、どこに人の判断が残るか
```steps
style: circled
items:
  - { icon: "🤖", title: プロンプト取得 }
  - { icon: "💬", title: LLMが下書き }
  - { icon: "📋", title: 人が手直し }
  - { icon: "📤", title: エクスポート }
ratio:
  - { label: 定型・自動, value: 10 }
  - { label: AI 下書き, value: 50 }
  - { label: 人の判断, value: 30 }
  - { label: 自動, value: 10 }
```
point: 残る3割は「何を言うか」。==機械化しないと決めた領域==です
---
<!-- slide: diagram-timeline -->
## 記法は増える。既存のMDは動き続ける
lead: 後方互換を前提に、type・layoutを段階的に追加していきます
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
point: このロードマップ自体が ==diagram-timeline== で描かれています
---
<!-- slide: summary, layout: compact -->
## まとめ
1. **問題は「毎回ちがう」こと**：LLMに直接作らせると、同じ結果に戻れない
2. **だから役割を分ける**：内容＝Markdown／見た目＝決定論的レンダラ／AIは下書きまで
3. **減るのは体裁の時間**：考える時間は、人の手元に残る
> このデッキは、左のMDと右のスライドが1対1で対応しています。編集して確かめてください。
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
source: { name: 例示データ, url: https://example.com }
```
---
<!-- slide: chart-donut -->
## ドーナツグラフ（chart-donut）
lead: 構成比はYAMLデータから自動描画。系列は5つまで
```chart
type: donut
title: エクスポート形式の利用割合（例示データ）
unit: "%"
data:
  - { label: PDF,  value: 45 }
  - { label: PNG,  value: 30 }
  - { label: ZIP,  value: 15 }
  - { label: HTML, value: 10 }
source: { name: 例示データ, url: https://example.com }
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
<!-- slide: sources -->
## 出典・参考リンク
- [websearch-slide-ja スキル](https://github.com/) — 本アプリの移植元スキル（スライドMD仕様 v0.7）
- [MD Slide Studio リポジトリ](https://github.com/) — ソースコード・Issue はこちら
