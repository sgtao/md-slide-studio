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
  it('maxSeries制約がmetaに載っている（v0.3.2のSSOT生成が読む値）', () => {
    expect(zChartYaml.meta()?.maxSeries).toBe(5);
  });
});
