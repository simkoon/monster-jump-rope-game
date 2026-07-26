// src/game/scene/MoveHighlight.tsx — the "어디로 가는지" board layer (LOOP-05/06/07).
// From the moment the die settles until the token arrives, this draws the move on the board:
// sky dots over every square the token will pass, a grape ring on the dice destination, and —
// only when an event moved the player again — a mint/coral cone pin over the final square.
// Reading order is deliberate: the child sees the destination FIRST, then the token travels there.
//
// Palette is reused verbatim (no new hues): --sky #22B0F2, --grape #9A7DFF, --grass #25D6A0,
// --coral #FF5C7A. Shape carries the same message as color (ring vs. cone) for color-blind
// readability. All geometries are declared as JSX intrinsics so R3F disposes them (D-08).
import { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { InstancedMesh, Mesh, Object3D } from 'three';
import { squarePosition } from '../boardLayout';
import { planHighlight, MAX_STEP_MARKERS } from '../moveHighlight';
import { prefersReducedMotion, type MoveSpec } from './Token';

// How long the board shows the destination BEFORE the token starts hopping (D-D).
// Exported like DICE_S / HOP_S because PlayView must add it to the watchdog budget.
export const PREVIEW_S = 0.55;

// Flat markers sit above BOTH tile tops (path tile top y=0.15, finish tile top y=0.19),
// otherwise they are buried inside the tile geometry and never appear on screen.
const MARKER_Y = 0.22;
// Cone pin floats above its square, tip pointing down at it.
const PIN_Y = 0.95;
const LABEL_Y = 1.35;

const STEP_COLOR = '#22B0F2'; // --sky, same language as the active-token ring
const DEST_COLOR = '#9A7DFF'; // --grape, clashes with neither --sun (finish) nor --sky
const FORWARD_COLOR = '#25D6A0'; // --grass, matches DiceResultPanel .eff-forward
const BACKWARD_COLOR = '#FF5C7A'; // --coral, matches DiceResultPanel .eff-backward

interface MoveHighlightProps {
  move: MoveSpec | null;
  boardLength: number;
  visible: boolean;
}

// Hook-free gate: keeps every hook inside <HighlightMarkers>, so there is neither a
// conditional hook call nor a null-ref guard to maintain.
export default function MoveHighlight({ move, boardLength, visible }: MoveHighlightProps) {
  if (!visible || !move) return null;
  return <HighlightMarkers move={move} boardLength={boardLength} />;
}

function HighlightMarkers({ move, boardLength }: { move: MoveSpec; boardLength: number }) {
  const stepsRef = useRef<InstancedMesh>(null!);
  const ringRef = useRef<Mesh>(null!);
  const pinRef = useRef<Mesh>(null!);
  const { invalidate } = useThree();

  const plan = useMemo(() => planHighlight(move, boardLength), [move, boardLength]);
  // Read once per mount (this layer remounts on every roll) instead of per frame.
  const reduce = useMemo(() => prefersReducedMotion(), []);

  const destPos = squarePosition(plan.dest);
  const finalPos = plan.final != null ? squarePosition(plan.final) : null;
  const labelSquare = plan.final ?? plan.dest;
  const labelPos = squarePosition(labelSquare);
  const pinColor = plan.finalDir === 'backward' ? BACKWARD_COLOR : FORWARD_COLOR;

  // One transform per passed-through square. Capacity is the CONSTANT MAX_STEP_MARKERS, so
  // `args` never changes and the instanced mesh is never rebuilt between rolls.
  useLayoutEffect(() => {
    const mesh = stepsRef.current;
    if (!mesh) return;
    const dummy = new Object3D();
    plan.steps.forEach((square, i) => {
      const p = squarePosition(square);
      dummy.position.set(p.x, MARKER_Y, p.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.count = plan.steps.length;
    mesh.instanceMatrix.needsUpdate = true;
    // Every dot shares one color → no setColorAt / instanceColor buffer.
  }, [plan]);

  // Reduced motion: the highlight STAYS VISIBLE, it just stops pulsing (a11y — removing the
  // affordance entirely would hurt exactly the users who need it most).
  useLayoutEffect(() => {
    if (!reduce) return;
    ringRef.current?.scale.setScalar(1);
    if (pinRef.current) pinRef.current.position.y = PIN_Y;
  }, [reduce, plan]);

  // Refs only — never setState per frame (Token.tsx anti-pattern note).
  useFrame(({ clock }) => {
    if (reduce) return;
    const wave = Math.sin(clock.elapsedTime * 4);
    if (ringRef.current) ringRef.current.scale.setScalar(1 + wave * 0.12);
    if (pinRef.current) pinRef.current.position.y = PIN_Y + wave * 0.09;
    invalidate(); // safe if frameloop ever switches to demand (same as Token/Dice)
  });

  return (
    <group name="move-highlight">
      {/* Squares travelled through — ONE instanced mesh, fixed capacity (D-C). */}
      <instancedMesh
        ref={stepsRef}
        name="step-markers"
        args={[undefined, undefined, MAX_STEP_MARKERS]}
      >
        <cylinderGeometry args={[0.14, 0.14, 0.06, 18]} />
        <meshStandardMaterial
          color={STEP_COLOR}
          emissive={STEP_COLOR}
          emissiveIntensity={0.5}
          roughness={0.35}
        />
      </instancedMesh>

      {/* Dice destination — a flat ring lying on the square (parent holds pose, mesh pulses). */}
      <group position={[destPos.x, MARKER_Y, destPos.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh ref={ringRef} name="dest-marker">
          <ringGeometry args={[0.4, 0.58, 40]} />
          <meshStandardMaterial color={DEST_COLOR} emissive={DEST_COLOR} emissiveIntensity={0.85} />
        </mesh>
      </group>

      {/* Event final destination — a cone pin, tip DOWN, mint forward / coral backward. */}
      {finalPos && (
        <mesh
          ref={pinRef}
          name="final-marker"
          position={[finalPos.x, PIN_Y, finalPos.z]}
          rotation={[Math.PI, 0, 0]}
        >
          <coneGeometry args={[0.22, 0.42, 20]} />
          <meshStandardMaterial color={pinColor} emissive={pinColor} emissiveIntensity={0.6} />
        </mesh>
      )}

      {/* Square-number pill. aria-hidden: DiceResultPanel's aria-live region is the single
          screen-reader announcement for the landing — a second one would double-read. */}
      {typeof document !== 'undefined' && (
        <Html center distanceFactor={10} position={[labelPos.x, LABEL_Y, labelPos.z]}>
          <span className="move-dest-label" aria-hidden="true">
            {labelSquare}칸
          </span>
        </Html>
      )}
    </group>
  );
}
