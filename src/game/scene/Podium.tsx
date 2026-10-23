// src/game/scene/Podium.tsx — the ceremony podium: a floor disc + ONE gold tier (Phase 8 D-11, D-12,
// END-01, UI-SPEC §F7 "3D 시상대").
// D-12: there is exactly one tier, the highest (gold); every winner stands on it and there is no
// 2nd / 3rd tier. Two meshes, ALWAYS mounted by SceneContents and only switched with `visible`
// (RESEARCH Pattern 6, Pitfall 2): the ceremony and every restart reuse these very objects, so five
// games in a row never create or leak GPU resources. Geometries and materials are module-scope
// singletons passed by reference with dispose disabled (null); the per-game size is a mesh scale only
// (the rounded corners of the unit tier stretch slightly with it — accepted). Palette colors only,
// MeshStandardMaterial like the board (roughness 0.7 / 0.3, a 0.2 gold glow); no shadow maps.
import { CylinderGeometry, MeshStandardMaterial } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GROUND_HEIGHT, PODIUM_HEIGHT, type PodiumLayout } from '../layout/podiumLayout';
import { FX_COLOR } from '../palette';

export const PODIUM_GEO = {
  ground: new CylinderGeometry(1, 1, 1, 48), // unit disc, scaled to (radius, height, radius)
  tier: new RoundedBoxGeometry(1, 1, 1, 4, 0.12), // unit box, scaled to (width, height, depth)
} as const;

export const PODIUM_MAT = {
  ground: new MeshStandardMaterial({ color: FX_COLOR.podiumGround, roughness: 0.7 }),
  tier: new MeshStandardMaterial({
    color: FX_COLOR.podium,
    emissive: FX_COLOR.podiumEmissive,
    emissiveIntensity: 0.2,
    roughness: 0.3,
  }),
} as const;

// Kept while no ceremony runs (the meshes stay mounted, just invisible).
const IDLE = { radius: 2.4, width: 1.6, depth: 1.2, z: 0 };

export interface PodiumProps {
  layout: PodiumLayout | null;
  visible: boolean;
}

export default function Podium({ layout, visible }: PodiumProps) {
  const radius = layout?.groundRadius ?? IDLE.radius;
  const width = layout?.podium.width ?? IDLE.width;
  const depth = layout?.podium.depth ?? IDLE.depth;
  const z = layout?.podium.z ?? IDLE.z;
  return (
    <group name="podium" visible={visible}>
      <mesh
        name="podium-ground"
        geometry={PODIUM_GEO.ground}
        material={PODIUM_MAT.ground}
        position={[0, GROUND_HEIGHT / 2, 0]}
        scale={[radius, GROUND_HEIGHT, radius]}
        dispose={null}
      />
      <mesh
        name="podium-tier"
        geometry={PODIUM_GEO.tier}
        material={PODIUM_MAT.tier}
        position={[0, GROUND_HEIGHT + PODIUM_HEIGHT / 2, z]}
        scale={[width, PODIUM_HEIGHT, depth]}
        dispose={null}
      />
    </group>
  );
}
