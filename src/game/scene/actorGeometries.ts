// src/game/scene/actorGeometries.ts — module-singleton parts for the moving actors (D-17, D-18, D-20, D-28).
// Pawns, the path preview and the die share these geometries and materials. They are created ONCE
// at import, passed by reference with `dispose={null}`, and never disposed (RESEARCH Pitfall 9).
// Small repeated parts (two eyes, two cheeks, the body+head outline, the crown) are merged into one
// geometry each, so a pawn is 7 draw calls (+ ring / crown) and 8 pawns stay inside the D-28 budget.
// Pawn parts are baked in the pawn's local frame: feet at y = 0, face toward +Z (the camera).
// Sizes come from 06-UI-SPEC "S2 — 3D 씬"; colors from "3D 씬 색" via palette.ts.
// This module lives in the lazy 3D chunk, so it may import three at runtime.
import {
  BackSide,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { AnimalId } from '../../engine/animals';
import { ANIMAL_COLOR, SCENE_COLOR } from '../palette';

// ── pawn dimensions (local frame) ───────────────────────────────────────────────────────────
const BASE_R = 0.24;
const BASE_H = 0.06;
const BODY_R = 0.17;
const BODY_LEN = 0.2;
const BODY_Y = BASE_H + BODY_R + BODY_LEN / 2; // capsule resting on the base disc
const HEAD_R = 0.16;
export const HEAD_Y = 0.62;
const EYE_R = 0.028;
const EYE_GAP = 0.12;
const EYE_Y = HEAD_Y + 0.02;
const CHEEK_R = 0.03;
const CHEEK_X = 0.095;
const CHEEK_Y = HEAD_Y - 0.04;
const OUTLINE_SCALE = 1.06;
export const CROWN_Y = HEAD_Y + HEAD_R + 0.03; // band center just above the head

const at = <G extends BufferGeometry>(g: G, x: number, y: number, z: number): G => {
  g.translate(x, y, z);
  return g;
};

// Point on the head sphere surface toward +Z at (x, y), pushed out by `lift`.
const headZ = (x: number, y: number, lift: number) =>
  Math.sqrt(Math.max(0, HEAD_R * HEAD_R - x * x - (y - HEAD_Y) * (y - HEAD_Y))) + lift;

function eyesGeometry(): BufferGeometry {
  const x = EYE_GAP / 2;
  const z = headZ(x, EYE_Y, -0.006);
  return mergeGeometries([
    at(new SphereGeometry(EYE_R, 12, 10), -x, EYE_Y, z),
    at(new SphereGeometry(EYE_R, 12, 10), x, EYE_Y, z),
  ])!;
}

function cheeksGeometry(): BufferGeometry {
  const z = headZ(CHEEK_X, CHEEK_Y, 0.008);
  return mergeGeometries([
    at(new CircleGeometry(CHEEK_R, 16), -CHEEK_X, CHEEK_Y, z),
    at(new CircleGeometry(CHEEK_R, 16), CHEEK_X, CHEEK_Y, z),
  ])!;
}

// Ink outline: body + head grown by 6 % around their own centers, drawn with BackSide.
function outlineGeometry(): BufferGeometry {
  const body = new CapsuleGeometry(BODY_R, BODY_LEN, 6, 16);
  body.scale(OUTLINE_SCALE, OUTLINE_SCALE, OUTLINE_SCALE);
  const head = new SphereGeometry(HEAD_R * OUTLINE_SCALE, 20, 16);
  return mergeGeometries([at(body, 0, BODY_Y, 0), at(head, 0, HEAD_Y, 0)])!;
}

// Flat on the floor (the circle/ring faces +Y).
const flat = <G extends BufferGeometry>(g: G, y: number): G => {
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
};

// Crown: an open band with five small cones on its rim, centered on its own band middle.
function crownGeometry(): BufferGeometry {
  const r = 0.12;
  const h = 0.08;
  const parts: BufferGeometry[] = [new CylinderGeometry(r, r, h, 24, 1, true)];
  for (let k = 0; k < 5; k++) {
    const a = (k * 2 * Math.PI) / 5;
    parts.push(at(new ConeGeometry(0.035, 0.08, 10), r * Math.sin(a), h / 2 + 0.04, r * Math.cos(a)));
  }
  return mergeGeometries(parts.map((g) => g.toNonIndexed()))!;
}

export const ACTOR_GEO = {
  base: at(new CylinderGeometry(BASE_R, BASE_R, BASE_H, 28), 0, BASE_H / 2, 0),
  body: at(new CapsuleGeometry(BODY_R, BODY_LEN, 6, 16), 0, BODY_Y, 0),
  head: at(new SphereGeometry(HEAD_R, 20, 16), 0, HEAD_Y, 0),
  eyes: eyesGeometry(),
  cheeks: cheeksGeometry(),
  outline: outlineGeometry(),
  blob: flat(new CircleGeometry(0.28, 28), 0.006),
  turnRing: flat(new RingGeometry(0.3, 0.42, 40), 0.012),
  crown: crownGeometry(),
  // Preview: a path dot per tile to pass, a ring on the destination, a cone pointing down at it.
  pathDot: new SphereGeometry(0.07, 12, 10),
  destRing: flat(new TorusGeometry(0.5, 0.06, 10, 40), 0),
  destCone: (() => {
    const g = new ConeGeometry(0.14, 0.3, 16);
    g.rotateX(Math.PI); // apex down
    return g;
  })(),
  // Die: unit rounded cube (the group scales it by diceSize) + one pip sphere for all 21 pips.
  diceBody: new RoundedBoxGeometry(1, 1, 1, 5, 0.14),
  dicePip: new SphereGeometry(0.075, 10, 8),
} as const;

const std = (
  color: string,
  roughness: number,
  extra: { emissive?: string; emissiveIntensity?: number; metalness?: number } = {},
) =>
  new MeshStandardMaterial({
    color: new Color(color),
    roughness,
    metalness: extra.metalness ?? 0,
    ...(extra.emissive ? { emissive: new Color(extra.emissive), emissiveIntensity: extra.emissiveIntensity ?? 1 } : {}),
  });

export const ACTOR_MAT = {
  base: std(SCENE_COLOR.pawnBase, 0.4),
  cheek: new MeshStandardMaterial({ color: new Color(SCENE_COLOR.cheek), roughness: 0.6, transparent: true, opacity: 0.7 }),
  outline: new MeshBasicMaterial({ color: new Color(SCENE_COLOR.outline), side: BackSide }),
  blob: new MeshBasicMaterial({ color: new Color(SCENE_COLOR.shadow), transparent: true, opacity: 0.22, depthWrite: false }),
  turnRing: std(SCENE_COLOR.turnRing, 0.4, { emissive: SCENE_COLOR.turnRing, emissiveIntensity: 0.6 }),
  crown: (() => {
    const m = std(SCENE_COLOR.crown, 0.3, { emissive: SCENE_COLOR.starEmissive, emissiveIntensity: 0.3 });
    m.side = DoubleSide; // the band is open
    return m;
  })(),
  pathDot: std(SCENE_COLOR.pathDot, 0.4, { emissive: SCENE_COLOR.preview, emissiveIntensity: 0.4 }),
  dest: std(SCENE_COLOR.preview, 0.4, { emissive: SCENE_COLOR.preview, emissiveIntensity: 0.5 }),
  diceBody: std(SCENE_COLOR.diceBody, 0.28, { metalness: 0.1 }),
  dicePip: std(SCENE_COLOR.dicePip, 0.28, { metalness: 0.1 }),
} as const;

// One body material per animal (ANIMAL_COLOR), shared by every pawn of that animal.
const pawnMats = new Map<AnimalId, MeshStandardMaterial>();
export function pawnMaterial(animal: AnimalId): MeshStandardMaterial {
  let m = pawnMats.get(animal);
  if (!m) {
    m = new MeshStandardMaterial({ color: new Color(ANIMAL_COLOR[animal]), roughness: 0.25, metalness: 0.05 });
    pawnMats.set(animal, m);
  }
  return m;
}

// Eye material by hex (ink on light bodies, white on the two dark ones).
const eyeMats = new Map<string, MeshStandardMaterial>();
export function eyeMaterial(hex: string): MeshStandardMaterial {
  let m = eyeMats.get(hex);
  if (!m) {
    m = new MeshStandardMaterial({ color: new Color(hex), roughness: 0.2, metalness: 0 });
    eyeMats.set(hex, m);
  }
  return m;
}
