// src/game/layout/fxMotion.ts — pure curves of the 3D success effects (Phase 8 D-03, D-04, D-06, D-08,
// D-10, FX-01, FX-04, FX-06, UI-SPEC F2 / F6).
// PHASE 7 CONTRACT (same as charMotion.ts): this file MUST stay
//   - free of React/DOM imports and of any runtime import of three / @react-three/*
//     (main-chunk safety — the curves are unit-tested in jsdom / node),
//   - CLOCK-FREE: time always arrives as a parameter (tMs = ms since the effect started,
//     tSec for the shake); no wall-clock reads, no timers, no unseeded randomness, and
//   - pure: a call never mutates its inputs. Piece functions return a new object, or write into
//     the optional `out` and return it, so the frame loop (FxPools) allocates nothing per frame.
// Randomness is the seeded integer hash fxRand(seed, i, k): seed = beat id, i = piece index,
// k = which property. The same beat therefore always throws the same confetti.
// Positions are offsets from the effect origin in world units (tile side = 1); burst offsets live
// in the camera's billboard plane (x = camera right, y = camera up). The consumer places them.
import type { StarTier } from '../director/timeline';
import { easeInOutSine, easeOutCubic } from './charMotion';

// D-06: fixed pool capacities (InstancedMesh `args` never change, Phase 6 Pitfall 8).
export const CONFETTI_CAP = 160;
export const BURST_CAP = 24;
export const RING_CAP = 3;
export const PUFF_CAP = 8;

// Lifetimes (UI-SPEC F2). Every success effect ends inside its beat (landMs + life ≤ STARS_MS).
export const CONFETTI_LIFE_MS: Readonly<Record<StarTier, number>> = { 1: 900, 2: 1000, 3: 1150 };
export const BURST_LIFE_MS = 500;
export const RING_LIFE_MS = 450;
export const RING_STAGGER_MS = 120; // the second ring starts later and ends at the same time
export const PUFF_LIFE_MS = 700;

// D-10 small effects that reuse the pools (UI-SPEC F6(b)(c)); the beats keep their length.
export const BONUS_SPARKLE = { count: 6, radius: 0.5, startMs: 120, lifeMs: 450 } as const; // startBonus
export const EVENT_SPARKLE = { count: 8, radius: 0.7, startMs: 150, lifeMs: 500 } as const; // lucky event
export const EVENT_PUFF = { count: 6, startMs: 150, lifeMs: PUFF_LIFE_MS } as const; // trap event

const TAU = 2 * Math.PI;
const GRAVITY = 9; // t/s²
const BURST_JITTER = (8 * Math.PI) / 180; // ±8°
const RING_R0 = 0.3;
const RING_OPACITY = 0.9;
const RING_INNER0 = 0.9;
const RING_INNER1 = 0.96;
const PUFF_RISE = 0.5;
const PUFF_SPREAD = 0.3;

// Seeded hash → [0, 1). Integer mixing only (no Math.random), so effects are deterministic.
export function fxRand(seed: number, i: number, k: number): number {
  let h = Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15) ^ Math.imul(i | 0, 0xc2b2ae35), 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 13) ^ Math.imul((k | 0) + 0x165667b1, 0x9e3779b1), 0x85ebca77);
  h ^= h >>> 16;
  h = Math.imul(h, 0xc2b2ae3d);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

export interface FxPiece {
  x: number;
  y: number;
  z: number;
  rx: number; // flutter spin (confetti); 0 for puffs
  ry: number;
  scale: number; // 0 = hidden
}

export interface BurstPiece {
  x: number; // billboard plane: camera right
  y: number; // billboard plane: camera up
  r: number; // distance from the center
  angle: number; // radians, i · 360° / n ± 8°
  scale: number;
}

export interface RingState {
  alive: boolean;
  radius: number; // outer radius, world units
  inner: number; // inner / outer ratio (the instanced RingGeometry keeps 0.9, see FxPools)
  opacity: number;
}

const newPiece = (): FxPiece => ({ x: 0, y: 0, z: 0, rx: 0, ry: 0, scale: 0 });

// Confetti: shot up in a cone from the head (UI-SPEC F2). Up 3.5–5.0 t/s, side 1.0–2.2 t/s at a
// random azimuth, gravity −9 t/s², two-axis flutter 3–6 rad/s. Full size until 80 % of the life,
// then 1 → 0; 0 outside [0, life). The highest possible apex is 5² / (2·9) ≈ 1.39.
export function confettiPiece(i: number, tMs: number, seed: number, tier: StarTier, out: FxPiece = newPiece()): FxPiece {
  const life = CONFETTI_LIFE_MS[tier];
  const t = tMs / 1000;
  const up = lerp(3.5, 5.0, fxRand(seed, i, 0));
  const side = lerp(1.0, 2.2, fxRand(seed, i, 1));
  const az = TAU * fxRand(seed, i, 2);
  const wx = lerp(3, 6, fxRand(seed, i, 3)) * (fxRand(seed, i, 4) < 0.5 ? -1 : 1);
  const wy = lerp(3, 6, fxRand(seed, i, 5)) * (fxRand(seed, i, 6) < 0.5 ? -1 : 1);
  const p0x = TAU * fxRand(seed, i, 7);
  const p0y = TAU * fxRand(seed, i, 8);
  out.x = Math.cos(az) * side * t;
  out.z = Math.sin(az) * side * t;
  out.y = up * t - 0.5 * GRAVITY * t * t;
  out.rx = p0x + wx * t;
  out.ry = p0y + wy * t;
  if (tMs < 0 || tMs >= life) out.scale = 0;
  else {
    const u = tMs / life;
    out.scale = u < 0.8 ? 1 : (1 - u) / 0.2;
  }
  return out;
}

const newBurst = (): BurstPiece => ({ x: 0, y: 0, r: 0, angle: 0, scale: 0 });

// Star burst / sparkles: n pieces fly out radially in the billboard plane at equal angles ± 8°,
// decelerating (easeOutCubic) to `radius` at the end of the life. Scale 0.6 → 1.0 over the first
// 30 %, hold, 1 → 0 over the last 30 %; 0 outside [0, life).
export function burstPiece(
  i: number,
  n: number,
  tMs: number,
  radius: number,
  seed: number,
  lifeMs: number = BURST_LIFE_MS,
  out: BurstPiece = newBurst(),
): BurstPiece {
  const u = Math.min(1, Math.max(0, tMs / lifeMs));
  out.angle = (i * TAU) / Math.max(1, n) + (2 * fxRand(seed, i, 9) - 1) * BURST_JITTER;
  out.r = radius * easeOutCubic(u);
  out.x = Math.cos(out.angle) * out.r;
  out.y = Math.sin(out.angle) * out.r;
  if (tMs < 0 || tMs >= lifeMs) out.scale = 0;
  else if (u < 0.3) out.scale = 0.6 + 0.4 * (u / 0.3);
  else if (u < 0.7) out.scale = 1;
  else out.scale = (1 - u) / 0.3;
  return out;
}

// Shock-wave ring: outer radius 0.3 → maxR (easeOutCubic), opacity 0.9 → 0, inner ratio 0.9 → 0.96.
// A ring delayed by delayMs grows over the shorter span (delayMs, RING_LIFE_MS), so every ring of
// one effect ends at the same time. Alive on [delayMs, RING_LIFE_MS).
export function ringState(
  tMs: number,
  maxR: number,
  delayMs = 0,
  out: RingState = { alive: false, radius: 0, inner: RING_INNER0, opacity: 0 },
): RingState {
  out.alive = tMs >= delayMs && tMs < RING_LIFE_MS;
  const u = Math.min(1, Math.max(0, (tMs - delayMs) / (RING_LIFE_MS - delayMs)));
  out.radius = lerp(RING_R0, maxR, easeOutCubic(u));
  out.inner = lerp(RING_INNER0, RING_INNER1, u);
  out.opacity = out.alive ? RING_OPACITY * (1 - u) : 0;
  return out;
}

// Puff (trap events): a soft cloud from the feet slowly rises 0.5 and drifts ≤ 0.3 sideways;
// scale 0.4 → 1.0 (first 40 %), hold, 1 → 0 (last 30 %); 0 outside [0, PUFF_LIFE_MS).
export function puffPiece(i: number, n: number, tMs: number, seed: number, out: FxPiece = newPiece()): FxPiece {
  const u = Math.min(1, Math.max(0, tMs / PUFF_LIFE_MS));
  const az = (i * TAU) / Math.max(1, n) + (2 * fxRand(seed, i, 10) - 1) * BURST_JITTER;
  const reach = PUFF_SPREAD * lerp(0.5, 1, fxRand(seed, i, 11)) * easeOutCubic(u);
  out.x = Math.cos(az) * reach;
  out.z = Math.sin(az) * reach;
  out.y = PUFF_RISE * easeInOutSine(u);
  out.rx = 0;
  out.ry = 0;
  if (tMs < 0 || tMs >= PUFF_LIFE_MS) out.scale = 0;
  else if (u < 0.4) out.scale = 0.4 + 0.6 * (u / 0.4);
  else if (u < 0.7) out.scale = 1;
  else out.scale = (1 - u) / 0.3;
  return out;
}

// ⭐3 camera shake (UI-SPEC F2): x = A·e^(−t/0.1)·sin(2π·18·t), y = 0.6·A·e^(−t/0.1)·sin(2π·23·t + 1.3)
// on [0, dur]; [0, 0] outside. Translation only — the consumer adds it to the camera and its target.
export function shakeOffset(tSec: number, amp: number, durSec: number): readonly [number, number] {
  if (!(tSec >= 0) || tSec > durSec || amp === 0) return [0, 0];
  const e = amp * Math.exp(-tSec / 0.1);
  return [e * Math.sin(TAU * 18 * tSec), 0.6 * e * Math.sin(TAU * 23 * tSec + 1.3)];
}
