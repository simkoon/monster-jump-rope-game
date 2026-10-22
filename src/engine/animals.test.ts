// src/engine/animals.test.ts — animal ids and automatic distinct assignment (SETUP-07, D-24).
import { describe, it, expect } from 'vitest';
import { ANIMALS, assignAnimals, isAnimalId, type AnimalId } from './animals';

describe('ANIMALS (D-24)', () => {
  it('lists the 8 species in the fixed order', () => {
    expect(ANIMALS).toEqual(['bear', 'rabbit', 'cat', 'dog', 'panda', 'fox', 'pig', 'chick']);
  });
});

describe('isAnimalId', () => {
  it('accepts only known ids', () => {
    expect(isAnimalId('fox')).toBe(true);
    expect(isAnimalId('boy')).toBe(false);
    expect(isAnimalId(3)).toBe(false);
    expect(isAnimalId(undefined)).toBe(false);
  });
});

describe('assignAnimals', () => {
  it('fills an empty pick list in ANIMALS order', () => {
    expect(assignAnimals(3, [])).toEqual(['bear', 'rabbit', 'cat']);
  });
  it('keeps the first valid occurrence, fills duplicates and gaps with the first unused species', () => {
    expect(assignAnimals(3, ['cat', undefined, 'cat'])).toEqual(['cat', 'bear', 'rabbit']);
  });
  it('reserves valid picks before filling gaps', () => {
    expect(assignAnimals(2, [undefined, 'bear'])).toEqual(['rabbit', 'bear']);
  });
  it('8 participants always get 8 distinct ids', () => {
    const picks = ['fox', 'fox', 'fox', undefined, 'pig', 'bear', undefined, 'fox'] as (AnimalId | undefined)[];
    const out = assignAnimals(8, picks);
    expect(out).toHaveLength(8);
    expect(new Set(out).size).toBe(8);
    expect(out[0]).toBe('fox');
    expect(out[4]).toBe('pig');
    expect(out[5]).toBe('bear');
  });
  it('clamps count to [0, ANIMALS.length]', () => {
    expect(assignAnimals(0, ['bear'])).toEqual([]);
    expect(assignAnimals(-3, [])).toEqual([]);
    expect(assignAnimals(12, [])).toHaveLength(8);
  });
  it('treats invalid strings as unpicked', () => {
    const picks = ['boy', 'girl', 'cat'] as unknown as (AnimalId | undefined)[];
    expect(assignAnimals(3, picks)).toEqual(['bear', 'rabbit', 'cat']);
  });
  it('ignores picks beyond count and does not mutate input', () => {
    const picks: (AnimalId | undefined)[] = [undefined, 'dog', 'bear'];
    expect(assignAnimals(2, picks)).toEqual(['bear', 'dog']);
    expect(picks).toEqual([undefined, 'dog', 'bear']);
  });
});
