import type { ZodSafeParseResult } from 'zod';

/**
 * 個別データ項目（chart data 等）の safeParse 失敗を warning へ写像する。
 * 「型が違えばエラーで落とす」のではなく「その項目だけ捨てて warning」という
 * 非クラッシュ規約を維持するためのヘルパー。
 */
export function itemParseWarning(label: string, rawItem: unknown): string {
  return `${label}に変換できない項目をスキップ: ${JSON.stringify(rawItem)}`;
}

/** safeParse結果から成功値だけを取り出し、失敗は warning を積みつつ捨てる汎用ヘルパー。 */
export function collectValid<T>(
  rawItems: unknown[],
  parseOne: (item: unknown) => ZodSafeParseResult<T>,
  warnLabel: string,
  warnings: string[],
): T[] {
  const out: T[] = [];
  for (const raw of rawItems) {
    const r = parseOne(raw);
    if (r.success) out.push(r.data);
    else warnings.push(itemParseWarning(warnLabel, raw));
  }
  return out;
}
