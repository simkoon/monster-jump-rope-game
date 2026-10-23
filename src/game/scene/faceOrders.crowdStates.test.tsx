// @vitest-environment node
// src/game/scene/faceOrders.crowdStates.test.tsx — the 20 two-tile states that a sweep of every
// adjacent pair (all splits na + nb ≤ 8, the current turn on either tile or on neither, 16/20/24
// tiles) found over 30 % in 07-VERIFICATION run 3, pinned under every animal order: no face more than
// 30 % hidden (BOARD-05, D-17b(4)). Most of them are also inside faceOrders.crowd*.test.tsx; the
// 24-tile side pairs are not. See faceOrders.crowdSides.test.tsx.
import { describe, it, vi, afterEach } from 'vitest';
import { VIEWS, closeAll, expectClean, sweepOrders, type FaceRecord } from './occlusionKit';

vi.mock('../reducedMotion', () => ({ prefersReducedMotion: () => true }));

afterEach(closeAll);

// [ring size, first tile, count there, count on the next tile, current turn ('away' = neither)].
type State = [L: number, a: number, na: number, nb: number, current: string];
const STATES: Record<string, State[]> = {
  // A full-size current on the side tile hid the far corner's front face (33-42 %).
  'far corner + side tile': [
    [16, 7, 2, 6, 'p0'],
    [20, 9, 2, 6, 'p0'],
    [24, 11, 2, 6, 'p0'],
    [16, 12, 6, 2, 'p6'],
    [20, 15, 6, 2, 'p6'],
    [24, 18, 6, 2, 'p6'],
  ],
  // A crown on L − 1 hid a lone face on L − 2 (33 % in all 6 views).
  'L − 2 + L − 1': [
    [16, 14, 1, 6, 'p1'],
    [16, 14, 1, 6, 'away'],
    [20, 18, 1, 6, 'p1'],
    [20, 18, 1, 6, 'away'],
    [24, 22, 1, 6, 'p1'],
    [24, 22, 1, 6, 'away'],
  ],
  // The start tile's back row hid L − 1's front face (33-38 %).
  'L − 1 + start': [
    [20, 19, 4, 3, 'p0'],
    [24, 23, 4, 3, 'p0'],
  ],
  // Rabbit ears on one side tile hid a face on the next (33 %).
  '24-tile side pairs': [
    [24, 10, 2, 5, 'p0'],
    [24, 10, 2, 5, 'p2'],
    [24, 10, 2, 5, 'away'],
    [24, 19, 5, 2, 'p0'],
    [24, 19, 5, 2, 'p5'],
    [24, 19, 5, 2, 'away'],
  ],
};

describe('face occlusion, every animal order — the two-tile states once over 30 % (D-17b(4))', () => {
  for (const [kind, states] of Object.entries(STATES)) {
    it(`${kind}: no face over 30 % in ${states.length} states, 6 views`, async () => {
      const records: FaceRecord[] = [];
      for (const [L, a, na, nb, cur] of states) {
        const label = `pair L${L} t${a}+t${(a + 1) % L} ${na}+${nb} current ${cur}`;
        records.push(...(await sweepOrders(L, [[a, na], [(a + 1) % L, nb]], label, cur)));
      }
      const slots = states.reduce((t, [, , na, nb]) => t + na + nb, 0);
      expectClean(records, slots * 8 * VIEWS.length);
    }, 60_000);
  }
});
