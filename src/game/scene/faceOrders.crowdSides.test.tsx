// @vitest-environment node
// src/game/scene/faceOrders.crowdSides.test.tsx — every animal order on two adjacent crowded tiles in
// the middle of the left and right sides, over the crowded splits 2+6 6+2 1+6 4+3 2+5 5+2 with the
// current turn on the first tile, on the second or on neither: no face more than 30 % hidden
// (BOARD-05, D-17b(4), 07-VERIFICATION run 3). faceOrders.pairs.test.tsx covers the other splits
// with the current on the first tile; faceOrders.crowdTop / crowdCorners / crowdStart.test.tsx the
// other pairs, faceOrders.crowdStates.test.tsx the states a sweep of every pair found over 30 %.
// See faceOrders.start.test.tsx.
import { describe, it, vi, afterEach } from 'vitest';
import {
  CROSS_PAIRS,
  PAIR_CURRENTS_SWEEP_RECORDS,
  SIZES,
  closeAll,
  expectClean,
  sweepPairCurrents,
  type FaceRecord,
} from './occlusionKit';

vi.mock('../reducedMotion', () => ({ prefersReducedMotion: () => true }));

afterEach(closeAll);

// The middle of the left side (the first tile is the front one) and of the right side (the back one).
const SIDES = (L: number) => CROSS_PAIRS(L).slice(0, 2);

describe('face occlusion, every animal order — two crowded tiles mid-side, current anywhere (D-17b(4))', () => {
  for (const L of SIZES) {
    it(`${L} tiles: no face over 30 % on 2 pairs, 6 splits, current on either tile or away, 6 views`, async () => {
      const records: FaceRecord[] = [];
      for (const [a, b] of SIDES(L)) records.push(...(await sweepPairCurrents(L, a, b)));
      expectClean(records, SIDES(L).length * PAIR_CURRENTS_SWEEP_RECORDS);
    }, 60_000);
  }
});
