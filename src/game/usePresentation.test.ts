// src/game/usePresentation.test.ts — beat queue store v2 (06-02 Task 2, D-19, D-25, HUD-03).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePresentation, WATCHDOG_BUFFER_MS, pendingKinds } from './usePresentation';
import { useGameStore } from '../harness/useGameStore';
import { EMPTY_DISPLAYED, displayedFrom } from './director/displayed';
import type { BeatSpec } from './director/timeline';
import { makeGame, patchParticipant } from '../engine/testkit';

const S = () => usePresentation.getState();

const dice: BeatSpec = { kind: 'dice', pid: 'p1', face: 3, ms: 1000 };
const hop = (to: number, ms = 750): BeatSpec => ({ kind: 'hop', pid: 'p1', path: [to], by: 'dice', ms });
const bonus: BeatSpec = { kind: 'startBonus', pid: 'p1', stars: 1, ms: 800 };
const stars: BeatSpec = { kind: 'stars', pid: 'p1', stars: 2, ms: 600 };

describe('usePresentation v2 — beat queue', () => {
  beforeEach(() => {
    S().reset(EMPTY_DISPLAYED, null);
    useGameStore.setState({ game: null });
  });
  afterEach(() => {
    S().reset(EMPTY_DISPLAYED, null);
    vi.useRealTimers();
  });

  it('starts idle', () => {
    const s = S();
    expect(s.queue).toEqual([]);
    expect(s.current).toBeNull();
    expect(s.busy).toBe(false);
    expect(s.displayed).toEqual(EMPTY_DISPLAYED);
    expect(s.consumedLog).toBeNull();
  });

  it('WATCHDOG_BUFFER_MS is 500', () => {
    expect(WATCHDOG_BUFFER_MS).toBe(500);
  });

  it('play([]) while idle drains at once (no game → EMPTY / null)', () => {
    S().play([]);
    expect(S().busy).toBe(false);
    expect(S().displayed).toEqual(EMPTY_DISPLAYED);
    expect(S().consumedLog).toBeNull();
  });

  it('play([]) while idle drains and resyncs from the engine game', () => {
    const g = patchParticipant(makeGame(), 0, { position: 4, stars: 3 });
    useGameStore.setState({ game: g });
    S().play([]);
    expect(S().busy).toBe(false);
    expect(S().displayed).toEqual(displayedFrom(g));
    expect(S().consumedLog).toBe(g.log);
  });

  it('play([a, b]) runs a then b; completion applies the beat; the last completion drains', () => {
    const g = patchParticipant(makeGame(), 0, { position: 5, stars: 1 });
    useGameStore.setState({ game: g });
    S().reset(displayedFrom(makeGame()), null);

    S().play([hop(5), bonus]);
    const a = S().current!;
    expect(a).toMatchObject({ kind: 'hop' });
    expect(S().queue).toHaveLength(1);
    expect(S().busy).toBe(true);
    expect(S().consumedLog).toBeNull();

    S().completeBeat(a.id);
    const b = S().current!;
    expect(b).toMatchObject({ kind: 'startBonus' });
    expect(b.id).toBeGreaterThan(a.id);
    expect(S().displayed.positions.p1).toBe(5);
    expect(S().displayed.stars.p1).toBe(0);
    expect(S().busy).toBe(true);

    S().completeBeat(b.id);
    expect(S().current).toBeNull();
    expect(S().queue).toEqual([]);
    expect(S().busy).toBe(false);
    expect(S().displayed).toEqual(displayedFrom(g));
    expect(S().consumedLog).toBe(g.log);
  });

  it('ids increase strictly across play calls', () => {
    S().play([dice]);
    const first = S().current!.id;
    S().skipAll();
    S().play([dice, stars]);
    const second = S().current!.id;
    expect(second).toBeGreaterThan(first);
    expect(S().queue[0].id).toBeGreaterThan(second);
  });

  it('completeBeat with a stale, unknown or repeated id changes nothing', () => {
    S().play([dice, stars]);
    const a = S().current!;
    const before = S();
    S().completeBeat(a.id + 999);
    expect(S()).toBe(before);
    S().completeBeat(a.id);
    const afterA = S();
    S().completeBeat(a.id); // repeated
    expect(S()).toBe(afterA);
    expect(S().current).toMatchObject({ kind: 'stars' });
  });

  it('0 ms beats are applied synchronously and never become current', () => {
    S().reset(displayedFrom(makeGame()), null);
    S().play([hop(4, 0), bonus]);
    expect(S().current).toMatchObject({ kind: 'startBonus' });
    expect(S().queue).toEqual([]);
    expect(S().displayed.positions.p1).toBe(4);
  });

  it('a batch of only 0 ms beats drains immediately', () => {
    S().play([{ ...dice, ms: 0 }, hop(2, 0)]);
    expect(S().busy).toBe(false);
    expect(S().current).toBeNull();
  });

  it('play while busy appends to the queue without interrupting current', () => {
    S().play([dice]);
    const cur = S().current!;
    S().play([stars, bonus]);
    expect(S().current).toBe(cur);
    expect(S().queue.map((b) => b.kind)).toEqual(['stars', 'startBonus']);
    expect(S().busy).toBe(true);
  });

  it('skipAll applies everything and drains; while idle it just drains', () => {
    const g = patchParticipant(makeGame(), 0, { position: 9, stars: 2 });
    useGameStore.setState({ game: g });
    S().play([dice, hop(9), stars]);
    S().skipAll();
    expect(S().busy).toBe(false);
    expect(S().current).toBeNull();
    expect(S().queue).toEqual([]);
    expect(S().displayed).toEqual(displayedFrom(g));
    expect(S().consumedLog).toBe(g.log);

    S().skipAll();
    expect(S().busy).toBe(false);
    expect(S().consumedLog).toBe(g.log);
  });

  it('drain resync: the engine wins over the applied beats (e.g. after an undo)', () => {
    const g = makeGame(); // engine: p1 has 0 stars
    useGameStore.setState({ game: g });
    S().reset(displayedFrom(g), null);
    S().play([stars]); // would add 2 stars
    S().completeBeat(S().current!.id);
    expect(S().displayed.stars.p1).toBe(0);
  });

  it('reset clears queue/current/watchdog and sets displayed and consumedLog', () => {
    vi.useFakeTimers();
    const g = makeGame();
    S().play([dice, stars]);
    const d = displayedFrom(g);
    S().reset(d, g.log);
    expect(S().queue).toEqual([]);
    expect(S().current).toBeNull();
    expect(S().busy).toBe(false);
    expect(S().displayed).toBe(d);
    expect(S().consumedLog).toBe(g.log);
    const after = S();
    vi.advanceTimersByTime(10_000);
    expect(S()).toBe(after); // the cleared watchdog never fires
  });

  describe('per-beat watchdog (T-06-03)', () => {
    beforeEach(() => vi.useFakeTimers());

    it('completes a beat at ms + buffer, then the next beat has its own watchdog', () => {
      S().play([dice, stars]);
      const a = S().current!;
      vi.advanceTimersByTime(a.ms + WATCHDOG_BUFFER_MS - 1);
      expect(S().current).toBe(a);
      vi.advanceTimersByTime(1);
      const b = S().current!;
      expect(b).toMatchObject({ kind: 'stars' });
      vi.advanceTimersByTime(b.ms + WATCHDOG_BUFFER_MS - 1);
      expect(S().current).toBe(b);
      vi.advanceTimersByTime(1);
      expect(S().current).toBeNull();
      expect(S().busy).toBe(false);
    });

    it('a queue with no consumer always drains on its own', () => {
      S().play([dice, hop(3), bonus, stars, { kind: 'finalRound', ms: 1500 }]);
      vi.advanceTimersByTime(60_000);
      expect(S().busy).toBe(false);
    });

    it('normal completion cancels the pending watchdog', () => {
      S().play([dice]);
      S().completeBeat(S().current!.id);
      expect(S().busy).toBe(false);
      S().play([stars]);
      const b = S().current!;
      // The old (dice) watchdog would have fired at 1500 ms; only stars' own one (1100) may act.
      vi.advanceTimersByTime(b.ms + WATCHDOG_BUFFER_MS - 1);
      expect(S().current).toBe(b);
    });

    it('skipAll clears the watchdog', () => {
      S().play([dice]);
      S().skipAll();
      S().play([stars]);
      const b = S().current!;
      vi.advanceTimersByTime(b.ms + WATCHDOG_BUFFER_MS - 1);
      expect(S().current).toBe(b);
    });
  });

  it('pendingKinds lists current then queued kinds; empty when idle', () => {
    expect(pendingKinds(S().current, S().queue)).toEqual([]);
    S().play([dice, hop(3), stars]);
    expect(pendingKinds(S().current, S().queue)).toEqual(['dice', 'hop', 'stars']);
  });
});
