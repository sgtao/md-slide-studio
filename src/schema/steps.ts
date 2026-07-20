import { z } from 'zod';

export const zStepStyle = z.enum(['cards', 'circled']);
export const zStepTone = z.enum(['dark', 'outline']);

export const zStepItem = z.object({
  icon: z.coerce.string().optional(),
  title: z.coerce.string().catch(''),
  desc: z.coerce.string().optional(),
  tone: z.coerce.string().optional(), // 妥当性チェックは parser 側（未対応値は warning つきで無視）
});
export type StepItemYaml = z.infer<typeof zStepItem>;

export const zStepRatioItem = z.object({
  label: z.coerce.string().catch(''),
  value: z.coerce.number().catch(NaN),
});
export type StepRatioItemYaml = z.infer<typeof zStepRatioItem>;

/** steps フェンスのYAML形状。 */
export const zStepsYaml = z
  .object({
    style: z.coerce.string().optional(),
    items: z.array(z.unknown()).optional(),
    ratio: z.array(z.unknown()).optional(),
  })
  .meta({
    id: 'steps-yaml',
    summary: 'カード型ステップフロー。items 最大5・style は cards/circled',
    maxItems: 5,
  });
export type StepsYaml = z.infer<typeof zStepsYaml>;
