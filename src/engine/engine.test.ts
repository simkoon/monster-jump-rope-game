// src/engine/engine.test.ts — exhaustive turn-FSM coverage with deterministic RNG.
// Randomness is controlled two ways: seeded mulberry32 (full-game / draw) and a
// fixedRng stub (single-face die) for exact event-landing assertions.
import { describe, it, expect } from 'vitest';
import {
  createGame,
  drawCard,
  judge,
  rollDice,
  advanceTurn,
  endGame,
  resetGame,
} from './engine';
import { buildParticipants } from './setup';
import { mulberry32, type Rng } from './rng';
import type { GameConfig, GameState } from './types';
import type { Event, Mission } from '../schema';

// A stub Rng returning a constant → rollDie = 1 + floor(v*6). v=0 → roll 1.
const fixedRng = (v: number): Rng => ({ next: () => v });

const mission = (id: string): Mission => ({ id, name: id, desc: '', diff: 'easy', cats: [] });
const missions: Mission[] = [mission('m1'), mission('m2')];

function soloConfig(boardLength: number, position = 0): GameConfig {
  const ps = buildParticipants('solo', 1, ['P1'], ['boy']);
  ps[0].position = position;
  return { mode: 'solo', participants: ps, boardLength, timeLimitMs: null };
}

// Build a game then overwrite boardEvents deterministically (bypasses placement RNG).
function gameWithBoard(config: GameConfig, boardEvents: (string | null)[]): GameState {
  const g = createGame(config, missions, [], mulberry32(1));
  return { ...g, boardEvents };
}

describe('createGame', () => {
  it('starts awaitingDraw at index 0 with no winners and positions reset to 0', () => {
    const cfg = soloConfig(20, 7); // stale position should be normalized
    const g = createGame(cfg, missions, [], mulberry32(1));
    expect(g.phase).toBe('awaitingDraw');
    expect(g.currentIndex).toBe(0);
    expect(g.winners).toEqual([]);
    expect(g.endReason).toBeNull();
    expect(g.config.participants[0].position).toBe(0);
    expect(g.boardEvents).toHaveLength(21);
  });
});

describe('drawCard (LOOP-01)', () => {
  it('draws a mission and moves to awaitingJudgement', () => {
    const g = createGame(soloConfig(20), missions, [], mulberry32(1));
    const d = drawCard(g, missions, mulberry32(3));
    expect(d.phase).toBe('awaitingJudgement');
    expect(d.card).not.toBeNull();
    expect(missions.map((m) => m.id)).toContain(d.card!.mission.id);
  });
});

describe('judge (LOOP-04/05)', () => {
  it('failure → no move, advances to next participant, phase awaitingDraw', () => {
    const ps = buildParticipants('solo', 2, ['A', 'B'], ['boy', 'girl']);
    const cfg: GameConfig = { mode: 'solo', participants: ps, boardLength: 20, timeLimitMs: null };
    let g = createGame(cfg, missions, [], mulberry32(1));
    g = drawCard(g, missions, mulberry32(3));
    const before = g.config.participants[0].position;
    const j = judge(g, false);
    expect(j.phase).toBe('awaitingDraw');
    expect(j.currentIndex).toBe(1);
    expect(j.config.participants[0].position).toBe(before); // unchanged
    expect(j.card).toBeNull();
  });

  it('success → awaitingRoll', () => {
    const g = drawCard(createGame(soloConfig(20), missions, [], mulberry32(1)), missions, mulberry32(3));
    expect(judge(g, true).phase).toBe('awaitingRoll');
  });
});

describe('rollDice — movement + win (D-03 overshoot)', () => {
  it('plain move with no event → position += roll, turnResolved', () => {
    const g = { ...gameWithBoard(soloConfig(30), new Array(31).fill(null)), phase: 'awaitingRoll' as const };
    const r = rollDice(g, [], fixedRng(0)); // roll 1
    expect(r.phase).toBe('turnResolved');
    expect(r.config.participants[0].position).toBe(1);
    expect(r.lastRoll).toBe(1);
    expect(r.lastLanding!.eventId).toBeNull();
  });

  it('reaching OR passing finish wins immediately with no exact landing and no upper clamp', () => {
    // position 4 on a length-5 board: any roll 1..6 overshoots → win
    const g = { ...gameWithBoard(soloConfig(5, 4), new Array(6).fill(null)), phase: 'awaitingRoll' as const };
    const r = rollDice(g, [], fixedRng(0.99)); // roll 6 → afterRoll 10
    expect(r.phase).toBe('gameOver');
    expect(r.endReason).toBe('reached-finish');
    expect(r.winners).toEqual([g.config.participants[0].id]);
    expect(r.config.participants[0].position).toBe(10); // NOT clamped to 5
  });

  it('a forward event that crosses the finish also wins (LOOP-09)', () => {
    const board = new Array(11).fill(null);
    board[1] = 'ev';
    const fwd: Event = { id: 'ev', name: 'jump', eff: 'forward', steps: 9, weight: 1, label: '보너스' };
    const g = { ...gameWithBoard(soloConfig(10), board), phase: 'awaitingRoll' as const };
    const r = rollDice(g, [fwd], fixedRng(0)); // roll 1 → square 1 → +9 → 10 → win
    expect(r.phase).toBe('gameOver');
    expect(r.endReason).toBe('reached-finish');
    expect(r.config.participants[0].position).toBe(10);
    expect(r.lastLanding!.eff).toBe('forward');
  });

  it('a backward event clamps at 0, never negative (LOOP-07)', () => {
    const board = new Array(11).fill(null);
    board[1] = 'bk';
    const bk: Event = { id: 'bk', name: 'trip', eff: 'backward', steps: 5, weight: 1, label: '함정' };
    const g = { ...gameWithBoard(soloConfig(10), board), phase: 'awaitingRoll' as const };
    const r = rollDice(g, [bk], fixedRng(0)); // roll 1 → square 1 → -5 → clamp 0
    expect(r.phase).toBe('turnResolved');
    expect(r.config.participants[0].position).toBe(0);
    expect(r.lastLanding!.eff).toBe('backward');
  });

  it('an extra event sets extraTurn and keeps phase turnResolved (LOOP-07)', () => {
    const board = new Array(11).fill(null);
    board[1] = 'ex';
    const ex: Event = { id: 'ex', name: 'again', eff: 'extra', steps: 0, weight: 1, label: '보너스' };
    const g = { ...gameWithBoard(soloConfig(10), board), phase: 'awaitingRoll' as const };
    const r = rollDice(g, [ex], fixedRng(0));
    expect(r.phase).toBe('turnResolved');
    expect(r.lastLanding!.extraTurn).toBe(true);
    expect(r.config.participants[0].position).toBe(1);
  });
});

describe('advanceTurn — extra vs next (LOOP-08, D-01)', () => {
  it('after an extra turn, the SAME participant repeats (and same member)', () => {
    const ps = buildParticipants('team', 2, ['A팀', 'B팀'], ['boy', 'girl'], [['a1', 'a2'], ['b1', 'b2']]);
    const cfg: GameConfig = { mode: 'team', participants: ps, boardLength: 20, timeLimitMs: null };
    const g = createGame(cfg, missions, [], mulberry32(1));
    const withExtra: GameState = {
      ...g,
      lastLanding: { eventId: 'x', eff: 'extra', label: '', from: 0, to: 0, extraTurn: true },
    };
    const a = advanceTurn(withExtra);
    expect(a.currentIndex).toBe(0); // same participant
    expect(a.config.participants[0].memberTurnIndex).toBe(0); // same member (A4)
    expect(a.phase).toBe('awaitingDraw');
    expect(a.lastLanding).toBeNull(); // extra consumed → no infinite repeat
  });

  it('a normal turn advances to the next participant and rotates the leaving team member', () => {
    const ps = buildParticipants('team', 2, ['A팀', 'B팀'], ['boy', 'girl'], [['a1', 'a2'], ['b1', 'b2']]);
    const cfg: GameConfig = { mode: 'team', participants: ps, boardLength: 20, timeLimitMs: null };
    const g = createGame(cfg, missions, [], mulberry32(1));
    const resolved: GameState = {
      ...g,
      lastLanding: { eventId: null, eff: null, label: '', from: 0, to: 3, extraTurn: false },
    };
    const a = advanceTurn(resolved);
    expect(a.currentIndex).toBe(1); // next team
    expect(a.config.participants[0].memberTurnIndex).toBe(1); // leaving team rotates its member
    expect(a.config.participants[1].memberTurnIndex).toBe(0); // untouched
    expect(a.config.participants).toHaveLength(2); // still ONE token per team
  });
});

describe('endGame — timeout / manual leaders (D-04/D-05)', () => {
  it('timeout tie at max position yields co-winners', () => {
    const ps = buildParticipants('solo', 3, ['A', 'B', 'C'], ['boy', 'girl', 'boy']);
    ps[0].position = 5;
    ps[1].position = 5;
    ps[2].position = 2;
    const cfg: GameConfig = { mode: 'solo', participants: ps, boardLength: 20, timeLimitMs: null };
    const g = createGame(cfg, missions, [], mulberry32(1));
    // createGame resets positions → re-apply for this leader test
    const played: GameState = {
      ...g,
      config: { ...g.config, participants: ps },
    };
    const e = endGame(played, 'timeout');
    expect(e.phase).toBe('gameOver');
    expect(e.endReason).toBe('timeout');
    expect(e.winners.sort()).toEqual([ps[0].id, ps[1].id].sort());
    expect(e.winners.length).toBe(2);
  });

  it('manual end → the single furthest-along participant wins', () => {
    const ps = buildParticipants('solo', 2, ['A', 'B'], ['boy', 'girl']);
    ps[0].position = 3;
    ps[1].position = 8;
    const cfg: GameConfig = { mode: 'solo', participants: ps, boardLength: 20, timeLimitMs: null };
    const g = createGame(cfg, missions, [], mulberry32(1));
    const played: GameState = { ...g, config: { ...g.config, participants: ps } };
    const e = endGame(played, 'manual');
    expect(e.winners).toEqual([ps[1].id]);
    expect(e.endReason).toBe('manual');
  });
});

describe('resetGame (LOOP-10)', () => {
  it('returns a fresh awaitingDraw game with positions reset', () => {
    const cfg = soloConfig(20, 12);
    const g = createGame(cfg, missions, [], mulberry32(1));
    const advanced: GameState = {
      ...g,
      phase: 'gameOver',
      config: { ...g.config, participants: g.config.participants.map((p) => ({ ...p, position: 15 })) },
    };
    const r = resetGame(advanced, missions, [], mulberry32(1));
    expect(r.phase).toBe('awaitingDraw');
    expect(r.config.participants[0].position).toBe(0);
    expect(r.winners).toEqual([]);
  });
});

describe('full seeded games', () => {
  it('drives a solo game start→win with a single winner', () => {
    const events: Event[] = [
      { id: 'f', name: '앞으로', eff: 'forward', steps: 2, weight: 3, label: '보너스' },
      { id: 'b', name: '뒤로', eff: 'backward', steps: 1, weight: 1, label: '함정' },
    ];
    const rng = mulberry32(20260725);
    let g = createGame(soloConfig(15), missions, events, rng);
    let guard = 0;
    while (g.phase !== 'gameOver' && guard++ < 5000) {
      g = drawCard(g, missions, rng);
      g = judge(g, true); // always succeed → keeps advancing toward a win
      g = rollDice(g, events, rng);
      if (g.phase === 'turnResolved') g = advanceTurn(g);
    }
    expect(g.phase).toBe('gameOver');
    expect(g.endReason).toBe('reached-finish');
    expect(g.winners).toHaveLength(1);
    expect(g.winners[0]).toBe(g.config.participants[0].id);
  });

  it('team game shares one token and rotates members across turns', () => {
    const ps = buildParticipants('team', 2, ['A팀', 'B팀'], ['boy', 'girl'], [['a1', 'a2'], ['b1', 'b2']]);
    const cfg: GameConfig = { mode: 'team', participants: ps, boardLength: 30, timeLimitMs: null };
    const rng = mulberry32(555);
    let g = createGame(cfg, missions, [], rng);
    // Play several non-extra full turns; assert one token per team the whole time.
    for (let t = 0; t < 4; t++) {
      g = drawCard(g, missions, rng);
      g = judge(g, true);
      g = rollDice(g, [], rng);
      if (g.phase === 'gameOver') break;
      g = advanceTurn(g);
      expect(g.config.participants).toHaveLength(2); // never one-token-per-member
    }
    // After 2 full rounds (4 turns) each team's member index has rotated at least once.
    const rotated = g.config.participants.some((p) => p.memberTurnIndex > 0);
    expect(rotated).toBe(true);
  });
});
