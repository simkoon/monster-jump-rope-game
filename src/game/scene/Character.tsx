// src/game/scene/Character.tsx — one chibi animal on the board: the hop beat consumer plus its
// faces and motions (D-05, D-07, D-08, D-10..D-16, D-22, CHAR-01..03). Replaces the Phase 6 pawn.
// The model is the view-only ChibiModel (07-03) in the participant's ANIMAL_COLOR; this component
// owns the motion and drives it through the rig refs.
//
// Beat consumer (Phase 6 RESEARCH Pattern 4, kept): the frame loop reads the presentation store
// with getState() — frames can run before React re-renders after a store change, so the loop never
// trusts a stale render closure. A hop beat of this pid moves the ground group tile by tile
// (beat.ms / path.length per tile) with the hopPose parabola and landing squash, turns the body
// toward the travel direction (D-11, also for backward event moves), then completes the beat id
// exactly once. That is the only beat this component completes: stars / miss / win / event /
// startBonus belong to the Banner timer and the store watchdog (D-22), so the game runs on with no
// canvas. If the watchdog or skipAll ended a beat first, the character eases to
// `displayed.positions[pid]` + its slot and blends its last pose out at SETTLE_RATE (Pitfall 8).
//
// Reactions: reactionFor(pid, current beat, isCurrent) picks the face and the act. A new beat id
// restarts the act clock (u = elapsed / beat length). At rest the current character bounces and its
// ring breathes; everybody else only breathes ≤ 2 % with a per-seed phase (D-10). The face swaps
// its cached geometry only when the key changes (D-08); idle / excited / sad blink (UI-SPEC C3).
// Reduced motion (D-16) holds REST with yaw 0 and a still ring: only faces and blinks change.
// Motion lives in refs only: no store write per frame, no geometry or material creation, delta
// clamped to 0.25 s.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type Group } from 'three';
import type { AnimalId } from '../../engine/animals';
import { blinkClosed, faceKeyFor, reactionFor } from '../director/reaction';
import {
  IDLE_PERIOD,
  REST,
  RING_BREATH,
  SETTLE_RATE,
  YAW_RATE_HOP,
  YAW_RATE_REST,
  actPose,
  approachAngle,
  bouncePose,
  breathePose,
  hopPose,
  type Pose,
} from '../layout/charMotion';
import type { FaceKey } from '../layout/chibiDims';
import type { PawnSlot, StandPoint } from '../layout/pawnSlots';
import { prefersReducedMotion } from '../reducedMotion';
import { usePresentation } from '../usePresentation';
import ChibiModel, { applyPose, createChibiRig } from './ChibiModel';
import { faceGeo } from './chibiFaces';

export interface CharacterProps {
  pid: string;
  animal: AnimalId;
  seed: number; // participant index: blink and breathing phase
  points: readonly StandPoint[];
  slot: PawnSlot;
  isCurrent: boolean;
  isLeader: boolean;
}

const TAU = 2 * Math.PI;
const wrap = (a: number) => a - TAU * Math.round(a / TAU); // → [−π, π]
const FADE_MIN = 1e-3; // blend weight below which the old pose is gone
const BLEND_FIELDS = ['y', 'squashY', 'headPitch', 'armL', 'armR', 'earTilt', 'lean'] as const; // yaw apart

const restPoint = (points: readonly StandPoint[], pid: string): StandPoint => {
  const idx = usePresentation.getState().displayed.positions[pid] ?? 0;
  return points[idx] ?? points[0];
};

export default function Character({ pid, animal, seed, points, slot, isCurrent, isLeader }: CharacterProps) {
  const ground = useRef<Group>(null!);
  const rig = useMemo(createChibiRig, []);
  const reduced = useMemo(() => prefersReducedMotion(), []);

  // Hop consumer (Phase 6).
  const startedId = useRef(-1); // hop beat being played
  const doneId = useRef(-1); // hop beat already completed by this character
  const elapsed = useRef(0); // s into the current hop
  const from = useRef(new Vector3());
  // Reactions.
  const source = useRef(''); // what drives the pose: a beat id, 'bounce' or 'breathe'
  const actT = useRef(0); // s into the current act
  const bounceT = useRef(0); // bounce / ring clock, restarted when the bounce starts
  const clock = useRef(0); // breathing and blink clock
  const yaw = useRef(0);
  const last = useRef<Pose>({ ...REST }); // the pose applied last frame
  const fadeFrom = useRef<Pose>({ ...REST }); // the pose being blended out
  const fadeT = useRef(0);
  const faceKey = useRef<FaceKey>('idle'); // ChibiModel mounts with the idle face

  // Stand on the rest point on mount so nothing slides in from the origin.
  useLayoutEffect(() => {
    const p = restPoint(points, pid);
    ground.current.position.set(p.x + slot.dx, p.y, p.z + slot.dz);
    ground.current.scale.setScalar(slot.scale);
    // Mount only: later changes are eased in the frame loop.
  }, []);

  useFrame((_, delta) => {
    const g = ground.current;
    if (!g) return;
    const d = Math.min(delta, 0.25);
    const store = usePresentation.getState();
    const cur = store.current;
    const beat = cur && cur.kind === 'hop' && cur.pid === pid && cur.path.length > 0 ? cur : null;
    clock.current += d;

    // 1) Hop beat: ground group along the path, body pose of the current tile.
    let hop: Pose | null = null;
    let travel: number | null = null;
    if (beat && doneId.current !== beat.id) {
      if (startedId.current !== beat.id) {
        startedId.current = beat.id;
        elapsed.current = 0;
        from.current.copy(g.position);
      }
      elapsed.current += d;
      const len = beat.path.length;
      const total = beat.ms / 1000;
      if (elapsed.current >= total - 1e-6) {
        const end = points[beat.path[len - 1]] ?? points[0];
        g.position.set(end.x, end.y, end.z);
        doneId.current = beat.id;
        store.completeBeat(beat.id);
        hop = REST;
      } else {
        const seg = total / len;
        const k = Math.min(len - 1, Math.floor(elapsed.current / seg));
        const s = Math.min(1, (elapsed.current - k * seg) / seg);
        const a = k === 0 ? from.current : (points[beat.path[k - 1]] ?? points[0]);
        const to = points[beat.path[k]] ?? points[0];
        g.position.set(a.x + (to.x - a.x) * s, a.y + (to.y - a.y) * s, a.z + (to.z - a.z) * s);
        hop = hopPose(s);
        if (to.x !== a.x || to.z !== a.z) travel = Math.atan2(to.x - a.x, to.z - a.z);
      }
    } else {
      // At rest: ease toward the displayed tile + slot (also after a watchdog/skipAll ending), so a
      // new current character slides to the front slot (intended, Pitfall 10).
      const p = restPoint(points, pid);
      const e = 1 - Math.exp(-SETTLE_RATE * d);
      g.position.x += (p.x + slot.dx - g.position.x) * e;
      g.position.y += (p.y - g.position.y) * e;
      g.position.z += (p.z + slot.dz - g.position.z) * e;
      g.scale.setScalar(g.scale.x + (slot.scale - g.scale.x) * e);
      // A hop the watchdog / skipAll ended without us: never complete it; the pose blend lets it land.
      if (startedId.current !== doneId.current) doneId.current = startedId.current;
    }

    // 2) Reaction: a new source restarts the act clock and blends the previous pose out.
    const rx = reactionFor(pid, cur, isCurrent);
    const src = rx.beatId !== null ? `beat:${rx.beatId}` : isCurrent ? 'bounce' : 'breathe';
    if (src !== source.current) {
      source.current = src;
      actT.current = 0;
      if (src === 'bounce') bounceT.current = 0;
      Object.assign(fadeFrom.current, last.current);
      fadeFrom.current.yaw = wrap(last.current.yaw);
      fadeT.current = 0;
    }
    actT.current += d;
    bounceT.current += d;
    fadeT.current += d;

    const out = last.current;
    if (!reduced) {
      let pose: Pose;
      if (rx.act === 'hop') pose = hop ?? REST;
      else if (rx.act !== 'rest') pose = actPose(rx.act, rx.ms > 0 ? Math.min(1, actT.current / (rx.ms / 1000)) : 1);
      else pose = isCurrent ? bouncePose(bounceT.current) : breathePose(clock.current, seed);
      // Blend the previous pose out additively: the new curve plays at full size while the old
      // offset from REST decays at SETTLE_RATE (no snap when a beat ends early, Pitfall 8).
      const w = Math.exp(-SETTLE_RATE * fadeT.current);
      Object.assign(out, pose);
      if (w > FADE_MIN) for (const f of BLEND_FIELDS) out[f] += (fadeFrom.current[f] - REST[f]) * w;
      // Yaw: the success spin follows its curve (D-12); a hop turns toward the travel direction
      // (D-11); otherwise the body turns back to the camera.
      if (rx.act === 'success') yaw.current = pose.yaw + (w > FADE_MIN ? fadeFrom.current.yaw * w : 0);
      else if (travel !== null) yaw.current = wrap(approachAngle(yaw.current, travel, YAW_RATE_HOP, d));
      else if (rx.act !== 'hop') yaw.current = wrap(approachAngle(yaw.current, 0, YAW_RATE_REST, d));
    } else {
      Object.assign(out, REST);
      yaw.current = 0;
    }
    out.yaw = yaw.current;
    applyPose(rig, last.current);

    // 3) Ring: breathes with the bounce on the current turn at rest (Phase 6), else still.
    const ring = rig.ring.current;
    if (ring) {
      const breathe = isCurrent && !reduced && src === 'bounce';
      const phase = (bounceT.current % IDLE_PERIOD) / IDLE_PERIOD;
      ring.scale.setScalar(breathe ? 1 + (RING_BREATH / 2) * (1 - Math.cos(TAU * phase)) : 1);
    }

    // 4) Face: instant swap on a key change only; blinks stay under reduced motion (D-16).
    const blink =
      (rx.expression === 'idle' || rx.expression === 'excited' || rx.expression === 'sad') &&
      blinkClosed(clock.current, seed);
    const key = faceKeyFor(rx.expression, blink);
    if (key !== faceKey.current && rig.face.current) {
      faceKey.current = key;
      rig.face.current.geometry = faceGeo(animal, key);
    }
  });

  return (
    <group ref={ground} name={`pawn-${pid}`}>
      <ChibiModel animal={animal} rig={rig} face="idle" ring={isCurrent} crown={isLeader} />
    </group>
  );
}
