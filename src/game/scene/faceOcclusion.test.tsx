// @vitest-environment node
// src/game/scene/faceOcclusion.test.tsx — no character's face is more than 30 % hidden, with 1-8
// characters on one tile or split over two adjacent tiles (BOARD-05, ROADMAP SC4, D-17, D-17a(4),
// D-17b(4), 07-VERIFICATION gap 1, 07-REVIEW CR-01).
// This is the final criterion for the slot tables. slotOcclusion.test.ts stays as the cheap D-19
// check (head discs only); it cannot see the start gate, the ears, the crowns or the stars, which is
// how the 07-05 tables passed it while the arch hid back-row faces at the start of every game.
// The harness (occlusionKit.tsx) mounts the real SceneContents (real StartGate, real chibi meshes
// with ears and crowns, real floating stars) and casts rays from the real fitCamera camera position
// to the camera-facing vertices of each character's chibi-face mesh.
// Matrix: 6 views × 16/20/24 tiles × the start tile and 7 regular tiles (the middle of each side and
// the 3 non-start corners) × n 1-8 × 2 casts — `roster` (the first n animals; bear is the current
// turn, rabbit next) and `rabbits` (n rabbits, which no real game can have: the animals are distinct).
// Everyone holds 1 star (crowned) and every quest tile is hard.
// Pairs: two adjacent tiles at once (CROSS_PAIRS) with the splits in SPLITS, p0 on the first tile,
// so a neighbor's crowd and its lifted or hidden star row are in the scene too.
// Every other animal order: faceOrders.*.test.tsx sweep each tile and pair over all distinct animal
// orders (07-VERIFICATION, SC4).
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  CROSS_PAIRS,
  REGULAR_TILES,
  SIZES,
  SPLITS,
  closeAll,
  expectClean,
  measureFace,
  measureTiles,
  mountTiles,
  unmount,
  type FaceRecord,
  type Group,
} from './occlusionKit';
import { slotTable, tileShape } from '../layout/pawnSlots';
import { ringLayout, tileCenter } from '../layout/ringLayout';
import { ANIMALS, type AnimalId } from '../../engine/animals';

vi.mock('../reducedMotion', () => ({ prefersReducedMotion: () => true }));

const COUNTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const CASTS = ['roster', 'rabbits'] as const;
type Cast = (typeof CASTS)[number];

const castOf = (cast: Cast, n: number): { id: string; animal: AnimalId }[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, animal: cast === 'rabbits' ? 'rabbit' : ANIMALS[i] }));

afterEach(closeAll);

// One mount per (L, tile, cast, n): every face of that tile in every view.
async function measureTile(L: number, tile: number, cast: Cast, n: number): Promise<FaceRecord[]> {
  const kind = tile === 0 ? 'start' : 'regular';
  return measureTiles(L, [[tile, n]], castOf(cast, n), `${kind} L${L} t${tile} ${cast} n${n}`);
}

// Several tiles at once, in participant order (p0, the current turn, on the first tile). The roster
// cast keeps counting through the groups (8 participants = 8 animals).
const measurePair = (L: number, groups: readonly Group[], cast: Cast, label: string) =>
  measureTiles(L, groups, castOf(cast, groups.reduce((a, [, c]) => a + c, 0)), label);

// Positive control: a character moved behind an occluder must read as hidden, so a harness that
// never hits anything fails. The ground group is moved after mount and measured without frames,
// because Character would ease it back to its slot.
async function controlCover(L: number, tile: number, dx: number, dz: number): Promise<number> {
  const m = await mountTiles(L, [[tile, 2]], castOf('roster', 2));
  const c = tileCenter(ringLayout(L), tile);
  const g = m.root.getObjectByName('pawn-p1')!;
  g.position.set(c.x + dx, g.position.y, c.z + dz);
  g.scale.setScalar(0.65);
  const cover = Math.max(...measureFace(m, 'p1', L).map((f) => f.hidden));
  await unmount(m);
  return cover;
}

describe('face occlusion — start tile (D-17a(4))', () => {
  for (const L of SIZES) {
    it(`${L} tiles: no face over 30 % with 1-8 characters, 2 casts, 6 views`, async () => {
      const records: FaceRecord[] = [];
      for (const cast of CASTS) for (const n of COUNTS) records.push(...(await measureTile(L, 0, cast, n)));
      expectClean(records, 432);
    }, 60_000);
  }

  it('control: a 0.65 character behind the arch reads as hidden', async () => {
    expect(await controlCover(16, 0, 0.35, -0.45)).toBeGreaterThanOrEqual(0.9);
  });
});

describe('face occlusion — regular tiles (D-17a(4))', () => {
  it('picks the side middles and the non-start corners', () => {
    expect(REGULAR_TILES(16)).toEqual([2, 6, 10, 14, 4, 8, 12]);
    expect(REGULAR_TILES(20)).toEqual([2, 7, 12, 17, 5, 10, 15]);
    expect(REGULAR_TILES(24)).toEqual([3, 9, 15, 21, 6, 12, 18]);
  });

  for (const L of SIZES) {
    it(`${L} tiles: no face over 30 % on 7 tiles with 1-8 characters, 2 casts, 6 views`, async () => {
      const records: FaceRecord[] = [];
      for (const tile of REGULAR_TILES(L)) {
        for (const cast of CASTS) for (const n of COUNTS) records.push(...(await measureTile(L, tile, cast, n)));
      }
      expectClean(records, 3024);
    }, 60_000);
  }

  it('control: a 0.65 character straight behind the full-size current reads as hidden', async () => {
    const [, front] = slotTable(2, tileShape(16, 2).shape).slots[0];
    expect(await controlCover(16, 2, 0, front - 0.3)).toBeGreaterThanOrEqual(0.9);
  });
});

describe('face occlusion — two adjacent tiles (D-17b(4))', () => {
  it('picks the left, right and top side middles, the top-left corner and the tile before start', () => {
    expect(CROSS_PAIRS(16)).toEqual([
      [6, 7],
      [14, 15],
      [10, 11],
      [7, 8],
      [15, 0],
    ]);
  });

  for (const L of SIZES) {
    it(`${L} tiles: no face over 30 % on 5 pairs, splits 1+1 3+2 2+3 4+4 1+7 7+1, 2 casts, 6 views`, async () => {
      const records: FaceRecord[] = [];
      for (const [a, b] of CROSS_PAIRS(L)) {
        for (const cast of CASTS) {
          for (const [na, nb] of SPLITS) {
            const label = `pair L${L} t${a}+t${b} ${cast} ${na}+${nb}`;
            records.push(...(await measurePair(L, [[a, na], [b, nb]], cast, label)));
          }
        }
      }
      expectClean(records, 2160);
    }, 60_000);
  }
});
