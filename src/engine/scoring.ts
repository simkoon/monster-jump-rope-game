// src/engine/scoring.ts — stars per difficulty, winners and ranking (D-02, TURN-03, ROUND-03).
// PHASE 5 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of src/store.ts / src/settings,
//   - CLOCK-FREE (no wall-clock reads, no timers), and
//   - pure: inputs are never mutated; results are new arrays/objects.
import type { Difficulty } from '../schema';

// D-02: stars are awarded by the quest square's difficulty.
export const STARS_BY_DIFF = { easy: 1, normal: 2, hard: 3 } as const;

export function starsFor(diff: Difficulty): 1 | 2 | 3 {
  return STARS_BY_DIFF[diff];
}

// Everyone holding the maximum star count wins (ties are co-winners; all zero → everyone).
export function winnersByStars(ps: readonly { id: string; stars: number }[]): string[] {
  if (ps.length === 0) return [];
  const max = Math.max(...ps.map((p) => p.stars));
  return ps.filter((p) => p.stars === max).map((p) => p.id);
}

export interface Ranked<T> {
  item: T;
  rank: number;
}

// Stars descending, stable among equals (input order), competition ranking 1,1,3.
export function rankByStars<T extends { id: string; stars: number }>(ps: readonly T[]): Ranked<T>[] {
  const sorted = ps
    .map((item, idx) => ({ item, idx }))
    .sort((a, b) => b.item.stars - a.item.stars || a.idx - b.idx);
  const out: Ranked<T>[] = [];
  sorted.forEach(({ item }, i) => {
    const prev = out[i - 1];
    const rank = prev && prev.item.stars === item.stars ? prev.rank : i + 1;
    out.push({ item, rank });
  });
  return out;
}
