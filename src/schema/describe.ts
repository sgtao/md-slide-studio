import { getAllSlideTypeMeta } from './registry';

/**
 * プロンプトの「型別詳細仕様」節を生成する。
 * schema の meta（summary/constraints/layouts）を単一の情報源として、
 * 型別1行＋制約のMarkdown箇条書きを組み立てる。
 */
export function buildTypeReferenceTable(): string {
  const lines = getAllSlideTypeMeta().map((m) => {
    const typesLabel = m.slideTypes.map((t) => `\`${t}\``).join(' / ');
    const constraintsText = m.constraints.length > 0 ? `（制約: ${m.constraints.join('／')}）` : '';
    const layoutsText =
      m.layouts && m.layouts.length > 0 ? `（対応layout: ${m.layouts.join(', ')}）` : '';
    return `- ${typesLabel}: ${m.summary}${constraintsText}${layoutsText}`;
  });
  return lines.join('\n');
}

/**
 * ヘルプモーダル「制約ルール」タブ用の文字列配列を生成する。
 * schema の constraints を type ラベル付きでフラット化する。
 * デッキ全体に関わるルール（sources推奨・枚数目安等）は schema に属さないため、
 * 呼び出し側（helpContent.ts）で別途手書きし、この配列と連結する。
 */
export function buildConstraintRules(): string[] {
  const out: string[] = [];
  for (const m of getAllSlideTypeMeta()) {
    const label = m.slideTypes.join('/');
    for (const c of m.constraints) {
      out.push(`${label}: ${c}`);
    }
  }
  return out;
}
