// @vitest-environment node
// src/game/scene/faceOrders.crowdCorners.test.tsx — every animal order on a far corner and the side
// tile in front of it (the last left-side tile + the top-left corner, the top-right corner + the
// first right-side tile), over the crowded splits with the current turn on the first tile, on the
// second or on neither: no face more than 30 % hidden (BOARD-05, D-17b(4), 07-VERIFICATION run 3:
// a full-size current on the side tile hid the corner's front face, 33-42 %). See
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

const CORNERS = (L: number): [number, number][] => [
  [L / 2 - 1, L / 2],
  [(3 * L) / 4, (3 * L) / 4 + 1],
];

describe('face occlusion, every animal order — far corner + side tile, current anywhere (D-17b(4))', () => {
  it('picks each far corner with the side tile in front of it', () => {
    expect(CORNERS(16)).toEqual([
      [7, 8],
      [12, 13],
    ]);
    for (const L of SIZES) {
      for (const [a, b] of CORNERS(L)) {
        expect([tileShape(L, a).shape, tileShape(L, b).shape].sort()).toEqual(['far', 'x']);
      }
    }
  });

  for (const L of SIZES) {
    it(`${L} tiles: no face over 30 % on 2 pairs, 6 splits, current on either tile or away, 6 views`, async () => {
      const records: FaceRecord[] = [];
      for (const [a, b] of CORNERS(L)) records.push(...(await sweepPairCurrents(L, a, b)));
      expectClean(records, CORNERS(L).length * PAIR_CURRENTS_SWEEP_RECORDS);
    }, 60_000);
  }
});
