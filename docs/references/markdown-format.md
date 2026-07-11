---
title: markdown-format.md
source: https://github.com/sgtao/skill-websearch-slide-ja
---
# Markdown Format — スライドMD仕様（v0.7.0）

スライドの中間表現である Markdown（スライドMD）の仕様。
**MD が Single Source of Truth（正）であり、HTML は MD から毎回フル再生成する。**
変換は LLM が行う（スクリプト化しない）。そのため再生成のたびに
細部のデザイン（余白・座標・文言の細かい調整）が揺れうる。この揺れは仕様である。

Step 4-A（MD生成）・Step 4-B（MD→HTML変換）・逆抽出（HTML→MD）で参照すること。

---

## 1. ファイル構造

```markdown
---
title: デッキタイトル
palette: ocean
---
<!-- slide: title -->
（1枚目の内容）
---
<!-- slide: points -->
（2枚目の内容）
```

- 先頭に **frontmatter**（YAML）、以降は `---` 区切りでスライドを並べる
- **区切り規則**: 行全体が `---` のみの行をスライド区切りとする。
  ただし frontmatter 内・コードフェンス（``` 〜 ```）内の `---` は区切りとみなさない
- 各スライドの先頭行は **スライドディレクティブ**（HTMLコメント）

### frontmatter キー

| キー | 必須 | 値 | 説明 |
|---|---|---|---|
| `title` | ✅ | 文字列 | `<title>` とファイル名の元。HTML では `{title} | Slides` になる |
| `palette` | — | ocean / forest / sunset / plum / graphite | 初期パレット。省略時 ocean。不正値は ocean 扱い |
| `purpose` | — | self-study / team-share / outreach | 作成目的。省略時は目的未選択扱い（`audience-purpose.md` の中庸トーン） |

`palette` を指定した場合、変換時に `<html data-palette="...">` として焼き込み、
ドロップダウンの該当ボタンに `is-active` を付ける。
**優先順位**: 初回表示は frontmatter（焼き込み値）、ユーザーがパレットを操作した後は
そのデッキの localStorage 保存値が優先（palette-toggle.js v0.7.0 のデッキ別キーで実現）。

---

## 2. スライドディレクティブ

```markdown
<!-- slide: <type>[, fit] -->
```

- `<type>`: 下表のレイアウト種別（`slide-layouts.md` の型と1対1対応）
- `, fit`: 内容量が多いスライドに `slide-fit`（自動縮小）を付ける
- `layout:` キーは 使用予定の予約語（例: `<!-- slide: points, layout: two-col -->`）。
  v0.7.0 では無視してよいが、エラーにしない

### type 一覧

| type | 対応レイアウト | 本文の記法 |
|---|---|---|
| `title` | タイトル | §3-1 |
| `points` | 箇条書き（アイコン/太字リード） | §3-2 |
| `summary` | まとめ（番号付き） | §3-3 |
| `table` | 比較表 | §3-4 |
| `chart-bar` / `chart-line` / `chart-donut` | 各グラフ | §4 `chart` ブロック |
| `comparison-chart` | Before/After ドーナツ×2 | §4-2 |
| `diagram-flow` / `diagram-layer` / `diagram-cycle` | 図解 | §5 `diagram` / `mermaid` ブロック |
| `figure` | 画像＋出典 | §3-5 |
| `feature-showcase` | 左ライト/右ダーク 2カラム | §3-6 |
| `sources` | 出典・参考リンク（最終スライド必須） | §3-7 |

---

## 3. 各 type の記法

### 3-1. title

```markdown
<!-- slide: title -->
# React / Vue / Svelte / Solid を、==どう選ぶ？==
subtitle: 主要フレームワーク徹底比較（2026年版）
badges: [2026年版, SO Survey 2024]
```

- `#` 見出し1行（必須）。`subtitle:` / `badges:` は任意
- **強調記法** `==テキスト==` → `<span class="hl">`（accent色・全typeで使用可）

### 3-2. points

```markdown
<!-- slide: points -->
## 「どれが一番か」より「どの軸で選ぶか」
- **普及度**：使用率、求人・エコシステムの厚み
- **開発体験**：学習曲線、満足度
> 補足ノート（任意。.note として描画）
```

- `## 見出し` ＋ `- **リード**：説明` の箇条書き。ネストは2段まで
- 末尾の `>` 引用行は補足ノート（`.note`）に変換

### 3-3. summary

`points` と同じ記法で、`1.` 番号付きリストを使う。番号丸バッジ付きで描画。

### 3-4. table

`## 見出し` ＋ 標準の Markdown テーブル。列数は5列以下推奨。

### 3-5. figure

```markdown
<!-- slide: figure -->
## 見出し
![画像の説明（alt）](https://example.com/image.png)
source: [出典サイト名](https://example.com/article)
```

- 画像URLは `image-embedding.md` の判断フロー（**非画像拡張子の除外を含む**）を必ず通す
- `source:` 行は必須（figcaption に変換）

### 3-6. feature-showcase

```markdown
<!-- slide: feature-showcase -->
left:
  eyebrow: FEATURE
  heading: 自分の作業手順を、==スキル化する。==
  lead: よく使う手順をスキルとして定義しておくと、同じ品質で呼び出せる。
right:
  num: "02"
  eyebrow: SKILL
  heading: スキル自作
  sub: ~/.claude/skills/ に定義して呼び出す。
  items:
    - label: PR レビュー
      desc: 観点を固定して自動チェック
    - label: バグ調査
      desc: 再現→原因→修正案を定型化
```

### 3-7. sources

```markdown
<!-- slide: sources -->
## 出典・参考リンク
- [記事タイトル｜サイト名](https://...) — 補足説明
- [レポート名](https://...)
```

---

## 4. グラフ：`chart` ブロック（データ記述・推奨）

**データ記述ブロックを第一選択**とする。座標は書かない
（変換時に `chart-generation.md` の既定座標テーブルへ流し込む。LLM は座標計算しない）。

### 4-1. 単一グラフ（bar / line / donut）

````markdown
<!-- slide: chart-donut -->
## 見出し
```chart
type: donut
title: フレームワーク使用率
unit: "%"
data:
  - { label: React,  value: 45 }
  - { label: Vue,    value: 30 }
  - { label: Svelte, value: 15 }
  - { label: その他, value: 10 }
source: { name: SO Survey 2024, url: https://survey.stackoverflow.co/2024 }
```
````

- 系列は最大5。数値は必ず出典に基づく実数値（推定値の捏造は禁止＝現行ルール踏襲）
- `source` は必須（SVG右下に描画）

### 4-2. comparison-chart（Before/After ドーナツ×2）

````markdown
<!-- slide: comparison-chart -->
left:
  big: 225GB
  big_unit: 解放
  heading: 空き容量が ==321GB → 546GB== へ。
  lead: 整理前は605GB使用。整理後は380GBまで削減。
  stats:
    - { num: 65% → 41%, label: 使用率 }
    - { num: 926GB,     label: SSD }
```chart
type: comparison-donut
labels: { before: Before, after: After }
center: { before: 605GB, after: 380GB }
data:
  - { label: Google Drive, before: 326, after: 128, class: 1 }
  - { label: FCP Movies,   before: 98,  after: 80,  class: 4 }
  - { label: Desktop,      before: 61,  after: 61,  class: 3 }
  - { label: 空き,         before: 321, after: 546, class: neutral }
source: { name: 計測メモ, url: https://... }
```
````

- **1スライド1グラフ制約の例外**は comparison-chart のみ（既存規定どおり）
- 座標は chart-generation.md「comparison-chart（2ドーナツ）座標テーブル」を使用

---

## 5. 図解：`diagram` ブロック優先・`mermaid` サブセット可

### 5-1. `diagram` ブロック（推奨）

````markdown
<!-- slide: diagram-flow -->
## 見出し
```diagram
type: flow            # flow | layer | cycle
nodes: [入力, 前処理, 推論, 出力]
labels: ["", 正規化, LLM, ""]   # 任意（ノード下の補足）
```
````

- `flow`: ノード5以下 / `layer`: 4層以下 / `cycle`: ノード4以下（既存の固定座標テーブル準拠）

### 5-2. `mermaid` ブロック（サブセット限定）

````markdown
```mermaid
graph LR
  A[入力] --> B[前処理] --> C[推論] --> D[出力]
```
````

**対応サブセットと変換先**（この表にない記法は受け付けない）:

| Mermaid 記法 | 変換先 | 条件 |
|---|---|---|
| `graph LR`（直線・分岐なし） | 横フロー図 | ノード5以下 |
| `graph TD`（直線・分岐なし） | レイヤー図 | 4層以下 |
| `graph LR/TD` で末尾→先頭に戻る循環 | サイクル図 | ノード4以下 |

**対応外**（分岐・合流・subgraph・sequenceDiagram・classDiagram 等）の場合：
**表またはテキストにフォールバック**し、変換前にその旨をユーザーへ通知する。

**変換の絶対規則**:
- 変換結果は**インラインSVG**。`mermaid.js` 等の外部ライブラリを最終HTMLに含めることは**いかなる場合も禁止**（validator が機械検出する）
- SVG marker の id はスライド番号スコープ（`arrow-s3` 等）の既存規則を維持

---

## 6. 変換規則（MD → HTML / Step 4-B）

1. base-template を土台に、CSS/JS を SKILL.md の統合順（SSoT）どおり統合する（現行 Step 4 と同一）
2. frontmatter `palette` があれば `<html data-palette="...">` を焼き込み、
   ドロップダウンの該当ボタンへ `is-active` を移す
3. 各スライドをディレクティブの type に従い `slide-layouts.md` の雛形へ流し込む
4. `==...==` → `<span class="hl">`、`**リード**：` → 既存の太字リード形式
5. `chart` / `diagram` ブロックは既定座標テーブルへ流し込む
6. 生成後、既存チェックリスト＋`validate-output.sh` の運用は現行どおり

## 7. 逆抽出規則（HTML → MD）

旧デッキ等「HTMLしかない」場合は、HTML から MD を逆抽出できる。

- `<section class="slide ...">` の class・構造から type を推定してディレクティブ化
- テキスト・リスト・表・出典リンクはそのまま MD へ
- グラフは SVG 内の数値ラベル・凡例から `chart` ブロックを復元（読み取れない値は復元しない）
- `<span class="hl">` → `==...==`
- **限界（ユーザーへ明示すること）**: デッキ固有のカスタムCSS・微調整は MD に持ち越せない。
  逆抽出→再変換した HTML は元と完全一致しない

## 8. 制約まとめ

- 1スライド1グラフ（comparison-chart のみ例外）／グラフ・図解・画像の共存禁止（現行どおり）
- スライド枚数は 3〜12 枚（validator 準拠）
- 最終スライドは `sources`（出典）で終える
- MD 内に生の `<script>` / `<style>` を書くことは禁止（変換時に無視する）
