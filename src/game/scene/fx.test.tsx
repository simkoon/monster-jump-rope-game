// @vitest-environment node
// src/game/scene/fx.test.tsx — the always-mounted 3D effect pools (Phase 8 08-04: D-03, D-04, D-06,
// D-07, D-08, D-10, D-23, FX-01, FX-04, FX-06). Runs in node with @react-three/test-renderer (no
// WebGL). Beats are driven through usePresentation (reset + play) and frames are advanced with a
// fixed delta inside act; the effect clock therefore reads elapsed = frames × delta.
import type { ReactElement } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { useThree } from '@react-three/fiber';
import { Color, InstancedMesh, Matrix4, Quaternion, Vector3, type Object3D, type PerspectiveCamera } from 'three';
import { SceneContents } from './SceneContents';
import { usePresentation } from '../usePresentation';
import { EMPTY_DISPLAYED } from '../director/displayed';
import { BEAT_MS, STARS_MS, type BeatSpec } from '../director/timeline';
import { successPlan } from '../director/successPlan';
import { useGameStore } from '../../harness/useGameStore';
import { boardWith } from '../../engine/testkit';
import { standPoints } from '../layout/pawnSlots';
import { BONUS_SPARKLE, BURST_CAP, CONFETTI_CAP, EVENT_SPARKLE, PUFF_CAP, RING_CAP } from '../layout/fxMotion';
import { FX_COLOR } from '../palette';
import { boardExtents, ringLayout } from '../layout/ringLayout';
import { fitCamera } from '../layout/fitCamera';

const rm = vi.hoisted(() => ({ reduced: false }));
vi.mock('../reducedMotion', () => ({ prefersReducedMotion: () => rm.reduced }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

const POOLS = ['fx-confetti', 'fx-burst', 'fx-ring', 'fx-puff'] as const;
type PoolName = (typeof POOLS)[number];

const tiles20 = boardWith(20);
const points = standPoints(tiles20);
const two = [
  { id: 'a', animal: 'bear' as const },
  { id: 'b', animal: 'cat' as const },
];
const DT = 0.05; // 50 ms per frame

// Captures the R3F camera so tests can read and compare its pose.
let probe: { camera: PerspectiveCamera; setSize: (w: number, h: number) => void } | null = null;
function Probe() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const setSize = useThree((s) => s.setSize);
  probe = { camera, setSize };
  return null;
}

let open: Renderer[] = [];
async function mount(el: ReactElement, size = { width: 800, height: 600 }): Promise<Renderer> {
  const r = await ReactThreeTestRenderer.create(el, size);
  open.push(r);
  return r;
}

const scene = (currentId = 'a') => (
  <>
    <SceneContents tiles={tiles20} participants={two} currentId={currentId} restFace={null} />
    <Probe />
  </>
);

async function play(specs: BeatSpec[]): Promise<void> {
  await ReactThreeTestRenderer.act(async () => {
    usePresentation.getState().play(specs);
  });
}

async function frames(r: Renderer, n: number, dt = DT): Promise<void> {
  await ReactThreeTestRenderer.act(async () => {
    await r.advanceFrames(n, dt);
  });
}

async function completeCurrent(): Promise<void> {
  await ReactThreeTestRenderer.act(async () => {
    const cur = usePresentation.getState().current;
    if (cur) usePresentation.getState().completeBeat(cur.id);
  });
}

const pool = (r: Renderer, name: PoolName): InstancedMesh => {
  const found = r.scene
    .findAll((n) => (n.instance as Object3D | undefined)?.name === name)
    .map((n) => n.instance as Object3D);
  expect(found, name).toHaveLength(1);
  expect(found[0]).toBeInstanceOf(InstancedMesh);
  return found[0] as InstancedMesh;
};

const counts = (r: Renderer) => POOLS.map((n) => pool(r, n).count);

const starsSpec = (stars: number, pid = 'a'): BeatSpec => ({
  kind: 'stars',
  pid,
  stars,
  ms: STARS_MS[stars >= 3 ? 3 : stars <= 1 ? 1 : 2],
});

// Frames needed so that elapsed (= frames × 50 ms) is the first value past `ms`.
const past = (ms: number) => Math.floor(ms / (DT * 1000)) + 1;

const m4 = new Matrix4();
const v3 = new Vector3();
const instancePos = (mesh: InstancedMesh, i: number): Vector3 => {
  mesh.getMatrixAt(i, m4);
  return v3.clone().setFromMatrixPosition(m4);
};

beforeEach(() => {
  rm.reduced = false;
  probe = null;
  usePresentation.getState().reset({ positions: { a: 3, b: 0 }, stars: { a: 0, b: 0 } }, null);
  useGameStore.setState({ game: null });
});

afterEach(async () => {
  for (const r of open) await r.unmount();
  open = [];
  usePresentation.getState().reset(EMPTY_DISPLAYED, null);
  useGameStore.setState({ game: null });
});

describe('FxPools — four always-mounted InstancedMesh pools (D-06, Pitfall 8)', () => {
  it('mounts fx-confetti / fx-burst / fx-ring / fx-puff idle, unculled and with preset instance colors', async () => {
    const r = await mount(scene());
    const caps: Record<PoolName, number> = {
      'fx-confetti': CONFETTI_CAP,
      'fx-burst': BURST_CAP,
      'fx-ring': RING_CAP,
      'fx-puff': PUFF_CAP,
    };
    for (const name of POOLS) {
      const m = pool(r, name);
      expect(m.count, name).toBe(0);
      expect(m.frustumCulled, name).toBe(false);
      expect(m.visible, name).toBe(true);
      expect(m.instanceColor, name).not.toBeNull();
      expect(m.instanceColor!.count, name).toBe(caps[name]);
      expect(m.instanceMatrix.count, name).toBe(caps[name]);
      expect(m.castShadow || m.receiveShadow, name).toBe(false);
    }
    await frames(r, 10);
    expect(counts(r)).toEqual([0, 0, 0, 0]);
  });
});

describe('FxPools — stars beat (FX-01, FX-04, D-03, D-04)', () => {
  it('⭐3: nothing before landMs; 140 / 18 / 2 from the judged tile just after; 0 after the beat', async () => {
    const r = await mount(scene());
    const plan = successPlan(3, STARS_MS[3], false);
    await play([starsSpec(3)]);
    await frames(r, past(plan.landMs) - 1); // elapsed < landMs
    expect(counts(r)).toEqual([0, 0, 0, 0]);
    await frames(r, 1); // just after landMs
    expect(counts(r)).toEqual([140, 18, 2, 0]);

    // Emitters sit at a's tile (tile 3 + its slot ≤ 0.45, pieces moved ≤ 0.1 so far).
    const tile = points[3];
    const near = (p: Vector3, tol: number) => Math.hypot(p.x - tile.x, p.z - tile.z) <= tol;
    const confetti = pool(r, 'fx-confetti');
    for (let i = 0; i < 140; i++) expect(near(instancePos(confetti, i), 0.6)).toBe(true);
    const ring = pool(r, 'fx-ring');
    const r0 = instancePos(ring, 0);
    expect(near(r0, 0.46)).toBe(true);
    expect(r0.y).toBeCloseTo(tile.y + 0.02, 6); // instanceMatrix is Float32
    const burst = pool(r, 'fx-burst');
    for (let i = 0; i < 18; i++) expect(near(instancePos(burst, i), 0.46 + 1.4)).toBe(true);

    // Still alive mid-beat, all gone after the beat completes.
    await frames(r, 10);
    expect(pool(r, 'fx-confetti').count).toBe(140);
    await completeCurrent();
    await frames(r, 1);
    expect(counts(r)).toEqual([0, 0, 0, 0]);
  });

  it('⭐3 burst stars face the camera (billboard) and the second ring is gold', async () => {
    const r = await mount(scene());
    const plan = successPlan(3, STARS_MS[3], false);
    await play([starsSpec(3)]);
    await frames(r, past(plan.landMs));
    const burst = pool(r, 'fx-burst');
    burst.getMatrixAt(0, m4);
    const q = new Quaternion();
    m4.decompose(new Vector3(), q, new Vector3());
    expect(q.angleTo(probe!.camera.quaternion)).toBeLessThan(1e-6);
    const c = new Color();
    pool(r, 'fx-ring').getColorAt(1, c);
    expect(`#${c.getHexString().toUpperCase()}`).toBe(FX_COLOR.ringGold);
    pool(r, 'fx-ring').getColorAt(0, c);
    expect(`#${c.getHexString().toUpperCase()}`).toBe(FX_COLOR.ring);
    // ⭐3 confetti carries sun-deep (gold mix); the burst alternates sun / white.
    const conf = pool(r, 'fx-confetti');
    const hexes = new Set<string>();
    for (let i = 0; i < 140; i++) {
      conf.getColorAt(i, c);
      hexes.add(`#${c.getHexString().toUpperCase()}`);
    }
    expect(hexes.has('#FF9F1C')).toBe(true);
    burst.getColorAt(1, c);
    expect(`#${c.getHexString().toUpperCase()}`).toBe(FX_COLOR.burstAlt);
  });

  it('⭐1: 40 / 8 / 1 without gold; ⭐2: 80 / 12 / 2', async () => {
    const r = await mount(scene());
    const p1 = successPlan(1, STARS_MS[1], false);
    await play([starsSpec(1)]);
    await frames(r, past(p1.landMs) - 1);
    expect(counts(r)).toEqual([0, 0, 0, 0]);
    await frames(r, 1);
    expect(counts(r)).toEqual([40, 8, 1, 0]);
    const c = new Color();
    const conf = pool(r, 'fx-confetti');
    for (let i = 0; i < 40; i++) {
      conf.getColorAt(i, c);
      expect(`#${c.getHexString().toUpperCase()}`).not.toBe('#FF9F1C');
    }
    await completeCurrent();

    const p2 = successPlan(2, STARS_MS[2], false);
    await play([starsSpec(2)]);
    await frames(r, past(p2.landMs) - 1);
    expect(counts(r)).toEqual([0, 0, 0, 0]);
    await frames(r, 1);
    expect(counts(r)).toEqual([80, 12, 2, 0]);
  });

  it('runs to the natural end of the beat and is empty right after', async () => {
    const r = await mount(scene());
    await play([starsSpec(2)]);
    await frames(r, past(STARS_MS[2]) - 1);
    expect(counts(r)).toEqual([0, 0, 0, 0]); // every effect already ended inside the beat
    await completeCurrent();
    await frames(r, 1);
    expect(counts(r)).toEqual([0, 0, 0, 0]);
  });

  it('D-07: a beat completed early (skip / watchdog) empties every pool in the next frame', async () => {
    const r = await mount(scene());
    const plan = successPlan(3, STARS_MS[3], false);
    await play([starsSpec(3), { kind: 'stars', pid: 'b', stars: 1, ms: STARS_MS[1] }]);
    await frames(r, past(plan.landMs) + 2);
    expect(counts(r)[0]).toBe(140);
    await completeCurrent(); // the next stars beat (b) starts at elapsed 0 → nothing yet
    await frames(r, 1);
    expect(counts(r)).toEqual([0, 0, 0, 0]);
    // skipAll as well.
    await ReactThreeTestRenderer.act(async () => usePresentation.getState().skipAll());
    await play([starsSpec(3)]);
    await frames(r, past(plan.landMs) + 1);
    expect(counts(r)[0]).toBe(140);
    await ReactThreeTestRenderer.act(async () => usePresentation.getState().skipAll());
    await frames(r, 1);
    expect(counts(r)).toEqual([0, 0, 0, 0]);
  });

  it('D-23: five consecutive successes reuse the same four meshes, geometries and materials', async () => {
    const r = await mount(scene());
    const before = POOLS.map((n) => {
      const m = pool(r, n);
      return { m, geo: m.geometry.uuid, mat: (m.material as { uuid: string }).uuid };
    });
    for (let k = 0; k < 5; k++) {
      const stars = (k % 3) + 1;
      await play([starsSpec(stars)]);
      await frames(r, past(successPlan(stars, STARS_MS[stars as 1 | 2 | 3], false).landMs));
      expect(counts(r)[0]).toBeGreaterThan(0);
      await completeCurrent();
      await frames(r, 1);
      expect(counts(r)).toEqual([0, 0, 0, 0]);
    }
    POOLS.forEach((n, i) => {
      const m = pool(r, n);
      expect(m).toBe(before[i].m);
      expect(m.geometry.uuid).toBe(before[i].geo);
      expect((m.material as { uuid: string }).uuid).toBe(before[i].mat);
    });
  });
});

describe('FxPools — start bonus and events (D-10, FX-06)', () => {
  it('startBonus: 6 gold sparkles from +120 ms for 450 ms; the beat keeps 800 ms', async () => {
    expect(BEAT_MS.startBonus).toBe(800);
    const r = await mount(scene());
    await play([{ kind: 'startBonus', pid: 'a', stars: 1, ms: BEAT_MS.startBonus }]);
    await frames(r, 2); // 100 ms
    expect(counts(r)).toEqual([0, 0, 0, 0]);
    await frames(r, 1); // 150 ms
    expect(counts(r)).toEqual([0, BONUS_SPARKLE.count, 0, 0]);
    const c = new Color();
    for (let i = 0; i < BONUS_SPARKLE.count; i++) {
      pool(r, 'fx-burst').getColorAt(i, c);
      expect(`#${c.getHexString().toUpperCase()}`).toBe(FX_COLOR.burst);
    }
    await frames(r, 8); // 550 ms
    expect(pool(r, 'fx-burst').count).toBe(6);
    await frames(r, 1); // 600 ms > 120 + 450
    expect(counts(r)).toEqual([0, 0, 0, 0]);
  });

  const eventSpec = (eff: 'forward' | 'backward' | 'extra', label: '' | '보너스' | '함정', suppressed = false): BeatSpec => ({
    kind: 'event',
    pid: 'a',
    eff,
    steps: eff === 'extra' ? 0 : 2,
    suppressed,
    name: 'e',
    label,
    ms: BEAT_MS.event,
  });

  it('lucky event: 8 sparkles from +150 ms; the beat keeps 1000 ms', async () => {
    expect(BEAT_MS.event).toBe(1000);
    const r = await mount(scene());
    await play([eventSpec('forward', '')]);
    await frames(r, 2); // 100 ms
    expect(counts(r)).toEqual([0, 0, 0, 0]);
    await frames(r, 2); // 200 ms
    expect(counts(r)).toEqual([0, EVENT_SPARKLE.count, 0, 0]);
    await frames(r, 10); // 700 ms > 150 + 500
    expect(counts(r)).toEqual([0, 0, 0, 0]);
  });

  it('trap events (함정 label, backward, blocked extra) show 6 soft puffs instead', async () => {
    const r = await mount(scene());
    for (const spec of [eventSpec('forward', '함정'), eventSpec('backward', ''), eventSpec('extra', '', true)]) {
      await play([spec]);
      await frames(r, 4); // 200 ms
      expect(counts(r)).toEqual([0, 0, 0, 6]);
      const c = new Color();
      const seen = new Set<string>();
      for (let i = 0; i < 6; i++) {
        pool(r, 'fx-puff').getColorAt(i, c);
        seen.add(`#${c.getHexString().toUpperCase()}`);
      }
      expect([...seen].every((h) => h === FX_COLOR.puff || h === FX_COLOR.puffAlt)).toBe(true);
      await completeCurrent();
      await frames(r, 1);
      expect(counts(r)).toEqual([0, 0, 0, 0]);
    }
    // A 보너스-labelled backward event is still lucky (isLuckyEvent).
    await play([eventSpec('backward', '보너스')]);
    await frames(r, 4);
    expect(counts(r)).toEqual([0, EVENT_SPARKLE.count, 0, 0]);
  });

  it('other beats (dice, hop, miss, win) never emit', async () => {
    const r = await mount(scene());
    const specs: BeatSpec[] = [
      { kind: 'dice', pid: 'a', face: 3, ms: 1000 },
      { kind: 'hop', pid: 'a', path: [4, 5], by: 'dice', ms: 500 },
      { kind: 'miss', pid: 'a', retry: false, ms: 700 },
      { kind: 'win', winners: ['a'], animals: ['bear'], ms: 1500 },
    ];
    for (const spec of specs) {
      await play([spec]);
      for (let f = 0; f < 8; f++) {
        await frames(r, 1);
        expect(counts(r)).toEqual([0, 0, 0, 0]);
      }
      await ReactThreeTestRenderer.act(async () => usePresentation.getState().skipAll());
    }
  });
});

describe('FxPools — reduced motion (D-08)', () => {
  it('never emits through a ⭐3 beat, a start bonus or an event', async () => {
    rm.reduced = true;
    const r = await mount(scene());
    await play([starsSpec(3)]);
    for (let f = 0; f < past(STARS_MS[3]); f++) {
      await frames(r, 1);
      expect(counts(r)).toEqual([0, 0, 0, 0]);
    }
    await completeCurrent();
    await play([{ kind: 'startBonus', pid: 'a', stars: 1, ms: 800 }]);
    for (let f = 0; f < 16; f++) {
      await frames(r, 1);
      expect(counts(r)).toEqual([0, 0, 0, 0]);
    }
  });
});

// ── Task 3: ⭐3 camera shake + exact restore (FX-04, D-04, D-07, D-08, RESEARCH Pitfall 7) ──────

describe('CameraRig — ⭐3 shake with exact restore', () => {
  const STEP = 0.02; // 20 ms frames: landMs 770 and 770 + 320 never fall on a frame boundary
  const layout20 = ringLayout(20);
  const fitFor = (w: number, h: number) => fitCamera(w / h, boardExtents(layout20));

  // Component-wise (angleTo's acos loses precision near 0, ~3e-8 for identical quaternions).
  const qDiff = (a: Quaternion, b: Quaternion) =>
    Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z), Math.abs(a.w - b.w));

  function expectFitted(cam: PerspectiveCamera, fit: ReturnType<typeof fitFor>, fitQ: Quaternion) {
    expect(Math.abs(cam.position.x - fit.position[0])).toBeLessThanOrEqual(1e-9);
    expect(Math.abs(cam.position.y - fit.position[1])).toBeLessThanOrEqual(1e-9);
    expect(Math.abs(cam.position.z - fit.position[2])).toBeLessThanOrEqual(1e-9);
    expect(qDiff(cam.quaternion, fitQ)).toBeLessThanOrEqual(1e-9);
  }

  it('⭐3: shakes ≤ 0.06 per axis, translation only, during [landMs, landMs + 320] and restores exactly', async () => {
    const r = await mount(scene());
    const cam = probe!.camera;
    const fit = fitFor(800, 600);
    const fitQ = cam.quaternion.clone();
    expectFitted(cam, fit, fitQ);
    const plan = successPlan(3, STARS_MS[3], false);
    expect(plan.shakeMs).toBe(320);
    expect(plan.shakeMs).toBeLessThanOrEqual(350);
    await play([starsSpec(3)]);
    let maxOff = 0;
    for (let k = 1; k * STEP * 1000 < STARS_MS[3]; k++) {
      await frames(r, 1, STEP);
      const t = k * STEP * 1000;
      const dx = cam.position.x - fit.position[0];
      const dy = cam.position.y - fit.position[1];
      const dz = cam.position.z - fit.position[2];
      // Translation only: the view direction never changes (lookAt target moves with the camera).
      expect(qDiff(cam.quaternion, fitQ)).toBeLessThanOrEqual(1e-9);
      expect(Math.abs(dz)).toBeLessThanOrEqual(1e-12);
      if (t > plan.landMs && t < plan.landMs + plan.shakeMs) {
        expect(Math.abs(dx)).toBeLessThanOrEqual(0.06 + 1e-12);
        expect(Math.abs(dy)).toBeLessThanOrEqual(0.06 + 1e-12);
        maxOff = Math.max(maxOff, Math.hypot(dx, dy));
      } else {
        expectFitted(cam, fit, fitQ);
      }
    }
    expect(maxOff).toBeGreaterThan(0.01);
    await completeCurrent();
    await frames(r, 1, STEP);
    expectFitted(cam, fit, fitQ);
  });

  it('D-07: completing the ⭐3 beat mid-shake (skip / watchdog / skipAll) restores in the next frame', async () => {
    const r = await mount(scene());
    const cam = probe!.camera;
    const fit = fitFor(800, 600);
    const fitQ = cam.quaternion.clone();
    await play([starsSpec(3)]);
    await frames(r, 40, STEP); // 800 ms: inside the shake
    expect(cam.position.distanceTo(new Vector3(...fit.position))).toBeGreaterThan(1e-4);
    await completeCurrent();
    await frames(r, 1, STEP);
    expectFitted(cam, fit, fitQ);

    await play([starsSpec(3)]);
    await frames(r, 41, STEP);
    expect(cam.position.distanceTo(new Vector3(...fit.position))).toBeGreaterThan(1e-4);
    await ReactThreeTestRenderer.act(async () => usePresentation.getState().skipAll());
    await frames(r, 1, STEP);
    expectFitted(cam, fit, fitQ);
  });

  it('⭐1 and ⭐2 never move the camera', async () => {
    const r = await mount(scene());
    const cam = probe!.camera;
    const fit = fitFor(800, 600);
    const fitQ = cam.quaternion.clone();
    for (const stars of [1, 2]) {
      await play([starsSpec(stars)]);
      for (let k = 0; k < 90; k++) {
        await frames(r, 1, STEP);
        expectFitted(cam, fit, fitQ);
      }
      await completeCurrent();
    }
  });

  it('D-08: reduced motion never shakes', async () => {
    rm.reduced = true;
    const r = await mount(scene());
    const cam = probe!.camera;
    const fit = fitFor(800, 600);
    const fitQ = cam.quaternion.clone();
    await play([starsSpec(3)]);
    for (let k = 0; k < 110; k++) {
      await frames(r, 1, STEP);
      expectFitted(cam, fit, fitQ);
    }
  });

  it('a resize during the shake re-fits, keeps shaking around the new fit, then restores to it', async () => {
    const r = await mount(scene());
    const cam = probe!.camera;
    const plan = successPlan(3, STARS_MS[3], false);
    await play([starsSpec(3)]);
    await frames(r, 40, STEP); // 800 ms
    await ReactThreeTestRenderer.act(async () => {
      probe!.setSize(844, 330);
    });
    const fit2 = fitFor(844, 330);
    let moved = 0;
    let k = 40;
    for (; (k + 1) * STEP * 1000 < plan.landMs + plan.shakeMs; k++) {
      await frames(r, 1, STEP);
      const dx = cam.position.x - fit2.position[0];
      const dy = cam.position.y - fit2.position[1];
      expect(Math.abs(dx)).toBeLessThanOrEqual(0.06 + 1e-12);
      expect(Math.abs(dy)).toBeLessThanOrEqual(0.06 + 1e-12);
      expect(Math.abs(cam.position.z - fit2.position[2])).toBeLessThanOrEqual(1e-12);
      moved = Math.max(moved, Math.hypot(dx, dy));
    }
    expect(moved).toBeGreaterThan(1e-4);
    await frames(r, 5, STEP); // past landMs + 320
    expect(Math.abs(cam.position.x - fit2.position[0])).toBeLessThanOrEqual(1e-9);
    expect(Math.abs(cam.position.y - fit2.position[1])).toBeLessThanOrEqual(1e-9);
    expect(Math.abs(cam.position.z - fit2.position[2])).toBeLessThanOrEqual(1e-9);
    expect(cam.aspect).toBeCloseTo(844 / 330, 9);
  });
});
