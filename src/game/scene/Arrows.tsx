// src/game/scene/Arrows.tsx — direction marks on the ring (D-13, BOARD-02).
// A white chevron with an ink rim sits in the middle of every gap, pointing to the next tile.
// The gap leaving the start holds two chevrons scaled 1.3 (the "»" mark), so there are n + 1.
// Instance order: chevron k lives in gap k (k = 0..n−1); the second "»" chevron is instance n.
// Each of the 4 corners gets a quarter-turn arrow lying flat on the yard side of the corner,
// turning from the incoming to the outgoing direction (local frame: in = +Z, out = −X; the
// instance is rotated by inHeading). All InstancedMeshes, shared GEO/MAT, never disposed here.
import { useLayoutEffect, useRef } from 'react';
import { InstancedMesh, Object3D } from 'three';
import { TRACK_TOP, cornerArrows, gapPoint, tileTop, type RingLayout } from '../layout/ringLayout';
import { GEO, MAT, TILE_CAP } from './geometries';

const CHEVRON_CAP = TILE_CAP + 1;
const START_SCALE = 1.3;
const START_SPREAD = 0.07; // each "»" chevron sits this far from the gap middle along travel
const OUTLINE_SCALE = 1.12;
const CHEVRON_Y = tileTop('quest') + 0.02;
const FLOOR_Y = TRACK_TOP + 0.02; // on top of the yard slab

export default function Arrows({ layout }: { layout: RingLayout }) {
  const arrowRef = useRef<InstancedMesh>(null!);
  const outlineRef = useRef<InstancedMesh>(null!);
  const arcRef = useRef<InstancedMesh>(null!);
  const headRef = useRef<InstancedMesh>(null!);
  const cornerOutlineRef = useRef<InstancedMesh>(null!);

  useLayoutEffect(() => {
    const arrows = arrowRef.current;
    const outlines = outlineRef.current;
    const d = new Object3D();
    const n = layout.n;

    const put = (k: number, x: number, z: number, h: number, s: number) => {
      d.position.set(x, CHEVRON_Y, z);
      d.rotation.set(0, h, 0);
      d.scale.set(s, s, s);
      d.updateMatrix();
      arrows.setMatrixAt(k, d.matrix);
      d.position.y = CHEVRON_Y - 0.01;
      d.scale.set(s * OUTLINE_SCALE, s, s * OUTLINE_SCALE);
      d.updateMatrix();
      outlines.setMatrixAt(k, d.matrix);
    };

    for (let i = 0; i < n; i++) {
      const g = gapPoint(layout, i);
      const h = layout.heading[i];
      if (i === 0) {
        const fx = Math.sin(h) * START_SPREAD;
        const fz = Math.cos(h) * START_SPREAD;
        put(0, g.x - fx, g.z - fz, h, START_SCALE);
        put(n, g.x + fx, g.z + fz, h, START_SCALE);
      } else {
        put(i, g.x, g.z, h, 1);
      }
    }
    for (const m of [arrows, outlines]) {
      m.count = n + 1;
      m.instanceMatrix.needsUpdate = true;
    }

    const corners = cornerArrows(layout);
    const cornerMeshes = [arcRef.current, headRef.current, cornerOutlineRef.current];
    corners.forEach((c, k) => {
      d.position.set(c.x, FLOOR_Y, c.z);
      d.rotation.set(0, c.inHeading, 0);
      d.scale.setScalar(1);
      d.updateMatrix();
      for (const m of cornerMeshes) m.setMatrixAt(k, d.matrix);
    });
    for (const m of cornerMeshes) {
      m.count = corners.length;
      m.instanceMatrix.needsUpdate = true;
    }
  }, [layout]);

  return (
    <group name="direction-arrows">
      <instancedMesh ref={outlineRef} name="arrow-outlines" args={[GEO.chevron, MAT.outline, CHEVRON_CAP]} dispose={null} />
      <instancedMesh ref={arrowRef} name="arrows" args={[GEO.chevron, MAT.chevron, CHEVRON_CAP]} dispose={null} />
      <instancedMesh ref={cornerOutlineRef} name="corner-outlines" args={[GEO.cornerOutline, MAT.outline, 4]} dispose={null} />
      <instancedMesh ref={arcRef} name="corner-arcs" args={[GEO.cornerArc, MAT.chevron, 4]} dispose={null} />
      <instancedMesh ref={headRef} name="corner-heads" args={[GEO.cornerHead, MAT.chevron, 4]} dispose={null} />
    </group>
  );
}
