// src/game/layout/pawnSlots.test.ts — same-tile slots, leaders and stand points (D-17, D-18, HUD-01).
import { describe, it, expect } from 'vitest';
import { leaders, pawnSlots, standPoints } from './pawnSlots';
import { ringLayout, tileCenter, tileTop } from './ringLayout';
import { boardWith, eventTile } from '../../engine/testkit';

describe('pawnSlots (D-17)', () => {
  it('a lone pawn stands in the tile center at full scale', () => {
    expect(pawnSlots(['a'], { a: 3 })).toEqual({ a: { dx: 0, dz: 0, scale: 1 } });
  });

  it('pawns on different tiles are each centered', () => {
    const s = pawnSlots(['a', 'b', 'c'], { a: 1, b: 2, c: 7 });
    for (const id of ['a', 'b', 'c']) expect(s[id]).toEqual({ dx: 0, dz: 0, scale: 1 });
  });

  it('four pawns on one tile take four distinct ±0.2 grid slots at scale 1, in order', () => {
    const order = ['a', 'b', 'c', 'd'];
    const s = pawnSlots(order, { a: 5, b: 5, c: 5, d: 5 });
    const keys = new Set<string>();
    for (const id of order) {
      expect(Math.abs(s[id].dx)).toBeCloseTo(0.2, 12);
      expect(Math.abs(s[id].dz)).toBeCloseTo(0.2, 12);
      expect(s[id].scale).toBe(1);
      keys.add(`${s[id].dx},${s[id].dz}`);
    }
    expect(keys.size).toBe(4);
    // Fixed assignment: the same order always yields the same slots.
    expect(pawnSlots(order, { a: 5, b: 5, c: 5, d: 5 })).toEqual(s);
  });

  it('two pawns sharing a tile take the first two grid slots', () => {
    const s = pawnSlots(['a', 'b', 'c'], { a: 4, b: 9, c: 4 });
    expect(s.b).toEqual({ dx: 0, dz: 0, scale: 1 });
    expect(`${s.a.dx},${s.a.dz}`).not.toBe(`${s.c.dx},${s.c.dz}`);
    expect(Math.abs(s.a.dx)).toBeCloseTo(0.2, 12);
    expect(Math.abs(s.c.dz)).toBeCloseTo(0.2, 12);
  });

  it('six pawns on one tile sit on a 0.3 ring at 0.8 scale with distinct offsets', () => {
    const order = ['a', 'b', 'c', 'd', 'e', 'f'];
    const pos = Object.fromEntries(order.map((id) => [id, 0]));
    const s = pawnSlots(order, pos);
    const keys = new Set<string>();
    for (const id of order) {
      expect(Math.hypot(s[id].dx, s[id].dz)).toBeCloseTo(0.3, 9);
      expect(s[id].scale).toBe(0.8);
      keys.add(`${s[id].dx.toFixed(6)},${s[id].dz.toFixed(6)}`);
    }
    expect(keys.size).toBe(6);
    // First slot is on the camera-near side (+Z).
    expect(s.a.dx).toBeCloseTo(0, 12);
    expect(s.a.dz).toBeCloseTo(0.3, 12);
  });

  it('depends only on order and positions', () => {
    const a = pawnSlots(['x', 'y', 'z'], { z: 2, y: 2, x: 2 });
    const b = pawnSlots(['x', 'y', 'z'], { x: 2, y: 2, z: 2 });
    expect(a).toEqual(b);
    const swapped = pawnSlots(['y', 'x', 'z'], { x: 2, y: 2, z: 2 });
    expect(swapped.y).toEqual(a.x);
  });

  it('a pawn missing from positions counts as standing on the start tile', () => {
    const s = pawnSlots(['a', 'b'], { a: 0 });
    expect(Math.abs(s.a.dx)).toBeCloseTo(0.2, 12);
    expect(Math.abs(s.b.dx)).toBeCloseTo(0.2, 12);
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
