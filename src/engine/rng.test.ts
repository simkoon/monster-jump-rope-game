// src/engine/rng.test.ts — seeded distribution + edge-case proofs for the isolated RNG (D-07).
// Every assertion uses a fixed mulberry32 seed → deterministic, zero flakiness.
import { describe, it, expect } from 'vitest';
import { mulberry32, rollDie, weightedPick, uniformPick } from './rng';

type W = { id: string; weight: number };

describe('rollDie', () => {
  it('always returns an integer in [1,6]', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 5000; i++) {
      const v = rollDie(rng);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });

  it('is ~uniform over 60000 seeded rolls (each face within ±5% of N/6)', () => {
    const rng = mulberry32(12345);
    const buckets = [0, 0, 0, 0, 0, 0, 0]; // index 1..6
    const N = 60000;
    for (let i = 0; i < N; i++) buckets[rollDie(rng)]++;
    for (let f = 1; f <= 6; f++) {
      expect(buckets[f]).toBeGreaterThan((N / 6) * 0.95);
      expect(buckets[f]).toBeLessThan((N / 6) * 1.05);
    }
  });
});

describe('weightedPick', () => {
  it('tracks weights 3:2:1 within ±5% over 60000 seeded picks', () => {
    const rng = mulberry32(999);
    const items: W[] = [
      { id: 'a', weight: 3 },
      { id: 'b', weight: 2 },
      { id: 'c', weight: 1 },
    ];
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    const N = 60000;
    for (let i = 0; i < N; i++) {
      const picked = weightedPick(items, (w) => w.weight, rng);
      counts[picked!.id]++;
    }
    const expected = { a: 3 / 6, b: 2 / 6, c: 1 / 6 };
    for (const k of ['a', 'b', 'c'] as const) {
      const ratio = counts[k] / N;
      expect(ratio).toBeGreaterThan(expected[k] - 0.05);
      expect(ratio).toBeLessThan(expected[k] + 0.05);
    }
  });

  it('returns null on an empty array', () => {
    expect(weightedPick<W>([], (w) => w.weight, mulberry32(1))).toBeNull();
  });

  it('returns null when every weight is zero', () => {
    const items: W[] = [
      { id: 'a', weight: 0 },
      { id: 'b', weight: 0 },
    ];
    expect(weightedPick(items, (w) => w.weight, mulberry32(1))).toBeNull();
  });

  it('always returns the only positively-weighted item', () => {
    const items: W[] = [
      { id: 'zero', weight: 0 },
      { id: 'only', weight: 5 },
    ];
    const rng = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      expect(weightedPick(items, (w) => w.weight, rng)!.id).toBe('only');
    }
  });

  it('treats negative weights as zero (never returns them alone)', () => {
    const items: W[] = [{ id: 'neg', weight: -10 }];
    expect(weightedPick(items, (w) => w.weight, mulberry32(1))).toBeNull();
  });
});

describe('uniformPick', () => {
  it('returns null on an empty array', () => {
    expect(uniformPick<number>([], mulberry32(1))).toBeNull();
  });

  it('always returns the single item', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 500; i++) {
      expect(uniformPick(['solo'], rng)).toBe('solo');
    }
  });

  it('draws every index and stays in-bounds over many seeded picks', () => {
    const rng = mulberry32(2024);
    const items = ['a', 'b', 'c', 'd'];
    const seen = new Set<string>();
    for (let i = 0; i < 4000; i++) {
      const v = uniformPick(items, rng);
      expect(items).toContain(v);
      seen.add(v!);
    }
    expect(seen.size).toBe(items.length); // no index is ever unreachable
  });
});
