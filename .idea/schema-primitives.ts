import { z } from 'zod';

/**
 * 「型としては妥当だが、必須情報が欠けている」判定は zod の外（parser側）で行う。
 * 理由：'source が無い→出典未記載＋warning' のような業務ルールの文言・判定は
 * schema の責務（オブジェクト形状の記述）ではなく、parser（アダプタ）の責務として残す。
 * schema はあくまで「渡された値が正しい形か」だけを見る。
 */
export const zChartSource = z.object({
  name: z.coerce.string(),
  url: z.coerce.string().optional(),
});
export type ChartSource = z.infer<typeof zChartSource>;
