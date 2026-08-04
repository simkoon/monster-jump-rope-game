// src/game/boardLayout.ts — PURE index→2D snake-grid mapping for the DOM/SVG board (Phase 3.1).
// No React/DOM/Three imports: deterministic, side-effect free → unit-testable.
// The engine's position (0..boardLength) maps onto a boustrophedon path so a 20–30 square
// board fits a tablet/phone screen while remaining countable.

export const COLS = 6;
export const GAP = 1;

export interface RowCol {
  row: number;
  col: number; // logical column BEFORE the snake flip (0 = row start)
  x: number; // visual column after the snake flip
}

export interface BoardPoint {
  x: number;
  y: number;
}

export function rowColOf(index: number): RowCol {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  const x = row % 2 === 0 ? col : COLS - 1 - col;
  return { row, col, x };
}

export function squarePosition(index: number): BoardPoint {
  const { row, x } = rowColOf(index);
  return { x: x * GAP, y: row * GAP };
}

export function rowCountFor(boardLength: number): number {
  return Math.floor(boardLength / COLS) + 1;
}

export function directionOf(index: number, boardLength: number): 'right' | 'left' | 'down' | 'finish' {
  if (index >= boardLength) return 'finish';
  const here = rowColOf(index);
  const next = rowColOf(index + 1);
  if (next.row > here.row) return 'down';
  return next.x > here.x ? 'right' : 'left';
}
