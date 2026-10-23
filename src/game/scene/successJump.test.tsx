// @vitest-environment node
// src/game/scene/successJump.test.tsx — the tiered success jump of a mounted character (Phase 8
// 08-05: FX-01, FX-04, D-01, D-03, D-04, D-08, RESEARCH Pitfall 6). Runs in node with
// @react-three/test-renderer (no WebGL): SceneContents is mounted, stars beats are played through
// the presentation store and useFrame is driven with a fixed 10 ms delta, so the act clock after n
// frames is n · 10 ms. The jump has to reach the tier height × the slot scale, touch down at
// successPlan.landMs (when the effect pools fire) and be back on REST at the beat end.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Vector3, type Mesh, type Object3D } from 'three';
import { SceneContents } from './SceneContents';
import { faceGeo } from './chibiFaces';
import { usePresentation } from '../usePresentation';
import { EMPTY_DISPLAYED } from '../director/displayed';
import { STARS_MS, type BeatSpec } from '../director/timeline';
import { successPlan } from '../director/successPlan';
import { ARM_REST, FACE_KEYS, type FaceKey } from '../layout/chibiDims';
import { boardWith } from '../../engine/testkit';

// Character reads prefersReducedMotion once at mount; one describe turns it on.
const rm = vi.hoisted(() => ({ reduced: false }));
vi.mock('../reducedMotion', () => ({ prefersReducedMotion: () => rm.reduced }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

const TAU = 2 * Math.PI;
const DT_MS = 10;
const tiles20 = boardWith(20);
// a is the current turn; b shares its tile, so b stands in a smaller side slot (scale < 1).
const participants = [
  { id: 'a', animal: 'bear' as const },
  { id: 'b', animal: 'rabbit' as const },
];

const one = (r: Renderer, name: string): Object3D => {
  const found = r.scene.findAll((n) => (n.instance as Object3D | undefined)?.name === name).map((n) => n.instance as Object3D);
  expect(found, name).toHaveLength(1);
  return found[0];
};
const partOf = (r: Renderer, pid: string, name: string): Object3D => {
  let found: Object3D | null = null;
  one(r, `pawn-${pid}`).traverse((o) => {
    if (o.name === name) found = o;
  });
  expect(found, `${pid} ${name}`).not.toBeNull();
  return found!;
};
const faceOf = (r: Renderer, pid: string, animal: 'bear' | 'rabbit'): FaceKey | 'unknown' => {
  const geo = (partOf(r, pid, 'chibi-face') as Mesh).geometry;
  return FACE_KEYS.find((k) => faceGeo(animal, k) === geo) ?? 'unknown';
};
const angleOff = (a: number) => Math.abs(a - TAU * Math.round(a / TAU));

// Body height above the ground group in world units (= pose.y × slot scale).
const wa = new Vector3();
const wb = new Vector3();
function lift(r: Renderer, pid: string): number {
  const ground = one(r, `pawn-${pid}`);
  ground.updateWorldMatrix(true, true);
  ground.getWorldPosition(wa);
  partOf(r, pid, 'pawn-body').getWorldPosition(wb);
  return wb.y - wa.y;
}

function expectRestBody(r: Renderer, pid: string, label: string) {
  const body = partOf(r, pid, 'pawn-body');
  expect(Math.abs(body.position.y), `${label} y`).toBeLessThan(1e-6);
  expect(angleOff(body.rotation.y), `${label} yaw`).toBeLessThan(1e-6);
  expect(Math.abs(body.rotation.x), `${label} lean`).toBeLessThan(1e-6);
  expect(Math.abs(body.scale.y - 1), `${label} squash`).toBeLessThan(1e-6);
  expect(Math.abs(partOf(r, pid, 'chibi-shoulder-r').rotation.z - ARM_REST), `${label} arm`).toBeLessThan(1e-6);
}

let open: Renderer[] = [];
async function mountScene(): Promise<Renderer> {
  usePresentation.getState().reset({ positions: { a: 2, b: 2 }, stars: { a: 0, b: 0 } }, null);
  const r = await ReactThreeTestRenderer.create(
    <SceneContents tiles={tiles20} participants={participants} currentId="a" restFace={null} />,
  );
  open.push(r);
  await step(r, 30); // settle: breathing / bounce running, no beat
  return r;
}
async function play(spec: BeatSpec): Promise<number> {
  await ReactThreeTestRenderer.act(async () => {
    usePresentation.getState().play([spec]);
  });
  return usePresentation.getState().current!.id;
}
async function step(r: Renderer, n: number): Promise<void> {
  await ReactThreeTestRenderer.act(async () => {
    await r.advanceFrames(n, DT_MS / 1000);
  });
}

beforeEach(() => {
  rm.reduced = false;
});
afterEach(async () => {
  for (const r of open) await r.unmount();
  open = [];
  usePresentation.getState().reset(EMPTY_DISPLAYED, null);
  rm.reduced = false;
});

// Plays a stars beat of b frame by frame up to the beat end and records the body height per ms.
async function runStars(r: Renderer, stars: number, ms: number) {
  await play({ kind: 'stars', pid: 'b', stars, ms });
  const ys = new Map<number, number>();
  const faces = new Set<FaceKey | 'unknown'>();
  for (let t = DT_MS; t <= ms; t += DT_MS) {
    await r.advanceFrames(1, DT_MS / 1000);
    ys.set(t, lift(r, 'b'));
    faces.add(faceOf(r, 'b', 'rabbit'));
  }
  let peakT = 0;
  let peak = -Infinity;
  for (const [t, y] of ys) if (y > peak) [peak, peakT] = [y, t];
  return { ys, faces, peak, peakT };
}

describe('Character — tiered success jump (FX-01, FX-04, D-01, D-03, D-04)', () => {
  it('⭐3 (2200 ms): peaks at 0.75 × slot scale before landMs, touches down at landMs, ends on REST', async () => {
    const r = await mountScene();
    const scale = one(r, 'pawn-b').scale.y;
    expect(scale).toBeLessThan(1); // b stands in a side slot
    const plan = successPlan(3, STARS_MS[3], false);
    const { ys, faces, peak, peakT } = await runStars(r, 3, plan.ms);

    expect(peak).toBeCloseTo(0.75 * scale, 2);
    expect(peakT).toBeGreaterThanOrEqual(0.4 * plan.landMs);
    expect(peakT).toBeLessThanOrEqual(0.7 * plan.landMs);
    // Touchdown at landMs (± one frame), when the confetti / burst / rings start.
    const land = Math.round(plan.landMs / DT_MS) * DT_MS;
    expect(Math.abs(ys.get(land)!)).toBeLessThanOrEqual(0.01 * scale);
    expect(ys.get(land - 3 * DT_MS)!).toBeGreaterThan(0.05 * scale); // still airborne just before
    // After the landing the body never rises above the gentle joy bob.
    for (const [t, y] of ys) if (t > land + DT_MS) expect(y, `t=${t}`).toBeLessThanOrEqual(0.04 * scale + 1e-6);
    // Joy face for the whole beat, exactly REST (yaw ≡ 0 mod 2π) at the beat end.
    expect([...faces]).toEqual(['joy']);
    expectRestBody(r, 'b', '⭐3 end');
    expect(usePresentation.getState().current?.kind).toBe('stars'); // the Banner / watchdog owns it
  });

  it('peak height grows with the tier: ⭐1 0.55 < ⭐2 0.65 < ⭐3 0.75 (× slot scale)', async () => {
    const peaks: number[] = [];
    for (const stars of [1, 2, 3] as const) {
      const r = await mountScene();
      const scale = one(r, 'pawn-b').scale.y;
      const { peak } = await runStars(r, stars, STARS_MS[stars]);
      expect(peak / scale).toBeCloseTo(successPlan(stars, STARS_MS[stars], false).jumpHeight, 2);
      peaks.push(peak / scale);
      expectRestBody(r, 'b', `⭐${stars} end`);
      await r.unmount();
      open = open.filter((o) => o !== r);
      usePresentation.getState().reset(EMPTY_DISPLAYED, null);
    }
    expect(peaks[0]).toBeLessThan(peaks[1]);
    expect(peaks[1]).toBeLessThan(peaks[2]);
  });

  it('a stars beat of the old 900 ms length still jumps on its landMs and ends on REST', async () => {
    const r = await mountScene();
    const scale = one(r, 'pawn-b').scale.y;
    const plan = successPlan(1, 900, false);
    const { ys, peak } = await runStars(r, 1, 900);
    expect(peak).toBeCloseTo(0.55 * scale, 2);
    expect(Math.abs(ys.get(Math.round(plan.landMs / DT_MS) * DT_MS)!)).toBeLessThanOrEqual(0.01 * scale);
    expectRestBody(r, 'b', '900 ms end');
  });

  it('a stars beat completed mid-air blends back to REST (T-08-33)', async () => {
    const r = await mountScene();
    const plan = successPlan(3, STARS_MS[3], false);
    const id = await play({ kind: 'stars', pid: 'b', stars: 3, ms: plan.ms });
    await step(r, Math.round((0.6 * plan.landMs) / DT_MS)); // at the apex, half turned
    expect(lift(r, 'b')).toBeGreaterThan(0.3);
    await ReactThreeTestRenderer.act(async () => {
      usePresentation.getState().completeBeat(id);
    });
    await step(r, 150); // 1.5 s
    const body = partOf(r, 'b', 'pawn-body');
    expect(Math.abs(body.position.y)).toBeLessThan(0.01);
    expect(angleOff(body.rotation.y)).toBeLessThan(0.01);
    expect(Math.abs(partOf(r, 'b', 'chibi-shoulder-r').rotation.z - ARM_REST)).toBeLessThan(0.01);
  });
});

describe('Character — tiered success jump under reduced motion (D-08)', () => {
  it('holds REST for the whole beat while the face is joy', async () => {
    rm.reduced = true;
    const r = await mountScene();
    await play({ kind: 'stars', pid: 'b', stars: 3, ms: STARS_MS[3] });
    for (let t = DT_MS; t <= STARS_MS[3]; t += 4 * DT_MS) {
      await r.advanceFrames(4, DT_MS / 1000);
      expectRestBody(r, 'b', `reduced t=${t}`);
      expect(faceOf(r, 'b', 'rabbit')).toBe('joy');
    }
  });
});
