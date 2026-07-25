// src/game/scene/BoardTiles.tsx — the board path (D-03, D-08).
// Squares 0..boardLength-1 are ONE instancedMesh (single ROUNDED geometry + material → one
// draw call, leak-safe) with per-instance pastel "candy trail" colors. The finish tile at
// `boardLength` is drawn separately, rounded and glowing (--sun) + 🏁. The rounded geometries
// are useMemo'd, so they are disposed explicitly on unmount (Pitfall 2 / D-08).
import { useLayoutEffect, useMemo, useEffect, useRef } from 'react';
import { InstancedMesh, Object3D, Color } from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';
import { Html } from '@react-three/drei';
import { squarePosition } from '../boardLayout';

interface BoardTilesProps {
  boardLength: number;
}

// Soft pastel candy hues cycled along the path so the board reads as a playful trail.
const TILE_HUES = ['#BEE7FF', '#FFD9E8', '#CFF6E6', '#FFF0C4', '#E4DBFF'] as const;

export default function BoardTiles({ boardLength }: BoardTilesProps) {
  const meshRef = useRef<InstancedMesh>(null!);

  // Rounded, chunky toy-like tiles (one shared geometry for the whole path → one draw call).
  const tileGeo = useMemo(() => new RoundedBoxGeometry(0.94, 0.3, 0.94, 4, 0.1), []);
  const finishGeo = useMemo(() => new RoundedBoxGeometry(1.02, 0.38, 1.02, 5, 0.13), []);
  useEffect(
    () => () => {
      tileGeo.dispose();
      finishGeo.dispose();
    },
    [tileGeo, finishGeo],
  );

  // Write one transform + candy color per path square (once per board length).
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    const dummy = new Object3D();
    const col = new Color();
    for (let i = 0; i < boardLength; i++) {
      const p = squarePosition(i);
      dummy.position.set(p.x, 0, p.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      col.set(TILE_HUES[i % TILE_HUES.length]);
      mesh.setColorAt(i, col);
    }
    mesh.count = boardLength;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [boardLength]);

  const finish = squarePosition(boardLength);

  return (
    <group name="board-tiles">
      {/* Path tiles — one shared rounded geometry + white base material tinted per-instance. */}
      <instancedMesh
        ref={meshRef}
        name="path-tiles"
        args={[undefined, undefined, boardLength]}
        receiveShadow
        castShadow
      >
        <primitive object={tileGeo} attach="geometry" />
        <meshStandardMaterial roughness={0.55} metalness={0.04} />
      </instancedMesh>

      {/* Finish tile — rounded, sunny glow + flag. */}
      <mesh name="finish-tile" position={[finish.x, 0, finish.z]} receiveShadow castShadow>
        <primitive object={finishGeo} attach="geometry" />
        <meshStandardMaterial
          color="#FFCB2E"
          emissive="#FF9F1C"
          emissiveIntensity={0.4}
          roughness={0.32}
          metalness={0.1}
        />
      </mesh>
      {typeof document !== 'undefined' && (
        <Html center distanceFactor={10} position={[finish.x, 0.72, finish.z]}>
          <span className="finish-flag" aria-label="결승선">
            🏁
          </span>
        </Html>
      )}
    </group>
  );
}
