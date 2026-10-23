// src/game/scene/ChibiModel.tsx — the view-only chibi animal model shared by Character and the gallery (D-08, D-20, D-21).
// Assembles one animal from its 6 static nodes (chibiSpecies) and one face (chibiFaces): exactly
// 7 meshes, plus the turn ring and the crown when shown (UI-SPEC C1 node table). It holds no state
// and runs no frame loop: the caller owns the motion and drives it through the rig refs —
// `applyPose(rig, pose)` for the body / arms / head / ears transforms, and `rig.face.current.geometry
// = faceGeo(animal, key)` for an expression change, which swaps a cached geometry and never creates
// a geometry or material (D-08, D-09). The face prop only sets the initial geometry; R3F re-applies
// it only when the prop itself changes, so a swap through the ref survives re-renders.
// Node tree (the caller wraps it in its ground group `pawn-{pid}`):
//   chibi-ground, turn-ring (stay on the floor)
//   pawn-body (jump, squash, yaw, lean) › chibi-torso, shoulder pivots › chibi-arm-l / chibi-arm-r,
//     chibi-head-pivot (head center: tilt, nod) › chibi-head, ears pivot › chibi-ears, chibi-face, crown
// Every geometry and material is a shared singleton, passed with `dispose={null}` (Phase 6 Pitfall 9).
// This module lives in the lazy 3D chunk, so it may import three at runtime.
import { useLayoutEffect } from 'react';
import type { Group, Mesh } from 'three';
import type { AnimalId } from '../../engine/animals';
import { REST, type Pose } from '../layout/charMotion';
import { ARM_REST, CROWN_LOCAL, CROWN_SCALE, HEAD_C_Y, HEAD_TILT, SHOULDER, type FaceKey } from '../layout/chibiDims';
import { ACTOR_GEO, ACTOR_MAT } from './actorGeometries';
import { faceGeo } from './chibiFaces';
import { CHAR_MAT, GROUND_MAT, chibiNodes } from './chibiSpecies';

export interface ChibiRig {
  body: { current: Group | null };
  armL: { current: Group | null };
  armR: { current: Group | null };
  head: { current: Group | null };
  ears: { current: Group | null };
  face: { current: Mesh | null };
  ring: { current: Mesh | null };
}

// Plain ref objects, so a caller can keep one per character in a ref or a memo.
export function createChibiRig(): ChibiRig {
  return {
    body: { current: null },
    armL: { current: null },
    armR: { current: null },
    head: { current: null },
    ears: { current: null },
    face: { current: null },
    ring: { current: null },
  };
}

// Writes a pose into the rig transforms (UI-SPEC C4 signs): no allocation, no-op for unmounted refs.
// squashY keeps the volume by widening xz by (1 − squashY)·0.5; headPitch adds to the −HEAD_TILT
// lean-back (+ = nod down); arms add to the rest angle (+ = up, mirrored on the left); earTilt + =
// back; lean − = backward. YXZ order so the lean is about the character's own side axis after yaw.
export function applyPose(rig: ChibiRig, pose: Pose): void {
  const b = rig.body.current;
  if (b) {
    const xz = 1 + (1 - pose.squashY) * 0.5;
    b.position.y = pose.y;
    b.rotation.set(pose.lean, pose.yaw, 0, 'YXZ');
    b.scale.set(xz, pose.squashY, xz);
  }
  if (rig.head.current) rig.head.current.rotation.x = -HEAD_TILT + pose.headPitch;
  if (rig.armR.current) rig.armR.current.rotation.z = ARM_REST + pose.armR;
  if (rig.armL.current) rig.armL.current.rotation.z = -(ARM_REST + pose.armL);
  if (rig.ears.current) rig.ears.current.rotation.x = -pose.earTilt;
}

export interface ChibiModelProps {
  animal: AnimalId;
  rig: ChibiRig;
  face: FaceKey;
  ring: boolean;
  crown: boolean;
}

export default function ChibiModel({ animal, rig, face, ring, crown }: ChibiModelProps) {
  const n = chibiNodes(animal);

  // A fresh model already stands in the rest pose (head tilted back, arms resting) before the
  // first frame.
  useLayoutEffect(() => {
    applyPose(rig, REST);
  }, [rig]);

  return (
    <>
      <mesh name="chibi-ground" geometry={n.ground} material={GROUND_MAT} dispose={null} />
      {ring && (
        <mesh ref={rig.ring} name="turn-ring" geometry={ACTOR_GEO.turnRing} material={ACTOR_MAT.turnRing} dispose={null} />
      )}
      <group ref={rig.body} name="pawn-body">
        <mesh name="chibi-torso" geometry={n.torso} material={CHAR_MAT} dispose={null} />
        <group ref={rig.armL} name="chibi-shoulder-l" position={[-SHOULDER[0], SHOULDER[1], SHOULDER[2]]}>
          <mesh name="chibi-arm-l" geometry={n.armL} material={CHAR_MAT} dispose={null} />
        </group>
        <group ref={rig.armR} name="chibi-shoulder-r" position={[SHOULDER[0], SHOULDER[1], SHOULDER[2]]}>
          <mesh name="chibi-arm-r" geometry={n.armR} material={CHAR_MAT} dispose={null} />
        </group>
        <group ref={rig.head} name="chibi-head-pivot" position={[0, HEAD_C_Y, 0]}>
          <mesh name="chibi-head" geometry={n.head} material={CHAR_MAT} dispose={null} />
          <group ref={rig.ears} name="chibi-ears-pivot">
            <mesh name="chibi-ears" geometry={n.ears} material={CHAR_MAT} dispose={null} />
          </group>
          <mesh ref={rig.face} name="chibi-face" geometry={faceGeo(animal, face)} material={CHAR_MAT} dispose={null} />
          {crown && (
            <mesh
              name="crown"
              geometry={ACTOR_GEO.crown}
              material={ACTOR_MAT.crown}
              position={[CROWN_LOCAL[0], CROWN_LOCAL[1], CROWN_LOCAL[2]]}
              scale={CROWN_SCALE}
              dispose={null}
            />
          )}
        </group>
      </group>
    </>
  );
}
