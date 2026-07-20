import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { itemParseWarning, collectValid } from './issues';

describe('itemParseWarning', () => {
  it('ラベルと元データを含む警告文を生成する', () => {
    const msg = itemParseWarning('value', { label: 'x', value: 'abc' });
    expect(msg).toContain('value');
    expect(msg).toContain('に変換できない項目をスキップ');
    expect(msg).toContain('"label":"x"');
  });
});

describe('collectValid', () => {
  const schema = z.object({ n: z.number() });

  it('成功した項目だけを集め、失敗した項目は warning を積んで捨てる', () => {
    const warnings: string[] = [];
    const out = collectValid(
      [{ n: 1 }, { n: 'bad' }, { n: 3 }],
      (item) => schema.safeParse(item),
      'テスト項目',
      warnings,
    );
    expect(out).toEqual([{ n: 1 }, { n: 3 }]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('テスト項目');
  });

  it('全項目が成功すれば warning は積まれない', () => {
    const warnings: string[] = [];
    const out = collectValid([{ n: 1 }, { n: 2 }], (item) => schema.safeParse(item), 'x', warnings);
    expect(out).toHaveLength(2);
    expect(warnings).toEqual([]);
  });
});
