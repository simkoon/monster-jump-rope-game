// src/engine/ring.ts — ring (looping board) position math + start-bonus rule (TURN-01, TURN-06, D-09).
// PHASE 5 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of src/store.ts / src/settings,
//   - CLOCK-FREE (no wall-clock reads, no timers), and
//   - pure: every function returns new values and never mutates its inputs.
// No randomness lives here; movement amounts arrive as arguments.

// JS `%` keeps the sign of the dividend, so wrap it back into [0, L).
export const wrap = (x: number, L: number): number => ((x % L) + L) % L;

// Lap index of an unwrapped travel distance. floor (not trunc) so travel −2 is lap −1.
export const lapOf = (travel: number, L: number): number => Math.floor(travel / L);

// Squares passed through, excluding the start square and including the destination.
// Length is always |steps|; negative steps walk backward.
export function walkPath(fromTravel: number, steps: number, L: number): number[] {
  const d = Math.sign(steps);
  const out: number[] = [];
  for (let k = 1; k <= Math.abs(steps); k++) out.push(wrap(fromTravel + d * k, L));
  return out;
}

// travel = total signed distance walked since the start square (unwrapped).
// lapsCredited = highest lap already recorded (bonus paid or blocked). Game start = {0, 0}.
export interface RingPos {
  travel: number;
  lapsCredited: number;
}

export interface MoveOutcome {
  travel: number;
  position: number; // always wrap(travel, L)
  lapsCredited: number;
  path: number[];
  bonusEarned: boolean;
}

// The single D-09 decision point. canEarnBonus = "no bonus paid yet this turn".
// - Bonus only when moving forward into a lap never credited before (passing or landing on start).
// - Backward crossings never pay; re-crossing the same lap never pays twice (A1 included).
// - lapsCredited is always raised to the new lap, even when the per-turn cap blocks payment,
//   so a skipped lap can never be paid later ("bonus while standing still").
export function moveBy(p: RingPos, steps: number, L: number, canEarnBonus: boolean): MoveOutcome {
  const travel = p.travel + steps;
  const lap = lapOf(travel, L);
  const bonusEarned = steps > 0 && canEarnBonus && lap > p.lapsCredited;
  return {
    travel,
    position: wrap(travel, L),
    lapsCredited: Math.max(p.lapsCredited, lap),
    path: walkPath(p.travel, steps, L),
    bonusEarned,
  };
}
