// src/game/director/successPlan.test.ts — the single success timing / size table (08-02 Task 1;
// D-01, D-03, D-04, D-08, UI-SPEC F1). Every consumer (Character, FxPools, CameraRig, Banner,
// StarFlight, useSfx) reads these numbers, so they are pinned here once.
import { describe, it, expect } from 'vitest';
import { REDUCED_FLY_TO_MS, SUCCESS_RATIO, SUCCESS_SIZE, successPlan } from './successPlan';
import { STARS_MS, STARS_MS_REDUCED, starTier, starsBeatMs, type StarTier } from './timeline';

const TIERS: readonly StarTier[] = [1, 2, 3];

describe('starTier / starsBeatMs (D-01, D-08)', () => {
  it('clamps the star count into 1..3', () => {
    expect(starTier(0)).toBe(1);
    expect(starTier(1)).toBe(1);
    expect(starTier(2)).toBe(2);
    expect(starTier(3)).toBe(3);
    expect(starTier(4)).toBe(3);
  });

  it('beat length per tier, fixed 1200 ms under reduced motion', () => {
    expect(STARS_MS).toEqual({ 1: 1600, 2: 1900, 3: 2200 });
    expect(STARS_MS_REDUCED).toBe(1200);
    expect(TIERS.map((t) => starsBeatMs(t, false))).toEqual([1600, 1900, 2200]);
    expect(TIERS.map((t) => starsBeatMs(t, true))).toEqual([1200, 1200, 1200]);
  });

  it('D-02: the longest success beat leaves 300 ms of the 2.5 s budget', () => {
    expect(Math.max(...Object.values(STARS_MS))).toBe(2200);
    expect(2500 - STARS_MS[3]).toBe(300);
  });
});

describe('successPlan — timings (D-03, UI-SPEC F1)', () => {
  it('ratios are banner 30 %, land 35 %, fly from 40 %, fly to 92 %', () => {
    expect(SUCCESS_RATIO).toEqual({ banner: 0.3, land: 0.35, flyFrom: 0.4, flyTo: 0.92 });
    expect(REDUCED_FLY_TO_MS).toBe(600);
  });

  it('⭐1 1600 ms → 480 / 560 / 640 / 1472, small sizes, no shake', () => {
    expect(successPlan(1, 1600, false)).toMatchObject({
      tier: 1,
      ms: 1600,
      bannerMs: 480,
      landMs: 560,
      flyFromMs: 640,
      flyToMs: 1472,
      confetti: 40,
      burst: 8,
      rings: 1,
      jumpHeight: 0.55,
      shakeMs: 0,
      shakeAmp: 0,
      gold: false,
      bannerPop: 1.04,
    });
  });

  it('⭐2 1900 ms → 570 / 665 / 760 / 1748', () => {
    expect(successPlan(2, 1900, false)).toMatchObject({
      tier: 2,
      bannerMs: 570,
      landMs: 665,
      flyFromMs: 760,
      flyToMs: 1748,
      confetti: 80,
      burst: 12,
      rings: 2,
      jumpHeight: 0.65,
      shakeMs: 0,
      bannerPop: 1.08,
    });
  });

  it('⭐3 2200 ms → 660 / 770 / 880 / 2024, gold, 320 ms shake', () => {
    expect(successPlan(3, 2200, false)).toMatchObject({
      tier: 3,
      bannerMs: 660,
      landMs: 770,
      flyFromMs: 880,
      flyToMs: 2024,
      confetti: 140,
      burst: 18,
      rings: 2,
      gold: true,
      jumpHeight: 0.75,
      shakeMs: 320,
      shakeAmp: 0.06,
      bannerPop: 1.12,
    });
  });

  it('burst / ring radii per tier (UI-SPEC F1)', () => {
    expect(TIERS.map((t) => SUCCESS_SIZE[t].burstRadius)).toEqual([0.9, 1.1, 1.4]);
    expect(TIERS.map((t) => SUCCESS_SIZE[t].ringRadius)).toEqual([1.2, 1.4, 1.7]);
  });

  it('a star count outside 1..3 uses the clamped tier', () => {
    expect(successPlan(0, 1600, false).tier).toBe(1);
    expect(successPlan(7, 2200, false).tier).toBe(3);
  });
});

describe('successPlan — reduced motion (D-08)', () => {
  it.each(TIERS)('⭐%i reduced → banner at 0, fly to 600, every motion size 0, gold of the tier', (t) => {
    const p = successPlan(t, STARS_MS_REDUCED, true);
    expect(p).toMatchObject({
      tier: t,
      ms: 1200,
      bannerMs: 0,
      landMs: 0,
      flyFromMs: 0,
      flyToMs: 600,
      jumpHeight: 0,
      confetti: 0,
      burst: 0,
      rings: 0,
      shakeMs: 0,
      shakeAmp: 0,
      bannerPop: 1,
      gold: t === 3,
    });
  });

  it('flyToMs never exceeds a short beat', () => {
    expect(successPlan(2, 400, true).flyToMs).toBe(400);
  });
});

describe('successPlan — invariants over every tier × reduced (T-08-31)', () => {
  const cases = TIERS.flatMap((t) => [false, true].map((r) => [t, r] as const));

  it.each(cases)('⭐%i reduced=%s: 0 ≤ banner ≤ land ≤ flyFrom ≤ flyTo ≤ ms, shake ≤ 350', (t, r) => {
    const p = successPlan(t, starsBeatMs(t, r), r);
    expect(p.bannerMs).toBeGreaterThanOrEqual(0);
    expect(p.bannerMs).toBeLessThanOrEqual(p.landMs);
    expect(p.landMs).toBeLessThanOrEqual(p.flyFromMs);
    expect(p.flyFromMs).toBeLessThanOrEqual(p.flyToMs);
    expect(p.flyToMs).toBeLessThanOrEqual(p.ms);
    expect(p.shakeMs).toBeLessThanOrEqual(350);
  });

  it('sizes never shrink as the tier rises', () => {
    const keys = ['confetti', 'burst', 'burstRadius', 'rings', 'ringRadius', 'jumpHeight', 'shakeMs', 'bannerPop'] as const;
    for (const k of keys) {
      const vals = TIERS.map((t) => successPlan(t, STARS_MS[t], false)[k]);
      expect(vals, k).toEqual([...vals].sort((a, b) => a - b));
    }
  });

  it('returns a fresh object each call (pure)', () => {
    const a = successPlan(3, 2200, false);
    const b = successPlan(3, 2200, false);
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
