// src/game/useSkipOnTap.test.tsx — tap-to-skip + the shared skip lock (Phase 8 08-03; FX-03, D-07,
// D-23, RESEARCH Pattern 5 / Pitfall 3 / Pitfall 4). jsdom, fake timers (Vitest fakes
// performance.now too, so the 249 / 250 ms lock edges are deterministic).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { INPUT_LOCK_MS, lockInputFor, resetSharedInputLock, SKIP_LOCK_MS, useInputLock } from './useInputLock';
import { isSkippable, SKIP_IGNORE_ATTR, useSkipOnTap, useTapToSkip } from './useSkipOnTap';
import { usePresentation } from './usePresentation';
import { EMPTY_DISPLAYED } from './director/displayed';
import type { Beat, BeatSpec } from './director/timeline';
import { useGameStore } from '../harness/useGameStore';

const P = () => usePresentation.getState();

const STARS: BeatSpec = { kind: 'stars', pid: 'p1', stars: 3, ms: 2200 };
const WIN: BeatSpec = { kind: 'win', winners: ['p1'], animals: ['bear'], ms: 1500 };
const DICE: BeatSpec = { kind: 'dice', pid: 'p1', face: 3, ms: 1000 };
const MISS: BeatSpec = { kind: 'miss', pid: 'p1', retry: true, ms: 700 };
const NON_SKIPPABLE: BeatSpec[] = [
  DICE,
  { kind: 'preview', pid: 'p1', path: [1, 2, 3], ms: 500 },
  { kind: 'hop', pid: 'p1', path: [1, 2, 3], by: 'dice', ms: 750 },
  MISS,
  { kind: 'startBonus', pid: 'p1', stars: 1, ms: 800 },
  { kind: 'event', pid: 'p1', eff: 'extra', steps: 0, suppressed: false, name: 'x', label: '', ms: 1000 },
  { kind: 'finalRound', ms: 1500 },
];
const beat = (spec: BeatSpec): Beat => ({ ...spec, id: 1 });

beforeEach(() => {
  vi.useFakeTimers();
  resetSharedInputLock();
  useGameStore.setState({ game: null, startBlockedReason: null });
  P().reset(EMPTY_DISPLAYED, null);
});

afterEach(() => {
  cleanup();
  P().reset(EMPTY_DISPLAYED, null);
  resetSharedInputLock();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('shared input lock (D-07, Pitfall 4)', () => {
  it('SKIP_LOCK_MS is 250', () => {
    expect(SKIP_LOCK_MS).toBe(250);
  });

  it('lockInputFor(250) drops guarded actions until 250 ms, then lets them run', () => {
    const { result } = renderHook(() => useInputLock());
    const action = vi.fn();
    lockInputFor(SKIP_LOCK_MS);
    vi.advanceTimersByTime(SKIP_LOCK_MS - 1);
    result.current(action);
    expect(action).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    result.current(action);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('a dropped tap does not start the hook window, so the first tap after the lock runs', () => {
    const { result } = renderHook(() => useInputLock());
    const action = vi.fn();
    lockInputFor(SKIP_LOCK_MS);
    result.current(action); // dropped by the shared lock
    vi.advanceTimersByTime(SKIP_LOCK_MS);
    result.current(action);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('extends but never shortens an active deadline', () => {
    const { result } = renderHook(() => useInputLock());
    const action = vi.fn();
    lockInputFor(1000);
    lockInputFor(SKIP_LOCK_MS); // shorter: ignored
    vi.advanceTimersByTime(SKIP_LOCK_MS);
    result.current(action);
    expect(action).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000 - SKIP_LOCK_MS);
    result.current(action);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('resetSharedInputLock clears it', () => {
    const { result } = renderHook(() => useInputLock());
    const action = vi.fn();
    lockInputFor(1000);
    resetSharedInputLock();
    result.current(action);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("the hook's own 400 ms window still works without any shared lock", () => {
    const { result } = renderHook(() => useInputLock());
    const action = vi.fn();
    result.current(action);
    vi.advanceTimersByTime(INPUT_LOCK_MS - 1);
    result.current(action);
    expect(action).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    result.current(action);
    expect(action).toHaveBeenCalledTimes(2);
  });
});

describe('isSkippable (D-07)', () => {
  it('stars and win only', () => {
    expect(isSkippable(beat(STARS))).toBe(true);
    expect(isSkippable(beat(WIN))).toBe(true);
    for (const spec of NON_SKIPPABLE) expect(isSkippable(beat(spec)), spec.kind).toBe(false);
    expect(isSkippable(null)).toBe(false);
  });
});

// Counts the skip hook's own listeners (document click capture + keydown).
function listenerSpies() {
  const add = vi.spyOn(document, 'addEventListener');
  const remove = vi.spyOn(document, 'removeEventListener');
  const count = (spy: typeof add) => spy.mock.calls.filter(([type]) => type === 'click' || type === 'keydown').length;
  return { added: () => count(add), removed: () => count(remove) };
}

function TapHost({ enabled, onSkip }: { enabled: boolean; onSkip: () => void }) {
  useTapToSkip(enabled, onSkip);
  return (
    <div>
      <button type="button">plain</button>
      <div {...{ [SKIP_IGNORE_ATTR]: '' }}>
        <button type="button">ignored</button>
      </div>
    </div>
  );
}

describe('useTapToSkip (D-07, D-23)', () => {
  it('a document click skips once; a click inside [data-skip-ignore] does not', () => {
    const onSkip = vi.fn();
    const { getByRole } = render(<TapHost enabled onSkip={onSkip} />);
    fireEvent.click(document.body);
    expect(onSkip).toHaveBeenCalledTimes(1);
    fireEvent.click(getByRole('button', { name: 'plain' }));
    expect(onSkip).toHaveBeenCalledTimes(2);
    fireEvent.click(getByRole('button', { name: 'ignored' }));
    expect(onSkip).toHaveBeenCalledTimes(2);
  });

  it('Escape skips; other keys do not; Escape inside [data-skip-ignore] does not', () => {
    const onSkip = vi.fn();
    const { getByRole } = render(<TapHost enabled onSkip={onSkip} />);
    fireEvent.keyDown(document.body, { key: 'Enter' });
    fireEvent.keyDown(document.body, { key: ' ' });
    expect(onSkip).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onSkip).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'Escape' }); // a non-Element target still counts
    expect(onSkip).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(getByRole('button', { name: 'ignored' }), { key: 'Escape' });
    expect(onSkip).toHaveBeenCalledTimes(2);
  });

  it('registers the click listener in the capture phase', () => {
    const add = vi.spyOn(document, 'addEventListener');
    render(<TapHost enabled onSkip={() => {}} />);
    const click = add.mock.calls.filter(([type]) => type === 'click');
    expect(click).toHaveLength(1);
    expect(click[0][2]).toBe(true);
  });

  it('disabled → no listener at all', () => {
    const spies = listenerSpies();
    const onSkip = vi.fn();
    render(<TapHost enabled={false} onSkip={onSkip} />);
    expect(spies.added()).toBe(0);
    fireEvent.click(document.body);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onSkip).not.toHaveBeenCalled();
  });

  it('turning it off and unmounting remove both listeners (add / remove balance)', () => {
    const spies = listenerSpies();
    const onSkip = vi.fn();
    const { rerender, unmount } = render(<TapHost enabled onSkip={onSkip} />);
    expect(spies.added()).toBe(2);
    rerender(<TapHost enabled={false} onSkip={onSkip} />);
    expect(spies.removed()).toBe(2);
    fireEvent.click(document.body);
    expect(onSkip).not.toHaveBeenCalled();
    rerender(<TapHost enabled onSkip={onSkip} />);
    expect(spies.added()).toBe(4);
    unmount();
    expect(spies.removed()).toBe(4);
  });
});

function SkipHost() {
  useSkipOnTap();
  return null;
}

describe('useSkipOnTap (D-07, T-08-04)', () => {
  it('a body click during a stars beat completes that beat by id and starts the shared lock', () => {
    render(<SkipHost />);
    act(() => {
      P().play([STARS, DICE]);
    });
    const starsId = P().current!.id;
    expect(P().current!.kind).toBe('stars');
    act(() => {
      fireEvent.click(document.body);
    });
    expect(P().current!.kind).toBe('dice'); // the next beat starts, untouched
    expect(P().current!.id).not.toBe(starsId);
    expect(P().queue).toHaveLength(0);
    // The shared lock is active right after the skip.
    const { result } = renderHook(() => useInputLock());
    const action = vi.fn();
    result.current(action);
    expect(action).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SKIP_LOCK_MS);
    result.current(action);
    expect(action).toHaveBeenCalledTimes(1);
    // The dice beat is not skippable: a further click leaves it current.
    const diceId = P().current!.id;
    act(() => {
      fireEvent.click(document.body);
    });
    expect(P().current!.id).toBe(diceId);
  });

  it('Escape during a win beat ends it (queue drains)', () => {
    render(<SkipHost />);
    act(() => {
      P().play([WIN]);
    });
    act(() => {
      fireEvent.keyDown(document.body, { key: 'Escape' });
    });
    expect(P().busy).toBe(false);
  });

  it.each([MISS, DICE])('a click during a $kind beat changes nothing', (spec) => {
    const spies = listenerSpies();
    render(<SkipHost />);
    act(() => {
      P().play([spec]);
    });
    const cur = P().current;
    act(() => {
      fireEvent.click(document.body);
    });
    expect(P().current).toBe(cur);
    expect(spies.added()).toBe(0); // no skippable beat → no listener (D-23)
    const { result } = renderHook(() => useInputLock());
    const action = vi.fn();
    result.current(action);
    expect(action).toHaveBeenCalledTimes(1); // no lock was taken
  });

  it('the listeners go away once the skippable beat ends', () => {
    const spies = listenerSpies();
    render(<SkipHost />);
    act(() => {
      P().play([STARS]);
    });
    expect(spies.added()).toBe(2);
    act(() => {
      fireEvent.click(document.body);
    });
    expect(P().busy).toBe(false);
    expect(spies.removed()).toBe(2);
  });
});
