// src/game/layout/diceFaces.ts — die face table for the tween die (D-20).
// PHASE 6 CONTRACT: pure data + math — no React/DOM, no runtime import of three / @react-three/*
// (main-chunk safety). The 3D Dice builds Euler/Vector3 from these plain tuples.
// The engine pre-rolls 1..6; the mesh spins and snaps to FACE_UP_EULER[face] (v1 e230f7b values).
// Pip layout (face → outward normal): 1:+Y 6:−Y 2:+Z 5:−Z 3:+X 4:−X. Opposite faces sum to 7.

export type DieFace = 1 | 2 | 3 | 4 | 5 | 6;
export type Vec3 = readonly [number, number, number];

export function isDieFace(n: number): n is DieFace {
  return Number.isInteger(n) && n >= 1 && n <= 6;
}

// XYZ Euler that brings each face's outward normal to +Y (up).
export const FACE_UP_EULER: Readonly<Record<DieFace, Vec3>> = {
  1: [0, 0, 0],
  2: [-Math.PI / 2, 0, 0],
  3: [0, 0, Math.PI / 2],
  4: [0, 0, -Math.PI / 2],
  5: [Math.PI / 2, 0, 0],
  6: [Math.PI, 0, 0],
};

export const FACE_NORMAL: Readonly<Record<DieFace, Vec3>> = {
  1: [0, 1, 0],
  6: [0, -1, 0],
  2: [0, 0, 1],
  5: [0, 0, -1],
  3: [1, 0, 0],
  4: [-1, 0, 0],
};

// Standard pip layout on a {-1, 0, 1} grid per face (v1 d7b9b73 Dice.tsx).
export const PIP_GRID: Readonly<Record<DieFace, ReadonlyArray<readonly [number, number]>>> = {
  1: [[0, 0]],
  2: [[-1, 1], [1, -1]],
  3: [[-1, 1], [0, 0], [1, -1]],
  4: [[-1, 1], [1, 1], [-1, -1], [1, -1]],
  5: [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]],
  6: [[-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]],
};

// Local pip position on a cube of half-extent `half`; (u, v) grid cell scaled by `spacing`.
export function pipPosition(face: DieFace, u: number, v: number, half: number, spacing: number): Vec3 {
  const a = u * spacing;
  const b = v * spacing;
  switch (face) {
    case 1: return [a, half, b];
    case 6: return [a, -half, b];
    case 2: return [a, b, half];
    case 5: return [a, b, -half];
    case 3: return [half, a, b];
    case 4: return [-half, a, b];
  }
}

// Die edge length by board length (UI-SPEC S2): 16 → 0.9, 20 → 1.0, 24 → 1.1.
export function diceSize(boardLength: number): number {
  if (boardLength === 16) return 0.9;
  if (boardLength === 24) return 1.1;
  return 1.0;
}
