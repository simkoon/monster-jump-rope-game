// src/engine/stats.test.ts — per-participant game stats helpers (D-15) and the lucky-event rule (A2).
import { describe, it, expect } from 'vitest';
import { bumpStats, EMPTY_STATS, initStats, isLuckyEvent } from './stats';
import type { PlayerStats } from './state';

describe('isLuckyEvent (A2 — single source for 🍀 and the sparkle/puff choice)', () => {
  it('a suppressed extra is never lucky, even when labelled 보너스', () => {
    expect(isLuckyEvent({ eff: 'extra', label: '보너스' }, true)).toBe(false);
    expect(isLuckyEvent({ eff: 'extra', label: '' }, true)).toBe(false);
  });

  it('label 보너스 is lucky regardless of the effect', () => {
    expect(isLuckyEvent({ eff: 'backward', label: '보너스' }, false)).toBe(true);
    expect(isLuckyEvent({ eff: 'forward', label: '보너스' }, false)).toBe(true);
  });

  it('label 함정 is never lucky', () => {
    expect(isLuckyEvent({ eff: 'forward', label: '함정' }, false)).toBe(false);
    expect(isLuckyEvent({ eff: 'extra', label: '함정' }, false)).toBe(false);
  });

  it('without a label: anything except backward is lucky', () => {
    expect(isLuckyEvent({ eff: 'forward', label: '' }, false)).toBe(true);
    expect(isLuckyEvent({ eff: 'extra', label: '' }, false)).toBe(true);
    expect(isLuckyEvent({ eff: 'backward', label: '' }, false)).toBe(false);
  });

  it('suppressed only matters for extra', () => {
    expect(isLuckyEvent({ eff: 'forward', label: '' }, true)).toBe(true);
  });
});

describe('initStats / bumpStats', () => {
  it('EMPTY_STATS is all zero and frozen', () => {
    expect(EMPTY_STATS).toEqual({
      attempts: 0,
      successes: 0,
      failures: 0,
      retrySuccesses: 0,
      hardSuccesses: 0,
      luckyCount: 0,
    });
    expect(Object.isFrozen(EMPTY_STATS)).toBe(true);
  });

  it('initStats gives every id its own all-zero record', () => {
    const s = initStats(['a', 'b']);
    expect(Object.keys(s)).toEqual(['a', 'b']);
    expect(s.a).toEqual(EMPTY_STATS);
    expect(s.b).toEqual(EMPTY_STATS);
    expect(initStats([])).toEqual({});
  });

  it('bumpStats adds the deltas to one pid only', () => {
    const s = initStats(['a', 'b']);
    const t = bumpStats(s, 'a', { attempts: 1, successes: 1, hardSuccesses: 1 });
    expect(t.a).toEqual({ ...EMPTY_STATS, attempts: 1, successes: 1, hardSuccesses: 1 });
    expect(t.b).toBe(s.b);
    const u = bumpStats(t, 'a', { attempts: 1, failures: 1 });
    expect(u.a).toEqual({ ...EMPTY_STATS, attempts: 2, successes: 1, failures: 1, hardSuccesses: 1 });
  });

  it('a missing pid starts from EMPTY_STATS', () => {
    const t = bumpStats({}, 'z', { luckyCount: 1 });
    expect(t.z).toEqual({ ...EMPTY_STATS, luckyCount: 1 });
  });

  it('never mutates the input record or its inner objects', () => {
    const inner: PlayerStats = { ...EMPTY_STATS, attempts: 3 };
    const s = Object.freeze({ a: Object.freeze(inner) });
    const t = bumpStats(s, 'a', { attempts: 1, luckyCount: 2 });
    expect(t).not.toBe(s);
    expect(t.a).not.toBe(s.a);
    expect(s.a).toEqual({ ...EMPTY_STATS, attempts: 3 });
    expect(t.a).toEqual({ ...EMPTY_STATS, attempts: 4, luckyCount: 2 });
  });
});
