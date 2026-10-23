// src/game/scene/CameraRig.tsx — the fixed quarter-view camera (D-09, D-10, BOARD-01) + the ⭐3 shake
// (Phase 8 FX-04, D-04, D-07, D-08).
// Re-fits the default R3F perspective camera with fitCamera whenever the canvas size or the board
// changes, so the whole board stays inside the canvas for portrait, square and landscape cells.
// The camera is FIXED: no user orbit/zoom controls, no automatic framing helper and no follow — the
// pose depends only on the canvas aspect and the board extents (the podium extents in the ceremony,
// 08-09 — the same fit, re-run when the ceremony starts / ends or the cell resizes, Pitfall 11).
// Renders nothing.
// The one exception is the ⭐3 success shake, and it lives HERE (RESEARCH Pitfall 7): the fitted pose
// is kept in a ref, so a re-fit during the shake (rotation / resize) only replaces the base the
// offset is added to and the two can never fight. During [landMs, landMs + shakeMs] of a ⭐3 stars
// beat (successPlan, 320 ms, amplitude 0.06) camera position AND lookAt target get the same
// shakeOffset — translation only, no roll and no zoom. When the shake ends, or the beat changes
// early (tap skip / watchdog / skipAll, D-07), the camera is put back on the exact fitted position
// and target in that same frame. Reduced motion (D-08) never shakes. The beat clock is this
// component's own (frame deltas, reset on a new beat id, delta clamped to 0.25 s).
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import { successPlan } from '../director/successPlan';
import { starTier } from '../director/timeline';
import { shakeOffset } from '../layout/fxMotion';
import { boardExtents, type RingLayout } from '../layout/ringLayout';
import { fitCamera } from '../layout/fitCamera';
import { prefersReducedMotion } from '../reducedMotion';
import { usePresentation } from '../usePresentation';

type Vec3 = readonly [number, number, number];

export interface CameraRigProps {
  layout: RingLayout;
  // Ceremony (08-09, D-11): the podium box to frame instead of the board. Same fixed fitCamera
  // (target = origin); the shake below keeps working from whichever fitted pose is current.
  extents?: { hx: number; hz: number; h: number } | null;
}

export default function CameraRig({ layout, extents = null }: CameraRigProps) {
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const fitted = useRef<{ position: Vec3; target: Vec3 } | null>(null);
  const clock = useRef({ id: -1, ms: 0 });
  const offset = useRef(false); // the camera is currently off the fitted pose

  useLayoutEffect(() => {
    const aspect = height > 0 ? width / height : 1;
    const fit = fitCamera(aspect, extents ?? boardExtents(layout));
    fitted.current = { position: fit.position, target: fit.target };
    camera.position.set(...fit.position);
    if ((camera as PerspectiveCamera).isPerspectiveCamera) {
      const cam = camera as PerspectiveCamera;
      cam.fov = fit.fov;
      cam.aspect = aspect;
    }
    camera.lookAt(...fit.target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    invalidate();
  }, [width, height, layout, extents, camera, invalidate]);

  useFrame((_, delta) => {
    const fit = fitted.current;
    if (!fit) return;
    const d = Math.min(delta, 0.25);
    const cur = usePresentation.getState().current;
    if (cur && cur.id !== clock.current.id) {
      clock.current.id = cur.id;
      clock.current.ms = 0;
    }
    clock.current.ms += d * 1000;

    let ox = 0;
    let oy = 0;
    if (!reduced && cur && cur.kind === 'stars' && starTier(cur.stars) === 3) {
      const plan = successPlan(cur.stars, cur.ms, false);
      const t = clock.current.ms - plan.landMs;
      if (t >= 0 && t <= plan.shakeMs) [ox, oy] = shakeOffset(t / 1000, plan.shakeAmp, plan.shakeMs / 1000);
    }

    const [px, py, pz] = fit.position;
    const [tx, ty, tz] = fit.target;
    if (ox !== 0 || oy !== 0) {
      camera.position.set(px + ox, py + oy, pz);
      camera.lookAt(tx + ox, ty + oy, tz);
      camera.updateMatrixWorld();
      offset.current = true;
      invalidate();
    } else if (offset.current) {
      // Exact restore: the very same values the fit wrote (1e-9 test).
      camera.position.set(px, py, pz);
      camera.lookAt(tx, ty, tz);
      camera.updateMatrixWorld();
      offset.current = false;
      invalidate();
    }
  });

  return null;
}
