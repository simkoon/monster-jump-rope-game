// @vitest-environment node
// src/game/scene/faceOrders.start.test.tsx — every animal order on the start tile and on the tile
// before it (L − 1): no face more than 30 % hidden (BOARD-05, ROADMAP SC4, D-17a(4), 07-VERIFICATION).
// Players pick their own animals, so one fixed cast proves nothing about the others: a bear, panda or
// rabbit hides more of the face behind it than a cat does, and a pig, chick, bear or panda face loses
// more behind the same occluder. sweepOrders (occlusionKit.tsx) measures every slot against every
// animal in every other slot and keeps, per face and view, the worst of all distinct animal orders.
// faceOrders.bottomTop / leftRight / corners / pairs.test.tsx cover the other tiles of the matrix
// and the pairs.
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  SIZES,
  TILE_SWEEP_RECORDS,
  closeAll,
  expectClean,
  measureTiles,
  sweepOrders,
  sweepTile,
  type Participant,
} from './occlusionKit';
import type { AnimalId } from '../../engine/animals';

vi.mock('../reducedMotion', () => ({ prefersReducedMotion: () => true }));

afterEach(closeAll);

describe('face occlusion, every animal order — start tile and tile L − 1 (SC4)', () => {
  for (const L of SIZES) {
    it(`${L} tiles: no face over 30 % with 1-8 characters, current here or away, 6 views`, async () => {
      const records = [...(await sweepTile(L, 0, 'start')), ...(await sweepTile(L, L - 1, 'preStart'))];
      expectClean(records, 2 * TILE_SWEEP_RECORDS);
    }, 60_000);
  }

  // Control: the sweep is only as good as its masks. Mounting the worst orders it reports (and the
  // 07-VERIFICATION cast that hid 46-63 % of a face before this fix) must measure exactly what the
  // sweep says, or no more than its worst, so the sweep can neither invent nor miss occlusion.
  it('control: mounted directly, the reported worst orders measure exactly what the sweep says', async () => {
    const sweep = await sweepOrders(16, [[0, 8]], 'start L16 n8');
    const worst = [...sweep].sort((a, b) => b.hidden - a.hidden).slice(0, 3);
    expect(worst[0].hidden).toBeGreaterThan(0);
    const verifier: AnimalId[] = ['pig', 'fox', 'dog', 'chick', 'bear', 'panda', 'cat', 'rabbit'];
    for (const cast of [...worst.map((r) => r.by.split(',') as AnimalId[]), verifier]) {
      const parts: Participant[] = cast.map((animal, i) => ({ id: `p${i}`, animal }));
      for (const f of await measureTiles(16, [[0, 8]], parts, 'direct')) {
        const [, k, view] = f.label.match(/slot (\d+) (\S+)$/)!;
        const swept = sweep.find((r) => r.label === `start L16 n8 slot ${k} ${cast[Number(k)]} ${view}`)!;
        expect(f.hidden, `${cast.join(',')} ${f.label}`).toBeLessThanOrEqual(swept.hidden);
        if (worst.some((r) => r.label === swept.label && r.by === cast.join(','))) expect(f.hidden).toBe(swept.hidden);
      }
    }
  });
});
