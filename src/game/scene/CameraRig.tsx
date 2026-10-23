// src/game/scene/CameraRig.tsx — the fixed quarter-view camera (D-09, D-10, BOARD-01).
// Re-fits the default R3F perspective camera with fitCamera whenever the canvas size or the board
// changes, so the whole board stays inside the canvas for portrait, square and landscape cells.
// The camera is FIXED: no user orbit/zoom controls, no automatic framing helper and no per-frame
// follow — the pose depends only on the canvas aspect and the board extents. Renders nothing.
import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import { boardExtents, type RingLayout } from '../layout/ringLayout';
import { fitCamera } from '../layout/fitCamera';

export default function CameraRig({ layout }: { layout: RingLayout }) {
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    const aspect = height > 0 ? width / height : 1;
    const fit = fitCamera(aspect, boardExtents(layout));
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
  }, [width, height, layout, camera, invalidate]);

  return null;
}
