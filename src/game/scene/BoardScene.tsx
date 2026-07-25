// src/game/scene/BoardScene.tsx — the R3F <Canvas> root (D-01/D-08, RESEARCH Pattern 1).
// Fixed slightly-tilted isometric camera (NO OrbitControls / no free orbit per UI-SPEC),
// dpr capped [1,2] for tablets, theme-driven clear color, hemisphere + directional light,
// and drei <Bounds fit> auto-framing the whole boardLength+1 path (re-fit on length change
// via the key). The scene GRAPH lives in <SceneContents> so @react-three/test-renderer can
// mount it without a WebGL <Canvas> (Pitfall 3).
import { Canvas } from '@react-three/fiber';
import { Bounds, ContactShadows } from '@react-three/drei';
import type { Participant } from '../../engine/types';
import BoardTiles from './BoardTiles';
import Token, { type MoveSpec } from './Token';
import Dice from './Dice';

export interface BoardSceneProps {
  boardLength: number;
  participants: Participant[];
  activeIndex: number;
  move: MoveSpec | null; // the active token's pending move (null when idle)
  runToken: boolean; // false while the dice spins → active token holds at `from`
  rollId: number;
  face: number | null;
  onDiceSettled: () => void;
  onTokenArrive: () => void;
}

// Theme-driven clear color: sky-tinted in light, deep navy in dark (UI-SPEC Color).
function themeClearColor(): string {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return '#0C1A2B';
  }
  return '#E7F5FF';
}

// The scene graph WITHOUT <Canvas> — mounted directly by tests (no WebGL needed).
export function SceneContents(props: BoardSceneProps) {
  const {
    boardLength,
    participants,
    activeIndex,
    move,
    runToken,
    rollId,
    face,
    onDiceSettled,
    onTokenArrive,
  } = props;
  return (
    <>
      <hemisphereLight intensity={0.75} color="#ffffff" groundColor="#cfe4f5" />
      <directionalLight position={[6, 12, 6]} intensity={1.15} color="#fff6e0" />
      {/* Cool rim light for a fresh toy-plastic pop (kawaii/Nintendo lighting). */}
      <pointLight position={[-6, 6, -4]} intensity={0.45} color="#8fd0ff" />
      {/* Auto-frame the whole path; remount (key) re-fits when the board length changes.
          Only the static tiles drive framing, so token hops never cause refit jitter. */}
      <Bounds key={boardLength} fit clip margin={1.2}>
        <BoardTiles boardLength={boardLength} />
      </Bounds>
      {participants.map((p, i) => (
        <Token
          key={p.id}
          participant={p}
          index={i}
          active={i === activeIndex}
          move={i === activeIndex ? move : null}
          run={i === activeIndex ? runToken : false}
          onArrive={onTokenArrive}
        />
      ))}
      <Dice face={face} rollId={rollId} onSettled={onDiceSettled} />
    </>
  );
}

export default function BoardScene(props: BoardSceneProps) {
  return (
    <Canvas
      className="board-canvas"
      dpr={[1, 2]} // D-08 pixelRatio cap for tablets
      // frameloop="always" for reliability (avoids the Pitfall 4 demand-freeze). demand +
      // per-frame invalidate() is an optional battery optimisation the 03-02 perf check may enable.
      frameloop="always"
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [8, 11, 12], fov: 40 }}
      onCreated={({ gl }) => gl.setClearColor(themeClearColor())}
    >
      <SceneContents {...props} />
      {/* Soft grounding shadow under the whole board — big polish, no light shadow-maps
          needed. Kept in the Canvas (not SceneContents) so the headless scene test, which
          mounts SceneContents without WebGL, never instantiates its render target. */}
      <ContactShadows
        position={[0, -0.14, 0]}
        scale={40}
        blur={2.6}
        far={4}
        opacity={0.34}
        resolution={512}
        color="#123a58"
      />
    </Canvas>
  );
}
