// src/game/scene/FxPools.tsx — the four always-mounted 3D effect pools (Phase 8 D-03, D-04, D-06, D-07,
// D-08, D-10, D-23, FX-01, FX-04, FX-06, UI-SPEC F2 / F6).
// Confetti, star burst, shock-wave ring and puff are four InstancedMeshes created ONCE when
// SceneContents mounts and never remounted: fixed capacities (fxMotion caps — `args` never change),
// module-scope geometries / materials passed by reference with dispose disabled (null). Nothing is created
// per success, so five games in a row reuse the same GPU objects (RESEARCH Pitfall 2, D-23, T-08-08).
// Idle pools have count 0 and add no draw call; they stay `visible`.
// Why frustum culling is off and colors are preset at mount (RESEARCH Pitfall 8): an InstancedMesh
// computes its bounding sphere once, so moving instances would be culled; and a pool that is culled
// or gets its first setColorAt mid-game compiles its shader program at the first success — a visible
// stall. Unculled + instanceColor written for every instance at mount compiles everything up front.
// Later color writes (⭐3 gold mix) only refill the existing attribute, they never change the program.
// Beat consumer (Phase 6 Pattern 4): the frame loop reads usePresentation.getState() and keeps its own
// per-beat clock (reset on a new beat id). Every time and size comes from successPlan (08-02):
//   stars      → from landMs: confetti (head height), burst (billboarded to the camera) and rings
//                (tile top + 0.02) at the judged character's tile + slot,
//   startBonus → BONUS_SPARKLE gold sparkles at the feet (burst pool),
//   event      → isLuckyEvent ? EVENT_SPARKLE sparkles : EVENT_PUFF soft puffs.
// Any other beat, no beat, a beat that changed (skip / watchdog / skipAll, D-07) or reduced motion
// (D-08) → every count is 0 in that same frame. Beats are never completed here and never change length.
// Ceremony intro (08-09, D-16, UI-SPEC §F7 "등장 연출"): with the `ceremony` prop set and introActive,
// a new introId starts the intro clock; from INTRO_JUMP_AT_MS 140 confetti in the gold mix
// (confettiGold) burst from the tier top center and one gold ring (ringGold) grows to the tier width —
// both done well inside CEREMONY_INTRO_MS. introActive false (tap skip) or the ceremony ending sets the
// counts to 0 in that same frame. Same pools, same scratch objects; no beat effect runs while the
// ceremony is shown.
// Per frame: one module-scope Object3D and scratch objects, no allocation; delta clamped to 0.25 s.
// MeshBasicMaterial only (palette hexes as is on the flat canvas); no shadows, no post-processing.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  Color,
  DoubleSide,
  IcosahedronGeometry,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  Vector3,
  type InstancedMesh,
} from 'three';
import { isLuckyEvent } from '../../engine/stats';
import { successPlan } from '../director/successPlan';
import { HEAD_TOP } from '../layout/chibiDims';
import { GROUND_HEIGHT, INTRO_JUMP_AT_MS } from '../layout/podiumLayout';
import {
  BONUS_SPARKLE,
  BURST_CAP,
  BURST_LIFE_MS,
  CONFETTI_CAP,
  CONFETTI_LIFE_MS,
  EVENT_PUFF,
  EVENT_SPARKLE,
  PUFF_CAP,
  RING_CAP,
  RING_LIFE_MS,
  RING_STAGGER_MS,
  burstPiece,
  confettiPiece,
  puffPiece,
  ringState,
  type BurstPiece,
  type FxPiece,
  type RingState,
} from '../layout/fxMotion';
import type { PawnSlot, StandPoint } from '../layout/pawnSlots';
import { FX_COLOR } from '../palette';
import { prefersReducedMotion } from '../reducedMotion';
import { usePresentation } from '../usePresentation';
import { commit } from './Board';
import { GEO } from './geometries';

// ── Module-scope shared GPU objects (created once, never disposed) ──────────────────────────────
export const FX_GEO = {
  confetti: new PlaneGeometry(0.07, 0.12), // thin paper slip
  burst: GEO.star, // the Phase 6 tile star, shared
  ring: new RingGeometry(0.9, 1.0, 48), // unit outer radius, scaled per instance
  puff: new IcosahedronGeometry(0.12, 0), // round little cloud
} as const;

export const FX_MAT = {
  confetti: new MeshBasicMaterial({ color: '#FFFFFF', side: DoubleSide }),
  burst: new MeshBasicMaterial({ color: '#FFFFFF' }),
  // Rings share one fading opacity (both rings of one effect end together).
  ring: new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, depthWrite: false, opacity: 0.9 }),
  puff: new MeshBasicMaterial({ color: '#FFFFFF' }),
} as const;

const colors = (list: readonly string[]) => list.map((h) => new Color(h));
const PAL = {
  confetti: colors(FX_COLOR.confetti),
  confettiGold: colors(FX_COLOR.confettiGold),
  burstSun: colors([FX_COLOR.burst]),
  burstAlt: colors([FX_COLOR.burst, FX_COLOR.burstAlt]),
  sparkle: colors(FX_COLOR.sparkle),
  ringWhite: colors([FX_COLOR.ring]),
  ringGold2: colors([FX_COLOR.ring, FX_COLOR.ringGold, FX_COLOR.ring]), // ⭐3: the second ring is gold
  ringGold: colors([FX_COLOR.ringGold]), // ceremony intro: one gold ring
  puff: colors([FX_COLOR.puff, FX_COLOR.puffAlt, FX_COLOR.puff, FX_COLOR.puffAlt, FX_COLOR.puff]), // 60 / 40
} as const;
type PalKey = keyof typeof PAL;

// Frame scratch (module scope: zero allocation per frame).
const D = new Object3D();
const PIECE: FxPiece = { x: 0, y: 0, z: 0, rx: 0, ry: 0, scale: 0 };
const BURST: BurstPiece = { x: 0, y: 0, r: 0, angle: 0, scale: 0 };
const RING: RingState = { alive: false, radius: 0, inner: 0.9, opacity: 0 };
const RIGHT = new Vector3();
const UP = new Vector3();

const CENTER: PawnSlot = { dx: 0, dz: 0, scale: 1 };
const RING_LIFT = 0.02; // above the tile top
const BURST_LIFT = 0.4; // star burst height above the tile top (UI-SPEC F2)
const BONUS_LIFT = 0.3; // start-bonus sparkles around the feet
const EVENT_LIFT = 0.5; // lucky-event sparkles above the event tile
const PUFF_LIFT = 0.1;
// Ceremony intro (D-16): 140 gold confetti from the winners' head height over the tier top center,
// one gold ring on the tier top; ⭐3 confetti motion (life 1150 ms), so it all ends by ≈ 1350 ms.
const INTRO_CONFETTI = 140;
const INTRO_TIER = 3;
const INTRO_RING_LIFT = 0.02;

function writeColors(mesh: InstancedMesh, list: readonly Color[], cap: number): void {
  for (let i = 0; i < cap; i++) mesh.setColorAt(i, list[i % list.length]);
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

type Fill = { confetti: PalKey; burst: PalKey; ring: PalKey };

// Refill a pool's instance colors only when its color set changes (tier / effect kind).
function refill(fill: Fill, mesh: InstancedMesh, pool: keyof Fill, key: PalKey, cap: number): void {
  if (fill[pool] === key) return;
  fill[pool] = key;
  writeColors(mesh, PAL[key], cap);
}

// n burst stars / sparkles around (ox, cy, oz) in the camera's billboard plane, facing the camera.
function writeBurst(
  mesh: InstancedMesh,
  q: Quaternion,
  n: number,
  t: number,
  radius: number,
  life: number,
  seed: number,
  ox: number,
  cy: number,
  oz: number,
): void {
  RIGHT.set(1, 0, 0).applyQuaternion(q);
  UP.set(0, 1, 0).applyQuaternion(q);
  for (let i = 0; i < n; i++) {
    burstPiece(i, n, t, radius, seed, life, BURST);
    D.quaternion.copy(q);
    D.position.set(
      ox + RIGHT.x * BURST.x + UP.x * BURST.y,
      cy + RIGHT.y * BURST.x + UP.y * BURST.y,
      oz + RIGHT.z * BURST.x + UP.z * BURST.y,
    );
    D.scale.setScalar(BURST.scale);
    D.updateMatrix();
    mesh.setMatrixAt(i, D.matrix);
  }
}

// Active pools publish every frame; an idle pool publishes once when it drops to 0.
function publish(mesh: InstancedMesh, n: number): void {
  if (n > 0 || mesh.count !== 0) commit(mesh, n);
}

export interface CeremonyFx {
  introId: number;
  introActive: boolean;
  origin: readonly [number, number, number]; // tier top center
  ringRadius: number; // = tier width
}

export interface FxPoolsProps {
  points: readonly StandPoint[];
  slots: Readonly<Record<string, PawnSlot>>;
  ceremony?: CeremonyFx | null;
}

export default function FxPools({ points, slots, ceremony = null }: FxPoolsProps) {
  const confetti = useRef<InstancedMesh>(null);
  const burst = useRef<InstancedMesh>(null);
  const ring = useRef<InstancedMesh>(null);
  const puff = useRef<InstancedMesh>(null);
  const camera = useThree((s) => s.camera);
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const clock = useRef({ id: -1, ms: 0 });
  const intro = useRef({ id: -1, ms: 0 }); // ceremony intro clock
  // Latest ceremony prop for the frame loop (frames can run before React re-renders).
  const cer = useRef(ceremony);
  cer.current = ceremony;
  // Current color fill per pool, so a refill happens only when the tier / effect kind changes.
  const fill = useRef<Fill>({
    confetti: 'confetti',
    burst: 'burstSun',
    ring: 'ringWhite',
  });

  // Mount: preset every instance color (creates instanceColor once) and start idle.
  useLayoutEffect(() => {
    const c = confetti.current;
    const b = burst.current;
    const r = ring.current;
    const p = puff.current;
    if (!c || !b || !r || !p) return;
    writeColors(c, PAL[fill.current.confetti], CONFETTI_CAP);
    writeColors(b, PAL[fill.current.burst], BURST_CAP);
    writeColors(r, PAL[fill.current.ring], RING_CAP);
    writeColors(p, PAL.puff, PUFF_CAP);
    for (const m of [c, b, r, p]) commit(m, 0);
  }, []);

  useFrame((_, delta) => {
    const c = confetti.current;
    const b = burst.current;
    const r = ring.current;
    const p = puff.current;
    if (!c || !b || !r || !p) return;
    const d = Math.min(delta, 0.25);
    const store = usePresentation.getState();
    const cur = store.current;
    if (cur && cur.id !== clock.current.id) {
      clock.current.id = cur.id;
      clock.current.ms = 0;
    }
    clock.current.ms += d * 1000;
    const ms = clock.current.ms;

    let nC = 0;
    let nB = 0;
    let nR = 0;
    let nP = 0;

    const cm = cer.current;
    if (cm) {
      // Ceremony: only the intro may emit (no beats run then).
      if (!reduced && cm.introActive) {
        if (cm.introId !== intro.current.id) {
          intro.current.id = cm.introId;
          intro.current.ms = 0;
        }
        intro.current.ms += d * 1000;
        const t = intro.current.ms - INTRO_JUMP_AT_MS;
        if (t >= 0) {
          const [ox, oy, oz] = cm.origin;
          const f = fill.current;
          const seed = cm.introId;
          if (t < CONFETTI_LIFE_MS[INTRO_TIER]) {
            refill(f, c, 'confetti', 'confettiGold', CONFETTI_CAP);
            nC = Math.min(INTRO_CONFETTI, CONFETTI_CAP);
            const headY = oy + HEAD_TOP;
            const floor = GROUND_HEIGHT + RING_LIFT;
            for (let i = 0; i < nC; i++) {
              confettiPiece(i, t, seed, INTRO_TIER, PIECE);
              D.position.set(ox + PIECE.x, Math.max(floor, headY + PIECE.y), oz + PIECE.z);
              D.rotation.set(PIECE.rx, PIECE.ry, 0);
              D.scale.setScalar(PIECE.scale);
              D.updateMatrix();
              c.setMatrixAt(i, D.matrix);
            }
          }
          if (t < RING_LIFE_MS) {
            refill(f, r, 'ring', 'ringGold', RING_CAP);
            ringState(t, cm.ringRadius, 0, RING);
            FX_MAT.ring.opacity = RING.opacity;
            nR = 1;
            D.position.set(ox, oy + INTRO_RING_LIFT, oz);
            D.rotation.set(-Math.PI / 2, 0, 0);
            D.scale.setScalar(RING.alive ? RING.radius : 0);
            D.updateMatrix();
            r.setMatrixAt(0, D.matrix);
          }
        }
      }
    } else if (!reduced && cur && (cur.kind === 'stars' || cur.kind === 'startBonus' || cur.kind === 'event')) {
      const at = points[store.displayed.positions[cur.pid] ?? 0] ?? points[0];
      const slot = slots[cur.pid] ?? CENTER;
      if (at) {
        const ox = at.x + slot.dx;
        const oz = at.z + slot.dz;
        const floor = at.y;
        const seed = cur.id;

        const q = camera.quaternion;
        const f = fill.current;

        if (cur.kind === 'stars') {
          const plan = successPlan(cur.stars, cur.ms, false);
          const t = ms - plan.landMs;
          if (t >= 0) {
            const tier = plan.tier;
            if (t < CONFETTI_LIFE_MS[tier]) {
              refill(f, c, 'confetti', plan.gold ? 'confettiGold' : 'confetti', CONFETTI_CAP);
              nC = Math.min(plan.confetti, CONFETTI_CAP);
              const headY = floor + HEAD_TOP * slot.scale;
              for (let i = 0; i < nC; i++) {
                confettiPiece(i, t, seed, tier, PIECE);
                D.position.set(ox + PIECE.x, Math.max(floor + RING_LIFT, headY + PIECE.y), oz + PIECE.z);
                D.rotation.set(PIECE.rx, PIECE.ry, 0);
                D.scale.setScalar(PIECE.scale);
                D.updateMatrix();
                c.setMatrixAt(i, D.matrix);
              }
            }
            if (t < BURST_LIFE_MS) {
              refill(f, b, 'burst', tier === 3 ? 'burstAlt' : 'burstSun', BURST_CAP);
              nB = Math.min(plan.burst, BURST_CAP);
              writeBurst(b, q, nB, t, plan.burstRadius, BURST_LIFE_MS, seed, ox, floor + BURST_LIFT, oz);
            }
            if (t < RING_LIFE_MS) {
              refill(f, r, 'ring', plan.gold ? 'ringGold2' : 'ringWhite', RING_CAP);
              nR = Math.min(plan.rings, RING_CAP);
              // The instanced RingGeometry keeps its 0.9 inner ratio (instances cannot change vertex
              // radii); the shared opacity fade carries the "thinning" feel (RingState.inner unused).
              FX_MAT.ring.opacity = ringState(t, plan.ringRadius, 0, RING).opacity;
              for (let k = 0; k < nR; k++) {
                ringState(t, plan.ringRadius, k * RING_STAGGER_MS, RING);
                D.position.set(ox, floor + RING_LIFT, oz);
                D.rotation.set(-Math.PI / 2, 0, 0);
                D.scale.setScalar(RING.alive ? RING.radius : 0);
                D.updateMatrix();
                r.setMatrixAt(k, D.matrix);
              }
            }
          }
        } else if (cur.kind === 'startBonus') {
          const t = ms - BONUS_SPARKLE.startMs;
          if (t >= 0 && t < BONUS_SPARKLE.lifeMs) {
            refill(f, b, 'burst', 'burstSun', BURST_CAP);
            nB = BONUS_SPARKLE.count;
            writeBurst(b, q, nB, t, BONUS_SPARKLE.radius, BONUS_SPARKLE.lifeMs, seed, ox, floor + BONUS_LIFT, oz);
          }
        } else if (isLuckyEvent({ eff: cur.eff, label: cur.label }, cur.suppressed)) {
          const t = ms - EVENT_SPARKLE.startMs;
          if (t >= 0 && t < EVENT_SPARKLE.lifeMs) {
            refill(f, b, 'burst', 'sparkle', BURST_CAP);
            nB = EVENT_SPARKLE.count;
            writeBurst(b, q, nB, t, EVENT_SPARKLE.radius, EVENT_SPARKLE.lifeMs, seed, ox, floor + EVENT_LIFT, oz);
          }
        } else {
          const t = ms - EVENT_PUFF.startMs;
          if (t >= 0 && t < EVENT_PUFF.lifeMs) {
            nP = EVENT_PUFF.count;
            for (let i = 0; i < nP; i++) {
              puffPiece(i, nP, t, seed, PIECE);
              D.position.set(ox + PIECE.x, floor + PUFF_LIFT + PIECE.y, oz + PIECE.z);
              D.rotation.set(0, 0, 0);
              D.scale.setScalar(PIECE.scale);
              D.updateMatrix();
              p.setMatrixAt(i, D.matrix);
            }
          }
        }
      }
    }

    publish(c, nC);
    publish(b, nB);
    publish(r, nR);
    publish(p, nP);
  });

  return (
    <>
      <instancedMesh
        ref={confetti}
        name="fx-confetti"
        args={[FX_GEO.confetti, FX_MAT.confetti, CONFETTI_CAP]}
        dispose={null}
        frustumCulled={false}
      />
      <instancedMesh
        ref={burst}
        name="fx-burst"
        args={[FX_GEO.burst, FX_MAT.burst, BURST_CAP]}
        dispose={null}
        frustumCulled={false}
      />
      <instancedMesh
        ref={ring}
        name="fx-ring"
        args={[FX_GEO.ring, FX_MAT.ring, RING_CAP]}
        dispose={null}
        frustumCulled={false}
      />
      <instancedMesh
        ref={puff}
        name="fx-puff"
        args={[FX_GEO.puff, FX_MAT.puff, PUFF_CAP]}
        dispose={null}
        frustumCulled={false}
      />
    </>
  );
}
