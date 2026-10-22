// src/engine/game.test.ts — deterministic scenario coverage for the v2 ring-board FSM.
// Every move outcome is scripted with dice(...) on a hand-made board (boardWith) so no test
// depends on mulberry32 output for movement.
import { describe, it, expect } from 'vitest';
import { createGame, rollDice } from './game';
import { mulberry32 } from './rng';
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
import type { GameConfig, GameState } from './state';

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
