// src/game/director/displayed.test.ts — display state model + the 300-seed fuzz invariant
// (06-02 Task 1, D-01): applying a transition's beats to the previous displayed state must
// equal the engine's positions and stars, so no beat is ever missing.
import { describe, it, expect } from 'vitest';
import { advanceTurn, canUndo, createGame, judge, rollDice, undoJudgement } from '../../engine/game';
import { ANIMALS } from '../../engine/animals';
import { mulberry32, type Rng } from '../../engine/rng';
import { event, makeGame, mission, patchParticipant, player } from '../../engine/testkit';
import type {
  BoardSize,
  Difficulty,
  FailRule,
  GameConfig,
  GameContent,
  GameState,
  StartBonus,
} from '../../engine/state';
import { applyBeat, displayedFrom, EMPTY_DISPLAYED, type Displayed } from './displayed';
import { buildTimeline, type BeatKind, type BeatSpec } from './timeline';

describe('displayedFrom', () => {
  it('maps every participant id to its engine position and stars', () => {
    expect(displayedFrom(makeGame())).toEqual({ positions: { p1: 0, p2: 0 }, stars: { p1: 0, p2: 0 } });
    const g = patchParticipant(makeGame(), 1, { position: 7, stars: 4 });
    expect(displayedFrom(g)).toEqual({ positions: { p1: 0, p2: 7 }, stars: { p1: 0, p2: 4 } });
  });

  it('EMPTY_DISPLAYED has no entries', () => {
    expect(EMPTY_DISPLAYED).toEqual({ positions: {}, stars: {} });
  });
});

describe('applyBeat', () => {
  const base = (): Displayed => ({ positions: { p1: 2, p2: 5 }, stars: { p1: 1, p2: 0 } });

  it('hop sets positions[pid] to the last path tile, without mutating the input', () => {
    const d = base();
    const snap = structuredClone(d);
    const out = applyBeat(d, { kind: 'hop', pid: 'p1', path: [3, 4, 5], by: 'dice', ms: 750 });
    expect(out.positions).toEqual({ p1: 5, p2: 5 });
    expect(out.stars).toBe(d.stars);
    expect(d).toEqual(snap);
  });

  it('startBonus and stars add to stars[pid], without mutating the input', () => {
    const d = base();
    const snap = structuredClone(d);
    const a = applyBeat(d, { kind: 'startBonus', pid: 'p2', stars: 2, ms: 800 });
    const b = applyBeat(a, { kind: 'stars', pid: 'p2', stars: 3, ms: 600 });
    expect(a.stars).toEqual({ p1: 1, p2: 2 });
    expect(b.stars).toEqual({ p1: 1, p2: 5 });
    expect(b.positions).toBe(d.positions);
    expect(d).toEqual(snap);
  });

  it('every other beat returns the same object', () => {
    const d = base();
    const others: BeatSpec[] = [
      { kind: 'dice', pid: 'p1', face: 3, ms: 1000 },
      { kind: 'preview', pid: 'p1', path: [3], ms: 500 },
      { kind: 'event', pid: 'p1', eff: 'forward', steps: 3, suppressed: false, name: '', label: '', ms: 1000 },
      { kind: 'finalRound', ms: 1500 },
    ];
    for (const beat of others) expect(applyBeat(d, beat)).toBe(d);
  });
});

// ---------- fuzz: 300 seeded games ----------

const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng.next() * (hi - lo + 1));
const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng.next() * xs.length)];

function randomConfig(rng: Rng): GameConfig {
  const mode = rng.next() < 0.5 ? 'solo' : 'team';
  const n = int(rng, 1, 6);
  const participants = Array.from({ length: n }, (_, i) => {
    const name = `P${i + 1}`;
    return player(`p${i + 1}`, name, ANIMALS[i], {
      memberNames: mode === 'team' ? Array.from({ length: int(rng, 1, 3) }, (_, k) => `${name}-${k}`) : [name],
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

// Events of all three effects, always with a positive weight so they land on the board.
function randomContent(rng: Rng): GameContent {
  const missions = Array.from({ length: int(rng, 1, 10) }, (_, i) =>
    mission(`m${i}`, pick<Difficulty>(rng, ['easy', 'normal', 'hard'])),
  );
  const events = [
    event('fw', 'forward', int(rng, 1, 20), int(rng, 1, 5)),
    event('bw', 'backward', int(rng, 1, 20), int(rng, 1, 5)),
    event('ex', 'extra', 0, int(rng, 1, 5)),
  ];
  return { missions, events };
}

const SEEDS = 300;
const MAX_TRANSITIONS = 200;

describe('fuzz: beats reproduce the engine (D-01)', () => {
  it(`for ${SEEDS} seeded games, prev displayed + beats === next engine (undo, gameEnded excepted)`, () => {
    const seen = new Set<BeatKind>();
    let checked = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const rng = mulberry32(seed);
      let s: GameState = createGame(randomConfig(rng), randomContent(rng), rng);
      for (let step = 0; step < MAX_TRANSITIONS && s.phase !== 'gameOver'; step++) {
        const prev = s;
        let isUndo = false;
        if (s.phase === 'awaitingRoll') s = rollDice(s, rng);
        else if (s.phase === 'awaitingJudgement') s = judge(s, rng.next() < 0.5, rng);
        else if (canUndo(s) && rng.next() < 0.2) {
          s = undoJudgement(s);
          isUndo = true;
        } else s = advanceTurn(s);

        expect(s, `seed ${seed} step ${step}: transition was a no-op`).not.toBe(prev);
        if (isUndo || s.phase === 'gameOver') continue;

        const ctx = {
          totalRounds: s.config.rules.rounds,
          firstPid: s.config.participants[0].id,
          reducedMotion: false,
          lastEvent: s.lastMove?.event ?? null,
          animalOf: Object.fromEntries(s.config.participants.map((x) => [x.id, x.animal])),
        };
        const beats = buildTimeline(s.log.events, ctx);
        beats.forEach((b) => seen.add(b.kind));
        const applied = beats.reduce(applyBeat, displayedFrom(prev));
        expect(applied, `seed ${seed} step ${step}`).toEqual(displayedFrom(s));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(SEEDS * 10);
    // The fuzz must actually exercise every beat kind, or it proves nothing.
    expect([...seen].sort()).toEqual(
      // gameOver transitions are skipped above, so 'win' never appears here (07-01).
      (['dice', 'event', 'finalRound', 'hop', 'miss', 'preview', 'startBonus', 'stars'] as BeatKind[]).sort(),
    );
  });
});
