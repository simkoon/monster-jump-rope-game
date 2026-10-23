// src/game/director/successPlan.ts — the single timing and size table of one success beat
// (Phase 8 D-01, D-03, D-04, D-08, UI-SPEC F1).
// Same contract as timeline.ts: this file MUST stay
//   - free of React/DOM/three imports and of src/store.ts / src/settings,
//   - CLOCK-FREE (no wall-clock reads, no timers), and
//   - pure: every call returns a new value and never mutates its inputs.
// Every success consumer (Character jump, FxPools, CameraRig shake, Banner, StarFlight, useSfx)
// reads its start times and sizes from successPlan(), so landing, rings, jingle, banner, flight
// and "ding" can never drift apart. Times are ms from the beat start.
import { starTier, type StarTier } from './timeline';

export interface SuccessPlan {
  tier: StarTier;
  ms: number; // beat length (STARS_MS[tier] or STARS_MS_REDUCED)
  bannerMs: number; // the success banner appears (30 %)
  landMs: number; // jump lands: rings + burst + confetti + jingle start (35 %)
  flyFromMs: number; // the big star leaves the head (40 %)
  flyToMs: number; // the star reaches the scoreboard: arrival sparkle + ding (92 %)
  jumpHeight: number; // world units (tile side = 1)
  confetti: number; // confetti pieces
  burst: number; // star-burst pieces
  burstRadius: number; // world units
  rings: number; // shock-wave rings
  ringRadius: number; // max ring radius, world units
  gold: boolean; // ⭐3 gold mix (confetti, second ring, banner border)
  shakeMs: number; // camera shake length from landMs (⭐3 only)
  shakeAmp: number; // camera shake amplitude, world units
  bannerPop: number; // banner entry overshoot scale
}

type SizeRow = Pick<
  SuccessPlan,
  | 'jumpHeight'
  | 'confetti'
  | 'burst'
  | 'burstRadius'
  | 'rings'
  | 'ringRadius'
  | 'gold'
  | 'shakeMs'
  | 'shakeAmp'
  | 'bannerPop'
>;

// D-04: the higher the tier, the bigger every effect (UI-SPEC F1 size table).
export const SUCCESS_SIZE: Readonly<Record<StarTier, Readonly<SizeRow>>> = {
  1: { jumpHeight: 0.55, confetti: 40, burst: 8, burstRadius: 0.9, rings: 1, ringRadius: 1.2, gold: false, shakeMs: 0, shakeAmp: 0, bannerPop: 1.04 },
  2: { jumpHeight: 0.65, confetti: 80, burst: 12, burstRadius: 1.1, rings: 2, ringRadius: 1.4, gold: false, shakeMs: 0, shakeAmp: 0, bannerPop: 1.08 },
  3: { jumpHeight: 0.75, confetti: 140, burst: 18, burstRadius: 1.4, rings: 2, ringRadius: 1.7, gold: true, shakeMs: 320, shakeAmp: 0.06, bannerPop: 1.12 },
};

// D-03: start times as fractions of the beat length.
export const SUCCESS_RATIO = { banner: 0.3, land: 0.35, flyFrom: 0.4, flyTo: 0.92 } as const;

// D-08: under reduced motion the star fades in on the avatar at 600 ms (no flight).
export const REDUCED_FLY_TO_MS = 600;

export function successPlan(stars: number, ms: number, reduced: boolean): SuccessPlan {
  const tier = starTier(stars);
  const size = SUCCESS_SIZE[tier];
  if (reduced) {
    // Reduced motion: banner at once, no jump / confetti / burst / rings / shake / pop.
    return {
      tier,
      ms,
      bannerMs: 0,
      landMs: 0,
      flyFromMs: 0,
      flyToMs: Math.min(REDUCED_FLY_TO_MS, ms),
      jumpHeight: 0,
      confetti: 0,
      burst: 0,
      burstRadius: 0,
      rings: 0,
      ringRadius: 0,
      gold: size.gold,
      shakeMs: 0,
      shakeAmp: 0,
      bannerPop: 1,
    };
  }
  return {
    tier,
    ms,
    bannerMs: Math.round(ms * SUCCESS_RATIO.banner),
    landMs: Math.round(ms * SUCCESS_RATIO.land),
    flyFromMs: Math.round(ms * SUCCESS_RATIO.flyFrom),
    flyToMs: Math.round(ms * SUCCESS_RATIO.flyTo),
    ...size,
  };
}
