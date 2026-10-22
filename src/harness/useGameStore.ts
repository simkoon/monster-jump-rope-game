// src/harness/useGameStore.ts — the SINGLE seam between the pure v2 engine (src/engine/game.ts)
// and the app. This is the only module that couples src/engine with the content store
// (src/store.ts) and the instructor settings store (src/settings.ts).
//
// Snapshot rule (BOARD-04, DATA-07): startGame reads missions, events and the settings
// (failRule / startBonus / boardSize) exactly ONCE and hands them to createGame. After that
// every action works only on the GameState — live content or settings are never re-read, so
// editing the library or the settings mid-game cannot change the running board, decks or rules.
//
// No wall clock lives here (D-01): the game ends only by rounds or by the manual "지금 끝내기".
import { create } from 'zustand';
import { useStore } from '../store';
import { useSettings, ROUNDS_MIN, ROUNDS_MAX, DEFAULT_ROUNDS } from '../settings';
import type { Mission, Event } from '../schema';
import type { GameState, Participant } from '../engine/state';
import {
  createGame,
  rollDice,
  judge as engineJudge,
  undoJudgement,
  advanceTurn,
  endGame,
} from '../engine/game';
import { analyzeContent } from '../engine/setup';
import { systemRng } from '../engine/rng';

export interface GameSetup {
  mode: 'solo' | 'team';
  participants: Participant[];
  rounds: number;
}

interface ContentOverride {
  missions: Mission[];
  events: Event[];
}

interface GameStoreState {
  game: GameState | null;
  // Guidance surfaced when a start is blocked (empty mission library — D-13).
  startBlockedReason: string | null;

  startGame: (setup: GameSetup, contentOverride?: ContentOverride) => void;
  roll: () => void;
  judge: (success: boolean) => void;
  undo: () => void;
  next: () => void;
  endNow: () => void;
  restart: () => void;
  reset: () => void;
}

// T-05-17: integer rounds within [ROUNDS_MIN, ROUNDS_MAX]; non-finite → DEFAULT_ROUNDS.
function clampRounds(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_ROUNDS;
  return Math.min(ROUNDS_MAX, Math.max(ROUNDS_MIN, Math.round(n)));
}

// Copy the content once so later edits to the store arrays cannot leak into the game.
function snapshotContent(override?: ContentOverride): ContentOverride {
  const src = override ?? useStore.getState();
  return { missions: [...src.missions], events: [...src.events] };
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  game: null,
  startBlockedReason: null,

  startGame: (setup, contentOverride) => {
    const content = snapshotContent(contentOverride);
    const analysis = analyzeContent(content.missions, content.events);
    if (!analysis.ok) {
      set({ game: null, startBlockedReason: analysis.reason ?? '지금은 시작할 수 없어요.' });
      return;
    }
    const { failRule, startBonus, boardSize } = useSettings.getState();
    const rules = { rounds: clampRounds(setup.rounds), failRule, startBonus, boardSize };
    const game = createGame({ mode: setup.mode, participants: setup.participants, rules }, content, systemRng());
    set({ game, startBlockedReason: null });
  },

  // TURN-01/05/06/07: roll, move around the ring, resolve the landed tile.
  roll: () => {
    const g = get().game;
    if (!g) return;
    set({ game: rollDice(g, systemRng()) });
  },

  // TURN-03/04: instructor verdict on the quest card (fail rules handled by the engine).
  judge: (success) => {
    const g = get().game;
    if (!g) return;
    set({ game: engineJudge(g, success, systemRng()) });
  },

  // TURN-08, D-16/D-17: undo the last judgement.
  undo: () => {
    const g = get().game;
    if (!g) return;
    set({ game: undoJudgement(g) });
  },

  // TURN-07, ROUND-01: next turn (or the extra turn / game end).
  next: () => {
    const g = get().game;
    if (!g) return;
    set({ game: advanceTurn(g) });
  },

  // ROUND-04, D-22: end now (a pending quest is voided by the engine).
  endNow: () => {
    const g = get().game;
    if (!g) return;
    set({ game: endGame(g, 'manual') });
  },

  // D-27 "🔁 다시 하기": same participants, animals, mode and rounds; content and settings
  // are re-snapshotted and a new board is built.
  restart: () => {
    const g = get().game;
    if (!g) return;
    get().startGame({
      mode: g.config.mode,
      participants: g.config.participants,
      rounds: g.config.rules.rounds,
    });
  },

  // Back to the start screen.
  reset: () => set({ game: null, startBlockedReason: null }),
}));
