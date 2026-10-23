// src/game/layout/fxMotion.test.ts — pure particle, ring, puff and shake curves (Phase 8 D-03, D-04,
// D-08, D-10, UI-SPEC F2 / F6). Everything is deterministic: same inputs → same numbers.
import { describe, it, expect } from 'vitest';
import {
  BONUS_SPARKLE,
  BURST_CAP,
  BURST_LIFE_MS,
  CONFETTI_CAP,
  CONFETTI_LIFE_MS,
  EVENT_PUFF,
  EVENT_SPARKLE,
  PUFF_CAP,
  PUFF_LIFE_MS,
  RING_CAP,
  RING_LIFE_MS,
  RING_STAGGER_MS,
  burstPiece,
  confettiPiece,
  fxRand,
  puffPiece,
  ringState,
  shakeOffset,
} from './fxMotion';
import { STARS_MS, type StarTier } from '../director/timeline';
import { SUCCESS_SIZE, successPlan } from '../director/successPlan';

const TIERS: StarTier[] = [1, 2, 3];
const DEG = Math.PI / 180;

describe('pool caps and lifetimes', () => {
  it('has the D-06 capacities and the UI-SPEC lifetimes', () => {
    expect([CONFETTI_CAP, BURST_CAP, RING_CAP, PUFF_CAP]).toEqual([160, 24, 3, 8]);
    expect(CONFETTI_LIFE_MS).toEqual({ 1: 900, 2: 1000, 3: 1150 });
    expect([BURST_LIFE_MS, RING_LIFE_MS, RING_STAGGER_MS, PUFF_LIFE_MS]).toEqual([500, 450, 120, 700]);
  });

  it('every tier fits its pools (confetti, burst, rings)', () => {
    for (const t of TIERS) {
      expect(SUCCESS_SIZE[t].confetti).toBeLessThanOrEqual(CONFETTI_CAP);
      expect(SUCCESS_SIZE[t].burst).toBeLessThanOrEqual(BURST_CAP);
      expect(SUCCESS_SIZE[t].rings).toBeLessThanOrEqual(RING_CAP);
    }
    expect(BONUS_SPARKLE.count).toBeLessThanOrEqual(BURST_CAP);
    expect(EVENT_SPARKLE.count).toBeLessThanOrEqual(BURST_CAP);
    expect(EVENT_PUFF.count).toBeLessThanOrEqual(PUFF_CAP);
  });

  it('the confetti ends inside the beat for every tier (landMs + life ≤ STARS_MS)', () => {
    for (const t of TIERS) {
      const plan = successPlan(t, STARS_MS[t], false);
      expect(plan.landMs + CONFETTI_LIFE_MS[t]).toBeLessThanOrEqual(STARS_MS[t]);
      expect(plan.landMs + BURST_LIFE_MS).toBeLessThanOrEqual(STARS_MS[t]);
      expect(plan.landMs + RING_LIFE_MS).toBeLessThanOrEqual(STARS_MS[t]);
    }
  });

  it('the start-bonus and event effects fit their unchanged beats (800 / 1000 ms)', () => {
    expect(BONUS_SPARKLE).toEqual({ count: 6, radius: 0.5, startMs: 120, lifeMs: 450 });
    expect(EVENT_SPARKLE).toEqual({ count: 8, radius: 0.7, startMs: 150, lifeMs: 500 });
    expect(EVENT_PUFF.count).toBe(6);
    expect(EVENT_PUFF.lifeMs).toBe(PUFF_LIFE_MS);
    expect(BONUS_SPARKLE.startMs + BONUS_SPARKLE.lifeMs).toBeLessThanOrEqual(800);
    expect(EVENT_SPARKLE.startMs + EVENT_SPARKLE.lifeMs).toBeLessThanOrEqual(1000);
    expect(EVENT_PUFF.startMs + EVENT_PUFF.lifeMs).toBeLessThanOrEqual(1000);
  });
});

describe('fxRand', () => {
  it('is deterministic, in [0, 1) and differs across seed / index / key', () => {
    const seen = new Set<number>();
    for (let s = 0; s < 4; s++)
      for (let i = 0; i < 40; i++)
        for (let k = 0; k < 4; k++) {
          const v = fxRand(s, i, k);
          expect(v).toBe(fxRand(s, i, k));
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThan(1);
          seen.add(v);
        }
    expect(seen.size).toBeGreaterThan(600); // 640 draws, practically no collisions
  });

  it('is roughly uniform', () => {
    let sum = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) sum += fxRand(7, i, 0);
    expect(sum / N).toBeGreaterThan(0.45);
    expect(sum / N).toBeLessThan(0.55);
  });
});

describe('confettiPiece', () => {
  it('is deterministic for (i, t, seed, tier) and starts at the origin', () => {
    for (const tier of TIERS)
      for (let i = 0; i < 20; i++) {
        expect(confettiPiece(i, 300, 5, tier)).toEqual(confettiPiece(i, 300, 5, tier));
        const p0 = confettiPiece(i, 0, 5, tier);
        for (const v of [p0.x, p0.y, p0.z]) expect(v).toBeCloseTo(0, 12);
        expect(p0.scale).toBe(1);
      }
    expect(confettiPiece(1, 300, 5, 3)).not.toEqual(confettiPiece(1, 300, 6, 3));
  });

  it('peaks no higher than 5² / (2·9) above the origin and spreads 1.0–2.2 t/s sideways', () => {
    const peak = 25 / 18;
    for (let i = 0; i < CONFETTI_CAP; i++) {
      let top = -Infinity;
      for (let t = 0; t <= CONFETTI_LIFE_MS[3]; t += 10) top = Math.max(top, confettiPiece(i, t, 11, 3).y);
      expect(top).toBeLessThanOrEqual(peak + 1e-9);
      expect(top).toBeGreaterThanOrEqual(3.5 ** 2 / 18 - 0.02);
      const p = confettiPiece(i, 100, 11, 3);
      const side = Math.hypot(p.x, p.z) / 0.1;
      expect(side).toBeGreaterThanOrEqual(1.0 - 1e-9);
      expect(side).toBeLessThanOrEqual(2.2 + 1e-9);
    }
  });

  it('spins on two axes at 3–6 rad/s', () => {
    for (let i = 0; i < 30; i++) {
      const a = confettiPiece(i, 100, 3, 2);
      const b = confettiPiece(i, 200, 3, 2);
      for (const w of [(b.rx - a.rx) / 0.1, (b.ry - a.ry) / 0.1]) {
        expect(Math.abs(w)).toBeGreaterThanOrEqual(3 - 1e-9);
        expect(Math.abs(w)).toBeLessThanOrEqual(6 + 1e-9);
      }
    }
  });

  it('shrinks over the last 20 % and is 0 from CONFETTI_LIFE_MS on (and before 0)', () => {
    for (const tier of TIERS) {
      const L = CONFETTI_LIFE_MS[tier];
      expect(confettiPiece(0, L * 0.79, 1, tier).scale).toBe(1);
      expect(confettiPiece(0, L * 0.9, 1, tier).scale).toBeCloseTo(0.5, 9);
      expect(confettiPiece(0, L, 1, tier).scale).toBe(0);
      expect(confettiPiece(0, L + 500, 1, tier).scale).toBe(0);
      expect(confettiPiece(0, -1, 1, tier).scale).toBe(0);
    }
  });

  it('writes into `out` when given, and returns it', () => {
    const out = { x: 9, y: 9, z: 9, rx: 9, ry: 9, scale: 9 };
    const r = confettiPiece(2, 250, 4, 1, out);
    expect(r).toBe(out);
    expect(out).toEqual(confettiPiece(2, 250, 4, 1));
  });
});

describe('burstPiece', () => {
  it('reaches the given radius at BURST_LIFE_MS (easeOutCubic) and 0 at the start', () => {
    for (const r of [0.9, 1.1, 1.4]) {
      expect(burstPiece(0, 8, 0, r, 1).r).toBe(0);
      expect(burstPiece(0, 8, BURST_LIFE_MS, r, 1).r).toBeCloseTo(r, 12);
      expect(burstPiece(0, 8, BURST_LIFE_MS / 2, r, 1).r).toBeCloseTo(r * (1 - 0.5 ** 3), 12);
      const p = burstPiece(3, 8, 200, r, 1);
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(p.r, 12);
    }
  });

  it('spreads n pieces at 360° / n ± 8°', () => {
    for (const n of [6, 8, 12, 18]) {
      for (let i = 0; i < n; i++) {
        const a = burstPiece(i, n, 100, 1, 42).angle;
        const ideal = (i * 2 * Math.PI) / n;
        expect(Math.abs(a - ideal)).toBeLessThanOrEqual(8 * DEG + 1e-12);
      }
    }
  });

  it('scale 0.6 → 1.0 (0–30 %) → hold → 0 (70–100 %)', () => {
    const L = BURST_LIFE_MS;
    expect(burstPiece(0, 8, 0, 1, 1).scale).toBeCloseTo(0.6, 12);
    expect(burstPiece(0, 8, 0.3 * L, 1, 1).scale).toBeCloseTo(1, 12);
    expect(burstPiece(0, 8, 0.5 * L, 1, 1).scale).toBe(1);
    expect(burstPiece(0, 8, 0.85 * L, 1, 1).scale).toBeCloseTo(0.5, 9);
    expect(burstPiece(0, 8, L, 1, 1).scale).toBe(0);
    expect(burstPiece(0, 8, -1, 1, 1).scale).toBe(0);
  });

  it('honors a custom life (sparkles)', () => {
    const s = BONUS_SPARKLE;
    expect(burstPiece(0, s.count, s.lifeMs, s.radius, 1, s.lifeMs).r).toBeCloseTo(s.radius, 12);
    expect(burstPiece(0, s.count, s.lifeMs, s.radius, 1, s.lifeMs).scale).toBe(0);
    expect(burstPiece(0, s.count, s.lifeMs * 0.5, s.radius, 1, s.lifeMs).scale).toBe(1);
  });
});

describe('ringState', () => {
  it('grows 0.3 → maxR (easeOutCubic), fades 0.9 → 0 and thins 0.9 → 0.96', () => {
    const a = ringState(0, 1.7);
    expect(a.alive).toBe(true);
    expect(a.radius).toBeCloseTo(0.3, 12);
    expect(a.opacity).toBeCloseTo(0.9, 12);
    expect(a.inner).toBeCloseTo(0.9, 12);
    const mid = ringState(RING_LIFE_MS / 2, 1.7);
    expect(mid.radius).toBeCloseTo(0.3 + 1.4 * (1 - 0.5 ** 3), 12);
    expect(mid.opacity).toBeCloseTo(0.45, 12);
    const end = ringState(RING_LIFE_MS - 1e-6, 1.7);
    expect(end.radius).toBeCloseTo(1.7, 6);
    expect(end.opacity).toBeCloseTo(0, 6);
    expect(end.inner).toBeCloseTo(0.96, 6);
    expect(ringState(RING_LIFE_MS, 1.7).alive).toBe(false);
    expect(ringState(-1, 1.7).alive).toBe(false);
  });

  it('a delayed second ring starts later and ends at the same time', () => {
    const d = RING_STAGGER_MS;
    expect(ringState(d - 1, 1.4, d).alive).toBe(false);
    const s = ringState(d, 1.4, d);
    expect(s.alive).toBe(true);
    expect(s.radius).toBeCloseTo(0.3, 12);
    expect(ringState(RING_LIFE_MS - 1e-6, 1.4, d).radius).toBeCloseTo(1.4, 6);
    expect(ringState(RING_LIFE_MS - 1e-6, 1.4, d).alive).toBe(true);
    expect(ringState(RING_LIFE_MS, 1.4, d).alive).toBe(false);
    expect(ringState(RING_LIFE_MS, 1.4, 0).alive).toBe(false);
  });
});

describe('puffPiece', () => {
  it('rises 0 → 0.5, spreads ≤ 0.3 and scales 0.4 → 1.0 → 0 over PUFF_LIFE_MS', () => {
    for (let i = 0; i < 6; i++) {
      const p0 = puffPiece(i, 6, 0, 9);
      expect(p0.y).toBeCloseTo(0, 12);
      expect(p0.scale).toBeCloseTo(0.4, 12);
      const mid = puffPiece(i, 6, PUFF_LIFE_MS * 0.5, 9);
      expect(mid.scale).toBe(1);
      expect(mid.y).toBeGreaterThan(0);
      let top = 0;
      for (let t = 0; t < PUFF_LIFE_MS; t += 10) {
        const p = puffPiece(i, 6, t, 9);
        top = Math.max(top, p.y);
        expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(0.3 + 1e-9);
      }
      expect(top).toBeLessThanOrEqual(0.5 + 1e-9);
      expect(top).toBeGreaterThan(0.45);
      expect(puffPiece(i, 6, PUFF_LIFE_MS, 9).scale).toBe(0);
      expect(puffPiece(i, 6, -1, 9).scale).toBe(0);
      expect(puffPiece(i, 6, 333, 9)).toEqual(puffPiece(i, 6, 333, 9));
    }
  });
});

describe('shakeOffset (UI-SPEC F2)', () => {
  const A = 0.06;
  const D = 0.32;

  it('is [0, 0] before 0 and after the duration', () => {
    expect(shakeOffset(-0.01, A, D)).toEqual([0, 0]);
    expect(shakeOffset(D + 1e-6, A, D)).toEqual([0, 0]);
    expect(shakeOffset(5, A, D)).toEqual([0, 0]);
  });

  it('stays within |x| ≤ A and |y| ≤ 0.6·A and follows the damped formula', () => {
    let moved = 0;
    for (let t = 0; t <= D; t += 0.001) {
      const [x, y] = shakeOffset(t, A, D);
      expect(Math.abs(x)).toBeLessThanOrEqual(A + 1e-12);
      expect(Math.abs(y)).toBeLessThanOrEqual(0.6 * A + 1e-12);
      const e = Math.exp(-t / 0.1);
      expect(x).toBeCloseTo(A * e * Math.sin(2 * Math.PI * 18 * t), 12);
      expect(y).toBeCloseTo(0.6 * A * e * Math.sin(2 * Math.PI * 23 * t + 1.3), 12);
      moved = Math.max(moved, Math.hypot(x, y));
    }
    expect(moved).toBeGreaterThan(0.02);
  });

  it('amplitude 0 never moves', () => {
    for (let t = 0; t <= D; t += 0.01) expect(shakeOffset(t, 0, D).map(Math.abs)).toEqual([0, 0]);
  });
});
