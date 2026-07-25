// src/game/usePresentation.ts — the ANIM_DONE gating store (D-07, RESEARCH Pattern 4).
// A tiny Zustand store that sits between the pure engine and the R3F scene: while an
// animation (card flip / dice spin / token hop) runs, `busy` is true and the DOM HUD
// hides/disables the next-phase controls. Only the tween's completion — or the watchdog
// fallback — clears it. The engine itself is NEVER blocked; this gates control visibility.
//
// Pitfall 1 (deadlock): a dropped frame, an unmount mid-tween, or a thrown callback could
// otherwise leave `busy` stuck forever. `startWatchdog` arms a setTimeout fallback that
// force-clears `busy` after the animation budget + BUFFER; normal completion clears it.
// Wall-clock use is confined to THIS watchdog — the engine stays clock-free.
import { create } from 'zustand';

// Extra grace beyond the animation budget before the watchdog force-clears (ms).
export const WATCHDOG_BUFFER_MS = 500;

interface PresentationState {
  busy: boolean;
  beginAnim: () => void;
  signalAnimDone: () => void;
  // Arm a fallback that force-clears `busy` after durationMs + WATCHDOG_BUFFER_MS.
  // Returns a canceller to call on normal completion / unmount. Idempotent re-arm:
  // arming again clears any prior pending watchdog first.
  startWatchdog: (durationMs: number) => () => void;
}

export const usePresentation = create<PresentationState>((set, get) => {
  // Module-scoped timer handle (single in-flight animation at a time by design).
  let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

  const clearWatchdog = () => {
    if (watchdogTimer != null) {
      clearTimeout(watchdogTimer);
      watchdogTimer = null;
    }
  };

  return {
    busy: false,

    beginAnim: () => set({ busy: true }),

    // Idempotent: clearing an already-false busy is a no-op; also cancels any watchdog.
    signalAnimDone: () => {
      clearWatchdog();
      if (get().busy) set({ busy: false });
    },

    startWatchdog: (durationMs) => {
      clearWatchdog(); // re-arm safely: only one watchdog in flight
      watchdogTimer = setTimeout(() => {
        watchdogTimer = null;
        // Force-clear regardless — the game must never lock forever (Pitfall 1).
        if (get().busy) set({ busy: false });
      }, durationMs + WATCHDOG_BUFFER_MS);
      return clearWatchdog;
    },
  };
});
