// src/engine/placement.test.ts — weighted event placement edge cases + ratio (EVENT-06).
import { describe, it, expect } from 'vitest';
import { placeEvents } from './placement';
import { mulberry32 } from './rng';
import type { Event } from '../schema';

function ev(id: string, weight: number, eff: Event['eff'] = 'forward'): Event {
  return { id, name: id, eff, steps: eff === 'extra' ? 0 : 1, weight, label: '' };
}

describe('placeEvents', () => {
  it('returns a board of length boardLength+1 with start(0) and finish always null', () => {
    const board = placeEvents([ev('a', 1)], 20, mulberry32(1), 1);
    expect(board).toHaveLength(21);
    expect(board[0]).toBeNull(); // start
    expect(board[20]).toBeNull(); // finish
  });

  it('never places an eventId on index 0 or index boardLength (density=1)', () => {
    for (let seed = 0; seed < 20; seed++) {
      const board = placeEvents([ev('a', 3), ev('b', 2)], 15, mulberry32(seed), 1);
      expect(board[0]).toBeNull();
      expect(board[15]).toBeNull();
    }
  });

  it('fills every interior square when density=1', () => {
    const board = placeEvents([ev('a', 1)], 10, mulberry32(5), 1);
    for (let sq = 1; sq < 10; sq++) expect(board[sq]).toBe('a');
  });

  it('returns an all-null board when there are no events', () => {
    const board = placeEvents([], 12, mulberry32(1), 1);
    expect(board).toHaveLength(13);
    expect(board.every((c) => c === null)).toBe(true);
  });

  it('places nothing when every event weight is zero', () => {
    const board = placeEvents([ev('a', 0), ev('b', 0)], 12, mulberry32(1), 1);
    expect(board.every((c) => c === null)).toBe(true);
  });

  it('handles a very short board (length 2 → only interior square 1)', () => {
    const board = placeEvents([ev('a', 1)], 2, mulberry32(1), 1);
    expect(board).toHaveLength(3);
    expect(board[0]).toBeNull();
    expect(board[2]).toBeNull();
    expect(board[1]).toBe('a');
  });

  it('tracks weight ratio 3:2:1 across interior squares over many seeded boards (±5%)', () => {
    const events = [ev('a', 3), ev('b', 2), ev('c', 1)];
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    let placed = 0;
    const boards = 4000;
    for (let seed = 0; seed < boards; seed++) {
      const board = placeEvents(events, 30, mulberry32(seed), 1); // density 1 → every interior filled
      for (let sq = 1; sq < 30; sq++) {
        const id = board[sq];
        if (id) {
          counts[id]++;
          placed++;
        }
      }
    }
    const expected = { a: 3 / 6, b: 2 / 6, c: 1 / 6 };
    for (const k of ['a', 'b', 'c'] as const) {
      const ratio = counts[k] / placed;
      expect(ratio).toBeGreaterThan(expected[k] - 0.05);
      expect(ratio).toBeLessThan(expected[k] + 0.05);
    }
  });

  it('leaves some interior squares empty when density < 1', () => {
    const board = placeEvents([ev('a', 1)], 30, mulberry32(1), 0.5);
    const interior = board.slice(1, 30);
    const empties = interior.filter((c) => c === null).length;
    expect(empties).toBeGreaterThan(0);
    expect(empties).toBeLessThan(interior.length);
  });
});
