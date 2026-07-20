import { z } from 'zod';

export const zTimelineMilestone = z.object({
  label: z.coerce.string().catch(''),
  when: z.coerce.string().catch(''),
});
export type TimelineMilestone = z.infer<typeof zTimelineMilestone>;

/** diagram-timeline フェンスのYAML形状。 */
export const zTimelineYaml = z
  .object({
    start: z.coerce.string().optional(),
    milestones: z.array(z.unknown()).optional(),
  })
  .meta({
    id: 'timeline-yaml',
    summary: '水平軸タイムライン。milestones(label,when) 2〜6個推奨',
    minMilestones: 2,
    maxMilestones: 6,
  });
export type TimelineYaml = z.infer<typeof zTimelineYaml>;
