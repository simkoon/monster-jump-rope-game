// src/game/scene/TileIcons.tsx — event effect icons lying on the pad's cream top disc (D-15, BOARD-03).
// forward  = green block arrow along travel
// backward = coral (warning) block arrow against travel
// extra    = grape 300° loop arrow ("one more turn")
// Step counts are NEVER drawn in 3D (the DOM banner tells them after landing). No text at all (D-02).
// Instance capacity is fixed at TILE_CAP; only `count` follows the board. Shared GEO/MAT, never disposed.
import { useLayoutEffect, useRef } from 'react';
import { InstancedMesh, Object3D } from 'three';
import type { Tile } from '../../engine/board';
import { tileCenter, tileTop, type RingLayout } from '../layout/ringLayout';
import { GEO, MAT, TILE_CAP } from './geometries';

const ICON_Y = tileTop('event') + 0.03;

export default function TileIcons({ layout, tiles }: { layout: RingLayout; tiles: readonly Tile[] }) {
  const fwdRef = useRef<InstancedMesh>(null!);
  const backRef = useRef<InstancedMesh>(null!);
  const loopArcRef = useRef<InstancedMesh>(null!);
  const loopHeadRef = useRef<InstancedMesh>(null!);

  useLayoutEffect(() => {
    const d = new Object3D();
    let f = 0;
    let b = 0;
    let x = 0;
    tiles.forEach((t, i) => {
      if (t.kind !== 'event') return;
      const c = tileCenter(layout, i);
      const h = layout.heading[i];
      const eff = t.event.eff;
      d.position.set(c.x, ICON_Y, c.z);
      d.rotation.set(0, eff === 'backward' ? h + Math.PI : h, 0);
      d.updateMatrix();
      if (eff === 'forward') fwdRef.current.setMatrixAt(f++, d.matrix);
      else if (eff === 'backward') backRef.current.setMatrixAt(b++, d.matrix);
      else {
        loopArcRef.current.setMatrixAt(x, d.matrix);
        loopHeadRef.current.setMatrixAt(x++, d.matrix);
      }
    });
    const counts: [InstancedMesh, number][] = [
      [fwdRef.current, f],
      [backRef.current, b],
      [loopArcRef.current, x],
      [loopHeadRef.current, x],
    ];
    for (const [m, count] of counts) {
      m.count = count;
      m.instanceMatrix.needsUpdate = true;
    }
  }, [layout, tiles]);

  return (
    <group name="tile-icons">
      <instancedMesh ref={fwdRef} name="icon-forward" args={[GEO.arrow, MAT.iconForward, TILE_CAP]} dispose={null} />
      <instancedMesh ref={backRef} name="icon-backward" args={[GEO.arrow, MAT.iconBackward, TILE_CAP]} dispose={null} />
      <instancedMesh ref={loopArcRef} name="icon-loop-arcs" args={[GEO.loopArc, MAT.iconExtra, TILE_CAP]} dispose={null} />
      <instancedMesh ref={loopHeadRef} name="icon-loop-heads" args={[GEO.loopHead, MAT.iconExtra, TILE_CAP]} dispose={null} />
    </group>
  );
}
