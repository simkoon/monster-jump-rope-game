// src/game/palette.ts — the single hex source shared by the DOM HUD and the 3D scene (D-14, HUD-01).
// PHASE 6 CONTRACT: this file MUST stay
//   - free of React/DOM imports, and
//   - free of any runtime import of three / @react-three/* (main-chunk safety: it is read by
//     the DOM HUD in the main bundle; the 3D code lives in the lazy chunk).
// Values come from 06-UI-SPEC "Color". The 3D canvas renders with <Canvas flat> (NoToneMapping)
// so these hexes look the same on the board as on the scoreboard (RESEARCH Pitfall 5).
// palette.test.ts pins DIFF_COLOR and 5 of 8 ANIMAL_COLOR values to the index.css light tokens
// (pastel macaron palette).
import type { AnimalId } from '../engine/animals';
import type { Difficulty } from '../schema';

// Participant color by animal id. The engine assigns distinct animals, so colors never repeat.
export const ANIMAL_COLOR: Readonly<Record<AnimalId, string>> = {
  bear: '#C49A78', // NEW — no brown token exists
  rabbit: '#FFFFFF', // --panel (light)
  cat: '#B49CFF', // --grape
  dog: '#7DB4E6', // NEW — a softer pastel blue, distinct from the --sky accent
  panda: '#3E4C6E', // NEW — a soft navy, lighter than --ink so the ink outline still reads
  fox: '#FFB86B', // --sun-deep
  pig: '#FFA6C9', // --pink
  chick: '#FFD966', // --sun
};

// Line-eye color (blinks, ^^ arcs, sad-closed eyes): ink on every body except the panda, whose
// white line eyes and white sclera read on its ink eye patches. The pastel blue dog hides a white
// eye, so it uses ink too.
export const ANIMAL_EYE: Readonly<Record<AnimalId, string>> = {
  bear: '#26385A',
  rabbit: '#26385A',
  cat: '#26385A',
  dog: '#26385A',
  panda: '#FFFFFF',
  fox: '#26385A',
  pig: '#26385A',
  chick: '#26385A',
};

// Quest tile top color = editor difficulty badge color (--easy / --normal / --hard).
export const DIFF_COLOR: Readonly<Record<Difficulty, string>> = {
  easy: '#6FD6B0',
  normal: '#FFCB6B',
  hard: '#FF8A9B',
};

// Event pad (hexagon), its top disc and the three effect icons.
export const EVENT_COLOR = {
  pad: '#B49CFF',
  top: '#FFFCF4',
  forward: '#6FD6B0',
  backward: '#FF8A9B',
  extra: '#B49CFF',
} as const;

// Named 3D colors from the UI-SPEC "3D 씬 색" table.
export const SCENE_COLOR = {
  baseSide: '#D4EEFC',
  track: '#FFFCF4',
  yard: '#E2F7EE',
  start: '#FFD966',
  startEmissive: '#FFB86B',
  gatePillar: '#FFFFFF',
  gateArch: '#FF8A9B',
  gateFlag: '#6EC3EE',
  gateStar: '#FFD966',
  tileStar: '#FFD966',
  starEmissive: '#FFB86B',
  chevron: '#FFFFFF',
  outline: '#26385A',
  crown: '#FFD966',
  turnRing: '#6EC3EE',
  preview: '#6EC3EE',
  pathDot: '#FFFFFF',
  diceBody: '#FFFCF4',
  dicePip: '#26385A',
  shadow: '#2E4466',
} as const;

// Chibi character part colors (Phase 7, 07-UI-SPEC "캐릭터 부품 색", D-01/D-03). Body and head use
// ANIMAL_COLOR; every other part color comes from here. Only six hexes are new (tints or shades of
// existing hues); the rest reuse a token or a palette value. Same hex in the dark theme (toy plastic).
export const CHAR_COLOR = {
  ink: '#26385A', // outline hull, pupils, noses, closed mouth lines, panda parts, disc rim — = SCENE_COLOR.outline
  white: '#FFFFFF', // highlights, sclera, panda head, fox muzzle / tail tip, rabbit tail — --panel
  cheek: '#FFC2DA', // NEW (--pink tint): cheeks (not pig), rabbit / cat inner ears
  cheekPig: '#FF8A9B', // pig cheeks, dark enough on the pink body — --coral
  mouth: '#D9566E', // NEW (--coral shade): open mouths, chick mouth
  tongue: '#FFA6C9', // tongues, rabbit / cat noses — --pink
  sweat: '#A8DDF7', // NEW (sky tint, not the accent): the sad sweat drop
  sparkle: '#FFD966', // the three winner sparkles — --sun
  bearMuzzle: '#EAD3BC', // NEW (bear tint): bear muzzle, belly and inner ears
  dogMuzzle: '#F3F8FF', // dog muzzle and belly — --panel-2
  dogEar: '#4F8CC4', // NEW (dog body shade): dog floppy ears
  pigNose: '#F08AB4', // NEW (--pink shade): pig snout and ears
  cream: '#FFFCF4', // fox inner ears — SCENE_COLOR.track
  beak: '#FFB86B', // chick beak — --sun-deep
  feather: '#FFCB6B', // chick head feathers, wings, tail — --normal
} as const;

// Phase 8 3D effect colors (08-UI-SPEC "3D 효과 색 FX_COLOR"). Every value is an existing index.css
// token hex; `puff` (= --line) is the only value new to this file. Lists are cycled by instance index,
// so the share of a color in a list is its share in the effect. No sky (accent) and no coral
// (hard / backward meaning) in the confetti. Effects use MeshBasicMaterial, so the hexes show as is.
export const FX_COLOR = {
  // sun, pink, grass, grape, normal, panel — equal shares (⭐1 / ⭐2 confetti).
  confetti: ['#FFD966', '#FFA6C9', '#6FD6B0', '#B49CFF', '#FFCB6B', '#FFFFFF'],
  // ⭐3 / ceremony: 4 of 10 slots sun / sun-deep (40 %), the other 6 = the confetti set (60 %).
  confettiGold: ['#FFD966', '#FFA6C9', '#FFB86B', '#6FD6B0', '#FFD966', '#B49CFF', '#FFB86B', '#FFCB6B', '#FFD966', '#FFFFFF'],
  burst: '#FFD966', // star burst and the start-bonus sparkles — --sun
  burstAlt: '#FFFFFF', // ⭐3 burst alternates with white — --panel
  ring: '#FFFFFF', // shock-wave ring — --panel
  ringGold: '#FFD966', // ⭐3 second ring, ceremony ring — --sun
  sparkle: ['#FFD966', '#FFFFFF'], // lucky-event sparkles, 50 / 50
  puff: '#DDE8F5', // trap-event puff — --line (never grey or dark: no scare)
  puffAlt: '#FFFFFF', // 40 % of the puffs — --panel
  podium: '#FFD966', // ceremony gold step — --sun
  podiumEmissive: '#FFB86B', // its emissive (0.2) — --sun-deep
  podiumGround: '#E2F7EE', // ceremony ground disc — --candy-mint
} as const;

// Bright toy-candy lighting: no shadow maps, no post-processing, no HDRI (D-03/D-04).
export const LIGHTS = {
  hemi: { sky: '#FFFFFF', ground: '#DCE8F5', intensity: 1.4 },
  key: { color: '#FFF6E0', intensity: 1.6, position: [5, 10, 7] as const },
  rim: { color: '#8FD0FF', intensity: 0.5, position: [-6, 6, -6] as const },
} as const;
