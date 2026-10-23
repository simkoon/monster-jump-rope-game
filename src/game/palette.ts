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

// Pawn eye color: white on the two dark bodies, ink everywhere else.
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
  pawnBase: '#FFFFFF',
  cheek: '#FF80B5',
  crown: '#FFCB2E',
  turnRing: '#22B0F2',
  preview: '#22B0F2',
  pathDot: '#FFFFFF',
  diceBody: '#FFFDF4',
  dicePip: '#173A57',
  shadow: '#123A58',
} as const;

// Bright toy-candy lighting: no shadow maps, no post-processing, no HDRI (D-03/D-04).
export const LIGHTS = {
  hemi: { sky: '#FFFFFF', ground: '#CFE4F5', intensity: 1.4 },
  key: { color: '#FFF6E0', intensity: 1.6, position: [5, 10, 7] as const },
  rim: { color: '#8FD0FF', intensity: 0.5, position: [-6, 6, -6] as const },
} as const;
