// @vitest-environment node
// src/game/scene/faceOrders.pairs.test.tsx — every animal order on two adjacent crowded tiles (the
// pairs and splits of the D-17b(4) matrix, the current turn on the first tile): no face more than
// 30 % hidden (BOARD-05, ROADMAP SC4, D-17b(4), 07-VERIFICATION). See faceOrders.start.test.tsx.
import { describe, it, vi, afterEach } from 'vitest';
import {
  CROSS_PAIRS,
  PAIR_SWEEP_RECORDS,
  SIZES,
  closeAll,
  expectClean,
  sweepPair,
  type FaceRecord,
} from './occlusionKit';

vi.mock('../reducedMotion', () => ({ prefersReducedMotion: () => true }));

afterEach(closeAll);

describe('face occlusion, every animal order — two adjacent tiles (SC4)', () => {
  for (const L of SIZES) {
    it(`${L} tiles: no face over 30 % on 5 pairs, splits 1+1 3+2 2+3 4+4 1+7 7+1, 6 views`, async () => {
      const records: FaceRecord[] = [];
      for (const [a, b] of CROSS_PAIRS(L)) records.push(...(await sweepPair(L, a, b)));
      expectClean(records, CROSS_PAIRS(L).length * PAIR_SWEEP_RECORDS);
    }, 60_000);
  }
});
