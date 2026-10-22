// src/engine/ring.test.ts — ring position math + start-bonus rule (TURN-01, TURN-06, D-09).
// Deterministic, no RNG: exhaustive property loop + the verified L=20 scenario table.
import { describe, it, expect } from 'vitest';
import { lapOf, moveBy, walkPath, wrap } from './ring';

describe('wrap', () => {
  it('maps any integer into [0, L)', () => {
    expect(wrap(-1, 20)).toBe(19);
    expect(wrap(20, 20)).toBe(0);
    expect(wrap(-41, 20)).toBe(19);
    expect(wrap(5, 16)).toBe(5);
  });
});

describe('lapOf', () => {
  it('floors toward −∞ so negative travel is lap −1', () => {
    expect(lapOf(-2, 20)).toBe(-1);
    expect(lapOf(0, 20)).toBe(0);
    expect(lapOf(19, 20)).toBe(0);
    expect(lapOf(20, 20)).toBe(1);
  });
});

describe('walkPath', () => {
  it('excludes the start, includes the end, wraps across the start square', () => {
    expect(walkPath(18, 4, 20)).toEqual([19, 0, 1, 2]);
    expect(walkPath(1, -3, 20)).toEqual([0, 19, 18]);
    expect(walkPath(5, 0, 20)).toEqual([]);
  });
});

describe('moveBy — start bonus (D-09)', () => {
  it('L=20 verified sequence: exact landing pays, backward never pays, same lap never pays twice', () => {
    const a = moveBy({ travel: 19, lapsCredited: 0 }, 1, 20, true);
    expect(a.position).toBe(0);
    expect(a.bonusEarned).toBe(true);
    expect(a.lapsCredited).toBe(1);

    const b = moveBy(a, -1, 20, true);
    expect(b.position).toBe(19);
    expect(b.bonusEarned).toBe(false);
    expect(b.lapsCredited).toBe(1);

    const c = moveBy(b, 3, 20, true);
    expect(c.position).toBe(2);
    expect(c.bonusEarned).toBe(false);
    expect(c.lapsCredited).toBe(1);

    const d = moveBy(c, 20, 20, true);
    expect(d.bonusEarned).toBe(true);
    expect(d.lapsCredited).toBe(2);
  });

  it('A1: crossing backward then returning to the start square is not a bonus', () => {
    const back = moveBy({ travel: 0, lapsCredited: 0 }, -2, 20, true);
    expect(back.travel).toBe(-2);
    expect(lapOf(back.travel, 20)).toBe(-1);
    expect(back.bonusEarned).toBe(false);
    expect(back.lapsCredited).toBe(0);

    const fwd = moveBy(back, 2, 20, true);
    expect(fwd.position).toBe(0);
    expect(fwd.bonusEarned).toBe(false);
  });

  it('canEarnBonus=false blocks payment but still records the lap (per-turn cap)', () => {
    const m = moveBy({ travel: 19, lapsCredited: 0 }, 1, 20, false);
    expect(m.bonusEarned).toBe(false);
    expect(m.lapsCredited).toBe(1);
    // a later move in the same lap cannot pay
    expect(moveBy(m, 3, 20, true).bonusEarned).toBe(false);
  });

  it('L=16: crossing two laps at once pays exactly once and records the max lap', () => {
    const m = moveBy({ travel: 14, lapsCredited: 0 }, 20, 16, true);
    expect(m.travel).toBe(34);
    expect(m.position).toBe(2);
    expect(m.bonusEarned).toBe(true);
    expect(m.lapsCredited).toBe(2);
  });

  it('game start (travel 0, lapsCredited 0) staying put is not a bonus', () => {
    const m = moveBy({ travel: 0, lapsCredited: 0 }, 0, 20, true);
    expect(m.bonusEarned).toBe(false);
    expect(m.position).toBe(0);
    expect(m.path).toEqual([]);
  });
});

describe('moveBy — exhaustive properties (TURN-01)', () => {
  it('holds for L∈{16,20,24} × travel∈[−2L,3L] × steps∈[−20,20] × canEarnBonus', () => {
    let cases = 0;
    for (const L of [16, 20, 24]) {
      for (let from = -2 * L; from <= 3 * L; from++) {
        const lapsCredited = Math.max(0, lapOf(from, L));
        for (let steps = -20; steps <= 20; steps++) {
          for (const canEarnBonus of [true, false]) {
            const m = moveBy({ travel: from, lapsCredited }, steps, L, canEarnBonus);
            cases++;
            if (m.position < 0 || m.position >= L) throw new Error(`position out of range ${L}/${from}/${steps}`);
            if (m.position !== wrap(m.travel, L)) throw new Error('position != wrap(travel)');
            if (m.travel !== from + steps) throw new Error('travel mismatch');
            if (m.path.length !== Math.abs(steps)) throw new Error('path length');
            if (steps !== 0 && m.path[m.path.length - 1] !== m.position) throw new Error('path end');
            if (m.bonusEarned && !(steps > 0 && canEarnBonus && lapOf(m.travel, L) > lapsCredited))
              throw new Error(`illegal bonus ${L}/${from}/${steps}`);
            if (m.lapsCredited < lapsCredited) throw new Error('lapsCredited decreased');
          }
        }
      }
    }
    expect(cases).toBeGreaterThan(15000);
  });
});
