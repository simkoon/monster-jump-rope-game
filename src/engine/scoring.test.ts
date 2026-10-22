// src/engine/scoring.test.ts — stars per difficulty (D-02/TURN-03), winners and ranking (ROUND-03).
import { describe, it, expect } from 'vitest';
import { rankByStars, starsFor, STARS_BY_DIFF, winnersByStars } from './scoring';

describe('starsFor (D-02)', () => {
  it('easy 1 / normal 2 / hard 3', () => {
    expect(starsFor('easy')).toBe(1);
    expect(starsFor('normal')).toBe(2);
    expect(starsFor('hard')).toBe(3);
    expect(STARS_BY_DIFF).toEqual({ easy: 1, normal: 2, hard: 3 });
  });
});

describe('winnersByStars (ROUND-03)', () => {
  it('returns everyone at the maximum (ties are co-winners)', () => {
    expect(
      winnersByStars([
        { id: 'a', stars: 3 },
        { id: 'b', stars: 5 },
        { id: 'c', stars: 5 },
      ]),
    ).toEqual(['b', 'c']);
  });
  it('all zero → every id wins', () => {
    expect(
      winnersByStars([
        { id: 'a', stars: 0 },
        { id: 'b', stars: 0 },
      ]),
    ).toEqual(['a', 'b']);
  });
  it('empty input → []', () => {
    expect(winnersByStars([])).toEqual([]);
  });
});

describe('rankByStars (ROUND-03)', () => {
  it('sorts by stars desc with competition ranking 1,1,3 and stable ties', () => {
    const ranked = rankByStars([
      { id: 'a', stars: 2 },
      { id: 'b', stars: 5 },
      { id: 'c', stars: 5 },
      { id: 'd', stars: 1 },
    ]);
    expect(ranked.map((r) => r.item.id)).toEqual(['b', 'c', 'a', 'd']);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3, 4]);
  });
  it('keeps input order among equal stars and does not mutate input', () => {
    const input = [
      { id: 'x', stars: 1 },
      { id: 'y', stars: 1 },
      { id: 'z', stars: 1 },
    ];
    const ranked = rankByStars(input);
    expect(ranked.map((r) => r.item.id)).toEqual(['x', 'y', 'z']);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 1]);
    expect(input.map((p) => p.id)).toEqual(['x', 'y', 'z']);
  });
  it('empty input → []', () => {
    expect(rankByStars([])).toEqual([]);
  });
});
