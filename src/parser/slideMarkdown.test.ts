import { describe, expect, it } from 'vitest';
import { parseSlideMarkdown, parseDirective, parseMermaidSubset } from './slideMarkdown';
import type {
  ChartSlide,
  ComparisonChartSlide,
  DiagramSlide,
  PointsSlide,
  SourcesSlide,
  TableSlide,
  TitleSlide,
} from './types';

const fm = (body: string, palette = 'ocean') =>
  `---\ntitle: テスト\npalette: ${palette}\n---\n${body}`;

describe('frontmatter', () => {
  it('title / palette を読む', () => {
    const deck = parseSlideMarkdown(fm('<!-- slide: title -->\n# A', 'plum'));
    expect(deck.frontmatter.title).toBe('テスト');
    expect(deck.frontmatter.palette).toBe('plum');
  });
  it('不正 palette は ocean にフォールバックし警告する', () => {
    const deck = parseSlideMarkdown(fm('<!-- slide: title -->\n# A', 'neon'));
    expect(deck.frontmatter.palette).toBe('ocean');
    expect(deck.warnings.some((w) => w.includes('neon'))).toBe(true);
  });
  it('frontmatter なしでも落ちない', () => {
    const deck = parseSlideMarkdown('<!-- slide: title -->\n# A');
    expect(deck.frontmatter.title).toBe('Untitled');
    expect(deck.slides).toHaveLength(1);
  });
});

describe('スライド区切り', () => {
  it('--- で分割し、コードフェンス内の --- は無視する', () => {
    const md = fm(
      '<!-- slide: points -->\n## A\n- x\n```chart\ntype: bar\n---\n```\n---\n<!-- slide: points -->\n## B\n- y',
    );
    const deck = parseSlideMarkdown(md);
    expect(deck.slides).toHaveLength(2);
  });
});

describe('directive', () => {
  it('type / fit / layout を読む', () => {
    const d = parseDirective('<!-- slide: points, fit, layout: two-col -->')!;
    expect(d.type).toBe('points');
    expect(d.fit).toBe(true);
    expect(d.layout).toBe('two-col');
  });
  it('未知 layout は無視（エラーにしない）', () => {
    const d = parseDirective('<!-- slide: points, layout: mystery -->')!;
    expect(d.layout).toBeUndefined();
    expect(d.warnings).toHaveLength(0);
  });
  it('未知 type は points 扱いで警告', () => {
    const d = parseDirective('<!-- slide: hologram -->')!;
    expect(d.type).toBe('points');
    expect(d.warnings.length).toBeGreaterThan(0);
  });
});

describe('title', () => {
  it('heading / subtitle / badges を読む', () => {
    const deck = parseSlideMarkdown(
      fm('<!-- slide: title -->\n# ==大==見出し\nsubtitle: サブ\nbadges: [A, B]'),
    );
    const s = deck.slides[0] as TitleSlide;
    expect(s.heading).toBe('==大==見出し');
    expect(s.subtitle).toBe('サブ');
    expect(s.badges).toEqual(['A', 'B']);
  });
});

describe('points / summary', () => {
  it('リード付き箇条書きとノートを読む', () => {
    const md = fm(
      '<!-- slide: points -->\n## 見出し\n- **普及度**：使用率\n- 無リード項目\n  - 子項目\n> 補足',
    );
    const s = parseSlideMarkdown(md).slides[0] as PointsSlide;
    expect(s.heading).toBe('見出し');
    expect(s.items[0].lead).toBe('普及度');
    expect(s.items[0].text).toBe('使用率');
    expect(s.items[1].children).toHaveLength(1);
    expect(s.note).toBe('補足');
  });
});

describe('table', () => {
  it('Markdownテーブルを読む', () => {
    const md = fm('<!-- slide: table -->\n## 比較\n| a | b |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |');
    const s = parseSlideMarkdown(md).slides[0] as TableSlide;
    expect(s.header).toEqual(['a', 'b']);
    expect(s.rows).toEqual([
      ['1', '2'],
      ['3', '4'],
    ]);
  });
});

describe('chart', () => {
  const chartMd = fm(`<!-- slide: chart-donut -->
## 見出し
\`\`\`chart
type: donut
title: 使用率
unit: "%"
data:
  - { label: React, value: 45 }
  - { label: Vue, value: 30 }
  - { label: Svelte, value: 25 }
source: { name: SO Survey, url: https://example.com }
\`\`\``);

  it('chart ブロック（YAMLフローマップ）を読む', () => {
    const s = parseSlideMarkdown(chartMd).slides[0] as ChartSlide;
    expect(s.chart?.type).toBe('donut');
    expect(s.chart?.data).toHaveLength(3);
    expect(s.chart?.data[0]).toEqual({ label: 'React', value: 45 });
    expect(s.chart?.source.name).toBe('SO Survey');
  });
  it('source 欠落は警告し「出典未記載」とする', () => {
    const md = fm(
      '<!-- slide: chart-bar -->\n```chart\ntype: bar\ntitle: t\ndata:\n  - { label: a, value: 1 }\n```',
    );
    const s = parseSlideMarkdown(md).slides[0] as ChartSlide;
    expect(s.chart?.source.name).toBe('出典未記載');
    expect(s.warnings.some((w) => w.includes('source'))).toBe(true);
  });
  it('6系列以上は5件に切り捨てて警告', () => {
    const data = Array.from({ length: 7 }, (_, i) => `  - { label: L${i}, value: ${i + 1} }`).join(
      '\n',
    );
    const md = fm(
      `<!-- slide: chart-bar -->\n\`\`\`chart\ntype: bar\ntitle: t\ndata:\n${data}\nsource: { name: s }\n\`\`\``,
    );
    const s = parseSlideMarkdown(md).slides[0] as ChartSlide;
    expect(s.chart?.data).toHaveLength(5);
    expect(s.warnings.some((w) => w.includes('系列'))).toBe(true);
  });
});

describe('comparison-chart', () => {
  it('left パネルと comparison-donut を読む', () => {
    const md = fm(`<!-- slide: comparison-chart -->
left:
  big: 225GB
  big_unit: 解放
  heading: 空きが ==増えた==
  stats:
    - { num: 65% → 41%, label: 使用率 }
\`\`\`chart
type: comparison-donut
labels: { before: Before, after: After }
center: { before: 605GB, after: 380GB }
data:
  - { label: Drive, before: 326, after: 128, class: 1 }
  - { label: 空き, before: 321, after: 546, class: neutral }
source: { name: 計測メモ }
\`\`\``);
    const s = parseSlideMarkdown(md).slides[0] as ComparisonChartSlide;
    expect(s.left.big).toBe('225GB');
    expect(s.left.stats[0].label).toBe('使用率');
    expect(s.chart?.data).toHaveLength(2);
    expect(s.chart?.data[1].class).toBe('neutral');
    expect(s.chart?.center.after).toBe('380GB');
  });
});

describe('diagram', () => {
  it('diagram ブロック（flow）を読む', () => {
    const md = fm(
      '<!-- slide: diagram-flow -->\n## 流れ\n```diagram\ntype: flow\nnodes: [入力, 前処理, 推論, 出力]\nlabels: ["", 正規化, LLM, ""]\n```',
    );
    const s = parseSlideMarkdown(md).slides[0] as DiagramSlide;
    expect(s.diagram?.type).toBe('flow');
    expect(s.diagram?.nodes).toEqual(['入力', '前処理', '推論', '出力']);
    expect(s.diagram?.labels?.[1]).toBe('正規化');
  });
  it('flow のノード6以上は5に切り捨てて警告', () => {
    const md = fm(
      '<!-- slide: diagram-flow -->\n```diagram\ntype: flow\nnodes: [a, b, c, d, e, f]\n```',
    );
    const s = parseSlideMarkdown(md).slides[0] as DiagramSlide;
    expect(s.diagram?.nodes).toHaveLength(5);
    expect(s.warnings.some((w) => w.includes('上限'))).toBe(true);
  });
});

describe('mermaid サブセット', () => {
  it('graph LR の直線チェーンをフロー図に変換する', () => {
    const d = parseMermaidSubset('graph LR\n  A[入力] --> B[前処理] --> C[推論] --> D[出力]', []);
    expect(d?.type).toBe('flow');
    expect(d?.nodes).toEqual(['入力', '前処理', '推論', '出力']);
  });
  it('graph TD はレイヤー図に変換する', () => {
    const d = parseMermaidSubset('graph TD\n  A[UI] --> B[API] --> C[DB]', []);
    expect(d?.type).toBe('layer');
    expect(d?.nodes).toEqual(['UI', 'API', 'DB']);
  });
  it('循環はサイクル図に変換する', () => {
    const d = parseMermaidSubset('graph LR\n  A[計画] --> B[実行]\n  B --> C[評価]\n  C --> A', []);
    expect(d?.type).toBe('cycle');
    expect(d?.nodes).toEqual(['計画', '実行', '評価']);
  });
  it('分岐は対応外として null + 警告', () => {
    const warnings: string[] = [];
    const d = parseMermaidSubset('graph LR\n  A --> B\n  A --> C', warnings);
    expect(d).toBeNull();
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe('figure / sources / feature-showcase', () => {
  it('figure の画像と出典を読み、source 欠落を警告する', () => {
    const md = fm(
      '<!-- slide: figure -->\n## 図\n![説明](https://example.com/a.png)\nsource: [出典](https://example.com)',
    );
    const deck = parseSlideMarkdown(md);
    const s = deck.slides[0];
    expect(s.type).toBe('figure');
    if (s.type === 'figure') {
      expect(s.url).toBe('https://example.com/a.png');
      expect(s.source?.label).toBe('出典');
    }
  });
  it('sources のリンクと補足を読む', () => {
    const md = fm(
      '<!-- slide: sources -->\n## 出典\n- [記事A](https://a.example) — 補足あり\n- [記事B](https://b.example)',
    );
    const s = parseSlideMarkdown(md).slides[0] as SourcesSlide;
    expect(s.links).toHaveLength(2);
    expect(s.links[0].note).toBe('補足あり');
    expect(s.links[1].note).toBeUndefined();
  });
  it('feature-showcase の left/right を読む', () => {
    const md = fm(`<!-- slide: feature-showcase -->
left:
  eyebrow: FEATURE
  heading: 手順を==スキル化==
right:
  num: "02"
  heading: スキル自作
  items:
    - label: PRレビュー
      desc: 観点固定
`);
    const deck = parseSlideMarkdown(md);
    const s = deck.slides[0];
    expect(s.type).toBe('feature-showcase');
    if (s.type === 'feature-showcase') {
      expect(s.left.eyebrow).toBe('FEATURE');
      expect(s.right.items[0].label).toBe('PRレビュー');
    }
  });
});

describe('デッキ制約', () => {
  it('生の <script> は除去して警告する', () => {
    const deck = parseSlideMarkdown(fm('<!-- slide: points -->\n- a\n<script>alert(1)</script>'));
    expect(deck.slides[0].warnings.some((w) => w.includes('script'))).toBe(true);
  });
});

// --- split-image (v0.2.3) ---

describe('title layout: split-image', () => {
  it('layout: split-image を認識し image: を格納する', () => {
    const md = fm(
      '<!-- slide: title, layout: split-image, tone: dark -->\n# CASE ==STUDIES==\nsubtitle: luxury residences\nimage: https://example.com/hero.jpg',
    );
    const s = parseSlideMarkdown(md).slides[0] as TitleSlide;
    expect(s.type).toBe('title');
    expect(s.layout).toBe('split-image');
    expect(s.tone).toBe('dark');
    expect(s.heading).toBe('CASE ==STUDIES==');
    expect(s.subtitle).toBe('luxury residences');
    expect(s.image).toBe('https://example.com/hero.jpg');
  });

  it('image: が無い split-image は image が undefined', () => {
    const md = fm('<!-- slide: title, layout: split-image -->\n# No Image');
    const s = parseSlideMarkdown(md).slides[0] as TitleSlide;
    expect(s.layout).toBe('split-image');
    expect(s.image).toBeUndefined();
  });

  it('通常 title では image: は無視されない（格納される）', () => {
    const md = fm('<!-- slide: title -->\n# Normal\nimage: https://example.com/bg.jpg');
    const s = parseSlideMarkdown(md).slides[0] as TitleSlide;
    expect(s.layout).toBeUndefined();
    expect(s.image).toBe('https://example.com/bg.jpg');
  });

  it('image: に危険なスキームが含まれていても parseTitle はそのまま格納する（safeUrl はレンダラ側）', () => {
    const md = fm('<!-- slide: title, layout: split-image -->\n# Test\nimage: javascript:alert(1)');
    const s = parseSlideMarkdown(md).slides[0] as TitleSlide;
    expect(s.image).toBe('javascript:alert(1)');
  });
});
