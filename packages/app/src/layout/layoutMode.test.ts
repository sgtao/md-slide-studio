import { describe, expect, it } from 'vitest';
import {
  LAYOUT_MODES,
  LAYOUT_MODE_META,
  canExportFromDom,
  coerceLayoutMode,
  isLayoutMode,
  layoutModeFromKey,
  resolveLayout,
} from './layoutMode';

describe('layoutMode', () => {
  it('3モードが定義されている', () => {
    expect(LAYOUT_MODES).toEqual(['split', 'editor', 'preview']);
  });

  it('全モードにメタ情報がある', () => {
    for (const m of LAYOUT_MODES) {
      expect(LAYOUT_MODE_META[m].label).toBeTruthy();
      expect(LAYOUT_MODE_META[m].icon).toBeTruthy();
      expect(LAYOUT_MODE_META[m].desc).toBeTruthy();
      expect(LAYOUT_MODE_META[m].key).toMatch(/^[1-9]$/);
    }
  });

  it('ショートカットキーが重複しない', () => {
    const keys = LAYOUT_MODES.map((m) => LAYOUT_MODE_META[m].key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('isLayoutMode: 既知の値は真', () => {
    for (const v of LAYOUT_MODES) {
      expect(isLayoutMode(v)).toBe(true);
    }
  });

  it('isLayoutMode: 未知の値は偽', () => {
    for (const v of [null, undefined, '', 'presentation', 'SPLIT', 3, {}]) {
      expect(isLayoutMode(v)).toBe(false);
    }
  });

  it('coerceLayoutMode は不正値を既定値に丸める', () => {
    expect(coerceLayoutMode('editor')).toBe('editor');
    expect(coerceLayoutMode('bogus')).toBe('split');
    expect(coerceLayoutMode(null, 'preview')).toBe('preview');
  });

  it('layoutModeFromKey はキーからモードを引く', () => {
    expect(layoutModeFromKey('1')).toBe('split');
    expect(layoutModeFromKey('2')).toBe('editor');
    expect(layoutModeFromKey('3')).toBe('preview');
    expect(layoutModeFromKey('4')).toBeNull();
    expect(layoutModeFromKey('v')).toBeNull();
    expect(layoutModeFromKey('')).toBeNull();
  });

  it('present モードでは保存値によらず preview になる', () => {
    expect(resolveLayout('editor', 'present')).toBe('preview');
    expect(resolveLayout('split', 'present')).toBe('preview');
    expect(resolveLayout('bogus', 'present')).toBe('preview');
  });

  it('edit モードでは保存値が使われる（不正値は既定値）', () => {
    expect(resolveLayout('editor', 'edit')).toBe('editor');
    expect(resolveLayout('preview', 'edit')).toBe('preview');
    expect(resolveLayout('bogus', 'edit')).toBe('split');
    expect(resolveLayout(null, 'edit')).toBe('split');
  });

  it('editor レイアウトでは DOM 依存の書き出しができない', () => {
    expect(canExportFromDom('editor')).toBe(false);
    expect(canExportFromDom('split')).toBe(true);
    expect(canExportFromDom('preview')).toBe(true);
  });
});
