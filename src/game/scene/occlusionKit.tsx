// src/game/scene/occlusionKit.tsx — shared harness of the face occlusion tests (BOARD-05, ROADMAP SC4,
// D-17a(4), D-17b(4)). Test-only: imported by faceOcclusion.test.tsx and faceOrders.*.test.tsx, never
// by the app.
// It mounts the real SceneContents (real StartGate, real chibi meshes with ears and crowns, real
// floating stars) and casts rays from the real fitCamera camera position to the camera-facing
// vertices of a character's chibi-face mesh. A sample is hidden when anything outside that
// character's own pawn group lies on the ray. Everyone holds 1 star, so everyone is a crowned leader
// (crowns only add occluders, so this covers the no-crown states too), and every quest tile is hard
// (the widest 3-star row).
// Exact y-prune: the camera is above every face, so a camera→sample segment never dips below the
// sample; a mesh whose world box top is below the sample cannot hit it and is skipped (that drops
// the board slabs and tiles, which keeps the files fast).
// Animal orders (07-VERIFICATION, SC4): `sweepOrders` measures every slot against every animal in
// every other slot from 8 rotated casts, then takes for each face the worst of all distinct animal
// orders, so no player pick can pass under the limit unseen.
// The test files mock reduced motion on: every character holds REST, the ring is still and Board
// snaps its star lift / hide on the first frame.
import { expect } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Box3, Matrix3, Mesh, Ray, Raycaster, Sphere, Vector3, type InstancedMesh, type Object3D } from 'three';
import { SceneContents } from './SceneContents';
import { usePresentation } from '../usePresentation';
import { EMPTY_DISPLAYED } from '../director/displayed';
import { fitCamera } from '../layout/fitCamera';
import { boardExtents, ringLayout } from '../layout/ringLayout';
import { boardWith, questTile } from '../../engine/testkit';
import { ANIMALS, type AnimalId } from '../../engine/animals';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

// The same canvas cells as slotOcclusion.test.ts: phone portrait / landscape cells, phone, tablet, desktop.
export const VIEWS = [
  [374, 594],
  [390, 844],
  [588, 290],
  [844, 390],
  [728, 726],
  [728, 644],
] as const;
export const SIZES = [16, 20, 24] as const;
export const SAMPLES = 24; // face vertices per (face, view)
export const MIN_SAMPLES = 12; // a face measured with fewer camera-facing vertices fails
export const LIMIT = 0.3;

// The middle of the bottom, left, top and right sides, then the three non-start corners (ringLayout:
// index 0 is the bottom-right corner, the ring runs along the bottom edge first).
export const REGULAR_TILES = (L: number) => {
  const m = Math.floor(L / 8);
  return [m, L / 4 + m, L / 2 + m, (3 * L) / 4 + m, L / 4, L / 2, (3 * L) / 4];
};

// Adjacent pairs: the middle of the left side (the first tile is the front one), of the right side
// (the first is the back one) and of the top side, the top-left corner after the left-side tile in
// front of it, and the last tile behind the start block (its gate and crowd stand in front).
export const CROSS_PAIRS = (L: number): [number, number][] => {
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
export const SPLITS = [
  [1, 1],
  [3, 2],
  [2, 3],
  [4, 4],
  [1, 7],
  [7, 1],
] as const;

export type Group = readonly [tile: number, count: number];
export type Participant = { id: string; animal: AnimalId };

const hardBoard = (L: number) =>
  boardWith(L, Object.fromEntries(Array.from({ length: L - 1 }, (_, i) => [i + 1, questTile('hard')])));

interface Occluder {
  mesh: Mesh;
  box: Box3; // world bounding box
  top: number; // its top
}

export interface Mounted {
  r: Renderer;
  root: Object3D;
  owner: Map<Object3D, string>; // object → the pid of the pawn group it belongs to
}

export interface FaceRecord {
  label: string; // kind / L / tile / cast / n / slot / view
  hidden: number; // fraction of samples hidden
  samples: number;
  by: string; // first-hit names: owner pid + mesh name, or the animal order
}

let open: Renderer[] = [];

// afterEach of every face occlusion file: unmount what a failing case left open.
export async function closeAll(): Promise<void> {
  for (const r of open) await r.unmount();
  open = [];
  usePresentation.getState().reset(EMPTY_DISPLAYED, null);
}

// Several tiles at once: groups [tile, count] in participant order, so p0 stands on the first tile.
// currentId 'p0' makes p0 the current turn; an id nobody has leaves every tile without it.
export async function mountTiles(
  L: number,
  groups: readonly Group[],
  parts: readonly Participant[],
  currentId = 'p0',
): Promise<Mounted> {
  const tileOf = groups.flatMap(([tile, c]) => Array.from({ length: c }, () => tile));
  usePresentation.getState().reset(
    {
      positions: Object.fromEntries(parts.map((p, i) => [p.id, tileOf[i]])),
      stars: Object.fromEntries(parts.map((p) => [p.id, 1])),
    },
    null,
  );
  const r = await ReactThreeTestRenderer.create(
    <SceneContents tiles={hardBoard(L)} participants={parts} currentId={currentId} restFace={null} />,
  );
  open.push(r);
  // Two frames to t = 0.2 s: past seed 0's first blink (t < 0.12 s) and before any other seed's, so
  // every face is measured with its eyes open.
  await ReactThreeTestRenderer.act(async () => {
    await r.advanceFrames(2, 0.1);
  });
  let root = r.scene.instance as Object3D;
  while (root.parent) root = root.parent;
  return { r, root, owner: ownersOf(root, parts) };
}

// By pid, not by a `pawn-` prefix: ChibiModel's inner body group is named `pawn-body`.
function ownersOf(root: Object3D, parts: readonly Participant[]): Map<Object3D, string> {
  const owner = new Map<Object3D, string>();
  for (const p of parts) root.getObjectByName(`pawn-${p.id}`)!.traverse((x) => owner.set(x, p.id));
  return owner;
}

export async function unmount(m: Mounted): Promise<void> {
  await m.r.unmount();
  open = open.filter((r) => r !== m.r);
}

const shown = (o: Object3D | null): boolean => !o || (o.visible && shown(o.parent));

// World box of a mesh. Instanced bounds follow the current instance matrices, so they are
// recomputed each time.
function worldBox(mesh: Mesh): Box3 {
  const inst = mesh as InstancedMesh;
  if (inst.isInstancedMesh) {
    inst.computeBoundingBox();
    inst.computeBoundingSphere();
    return inst.boundingBox!.clone().applyMatrix4(mesh.matrixWorld);
  }
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld);
}

const byTop = (a: Occluder, b: Occluder) => b.top - a.top;

// Every visible mesh by the pid of the pawn group it belongs to ('' = not in a pawn group), highest
// box top first. World matrices are only refreshed by a render, which the test renderer never does,
// so refresh them before each measurement.
function occluders(m: Mounted): Map<string, Occluder[]> {
  m.root.updateMatrixWorld(true);
  const out = new Map<string, Occluder[]>();
  m.root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh || !shown(o)) return;
    const box = worldBox(mesh);
    const who = m.owner.get(o) ?? '';
    const list = out.get(who);
    const occ = { mesh, box, top: box.max.y };
    if (list) list.push(occ);
    else out.set(who, [occ]);
  });
  for (const list of out.values()) list.sort(byTop);
  return out;
}

function faceOf(m: Mounted, pid: string): Mesh {
  let face: Mesh | null = null;
  m.root.traverse((o) => {
    if (o.name === 'chibi-face' && m.owner.get(o) === pid) face = o as Mesh;
  });
  expect(face, `chibi-face of ${pid}`).not.toBeNull();
  return face!;
}

const cameraOf = (L: number, [w, h]: readonly [number, number]) =>
  new Vector3(...fitCamera(w / h, boardExtents(ringLayout(L))).position);

// Up to SAMPLES camera-facing vertices of pid's face, evenly spread, per view.
function faceSamples(m: Mounted, pid: string, L: number): Vector3[][] {
  const face = faceOf(m, pid);
  const pos = face.geometry.attributes.position;
  const nor = face.geometry.attributes.normal;
  const nm = new Matrix3().getNormalMatrix(face.matrixWorld);
  const vs = Array.from({ length: pos.count }, (_, i) =>
    new Vector3().fromBufferAttribute(pos, i).applyMatrix4(face.matrixWorld),
  );
  const ns = Array.from({ length: pos.count }, (_, i) =>
    new Vector3().fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(),
  );
  const to = new Vector3();
  return VIEWS.map((view) => {
    const cam = cameraOf(L, view);
    const front = vs.filter((v, i) => ns[i].dot(to.copy(cam).sub(v).normalize()) > 0.05);
    const step = Math.max(1, Math.floor(front.length / SAMPLES));
    const out: Vector3[] = [];
    for (let i = 0; i < front.length && out.length < SAMPLES; i += step) out.push(front[i]);
    return out;
  });
}

const ray = new Raycaster();

// The first mesh on the segment camera → v, or null. occ is sorted by box top (y-prune); a mesh
// whose world box the ray misses is skipped too.
function firstHit(cam: Vector3, v: Vector3, occ: readonly Occluder[]): Object3D | null {
  const d = v.clone().sub(cam);
  ray.set(cam, d.clone().normalize());
  ray.far = d.length() - 0.002;
  const near: Mesh[] = [];
  for (const o of occ) {
    if (o.top < v.y) break;
    if (ray.ray.intersectsBox(o.box)) near.push(o.mesh);
  }
  if (near.length === 0) return null;
  const hits = ray.intersectObjects(near, false);
  return hits.length > 0 ? hits[0].object : null;
}

// Hidden fraction of pid's face per view, from the board's camera positions.
export function measureFace(
  m: Mounted,
  pid: string,
  L: number,
): { view: string; hidden: number; samples: number; by: string }[] {
  const occ = [...occluders(m).entries()]
    .filter(([who]) => who !== pid)
    .flatMap(([, list]) => list)
    .sort(byTop);
  const samples = faceSamples(m, pid, L);
  return VIEWS.map((view, vi) => {
    const cam = cameraOf(L, view);
    let hidden = 0;
    const by: Record<string, number> = {};
    for (const v of samples[vi]) {
      const o = firstHit(cam, v, occ);
      if (!o) continue;
      hidden++;
      const who = m.owner.get(o);
      const name = `${who ? `${who}:` : ''}${o.name}`;
      by[name] = (by[name] ?? 0) + 1;
    }
    const names = Object.entries(by)
      .map(([k, c]) => `${k}×${c}`)
      .join(' ');
    const n = samples[vi].length;
    return { view: `${view[0]}x${view[1]}`, hidden: n > 0 ? hidden / n : 1, samples: n, by: names };
  });
}

// One mount: every face of the mounted participants in every view.
export async function measureTiles(
  L: number,
  groups: readonly Group[],
  parts: readonly Participant[],
  label: string,
): Promise<FaceRecord[]> {
  const m = await mountTiles(L, groups, parts);
  const out: FaceRecord[] = [];
  for (const p of parts) {
    for (const f of measureFace(m, p.id, L)) {
      out.push({ label: `${label} slot ${p.id.slice(1)} ${f.view}`, hidden: f.hidden, samples: f.samples, by: f.by });
    }
  }
  await unmount(m);
  return out;
}

export function expectClean(records: FaceRecord[], expected: number): void {
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

// ── Every animal order ──────────────────────────────────────────────────────────────────

// Cast r of n participants: participant k is ANIMALS[(k + r) % 8], so over r = 0..7 every slot
// holds every animal exactly once.
const rotated = (n: number, r: number): Participant[] =>
  Array.from({ length: n }, (_, k) => ({ id: `p${k}`, animal: ANIMALS[(k + r) % ANIMALS.length] }));

// A standalone copy of a mesh at its current world pose, so it stays raycastable after its scene is
// unmounted (the chibi geometries are shared per animal and never disposed).
function frozen(mesh: Mesh): Mesh {
  const c = new Mesh(mesh.geometry, mesh.material);
  c.matrixWorld.copy(mesh.matrixWorld);
  c.matrixAutoUpdate = false;
  c.matrixWorldAutoUpdate = false;
  return c;
}

// A pawn's frozen meshes and a sphere around all of them (a ray that misses it misses them all).
interface Pawn {
  occ: Occluder[];
  bound: Sphere;
}

const probe = new Ray();

// Whether the segment camera → v crosses any of these meshes (box-top order, y-pruned), stopping at
// the first one that does.
function anyHit(cam: Vector3, v: Vector3, occ: readonly Occluder[]): boolean {
  const d = v.clone().sub(cam);
  ray.set(cam, d.clone().normalize());
  ray.far = d.length() - 0.002;
  for (const o of occ) {
    if (o.top < v.y) break;
    if (ray.ray.intersectsBox(o.box) && ray.intersectObject(o.mesh, false).length > 0) return true;
  }
  return false;
}

// Bitmask of the samples whose segment from the camera crosses any of these meshes. With a bound,
// a sample whose segment misses the sphere or ends before it is skipped at once.
function hitMask(cam: Vector3, samples: readonly Vector3[], occ: readonly Occluder[], bound?: Sphere): number {
  let mask = 0;
  samples.forEach((v, i) => {
    if (bound) {
      if (cam.distanceTo(bound.center) - bound.radius > cam.distanceTo(v)) return;
      if (!probe.set(cam, v.clone().sub(cam).normalize()).intersectsSphere(bound)) return;
    }
    if (anyHit(cam, v, occ)) mask |= 1 << i;
  });
  return mask;
}

const popcount = (x: number) => {
  let c = 0;
  for (let v = x; v; v &= v - 1) c++;
  return c;
};

// For every slot k, animal a and view: the most of k's face that any distinct animal order hides.
// Hidden samples are the union of what each mesh hides, so the face of (k, a) behind the others is
// `scene | ⋃ pawn(j, b_j)` over the other slots j — exact, because a sample counts as hidden when
// anything lies on its ray. The masks come from 8 rotated mounts (frozen copies keep each mount's
// pawns after it unmounts); then every injective animal choice for the other slots is tried.
export async function sweepOrders(
  L: number,
  groups: readonly Group[],
  label: string,
  currentId = 'p0',
): Promise<FaceRecord[]> {
  const n = groups.reduce((a, [, c]) => a + c, 0);
  const A = ANIMALS.length;
  const cams = VIEWS.map((view) => cameraOf(L, view));
  const samples: Vector3[][][] = []; // [k * A + a][view]
  const scene: number[][] = []; // [k * A + a][view]
  const pawns: Pawn[] = []; // [k * A + a]
  for (let r = 0; r < A; r++) {
    const m = await mountTiles(L, groups, rotated(n, r), currentId);
    const occ = occluders(m);
    for (let k = 0; k < n; k++) {
      const at = k * A + ((k + r) % A);
      samples[at] = faceSamples(m, `p${k}`, L);
      scene[at] = cams.map((cam, vi) => hitMask(cam, samples[at][vi], occ.get('') ?? []));
      const own = occ.get(`p${k}`)!.map((o) => ({ ...o, mesh: frozen(o.mesh) }));
      const all = new Box3();
      for (const o of own) all.union(o.box);
      pawns[at] = { occ: own, bound: all.getBoundingSphere(new Sphere()) };
    }
    await unmount(m);
  }

  // hit[(k * A + a) * n * A + j * A + b][view]: samples of (k, a) hidden by the pawn of (j, b).
  const hit: number[][] = [];
  for (let ka = 0; ka < n * A; ka++) {
    for (let j = 0; j < n; j++) {
      for (let b = 0; b < A; b++) {
        if (j === Math.floor(ka / A) || b === ka % A) continue;
        const pawn = pawns[j * A + b];
        hit[ka * n * A + j * A + b] = cams.map((cam, vi) => hitMask(cam, samples[ka][vi], pawn.occ, pawn.bound));
      }
    }
  }

  // Depth-first over the other slots, one view at a time. A branch stops when even the union of
  // every animal still possible in the remaining slots cannot beat the worst order found so far.
  const out: FaceRecord[] = [];
  for (let k = 0; k < n; k++) {
    const others = Array.from({ length: n }, (_, j) => j).filter((j) => j !== k);
    for (let a = 0; a < A; a++) {
      const ka = k * A + a;
      VIEWS.forEach((view, vi) => {
        const row = (j: number, b: number) => hit[ka * n * A + j * A + b][vi];
        const rest: number[] = new Array(others.length + 1).fill(0); // union over slots ≥ depth
        for (let d = others.length - 1; d >= 0; d--) {
          rest[d] = rest[d + 1];
          for (let b = 0; b < A; b++) if (b !== a) rest[d] |= row(others[d], b);
        }
        let most = -1;
        let order: number[] = [];
        const pick: number[] = [];
        const used = new Set([a]);
        const walk = (mask: number, depth: number) => {
          if (popcount(mask | rest[depth]) <= most) return;
          if (depth === others.length) {
            most = popcount(mask);
            order = [...pick];
            return;
          }
          for (let b = 0; b < A; b++) {
            if (used.has(b)) continue;
            used.add(b);
            pick.push(b);
            walk(mask | row(others[depth], b), depth + 1);
            pick.pop();
            used.delete(b);
          }
        };
        walk(scene[ka][vi], 0);
        const count = samples[ka][vi].length;
        const cast = Array.from({ length: n }, (_, j) => (j === k ? a : order[others.indexOf(j)]));
        out.push({
          label: `${label} slot ${k} ${ANIMALS[a]} ${view[0]}x${view[1]}`,
          hidden: count > 0 ? most / count : 1,
          samples: count,
          by: cast.map((b) => ANIMALS[b]).join(','),
        });
      });
    }
  }
  return out;
}

// One tile, n 1-8, with the current turn on it (k = 0, full size) and elsewhere (everyone at the
// table size). 8 on one tile always include the current turn, so n 8 runs only with it.
export async function sweepTile(L: number, tile: number, kind: string): Promise<FaceRecord[]> {
  const out: FaceRecord[] = [];
  for (let n = 1; n <= 8; n++) {
    for (const cur of n < 8 ? ['p0', 'away'] : ['p0']) {
      const label = `${kind} L${L} t${tile} n${n} current ${cur === 'p0' ? 'here' : 'away'}`;
      out.push(...(await sweepOrders(L, [[tile, n]], label, cur)));
    }
  }
  return out;
}
// Records per sweepTile: (1 + … + 7) · 2 + 8 slot sets × 8 animals × 6 views.
export const TILE_SWEEP_RECORDS = 64 * 8 * VIEWS.length;

// Two adjacent tiles, every split of SPLITS, p0 (the current turn) on the first tile.
export async function sweepPair(L: number, a: number, b: number): Promise<FaceRecord[]> {
  const out: FaceRecord[] = [];
  for (const [na, nb] of SPLITS) {
    out.push(...(await sweepOrders(L, [[a, na], [b, nb]], `pair L${L} t${a}+t${b} ${na}+${nb}`)));
  }
  return out;
}
// Records per sweepPair: (2 + 5 + 5 + 8 + 8 + 8) slots × 8 animals × 6 views.
export const PAIR_SWEEP_RECORDS = 36 * 8 * VIEWS.length;

// The splits where a sweep of every adjacent pair (all splits na + nb ≤ 8, the current turn on
// either tile or on neither, 07-VERIFICATION run 3) found faces over 30 %: a full-size current on a
// side tile in front of a far corner's 6, a crown on tile L − 1 over a lone face on L − 2, the start
// tile's back row over tile L − 1, rabbit ears across two side tiles.
export const CROWD_SPLITS = [
  [2, 6],
  [6, 2],
  [1, 6],
  [4, 3],
  [2, 5],
  [5, 2],
] as const;

// Where the current turn stands on two tiles: the first (p0), the second (its first participant)
// or neither. 8 on two tiles always include it.
const pairCurrents = (na: number, nb: number) => (na + nb < 8 ? ['p0', `p${na}`, 'away'] : ['p0', `p${na}`]);

// Two adjacent tiles, every split of CROWD_SPLITS, the current turn on either tile or on neither.
export async function sweepPairCurrents(L: number, a: number, b: number): Promise<FaceRecord[]> {
  const out: FaceRecord[] = [];
  for (const [na, nb] of CROWD_SPLITS) {
    for (const cur of pairCurrents(na, nb)) {
      const where = cur === 'away' ? 'away' : `on t${cur === 'p0' ? a : b}`;
      out.push(...(await sweepOrders(L, [[a, na], [b, nb]], `pair L${L} t${a}+t${b} ${na}+${nb} current ${where}`, cur)));
    }
  }
  return out;
}
// Records per sweepPairCurrents: (8 · 2 + 8 · 2 + 7 · 3 · 4) slots × 8 animals × 6 views.
export const PAIR_CURRENTS_SWEEP_RECORDS = 116 * 8 * VIEWS.length;
