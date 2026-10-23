// src/game/layout/pawnSlots.test.ts — same-tile slots, leaders and stand points (D-17, D-18, BOARD-05, HUD-01).
import { describe, it, expect } from 'vitest';
import { leaders, pawnSlots, slotTable, standPoints } from './pawnSlots';
import { ringLayout, tileCenter, tileTop } from './ringLayout';
import { boardWith, eventTile } from '../../engine/testkit';

const EIGHT = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
const on = (ids: readonly string[], tile: number) => Object.fromEntries(ids.map((id) => [id, tile]));

describe('pawnSlots (D-17, BOARD-05)', () => {
  it('a lone character stands in the tile center at full scale', () => {
    expect(pawnSlots(['a'], { a: 3 }, null)).toEqual({ a: { dx: 0, dz: 0, scale: 1 } });
  });

  it('characters on different tiles are each centered at full scale', () => {
    const s = pawnSlots(['a', 'b', 'c'], { a: 1, b: 2, c: 7 }, 'b');
    for (const id of ['a', 'b', 'c']) expect(s[id]).toEqual({ dx: 0, dz: 0, scale: 1 });
  });

  it('the current turn takes the front-center slot at scale 1; the rest follow participant order', () => {
    const s = pawnSlots(EIGHT, on(EIGHT, 5), 'p3');
    const { s: small, slots } = slotTable(8, false);
    expect(small).toBe(0.65);
    expect(s.p3).toEqual({ dx: 0, dz: 0.52, scale: 1 });
    ['p1', 'p2', 'p4', 'p5', 'p6', 'p7', 'p8'].forEach((id, j) => {
      const [dx, dz] = slots[j + 1];
      expect(s[id]).toEqual({ dx, dz, scale: 0.65 });
    });
  });

  it('with the current turn on another tile, slots go in plain participant order at the table size', () => {
    const pos = { ...on(EIGHT, 5), cur: 9 };
    const s = pawnSlots([...EIGHT, 'cur'], pos, 'cur');
    const { slots } = slotTable(8, false);
    EIGHT.forEach((id, k) => {
      const [dx, dz] = slots[k];
      expect(s[id]).toEqual({ dx, dz, scale: 0.65 });
    });
    expect(s.cur).toEqual({ dx: 0, dz: 0, scale: 1 });
  });

  it('the start tile uses its own table, with the current turn in front at scale 1', () => {
    const s = pawnSlots(['a', 'b'], { a: 0, b: 0 }, 'b');
    const { slots } = slotTable(2, true);
    expect(slots).toEqual([
      [0.25, 0.25],
      [-0.45, 0.1],
    ]);
    expect(s.b).toEqual({ dx: 0.25, dz: 0.25, scale: 1 });
    expect(s.a).toEqual({ dx: -0.45, dz: 0.1, scale: 0.9 });
  });

  it('a lone character on the start tile stands off the arch band at full scale (D-17a(1))', () => {
    expect(pawnSlots(['a'], { a: 0 }, 'a')).toEqual({ a: { dx: 0.25, dz: 0.3, scale: 1 } });
  });

  it('a character missing from positions counts as standing on the start tile', () => {
    const s = pawnSlots(['a', 'b'], { a: 0 }, null);
    const { s: small, slots } = slotTable(2, true);
    expect(s.a).toEqual({ dx: slots[0][0], dz: slots[0][1], scale: small });
    expect(s.b).toEqual({ dx: slots[1][0], dz: slots[1][1], scale: small });
  });

  it('depends only on order, positions and the current turn; inputs are not mutated', () => {
    const order = ['x', 'y', 'z'];
    const pos = { z: 2, y: 2, x: 2 };
    const a = pawnSlots(order, pos, 'y');
    expect(pawnSlots(['x', 'y', 'z'], { x: 2, y: 2, z: 2 }, 'y')).toEqual(a);
    expect(order).toEqual(['x', 'y', 'z']);
    expect(pos).toEqual({ z: 2, y: 2, x: 2 });
    const swapped = pawnSlots(['z', 'x', 'y'], { x: 2, y: 2, z: 2 }, null);
    expect(swapped.z).toEqual(pawnSlots(['x', 'y', 'z'], { x: 2, y: 2, z: 2 }, null).x);
  });
});

describe('slotTable (UI-SPEC C5)', () => {
  for (const isStart of [false, true]) {
    for (let n = 2; n <= 8; n++) {
      it(`${isStart ? 'start' : 'regular'} n=${n}: size band, front slot, distinct slots`, () => {
        const { s, slots } = slotTable(n, isStart);
        expect(slots).toHaveLength(n);
        if (n <= 4) {
          expect(s).toBeGreaterThanOrEqual(0.85);
          expect(s).toBeLessThanOrEqual(0.9);
        } else {
          expect(s).toBeGreaterThanOrEqual(0.65);
          expect(s).toBeLessThanOrEqual(0.72);
        }
        const front = slots[0][1];
        for (let k = 1; k < n; k++) expect(slots[k][1]).toBeLessThan(front);
        if (!isStart) expect(slots[0][0]).toBe(0);
        expect(new Set(slots.map(([x, z]) => `${x},${z}`)).size).toBe(n);
      });
    }
  }

  it('n 1 is full size: the tile center on a regular tile, the lone start slot on the start tile', () => {
    expect(slotTable(1, false)).toEqual({ s: 1, slots: [[0, 0]] });
    expect(slotTable(1, true)).toEqual({ s: 1, slots: [[0.25, 0.3]] });
  });

  it('clamps n to 1..8 (T-07-05)', () => {
    expect(slotTable(0, false)).toEqual(slotTable(1, false));
    expect(slotTable(12, true)).toEqual(slotTable(8, true));
  });
});

describe('leaders (D-18)', () => {
  it('returns every participant tied for the most stars', () => {
    expect(leaders({ a: 3, b: 3, c: 1 })).toEqual(['a', 'b']);
  });

  it('nobody leads with zero stars', () => {
    expect(leaders({ a: 0, b: 0 })).toEqual([]);
    expect(leaders({})).toEqual([]);
  });

  it('a single leader', () => {
    expect(leaders({ a: 1, b: 0 })).toEqual(['a']);
  });
});

describe('standPoints', () => {
  it('puts each stand point on the tile center at the tile top', () => {
    const tiles = boardWith(20, { 2: eventTile('forward', 3) });
    const l = ringLayout(20);
    const pts = standPoints(tiles);
    expect(pts).toHaveLength(20);
    for (let i = 0; i < 20; i++) {
      const c = tileCenter(l, i);
      expect(pts[i].x).toBeCloseTo(c.x, 12);
      expect(pts[i].z).toBeCloseTo(c.z, 12);
      expect(pts[i].y).toBeCloseTo(tileTop(tiles[i].kind), 12);
    }
    expect(pts[0].y).toBeGreaterThan(pts[1].y); // the start block is taller
  });
});
