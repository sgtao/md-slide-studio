import type { z } from 'zod';
import { zChartYaml, zComparisonChartYaml } from './chart';
import { zDiagramYaml } from './diagram';
import { zTimelineYaml } from './timeline';
import { zStepsYaml } from './steps';
import { zContrastYaml } from './contrast';
import { zFeatureShowcaseYaml } from './feature';

/**
 * schema の `.meta()` に持たせる統一形状。
 * - id: レジストリ内部キー（1スキーマ＝1エントリ。複数 slideType を束ねる場合もある）
 * - slideTypes: 実際の `<!-- slide: xxx -->` 識別子（型別1行の生成に使う）
 * - summary: 1行説明（プロンプトの型リファレンス表に使う）
 * - constraints: 制約文の配列（プロンプト＋ヘルプの両方に流用。0件でもよい）
 * - layouts: 対応する `layout:` 値があれば列挙
 *
 * 注意: ここに登録されるのは「YAMLフェンスブロックを持つ7type」のみ。
 * title/points/summary/table/figure/sources はフェンスを持たず zod化の対象外のため、
 * プロンプト側では引き続き手書きプローズで説明する（decision 1 の「手書き」層）。
 */
export interface SlideTypeMeta {
  id: string;
  slideTypes: string[];
  summary: string;
  constraints: string[];
  layouts?: string[];
}

interface RegistryEntry {
  schema: z.ZodType;
  meta: SlideTypeMeta;
}

function entry(schema: z.ZodType): RegistryEntry {
  const meta = schema.meta() as SlideTypeMeta | undefined;
  if (!meta) {
    throw new Error('schema registry: .meta() が設定されていないschemaがあります');
  }
  return { schema, meta };
}

/**
 * zod の registry はイテレート不可のため、列挙用途にはこの配列を単一の情報源として使う。
 * （`.meta()`自体はグローバルレジストリに登録済みなので、schema.meta() で再取得できる）
 */
export const SLIDE_TYPE_REGISTRY: RegistryEntry[] = [
  entry(zChartYaml),
  entry(zComparisonChartYaml),
  entry(zDiagramYaml),
  entry(zTimelineYaml),
  entry(zStepsYaml),
  entry(zContrastYaml),
  entry(zFeatureShowcaseYaml),
];

export function getAllSlideTypeMeta(): SlideTypeMeta[] {
  return SLIDE_TYPE_REGISTRY.map((e) => e.meta);
}
