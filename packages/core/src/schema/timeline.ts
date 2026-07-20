// meta-unified
import { z } from 'zod';

export const zTimelineMilestone = z.object({
  label: z.coerce.string().default(''),
  when: z.coerce.string().default(''),
});
export type TimelineMilestone = z.infer<typeof zTimelineMilestone>;

/** diagram-timeline フェンスのYAML形状。 */
export const zTimelineYaml = z
  .object({
    start: z.coerce.string().optional(),
    milestones: z.array(z.unknown()).optional(),
  })
  .meta({
    id: 'diagram-timeline',
    slideTypes: ['diagram-timeline'],
    summary: '水平軸タイムライン。start と milestones(label,when) をYAMLで記述',
    constraints: ['milestones は2〜6個を推奨（6件目以降は切り捨て）'],
  });
export type TimelineYaml = z.infer<typeof zTimelineYaml>;
