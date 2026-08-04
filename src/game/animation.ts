// src/game/animation.ts — DOM/CSS animation contracts for the 2D board (Phase 3.1).
// Pure constants/types shared by PlayView, BoardScene, and moveHighlight. No React imports.

// Per-square hop duration. Exported for PlayView watchdog budget.
export const HOP_S = 0.18;

// Dice roll duration. Exported for PlayView watchdog budget.
export const DICE_S = 0.8;

// How long the board shows the destination BEFORE the token starts hopping.
export const PREVIEW_S = 0.55;

export interface MoveSpec {
  id: number;
  from: number;
  afterRoll: number;
  to: number;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function buildMovePath(from: number, afterRoll: number, to: number): number[] {
  const path: number[] = [];
  const d1 = afterRoll >= from ? 1 : -1;
  for (let s = from; s !== afterRoll; s += d1) path.push(s + d1);
  const d2 = to >= afterRoll ? 1 : -1;
  for (let s = afterRoll; s !== to; s += d2) path.push(s + d2);
  return path;
}

export function clampSquare(square: number, boardLength: number): number {
  return Math.min(Math.max(square, 0), boardLength);
}

export function buildDisplayMovePath(move: MoveSpec, boardLength: number): number[] {
  const path = buildMovePath(move.from, move.afterRoll, move.to).map((s) => clampSquare(s, boardLength));
  // Preserve the travelled order but remove adjacent duplicates created by overshoot clamping.
  return path.filter((s, i) => i === 0 || s !== path[i - 1]);
}
