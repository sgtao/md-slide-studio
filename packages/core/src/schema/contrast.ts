// meta-unified
import { z } from 'zod';

export const zContrastExampleRow = z.object({
  tag: z.coerce.string().catch(''),
  text: z.coerce.string().catch(''),
});
export type ContrastExampleRowYaml = z.infer<typeof zContrastExampleRow>;

export const zContrastExample = z.object({
  title: z.coerce.string().optional(),
  rows: z.array(z.unknown()).optional(),
});
export type ContrastExampleYaml = z.infer<typeof zContrastExample>;

export const zContrastVerdictItem = z.object({
  label: z.coerce.string().optional(),
  text: z.coerce.string().optional(),
  connector: z.coerce.string().optional(),
  tone: z.coerce.string().optional(), // 妥当性チェックは parser 側（'warn' 以外は warning つきで無視）
});
export type ContrastVerdictItemYaml = z.infer<typeof zContrastVerdictItem>;

/** contrast フェンスのYAML形状。 */
export const zContrastYaml = z
  .object({
    example: z.unknown().optional(),
    verdict: z.array(z.unknown()).optional(),
  })
  .meta({
    id: 'contrast',
    slideTypes: ['contrast'],
    summary:
      '対比構造（例示→結論）。example(title,rows[tag,text])とverdict(label/text/tone)をYAMLで記述',
    constraints: ['example は必須'],
  });
export type ContrastYaml = z.infer<typeof zContrastYaml>;
