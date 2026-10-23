// Die face table (D-20). three is imported here only — test files are never bundled.
import { Euler, Vector3 } from 'three';
import {
  FACE_NORMAL,
  FACE_UP_EULER,
  PIP_GRID,
  diceSize,
  isDieFace,
  pipPosition,
  type DieFace,
} from './diceFaces';

const FACES: DieFace[] = [1, 2, 3, 4, 5, 6];

describe('FACE_UP_EULER', () => {
  it.each(FACES)('rotates face %i outward normal to +Y', (f) => {
    const v = new Vector3(...FACE_NORMAL[f]).applyEuler(new Euler(...FACE_UP_EULER[f]));
    expect(v.x).toBeCloseTo(0, 9);
    expect(v.y).toBeCloseTo(1, 9);
    expect(v.z).toBeCloseTo(0, 9);
  });

  it('follows the pip layout 1:+Y 6:-Y 2:+Z 5:-Z 3:+X 4:-X', () => {
    expect(FACE_NORMAL).toEqual({
      1: [0, 1, 0],
      6: [0, -1, 0],
      2: [0, 0, 1],
      5: [0, 0, -1],
      3: [1, 0, 0],
      4: [-1, 0, 0],
    });
  });

  it('opposite faces sum to 7 (their normals are opposite)', () => {
    for (const f of FACES) {
      const o = (7 - f) as DieFace;
      const a = FACE_NORMAL[f];
      const b = FACE_NORMAL[o];
      expect(a.map((c, i) => c + b[i])).toEqual([0, 0, 0]);
    }
  });
});

describe('PIP_GRID / pipPosition', () => {
  it.each(FACES)('face %i has %i pips', (f) => {
    expect(PIP_GRID[f]).toHaveLength(f);
  });

  it.each(FACES)('every pip of face %i sits on that face plane', (f) => {
    const half = 0.5;
    const n = FACE_NORMAL[f];
    for (const [u, v] of PIP_GRID[f]) {
      const p = pipPosition(f, u, v, half, 0.22);
      const dot = p[0] * n[0] + p[1] * n[1] + p[2] * n[2];
      expect(dot).toBeCloseTo(half, 9);
    }
  });

  it('scales the in-face offsets by spacing', () => {
    expect(pipPosition(1, 1, -1, 0.45, 0.22)).toEqual([0.22, 0.45, -0.22]);
    expect(pipPosition(3, 1, 0, 0.5, 0.3)).toEqual([0.5, 0.3, 0]);
  });
});

describe('diceSize / isDieFace', () => {
  it('maps board length 16/20/24 to 0.9/1.0/1.1', () => {
    expect(diceSize(16)).toBe(0.9);
    expect(diceSize(20)).toBe(1.0);
    expect(diceSize(24)).toBe(1.1);
    expect(diceSize(12)).toBe(1.0);
  });

  it('accepts integers 1..6 only', () => {
    for (const f of FACES) expect(isDieFace(f)).toBe(true);
    for (const x of [0, 7, 1.5, -1, NaN, Infinity]) expect(isDieFace(x)).toBe(false);
  });
});
