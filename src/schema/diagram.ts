import { z } from 'zod';

/** diagram フェンスのYAML形状。layer型のみ nodes がネスト配列（層→箱）を取り得る。 */
export const zDiagramYaml = z
  .object({
    type: z.coerce.string().optional(),
    nodes: z.array(z.unknown()).optional(),
    labels: z.array(z.unknown()).optional(),
  })
  .meta({
    id: 'diagram-yaml',
    summary: 'flow(横フロー・最大5)/layer(層・最大4)/cycle(循環・最大4)',
    limits: { flow: 5, layer: 4, cycle: 4 },
  });
export type DiagramYaml = z.infer<typeof zDiagramYaml>;
