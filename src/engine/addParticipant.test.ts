import { describe, expect, it } from 'vitest';
import { addParticipant, advanceTurn, canAddParticipant, endGame, judge, rollDice, undoJudgement } from './game';
import { boardWith, dice, makeGame, player, questTile } from './testkit';
import { MAX_PARTICIPANTS } from './setup';
import type { GameState } from './state';

describe('adding a participant mid-game', () => {
  it('joins at the start tile with 0 stars, at the end of the turn order, with a new id', () => {
    const s = makeGame({ rules: { rounds: 2 }, board: boardWith(20) });
    const moved = rollDice(s, dice(3));
    const added = addParticipant(moved, { name: '  지각생 ' });
    const list = added.config.participants;
    expect(list).toHaveLength(3);
    expect(list[2]).toMatchObject({ id: 'p3', name: '지각생', position: 0, travel: 0, stars: 0, memberNames: ['지각생'] });
    expect(added.phase).toBe(moved.phase);
    expect(added.currentIndex).toBe(moved.currentIndex);
    expect(added.stats.p3).toEqual({ attempts: 0, successes: 0, failures: 0, retrySuccesses: 0, hardSuccesses: 0, luckyCount: 0 });
    expect(added.log).toEqual({ seq: moved.log.seq + 1, events: [{ t: 'participantAdded', pid: 'p3' }] });
  });

  it('plays in the current round when the order has not passed them yet', () => {
    const turn = (g: GameState) => {
      const r = rollDice(g, dice(1));
      return advanceTurn(r.phase === 'awaitingJudgement' ? judge(r, true, dice(1)) : r);
    };
    let s = makeGame({ rules: { rounds: 1 }, board: boardWith(20) });
    s = addParticipant(s, { name: 'C' });
    s = turn(s); // p1 → p2
    s = turn(s); // p2 → p3 (the newcomer), still round 1
    expect(s.config.participants[s.currentIndex].id).toBe('p3');
    expect(s.round).toBe(1);
    s = turn(s);
    expect(s.phase).toBe('gameOver');
  });

  it('keeps the newcomer through an undo of the previous judgement', () => {
    const s = makeGame({ board: boardWith(20, { 1: questTile('easy') }) });
    const judged = judge(rollDice(s, dice(1)), true, dice(1));
    const added = addParticipant(judged, { name: 'C' });
    const undone = undoJudgement(added);
    expect(undone.config.participants.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
    expect(undone.stats.p3).toBeDefined();
    expect(undone.phase).toBe('awaitingJudgement');
  });

  it('picks the least-used animal unless one is given, and team members fall back to the name', () => {
    const s = makeGame({ mode: 'team', participants: [player('p1', 'A', 'bear'), player('p2', 'B', 'rabbit')] });
    expect(addParticipant(s, { name: 'C' }).config.participants[2].animal).toBe('cat');
    const fox = addParticipant(s, { name: 'C', animal: 'fox', memberNames: [' 민수 ', '', '지아'] }).config.participants[2];
    expect(fox.animal).toBe('fox');
    expect(fox.memberNames).toEqual(['민수', '지아']);
    expect(addParticipant(s, { name: '' }).config.participants[2].memberNames).toEqual(['팀 3']);
  });

  it('is refused at gameOver and at MAX_PARTICIPANTS', () => {
    const over = endGame(makeGame(), 'manual');
    expect(canAddParticipant(over)).toBe(false);
    expect(addParticipant(over, { name: 'C' })).toBe(over);
    let s = makeGame();
    while (s.config.participants.length < MAX_PARTICIPANTS) s = addParticipant(s, { name: '' });
    expect(new Set(s.config.participants.map((p) => p.id)).size).toBe(MAX_PARTICIPANTS);
    expect(addParticipant(s, { name: 'X' })).toBe(s);
  });
});
