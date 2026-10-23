// @vitest-environment node
// src/game/scene/ceremonyScene.test.tsx — the ceremony mode of the same 3D scene (Phase 8 08-09: D-11,
// D-12, D-16, D-23, END-01, RESEARCH Pattern 6 / Pitfall 2). Runs in node with
// @react-three/test-renderer (no WebGL). The ceremony is a prop of SceneContents: the board set and
// the ground shadow only turn invisible, the podium and the effect pools are always mounted, and no
// node is ever remounted across play → ceremony → restart.
import type { ReactElement } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { useThree } from '@react-three/fiber';
import { InstancedMesh, Mesh, Vector3, type Object3D, type PerspectiveCamera } from 'three';
import { SceneContents, type CeremonyProps } from './SceneContents';
import gameCanvasSource from './GameCanvas.tsx?raw';
import { usePresentation } from '../usePresentation';
import { EMPTY_DISPLAYED } from '../director/displayed';
import { useGameStore } from '../../harness/useGameStore';
import { boardWith } from '../../engine/testkit';
import { pawnSlots, standPoints } from '../layout/pawnSlots';
import { boardExtents, ringLayout } from '../layout/ringLayout';
import { fitCamera } from '../layout/fitCamera';
import { podiumLayout } from '../layout/podiumLayout';
import { FACE_KEYS, type FaceKey } from '../layout/chibiDims';
import type { AnimalId } from '../../engine/animals';
import { faceGeo } from './chibiFaces';

const rm = vi.hoisted(() => ({ reduced: false }));
vi.mock('../reducedMotion', () => ({ prefersReducedMotion: () => rm.reduced }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

const tiles20 = boardWith(20);
const points = standPoints(tiles20);
const four = [
  { id: 'a', animal: 'bear' as const },
  { id: 'b', animal: 'cat' as const },
  { id: 'c', animal: 'dog' as const },
  { id: 'd', animal: 'panda' as const },
];
const ANIMAL: Record<string, AnimalId> = { a: 'bear', b: 'cat', c: 'dog', d: 'panda' };
const POOLS = ['fx-confetti', 'fx-burst', 'fx-ring', 'fx-puff'] as const;
const SIZE = { width: 800, height: 600 };
const DT = 0.05;

let probe: { camera: PerspectiveCamera } | null = null;
function Probe() {
  probe = { camera: useThree((s) => s.camera) as PerspectiveCamera };
  return null;
}

const scene = (
  ceremony: CeremonyProps | null,
  participants: readonly { id: string; animal: AnimalId }[] = four,
): ReactElement => (
  <>
    <SceneContents tiles={tiles20} participants={participants} currentId="a" restFace={null} ceremony={ceremony} />
    <Probe />
  </>
);

let open: Renderer[] = [];
async function mount(el: ReactElement): Promise<Renderer> {
  const r = await ReactThreeTestRenderer.create(el, SIZE);
  open.push(r);
  return r;
}
async function update(r: Renderer, el: ReactElement): Promise<void> {
  await ReactThreeTestRenderer.act(async () => {
    await r.update(el);
  });
}
async function frames(r: Renderer, n: number, dt = DT): Promise<void> {
  await ReactThreeTestRenderer.act(async () => {
    await r.advanceFrames(n, dt);
  });
}

const named = (r: Renderer, name: string): Object3D[] =>
  r.scene.findAll((n) => (n.instance as Object3D | undefined)?.name === name).map((n) => n.instance as Object3D);
const one = (r: Renderer, name: string): Object3D => {
  const found = named(r, name);
  expect(found, name).toHaveLength(1);
  return found[0];
};
const partOf = (r: Renderer, pid: string, name: string): Object3D | null => {
  let found: Object3D | null = null;
  one(r, `pawn-${pid}`).traverse((o) => {
    if (o.name === name) found = o;
  });
  return found;
};
const faceOf = (r: Renderer, pid: string): FaceKey | 'unknown' => {
  const geo = (partOf(r, pid, 'chibi-face') as Mesh).geometry;
  return FACE_KEYS.find((k) => faceGeo(ANIMAL[pid], k) === geo) ?? 'unknown';
};
const worldOf = (o: Object3D) => o.getWorldPosition(new Vector3());

// Every node whose identity must survive the mode switches.
const KEEP = ['board-set', 'quest-tiles', 'dice', 'path-dots', 'podium', 'podium-ground', 'podium-tier', ...POOLS];
const snapshot = (r: Renderer, ids: readonly string[]) => [
  ...KEEP.map((n) => one(r, n)),
  ...ids.map((id) => one(r, `pawn-${id}`)),
];

const cer = (winners: string[], introId = 1, introActive = false): CeremonyProps => ({ winners, introId, introActive });

beforeEach(() => {
  rm.reduced = false;
  probe = null;
  usePresentation.getState().reset({ positions: { a: 3, b: 5, c: 0, d: 7 }, stars: { a: 3, b: 3, c: 1, d: 0 } }, null);
  useGameStore.setState({ game: null });
});

afterEach(async () => {
  for (const r of open) await r.unmount();
  open = [];
  usePresentation.getState().reset(EMPTY_DISPLAYED, null);
  useGameStore.setState({ game: null });
});

describe('ceremony mode: same scene graph, visibility toggles only (D-11, Pitfall 2)', () => {
  it('play → ceremony keeps every node; the board set hides and the podium shows', async () => {
    const r = await mount(scene(null));
    await frames(r, 2);
    expect(one(r, 'board-set').visible).toBe(true);
    expect(one(r, 'podium').visible).toBe(false);
    const before = snapshot(r, ['a', 'b', 'c', 'd']);
    await update(r, scene(cer(['a', 'b'])));
    await frames(r, 1);
    const after = snapshot(r, ['a', 'b', 'c', 'd']);
    after.forEach((o, i) => expect(o, KEEP[i] ?? `pawn ${i}`).toBe(before[i]));
    expect(one(r, 'board-set').visible).toBe(false);
    expect(one(r, 'podium').visible).toBe(true);
    // The board, dice and path preview live inside the hidden board set.
    for (const n of ['quest-tiles', 'dice', 'path-dots']) {
      let inSet = false;
      one(r, n).traverseAncestors((o) => {
        if (o.name === 'board-set') inSet = true;
      });
      expect(inSet, n).toBe(true);
    }
  });

  it('snaps everybody to their stands in one frame: winners on the tier with crowns, no turn ring', async () => {
    const r = await mount(scene(null));
    await frames(r, 2);
    await update(r, scene(cer(['a', 'b'])));
    await frames(r, 1);
    const l = podiumLayout(['a', 'b'], ['c', 'd']);
    for (const id of ['a', 'b', 'c', 'd']) {
      const s = l.stands[id];
      const g = one(r, `pawn-${id}`);
      const p = worldOf(g);
      expect(p.x, id).toBeCloseTo(s.x, 6);
      expect(p.y, id).toBeCloseTo(s.y, 6);
      expect(p.z, id).toBeCloseTo(s.z, 6);
      expect(g.scale.x, id).toBeCloseTo(s.scale, 6);
    }
    expect(partOf(r, 'a', 'crown')).not.toBeNull();
    expect(partOf(r, 'b', 'crown')).not.toBeNull();
    expect(partOf(r, 'c', 'crown')).toBeNull();
    expect(partOf(r, 'd', 'crown')).toBeNull();
    expect(named(r, 'turn-ring')).toHaveLength(0);
    expect(faceOf(r, 'a')).toBe('winner');
    expect(faceOf(r, 'b')).toBe('winner');
    expect(faceOf(r, 'c')).toBe('joy');
    expect(faceOf(r, 'd')).toBe('joy');
  });

  it('winners cheer big (≈ 0.35 × scale), everybody else smaller (≈ 0.15 × scale), facing the camera', async () => {
    const r = await mount(scene(cer(['a', 'b'])));
    const l = podiumLayout(['a', 'b'], ['c', 'd']);
    const peak: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
    for (let k = 0; k < 120; k++) {
      await frames(r, 1, 0.025);
      for (const id of Object.keys(peak)) {
        const body = partOf(r, id, 'pawn-body')!;
        const dy = worldOf(body).y - worldOf(one(r, `pawn-${id}`)).y;
        peak[id] = Math.max(peak[id], dy);
        expect(Math.abs(body.rotation.y), id).toBeLessThan(1e-9);
      }
    }
    for (const id of ['a', 'b']) expect(peak[id], id).toBeCloseTo(0.35 * l.stands[id].scale, 1);
    for (const id of ['c', 'd']) expect(peak[id], id).toBeCloseTo(0.15 * l.stands[id].scale, 1);
    for (const id of ['c', 'd']) expect(peak[id]).toBeLessThan(peak.a);
  });

  it('reduced motion: everybody holds REST with the same faces', async () => {
    rm.reduced = true;
    const r = await mount(scene(cer(['a', 'b'], 1, true)));
    for (let k = 0; k < 60; k++) {
      await frames(r, 1);
      for (const id of ['a', 'b', 'c', 'd']) expect(partOf(r, id, 'pawn-body')!.position.y, id).toBe(0);
    }
    expect(faceOf(r, 'a')).toBe('winner');
    expect(faceOf(r, 'c')).toBe('joy');
  });

  it('restart: ceremony off + positions 0 → back on the start-tile slots next frame, same nodes', async () => {
    const r = await mount(scene(null));
    await frames(r, 2);
    const before = snapshot(r, ['a', 'b', 'c', 'd']);
    await update(r, scene(cer(['a', 'b'])));
    await frames(r, 10);
    await ReactThreeTestRenderer.act(async () => {
      usePresentation.getState().reset({ positions: { a: 0, b: 0, c: 0, d: 0 }, stars: { a: 0, b: 0, c: 0, d: 0 } }, null);
    });
    await update(r, scene(null));
    await frames(r, 1);
    const slots = pawnSlots(['a', 'b', 'c', 'd'], { a: 0, b: 0, c: 0, d: 0 }, 'a', 20);
    for (const id of ['a', 'b', 'c', 'd']) {
      const g = one(r, `pawn-${id}`);
      const p = worldOf(g);
      expect(p.x, id).toBeCloseTo(points[0].x + slots[id].dx, 6);
      expect(p.y, id).toBeCloseTo(points[0].y, 6);
      expect(p.z, id).toBeCloseTo(points[0].z + slots[id].dz, 6);
      expect(g.scale.x, id).toBeCloseTo(slots[id].scale, 6);
    }
    expect(one(r, 'board-set').visible).toBe(true);
    expect(one(r, 'podium').visible).toBe(false);
    snapshot(r, ['a', 'b', 'c', 'd']).forEach((o, i) => expect(o).toBe(before[i]));
    expect(named(r, 'turn-ring')).toHaveLength(1);
  });

  it('frames the podium with fitCamera(podium extents) and the board again afterwards', async () => {
    const aspect = SIZE.width / SIZE.height;
    const r = await mount(scene(null));
    await frames(r, 1);
    const board = fitCamera(aspect, boardExtents(ringLayout(20))).position;
    probe!.camera.position.toArray().forEach((v, i) => expect(v).toBeCloseTo(board[i], 9));
    await update(r, scene(cer(['a', 'b'])));
    await frames(r, 1);
    const pod = fitCamera(aspect, podiumLayout(['a', 'b'], ['c', 'd']).extents).position;
    probe!.camera.position.toArray().forEach((v, i) => expect(v).toBeCloseTo(pod[i], 9));
    await update(r, scene(null));
    await frames(r, 1);
    probe!.camera.position.toArray().forEach((v, i) => expect(v).toBeCloseTo(board[i], 9));
  });
});

describe('ceremony draw budget (D-06, D-23)', () => {
  const animals = ['bear', 'rabbit', 'cat', 'dog', 'panda', 'fox', 'pig', 'chick'] as const;
  const eight = animals.map((animal, i) => ({ id: `p${i + 1}`, animal }));
  const ids = eight.map((p) => p.id);
  const allOn = (v: number) => Object.fromEntries(ids.map((id) => [id, v]));
  const countDraws = (r: Renderer) => {
    let n = 0;
    r.scene.children.forEach((c) =>
      (c.instance as Object3D).traverse((o) => {
        if (o instanceof Mesh) n++;
      }),
    );
    return n;
  };
  const visibleDraws = (r: Renderer) => {
    let n = 0;
    r.scene.children.forEach((c) =>
      (c.instance as Object3D).traverseVisible((o) => {
        if (o instanceof InstancedMesh ? o.count > 0 : o instanceof Mesh) n++;
      }),
    );
    return n;
  };

  it.each([[ids], [ids.slice(0, 1)], [ids.slice(0, 4)]])('8 participants, winners %j: total ≤ 100, visible ≤ 70', async (winners) => {
    usePresentation.getState().reset({ positions: allOn(0), stars: allOn(1) }, null);
    const r = await mount(scene(cer(winners, 1, true), eight));
    let peak = 0;
    for (let k = 0; k < 40; k++) {
      await frames(r, 1);
      peak = Math.max(peak, visibleDraws(r));
      expect(countDraws(r)).toBeLessThanOrEqual(100);
    }
    expect(peak).toBeLessThanOrEqual(70);
  });
});

describe('GameCanvas keeps its ContactShadows mounted (Pattern 6)', () => {
  it('wraps ContactShadows in a group whose visibility follows the ceremony flag', () => {
    const src = gameCanvasSource;
    const at = src.indexOf('<ContactShadows');
    expect(at).toBeGreaterThan(0);
    const open = src.lastIndexOf('<group visible={!scene.ceremony}>', at);
    expect(open).toBeGreaterThan(0);
    expect(src.indexOf('</group>', at)).toBeGreaterThan(at);
    // No conditional rendering around it.
    expect(src).not.toMatch(/(ceremony|show\w*)\s*(&&|\?)\s*\(?\s*<ContactShadows/);
  });
});
