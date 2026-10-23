// src/game/layout/slotOcclusion.test.ts — same-tile slots proven with the real camera (D-17, D-19, BOARD-05).
// three is imported here only (the source guard skips *.test files). Every head is projected with the
// same fitCamera call CameraRig makes, as a disc: center = tile center + slot at y = tile top +
// HEAD_C_Y·scale, radius = HEAD_R·scale measured sideways on screen. The head tilts around its own
// center, so the tilt never changes these discs.
import { describe, it, expect } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { BODY_R, GROUND_RIM_R, HEAD_A, HEAD_C_Y, HEAD_R } from './chibiDims';
import { fitCamera } from './fitCamera';
import { slotTable } from './pawnSlots';
import { PITCH, boardExtents, ringLayout, tileCenter, tileTop } from './ringLayout';

// Measured phone canvas cells (374×594 portrait, 588×290 landscape) plus phone, tablet and desktop.
const VIEWS = [
  [374, 594],
  [390, 844],
  [588, 290],
  [844, 390],
  [728, 726],
  [728, 644],
] as const;
const SIZES = [16, 20, 24] as const;
const COUNTS = [2, 3, 4, 5, 6, 7, 8] as const;

// Gate pillars relative to the start-tile center, from the StartGate.tsx constants: the gate stands
// OUTWARD along the start diagonal (1, 1)/√2 and its pillars sit ±ARCH_R across it, (1, −1)/√2.
const OUTWARD = 0.2;
const ARCH_R = 0.55;
const PILLAR_R = 0.09;
const GATE = OUTWARD * Math.SQRT1_2;
const ACROSS = ARCH_R * Math.SQRT1_2;
const PILLARS = [
  [GATE + ACROSS, GATE - ACROSS],
  [GATE - ACROSS, GATE + ACROSS],
] as const;

// Area of the intersection of two discs with radii r1, r2 whose centers are d apart.
function lens(r1: number, r2: number, d: number): number {
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const a = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
  const b = r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
  return a + b - 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
}

// Sizes on one tile: slot 0 is full size when it holds the current turn, everything else is s.
const scales = (n: number, isStart: boolean, cur: boolean) => {
  const { s, slots } = slotTable(n, isStart);
  return slots.map((_, k) => (k === 0 && cur ? 1 : s));
};

describe('slot occlusion (D-19): no nearer head covers more than 30 % of a farther head', () => {
  it.each(VIEWS.flatMap(([w, h]) => SIZES.map((n) => [w, h, n] as const)))('%ix%i, %i tiles', (w, h, n) => {
    const l = ringLayout(n);
    const fit = fitCamera(w / h, boardExtents(l));
    const cam = new PerspectiveCamera(fit.fov, w / h, 0.1, 200);
    cam.position.set(...fit.position);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    let worst = 0;
    let where = '';
    for (let i = 0; i < n; i++) {
      const t = tileCenter(l, i);
      const y0 = tileTop(i === 0 ? 'start' : 'quest');
      for (const cnt of COUNTS) {
        for (const cur of [true, false]) {
          const { slots } = slotTable(cnt, i === 0);
          const sc = scales(cnt, i === 0, cur);
          const discs = slots.map(([dx, dz], k) => {
            const p = new Vector3(t.x + dx, y0 + HEAD_C_Y * sc[k], t.z + dz);
            const q = p.clone().project(cam);
            const e = p.clone().add(new Vector3(HEAD_R * sc[k], 0, 0)).project(cam);
            return {
              x: (q.x * w) / 2,
              y: (q.y * h) / 2,
              r: Math.hypot(((e.x - q.x) * w) / 2, ((e.y - q.y) * h) / 2),
              dist: p.distanceTo(cam.position),
            };
          });
          discs.forEach((a, ka) =>
            discs.forEach((b, kb) => {
              if (a === b || a.dist >= b.dist) return; // a is nearer → it may hide b
              const cover = lens(a.r, b.r, Math.hypot(a.x - b.x, a.y - b.y)) / (Math.PI * b.r ** 2);
              if (cover > worst) {
                worst = cover;
                where = `tile ${i}, n ${cnt}, current ${cur}, slot ${ka} over slot ${kb}`;
              }
            }),
          );
        }
      }
    }
    expect(worst, where).toBeLessThanOrEqual(0.3);
  });
});

describe('slot spacing (D-17, D-19)', () => {
  for (const isStart of [false, true]) {
    it(`${isStart ? 'start' : 'regular'} tiles: heads never interpenetrate (xz distance ≥ 0.85·(rᵢ + rⱼ))`, () => {
      for (const cnt of COUNTS) {
        for (const cur of [true, false]) {
          const { slots } = slotTable(cnt, isStart);
          const sc = scales(cnt, isStart, cur);
          for (let a = 0; a < cnt; a++) {
            for (let b = a + 1; b < cnt; b++) {
              const d = Math.hypot(slots[a][0] - slots[b][0], slots[a][1] - slots[b][1]);
              expect(d, `n ${cnt}, current ${cur}, slots ${a}/${b}`).toBeGreaterThanOrEqual(
                0.85 * (HEAD_R * sc[a] + HEAD_R * sc[b]),
              );
            }
          }
        }
      }
    });
  }

  it("regular tiles: the ground disc stays out of the neighbor tile's center-side half", () => {
    for (const cnt of COUNTS) {
      const { s, slots } = slotTable(cnt, false);
      slots.forEach(([dx, dz], k) => {
        const sc = k === 0 ? 1 : s; // largest possible size of this slot
        expect(Math.max(Math.abs(dx), Math.abs(dz)) + GROUND_RIM_R * sc, `n ${cnt}, slot ${k}`).toBeLessThanOrEqual(
          PITCH - 0.25,
        );
      });
    }
  });
});

describe('start tile slots clear the gate (D-17, Pitfall 3)', () => {
  it('the start corner has positive center x and z on every board size', () => {
    for (const n of SIZES) {
      const c = tileCenter(ringLayout(n), 0);
      expect(c.x).toBeGreaterThan(0);
      expect(c.z).toBeGreaterThan(0);
    }
  });

  it('pillar centers match StartGate (≈ (0.530, −0.247) and (−0.247, 0.530))', () => {
    expect(PILLARS[0][0]).toBeCloseTo(0.53, 2);
    expect(PILLARS[0][1]).toBeCloseTo(-0.247, 2);
    expect(PILLARS[1][0]).toBeCloseTo(-0.247, 2);
    expect(PILLARS[1][1]).toBeCloseTo(0.53, 2);
  });

  // Each slot is checked at its largest possible size (slot 0 is full size when current).
  const startSlots = () =>
    COUNTS.flatMap((cnt) => {
      const { s, slots } = slotTable(cnt, true);
      return slots.map(([dx, dz], k) => ({ cnt, k, dx, dz, sc: k === 0 ? 1 : s }));
    });

  it('every body stays on the 1.4 start block', () => {
    for (const { cnt, k, dx, dz, sc } of startSlots()) {
      expect(Math.max(Math.abs(dx), Math.abs(dz)) + BODY_R * sc, `n ${cnt}, slot ${k}`).toBeLessThanOrEqual(0.72);
    }
  });

  it('bodies keep ≥ 0.03 clearance from both pillars', () => {
    for (const { cnt, k, dx, dz, sc } of startSlots()) {
      for (const [px, pz] of PILLARS) {
        const d = Math.hypot(dx - px, dz - pz);
        expect(d - BODY_R * sc - PILLAR_R, `n ${cnt}, slot ${k}`).toBeGreaterThanOrEqual(0.03);
      }
    }
  });

  it('no head runs into a pillar (both pillars stand taller than the head bottom)', () => {
    for (const { cnt, k, dx, dz, sc } of startSlots()) {
      for (const [px, pz] of PILLARS) {
        const d = Math.hypot(dx - px, dz - pz);
        expect(d - HEAD_A * sc - PILLAR_R, `n ${cnt}, slot ${k}`).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
