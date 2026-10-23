// src/game/director/useDirector.test.tsx — synchronous engine-log subscription
// (06-02 Task 3, D-01, D-24, D-25, HUD-03, ROUND-02).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { advanceTurn, endGame, judge, rollDice, undoJudgement } from '../../engine/game';
import { boardWith, dice, makeGame, questTile } from '../../engine/testkit';
import type { GameState, Phase } from '../../engine/state';
import { useGameStore } from '../../harness/useGameStore';
import { pendingKinds, usePresentation } from '../usePresentation';
import { displayedFrom, EMPTY_DISPLAYED } from './displayed';
import { directGame, startDirector, timelineCtx, useDirector } from './useDirector';

const P = () => usePresentation.getState();
const setGame = (game: GameState | null) => useGameStore.setState({ game });
const engine = () => useGameStore.getState().game!;

// All quests, fail = no star (no retry), so judgement batches stay simple.
const fresh = (rounds = 3) => makeGame({ board: boardWith(20), rules: { rounds, failRule: 'noStar' } });

let unsub: (() => void) | null = null;

beforeEach(() => {
  P().reset(EMPTY_DISPLAYED, null);
  useGameStore.setState({ game: null, startBlockedReason: null });
});
afterEach(() => {
  cleanup(); // unmount probes before the stores are reset (no updates outside act)
  unsub?.();
  unsub = null;
  P().reset(EMPTY_DISPLAYED, null);
  useGameStore.setState({ game: null, startBlockedReason: null });
});

describe('timelineCtx', () => {
  it('reads rounds, the first participant, reduced motion, the last event and the animals', () => {
    const g = fresh(4);
    expect(timelineCtx(g)).toEqual({
      totalRounds: 4,
      firstPid: 'p1',
      reducedMotion: false,
      lastEvent: null,
      animalOf: { p1: 'bear', p2: 'rabbit' },
    });
  });
});

describe('startDirector — mount resync', () => {
  it('resyncs from the engine and plays NO beats, even for a gameStarted log', () => {
    const g = fresh(1); // a 1-round game's log would yield finalRound if replayed
    setGame(g);
    unsub = startDirector();
    expect(P().busy).toBe(false);
    expect(P().current).toBeNull();
    expect(P().displayed).toEqual(displayedFrom(g));
    expect(P().consumedLog).toBe(g.log);
  });

  it('without a game resets to EMPTY / null', () => {
    P().reset({ positions: { x: 1 }, stars: {} }, null);
    unsub = startDirector();
    expect(P().displayed).toEqual(EMPTY_DISPLAYED);
    expect(P().consumedLog).toBeNull();
  });
});

describe('directGame via the store subscription', () => {
  it('a roll makes busy true synchronously in the same store update', () => {
    const g = fresh();
    setGame(g);
    unsub = startDirector();
    setGame(rollDice(g, dice(3)));
    expect(P().busy).toBe(true);
    expect(P().current?.kind).toBe('dice');
    expect(pendingKinds(P().current, P().queue).slice(1, 3)).toEqual(['preview', 'hop']);
    expect(P().consumedLog).toBe(g.log); // not consumed until the queue drains
  });

  it('a transition with no beats leaves busy false and consumes the new log at once', () => {
    setGame(fresh());
    unsub = startDirector();
    setGame(rollDice(engine(), dice(3)));
    P().skipAll();
    setGame(judge(engine(), false, dice(1)));
    expect(P().current?.kind).toBe('miss'); // ❌ plays a miss beat (07-01, D-13)
    P().skipAll();
    expect(P().busy).toBe(false);
    const advanced = advanceTurn(engine());
    expect(advanced.round).toBe(1);
    setGame(advanced);
    expect(P().busy).toBe(false);
    expect(P().consumedLog).toBe(advanced.log);
  });

  it('a fresh 1-round game (gameStarted log) plays one finalRound beat after the reset', () => {
    unsub = startDirector();
    const g = fresh(1);
    setGame(g);
    expect(P().busy).toBe(true);
    expect(pendingKinds(P().current, P().queue)).toEqual(['finalRound']);
    expect(P().displayed).toEqual(displayedFrom(g));
  });

  it('a fresh 3-round game drains at once', () => {
    unsub = startDirector();
    const g = fresh(3);
    setGame(g);
    expect(P().busy).toBe(false);
    expect(P().consumedLog).toBe(g.log);
  });

  it('discontinuity: a different board resets to the engine and plays nothing', () => {
    setGame(fresh());
    unsub = startDirector();
    const other = rollDice(makeGame({ board: boardWith(20, { 3: questTile('hard') }) }), dice(3));
    expect(other.log.seq).toBe(engine().log.seq + 1); // only the board differs
    setGame(other);
    expect(P().busy).toBe(false);
    expect(P().displayed).toEqual(displayedFrom(other));
    expect(P().consumedLog).toBe(other.log);
  });

  it('discontinuity: a seq jump resets to the engine and plays nothing', () => {
    const g = fresh();
    setGame(g);
    unsub = startDirector();
    const jumped = judge(rollDice(g, dice(3)), true, dice(1)); // seq + 2, stars would be a beat
    setGame(jumped);
    expect(P().busy).toBe(false);
    expect(P().current).toBeNull();
    expect(P().displayed).toEqual(displayedFrom(jumped));
    expect(P().consumedLog).toBe(jumped.log);
  });

  it('a rounds-complete end plays one win beat; after it the queue drains on the gameEnded log (D-14)', () => {
    setGame(fresh(1));
    unsub = startDirector();
    for (let i = 0; i < 2; i++) {
      setGame(rollDice(engine(), dice(3)));
      setGame(judge(engine(), i === 1, dice(1)));
      P().skipAll();
      if (i === 0) setGame(advanceTurn(engine()));
    }
    const ended = advanceTurn(engine());
    expect(ended.phase).toBe('gameOver');
    setGame(ended);
    expect(P().busy).toBe(true);
    expect(P().current).toMatchObject({ kind: 'win', winners: ['p2'], animals: ['rabbit'], ms: 1500 });
    expect(P().queue).toEqual([]);
    P().completeBeat(P().current!.id);
    expect(P().busy).toBe(false);
    expect(P().consumedLog).toBe(ended.log);
    expect(P().displayed).toEqual(displayedFrom(ended));
  });

  it('a manual gameEnded batch while beats are playing → skipAll (busy false, displayed = engine)', () => {
    setGame(fresh());
    unsub = startDirector();
    setGame(rollDice(engine(), dice(3)));
    expect(P().busy).toBe(true);
    const ended = endGame(engine(), 'manual');
    setGame(ended);
    expect(P().busy).toBe(false);
    expect(P().displayed).toEqual(displayedFrom(ended));
    expect(P().consumedLog).toBe(ended.log);
  });

  it('judgementUndone → no beats; stars restored from the engine; log consumed', () => {
    setGame(fresh());
    unsub = startDirector();
    setGame(rollDice(engine(), dice(3)));
    P().skipAll();
    setGame(judge(engine(), true, dice(1)));
    expect(P().current?.kind).toBe('stars');
    P().completeBeat(P().current!.id);
    expect(P().displayed.stars.p1).toBe(1);
    const undone = undoJudgement(engine());
    setGame(undone);
    expect(P().busy).toBe(false);
    expect(P().displayed.stars.p1).toBe(0);
    expect(P().displayed).toEqual(displayedFrom(undone));
    expect(P().consumedLog).toBe(undone.log);
  });

  it('game set to null → EMPTY / null', () => {
    setGame(fresh());
    unsub = startDirector();
    setGame(rollDice(engine(), dice(3)));
    setGame(null);
    expect(P().busy).toBe(false);
    expect(P().displayed).toEqual(EMPTY_DISPLAYED);
    expect(P().consumedLog).toBeNull();
  });

  it('setting startBlockedReason (game unchanged) does nothing', () => {
    setGame(fresh());
    unsub = startDirector();
    const before = P();
    useGameStore.setState({ startBlockedReason: '미션이 없어요' });
    expect(P()).toBe(before);
  });

  it('directGame with the identical object is a no-op', () => {
    const g = fresh();
    const before = P();
    directGame(g, g);
    expect(P()).toBe(before);
  });

  it('after unsubscribe, store changes no longer affect usePresentation', () => {
    const g = fresh();
    setGame(g);
    unsub = startDirector();
    unsub();
    unsub = null;
    const before = P();
    setGame(rollDice(g, dice(3)));
    expect(P()).toBe(before);
    expect(P().busy).toBe(false);
  });
});

describe('useDirector in React', () => {
  interface Rec {
    phase: Phase;
    controlsVisible: boolean;
  }

  function Probe({ records }: { records: Rec[] }) {
    useDirector();
    const game = useGameStore((s) => s.game);
    const busy = usePresentation((s) => s.busy);
    const consumedLog = usePresentation((s) => s.consumedLog);
    if (game) records.push({ phase: game.phase, controlsVisible: !busy && consumedLog === game.log });
    return (
      <button type="button" onClick={() => setGame(rollDice(engine(), dice(3)))}>
        roll
      </button>
    );
  }

  it('no flicker: awaitingJudgement is never rendered with controls visible until the beats finish', () => {
    setGame(fresh());
    const records: Rec[] = [];
    render(<Probe records={records} />);
    expect(records.at(-1)).toEqual({ phase: 'awaitingRoll', controlsVisible: true });

    fireEvent.click(screen.getByRole('button', { name: 'roll' }));
    expect(engine().phase).toBe('awaitingJudgement');
    expect(records.some((r) => r.phase === 'awaitingJudgement')).toBe(true);
    expect(records.filter((r) => r.phase === 'awaitingJudgement' && r.controlsVisible)).toEqual([]);

    act(() => usePresentation.getState().skipAll());
    expect(records.at(-1)).toEqual({ phase: 'awaitingJudgement', controlsVisible: true });
  });

  it('mounts the subscription in an effect and unsubscribes on unmount', () => {
    const g = fresh();
    setGame(g);
    const { unmount } = render(<Probe records={[]} />);
    expect(P().consumedLog).toBe(g.log); // mount resync ran
    unmount();
    const before = P();
    setGame(rollDice(g, dice(3)));
    expect(P()).toBe(before);
  });
});
