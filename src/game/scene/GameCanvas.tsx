// src/game/scene/GameCanvas.tsx — the single lazy WebGL Canvas (D-04, D-06, D-21, D-27, D-28, STAB-02).
// Loaded only through loadGameCanvas() (dynamic import), so three / R3F / drei stay out of the
// main chunk. Canvas setup (RESEARCH Pattern 6):
//   - flat: no tone mapping, so the palette hexes on the board match the DOM scoreboard (Pitfall 5)
//   - transparent background (alpha + clear alpha 0): the page theme shows behind the board
//   - DPR capped at 1.5 on phones (smaller window side ≤ 560) and 2 elsewhere (D-28)
//   - frameloop 'always' while visible, 'never' while hidden (GameStage also calls skipAll)
//   - no shadow maps and no post-processing: one static ContactShadows (frames=1, rendered once)
//     under the board base plus the blob shadows under pawns (D-04)
//   - no pointer interaction: tapping the board does nothing (D-21); touch-action blocks double-tap zoom
// Context loss (D-27): onCreated registers watchContextLoss on the WebGL canvas and reports
// onReady once; the watcher is removed on unmount. three already prevents default on the lost
// event and R3F disposes the renderer on unmount; GameStage remounts only from the user's
// "화면 다시 그리기" button. A DEV-only window.__loseContext() triggers a loss for desktop testing.
import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { Canvas, type RootState } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { CAMERA_FOV } from '../layout/fitCamera';
import { boardExtents, ringLayout } from '../layout/ringLayout';
import { SCENE_COLOR } from '../palette';
import { watchContextLoss } from './contextLoss';
import { SceneContents, type SceneProps } from './SceneContents';

export type GameCanvasProps = SceneProps & {
  visible: boolean;
  onReady: () => void;
  onLost: () => void;
};

declare global {
  interface Window {
    __loseContext?: () => void;
  }
}

const CANVAS_STYLE: CSSProperties = { pointerEvents: 'none', touchAction: 'manipulation' };
const GL_OPTIONS = { antialias: true, alpha: true } as const;
const CAMERA = { fov: CAMERA_FOV, near: 0.1, far: 200, position: [0, 12, 12] as [number, number, number] };
const PHONE_MAX_SIDE = 560;
const SHADOW_Y = -0.23; // just under the board base (base bottom at −0.22)

function isPhone(): boolean {
  if (typeof window === 'undefined') return false;
  return Math.min(window.innerWidth, window.innerHeight) <= PHONE_MAX_SIDE;
}

export default function GameCanvas({ visible, onReady, onLost, ...scene }: GameCanvasProps) {
  // Latest callbacks without re-creating onCreated.
  const readyRef = useRef(onReady);
  const lostRef = useRef(onLost);
  readyRef.current = onReady;
  lostRef.current = onLost;
  const unwatch = useRef<(() => void) | null>(null);

  const dpr = useMemo<[number, number]>(() => [1, isPhone() ? 1.5 : 2], []);
  const shadowScale = useMemo(() => boardExtents(ringLayout(scene.tiles.length)).hx * 2 * 1.3, [scene.tiles.length]);

  const handleCreated = useCallback(({ gl }: RootState) => {
    gl.setClearColor(0x000000, 0);
    unwatch.current?.();
    unwatch.current = watchContextLoss(gl.domElement, () => lostRef.current());
    if (import.meta.env.DEV) {
      window.__loseContext = () => gl.forceContextLoss();
    }
    readyRef.current();
  }, []);

  useEffect(
    () => () => {
      unwatch.current?.();
      unwatch.current = null;
      if (import.meta.env.DEV) delete window.__loseContext;
    },
    [],
  );

  return (
    <Canvas
      flat
      dpr={dpr}
      frameloop={visible ? 'always' : 'never'}
      gl={GL_OPTIONS}
      camera={CAMERA}
      style={CANVAS_STYLE}
      onCreated={handleCreated}
    >
      <SceneContents {...scene} />
      <ContactShadows
        frames={1}
        position={[0, SHADOW_Y, 0]}
        scale={shadowScale}
        opacity={0.35}
        blur={2.5}
        far={1.5}
        resolution={512}
        color={SCENE_COLOR.shadow}
      />
    </Canvas>
  );
}
