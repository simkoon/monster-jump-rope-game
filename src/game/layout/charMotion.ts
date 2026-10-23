// src/game/layout/charMotion.ts — pure pose curves for the chibi characters (D-10..D-14, D-16, CHAR-03).
// PHASE 7 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of any runtime import of three / @react-three/*
//     (main-chunk safety — the curves are unit-tested in jsdom),
//   - CLOCK-FREE: time always arrives as a parameter (u = beat progress, tSec = idle clock,
//     dt = frame delta); no wall-clock reads, no timers, and
//   - pure: every call returns a new Pose and never mutates its inputs.
// Beat curves take u = elapsed / beat length ∈ [0, 1] and start and end on REST (yaw ≡ 0 mod 2π),
// so a beat the Banner ends on time never leaves a character mid-jump (Pitfall 8). A beat that ends
// early (watchdog / skipAll) is eased back to REST by the consumer at SETTLE_RATE.
// Segment values and easings follow the UI-SPEC C4 curve table. Reduced motion (D-16) is applied by
// the consumer, which then holds REST: faces and blinks still change, bodies do not move.
// PHASE 8 (D-01, D-03, D-04, Pitfall 6): stars beats grew to 1600–2200 ms, so the success jump of a
// stars beat no longer runs on u: successBeatPose(tMs, timing) plays the Phase 7 jump over
// [0, timing.landMs] (the instant the confetti / burst / rings start) at the tier height
// timing.jumpHeight, then holds an arms-up joy pose that eases back to REST at timing.ms. The u-based
// successPose stays for the gallery and actPose.
//
// Pose fields (UI-SPEC C4): y = jump height · yaw = body heading (0 = toward the camera) ·
// squashY = vertical scale (the consumer widens xz by (1 − squashY)·0.5) · headPitch = added to
// −HEAD_TILT (+ = head down) · armL / armR = added to the rest angle (+ = up) · earTilt (+ = back /
// drooping) · lean = body pitch (− = backward).

export type Act = 'rest' | 'hop' | 'success' | 'bonus' | 'surprise' | 'slump' | 'cheer';

export interface Pose {
  y: number;
  yaw: number;
  squashY: number;
  headPitch: number;
  armL: number;
  armR: number;
  earTilt: number;
  lean: number;
}

export const REST: Readonly<Pose> = Object.freeze({
  y: 0,
  yaw: 0,
  squashY: 1,
  headPitch: 0,
  armL: 0,
  armR: 0,
  earTilt: 0,
  lean: 0,
});

// Phase 6 pawn motion, lifted unchanged from Pawn.tsx (07-04 deletes the Phase 6 pawn).
export const HOP_HEIGHT = 0.5;
export const SQUASH_FROM = 0.7; // last 30 % of each tile
export const SQUASH_DEPTH = 0.12; // y-scale dips to 0.88
export const SETTLE_RATE = 12; // rest easing: 1 − exp(−12·dt)
export const IDLE_PERIOD = 0.8; // s
export const IDLE_BOUNCE = 0.08;
export const RING_BREATH = 0.08; // turn ring scale 1.0 → 1.08
// Phase 7 additions (UI-SPEC C4).
export const BREATHE_AMP = 0.015; // ≤ 2 % for characters whose turn it is not
export const BREATHE_PERIOD = 2.6; // s
export const YAW_RATE_HOP = 20; // turn toward the travel direction: 1 − exp(−20·dt)
export const YAW_RATE_REST = 8; // turn back to the camera after a move (≈ 0.35 s)

const TAU = 2 * Math.PI;

export const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
export const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
export const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

const clamp01 = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x);
// Progress through the segment [a, b] of u, clamped to [0, 1].
const seg = (u: number, a: number, b: number) => clamp01((u - a) / (b - a));
// Jump parabola 4v(1 − v): 0 at take-off and landing, 1 at the apex.
const arc = (v: number) => 4 * v * (1 - v);
const pose = (p: Partial<Pose>): Pose => ({ ...REST, ...p });

// Success jump and spin (stars beat, 900 ms): crouch → 0.55 jump with a full turn and arms up → land.
export function successPose(u: number): Pose {
  const t = clamp01(u);
  if (t < 0.15) {
    const e = easeOutCubic(seg(t, 0, 0.15));
    return pose({ squashY: 1 - 0.15 * e, armL: 0.2 * e, armR: 0.2 * e });
  }
  if (t < 0.75) {
    const v = seg(t, 0.15, 0.75);
    // Take-off stretch 0.85 → 1.08, then settle to 1.0 by the apex.
    const squashY =
      v < 0.2 ? 0.85 + 0.23 * easeOutCubic(v / 0.2) : v < 0.5 ? 1.08 - 0.08 * easeInOutSine((v - 0.2) / 0.3) : 1;
    const arm = 0.2 + 1.8 * easeOutCubic(seg(v, 0, 0.5));
    return pose({ y: 0.55 * arc(v), yaw: TAU * easeInOutCubic(v), squashY, armL: arm, armR: arm });
  }
  if (t < 0.88) {
    const w = easeOutCubic(seg(t, 0.75, 0.88));
    const arm = 2 * (1 - w);
    return pose({ yaw: TAU, squashY: 1 - 0.15 * w, armL: arm, armR: arm });
  }
  return pose({ yaw: TAU, squashY: 0.85 + 0.15 * easeInOutSine(seg(t, 0.88, 1)) });
}

// Phase 8 tiered success beat (D-01, D-03, D-04): timing is the successPlan slice it needs.
export interface SuccessTiming {
  ms: number; // beat length
  landMs: number; // touchdown (successPlan: 35 % of ms)
  jumpHeight: number; // apex height, world units (⭐1 0.55 · ⭐2 0.65 · ⭐3 0.75)
}

export const SUCCESS_SQUASH_MS = 120; // landing squash recovery after touchdown
export const SUCCESS_RELAX_MS = 250; // ease from the joy hold back to REST at the beat end
const SUCCESS_JUMP_U = 0.75; // successPose touches down at u = 0.75
const SUCCESS_BASE_Y = 0.55; // successPose apex
const JOY_ARMS = 1.6; // arms-up joy hold
const JOY_BOB = 0.04; // gentle bob during the hold
const JOY_BOB_MS = 500; // bob period

// Success jump of a stars beat at tMs from the beat start (Pitfall 6: the jump runs on landMs and
// never stretches with the longer beat). REST at 0, touchdown (y 0, yaw 2π) at landMs, REST with
// yaw 2π at ms and after.
export function successBeatPose(tMs: number, timing: Readonly<SuccessTiming>): Pose {
  const ms = Math.max(0, timing.ms);
  const landMs = Math.min(Math.max(0, timing.landMs), ms);
  if (!(tMs > 0)) return pose({});
  if (tMs >= ms) return pose({ yaw: TAU });
  if (tMs < landMs) {
    const p = successPose((SUCCESS_JUMP_U * tMs) / landMs);
    p.y *= timing.jumpHeight / SUCCESS_BASE_Y;
    return p;
  }
  // After touchdown: squash recovery → joy hold (arms up, gentle bob) → ease to REST at ms.
  const squashEnd = Math.min(landMs + SUCCESS_SQUASH_MS, ms);
  const relaxStart = Math.max(squashEnd, ms - SUCCESS_RELAX_MS);
  if (tMs < squashEnd) {
    const k = seg(tMs, landMs, squashEnd);
    const arm = 2 - (2 - JOY_ARMS) * easeOutCubic(k);
    return pose({ yaw: TAU, squashY: 1 - 0.15 * Math.sin(Math.PI * k), armL: arm, armR: arm });
  }
  const bob = JOY_BOB * Math.sin((Math.PI * (tMs - squashEnd)) / JOY_BOB_MS) ** 2;
  const keep = tMs < relaxStart ? 1 : 1 - easeInOutSine(seg(tMs, relaxStart, ms));
  return pose({ y: bob * keep, yaw: TAU, armL: JOY_ARMS * keep, armR: JOY_ARMS * keep });
}

// Disappointed slump (miss 700 ms / backward event 1000 ms): head down, arms in, ears droop, a sigh.
export function slumpPose(u: number): Pose {
  const t = clamp01(u);
  let k = 1; // how far into the slump
  let sigh = 0;
  if (t < 0.25) k = easeOutCubic(seg(t, 0, 0.25));
  else if (t < 0.8) sigh = 0.02 * Math.sin(Math.PI * seg(t, 0.25, 0.8));
  else k = 1 - easeInOutSine(seg(t, 0.8, 1));
  return pose({
    squashY: 1 - 0.06 * k - sigh,
    headPitch: 0.35 * k,
    armL: -0.33 * k,
    armR: -0.33 * k,
    earTilt: 0.4 * k,
    lean: 0.08 * k,
  });
}

// Winner cheer (win beat, 1500 ms): two 0.35 jumps facing the camera, arms up waving, ears bouncing.
export function cheerPose(u: number): Pose {
  const t = clamp01(u);
  let y = 0;
  let squashY = 1;
  if (t < 0.08) squashY = 1 - 0.12 * easeOutCubic(seg(t, 0, 0.08));
  else if (t < 0.46) {
    y = 0.35 * arc(seg(t, 0.08, 0.46));
    squashY = 0.88 + 0.12 * easeOutCubic(seg(t, 0.08, 0.16));
  } else if (t < 0.54) squashY = 1 - 0.12 * Math.sin(Math.PI * seg(t, 0.46, 0.54));
  else if (t < 0.92) y = 0.35 * arc(seg(t, 0.54, 0.92));
  else squashY = 1 - 0.12 * Math.sin(Math.PI * seg(t, 0.92, 1));
  // Arms: up over 0.05–0.15, held until 0.92, down to rest by 1.
  const raise = t < 0.92 ? easeOutCubic(seg(t, 0.05, 0.15)) : 1 - easeInOutSine(seg(t, 0.92, 1));
  const wave = 0.25 * Math.sin(TAU * 4 * t);
  return pose({
    y,
    squashY,
    armL: raise * (2.4 + wave),
    armR: raise * (2.4 - wave),
    earTilt: 0.2 * Math.sin(TAU * 3 * t),
  });
}

// Surprise (forward / limited extra event, 1000 ms): a startled hop back with arms flung out,
// back at REST by 0.60 while the surprised face stays until the beat ends.
export function surprisePose(u: number): Pose {
  const t = clamp01(u);
  if (t >= 0.6) return pose({});
  const k = t < 0.12 ? easeOutCubic(seg(t, 0, 0.12)) : t < 0.3 ? 1 : 1 - easeInOutSine(seg(t, 0.3, 0.6));
  return pose({ y: 0.12 * k, squashY: 1 + 0.06 * k, armL: 1.2 * k, armR: 1.2 * k, lean: -0.2 * k });
}

// Bonus hops (start bonus 800 ms / extra event 1000 ms): two 0.20 hops with arms up, REST from 0.70.
export function bonusPose(u: number): Pose {
  const t = clamp01(u);
  if (t >= 0.7) return pose({});
  const v = t < 0.35 ? seg(t, 0, 0.35) : seg(t, 0.35, 0.7);
  const land = v > 0.75 ? Math.sin((Math.PI * (v - 0.75)) / 0.25) : 0; // squash 0.9 at each landing
  const raise = t < 0.6 ? easeOutCubic(seg(t, 0, 0.1)) : 1 - easeInOutSine(seg(t, 0.6, 0.7));
  return pose({ y: 0.2 * arc(v), squashY: 1 - 0.1 * land, armL: 1.6 * raise, armR: 1.6 * raise });
}

// The pose of a beat act at progress u. 'rest' and 'hop' have no beat curve here (hop is per tile).
export function actPose(act: Act, u: number): Pose {
  switch (act) {
    case 'success':
      return successPose(u);
    case 'slump':
      return slumpPose(u);
    case 'cheer':
      return cheerPose(u);
    case 'surprise':
      return surprisePose(u);
    case 'bonus':
      return bonusPose(u);
    default:
      return pose({});
  }
}

// One tile of a move (s ∈ [0, 1] through that tile): the Phase 6 parabola, landing squash over the
// last 30 %, ears blown back in the air. The consumer sets yaw toward the travel direction.
export function hopPose(s: number): Pose {
  const t = clamp01(s);
  const squash = t > SQUASH_FROM ? Math.sin((Math.PI * (t - SQUASH_FROM)) / (1 - SQUASH_FROM)) : 0;
  return pose({ y: HOP_HEIGHT * arc(t), squashY: 1 - SQUASH_DEPTH * squash, earTilt: 0.3 * Math.sin(Math.PI * t) });
}

// Waiting bounce of the current turn (idle clock tSec): period IDLE_PERIOD, squash on each landing,
// ears lagging behind the body.
export function bouncePose(tSec: number): Pose {
  const y = IDLE_BOUNCE * Math.abs(Math.sin((Math.PI * tSec) / IDLE_PERIOD));
  return pose({
    y,
    squashY: y < 0.01 ? 0.92 : 1,
    earTilt: 0.15 * Math.sin((TAU * tSec) / IDLE_PERIOD - 0.9),
  });
}

// Breathing for characters whose turn it is not: ≤ 2 % vertical scale, phase shifted per seed.
export function breathePose(tSec: number, seed: number): Pose {
  return pose({ squashY: 1 + BREATHE_AMP * Math.sin((TAU * tSec) / BREATHE_PERIOD + seed * 1.7) });
}

// Ease an angle toward target along the shortest signed arc (through ±π when that is shorter).
// The step factor 1 − exp(−rate·dt) is in [0, 1), so it never overshoots. Not wrapped on return.
export function approachAngle(cur: number, target: number, rate: number, dt: number): number {
  let d = (target - cur) % TAU;
  if (d > Math.PI) d -= TAU;
  else if (d < -Math.PI) d += TAU;
  return cur + d * clamp01(1 - Math.exp(-rate * dt));
}
