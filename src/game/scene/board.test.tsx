// @vitest-environment node
// src/game/scene/board.test.tsx — structure of the static 3D ring board (BOARD-01..03, D-07, D-11..D-15, D-28).
// Runs in node with @react-three/test-renderer (no WebGL, RESEARCH Pitfall 1/3). Nodes are found by
// three object name; InstancedMesh `count` and `getColorAt` are read straight from the instance.
import { describe, it, expect, vi, afterEach } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Color, InstancedMesh, type Object3D } from 'three';
import Board from './Board';
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
