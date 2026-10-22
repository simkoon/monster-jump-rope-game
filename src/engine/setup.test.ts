// src/engine/setup.test.ts — board presets, participant builder (solo + shared team token),
// bounds clamping, and the empty-mission guard (MISSION-07 / D-08).
import { describe, it, expect } from 'vitest';
import {
  analyzeContent,
  boardLengthFor,
  buildParticipants,
  canStart,
  DEFAULT_TIME_LIMIT_MS,
  estimateMinutes,
  MAX_PARTICIPANTS,
  SECONDS_PER_TURN,
} from './setup';
import type { Difficulty as Diff5, Event as Event5, Mission } from '../schema';

const mission = (id: string): Mission => ({ id, name: id, desc: '', diff: 'easy', cats: [] });

describe('boardLengthFor', () => {
  it('short=20, normal=30 (A1)', () => {
    expect(boardLengthFor('short')).toBe(20);
    expect(boardLengthFor('normal')).toBe(30);
  });
});

describe('constants', () => {
  it('DEFAULT_TIME_LIMIT_MS is 20 minutes (D-04)', () => {
    expect(DEFAULT_TIME_LIMIT_MS).toBe(20 * 60 * 1000);
  });
  it('MAX_PARTICIPANTS is 8 (A3)', () => {
    expect(MAX_PARTICIPANTS).toBe(8);
  });
});

describe('buildParticipants — solo', () => {
  it('builds N single-member participants at position 0', () => {
    const ps = buildParticipants('solo', 3, ['가', '나', '다'], ['boy', 'girl', 'boy']);
    expect(ps).toHaveLength(3);
    ps.forEach((p, i) => {
      expect(p.position).toBe(0);
      expect(p.memberTurnIndex).toBe(0);
      expect(p.memberNames).toEqual([['가', '나', '다'][i]]);
      expect(p.name).toBe(['가', '나', '다'][i]);
    });
    expect(new Set(ps.map((p) => p.id)).size).toBe(3); // ids are unique
  });

  it('assigns the requested character to each participant', () => {
    const ps = buildParticipants('solo', 2, ['가', '나'], ['girl', 'boy']);
    expect(ps[0].character).toBe('girl');
    expect(ps[1].character).toBe('boy');
  });
});

describe('buildParticipants — team (D-01 shared token)', () => {
  it('produces exactly `count` tokens regardless of member counts', () => {
    const ps = buildParticipants('team', 2, ['A팀', 'B팀'], ['boy', 'girl'], [
      ['a1', 'a2', 'a3'],
      ['b1', 'b2'],
    ]);
    expect(ps).toHaveLength(2); // ONE token per team, not per member
    expect(ps[0].memberNames).toEqual(['a1', 'a2', 'a3']);
    expect(ps[1].memberNames).toEqual(['b1', 'b2']);
    ps.forEach((p) => {
      expect(p.position).toBe(0);
      expect(p.memberTurnIndex).toBe(0);
    });
  });

  it('falls back to the team name as its sole member when no members are supplied', () => {
    const ps = buildParticipants('team', 1, ['외톨이팀'], ['boy']);
    expect(ps).toHaveLength(1);
    expect(ps[0].memberNames).toEqual(['외톨이팀']);
  });
});

describe('buildParticipants — bounds (T-02-01)', () => {
  it('clamps count up to at least 1', () => {
    const ps = buildParticipants('solo', 0, [], []);
    expect(ps).toHaveLength(1);
  });
  it('clamps count down to MAX_PARTICIPANTS', () => {
    const many = Array.from({ length: 20 }, (_, i) => `p${i}`);
    const chars = many.map(() => 'boy' as const);
    const ps = buildParticipants('solo', 20, many, chars);
    expect(ps).toHaveLength(MAX_PARTICIPANTS);
  });
});

describe('canStart (MISSION-07 / D-08)', () => {
  it('blocks an empty mission library with a non-empty guidance reason', () => {
    const r = canStart([]);
    expect(r.ok).toBe(false);
    expect(typeof r.reason).toBe('string');
    expect(r.reason!.length).toBeGreaterThan(0);
  });
  it('allows a non-empty mission library', () => {
    expect(canStart([mission('m1')])).toEqual({ ok: true });
  });
});

// ---- Phase 5 additions (SETUP-08/09, D-13, D-20) ----

const m5 = (id: string, diff: Diff5): Mission => ({ id, name: id, desc: '', diff, cats: [] });
const ev5 = (id: string, weight: number): Event5 => ({
  id,
  name: id,
  eff: 'forward',
  steps: 2,
  weight,
  label: '',
});

describe('estimateMinutes (D-20)', () => {
  it('SECONDS_PER_TURN is 45', () => {
    expect(SECONDS_PER_TURN).toBe(45);
  });
  it('ceil(n × rounds × 45 / 60)', () => {
    expect(estimateMinutes(2, 5)).toBe(8);
    expect(estimateMinutes(3, 5)).toBe(12);
    expect(estimateMinutes(4, 5)).toBe(15);
    expect(estimateMinutes(8, 5)).toBe(30);
    expect(estimateMinutes(1, 1)).toBe(1);
  });
  it('returns 0 for n<1, rounds<1 or non-finite input', () => {
    expect(estimateMinutes(0, 5)).toBe(0);
    expect(estimateMinutes(3, 0)).toBe(0);
    expect(estimateMinutes(Number.NaN, 5)).toBe(0);
    expect(estimateMinutes(3, Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('analyzeContent (D-13)', () => {
  it('blocks only when there are no missions', () => {
    expect(analyzeContent([], [ev5('a', 1)])).toEqual({
      ok: false,
      reason: '미션이 없어요. 편집기에서 미션을 먼저 추가해 주세요.',
      missingDiffs: ['easy', 'normal', 'hard'],
      hasEventTiles: true,
    });
  });
  it('easy-only missions + a weighted event → ok, missing normal/hard, event tiles', () => {
    const r = analyzeContent([m5('e', 'easy')], [ev5('a', 0), ev5('b', 3)]);
    expect(r.ok).toBe(true);
    expect(r.reason).toBeUndefined();
    expect(r.missingDiffs).toEqual(['normal', 'hard']);
    expect(r.hasEventTiles).toBe(true);
  });
  it('all difficulties, events all weight 0 or empty → no event tiles', () => {
    const all = [m5('e', 'easy'), m5('n', 'normal'), m5('h', 'hard')];
    const zero = analyzeContent(all, [ev5('a', 0), ev5('b', 0)]);
    expect(zero.ok).toBe(true);
    expect(zero.missingDiffs).toEqual([]);
    expect(zero.hasEventTiles).toBe(false);
    expect(analyzeContent(all, []).hasEventTiles).toBe(false);
  });
});
