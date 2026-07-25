import { describe, it, expect } from 'vitest';
import { normalizedPercents } from './normalize';
import type { Event } from '../schema';

function ev(id: string, weight: number): Event {
  return { id, name: id, eff: 'forward', steps: 1, weight, label: '' };
}

describe('normalizedPercents', () => {
  it('returns 0 for every id when all weights are zero (no divide-by-zero)', () => {
    const pct = normalizedPercents([ev('a', 0), ev('b', 0)]);
    expect(pct.get('a')).toBe(0);
    expect(pct.get('b')).toBe(0);
  });

  it('returns an empty map for an empty list', () => {
    expect(normalizedPercents([]).size).toBe(0);
  });

  it('maps a lone positive weight to 100', () => {
    const pct = normalizedPercents([ev('a', 7)]);
    expect(pct.get('a')).toBe(100);
  });

  it('splits three equal weights to 33/33/33 (rounding artifact accepted)', () => {
    const pct = normalizedPercents([ev('a', 1), ev('b', 1), ev('c', 1)]);
    expect(pct.get('a')).toBe(33);
    expect(pct.get('b')).toBe(33);
    expect(pct.get('c')).toBe(33);
  });
});
