// src/game/scene/Pawn.tsx — the temporary toy pawn and the hop beat consumer (D-17..D-19, D-25, HUD-01, HUD-03).
// One pawn per participant: white base disc, capsule body + round head in ANIMAL_COLOR (the same hex
// as the scoreboard dot), eyes, pink cheeks, an ink outline and a blob shadow. Phase 7 replaces it
// with the chibi animals.
//
// Beat consumer (RESEARCH Pattern 4): the frame loop reads the presentation store directly with
// getState() — frames can run before React re-renders after a store change, so the loop never
// trusts a stale render closure. A hop beat for this pid moves the pawn tile by tile with a 0.5
// parabolic jump per tile (beat.ms / path.length per tile, from the beat data) and a landing squash
// over the last 30 % of each tile, then calls completeBeat(id) exactly once. If the watchdog or
// skipAll ended the beat first, the pawn simply eases to `displayed.positions[pid]` + its slot.
// Motion lives in refs only: no store write per frame, delta clamped to 0.25 s.
// Group layout: `pawn-{pid}` (ground point, xz + floor height, slot scale) holds the blob shadow and
// the turn ring, which stay on the floor; `pawn-body` (jump arc, squash, idle bounce) holds the toy.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type Group, type Mesh } from 'three';
import type { AnimalId } from '../../engine/animals';
import type { PawnSlot, StandPoint } from '../layout/pawnSlots';
import { ANIMAL_EYE } from '../palette';
import { prefersReducedMotion } from '../reducedMotion';
import { usePresentation } from '../usePresentation';
import { ACTOR_GEO, ACTOR_MAT, CROWN_Y, eyeMaterial, pawnMaterial } from './actorGeometries';

export interface PawnProps {
  pid: string;
  animal: AnimalId;
  points: readonly StandPoint[];
  slot: PawnSlot;
  isCurrent: boolean;
  isLeader: boolean;
}

const HOP_HEIGHT = 0.5;
const SQUASH_FROM = 0.7; // last 30 % of each tile
const SQUASH_DEPTH = 0.12; // y-scale dips to 0.88
const SETTLE_RATE = 12; // rest easing: 1 − exp(−12·dt)
const IDLE_PERIOD = 0.8; // s
const IDLE_BOUNCE = 0.08;
const RING_BREATH = 0.08; // ring scale 1.0 → 1.08

const restPoint = (points: readonly StandPoint[], pid: string): StandPoint => {
  const idx = usePresentation.getState().displayed.positions[pid] ?? 0;
  return points[idx] ?? points[0];
};

export default function Pawn({ pid, animal, points, slot, isCurrent, isLeader }: PawnProps) {
  const ground = useRef<Group>(null!);
  const body = useRef<Group>(null!);
  const ring = useRef<Mesh>(null);

  const startedId = useRef(-1); // hop beat being played
  const doneId = useRef(-1); // hop beat already completed by this pawn
  const elapsed = useRef(0); // s into the current hop
  const from = useRef(new Vector3());
  const lift = useRef(0); // leftover jump height after an interrupted hop, eased to 0
  const idle = useRef(0); // idle clock for the bounce / ring breathing
  const reduced = useMemo(() => prefersReducedMotion(), []);

  // Stand on the rest point on mount so nothing slides in from the origin.
  useLayoutEffect(() => {
    const p = restPoint(points, pid);
    ground.current.position.set(p.x + slot.dx, p.y, p.z + slot.dz);
    ground.current.scale.setScalar(slot.scale);
    // Mount only: later changes are eased in the frame loop.
  }, []);

  useFrame((_, delta) => {
    const g = ground.current;
    const b = body.current;
    if (!g || !b) return;
    const d = Math.min(delta, 0.25);
    const store = usePresentation.getState();
    const cur = store.current;
    const beat = cur && cur.kind === 'hop' && cur.pid === pid && cur.path.length > 0 ? cur : null;

    if (beat && doneId.current !== beat.id) {
      if (startedId.current !== beat.id) {
        startedId.current = beat.id;
        elapsed.current = 0;
        from.current.copy(g.position);
        lift.current = 0;
      }
      elapsed.current += d;
      const len = beat.path.length;
      const total = beat.ms / 1000;
      if (elapsed.current >= total - 1e-6) {
        const end = points[beat.path[len - 1]] ?? points[0];
        g.position.set(end.x, end.y, end.z);
        b.position.y = 0;
        b.scale.set(1, 1, 1);
        doneId.current = beat.id;
        store.completeBeat(beat.id);
        return;
      }
      const seg = total / len;
      const k = Math.min(len - 1, Math.floor(elapsed.current / seg));
      const s = Math.min(1, (elapsed.current - k * seg) / seg);
      const a = k === 0 ? from.current : (points[beat.path[k - 1]] ?? points[0]);
      const to = points[beat.path[k]] ?? points[0];
      g.position.set(a.x + (to.x - a.x) * s, a.y + (to.y - a.y) * s, a.z + (to.z - a.z) * s);
      b.position.y = HOP_HEIGHT * 4 * s * (1 - s);
      const squash = s > SQUASH_FROM ? Math.sin((Math.PI * (s - SQUASH_FROM)) / (1 - SQUASH_FROM)) : 0;
      b.scale.set(1, 1 - SQUASH_DEPTH * squash, 1);
      if (ring.current) ring.current.scale.setScalar(1);
      return;
    }

    // At rest: ease toward the displayed tile + slot (also after a watchdog/skipAll ending).
    const p = restPoint(points, pid);
    const e = 1 - Math.exp(-SETTLE_RATE * d);
    g.position.x += (p.x + slot.dx - g.position.x) * e;
    g.position.y += (p.y - g.position.y) * e;
    g.position.z += (p.z + slot.dz - g.position.z) * e;
    const sc = g.scale.x + (slot.scale - g.scale.x) * e;
    g.scale.setScalar(sc);
    if (startedId.current !== doneId.current) {
      // The beat ended without us (watchdog / skipAll): keep the height we had and let it fall.
      lift.current = b.position.y;
      doneId.current = startedId.current;
    }
    lift.current *= Math.exp(-SETTLE_RATE * d);
    if (Math.abs(lift.current) < 1e-4) lift.current = 0;
    b.scale.y += (1 - b.scale.y) * e;

    let bounce = 0;
    if (isCurrent && !reduced) {
      idle.current += d;
      const phase = (idle.current % IDLE_PERIOD) / IDLE_PERIOD;
      bounce = IDLE_BOUNCE * Math.abs(Math.sin(Math.PI * phase));
      if (ring.current) ring.current.scale.setScalar(1 + (RING_BREATH / 2) * (1 - Math.cos(2 * Math.PI * phase)));
    } else {
      idle.current = 0;
      if (ring.current) ring.current.scale.setScalar(1);
    }
    b.position.y = lift.current + bounce;
  });

  const bodyMat = pawnMaterial(animal);

  return (
    <group ref={ground} name={`pawn-${pid}`}>
      <mesh name="pawn-blob" geometry={ACTOR_GEO.blob} material={ACTOR_MAT.blob} dispose={null} />
      {isCurrent && (
        <mesh ref={ring} name="turn-ring" geometry={ACTOR_GEO.turnRing} material={ACTOR_MAT.turnRing} dispose={null} />
      )}
      <group ref={body} name="pawn-body">
        <mesh name="pawn-base" geometry={ACTOR_GEO.base} material={ACTOR_MAT.base} dispose={null} />
        <mesh name="pawn-torso" geometry={ACTOR_GEO.body} material={bodyMat} dispose={null} />
        <mesh name="pawn-head" geometry={ACTOR_GEO.head} material={bodyMat} dispose={null} />
        <mesh name="pawn-eyes" geometry={ACTOR_GEO.eyes} material={eyeMaterial(ANIMAL_EYE[animal])} dispose={null} />
        <mesh name="pawn-cheeks" geometry={ACTOR_GEO.cheeks} material={ACTOR_MAT.cheek} dispose={null} />
        <mesh name="pawn-outline" geometry={ACTOR_GEO.outline} material={ACTOR_MAT.outline} dispose={null} />
        {isLeader && (
          <mesh
            name="crown"
            geometry={ACTOR_GEO.crown}
            material={ACTOR_MAT.crown}
            position={[0, CROWN_Y, 0]}
            dispose={null}
          />
        )}
      </group>
    </group>
  );
}
