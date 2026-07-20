import { z } from 'zod';
import { zChartSource } from './primitives';

/** chart系の1データ点。文字列数値も許容（現行 Number()/String() 挙動を維持）。 */
export const zChartDataItem = z.object({
  label: z.coerce.string(),
  value: z.coerce.number(),
});
export type ChartDataItem = z.infer<typeof zChartDataItem>;

/** chart フェンスのYAML形状（source/dataの中身の妥当性チェックは parser 側で行う）。 */
export const zChartYaml = z
  .object({
    type: z.coerce.string().optional(),
    title: z.coerce.string().optional(),
    unit: z.coerce.string().optional(),
    data: z.array(z.unknown()).optional(),
    source: z.unknown().optional(),
  })
  .meta({
    id: 'chart-yaml',
    summary: 'bar/line/donut。data(label,value)最大5・source必須',
    maxSeries: 5,
  });
export type ChartYaml = z.infer<typeof zChartYaml>;

export const zComparisonChartYaml = z
  .object({
    type: z.coerce.string().optional(),
    labels: z.object({ before: z.unknown().optional(), after: z.unknown().optional() }).optional(),
    center: z.object({ before: z.unknown().optional(), after: z.unknown().optional() }).optional(),
    data: z.array(z.unknown()).optional(),
    source: z.unknown().optional(),
  })
  .meta({
    id: 'comparison-chart-yaml',
    summary: 'comparison-donut。left(big/heading/stats)＋chart(data[before,after,class])',
  });
export type ComparisonChartYaml = z.infer<typeof zComparisonChartYaml>;

export const zComparisonDataItem = z.object({
  label: z.coerce.string().catch(''),
  before: z.coerce.number().catch(0),
  after: z.coerce.number().catch(0),
  class: z.coerce.string().catch('1'),
});
export type ComparisonDataItem = z.infer<typeof zComparisonDataItem>;

export const zComparisonLeftYaml = z
  .object({
    big: z.unknown().optional(),
    big_unit: z.unknown().optional(),
    heading: z.unknown().optional(),
    lead: z.unknown().optional(),
    stats: z.array(z.unknown()).optional(),
  })
  .optional();
export type ComparisonLeftYaml = z.infer<typeof zComparisonLeftYaml>;
