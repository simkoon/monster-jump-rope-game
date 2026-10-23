// @vitest-environment node
// src/game/scene/faceOrders.corners.test.tsx — every animal order on the 3 non-start corners
// (regular tiles of the face occlusion matrix): no face more than 30 % hidden (BOARD-05,
// ROADMAP SC4, D-17a(4), 07-VERIFICATION). See faceOrders.start.test.tsx.
import { describe, it, vi, afterEach } from 'vitest';
import {
  REGULAR_TILES,
  SIZES,
  TILE_SWEEP_RECORDS,
  closeAll,
  expectClean,
  sweepTile,
  type FaceRecord,
} from './occlusionKit';

vi.mock('../reducedMotion', () => ({ prefersReducedMotion: () => true }));

afterEach(closeAll);

describe('face occlusion, every animal order — 3 corners (SC4)', () => {
  for (const L of SIZES) {
    it(`${L} tiles: no face over 30 % on 3 corners with 2-8 characters, current here or away, 6 views`, async () => {
      const records: FaceRecord[] = [];
      for (const tile of REGULAR_TILES(L).slice(4)) records.push(...(await sweepTile(L, tile, 'regular')));
      expectClean(records, 3 * TILE_SWEEP_RECORDS);
    }, 60_000);
  }
});
