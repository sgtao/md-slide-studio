// meta-unified
import { z } from 'zod';

export const zFeatureLeft = z.object({
  eyebrow: z.coerce.string().optional(),
  heading: z.coerce.string().default(''),
  lead: z.coerce.string().optional(),
});
export type FeatureLeftYaml = z.infer<typeof zFeatureLeft>;

export const zFeatureRightItem = z.object({
  label: z.coerce.string().default(''),
  desc: z.coerce.string().default(''),
});
export type FeatureRightItemYaml = z.infer<typeof zFeatureRightItem>;

export const zFeatureRight = z.object({
  num: z.coerce.string().optional(),
  eyebrow: z.coerce.string().optional(),
  heading: z.coerce.string().default(''),
  sub: z.coerce.string().optional(),
  items: z.array(z.unknown()).optional(),
});
export type FeatureRightYaml = z.infer<typeof zFeatureRight>;

/** feature-showcase のYAML形状（フェンス無し・スライド本文全体がYAML）。 */
export const zFeatureShowcaseYaml = z
  .object({
    left: z.record(z.string(), z.unknown()).optional(),
    right: z.record(z.string(), z.unknown()).optional(),
  })
  .meta({
    id: 'feature-showcase',
    slideTypes: ['feature-showcase'],
    summary:
      '2カラム紹介。left(eyebrow/heading/lead)とright(num/eyebrow/heading/sub/items[label,desc])をYAMLで記述',
    constraints: [],
  });
export type FeatureShowcaseYaml = z.infer<typeof zFeatureShowcaseYaml>;
