/**
 * svgFigure.ts — mermaid journey / gantt 記法の独自パーサー（v0.4.6〜）。
 *
 * 対象は `svg-figure` type専用。既存の `parseMermaidSubset()`（graph LR/TD）とは
 * 完全に独立した実装で、既存ロジックには一切影響しない。
 *
 * 入力: mermaid公式の journey / gantt 記法（VSCode互換のサブセット）
 * 出力: JourneyBlock / GanttBlock（独自SVGレンダラー用の構造化データ）
 * 方針: 落ちないパーサー原則（未対応記法・上限超過は警告を積んで部分結果 or null を返す）
 */
import type {
  GanttBlock,
  GanttSection,
  GanttTask,
  JourneyBlock,
  JourneySection,
  JourneyTask,
} from './types';

export const SVG_FIGURE_LIMITS = {
  journey: {
    maxSections: 4,
    maxTasksPerSection: 4,
    maxTotalTasks: 12,
    maxLabelLength: 20, // 日本語10文字程度
  },
  gantt: {
    maxSections: 4,
    maxTasksPerSection: 4,
    maxTotalTasks: 12,
    maxLabelLength: 20,
  },
} as const;

function clampScore(n: number): number {
  return Math.min(5, Math.max(1, Math.round(n)));
}

function checkLabelLength(
  label: string,
  kind: keyof typeof SVG_FIGURE_LIMITS,
  warnings: string[],
): void {
  const max = SVG_FIGURE_LIMITS[kind].maxLabelLength;
  if (label.length > max) {
    warnings.push(`タスクラベル "${label}" は${max}文字を超えています（切り詰めを推奨）`);
  }
}

/**
 * mermaid公式の journey 記法をパースする。
 * `journey` ヘッダで開始を検出し、`title` / `section` / `<label>: <score>: <actors>` を読む。
 */
export function parseMermaidJourney(src: string, warnings: string[]): JourneyBlock | null {
  const lines = src
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!/^journey\b/.test(lines[0] ?? '')) {
    warnings.push('journey ブロックの先頭行が "journey" ではありません');
    return null;
  }

  let title: string | undefined;
  const sections: JourneySection[] = [];
  let current: JourneySection | null = null;

  for (const line of lines.slice(1)) {
    const titleMatch = line.match(/^title\s+(.+)$/);
    if (titleMatch) {
      title = titleMatch[1].trim();
      continue;
    }
    const sectionMatch = line.match(/^section\s+(.+)$/);
    if (sectionMatch) {
      current = { name: sectionMatch[1].trim(), tasks: [] };
      sections.push(current);
      continue;
    }
    const taskMatch = line.match(/^(.+?):\s*(-?\d+(?:\.\d+)?)\s*:\s*(.*)$/);
    if (taskMatch) {
      const [, label, scoreStr, actorsStr] = taskMatch;
      const actors = actorsStr
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
      const task: JourneyTask = {
        label: label.trim(),
        score: clampScore(Number(scoreStr)),
        actors: actors.length ? actors : ['User'],
      };
      checkLabelLength(task.label, 'journey', warnings);
      if (!current) {
        current = { name: '', tasks: [] };
        sections.push(current);
      }
      current.tasks.push(task);
      continue;
    }
    // 解析不能な行（未対応記法・コメント等）は前方互換のため無視する
  }

  const limits = SVG_FIGURE_LIMITS.journey;
  let used = sections;
  if (used.length > limits.maxSections) {
    warnings.push(
      `journey のセクション数 ${used.length} は上限 ${limits.maxSections} を超えています（${
        limits.maxSections + 1
      }セクション目以降は切り捨て）`,
    );
    used = used.slice(0, limits.maxSections);
  }
  used = used.map((sec) => {
    if (sec.tasks.length > limits.maxTasksPerSection) {
      warnings.push(
        `セクション "${sec.name}" のタスク数 ${sec.tasks.length} は上限 ${limits.maxTasksPerSection} を超えています（超過分は切り捨て）`,
      );
      return { ...sec, tasks: sec.tasks.slice(0, limits.maxTasksPerSection) };
    }
    return sec;
  });
  const total = used.reduce((sum, s) => sum + s.tasks.length, 0);
  if (total > limits.maxTotalTasks) {
    warnings.push(`journey の総タスク数 ${total} は上限 ${limits.maxTotalTasks} を超えています`);
    let remaining = limits.maxTotalTasks;
    used = used.map((sec) => {
      if (remaining <= 0) return { ...sec, tasks: [] };
      const tasks = sec.tasks.slice(0, remaining);
      remaining -= tasks.length;
      return { ...sec, tasks };
    });
  }

  if (used.every((s) => s.tasks.length === 0)) {
    warnings.push('journey にタスクがありません');
    return null;
  }
  return { type: 'journey', title, sections: used };
}

/**
 * mermaid公式の gantt 記法をパースする。
 * `gantt` ヘッダで開始を検出し、`title` / `dateFormat` / `section` /
 * `<label> :<meta,...>` を読む。日付の厳密な計算はしない（相対配置は描画側の責務）。
 */
export function parseMermaidGantt(src: string, warnings: string[]): GanttBlock | null {
  const lines = src
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!/^gantt\b/.test(lines[0] ?? '')) {
    warnings.push('gantt ブロックの先頭行が "gantt" ではありません');
    return null;
  }

  let title: string | undefined;
  let dateFormat: string | undefined;
  const sections: GanttSection[] = [];
  let current: GanttSection | null = null;

  for (const line of lines.slice(1)) {
    const titleMatch = line.match(/^title\s+(.+)$/);
    if (titleMatch) {
      title = titleMatch[1].trim();
      continue;
    }
    const dateFormatMatch = line.match(/^dateFormat\s+(.+)$/);
    if (dateFormatMatch) {
      dateFormat = dateFormatMatch[1].trim();
      continue;
    }
    const sectionMatch = line.match(/^section\s+(.+)$/);
    if (sectionMatch) {
      current = { name: sectionMatch[1].trim(), tasks: [] };
      sections.push(current);
      continue;
    }
    const taskMatch = line.match(/^(.+?)\s*:\s*(.+)$/);
    if (taskMatch) {
      const [, label, metaStr] = taskMatch;
      const tokens = metaStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const task: GanttTask = { label: label.trim(), tags: [] };
      for (const tok of tokens) {
        if (/^(done|active|crit|milestone)$/.test(tok)) {
          task.tags.push(tok);
        } else if (/^after\s+\S+$/.test(tok)) {
          task.start = tok;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(tok)) {
          task.start = tok;
        } else if (/^\d+(d|w|h)$/.test(tok)) {
          task.duration = tok;
        } else if (!task.id) {
          task.id = tok;
        }
      }
      checkLabelLength(task.label, 'gantt', warnings);
      if (!current) {
        current = { name: '', tasks: [] };
        sections.push(current);
      }
      current.tasks.push(task);
      continue;
    }
  }

  const limits = SVG_FIGURE_LIMITS.gantt;
  let used = sections;
  if (used.length > limits.maxSections) {
    warnings.push(
      `gantt のセクション数 ${used.length} は上限 ${limits.maxSections} を超えています（${
        limits.maxSections + 1
      }セクション目以降は切り捨て）`,
    );
    used = used.slice(0, limits.maxSections);
  }
  used = used.map((sec) => {
    if (sec.tasks.length > limits.maxTasksPerSection) {
      warnings.push(
        `セクション "${sec.name}" のタスク数 ${sec.tasks.length} は上限 ${limits.maxTasksPerSection} を超えています（超過分は切り捨て）`,
      );
      return { ...sec, tasks: sec.tasks.slice(0, limits.maxTasksPerSection) };
    }
    return sec;
  });
  const total = used.reduce((sum, s) => sum + s.tasks.length, 0);
  if (total > limits.maxTotalTasks) {
    warnings.push(`gantt の総タスク数 ${total} は上限 ${limits.maxTotalTasks} を超えています`);
    let remaining = limits.maxTotalTasks;
    used = used.map((sec) => {
      if (remaining <= 0) return { ...sec, tasks: [] };
      const tasks = sec.tasks.slice(0, remaining);
      remaining -= tasks.length;
      return { ...sec, tasks };
    });
  }

  if (used.every((s) => s.tasks.length === 0)) {
    warnings.push('gantt にタスクがありません');
    return null;
  }
  return { type: 'gantt', title, dateFormat, sections: used };
}

/** 期間文字列（3d / 1w / 8h）→ 日数。不明な形式は 1 日として扱う。 */
export function parseDuration(s: string): number {
  const m = s.match(/^(\d+)(d|w|h)$/);
  if (!m) return 1;
  const n = parseInt(m[1], 10);
  switch (m[2]) {
    case 'd':
      return n;
    case 'w':
      return n * 7;
    case 'h':
      return Math.max(1, Math.round(n / 8)); // 8h = 1日換算
    default:
      return 1;
  }
}
