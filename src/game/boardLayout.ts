// src/game/boardLayout.ts — PURE index→world-coordinate mapping for the 3D board (D-03).
// PHASE 3 CONTRACT: no React/DOM imports, deterministic, side-effect free → unit-testable.
// The engine's `position` (0..boardLength) maps onto a snake (boustrophedon) path so a
// 20–30-square board fits a fixed isometric camera frame (RESEARCH Pattern 2).
import { Vector3 } from 'three';

// Squares per row before the snake turns, and world-unit spacing between tiles.
// (RESEARCH Pattern 2 — tunable; drei <Bounds fit> auto-frames whatever these produce.)
export const COLS = 6;
export const GAP = 1.15;

// Row/column of a square index on the snake path. Even rows run left→right,
// odd rows run right→left, so the path reverses direction every COLS squares.
export interface RowCol {
  row: number;
  col: number; // logical column BEFORE the snake flip (0 = row start)
  x: number; // world-space column after the snake flip
}

export function rowColOf(index: number): RowCol {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  // even rows left→right, odd rows right→left (boustrophedon)
  const x = row % 2 === 0 ? col : COLS - 1 - col;
  return { row, col, x };
}

// Pure: square index (0 = start, boardLength = finish) → world position on the board.
// y is always 0 (tokens hop above this plane); z advances one row per COLS squares.
export function squarePosition(index: number): Vector3 {
  const { row, x } = rowColOf(index);
  return new Vector3(x * GAP, 0, row * GAP);
}
