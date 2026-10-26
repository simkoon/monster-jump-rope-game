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
import type { Mission, Event, Difficulty } from '../schema';
import type { GameState, Participant } from '../engine/state';
import {
  createGame,
  nominate,
  rollDice,
  judge as engineJudge,
  undoJudgement,
  advanceTurn,
  endGame,
  addParticipant as engineAddParticipant,
  type NewParticipant,
} from '../engine/game';
import { analyzeContent } from '../engine/setup';
import { DIFF_ORDER } from '../engine/board';
import { systemRng, TARGET_JUMPS_MAX, TARGET_JUMPS_MIN } from '../engine/rng';

export interface GameSetup {
  targetJumps?: number;
  mode: 'solo' | 'team';
  participants: Participant[];
  rounds: number;
  nomination?: boolean;
  diffs?: Difficulty[]; // chosen difficulties; absent or all three = the full mix
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
  nominate: (pid: string) => void;
  roll: () => void;
  judge: (success: boolean) => void;
  undo: () => void;
  next: () => void;
  endNow: () => void;
  addParticipant: (input: NewParticipant) => void;
  restart: () => void;
  reset: () => void;
}

// T-05-17: integer rounds within [ROUNDS_MIN, ROUNDS_MAX]; non-finite → DEFAULT_ROUNDS.
function clampRounds(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_ROUNDS;
  return Math.min(ROUNDS_MAX, Math.max(ROUNDS_MIN, Math.round(n)));
}

// Copy the content once so later edits to the store arrays cannot leak into the game.
// Only missions of the chosen difficulties go into the game (the board then has only those tiles).
function snapshotContent(override?: ContentOverride, diffs?: readonly Difficulty[]): ContentOverride {
  const src = override ?? useStore.getState();
  const missions = diffs ? src.missions.filter((m) => diffs.includes(m.diff)) : src.missions;
  return { missions: [...missions], events: [...src.events] };
}

// Valid, unique, in DIFF_ORDER; undefined when nothing or everything is chosen (= the full mix).
function normalizeDiffs(diffs?: readonly Difficulty[]): Difficulty[] | undefined {
  if (!diffs) return undefined;
  const out = DIFF_ORDER.filter((d) => diffs.includes(d));
  return out.length === 0 || out.length === DIFF_ORDER.length ? undefined : out;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  game: null,
  startBlockedReason: null,

  startGame: (setup, contentOverride) => {
    const diffs = normalizeDiffs(setup.diffs);
    const content = snapshotContent(contentOverride, diffs);
    const analysis = analyzeContent(content.missions, content.events);
    if (!analysis.ok) {
      const reason = diffs ? '고른 난이도에 미션이 없어요. 다른 난이도를 골라 주세요.' : analysis.reason;
      set({ game: null, startBlockedReason: reason ?? '지금은 시작할 수 없어요.' });
      return;
    }
    const { failRule, startBonus, boardSize } = useSettings.getState();
    const targetJumps = setup.targetJumps === undefined ? {} : {
      targetJumps: Math.min(TARGET_JUMPS_MAX, Math.max(TARGET_JUMPS_MIN, Number.isFinite(setup.targetJumps) ? Math.round(setup.targetJumps) : TARGET_JUMPS_MIN)),
    };
    const rules = { ...targetJumps, ...(diffs ? { diffs } : {}), nomination: setup.nomination, rounds: clampRounds(setup.rounds), failRule, startBonus, boardSize };
    const game = createGame({ mode: setup.mode, participants: setup.participants, rules }, content, systemRng());
    set({ game, startBlockedReason: null });
  },

  nominate: (pid) => {
    const g = get().game;
    if (g) set({ game: nominate(g, pid) });
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

  // A latecomer joins the running game at the start tile (engine: addParticipant).
  addParticipant: (input) => {
    const g = get().game;
    if (!g) return;
    set({ game: engineAddParticipant(g, input) });
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
      nomination: g.config.rules.nomination,
      targetJumps: g.config.rules.targetJumps,
      diffs: g.config.rules.diffs,
    });
  },

  // Back to the start screen.
  reset: () => set({ game: null, startBlockedReason: null }),
}));
