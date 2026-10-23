// Ring board geometry (D-07, D-08, D-11, D-12, D-13, Pitfall 7). Pure numbers — no three.
import {
  CORNER_ARROW_INSET,
  CORNER_ARROW_R,
  PITCH,
  boardExtents,
  cornerArrows,
  footprintHalf,
  gapPoint,
  ringLayout,
  tileCenter,
  tileTop,
  type RingLayout,
} from './ringLayout';
import type { TileKind } from '../../engine/board';

const SIZES = [16, 20, 24] as const;
const EPS = 1e-9;

interface Box {
  x: number;
  z: number;
  hx: number;
  hz: number;
}

// Axis-aligned distance between two footprints (0 when they overlap).
function boxGap(a: Box, b: Box): number {
  const dx = Math.max(0, Math.abs(a.x - b.x) - a.hx - b.hx);
  const dz = Math.max(0, Math.abs(a.z - b.z) - a.hz - b.hz);
  return Math.hypot(dx, dz);
}

function pointToBox(px: number, pz: number, b: Box): number {
  const dx = Math.max(0, Math.abs(px - b.x) - b.hx);
  const dz = Math.max(0, Math.abs(pz - b.z) - b.hz);
  return Math.hypot(dx, dz);
}

type Mix = 'quest' | 'event' | 'alternating';
const MIXES: Mix[] = ['quest', 'event', 'alternating'];

function kindOf(i: number, mix: Mix): TileKind {
  if (i === 0) return 'start';
  if (mix === 'alternating') return i % 2 === 0 ? 'quest' : 'event';
  return mix;
}

function boxes(l: RingLayout, mix: Mix): Box[] {
  return l.tiles.map((_, i) => {
    const c = tileCenter(l, i);
    const h = footprintHalf(kindOf(i, mix), l.heading[i]);
    return { x: c.x, z: c.z, hx: h.hx, hz: h.hz };
  });
}

describe('ringLayout', () => {
  it.each(SIZES)('n=%i: start at bottom-right, corners at 0,s,2s,3s', (n) => {
    const l = ringLayout(n);
    const s = n / 4;
    expect(l.n).toBe(n);
    expect(l.perSide).toBe(s);
    expect(l.pitch).toBe(PITCH);
    expect(l.tiles).toHaveLength(n);
    expect(l.half).toBeCloseTo((s * PITCH) / 2, 12);
    expect(l.tiles[0].x).toBeCloseTo(l.half, 12);
    expect(l.tiles[0].z).toBeCloseTo(l.half, 12);
    const corners = l.tiles.flatMap((t, i) => (t.corner ? [i] : []));
    expect(corners).toEqual([0, s, 2 * s, 3 * s]);
  });

  it.each(SIZES)('n=%i: adjacent lattice distance equals the pitch', (n) => {
    const l = ringLayout(n);
    for (let i = 0; i < n; i++) {
      const a = l.tiles[i];
      const b = l.tiles[(i + 1) % n];
      expect(Math.abs(Math.hypot(b.x - a.x, b.z - a.z) - PITCH)).toBeLessThan(EPS);
    }
  });

  it.each(SIZES)('n=%i: walks clockwise on screen (x, -z) — bottom edge leftward first', (n) => {
    const l = ringLayout(n);
    let area = 0;
    for (let i = 0; i < n; i++) {
      const a = l.tiles[i];
      const b = l.tiles[(i + 1) % n];
      area += a.x * -b.z - b.x * -a.z;
    }
    expect(area / 2).toBeLessThan(0);
    // bottom edge moves left, then left edge moves up (−z), top edge right, right edge down
    expect(l.tiles[1].x).toBeLessThan(l.tiles[0].x);
    const s = n / 4;
    expect(l.tiles[s + 1].z).toBeLessThan(l.tiles[s].z);
    expect(l.tiles[2 * s + 1].x).toBeGreaterThan(l.tiles[2 * s].x);
    expect(l.tiles[3 * s + 1].z).toBeGreaterThan(l.tiles[3 * s].z);
  });

  it.each(SIZES)('n=%i: heading points toward the next tile and is axis-aligned', (n) => {
    const l = ringLayout(n);
    for (let i = 0; i < n; i++) {
      const a = l.tiles[i];
      const b = l.tiles[(i + 1) % n];
      const h = l.heading[i];
      expect(h).toBeCloseTo(Math.atan2(b.x - a.x, b.z - a.z), 12);
      const axis = Math.min(Math.abs(Math.sin(h)), Math.abs(Math.cos(h)));
      expect(axis).toBeLessThan(EPS);
    }
  });

  it.each([0, 7, 10, 18, 16.5, NaN, -16, 4])('throws RangeError for %s', (n) => {
    expect(() => ringLayout(n)).toThrow(RangeError);
  });
});

describe('tileCenter / tileTop', () => {
  it.each(SIZES)('n=%i: start is shifted 0.2 outward on both axes; others sit on the lattice', (n) => {
    const l = ringLayout(n);
    const c0 = tileCenter(l, 0);
    expect(c0.x).toBeCloseTo(l.half + 0.2, 12);
    expect(c0.z).toBeCloseTo(l.half + 0.2, 12);
    for (let i = 1; i < n; i++) {
      expect(tileCenter(l, i)).toEqual({ x: l.tiles[i].x, z: l.tiles[i].z });
    }
  });

  it('start top is 0.58, quest/event top is 0.40', () => {
    expect(tileTop('start')).toBeCloseTo(0.58, 12);
    expect(tileTop('quest')).toBeCloseTo(0.4, 12);
    expect(tileTop('event')).toBeCloseTo(0.4, 12);
  });
});

describe('footprints (D-11 gap ≥ 0.1t)', () => {
  it('event pad: circumradius 0.52 along travel, apothem across', () => {
    const along = footprintHalf('event', -Math.PI / 2); // heading −x
    expect(along.hx).toBeCloseTo(0.52, 12);
    expect(along.hz).toBeCloseTo(0.52 * Math.cos(Math.PI / 6), 12);
    const z = footprintHalf('event', 0); // heading +z
    expect(z.hz).toBeCloseTo(0.52, 12);
    expect(z.hx).toBeCloseTo(0.52 * Math.cos(Math.PI / 6), 12);
    expect(footprintHalf('quest', 0)).toEqual({ hx: 0.5, hz: 0.5 });
    expect(footprintHalf('start', 0)).toEqual({ hx: 0.7, hz: 0.7 });
  });

  for (const n of SIZES) {
    for (const mix of MIXES) {
      it(`n=${n}, ${mix}: every pair of footprints is ≥ 0.1 apart`, () => {
        const b = boxes(ringLayout(n), mix);
        let min = Infinity;
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) min = Math.min(min, boxGap(b[i], b[j]));
        expect(min).toBeGreaterThanOrEqual(0.1 - EPS);
      });
    }
  }
});

describe('gapPoint', () => {
  for (const n of SIZES) {
    for (const mix of MIXES) {
      it(`n=${n}, ${mix}: midpoint of i and i+1, strictly between their facing edges`, () => {
        const l = ringLayout(n);
        const b = boxes(l, mix);
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          const g = gapPoint(l, i);
          expect(g.x).toBeCloseTo((l.tiles[i].x + l.tiles[j].x) / 2, 12);
          expect(g.z).toBeCloseTo((l.tiles[i].z + l.tiles[j].z) / 2, 12);
          expect(pointToBox(g.x, g.z, b[i])).toBeGreaterThan(0);
          expect(pointToBox(g.x, g.z, b[j])).toBeGreaterThan(0);
        }
      });
    }
  }
});

describe('cornerArrows (D-13)', () => {
  for (const n of SIZES) {
    it(`n=${n}: 4 arrows moved ${CORNER_ARROW_INSET} toward the center, clear of every tile`, () => {
      const l = ringLayout(n);
      const s = n / 4;
      const arrows = cornerArrows(l);
      expect(arrows.map((a) => a.i)).toEqual([0, s, 2 * s, 3 * s]);
      for (const a of arrows) {
        const t = l.tiles[a.i];
        expect(a.x).toBeCloseTo(t.x - Math.sign(t.x) * CORNER_ARROW_INSET, 12);
        expect(a.z).toBeCloseTo(t.z - Math.sign(t.z) * CORNER_ARROW_INSET, 12);
        expect(a.inHeading).toBe(l.heading[(a.i - 1 + n) % n]);
        expect(a.outHeading).toBe(l.heading[a.i]);
      }
      for (const mix of MIXES) {
        const b = boxes(l, mix);
        for (const a of arrows) {
          for (const box of b) {
            expect(pointToBox(a.x, a.z, box)).toBeGreaterThanOrEqual(CORNER_ARROW_R + 0.02 - EPS);
          }
        }
      }
    });
  }
});

describe('boardExtents', () => {
  it.each(SIZES)('n=%i: half + 0.95, height 2.0, covers the start tile outer edge', (n) => {
    const l = ringLayout(n);
    const e = boardExtents(l);
    expect(e.hx).toBeCloseTo(l.half + 0.95, 12);
    expect(e.hz).toBeCloseTo(l.half + 0.95, 12);
    expect(e.h).toBe(2.0);
    expect(e.hx).toBeGreaterThanOrEqual(l.half + 0.9);
  });
});
