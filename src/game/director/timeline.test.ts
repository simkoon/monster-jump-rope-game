// src/game/director/timeline.test.ts — engine log → beat mapping (06-02 Task 1, D-19, D-24).
// Every scenario drives the REAL engine transitions so the event order is the engine's own.
import { describe, it, expect } from 'vitest';
import { advanceTurn, endGame, judge, rollDice, undoJudgement } from '../../engine/game';
import { boardWith, dice, eventTile, makeGame, patchParticipant, questTile } from '../../engine/testkit';
import type { GameEvent, GameState } from '../../engine/state';
import { BEAT_MS, budgetMs, buildTimeline, hopMs, isBannerBeat, type BeatSpec, type TimelineCtx } from './timeline';

const ctxOf = (g: GameState, reducedMotion = false): TimelineCtx => ({
  totalRounds: g.config.rules.rounds,
  firstPid: g.config.participants[0].id,
  reducedMotion,
  lastEvent: g.lastMove?.event ?? null,
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

  it('a hop beat never exceeds the 2000 ms move cap', () => {
    for (let len = 1; len <= 40; len++) {
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
    expect(beats).toEqual([{ kind: 'stars', pid: 'p1', stars: 2, ms: 600 }]);
  });

  it('judged fail with a retry (judged + questDrawn attempt 2) → no beats', () => {
    const next = judge(onQuest('easy', 'retrySame'), false, dice(1));
    expect(next.log.events.map((e) => e.t)).toEqual(['judged', 'questDrawn']);
    expect(beatsOf(next)).toEqual([]);
  });

  it('final judged fail → no beats', () => {
    expect(beatsOf(judge(onQuest('easy', 'noStar'), false, dice(1)))).toEqual([]);
  });

  it('judgementUndone → no beats', () => {
    const next = undoJudgement(judge(onQuest('easy'), true, dice(1)));
    expect(next.log.events).toEqual([{ t: 'judgementUndone' }]);
    expect(beatsOf(next)).toEqual([]);
  });

  it('gameEnded → no beats', () => {
    const next = endGame(onQuest('easy'), 'manual');
    expect(next.log.events[0].t).toBe('gameEnded');
    expect(beatsOf(next)).toEqual([]);
  });

  it('landed / questDrawn / gameStarted alone → no beats', () => {
    const ctx: TimelineCtx = { totalRounds: 3, firstPid: 'p1', reducedMotion: false, lastEvent: null };
    expect(buildTimeline([{ t: 'landed', pid: 'p1', tile: 3, kind: 'quest' }], ctx)).toEqual([]);
    expect(
      buildTimeline([{ t: 'questDrawn', pid: 'p1', missionId: 'e1', diff: 'easy', stars: 1, attempt: 1 }], ctx),
    ).toEqual([]);
    expect(buildTimeline([{ t: 'gameStarted' }], ctx)).toEqual([]);
  });
});

describe('buildTimeline — finalRound (ROUND-02, D-24)', () => {
  const ctx: TimelineCtx = { totalRounds: 3, firstPid: 'p1', reducedMotion: false, lastEvent: null };
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

describe('isBannerBeat', () => {
  it('is true exactly for startBonus, event, stars, finalRound', () => {
    const all: BeatSpec[] = [
      { kind: 'dice', pid: 'p', face: 1, ms: 1 },
      { kind: 'preview', pid: 'p', path: [1], ms: 1 },
      { kind: 'hop', pid: 'p', path: [1], by: 'dice', ms: 1 },
      { kind: 'startBonus', pid: 'p', stars: 1, ms: 1 },
      { kind: 'event', pid: 'p', eff: 'extra', steps: 0, suppressed: false, name: '', label: '', ms: 1 },
      { kind: 'stars', pid: 'p', stars: 1, ms: 1 },
      { kind: 'finalRound', ms: 1 },
    ];
    expect(all.filter(isBannerBeat).map((b) => b.kind)).toEqual(['startBonus', 'event', 'stars', 'finalRound']);
  });
});
