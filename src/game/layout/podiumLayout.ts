// src/game/layout/podiumLayout.ts — where everybody stands in the ceremony (D-12, D-16, END-01, UI-SPEC §F7).
// PHASE 8 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of any runtime import of three / @react-three/*
//     (main-chunk safety — the ceremony HUD may read the intro timing), and
//   - CLOCK-FREE and pure: every call returns new values and never mutates its inputs.
// D-12: there is exactly ONE podium tier, the highest (gold). Every winner — co-winners side by side,
// zero-star co-winners included — stands on it: one row up to 4, two rows for 5–8 (front 3–4, the
// back row raised 0.15). There is no 2nd / 3rd tier, and the last-place player is never placed
// apart: everybody else stands on the floor in front of the tier in one row (two zig-zag rows from
// 6), at the same size rule. Sizes follow the Phase 7 D-17 bands (1 winner 1.15, 2–4 0.85–1.0, 5–8
// 0.65–0.75). The group is centered on the origin, because fitCamera always looks at the origin.
// World axes as on the board: the camera looks from +Z, so "in front of the tier" = larger z.
import { HEAD_A, HEAD_TOP, BODY_R } from './chibiDims';

// Ceremony intro (D-16, UI-SPEC §F7 "등장 연출"): ≤ 2 s; the winners' big jump and the gold confetti /
// ring start at 200 ms, the others start cheering at 400 ms.
export const CEREMONY_INTRO_MS = 1800;
export const INTRO_JUMP_AT_MS = 200;
export const INTRO_CHEER_AT_MS = 400;

export const PODIUM_HEIGHT = 0.6; // the gold tier
export const GROUND_HEIGHT = 0.12; // the floor disc under everybody

const SPACING = 0.75; // neighbor distance in a row, × scale (UI-SPEC: ≥ 0.7 × scale, head-width basis)
const TIER_PAD = 0.5; // tier width = winner row width + this
const TIER_MIN_W = 1.6;
const TIER_DEPTH = 1.2;
const TIER_DEPTH_2 = 1.9; // two winner rows
const WIN_ROW_DZ = 0.4; // two winner rows: front at +0.4, back at −0.4 from the tier center
const BACK_RAISE = 0.15; // the back winner row stands higher
const FLOOR_GAP = 0.6; // first floor row this far in front of the tier's front edge
const FLOOR_ROW_DZ = 0.5; // second floor row this much further forward
const GROUND_PAD = 0.8;
const GROUND_MIN_R = 2.4;
const CROWN_CLEAR = 0.3; // room above the tallest head for the crown

export interface CeremonyStand {
  x: number;
  y: number; // the floor the character stands on (tier top or floor top)
  z: number;
  scale: number;
  winner: boolean;
  phaseSec: number; // cheer loop phase: 0 for winners, 0.2 s × index among the others
}

export interface PodiumLayout {
  stands: Readonly<Record<string, CeremonyStand>>;
  podium: { z: number; width: number; depth: number; height: number };
  groundRadius: number;
  topCenter: readonly [number, number, number]; // tier top center (FX origin)
  extents: { hx: number; hz: number; h: number }; // fitCamera box around everybody
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Phase 7 D-17 size bands by the number of people in the group.
function bandScale(n: number): number {
  if (n <= 1) return 1.15;
  if (n <= 4) return lerp(1.0, 0.85, (n - 2) / 2);
  return lerp(0.75, 0.65, (Math.min(n, 8) - 5) / 3);
}

// x of k people in a row centered on 0, shifted by `shift` (zig-zag).
const rowX = (n: number, k: number, sp: number, shift = 0) => (k - (n - 1) / 2) * sp + shift;

export function podiumLayout(winners: readonly string[], others: readonly string[]): PodiumLayout {
  const w = winners.length;
  const o = others.length;
  const ws = bandScale(w);
  // A lone non-winner is never made bigger than the 2–4 band (1.15 is the single winner's).
  const os = bandScale(Math.max(2, o));
  const wsp = SPACING * ws;
  const osp = SPACING * os;
  const top = GROUND_HEIGHT + PODIUM_HEIGHT;

  // Built with the tier centered at z = 0, then shifted so the whole group centers on the origin.
  const raw: Record<string, CeremonyStand> = {};
  const twoWinRows = w > 4;
  const winFront = twoWinRows ? Math.ceil(w / 2) : w;
  winners.forEach((id, k) => {
    const back = k >= winFront;
    const n = back ? w - winFront : winFront;
    const i = back ? k - winFront : k;
    raw[id] = {
      x: rowX(n, i, wsp),
      y: back ? top + BACK_RAISE : top,
      z: twoWinRows ? (back ? -WIN_ROW_DZ : WIN_ROW_DZ) : 0,
      scale: ws,
      winner: true,
      phaseSec: 0,
    };
  });
  const depth = twoWinRows ? TIER_DEPTH_2 : TIER_DEPTH;
  const width = Math.max(TIER_MIN_W, (winFront - 1) * wsp + 2 * HEAD_A * ws + TIER_PAD);

  // Floor: one row up to 5, two zig-zag rows from 6 (the nearer row shifted by half a step).
  const twoFloorRows = o >= 6;
  const floorBack = twoFloorRows ? Math.ceil(o / 2) : o;
  const floorZ = depth / 2 + FLOOR_GAP;
  others.forEach((id, k) => {
    const near = k >= floorBack;
    const n = near ? o - floorBack : floorBack;
    const i = near ? k - floorBack : k;
    raw[id] = {
      x: rowX(n, i, osp, near && n === floorBack ? osp / 2 : 0),
      y: GROUND_HEIGHT,
      z: near ? floorZ + FLOOR_ROW_DZ : floorZ,
      scale: os,
      winner: false,
      phaseSec: 0.2 * k,
    };
  });

  // Center the tier + the crowd on the origin along z (x rows are already centered).
  const list = Object.values(raw);
  const zMin = -depth / 2;
  const zMax = Math.max(depth / 2, ...list.map((s) => s.z));
  const shift = -(zMin + zMax) / 2;
  const stands: Record<string, CeremonyStand> = {};
  for (const [id, s] of Object.entries(raw)) stands[id] = { ...s, z: s.z + shift };
  const tierZ = shift;

  const crowdHalf = Math.max(0, ...list.map((s) => Math.abs(s.x) + HEAD_A * s.scale));
  const hx = Math.max(width / 2, crowdHalf);
  const hz = Math.max(...list.map((s) => Math.abs(s.z + shift) + BODY_R * s.scale), depth / 2 + Math.abs(shift));
  const h = Math.max(top, ...list.map((s) => s.y + HEAD_TOP * s.scale)) + CROWN_CLEAR;

  return {
    stands,
    podium: { z: tierZ, width, depth, height: PODIUM_HEIGHT },
    groundRadius: Math.max(GROUND_MIN_R, Math.max(0, ...list.map((s) => Math.abs(s.x))) + GROUND_PAD),
    topCenter: [0, top, tierZ],
    extents: { hx, hz, h },
  };
}
