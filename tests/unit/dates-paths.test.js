import { describe, expect, it } from 'vitest';
import { addDays, todayISO } from '../../src/lib/dates.js';
import { getByPath, listPaths } from '../../src/lib/paths.js';

describe('addDays', () => {
  it('moves forward and backward across month and year ends', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2027-01-02', -5)).toBe('2026-12-28');
    expect(addDays('2026-11-01', 0)).toBe('2026-11-01');
  });

  it('is not shifted by daylight-saving changes', () => {
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
  });
});

describe('todayISO', () => {
  it('formats the local date with zero padding', () => {
    expect(todayISO(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });

  it('defaults to now', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getByPath', () => {
  const source = { a: { b: [{ c: 'deep' }] }, n: null };

  it('reads nested objects and array indexes', () => {
    expect(getByPath(source, 'a.b.0.c')).toBe('deep');
  });

  it('returns undefined for missing steps, null parents and empty paths', () => {
    expect(getByPath(source, 'a.x.y')).toBeUndefined();
    expect(getByPath(source, 'n.anything')).toBeUndefined();
    expect(getByPath(source, '')).toBeUndefined();
  });
});

describe('listPaths', () => {
  it('lists every leaf path', () => {
    expect(listPaths({ a: 1, b: { c: 'x', d: [true] } })).toEqual(['a', 'b.c', 'b.d.0']);
  });

  it('returns nothing for a bare value', () => {
    expect(listPaths(42)).toEqual([]);
  });
});
