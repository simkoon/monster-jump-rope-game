// Next-turn selector (HUD-02). Same rule as engine advanceTurn; the engine is never edited.
import { makeGame, player } from '../engine/testkit';
import type { GameState } from '../engine/state';
import { isFinalRound, nextUp } from './turnOrder';

const three = () => [player('p1', 'P1', 'bear'), player('p2', 'P2', 'rabbit'), player('p3', 'P3', 'cat')];

function at(s: GameState, over: Partial<GameState>): GameState {
  return { ...s, ...over };
}

describe('nextUp — solo', () => {
  const g = makeGame({ participants: three(), rules: { rounds: 3 } });

  it('round 1, index 0, awaiting roll → next is p2', () => {
    const s = at(g, { currentIndex: 0, round: 1, phase: 'awaitingRoll' });
    expect(nextUp(s)).toEqual({ pid: 'p2', member: 'P2', sameAgain: false });
  });

  it('last index wraps to p1 in an earlier round', () => {
    const s = at(g, { currentIndex: 2, round: 1, phase: 'awaitingRoll' });
    expect(nextUp(s)).toEqual({ pid: 'p1', member: 'P1', sameAgain: false });
  });

  it('last index of the last round → null (this turn ends the game)', () => {
    const s = at(g, { currentIndex: 2, round: 3, phase: 'awaitingRoll' });
    expect(nextUp(s)).toBeNull();
  });

  it('extra turn granted → same participant again, even on the last turn of the game', () => {
    const turn = { isExtra: false, bonusPaid: false, extraGranted: true };
    const mid = at(g, { currentIndex: 1, round: 2, phase: 'turnResolved', turn });
    expect(nextUp(mid)).toEqual({ pid: 'p2', member: 'P2', sameAgain: true });
    const last = at(g, { currentIndex: 2, round: 3, phase: 'turnResolved', turn });
    expect(nextUp(last)).toEqual({ pid: 'p3', member: 'P3', sameAgain: true });
  });

  it('game over → null', () => {
    expect(nextUp(at(g, { phase: 'gameOver' }))).toBeNull();
  });
});

describe('nextUp — team', () => {
  it("next team's member is memberNames[memberTurnIndex]", () => {
    const g = makeGame({
      mode: 'team',
      participants: [
        player('t1', 'A', 'bear', { memberNames: ['a1', 'a2'] }),
        player('t2', 'B', 'rabbit', { memberNames: ['b1', 'b2', 'b3'], memberTurnIndex: 2 }),
      ],
    });
    const s = at(g, { currentIndex: 0, round: 1, phase: 'awaitingRoll' });
    expect(nextUp(s)).toEqual({ pid: 't2', member: 'b3', sameAgain: false });
  });

  it('a single participant rotates its own member (leaving team rotates)', () => {
    const base = makeGame({ mode: 'team', rules: { rounds: 3 } });
    const solo = player('t1', 'A', 'bear', { memberNames: ['a', 'b'], memberTurnIndex: 0 });
    const s: GameState = {
      ...base,
      config: { ...base.config, participants: [solo] },
      currentIndex: 0,
      round: 1,
      phase: 'awaitingRoll',
    };
    expect(nextUp(s)).toEqual({ pid: 't1', member: 'b', sameAgain: false });
  });
});

describe('isFinalRound', () => {
  it('is true iff round ≥ rules.rounds', () => {
    const g = makeGame({ rules: { rounds: 3 } });
    expect(isFinalRound(at(g, { round: 1 }))).toBe(false);
    expect(isFinalRound(at(g, { round: 2 }))).toBe(false);
    expect(isFinalRound(at(g, { round: 3 }))).toBe(true);
  });
});
