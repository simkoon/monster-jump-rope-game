// src/game/scene/SceneContents.tsx — the whole 3D scene graph without a <Canvas> (D-01, D-03, D-17, D-28).
// GameCanvas renders it inside the one lazy Canvas; tests mount it directly with
// @react-three/test-renderer (no WebGL). It draws the `displayed` state from usePresentation,
// never the engine directly, so characters do not teleport and crowns follow the shown stars.
// Phase 7 (07-04): every participant is a chibi Character (seed = participant index). During the
// win beat the crowns go to the winners (co-winners too, even with 0 stars) and the turn ring is
// hidden — nobody is "current" while the winners cheer (UI-SPEC C6). Slots keep using currentId,
// so nobody slides during the win beat.
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
import Character from './Character';
import Dice from './Dice';
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
  const winBeat = usePresentation((s) => (s.current?.kind === 'win' ? s.current : null));

  const order = useMemo(() => participants.map((p) => p.id), [participants]);
  const slots = useMemo(() => pawnSlots(order, positions, currentId), [order, positions, currentId]);
  const crowned = useMemo(() => new Set(winBeat ? winBeat.winners : leaders(stars)), [winBeat, stars]);

  return (
    <>
      <hemisphereLight args={[LIGHTS.hemi.sky, LIGHTS.hemi.ground, LIGHTS.hemi.intensity]} />
      <directionalLight color={LIGHTS.key.color} intensity={LIGHTS.key.intensity} position={[...LIGHTS.key.position]} />
      <directionalLight color={LIGHTS.rim.color} intensity={LIGHTS.rim.intensity} position={[...LIGHTS.rim.position]} />
      <CameraRig layout={layout} />
      <Board tiles={tiles} />
      {participants.map((p, index) => (
        <Character
          key={p.id}
          pid={p.id}
          animal={p.animal}
          seed={index}
          points={points}
          slot={slots[p.id] ?? CENTER}
          isCurrent={p.id === currentId && !winBeat}
          isLeader={crowned.has(p.id)}
        />
      ))}
      <Dice boardLength={tiles.length} restFace={restFace} />
      <PathPreview points={points} />
    </>
  );
}
