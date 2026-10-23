// src/game/layout/charMotion.test.ts — pure pose curves (D-10..D-14, D-16, CHAR-03, UI-SPEC C4).
import { describe, it, expect } from 'vitest';
import {
  REST,
  actPose,
  approachAngle,
  bonusPose,
  bouncePose,
  breathePose,
  cheerPose,
  hopPose,
  lerpPose,
  slumpPose,
  successPose,
  surprisePose,
  type Pose,
} from './charMotion';

const TAU = 2 * Math.PI;
const FIELDS = ['y', 'yaw', 'squashY', 'headPitch', 'armL', 'armR', 'earTilt', 'lean'] as const;
const GRID = Array.from({ length: 101 }, (_, i) => i / 100);

// Distance of an angle from 0 modulo 2π.
const yawOff = (yaw: number) => {
  const r = ((yaw % TAU) + TAU) % TAU;
  return Math.min(r, TAU - r);
};

function expectRest(p: Pose, label: string) {
  for (const f of FIELDS) {
    if (f === 'yaw') expect(yawOff(p.yaw), `${label} yaw`).toBeLessThan(1e-6);
    else expect(Math.abs(p[f] - REST[f]), `${label} ${f}`).toBeLessThan(1e-6);
  }
}

// Local maxima of y over the grid (strictly higher than both neighbors).
function peaks(curve: (u: number) => Pose): { u: number; y: number }[] {
  const ys = GRID.map((u) => curve(u).y);
  const out: { u: number; y: number }[] = [];
  for (let i = 1; i < ys.length - 1; i++) {
    if (ys[i] > ys[i - 1] && ys[i] >= ys[i + 1]) out.push({ u: GRID[i], y: ys[i] });
  }
  return out;
}

const BEATS = { successPose, slumpPose, cheerPose, surprisePose, bonusPose } as const;

describe('beat curves start and end at REST (Pitfall 8)', () => {
  for (const [name, curve] of Object.entries(BEATS)) {
    it(name, () => {
      expectRest(curve(0), `${name}(0)`);
      expectRest(curve(1), `${name}(1)`);
    });
  }

  it('every call returns a new Pose; REST stays frozen', () => {
    expect(successPose(0)).not.toBe(successPose(0));
    expect(actPose('rest', 0.5)).not.toBe(REST);
    expect(Object.isFrozen(REST)).toBe(true);
  });
});

describe('successPose (D-12, stars 900 ms)', () => {
  it('jumps to 0.55 around u 0.40–0.50', () => {
    const [top] = peaks(successPose);
    expect(peaks(successPose)).toHaveLength(1);
    expect(top.y).toBeCloseTo(0.55, 2);
    expect(top.u).toBeGreaterThanOrEqual(0.4);
    expect(top.u).toBeLessThanOrEqual(0.5);
  });

  it('spins a full turn, monotonically, between u 0.15 and 0.75', () => {
    expect(successPose(0.15).yaw).toBeCloseTo(0, 9);
    expect(successPose(0.75).yaw).toBeCloseTo(TAU, 9);
    for (let i = 1; i < GRID.length; i++) {
      expect(successPose(GRID[i]).yaw).toBeGreaterThanOrEqual(successPose(GRID[i - 1]).yaw - 1e-12);
    }
    expect(successPose(0.1).yaw).toBe(0);
    expect(successPose(0.9).yaw).toBeCloseTo(TAU, 12);
  });

  it('crouches to 0.85 and raises the arms to 2.0 at the apex', () => {
    expect(successPose(0.15).squashY).toBeCloseTo(0.85, 6);
    expect(successPose(0.45).armL).toBeCloseTo(2, 6);
    expect(successPose(0.45).armR).toBeCloseTo(2, 6);
  });
});

describe('slumpPose (D-13, miss 700 ms / backward)', () => {
  it('holds the slumped pose with a small sigh from u 0.25 to 0.80', () => {
    for (const u of GRID.filter((x) => x >= 0.25 && x <= 0.8)) {
      const p = slumpPose(u);
      expect(p.headPitch).toBeCloseTo(0.35, 6);
      expect(p.armL).toBeCloseTo(-0.33, 6);
      expect(p.armR).toBeCloseTo(-0.33, 6);
      expect(p.earTilt).toBeCloseTo(0.4, 6);
      expect(p.lean).toBeCloseTo(0.08, 6);
      expect(p.squashY).toBeGreaterThanOrEqual(0.92 - 1e-9);
      expect(p.squashY).toBeLessThanOrEqual(0.94 + 1e-9);
      expect(p.y).toBe(0);
    }
    expect(Math.min(...GRID.map((u) => slumpPose(u).squashY))).toBeCloseTo(0.92, 3);
  });
});

describe('cheerPose (D-14, win 1500 ms)', () => {
  it('jumps twice to 0.35, once in each half', () => {
    const ps = peaks(cheerPose);
    expect(ps).toHaveLength(2);
    expect(ps[0].u).toBeGreaterThan(0.08);
    expect(ps[0].u).toBeLessThan(0.46);
    expect(ps[1].u).toBeGreaterThan(0.54);
    expect(ps[1].u).toBeLessThan(0.92);
    for (const p of ps) expect(p.y).toBeCloseTo(0.35, 2);
  });

  it('arms are raised high at u 0.5 and the body always faces the camera', () => {
    expect(cheerPose(0.5).armL).toBeGreaterThanOrEqual(2.4 - 0.25);
    expect(cheerPose(0.5).armR).toBeGreaterThanOrEqual(2.4 - 0.25);
    for (const u of GRID) expect(cheerPose(u).yaw).toBe(0);
  });
});

describe('surprisePose (D-11, forward / limited extra event)', () => {
  it('startles back with arms flung out at u 0.12', () => {
    const p = surprisePose(0.12);
    expect(p.lean).toBeCloseTo(-0.2, 6);
    expect(p.y).toBeCloseTo(0.12, 6);
    expect(p.armL).toBeCloseTo(1.2, 6);
    expect(p.armR).toBeCloseTo(1.2, 6);
  });

  it('is REST for every u ≥ 0.60', () => {
    for (const u of GRID.filter((x) => x >= 0.6)) expect(surprisePose(u)).toEqual({ ...REST });
  });
});

describe('bonusPose (D-11, start bonus / extra event)', () => {
  it('hops twice to 0.20 and is REST from u 0.70', () => {
    const ps = peaks(bonusPose);
    expect(ps).toHaveLength(2);
    for (const p of ps) expect(p.y).toBeCloseTo(0.2, 2);
    for (const u of GRID.filter((x) => x >= 0.7)) expect(bonusPose(u)).toEqual({ ...REST });
  });
});

describe('hopPose (D-10, one tile of a move)', () => {
  it('follows the 0.5 parabola', () => {
    expect(hopPose(0).y).toBe(0);
    expect(hopPose(0.5).y).toBeCloseTo(0.5, 12);
    expect(hopPose(1).y).toBeCloseTo(0, 12);
  });

  it('squashes to 0.88 only over the last 30 %', () => {
    for (const s of GRID.filter((x) => x <= 0.7)) expect(hopPose(s).squashY).toBe(1);
    const inside = GRID.filter((x) => x > 0.7 && x < 1).map((s) => hopPose(s).squashY);
    expect(Math.min(...inside)).toBeCloseTo(0.88, 6);
  });

  it('blows the ears back in the air', () => {
    expect(hopPose(0.5).earTilt).toBeGreaterThan(0);
  });
});

describe('bouncePose (D-10, waiting current turn)', () => {
  it('bounces within [0, 0.08] with a landing squash, period 0.8 s', () => {
    for (let i = 0; i <= 400; i++) {
      const t = i / 100;
      const p = bouncePose(t);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(0.08 + 1e-12);
      if (p.y < 0.01) expect(p.squashY).toBe(0.92);
      expect(Math.abs(p.earTilt)).toBeLessThanOrEqual(0.15 + 1e-12);
      const q = bouncePose(t + 0.8);
      expect(q.y).toBeCloseTo(p.y, 9);
      expect(q.earTilt).toBeCloseTo(p.earTilt, 9);
    }
    expect(bouncePose(0.4).y).toBeCloseTo(0.08, 12);
  });
});

describe('breathePose (D-10, not the current turn)', () => {
  it('only breathes, by at most 2 %', () => {
    for (let i = 0; i <= 600; i++) {
      const p = breathePose(i / 100, i % 8);
      expect(Math.abs(p.squashY - 1)).toBeLessThanOrEqual(0.015 + 1e-12);
      for (const f of FIELDS) if (f !== 'squashY') expect(p[f]).toBe(0);
    }
  });

  it('each seed breathes in its own phase', () => {
    expect(breathePose(1, 0).squashY).not.toBeCloseTo(breathePose(1, 3).squashY, 6);
  });
});

describe('approachAngle / lerpPose', () => {
  it('takes the short way through ±π and never overshoots', () => {
    const short = TAU - 6; // from 3 to −3 the short way is +0.283 through π
    for (const dt of [0.001, 0.016, 0.1, 0.25, 10]) {
      const a = approachAngle(3, -3, 20, dt);
      expect(a).toBeGreaterThan(3);
      expect(a).toBeLessThanOrEqual(3 + short + 1e-12);
    }
    const b = approachAngle(-3, 3, 8, 0.05);
    expect(b).toBeLessThan(-3);
    expect(b).toBeGreaterThanOrEqual(-3 - short - 1e-12);
    expect(approachAngle(0.5, 0.5, 20, 0.1)).toBe(0.5);
  });

  it('lerpPose blends field by field', () => {
    const a = successPose(0.45);
    const b = slumpPose(0.5);
    expect(lerpPose(a, b, 0)).toEqual(a);
    expect(lerpPose(a, b, 1)).toEqual(b);
    expect(lerpPose(a, b, 0.5).headPitch).toBeCloseTo((a.headPitch + b.headPitch) / 2, 12);
  });
});

describe('actPose', () => {
  it('dispatches each beat act to its curve', () => {
    for (const u of [0.1, 0.3, 0.45, 0.6, 0.9]) {
      expect(actPose('success', u)).toEqual(successPose(u));
      expect(actPose('slump', u)).toEqual(slumpPose(u));
      expect(actPose('cheer', u)).toEqual(cheerPose(u));
      expect(actPose('surprise', u)).toEqual(surprisePose(u));
      expect(actPose('bonus', u)).toEqual(bonusPose(u));
    }
  });

  it("'rest' and 'hop' return REST", () => {
    expect(actPose('rest', 0.5)).toEqual({ ...REST });
    expect(actPose('hop', 0.5)).toEqual({ ...REST });
  });
});
