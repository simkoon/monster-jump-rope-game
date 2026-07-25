// src/harness/useGameStore.ts — the SINGLE seam between the pure engine and the
// throwaway harness UI (D-09). This is the only module that couples src/engine +
// src/store: it reads Phase-1 content, injects the runtime RNG (systemRng), and
// wraps each engine transition as an immutable store action. The engine stays
// unaware of both React and the content store.
//
// NO wall-clock logic lives here beyond the `remainingMs` holder — the countdown
// effect belongs to 02-03's PlayHarness (Pitfall 1). The engine is clock-free.
import { create } from 'zustand';
import { useStore } from '../store';
import type { Mission, Event } from '../schema';
import type { GameConfig, GameState } from '../engine/types';
import {
  createGame,
  drawCard,
  judge as engineJudge,
  rollDice,
  advanceTurn,
  endGame,
} from '../engine/engine';
import { canStart } from '../engine/setup';
import { systemRng } from '../engine/rng';

interface ContentOverride {
  missions: Mission[];
  events: Event[];
}

interface GameStoreState {
  game: GameState | null;
  remainingMs: number | null;
  // Guidance surfaced when a start is blocked (empty mission library — MISSION-07/D-08).
  startBlockedReason: string | null;

  startGame: (config: GameConfig, contentOverride?: ContentOverride) => void;
  draw: () => void;
  judge: (success: boolean) => void;
  roll: () => void;
  next: () => void;
  end: (reason: 'timeout' | 'manual') => void;
  reset: () => void;
  setRemainingMs: (ms: number | null) => void;
}

// Resolve the live Phase-1 content, or the test/caller override.
function content(override?: ContentOverride): ContentOverride {
  if (override) return override;
  const s = useStore.getState();
  return { missions: s.missions, events: s.events };
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  game: null,
  remainingMs: null,
  startBlockedReason: null,

  // SETUP-06 + MISSION-07: gate on canStart, then hand the config + content to the
  // engine's createGame with a fresh runtime RNG. When blocked, leave game null and
  // surface the guidance string for the setup screen to render.
  startGame: (config, contentOverride) => {
    const { missions, events } = content(contentOverride);
    const gate = canStart(missions);
    if (!gate.ok) {
      set({ game: null, startBlockedReason: gate.reason ?? '지금은 시작할 수 없어요.' });
      return;
    }
    const game = createGame(config, missions, events, systemRng());
    set({ game, startBlockedReason: null, remainingMs: config.timeLimitMs });
  },

  // LOOP-01: draw one mission card (equal probability, engine-owned RNG).
  draw: () => {
    const g = get().game;
    if (!g) return;
    const { missions } = content();
    set({ game: drawCard(g, missions, systemRng()) });
  },

  // LOOP-04/05: instructor verdict — success advances to the roll, failure ends the turn.
  judge: (success) => {
    const g = get().game;
    if (!g) return;
    set({ game: engineJudge(g, success) });
  },

  // LOOP-05/07/09: roll, move, apply the landed event, judge a win.
  roll: () => {
    const g = get().game;
    if (!g) return;
    const { events } = content();
    set({ game: rollDice(g, events, systemRng()) });
  },

  // LOOP-08: advance to the next turn (or repeat on an extra-turn event).
  next: () => {
    const g = get().game;
    if (!g) return;
    set({ game: advanceTurn(g) });
  },

  // D-04/D-05: session end (timer hit 0 or "지금 마치기"). Furthest-along wins.
  end: (reason) => {
    const g = get().game;
    if (!g) return;
    set({ game: endGame(g, reason) });
  },

  // Return to the setup screen (LOOP-10 foundation). Config is re-collected by SetupScreen.
  reset: () => set({ game: null, startBlockedReason: null, remainingMs: null }),

  // DOM-owned countdown value holder (02-03 drives the interval that calls this).
  setRemainingMs: (ms) => set({ remainingMs: ms }),
}));
