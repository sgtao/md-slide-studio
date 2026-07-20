/**
 * slideTemplates.ts — テンプレート挿入機能で使うスライドMDスニペット集。
 * 内容は sample.md（v0.2.5統合版）・types.ts（v0.2.3拡張）の記法と同期させている。
 * 全17 typeを網羅し、バリエーションのあるtype（title / steps / chart-bar）は
 * 複数テンプレートとして登録する。
 */
export interface SlideTemplate {
  id: string;
  label: string;
  category: 'basic' | 'chart' | 'diagram' | 'showcase';
  snippet: string;
}

export const SLIDE_TEMPLATES: SlideTemplate[] = [
  // ─── basic ───
  {
    id: 'title',
    label: 'タイトル',
    category: 'basic',
    snippet: `<!-- slide: title -->
# 見出し
subtitle: サブタイトル
badges: [tag1, tag2]`,
  },
  {
    id: 'title-split-image',
    label: 'タイトル（split-image）',
    category: 'basic',
    snippet: `<!-- slide: title, layout: split-image, tone: dark -->
# 見出し
subtitle: サブタイトル
image: https://example.com/hero.jpg`,
  },
  {
    id: 'points',
    label: '箇条書き（points）',
    category: 'basic',
    snippet: `<!-- slide: points -->
## 見出し
badge: LABEL
- **リード1**：説明
- **リード2**：説明
point: 要点`,
  },
  {
    id: 'summary',
    label: 'まとめ（summary）',
    category: 'basic',
    snippet: `<!-- slide: summary, layout: compact -->
## まとめ
1. 要点1
2. 要点2`,
  },
  {
    id: 'table',
    label: 'テーブル',
    category: 'basic',
    snippet: `<!-- slide: table -->
## 見出し
| 項目 | A | B |
|---|---|---|
| 行1 | 値 | 値 |`,
  },
  {
    id: 'figure',
    label: '画像（figure）',
    category: 'basic',
    snippet: `<!-- slide: figure -->
![alt](https://example.com/image.jpg)
source: [出典名](https://example.com)`,
  },
  {
    id: 'sources',
    label: '出典（sources）',
    category: 'basic',
    snippet: `<!-- slide: sources -->
## 出典
- [タイトル](https://example.com) — 補足`,
  },

  // ─── chart ───
  {
    id: 'chart-bar',
    label: '棒グラフ',
    category: 'chart',
    snippet: `<!-- slide: chart-bar -->
## 見出し
\`\`\`chart
type: bar
title: グラフタイトル
unit: 単位
data:
  - { label: A, value: 10 }
  - { label: B, value: 20 }
source: { name: 出典名, url: https://example.com }
\`\`\``,
  },
  {
    id: 'chart-bar-side-list',
    label: '棒グラフ（side-list）',
    category: 'chart',
    snippet: `<!-- slide: chart-bar, layout: side-list -->
## 見出し
\`\`\`chart
type: bar
title: グラフタイトル
data:
  - { label: A, value: 10 }
  - { label: B, value: 20 }
source: { name: 出典名, url: https://example.com }
\`\`\`
### 前提条件
- 補足項目1
- 補足項目2`,
  },
  {
    id: 'chart-line',
    label: '折れ線グラフ',
    category: 'chart',
    snippet: `<!-- slide: chart-line -->
## 見出し
\`\`\`chart
type: line
title: グラフタイトル
unit: 単位
data:
  - { label: 2024, value: 10 }
  - { label: 2025, value: 20 }
source: { name: 出典名, url: https://example.com }
\`\`\``,
  },
  {
    id: 'chart-donut',
    label: 'ドーナツグラフ',
    category: 'chart',
    snippet: `<!-- slide: chart-donut -->
## 見出し
\`\`\`chart
type: donut
title: グラフタイトル
unit: "%"
data:
  - { label: A, value: 60 }
  - { label: B, value: 40 }
source: { name: 出典名, url: https://example.com }
\`\`\``,
  },
  {
    id: 'comparison-chart',
    label: '前後比較（comparison-chart）',
    category: 'chart',
    snippet: `<!-- slide: comparison-chart -->
left:
  big: 75%
  big_unit: 短縮
  heading: 見出し
  lead: リード文
  stats:
    - { num: 120分 → 45分, label: 項目1 }
    - { num: 50分 → 0分, label: 項目2 }
\`\`\`chart
type: comparison-donut
labels: { before: 施策前, after: 施策後 }
center: { before: 120分, after: 45分 }
data:
  - { label: 項目A, before: 30, after: 30, class: neutral }
  - { label: 項目B, before: 50, after: 0, class: "1" }
source: { name: 出典名, url: https://example.com }
\`\`\``,
  },

  // ─── diagram ───
  {
    id: 'diagram-flow',
    label: 'フロー図',
    category: 'diagram',
    snippet: `<!-- slide: diagram-flow -->
\`\`\`diagram
type: flow
nodes: [ステップ1, ステップ2, ステップ3]
\`\`\``,
  },
  {
    id: 'diagram-layer',
    label: 'レイヤー図',
    category: 'diagram',
    snippet: `<!-- slide: diagram-layer -->
\`\`\`diagram
type: layer
nodes: [[上位層], [中位層], [下位層]]
\`\`\``,
  },
  {
    id: 'diagram-cycle',
    label: 'サイクル図',
    category: 'diagram',
    snippet: `<!-- slide: diagram-cycle -->
\`\`\`diagram
type: cycle
nodes: [計画, 実行, 検証, 改善]
\`\`\``,
  },
  {
    id: 'diagram-timeline',
    label: 'タイムライン',
    category: 'diagram',
    snippet: `<!-- slide: diagram-timeline -->
\`\`\`diagram
type: timeline
start: v0.1
milestones:
  - { label: マイルストーン1, when: v0.2 }
  - { label: マイルストーン2, when: v0.3 }
\`\`\``,
  },
  {
    id: 'steps-cards',
    label: 'ステップ（cards）',
    category: 'diagram',
    snippet: `<!-- slide: steps -->
## 見出し
\`\`\`steps
style: cards
items:
  - { icon: "📝", title: ステップ1, desc: 説明 }
  - { icon: "👀", title: ステップ2, desc: 説明 }
\`\`\``,
  },
  {
    id: 'steps-circled',
    label: 'ステップ（circled）',
    category: 'diagram',
    snippet: `<!-- slide: steps, tone: dark -->
\`\`\`steps
style: circled
items:
  - { title: ステップ1 }
  - { title: ステップ2 }
\`\`\``,
  },

  // ─── showcase ───
  {
    id: 'contrast',
    label: '対比（contrast）',
    category: 'showcase',
    snippet: `<!-- slide: contrast -->
badge: WHY
## 見出し
\`\`\`contrast
example:
  title: 例のタイトル
  rows:
    - { tag: タグ, text: テキスト }
verdict:
  - { label: 強み, text: テキスト }
  - { connector: ↓ でも }
  - { label: 弱点, text: テキスト, tone: warn }
\`\`\``,
  },
  {
    id: 'feature-showcase',
    label: '機能紹介（feature-showcase）',
    category: 'showcase',
    snippet: `<!-- slide: feature-showcase -->
left:
  eyebrow: WHY
  heading: 見出し
  lead: リード文
right:
  num: "01"
  eyebrow: WHAT
  heading: 見出し
  items:
    - label: 項目1
      desc: 説明`,
  },
];
