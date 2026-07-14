---
title: markdown-format-ext.md
---
# Markdown Format Extensions — Studio拡張仕様（v0.2.0）

MD Slide Studio 独自のスライドMD拡張仕様。
移植元スキルの `markdown-format.md`（v0.7 系）は**変更せず**、拡張分をここに分離する。
基本仕様（frontmatter・区切り・既存14type・chart/diagramブロック）は元仕様を参照。

> v0.3 の SSOT リファクタで `src/schema/`（zod）からの自動生成に統合予定。
> それまでは本ファイルが拡張仕様の正とする。

---

## 1. 共通ヘッダ拡張（badge / lead / point）

全スライドtypeの本文で、**行頭（インデントなし）**に書ける3つのキー。

```markdown
<!-- slide: points -->
badge: WHY
## AIは、足りない情報を==勝手に補う==
lead: 見出しを補足するグレーの1行
- **リード**：説明
point: スライド下部の💡強調帯（==hl== 強調可）
```

| キー | 描画 | 備考 |
|---|---|---|
| `badge:` | 見出し左のピル（`.slide-badge`、accent地） | 工程番号（Step 1）や一言ラベル（WHY）に |
| `lead:` | 見出し直下のグレー1行（`.slide-lead`） | title では `subtitle:` と併存可（subtitle→lead の順に描画） |
| `point:` | スライド下部の帯（`.slide-point`、💡自動付与） | 既存の `>` ノート（控えめな補足）とは別物として併存 |

規則:

- 対象はコードフェンス外・行頭のキーのみ。feature-showcase 等の **YAML内（インデントあり）の同名キーは対象外**
- badge / lead は見出し（`##` / `#`）を持つtypeで有効。feature-showcase / comparison-chart（独自2カラム構造）では badge / lead は描画されない。**point は全typeで有効**
- 同一キーの重複は後勝ち（警告なし）
- 実装: `src/parser/slideHeader.ts`（純関数）→ `SlideBase.badge / lead / point`

---

## 2. ディレクティブ拡張: `tone: dark`

```markdown
<!-- slide: steps, tone: dark -->
```

- そのスライドだけ地色系のCSS変数を反転する（`section.slide` に `slide--dark` を付与）
- accent はパレット設定のダーク側の値に切り替わる（ocean → #58a6ff 等）
- 優先順位: **グローバルテーマ < スライドtone**（変数の継承近接性で成立、`!important` 不使用）
- 未知の tone 値は無視して既定表示（`layout:` と同じ前方互換方針・警告なし）
- 用途の目安: 強調したい1〜2枚のみ。多用すると反転の意味が薄れる

---

## 3. 新type: `steps`（カード型ステップフロー）

手順・プロセス・ワークフローを、アイコン・説明文つきカードの横フローで表現する。
図形ノードの流れは従来どおり `diagram-flow`、**内容カードの流れは `steps`** を使う。

### 3-1. 記法

````markdown
<!-- slide: steps -->
badge: Step 1
## デザインガイド生成
lead: ブランド情報をWeb検索 → カラー・フォント・レイアウトルールを自動整理
```steps
style: cards            # cards（上ボーダーカード・既定）/ circled（連番丸バッジ）
items:
  - icon: "🔍"          # 絵文字1文字を想定（任意）
    title: Claude が Web検索
    desc: ブランドカラー／フォント情報／ロゴ・トーン
  - icon: "✨"
    title: Claude が自動整理
  - icon: "🎨"
    title: design-guide.md 完成
    tone: outline       # 任意: dark（反転面）/ outline（枠線強調）
ratio:                  # 任意: セグメント比率帯＋凡例
  - { label: AI 自動, value: 60 }
  - { label: 手動, value: 40 }
```
point: このステップを飛ばすと、毎回バラバラなデザインになる
````

### 3-2. 規則・制約

| 項目 | 規則 |
|---|---|
| items 個数 | 2〜5個。6個以上は先頭5個を描画し警告。1個は警告（描画は継続） |
| style | `cards` / `circled`。未知値は cards にフォールバックし警告 |
| item.tone | `dark` / `outline`。未知値は無視し警告 |
| ratio | 任意。値合計で正規化して描画（合計≠100 は警告のみ）。0以下・非数値の項目はスキップ |
| 矢印 | カード間にCSSで自動挿入（MDには書かない） |
| 系統色 | カード上ボーダー／番号丸／ratio帯は `--chart-1〜5` を順繰りに割当（決定論・パレット追従） |
| 共存禁止 | グラフ・図解・画像との同一スライド共存禁止（既存規定を steps にも適用） |

### 3-3. 描画方式（設計判断）

HTML/CSS（flexbox）で組み、SVGは使わない。SVGの `<text>` は自動折返し不可のため、
アイコン＋複数行テキスト＋説明文のリッチなカードには不向き（feature-showcase で実証済み）。
これにより既存の `fit`（自動縮小）もそのまま効く。

### 3-4. 予約（v0.2.x 以降の拡張候補）

- items 要素のネスト配列（カードの縦積みグループ。参考画像「Step 2」の左2枚構成）
- `desc` の配列許容（カード内サブリスト）

---

## 4. AST 追加分（types.ts）

```ts
type SlideType = ... | 'steps';
type SlideTone = 'dark';
type StepStyle = 'cards' | 'circled';

interface StepItem { icon?: string; title: InlineText; desc?: InlineText; tone?: 'dark' | 'outline' }
interface StepRatioItem { label: string; value: number }

interface SlideBase {
  // 既存: type / fit / layout / warnings
  badge?: string;
  lead?: InlineText;
  point?: InlineText;
  tone?: SlideTone;
}

interface StepsSlide extends SlideBase {
  type: 'steps';
  heading?: InlineText;
  stepStyle: StepStyle;
  items: StepItem[];
  ratio?: StepRatioItem[];
  note?: InlineText;
}
```

YAMLブロックは意図的に**平坦な構造**で設計している（v0.3 zodスキーマへの機械的翻訳を容易にするため）。

---

## 5. CSS（steps.css）

v0.2.0 の新規スタイルは `src/theme/steps.css` に集約（main.tsx で最後に import）:

- §1 `.slide--dark` の変数上書き（＋パレット別 accent）
- §2 `.slide-title-row` / `.slide-badge` / `.slide-lead` / `.slide-point`
- §3 `.steps-flow` / `.steps-item`（cards/circled・dark/outline変種）/ `.steps-ratio*`

色はすべてCSS変数経由（§1 の変数定義自体を除きハードコード禁止）。
印刷（PDF）時は `print-color-adjust: exact` で帯・カード面の背景色を維持する。
