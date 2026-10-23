// @vitest-environment node
// src/game/scene/faceOrders.crowdStart.test.tsx — every animal order on the last tiles before the
// start (L − 2 behind L − 1, L − 1 behind the start tile), over the crowded splits with the current
// turn on the first tile, on the second or on neither: no face more than 30 % hidden (BOARD-05,
// D-17b(4), 07-VERIFICATION run 3: a crown on L − 1 hid a lone face on L − 2, the start tile's back
// row hid L − 1's front face). On 16 tiles L − 2 + L − 1 is also the right side's middle pair. See
// faceOrders.crowdSides.test.tsx.
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  PAIR_CURRENTS_SWEEP_RECORDS,
  SIZES,
  closeAll,
  expectClean,
  sweepPairCurrents,
  type FaceRecord,
} from './occlusionKit';
import { tileShape } from '../layout/pawnSlots';

vi.mock('../reducedMotion', () => ({ prefersReducedMotion: () => true }));

afterEach(closeAll);

const BEFORE_START = (L: number): [number, number][] => [
  [L - 2, L - 1],
  [L - 1, 0],
];

describe('face occlusion, every animal order — the tiles before the start, current anywhere (D-17b(4))', () => {
  it('picks L − 2 + L − 1 and L − 1 + the start tile', () => {
    for (const L of SIZES) {
      expect(BEFORE_START(L).map(([a, b]) => [tileShape(L, a).shape, tileShape(L, b).shape])).toEqual([
        ['x', 'preStart'],
        ['preStart', 'start'],
      ]);
    }
  });

  for (const L of SIZES) {
    it(`${L} tiles: no face over 30 % on 2 pairs, 6 splits, current on either tile or away, 6 views`, async () => {
      const records: FaceRecord[] = [];
      for (const [a, b] of BEFORE_START(L)) records.push(...(await sweepPairCurrents(L, a, b)));
      expectClean(records, BEFORE_START(L).length * PAIR_CURRENTS_SWEEP_RECORDS);
    }, 60_000);
  }
});
