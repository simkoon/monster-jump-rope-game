// src/game/useInputLock.ts — swallow the second tap of a double tap on the play screen (CR-01, WR-01).
//
// Each phase draws its next action in the same place as the button that was just tapped
// (다음 ➡️ → 🎲 주사위 굴리기, 🎲 → 다음 ➡️ on an event tile, ❌ 실패 → the retry card's ❌), and React
// reuses the DOM node. A quick second tap therefore fires the NEXT phase's action. The engine's
// phase guards cannot catch this (the phase has already changed), and a real touch double tap is
// hit-tested by screen position after React re-rendered, so per-render tokens would not help.
//
// The guard: every play action goes through one shared lock. The first tap runs and starts a short
// lock window; any tap inside the window is dropped. Wall-clock use is confined to this UI guard —
// the engine stays clock-free (D-01). Phase 6 can fold this into the presentation busy gate.
//
// Phase 8 D-07 (shared skip lock, RESEARCH Pitfall 4): a tap that skips a success / win beat
// empties the queue, so 다음 ➡️ appears in the same render and a child's quick second tap would
// land on it. The skip hook calls lockInputFor(SKIP_LOCK_MS); every guard also honors that one
// module-scope deadline (the per-hook ref alone cannot — each component has its own). Same clock
// (performance.now), still confined to this UI guard.
import { useCallback, useRef } from 'react';

// Longer than a typical double-tap interval (~300 ms), short enough to never feel sluggish.
export const INPUT_LOCK_MS = 400;

// D-07: after a skip tap every guarded play action is ignored this long. ⭐3 (2200) + 250 ≤ 2500.
export const SKIP_LOCK_MS = 250;

// The shared deadline (performance.now ms). Only ever extended, never shortened.
let sharedLockedUntil = Number.NEGATIVE_INFINITY;

export function lockInputFor(ms: number): void {
  sharedLockedUntil = Math.max(sharedLockedUntil, performance.now() + ms);
}

// Tests: clear the module-scope lock between cases.
export function resetSharedInputLock(): void {
  sharedLockedUntil = Number.NEGATIVE_INFINITY;
}

export type Guard = (action: () => void) => void;

export function useInputLock(ms: number = INPUT_LOCK_MS): Guard {
  const lockedUntil = useRef(Number.NEGATIVE_INFINITY);
  return useCallback(
    (action: () => void) => {
      const now = performance.now();
      if (now < lockedUntil.current) return; // the second tap of a double tap
      if (now < sharedLockedUntil) return; // right after a skip tap (D-07)
      lockedUntil.current = now + ms;
      action();
    },
    [ms],
  );
}
