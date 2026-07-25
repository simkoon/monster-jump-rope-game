// src/engine/placement.ts — weighted board event placement (EVENT-06).
// Mirrors normalize.ts's "total 0 → no divide-by-zero" philosophy: weightedPick
// returns null on empty/all-zero weights, leaving the square empty.
// PHASE 2/3 CONTRACT: no React/DOM imports.
import type { Event } from '../schema';
import { weightedPick, type Rng } from './rng';

// Place events on interior squares (1..boardLength-1) by weight. Start (0) and
// finish (boardLength) always stay null. `density` is the probability each interior
// square becomes an event square (Claude discretion, EVENT-06 A2 default 0.5);
// weight-ratio correctness is independent of density.
export function placeEvents(
  events: Event[],
  boardLength: number,
  rng: Rng,
  density = 0.5,
): (string | null)[] {
  const board: (string | null)[] = new Array(boardLength + 1).fill(null);
  if (events.length === 0) return board; // no events → all-null board
  for (let sq = 1; sq < boardLength; sq++) {
    // start(0) & finish(boardLength) excluded
    if (rng.next() >= density) continue; // this square stays empty
    const picked = weightedPick(events, (e) => e.weight, rng); // all-zero weights → null
    board[sq] = picked ? picked.id : null;
  }
  return board;
}
