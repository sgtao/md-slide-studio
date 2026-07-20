import { describe, expect, it } from 'vitest';
import { parseSlideMarkdown, parseMermaidSubset } from './slideMarkdown';

const fm = (body: string, palette = 'ocean') =>
  `---\ntitle: テスト\npalette: ${palette}\n---\n${body}`;

function warningsOf(md: string): string[] {
  const deck = parseSlideMarkdown(fm(md));
  return deck.slides.flatMap((s) => s.warnings);
}

describe('chart: エラー/警告パス', () => {
  it('```chart ブロックが無いと警告する', () => {
    const w = warningsOf('<!-- slide: chart-bar -->\n## 見出し');
    expect(w.some((x) => x.includes('```chart ブロックが見つかりません'))).toBe(true);
  });

  it('chart の形式が不正（data が配列でない）だと警告する', () => {
    const w = warningsOf('<!-- slide: chart-bar -->\n```chart\ndata: "not-an-array"\n```');
    expect(w.some((x) => x.includes('chart ブロックの形式が不正です'))).toBe(true);
  });

  it('chart の data が空だと警告する', () => {
    const w = warningsOf(
      '<!-- slide: chart-bar -->\n```chart\ntitle: t\ndata: []\nsource: { name: s }\n```',
    );
    expect(w.some((x) => x.includes('chart の data が空です'))).toBe(true);
  });

  it('不正な value を持つ data item はスキップされ警告する（issues.ts の分岐も踏む）', () => {
    const w = warningsOf(
      '<!-- slide: chart-bar -->\n```chart\ndata:\n  - { label: ok, value: 1 }\n  - { label: bad, value: "abc" }\nsource: { name: s }\n```',
    );
    expect(w.some((x) => x.includes('に変換できない項目をスキップ'))).toBe(true);
  });
});

describe('comparison-chart: エラー/警告パス', () => {
  it('```chart ブロックが無いと警告する', () => {
    const w = warningsOf('<!-- slide: comparison-chart -->\n## 見出し');
    expect(w.some((x) => x.includes('comparison-donut）が見つかりません'))).toBe(true);
  });

  it('comparison-chart の形式が不正（labels が object でない）だと警告する', () => {
    const w = warningsOf(
      '<!-- slide: comparison-chart -->\n```chart\nlabels: "not-an-object"\n```',
    );
    expect(w.some((x) => x.includes('comparison-chart ブロックの形式が不正です'))).toBe(true);
  });

  it('comparison-chart の data が空だと警告する', () => {
    const w = warningsOf('<!-- slide: comparison-chart -->\n```chart\ndata: []\n```');
    expect(w.some((x) => x.includes('comparison-chart の data が空です'))).toBe(true);
  });
});

describe('diagram: エラー/警告パス', () => {
  it('```diagram / ```mermaid が両方無いと警告する', () => {
    const w = warningsOf('<!-- slide: diagram-flow -->\n## 見出し');
    expect(w.some((x) => x.includes('```diagram / ```mermaid ブロックが見つかりません'))).toBe(
      true,
    );
  });

  it('```mermaid フェンスへフォールバックして解釈できる', () => {
    const w = warningsOf(
      '<!-- slide: diagram-flow -->\n```mermaid\ngraph LR\nA[開始] --> B[終了]\n```',
    );
    expect(w.some((x) => x.includes('見つかりません'))).toBe(false);
  });

  it('diagram の形式が不正（nodes が配列でない）だと警告する', () => {
    const w = warningsOf('<!-- slide: diagram-flow -->\n```diagram\nnodes: "not-an-array"\n```');
    expect(w.some((x) => x.includes('diagram ブロックの形式が不正です'))).toBe(true);
  });

  it('diagram type が未対応だと警告する', () => {
    const w = warningsOf(
      '<!-- slide: diagram-flow -->\n```diagram\ntype: unknown-type\nnodes: [a, b]\n```',
    );
    expect(w.some((x) => x.includes('は未対応です（flow / layer / cycle）'))).toBe(true);
  });

  it('diagram の nodes が空だと警告する', () => {
    const w = warningsOf('<!-- slide: diagram-flow -->\n```diagram\ntype: flow\nnodes: []\n```');
    expect(w.some((x) => x.includes('diagram の nodes が空です'))).toBe(true);
  });

  it('layer type は nodes のネスト配列（層→箱）を受け付ける', () => {
    const w = warningsOf(
      '<!-- slide: diagram-layer -->\n```diagram\ntype: layer\nnodes:\n  - [a, b]\n  - [c]\n```',
    );
    expect(w.some((x) => x.includes('形式が不正') || x.includes('nodes が空'))).toBe(false);
  });

  it('layer が5層以上だと切り捨て警告する', () => {
    const w = warningsOf(
      '<!-- slide: diagram-layer -->\n```diagram\ntype: layer\nnodes:\n  - [a]\n  - [b]\n  - [c]\n  - [d]\n  - [e]\n```',
    );
    expect(w.some((x) => x.includes('層あります（上限4層'))).toBe(true);
  });
});

describe('mermaid サブセット: エラーパス（parseMermaidSubset 直接テスト）', () => {
  it('graph LR/TD 以外は非対応', () => {
    const warnings: string[] = [];
    const r = parseMermaidSubset('flowchart LR\nA-->B', warnings);
    expect(r).toBeNull();
    expect(warnings.some((w) => w.includes('graph LR / graph TD'))).toBe(true);
  });

  it('subgraph 等の非対応記法を検知する', () => {
    const warnings: string[] = [];
    const r = parseMermaidSubset('graph LR\nsubgraph x\nA-->B\nend', warnings);
    expect(r).toBeNull();
    expect(warnings.some((w) => w.includes('subgraph'))).toBe(true);
  });

  it('解析不能な行を検知する', () => {
    const warnings: string[] = [];
    const r = parseMermaidSubset('graph LR\n!!!invalid!!!', warnings);
    expect(r).toBeNull();
    expect(warnings.some((w) => w.includes('解析不能な行'))).toBe(true);
  });

  it('エッジが1本も無いと警告する', () => {
    const warnings: string[] = [];
    const r = parseMermaidSubset('graph LR\nA[ノード]', warnings);
    expect(r).toBeNull();
    expect(warnings.some((w) => w.includes('エッジがありません'))).toBe(true);
  });

  it('分岐・合流は非対応', () => {
    const warnings: string[] = [];
    const r = parseMermaidSubset('graph LR\nA-->B\nA-->C', warnings);
    expect(r).toBeNull();
    expect(warnings.some((w) => w.includes('分岐・合流'))).toBe(true);
  });

  it('ノードが連結ではない（孤立ノードを含む2本の別々のエッジ）', () => {
    const warnings: string[] = [];
    // A-->B と C-->D の2本は互いに非連結。分岐チェック（出/入次数>1）には引っかからない。
    const r = parseMermaidSubset('graph LR\nA-->B\nC-->D', warnings);
    expect(r).toBeNull();
    expect(warnings.some((w) => w.includes('連結ではありません'))).toBe(true);
  });

  it('サイクル図はノード4以下のみ対応', () => {
    const warnings: string[] = [];
    const r = parseMermaidSubset('graph LR\nA-->B\nB-->C\nC-->D\nD-->E\nE-->A', warnings);
    expect(r).toBeNull();
    expect(warnings.some((w) => w.includes('サイクル図はノード4以下'))).toBe(true);
  });

  it('横フロー図（LR）はノード5以下のみ対応', () => {
    const warnings: string[] = [];
    const r = parseMermaidSubset('graph LR\nA-->B-->C-->D-->E-->F', warnings);
    expect(r).toBeNull();
    expect(warnings.some((w) => w.includes('横フロー図はノード5以下'))).toBe(true);
  });

  it('レイヤー図（TD）は4層以下のみ対応', () => {
    const warnings: string[] = [];
    const r = parseMermaidSubset('graph TD\nA-->B-->C-->D-->E', warnings);
    expect(r).toBeNull();
    expect(warnings.some((w) => w.includes('レイヤー図は4層以下'))).toBe(true);
  });
});

describe('diagram-timeline: エラー/警告パス', () => {
  it('milestones が配列でないと形式不正で警告する', () => {
    const w = warningsOf(
      '<!-- slide: diagram-timeline -->\n```diagram\nmilestones: "not-an-array"\n```',
    );
    expect(w.some((x) => x.includes('diagram-timeline ブロックの形式が不正です'))).toBe(true);
  });
});

describe('figure: エラー/警告パス', () => {
  it('画像URLの拡張子が画像でない可能性があると警告する', () => {
    const w = warningsOf(
      '<!-- slide: figure -->\n![alt](https://example.com/doc.pdf)\nsource: [出典](https://example.com)',
    );
    expect(w.some((x) => x.includes('画像URLの拡張子が画像ではない可能性があります'))).toBe(true);
  });
});

describe('feature-showcase: 警告パス', () => {
  it('left/right の内容が両方読み取れないと警告する', () => {
    const w = warningsOf('<!-- slide: feature-showcase -->\nleft: {}\nright: {}');
    expect(w.some((x) => x.includes('left/right の内容が読み取れません'))).toBe(true);
  });
});

describe('steps: エラー/警告パス', () => {
  it('items / ratio が配列でないと形式不正で警告する', () => {
    const w = warningsOf('<!-- slide: steps -->\n```steps\nitems: "not-an-array"\n```');
    expect(w.some((x) => x.includes('steps ブロックの形式が不正です'))).toBe(true);
  });

  it('item の tone が未対応だと警告する', () => {
    const w = warningsOf(
      '<!-- slide: steps -->\n```steps\nitems:\n  - { title: a, tone: invalid }\n  - { title: b }\n```',
    );
    expect(w.some((x) => x.includes('は未対応です（dark / outline）'))).toBe(true);
  });

  it('items が空だと警告する', () => {
    const w = warningsOf('<!-- slide: steps -->\n```steps\nitems: []\n```');
    expect(w.some((x) => x.includes('steps の items が空です'))).toBe(true);
  });

  it('items が1個だと2個以上を推奨する警告を出す', () => {
    const w = warningsOf('<!-- slide: steps -->\n```steps\nitems:\n  - { title: a }\n```');
    expect(w.some((x) => x.includes('items は2個以上を推奨します'))).toBe(true);
  });

  it('ratio に有効な値が無いと警告する', () => {
    const w = warningsOf(
      '<!-- slide: steps -->\n```steps\nitems:\n  - { title: a }\n  - { title: b }\nratio:\n  - { label: x, value: 0 }\n```',
    );
    expect(w.some((x) => x.includes('ratio に有効な値がありません'))).toBe(true);
  });
});

describe('contrast: エラー/警告パス', () => {
  it('verdict が配列でないと形式不正で警告する', () => {
    const w = warningsOf('<!-- slide: contrast -->\n```contrast\nverdict: "not-an-array"\n```');
    expect(w.some((x) => x.includes('contrast ブロックの形式が不正です'))).toBe(true);
  });
});

describe('その他の未カバー分岐', () => {
  it('summary type（番号付きリスト）を解析できる', () => {
    const deck = parseSlideMarkdown(fm('<!-- slide: summary -->\n## まとめ\n1. 要点1\n2. 要点2'));
    expect(deck.slides[0].type).toBe('summary');
  });

  it('スライドが1枚も無いと deck.warnings に警告が積まれる', () => {
    const deck = parseSlideMarkdown(fm(''));
    expect(deck.warnings.some((w) => w.includes('スライドが1枚もありません'))).toBe(true);
  });

  it('frontmatter の YAML が壊れていると警告する', () => {
    const deck = parseSlideMarkdown('---\ntitle: [unterminated\n---\n<!-- slide: title -->\n# t');
    expect(deck.warnings.some((w) => w.includes('frontmatter の YAML 解析に失敗'))).toBe(true);
  });

  it('table: 区切り行（|---|）が無いと警告する', () => {
    const w = warningsOf('<!-- slide: table -->\n## 見出し\n| a | b |\n| 1 | 2 |');
    expect(w.some((x) => x.includes('区切り行（|---|）が見つかりません'))).toBe(true);
  });

  it('table: > note 行を読み取る', () => {
    const deck = parseSlideMarkdown(
      fm('<!-- slide: table -->\n## 見出し\n| a | b |\n|---|---|\n| 1 | 2 |\n> 補足ノート'),
    );
    const s = deck.slides[0];
    expect(s.type).toBe('table');
    if (s.type === 'table') expect(s.note).toContain('補足ノート');
  });

  it('chart フェンスが YAML マップでない（スカラー）と警告する', () => {
    const w = warningsOf('<!-- slide: chart-bar -->\n```chart\njust-a-scalar-string\n```');
    expect(w.some((x) => x.includes('YAML マップではありません'))).toBe(true);
  });

  it('chart の type と スライド type が不一致だと警告する', () => {
    const w = warningsOf(
      '<!-- slide: chart-bar -->\n```chart\ntype: donut\ndata:\n  - { label: a, value: 1 }\nsource: { name: s }\n```',
    );
    expect(w.some((x) => x.includes('が不一致です（chart 側を優先）'))).toBe(true);
  });
});
