// @vitest-environment node
// src/game/scene/faceOcclusion.test.tsx — no character's face is more than 30 % hidden, with 1-8
// characters on one tile or split over two adjacent tiles (BOARD-05, ROADMAP SC4, D-17, D-17a(4),
// D-17b(4), 07-VERIFICATION gap 1, 07-REVIEW CR-01).
// This is the final criterion for the slot tables. slotOcclusion.test.ts stays as the cheap D-19
// check (head discs only); it cannot see the start gate, the ears, the crowns or the stars, which is
// how the 07-05 tables passed it while the arch hid back-row faces at the start of every game.
// Here the real SceneContents is mounted (real StartGate, real chibi meshes with ears and crowns,
// real floating stars) and rays go from the real fitCamera camera position to the camera-facing
// vertices of each character's chibi-face mesh. A sample is hidden when anything outside that
// character's own pawn group is hit first.
// Matrix: 6 views × 16/20/24 tiles × the start tile and 7 regular tiles (the middle of each side and
// the 3 non-start corners) × n 1-8 × 2 casts — `roster` (the first n
// animals; bear is the current turn, rabbit next) and `rabbits` (n rabbits: the longest ears in every
// slot). Everyone holds 1 star, so everyone is a crowned leader (crowns only add occluders, so this
// covers the no-crown states too), and every quest tile is hard (the widest 3-star row).
// Pairs: two adjacent tiles at once (CROSS_PAIRS) with the splits in SPLITS, p0 on the first tile,
// so a neighbor's crowd and its lifted or hidden star row are in the scene too.
// Exact y-prune: the camera is above every face, so a camera→sample segment never dips below the
// sample; a mesh whose world box top is below the sample cannot hit it and is skipped (that drops
// the board slabs and tiles, which keeps the file fast).
// Reduced motion is mocked on: every character holds REST, the ring is still and Board snaps its
// star lift / hide on the first frame.
import { describe, it, expect, vi, afterEach } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Box3, Matrix3, Raycaster, Vector3, type InstancedMesh, type Mesh, type Object3D } from 'three';
import { SceneContents } from './SceneContents';
import { usePresentation } from '../usePresentation';
import { EMPTY_DISPLAYED } from '../director/displayed';
import { fitCamera } from '../layout/fitCamera';
import { slotTable, tileShape } from '../layout/pawnSlots';
import { boardExtents, ringLayout, tileCenter } from '../layout/ringLayout';
import { boardWith, questTile } from '../../engine/testkit';
import { ANIMALS, type AnimalId } from '../../engine/animals';

vi.mock('../reducedMotion', () => ({ prefersReducedMotion: () => true }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

// The same canvas cells as slotOcclusion.test.ts: phone portrait / landscape cells, phone, tablet, desktop.
const VIEWS = [
  [374, 594],
  [390, 844],
  [588, 290],
  [844, 390],
  [728, 726],
  [728, 644],
] as const;
const SIZES = [16, 20, 24] as const;
const COUNTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const SAMPLES = 24; // face vertices per (face, view)
const MIN_SAMPLES = 12; // a face measured with fewer camera-facing vertices fails
const LIMIT = 0.3;
const CASTS = ['roster', 'rabbits'] as const;
type Cast = (typeof CASTS)[number];

// The middle of the bottom, left, top and right sides, then the three non-start corners (ringLayout:
// index 0 is the bottom-right corner, the ring runs along the bottom edge first).
const REGULAR_TILES = (L: number) => {
  const m = Math.floor(L / 8);
  return [m, L / 4 + m, L / 2 + m, (3 * L) / 4 + m, L / 4, L / 2, (3 * L) / 4];
};

// Adjacent pairs: the middle of the left side (the first tile is the front one), of the right side
// (the first is the back one) and of the top side, the top-left corner after the left-side tile in
// front of it, and the last tile behind the start block (its gate and crowd stand in front).
const CROSS_PAIRS = (L: number): [number, number][] => {
  const s = L / 4;
  const m = Math.floor(L / 8);
  return [
    [s + m, s + m + 1],
    [3 * s + m, 3 * s + m + 1],
    [2 * s + m, 2 * s + m + 1],
    [2 * s - 1, 2 * s],
    [L - 1, 0],
  ];
};
const SPLITS = [
  [1, 1],
  [3, 2],
  [2, 3],
  [4, 4],
  [1, 7],
  [7, 1],
] as const;

const hardBoard = (L: number) =>
  boardWith(L, Object.fromEntries(Array.from({ length: L - 1 }, (_, i) => [i + 1, questTile('hard')])));

const castOf = (cast: Cast, n: number): { id: string; animal: AnimalId }[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, animal: cast === 'rabbits' ? 'rabbit' : ANIMALS[i] }));

interface Occluder {
  mesh: Mesh;
  top: number; // world bounding-box top
}

interface Mounted {
  r: Renderer;
  root: Object3D;
  owner: Map<Object3D, string>; // object → the pid of the pawn group it belongs to
}

interface FaceRecord {
  label: string; // kind / L / tile / cast / n / slot / view
  hidden: number; // fraction of samples hidden
  samples: number;
  by: string; // first-hit names: owner pid + mesh name
}

let open: Renderer[] = [];
afterEach(async () => {
  for (const r of open) await r.unmount();
  open = [];
  usePresentation.getState().reset(EMPTY_DISPLAYED, null);
});

async function mountTile(L: number, tile: number, cast: Cast, n: number): Promise<Mounted> {
  return mountTiles(L, [[tile, n]], cast);
}

// Several tiles at once: groups [tile, count] in participant order, so p0 (the current turn) stands
// on the first tile. The roster cast keeps counting through the groups (8 participants = 8 animals).
async function mountTiles(L: number, groups: readonly (readonly [number, number])[], cast: Cast): Promise<Mounted> {
  const parts = castOf(cast, groups.reduce((a, [, c]) => a + c, 0));
  const tileOf = groups.flatMap(([tile, c]) => Array.from({ length: c }, () => tile));
  usePresentation.getState().reset(
    {
      positions: Object.fromEntries(parts.map((p, i) => [p.id, tileOf[i]])),
      stars: Object.fromEntries(parts.map((p) => [p.id, 1])),
    },
    null,
  );
  const r = await ReactThreeTestRenderer.create(
    <SceneContents tiles={hardBoard(L)} participants={parts} currentId="p0" restFace={null} />,
  );
  open.push(r);
  await ReactThreeTestRenderer.act(async () => {
    await r.advanceFrames(2, 0.05);
  });
  let root = r.scene.instance as Object3D;
  while (root.parent) root = root.parent;
  // By pid, not by a `pawn-` prefix: ChibiModel's inner body group is named `pawn-body`.
  const owner = new Map<Object3D, string>();
  for (const p of parts) root.getObjectByName(`pawn-${p.id}`)!.traverse((x) => owner.set(x, p.id));
  return { r, root, owner };
}

async function unmount(m: Mounted): Promise<void> {
  await m.r.unmount();
  open = open.filter((r) => r !== m.r);
}

const shown = (o: Object3D | null): boolean => !o || (o.visible && shown(o.parent));

const box = new Box3();

// Every visible mesh outside pid's pawn group, highest box top first. World matrices are only
// refreshed by a render, which the test renderer never does, so refresh them (and the instanced
// bounds, which follow the current instance matrices) before each measurement.
function occluders(m: Mounted, pid: string): Occluder[] {
  m.root.updateMatrixWorld(true);
  const out: Occluder[] = [];
  m.root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh || !shown(o) || m.owner.get(o) === pid) return;
    const inst = o as InstancedMesh;
    if (inst.isInstancedMesh) {
      inst.computeBoundingBox();
      inst.computeBoundingSphere();
      box.copy(inst.boundingBox!);
    } else {
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      box.copy(mesh.geometry.boundingBox!);
    }
    out.push({ mesh, top: box.applyMatrix4(mesh.matrixWorld).max.y });
  });
  return out.sort((a, b) => b.top - a.top);
}

function faceOf(m: Mounted, pid: string): Mesh {
  let face: Mesh | null = null;
  m.root.traverse((o) => {
    if (o.name === 'chibi-face' && m.owner.get(o) === pid) face = o as Mesh;
  });
  expect(face, `chibi-face of ${pid}`).not.toBeNull();
  return face!;
}

const ray = new Raycaster();

// Hidden fraction of pid's face per view, from the board's camera positions.
function measureFace(m: Mounted, pid: string, L: number): { view: string; hidden: number; samples: number; by: string }[] {
  const occ = occluders(m, pid);
  const face = faceOf(m, pid);
  const pos = face.geometry.attributes.position;
  const nor = face.geometry.attributes.normal;
  const nm = new Matrix3().getNormalMatrix(face.matrixWorld);
  const ext = boardExtents(ringLayout(L));
  return VIEWS.map(([w, h]) => {
    const cam = new Vector3(...fitCamera(w / h, ext).position);
    const front: Vector3[] = [];
    for (let i = 0; i < pos.count; i++) {
      const v = new Vector3().fromBufferAttribute(pos, i).applyMatrix4(face.matrixWorld);
      const n = new Vector3().fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      if (n.dot(cam.clone().sub(v).normalize()) > 0.05) front.push(v);
    }
    const step = Math.max(1, Math.floor(front.length / SAMPLES));
    let samples = 0;
    let hidden = 0;
    const by: Record<string, number> = {};
    for (let i = 0; i < front.length && samples < SAMPLES; i += step) {
      const v = front[i];
      let k = 0;
      while (k < occ.length && occ[k].top >= v.y) k++;
      const d = v.clone().sub(cam);
      ray.set(cam, d.clone().normalize());
      ray.far = d.length() - 0.002;
      const hits = ray.intersectObjects(
        occ.slice(0, k).map((o) => o.mesh),
        false,
      );
      samples++;
      if (hits.length > 0) {
        hidden++;
        const o = hits[0].object;
        const who = m.owner.get(o);
        const name = `${who ? `${who}:` : ''}${o.name}`;
        by[name] = (by[name] ?? 0) + 1;
      }
    }
    const names = Object.entries(by)
      .map(([k, c]) => `${k}×${c}`)
      .join(' ');
    return { view: `${w}x${h}`, hidden: samples > 0 ? hidden / samples : 1, samples, by: names };
  });
}

// One mount per (L, tile, cast, n): every face of that tile in every view.
async function measureTile(L: number, tile: number, cast: Cast, n: number): Promise<FaceRecord[]> {
  const kind = tile === 0 ? 'start' : 'regular';
  return measureTiles(L, [[tile, n]], cast, `${kind} L${L} t${tile} ${cast} n${n}`);
}

async function measureTiles(
  L: number,
  groups: readonly (readonly [number, number])[],
  cast: Cast,
  label: string,
): Promise<FaceRecord[]> {
  const m = await mountTiles(L, groups, cast);
  const n = groups.reduce((a, [, c]) => a + c, 0);
  const out: FaceRecord[] = [];
  for (let k = 0; k < n; k++) {
    for (const f of measureFace(m, `p${k}`, L)) {
      out.push({ label: `${label} slot ${k} ${f.view}`, hidden: f.hidden, samples: f.samples, by: f.by });
    }
  }
  await unmount(m);
  return out;
}

function expectClean(records: FaceRecord[], expected: number): void {
  const over = records
    .filter((x) => x.hidden > LIMIT)
    .map((x) => `${x.label} ${(x.hidden * 100).toFixed(0)}% [${x.by}]`);
  expect(over, over.join('\n')).toEqual([]);
  expect(records).toHaveLength(expected);
  const thin = records.filter((x) => x.samples < MIN_SAMPLES).map((x) => `${x.label}: ${x.samples}`);
  expect(thin, thin.join('\n')).toEqual([]);
  const worst = records.reduce((a, b) => (b.hidden > a.hidden ? b : a));
  console.info(`worst face ${(worst.hidden * 100).toFixed(1)}%: ${worst.label} [${worst.by}]`);
}

// Positive control: a character moved behind an occluder must read as hidden, so a harness that
// never hits anything fails. The ground group is moved after mount and measured without frames,
// because Character would ease it back to its slot.
async function controlCover(L: number, tile: number, dx: number, dz: number): Promise<number> {
  const m = await mountTile(L, tile, 'roster', 2);
  const c = tileCenter(ringLayout(L), tile);
  const g = m.root.getObjectByName('pawn-p1')!;
  g.position.set(c.x + dx, g.position.y, c.z + dz);
  g.scale.setScalar(0.65);
  const cover = Math.max(...measureFace(m, 'p1', L).map((f) => f.hidden));
  await unmount(m);
  return cover;
}

describe('face occlusion — start tile (D-17a(4))', () => {
  for (const L of SIZES) {
    it(`${L} tiles: no face over 30 % with 1-8 characters, 2 casts, 6 views`, async () => {
      const records: FaceRecord[] = [];
      for (const cast of CASTS) for (const n of COUNTS) records.push(...(await measureTile(L, 0, cast, n)));
      expectClean(records, 432);
    }, 60_000);
  }

  it('control: a 0.65 character behind the arch reads as hidden', async () => {
    expect(await controlCover(16, 0, 0.35, -0.45)).toBeGreaterThanOrEqual(0.9);
  });
});

describe('face occlusion — regular tiles (D-17a(4))', () => {
  it('picks the side middles and the non-start corners', () => {
    expect(REGULAR_TILES(16)).toEqual([2, 6, 10, 14, 4, 8, 12]);
    expect(REGULAR_TILES(20)).toEqual([2, 7, 12, 17, 5, 10, 15]);
    expect(REGULAR_TILES(24)).toEqual([3, 9, 15, 21, 6, 12, 18]);
  });

  for (const L of SIZES) {
    it(`${L} tiles: no face over 30 % on 7 tiles with 1-8 characters, 2 casts, 6 views`, async () => {
      const records: FaceRecord[] = [];
      for (const tile of REGULAR_TILES(L)) {
        for (const cast of CASTS) for (const n of COUNTS) records.push(...(await measureTile(L, tile, cast, n)));
      }
      expectClean(records, 3024);
    }, 60_000);
  }

  it('control: a 0.65 character straight behind the full-size current reads as hidden', async () => {
    const [, front] = slotTable(2, tileShape(16, 2).shape).slots[0];
    expect(await controlCover(16, 2, 0, front - 0.3)).toBeGreaterThanOrEqual(0.9);
  });
});

describe('face occlusion — two adjacent tiles (D-17b(4))', () => {
  it('picks the left, right and top side middles, the top-left corner and the tile before start', () => {
    expect(CROSS_PAIRS(16)).toEqual([
      [6, 7],
      [14, 15],
      [10, 11],
      [7, 8],
      [15, 0],
    ]);
  });

  for (const L of SIZES) {
    it(`${L} tiles: no face over 30 % on 5 pairs, splits 1+1 3+2 2+3 4+4 1+7 7+1, 2 casts, 6 views`, async () => {
      const records: FaceRecord[] = [];
      for (const [a, b] of CROSS_PAIRS(L)) {
        for (const cast of CASTS) {
          for (const [na, nb] of SPLITS) {
            records.push(...(await measureTiles(L, [[a, na], [b, nb]], cast, `pair L${L} t${a}+t${b} ${cast} ${na}+${nb}`)));
          }
        }
      }
      expectClean(records, 2160);
    }, 60_000);
  }
});
