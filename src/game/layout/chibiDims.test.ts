// src/game/layout/chibiDims.test.ts — the chibi cuteness rubric as numbers (D-03, UI-SPEC C1/C3/C6).
import { describe, it, expect } from 'vitest';
import {
  ARM_LEN,
  BODY_WIDTH,
  EXPRESSIONS,
  EYE_X,
  EYE_Y,
  FACE_KEYS,
  GROUND_DISC_R,
  GROUND_RIM_R,
  HEAD_HEIGHT_RATIO,
  HEAD_TILT,
  HEAD_TILT_MAX,
  HEAD_TILT_MIN,
  HEAD_TOP,
  HEAD_WIDTH,
  HIGHLIGHT_R_MIN,
  HULL_TORSO,
  HULL_TORSO_MAX,
  LINE_R_MIN,
} from './chibiDims';

describe('chibiDims rubric (D-03)', () => {
  it('the head is at least 1.3× as wide as the body', () => {
    expect(HEAD_WIDTH / BODY_WIDTH).toBeGreaterThanOrEqual(1.3);
    expect(HEAD_WIDTH).toBeCloseTo(0.583, 3);
    expect(BODY_WIDTH).toBeCloseTo(0.38, 12);
  });

  it('the head takes 55–60 % of the height (ears not counted)', () => {
    expect(HEAD_HEIGHT_RATIO).toBeGreaterThanOrEqual(0.55);
    expect(HEAD_HEIGHT_RATIO).toBeLessThanOrEqual(0.6);
    expect(HEAD_TOP).toBeCloseTo(0.874, 3);
  });

  it('eyes sit below the head center and are set wide', () => {
    expect(EYE_Y).toBeLessThan(0);
    expect(2 * EYE_X).toBeGreaterThanOrEqual(0.33 * HEAD_WIDTH);
  });

  it('the global head tilt stays inside the allowed range', () => {
    expect(HEAD_TILT).toBe(0.6);
    expect(HEAD_TILT).toBeGreaterThanOrEqual(HEAD_TILT_MIN);
    expect(HEAD_TILT).toBeLessThanOrEqual(HEAD_TILT_MAX);
  });

  it('face lines and highlights stay thick enough for a phone (UI-SPEC C3)', () => {
    expect(LINE_R_MIN).toBeGreaterThanOrEqual(0.012);
    expect(HIGHLIGHT_R_MIN).toBeGreaterThanOrEqual(0.012);
  });

  it('limbs stay short', () => {
    expect(ARM_LEN).toBeLessThanOrEqual(0.08);
  });

  it('the torso hull is off or at most 1.03', () => {
    expect(HULL_TORSO === null || HULL_TORSO <= HULL_TORSO_MAX).toBe(true);
    expect(HULL_TORSO_MAX).toBeLessThanOrEqual(1.03);
  });

  it('the ground disc rim sits outside the disc and inside the 0.30 turn ring (UI-SPEC C6)', () => {
    expect(GROUND_RIM_R).toBeGreaterThan(GROUND_DISC_R);
    expect(GROUND_RIM_R).toBeLessThan(0.3);
  });
});

describe('face vocabulary (UI-SPEC C3)', () => {
  it('has the 9 face keys in order', () => {
    expect(FACE_KEYS).toEqual([
      'idle',
      'idleBlink',
      'excited',
      'excitedBlink',
      'joy',
      'sad',
      'sadBlink',
      'surprised',
      'winner',
    ]);
  });

  it('has the 6 expressions, each one a face key', () => {
    expect(EXPRESSIONS).toEqual(['idle', 'excited', 'joy', 'sad', 'surprised', 'winner']);
    for (const e of EXPRESSIONS) expect(FACE_KEYS).toContain(e);
  });
});
