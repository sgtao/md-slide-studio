import { z } from 'zod';

export const zFeatureLeft = z.object({
  eyebrow: z.coerce.string().optional(),
  heading: z.coerce.string().catch(''),
  lead: z.coerce.string().optional(),
});
export type FeatureLeftYaml = z.infer<typeof zFeatureLeft>;

export const zFeatureRightItem = z.object({
  label: z.coerce.string().catch(''),
  desc: z.coerce.string().catch(''),
});
export type FeatureRightItemYaml = z.infer<typeof zFeatureRightItem>;

export const zFeatureRight = z.object({
  num: z.coerce.string().optional(),
  eyebrow: z.coerce.string().optional(),
  heading: z.coerce.string().catch(''),
  sub: z.coerce.string().optional(),
  items: z.array(z.unknown()).optional(),
});
export type FeatureRightYaml = z.infer<typeof zFeatureRight>;

/** feature-showcase のYAML形状（フェンス無し・スライド本文全体がYAML）。 */
export const zFeatureShowcaseYaml = z
  .object({
    left: z.unknown().optional(),
    right: z.unknown().optional(),
  })
  .meta({
    id: 'feature-showcase-yaml',
    summary: '左(eyebrow/heading/lead)＋右(num/eyebrow/heading/sub/items[label,desc])の2カラム',
  });
export type FeatureShowcaseYaml = z.infer<typeof zFeatureShowcaseYaml>;
