// src/engine/setup.test.ts — participant builder (solo + shared team token, distinct animals),
// bounds clamping, the start-screen estimate and the content analysis (D-13, D-20, D-24).
import { describe, it, expect } from 'vitest';
import {
  analyzeContent,
  buildParticipants,
  DEFAULT_PARTICIPANT_COUNT,
  estimateMinutes,
  MAX_PARTICIPANTS,
  SECONDS_PER_TURN,
} from './setup';
import type { Difficulty as Diff5, Event as Event5, Mission } from '../schema';

describe('constants', () => {
  it('MAX_PARTICIPANTS is 8 and DEFAULT_PARTICIPANT_COUNT is 2', () => {
    expect(MAX_PARTICIPANTS).toBe(8);
    expect(DEFAULT_PARTICIPANT_COUNT).toBe(2);
  });
});

describe('buildParticipants — solo', () => {
  it('builds N single-member participants with zeroed ring/star fields', () => {
    const ps = buildParticipants('solo', 3, ['가', '나', '다'], []);
    expect(ps).toHaveLength(3);
    ps.forEach((p, i) => {
      expect(p.position).toBe(0);
      expect(p.travel).toBe(0);
      expect(p.lapsCredited).toBe(0);
      expect(p.stars).toBe(0);
      expect(p.memberTurnIndex).toBe(0);
      expect(p.memberNames).toEqual([['가', '나', '다'][i]]);
      expect(p.name).toBe(['가', '나', '다'][i]);
    });
    expect(new Set(ps.map((p) => p.id)).size).toBe(3); // ids are unique
  });

  it('keeps valid picks and fills duplicates/missing with distinct animals (D-24)', () => {
    const ps = buildParticipants('solo', 3, ['가', '나', '다'], ['cat', 'cat']);
    expect(ps.map((p) => p.animal)).toEqual(['cat', 'bear', 'rabbit']);
  });

  it('honours explicit distinct picks', () => {
    const ps = buildParticipants('solo', 2, ['가', '나'], ['fox', 'pig']);
    expect(ps.map((p) => p.animal)).toEqual(['fox', 'pig']);
  });
});

describe('buildParticipants — team (D-01 shared token)', () => {
  it('produces exactly `count` tokens regardless of member counts', () => {
    const ps = buildParticipants('team', 2, ['A팀', 'B팀'], [], [
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
    const ps = buildParticipants('team', 1, ['외톨이팀'], []);
    expect(ps).toHaveLength(1);
    expect(ps[0].memberNames).toEqual(['외톨이팀']);
  });

  it('drops empty member strings', () => {
    const ps = buildParticipants('team', 1, ['A팀'], [], [['', 'a1', '']]);
    expect(ps[0].memberNames).toEqual(['a1']);
  });
});

describe('buildParticipants — bounds (T-02-01)', () => {
  it('clamps count up to at least 1', () => {
    const ps = buildParticipants('solo', 0, [], []);
    expect(ps).toHaveLength(1);
    expect(ps[0].name).toBe('플레이어 1');
  });
  it('clamps count down to MAX_PARTICIPANTS with all-distinct animals', () => {
    const many = Array.from({ length: 20 }, (_, i) => `p${i}`);
    const ps = buildParticipants('solo', 20, many, []);
    expect(ps).toHaveLength(MAX_PARTICIPANTS);
    expect(new Set(ps.map((p) => p.animal)).size).toBe(MAX_PARTICIPANTS);
  });
});

// ---- estimate + content analysis (SETUP-08/09, D-13, D-20) ----

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
