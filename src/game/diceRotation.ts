// src/game/diceRotation.ts — PURE die-face → up-rotation table (D-05, RESEARCH Pattern 5).
// PHASE 3 CONTRACT: no React/DOM imports. This table is the SINGLE source the Dice tween
// snaps to after its spin — the engine pre-rolls the 1–6 value, the mesh rotates to bring
// that face up. Opposite faces sum to 7 (1↔6, 2↔5, 3↔4).
//
// NOTE (Open Question 2): the exact Euler per face depends on where the pips are authored
// on the cube mesh. These values assume the pip layout built in Dice.tsx (face 1 on +Y at
// rest). They are visually validated against the authored mesh in Task 2's human-check —
// if the top face ever disagrees with the DOM 🎲 N, adjust HERE only.
import { Euler } from 'three';

export type DieFace = 1 | 2 | 3 | 4 | 5 | 6;

// Face-up target Euler for a standard die. Rotations bring the numbered face to +Y (up).
export const FACE_UP_EULER: Record<DieFace, Euler> = {
  1: new Euler(0, 0, 0),
  2: new Euler(-Math.PI / 2, 0, 0),
  3: new Euler(0, 0, Math.PI / 2),
  4: new Euler(0, 0, -Math.PI / 2),
  5: new Euler(Math.PI / 2, 0, 0),
  6: new Euler(Math.PI, 0, 0),
};

// Opposite-face pairs (each sums to 7) — used by tests and documentation of the table.
export const OPPOSITE_FACES: ReadonlyArray<readonly [DieFace, DieFace]> = [
  [1, 6],
  [2, 5],
  [3, 4],
];
