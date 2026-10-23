// @vitest-environment node
// src/game/scene/board.test.tsx — structure of the static 3D ring board (BOARD-01..03, D-07, D-11..D-15, D-28).
// Runs in node with @react-three/test-renderer (no WebGL, RESEARCH Pitfall 1/3). Nodes are found by
// three object name; InstancedMesh `count` and `getColorAt` are read straight from the instance.
import { describe, it, expect, vi, afterEach } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Color, InstancedMesh, Matrix4, PerspectiveCamera, Quaternion, Vector3, type Object3D } from 'three';
import { useThree } from '@react-three/fiber';
import Board from './Board';
import CameraRig from './CameraRig';
import { boardExtents, gapPoint, ringLayout, tileTop, type RingLayout } from '../layout/ringLayout';
import { fitCamera } from '../layout/fitCamera';
import { GEO } from './geometries';
import { DIFF_COLOR } from '../palette';
import { boardWith, eventTile, questTile } from '../../engine/testkit';
import { starsFor } from '../../engine/scoring';
import type { Tile } from '../../engine/board';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

const named = (r: Renderer, name: string): Object3D[] =>
  r.scene.findAll((n) => (n.instance as Object3D | undefined)?.name === name).map((n) => n.instance as Object3D);

const one = (r: Renderer, name: string): Object3D => {
  const found = named(r, name);
  expect(found, name).toHaveLength(1);
  return found[0];
};

const inst = (r: Renderer, name: string): InstancedMesh => {
  const o = one(r, name);
  expect(o).toBeInstanceOf(InstancedMesh);
  return o as InstancedMesh;
};

// 20-tile board with one of each event effect and one hard + one normal quest (others easy).
const mixed20 = (): Tile[] =>
  boardWith(20, {
    2: eventTile('forward', 3),
    5: eventTile('backward', 2),
    9: eventTile('extra', 0),
    3: questTile('hard'),
    4: questTile('normal'),
  });

const mixedOf = (n: number): Tile[] =>
  boardWith(n, {
    2: eventTile('forward', 3),
    5: eventTile('backward', 2),
    9: eventTile('extra', 0),
    3: questTile('hard'),
    4: questTile('normal'),
  });

const totalStars = (tiles: readonly Tile[]) =>
  tiles.reduce((s, t) => s + (t.kind === 'quest' ? starsFor(t.diff) : 0), 0);

let open: Renderer[] = [];
async function render(tiles: readonly Tile[]): Promise<Renderer> {
  const r = await ReactThreeTestRenderer.create(<Board tiles={tiles} />);
  open.push(r);
  return r;
}

afterEach(async () => {
  for (const r of open) await r.unmount();
  open = [];
  vi.restoreAllMocks();
});

describe('Board — tiles, stars, start (Task 1)', () => {
  it('draws the 20-tile mixed board with the right instance counts', async () => {
    const r = await render(mixed20());
    expect(inst(r, 'quest-tiles').count).toBe(16);
    expect(inst(r, 'event-pads').count).toBe(3);
    expect(inst(r, 'event-pad-tops').count).toBe(3);
    one(r, 'start-tile');
    one(r, 'start-gate');
    expect(inst(r, 'tile-stars').count).toBe(19); // 14 easy + 3 + 2
    one(r, 'board-base');
    one(r, 'board-track');
    one(r, 'board-yard');
  });

  it.each([16, 24])('keeps the counts right on a %i-tile board', async (n) => {
    const tiles = mixedOf(n);
    const r = await render(tiles);
    const quests = tiles.filter((t) => t.kind === 'quest').length;
    expect(inst(r, 'quest-tiles').count).toBe(quests);
    expect(inst(r, 'event-pads').count).toBe(3);
    expect(inst(r, 'event-pad-tops').count).toBe(3);
    expect(inst(r, 'tile-stars').count).toBe(totalStars(tiles));
    one(r, 'start-tile');
    one(r, 'start-gate');
  });

  it('colors quest tiles by difficulty (DIFF_COLOR)', async () => {
    const tiles = mixed20();
    const r = await render(tiles);
    const mesh = inst(r, 'quest-tiles');
    const questIdx = tiles.flatMap((t, i) => (t.kind === 'quest' ? [i] : []));
    const got = new Color();
    for (const [tileIndex, diff] of [
      [3, 'hard'],
      [4, 'normal'],
      [1, 'easy'],
    ] as const) {
      mesh.getColorAt(questIdx.indexOf(tileIndex), got);
      const want = new Color(DIFF_COLOR[diff]);
      expect(got.r).toBeCloseTo(want.r, 4);
      expect(got.g).toBeCloseTo(want.g, 4);
      expect(got.b).toBeCloseTo(want.b, 4);
    }
  });

  it('keeps every InstancedMesh capacity fixed across board sizes (only count changes)', async () => {
    for (const n of [16, 20, 24]) {
      const r = await render(mixedOf(n));
      expect(inst(r, 'quest-tiles').instanceMatrix.count).toBe(24);
      expect(inst(r, 'event-pads').instanceMatrix.count).toBe(24);
      expect(inst(r, 'event-pad-tops').instanceMatrix.count).toBe(24);
      expect(inst(r, 'tile-stars').instanceMatrix.count).toBe(72);
    }
  });

  it('never disposes the shared module geometry (Pitfall 9)', async () => {
    const spy = vi.spyOn(GEO.tile, 'dispose');
    const uuid = GEO.tile.uuid;
    const r = await ReactThreeTestRenderer.create(<Board tiles={mixed20()} />);
    await r.unmount();
    expect(spy).not.toHaveBeenCalled();
    const r2 = await render(mixed20());
    expect(inst(r2, 'quest-tiles').geometry.uuid).toBe(uuid);
    expect(GEO.tile.uuid).toBe(uuid);
  });
});

// Decompose instance k of a mesh into position + the world direction its local +Z points to.
function pose(mesh: InstancedMesh, k: number) {
  const m = new Matrix4();
  mesh.getMatrixAt(k, m);
  const pos = new Vector3();
  const q = new Quaternion();
  const sc = new Vector3();
  m.decompose(pos, q, sc);
  return { pos, dir: new Vector3(0, 0, 1).applyQuaternion(q), scale: sc };
}
const headingDir = (h: number) => new Vector3(Math.sin(h), 0, Math.cos(h));

describe('Arrows and event icons (Task 2)', () => {
  it.each([16, 20, 24])('draws n + 1 chevrons with outlines and 4 corner arrows on %i tiles', async (n) => {
    const r = await render(mixedOf(n));
    expect(inst(r, 'arrows').count).toBe(n + 1);
    expect(inst(r, 'arrow-outlines').count).toBe(n + 1);
    expect(inst(r, 'corner-arcs').count).toBe(4);
    expect(inst(r, 'corner-heads').count).toBe(4);
    expect(inst(r, 'corner-outlines').count).toBe(4);
  });

  it('puts chevron i in the middle of gap i, pointing to the next tile; the start gap holds a 1.3× "»"', async () => {
    const n = 20;
    const l = ringLayout(n);
    const r = await render(mixedOf(n));
    const arrows = inst(r, 'arrows');
    const y = tileTop('quest') + 0.02;
    for (let i = 1; i < n; i++) {
      const { pos, dir } = pose(arrows, i);
      const g = gapPoint(l, i);
      expect(pos.x).toBeCloseTo(g.x, 5);
      expect(pos.z).toBeCloseTo(g.z, 5);
      expect(pos.y).toBeCloseTo(y, 5);
      expect(dir.distanceTo(headingDir(l.heading[i]))).toBeLessThan(1e-5);
    }
    // gap 0: instance 0 and instance n, both scaled 1.3, straddling gapPoint(0) along the heading
    const a = pose(arrows, 0);
    const b = pose(arrows, n);
    const g0 = gapPoint(l, 0);
    expect(a.scale.x).toBeCloseTo(1.3, 5);
    expect(b.scale.x).toBeCloseTo(1.3, 5);
    expect((a.pos.x + b.pos.x) / 2).toBeCloseTo(g0.x, 5);
    expect((a.pos.z + b.pos.z) / 2).toBeCloseTo(g0.z, 5);
    expect(a.pos.distanceTo(b.pos)).toBeGreaterThan(0.1);
    expect(a.dir.distanceTo(headingDir(l.heading[0]))).toBeLessThan(1e-5);
  });

  it('draws one icon per event tile: forward along travel, backward against it, extra as a loop', async () => {
    const n = 20;
    const l = ringLayout(n);
    const r = await render(
      boardWith(n, {
        2: eventTile('forward', 3),
        7: eventTile('forward', 1),
        5: eventTile('backward', 2),
        9: eventTile('extra', 0),
      }),
    );
    const fwd = inst(r, 'icon-forward');
    const back = inst(r, 'icon-backward');
    expect(fwd.count).toBe(2);
    expect(back.count).toBe(1);
    expect(inst(r, 'icon-loop-arcs').count).toBe(1);
    expect(inst(r, 'icon-loop-heads').count).toBe(1);
    expect(pose(fwd, 0).dir.distanceTo(headingDir(l.heading[2]))).toBeLessThan(1e-5);
    expect(pose(fwd, 1).dir.distanceTo(headingDir(l.heading[7]))).toBeLessThan(1e-5);
    expect(pose(back, 0).dir.distanceTo(headingDir(l.heading[5] + Math.PI))).toBeLessThan(1e-5);
  });

  it('renders the whole static 24-tile board within 30 draw calls (D-28)', async () => {
    const r = await render(mixedOf(24));
    const meshes = r.scene.findAll((n) => (n.instance as { isMesh?: boolean } | undefined)?.isMesh === true);
    expect(meshes.length).toBeGreaterThan(10);
    expect(meshes.length).toBeLessThanOrEqual(30);
  });
});

// Captures the R3F camera and setSize so tests can resize the canvas.
let probe: { camera: PerspectiveCamera; setSize: (w: number, h: number) => void } | null = null;
function Probe() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const setSize = useThree((s) => s.setSize);
  probe = { camera, setSize };
  return null;
}

function expectBoardInView(camera: PerspectiveCamera, l: RingLayout, aspect: number) {
  const e = boardExtents(l);
  const cam = new PerspectiveCamera(camera.fov, aspect);
  cam.position.copy(camera.position);
  cam.quaternion.copy(camera.quaternion);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  for (const x of [-e.hx, e.hx])
    for (const z of [-e.hz, e.hz])
      for (const y of [0, e.h]) {
        const p = new Vector3(x, y, z).project(cam);
        expect(Math.abs(p.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(p.y)).toBeLessThanOrEqual(1);
      }
}

describe('CameraRig (Task 2)', () => {
  const sizes = [
    [390, 520],
    [520, 520],
    [844, 330],
  ] as const;

  for (const n of [16, 24]) {
    it.each(sizes)(`frames the whole ${n}-tile board on a %i×%i canvas`, async (w, h) => {
      const l = ringLayout(n);
      probe = null;
      const r = await ReactThreeTestRenderer.create(
        <>
          <CameraRig layout={l} />
          <Probe />
        </>,
        { width: w, height: h },
      );
      open.push(r);
      const cam = probe!.camera;
      expect(cam.position.x).toBeCloseTo(0, 6);
      expect(cam.position.y).toBeGreaterThan(0);
      expect(cam.position.z).toBeGreaterThan(0);
      expect(cam.fov).toBe(35);
      const fit = fitCamera(w / h, boardExtents(l));
      expect(cam.position.y).toBeCloseTo(fit.position[1], 5);
      expect(cam.position.z).toBeCloseTo(fit.position[2], 5);
      cam.updateMatrixWorld();
      expectBoardInView(cam, l, w / h);
    });
  }

  it('re-fits when the canvas size changes', async () => {
    const l = ringLayout(20);
    probe = null;
    const r = await ReactThreeTestRenderer.create(
      <>
        <CameraRig layout={l} />
        <Probe />
      </>,
      { width: 390, height: 520 },
    );
    open.push(r);
    const before = probe!.camera.position.clone();
    await ReactThreeTestRenderer.act(async () => {
      probe!.setSize(844, 330);
    });
    const fit = fitCamera(844 / 330, boardExtents(l));
    const cam = probe!.camera;
    expect(cam.position.y).toBeCloseTo(fit.position[1], 5);
    expect(cam.position.z).toBeCloseTo(fit.position[2], 5);
    expect(cam.position.distanceTo(before)).toBeGreaterThan(1e-3);
    expectBoardInView(cam, l, 844 / 330);
  });
});
