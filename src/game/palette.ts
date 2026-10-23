// src/game/palette.ts — the single hex source shared by the DOM HUD and the 3D scene (D-14, HUD-01).
// PHASE 6 CONTRACT: this file MUST stay
//   - free of React/DOM imports, and
//   - free of any runtime import of three / @react-three/* (main-chunk safety: it is read by
//     the DOM HUD in the main bundle; the 3D code lives in the lazy chunk).
// Values come from 06-UI-SPEC "Color". The 3D canvas renders with <Canvas flat> (NoToneMapping)
// so these hexes look the same on the board as on the scoreboard (RESEARCH Pitfall 5).
// palette.test.ts pins DIFF_COLOR and 7 of 8 ANIMAL_COLOR values to the index.css light tokens.
import type { AnimalId } from '../engine/animals';
import type { Difficulty } from '../schema';

// Participant color by animal id. The engine assigns distinct animals, so colors never repeat.
export const ANIMAL_COLOR: Readonly<Record<AnimalId, string>> = {
  bear: '#9C6644', // the only new color — no brown token exists
  rabbit: '#FFFFFF', // --panel (light)
  cat: '#9A7DFF', // --grape
  dog: '#1183D6', // --sky-deep
  panda: '#173A57', // --ink (light)
  fox: '#FF9F1C', // --sun-deep
  pig: '#FF80B5', // --pink
  chick: '#FFCB2E', // --sun
};

// Line-eye color (blinks, ^^ arcs, sad-closed eyes): ink on light bodies; white = the sclera-eye
// species (dog, panda), whose round eyes get a white sclera.
export const ANIMAL_EYE: Readonly<Record<AnimalId, string>> = {
  bear: '#173A57',
  rabbit: '#173A57',
  cat: '#173A57',
  dog: '#FFFFFF',
  panda: '#FFFFFF',
  fox: '#173A57',
  pig: '#173A57',
  chick: '#173A57',
};

// Quest tile top color = editor difficulty badge color (--easy / --normal / --hard).
export const DIFF_COLOR: Readonly<Record<Difficulty, string>> = {
  easy: '#25D6A0',
  normal: '#FFB020',
  hard: '#FF5C7A',
};

// Event pad (hexagon), its top disc and the three effect icons.
export const EVENT_COLOR = {
  pad: '#9A7DFF',
  top: '#FFFDF4',
  forward: '#25D6A0',
  backward: '#FF5C7A',
  extra: '#9A7DFF',
} as const;

// Named 3D colors from the UI-SPEC "3D 씬 색" table.
export const SCENE_COLOR = {
  baseSide: '#BEE7FF',
  track: '#FFFDF4',
  yard: '#DDFCED',
  start: '#FFCB2E',
  startEmissive: '#FF9F1C',
  gatePillar: '#FFFFFF',
  gateArch: '#FF5C7A',
  gateFlag: '#22B0F2',
  gateStar: '#FFCB2E',
  tileStar: '#FFCB2E',
  starEmissive: '#FF9F1C',
  chevron: '#FFFFFF',
  outline: '#173A57',
  crown: '#FFCB2E',
  turnRing: '#22B0F2',
  preview: '#22B0F2',
  pathDot: '#FFFFFF',
  diceBody: '#FFFDF4',
  dicePip: '#173A57',
  shadow: '#123A58',
} as const;

// Chibi character part colors (Phase 7, 07-UI-SPEC "캐릭터 부품 색", D-01/D-03). Body and head use
// ANIMAL_COLOR; every other part color comes from here. Only six hexes are new (tints or shades of
// existing hues); the rest reuse a token or a palette value. Same hex in the dark theme (toy plastic).
export const CHAR_COLOR = {
  ink: '#173A57', // outline hull, pupils, noses, closed mouth lines, panda parts, disc rim — = SCENE_COLOR.outline
  white: '#FFFFFF', // highlights, sclera, panda head, fox muzzle / tail tip, rabbit tail — --panel
  cheek: '#FF9EC4', // NEW (--pink tint): cheeks (not pig), rabbit / cat inner ears
  cheekPig: '#FF5C7A', // pig cheeks, dark enough on the pink body — --coral
  mouth: '#C2304F', // NEW (--coral shade): open mouths, chick mouth
  tongue: '#FF80B5', // tongues, rabbit / cat noses — --pink
  sweat: '#7FD3FF', // NEW (sky tint, not the accent): the sad sweat drop
  sparkle: '#FFCB2E', // the three winner sparkles — --sun
  bearMuzzle: '#E8C9A0', // NEW (bear tint): bear muzzle, belly and inner ears
  dogMuzzle: '#EFF8FF', // dog muzzle and belly — --panel-2
  dogEar: '#0C5E9A', // NEW (--sky-deep shade): dog floppy ears
  pigNose: '#F0609E', // NEW (--pink shade): pig snout and ears
  cream: '#FFFDF4', // fox inner ears — SCENE_COLOR.track
  beak: '#FF9F1C', // chick beak — --sun-deep
  feather: '#FFB020', // chick head feathers, wings, tail — --normal
} as const;

// Phase 8 3D effect colors (08-UI-SPEC "3D 효과 색 FX_COLOR"). Every value is an existing index.css
// token hex; `puff` (= --line) is the only value new to this file. Lists are cycled by instance index,
// so the share of a color in a list is its share in the effect. No sky (accent) and no coral
// (hard / backward meaning) in the confetti. Effects use MeshBasicMaterial, so the hexes show as is.
export const FX_COLOR = {
  // sun, pink, grass, grape, normal, panel — equal shares (⭐1 / ⭐2 confetti).
  confetti: ['#FFCB2E', '#FF80B5', '#25D6A0', '#9A7DFF', '#FFB020', '#FFFFFF'],
  // ⭐3 / ceremony: 4 of 10 slots sun / sun-deep (40 %), the other 6 = the confetti set (60 %).
  confettiGold: ['#FFCB2E', '#FF80B5', '#FF9F1C', '#25D6A0', '#FFCB2E', '#9A7DFF', '#FF9F1C', '#FFB020', '#FFCB2E', '#FFFFFF'],
  burst: '#FFCB2E', // star burst and the start-bonus sparkles — --sun
  burstAlt: '#FFFFFF', // ⭐3 burst alternates with white — --panel
  ring: '#FFFFFF', // shock-wave ring — --panel
  ringGold: '#FFCB2E', // ⭐3 second ring, ceremony ring — --sun
  sparkle: ['#FFCB2E', '#FFFFFF'], // lucky-event sparkles, 50 / 50
  puff: '#D8EAF8', // trap-event puff — --line (never grey or dark: no scare)
  puffAlt: '#FFFFFF', // 40 % of the puffs — --panel
  podium: '#FFCB2E', // ceremony gold step — --sun
  podiumEmissive: '#FF9F1C', // its emissive (0.2) — --sun-deep
  podiumGround: '#DDFCED', // ceremony ground disc — --candy-mint
} as const;

// Bright toy-candy lighting: no shadow maps, no post-processing, no HDRI (D-03/D-04).
export const LIGHTS = {
  hemi: { sky: '#FFFFFF', ground: '#CFE4F5', intensity: 1.4 },
  key: { color: '#FFF6E0', intensity: 1.6, position: [5, 10, 7] as const },
  rim: { color: '#8FD0FF', intensity: 0.5, position: [-6, 6, -6] as const },
} as const;
