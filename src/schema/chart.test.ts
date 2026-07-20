// ssot-applied
import { describe, it, expect } from 'vitest';
import { zChartDataItem, zChartYaml } from './chart';
import { zChartSource } from './primitives';

describe('zChartDataItem', () => {
  it('文字列数値も許容する', () => {
    expect(zChartDataItem.safeParse({ label: 'a', value: '3' }).success).toBe(true);
  });
  it('数値化できないvalueは失敗する', () => {
    expect(zChartDataItem.safeParse({ label: 'a', value: 'abc' }).success).toBe(false);
  });
});

describe('zChartSource', () => {
  it('nameが無いと失敗する（parser側でフォールバック処理する前提）', () => {
    expect(zChartSource.safeParse({}).success).toBe(false);
  });
});

describe('zChartYaml meta', () => {
  it('系列数の制約がmetaのconstraintsに載っている（SSOT生成が読む値）', () => {
    const meta = zChartYaml.meta();
    expect(meta?.id).toBe('chart');
    expect(meta?.constraints).toContain('data は最大5系列（6系列目以降は切り捨て）');
  });
});
