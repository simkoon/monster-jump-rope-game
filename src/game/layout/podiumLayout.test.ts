// src/game/layout/podiumLayout.test.ts — the ceremony podium layout (D-12, D-16, END-01, UI-SPEC §F7).
// One gold tier for every winner, everybody else on the floor in front of it. The projection check
// uses the same fitCamera call CameraRig makes with layout.extents and the head-disc overlap rule of
// slotOcclusion.test.ts. three is imported here only (the source guard skips *.test files).
import { describe, it, expect } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { HEAD_C_Y, HEAD_R } from './chibiDims';
import { fitCamera } from './fitCamera';
import {
  CEREMONY_INTRO_MS,
  GROUND_HEIGHT,
  INTRO_CHEER_AT_MS,
  INTRO_JUMP_AT_MS,
  PODIUM_HEIGHT,
  podiumLayout,
  type CeremonyStand,
} from './podiumLayout';

const TOP = GROUND_HEIGHT + PODIUM_HEIGHT;
const ids = (p: string, n: number) => Array.from({ length: n }, (_, i) => `${p}${i}`);

// Ceremony canvas cells (UI-SPEC §F7): phone portrait 8 players / ≤ 4 players, phone landscape,
// 844×390 column 1, 1024×768 column 1.
const CELLS = [
  [374, 230],
  [374, 400],
  [588, 290],
  [544, 390],
  [664, 768],
] as const;

function lens(r1: number, r2: number, d: number): number {
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const a = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
  const b = r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
  return a + b - 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
}

const rowsOf = (stands: CeremonyStand[]) => {
  const byZ = new Map<number, CeremonyStand[]>();
  for (const s of stands) {
    const k = Math.round(s.z * 1e6);
    byZ.set(k, [...(byZ.get(k) ?? []), s]);
  }
  return [...byZ.values()].map((r) => [...r].sort((a, b) => a.x - b.x));
};

describe('podiumLayout: constants (D-16)', () => {
  it('the intro is ≤ 2 s and its marks are in order', () => {
    expect(CEREMONY_INTRO_MS).toBe(1800);
    expect(INTRO_JUMP_AT_MS).toBe(200);
    expect(INTRO_CHEER_AT_MS).toBe(400);
    expect(PODIUM_HEIGHT).toBe(0.6);
    expect(GROUND_HEIGHT).toBe(0.12);
  });
});

describe('podiumLayout: one gold tier for every winner (D-12)', () => {
  it('one winner stands on the tier at 1.15, the others on the floor in front', () => {
    const l = podiumLayout(['a'], ['b', 'c']);
    const a = l.stands.a;
    expect(a.winner).toBe(true);
    expect(a.scale).toBeCloseTo(1.15, 9);
    expect(a.y).toBeCloseTo(TOP, 9);
    const front = l.podium.z + l.podium.depth / 2;
    for (const id of ['b', 'c']) {
      const s = l.stands[id];
      expect(s.winner).toBe(false);
      expect(s.y).toBeCloseTo(GROUND_HEIGHT, 9);
      expect(s.z).toBeGreaterThanOrEqual(front + 0.6 - 1e-9);
    }
    // a stands on the tier footprint.
    expect(Math.abs(a.x)).toBeLessThanOrEqual(l.podium.width / 2);
    expect(Math.abs(a.z - l.podium.z)).toBeLessThanOrEqual(l.podium.depth / 2);
    expect(l.podium.height).toBe(PODIUM_HEIGHT);
    expect(Object.keys(l.stands).sort()).toEqual(['a', 'b', 'c']);
  });

  it('2–4 winners: one row on the tier, sizes 0.85–1.0', () => {
    for (const w of [2, 3, 4]) {
      const l = podiumLayout(ids('w', w), ids('o', 2));
      const win = ids('w', w).map((id) => l.stands[id]);
      expect(rowsOf(win)).toHaveLength(1);
      for (const s of win) {
        expect(s.y).toBeCloseTo(TOP, 9);
        expect(s.scale).toBeGreaterThanOrEqual(0.85 - 1e-9);
        expect(s.scale).toBeLessThanOrEqual(1 + 1e-9);
        expect(Math.abs(s.x)).toBeLessThanOrEqual(l.podium.width / 2);
      }
      expect(l.podium.depth).toBeCloseTo(1.2, 9);
    }
  });

  it('5–8 winners: two rows (front 3–4, back raised 0.15), sizes 0.65–0.75, deeper tier', () => {
    for (const w of [5, 6, 7, 8]) {
      const l = podiumLayout(ids('w', w), []);
      const rows = rowsOf(ids('w', w).map((id) => l.stands[id])).sort((a, b) => b[0].z - a[0].z);
      expect(rows).toHaveLength(2);
      const [front, back] = rows;
      expect(front.length).toBeGreaterThanOrEqual(3);
      expect(front.length).toBeLessThanOrEqual(4);
      expect(front.length + back.length).toBe(w);
      for (const s of front) expect(s.y).toBeCloseTo(TOP, 9);
      for (const s of back) expect(s.y).toBeCloseTo(TOP + 0.15, 9);
      for (const s of [...front, ...back]) {
        expect(s.scale).toBeGreaterThanOrEqual(0.65 - 1e-9);
        expect(s.scale).toBeLessThanOrEqual(0.75 + 1e-9);
        expect(Math.abs(s.z - l.podium.z)).toBeLessThanOrEqual(l.podium.depth / 2);
      }
      expect(l.podium.depth).toBeCloseTo(1.9, 9);
    }
  });

  it('others: one floor row up to 5, two zig-zag rows from 6', () => {
    for (const o of [1, 2, 3, 4, 5]) {
      const l = podiumLayout(['w'], ids('o', o));
      expect(rowsOf(ids('o', o).map((id) => l.stands[id]))).toHaveLength(1);
    }
    for (const o of [6, 7]) {
      const l = podiumLayout(['w'], ids('o', o));
      const rows = rowsOf(ids('o', o).map((id) => l.stands[id]));
      expect(rows).toHaveLength(2);
      // Zig-zag: no head stands straight behind another.
      for (const a of rows[0]) for (const b of rows[1]) expect(Math.abs(a.x - b.x)).toBeGreaterThan(0.1);
    }
  });

  it('tier width = winner row + 0.5 (≥ 1.6), height 0.6; ground radius ≥ 2.4 and covers the crowd', () => {
    for (let w = 1; w <= 8; w++) {
      for (let o = 0; o + w <= 8; o++) {
        if (o + w < 2) continue;
        const l = podiumLayout(ids('w', w), ids('o', o));
        const win = ids('w', w).map((id) => l.stands[id]);
        const span = Math.max(...win.map((s) => s.x)) - Math.min(...win.map((s) => s.x));
        expect(l.podium.width).toBeGreaterThanOrEqual(Math.max(1.6, span + 0.5) - 1e-9);
        expect(l.podium.height).toBe(0.6);
        expect(l.groundRadius).toBeGreaterThanOrEqual(2.4);
        const half = Math.max(...Object.values(l.stands).map((s) => Math.abs(s.x)));
        expect(l.groundRadius).toBeGreaterThanOrEqual(half + 0.8 - 1e-9);
      }
    }
  });

  it('neighbours in a row stand ≥ 0.7 × scale apart; phase steps 0.2 s among the others', () => {
    for (let w = 1; w <= 8; w++) {
      for (let o = 0; o + w <= 8; o++) {
        if (o + w < 2) continue;
        const l = podiumLayout(ids('w', w), ids('o', o));
        for (const row of rowsOf(Object.values(l.stands))) {
          for (let k = 1; k < row.length; k++) {
            expect(row[k].x - row[k - 1].x).toBeGreaterThanOrEqual(0.7 * Math.max(row[k].scale, row[k - 1].scale) - 1e-9);
          }
        }
        ids('w', w).forEach((id) => expect(l.stands[id].phaseSec).toBe(0));
        ids('o', o).forEach((id, k) => expect(l.stands[id].phaseSec).toBeCloseTo(0.2 * k, 9));
      }
    }
  });

  it('is deterministic and centered on the origin (fitCamera target)', () => {
    for (let w = 1; w <= 8; w++) {
      for (let o = 0; o + w <= 8; o++) {
        if (o + w < 2) continue;
        const a = podiumLayout(ids('w', w), ids('o', o));
        expect(podiumLayout(ids('w', w), ids('o', o))).toEqual(a);
        const xs = [...Object.values(a.stands).map((s) => s.x), -a.podium.width / 2, a.podium.width / 2];
        const zs = [...Object.values(a.stands).map((s) => s.z), a.podium.z - a.podium.depth / 2, a.podium.z + a.podium.depth / 2];
        expect(Math.abs(Math.abs(Math.min(...xs)) - Math.abs(Math.max(...xs)))).toBeLessThanOrEqual(0.1);
        expect(Math.abs(Math.abs(Math.min(...zs)) - Math.abs(Math.max(...zs)))).toBeLessThanOrEqual(0.1);
        // The FX origin is the tier top center.
        expect(a.topCenter[0]).toBeCloseTo(0, 9);
        expect(a.topCenter[1]).toBeCloseTo(TOP, 9);
        expect(a.topCenter[2]).toBeCloseTo(a.podium.z, 9);
      }
    }
  });

  it('is pure: inputs untouched', () => {
    const w = ['a', 'b'];
    const o = ['c'];
    podiumLayout(w, o);
    expect(w).toEqual(['a', 'b']);
    expect(o).toEqual(['c']);
  });
});

describe('podiumLayout: every face is seen from the ceremony camera', () => {
  const cases: [number, number][] = [];
  for (let w = 1; w <= 8; w++) for (let o = 0; o + w <= 8; o++) if (o + w >= 2) cases.push([w, o]);

  it.each(CELLS)('%ix%i: heads inside NDC, head discs overlap ≤ 30 %', (cw, ch) => {
    let worst = 0;
    let where = '';
    for (const [w, o] of cases) {
      const l = podiumLayout(ids('w', w), ids('o', o));
      const fit = fitCamera(cw / ch, l.extents);
      const cam = new PerspectiveCamera(fit.fov, cw / ch, 0.1, 200);
      cam.position.set(...fit.position);
      cam.lookAt(0, 0, 0);
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
      const discs = Object.entries(l.stands).map(([id, s]) => {
        const p = new Vector3(s.x, s.y + HEAD_C_Y * s.scale, s.z);
        const q = p.clone().project(cam);
        const e = p.clone().add(new Vector3(HEAD_R * s.scale, 0, 0)).project(cam);
        expect(Math.abs(q.x), `${w}+${o} ${id} x`).toBeLessThanOrEqual(1);
        expect(Math.abs(q.y), `${w}+${o} ${id} y`).toBeLessThanOrEqual(1);
        return {
          id,
          x: (q.x * cw) / 2,
          y: (q.y * ch) / 2,
          r: Math.hypot(((e.x - q.x) * cw) / 2, ((e.y - q.y) * ch) / 2),
          dist: p.distanceTo(cam.position),
        };
      });
      for (const a of discs) {
        for (const b of discs) {
          if (a === b || a.dist >= b.dist) continue;
          const cover = lens(a.r, b.r, Math.hypot(a.x - b.x, a.y - b.y)) / (Math.PI * b.r ** 2);
          if (cover > worst) {
            worst = cover;
            where = `${w} winners + ${o} others: ${a.id} over ${b.id}`;
          }
        }
      }
    }
    expect(worst, where).toBeLessThanOrEqual(0.3);
  });
});
