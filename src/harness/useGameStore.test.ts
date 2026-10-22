// src/harness/useGameStore.test.ts — the v2 engine ⇄ content/settings seam.
// contentOverride + useSettings.setState make every input deterministic; the snapshot test
// proves that mid-game edits never reach the running game (BOARD-04, DATA-07, T-05-16).
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, type GameSetup } from './useGameStore';
import { useStore } from '../store';
import { seedContent } from '../seed';
import { useSettings, DEFAULT_SETTINGS } from '../settings';
import { buildParticipants } from '../engine/setup';

function resetAll() {
  useGameStore.getState().reset();
  useSettings.setState({ ...DEFAULT_SETTINGS });
  const s = seedContent();
  useStore.setState({ version: s.version, categories: s.categories, missions: s.missions, events: s.events });
}

function setup(over: Partial<GameSetup> = {}): GameSetup {
  return {
    mode: 'solo',
    participants: buildParticipants('solo', 2, ['가', '나'], ['cat', 'fox']),
    rounds: 3,
    ...over,
  };
}

describe('useGameStore — v2 seam', () => {
  beforeEach(resetAll);

  it('startGame with seed content builds a board of the settings size and copies the rules', () => {
    useSettings.setState({ failRule: 'retryNew', startBonus: 2, boardSize: 16 });
    useGameStore.getState().startGame(setup({ rounds: 4 }));
    const g = useGameStore.getState().game!;
    expect(g).not.toBeNull();
    expect(g.phase).toBe('awaitingRoll');
    expect(g.board.length).toBe(16);
    expect(g.config.rules).toEqual({ rounds: 4, failRule: 'retryNew', startBonus: 2, boardSize: 16 });
    expect(g.config.participants.map((p) => p.animal)).toEqual(['cat', 'fox']);
    expect(useGameStore.getState().startBlockedReason).toBeNull();
  });

  it('clamps and rounds the rounds into [1, 20]; non-finite → 5', () => {
    const roundsFor = (r: number) => {
      useGameStore.getState().startGame(setup({ rounds: r }));
      return useGameStore.getState().game!.config.rules.rounds;
    };
    expect(roundsFor(0)).toBe(1);
    expect(roundsFor(99)).toBe(20);
    expect(roundsFor(3.4)).toBe(3);
    expect(roundsFor(Number.NaN)).toBe(5);
    expect(roundsFor(Number.POSITIVE_INFINITY)).toBe(5);
  });

  it('an empty mission override blocks the start with guidance', () => {
    useGameStore.getState().startGame(setup(), { missions: [], events: [] });
    expect(useGameStore.getState().game).toBeNull();
    expect(useGameStore.getState().startBlockedReason).toBe('미션이 없어요. 편집기에서 미션을 먼저 추가해 주세요.');
  });

  it('snapshots content and settings at start: later edits leave board, pool and rules untouched', () => {
    useGameStore.getState().startGame(setup());
    const g = useGameStore.getState().game!;
    const board = g.board;
    const pool = g.pool;
    const rules = g.config.rules;

    const st = useStore.getState();
    useStore.setState({ missions: st.missions.slice(1), events: st.events.slice(1) });
    useSettings.setState({ boardSize: 24, failRule: 'noStar', startBonus: 0 });

    useGameStore.getState().roll();
    const after = useGameStore.getState().game!;
    expect(after.board).toBe(board);
    expect(after.pool).toBe(pool);
    expect(after.config.rules).toEqual(rules);
    expect(after.board.length).toBe(20);
  });

  it('roll/judge/undo/next/endNow wrap the engine and replace game immutably', () => {
    useGameStore.getState().startGame(setup());
    const before = useGameStore.getState().game!;
    useGameStore.getState().roll();
    const rolled = useGameStore.getState().game!;
    expect(rolled).not.toBe(before);
    expect(rolled.phase).not.toBe('awaitingRoll');

    if (rolled.phase === 'awaitingJudgement') {
      useGameStore.getState().judge(true);
      const judged = useGameStore.getState().game!;
      expect(judged.phase).toBe('turnResolved');
      expect(judged.config.participants[0].stars).toBeGreaterThan(rolled.config.participants[0].stars);
      useGameStore.getState().undo();
      const undone = useGameStore.getState().game!;
      expect(undone.phase).toBe('awaitingJudgement');
      expect(undone.config.participants[0].stars).toBe(rolled.config.participants[0].stars);
      useGameStore.getState().judge(false);
    }
    // Resolve any retry, then leave the turn.
    while (useGameStore.getState().game!.phase === 'awaitingJudgement') useGameStore.getState().judge(false);
    expect(useGameStore.getState().game!.phase).toBe('turnResolved');
    useGameStore.getState().next();
    expect(useGameStore.getState().game!.phase).toBe('awaitingRoll');

    useGameStore.getState().endNow();
    const ended = useGameStore.getState().game!;
    expect(ended.phase).toBe('gameOver');
    expect(ended.endReason).toBe('manual');
  });

  it('every action is a no-op without a game', () => {
    const s = useGameStore.getState();
    s.roll();
    s.judge(true);
    s.undo();
    s.next();
    s.endNow();
    s.restart();
    expect(useGameStore.getState().game).toBeNull();
  });

  it('restart keeps participants, animals, mode and rounds, resets stars and re-reads settings', () => {
    useGameStore.getState().startGame(
      setup({
        mode: 'team',
        participants: buildParticipants('team', 2, ['A팀', 'B팀'], ['panda', 'chick'], [['a1', 'a2'], []]),
        rounds: 2,
      }),
    );
    // Earn some stars, then end.
    useGameStore.getState().roll();
    if (useGameStore.getState().game!.phase === 'awaitingJudgement') useGameStore.getState().judge(true);
    useGameStore.getState().endNow();
    const prev = useGameStore.getState().game!;

    useSettings.setState({ boardSize: 24 });
    useGameStore.getState().restart();
    const g = useGameStore.getState().game!;
    expect(g.phase).toBe('awaitingRoll');
    expect(g.config.mode).toBe('team');
    expect(g.config.rules.rounds).toBe(2);
    expect(g.board.length).toBe(24);
    expect(g.config.participants.map((p) => [p.id, p.name, p.animal])).toEqual(
      prev.config.participants.map((p) => [p.id, p.name, p.animal]),
    );
    expect(g.config.participants.every((p) => p.stars === 0)).toBe(true);
    expect(g.config.participants[0].memberNames).toEqual(['a1', 'a2']);
    expect(g.round).toBe(1);
  });

  it('reset clears the game and the blocked reason', () => {
    useGameStore.getState().startGame(setup(), { missions: [], events: [] });
    expect(useGameStore.getState().startBlockedReason).not.toBeNull();
    useGameStore.getState().startGame(setup());
    expect(useGameStore.getState().game).not.toBeNull();
    useGameStore.getState().reset();
    expect(useGameStore.getState().game).toBeNull();
    expect(useGameStore.getState().startBlockedReason).toBeNull();
  });
});
