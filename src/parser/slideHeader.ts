/**
 * slideHeader.ts — 全スライドtype共通のヘッダキー（badge / lead / point）の抽出。
 *
 * v0.2.0 の Studio 拡張（markdown-format-ext.md §1）:
 *   badge: 見出し左のピル（例: Step 1 / WHY）
 *   lead:  見出し直下の補足1行（--text-secondary）
 *   point: スライド下部の強調帯（💡付き・==hl== 対応）
 *
 * 設計:
 * - 行頭（インデントなし）の `badge:` / `lead:` / `point:` のみを対象とする。
 *   feature-showcase 等の YAML 内（インデントあり）の同名キーは対象外
 * - コードフェンス（``` 〜 ```）内は走査しない（chart/steps 等の YAML を保護）
 * - 該当行は本文から取り除き、残りを rest として type 別パーサーへ渡す
 * - 同一キーの重複は後勝ち（警告なし・落ちないパーサー原則）
 * - 純関数・DOM非依存（v0.3 の @mdss/core 分離を見据える）
 */

export interface SlideHeaderFields {
  badge?: string;
  lead?: string;
  point?: string;
}

const HEADER_RE = /^(badge|lead|point):\s*(.+)$/;

export function parseSlideHeader(body: string): { header: SlideHeaderFields; rest: string } {
  const header: SlideHeaderFields = {};
  const restLines: string[] = [];
  let inFence = false;
  for (const line of body.split('\n')) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      restLines.push(line);
      continue;
    }
    if (!inFence) {
      const m = line.match(HEADER_RE);
      if (m) {
        header[m[1] as keyof SlideHeaderFields] = m[2].trim();
        continue;
      }
    }
    restLines.push(line);
  }
  return { header, rest: restLines.join('\n') };
}
