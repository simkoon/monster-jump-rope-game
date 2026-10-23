// src/game/scene/Board.tsx — the static square ring board (BOARD-01..03, D-07, D-11, D-12, D-14, D-15, D-28).
// Two-layer candy base with a mint yard; quest tiles colored by difficulty with floating 3D stars;
// purple hexagonal event pads with a cream top disc; the gold start block with its arch gate.
// D-02/D-16: no text, numbers or DOM labels — kinds read by color, shape, star count and icon.
// D-28: tiles, pads and stars are InstancedMeshes with FIXED capacity (24 tiles, 72 stars); only
// `mesh.count` follows the board (Pitfall 8). Geometries/materials are the shared module
// singletons from geometries.ts and are never disposed here (Pitfall 9). The three base slabs
// depend on the board size, so they are created per layout and disposed on change/unmount.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
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
import { DIFF_THREE, GEO, MAT } from './geometries';
import StartGate from './StartGate';

export const TILE_CAP = 24; // largest board (D-07: 16/20/24)
export const STAR_CAP = 72; // 24 tiles × 3 stars

const STAR_LIFT = 0.55; // above the tile top
const STAR_SPACING = 0.3; // across the travel direction
const STAR_TILT = (-20 * Math.PI) / 180; // facing the camera, tilted back 20°

const BASE_H = 0.22;
const YARD_H = 0.02;

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

export default function Board({ tiles }: { tiles: readonly Tile[] }) {
  const n = tiles.length;
  const layout = useMemo(() => ringLayout(n), [n]);
  const base = useBaseGeometries(layout);

  const questRef = useRef<InstancedMesh>(null!);
  const padRef = useRef<InstancedMesh>(null!);
  const padTopRef = useRef<InstancedMesh>(null!);
  const starRef = useRef<InstancedMesh>(null!);

  useLayoutEffect(() => {
    const quest = questRef.current;
    const pad = padRef.current;
    const padTop = padTopRef.current;
    const star = starRef.current;
    const d = new Object3D();
    let q = 0;
    let p = 0;
    let s = 0;
    const tileY = TRACK_TOP + TILE_H / 2;
    const starY = tileTop('quest') + STAR_LIFT;
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
        // Stars in a row across the travel direction, facing the camera.
        const count = starsFor(t.diff);
        const ax = Math.cos(h);
        const az = -Math.sin(h);
        for (let k = 0; k < count; k++) {
          const off = (k - (count - 1) / 2) * STAR_SPACING;
          d.position.set(c.x + ax * off, starY, c.z + az * off);
          d.rotation.set(STAR_TILT, 0, 0);
          d.updateMatrix();
          star.setMatrixAt(s++, d.matrix);
        }
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
    commit(quest, q);
    commit(pad, p);
    commit(padTop, p);
    commit(star, s);
  }, [tiles, layout]);

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
    </group>
  );
}
