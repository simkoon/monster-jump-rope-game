// src/game/usePresentation.ts — the beat queue store v2 (D-01, D-19, D-25, HUD-03).
// A small Zustand store between the pure engine and the 3D scene / DOM banners. The director
// (director/useDirector.ts) turns every engine transition into data beats and calls `play`; the
// consumers (dice, token hops, banners) show `current` and call `completeBeat(id)` when done.
// While anything is queued or playing, `busy` is true and the HUD hides the next-phase controls
// (shown only when `!busy && consumedLog === game.log`). The engine itself is NEVER blocked.
//
// Deadlock rationale (v1 Pitfall 1, T-06-03): a dropped frame, an unmount mid-tween or a thrown
// callback could otherwise leave the queue stuck forever. Every beat with ms > 0 arms its own
// watchdog that completes it after ms + WATCHDOG_BUFFER_MS, so the queue always drains even with
// no consumer mounted. `completeBeat` ignores any id that is not the current beat, so a late
// callback, a double call, or a watchdog racing a normal completion can never skip a beat.
// Wall-clock use is confined to THIS watchdog — the engine and the timeline stay clock-free.
//
// Drain: when the queue empties, `displayed` is re-synced from the engine (the engine always
// wins — covers undo and any drift) and `consumedLog` is set to the engine's current log.
import { create } from 'zustand';
import type { GameLog } from '../engine/state';
import { useGameStore } from '../harness/useGameStore';
import { applyBeat, displayedFrom, EMPTY_DISPLAYED, type Displayed } from './director/displayed';
import type { Beat, BeatKind, BeatSpec } from './director/timeline';

// Extra grace beyond each beat's own length before its watchdog completes it (ms).
export const WATCHDOG_BUFFER_MS = 500;

interface PresentationState {
  queue: Beat[];
  current: Beat | null;
  busy: boolean; // always === (current !== null || queue.length > 0)
  displayed: Displayed;
  consumedLog: GameLog | null;

  play: (specs: readonly BeatSpec[]) => void;
  completeBeat: (id: number) => void;
  skipAll: () => void;
  reset: (displayed: Displayed, log: GameLog | null) => void;
}

type Snapshot = Pick<PresentationState, 'queue' | 'current' | 'busy' | 'displayed' | 'consumedLog'>;

export const usePresentation = create<PresentationState>((set, get) => {
  // Module-scoped: one watchdog for the one current beat.
  let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
  let nextId = 1;

  const clearWatchdog = () => {
    if (watchdogTimer != null) {
      clearTimeout(watchdogTimer);
      watchdogTimer = null;
    }
  };

  // Queue empty → resync from the engine.
  const drained = (): Snapshot => {
    const game = useGameStore.getState().game;
    return {
      queue: [],
      current: null,
      busy: false,
      displayed: game ? displayedFrom(game) : EMPTY_DISPLAYED,
      consumedLog: game?.log ?? null,
    };
  };

  // Start the next beat: 0 ms beats are applied in a loop (never recursion) and never become
  // current; the first beat with a length becomes current and arms its watchdog.
  const startNext = (displayed: Displayed, pending: readonly Beat[]): Partial<Snapshot> => {
    clearWatchdog();
    let d = displayed;
    let i = 0;
    while (i < pending.length && pending[i].ms <= 0) {
      d = applyBeat(d, pending[i]);
      i++;
    }
    if (i >= pending.length) return drained();
    const cur = pending[i];
    watchdogTimer = setTimeout(() => {
      watchdogTimer = null;
      get().completeBeat(cur.id);
    }, cur.ms + WATCHDOG_BUFFER_MS);
    return { queue: pending.slice(i + 1), current: cur, busy: true, displayed: d };
  };

  return {
    queue: [],
    current: null,
    busy: false,
    displayed: EMPTY_DISPLAYED,
    consumedLog: null,

    play: (specs) => {
      const beats: Beat[] = specs.map((s) => ({ ...s, id: nextId++ }));
      const s = get();
      if (s.current) {
        if (beats.length > 0) set({ queue: [...s.queue, ...beats] });
        return;
      }
      set(startNext(s.displayed, [...s.queue, ...beats]));
    },

    completeBeat: (id) => {
      const s = get();
      if (!s.current || s.current.id !== id) return; // stale, unknown or repeated
      set(startNext(applyBeat(s.displayed, s.current), s.queue));
    },

    skipAll: () => {
      clearWatchdog();
      set(drained());
    },

    reset: (displayed, log) => {
      clearWatchdog();
      set({ queue: [], current: null, busy: false, displayed, consumedLog: log });
    },
  };
});

// Kinds still to play, current first (banner/consumer helpers and tests).
export function pendingKinds(current: Beat | null, queue: readonly Beat[]): BeatKind[] {
  return [...(current ? [current.kind] : []), ...queue.map((b) => b.kind)];
}
