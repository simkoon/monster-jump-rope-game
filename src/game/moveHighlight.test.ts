// src/game/moveHighlight.test.ts — pure move-destination highlight model (Task 1, TDD).
// Same style as boardLayout.test.ts: direct pure-function calls, no R3F, no DOM.
import { describe, it, expect } from 'vitest';
import { planHighlight, MAX_STEP_MARKERS } from './moveHighlight';
import type { MoveSpec } from './animation';

const mv = (from: number, afterRoll: number, to: number): MoveSpec => ({
  id: 1,
  from,
  afterRoll,
  to,
});

describe('planHighlight — dice destination + step dots + event final marker', () => {
  it('marks the dice destination and the in-between squares (roll 4 from 0)', () => {
    const plan = planHighlight(mv(0, 4, 4), 20);
    expect(plan.dest).toBe(4);
    expect(plan.steps).toEqual([1, 2, 3]);
    expect(plan.final).toBeNull();
    expect(plan.finalDir).toBeNull();
    // dots + destination === the die face, so the roll is countable on the board.
    expect(plan.steps.length + 1).toBe(4);
  });

  it('has no step dots for a one-square roll (roll 1 from 5)', () => {
    const plan = planHighlight(mv(5, 6, 6), 20);
    expect(plan.dest).toBe(6);
    expect(plan.steps).toEqual([]);
    expect(plan.final).toBeNull();
  });

  it('flags a FORWARD event final square distinctly from the dice destination', () => {
    const plan = planHighlight(mv(3, 6, 9), 20);
    expect(plan.dest).toBe(6);
    expect(plan.steps).toEqual([4, 5]);
    expect(plan.final).toBe(9);
    expect(plan.finalDir).toBe('forward');
  });

  it('flags a BACKWARD event final square', () => {
    const plan = planHighlight(mv(3, 6, 2), 20);
    expect(plan.dest).toBe(6);
    expect(plan.steps).toEqual([4, 5]);
    expect(plan.final).toBe(2);
    expect(plan.finalDir).toBe('backward');
  });

  it('clamps an overshoot win to the finish square — never off-board (D-03)', () => {
    const boardLength = 20;
    const plan = planHighlight(mv(18, 22, 22), boardLength);
    expect(plan.dest).toBe(boardLength);
    expect(plan.steps).toEqual([19]);
    expect(plan.final).toBeNull();
    for (const i of [...plan.steps, plan.dest]) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThanOrEqual(boardLength);
    }
  });

  it('clamps a forward-event win while keeping the forward direction', () => {
    const boardLength = 20;
    const plan = planHighlight(mv(15, 18, 24), boardLength);
    expect(plan.dest).toBe(18);
    expect(plan.final).toBe(boardLength); // clamped onto the finish tile
    expect(plan.finalDir).toBe('forward'); // direction read from the pre-clamp values
  });

  it('returns an empty plan for a zero-length move (defensive)', () => {
    const plan = planHighlight(mv(7, 7, 7), 20);
    expect(plan.dest).toBe(7);
    expect(plan.steps).toEqual([]);
    expect(plan.final).toBeNull();
    expect(plan.finalDir).toBeNull();
  });

  it('never returns more step markers than the instancedMesh capacity', () => {
    const boardLength = 30;
    for (let from = 0; from <= boardLength; from++) {
      for (let roll = 1; roll <= 6; roll++) {
        for (const to of [from + roll, 0, boardLength, from + roll + 9, from - 5]) {
          const plan = planHighlight(mv(from, from + roll, to), boardLength);
          expect(plan.steps.length).toBeLessThanOrEqual(MAX_STEP_MARKERS);
          for (const i of plan.steps) {
            expect(i).toBeGreaterThanOrEqual(0);
            expect(i).toBeLessThanOrEqual(boardLength);
          }
          if (plan.final != null) {
            expect(plan.final).toBeGreaterThanOrEqual(0);
            expect(plan.final).toBeLessThanOrEqual(boardLength);
          }
        }
      }
    }
  });
});
