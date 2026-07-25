// src/engine/engine.ts — the pure turn FSM (D-09). Every function is an immutable
// transition (state, ...args, rng) => GameState, mirroring the Phase 1 store's
// set((s)=>({...})) style: new objects, never mutate.
//
// PHASE 2/3 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of src/store.ts, and
//   - CLOCK-FREE — no Date.now / setInterval / performance.now. The wall-clock
//     countdown is DOM-owned; the engine only receives endGame(reason) (D-04, Pitfall 1).
// Missions and events arrive only as transition arguments (never imported state).
import type { Event, Mission } from '../schema';
import type { GameConfig, GameState, LandingResult } from './types';
import { placeEvents } from './placement';
import { rollDie, uniformPick, type Rng } from './rng';

// Return a new state with only the current participant's position replaced.
function withPosition(state: GameState, pos: number): GameState {
  const participants = state.config.participants.map((p, i) =>
    i === state.currentIndex ? { ...p, position: pos } : p,
  );
  return { ...state, config: { ...state.config, participants } };
}

// Fresh game: reset every participant to the start square, place events on the board,
// and enter awaitingDraw. `missions` is reserved for signature symmetry with resetGame;
// the mission draw happens in drawCard, so it is unused here.
export function createGame(
  config: GameConfig,
  _missions: Mission[],
  events: Event[],
  rng: Rng,
): GameState {
  const participants = config.participants.map((p) => ({
    ...p,
    position: 0,
    memberTurnIndex: 0,
  }));
  const cfg: GameConfig = { ...config, participants };
  return {
    phase: 'awaitingDraw',
    config: cfg,
    boardEvents: placeEvents(events, config.boardLength, rng),
    currentIndex: 0,
    card: null,
    lastRoll: null,
    lastLanding: null,
    winners: [],
    endReason: null,
  };
}

// LOOP-01: draw one mission with equal probability. No-op if the library is empty
// (canStart guards this before a game starts).
export function drawCard(state: GameState, missions: Mission[], rng: Rng): GameState {
  const mission = uniformPick(missions, rng);
  if (!mission) return state;
  return { ...state, card: { mission }, phase: 'awaitingJudgement' };
}

// LOOP-04/05: instructor's manual verdict. Failure → no move, next turn.
// Success → proceed to the dice roll.
export function judge(state: GameState, success: boolean): GameState {
  if (success) return { ...state, phase: 'awaitingRoll' };
  // Fail: no landing this turn; clear it so advanceTurn never mistakes it for an extra.
  return advanceTurn({ ...state, lastLanding: null });
}

// LOOP-05/07/09: roll, move (overshoot allowed, D-03), apply the landed event, judge win.
export function rollDice(state: GameState, events: Event[], rng: Rng): GameState {
  const roll = rollDie(rng);
  const p = state.config.participants[state.currentIndex];
  const from = p.position;
  const boardLength = state.config.boardLength;
  const afterRoll = from + roll; // D-03: no upper clamp

  // Reaching OR passing finish wins immediately, before any event applies.
  if (afterRoll >= boardLength) {
    return {
      ...withPosition(state, afterRoll),
      phase: 'gameOver',
      winners: [p.id],
      endReason: 'reached-finish',
      lastRoll: roll,
      lastLanding: { eventId: null, eff: null, label: '', from, to: afterRoll, extraTurn: false },
    };
  }

  const eventId = state.boardEvents[afterRoll] ?? null;
  const ev = eventId ? events.find((e) => e.id === eventId) ?? null : null;
  let to = afterRoll;
  let extraTurn = false;
  if (ev) {
    if (ev.eff === 'forward') to = afterRoll + ev.steps; // may cross finish → re-judged below
    else if (ev.eff === 'backward') to = Math.max(0, afterRoll - ev.steps); // lower clamp only
    else if (ev.eff === 'extra') extraTurn = true; // steps===0 guaranteed by schema refine
  }
  const landing: LandingResult = {
    eventId,
    eff: ev?.eff ?? null,
    label: ev?.label ?? '',
    from,
    to,
    extraTurn,
  };

  if (to >= boardLength) {
    // A forward event pushed the token onto/over the finish → win.
    return {
      ...withPosition(state, to),
      phase: 'gameOver',
      winners: [p.id],
      endReason: 'reached-finish',
      lastRoll: roll,
      lastLanding: landing,
    };
  }
  return { ...withPosition(state, to), phase: 'turnResolved', lastRoll: roll, lastLanding: landing };
}

// LOOP-08 / D-01 / Pitfall 5: progress to the next turn.
// extraTurn → the SAME participant repeats with the SAME member (A4); consume the flag
// so it never loops forever. Otherwise advance to the next participant and rotate the
// LEAVING team's memberTurnIndex (so its next turn is performed by the next member).
export function advanceTurn(state: GameState): GameState {
  if (state.lastLanding?.extraTurn) {
    return { ...state, phase: 'awaitingDraw', card: null, lastRoll: null, lastLanding: null };
  }
  const n = state.config.participants.length;
  const leaving = state.currentIndex;
  const participants = state.config.participants.map((p, i) =>
    i === leaving
      ? { ...p, memberTurnIndex: (p.memberTurnIndex + 1) % (p.memberNames.length || 1) }
      : p,
  );
  return {
    ...state,
    config: { ...state.config, participants },
    currentIndex: (state.currentIndex + 1) % n,
    phase: 'awaitingDraw',
    card: null,
    lastRoll: null,
    lastLanding: null,
  };
}

// D-04/D-05, Pitfall 2: session end (timer hit 0 or "지금 마치기"). The furthest-along
// participant(s) win; a tie at the max position yields co-winners.
export function endGame(state: GameState, reason: 'timeout' | 'manual'): GameState {
  const ps = state.config.participants;
  const max = Math.max(...ps.map((p) => p.position));
  const winners = ps.filter((p) => p.position === max).map((p) => p.id);
  return { ...state, phase: 'gameOver', winners, endReason: reason };
}

// LOOP-10: restart with the same config (positions/members reset via createGame).
export function resetGame(
  state: GameState,
  missions: Mission[],
  events: Event[],
  rng: Rng,
): GameState {
  return createGame(state.config, missions, events, rng);
}
