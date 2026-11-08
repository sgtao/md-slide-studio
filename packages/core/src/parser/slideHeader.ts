/**
 * slideHeader.ts — 全スライドtype共通のヘッダキー（badge / lead / point / note）の抽出。
 *
 * v0.2.0 の Studio 拡張（markdown-format-ext.md §1）:
 *   badge: 見出し左のピル（例: Step 1 / WHY）
 *   lead:  見出し直下の補足1行（--text-secondary）
 *   point: スライド下部の強調帯（💡付き・==hl== 対応）
 *
 * スピーカーノート（`note:`）:
 *   スライドごとの補足テキスト（発表者の原稿・配布時の読み手への補足）。既定は非表示。
 *   他のキーと違って**繰り返し可**で、出現順に配列（`speakerNotes`）へ追加する（1行＝1段落）。
 *   空の `note:` は無視（本文にも残さない）。svg-figure の `notes:`（複数形）とは別物で、
 *   行頭が `note:` の行だけが対象（`notes:` は `note:` と一致しない）。
 *
 * 設計:
 * - 行頭（インデントなし）の `badge:` / `lead:` / `point:` / `note:` のみを対象とする。
 *   feature-showcase 等の YAML 内（インデントあり）の同名キーは対象外
 * - コードフェンス（``` 〜 ```）内は走査しない（chart/steps 等の YAML を保護）
 * - 該当行は本文から取り除き、残りを rest として type 別パーサーへ渡す
 * - badge / lead / point の重複は後勝ち（警告なし・落ちないパーサー原則）。note のみ追記
 * - 純関数・DOM非依存（@mdss/core 分離を見据える）
 */

export interface SlideHeaderFields {
  badge?: string;
  lead?: string;
  point?: string;
  /** `note:` 行（出現順・1行＝1段落）。1行も無ければ未設定（空配列にしない） */
  speakerNotes?: string[];
}

const HEADER_RE = /^(badge|lead|point):\s*(.+)$/;
/** `note:` は空行も「無視」として取り込む（本文へ漏らさない）ため、`.*` で受ける */
const NOTE_RE = /^note:\s*(.*)$/;

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
        header[m[1] as 'badge' | 'lead' | 'point'] = m[2].trim();
        continue;
      }
      const n = line.match(NOTE_RE);
      if (n) {
        const text = n[1].trim();
        if (text) (header.speakerNotes ??= []).push(text);
        continue;
      }
    }
    restLines.push(line);
  }
  return { header, rest: restLines.join('\n') };
}
