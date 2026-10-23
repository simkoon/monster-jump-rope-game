// src/game/scene/PathPreview.tsx — the destination preview and the preview beat consumer (D-16, D-19).
// While a `preview` beat — or the dice `hop` that follows it — is current, it shows a white path dot
// on every tile to pass (instanced, capacity 8), a sky ring on the destination tile and a cone
// bobbing above it. Dots pop in 0 → 1 over 120 ms during the preview and stay through the hop,
// vanishing from the front as the pawn passes each tile (beat.ms / path.length per tile). Event
// hops and every other beat show nothing.
// It completes the PREVIEW beat exactly once after its ms (never a hop — the pawn owns that).
// Like the pawn, the frame loop reads the presentation store with getState() so it never acts on
// a stale render; the subscribed selector only lays out the first frame of a new beat.
// Reduced motion: previews are 0 ms beats and never become current, so nothing shows.
import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, type InstancedMesh, type Mesh } from 'three';
import type { Beat } from '../director/timeline';
import type { StandPoint } from '../layout/pawnSlots';
import { usePresentation } from '../usePresentation';
import { ACTOR_GEO, ACTOR_MAT } from './actorGeometries';

const DOT_CAP = 8;
const DOT_LIFT = 0.08;
const POP_S = 0.12;
const RING_LIFT = 0.02;
const CONE_LIFT = 1.1;
const CONE_BOB = 0.1;
const CONE_PERIOD = 0.8; // s

type PathBeat = Extract<Beat, { kind: 'preview' } | { kind: 'hop' }>;

export function previewBeat(b: Beat | null): PathBeat | null {
  if (!b) return null;
  if (b.kind === 'preview' && b.path.length > 0) return b;
  if (b.kind === 'hop' && b.by === 'dice' && b.path.length > 0) return b;
  return null;
}

const dummy = new Object3D();

export default function PathPreview({ points }: { points: readonly StandPoint[] }) {
  const dots = useRef<InstancedMesh>(null!);
  const ring = useRef<Mesh>(null!);
  const cone = useRef<Mesh>(null!);

  const startedId = useRef(-1);
  const doneId = useRef(-1);
  const elapsed = useRef(0);
  const clock = useRef(0);

  const subscribed = usePresentation((s) => previewBeat(s.current));

  const layoutDots = (path: readonly number[], first: number, scale: number) => {
    const m = dots.current;
    let n = 0;
    for (let i = Math.max(0, first); i < path.length && n < DOT_CAP; i++) {
      const p = points[path[i]] ?? points[0];
      dummy.position.set(p.x, p.y + DOT_LIFT, p.z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      m.setMatrixAt(n++, dummy.matrix);
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
  };

  const show = (beat: PathBeat | null) => {
    if (!beat) {
      dots.current.count = 0;
      ring.current.visible = false;
      cone.current.visible = false;
      return;
    }
    const dest = points[beat.path[beat.path.length - 1]] ?? points[0];
    ring.current.position.set(dest.x, dest.y + RING_LIFT, dest.z);
    ring.current.visible = true;
    cone.current.position.set(dest.x, dest.y + CONE_LIFT, dest.z);
    cone.current.visible = true;
  };

  // First frame of a new beat (and the hidden state when none): laid out at render time.
  useLayoutEffect(() => {
    show(subscribed);
    if (subscribed) layoutDots(subscribed.path, 0, subscribed.kind === 'preview' ? 0 : 1);
    // `points` only changes with the board; the frame loop re-lays out every frame anyway.
  }, [subscribed, points]);

  useFrame((_, delta) => {
    if (!dots.current) return;
    const d = Math.min(delta, 0.25);
    const store = usePresentation.getState();
    const beat = previewBeat(store.current);
    if (!beat) {
      if (dots.current.count !== 0 || ring.current.visible) show(null);
      return;
    }
    if (startedId.current !== beat.id) {
      startedId.current = beat.id;
      elapsed.current = 0;
    }
    elapsed.current += d;
    clock.current += d;
    show(beat);
    cone.current.position.y += CONE_BOB * Math.sin((2 * Math.PI * clock.current) / CONE_PERIOD);

    if (beat.kind === 'preview') {
      layoutDots(beat.path, 0, Math.min(1, elapsed.current / POP_S));
      if (doneId.current !== beat.id && elapsed.current >= beat.ms / 1000 - 1e-6) {
        doneId.current = beat.id;
        store.completeBeat(beat.id);
      }
      return;
    }
    // Dice hop: drop the dots of the tiles already passed.
    const perTile = beat.ms / 1000 / beat.path.length;
    const passed = perTile > 0 ? Math.floor((elapsed.current + 1e-9) / perTile) : beat.path.length;
    layoutDots(beat.path, passed, 1);
  });

  return (
    <group name="path-preview">
      <instancedMesh
        ref={dots}
        name="path-dots"
        args={[ACTOR_GEO.pathDot, ACTOR_MAT.pathDot, DOT_CAP]}
        count={0}
        dispose={null}
      />
      <mesh ref={ring} name="dest-ring" geometry={ACTOR_GEO.destRing} material={ACTOR_MAT.dest} visible={false} dispose={null} />
      <mesh ref={cone} name="dest-cone" geometry={ACTOR_GEO.destCone} material={ACTOR_MAT.dest} visible={false} dispose={null} />
    </group>
  );
}
