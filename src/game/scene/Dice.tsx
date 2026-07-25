// src/game/scene/Dice.tsx — the tween die (D-05, RESEARCH Pattern 5). No physics.
// On a new roll it spins ~0.8s with extra full turns then SNAPS to FACE_UP_EULER[face] —
// the engine's pre-rolled 1–6 value is the source of truth; the mesh is decorative. On
// settle it calls onSettled → the orchestrator starts the token move. Reduced motion snaps
// to the face immediately and settles at once (UI-SPEC). The exact face table is validated
// visually against this pip layout (Open Question 2).
import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh, SphereGeometry, MeshStandardMaterial } from 'three';
import { FACE_UP_EULER, type DieFace } from '../diceRotation';

// Spin duration (UI-SPEC). Exported so the watchdog budget can include it.
export const DICE_S = 0.8;

// Fixed dice position over the board (framed with the tiles by the camera).
const DICE_POS: [number, number, number] = [-1.6, 1.3, 1.5];

const BOX = 0.9;
const H = BOX / 2; // half-extent → face plane offset
const G = 0.22; // pip spacing
const PIP_R = 0.075;

// Standard die pip layout in a {-1,0,1} grid per value.
const PIP_GRID: Record<DieFace, Array<[number, number]>> = {
  1: [[0, 0]],
  2: [[-1, 1], [1, -1]],
  3: [[-1, 1], [0, 0], [1, -1]],
  4: [[-1, 1], [1, 1], [-1, -1], [1, -1]],
  5: [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]],
  6: [[-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]],
};

// Face value → outward normal axis. Opposite faces sum to 7 (matches FACE_UP_EULER).
// 1:+Y 6:-Y 2:+Z 5:-Z 3:+X 4:-X
function pipWorld(face: DieFace, u: number, v: number): [number, number, number] {
  switch (face) {
    case 1: return [u * G, H, v * G];
    case 6: return [u * G, -H, v * G];
    case 2: return [u * G, v * G, H];
    case 5: return [u * G, v * G, -H];
    case 3: return [H, u * G, v * G];
    case 4: return [-H, u * G, v * G];
  }
}

interface DiceProps {
  face: number | null; // engine lastRoll (1..6)
  rollId: number; // increments each roll → triggers a new spin
  onSettled: () => void;
}

export default function Dice({ face, rollId, onSettled }: DiceProps) {
  const meshRef = useRef<Mesh>(null!);
  const { invalidate } = useThree();

  // Shared pip geometry + material (D-08 — one sphere geo reused for every pip).
  const pipGeo = useMemo(() => new SphereGeometry(PIP_R, 10, 10), []);
  const pipMat = useMemo(() => new MeshStandardMaterial({ color: '#16324A' }), []);
  const pips = useMemo(() => {
    const out: Array<{ key: string; pos: [number, number, number] }> = [];
    (Object.keys(PIP_GRID) as unknown as DieFace[]).forEach((f) => {
      const face = Number(f) as DieFace;
      PIP_GRID[face].forEach(([u, v], i) => out.push({ key: `${face}-${i}`, pos: pipWorld(face, u, v) }));
    });
    return out;
  }, []);

  // Imperatively-created (useMemo) resources are NOT auto-disposed by R3F when passed via
  // props → dispose them explicitly on unmount to keep GPU memory flat (D-08, Pitfall 2).
  useEffect(() => () => {
    pipGeo.dispose();
    pipMat.dispose();
  }, [pipGeo, pipMat]);

  // Spin bookkeeping (refs only).
  const prevRollRef = useRef(rollId);
  const spinningRef = useRef(false);
  const tRef = useRef(0);
  const targetRef = useRef<DieFace>(1);
  const startRef = useRef<[number, number, number]>([0, 0, 0]);
  const spinRef = useRef<[number, number, number]>([0, 0, 0]);

  useFrame((_, delta) => {
    const m = meshRef.current;
    if (!m) return;

    // A new roll id with a valid face starts a spin.
    if (prevRollRef.current !== rollId && face != null) {
      prevRollRef.current = rollId;
      targetRef.current = face as DieFace;
      const reduce =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const t = FACE_UP_EULER[targetRef.current];
      if (reduce) {
        m.rotation.set(t.x, t.y, t.z);
        onSettled();
        invalidate();
        return;
      }
      startRef.current = [m.rotation.x, m.rotation.y, m.rotation.z];
      // 2–3 extra full turns folded into the eased approach.
      spinRef.current = [Math.PI * 4, Math.PI * 6, Math.PI * 4];
      tRef.current = 0;
      spinningRef.current = true;
    }

    if (!spinningRef.current) return;

    tRef.current += delta / DICE_S;
    const e = Math.min(tRef.current, 1);
    const ease = 1 - Math.pow(1 - e, 3); // ease-out cubic
    const t = FACE_UP_EULER[targetRef.current];
    // Decelerate from (target + extra spin) into the exact face rotation.
    m.rotation.set(
      t.x + (1 - ease) * spinRef.current[0],
      t.y + (1 - ease) * spinRef.current[1],
      t.z + (1 - ease) * spinRef.current[2],
    );
    invalidate();

    if (tRef.current >= 1) {
      m.rotation.set(t.x, t.y, t.z); // snap exactly to the pre-rolled face
      spinningRef.current = false;
      onSettled();
    }
  });

  return (
    <mesh ref={meshRef} name="dice" position={DICE_POS}>
      <boxGeometry args={[BOX, BOX, BOX]} />
      <meshStandardMaterial color="#FFFFFF" />
      {pips.map((p) => (
        <mesh key={p.key} position={p.pos} geometry={pipGeo} material={pipMat} />
      ))}
    </mesh>
  );
}
