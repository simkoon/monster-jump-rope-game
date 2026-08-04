// src/game/boardLayout.test.ts — pure snake-path layout for the 2D board (Phase 3.1).
import { describe, it, expect } from 'vitest';
import { squarePosition, rowColOf, COLS, GAP, rowCountFor, directionOf } from './boardLayout';
import { boardLengthFor } from '../engine/setup';

describe('boardLayout — snake path index→2D grid mapping', () => {
  const boardLength = boardLengthFor('normal');

  it('maps every square 0..boardLength to a distinct coordinate', () => {
    const seen = new Set<string>();
    for (let i = 0; i <= boardLength; i++) {
      const p = squarePosition(i);
      seen.add(`${p.x.toFixed(4)},${p.y.toFixed(4)}`);
    }
    expect(seen.size).toBe(boardLength + 1);
  });

  it('advances y by GAP once per COLS squares (one visible row per COLS)', () => {
    expect(squarePosition(0).y).toBeCloseTo(0);
    expect(squarePosition(COLS - 1).y).toBeCloseTo(0);
    expect(squarePosition(COLS).y).toBeCloseTo(GAP);
    expect(squarePosition(2 * COLS).y).toBeCloseTo(2 * GAP);
  });

  it('runs an even row left→right and reverses the next row', () => {
    for (let i = 1; i < COLS; i++) expect(squarePosition(i).x).toBeGreaterThan(squarePosition(i - 1).x);
    for (let i = COLS + 1; i < 2 * COLS; i++) expect(squarePosition(i).x).toBeLessThan(squarePosition(i - 1).x);
  });

  it('rowColOf reports the row and flipped column consistently', () => {
    expect(rowColOf(0)).toMatchObject({ row: 0, x: 0 });
    expect(rowColOf(COLS)).toMatchObject({ row: 1, x: COLS - 1 });
  });

  it('reports row count and per-square direction markers for readability', () => {
    expect(rowCountFor(30)).toBe(6);
    expect(directionOf(0, 30)).toBe('right');
    expect(directionOf(COLS - 1, 30)).toBe('down');
    expect(directionOf(COLS, 30)).toBe('left');
    expect(directionOf(30, 30)).toBe('finish');
  });
});
