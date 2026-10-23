// src/game/scene/Board.tsx — the static square ring board (BOARD-01..03, D-07, D-11, D-12, D-14, D-15, D-28).
// Two-layer candy base with a mint yard; quest tiles colored by difficulty with floating 3D stars;
// purple hexagonal event pads with a cream top disc; the gold start block with its arch gate.
// D-02/D-16: no text, numbers or DOM labels — kinds read by color, shape, star count and icon.
// D-28: tiles, pads and stars are InstancedMeshes with FIXED capacity (24 tiles, 72 stars); only
// `mesh.count` follows the board (Pitfall 8). Geometries/materials are the shared module
// singletons from geometries.ts and are never disposed here (Pitfall 9). The three base slabs
// depend on the board size, so they are created per layout and disposed on change/unmount.
// Phase 7 (07-05, UI-SPEC C6, RESEARCH Pitfall 4): the floating stars sit at head height, so on a
// quest tile where a character stands (`occupied` = displayed positions) they rise to tile top +
// STAR_LIFT_UP at STAR_SCALE_UP size and spacing, above the head and the crown, and ease back down
// when the tile empties (1 − exp(−12·dt); instant under reduced motion). The star count — the
// tile's difficulty — never changes, and no mesh is added: the same instances are rewritten, and
// only on frames where a lift factor moved.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Tile } from '../../engine/board';
import { starsFor } from '../../engine/scoring';
import {
  BASE_MARGIN,
  START_H,
  TILE_H,
  TRACK_TOP,
  ringLayout,
  tileCenter,
  tileTop,
  type RingLayout,
} from '../layout/ringLayout';
import { prefersReducedMotion } from '../reducedMotion';
import { DIFF_THREE, GEO, MAT, STAR_CAP, TILE_CAP } from './geometries';
import StartGate from './StartGate';
import Arrows from './Arrows';
import TileIcons from './TileIcons';

const STAR_LIFT = 0.55; // above the tile top
const STAR_SPACING = 0.3; // across the travel direction
const STAR_TILT = (-20 * Math.PI) / 180; // facing the camera, tilted back 20°
const STAR_LIFT_UP = 1.2; // over an occupied tile: above the head and the crown top (≈ 1.05)
const STAR_SCALE_UP = 0.75; // size and spacing factor while lifted (spacing 0.225)
const LIFT_RATE = 12; // 1 − exp(−12·dt) ≈ 0.25 s
const LIFT_EPS = 1e-4;
const NO_TILES: ReadonlySet<number> = new Set();

const BASE_H = 0.22;
const YARD_H = 0.02;

// One quest tile's row of stars: its tile index, center, cross axis, count and first instance.
interface StarRow {
  tile: number;
  x: number;
  z: number;
  ax: number;
  az: number;
  count: number;
  first: number;
}

// Writes every star matrix from the per-tile lift factor k ∈ [0, 1] (0 = resting, 1 = lifted).
function writeStars(mesh: InstancedMesh, rows: readonly StarRow[], lift: Float32Array, d: Object3D): void {
  const top = tileTop('quest');
  for (const row of rows) {
    const k = lift[row.tile];
    const y = top + STAR_LIFT + (STAR_LIFT_UP - STAR_LIFT) * k;
    const scale = 1 + (STAR_SCALE_UP - 1) * k;
    const gap = STAR_SPACING * scale;
    for (let j = 0; j < row.count; j++) {
      const off = (j - (row.count - 1) / 2) * gap;
      d.position.set(row.x + row.ax * off, y, row.z + row.az * off);
      d.rotation.set(STAR_TILT, 0, 0);
      d.scale.setScalar(scale);
      d.updateMatrix();
      mesh.setMatrixAt(row.first + j, d.matrix);
    }
  }
}

// Write one matrix per entry, then publish count + needsUpdate (Pitfall 8).
export function commit(mesh: InstancedMesh, count: number): void {
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

function useBaseGeometries(l: RingLayout) {
  const geos = useMemo(() => {
    const b = l.half + BASE_MARGIN;
    const yard = l.half - 0.75;
    return {
      base: new RoundedBoxGeometry(2 * b, BASE_H, 2 * b, 4, 0.3),
      track: new RoundedBoxGeometry(2 * (b - 0.12), TRACK_TOP, 2 * (b - 0.12), 4, 0.25),
      yard: new RoundedBoxGeometry(2 * yard, YARD_H, 2 * yard, 4, 0.3),
    };
  }, [l]);
  useEffect(
    () => () => {
      geos.base.dispose();
      geos.track.dispose();
      geos.yard.dispose();
    },
    [geos],
  );
  return geos;
}

export interface BoardProps {
  tiles: readonly Tile[];
  occupied?: ReadonlySet<number>; // tile indices a character is displayed on
}

export default function Board({ tiles, occupied = NO_TILES }: BoardProps) {
  const n = tiles.length;
  const layout = useMemo(() => ringLayout(n), [n]);
  const base = useBaseGeometries(layout);
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const scratch = useMemo(() => new Object3D(), []);
  const rows = useRef<StarRow[]>([]);
  const lift = useRef(new Float32Array(TILE_CAP));

  const questRef = useRef<InstancedMesh>(null!);
  const padRef = useRef<InstancedMesh>(null!);
  const padTopRef = useRef<InstancedMesh>(null!);
  const starRef = useRef<InstancedMesh>(null!);

  useLayoutEffect(() => {
    const quest = questRef.current;
    const pad = padRef.current;
    const padTop = padTopRef.current;
    const star = starRef.current;
    const d = scratch;
    let q = 0;
    let p = 0;
    let s = 0;
    const tileY = TRACK_TOP + TILE_H / 2;
    const starRows: StarRow[] = [];
    tiles.forEach((t, i) => {
      if (t.kind === 'start') return;
      const c = tileCenter(layout, i);
      const h = layout.heading[i];
      if (t.kind === 'quest') {
        d.position.set(c.x, tileY, c.z);
        d.rotation.set(0, 0, 0);
        d.scale.setScalar(1);
        d.updateMatrix();
        quest.setMatrixAt(q, d.matrix);
        quest.setColorAt(q, DIFF_THREE[t.diff]);
        q++;
        // Stars in a row across the travel direction, facing the camera (written by writeStars).
        const count = starsFor(t.diff);
        starRows.push({ tile: i, x: c.x, z: c.z, ax: Math.cos(h), az: -Math.sin(h), count, first: s });
        s += count;
        return;
      }
      // Event pad: hexagon with a vertex along travel, cream disc on top.
      d.position.set(c.x, tileY, c.z);
      d.rotation.set(0, h, 0);
      d.scale.setScalar(1);
      d.updateMatrix();
      pad.setMatrixAt(p, d.matrix);
      d.position.set(c.x, TRACK_TOP + TILE_H + 0.01, c.z);
      d.updateMatrix();
      padTop.setMatrixAt(p, d.matrix);
      p++;
    });
    rows.current = starRows;
    writeStars(star, starRows, lift.current, d);
    commit(quest, q);
    commit(pad, p);
    commit(padTop, p);
    commit(star, s);
  }, [tiles, layout, scratch]);

  // Ease each quest tile's lift toward 1 while occupied, else 0; rewrite the stars only on change.
  useFrame((_, delta) => {
    const e = reduced ? 1 : 1 - Math.exp(-LIFT_RATE * Math.min(delta, 0.25));
    const k = lift.current;
    let moved = false;
    for (const row of rows.current) {
      const target = occupied.has(row.tile) ? 1 : 0;
      const cur = k[row.tile];
      if (cur === target) continue;
      let next = cur + (target - cur) * e;
      if (Math.abs(target - next) < LIFT_EPS) next = target;
      k[row.tile] = next;
      moved = true;
    }
    if (!moved || !starRef.current) return;
    writeStars(starRef.current, rows.current, k, scratch);
    starRef.current.instanceMatrix.needsUpdate = true;
  });

  const start = tileCenter(layout, 0);

  return (
    <group name="board">
      <mesh name="board-base" geometry={base.base} material={MAT.baseSide} position={[0, -BASE_H / 2, 0]} />
      <mesh name="board-track" geometry={base.track} material={MAT.track} position={[0, TRACK_TOP / 2, 0]} />
      <mesh name="board-yard" geometry={base.yard} material={MAT.yard} position={[0, TRACK_TOP + YARD_H / 2, 0]} />

      <instancedMesh ref={questRef} name="quest-tiles" args={[GEO.tile, MAT.tile, TILE_CAP]} dispose={null} />
      <instancedMesh ref={padRef} name="event-pads" args={[GEO.pad, MAT.pad, TILE_CAP]} dispose={null} />
      <instancedMesh ref={padTopRef} name="event-pad-tops" args={[GEO.padTop, MAT.padTop, TILE_CAP]} dispose={null} />
      <instancedMesh ref={starRef} name="tile-stars" args={[GEO.star, MAT.star, STAR_CAP]} dispose={null} />

      <mesh
        name="start-tile"
        geometry={GEO.start}
        material={MAT.start}
        position={[start.x, TRACK_TOP + START_H / 2, start.z]}
        dispose={null}
      />
      <StartGate layout={layout} />
      <Arrows layout={layout} />
      <TileIcons layout={layout} tiles={tiles} />
    </group>
  );
}
