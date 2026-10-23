// src/engine/game.test.ts — deterministic scenario coverage for the v2 ring-board FSM.
// Every move outcome is scripted with dice(...) on a hand-made board (boardWith) so no test
// depends on mulberry32 output for movement.
import { describe, it, expect } from 'vitest';
import {
  activeMember,
  advanceTurn,
  canUndo,
  createGame,
  currentParticipant,
  endGame,
  judge,
  rollDice,
  undoJudgement,
  willEndOnAdvance,
} from './game';
import { mulberry32 } from './rng';
import { EMPTY_STATS } from './stats';
import { wrap } from './ring';
import {
  boardWith,
  dice,
  eventTile,
  makeGame,
  mission,
  patchParticipant,
  player,
  questTile,
} from './testkit';
import type { Difficulty, FailRule, GameConfig, GameEvent, GameState } from './state';

const L = 20;

// Start a scenario: participant 0 at the given travel (lapsCredited derived from it).
function at(s: GameState, travel: number, lapsCredited = Math.floor(travel / s.board.length)): GameState {
  return patchParticipant(s, 0, { travel, position: wrap(travel, s.board.length), lapsCredited });
}

const p0 = (s: GameState) => s.config.participants[0];

describe('createGame', () => {
  it('resets participants, starts round 1 awaitingRoll and logs gameStarted + turnStarted', () => {
    const config: GameConfig = {
      mode: 'solo',
      participants: [
        player('p1', 'A', 'bear', { position: 7, travel: 27, lapsCredited: 1, stars: 9, memberTurnIndex: 2, memberNames: [] }),
        player('p2', 'B', 'rabbit'),
      ],
      rules: { rounds: 3, failRule: 'retrySame', startBonus: 1, boardSize: 20 },
    };
    const missions = [mission('e1', 'easy'), mission('e2', 'easy'), mission('n1', 'normal'), mission('h1', 'hard')];
    const g = createGame(config, { missions, events: [] }, mulberry32(1));
    expect(g.phase).toBe('awaitingRoll');
    expect(g.round).toBe(1);
    expect(g.currentIndex).toBe(0);
    expect(g.turn).toEqual({ isExtra: false, bonusPaid: false, extraGranted: false });
    expect(g.board).toHaveLength(20);
    expect(g.card).toBeNull();
    expect(g.undo).toBeNull();
    expect(g.winners).toEqual([]);
    expect(g.endReason).toBeNull();
    const a = p0(g);
    expect(a).toMatchObject({ position: 0, travel: 0, lapsCredited: 0, stars: 0, memberTurnIndex: 0 });
    expect(a.memberNames).toEqual(['A']);
    expect(g.pool.easy.map((m) => m.id).sort()).toEqual(['e1', 'e2']);
    expect(g.pool.normal.map((m) => m.id)).toEqual(['n1']);
    expect(g.pool.hard.map((m) => m.id)).toEqual(['h1']);
    expect(g.decks.easy.map((m) => m.id).sort()).toEqual(['e1', 'e2']);
    expect(g.log).toEqual({
      seq: 1,
      events: [
        { t: 'gameStarted' },
        { t: 'turnStarted', pid: 'p1', member: 'A', round: 1, isExtra: false },
      ],
    });
  });

  it('normalizes rounds to an integer ≥ 1 (T-05-10)', () => {
    expect(makeGame({ rules: { rounds: 0 } }).config.rules.rounds).toBe(1);
    expect(makeGame({ rules: { rounds: 2.7 } }).config.rules.rounds).toBe(2);
    expect(makeGame({ rules: { rounds: Number.NaN } }).config.rules.rounds).toBe(1);
  });

  it('board length follows rules.boardSize', () => {
    expect(makeGame({ rules: { boardSize: 16 } }).board).toHaveLength(16);
    expect(makeGame({ rules: { boardSize: 24 } }).board).toHaveLength(24);
  });
});

describe('rollDice — guards (Pitfall 5, T-05-09)', () => {
  it('returns the identical object outside awaitingRoll', () => {
    const s = makeGame({ board: boardWith(L) });
    const rolled = rollDice(s, dice(2));
    expect(rolled.phase).toBe('awaitingJudgement');
    expect(rollDice(rolled, dice(3))).toBe(rolled);
    expect(rollDice({ ...s, phase: 'turnResolved' }, dice(3)).phase).toBe('turnResolved');
  });

  it('rollDice(rollDice(s)) changes state only once', () => {
    const s = makeGame({ board: boardWith(L) });
    const once = rollDice(s, dice(4));
    const twice = rollDice(once, dice(4));
    expect(twice).toBe(once);
    expect(p0(twice).travel).toBe(4);
    expect(twice.log.seq).toBe(s.log.seq + 1);
  });
});

describe('rollDice — dice move and quest draw (TURN-01, TURN-02)', () => {
  it('lands on a hard quest and draws a hard card', () => {
    const s = makeGame({ board: boardWith(L, { 3: questTile('hard') }) });
    const r = rollDice(s, dice(3));
    expect(r.phase).toBe('awaitingJudgement');
    expect(r.card).not.toBeNull();
    expect(r.card!.diff).toBe('hard');
    expect(r.card!.stars).toBe(3);
    expect(r.card!.attempt).toBe(1);
    expect(r.card!.mission.diff).toBe('hard');
    expect(r.lastMove).toEqual({
      roll: 3,
      dicePath: [1, 2, 3],
      landed: 3,
      event: null,
      eventPath: [],
      extraSuppressed: false,
      to: 3,
      finalKind: 'quest',
      startBonus: 0,
    });
    expect(p0(r)).toMatchObject({ position: 3, travel: 3, stars: 0 });
    expect(r.log.seq).toBe(s.log.seq + 1);
    expect(r.log.events).toEqual([
      { t: 'rolled', pid: 'p1', face: 3 },
      { t: 'moved', pid: 'p1', path: [1, 2, 3], by: 'dice' },
      { t: 'landed', pid: 'p1', tile: 3, kind: 'quest' },
      { t: 'questDrawn', pid: 'p1', missionId: r.card!.mission.id, diff: 'hard', stars: 3, attempt: 1 },
    ]);
  });

  it('pays the start bonus when passing start (D-09)', () => {
    const s = at(makeGame({ board: boardWith(L) }), 18);
    const r = rollDice(s, dice(4));
    expect(p0(r)).toMatchObject({ position: 2, travel: 22, lapsCredited: 1, stars: 1 });
    expect(r.lastMove!.startBonus).toBe(1);
    expect(r.lastMove!.dicePath).toEqual([19, 0, 1, 2]);
    expect(r.turn.bonusPaid).toBe(true);
    expect(r.log.events).toContainEqual({ t: 'startBonus', pid: 'p1', stars: 1 });
    expect(r.log.events.map((e) => e.t)).toEqual(['rolled', 'moved', 'startBonus', 'landed', 'questDrawn']);
  });

  it('startBonus 2 pays two stars', () => {
    const s = at(makeGame({ board: boardWith(L), rules: { startBonus: 2 } }), 18);
    const r = rollDice(s, dice(4));
    expect(p0(r).stars).toBe(2);
    expect(r.lastMove!.startBonus).toBe(2);
  });

  it('startBonus 0 pays nothing and logs no startBonus event', () => {
    const s = at(makeGame({ board: boardWith(L), rules: { startBonus: 0 } }), 18);
    const r = rollDice(s, dice(4));
    expect(p0(r).stars).toBe(0);
    expect(p0(r).lapsCredited).toBe(1);
    expect(r.lastMove!.startBonus).toBe(0);
    expect(r.log.events.some((e) => e.t === 'startBonus')).toBe(false);
  });

  it('landing exactly on start pays the bonus and resolves the turn', () => {
    const s = at(makeGame({ board: boardWith(L) }), 17);
    const r = rollDice(s, dice(3));
    expect(p0(r)).toMatchObject({ position: 0, stars: 1 });
    expect(r.phase).toBe('turnResolved');
    expect(r.card).toBeNull();
    expect(r.lastMove!.finalKind).toBe('start');
    expect(r.lastMove!.to).toBe(0);
  });

  it('no bonus when the lap was already credited', () => {
    const s = at(makeGame({ board: boardWith(L) }), 38, 2); // lap 1 position 18, lap 2 already credited
    const r = rollDice(s, dice(4));
    expect(p0(r).stars).toBe(0);
    expect(r.lastMove!.startBonus).toBe(0);
  });
});

describe('rollDice — events (TURN-05, D-07, D-08)', () => {
  it('RESEARCH example: 18 + 4 → 2 (bonus), forward 3 → 5 hard quest', () => {
    const board = boardWith(L, { 2: eventTile('forward', 3), 5: questTile('hard') });
    const s = at(makeGame({ board }), 18);
    const r = rollDice(s, dice(4));
    expect(r.phase).toBe('awaitingJudgement');
    expect(r.card!.stars).toBe(3);
    expect(r.card!.diff).toBe('hard');
    expect(p0(r)).toMatchObject({ position: 5, travel: 25, stars: 1 });
    expect(r.lastMove).toMatchObject({
      roll: 4,
      landed: 2,
      eventPath: [3, 4, 5],
      to: 5,
      finalKind: 'quest',
      startBonus: 1,
      extraSuppressed: false,
    });
    expect(r.lastMove!.event).toMatchObject({ eff: 'forward', steps: 3 });
    expect(r.log.events.map((e) => e.t)).toEqual([
      'rolled',
      'moved',
      'startBonus',
      'landed',
      'eventApplied',
      'moved',
      'landed',
      'questDrawn',
    ]);
    expect(r.log.events).toContainEqual({ t: 'moved', pid: 'p1', path: [3, 4, 5], by: 'event' });
    expect(r.log.events).toContainEqual({ t: 'eventApplied', pid: 'p1', eff: 'forward', steps: 3, suppressed: false });
  });

  it('a forward event crossing start again in the same turn pays no second bonus', () => {
    const board = boardWith(L, { 2: eventTile('forward', 20) });
    const s = at(makeGame({ board }), 18);
    const r = rollDice(s, dice(4));
    expect(p0(r)).toMatchObject({ travel: 42, position: 2, lapsCredited: 2, stars: 1 });
    expect(r.log.events.filter((e) => e.t === 'startBonus')).toHaveLength(1);
  });

  it('a forward event that crosses start pays the bonus when dice did not', () => {
    const board = boardWith(L, { 17: eventTile('forward', 5) });
    const s = at(makeGame({ board }), 15);
    const r = rollDice(s, dice(2));
    expect(p0(r)).toMatchObject({ travel: 22, position: 2, stars: 1 });
    expect(r.lastMove!.startBonus).toBe(1);
    expect(r.phase).toBe('awaitingJudgement');
  });

  it('forward event onto another event tile resolves with no chaining (D-07)', () => {
    const board = boardWith(L, { 2: eventTile('forward', 3), 5: eventTile('forward', 4) });
    const r = rollDice(makeGame({ board }), dice(2));
    expect(p0(r).position).toBe(5);
    expect(r.phase).toBe('turnResolved');
    expect(r.card).toBeNull();
    expect(r.lastMove!.finalKind).toBe('event');
    expect(r.log.events.filter((e) => e.t === 'eventApplied')).toHaveLength(1);
  });

  it('forward event onto the start tile resolves the turn (and pays the bonus)', () => {
    const board = boardWith(L, { 17: eventTile('forward', 3) });
    const s = at(makeGame({ board }), 15);
    const r = rollDice(s, dice(2));
    expect(p0(r)).toMatchObject({ position: 0, stars: 1 });
    expect(r.phase).toBe('turnResolved');
    expect(r.lastMove!.finalKind).toBe('start');
  });

  it('backward event landing on a quest draws that quest (TURN-05)', () => {
    const board = boardWith(L, { 6: eventTile('backward', 2), 4: questTile('normal') });
    const r = rollDice(makeGame({ board }), dice(6));
    expect(p0(r).position).toBe(4);
    expect(r.phase).toBe('awaitingJudgement');
    expect(r.card!.diff).toBe('normal');
    expect(r.card!.stars).toBe(2);
    expect(r.lastMove!.eventPath).toEqual([5, 4]);
  });

  it('backward event across start wraps to the end of the ring with no bonus', () => {
    const board = boardWith(L, { 1: eventTile('backward', 3) });
    const r = rollDice(makeGame({ board }), dice(1));
    expect(p0(r)).toMatchObject({ position: 18, travel: -2, stars: 0, lapsCredited: 0 });
    expect(r.lastMove!.eventPath).toEqual([0, 19, 18]);
    expect(r.lastMove!.startBonus).toBe(0);
  });

  it('16-tile board: forward 20 wraps more than a lap, at most one bonus this turn', () => {
    const board = boardWith(16, { 2: eventTile('forward', 20) });
    const s = at(makeGame({ board, rules: { boardSize: 16 } }), 14);
    const r = rollDice(s, dice(4));
    expect(p0(r).travel).toBe(38);
    expect(p0(r).position).toBe(wrap(38, 16));
    expect(p0(r).stars).toBe(1);
    expect(r.log.events.filter((e) => e.t === 'startBonus')).toHaveLength(1);
  });

  it('extra event grants an extra turn on a regular turn (D-08)', () => {
    const board = boardWith(L, { 3: eventTile('extra', 0) });
    const r = rollDice(makeGame({ board }), dice(3));
    expect(r.phase).toBe('turnResolved');
    expect(r.turn.extraGranted).toBe(true);
    expect(r.lastMove!.extraSuppressed).toBe(false);
    expect(r.lastMove!.finalKind).toBe('event');
    expect(r.log.events).toContainEqual({ t: 'eventApplied', pid: 'p1', eff: 'extra', steps: 0, suppressed: false });
  });

  it('extra event during an extra turn is suppressed (D-08)', () => {
    const board = boardWith(L, { 3: eventTile('extra', 0) });
    const s = makeGame({ board, patch: (g) => ({ ...g, turn: { isExtra: true, bonusPaid: false, extraGranted: false } }) });
    const r = rollDice(s, dice(3));
    expect(r.phase).toBe('turnResolved');
    expect(r.turn.extraGranted).toBe(false);
    expect(r.lastMove!.extraSuppressed).toBe(true);
    expect(r.log.events).toContainEqual({ t: 'eventApplied', pid: 'p1', eff: 'extra', steps: 0, suppressed: true });
  });
});

describe('rollDice — undo window and board identity (D-16, BOARD-04)', () => {
  it('clears undo and lastJudgement', () => {
    const base = makeGame({ board: boardWith(L) });
    const { undo: _u, log: _l, ...core } = base;
    const s: GameState = { ...base, undo: core, lastJudgement: { success: true, starsAwarded: 1, retry: false } };
    const r = rollDice(s, dice(2));
    expect(r.undo).toBeNull();
    expect(r.lastJudgement).toBeNull();
  });

  it('keeps the same board reference', () => {
    const s = makeGame();
    const r = rollDice(s, dice(5));
    expect(r.board).toBe(s.board);
  });
});

describe('deck draw (TURN-02, Pitfall 4)', () => {
  it('draws distinct missions until the deck empties, then refills from the pool', () => {
    const missions = [mission('e1', 'easy'), mission('e2', 'easy')];
    const reset = (s: GameState): GameState => ({ ...s, phase: 'awaitingRoll', card: null });
    let s = makeGame({ missions, board: boardWith(L) });
    expect(s.decks.easy).toHaveLength(2);
    s = rollDice(s, dice(1));
    const first = s.card!.mission.id;
    expect(s.decks.easy).toHaveLength(1);
    s = rollDice(reset(s), dice(1));
    const second = s.card!.mission.id;
    expect(second).not.toBe(first);
    expect(s.decks.easy).toHaveLength(0);
    s = rollDice(reset(s), dice(1));
    expect(s.phase).toBe('awaitingJudgement');
    expect(['e1', 'e2']).toContain(s.card!.mission.id);
    expect(s.decks.easy).toHaveLength(1);
    expect(s.pool.easy).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------------------------
// Task 2: judge · undoJudgement · advanceTurn · endGame · selectors
// ---------------------------------------------------------------------------------------------

// A game whose whole ring is `diff` quests, already rolled onto square 1 (awaitingJudgement).
function onQuest(diff: Difficulty, failRule: FailRule = 'retrySame', extra: Parameters<typeof makeGame>[0] = {}): GameState {
  const L0 = extra.board?.length ?? L;
  const board = extra.board ?? boardWith(L0, Object.fromEntries(Array.from({ length: L0 - 1 }, (_, i) => [i + 1, questTile(diff)])));
  const s = makeGame({ ...extra, board, rules: { failRule, ...extra.rules } });
  const r = rollDice(s, dice(1));
  if (r.phase !== 'awaitingJudgement') throw new Error('scenario did not reach a quest');
  return r;
}

// Play one turn on an all-quest board: roll 1, judge success when a quest is drawn, then advance.
function playTurn(s: GameState, success = true): GameState {
  let r = rollDice(s, dice(1));
  while (r.phase === 'awaitingJudgement') r = judge(r, success, dice(1)); // a fail may grant one retry
  return advanceTurn(r);
}

const turnStarts = (events: GameEvent[]) =>
  events.filter((e): e is Extract<GameEvent, { t: 'turnStarted' }> => e.t === 'turnStarted');

describe('judge — guards', () => {
  it('returns the identical object outside awaitingJudgement or without a card', () => {
    const s = makeGame({ board: boardWith(L) });
    expect(judge(s, true, dice(1))).toBe(s);
    const q = onQuest('easy');
    const noCard: GameState = { ...q, card: null };
    expect(judge(noCard, true, dice(1))).toBe(noCard);
    const done = judge(q, true, dice(1));
    expect(judge(done, true, dice(1))).toBe(done);
  });
});

describe('judge — success stars by tile difficulty (TURN-03, D-02)', () => {
  it.each([
    ['easy', 1],
    ['normal', 2],
    ['hard', 3],
  ] as const)('%s quest success → +%i stars', (diff, n) => {
    const q = onQuest(diff);
    const r = judge(q, true, dice(1));
    expect(p0(r).stars).toBe(n);
    expect(r.phase).toBe('turnResolved');
    expect(r.card).toBeNull();
    expect(r.lastJudgement).toEqual({ success: true, starsAwarded: n, retry: false });
    expect(r.log.seq).toBe(q.log.seq + 1);
    expect(r.log.events).toEqual([{ t: 'judged', pid: 'p1', success: true, stars: n }]);
  });
});

describe('judge — fail rules (TURN-04, D-03, D-14, D-15)', () => {
  it('retrySame: first fail keeps the same mission at attempt 2', () => {
    const q = onQuest('normal', 'retrySame');
    const r = judge(q, false, dice(1));
    expect(r.phase).toBe('awaitingJudgement');
    expect(r.card!.mission.id).toBe(q.card!.mission.id);
    expect(r.card!.attempt).toBe(2);
    expect(r.card!.stars).toBe(2);
    expect(p0(r).stars).toBe(0);
    expect(r.lastJudgement).toEqual({ success: false, starsAwarded: 0, retry: true });
    expect(r.log.events).toEqual([
      { t: 'judged', pid: 'p1', success: false, stars: 0 },
      { t: 'questDrawn', pid: 'p1', missionId: q.card!.mission.id, diff: 'normal', stars: 2, attempt: 2 },
    ]);
  });

  it('retrySame: second fail resolves with no stars (one retry only)', () => {
    const r = judge(judge(onQuest('normal', 'retrySame'), false, dice(1)), false, dice(1));
    expect(r.phase).toBe('turnResolved');
    expect(r.card).toBeNull();
    expect(p0(r).stars).toBe(0);
    expect(r.lastJudgement).toEqual({ success: false, starsAwarded: 0, retry: false });
  });

  it('D-14: retry success pays the full card stars', () => {
    const r = judge(judge(onQuest('hard', 'retrySame'), false, dice(1)), true, dice(1));
    expect(p0(r).stars).toBe(3);
    expect(r.lastJudgement).toEqual({ success: true, starsAwarded: 3, retry: false });
  });

  it('retryNew: the attempt-2 card is a different mission of the same difficulty (50 seeds)', () => {
    const missions = ['a', 'b', 'c', 'd'].map((id) => mission(id, 'easy'));
    for (let seed = 1; seed <= 50; seed++) {
      const q = onQuest('easy', 'retryNew', { seed, missions });
      const r = judge(q, false, mulberry32(seed));
      expect(r.card!.attempt).toBe(2);
      expect(r.card!.diff).toBe('easy');
      expect(r.card!.mission.id).not.toBe(q.card!.mission.id);
    }
  });

  it('retryNew: an exhausted deck refills and still avoids the current mission (Pitfall 8)', () => {
    const missions = [mission('a', 'easy'), mission('b', 'easy')];
    for (let seed = 1; seed <= 20; seed++) {
      const q0 = onQuest('easy', 'retryNew', { seed, missions });
      const q: GameState = { ...q0, decks: { ...q0.decks, easy: [] } };
      const r = judge(q, false, mulberry32(seed));
      expect(r.card!.mission.id).not.toBe(q.card!.mission.id);
    }
  });

  it('D-15 retryNew with exactly one mission of that difficulty retries the same mission', () => {
    const missions = [mission('solo-easy', 'easy'), mission('n1', 'normal')];
    const q = onQuest('easy', 'retryNew', { missions });
    const r = judge(q, false, dice(1));
    expect(r.phase).toBe('awaitingJudgement');
    expect(r.card!.mission.id).toBe('solo-easy');
    expect(r.card!.attempt).toBe(2);
  });

  it('noStar: first fail resolves immediately with no retry', () => {
    const r = judge(onQuest('hard', 'noStar'), false, dice(1));
    expect(r.phase).toBe('turnResolved');
    expect(r.card).toBeNull();
    expect(p0(r).stars).toBe(0);
    expect(r.lastJudgement).toEqual({ success: false, starsAwarded: 0, retry: false });
  });

  it('team retry keeps the same member and participant (D-21)', () => {
    const q = onQuest('easy', 'retrySame', {
      mode: 'team',
      participants: [
        player('t1', 'Team1', 'bear', { memberNames: ['a', 'b', 'c'] }),
        player('t2', 'Team2', 'rabbit', { memberNames: ['d'] }),
      ],
      patch: (g) => patchParticipant(g, 0, { memberTurnIndex: 1 }),
    });
    expect(activeMember(q)).toBe('b');
    const r = judge(q, false, dice(1));
    expect(r.currentIndex).toBe(0);
    expect(p0(r).memberTurnIndex).toBe(1);
    expect(activeMember(r)).toBe('b');
  });
});

describe('undoJudgement (TURN-08, D-16, D-17)', () => {
  it('D-17: undo after a success restores the same card, stars and lastJudgement', () => {
    const q = onQuest('hard');
    const j = judge(q, true, dice(1));
    expect(canUndo(j)).toBe(true);
    const u = undoJudgement(j);
    expect(u.phase).toBe('awaitingJudgement');
    expect(u.card).toEqual(q.card);
    expect(u.card!.attempt).toBe(1);
    expect(p0(u).stars).toBe(0);
    expect(u.lastJudgement).toEqual(q.lastJudgement);
    expect(u.undo).toBeNull();
    expect(u.log).toEqual({ seq: j.log.seq + 1, events: [{ t: 'judgementUndone' }] });
  });

  it('D-16: only the last judgement — a second undo is a no-op', () => {
    const u = undoJudgement(judge(onQuest('easy'), true, dice(1)));
    expect(canUndo(u)).toBe(false);
    expect(undoJudgement(u)).toBe(u);
  });

  it('undo after a retry-granting fail returns to the attempt-1 card', () => {
    const q = onQuest('normal', 'retrySame');
    const u = undoJudgement(judge(q, false, dice(1)));
    expect(u.card).toEqual(q.card);
    expect(u.card!.attempt).toBe(1);
  });

  it('fail → success → undo goes back to attempt 2 (latest judgement only)', () => {
    const f = judge(onQuest('normal', 'retrySame'), false, dice(1));
    const u = undoJudgement(judge(f, true, dice(1)));
    expect(u.phase).toBe('awaitingJudgement');
    expect(u.card!.attempt).toBe(2);
    expect(p0(u).stars).toBe(0);
    expect(u.lastJudgement).toEqual(f.lastJudgement);
  });

  it('undo after advanceTurn restores the previous participant, round, card and stars', () => {
    const q = onQuest('hard');
    const a = advanceTurn(judge(q, true, dice(1)));
    expect(a.currentIndex).toBe(1);
    expect(a.phase).toBe('awaitingRoll');
    expect(canUndo(a)).toBe(true);
    const u = undoJudgement(a);
    expect(u.currentIndex).toBe(0);
    expect(u.round).toBe(1);
    expect(u.phase).toBe('awaitingJudgement');
    expect(u.card).toEqual(q.card);
    expect(u.turn).toEqual(q.turn);
    expect(u.decks).toEqual(q.decks);
    expect(u.config.participants).toEqual(q.config.participants);
  });

  it('D-16: rollDice closes the undo window', () => {
    const a = advanceTurn(judge(onQuest('easy'), true, dice(1)));
    const r = rollDice(a, dice(1));
    expect(canUndo(r)).toBe(false);
    expect(undoJudgement(r)).toBe(r);
  });

  it('A4: no undo at gameOver', () => {
    const j = judge(onQuest('easy'), true, dice(1));
    const over: GameState = { ...j, phase: 'gameOver' };
    expect(canUndo(over)).toBe(false);
    expect(undoJudgement(over)).toBe(over);
    expect(endGame(j, 'manual').undo).toBeNull();
  });

  it('log seq never rewinds across judge → undo → judge', () => {
    const q = onQuest('easy');
    const j = judge(q, true, dice(1));
    const u = undoJudgement(j);
    const j2 = judge(u, false, dice(1));
    expect([q.log.seq, j.log.seq, u.log.seq, j2.log.seq]).toEqual([q.log.seq, q.log.seq + 1, q.log.seq + 2, q.log.seq + 3]);
  });
});

describe('advanceTurn — turns and rounds (ROUND-01, ROUND-03, TURN-07)', () => {
  const three = () => [player('p1', 'A', 'bear'), player('p2', 'B', 'rabbit'), player('p3', 'C', 'cat')];

  it('returns the identical object outside turnResolved', () => {
    const s = makeGame({ board: boardWith(L) });
    expect(advanceTurn(s)).toBe(s);
    const q = onQuest('easy');
    expect(advanceTurn(q)).toBe(q);
  });

  it('3 solo players × 2 rounds → exactly 6 regular turns, then rounds-complete', () => {
    let s = makeGame({ participants: three(), rules: { rounds: 2 }, board: boardWith(L) });
    const all: GameEvent[] = [...s.log.events];
    let turns = 0;
    while (s.phase !== 'gameOver' && turns < 50) {
      expect(s.round).toBeLessThanOrEqual(2);
      s = playTurn(s);
      all.push(...s.log.events);
      turns++;
    }
    expect(turns).toBe(6);
    expect(s.phase).toBe('gameOver');
    expect(s.endReason).toBe('rounds-complete');
    expect(s.round).toBe(2);
    expect(turnStarts(all).map((e) => `${e.pid}@${e.round}`)).toEqual([
      'p1@1', 'p2@1', 'p3@1', 'p1@2', 'p2@2', 'p3@2',
    ]);
    expect(s.log.events.at(-1)).toEqual({ t: 'gameEnded', reason: 'rounds-complete', winners: ['p1', 'p2', 'p3'] });
    expect(s.winners).toEqual(['p1', 'p2', 'p3']);
  });

  it('extra turn: same participant and member, isExtra, round unchanged; a nested extra is suppressed', () => {
    const board = boardWith(L, { 1: eventTile('extra'), 2: eventTile('extra') });
    const s = makeGame({ participants: three(), board });
    const r1 = rollDice(s, dice(1));
    expect(r1.turn.extraGranted).toBe(true);
    expect(willEndOnAdvance(r1)).toBe(false);
    const x = advanceTurn(r1);
    expect(x.phase).toBe('awaitingRoll');
    expect(x.currentIndex).toBe(0);
    expect(x.round).toBe(1);
    expect(x.turn).toEqual({ isExtra: true, bonusPaid: false, extraGranted: false });
    expect(x.card).toBeNull();
    expect(x.lastMove).toBeNull();
    expect(x.log.events).toEqual([{ t: 'turnStarted', pid: 'p1', member: 'A', round: 1, isExtra: true }]);
    const r2 = rollDice(x, dice(1));
    expect(r2.lastMove!.extraSuppressed).toBe(true);
    expect(r2.turn.extraGranted).toBe(false);
    const n = advanceTurn(r2);
    expect(n.currentIndex).toBe(1);
    expect(n.turn.isExtra).toBe(false);
    expect(n.round).toBe(1);
  });

  it('D-18: the last participant of the last round may take an extra turn, then the game ends', () => {
    const board = boardWith(L, { 2: eventTile('extra') });
    let s = makeGame({ rules: { rounds: 1 }, board });
    s = rollDice(s, dice(1)); // p1 → easy quest at 1
    s = judge(s, true, dice(1));
    expect(willEndOnAdvance(s)).toBe(false); // p2 still to play
    s = advanceTurn(s);
    s = rollDice(s, dice(2)); // p2 → extra at 2
    expect(s.turn.extraGranted).toBe(true);
    expect(willEndOnAdvance(s)).toBe(false);
    s = advanceTurn(s);
    expect(s.phase).toBe('awaitingRoll');
    expect(s.currentIndex).toBe(1);
    expect(s.turn.isExtra).toBe(true);
    s = rollDice(s, dice(1)); // p2 → easy quest at 3
    s = judge(s, true, dice(1));
    expect(willEndOnAdvance(s)).toBe(true);
    s = advanceTurn(s);
    expect(s.phase).toBe('gameOver');
    expect(s.endReason).toBe('rounds-complete');
    expect(s.round).toBe(1);
    expect(s.winners).toEqual(['p1', 'p2']);
  });

  it('teams [a,b,c] and [d] × 2 rounds → 4 team turns, rotating only the leaving team (D-21)', () => {
    let s = makeGame({
      mode: 'team',
      rules: { rounds: 2 },
      board: boardWith(L),
      participants: [
        player('t1', 'Team1', 'bear', { memberNames: ['a', 'b', 'c'] }),
        player('t2', 'Team2', 'rabbit', { memberNames: ['d'] }),
      ],
    });
    const all: GameEvent[] = [...s.log.events];
    let turns = 0;
    while (s.phase !== 'gameOver' && turns < 20) {
      s = playTurn(s, false);
      all.push(...s.log.events);
      turns++;
    }
    expect(turns).toBe(4);
    expect(turnStarts(all).map((e) => `${e.pid}:${e.member}`)).toEqual(['t1:a', 't2:d', 't1:b', 't2:d']);
  });
});

describe('endGame (ROUND-04, D-22) and selectors', () => {
  it('D-22: manual end from awaitingJudgement voids the card, keeps stars and picks all tied leaders', () => {
    const three = [player('p1', 'A', 'bear'), player('p2', 'B', 'rabbit'), player('p3', 'C', 'cat')];
    const q = onQuest('hard', 'retrySame', { participants: three });
    const s = patchParticipant(patchParticipant(patchParticipant(q, 0, { stars: 3 }), 1, { stars: 3 }), 2, { stars: 1 });
    const e = endGame(s, 'manual');
    expect(e.phase).toBe('gameOver');
    expect(e.card).toBeNull();
    expect(e.undo).toBeNull();
    expect(e.endReason).toBe('manual');
    expect(e.config.participants.map((p) => p.stars)).toEqual([3, 3, 1]);
    expect(e.winners).toEqual(['p1', 'p2']);
    expect(e.log).toEqual({ seq: s.log.seq + 1, events: [{ t: 'gameEnded', reason: 'manual', winners: ['p1', 'p2'] }] });
    expect(endGame(e, 'manual')).toBe(e);
  });

  it('manual end works from awaitingRoll and turnResolved too', () => {
    const s = makeGame({ board: boardWith(L) });
    expect(endGame(s, 'manual').phase).toBe('gameOver');
    const j = judge(onQuest('easy'), true, dice(1));
    const e = endGame(j, 'manual');
    expect(e.winners).toEqual(['p1']);
    expect(e.board).toBe(j.board);
  });

  it('activeMember / currentParticipant', () => {
    const s = makeGame({
      mode: 'team',
      participants: [
        player('t1', 'Team1', 'bear', { memberNames: ['a', 'b'] }),
        player('t2', 'Team2', 'rabbit', { memberNames: ['d'] }),
      ],
    });
    expect(currentParticipant(s).id).toBe('t1');
    expect(activeMember(s)).toBe('a');
    expect(activeMember(patchParticipant(s, 0, { memberTurnIndex: 1 }))).toBe('b');
    expect(activeMember(patchParticipant(s, 0, { memberNames: [] }))).toBe('Team1');
    expect(currentParticipant({ ...s, currentIndex: 1 }).id).toBe('t2');
  });

  it('willEndOnAdvance is false outside turnResolved', () => {
    const s = makeGame({ rules: { rounds: 1 }, board: boardWith(L) });
    expect(willEndOnAdvance(s)).toBe(false);
    expect(willEndOnAdvance(endGame(s, 'manual'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// Phase 8: per-participant game stats (D-15)
// ---------------------------------------------------------------------------------------------

describe('stats (D-15)', () => {
  const st = (s: GameState, pid = 'p1') => s.stats[pid];

  it('createGame starts every participant at all zeros (restart = createGame again)', () => {
    const s = makeGame({ participants: [player('a', 'A', 'bear'), player('b', 'B', 'rabbit')] });
    expect(s.stats).toEqual({ a: EMPTY_STATS, b: EMPTY_STATS });
    const played = judge(rollDice(makeGame({ board: boardWith(L) }), dice(1)), true, dice(1));
    expect(st(played).attempts).toBe(1);
    const again = makeGame({ board: boardWith(L) });
    expect(again.stats).toEqual({ p1: EMPTY_STATS, p2: EMPTY_STATS });
  });

  it('✅ on a hard attempt-1 card counts attempt, success and hard success', () => {
    const r = judge(onQuest('hard'), true, dice(1));
    expect(st(r)).toEqual({ ...EMPTY_STATS, attempts: 1, successes: 1, hardSuccesses: 1 });
    expect(st(r, 'p2')).toEqual(EMPTY_STATS);
  });

  it('✅ on an easy card is not a hard success', () => {
    const r = judge(onQuest('easy'), true, dice(1));
    expect(st(r)).toEqual({ ...EMPTY_STATS, attempts: 1, successes: 1 });
  });

  it('❌ (retrySame) then ✅ on the retry counts a retry success', () => {
    const f = judge(onQuest('normal', 'retrySame'), false, dice(1));
    expect(f.card!.attempt).toBe(2);
    expect(st(f)).toEqual({ ...EMPTY_STATS, attempts: 1, failures: 1 });
    const r = judge(f, true, dice(1));
    expect(st(r)).toEqual({ ...EMPTY_STATS, attempts: 2, failures: 1, successes: 1, retrySuccesses: 1 });
  });

  it('❌ twice counts two failures', () => {
    const r = judge(judge(onQuest('normal', 'retryNew'), false, dice(1)), false, dice(1));
    expect(r.phase).toBe('turnResolved');
    expect(st(r)).toEqual({ ...EMPTY_STATS, attempts: 2, failures: 2 });
  });

  it('❌ with failRule noStar counts one attempt and one failure', () => {
    const r = judge(onQuest('hard', 'noStar'), false, dice(1));
    expect(r.phase).toBe('turnResolved');
    expect(st(r)).toEqual({ ...EMPTY_STATS, attempts: 1, failures: 1 });
  });

  it('undoJudgement after a ✅ restores the pre-verdict stats exactly', () => {
    const q = onQuest('hard');
    const u = undoJudgement(judge(q, true, dice(1)));
    expect(u.stats).toEqual(q.stats);
    expect(st(u)).toEqual(EMPTY_STATS);
  });

  it('undo of a retry success restores the failure-only stats', () => {
    const f = judge(onQuest('normal', 'retrySame'), false, dice(1));
    const u = undoJudgement(judge(f, true, dice(1)));
    expect(u.stats).toEqual(f.stats);
  });

  it('endGame(manual) over a pending quest does not count an attempt', () => {
    const q = onQuest('hard');
    const e = endGame(q, 'manual');
    expect(e.phase).toBe('gameOver');
    expect(e.stats).toEqual(q.stats);
    expect(st(e).attempts).toBe(0);
  });

  it('passing start with startBonus 1 counts one lucky moment', () => {
    const r = rollDice(at(makeGame({ board: boardWith(L) }), 18), dice(4));
    expect(r.lastMove!.startBonus).toBe(1);
    expect(st(r).luckyCount).toBe(1);
  });

  it('passing start with startBonus 0 is not lucky', () => {
    const r = rollDice(at(makeGame({ board: boardWith(L), rules: { startBonus: 0 } }), 18), dice(4));
    expect(st(r).luckyCount).toBe(0);
  });

  it('start bonus + lucky forward event in one roll counts twice', () => {
    const board = boardWith(L, { 2: eventTile('forward', 3), 5: questTile('hard') });
    const r = rollDice(at(makeGame({ board }), 18), dice(4));
    expect(r.lastMove!.startBonus).toBe(1);
    expect(st(r).luckyCount).toBe(2);
  });

  const landOn = (tile: ReturnType<typeof eventTile>, patch?: (g: GameState) => GameState) =>
    rollDice(makeGame({ board: boardWith(L, { 3: tile }), patch }), dice(3));

  it('forward event with no label is lucky', () => {
    expect(st(landOn(eventTile('forward', 2))).luckyCount).toBe(1);
  });

  it('backward event with no label is not lucky', () => {
    expect(st(landOn(eventTile('backward', 2))).luckyCount).toBe(0);
  });

  it('forward event labelled 함정 is not lucky', () => {
    expect(st(landOn(eventTile('forward', 2, { label: '함정' }))).luckyCount).toBe(0);
  });

  it('backward event labelled 보너스 is lucky', () => {
    expect(st(landOn(eventTile('backward', 2, { label: '보너스' }))).luckyCount).toBe(1);
  });

  it('a granted extra is lucky, a suppressed extra is not', () => {
    const granted = landOn(eventTile('extra'));
    expect(granted.turn.extraGranted).toBe(true);
    expect(st(granted).luckyCount).toBe(1);
    const suppressed = landOn(eventTile('extra'), (g) => ({
      ...g,
      turn: { isExtra: true, bonusPaid: false, extraGranted: false },
    }));
    expect(suppressed.lastMove!.extraSuppressed).toBe(true);
    expect(st(suppressed).luckyCount).toBe(0);
  });

  it('transitions never mutate the input stats', () => {
    const q = onQuest('hard');
    const before = JSON.stringify(q.stats);
    judge(q, true, dice(1));
    judge(q, false, dice(1));
    expect(JSON.stringify(q.stats)).toBe(before);
  });
});
