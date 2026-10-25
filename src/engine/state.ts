// src/engine/state.ts — the v2 (ring board) game-state data model (Phase 5).
// PHASE 5 CONTRACT: this file MUST stay
//   - types only (no runtime code besides type re-exports),
//   - free of React/DOM imports and of src/store.ts / src/settings.
// FailRule/StartBonus/BoardSize are declared here as plain unions so the engine never imports
// the settings store; they are literal-compatible with src/settings.ts.
import type { Mission, Event, Effect, Difficulty } from '../schema';
import type { AnimalId } from './animals';
import type { Tile, TileKind } from './board';

export type Phase = 'awaitingNomination' | 'awaitingRoll' | 'awaitingJudgement' | 'turnResolved' | 'gameOver';
export type EndReason = 'rounds-complete' | 'manual';
export type FailRule = 'retrySame' | 'retryNew' | 'noStar';
export type StartBonus = 0 | 1 | 2;
export type BoardSize = 16 | 20 | 24;

export interface Participant {
  id: string;
  name: string;
  animal: AnimalId;
  memberNames: string[];
  memberTurnIndex: number;
  position: number; // always wrap(travel, L)
  travel: number;
  lapsCredited: number;
  stars: number; // never decreases except via undo restoring a pre-judgement snapshot
}

export interface GameRules {
  targetJumps?: number; // One pre-game die roll, fixed for all missions in this game.
  nomination?: boolean; // Teacher-selected, no round limit.
  rounds: number;
  failRule: FailRule;
  startBonus: StartBonus;
  boardSize: BoardSize;
}

export interface GameConfig {
  mode: 'solo' | 'team';
  participants: Participant[];
  rules: GameRules;
}

export interface GameContent {
  missions: Mission[];
  events: Event[];
}

export interface QuestCard {
  mission: Mission;
  diff: Difficulty;
  stars: 1 | 2 | 3;
  attempt: 1 | 2;
}

export interface TurnInfo {
  isExtra: boolean;
  bonusPaid: boolean;
  extraGranted: boolean;
}

export interface MoveResult {
  roll: number;
  dicePath: number[];
  landed: number; // landed = tile index after the dice move
  event: Event | null;
  eventPath: number[];
  extraSuppressed: boolean;
  to: number;
  finalKind: TileKind;
  startBonus: number; // stars paid by the start bonus this roll (0 if none)
}

export interface JudgementResult {
  success: boolean;
  starsAwarded: number;
  retry: boolean;
}

export type GameEvent =
  | { t: 'gameStarted' }
  | { t: 'turnStarted'; pid: string; member: string; round: number; isExtra: boolean }
  | { t: 'rolled'; pid: string; face: number }
  | { t: 'moved'; pid: string; path: number[]; by: 'dice' | 'event' }
  | { t: 'startBonus'; pid: string; stars: number }
  | { t: 'landed'; pid: string; tile: number; kind: TileKind }
  | { t: 'eventApplied'; pid: string; eff: Effect; steps: number; suppressed: boolean }
  | { t: 'questDrawn'; pid: string; missionId: string; diff: Difficulty; stars: 1 | 2 | 3; attempt: 1 | 2 }
  | { t: 'judged'; pid: string; success: boolean; stars: number }
  | { t: 'judgementUndone' }
  | { t: 'gameEnded'; reason: EndReason; winners: string[] };

// D-15: per-participant game stats (Phase 8 praise badges). Lives only in the in-memory game
// state — never persisted, never part of the backup format.
export interface PlayerStats {
  attempts: number;
  successes: number;
  failures: number;
  retrySuccesses: number;
  hardSuccesses: number;
  luckyCount: number;
}

export interface GameLog {
  seq: number;
  events: GameEvent[];
}

// Everything except the undo slot and the log — this is exactly what an undo snapshot stores
// (non-circular: GameState extends it instead of Omit-ing itself).
export interface GameStateCore {
  phase: Phase;
  config: GameConfig;
  board: Tile[]; // built once at createGame, never replaced (BOARD-04)
  pool: Record<Difficulty, Mission[]>; // mission snapshot per difficulty (reshuffle source)
  decks: Record<Difficulty, Mission[]>; // remaining shuffled deck, draw = take from the end
  currentIndex: number;
  round: number; // round starts at 1
  turn: TurnInfo;
  card: QuestCard | null;
  lastMove: MoveResult | null;
  lastJudgement: JudgementResult | null;
  winners: string[];
  endReason: EndReason | null;
  stats: Readonly<Record<string, PlayerStats>>; // D-15: in the core, so undo snapshots carry it
}

export type UndoSnapshot = GameStateCore;

export interface GameState extends GameStateCore {
  undo: UndoSnapshot | null;
  log: GameLog;
}

export type { Mission, Event, Effect, Difficulty, Tile, TileKind, AnimalId };
