// @vitest-environment node
// src/game/scene/headAnchor.test.tsx — the DOM star starts where the mounted character really stands
// (D-05, FX-02). Mounts the real SceneContents with @react-three/test-renderer (no WebGL), lets the
// characters settle, and compares each `pawn-{pid}` group's world position with headAnchor: x / z
// equal, and ground y + (HEAD_TOP + lift) × slot scale equals the anchor's y.
import { describe, it, expect, afterEach } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Vector3, type Object3D } from 'three';
import { SceneContents } from './SceneContents';
import { usePresentation } from '../usePresentation';
import { EMPTY_DISPLAYED } from '../director/displayed';
import { boardWith } from '../../engine/testkit';
import { HEAD_TOP } from '../layout/chibiDims';
import { STAR_START_LIFT, headAnchor } from '../layout/headAnchor';
import { pawnSlots, standPoints } from '../layout/pawnSlots';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
let open: Renderer[] = [];

afterEach(async () => {
  for (const r of open) await r.unmount();
  open = [];
  usePresentation.getState().reset(EMPTY_DISPLAYED, null);
});

const tiles = boardWith(20);
const participants = [
  { id: 'a', animal: 'bear' as const },
  { id: 'b', animal: 'cat' as const },
  { id: 'c', animal: 'dog' as const },
];
const order = participants.map((p) => p.id);
const positions = { a: 0, b: 0, c: 7 };

describe('headAnchor (D-05): pure, same placement as Character', () => {
  it('is the stand point + slot offset, lifted above the head by the slot scale', () => {
    const pts = standPoints(tiles);
    const slots = pawnSlots(order, positions, 'b', tiles.length);
    for (const pid of order) {
      const p = pts[positions[pid as keyof typeof positions]];
      const s = slots[pid];
      const got = headAnchor(tiles, order, positions, 'b', pid);
      expect(got[0]).toBeCloseTo(p.x + s.dx, 12);
      expect(got[1]).toBeCloseTo(p.y + (HEAD_TOP + STAR_START_LIFT) * s.scale, 12);
      expect(got[2]).toBeCloseTo(p.z + s.dz, 12);
    }
  });

  it('falls back to tile 0 and the center slot for an unknown pid', () => {
    const p = standPoints(tiles)[0];
    const got = headAnchor(tiles, order, positions, 'b', 'nobody', 0);
    expect(got).toEqual([p.x, p.y + HEAD_TOP, p.z]);
  });

  it('matches the mounted pawn-{pid} groups of the real scene', async () => {
    usePresentation.getState().reset({ positions, stars: { a: 0, b: 0, c: 0 } }, null);
    const r = await ReactThreeTestRenderer.create(
      <SceneContents tiles={tiles} participants={participants} currentId="b" restFace={null} />,
    );
    open.push(r);
    await ReactThreeTestRenderer.act(async () => {
      await r.advanceFrames(5, 1 / 60);
    });
    const slots = pawnSlots(order, positions, 'b', tiles.length);
    for (const pid of order) {
      const found = r.scene
        .findAll((n) => (n.instance as Object3D | undefined)?.name === `pawn-${pid}`)
        .map((n) => n.instance as Object3D);
      expect(found, pid).toHaveLength(1);
      found[0].updateWorldMatrix(true, false);
      const w = found[0].getWorldPosition(new Vector3());
      const a = headAnchor(tiles, order, positions, 'b', pid);
      expect(Math.abs(w.x - a[0]), `${pid} x`).toBeLessThan(1e-6);
      expect(Math.abs(w.z - a[2]), `${pid} z`).toBeLessThan(1e-6);
      expect(Math.abs(w.y + (HEAD_TOP + STAR_START_LIFT) * slots[pid].scale - a[1]), `${pid} y`).toBeLessThan(1e-6);
      expect(Math.abs(found[0].scale.x - slots[pid].scale), `${pid} scale`).toBeLessThan(1e-6);
    }
  });
});
