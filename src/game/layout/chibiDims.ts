// src/game/layout/chibiDims.ts — shared chibi body dimensions, face anchors and face keys (D-03, D-07, D-18, D-20).
// PHASE 7 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of any runtime import of three / @react-three/*
//     (main-chunk safety — the slot tables and the occlusion test read it), and
//   - pure constants only: no functions with side effects, no mutable state.
// Character-local axes: floor = y 0, the camera looks from +Z. Head-local coordinates have the head
// center as the origin (UI-SPEC C1/C2). These are START values: after the gallery check 07-05 may
// tune each part by at most ±0.02 (UI-SPEC C2) and records the result here.
//
// Cuteness rubric (D-03, UI-SPEC C1): head width / body width = 0.583 / 0.38 = 1.53 (≥ 1.3) and the
// head takes (0.874 − 0.366) / 0.874 = 58 % of the height (55–60 %, ears not counted). Eyes sit
// below the head center.

// ── Head: ellipsoid r 0.27 × (1.08, 0.94, 1.0), centered at y 0.62 ──
export const HEAD_R = 0.27;
export const HEAD_SCALE = [1.08, 0.94, 1.0] as const;
export const HEAD_A = HEAD_R * 1.08; // x semi-axis 0.292
export const HEAD_B = HEAD_R * 0.94; // y semi-axis 0.254
export const HEAD_C = HEAD_R; // z semi-axis 0.27
export const HEAD_C_Y = 0.62;
// The single global head tilt: the head group leans back by −HEAD_TILT around its own center, so
// the face reads under the 50–60° camera pitch and the head center (slot occlusion) never moves.
// 07-05 may tune it only within HEAD_TILT_MIN..HEAD_TILT_MAX.
export const HEAD_TILT = 0.6;
export const HEAD_TILT_MIN = 0.5;
export const HEAD_TILT_MAX = 0.75;

// ── Body: sphere r 0.19 × (1, 1, 0.92), centered at y 0.22 ──
export const BODY_R = 0.19;
export const BODY_Y = 0.22;
export const BODY_SCALE_Z = 0.92;
export const BELLY_R = 0.12; // belly patch (bear / dog / panda)
export const FOOT_R = 0.075;
export const FOOT_SCALE = [1, 0.6, 1.25] as const;
export const FOOT_X = 0.09;
export const FOOT_Y = 0.045;
export const FOOT_Z = 0.03;
export const ARM_R = 0.055;
export const ARM_LEN = 0.08; // short limbs (D-03-4)
export const SHOULDER = [0.15, 0.3, 0.02] as const; // arm pivot, ±x
export const ARM_REST = 0.45; // rest angle, outward and down (rad)

// ── Face anchors (head-local) ──
export const EYE_X = 0.105;
export const EYE_Y = -0.035; // below the head center (D-03-2)
export const CHEEK_X = 0.185;
export const CHEEK_Y = -0.105;
export const PIG_EYE = [0.13, -0.005] as const; // the pig snout pushes eyes and cheeks apart
export const PIG_CHEEK = [0.195, -0.11] as const;
// Phone legibility floor (UI-SPEC C3): line tubes/capsules and highlights stay ≥ 0.012 radius.
export const LINE_R_MIN = 0.012;
export const HIGHLIGHT_R_MIN = 0.012;

// ── Inverted-hull outline scales (UI-SPEC C1 hull table) ──
export const HULL_HEAD = 1.045; // head, ears, feathers
export const HULL_LIMB = 1.05; // arms, feet, tails, muzzles
// No torso hull to start with; the gallery may raise it to HULL_TORSO_MAX if the white rabbit
// disappears on the cream track.
export const HULL_TORSO: number | null = null;
export const HULL_TORSO_MAX = 1.03;

// ── Ground disc under each character (UI-SPEC C6, D-18) ──
export const GROUND_DISC_R = 0.22; // participant-color disc
export const GROUND_RIM_R = 0.25; // ink rim 0.22–0.25, inside the 0.30 turn ring
export const BLOB_R = 0.3;
export const BLOB_ALPHA = 0.22;
export const GROUND_SHADOW_Y = 0.004; // above the tile top
export const GROUND_DISC_Y = 0.01;

// ── Crown (UI-SPEC C6): 1.3× the Phase 6 crown, worn on the tilted head like a hat ──
export const CROWN_SCALE = 1.3;
export const CROWN_LOCAL = [0, HEAD_B + 0.03, -0.03] as const; // head-local

// ── Derived rubric values ──
export const HEAD_WIDTH = 2 * HEAD_A;
export const BODY_WIDTH = 2 * BODY_R;
export const HEAD_TOP = HEAD_C_Y + HEAD_B;
export const HEAD_BOTTOM = HEAD_C_Y - HEAD_B;
export const HEAD_HEIGHT_RATIO = (HEAD_TOP - HEAD_BOTTOM) / HEAD_TOP;

// ── Face vocabulary (UI-SPEC C3, D-07) ──
export const EXPRESSIONS = ['idle', 'excited', 'joy', 'sad', 'surprised', 'winner'] as const;
export type Expression = (typeof EXPRESSIONS)[number];

// Face geometry keys: each expression plus the blink variants of idle / excited / sad.
export const FACE_KEYS = [
  'idle',
  'idleBlink',
  'excited',
  'excitedBlink',
  'joy',
  'sad',
  'sadBlink',
  'surprised',
  'winner',
] as const;
export type FaceKey = (typeof FACE_KEYS)[number];
