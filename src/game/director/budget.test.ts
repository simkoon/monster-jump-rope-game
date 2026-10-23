// src/game/director/budget.test.ts — the 2.5 s judge → next budget (Phase 8 D-02, FX-03).
// Pure: real engine transitions (testkit boards + judge) → buildTimeline → budgetMs. A judged
// success yields exactly one stars beat, so "✅ tap → 다음 ➡️ can be pressed" is that beat's length
// (the 400 ms judge-tap lock ends inside it). The skip lock (250 ms) only exists after a skip tap,
// which always lands before the beat would have ended; STARS_MS[3] + SKIP_LOCK_MS still fits.
// The game-ending path (win beat) is not a judge → next transition and is out of this budget.
import { describe, it, expect } from 'vitest';
import { judge, rollDice } from '../../engine/game';
import { boardWith, dice, makeGame, questTile } from '../../engine/testkit';
import type { GameState } from '../../engine/state';
import { INPUT_LOCK_MS, SKIP_LOCK_MS } from '../useInputLock';
import { BEAT_MS, budgetMs, buildTimeline, STARS_MS } from './timeline';
import { timelineCtx } from './useDirector';

const BUDGET_MS = 2500;
const MISS_BUDGET_MS = 1000;
const DIFF = { 1: 'easy', 2: 'normal', 3: 'hard' } as const;

// P1 rolls a 3 onto the quest of the given tier (tile 3).
function atQuest(stars: 1 | 2 | 3, failRule: 'retrySame' | 'noStar' = 'retrySame'): GameState {
  const g = makeGame({ board: boardWith(20, { 3: questTile(DIFF[stars]) }), rules: { failRule } });
  return rollDice(g, dice(3));
}

const beatsOf = (g: GameState, reduced: boolean) =>
  buildTimeline(g.log.events, { ...timelineCtx(g), reducedMotion: reduced });

describe('FX-03 / D-02: judged success → 다음 ➡️ ≤ 2500 ms', () => {
  const cases = ([1, 2, 3] as const).flatMap((s) => [[s, false] as const, [s, true] as const]);

  it.each(cases)('⭐%i reduced=%s, attempt 1 and 2', (stars, reduced) => {
    for (const attempt of [1, 2]) {
      let g = atQuest(stars);
      if (attempt === 2) g = judge(g, false, dice(1)); // retrySame → attempt 2 of the same quest
      expect(g.card?.attempt).toBe(attempt);
      const done = judge(g, true, dice(1));
      const beats = beatsOf(done, reduced);
      expect(beats.map((b) => b.kind)).toEqual(['stars']); // nothing else plays in this transition
      expect(beats[0]).toMatchObject({ kind: 'stars', stars });
      // The judge tap's own 400 ms lock ends inside the beat; whichever is longer gates 다음 ➡️.
      expect(Math.max(budgetMs(beats), INPUT_LOCK_MS)).toBeLessThanOrEqual(BUDGET_MS);
    }
  });

  it('⭐3 is the longest tier (2200 ms) and a skip lock after it still fits in 2500 ms', () => {
    expect(Math.max(...Object.values(STARS_MS))).toBe(STARS_MS[3]);
    expect(STARS_MS[3]).toBe(2200);
    expect(SKIP_LOCK_MS).toBe(250);
    expect(STARS_MS[3] + SKIP_LOCK_MS).toBeLessThanOrEqual(BUDGET_MS);
  });
});

describe('FX-03 / D-09: judged ❌ → next screen ≤ 1000 ms', () => {
  it.each([false, true])('retry and final misses map to one miss beat (reduced=%s)', (reduced) => {
    // ❌ on attempt 1 with retrySame → a retry card follows.
    const retry = judge(atQuest(2), false, dice(1));
    const retryBeats = beatsOf(retry, reduced);
    expect(retryBeats.map((b) => b.kind)).toEqual(['miss']);
    expect(retryBeats[0]).toMatchObject({ kind: 'miss', retry: true });
    expect(Math.max(budgetMs(retryBeats), INPUT_LOCK_MS)).toBeLessThanOrEqual(MISS_BUDGET_MS);

    // ❌ on attempt 2 → the turn resolves without stars.
    const final = judge(retry, false, dice(1));
    const finalBeats = beatsOf(final, reduced);
    expect(finalBeats.map((b) => b.kind)).toEqual(['miss']);
    expect(finalBeats[0]).toMatchObject({ kind: 'miss', retry: false });
    expect(budgetMs(finalBeats)).toBeLessThanOrEqual(MISS_BUDGET_MS);

    // noStar: the first ❌ is already final.
    const noStar = judge(atQuest(1, 'noStar'), false, dice(1));
    const noStarBeats = beatsOf(noStar, reduced);
    expect(noStarBeats.map((b) => b.kind)).toEqual(['miss']);
    expect(budgetMs(noStarBeats)).toBe(BEAT_MS.miss);
  });
});
