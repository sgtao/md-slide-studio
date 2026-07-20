// meta-unified
import { z } from 'zod';

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
    id: 'chart',
    slideTypes: ['chart-bar', 'chart-line', 'chart-donut'],
    summary: '棒/折れ線/ドーナツグラフ。data(label,value)とsource(出典)をYAMLで記述',
    constraints: ['data は最大5系列（6系列目以降は切り捨て）', 'source（出典）は必須'],
    layouts: ['side-list'],
  });
export type ChartYaml = z.infer<typeof zChartYaml>;

export const zComparisonChartYaml = z
  .object({
    type: z.coerce.string().optional(),
    labels: z
      .object({ before: z.coerce.string().optional(), after: z.coerce.string().optional() })
      .optional(),
    center: z
      .object({ before: z.coerce.string().optional(), after: z.coerce.string().optional() })
      .optional(),
    data: z.array(z.unknown()).optional(),
    source: z.unknown().optional(),
  })
  .meta({
    id: 'comparison-chart',
    slideTypes: ['comparison-chart'],
    summary: 'Before/After比較ドーナツ。left(big/heading/stats)とchart(data[before,after,class])',
    constraints: ['source（出典）は必須'],
  });
export type ComparisonChartYaml = z.infer<typeof zComparisonChartYaml>;

export const zComparisonDataItem = z.object({
  label: z.coerce.string().default(''),
  before: z.coerce.number().catch(0),
  after: z.coerce.number().catch(0),
  class: z.coerce.string().catch('1'),
});
export type ComparisonDataItem = z.infer<typeof zComparisonDataItem>;

export const zComparisonLeftStat = z.object({
  num: z.coerce.string().default(''),
  label: z.coerce.string().default(''),
});
export type ComparisonLeftStatYaml = z.infer<typeof zComparisonLeftStat>;

export const zComparisonLeftYaml = z
  .object({
    big: z.coerce.string().optional(),
    big_unit: z.coerce.string().optional(),
    heading: z.coerce.string().optional(),
    lead: z.coerce.string().optional(),
    stats: z.array(z.unknown()).optional(),
  })
  .optional();
export type ComparisonLeftYaml = z.infer<typeof zComparisonLeftYaml>;
