// src/engine/fuzz.test.ts — whole-game invariants over 300 seeded random games (T-05-10, BOARD-04).
import { describe, it, expect } from 'vitest';
import { advanceTurn, createGame, judge, rollDice } from './game';
import { ANIMALS } from './animals';
import { wrap } from './ring';
import { mulberry32, type Rng } from './rng';
import { winnersByStars } from './scoring';
import { event, mission, player } from './testkit';
import type { BoardSize, Difficulty, Effect, FailRule, GameConfig, GameContent, GameEvent, GameState, StartBonus } from './state';

const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng.next() * (hi - lo + 1));
const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng.next() * xs.length)];

function randomConfig(rng: Rng): GameConfig {
  const mode = rng.next() < 0.5 ? 'solo' : 'team';
  const n = int(rng, 1, 8);
  const participants = Array.from({ length: n }, (_, i) => {
    const members = mode === 'team' ? int(rng, 1, 3) : 1;
    const name = `P${i + 1}`;
    return player(`p${i + 1}`, name, ANIMALS[i], {
      memberNames: mode === 'team' ? Array.from({ length: members }, (_, k) => `${name}-${k}`) : [name],
    });
  });
  return {
    mode,
    participants,
    rules: {
      rounds: int(rng, 1, 6),
      failRule: pick<FailRule>(rng, ['retrySame', 'retryNew', 'noStar']),
      startBonus: pick<StartBonus>(rng, [0, 1, 2]),
      boardSize: pick<BoardSize>(rng, [16, 20, 24]),
    },
  };
}

function randomContent(rng: Rng): GameContent {
  const missions = Array.from({ length: int(rng, 1, 12) }, (_, i) =>
    mission(`m${i}`, pick<Difficulty>(rng, ['easy', 'normal', 'hard'])),
  );
  const events = Array.from({ length: int(rng, 0, 6) }, (_, i) => {
    const eff = pick<Effect>(rng, ['forward', 'backward', 'extra']);
    return event(`ev${i}`, eff, eff === 'extra' ? 0 : int(rng, 1, 20), int(rng, 0, 5));
  });
  return { missions, events };
}

const seeds = Array.from({ length: 300 }, (_, i) => i + 1);

describe('fuzz: whole-game invariants', () => {
  it.each(seeds)('seed %i', (seed) => {
    const rng = mulberry32(seed);
    let s: GameState = createGame(randomConfig(rng), randomContent(rng), rng);
    const board = s.board;
    const L = board.length;
    const rounds = s.config.rules.rounds;
    const all: GameEvent[] = [...s.log.events];
    let prevExtraPid: string | null = null;

    let step = 0;
    for (; step < 5000 && s.phase !== 'gameOver'; step++) {
      const before = s;
      s =
        s.phase === 'awaitingRoll'
          ? rollDice(s, rng)
          : s.phase === 'awaitingJudgement'
            ? judge(s, rng.next() < 0.6, rng)
            : advanceTurn(s);

      expect(s).not.toBe(before); // every chosen transition is legal in its phase
      expect(s.log.seq).toBe(before.log.seq + 1);
      expect(s.board).toBe(board); // BOARD-04
      expect(s.round).toBeGreaterThanOrEqual(1);
      expect(s.round).toBeLessThanOrEqual(rounds);
      s.config.participants.forEach((p, i) => {
        expect(p.stars).toBeGreaterThanOrEqual(before.config.participants[i].stars); // D-02
        expect(p.position).toBeGreaterThanOrEqual(0);
        expect(p.position).toBeLessThan(L);
        expect(p.position).toBe(wrap(p.travel, L));
      });
      if (s.phase === 'awaitingJudgement') {
        const tile = s.board[s.config.participants[s.currentIndex].position];
        expect(tile.kind).toBe('quest');
        expect(s.card).not.toBeNull();
        expect(tile.kind === 'quest' && tile.diff).toBe(s.card!.diff);
      }
      for (const e of s.log.events) {
        if (e.t !== 'turnStarted') continue;
        if (e.isExtra) {
          expect(prevExtraPid).not.toBe(e.pid); // never two extra turns in a row
          prevExtraPid = e.pid;
        } else {
          prevExtraPid = null;
        }
      }
      all.push(...s.log.events);
    }

    expect(s.phase).toBe('gameOver');
    expect(s.endReason).toBe('rounds-complete');
    const regular = new Map<string, number>();
    for (const e of all) if (e.t === 'turnStarted' && !e.isExtra) regular.set(e.pid, (regular.get(e.pid) ?? 0) + 1);
    for (const p of s.config.participants) expect(regular.get(p.id)).toBe(rounds);
    expect(s.winners).toEqual(winnersByStars(s.config.participants));
  });
});
