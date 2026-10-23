// src/game/director/timeline.test.ts — engine log → beat mapping (06-02 Task 1, D-19, D-24;
// Phase 7 07-01: miss / win reaction beats, stars 900 ms, D-12~D-16).
// Every scenario drives the REAL engine transitions so the event order is the engine's own.
import { describe, it, expect } from 'vitest';
import { advanceTurn, endGame, judge, rollDice, undoJudgement } from '../../engine/game';
import { boardWith, dice, eventTile, makeGame, patchParticipant, questTile } from '../../engine/testkit';
import type { GameEvent, GameState } from '../../engine/state';
import {
  BEAT_MS,
  budgetMs,
  buildTimeline,
  hopMs,
  isBannerBeat,
  isTimedBeat,
  type BeatSpec,
  type TimelineCtx,
} from './timeline';

const ctxOf = (g: GameState, reducedMotion = false): TimelineCtx => ({
  totalRounds: g.config.rules.rounds,
  firstPid: g.config.participants[0].id,
  reducedMotion,
  lastEvent: g.lastMove?.event ?? null,
  animalOf: Object.fromEntries(g.config.participants.map((p) => [p.id, p.animal])),
});

const beatsOf = (g: GameState, reducedMotion = false) => buildTimeline(g.log.events, ctxOf(g, reducedMotion));
const kinds = (beats: readonly BeatSpec[]) => beats.map((b) => b.kind);

describe('hopMs — per-tile hop length, one move capped near 2 s', () => {
  it.each([
    [1, 250],
    [6, 250],
    [8, 250],
    [10, 200],
    [20, 100],
    [40, 100],
  ])('hopMs(%i) = %i', (len, ms) => {
    expect(hopMs(len)).toBe(ms);
  });

  // Reachable paths are ≤ 20 tiles (dice ≤ 6, event steps ≤ 20 by schema); beyond that the
  // 100 ms floor wins by design (hopMs(40) = 100).
  it('a hop beat never exceeds the 2000 ms move cap for any reachable path (≤ 20 tiles)', () => {
    for (let len = 1; len <= 20; len++) {
      expect(Math.round(hopMs(len) * len)).toBeLessThanOrEqual(BEAT_MS.moveCap);
    }
  });

  it('finalRound is 1500 ms in data (D-24)', () => {
    expect(BEAT_MS.finalRound).toBe(1500);
  });
});

describe('buildTimeline — roll batches', () => {
  it('plain quest roll → dice, preview, hop(dice) with the engine path', () => {
    const g = makeGame({ board: boardWith(20) });
    const next = rollDice(g, dice(3));
    const beats = beatsOf(next);
    expect(beats).toEqual([
      { kind: 'dice', pid: 'p1', face: 3, ms: 1000 },
      { kind: 'preview', pid: 'p1', path: [1, 2, 3], ms: 500 },
      { kind: 'hop', pid: 'p1', path: [1, 2, 3], by: 'dice', ms: 750 },
    ]);
  });

  it('copies the path arrays (no shared references with the engine log)', () => {
    const next = rollDice(makeGame({ board: boardWith(20) }), dice(2));
    const moved = next.log.events.find((e) => e.t === 'moved') as Extract<GameEvent, { t: 'moved' }>;
    const beats = beatsOf(next);
    const preview = beats[1] as Extract<BeatSpec, { kind: 'preview' }>;
    const hop = beats[2] as Extract<BeatSpec, { kind: 'hop' }>;
    expect(preview.path).toEqual(moved.path);
    expect(preview.path).not.toBe(moved.path);
    expect(hop.path).not.toBe(moved.path);
    expect(hop.path).not.toBe(preview.path);
  });

  it('crossing start pays a startBonus beat after the hop', () => {
    let g = makeGame({ board: boardWith(20) });
    g = patchParticipant(g, 0, { travel: 18, position: 18, lapsCredited: 0 });
    const beats = beatsOf(rollDice(g, dice(3)));
    expect(kinds(beats)).toEqual(['dice', 'preview', 'hop', 'startBonus']);
    expect(beats[3]).toEqual({ kind: 'startBonus', pid: 'p1', stars: 1, ms: 800 });
  });

  it('forward-3 event → dice, preview, hop(dice), event, hop(event) with name/label from ctx', () => {
    const board = boardWith(20, { 2: eventTile('forward', 3, { name: '로켓 점프', label: '보너스' }) });
    const next = rollDice(makeGame({ board }), dice(2));
    const beats = beatsOf(next);
    expect(kinds(beats)).toEqual(['dice', 'preview', 'hop', 'event', 'hop']);
    expect(beats[3]).toEqual({
      kind: 'event',
      pid: 'p1',
      eff: 'forward',
      steps: 3,
      suppressed: false,
      name: '로켓 점프',
      label: '보너스',
      ms: 1000,
    });
    expect(beats[4]).toEqual({ kind: 'hop', pid: 'p1', path: [3, 4, 5], by: 'event', ms: 750 });
  });

  it('backward event → event beat then a backward hop', () => {
    const board = boardWith(20, { 4: eventTile('backward', 2, { name: '미끄럼', label: '함정' }) });
    const beats = beatsOf(rollDice(makeGame({ board }), dice(4)));
    expect(kinds(beats)).toEqual(['dice', 'preview', 'hop', 'event', 'hop']);
    expect(beats[4]).toMatchObject({ kind: 'hop', path: [3, 2], by: 'event' });
  });

  it('name and label fall back to empty strings when ctx.lastEvent is null', () => {
    const board = boardWith(20, { 2: eventTile('forward', 3) });
    const next = rollDice(makeGame({ board }), dice(2));
    const beats = buildTimeline(next.log.events, { ...ctxOf(next), lastEvent: null });
    expect(beats[3]).toMatchObject({ kind: 'event', name: '', label: '' });
  });

  it('extra event on a regular turn → event beat (not suppressed), no hop after it', () => {
    const board = boardWith(20, { 2: eventTile('extra') });
    const beats = beatsOf(rollDice(makeGame({ board }), dice(2)));
    expect(kinds(beats)).toEqual(['dice', 'preview', 'hop', 'event']);
    expect(beats[3]).toMatchObject({ eff: 'extra', suppressed: false });
  });

  it('extra event during an extra turn → suppressed event beat, no hop after it', () => {
    const board = boardWith(20, { 2: eventTile('extra') });
    const g = makeGame({ board, patch: (s) => ({ ...s, turn: { ...s.turn, isExtra: true } }) });
    const beats = beatsOf(rollDice(g, dice(2)));
    expect(kinds(beats)).toEqual(['dice', 'preview', 'hop', 'event']);
    expect(beats[3]).toMatchObject({ eff: 'extra', suppressed: true });
  });

  it('worst case (dice 6 then forward-20 crossing start, bonus on) stays within 7000 ms', () => {
    const board = boardWith(24, { 6: eventTile('forward', 20) });
    const next = rollDice(makeGame({ board, rules: { startBonus: 2 } }), dice(6));
    const beats = beatsOf(next);
    expect(kinds(beats)).toEqual(['dice', 'preview', 'hop', 'event', 'hop', 'startBonus']);
    expect(budgetMs(beats)).toBeLessThanOrEqual(7000);
    expect(budgetMs(beats)).toBe(1000 + 500 + 1500 + 1000 + 2000 + 800);
  });

  it('reducedMotion → dice/preview/hop are 0 ms, banner beats keep their length', () => {
    const board = boardWith(24, { 6: eventTile('forward', 20) });
    const next = rollDice(makeGame({ board }), dice(6));
    const beats = beatsOf(next, true);
    const ms = Object.fromEntries(beats.map((b) => [b.kind, b.ms]));
    expect(ms).toEqual({ dice: 0, preview: 0, hop: 0, event: 1000, startBonus: 800 });
  });
});

describe('buildTimeline — judgement, undo, end', () => {
  const onQuest = (diff: 'easy' | 'normal' | 'hard', failRule: 'retrySame' | 'retryNew' | 'noStar' = 'retrySame') =>
    rollDice(makeGame({ board: boardWith(20, { 3: questTile(diff) }), rules: { failRule } }), dice(3));

  it('judged success (normal = 2 stars) → one stars beat', () => {
    const g = onQuest('normal');
    expect(g.phase).toBe('awaitingJudgement');
    const beats = beatsOf(judge(g, true, dice(1)));
    expect(beats).toEqual([{ kind: 'stars', pid: 'p1', stars: 2, ms: BEAT_MS.stars }]);
    expect(BEAT_MS.stars).toBe(900); // D-12
  });

  it('judged fail with a retry (judged + questDrawn attempt 2) → one miss beat (D-13)', () => {
    const next = judge(onQuest('easy', 'retrySame'), false, dice(1));
    expect(next.log.events.map((e) => e.t)).toEqual(['judged', 'questDrawn']);
    expect(beatsOf(next)).toEqual([{ kind: 'miss', pid: 'p1', ms: 700 }]);
  });

  it('final judged fail → the same single miss beat', () => {
    expect(beatsOf(judge(onQuest('easy', 'noStar'), false, dice(1)))).toEqual([{ kind: 'miss', pid: 'p1', ms: 700 }]);
  });

  it('judgementUndone → no beats', () => {
    const next = undoJudgement(judge(onQuest('easy'), true, dice(1)));
    expect(next.log.events).toEqual([{ t: 'judgementUndone' }]);
    expect(beatsOf(next)).toEqual([]);
  });

  it('gameEnded (manual) → no beats', () => {
    const next = endGame(onQuest('easy'), 'manual');
    expect(next.log.events[0].t).toBe('gameEnded');
    expect(beatsOf(next)).toEqual([]);
  });

  // A 1-round game played to its natural end; p2's judgement decides the winners.
  const playOut = (p2Success: boolean) => {
    let g = makeGame({ board: boardWith(20, { 3: questTile('easy') }), rules: { rounds: 1, failRule: 'noStar' } });
    g = advanceTurn(judge(rollDice(g, dice(3)), false, dice(1))); // p1 ❌ → p2
    return advanceTurn(judge(rollDice(g, dice(3)), p2Success, dice(1))); // p2 → game over
  };

  it('gameEnded (rounds-complete) → one 1500 ms win beat with the engine winners and their animals (D-14)', () => {
    const next = playOut(true);
    const ended = next.log.events[0] as Extract<GameEvent, { t: 'gameEnded' }>;
    expect(ended).toMatchObject({ t: 'gameEnded', reason: 'rounds-complete' });
    expect(beatsOf(next)).toEqual([{ kind: 'win', winners: ended.winners, animals: ['rabbit'], ms: 1500 }]);
    expect(ended.winners).toEqual(['p2']);
  });

  it('co-winners (both zero stars) → every winner and animal in participant order', () => {
    const next = playOut(false);
    const beats = beatsOf(next);
    expect(beats).toEqual([{ kind: 'win', winners: ['p1', 'p2'], animals: ['bear', 'rabbit'], ms: 1500 }]);
    const win = beats[0] as Extract<BeatSpec, { kind: 'win' }>;
    const ended = next.log.events[0] as Extract<GameEvent, { t: 'gameEnded' }>;
    expect(win.winners).not.toBe(ended.winners); // copied, not shared with the engine log
  });

  it('a winner without an animalOf entry is skipped in animals (defensive)', () => {
    const next = playOut(true);
    expect(buildTimeline(next.log.events, { ...ctxOf(next), animalOf: {} })).toEqual([
      { kind: 'win', winners: ['p2'], animals: [], ms: 1500 },
    ]);
  });

  it('reducedMotion keeps miss 700 and win 1500 (D-16, Pitfall 9)', () => {
    expect(beatsOf(judge(onQuest('easy', 'noStar'), false, dice(1)), true)).toEqual([
      { kind: 'miss', pid: 'p1', ms: 700 },
    ]);
    expect(beatsOf(playOut(false), true)[0]).toMatchObject({ kind: 'win', ms: 1500 });
  });

  it('D-15 length caps: stars ≤ 900, miss 700, win 1500; event / startBonus / finalRound unchanged', () => {
    expect(BEAT_MS.stars).toBeLessThanOrEqual(900);
    expect(BEAT_MS.miss).toBe(700);
    expect(BEAT_MS.win).toBe(1500);
    expect(BEAT_MS.event).toBe(1000);
    expect(BEAT_MS.startBonus).toBe(800);
    expect(BEAT_MS.finalRound).toBe(1500);
  });

  it('landed / questDrawn / gameStarted alone → no beats', () => {
    const ctx: TimelineCtx = { totalRounds: 3, firstPid: 'p1', reducedMotion: false, lastEvent: null, animalOf: {} };
    expect(buildTimeline([{ t: 'landed', pid: 'p1', tile: 3, kind: 'quest' }], ctx)).toEqual([]);
    expect(
      buildTimeline([{ t: 'questDrawn', pid: 'p1', missionId: 'e1', diff: 'easy', stars: 1, attempt: 1 }], ctx),
    ).toEqual([]);
    expect(buildTimeline([{ t: 'gameStarted' }], ctx)).toEqual([]);
  });
});

describe('buildTimeline — finalRound (ROUND-02, D-24)', () => {
  const ctx: TimelineCtx = { totalRounds: 3, firstPid: 'p1', reducedMotion: false, lastEvent: null, animalOf: {} };
  const ts = (over: Partial<Extract<GameEvent, { t: 'turnStarted' }>>): GameEvent => ({
    t: 'turnStarted',
    pid: 'p1',
    member: 'P1',
    round: 3,
    isExtra: false,
    ...over,
  });

  it('first regular turn of the last round → one 1500 ms finalRound beat', () => {
    expect(buildTimeline([ts({})], ctx)).toEqual([{ kind: 'finalRound', ms: 1500 }]);
  });

  it('extra turn, another participant or an earlier round → nothing', () => {
    expect(buildTimeline([ts({ isExtra: true })], ctx)).toEqual([]);
    expect(buildTimeline([ts({ pid: 'p2' })], ctx)).toEqual([]);
    expect(buildTimeline([ts({ round: 2 })], ctx)).toEqual([]);
  });

  it('keeps 1500 ms under reducedMotion', () => {
    expect(buildTimeline([ts({})], { ...ctx, reducedMotion: true })).toEqual([{ kind: 'finalRound', ms: 1500 }]);
  });

  it('createGame log: 1-round game → [finalRound]; 3-round game → []', () => {
    expect(beatsOf(makeGame({ rules: { rounds: 1 } }))).toEqual([{ kind: 'finalRound', ms: 1500 }]);
    expect(beatsOf(makeGame({ rules: { rounds: 3 } }))).toEqual([]);
  });

  it('real engine: advancing into round 2 of a 2-round game yields finalRound; p2 turn does not', () => {
    let g = makeGame({ board: boardWith(20), rules: { rounds: 2, failRule: 'noStar' } });
    const step = (s: GameState) => advanceTurn(judge(rollDice(s, dice(3)), false, dice(1)));
    g = step(g); // p1 → p2 (round 1)
    expect(beatsOf(g)).toEqual([]);
    g = step(g); // p2 → p1 (round 2 = last round)
    expect(g.round).toBe(2);
    expect(beatsOf(g)).toEqual([{ kind: 'finalRound', ms: 1500 }]);
  });
});

describe('isBannerBeat / isTimedBeat (07-01, D-22)', () => {
  const all: BeatSpec[] = [
    { kind: 'dice', pid: 'p', face: 1, ms: 1 },
    { kind: 'preview', pid: 'p', path: [1], ms: 1 },
    { kind: 'hop', pid: 'p', path: [1], by: 'dice', ms: 1 },
    { kind: 'startBonus', pid: 'p', stars: 1, ms: 1 },
    { kind: 'event', pid: 'p', eff: 'extra', steps: 0, suppressed: false, name: '', label: '', ms: 1 },
    { kind: 'stars', pid: 'p', stars: 1, ms: 1 },
    { kind: 'finalRound', ms: 1 },
    { kind: 'miss', pid: 'p', ms: 1 },
    { kind: 'win', winners: ['p'], animals: ['bear'], ms: 1 },
  ];

  it('isBannerBeat is true exactly for startBonus, event, stars, finalRound (not miss / win)', () => {
    expect(all.filter(isBannerBeat).map((b) => b.kind)).toEqual(['startBonus', 'event', 'stars', 'finalRound']);
  });

  it('isTimedBeat adds the reaction beats miss and win', () => {
    expect(all.filter(isTimedBeat).map((b) => b.kind)).toEqual([
      'startBonus',
      'event',
      'stars',
      'finalRound',
      'miss',
      'win',
    ]);
  });

  it('miss is 700 ms and win is 1500 ms in data (D-13, D-14)', () => {
    expect(BEAT_MS.miss).toBe(700);
    expect(BEAT_MS.win).toBe(1500);
  });
});
