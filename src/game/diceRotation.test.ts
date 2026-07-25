// src/game/diceRotation.test.ts — pure face→Euler table (Task 1, TDD).
import { describe, it, expect } from 'vitest';
import { FACE_UP_EULER, OPPOSITE_FACES, type DieFace } from './diceRotation';

const FACES: DieFace[] = [1, 2, 3, 4, 5, 6];

function eulerKey(f: DieFace): string {
  const e = FACE_UP_EULER[f];
  return `${e.x.toFixed(4)},${e.y.toFixed(4)},${e.z.toFixed(4)}`;
}

describe('diceRotation — FACE_UP_EULER table', () => {
  it('has all six faces present', () => {
    for (const f of FACES) {
      expect(FACE_UP_EULER[f]).toBeDefined();
    }
  });

  it('gives a pairwise-distinct rotation for every face', () => {
    const keys = new Set(FACES.map(eulerKey));
    expect(keys.size).toBe(6);
  });

  it('encodes the opposite-face pairing (1↔6, 2↔5, 3↔4), each summing to 7', () => {
    for (const [a, b] of OPPOSITE_FACES) {
      expect(a + b).toBe(7);
      // Opposite faces must map to different up-rotations (they are never both up).
      expect(eulerKey(a)).not.toBe(eulerKey(b));
    }
  });

  it('covers exactly faces 1..6 with no extras', () => {
    const keys = Object.keys(FACE_UP_EULER).map(Number).sort((x, y) => x - y);
    expect(keys).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
