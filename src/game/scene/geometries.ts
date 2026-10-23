// src/game/scene/geometries.ts — module-singleton geometries and materials for the 3D board (D-11, D-28).
// Everything here is created ONCE at import and lives for the app's lifetime. Components pass these
// objects by reference (`args={[GEO.x, MAT.y, cap]}` or `geometry={GEO.x}`) with `dispose={null}`
// and must NEVER dispose them: a disposed shared geometry would turn every later mount black or
// empty (RESEARCH Pitfall 9). After a WebGL context loss three re-uploads them to the new context.
// Dimensions come from 06-UI-SPEC "S2 — 3D 씬"; colors and materials from "3D 씬 색" via palette.ts.
// This module lives in the lazy 3D chunk, so it may import three at runtime.
import {
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  MeshStandardMaterial,
  Quaternion,
  Shape,
  TorusGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CORNER_ARROW_R, EVENT_PAD_R, START_H, START_SIZE, TILE_H, TILE_SIZE } from '../layout/ringLayout';
import { DIFF_COLOR, EVENT_COLOR, SCENE_COLOR } from '../palette';

// ── 2D outlines (shape space: +Y is "forward"/"up") ────────────────────────────────────────────

// Five-pointed star, first point straight up.
export function starShape(outer: number, inner: number): Shape {
  const s = new Shape();
  for (let k = 0; k < 10; k++) {
    const r = k % 2 === 0 ? outer : inner;
    const a = Math.PI / 2 + (k * Math.PI) / 5;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (k === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

// "›" turned to point +Y: two arms of length 0.22 and thickness 0.07 meeting at 90°.
export function chevronShape(): Shape {
  const L = 0.22;
  const w = 0.07;
  const c = Math.SQRT1_2;
  const top = 0.08;
  const tipX = L * c;
  const tipY = top - L * c;
  const s = new Shape();
  s.moveTo(0, top);
  s.lineTo(tipX, tipY);
  s.lineTo(tipX - w * c, tipY - w * c);
  s.lineTo(0, top - w * Math.SQRT2);
  s.lineTo(-(tipX - w * c), tipY - w * c);
  s.lineTo(-tipX, tipY);
  s.closePath();
  return s;
}

// Block arrow pointing +Y: total length 0.56, head width 0.44.
export function arrowShape(): Shape {
  const half = 0.28;
  const shaft = 0.1;
  const headW = 0.22;
  const neck = 0.04;
  const s = new Shape();
  s.moveTo(-shaft, -half);
  s.lineTo(shaft, -half);
  s.lineTo(shaft, neck);
  s.lineTo(headW, neck);
  s.lineTo(0, half);
  s.lineTo(-headW, neck);
  s.lineTo(-shaft, neck);
  s.closePath();
  return s;
}

// Small pennant: 0.22 long, 0.14 tall, pointing +X from its pole edge at x = 0.
function flagShape(): Shape {
  const s = new Shape();
  s.moveTo(0, 0);
  s.lineTo(0.22, 0.07);
  s.lineTo(0, 0.14);
  s.closePath();
  return s;
}

// ── geometry helpers ────────────────────────────────────────────────────────────────────────

// Lay an extruded shape flat on the floor: shape +Y → world +Z (travel when rotated by heading),
// centered on x/z, bottom at y = 0.
function layFlat<G extends BufferGeometry>(g: G): G {
  g.rotateX(Math.PI / 2);
  g.computeBoundingBox();
  const b = g.boundingBox!;
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

// Cone whose apex points along `dir`, its center placed at `at`.
function coneAlong(r: number, h: number, dir: Vector3, at: Vector3): ConeGeometry {
  const g = new ConeGeometry(r, h, 16);
  g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize()));
  g.translate(at.x, at.y, at.z);
  return g;
}

// Corner turn arrow in its local frame: travel enters along local +Z and leaves along local −X
// (a clockwise quarter turn on screen). The instance is rotated by rotation.y = inHeading, so the
// outgoing direction becomes inHeading − π/2 = outHeading. The arc midpoint sits at the origin and
// bulges toward the outer corner; the arc lies on y = 0.
const ARC_SHIFT = CORNER_ARROW_R * Math.SQRT1_2;
function cornerArcGeometry(tube: number, ySquash = 1): TorusGeometry {
  const g = new TorusGeometry(CORNER_ARROW_R, tube, 10, 24, Math.PI / 2);
  g.rotateX(Math.PI / 2); // (R cos a, R sin a, 0) → (R cos a, 0, R sin a)
  g.scale(1, ySquash, 1);
  g.translate(-ARC_SHIFT, 0.06, -ARC_SHIFT);
  return g;
}
function cornerHeadGeometry(r: number, h: number, ySquash = 1): ConeGeometry {
  // Arc end (a = π/2) is local (0, 0, R) before the shift; the head points −X from there.
  const end = new Vector3(-ARC_SHIFT - h / 2, 0, CORNER_ARROW_R - ARC_SHIFT);
  const g = coneAlong(r, h, new Vector3(-1, 0, 0), end);
  g.scale(1, ySquash, 1);
  g.translate(0, 0.06, 0);
  return g;
}

// "Extra turn" loop: a 300° arc of radius 0.2 lying flat, head at the arc end along its tangent.
const LOOP_R = 0.2;
const LOOP_ARC = (300 * Math.PI) / 180;
function loopArcGeometry(): TorusGeometry {
  const g = new TorusGeometry(LOOP_R, 0.06, 10, 40, LOOP_ARC);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0.06, 0);
  return g;
}
function loopHeadGeometry(): ConeGeometry {
  const end = new Vector3(LOOP_R * Math.cos(LOOP_ARC), 0.06, LOOP_R * Math.sin(LOOP_ARC));
  const dir = new Vector3(-Math.sin(LOOP_ARC), 0, Math.cos(LOOP_ARC));
  return coneAlong(0.1, 0.16, dir, end.clone().addScaledVector(dir, 0.08));
}

function centered<G extends BufferGeometry>(g: G): G {
  g.center();
  g.computeBoundingSphere();
  return g;
}

// Fixed InstancedMesh capacities (Pitfall 8): the largest board is 24 tiles (D-07) with at most
// 3 stars each. Meshes keep these capacities and only change `count`.
export const TILE_CAP = 24;
export const STAR_CAP = 72;

// ── shared geometries ───────────────────────────────────────────────────────────────────────

export const GEO = {
  // Rounded candy blocks (D-11), from the three addons path (not a transitive drei copy).
  tile: new RoundedBoxGeometry(TILE_SIZE, TILE_H, TILE_SIZE, 4, 0.14),
  start: new RoundedBoxGeometry(START_SIZE, START_H, START_SIZE, 4, 0.18),
  // Hexagonal event pad; CylinderGeometry puts its first vertex on local +Z (along travel).
  pad: new CylinderGeometry(EVENT_PAD_R, EVENT_PAD_R, TILE_H, 6),
  padTop: new CylinderGeometry(0.4, 0.4, 0.02, 32),
  // Floating tile star: faces +Z (the camera), centered on its own middle.
  star: centered(
    new ExtrudeGeometry(starShape(0.16, 0.07), {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    }),
  ),
  // Direction chevron lying flat, pointing local +Z.
  chevron: layFlat(
    new ExtrudeGeometry(chevronShape(), { depth: 0.04, bevelEnabled: false }),
  ),
  cornerArc: cornerArcGeometry(0.06),
  cornerHead: cornerHeadGeometry(0.1, 0.16),
  // Ink rim under the corner arrow: thicker but squashed so the white top stays visible.
  cornerOutline: mergeGeometries([cornerArcGeometry(0.085, 0.6), cornerHeadGeometry(0.13, 0.21, 0.6)])!,
  // Event icon arrow lying flat, pointing local +Z.
  arrow: layFlat(
    new ExtrudeGeometry(arrowShape(), {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
    }),
  ),
  loopArc: loopArcGeometry(),
  loopHead: loopHeadGeometry(),
  // Start gate parts (gate local frame: arch in the XY plane, opening toward local +Z).
  gatePillar: new CylinderGeometry(0.09, 0.09, 0.7, 16),
  gateArch: new TorusGeometry(0.55, 0.09, 12, 32, Math.PI),
  gateFlag: new ExtrudeGeometry(flagShape(), { depth: 0.02, bevelEnabled: false }),
  gateStar: centered(
    new ExtrudeGeometry(starShape(0.2, 0.09), {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    }),
  ),
} as const;

// ── shared materials ────────────────────────────────────────────────────────────────────────

const std = (color: string, roughness: number, extra: { emissive?: string; emissiveIntensity?: number } = {}) =>
  new MeshStandardMaterial({
    color: new Color(color),
    roughness,
    metalness: 0,
    ...(extra.emissive ? { emissive: new Color(extra.emissive), emissiveIntensity: extra.emissiveIntensity ?? 1 } : {}),
  });

export const MAT = {
  // White base so per-instance colors show the exact DIFF_COLOR hex (instanceColor multiplies).
  tile: std('#FFFFFF', 0.35),
  start: std(SCENE_COLOR.start, 0.3, { emissive: SCENE_COLOR.startEmissive, emissiveIntensity: 0.15 }),
  pad: std(EVENT_COLOR.pad, 0.35),
  padTop: std(EVENT_COLOR.top, 0.5),
  star: std(SCENE_COLOR.tileStar, 0.3, { emissive: SCENE_COLOR.starEmissive, emissiveIntensity: 0.25 }),
  chevron: std(SCENE_COLOR.chevron, 0.4),
  outline: std(SCENE_COLOR.outline, 0.4),
  iconForward: std(EVENT_COLOR.forward, 0.3),
  iconBackward: std(EVENT_COLOR.backward, 0.3),
  iconExtra: std(EVENT_COLOR.extra, 0.3),
  gatePillar: std(SCENE_COLOR.gatePillar, 0.3),
  gateArch: std(SCENE_COLOR.gateArch, 0.3),
  gateFlag: std(SCENE_COLOR.gateFlag, 0.3),
  gateStar: std(SCENE_COLOR.gateStar, 0.3, { emissive: SCENE_COLOR.starEmissive, emissiveIntensity: 0.3 }),
  baseSide: std(SCENE_COLOR.baseSide, 0.5),
  track: std(SCENE_COLOR.track, 0.6),
  yard: std(SCENE_COLOR.yard, 0.7),
} as const;

// Difficulty colors as three Colors, for setColorAt on the quest tiles.
export const DIFF_THREE = {
  easy: new Color(DIFF_COLOR.easy),
  normal: new Color(DIFF_COLOR.normal),
  hard: new Color(DIFF_COLOR.hard),
} as const;
