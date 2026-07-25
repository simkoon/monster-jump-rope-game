// src/harness/useGameStore.test.ts — the engine⇄content bridge (Task 1, TDD).
// Uses contentOverride so the empty/non-empty paths are deterministic without seed content.
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './useGameStore';
import type { GameConfig } from '../engine/types';
import { buildParticipants, boardLengthFor, DEFAULT_TIME_LIMIT_MS } from '../engine/setup';
import type { Mission } from '../schema';

const mission = (id: string): Mission => ({ id, name: `미션-${id}`, desc: '', diff: 'easy', cats: [] });

function makeConfig(): GameConfig {
  return {
    mode: 'solo',
    participants: buildParticipants('solo', 2, ['가', '나'], ['boy', 'girl']),
    boardLength: boardLengthFor('short'),
    timeLimitMs: DEFAULT_TIME_LIMIT_MS,
  };
}

describe('useGameStore — engine/content bridge', () => {
  beforeEach(() => useGameStore.getState().reset());

  it('startGame with a non-empty mission library enters phase awaitingDraw', () => {
    useGameStore.getState().startGame(makeConfig(), { missions: [mission('a')], events: [] });
    const g = useGameStore.getState().game;
    expect(g).not.toBeNull();
    expect(g!.phase).toBe('awaitingDraw');
    expect(g!.config.participants.length).toBe(2);
  });

  it('startGame with an EMPTY mission library leaves game null and surfaces guidance (MISSION-07)', () => {
    useGameStore.getState().startGame(makeConfig(), { missions: [], events: [] });
    expect(useGameStore.getState().game).toBeNull();
    expect(useGameStore.getState().startBlockedReason).toBeTruthy();
  });

  it('reset() sets game back to null (LOOP-10 foundation)', () => {
    useGameStore.getState().startGame(makeConfig(), { missions: [mission('a')], events: [] });
    expect(useGameStore.getState().game).not.toBeNull();
    useGameStore.getState().reset();
    expect(useGameStore.getState().game).toBeNull();
  });

  it('draw/judge/roll wrap engine transitions and replace game immutably', () => {
    useGameStore.getState().startGame(makeConfig(), { missions: [mission('a')], events: [] });
    const before = useGameStore.getState().game!;
    useGameStore.getState().draw();
    const afterDraw = useGameStore.getState().game!;
    expect(afterDraw).not.toBe(before); // new object, not mutated in place
    expect(afterDraw.phase).toBe('awaitingJudgement');
    useGameStore.getState().judge(true);
    expect(useGameStore.getState().game!.phase).toBe('awaitingRoll');
    useGameStore.getState().roll();
    expect(['turnResolved', 'gameOver']).toContain(useGameStore.getState().game!.phase);
  });

  it('setRemainingMs stores the DOM-owned clock value without touching the engine', () => {
    useGameStore.getState().setRemainingMs(1234);
    expect(useGameStore.getState().remainingMs).toBe(1234);
  });
});
