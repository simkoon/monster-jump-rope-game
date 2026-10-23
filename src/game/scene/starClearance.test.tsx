// @vitest-environment node
// src/game/scene/starClearance.test.tsx — the floating stars of a quest tile never overlap the
// character standing there (D-12a, 07-REVIEW WR-02, BOARD-05 / D-17a(4)). Mounts the real
// SceneContents (real Character and Board meshes) and checks every frame: a lone character's lifted
// stars clear its idle bounce and crown, they hide for its success jump and winner cheer, a tile
// with 2+ characters hides its stars, and a hopping character never meets the rows of the tiles it
// leaves, crosses or lands on (07-REVIEW WR-04). Reduced motion is mocked through a mutable flag.
import { describe, it, expect, vi, afterEach } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Box3, Matrix4, Vector3, type InstancedMesh, type Mesh, type Object3D } from 'three';
import { SceneContents } from './SceneContents';
import { usePresentation } from '../usePresentation';
import { EMPTY_DISPLAYED, type Displayed } from '../director/displayed';
import type { BeatSpec } from '../director/timeline';
import { GEO } from './geometries';
import { ringLayout, tileCenter, tileTop } from '../layout/ringLayout';
import { boardWith, questTile } from '../../engine/testkit';
import { starsFor } from '../../engine/scoring';
import type { AnimalId } from '../../engine/animals';

const rm = vi.hoisted(() => ({ reduced: false }));
vi.mock('../reducedMotion', () => ({ prefersReducedMotion: () => rm.reduced }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

const named = (r: Renderer, name: string): Object3D[] =>
  r.scene.findAll((n) => (n.instance as Object3D | undefined)?.name === name).map((n) => n.instance as Object3D);

const one = (r: Renderer, name: string): Object3D => {
  const found = named(r, name);
  expect(found, name).toHaveLength(1);
  return found[0];
};

// Quest tile 3 hard (3 stars), tile 5 normal; the rest easy.
const tiles = boardWith(20, { 3: questTile('hard'), 5: questTile('normal') });
const layout = ringLayout(tiles.length);
const DT = 1 / 60;
const MARGIN = 0.03;
const HIDDEN = 0.05; // a star instance at or below this scale is hidden
const Y_REST = tileTop('quest') + 0.55;
const Y_UP = tileTop('quest') + 1.35;

let open: Renderer[] = [];
afterEach(async () => {
  for (const r of open) await r.unmount();
  open = [];
  usePresentation.getState().reset(EMPTY_DISPLAYED, null);
  rm.reduced = false;
});

async function mountScene(
  cast: readonly { id: string; animal: AnimalId; tile: number; stars: number }[],
  currentId: string,
): Promise<Renderer> {
  usePresentation.getState().reset(
    {
      positions: Object.fromEntries(cast.map((c) => [c.id, c.tile])),
      stars: Object.fromEntries(cast.map((c) => [c.id, c.stars])),
    },
    null,
  );
  const r = await ReactThreeTestRenderer.create(
    <SceneContents tiles={tiles} participants={cast.map((c) => ({ id: c.id, animal: c.animal }))} currentId={currentId} restFace={null} />,
  );
  open.push(r);
  return r;
}

async function frames(r: Renderer, n: number): Promise<void> {
  await ReactThreeTestRenderer.act(async () => {
    await r.advanceFrames(n, DT);
  });
}

async function play(spec: BeatSpec): Promise<number> {
  await ReactThreeTestRenderer.act(async () => {
    usePresentation.getState().play([spec]);
  });
  return usePresentation.getState().current!.id;
}

// Ends the beat; with no engine game the drain resyncs `displayed` to empty, so put the cast back.
async function complete(id: number, back: Displayed): Promise<void> {
  await ReactThreeTestRenderer.act(async () => {
    usePresentation.getState().completeBeat(id);
    usePresentation.getState().reset(back, null);
  });
}

// World matrices are only refreshed by a render, which the test renderer never does.
function refresh(r: Renderer): void {
  let o = one(r, 'board');
  while (o.parent) o = o.parent;
  o.updateMatrixWorld(true);
}

const box = new Box3();
const bounds = (g: Mesh['geometry']): Box3 => {
  if (!g.boundingBox) g.computeBoundingBox();
  return g.boundingBox!;
};

// Character top: highest world point of its meshes, floor parts (ground disc, turn ring) excluded.
function charTop(r: Renderer, pid: string): number {
  refresh(r);
  let top = -Infinity;
  one(r, `pawn-${pid}`).traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh || o.name === 'chibi-ground' || o.name === 'turn-ring') return;
    top = Math.max(top, box.copy(bounds(m.geometry)).applyMatrix4(m.matrixWorld).max.y);
  });
  return top;
}

interface Star {
  y: number;
  scale: number;
  bottom: number;
  box: Box3; // world bounds
}

// The tile-stars instances of one tile (xz within 0.4 of its center), in world space.
function tileStars(r: Renderer, tile: number): Star[] {
  refresh(r);
  const mesh = one(r, 'tile-stars') as InstancedMesh;
  const c = tileCenter(layout, tile);
  const m = new Matrix4();
  const p = new Vector3();
  const out: Star[] = [];
  for (let k = 0; k < mesh.count; k++) {
    mesh.getMatrixAt(k, m);
    m.premultiply(mesh.matrixWorld);
    p.setFromMatrixPosition(m);
    if (Math.hypot(p.x - c.x, p.z - c.z) > 0.4) continue;
    // Column length, not decompose: decompose reports scale 1 for a fully hidden (0-scale) matrix.
    const scale = new Vector3().setFromMatrixColumn(m, 0).length();
    const b = new Box3().copy(bounds(GEO.star)).applyMatrix4(m);
    out.push({ y: p.y, scale, bottom: b.min.y, box: b });
  }
  return out;
}

const hidden = (st: Star) => st.scale <= HIDDEN;

function expectRow(stars: Star[], count: number, y: number, scale: number): void {
  expect(stars).toHaveLength(count);
  for (const st of stars) {
    expect(st.y).toBeCloseTo(y, 3);
    expect(st.scale).toBeCloseTo(scale, 3);
  }
}

// Every star of the tile is hidden or sits ≥ MARGIN above the character's top. Returns whether all
// of them were hidden on this frame.
function expectClear(r: Renderer, tile: number, pid: string, label: string): boolean {
  const top = charTop(r, pid);
  const stars = tileStars(r, tile);
  expect(stars).toHaveLength(starsFor('hard'));
  for (const st of stars) if (!hidden(st)) expect(st.bottom, label).toBeGreaterThanOrEqual(top + MARGIN);
  return stars.every(hidden);
}

// World bounds of each character mesh, floor parts (ground disc, turn ring) excluded.
function charBoxes(r: Renderer, pid: string): Box3[] {
  refresh(r);
  const out: Box3[] = [];
  one(r, `pawn-${pid}`).traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh || o.name === 'chibi-ground' || o.name === 'turn-ring') return;
    out.push(new Box3().copy(bounds(m.geometry)).applyMatrix4(m.matrixWorld).expandByScalar(MARGIN));
  });
  return out;
}

// Every shown star of the tile stays out of every mesh box of the character (a moving character
// may be anywhere around the row, so this compares boxes instead of heights).
function expectApart(r: Renderer, tile: number, pid: string, label: string): void {
  const parts = charBoxes(r, pid);
  for (const st of tileStars(r, tile)) {
    if (hidden(st)) continue;
    for (const b of parts) expect(st.box.intersectsBox(b), label).toBe(false);
  }
}

const LONE = [{ id: 'r', animal: 'rabbit' as const, tile: 3, stars: 1 }]; // crowned leader, current
const LONE_SHOWN: Displayed = { positions: { r: 3 }, stars: { r: 1 } };

describe('star clearance (D-12a, WR-02)', () => {
  it('lifts a lone character’s stars above its idle bounce and crown on every frame', async () => {
    const r = await mountScene(LONE, 'r');
    await frames(r, 60);
    one(r, 'crown');
    for (let f = 0; f < 120; f++) {
      await frames(r, 1);
      const top = charTop(r, 'r');
      const stars = tileStars(r, 3);
      expectRow(stars, 3, Y_UP, 0.75);
      for (const st of stars) expect(st.bottom, `frame ${f}`).toBeGreaterThanOrEqual(top + MARGIN);
    }
  });

  it('hides the stars for the success jump (stars beat), then brings them back', async () => {
    const r = await mountScene(LONE, 'r');
    await frames(r, 60);
    const id = await play({ kind: 'stars', pid: 'r', stars: 1, ms: 900 });
    let allHidden = 0;
    for (let f = 0; f < 66; f++) {
      await frames(r, 1);
      if (expectClear(r, 3, 'r', `stars frame ${f}`)) allHidden++;
    }
    expect(allHidden).toBeGreaterThan(0);
    await complete(id, LONE_SHOWN);
    await frames(r, 30);
    expectRow(tileStars(r, 3), 3, Y_UP, 0.75);
  });

  it('hides the stars for the winner cheer (win beat), then brings them back', async () => {
    const r = await mountScene(LONE, 'r');
    await frames(r, 60);
    const id = await play({ kind: 'win', winners: ['r'], animals: ['rabbit'], ms: 1500 });
    let allHidden = 0;
    for (let f = 0; f < 96; f++) {
      await frames(r, 1);
      if (expectClear(r, 3, 'r', `win frame ${f}`)) allHidden++;
    }
    expect(allHidden).toBeGreaterThan(0);
    await complete(id, LONE_SHOWN);
    await frames(r, 30);
    expectRow(tileStars(r, 3), 3, Y_UP, 0.75);
  });

  // A long miss beat after each hop keeps the queue from draining (which would resync `displayed`
  // to the empty engine state) while the landing is checked.
  const HOLD = { kind: 'miss', pid: 'r', ms: 60_000 } as const;

  it('hides the rows of the departure tile and every crossed tile while a character hops (WR-04)', async () => {
    const r = await mountScene([{ id: 'r', animal: 'rabbit', tile: 2, stars: 1 }], 'r');
    await frames(r, 60);
    await ReactThreeTestRenderer.act(async () => {
      usePresentation.getState().play([{ kind: 'hop', pid: 'r', path: [3, 4], by: 'dice', ms: 500 }, HOLD]);
    });
    let crossedHidden = 0;
    for (let f = 0; f < 30; f++) {
      await frames(r, 1);
      for (const tile of [2, 3, 4]) expectApart(r, tile, 'r', `hop frame ${f}, tile ${tile}`);
      if (tileStars(r, 3).every(hidden)) crossedHidden++;
    }
    expect(usePresentation.getState().current?.kind).toBe('miss');
    expect(crossedHidden).toBeGreaterThan(0);
    // The crossed hard row comes back at its resting height once the character has passed.
    await frames(r, 30);
    expectRow(tileStars(r, 3), 3, Y_REST, 1);
  });

  it('lands under an already lifted row: the landing tile never meets the character (WR-04)', async () => {
    const r = await mountScene([{ id: 'r', animal: 'rabbit', tile: 1, stars: 1 }], 'r');
    await frames(r, 60);
    await ReactThreeTestRenderer.act(async () => {
      usePresentation.getState().play([{ kind: 'hop', pid: 'r', path: [2, 3], by: 'dice', ms: 500 }, HOLD]);
    });
    for (let f = 0; f < 60; f++) {
      await frames(r, 1);
      expectApart(r, 3, 'r', `landing frame ${f}`);
    }
    expect(usePresentation.getState().displayed.positions.r).toBe(3);
    expectRow(tileStars(r, 3), 3, Y_UP, 0.75);
  });

  it('hides the stars of a tile with 2 characters and shows them again when one leaves (BOARD-05)', async () => {
    const r = await mountScene(
      [
        { id: 'r', animal: 'rabbit', tile: 3, stars: 1 },
        { id: 'b', animal: 'bear', tile: 3, stars: 0 },
      ],
      'r',
    );
    await frames(r, 42);
    const crowd = tileStars(r, 3);
    expect(crowd).toHaveLength(3);
    expect(crowd.every(hidden)).toBe(true);
    expectRow(tileStars(r, 5), starsFor('normal'), Y_REST, 1);

    await ReactThreeTestRenderer.act(async () => {
      usePresentation.getState().reset({ positions: { r: 3, b: 5 }, stars: { r: 1, b: 0 } }, null);
    });
    await frames(r, 60);
    expectRow(tileStars(r, 3), 3, Y_UP, 0.75);
    expectRow(tileStars(r, 5), starsFor('normal'), Y_UP, 0.75);
  });

  it('keeps the star count, the capacity and the board draw calls with occupied and crowded tiles', async () => {
    const r = await mountScene(
      [
        { id: 'r', animal: 'rabbit', tile: 3, stars: 1 },
        { id: 'b', animal: 'bear', tile: 3, stars: 0 },
        { id: 'c', animal: 'chick', tile: 5, stars: 0 },
      ],
      'r',
    );
    await frames(r, 42);
    const mesh = one(r, 'tile-stars') as InstancedMesh;
    const total = tiles.reduce((n, t) => n + (t.kind === 'quest' ? starsFor(t.diff) : 0), 0);
    expect(mesh.count).toBe(total);
    expect(mesh.instanceMatrix.count).toBe(72);
    const boardMeshes = r.scene.findAll((n) => {
      let o = n.instance as Object3D | null;
      if (!(o as { isMesh?: boolean } | null)?.isMesh) return false;
      while (o && o.name !== 'board') o = o.parent;
      return o !== null;
    });
    expect(boardMeshes.length).toBeLessThanOrEqual(30);
  });
});

describe('star clearance under reduced motion (D-16)', () => {
  it('snaps the lift, and keeps the stars over REST through a stars beat', async () => {
    rm.reduced = true;
    const r = await mountScene(LONE, 'r');
    await frames(r, 1);
    expectRow(tileStars(r, 3), 3, Y_UP, 0.75);
    await play({ kind: 'stars', pid: 'r', stars: 1, ms: 900 });
    for (let f = 0; f < 66; f++) {
      await frames(r, 1);
      const top = charTop(r, 'r');
      for (const st of tileStars(r, 3)) {
        expect(hidden(st), `reduced frame ${f}`).toBe(false);
        expect(st.bottom, `reduced frame ${f}`).toBeGreaterThanOrEqual(top + MARGIN);
      }
    }
  });

  it('hides a crowded tile’s stars on the first frame', async () => {
    rm.reduced = true;
    const r = await mountScene(
      [
        { id: 'r', animal: 'rabbit', tile: 3, stars: 1 },
        { id: 'b', animal: 'bear', tile: 3, stars: 0 },
      ],
      'r',
    );
    await frames(r, 1);
    expect(tileStars(r, 3).every(hidden)).toBe(true);
  });
});
