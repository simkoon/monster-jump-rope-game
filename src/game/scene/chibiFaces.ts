// src/game/scene/chibiFaces.ts — the 9 prebuilt face geometries of each chibi animal (D-03, D-07..D-09, CHAR-02).
// A character's face is ONE mesh whose geometry is swapped between these keys (UI-SPEC C3): idle,
// idleBlink, excited, excitedBlink, joy (^^), sad (sweat drop), sadBlink, surprised (O mouth) and
// winner (^^ + 3 sparkles). Every key has the same attribute layout and is drawn with CHAR_MAT, so an
// expression change never creates a geometry or material and never recompiles a shader; there is
// no canvas texture — the face is code geometry too (D-09).
// Parts sit on the head ellipsoid's front surface (head-center frame, chibiParts `onSurface`) with
// a small lift so nothing z-fights: eyes below the head center with white highlights, pink cheeks
// on every key, small mouths (D-03). Only the panda (white ANIMAL_EYE) gets sclera eyes, and its
// line eyes are white so they read on its ink eye patches; every other animal uses ink. Lines and
// highlights stay ≥ LINE_R_MIN / HIGHLIGHT_R_MIN (phone legibility). TorusGeometry with arc π is the
// ∩ arch (^^ eyes, sad mouth) and turned by π it is the ∪ smile; CircleGeometry(r, n, π, π) is the
// lower half-disc open mouth.
// Every participating animal gets all 9 keys prebuilt during React render through faceSet (D-08a),
// so the frame loop only swaps cached references and a failing build is a render error an error
// boundary catches. Faces are cached per (animal, key) and never disposed (Phase 6 Pitfall 9).
// Values are UI-SPEC C3 START values; 07-05 may tune them after the gallery check.
// This module lives in the lazy 3D chunk, so it may import three at runtime.
import {
  CapsuleGeometry,
  CircleGeometry,
  ConeGeometry,
  ExtrudeGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Matrix4,
} from 'three';
import type { AnimalId } from '../../engine/animals';
import {
  CHEEK_X,
  CHEEK_Y,
  EYE_X,
  EYE_Y,
  FACE_KEYS,
  HEAD_A,
  HEAD_B,
  HEAD_C,
  HIGHLIGHT_R_MIN,
  LINE_R_MIN,
  PIG_CHEEK,
  PIG_EYE,
  type FaceKey,
} from '../layout/chibiDims';
import { ANIMAL_EYE, CHAR_COLOR } from '../palette';
import { bake, M, onSurface, part, surfaceZ } from './chibiParts';
import { HEAD_E, mouthAnchor } from './chibiSpecies';

const INK = CHAR_COLOR.ink;
const WHITE = CHAR_COLOR.white;
const SIDES = [-1, 1] as const;
const SPHERE = new SphereGeometry(1, 14, 10);

// ── Eyes (head-local, UI-SPEC C3) ───────────────────────────────────────────────────────────
const EYE = [0.05, 0.062, 0.025] as const; // ink ellipsoid semi-axes
const SCLERA = [0.058, 0.07, 0.022] as const;
const PUPIL = [0.04, 0.05, 0.02] as const;
const PUPIL_DROP = 0.008; // pupil below the sclera center
const EYE_LIFT = -0.012; // eye center along the surface normal (front pokes out ≈ 0.013)
// Panda eyes sit on the ink patches (≈ 0.025 proud of the head): lift them over the patch and keep
// them smaller than it so the patch still reads.
const PANDA_EYE_LIFT = 0.022;
const PANDA_EYE_SCALE = 0.8;
const HIGHLIGHT_R = 0.02;
const HIGHLIGHT_AT = [0.018, 0.025] as const; // same side on both eyes (one light)
const BLINK = { r: 0.013, len: 0.07 } as const;
const HAPPY = { R: 0.044, r: 0.024, dy: -0.012 } as const; // ^^
const SAD_CLOSED = { R: 0.03, r: 0.012 } as const;
const BROW = { r: 0.012, len: 0.06, sadDy: 0.085, upDy: 0.11, tilt: 0.35 } as const;
const PANDA_BROW_UP = 0.035; // panda brows sit on the white head above the patches (y +0.085)
// ── Cheeks ──
const CHEEK = [0.05, 0.032, 0.012] as const;
// ── Mouths (relative to the species mouth anchor) ──
const SMILE = { R: 0.024, r: 0.012 } as const;
const OPEN_R = 0.032;
const BIG_R = 0.05;
const TONGUE = { r: 0.025, dy: -0.022 } as const;
const O_MOUTH = { R: 0.026, r: 0.013, dy: -0.02 } as const;
const CHICK_OPEN_R = 0.03;
const CHICK_O = { R: 0.018, r: 0.012, dy: -0.015 } as const;
// ── Extras ──
const SWEAT = { r: 0.03, h: 0.05, x: 0.25, y: 0.12, lift: 0.02 } as const;
const SPARKLE = { r: 0.06, inner: 0.022, depth: 0.015 } as const;
const SPARKLES = [
  [-0.33, 0.18, 0.05],
  [0.34, 0.22, 0],
  [0.28, -0.12, 0.12],
] as const;

type Highlight = readonly [r: number, dx: number, dy: number];
type Eyes =
  | { kind: 'round'; sx: number; sy: number; dy: number; hl: readonly Highlight[] }
  | { kind: 'blink' }
  | { kind: 'happy' }
  | { kind: 'sadClosed' };
type Mouth = 'smile' | 'open' | 'big' | 'frown' | 'o';

interface FaceSpec {
  eyes: Eyes;
  mouth: Mouth;
  cheek: number;
  brows?: 'sad' | 'up';
  sweat?: true;
  sparkles?: true;
}

const IDLE_EYES: Eyes = { kind: 'round', sx: 1, sy: 1, dy: 0, hl: [[HIGHLIGHT_R, ...HIGHLIGHT_AT]] };
const EXCITED_EYES: Eyes = {
  kind: 'round',
  sx: 1.1,
  sy: 1.1,
  dy: 0,
  hl: [
    [0.026, ...HIGHLIGHT_AT],
    [HIGHLIGHT_R_MIN, -0.016, -0.022],
  ],
};
const SAD_EYES: Eyes = { kind: 'round', sx: 0.85, sy: 0.85, dy: -0.01, hl: [] };

const FACES: Readonly<Record<FaceKey, FaceSpec>> = {
  idle: { eyes: IDLE_EYES, mouth: 'smile', cheek: 1 },
  idleBlink: { eyes: { kind: 'blink' }, mouth: 'smile', cheek: 1 },
  excited: { eyes: EXCITED_EYES, mouth: 'open', cheek: 1.15 },
  excitedBlink: { eyes: { kind: 'blink' }, mouth: 'open', cheek: 1.15 },
  joy: { eyes: { kind: 'happy' }, mouth: 'big', cheek: 1.2 },
  sad: { eyes: SAD_EYES, mouth: 'frown', cheek: 1, brows: 'sad', sweat: true },
  sadBlink: { eyes: { kind: 'sadClosed' }, mouth: 'frown', cheek: 1, brows: 'sad', sweat: true },
  surprised: {
    eyes: { kind: 'round', sx: SCLERA[0] / EYE[0], sy: 0.068 / EYE[1], dy: 0, hl: [[0.014, ...HIGHLIGHT_AT]] },
    mouth: 'o',
    cheek: 1,
    brows: 'up',
  },
  winner: { eyes: { kind: 'happy' }, mouth: 'big', cheek: 1.2, sparkles: true },
};

// A tube arc with round end caps (arc < 2π) — line eyes, closed mouths.
function arcLine(hex: string, R: number, r: number, arc: number, m: Matrix4): BufferGeometry[] {
  const out = [part(new TorusGeometry(R, r, 8, 20, arc), hex, m)];
  if (arc < 2 * Math.PI) {
    for (const t of [0, arc]) out.push(part(SPHERE, hex, m.clone().multiply(M(R * Math.cos(t), R * Math.sin(t), 0, r, r, r))));
  }
  return out;
}

// Four-point star, centered on its depth.
function sparkleGeometry(): ExtrudeGeometry {
  const s = new Shape();
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 2 + (k * Math.PI) / 4;
    const r = k % 2 === 0 ? SPARKLE.r : SPARKLE.inner;
    if (k === 0) s.moveTo(r * Math.cos(a), r * Math.sin(a));
    else s.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  s.closePath();
  const g = new ExtrudeGeometry(s, { depth: SPARKLE.depth, bevelEnabled: false });
  g.translate(0, 0, -SPARKLE.depth / 2);
  return g;
}

function eyesParts(animal: AnimalId, eyes: Eyes): BufferGeometry[] {
  const sclera = ANIMAL_EYE[animal] === WHITE;
  const panda = animal === 'panda';
  const [ex0, ey0] = animal === 'pig' ? PIG_EYE : [EYE_X, EYE_Y];
  const lineHex = ANIMAL_EYE[animal];
  const base = panda ? PANDA_EYE_LIFT : 0;
  const k = panda ? PANDA_EYE_SCALE : 1;
  const out: BufferGeometry[] = [];
  for (const s of SIDES) {
    const ex = s * ex0;
    switch (eyes.kind) {
      case 'round': {
        const ey = ey0 + eyes.dy;
        const sx = eyes.sx * k;
        const sy = eyes.sy * k;
        let depth: number; // front of the eye above the surface, for the highlights
        if (sclera) {
          out.push(part(SPHERE, WHITE, onSurface(HEAD_E, ex, ey, base + EYE_LIFT + 0.002, SCLERA[0] * sx, SCLERA[1] * sy, SCLERA[2])));
          out.push(part(SPHERE, INK, onSurface(HEAD_E, ex, ey - PUPIL_DROP * sy, base + EYE_LIFT + 0.006, PUPIL[0] * sx, PUPIL[1] * sy, PUPIL[2])));
          depth = base + EYE_LIFT + 0.006 + PUPIL[2];
        } else {
          out.push(part(SPHERE, INK, onSurface(HEAD_E, ex, ey, base + EYE_LIFT, EYE[0] * sx, EYE[1] * sy, EYE[2])));
          depth = base + EYE_LIFT + EYE[2];
        }
        for (const [r, hx, hy] of eyes.hl) {
          const rr = Math.max(r, HIGHLIGHT_R_MIN) * k;
          out.push(part(SPHERE, WHITE, onSurface(HEAD_E, ex + hx * sx, ey + hy * sy, depth - rr * 0.3, rr, rr, rr * 0.6)));
        }
        break;
      }
      case 'blink':
        out.push(
          part(
            new CapsuleGeometry(Math.max(BLINK.r, LINE_R_MIN), BLINK.len * k, 4, 10),
            lineHex,
            onSurface(HEAD_E, ex, ey0, base - 0.003, 1, 1, 1, Math.PI / 2),
          ),
        );
        break;
      case 'happy':
        out.push(...arcLine(lineHex, HAPPY.R * k, HAPPY.r, Math.PI, onSurface(HEAD_E, ex, ey0 + HAPPY.dy, base - 0.008)));
        break;
      case 'sadClosed':
        out.push(...arcLine(lineHex, SAD_CLOSED.R * k, SAD_CLOSED.r, Math.PI, onSurface(HEAD_E, ex, ey0, base - 0.004, 1, 1, 1, Math.PI)));
        break;
    }
  }
  return out;
}

function browParts(animal: AnimalId, brows: 'sad' | 'up'): BufferGeometry[] {
  const [ex0, ey0] = animal === 'pig' ? PIG_EYE : [EYE_X, EYE_Y];
  const y = ey0 + (brows === 'sad' ? BROW.sadDy : BROW.upDy) + (animal === 'panda' ? PANDA_BROW_UP : 0);
  return SIDES.map((s) =>
    part(
      new CapsuleGeometry(Math.max(BROW.r, LINE_R_MIN), BROW.len, 4, 10),
      INK,
      // Horizontal; on the sad face the inner ends (toward the nose) are raised.
      onSurface(HEAD_E, s * ex0, y, -0.004, 1, 1, 1, Math.PI / 2 + (brows === 'sad' ? -s * BROW.tilt : 0)),
    ),
  );
}

function cheekParts(animal: AnimalId, scale: number): BufferGeometry[] {
  const [cx, cy] = animal === 'pig' ? PIG_CHEEK : [CHEEK_X, CHEEK_Y];
  const hex = animal === 'pig' ? CHAR_COLOR.cheekPig : CHAR_COLOR.cheek;
  return SIDES.map((s) =>
    part(SPHERE, hex, onSurface(HEAD_E, s * cx, cy, -CHEEK[2] * 0.5, CHEEK[0] * scale, CHEEK[1] * scale, CHEEK[2])),
  );
}

const halfDisc = (r: number) => new CircleGeometry(r, 18, Math.PI, Math.PI);

function mouthParts(animal: AnimalId, mouth: Mouth): BufferGeometry[] {
  const { e, y } = mouthAnchor(animal);
  const at = (dy: number, lift: number, rz = 0) => onSurface(e, 0, y + dy, lift, 1, 1, 1, rz);
  if (animal === 'chick') {
    // The beak is fixed on the head, so the chick only opens a small mouth under it (UI-SPEC C3).
    if (mouth === 'big') return [part(halfDisc(CHICK_OPEN_R), CHAR_COLOR.mouth, at(0, 0.003))];
    if (mouth === 'o') return arcLine(INK, CHICK_O.R, CHICK_O.r, 2 * Math.PI, at(CHICK_O.dy, -0.004));
    return [];
  }
  switch (mouth) {
    case 'smile':
      return arcLine(INK, SMILE.R, SMILE.r, Math.PI, at(0, -0.004, Math.PI));
    case 'frown':
      return arcLine(INK, SMILE.R, SMILE.r, Math.PI, at(-SMILE.R, -0.004));
    case 'open':
      return [part(halfDisc(OPEN_R), CHAR_COLOR.mouth, at(0, 0.003))];
    case 'big':
      return [
        part(halfDisc(BIG_R), CHAR_COLOR.mouth, at(0, 0.003)),
        part(halfDisc(TONGUE.r), CHAR_COLOR.tongue, at(TONGUE.dy, 0.005)),
      ];
    case 'o':
      return arcLine(INK, O_MOUTH.R, O_MOUTH.r, 2 * Math.PI, at(O_MOUTH.dy, -0.004));
  }
}

// Sweat drop on the temple: a ball with a cone on top, upright in the head frame.
function sweatParts(): BufferGeometry[] {
  const w = SWEAT;
  const z = surfaceZ(w.x, w.y, HEAD_A, HEAD_B, HEAD_C, w.lift);
  return [
    part(SPHERE, CHAR_COLOR.sweat, M(w.x, w.y, z, w.r, w.r, w.r)),
    part(new ConeGeometry(w.r, w.h, 14), CHAR_COLOR.sweat, M(w.x, w.y + w.h / 2, z)),
  ];
}

let sparkle: ExtrudeGeometry | null = null;
function sparkleParts(): BufferGeometry[] {
  sparkle ??= sparkleGeometry();
  // All three float just outside the head silhouette, facing the camera; no hull (UI-SPEC C1).
  return SPARKLES.map(([x, y, z]) => part(sparkle!, CHAR_COLOR.sparkle, M(x, y, z)));
}

function buildFace(animal: AnimalId, key: FaceKey): BufferGeometry {
  const f = FACES[key];
  const parts = [...eyesParts(animal, f.eyes), ...cheekParts(animal, f.cheek), ...mouthParts(animal, f.mouth)];
  if (f.brows) parts.push(...browParts(animal, f.brows));
  if (f.sweat) parts.push(...sweatParts());
  if (f.sparkles) parts.push(...sparkleParts());
  return bake(`${animal}:face:${key}`, parts);
}

const cache = new Map<string, BufferGeometry>();

// The face geometry for one expression key, built on first use and shared by every character.
export function faceGeo(animal: AnimalId, key: FaceKey): BufferGeometry {
  const id = `${animal}:${key}`;
  let g = cache.get(id);
  if (!g) {
    g = buildFace(animal, key);
    cache.set(id, g);
  }
  return g;
}

const sets = new Map<AnimalId, Readonly<Record<FaceKey, BufferGeometry>>>();

// All 9 face geometries of one animal, built through the cache above. Call it in render (useMemo):
// the record is frozen and its identity stable, so a frame loop can swap `faces[key]` for free.
export function faceSet(animal: AnimalId): Readonly<Record<FaceKey, BufferGeometry>> {
  let s = sets.get(animal);
  if (!s) {
    const rec = {} as Record<FaceKey, BufferGeometry>;
    for (const k of FACE_KEYS) rec[k] = faceGeo(animal, k);
    s = Object.freeze(rec);
    sets.set(animal, s);
  }
  return s;
}
