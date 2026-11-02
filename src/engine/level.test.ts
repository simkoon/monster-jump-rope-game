// Per-child mission level: the card and its stars come from the child's level.
import { describe, expect, it } from 'vitest';
import { judge, rollDice } from './game';
import { boardWith, dice, makeGame, mission, player, questTile } from './testkit';
import { buildParticipants } from './setup';

const board = boardWith(20, { 1: questTile('easy'), 2: questTile('hard') });

describe('per-child mission level', () => {
  it('draws from the child level wherever they land; stars follow the card', () => {
    const s = makeGame({ participants: [player('p1', 'A', 'bear', { level: 'hard' }), player('p2', 'B', 'rabbit')], board });
    const a = rollDice(s, dice(1)); // easy tile
    expect(a.card!.diff).toBe('hard');
    expect(a.card!.mission.diff).toBe('hard');
    expect(a.card!.stars).toBe(3);
    expect(judge(a, true, dice(1)).config.participants[0].stars).toBe(3);
  });

  it('without a level the tile decides (unchanged)', () => {
    const s = makeGame({ board });
    const a = rollDice(s, dice(2));
    expect(a.card!.diff).toBe('hard');
    expect(a.card!.stars).toBe(3);
  });

  it('falls back to the tile when the level has no missions', () => {
    const s = makeGame({
      participants: [player('p1', 'A', 'bear', { level: 'normal' }), player('p2', 'B', 'rabbit')],
      missions: [mission('e1', 'easy'), mission('h1', 'hard')],
      board,
    });
    expect(rollDice(s, dice(1)).card!.diff).toBe('easy');
  });

  it('a retry (retryNew) stays in the child level', () => {
    const s = makeGame({ participants: [player('p1', 'A', 'bear', { level: 'hard' }), player('p2', 'B', 'rabbit')], board, rules: { failRule: 'retryNew' } });
    const retry = judge(rollDice(s, dice(1)), false, dice(1));
    expect(retry.card!.attempt).toBe(2);
    expect(retry.card!.mission.diff).toBe('hard');
  });

  it('decks keep the level difficulty even when the board leaves it out', () => {
    const s = makeGame({ participants: [player('p1', 'A', 'bear', { level: 'hard' }), player('p2', 'B', 'rabbit')], rules: { diffs: ['easy'] } });
    expect(new Set(s.board.flatMap((t) => (t.kind === 'quest' ? [t.diff] : [])))).toEqual(new Set(['easy']));
    expect(s.pool.hard.length).toBeGreaterThan(0);
  });

  it('buildParticipants copies levels per row', () => {
    const ps = buildParticipants('solo', 3, [], [], undefined, ['easy', undefined, 'hard']);
    expect(ps.map((p) => p.level)).toEqual(['easy', undefined, 'hard']);
  });
});
