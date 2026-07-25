// src/game/scene/BoardTiles.tsx — the low-poly board path (D-03, D-08).
// Squares 0..boardLength-1 are ONE instancedMesh (single geometry + material → one draw
// call, leak-safe), positioned via the pure squarePosition map. The finish tile at
// `boardLength` is drawn separately and highlighted (--sun glow + 🏁). Geometry/material are
// declared as JSX children so R3F auto-disposes them on unmount (no manual dispose needed).
import { useLayoutEffect, useRef } from 'react';
import { InstancedMesh, Object3D } from 'three';
import { Html } from '@react-three/drei';
import { squarePosition } from '../boardLayout';

interface BoardTilesProps {
  boardLength: number;
}

export default function BoardTiles({ boardLength }: BoardTilesProps) {
  const meshRef = useRef<InstancedMesh>(null!);

  // Write one transform per path square into the instanced mesh (once per board length).
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    const dummy = new Object3D();
    for (let i = 0; i < boardLength; i++) {
      const p = squarePosition(i);
      dummy.position.set(p.x, 0, p.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.count = boardLength;
    mesh.instanceMatrix.needsUpdate = true;
  }, [boardLength]);

  const finish = squarePosition(boardLength);

  return (
    <group name="board-tiles">
      {/* Path tiles — one shared box geometry + material for all boardLength squares. */}
      <instancedMesh
        ref={meshRef}
        name="path-tiles"
        args={[undefined, undefined, boardLength]}
        receiveShadow
      >
        <boxGeometry args={[1, 0.2, 1]} />
        <meshStandardMaterial color="#F4F8FD" />
      </instancedMesh>

      {/* Finish tile — highlighted (--sun emissive) + flag label. */}
      <mesh name="finish-tile" position={[finish.x, 0, finish.z]} receiveShadow>
        <boxGeometry args={[1, 0.26, 1]} />
        <meshStandardMaterial color="#FFC22E" emissive="#FFC22E" emissiveIntensity={0.45} />
      </mesh>
      {typeof document !== 'undefined' && (
        <Html center distanceFactor={10} position={[finish.x, 0.6, finish.z]}>
          <span className="finish-flag" aria-label="결승선">
            🏁
          </span>
        </Html>
      )}
    </group>
  );
}
