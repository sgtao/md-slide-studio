// meta-unified
import { z } from 'zod';

/** diagram フェンスのYAML形状。layer型のみ nodes がネスト配列（層→箱）を取り得る。 */
export const zDiagramYaml = z
  .object({
    type: z.coerce.string().optional(),
    nodes: z.array(z.unknown()).optional(),
    labels: z.array(z.unknown()).optional(),
  })
  .meta({
    id: 'diagram',
    slideTypes: ['diagram-flow', 'diagram-layer', 'diagram-cycle'],
    summary: 'flow(横フロー)/layer(層構造)/cycle(循環)の図解。nodes配列をYAMLで記述',
    constraints: ['flow は最大5ノード', 'layer は最大4層', 'cycle は最大4ノード'],
  });
export type DiagramYaml = z.infer<typeof zDiagramYaml>;
