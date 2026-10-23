// src/game/scene/actorGeometries.ts — module-singleton parts for the moving actors (D-17, D-18, D-20, D-28).
// The turn ring, the crown, the path preview and the die share these geometries and materials.
// They are created ONCE at import, passed by reference with `dispose={null}`, and never disposed
// (RESEARCH Pitfall 9). The crown is merged into one geometry, so ring and crown add one draw call
// each. Phase 7 (07-04): the chibi character parts live in chibiSpecies / chibiFaces; the Phase 6
// pawn parts (base disc, capsule body, head, eyes, cheeks, outline shell, blob shadow) are gone.
// Sizes come from 06-UI-SPEC "S2 — 3D 씬"; colors from "3D 씬 색" via palette.ts.
// This module lives in the lazy 3D chunk, so it may import three at runtime.
import {
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  MeshStandardMaterial,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SCENE_COLOR } from '../palette';

const at = <G extends BufferGeometry>(g: G, x: number, y: number, z: number): G => {
  g.translate(x, y, z);
  return g;
};

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
