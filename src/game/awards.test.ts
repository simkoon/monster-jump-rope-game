// src/game/awards.test.ts — praise badge assignment (D-14, END-02): deterministic, everyone ≥ 1.
import { describe, it, expect } from 'vitest';
import { awardBadges, BADGE_PRIORITY, displayBadges, MAX_SHOWN_BADGES, type BadgeId } from './awards';
import { ANIMALS } from '../engine/animals';
import { advanceTurn, judge, rollDice } from '../engine/game';
import { mulberry32, type Rng } from '../engine/rng';
import { EMPTY_STATS } from '../engine/stats';
import { event, makeGame, mission, player } from '../engine/testkit';
import type { BoardSize, Difficulty, Effect, FailRule, GameState, PlayerStats, StartBonus } from '../engine/state';

const S = (over: Partial<PlayerStats> = {}): PlayerStats => ({ ...EMPTY_STATS, ...over });
const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng.next() * (hi - lo + 1));
const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng.next() * xs.length)];

const inPriorityOrder = (list: readonly BadgeId[]) => {
  const idx = list.map((b) => BADGE_PRIORITY.indexOf(b));
  return idx.every((v, i) => v >= 0 && (i === 0 || v > idx[i - 1]));
};

function checkInvariants(stats: Readonly<Record<string, PlayerStats>>, ps: readonly { id: string; travel: number }[]) {
  const out = awardBadges(stats, ps);
  expect(Object.keys(out).sort()).toEqual(ps.map((p) => p.id).sort());
  for (const p of ps) {
    const list = out[p.id];
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(inPriorityOrder(list)).toBe(true);
    if (list.includes('cheer')) expect(list).toEqual(['cheer']);
    const shown = displayBadges(list);
    expect(shown.length).toBeGreaterThanOrEqual(1);
    expect(shown.length).toBeLessThanOrEqual(2);
  }
  // permuting the participant order never changes anyone's badge set
  const reversed = awardBadges(stats, [...ps].reverse());
  for (const p of ps) expect(reversed[p.id]).toEqual(out[p.id]);
  return out;
}

describe('awardBadges (D-14)', () => {
  it('priority order and display cap are fixed', () => {
    expect(BADGE_PRIORITY).toEqual(['master', 'persistent', 'lucky', 'traveler', 'challenger', 'cheer']);
    expect(MAX_SHOWN_BADGES).toBe(2);
  });

  it('hard successes → 고수왕, travel ties → 여행왕 for both', () => {
    const stats = { a: S({ hardSuccesses: 1 }), b: S(), c: S() };
    const ps = [
      { id: 'a', travel: 5 },
      { id: 'b', travel: 9 },
      { id: 'c', travel: 9 },
    ];
    expect(awardBadges(stats, ps)).toEqual({ a: ['master'], b: ['traveler'], c: ['traveler'] });
  });

  it('ties at the max all receive the badge', () => {
    const stats = { a: S({ retrySuccesses: 2 }), b: S({ retrySuccesses: 2 }), c: S({ retrySuccesses: 1 }) };
    const ps = ['a', 'b', 'c'].map((id) => ({ id, travel: 0 }));
    const out = awardBadges(stats, ps);
    expect(out.a).toEqual(['persistent']);
    expect(out.b).toEqual(['persistent']);
    expect(out.c).toEqual(['cheer']);
  });

  it('a rule whose max is 0 awards nobody (A1) — everyone falls back to 응원왕', () => {
    const ps = ['a', 'b'].map((id) => ({ id, travel: 0 }));
    expect(awardBadges({ a: S(), b: S() }, ps)).toEqual({ a: ['cheer'], b: ['cheer'] });
  });

  it('a participant may hold several badges, listed in priority order', () => {
    const stats = {
      a: S({ attempts: 5, successes: 3, failures: 2, hardSuccesses: 2, retrySuccesses: 1, luckyCount: 3 }),
      b: S({ attempts: 2, successes: 2, luckyCount: 3 }),
    };
    const ps = [
      { id: 'a', travel: 10 },
      { id: 'b', travel: 30 },
    ];
    const out = awardBadges(stats, ps);
    expect(out.a).toEqual(['master', 'persistent', 'lucky', 'challenger']);
    expect(out.b).toEqual(['lucky', 'traveler']);
    expect(displayBadges(out.a)).toEqual(['master', 'persistent']);
    expect(displayBadges(out.b)).toEqual(['lucky', 'traveler']);
  });

  it('cheer goes only to participants with nothing else', () => {
    const stats = { a: S({ attempts: 1, successes: 1 }), b: S() };
    const out = awardBadges(stats, [
      { id: 'a', travel: 3 },
      { id: 'b', travel: 0 },
    ]);
    expect(out.a).toEqual(['traveler', 'challenger']);
    expect(out.b).toEqual(['cheer']);
  });

  it('missing stats are treated as all zero', () => {
    const out = awardBadges({}, [
      { id: 'a', travel: 4 },
      { id: 'b', travel: 0 },
    ]);
    expect(out).toEqual({ a: ['traveler'], b: ['cheer'] });
  });

  it('is deterministic and does not mutate its inputs', () => {
    const stats = Object.freeze({ a: Object.freeze(S({ luckyCount: 2 })), b: Object.freeze(S({ attempts: 1, failures: 1 })) });
    const ps = Object.freeze([Object.freeze({ id: 'a', travel: 1 }), Object.freeze({ id: 'b', travel: 1 })]);
    const first = awardBadges(stats, ps);
    expect(awardBadges(stats, ps)).toEqual(first);
    expect(first).toEqual({ a: ['lucky', 'traveler'], b: ['traveler', 'challenger'] });
  });

  it('displayBadges keeps the first ≤ 2 and never mutates the input', () => {
    const list: BadgeId[] = ['master', 'lucky', 'challenger'];
    expect(displayBadges(list)).toEqual(['master', 'lucky']);
    expect(list).toEqual(['master', 'lucky', 'challenger']);
    expect(displayBadges(['cheer'])).toEqual(['cheer']);
  });
});

// Play one random legal game to gameOver (same driving approach as engine/fuzz.test.ts).
function randomFinishedGame(seed: number): GameState {
  const rng = mulberry32(seed);
  const n = int(rng, 2, 8);
  const missions = Array.from({ length: int(rng, 1, 10) }, (_, i) =>
    mission(`m${i}`, pick<Difficulty>(rng, ['easy', 'normal', 'hard'])),
  );
  const events = Array.from({ length: int(rng, 0, 6) }, (_, i) => {
    const eff = pick<Effect>(rng, ['forward', 'backward', 'extra']);
    return event(`ev${i}`, eff, eff === 'extra' ? 0 : int(rng, 1, 12), int(rng, 0, 5), {
      label: pick(rng, ['', '', '보너스', '함정'] as const),
    });
  });
  let s = makeGame({
    seed,
    participants: Array.from({ length: n }, (_, i) => player(`p${i + 1}`, `P${i + 1}`, ANIMALS[i])),
    rules: {
      rounds: int(rng, 1, 5),
      failRule: pick<FailRule>(rng, ['retrySame', 'retryNew', 'noStar']),
      startBonus: pick<StartBonus>(rng, [0, 1, 2]),
      boardSize: pick<BoardSize>(rng, [16, 20, 24]),
    },
    missions,
    events,
  });
  for (let step = 0; step < 5000 && s.phase !== 'gameOver'; step++) {
    s =
      s.phase === 'awaitingRoll'
        ? rollDice(s, rng)
        : s.phase === 'awaitingJudgement'
          ? judge(s, rng.next() < 0.6, rng)
          : advanceTurn(s);
  }
  return s;
}

describe('awardBadges — property (every participant ≥ 1 badge, shows 1–2)', () => {
  it('300 fuzzed engine games with 2–8 participants', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const g = randomFinishedGame(seed);
      expect(g.phase).toBe('gameOver');
      checkInvariants(g.stats, g.config.participants);
    }
  });

  it('500 random stat tables', () => {
    const rng = mulberry32(8080);
    for (let t = 0; t < 500; t++) {
      const n = int(rng, 2, 8);
      const ps = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, travel: int(rng, 0, 3) * int(rng, 0, 20) }));
      const stats: Record<string, PlayerStats> = {};
      for (const p of ps) {
        const successes = int(rng, 0, 4);
        const failures = int(rng, 0, 4);
        stats[p.id] = {
          attempts: successes + failures,
          successes,
          failures,
          retrySuccesses: int(rng, 0, successes),
          hardSuccesses: int(rng, 0, successes),
          luckyCount: int(rng, 0, 3),
        };
      }
      checkInvariants(stats, ps);
    }
  });
});
