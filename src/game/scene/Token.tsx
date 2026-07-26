// src/game/scene/Token.tsx — placeholder pawn per participant (D-04, LOOP-06, RESEARCH Pattern 3).
// The visual position is a ref animated in useFrame toward the engine's authoritative square;
// it NEVER setStates per frame (anti-pattern). The active token's move is choreographed as a
// two-stage hop (from → afterRoll → to) so forward/backward events read correctly. On the
// final hop's arrival it calls onArrive → the orchestrator fires ANIM_DONE (D-07).
import { useRef, useLayoutEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Float } from '@react-three/drei';
import { Group, Vector3 } from 'three';
import type { Participant } from '../../engine/types';
import { squarePosition } from '../boardLayout';

// Per-square hop duration (UI-SPEC motion timings). Exported for the watchdog budget.
export const HOP_S = 0.18;

// Fixed placeholder token colors, assigned by participant index (UI-SPEC color order).
// Cycles at 6 (index % 6) for participants 7–8 — the <Html> name label guarantees
// color-independent identity, so a repeated hue is acceptable (Open Question 1).
export const TOKEN_COLORS = ['#22B0F2', '#FF5C7A', '#25D6A0', '#FFCB2E', '#9A7DFF', '#FF80B5'] as const;

export function tokenColor(index: number): string {
  return TOKEN_COLORS[index % TOKEN_COLORS.length];
}

// A single move the active token should play. `id` identifies the roll generation so the
// token re-initialises its path when a new move arrives. from→afterRoll is the dice hop;
// afterRoll→to is the event bounce (equal when there is no event).
export interface MoveSpec {
  id: number;
  from: number;
  afterRoll: number;
  to: number;
}

// Ordered list of squares to ARRIVE at, in sequence, covering both move stages.
function buildPath(from: number, afterRoll: number, to: number): number[] {
  const path: number[] = [];
  const d1 = afterRoll >= from ? 1 : -1;
  for (let s = from; s !== afterRoll; s += d1) path.push(s + d1);
  const d2 = to >= afterRoll ? 1 : -1;
  for (let s = afterRoll; s !== to; s += d2) path.push(s + d2);
  return path;
}

// Exported so MoveHighlight reuses this exact check instead of re-implementing it.
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// easeOutBack — a playful overshoot pop for the hop arc (RESEARCH Pattern 3).
function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

interface TokenProps {
  participant: Participant;
  index: number;
  active: boolean;
  // Set for the active token once a roll happens; null for idle tokens.
  move: MoveSpec | null;
  // While false the token holds at move.from (dice is still spinning); true drives the hop.
  run: boolean;
  onArrive: () => void;
}

export default function Token({ participant, index, active, move, run, onArrive }: TokenProps) {
  const groupRef = useRef<Group>(null!);
  const { invalidate } = useThree();

  // Animation bookkeeping (refs only — never per-frame setState).
  const moveIdRef = useRef<number>(-1);
  const pathRef = useRef<number[]>([]);
  const segRef = useRef(0);
  const tRef = useRef(0);
  const curSquareRef = useRef(participant.position);
  const doneRef = useRef(false);

  const color = useMemo(() => tokenColor(index), [index]);

  // Sit at the engine square on mount so nothing teleports on first paint.
  useLayoutEffect(() => {
    const p = squarePosition(participant.position);
    groupRef.current.position.set(p.x, 0, p.z);
    curSquareRef.current = participant.position;
  }, [participant.position]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

    // No pending move → rest exactly on the engine's authoritative square.
    if (!move) {
      const p = squarePosition(participant.position);
      g.position.set(p.x, 0, p.z);
      return;
    }

    // New move arrived → (re)initialise the hop path.
    if (moveIdRef.current !== move.id) {
      moveIdRef.current = move.id;
      pathRef.current = buildPath(move.from, move.afterRoll, move.to);
      segRef.current = 0;
      tRef.current = 0;
      curSquareRef.current = move.from;
      doneRef.current = false;
      const start = squarePosition(move.from);
      g.position.set(start.x, 0, start.z);
    }

    // Hold at `from` until the dice settles (run === false) — prevents an early teleport.
    if (!run) {
      const start = squarePosition(move.from);
      g.position.set(start.x, 0, start.z);
      return;
    }

    if (doneRef.current) return;

    // Zero-length move (from===afterRoll===to) or reduced motion → snap + arrive at once.
    if (pathRef.current.length === 0 || prefersReducedMotion()) {
      const end = squarePosition(move.to);
      g.position.set(end.x, 0, end.z);
      doneRef.current = true;
      onArrive();
      invalidate();
      return;
    }

    tRef.current += delta / HOP_S;
    const e = Math.min(tRef.current, 1);
    const a = squarePosition(curSquareRef.current);
    const b = squarePosition(pathRef.current[segRef.current]);
    const pos = new Vector3().lerpVectors(a, b, easeOutBack(e));
    g.position.set(pos.x, Math.sin(e * Math.PI) * 0.4, pos.z); // hop arc
    invalidate();

    if (tRef.current >= 1) {
      curSquareRef.current = pathRef.current[segRef.current];
      segRef.current += 1;
      tRef.current = 0;
      if (segRef.current >= pathRef.current.length) {
        const end = squarePosition(move.to);
        g.position.set(end.x, 0, end.z);
        doneRef.current = true;
        onArrive(); // → ANIM_DONE for the whole move
      }
    }
  });

  return (
    <group ref={groupRef} name="token">
      {/* Cute rounded placeholder pawn (Phase 4 swaps in the real character mesh). The pawn
          bobs gently via <Float>; the ground ring stays put so the highlight reads clearly. */}
      <Float speed={2.4} rotationIntensity={0.12} floatIntensity={0.4}>
        {/* glossy rounded capsule body */}
        <mesh position={[0, 0.34, 0]} castShadow>
          <capsuleGeometry args={[0.24, 0.24, 8, 20]} />
          <meshStandardMaterial
            color={color}
            roughness={0.28}
            metalness={0.06}
            emissive={active ? '#22B0F2' : '#000000'}
            emissiveIntensity={active ? 0.28 : 0}
          />
        </mesh>
        {/* glossy round head */}
        <mesh position={[0, 0.74, 0]} castShadow>
          <sphereGeometry args={[0.2, 24, 24]} />
          <meshStandardMaterial color={color} roughness={0.22} metalness={0.06} />
        </mesh>
      </Float>
      {/* Active-turn highlight ring on the ground (sky glow). y=0.22 — path tile tops sit at
          0.15 and the finish tile at 0.19, so the old 0.02 ring was buried inside the tile
          and never actually visible on screen. */}
      {active && (
        <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.34, 0.46, 32]} />
          <meshStandardMaterial color="#22B0F2" emissive="#22B0F2" emissiveIntensity={0.7} />
        </mesh>
      )}
      {/* Floating name label — color-independent identity (a11y). Skipped when there is no
          DOM (node test env) so @react-three/test-renderer can mount the scene. */}
      {typeof document !== 'undefined' && (
        <Html center distanceFactor={10} position={[0, 1.1, 0]}>
          <span className="token-label">{participant.name}</span>
        </Html>
      )}
    </group>
  );
}
