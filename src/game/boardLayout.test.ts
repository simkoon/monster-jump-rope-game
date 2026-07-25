// src/game/boardLayout.test.ts — pure snake-path layout (Task 1, TDD).
import { describe, it, expect } from 'vitest';
import { squarePosition, rowColOf, COLS, GAP } from './boardLayout';
import { boardLengthFor } from '../engine/setup';

describe('boardLayout — snake path index→world mapping', () => {
  const boardLength = boardLengthFor('normal'); // 30 → indices 0..30

  it('maps every square 0..boardLength to a distinct coordinate', () => {
    const seen = new Set<string>();
    for (let i = 0; i <= boardLength; i++) {
      const p = squarePosition(i);
      seen.add(`${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`);
    }
    expect(seen.size).toBe(boardLength + 1);
  });

  it('keeps the board flat (y === 0) so tokens hop above the plane', () => {
    for (let i = 0; i <= boardLength; i++) {
      expect(squarePosition(i).y).toBe(0);
    }
  });

  it('advances z by GAP once per COLS squares (one row per COLS)', () => {
    expect(squarePosition(0).z).toBeCloseTo(0);
    expect(squarePosition(COLS - 1).z).toBeCloseTo(0); // still row 0
    expect(squarePosition(COLS).z).toBeCloseTo(GAP); // row 1 begins
    expect(squarePosition(2 * COLS).z).toBeCloseTo(2 * GAP); // row 2
  });

  it('runs an even row left→right (x strictly increasing)', () => {
    for (let i = 1; i < COLS; i++) {
      expect(squarePosition(i).x).toBeGreaterThan(squarePosition(i - 1).x);
    }
  });

  it('reverses direction on the next (odd) row — snake turn', () => {
    // Row 1 spans indices COLS..2*COLS-1; x must strictly DECREASE across it.
    for (let i = COLS + 1; i < 2 * COLS; i++) {
      expect(squarePosition(i).x).toBeLessThan(squarePosition(i - 1).x);
    }
  });

  it('rowColOf reports the row and flipped column consistently', () => {
    const start = rowColOf(0);
    expect(start.row).toBe(0);
    expect(start.x).toBe(0);
    // First square of row 1 (odd) sits at the far end (x = COLS-1), matching the snake turn.
    const rowOneStart = rowColOf(COLS);
    expect(rowOneStart.row).toBe(1);
    expect(rowOneStart.x).toBe(COLS - 1);
  });
});
