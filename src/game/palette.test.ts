// palette.ts is the single hex source for DOM + 3D (D-14, HUD-01, RESEARCH Pitfall 5).
// These tests pin it to the LIGHT theme tokens in index.css so the 3D pawns and the
// scoreboard dots can never drift apart.
import css from '../styles/index.css?raw';
import { ANIMALS } from '../engine/animals';
import { ANIMAL_COLOR, ANIMAL_EYE, DIFF_COLOR, EVENT_COLOR, LIGHTS, SCENE_COLOR } from './palette';

// First occurrence of `--name:#HEX` = the light :root block (the dark block comes later).
function token(name: string): string {
  const m = new RegExp(`--${name}\\s*:\\s*(#[0-9A-Fa-f]{6})`).exec(css);
  if (!m) throw new Error(`token --${name} not found in index.css`);
  return m[1].toUpperCase();
}

const up = (s: string) => s.toUpperCase();
const HEX = /^#[0-9A-F]{6}$/i;

describe('DIFF_COLOR', () => {
  it('has the UI-SPEC hex values', () => {
    expect(DIFF_COLOR).toEqual({ easy: '#25D6A0', normal: '#FFB020', hard: '#FF5C7A' });
  });

  it('equals the --easy / --normal / --hard light tokens', () => {
    expect(up(DIFF_COLOR.easy)).toBe(token('easy'));
    expect(up(DIFF_COLOR.normal)).toBe(token('normal'));
    expect(up(DIFF_COLOR.hard)).toBe(token('hard'));
  });
});

describe('ANIMAL_COLOR', () => {
  it('has the UI-SPEC hex values', () => {
    expect(ANIMAL_COLOR).toEqual({
      bear: '#9C6644',
      rabbit: '#FFFFFF',
      cat: '#9A7DFF',
      dog: '#1183D6',
      panda: '#173A57',
      fox: '#FF9F1C',
      pig: '#FF80B5',
      chick: '#FFCB2E',
    });
  });

  it('reuses the light tokens for 7 of 8 animals (bear is the one new color)', () => {
    expect(up(ANIMAL_COLOR.rabbit)).toBe(token('panel'));
    expect(up(ANIMAL_COLOR.cat)).toBe(token('grape'));
    expect(up(ANIMAL_COLOR.dog)).toBe(token('sky-deep'));
    expect(up(ANIMAL_COLOR.panda)).toBe(token('ink'));
    expect(up(ANIMAL_COLOR.fox)).toBe(token('sun-deep'));
    expect(up(ANIMAL_COLOR.pig)).toBe(token('pink'));
    expect(up(ANIMAL_COLOR.chick)).toBe(token('sun'));
    expect(css.toUpperCase()).not.toContain(up(ANIMAL_COLOR.bear));
  });

  it('covers every animal with 8 pairwise-distinct colors', () => {
    expect(Object.keys(ANIMAL_COLOR).sort()).toEqual([...ANIMALS].sort());
    const values = ANIMALS.map((a) => up(ANIMAL_COLOR[a]));
    expect(new Set(values).size).toBe(8);
  });
});

describe('ANIMAL_EYE', () => {
  it('is white on the dark bodies (dog, panda) and ink elsewhere', () => {
    for (const a of ANIMALS) {
      expect(ANIMAL_EYE[a]).toBe(a === 'dog' || a === 'panda' ? '#FFFFFF' : '#173A57');
    }
  });
});

describe('EVENT_COLOR / SCENE_COLOR / LIGHTS', () => {
  it('EVENT_COLOR has the UI-SPEC values', () => {
    expect(EVENT_COLOR).toEqual({
      pad: '#9A7DFF',
      top: '#FFFDF4',
      forward: '#25D6A0',
      backward: '#FF5C7A',
      extra: '#9A7DFF',
    });
  });

  it('every SCENE_COLOR value is a 6-digit hex', () => {
    const values = Object.values(SCENE_COLOR);
    expect(values.length).toBeGreaterThanOrEqual(22);
    for (const v of values) expect(v).toMatch(HEX);
  });

  it('LIGHTS has the UI-SPEC values', () => {
    expect(LIGHTS.hemi).toEqual({ sky: '#FFFFFF', ground: '#CFE4F5', intensity: 1.4 });
    expect(LIGHTS.key).toEqual({ color: '#FFF6E0', intensity: 1.6, position: [5, 10, 7] });
    expect(LIGHTS.rim).toEqual({ color: '#8FD0FF', intensity: 0.5, position: [-6, 6, -6] });
  });
});
