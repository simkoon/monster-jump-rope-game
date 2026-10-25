import { describe, expect, it } from 'vitest';
import { advanceTurn, endGame, judge, nominate, rollDice, undoJudgement, willEndOnAdvance } from './game';
import { boardWith, dice, eventTile, makeGame, player } from './testkit';

const fresh = () => makeGame({ rules: { nomination: true, rounds: 1 }, board: boardWith(20) });
describe('teacher nomination opportunities', () => {
  it('starts locked and ignores rolls, next, and invalid names', () => {
    const s = fresh();
    expect(s.phase).toBe('awaitingNomination');
    expect(rollDice(s, dice(1))).toBe(s);
    expect(advanceTurn(s)).toBe(s);
    expect(nominate(s, 'missing')).toBe(s);
  });
  it('lets only the selected participant roll once and never interrupts a mission', () => {
    const s = nominate(fresh(), 'p2');
    expect(s.currentIndex).toBe(1);
    expect(nominate(s, 'p1')).toBe(s);
    const moved = rollDice(s, dice(1));
    expect(moved.config.participants[0].position).toBe(0);
    expect(moved.config.participants[1].position).toBe(1);
    expect(rollDice(moved, dice(1))).toBe(moved);
    expect(nominate(moved, 'p1')).toBe(moved);
    const done = judge(moved, true, dice(1));
    expect(rollDice(done, dice(1))).toBe(done);
    const waiting = advanceTurn(done);
    expect(waiting.phase).toBe('awaitingNomination');
    expect(waiting.currentIndex).toBe(1);
    expect(rollDice(waiting, dice(1))).toBe(waiting);
  });
  it('allows repeat nominations indefinitely, accumulates stars and ends manually', () => {
    let s = fresh();
    for (let i = 0; i < 7; i++) {
      s = judge(rollDice(nominate(s, 'p2'), dice(1)), true, dice(1));
      expect(s.phase).toBe('turnResolved');
      expect(willEndOnAdvance(s)).toBe(false);
    }
    expect(s.config.participants[1].stars).toBe(7);
    expect(s.config.participants[0].stars).toBe(0);
    const over = endGame(s, 'manual');
    expect(over.winners).toEqual(['p2']);
    expect(nominate(over, 'p1')).toBe(over);
  });
  it('closes the undo window on a fresh nomination', () => {
    const done = judge(rollDice(nominate(fresh(), 'p1'), dice(1)), true, dice(1));
    expect(undoJudgement(done).phase).toBe('awaitingJudgement');
    const next = nominate(done, 'p2');
    expect(undoJudgement(next)).toBe(next);
    expect(next.config.participants[0].stars).toBe(1);
  });
  it('suppresses automatic extra rolls', () => {
    let s = makeGame({ rules: { nomination: true }, board: boardWith(20, { 1: eventTile('extra') }) });
    s = rollDice(nominate(s, 'p1'), dice(1));
    expect(s.turn.extraGranted).toBe(false);
    expect(s.lastMove?.extraSuppressed).toBe(true);
    expect(advanceTurn(s).phase).toBe('awaitingNomination');
  });
  it('rotates team members only after a completed opportunity', () => {
    const s = makeGame({mode:'team', rules:{nomination:true}, board:boardWith(20),
      participants:[player('p1','Team','bear',{memberNames:['A','B']})]});
    const done = judge(rollDice(nominate(s,'p1'), dice(1)),true,dice(1));
    expect(nominate(done,'p1').config.participants[0].memberTurnIndex).toBe(1);
    expect(nominate(advanceTurn(done),'p1').config.participants[0].memberTurnIndex).toBe(1);
  });
});
