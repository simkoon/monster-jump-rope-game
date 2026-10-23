// src/game/scene/StartGate.tsx — the start landmark gate (D-12, BOARD-02).
// Two white pillars, a coral half-torus arch, two sky pennants and a glowing gold star on the apex,
// standing on top of the gold start block. The gate faces the board diagonal (1, 0, 1) — turned 45°
// so the arch opens toward the camera — and sits toward the OUTER corner of the start block so it
// never hides another tile. Shared GEO/MAT only; never disposed here (Pitfall 9).
import { START_H, TRACK_TOP, tileCenter, type RingLayout } from '../layout/ringLayout';
import { GEO, MAT } from './geometries';

const PILLAR_H = 0.7;
const ARCH_R = 0.55;
const ARCH_TUBE = 0.09;
const OUTWARD = 0.2; // shift toward the outer corner, along the diagonal

export default function StartGate({ layout }: { layout: RingLayout }) {
  const c = tileCenter(layout, 0);
  const sx = Math.sign(c.x) || 1;
  const sz = Math.sign(c.z) || 1;
  const k = OUTWARD * Math.SQRT1_2;
  const facing = Math.atan2(sx, sz); // local +Z → the outward board diagonal (π/4 for the start corner)
  const starY = PILLAR_H + ARCH_R + ARCH_TUBE + 0.2;

  return (
    <group
      name="start-gate"
      position={[c.x + sx * k, TRACK_TOP + START_H, c.z + sz * k]}
      rotation={[0, facing, 0]}
    >
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            name="gate-pillar"
            geometry={GEO.gatePillar}
            material={MAT.gatePillar}
            position={[side * ARCH_R, PILLAR_H / 2, 0]}
            dispose={null}
          />
          <mesh
            name="gate-flag"
            geometry={GEO.gateFlag}
            material={MAT.gateFlag}
            position={[side * (ARCH_R + 0.05), PILLAR_H + 0.04, -0.01]}
            rotation={[0, side < 0 ? Math.PI : 0, 0]}
            dispose={null}
          />
        </group>
      ))}
      <mesh name="gate-arch" geometry={GEO.gateArch} material={MAT.gateArch} position={[0, PILLAR_H, 0]} dispose={null} />
      <mesh name="gate-star" geometry={GEO.gateStar} material={MAT.gateStar} position={[0, starY, 0]} dispose={null} />
    </group>
  );
}
