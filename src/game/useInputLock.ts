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
import { useCallback, useRef } from 'react';

// Longer than a typical double-tap interval (~300 ms), short enough to never feel sluggish.
export const INPUT_LOCK_MS = 400;

export type Guard = (action: () => void) => void;

export function useInputLock(ms: number = INPUT_LOCK_MS): Guard {
  const lockedUntil = useRef(Number.NEGATIVE_INFINITY);
  return useCallback(
    (action: () => void) => {
      const now = performance.now();
      if (now < lockedUntil.current) return; // the second tap of a double tap
      lockedUntil.current = now + ms;
      action();
    },
    [ms],
  );
}
