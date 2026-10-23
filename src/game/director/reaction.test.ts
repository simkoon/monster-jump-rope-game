// src/game/director/reaction.test.ts — pure beat → expression / act mapping and blink timing
// (07-04 Task 1, D-07, D-08, D-10, D-14, CHAR-02, UI-SPEC C3 / C4).
import { describe, it, expect } from 'vitest';
import { FACE_KEYS, EXPRESSIONS } from '../layout/chibiDims';
import { ACT_FACE, BLINK_S, blinkClosed, faceKeyFor, reactionFor } from './reaction';
import type { Beat } from './timeline';

const dice = (pid: string, id = 1): Beat => ({ kind: 'dice', pid, face: 3, ms: 1000, id });
const preview = (pid: string, id = 2): Beat => ({ kind: 'preview', pid, path: [1, 2, 3], ms: 500, id });
const hop = (pid: string, id = 3): Beat => ({ kind: 'hop', pid, path: [1, 2, 3], by: 'dice', ms: 750, id });
const stars = (pid: string, id = 4): Beat => ({ kind: 'stars', pid, stars: 2, ms: 900, id });
const bonus = (pid: string, id = 5): Beat => ({ kind: 'startBonus', pid, stars: 1, ms: 800, id });
const miss = (pid: string, id = 6): Beat => ({ kind: 'miss', pid, ms: 700, id });
const event = (pid: string, eff: 'forward' | 'backward' | 'extra', suppressed = false, id = 7): Beat => ({
  kind: 'event',
  pid,
  eff,
  steps: 2,
  suppressed,
  name: '',
  label: '',
  ms: 1000,
  id,
});
const win = (winners: string[], id = 8): Beat => ({ kind: 'win', winners, animals: [], ms: 1500, id });
const finalRound = (id = 9): Beat => ({ kind: 'finalRound', ms: 1500, id });

describe('reactionFor — beat → expression and act (UI-SPEC C4 table)', () => {
  it('no beat: excited at rest on your turn, idle otherwise', () => {
    expect(reactionFor('a', null, true)).toEqual({ expression: 'excited', act: 'rest', beatId: null, ms: 0 });
    expect(reactionFor('a', null, false)).toEqual({ expression: 'idle', act: 'rest', beatId: null, ms: 0 });
  });

  it('own stars → joy / success, own startBonus → joy / bonus, own miss → sad / slump', () => {
    expect(reactionFor('a', stars('a'), true)).toEqual({ expression: 'joy', act: 'success', beatId: 4, ms: 900 });
    expect(reactionFor('a', bonus('a'), true)).toEqual({ expression: 'joy', act: 'bonus', beatId: 5, ms: 800 });
    expect(reactionFor('a', miss('a'), true)).toEqual({ expression: 'sad', act: 'slump', beatId: 6, ms: 700 });
  });

  it('own hop → excited / hop with the beat id; own dice / preview → excited at rest (no beat id)', () => {
    expect(reactionFor('a', hop('a'), true)).toEqual({ expression: 'excited', act: 'hop', beatId: 3, ms: 750 });
    // Dice and PathPreview complete those beats; the character only waits excitedly.
    for (const b of [dice('a'), preview('a')]) {
      expect(reactionFor('a', b, true)).toEqual({ expression: 'excited', act: 'rest', beatId: null, ms: 0 });
      expect(reactionFor('a', b, false).expression).toBe('excited');
    }
  });

  it('own event: extra → joy / bonus, backward → sad / slump, forward and limited extra → surprised', () => {
    expect(reactionFor('a', event('a', 'extra'), true)).toMatchObject({ expression: 'joy', act: 'bonus' });
    expect(reactionFor('a', event('a', 'backward'), true)).toMatchObject({ expression: 'sad', act: 'slump' });
    expect(reactionFor('a', event('a', 'forward'), true)).toMatchObject({ expression: 'surprised', act: 'surprise' });
    expect(reactionFor('a', event('a', 'extra', true), true)).toMatchObject({
      expression: 'surprised',
      act: 'surprise',
    });
  });

  it('every beat-driven reaction carries that beat id and length', () => {
    for (const b of [hop('a'), stars('a'), bonus('a'), miss('a'), event('a', 'forward'), win(['a'])]) {
      const r = reactionFor('a', b, true);
      expect(r.beatId).toBe(b.id);
      expect(r.ms).toBe(b.ms);
    }
  });

  it('win: every co-winner cheers with the winner face; a non-winner stays idle even on its turn', () => {
    const w = win(['a', 'b']);
    expect(reactionFor('a', w, false)).toEqual({ expression: 'winner', act: 'cheer', beatId: 8, ms: 1500 });
    expect(reactionFor('b', w, true)).toEqual({ expression: 'winner', act: 'cheer', beatId: 8, ms: 1500 });
    expect(reactionFor('c', w, true)).toEqual({ expression: 'idle', act: 'rest', beatId: null, ms: 0 });
    expect(reactionFor('c', w, false)).toEqual({ expression: 'idle', act: 'rest', beatId: null, ms: 0 });
  });

  it("finalRound and another pid's beat → the situation reaction", () => {
    for (const b of [finalRound(), stars('b'), miss('b'), hop('b'), event('b', 'backward'), dice('b')]) {
      expect(reactionFor('a', b, true)).toEqual({ expression: 'excited', act: 'rest', beatId: null, ms: 0 });
      expect(reactionFor('a', b, false)).toEqual({ expression: 'idle', act: 'rest', beatId: null, ms: 0 });
    }
  });
});

describe('blinkClosed — deterministic 120 ms blink every 3.0–4.4 s (UI-SPEC C3)', () => {
  const periodOf = (seed: number) => 3.0 + (seed % 5) * 0.35;

  it('closes for 120 ± 1 ms per period, with the period in [3.0, 4.4] s', () => {
    for (let seed = 0; seed < 10; seed++) {
      const period = periodOf(seed);
      expect(period).toBeGreaterThanOrEqual(3.0);
      expect(period).toBeLessThanOrEqual(4.4 + 1e-9);
      let closedMs = 0;
      const steps = Math.round(period * 1000);
      for (let i = 0; i < steps; i++) if (blinkClosed(10 + i / 1000, seed)) closedMs++;
      expect(Math.abs(closedMs - BLINK_S * 1000)).toBeLessThanOrEqual(1);
    }
  });

  it('seeds 0 and 1 blink at different times', () => {
    const closedAt = (seed: number) => {
      const out: number[] = [];
      for (let i = 0; i < 9000; i++) if (blinkClosed(i / 1000, seed)) out.push(i);
      return out;
    };
    const a = new Set(closedAt(0));
    const b = closedAt(1);
    expect(b.length).toBeGreaterThan(0);
    expect(b.filter((t) => a.has(t)).length).toBeLessThan(b.length);
    expect(blinkClosed(0, 0)).toBe(true);
    expect(blinkClosed(0, 1)).toBe(false);
  });
});

describe('faceKeyFor and ACT_FACE', () => {
  it('idle / excited / sad take their blink key while blinking; joy, surprised and winner ignore it', () => {
    expect(faceKeyFor('idle', true)).toBe('idleBlink');
    expect(faceKeyFor('excited', true)).toBe('excitedBlink');
    expect(faceKeyFor('sad', true)).toBe('sadBlink');
    for (const e of ['joy', 'surprised', 'winner'] as const) expect(faceKeyFor(e, true)).toBe(e);
    for (const e of EXPRESSIONS) {
      expect(faceKeyFor(e, false)).toBe(e);
      expect(FACE_KEYS).toContain(faceKeyFor(e, true));
      expect(FACE_KEYS).toContain(faceKeyFor(e, false));
    }
  });

  it('maps each act to its face', () => {
    expect(ACT_FACE).toEqual({
      rest: 'idle',
      hop: 'excited',
      success: 'joy',
      bonus: 'joy',
      surprise: 'surprised',
      slump: 'sad',
      cheer: 'winner',
    });
  });
});
