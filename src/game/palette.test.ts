// palette.ts is the single hex source for DOM + 3D (D-14, HUD-01, RESEARCH Pitfall 5).
// These tests pin it to the LIGHT theme tokens in index.css (pastel macaron palette) so the 3D
// pawns and the scoreboard dots can never drift apart.
import css from '../styles/index.css?raw';
import { ANIMALS } from '../engine/animals';
import { ANIMAL_COLOR, ANIMAL_EYE, CHAR_COLOR, DIFF_COLOR, EVENT_COLOR, FX_COLOR, LIGHTS, SCENE_COLOR } from './palette';

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
    expect(DIFF_COLOR).toEqual({ easy: '#6FD6B0', normal: '#FFCB6B', hard: '#FF8A9B' });
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
      bear: '#C49A78',
      rabbit: '#FFFFFF',
      cat: '#B49CFF',
      dog: '#7DB4E6',
      panda: '#3E4C6E',
      fox: '#FFB86B',
      pig: '#FFA6C9',
      chick: '#FFD966',
    });
  });

  it('reuses the light tokens for 5 of 8 animals (bear, dog and panda are the new colors)', () => {
    expect(up(ANIMAL_COLOR.rabbit)).toBe(token('panel'));
    expect(up(ANIMAL_COLOR.cat)).toBe(token('grape'));
    expect(up(ANIMAL_COLOR.fox)).toBe(token('sun-deep'));
    expect(up(ANIMAL_COLOR.pig)).toBe(token('pink'));
    expect(up(ANIMAL_COLOR.chick)).toBe(token('sun'));
    for (const a of ['bear', 'dog', 'panda'] as const) {
      expect(css.toUpperCase(), a).not.toContain(up(ANIMAL_COLOR[a]));
    }
  });

  it('covers every animal with 8 pairwise-distinct colors', () => {
    expect(Object.keys(ANIMAL_COLOR).sort()).toEqual([...ANIMALS].sort());
    const values = ANIMALS.map((a) => up(ANIMAL_COLOR[a]));
    expect(new Set(values).size).toBe(8);
  });
});

describe('ANIMAL_EYE', () => {
  it('is white on the panda only (ink eye patches) and ink elsewhere', () => {
    for (const a of ANIMALS) {
      expect(ANIMAL_EYE[a], a).toBe(a === 'panda' ? '#FFFFFF' : '#26385A');
    }
  });
});

describe('CHAR_COLOR (Phase 7 chibi parts)', () => {
  it('has the UI-SPEC hex values', () => {
    expect(CHAR_COLOR).toEqual({
      ink: '#26385A',
      white: '#FFFFFF',
      cheek: '#FFC2DA',
      cheekPig: '#FF8A9B',
      mouth: '#D9566E',
      tongue: '#FFA6C9',
      sweat: '#A8DDF7',
      sparkle: '#FFD966',
      bearMuzzle: '#EAD3BC',
      dogMuzzle: '#F3F8FF',
      dogEar: '#4F8CC4',
      pigNose: '#F08AB4',
      cream: '#FFFCF4',
      beak: '#FFB86B',
      feather: '#FFCB6B',
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
      pad: '#B49CFF',
      top: '#FFFCF4',
      forward: '#6FD6B0',
      backward: '#FF8A9B',
      extra: '#B49CFF',
    });
  });

  it('every SCENE_COLOR value is a 6-digit hex', () => {
    const values = Object.values(SCENE_COLOR);
    expect(values.length).toBeGreaterThanOrEqual(20); // 22 in Phase 6 minus the two pawn-only colors (07-04)
    for (const v of values) expect(v).toMatch(HEX);
  });

  it('LIGHTS has the UI-SPEC values', () => {
    expect(LIGHTS.hemi).toEqual({ sky: '#FFFFFF', ground: '#DCE8F5', intensity: 1.4 });
    expect(LIGHTS.key).toEqual({ color: '#FFF6E0', intensity: 1.6, position: [5, 10, 7] });
    expect(LIGHTS.rim).toEqual({ color: '#8FD0FF', intensity: 0.5, position: [-6, 6, -6] });
  });
});

describe('--on-accent (text on pastel accents)', () => {
  it('is the ink outline hex and is declared once (bare :root only, shared by both themes)', () => {
    expect(token('on-accent')).toBe(up(SCENE_COLOR.outline));
    expect(css.match(/--on-accent\s*:/g) ?? []).toHaveLength(1);
  });
});

describe('FX_COLOR (Phase 8 3D effects, UI-SPEC "3D 효과 색")', () => {
  // Every hex in index.css (light + dark blocks), upper-cased.
  const cssHexes = new Set([...css.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((m) => up(m[0])));
  const all = (): string[] =>
    Object.values(FX_COLOR).flatMap((v) => (Array.isArray(v) ? (v as readonly string[]) : [v as string]));

  it('uses only existing index.css token hexes (no new hex)', () => {
    const values = all();
    expect(values.length).toBeGreaterThan(10);
    for (const v of values) {
      expect(v).toMatch(HEX);
      expect(cssHexes.has(up(v)), v).toBe(true);
    }
  });

  it('puff equals the --line token (the one value new to palette.ts)', () => {
    expect(up(FX_COLOR.puff)).toBe(token('line'));
    expect(up(FX_COLOR.puffAlt)).toBe(token('panel'));
  });

  it('confetti = sun, pink, grass, grape, normal, panel in equal shares; never sky or coral', () => {
    expect(FX_COLOR.confetti.map(up)).toEqual(
      ['sun', 'pink', 'grass', 'grape', 'normal', 'panel'].map((t) => token(t)),
    );
    const banned = [token('sky'), token('sky-deep'), token('coral')];
    for (const c of [...FX_COLOR.confetti, ...FX_COLOR.confettiGold]) expect(banned).not.toContain(up(c));
  });

  it('confettiGold = 40 % sun / sun-deep + 60 % the confetti set', () => {
    const g = FX_COLOR.confettiGold.map(up);
    expect(g).toHaveLength(10);
    const sunDeep = g.filter((c) => c === token('sun-deep')).length;
    const sun = g.filter((c) => c === token('sun')).length;
    // 4 gold slots (2 sun + 2 sun-deep) + the 6 confetti colors (one of which is sun).
    expect(sunDeep).toBe(2);
    expect(sun).toBe(3);
    const rest = [...g];
    for (const c of FX_COLOR.confetti.map(up)) rest.splice(rest.indexOf(c), 1);
    expect(rest.sort()).toEqual([token('sun'), token('sun'), token('sun-deep'), token('sun-deep')].sort());
  });

  it('burst / ring / sparkle / podium values follow the UI-SPEC', () => {
    expect(up(FX_COLOR.burst)).toBe(token('sun'));
    expect(up(FX_COLOR.burstAlt)).toBe(token('panel'));
    expect(up(FX_COLOR.ring)).toBe(token('panel'));
    expect(up(FX_COLOR.ringGold)).toBe(token('sun'));
    expect(FX_COLOR.sparkle.map(up)).toEqual([token('sun'), token('panel')]);
    expect(up(FX_COLOR.podium)).toBe(token('sun'));
    expect(up(FX_COLOR.podiumEmissive)).toBe(token('sun-deep'));
    expect(up(FX_COLOR.podiumGround)).toBe(token('candy-mint'));
  });
});
