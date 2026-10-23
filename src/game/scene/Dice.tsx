// src/game/scene/Dice.tsx — the glossy tween die and the dice beat consumer (D-20, D-25, HUD-03).
// Restored from v1 (d7b9b73) with the 06-01 face table and the shared die parts: a rounded cream
// body with 21 instanced ink pips, standing in the yard center. No physics: the engine pre-rolls
// the face and the die only shows it.
// Motion per beat (normalized τ = t / ms, UI-SPEC Motion Contract):
//   0 – 0.2   jump up 1.2
//   0.2 – 0.85 ease-out cubic spin of 2–3 extra turns into FACE_UP_EULER[face], snapped exactly at 0.85
//   0.85 – 1  drop back and land with a 0.9 y-squash
// then completeBeat(id) once. Between rolls it keeps showing `restFace` (the engine's last roll);
// with no rest face it keeps its current rotation. No idle float: only the current pawn moves at rest.
// The frame loop reads the presentation store with getState(); refs only, delta clamped to 0.25 s.
import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, type Group, type InstancedMesh } from 'three';
import { FACE_UP_EULER, PIP_GRID, diceSize, isDieFace, pipPosition, type DieFace } from '../layout/diceFaces';
import { TRACK_TOP } from '../layout/ringLayout';
import { usePresentation } from '../usePresentation';
import { ACTOR_GEO, ACTOR_MAT } from './actorGeometries';

const PIP_COUNT = 21;
const PIP_SPACING = 0.25; // on the unit die
const YARD_TOP = TRACK_TOP + 0.02;
const JUMP = 1.2;
const JUMP_END = 0.2;
const SNAP_AT = 0.85;
const DROP_END = 0.6; // share of the landing phase spent falling; the rest is the squash
const SQUASH = 0.1; // y-scale dips to 0.9
const SPIN: readonly [number, number, number] = [4 * Math.PI, 6 * Math.PI, 4 * Math.PI];

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

export interface DiceProps {
  boardLength: number;
  restFace: number | null;
}

export default function Dice({ boardLength, restFace }: DiceProps) {
  const squash = useRef<Group>(null!); // squash pivot on the yard floor
  const die = useRef<Group>(null!); // `dice`: rotation (face) + uniform size + jump height
  const pips = useRef<InstancedMesh>(null!);

  const startedId = useRef(-1);
  const doneId = useRef(-1);
  const elapsed = useRef(0);
  const start = useRef<[number, number, number]>([0, 0, 0]);

  const size = diceSize(boardLength);
  const restY = size / 2;

  // 21 pips placed once on the unit die.
  useLayoutEffect(() => {
    const m = pips.current;
    const d = new Object3D();
    let n = 0;
    for (const face of [1, 2, 3, 4, 5, 6] as DieFace[]) {
      for (const [u, v] of PIP_GRID[face]) {
        d.position.set(...pipPosition(face, u, v, 0.5, PIP_SPACING));
        d.updateMatrix();
        m.setMatrixAt(n++, d.matrix);
      }
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
  }, []);

  // Show the rest face right away (mount, or a new roll applied with no beat — reduced motion).
  useLayoutEffect(() => {
    if (restFace != null && isDieFace(restFace) && !usePresentation.getState().current) {
      die.current.rotation.set(...FACE_UP_EULER[restFace]);
    }
  }, [restFace]);

  useFrame((_, delta) => {
    const g = die.current;
    const sq = squash.current;
    if (!g || !sq) return;
    const d = Math.min(delta, 0.25);
    const store = usePresentation.getState();
    const cur = store.current;
    const beat = cur && cur.kind === 'dice' && isDieFace(cur.face) ? cur : null;

    if (beat && doneId.current !== beat.id) {
      if (startedId.current !== beat.id) {
        startedId.current = beat.id;
        elapsed.current = 0;
        start.current = [g.rotation.x, g.rotation.y, g.rotation.z];
      }
      elapsed.current += d;
      const target = FACE_UP_EULER[beat.face as DieFace];
      const tau = beat.ms > 0 ? (elapsed.current * 1000) / beat.ms : 1;

      if (tau >= 1 - 1e-9) {
        g.rotation.set(...target);
        g.position.y = restY;
        sq.scale.set(1, 1, 1);
        doneId.current = beat.id;
        store.completeBeat(beat.id);
        return;
      }

      if (tau < JUMP_END) {
        g.position.y = restY + JUMP * easeOutCubic(tau / JUMP_END);
        g.rotation.set(...start.current);
      } else if (tau < SNAP_AT) {
        // From the previous face plus whole extra turns, decelerating into the target face.
        const e = easeOutCubic((tau - JUMP_END) / (SNAP_AT - JUMP_END));
        const [s0, s1, s2] = start.current;
        g.position.y = restY + JUMP;
        g.rotation.set(
          target[0] + (1 - e) * (SPIN[0] + s0 - target[0]),
          target[1] + (1 - e) * (SPIN[1] + s1 - target[1]),
          target[2] + (1 - e) * (SPIN[2] + s2 - target[2]),
        );
      } else {
        g.rotation.set(...target); // exact snap
        const u = (tau - SNAP_AT) / (1 - SNAP_AT);
        if (u < DROP_END) {
          const f = u / DROP_END;
          g.position.y = restY + JUMP * (1 - f * f);
          sq.scale.set(1, 1, 1);
        } else {
          g.position.y = restY;
          sq.scale.set(1, 1 - SQUASH * Math.sin((Math.PI * (u - DROP_END)) / (1 - DROP_END)), 1);
        }
      }
      return;
    }

    // At rest (also after a watchdog/skipAll ending): on the floor, showing the rest face.
    g.position.y = restY;
    sq.scale.set(1, 1, 1);
    if (restFace != null && isDieFace(restFace)) g.rotation.set(...FACE_UP_EULER[restFace]);
    if (startedId.current !== doneId.current) doneId.current = startedId.current;
  });

  return (
    <group ref={squash} name="dice-root" position={[0, YARD_TOP, 0]}>
      <group ref={die} name="dice" position={[0, restY, 0]} scale={size}>
        <mesh name="dice-body" geometry={ACTOR_GEO.diceBody} material={ACTOR_MAT.diceBody} dispose={null} />
        <instancedMesh
          ref={pips}
          name="dice-pips"
          args={[ACTOR_GEO.dicePip, ACTOR_MAT.dicePip, PIP_COUNT]}
          dispose={null}
        />
      </group>
    </group>
  );
}
