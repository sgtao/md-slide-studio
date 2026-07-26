// meta-unified
import { z } from 'zod';

export const zStepStyle = z.enum(['cards', 'circled']);
export const zStepTone = z.enum(['dark', 'outline']);

export const zStepItem = z.object({
  icon: z.coerce.string().optional(),
  title: z.coerce.string().default(''),
  desc: z.coerce.string().optional(),
  tone: z.coerce.string().optional(), // 妥当性チェックは parser 側（未対応値は warning つきで無視）
});
export type StepItemYaml = z.infer<typeof zStepItem>;

export const zStepRatioItem = z.object({
  label: z.coerce.string().default(''),
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
    id: 'steps',
    slideTypes: ['steps'],
    summary:
      'カード型ステップフロー。style(cards|circled)とitems(icon/title/desc/tone)をYAMLで記述',
    constraints: [
      'items は2〜6個（1個以下は警告・7件目以降は切り捨て）。layout: grid のみ2〜9個まで拡張（10件目以降は切り捨て）',
      '任意の ratio でセグメント比率帯を描画可（合計100を推奨）',
      'layout: grid で矢印を非表示にし複数列へ折り返し表示できる',
    ],
    layouts: ['grid'],
  });
export type StepsYaml = z.infer<typeof zStepsYaml>;
