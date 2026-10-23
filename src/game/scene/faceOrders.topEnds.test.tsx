// @vitest-environment node
// src/game/scene/faceOrders.topEnds.test.tsx — every animal order on the first and last tile
// of the top side (next to the two far corners): no face more than 30 % hidden (BOARD-05, ROADMAP SC4,
// D-17a(4), 07-VERIFICATION). These tiles share the side middle's table, but the camera sees them
// from the side: a scratch sweep of every tile found the top side's ends the worst (33 % on 24
// tiles before the bottom / top table was re-tuned). faceOrders.bottomEnds.test.tsx covers the
// bottom side; see also faceOrders.start.test.tsx.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { SIZES, TILE_SWEEP_RECORDS, closeAll, expectClean, sweepTile, type FaceRecord } from './occlusionKit';
import { tileShape } from '../layout/pawnSlots';

vi.mock('../reducedMotion', () => ({ prefersReducedMotion: () => true }));

afterEach(closeAll);

const ENDS = (L: number) => [L / 2 + 1, (3 * L) / 4 - 1];

describe('face occlusion, every animal order — ends of the top side (SC4)', () => {
  it('picks the bottom / top side tiles next to the corners', () => {
    expect(ENDS(16)).toEqual([9, 11]);
    for (const L of SIZES) for (const t of ENDS(L)) expect(tileShape(L, t).shape).toBe('z');
  });

  for (const L of SIZES) {
    it(`${L} tiles: no face over 30 % on 2 tiles with 1-8 characters, current here or away, 6 views`, async () => {
      const records: FaceRecord[] = [];
      for (const tile of ENDS(L)) records.push(...(await sweepTile(L, tile, 'regular')));
      expectClean(records, 2 * TILE_SWEEP_RECORDS);
    }, 60_000);
  }
});
