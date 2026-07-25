// src/game/usePresentation.test.ts — ANIM_DONE busy flag + watchdog (Task 1, TDD).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePresentation, WATCHDOG_BUFFER_MS } from './usePresentation';

describe('usePresentation — ANIM_DONE gating store', () => {
  beforeEach(() => {
    usePresentation.setState({ busy: false });
  });

  it('starts idle (busy === false)', () => {
    expect(usePresentation.getState().busy).toBe(false);
  });

  it('beginAnim sets busy true; signalAnimDone clears it', () => {
    usePresentation.getState().beginAnim();
    expect(usePresentation.getState().busy).toBe(true);
    usePresentation.getState().signalAnimDone();
    expect(usePresentation.getState().busy).toBe(false);
  });

  it('signalAnimDone is idempotent (double-call leaves busy false)', () => {
    usePresentation.getState().beginAnim();
    usePresentation.getState().signalAnimDone();
    usePresentation.getState().signalAnimDone();
    expect(usePresentation.getState().busy).toBe(false);
  });

  describe('watchdog (deadlock-proofing, Pitfall 1)', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('force-clears busy after budget + buffer if signalAnimDone never fires', () => {
      const budget = 800;
      usePresentation.getState().beginAnim();
      usePresentation.getState().startWatchdog(budget);
      expect(usePresentation.getState().busy).toBe(true);

      // Just before the deadline it is still busy...
      vi.advanceTimersByTime(budget + WATCHDOG_BUFFER_MS - 1);
      expect(usePresentation.getState().busy).toBe(true);
      // ...and exactly at the deadline the watchdog force-clears it.
      vi.advanceTimersByTime(1);
      expect(usePresentation.getState().busy).toBe(false);
    });

    it('a normal signalAnimDone cancels the watchdog (no double-fire surprises)', () => {
      const budget = 800;
      usePresentation.getState().beginAnim();
      usePresentation.getState().startWatchdog(budget);
      usePresentation.getState().signalAnimDone(); // normal completion cancels timer
      expect(usePresentation.getState().busy).toBe(false);

      // Re-arm a new animation; the OLD watchdog must not fire and clear it.
      usePresentation.getState().beginAnim();
      vi.advanceTimersByTime(budget + WATCHDOG_BUFFER_MS + 10);
      expect(usePresentation.getState().busy).toBe(true);
    });

    it('the returned canceller stops a pending watchdog', () => {
      const cancel = (() => {
        usePresentation.getState().beginAnim();
        return usePresentation.getState().startWatchdog(500);
      })();
      cancel();
      vi.advanceTimersByTime(5000);
      expect(usePresentation.getState().busy).toBe(true); // never force-cleared
    });
  });
});
