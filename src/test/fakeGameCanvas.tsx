// src/test/fakeGameCanvas.tsx — test double for the lazy 3D canvas (06-06, RESEARCH Pitfall 2/3).
// jsdom has no WebGL, so tests swap the real chunk for this component:
//   vi.mock('./scene/GameCanvas', () => import('../test/fakeGameCanvas'))
// It renders a plain <canvas>, reports ready from a mount effect (unless `skipReady`), records the
// latest props (so a test can call `lastProps.onLost()`), and throws during render when
// `throwOnRender` is set (chunk / WebGL creation failure). It never completes 3D beats: dice,
// preview and hop beats end only through the store watchdog or `settle()`.
import { useEffect } from 'react';
import { act, waitFor } from '@testing-library/react';
import type { GameCanvasProps } from '../game/scene/GameCanvas';
import { usePresentation } from '../game/usePresentation';

interface FakeCanvasController {
  mounts: number;
  lastProps: GameCanvasProps | null;
  skipReady: boolean;
  throwOnRender: boolean;
  reset: () => void;
}

export const fakeCanvas: FakeCanvasController = {
  mounts: 0,
  lastProps: null,
  skipReady: false,
  throwOnRender: false,
  reset() {
    this.mounts = 0;
    this.lastProps = null;
    this.skipReady = false;
    this.throwOnRender = false;
  },
};

export default function FakeGameCanvas(props: GameCanvasProps) {
  if (fakeCanvas.throwOnRender) throw new Error('fake WebGL creation failure');
  fakeCanvas.lastProps = props;
  const { onReady } = props;
  useEffect(() => {
    fakeCanvas.mounts += 1;
    if (!fakeCanvas.skipReady) onReady();
    // Mount-only: the real canvas reports ready once from onCreated.
  }, []);
  return <canvas data-testid="fake-canvas" />;
}

// End every running / queued beat now (what the 3D consumers + banners would do over time).
export function settle(): void {
  act(() => {
    usePresentation.getState().skipAll();
  });
}

// Wait (real timers) until the lazy chunk resolved and the fake canvas mounted `mounts` times.
export async function waitForCanvas(mounts = 1): Promise<void> {
  await waitFor(() => {
    if (fakeCanvas.mounts < mounts) throw new Error(`fake canvas mounts ${fakeCanvas.mounts} < ${mounts}`);
  });
}
