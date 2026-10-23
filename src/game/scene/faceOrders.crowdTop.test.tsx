// @vitest-environment node
// src/game/scene/faceOrders.crowdTop.test.tsx — every animal order on two adjacent crowded tiles in
// the middle of the top side, over the crowded splits with the current turn on the first tile, on
// the second or on neither: no face more than 30 % hidden (BOARD-05, D-17b(4), 07-VERIFICATION run 3).
// See faceOrders.crowdSides.test.tsx.
import { describe, it, vi, afterEach } from 'vitest';
import {
  CROSS_PAIRS,
  PAIR_CURRENTS_SWEEP_RECORDS,
  SIZES,
  closeAll,
  expectClean,
  sweepPairCurrents,
} from './occlusionKit';

vi.mock('../reducedMotion', () => ({ prefersReducedMotion: () => true }));

afterEach(closeAll);

describe('face occlusion, every animal order — two crowded tiles mid-top, current anywhere (D-17b(4))', () => {
  for (const L of SIZES) {
    it(`${L} tiles: no face over 30 % on 6 splits, current on either tile or away, 6 views`, async () => {
      const [a, b] = CROSS_PAIRS(L)[2];
      expectClean(await sweepPairCurrents(L, a, b), PAIR_CURRENTS_SWEEP_RECORDS);
    }, 60_000);
  }
});
