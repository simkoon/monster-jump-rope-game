// palette.ts is the single hex source for DOM + 3D (D-14, HUD-01, RESEARCH Pitfall 5).
// These tests pin it to the LIGHT theme tokens in index.css so the 3D pawns and the
// scoreboard dots can never drift apart.
import css from '../styles/index.css?raw';
import { ANIMALS } from '../engine/animals';
import { ANIMAL_COLOR, ANIMAL_EYE, CHAR_COLOR, DIFF_COLOR, EVENT_COLOR, LIGHTS, SCENE_COLOR } from './palette';

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

describe('CHAR_COLOR (Phase 7 chibi parts)', () => {
  it('has the UI-SPEC hex values', () => {
    expect(CHAR_COLOR).toEqual({
      ink: '#173A57',
      white: '#FFFFFF',
      cheek: '#FF9EC4',
      cheekPig: '#FF5C7A',
      mouth: '#C2304F',
      tongue: '#FF80B5',
      sweat: '#7FD3FF',
      sparkle: '#FFCB2E',
      bearMuzzle: '#E8C9A0',
      dogMuzzle: '#EFF8FF',
      dogEar: '#0C5E9A',
      pigNose: '#F0609E',
      cream: '#FFFDF4',
      beak: '#FF9F1C',
      feather: '#FFB020',
    });
  });

  it('reuses existing palette values and tokens for the 9 shared keys', () => {
    expect(CHAR_COLOR.ink).toBe(SCENE_COLOR.outline);
    expect(CHAR_COLOR.white).toBe(ANIMAL_COLOR.rabbit);
    expect(CHAR_COLOR.cheekPig).toBe(DIFF_COLOR.hard);
    expect(CHAR_COLOR.tongue).toBe(ANIMAL_COLOR.pig);
    expect(CHAR_COLOR.sparkle).toBe(ANIMAL_COLOR.chick);
    expect(CHAR_COLOR.beak).toBe(ANIMAL_COLOR.fox);
    expect(CHAR_COLOR.feather).toBe(DIFF_COLOR.normal);
    expect(CHAR_COLOR.cream).toBe(SCENE_COLOR.track);
    expect(up(CHAR_COLOR.dogMuzzle)).toBe(token('panel-2'));
  });

  it('adds only six new hexes (cheek, mouth, sweat, bearMuzzle, dogEar, pigNose)', () => {
    const known = new Set(
      [
        ...Object.values(ANIMAL_COLOR),
        ...Object.values(ANIMAL_EYE),
        ...Object.values(DIFF_COLOR),
        ...Object.values(EVENT_COLOR),
        ...Object.values(SCENE_COLOR),
        token('panel-2'),
      ].map(up),
    );
    const fresh = Object.entries(CHAR_COLOR)
      .filter(([, hex]) => !known.has(up(hex)))
      .map(([k]) => k)
      .sort();
    expect(fresh).toEqual(['bearMuzzle', 'cheek', 'dogEar', 'mouth', 'pigNose', 'sweat']);
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
    expect(values.length).toBeGreaterThanOrEqual(20); // 22 in Phase 6 minus the two pawn-only colors (07-04)
    for (const v of values) expect(v).toMatch(HEX);
  });

  it('LIGHTS has the UI-SPEC values', () => {
    expect(LIGHTS.hemi).toEqual({ sky: '#FFFFFF', ground: '#CFE4F5', intensity: 1.4 });
    expect(LIGHTS.key).toEqual({ color: '#FFF6E0', intensity: 1.6, position: [5, 10, 7] });
    expect(LIGHTS.rim).toEqual({ color: '#8FD0FF', intensity: 0.5, position: [-6, 6, -6] });
  });
});
