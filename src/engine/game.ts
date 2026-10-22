// src/engine/game.ts — the v2 ring-board turn FSM (Phase 5):
//   awaitingRoll → awaitingJudgement → turnResolved → (next turn | gameOver)
// PHASE 5 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of src/store.ts / src/settings (content arrives only
//     through createGame and is snapshotted into the state),
//   - CLOCK-FREE (no wall-clock reads, no timers), and
//   - pure: every transition returns a new object and never mutates its input; every
//     random draw goes through the injected Rng.
// Every transition starts with a phase guard and returns the identical object when called in
// the wrong phase (double-tap safe). Every state-changing transition bumps log.seq by exactly 1
// and replaces log.events with this transition's domain events only (Phase 6 director feed).
import type { Difficulty, Mission } from '../schema';
import { buildBoard, DIFF_ORDER, shuffle } from './board';
import { moveBy, type RingPos } from './ring';
import { rollDie, type Rng } from './rng';
import { starsFor, winnersByStars } from './scoring';
import type {
  EndReason,
  GameConfig,
  GameContent,
  GameEvent,
  GameState,
  Participant,
  QuestCard,
  TurnInfo,
  UndoSnapshot,
} from './state';

type Decks = Record<Difficulty, Mission[]>;

const FRESH_TURN: TurnInfo = { isExtra: false, bonusPaid: false, extraGranted: false };

// ---------- selectors ----------

export function currentParticipant(state: GameState): Participant {
  return state.config.participants[state.currentIndex];
}

export function activeMember(state: GameState): string {
  const p = currentParticipant(state);
  return p.memberNames[p.memberTurnIndex] ?? p.name;
}

// ---------- internal helpers ----------

// Replace only the participant at `index` (v1 withPosition style).
function withParticipant(state: GameState, index: number, patch: Partial<Participant>): GameState {
  const participants = state.config.participants.map((p, i) => (i === index ? { ...p, ...patch } : p));
  return { ...state, config: { ...state.config, participants } };
}

function turnStartedEvent(state: GameState): GameEvent {
  return {
    t: 'turnStarted',
    pid: currentParticipant(state).id,
    member: activeMember(state),
    round: state.round,
    isExtra: state.turn.isExtra,
  };
}

function normalizeRounds(r: number): number {
  return Number.isFinite(r) ? Math.max(1, Math.floor(r)) : 1;
}

// Take one mission of `diff` from the END of its deck. An empty deck refills from the pool
// snapshot (never stuck — Pitfall 4). With `avoidId` (retryNew): a single-mission difficulty
// returns that same mission (D-15); otherwise the last deck entry with a different id is taken,
// refilling once from the pool if the deck holds none (no unbounded loop — Pitfall 8).
function drawFromDeck(
  pool: Decks,
  decks: Decks,
  diff: Difficulty,
  rng: Rng,
  avoidId?: string,
): { mission: Mission | null; decks: Decks } {
  const src = pool[diff];
  if (src.length === 0) return { mission: null, decks };
  if (avoidId !== undefined && src.length <= 1) return { mission: src[0], decks };

  let deck = decks[diff];
  if (deck.length === 0) deck = shuffle(src, rng);
  let i = deck.length - 1;
  if (avoidId !== undefined) {
    const findOther = (d: Mission[]) => {
      for (let k = d.length - 1; k >= 0; k--) if (d[k].id !== avoidId) return k;
      return -1;
    };
    i = findOther(deck);
    if (i < 0) {
      deck = shuffle(src, rng);
      i = findOther(deck);
      if (i < 0) i = deck.length - 1; // every pool entry shares the id — fall back to the top card
    }
  }
  const mission = deck[i];
  const rest = [...deck.slice(0, i), ...deck.slice(i + 1)];
  return { mission, decks: { ...decks, [diff]: rest } };
}

// ---------- transitions ----------

export function createGame(config: GameConfig, content: GameContent, rng: Rng): GameState {
  const rules = { ...config.rules, rounds: normalizeRounds(config.rules.rounds) };
  const participants = config.participants.map((p) => ({
    ...p,
    memberNames: p.memberNames.length > 0 ? [...p.memberNames] : [p.name],
    memberTurnIndex: 0,
    position: 0,
    travel: 0,
    lapsCredited: 0,
    stars: 0,
  }));
  const board = buildBoard(rules.boardSize, content.missions, content.events, rng);
  const pool = {} as Decks;
  const decks = {} as Decks;
  for (const d of DIFF_ORDER) {
    pool[d] = content.missions.filter((m) => m.diff === d).map((m) => ({ ...m, cats: [...m.cats] }));
    decks[d] = shuffle(pool[d], rng);
  }
  const base: GameState = {
    phase: 'awaitingRoll',
    config: { ...config, participants, rules },
    board,
    pool,
    decks,
    currentIndex: 0,
    round: 1,
    turn: { ...FRESH_TURN },
    card: null,
    lastMove: null,
    lastJudgement: null,
    winners: [],
    endReason: null,
    undo: null,
    log: { seq: 0, events: [] },
  };
  return { ...base, log: { seq: 1, events: [{ t: 'gameStarted' }, turnStartedEvent(base)] } };
}

// TURN-01/02/05/06/07: roll, move around the ring, resolve the landed tile once.
// rng is used only for the die and (when a deck runs out) the reshuffle.
export function rollDice(state: GameState, rng: Rng): GameState {
  if (state.phase !== 'awaitingRoll') return state;
  const L = state.board.length;
  const idx = state.currentIndex;
  const p = currentParticipant(state);
  const pid = p.id;
  const bonusStars = state.config.rules.startBonus;
  const events: GameEvent[] = [];
  const turn: TurnInfo = { ...state.turn };
  let stars = p.stars;
  let paid = 0;

  const payBonusIf = (earned: boolean) => {
    if (!earned) return;
    turn.bonusPaid = true;
    stars += bonusStars;
    paid += bonusStars;
    if (bonusStars > 0) events.push({ t: 'startBonus', pid, stars: bonusStars });
  };

  // (1) dice move
  const roll = rollDie(rng);
  events.push({ t: 'rolled', pid, face: roll });
  const m1 = moveBy(p, roll, L, !turn.bonusPaid);
  events.push({ t: 'moved', pid, path: m1.path, by: 'dice' });
  payBonusIf(m1.bonusEarned);
  let pos: RingPos = { travel: m1.travel, lapsCredited: m1.lapsCredited };
  const landed = m1.position;
  const landedTile = state.board[landed];
  events.push({ t: 'landed', pid, tile: landed, kind: landedTile.kind });

  // (2) one event resolution, never chained (D-07)
  let to = landed;
  let eventPath: number[] = [];
  let extraSuppressed = false;
  const ev = landedTile.kind === 'event' ? landedTile.event : null;
  if (ev) {
    if (ev.eff === 'extra') {
      extraSuppressed = turn.isExtra; // D-08: at most one extra in a row
      if (!extraSuppressed) turn.extraGranted = true;
      events.push({ t: 'eventApplied', pid, eff: ev.eff, steps: ev.steps, suppressed: extraSuppressed });
    } else {
      const steps = ev.eff === 'forward' ? ev.steps : -ev.steps;
      events.push({ t: 'eventApplied', pid, eff: ev.eff, steps: ev.steps, suppressed: false });
      if (steps !== 0) {
        const m2 = moveBy(pos, steps, L, !turn.bonusPaid); // backward never pays (steps < 0)
        events.push({ t: 'moved', pid, path: m2.path, by: 'event' });
        payBonusIf(m2.bonusEarned);
        pos = { travel: m2.travel, lapsCredited: m2.lapsCredited };
        to = m2.position;
        eventPath = m2.path;
        events.push({ t: 'landed', pid, tile: to, kind: state.board[to].kind });
      }
    }
  }

  // (3) final tile: a quest draws a card (also after an event move), anything else resolves
  const finalTile = state.board[to];
  let decks = state.decks;
  let card: QuestCard | null = null;
  if (finalTile.kind === 'quest') {
    const drawn = drawFromDeck(state.pool, state.decks, finalTile.diff, rng);
    decks = drawn.decks;
    if (drawn.mission) {
      card = { mission: drawn.mission, diff: finalTile.diff, stars: starsFor(finalTile.diff), attempt: 1 };
      events.push({
        t: 'questDrawn',
        pid,
        missionId: card.mission.id,
        diff: card.diff,
        stars: card.stars,
        attempt: 1,
      });
    }
  }

  const moved = withParticipant(state, idx, {
    travel: pos.travel,
    position: to,
    lapsCredited: pos.lapsCredited,
    stars,
  });
  return {
    ...moved,
    phase: card ? 'awaitingJudgement' : 'turnResolved',
    decks,
    turn,
    card,
    undo: null, // D-16: rolling closes the undo window
    lastJudgement: null,
    lastMove: {
      roll,
      dicePath: m1.path,
      landed,
      event: ev,
      eventPath,
      extraSuppressed,
      to,
      finalKind: finalTile.kind,
      startBonus: paid,
    },
    log: { seq: state.log.seq + 1, events },
  };
}

// Everything except the undo slot and the log (the log is never rewound — Pattern 6).
function snapshotOf(state: GameState): UndoSnapshot {
  const { undo: _undo, log: _log, ...core } = state;
  return core;
}

// TURN-03/04, D-02/D-03/D-14/D-15: the instructor's verdict on the drawn quest.
// Stars are only ever added. A retry never changes currentIndex or memberTurnIndex (D-21).
// The turn is never exited here — advanceTurn is the single turn-exit path.
export function judge(state: GameState, success: boolean, rng: Rng): GameState {
  if (state.phase !== 'awaitingJudgement' || !state.card) return state;
  const undo = snapshotOf(state); // D-16/D-17: captured BEFORE applying the verdict
  const card = state.card;
  const idx = state.currentIndex;
  const p = currentParticipant(state);
  const pid = p.id;
  const seq = state.log.seq + 1;

  if (success) {
    const s = withParticipant(state, idx, { stars: p.stars + card.stars }); // D-14: full stars on retry
    return {
      ...s,
      phase: 'turnResolved',
      card: null,
      undo,
      lastJudgement: { success: true, starsAwarded: card.stars, retry: false },
      log: { seq, events: [{ t: 'judged', pid, success: true, stars: card.stars }] },
    };
  }

  const failRule = state.config.rules.failRule;
  if (card.attempt === 1 && failRule !== 'noStar') {
    let decks = state.decks;
    let next: Mission = card.mission;
    if (failRule === 'retryNew') {
      const drawn = drawFromDeck(state.pool, state.decks, card.diff, rng, card.mission.id);
      if (drawn.mission) {
        next = drawn.mission;
        decks = drawn.decks;
      }
    }
    const retryCard: QuestCard = { ...card, mission: next, attempt: 2 };
    return {
      ...state,
      decks,
      card: retryCard,
      undo,
      lastJudgement: { success: false, starsAwarded: 0, retry: true },
      log: {
        seq,
        events: [
          { t: 'judged', pid, success: false, stars: 0 },
          { t: 'questDrawn', pid, missionId: next.id, diff: card.diff, stars: card.stars, attempt: 2 },
        ],
      },
    };
  }

  return {
    ...state,
    phase: 'turnResolved',
    card: null,
    undo,
    lastJudgement: { success: false, starsAwarded: 0, retry: false },
    log: { seq, events: [{ t: 'judged', pid, success: false, stars: 0 }] },
  };
}

// TURN-08, D-16/D-17: restore the state captured right before the last judgement.
// Not available at gameOver (A4). The log is not part of the snapshot, so seq keeps growing.
export function undoJudgement(state: GameState): GameState {
  if (!state.undo || state.phase === 'gameOver') return state;
  return {
    ...state.undo,
    undo: null,
    log: { seq: state.log.seq + 1, events: [{ t: 'judgementUndone' }] },
  };
}

function finish(state: GameState, reason: EndReason): GameState {
  const winners = winnersByStars(state.config.participants);
  return {
    ...state,
    phase: 'gameOver',
    card: null,
    undo: null,
    winners,
    endReason: reason,
    log: { seq: state.log.seq + 1, events: [{ t: 'gameEnded', reason, winners }] },
  };
}

// TURN-07, ROUND-01/03, D-08/D-18/D-21: the single turn-exit path.
export function advanceTurn(state: GameState): GameState {
  if (state.phase !== 'turnResolved') return state;
  const cleared = { card: null, lastMove: null, lastJudgement: null };

  // Extra branch FIRST: same participant and member, not counted as a round (D-08). The last
  // participant of the last round is allowed too — the game ends after the extra turn (D-18).
  if (state.turn.extraGranted) {
    const s: GameState = {
      ...state,
      ...cleared,
      phase: 'awaitingRoll',
      turn: { isExtra: true, bonusPaid: false, extraGranted: false }, // A5: separate turn for the bonus cap
    };
    return { ...s, log: { seq: state.log.seq + 1, events: [turnStartedEvent(s)] } };
  }

  // Rotate ONLY the leaving team's member (D-21).
  const n = state.config.participants.length;
  const leaving = state.currentIndex;
  const lp = state.config.participants[leaving];
  const rotated = withParticipant(state, leaving, {
    memberTurnIndex: (lp.memberTurnIndex + 1) % (lp.memberNames.length || 1),
  });
  const next = (leaving + 1) % n;
  // The ONLY place the round increases (ROUND-01, Pitfall 3).
  const round = next === 0 ? state.round + 1 : state.round;
  const maxRounds = state.config.rules.rounds;
  if (round > maxRounds) {
    return finish({ ...rotated, round: Math.min(state.round, maxRounds) }, 'rounds-complete');
  }
  const s: GameState = {
    ...rotated,
    ...cleared,
    currentIndex: next,
    round,
    phase: 'awaitingRoll',
    turn: { ...FRESH_TURN }, // undo is kept: the D-16 window lasts until the next roll
  };
  return { ...s, log: { seq: state.log.seq + 1, events: [turnStartedEvent(s)] } };
}

// ROUND-04, D-22: end now from any phase. A pending quest is voided with no stars.
export function endGame(state: GameState, reason: 'manual'): GameState {
  if (state.phase === 'gameOver') return state;
  return finish(state, reason);
}

export function canUndo(state: GameState): boolean {
  return state.undo !== null && state.phase !== 'gameOver';
}

// True when the next advanceTurn will end the game (last regular turn of the last round,
// with no pending extra turn).
export function willEndOnAdvance(state: GameState): boolean {
  if (state.phase !== 'turnResolved' || state.turn.extraGranted) return false;
  const n = state.config.participants.length;
  return (state.currentIndex + 1) % n === 0 && state.round >= state.config.rules.rounds;
}
