// src/game/moveHighlight.ts — PURE model for the "where am I going?" board highlight (LOOP-05/06/07).
// SAME CONTRACT AS boardLayout.ts: no React/DOM/three imports, deterministic, side-effect free
// → unit-testable. `MoveSpec` is pulled in as a TYPE ONLY, so there is no runtime dependency
// on the scene layer.
//
// Given the roll the engine already resolved ({ from, afterRoll, to }), this decides which
// squares the board should mark: the in-between step dots, the dice destination ring, and —
// when an event moved the player again — the final event square.
import type { MoveSpec } from './scene/Token';

// Fixed capacity of the step-dot instancedMesh. A die caps at 6, so at most 5 squares sit
// strictly between `from` and the destination; 8 leaves headroom. Keeping this a CONSTANT is
// what lets the instancedMesh `args` never change → no remount per roll (D-08).
export const MAX_STEP_MARKERS = 8;

export interface HighlightPlan {
  // Squares strictly between `from` and the dice destination (dots to count the roll).
  steps: number[];
  // The dice destination square (ring). Always on the board.
  dest: number;
  // The event's final square (pin), or null when the turn had no extra movement.
  final: number | null;
  // Which way the event moved the player — drives the pin's color (mint / coral).
  finalDir: 'forward' | 'backward' | null;
}

export function planHighlight(move: MoveSpec, boardLength: number): HighlightPlan {
  // The engine deliberately does NOT clamp an overshoot win (D-03): `afterRoll` and a forward
  // event's `to` can both exceed boardLength. squarePosition() happily returns coordinates for
  // out-of-range indices, so WITHOUT this clamp every winning turn would spawn markers floating
  // past the end of the board. Clamp everything we return into [0, boardLength].
  const clamp = (i: number) => Math.min(Math.max(i, 0), boardLength);

  const from = clamp(move.from);
  const dest = clamp(move.afterRoll);

  // Walk between the CLAMPED endpoints so an overshoot can never produce duplicate or
  // off-board dots; both endpoints are excluded (the token starts on one, the ring marks the other).
  const steps: number[] = [];
  if (dest !== from) {
    const dir = dest > from ? 1 : -1;
    for (let s = from + dir; s !== dest; s += dir) steps.push(s);
  }

  // Direction is judged on the RAW values: after clamping, a winning event's final square can
  // equal `dest`, but the event still moved the player forward and must read as such.
  const hasEvent = move.to !== move.afterRoll;
  const final = hasEvent ? clamp(move.to) : null;
  const finalDir: HighlightPlan['finalDir'] = !hasEvent
    ? null
    : move.to > move.afterRoll
      ? 'forward'
      : 'backward';

  return { steps: steps.slice(0, MAX_STEP_MARKERS), dest, final, finalDir };
}
