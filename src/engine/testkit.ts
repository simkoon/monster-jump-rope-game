// src/engine/testkit.ts — deterministic test helpers for the v2 FSM (game.ts).
// PHASE 5 CONTRACT: pure, no vitest import, no wall clock, no global randomness (Rng only).
// Reused by later plans' tests (05-05).
import type { Difficulty, Effect, Event, Mission } from '../schema';
import type { AnimalId } from './animals';
import type { Tile } from './board';
import { createGame } from './game';
import { mulberry32, type Rng } from './rng';
import type { GameConfig, GameRules, GameState, Participant } from './state';

// Cycles through the given values forever.
export function scriptedRng(values: number[]): Rng {
  let i = 0;
  return { next: () => values[i++ % values.length] };
}

// rollDie = 1 + floor(next·6) → next = (face − 0.5) / 6 rolls exactly that face.
export const dice = (...faces: number[]): Rng => scriptedRng(faces.map((f) => (f - 0.5) / 6));

export const questTile = (diff: Difficulty): Tile => ({ kind: 'quest', diff });

export function eventTile(eff: Effect, steps = 0, over: Partial<Event> = {}): Tile {
  return {
    kind: 'event',
    event: { id: `e-${eff}${steps}`, name: eff, eff, steps, weight: 1, label: '', ...over },
  };
}

// Index 0 is the start square; every other index defaults to an easy quest.
export function boardWith(L: number, over: Record<number, Tile> = {}): Tile[] {
  return Array.from({ length: L }, (_, i): Tile => (i === 0 ? { kind: 'start' } : over[i] ?? questTile('easy')));
}

export function mission(id: string, diff: Difficulty, over: Partial<Mission> = {}): Mission {
  return { id, name: id, desc: '', diff, cats: [], ...over };
}

export function event(id: string, eff: Effect, steps: number, weight: number, over: Partial<Event> = {}): Event {
  return { id, name: id, eff, steps, weight, label: '', ...over };
}

export function player(id: string, name: string, animal: AnimalId, over: Partial<Participant> = {}): Participant {
  return {
    id,
    name,
    animal,
    memberNames: [name],
    memberTurnIndex: 0,
    position: 0,
    travel: 0,
    lapsCredited: 0,
    stars: 0,
    ...over,
  };
}

export const defaultMissions = (): Mission[] => [
  mission('e1', 'easy'),
  mission('e2', 'easy'),
  mission('n1', 'normal'),
  mission('n2', 'normal'),
  mission('h1', 'hard'),
  mission('h2', 'hard'),
];

export interface MakeGameOpts {
  seed?: number;
  mode?: 'solo' | 'team';
  participants?: Participant[];
  rules?: Partial<GameRules>;
  missions?: Mission[];
  events?: Event[];
  board?: Tile[]; // replaces state.board after creation (the engine always uses board.length as L)
  patch?: (s: GameState) => GameState;
}

export function makeGame(opts: MakeGameOpts = {}): GameState {
  const config: GameConfig = {
    mode: opts.mode ?? 'solo',
    participants: opts.participants ?? [player('p1', 'P1', 'bear'), player('p2', 'P2', 'rabbit')],
    rules: { rounds: 3, failRule: 'retrySame', startBonus: 1, boardSize: 20, ...opts.rules },
  };
  let s = createGame(
    config,
    { missions: opts.missions ?? defaultMissions(), events: opts.events ?? [] },
    mulberry32(opts.seed ?? 1),
  );
  if (opts.board) s = { ...s, board: opts.board };
  if (opts.patch) s = opts.patch(s);
  return s;
}

// Replace one participant's fields (scenario setup).
export function patchParticipant(s: GameState, index: number, patch: Partial<Participant>): GameState {
  const participants = s.config.participants.map((p, i) => (i === index ? { ...p, ...patch } : p));
  return { ...s, config: { ...s.config, participants } };
}
