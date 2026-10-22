// src/engine/board.test.ts — ring board generator (BOARD-04, D-10..D-13).
// All randomness is seeded mulberry32 → deterministic, zero flakiness.
import { describe, it, expect } from 'vitest';
import {
  apportion,
  buildBoard,
  chooseNonAdjacent,
  DIFF_ORDER,
  DIFF_RATIO,
  eventTileCount,
  shuffle,
  tileQuotas,
  type Tile,
} from './board';
import { mulberry32 } from './rng';
import type { Difficulty, Event, Mission } from '../schema';

const mission = (id: string, diff: Difficulty): Mission => ({ id, name: id, desc: '', diff, cats: [] });
const event = (id: string, weight: number, eff: Event['eff'] = 'forward'): Event => ({
  id,
  name: id,
  eff,
  steps: eff === 'extra' ? 0 : 2,
  weight,
  label: '',
});

const ALL_MISSIONS: Mission[] = [
  mission('e1', 'easy'),
  mission('e2', 'easy'),
  mission('n1', 'normal'),
  mission('h1', 'hard'),
];
const EVENTS: Event[] = [event('fw', 5), event('bw', 3, 'backward'), event('ex', 2, 'extra'), event('zero', 0)];

function countBoard(board: Tile[]) {
  const quests: Record<Difficulty, number> = { easy: 0, normal: 0, hard: 0 };
  let events = 0;
  let starts = 0;
  for (const t of board) {
    if (t.kind === 'quest') quests[t.diff]++;
    else if (t.kind === 'event') events++;
    else starts++;
  }
  return { quests, events, starts };
}

describe('constants', () => {
  it('DIFF_ORDER and DIFF_RATIO (D-11)', () => {
    expect(DIFF_ORDER).toEqual(['easy', 'normal', 'hard']);
    expect(DIFF_RATIO).toEqual({ easy: 50, normal: 35, hard: 15 });
  });
});

describe('eventTileCount (D-10)', () => {
  it('16→4, 20→5, 24→6', () => {
    expect(eventTileCount(16)).toBe(4);
    expect(eventTileCount(20)).toBe(5);
    expect(eventTileCount(24)).toBe(6);
  });
});

describe('apportion (largest remainder)', () => {
  it('14 over 50/35/15 → 7/5/2', () => {
    expect(apportion(14, { easy: 50, normal: 35, hard: 15 })).toEqual({ easy: 7, normal: 5, hard: 2 });
  });
  it('always sums to n', () => {
    for (let n = 0; n <= 40; n++) {
      const r = apportion(n, { easy: 50, normal: 35, hard: 15 });
      expect(r.easy + r.normal + r.hard).toBe(n);
    }
  });
  it('remainder ties break in key insertion order', () => {
    expect(apportion(1, { a: 1, b: 1 })).toEqual({ a: 1, b: 0 });
    expect(apportion(2, { a: 1, b: 1, c: 1 })).toEqual({ a: 1, b: 1, c: 0 });
  });
});

describe('tileQuotas (D-10/D-11/D-13)', () => {
  const all = DIFF_ORDER;
  it('all difficulties + events: 16 → 4, 5/4/2; 20 → 5, 7/5/2; 24 → 6, 8/6/3', () => {
    expect(tileQuotas(16, all, true)).toEqual({ events: 4, quests: { easy: 5, normal: 4, hard: 2 } });
    expect(tileQuotas(20, all, true)).toEqual({ events: 5, quests: { easy: 7, normal: 5, hard: 2 } });
    expect(tileQuotas(24, all, true)).toEqual({ events: 6, quests: { easy: 8, normal: 6, hard: 3 } });
  });
  it('no events → quests fill L−1: 16 → 8/5/2; 20 → 9/7/3; 24 → 12/8/3', () => {
    expect(tileQuotas(16, all, false)).toEqual({ events: 0, quests: { easy: 8, normal: 5, hard: 2 } });
    expect(tileQuotas(20, all, false)).toEqual({ events: 0, quests: { easy: 9, normal: 7, hard: 3 } });
    expect(tileQuotas(24, all, false)).toEqual({ events: 0, quests: { easy: 12, normal: 8, hard: 3 } });
  });
  it('hard missing → 16 → 6/5/0; 20 → 8/6/0; 24 → 10/7/0', () => {
    const noHard: Difficulty[] = ['easy', 'normal'];
    expect(tileQuotas(16, noHard, true).quests).toEqual({ easy: 6, normal: 5, hard: 0 });
    expect(tileQuotas(20, noHard, true).quests).toEqual({ easy: 8, normal: 6, hard: 0 });
    expect(tileQuotas(24, noHard, true).quests).toEqual({ easy: 10, normal: 7, hard: 0 });
  });
});

describe('chooseNonAdjacent', () => {
  it('returns k ascending, in-range, non-adjacent positions', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const pos = chooseNonAdjacent(2, 19, 5, mulberry32(seed));
      expect(pos).toHaveLength(5);
      for (let i = 0; i < pos.length; i++) {
        expect(pos[i]).toBeGreaterThanOrEqual(2);
        expect(pos[i]).toBeLessThanOrEqual(19);
        if (i > 0) expect(pos[i] - pos[i - 1]).toBeGreaterThanOrEqual(2);
      }
    }
  });
  it('k=0 → []', () => {
    expect(chooseNonAdjacent(2, 19, 0, mulberry32(1))).toEqual([]);
  });
  it('k beyond the non-adjacent capacity throws RangeError (no rejection loop)', () => {
    // [2..19] has 18 squares → capacity 9
    expect(chooseNonAdjacent(2, 19, 9, mulberry32(1))).toHaveLength(9);
    expect(() => chooseNonAdjacent(2, 19, 10, mulberry32(1))).toThrow(RangeError);
  });
});

describe('shuffle', () => {
  it('returns a new permutation and leaves the input untouched', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(input, mulberry32(42));
    expect(out).not.toBe(input);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('buildBoard invariants (BOARD-04, D-12)', () => {
  it('holds over seeds 1..200 × sizes {16,20,24}', () => {
    for (const L of [16, 20, 24]) {
      const q = tileQuotas(L, DIFF_ORDER, true);
      for (let seed = 1; seed <= 200; seed++) {
        const board = buildBoard(L, ALL_MISSIONS, EVENTS, mulberry32(seed));
        expect(board).toHaveLength(L);
        expect(board[0]).toEqual({ kind: 'start' });
        expect(board[1]).toEqual({ kind: 'quest', diff: 'easy' });
        for (let i = 1; i < L - 1; i++) {
          if (board[i].kind === 'event' && board[i + 1].kind === 'event')
            throw new Error(`adjacent events at ${i} (L=${L}, seed=${seed})`);
        }
        const c = countBoard(board);
        expect(c.starts).toBe(1);
        expect(c.events).toBe(q.events);
        expect(c.quests).toEqual(q.quests);
        for (const t of board) {
          if (t.kind === 'event') expect(t.event.weight).toBeGreaterThan(0);
        }
      }
    }
  });

  it('same seed → same board', () => {
    expect(buildBoard(20, ALL_MISSIONS, EVENTS, mulberry32(7))).toEqual(
      buildBoard(20, ALL_MISSIONS, EVENTS, mulberry32(7)),
    );
  });

  it('A2: without easy missions, square 1 is the easiest available difficulty', () => {
    const missions = [mission('n1', 'normal'), mission('h1', 'hard')];
    for (let seed = 1; seed <= 50; seed++) {
      const board = buildBoard(20, missions, EVENTS, mulberry32(seed));
      expect(board[1]).toEqual({ kind: 'quest', diff: 'normal' });
      expect(board.some((t) => t.kind === 'quest' && t.diff === 'easy')).toBe(false);
    }
  });

  it('D-13: hard missing → no hard tiles, quotas 8/6 on L=20', () => {
    const missions = [mission('e1', 'easy'), mission('n1', 'normal')];
    const c = countBoard(buildBoard(20, missions, EVENTS, mulberry32(3)));
    expect(c.quests).toEqual({ easy: 8, normal: 6, hard: 0 });
  });

  it('D-13: zero placeable events → no event tiles, quests fill L−1', () => {
    for (const evs of [[], [event('z1', 0), event('z2', 0)]]) {
      const c = countBoard(buildBoard(20, ALL_MISSIONS, evs, mulberry32(9)));
      expect(c.events).toBe(0);
      expect(c.quests.easy + c.quests.normal + c.quests.hard).toBe(19);
      expect(c.quests).toEqual({ easy: 9, normal: 7, hard: 3 });
    }
  });

  it('event tiles hold copies — mutating the source event does not change the board', () => {
    const src = [event('only', 1)];
    const board = buildBoard(20, ALL_MISSIONS, src, mulberry32(5));
    src[0].name = 'changed';
    src[0].steps = 9;
    for (const t of board) {
      if (t.kind === 'event') {
        expect(t.event.name).toBe('only');
        expect(t.event.steps).toBe(2);
        expect(t.event).not.toBe(src[0]);
      }
    }
  });

  it('throws when there are no missions', () => {
    expect(() => buildBoard(20, [], EVENTS, mulberry32(1))).toThrow(Error);
  });

  it('weighted event choice follows weights 6/3/1 within ±5pp over 2000 seeds', () => {
    const evs = [event('a', 6), event('b', 3), event('c', 1)];
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    let total = 0;
    for (let seed = 1; seed <= 2000; seed++) {
      for (const t of buildBoard(20, ALL_MISSIONS, evs, mulberry32(seed))) {
        if (t.kind === 'event') {
          counts[t.event.id]++;
          total++;
        }
      }
    }
    expect(Math.abs(counts.a / total - 0.6)).toBeLessThan(0.05);
    expect(Math.abs(counts.b / total - 0.3)).toBeLessThan(0.05);
    expect(Math.abs(counts.c / total - 0.1)).toBeLessThan(0.05);
  });
});
