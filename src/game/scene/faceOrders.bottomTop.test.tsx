// @vitest-environment node
// src/game/scene/faceOrders.bottomTop.test.tsx — every animal order on the middle of the bottom and top sides
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

describe('face occlusion, every animal order — bottom and top side middles (SC4)', () => {
  for (const L of SIZES) {
    it(`${L} tiles: no face over 30 % on 2 tiles with 1-8 characters, current here or away, 6 views`, async () => {
      const records: FaceRecord[] = [];
      for (const k of [0, 2]) records.push(...(await sweepTile(L, REGULAR_TILES(L)[k], 'regular')));
      expectClean(records, 2 * TILE_SWEEP_RECORDS);
    }, 60_000);
  }
});
