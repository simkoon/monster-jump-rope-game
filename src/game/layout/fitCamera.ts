// src/game/layout/fitCamera.ts — closed-form fit of the fixed quarter-view camera (D-09, D-10, BOARD-01).
// PHASE 6 CONTRACT: pure math — no React/DOM, no runtime import of three / @react-three/*
// (main-chunk safety). The CameraRig feeds the result into a three PerspectiveCamera.
// D-09: one fixed view from the +Z side looking at the board center; no user rotation or zoom.
// D-10: no follow — the result depends only on the canvas aspect and the board extents.
//
// The board is an axis-aligned box (half-extents hx, hz; height h) seen with pitch p. Moving the
// camera along its view axis leaves camera-space x and y unchanged, so each of the 8 corners
// gives a closed-form lower bound on the camera distance d; the largest bound fits them all.

export const CAMERA_FOV = 35; // vertical field of view, degrees

const DEG = Math.PI / 180;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Fractions of the canvas covered by DOM overlays on each side (0 = none).
export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface FitInput {
  hx: number;
  hz: number;
  h: number;
  fov?: number;
  insets?: Insets;
  margin?: number; // NDC margin kept free on every side
}

export interface CameraFit {
  position: readonly [number, number, number];
  target: readonly [0, 0, 0];
  fov: number;
  pitchDeg: number;
}

const NO_INSETS: Insets = { top: 0, bottom: 0, left: 0, right: 0 };

export function fitCamera(aspect: number, o: FitInput): CameraFit {
  const a = Number.isFinite(aspect) && aspect > 0 ? aspect : 1; // T-06-01: no NaN reaches the camera
  const fov = o.fov ?? CAMERA_FOV;
  const ins = o.insets ?? NO_INSETS;
  const m = o.margin ?? 0.04;
  // Portrait looks down more steeply (60°), wide screens flatter (50°).
  const pitchDeg = lerp(60, 50, clamp((a - 0.5) / 1.1, 0, 1));
  const p = pitchDeg * DEG;
  const tanV = Math.tan((fov * DEG) / 2);
  const tanH = tanV * a;
  const xMin = -1 + 2 * ins.left + m;
  const xMax = 1 - 2 * ins.right - m;
  const yMin = -1 + 2 * ins.bottom + m;
  const yMax = 1 - 2 * ins.top - m;
  // Distance needed so a camera-space coordinate v lands inside [lo, hi] in NDC.
  const need = (v: number, tan: number, lo: number, hi: number) =>
    v >= 0 ? (hi > 0 ? v / (tan * hi) : Infinity) : lo < 0 ? v / (tan * lo) : Infinity;
  let d = 0;
  for (const x of [-o.hx, o.hx]) {
    for (const z of [-o.hz, o.hz]) {
      for (const y of [0, o.h]) {
        const cy = y * Math.cos(p) - z * Math.sin(p); // camera-space up
        const along = -y * Math.sin(p) - z * Math.cos(p); // depth offset along the view axis
        d = Math.max(d, need(x, tanH, xMin, xMax) - along, need(cy, tanV, yMin, yMax) - along);
      }
    }
  }
  return { position: [0, d * Math.sin(p), d * Math.cos(p)], target: [0, 0, 0], fov, pitchDeg };
}
