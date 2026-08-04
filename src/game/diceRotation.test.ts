// src/game/diceRotation.test.ts — Phase 3.1 animation timing contracts.
import { describe, it, expect } from 'vitest';
import { DICE_S, HOP_S, PREVIEW_S, buildMovePath, buildDisplayMovePath } from './animation';

describe('2D animation contracts', () => {
  it('keeps the dice, preview, and hop timings positive for the watchdog budget', () => {
    expect(DICE_S).toBeGreaterThan(0);
    expect(PREVIEW_S).toBeGreaterThan(0);
    expect(HOP_S).toBeGreaterThan(0);
  });

  it('builds a two-stage movement path: dice destination then event bounce', () => {
    expect(buildMovePath(0, 3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(buildMovePath(5, 8, 6)).toEqual([6, 7, 8, 7, 6]);
  });

  it('clamps display path for overshoot wins without duplicate finish squares', () => {
    expect(buildDisplayMovePath({ id: 1, from: 18, afterRoll: 22, to: 22 }, 20)).toEqual([19, 20]);
  });
});
