import { describe, expect, it } from 'vitest';
import { donutSegmentPath, formatValue } from './chart';

describe('donutSegmentPath', () => {
  it('12時起点・時計回りのパスを生成する', () => {
    // 0 → 90度（右上4分の1）
    const p = donutSegmentPath(260, 180, 110, 60, 0, Math.PI / 2);
    expect(p.startsWith('M260.00,70.00')).toBe(true); // 外周12時位置
    expect(p).toContain('A110,110 0 0 1 370.00,180.00'); // 外周3時位置へ時計回り
  });
  it('180度超は large-arc フラグが立つ', () => {
    const p = donutSegmentPath(0, 0, 100, 50, 0, Math.PI * 1.5);
    expect(p).toContain('A100,100 0 1 1');
  });
});

describe('formatValue', () => {
  it('万・億単位に丸める', () => {
    expect(formatValue(95000000)).toBe('9,500万');
    expect(formatValue(150000000)).toBe('1.5億');
    expect(formatValue(320)).toBe('320');
  });
});
