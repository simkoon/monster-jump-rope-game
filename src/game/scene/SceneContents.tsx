// src/game/scene/SceneContents.tsx — the whole 3D scene graph without a <Canvas> (D-01, D-03, D-17, D-28).
// GameCanvas renders it inside the one lazy Canvas; tests mount it directly with
// @react-three/test-renderer (no WebGL). It draws the `displayed` state from usePresentation,
// never the engine directly, so pawns do not teleport and crowns follow the shown stars.
// Lights are code-only (D-03): hemisphere + key + rim from palette LIGHTS — no environment map,
// no shadow maps, no post-processing (D-04). The ground shadow lives in GameCanvas.
import { useMemo } from 'react';
import type { AnimalId } from '../../engine/animals';
import type { Tile } from '../../engine/board';
import { leaders, pawnSlots, standPoints } from '../layout/pawnSlots';
import { ringLayout } from '../layout/ringLayout';
import { LIGHTS } from '../palette';
import { usePresentation } from '../usePresentation';
import Board from './Board';
import CameraRig from './CameraRig';
import Dice from './Dice';
import Pawn from './Pawn';
import PathPreview from './PathPreview';

export interface SceneProps {
  tiles: readonly Tile[];
  participants: readonly { id: string; animal: AnimalId }[];
  currentId: string;
  restFace: number | null;
}

const CENTER = { dx: 0, dz: 0, scale: 1 } as const;

export function SceneContents({ tiles, participants, currentId, restFace }: SceneProps) {
  const layout = useMemo(() => ringLayout(tiles.length), [tiles.length]);
  const points = useMemo(() => standPoints(tiles), [tiles]);
  const positions = usePresentation((s) => s.displayed.positions);
  const stars = usePresentation((s) => s.displayed.stars);

  const order = useMemo(() => participants.map((p) => p.id), [participants]);
  const slots = useMemo(() => pawnSlots(order, positions, currentId), [order, positions, currentId]);
  const crowned = useMemo(() => new Set(leaders(stars)), [stars]);

  return (
    <>
      <hemisphereLight args={[LIGHTS.hemi.sky, LIGHTS.hemi.ground, LIGHTS.hemi.intensity]} />
      <directionalLight color={LIGHTS.key.color} intensity={LIGHTS.key.intensity} position={[...LIGHTS.key.position]} />
      <directionalLight color={LIGHTS.rim.color} intensity={LIGHTS.rim.intensity} position={[...LIGHTS.rim.position]} />
      <CameraRig layout={layout} />
      <Board tiles={tiles} />
      {participants.map((p) => (
        <Pawn
          key={p.id}
          pid={p.id}
          animal={p.animal}
          points={points}
          slot={slots[p.id] ?? CENTER}
          isCurrent={p.id === currentId}
          isLeader={crowned.has(p.id)}
        />
      ))}
      <Dice boardLength={tiles.length} restFace={restFace} />
      <PathPreview points={points} />
    </>
  );
}
