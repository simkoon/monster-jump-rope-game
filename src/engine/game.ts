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
import { starsFor } from './scoring';
import type {
  GameConfig,
  GameContent,
  GameEvent,
  GameState,
  Participant,
  QuestCard,
  TurnInfo,
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
