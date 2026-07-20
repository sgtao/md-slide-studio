import { describe, expect, it } from 'vitest';
import { parseSlideMarkdown, parseDirective } from './slideMarkdown';
import type { TimelineSlide, ChartSlide } from './types';

const fm = (body: string) => `---\ntitle: テスト\npalette: ocean\n---\n${body}`;

describe('diagram-timeline', () => {
  it('ディレクティブ diagram-timeline を認識する', () => {
    const d = parseDirective('<!-- slide: diagram-timeline -->')!;
    expect(d.type).toBe('diagram-timeline');
  });

  it('milestones（start / label / when）を読む', () => {
    const md = fm(`<!-- slide: diagram-timeline -->
## タイムライン
\`\`\`diagram
type: timeline
start: 開始
milestones:
  - { label: 要件定義, when: 1月 }
  - { label: 実装, when: 2月 }
  - { label: リリース, when: 3月 }
\`\`\``);
    const s = parseSlideMarkdown(md).slides[0] as TimelineSlide;
    expect(s.type).toBe('diagram-timeline');
    expect(s.timeline?.start).toBe('開始');
    expect(s.timeline?.milestones).toHaveLength(3);
    expect(s.timeline?.milestones[0]).toEqual({ label: '要件定義', when: '1月' });
    expect(s.heading).toBe('タイムライン');
  });

  it('start 省略時は "Start" に既定する', () => {
    const md = fm(`<!-- slide: diagram-timeline -->
\`\`\`diagram
type: timeline
milestones:
  - { label: A, when: Q1 }
  - { label: B, when: Q2 }
\`\`\``);
    const s = parseSlideMarkdown(md).slides[0] as TimelineSlide;
    expect(s.timeline?.start).toBe('Start');
  });

  it('7件以上は先頭6件に切り捨てて警告する', () => {
    const items = Array.from(
      { length: 8 },
      (_, i) => `  - { label: M${i + 1}, when: ${i + 1}月 }`,
    ).join('\n');
    const md = fm(
      `<!-- slide: diagram-timeline -->\n\`\`\`diagram\ntype: timeline\nmilestones:\n${items}\n\`\`\``,
    );
    const s = parseSlideMarkdown(md).slides[0] as TimelineSlide;
    expect(s.timeline?.milestones).toHaveLength(6);
    expect(s.warnings.some((w) => w.includes('上限6件'))).toBe(true);
  });

  it('1件は警告するが描画継続する', () => {
    const md = fm(
      `<!-- slide: diagram-timeline -->\n\`\`\`diagram\ntype: timeline\nmilestones:\n  - { label: A, when: Q1 }\n\`\`\``,
    );
    const s = parseSlideMarkdown(md).slides[0] as TimelineSlide;
    expect(s.timeline?.milestones).toHaveLength(1);
    expect(s.warnings.some((w) => w.includes('2 個以上'))).toBe(true);
  });

  it('```diagram ブロックが無い場合は警告して描画継続', () => {
    const md = fm('<!-- slide: diagram-timeline -->\n## 見出しだけ');
    const s = parseSlideMarkdown(md).slides[0] as TimelineSlide;
    expect(s.type).toBe('diagram-timeline');
    expect(s.timeline).toBeUndefined();
    expect(s.warnings.some((w) => w.includes('diagram ブロック'))).toBe(true);
  });
});

describe('chart layout: side-list', () => {
  it('### 見出し + リストを sidePanel として取り込む', () => {
    const md = fm(`<!-- slide: chart-bar, layout: side-list -->
## 売上目標
\`\`\`chart
type: bar
title: 売上推移
data:
  - { label: 1年目, value: 8 }
  - { label: 2年目, value: 18 }
source: { name: 計画 }
\`\`\`
### 達成の前提条件
- **1年目（8億円）**：P1法人向け500社
- **2年目**：竹プラン売上比60%
  - サブ項目テスト`);
    const s = parseSlideMarkdown(md).slides[0] as ChartSlide;
    expect(s.layout).toBe('side-list');
    expect(s.sidePanel).toBeDefined();
    expect(s.sidePanel?.heading).toBe('達成の前提条件');
    expect(s.sidePanel?.items).toHaveLength(2);
    expect(s.sidePanel?.items[0].lead).toBe('1年目（8億円）');
    expect(s.sidePanel?.items[1].children).toHaveLength(1);
  });

  it('### が無ければ sidePanel は undefined（通常のチャート表示）', () => {
    const md = fm(`<!-- slide: chart-bar -->
\`\`\`chart
type: bar
title: t
data:
  - { label: a, value: 1 }
source: { name: s }
\`\`\``);
    const s = parseSlideMarkdown(md).slides[0] as ChartSlide;
    expect(s.sidePanel).toBeUndefined();
  });
});
