import { describe, expect, it } from 'vitest';
import {
  parseMermaidGantt,
  parseMermaidJourney,
  parseDuration,
  SVG_FIGURE_LIMITS,
} from './svgFigure';
import { parseSlideMarkdown } from './slideMarkdown';
import type { SvgFigureSlide } from './types';

const fm = (body: string) => `---\ntitle: テスト\npalette: ocean\n---\n${body}`;

describe('parseMermaidJourney', () => {
  it('公式記法をパースし JourneyBlock を返す', () => {
    const warnings: string[] = [];
    const src = [
      'journey',
      '  title Signup Journey',
      '  section Access',
      '    LPを見る: 5: User',
      '    会員登録: 4: User',
      '  section Use',
      '    初回ログイン: 3: User',
      '    利用開始: 5: User',
    ].join('\n');
    const r = parseMermaidJourney(src, warnings);
    expect(r?.type).toBe('journey');
    expect(r?.title).toBe('Signup Journey');
    expect(r?.sections).toHaveLength(2);
    expect(r?.sections[0].name).toBe('Access');
    expect(r?.sections[0].tasks).toEqual([
      { label: 'LPを見る', score: 5, actors: ['User'] },
      { label: '会員登録', score: 4, actors: ['User'] },
    ]);
    expect(warnings).toHaveLength(0);
  });

  it('section なしでもタスクをパースする', () => {
    const warnings: string[] = [];
    const r = parseMermaidJourney('journey\n  タスクA: 3: User', warnings);
    expect(r?.sections).toHaveLength(1);
    expect(r?.sections[0].name).toBe('');
    expect(r?.sections[0].tasks[0].label).toBe('タスクA');
  });

  it('スコアを 1〜5 にクランプする', () => {
    const warnings: string[] = [];
    const r = parseMermaidJourney('journey\n  A: 9: User\n  B: 0: User', warnings);
    expect(r?.sections[0].tasks[0].score).toBe(5);
    expect(r?.sections[0].tasks[1].score).toBe(1);
  });

  it('アクター省略時はデフォルト ["User"]', () => {
    const warnings: string[] = [];
    const r = parseMermaidJourney('journey\n  A: 3:', warnings);
    expect(r?.sections[0].tasks[0].actors).toEqual(['User']);
  });

  it('セクション数 > 4 で警告＋切り捨て', () => {
    const warnings: string[] = [];
    const lines = ['journey'];
    for (let i = 0; i < 5; i++) {
      lines.push(`  section S${i}`);
      lines.push(`    T${i}: 3: User`);
    }
    const r = parseMermaidJourney(lines.join('\n'), warnings);
    expect(r?.sections).toHaveLength(4);
    expect(warnings.some((w) => w.includes('セクション数'))).toBe(true);
  });

  it('総タスク数 > 12 で警告＋切り捨て', () => {
    // セクション毎の上限(4)には収まるが、セクション数×タスク数で総数(12)を超える構成にする
    // （1セクションに詰め込むと先にセクション毎上限で切り捨てられ、総数チェックに到達しないため）
    const warnings: string[] = [];
    const lines = ['journey'];
    for (let s = 0; s < 4; s++) {
      lines.push(`  section S${s}`);
      for (let t = 0; t < 4; t++) lines.push(`    T${s}_${t}: 3: User`);
    }
    const r = parseMermaidJourney(lines.join('\n'), warnings);
    const total = r?.sections.reduce((s, sec) => s + sec.tasks.length, 0) ?? 0;
    expect(total).toBeLessThanOrEqual(SVG_FIGURE_LIMITS.journey.maxTotalTasks);
    expect(warnings.some((w) => w.includes('総タスク数'))).toBe(true);
  });

  it('ラベル > 20文字で警告（切り捨てはしない）', () => {
    const warnings: string[] = [];
    const longLabel = 'ユーザーインタビューとフィードバック収集についての詳細な検討';
    const r = parseMermaidJourney(`journey\n  ${longLabel}: 3: User`, warnings);
    expect(r?.sections[0].tasks[0].label).toBe(longLabel);
    expect(warnings.some((w) => w.includes(longLabel))).toBe(true);
  });

  it('空の journey ブロックは null + 警告', () => {
    const warnings: string[] = [];
    const r = parseMermaidJourney('journey\n  title 空デッキ', warnings);
    expect(r).toBeNull();
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe('parseMermaidGantt', () => {
  const sample = [
    'gantt',
    '  title Project Plan',
    '  dateFormat YYYY-MM-DD',
    '  section Design',
    '    要件整理 :a1, 2026-07-01, 3d',
    '  section Dev',
    '    実装 :after a1, 5d',
    '  section Test',
    '    テスト :after a1, 4d',
  ].join('\n');

  it('公式記法をパースし GanttBlock を返す', () => {
    const warnings: string[] = [];
    const r = parseMermaidGantt(sample, warnings);
    expect(r?.type).toBe('gantt');
    expect(r?.title).toBe('Project Plan');
    expect(r?.sections).toHaveLength(3);
    expect(r?.sections[0].tasks[0]).toEqual({
      label: '要件整理',
      id: 'a1',
      tags: [],
      start: '2026-07-01',
      duration: '3d',
    });
  });

  it('dateFormat 行を記録する', () => {
    const warnings: string[] = [];
    const r = parseMermaidGantt(sample, warnings);
    expect(r?.dateFormat).toBe('YYYY-MM-DD');
  });

  it('done / active / crit / milestone タグをパースする', () => {
    const warnings: string[] = [];
    const src = [
      'gantt',
      '  section S',
      '    A :done, 2026-07-01, 2d',
      '    B :active, 2d',
      '    C :crit, 2d',
      '    D :milestone, 0d',
    ].join('\n');
    const r = parseMermaidGantt(src, warnings);
    expect(r?.sections[0].tasks.map((t) => t.tags)).toEqual([
      ['done'],
      ['active'],
      ['crit'],
      ['milestone'],
    ]);
  });

  it('after <id> 依存をパースする', () => {
    const warnings: string[] = [];
    const r = parseMermaidGantt(sample, warnings);
    expect(r?.sections[1].tasks[0].start).toBe('after a1');
  });

  it('期間文字列 (3d, 1w, 8h) を解釈する', () => {
    expect(parseDuration('3d')).toBe(3);
    expect(parseDuration('1w')).toBe(7);
    expect(parseDuration('8h')).toBe(1);
    expect(parseDuration('16h')).toBe(2);
    expect(parseDuration('不明')).toBe(1);
  });

  it('セクション数 > 4 で警告＋切り捨て', () => {
    const warnings: string[] = [];
    const lines = ['gantt'];
    for (let i = 0; i < 5; i++) {
      lines.push(`  section S${i}`);
      lines.push(`    T${i} :2d`);
    }
    const r = parseMermaidGantt(lines.join('\n'), warnings);
    expect(r?.sections).toHaveLength(4);
    expect(warnings.some((w) => w.includes('セクション数'))).toBe(true);
  });

  it('ラベル > 20文字で警告', () => {
    const warnings: string[] = [];
    const longLabel = 'ユーザーインタビューとフィードバック収集についての詳細な検討';
    const r = parseMermaidGantt(`gantt\n  section S\n    ${longLabel} :2d`, warnings);
    expect(r?.sections[0].tasks[0].label).toBe(longLabel);
    expect(warnings.some((w) => w.includes(longLabel))).toBe(true);
  });
});

describe('parseSvgFigureSlide（parseSlideMarkdown経由）', () => {
  const journeyMd = fm(
    [
      '<!-- slide: svg-figure -->',
      'badge: WHY',
      '## Signup ジャーニー',
      'lead: 導線の確認',
      '```mermaid',
      'journey',
      '  section Access',
      '    LPを見る: 5: User',
      '```',
      'notes:',
      '  - 初回接触からログインまでの主要導線',
      '  - 離脱ポイントは会員登録直後',
      'point: 離脱率を改善する',
    ].join('\n'),
  );

  it('```mermaid フェンスから journey を検出してパース', () => {
    const s = parseSlideMarkdown(journeyMd).slides[0] as SvgFigureSlide;
    expect(s.type).toBe('svg-figure');
    expect(s.figure?.type).toBe('journey');
  });

  it('```mermaid フェンスから gantt を検出してパース', () => {
    const ganttMd = fm(
      [
        '<!-- slide: svg-figure -->',
        '## スケジュール',
        '```mermaid',
        'gantt',
        '  section Design',
        '    要件整理 :2026-07-01, 3d',
        '```',
      ].join('\n'),
    );
    const s = parseSlideMarkdown(ganttMd).slides[0] as SvgFigureSlide;
    expect(s.figure?.type).toBe('gantt');
  });

  it('notes: 箇条書きを string[] としてパース', () => {
    const s = parseSlideMarkdown(journeyMd).slides[0] as SvgFigureSlide;
    expect(s.notes).toEqual(['初回接触からログインまでの主要導線', '離脱ポイントは会員登録直後']);
  });

  it('notes: リストは * マーカーでも読む', () => {
    const md = fm(
      [
        '<!-- slide: svg-figure -->',
        '## Signup ジャーニー',
        '```mermaid',
        'journey',
        '  section Access',
        '    LPを見る: 5: User',
        '```',
        'notes:',
        '  * asteriskマーカーのノート',
        '  * もう1件',
      ].join('\n'),
    );
    const s = parseSlideMarkdown(md).slides[0] as SvgFigureSlide;
    expect(s.notes).toEqual(['asteriskマーカーのノート', 'もう1件']);
  });

  it('notes 省略時は undefined', () => {
    const md = fm(
      [
        '<!-- slide: svg-figure -->',
        '## タイトル',
        '```mermaid',
        'journey',
        '  A: 3: User',
        '```',
      ].join('\n'),
    );
    const s = parseSlideMarkdown(md).slides[0] as SvgFigureSlide;
    expect(s.notes).toBeUndefined();
  });

  it('journey/gantt 以外の mermaid は警告 + figure: undefined', () => {
    const md = fm(
      ['<!-- slide: svg-figure -->', '## タイトル', '```mermaid', 'graph LR', 'A-->B', '```'].join(
        '\n',
      ),
    );
    const s = parseSlideMarkdown(md).slides[0] as SvgFigureSlide;
    expect(s.figure).toBeUndefined();
    expect(s.warnings.some((w) => w.includes('journey / gantt'))).toBe(true);
  });

  it('heading / badge / lead / point を正しく取得', () => {
    const s = parseSlideMarkdown(journeyMd).slides[0] as SvgFigureSlide;
    expect(s.heading).toBe('Signup ジャーニー');
    expect(s.badge).toBe('WHY');
    expect(s.lead).toBe('導線の確認');
    expect(s.point).toBe('離脱率を改善する');
  });

  it('diagram-flow に journey を書くと警告になり diagram は undefined のまま', () => {
    const md = fm(
      [
        '<!-- slide: diagram-flow -->',
        '## フロー',
        '```mermaid',
        'journey',
        '  A: 3: User',
        '```',
      ].join('\n'),
    );
    const s = parseSlideMarkdown(md).slides[0];
    expect(s.warnings.some((w) => w.includes('svg-figure'))).toBe(true);
  });

  it('```svg フェンスが優先される（```mermaidと併記してもjourney/gantt判定を行わない）', () => {
    const md = fm(
      [
        '<!-- slide: svg-figure -->',
        '## 見出し',
        '```svg',
        '<svg viewBox="0 0 10 10"><rect x="0" y="0" width="5" height="5" /></svg>',
        '```',
      ].join('\n'),
    );
    const s = parseSlideMarkdown(md).slides[0] as SvgFigureSlide;
    expect(s.figure?.type).toBe('raw');
  });

  it('```svg が不正なXMLの場合は figure: undefined で警告になる', () => {
    const md = fm(
      ['<!-- slide: svg-figure -->', '## 見出し', '```svg', '<svg><rect></svg>', '```'].join('\n'),
    );
    const s = parseSlideMarkdown(md).slides[0] as SvgFigureSlide;
    expect(s.figure).toBeUndefined();
    expect(s.warnings.some((w) => w.includes('XMLが不正'))).toBe(true);
  });
});
