// src/game/scene/chibiSpecies.ts — the 8 code-built chibi animals' static nodes and shared materials (D-01..D-03, D-06, D-18, D-20, CHAR-01).
// Every animal is built from code primitives only (sphere, capsule, cone, torus, circle, ring,
// cylinder) — no model, texture or image file (D-01). The body and head main color is
// ANIMAL_COLOR[animal], the scoreboard avatar color (only the panda's head is white); every other
// color comes from CHAR_COLOR. Animals differ by silhouette — ears, muzzle, tail, beak — not by
// color (D-02, UI-SPEC C2).
// One character = 6 static nodes here + 1 face (chibiFaces.ts) = 7 draw calls (D-20): each node is
// one merged vertex-color geometry (chibiParts `part` → `bake`) drawn with one shared material.
// Frames (UI-SPEC C1): ground and torso in the character frame (feet at y 0, face toward +Z); each
// arm in its shoulder-pivot frame, hanging along −Y with the top of the capsule centered on the
// pivot; head and ears in the head-center frame, so ears rotating about the head center stay on it.
// The tail is merged into the torso and moves with it (a separate tail would break the 100 budget).
// Outline = inverted hull in the same geometry: HULL_HEAD on head and ears, HULL_LIMB on arms, feet,
// tails and muzzles, none on the torso (HULL_TORSO) and on surface parts (Pitfall 6).
// Nodes are built on first use, cached for the app's lifetime and never disposed (Phase 6 Pitfall 9).
// The numbers below are START values from UI-SPEC C2; 07-05 may tune each by at most ±0.02 after the
// gallery check. This module lives in the lazy 3D chunk, so it may import three at runtime.
import {
  CapsuleGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Matrix4,
} from 'three';
import type { AnimalId } from '../../engine/animals';
import {
  ARM_LEN,
  ARM_R,
  BELLY_R,
  BLOB_ALPHA,
  BLOB_R,
  BODY_R,
  BODY_SCALE_Z,
  BODY_Y,
  FOOT_R,
  FOOT_SCALE,
  FOOT_X,
  FOOT_Y,
  FOOT_Z,
  GROUND_DISC_R,
  GROUND_DISC_Y,
  GROUND_RIM_R,
  GROUND_SHADOW_Y,
  HEAD_A,
  HEAD_B,
  HEAD_C,
  HULL_HEAD,
  HULL_LIMB,
  HULL_TORSO,
} from '../layout/chibiDims';
import { ANIMAL_COLOR, CHAR_COLOR, SCENE_COLOR } from '../palette';
import { bake, hull, M, onSurface, part, surfaceZ, type Ellipsoid } from './chibiParts';

// ── Shared materials (UI-SPEC "재질·조명") ──────────────────────────────────────────────────
// One glossy toy-plastic material for every character node; the vertex colors carry the palette.
export const CHAR_MAT = new MeshStandardMaterial({
  vertexColors: true,
  color: new Color(CHAR_COLOR.white),
  roughness: 0.32,
  metalness: 0.05,
});
// Ground disc + blob shadow: color itemSize 4 (disc α 1, shadow α BLOB_ALPHA) turns on vertexAlphas.
export const GROUND_MAT = new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });

export interface ChibiNodes {
  ground: BufferGeometry;
  torso: BufferGeometry;
  armL: BufferGeometry;
  armR: BufferGeometry;
  head: BufferGeometry;
  ears: BufferGeometry;
}

const INK = CHAR_COLOR.ink;
const SIDES = [-1, 1] as const;

// Unit primitives scaled per part by the matrix (capsules, cones and tori keep their own sizes,
// since scaling would distort their caps and tubes).
const SPHERE = new SphereGeometry(1, 28, 20); // head and trunk
const SPHERE_MID = new SphereGeometry(1, 20, 14); // ears, muzzles, the fox tail
const SPHERE_LO = new SphereGeometry(1, 14, 10); // small parts
const capsule = (r: number, len: number) => new CapsuleGeometry(r, len, 6, 14);
const cone = (r: number, h: number) => new ConeGeometry(r, h, 18);

// Head and body as surfaces for face, patch and belly placement.
export const HEAD_E: Ellipsoid = { x: 0, y: 0, z: 0, a: HEAD_A, b: HEAD_B, c: HEAD_C };
const BODY_E: Ellipsoid = { x: 0, y: BODY_Y, z: 0, a: BODY_R, b: BODY_R, c: BODY_R * BODY_SCALE_Z };

// A part plus its outline hull.
const outlined = (p: BufferGeometry, scale: number): BufferGeometry[] => [p, hull(p, scale, INK)];

// A tube (torus arc) with round end caps and an outline made from a fattened copy of the same arc
// (scaling a torus about its center would shift the outline off the tube instead of thickening it).
function tube(hex: string, R: number, r: number, arc: number, m: Matrix4, outline = true): BufferGeometry[] {
  const out: BufferGeometry[] = [];
  const ends = [0, arc].map((t) => [R * Math.cos(t), R * Math.sin(t)] as const);
  const layers = outline ? [r * (1 + 2 * (HULL_LIMB - 1)) + 0.006, r] : [r];
  layers.forEach((rr, k) => {
    const ring = part(new TorusGeometry(R, rr, 8, 24, arc), hex, m);
    const caps = ends.map(([x, y]) => part(SPHERE_LO, hex, m.clone().multiply(M(x, y, 0, rr, rr, rr))));
    if (outline && k === 0) out.push(...[ring, ...caps].map((g) => hull(g, 1, INK)));
    else out.push(ring, ...caps);
  });
  return out;
}

// Inner-ear cone inset inside an outer cone (r, h) of the same slant: scaled by s, shifted down and
// forward so only its front face shows, just in front of the outer cone's front line.
function insetCone(r: number, h: number, s: number): Matrix4 {
  const cy = -h * (1 - s) * 0.3;
  const cz = (r * (h / 2 - cy - (h / 2) * s)) / h + 0.006;
  return M(0, cy, cz, s * 0.9, s, s);
}

// A flattened inner disc on the front of a round ear of radius r and depth c at (x, y, z).
const roundInner = (hex: string, x: number, y: number, z: number, c: number, ri: number) =>
  part(SPHERE_LO, hex, M(x, y, z + c - 0.4 * ri * 0.35, ri, ri, ri * 0.35));

// ── Muzzles (head-local): sphere r × scale centered at (0, y, surface − sink) ───────────────
interface MuzzleSpec {
  r: number;
  s: readonly [number, number, number];
  y: number;
  sink: number;
}
const MUZZLE: Partial<Record<AnimalId, MuzzleSpec>> = {
  bear: { r: 0.09, s: [1.25, 0.85, 0.7], y: -0.1, sink: 0.05 },
  dog: { r: 0.09, s: [1.3, 0.8, 0.7], y: -0.1, sink: 0.05 },
  fox: { r: 0.11, s: [1.4, 0.8, 0.6], y: -0.1, sink: 0.05 },
};
const muzzleE = (m: MuzzleSpec): Ellipsoid => ({
  x: 0,
  y: m.y,
  z: surfaceZ(0, m.y, HEAD_A, HEAD_B, HEAD_C, -m.sink),
  a: m.r * m.s[0],
  b: m.r * m.s[1],
  c: m.r * m.s[2],
});

// ── Per-species start values (UI-SPEC C2) ───────────────────────────────────────────────────
// Bear: light round muzzle, round ears with light insides, round tail.
const BEAR_NOSE_R = 0.03;
const BEAR_NOSE_DY = 0.035; // above the muzzle center
const BEAR_EAR = { r: 0.085, x: 0.2, y: 0.2, z: -0.02, depth: 0.6, inner: 0.05 } as const;
const BEAR_TAIL = { r: 0.05, y: 0.14, z: -0.18 } as const;
// Rabbit: long V ears leaning back with pink insides, cotton tail.
const RABBIT_NOSE = { r: 0.02, y: -0.06 } as const;
// D-17a(3): len 0.22 → 0.15 and y 0.36 → 0.31 (inner len 0.17 → 0.11) so a front-row rabbit's ears
// stop covering the faces behind it (faceOcclusion.test.tsx); still the longest ears (chibi.test.tsx).
const RABBIT_EAR = { r: 0.06, len: 0.15, x: 0.1, y: 0.31, z: -0.04, splay: 0.12, back: 0.25 } as const;
const RABBIT_INNER = { r: 0.036, len: 0.11 } as const;
const RABBIT_TAIL = { r: 0.07, y: 0.12, z: -0.19 } as const;
// Cat: triangle ears with pink insides, thin tail curling up at the side.
const CAT_NOSE = { r: 0.022, y: -0.06 } as const;
const CAT_EAR = { r: 0.085, h: 0.15, x: 0.17, y: 0.25, splay: 0.35, inner: 0.62 } as const;
const CAT_TAIL = { R: 0.12, r: 0.028, x: 0.2, y: 0.2, z: -0.12, start: 1.25 * Math.PI, arc: 0.9 * Math.PI } as const;
// Dog: light muzzle with a big nose, dark floppy ears, short tail up and back.
const DOG_NOSE_R = 0.035;
const DOG_NOSE_DY = 0.035;
// 07-05 gallery tuning made them r 0.11 at x 0.29 to clear the head sides. 07-VERIFICATION (SC4): that
// wide ear hid the face behind a dog 2-4 × as much as any other animal's ears. Now narrower and
// longer (r 0.1 × (0.5, 1.4), x 0.27, y 0.05, tilt 0.25): they still hang well below the head center
// as long floppy ears, but stick out less to the side (faceOrders.*.test.tsx).
const DOG_EAR = { r: 0.1, s: [0.5, 1.4, 0.45] as const, x: 0.27, y: 0.05, tilt: 0.25 } as const;
const DOG_TAIL = { r: 0.035, len: 0.07, y: 0.27, z: -0.19, back: 0.7 } as const;
// Panda: white head, ink drop-shaped eye patches, ink round ears, ink tail.
export const PANDA_PATCH = { r: 0.07, s: [0.85, 1.15, 0.35] as const, x: 0.105, y: -0.03, tilt: 0.5 } as const;
const PANDA_NOSE = { r: 0.025, y: -0.075 } as const;
const PANDA_EAR = { r: 0.08, x: 0.2, y: 0.2, z: -0.02, depth: 0.6 } as const;
const PANDA_TAIL = { r: 0.045, y: 0.14, z: -0.18 } as const;
// Fox: white muzzle, pointed ears with cream insides, thick white-tipped tail sweeping out.
const FOX_NOSE_R = 0.025;
const FOX_EAR = { r: 0.09, h: 0.2, x: 0.17, y: 0.25, splay: 0.3, inner: 0.62 } as const;
const FOX_TAIL = { r: 0.11, s: [0.8, 0.8, 1.6] as const, x: 0.12, y: 0.16, z: -0.24, turn: -0.5, tip: 0.07 } as const;
// Pig: flat snout with two nostrils, small triangle ears folded forward, curly tail.
export const PIG_SNOUT = { r: 0.068, h: 0.06, y: -0.09 } as const;
const PIG_NOSTRIL = { r: 0.016, s: [1, 1.3, 0.4] as const, x: 0.025 } as const;
const PIG_EAR = { r: 0.07, h: 0.1, x: 0.17, y: 0.22, splay: 0.5, fold: 0.4 } as const;
const PIG_TAIL = { R: 0.04, r: 0.012, y: 0.2, z: -0.19, arc: 1.6 * Math.PI } as const;
// Chick: beak, three head feathers (no ears), small flat wings, tail feather.
const CHICK_BEAK = { r: 0.05, h: 0.08, y: -0.07 } as const;
const CHICK_FEATHER = { r: 0.025, len: 0.1, y: 0.23, fan: 0.4 } as const;
const CHICK_WING = { r: 0.08, s: [0.5, 1, 0.9] as const, y: -0.06 } as const;
const CHICK_TAIL = { r: 0.05, h: 0.08, y: 0.25, z: -0.18, back: 1.0 } as const;
// Belly patch: bear / dog / panda, on the body front surface.
const BELLY_Y = 0.2;
const BELLY_SINK = 0.02;
const BELLY: Partial<Record<AnimalId, string>> = {
  bear: CHAR_COLOR.bearMuzzle,
  dog: CHAR_COLOR.dogMuzzle,
  panda: CHAR_COLOR.white,
};

// ── Ground: blob shadow + ink rim + participant-color disc, laid flat (D-18, D-06) ─────────
function ground(animal: AnimalId): BufferGeometry {
  const flat = (y: number) => M(0, y, 0, 1, 1, 1, -Math.PI / 2);
  return bake(`${animal}:ground`, [
    part(new CircleGeometry(BLOB_R, 32), SCENE_COLOR.shadow, flat(GROUND_SHADOW_Y), BLOB_ALPHA),
    part(new RingGeometry(GROUND_DISC_R, GROUND_RIM_R, 40), INK, flat(GROUND_DISC_Y), 1),
    part(new CircleGeometry(GROUND_DISC_R, 40), ANIMAL_COLOR[animal], flat(GROUND_DISC_Y), 1),
  ]);
}

// ── Torso: body + belly + feet + tail ───────────────────────────────────────────────────────
function tail(animal: AnimalId, body: string): BufferGeometry[] {
  const ball = (hex: string, r: number, y: number, z: number) => outlined(part(SPHERE_LO, hex, M(0, y, z, r, r, r)), HULL_LIMB);
  switch (animal) {
    case 'bear':
      return ball(body, BEAR_TAIL.r, BEAR_TAIL.y, BEAR_TAIL.z);
    case 'rabbit':
      return ball(CHAR_COLOR.white, RABBIT_TAIL.r, RABBIT_TAIL.y, RABBIT_TAIL.z);
    case 'panda':
      return ball(INK, PANDA_TAIL.r, PANDA_TAIL.y, PANDA_TAIL.z);
    case 'cat': {
      const t = CAT_TAIL;
      return tube(body, t.R, t.r, t.arc, M(t.x, t.y, t.z, 1, 1, 1, 0, 0, t.start));
    }
    case 'dog': {
      const t = DOG_TAIL;
      return outlined(part(capsule(t.r, t.len), body, M(0, t.y, t.z, 1, 1, 1, -t.back)), HULL_LIMB);
    }
    case 'fox': {
      const t = FOX_TAIL;
      const m = M(t.x, t.y, t.z, t.r * t.s[0], t.r * t.s[1], t.r * t.s[2], 0, t.turn);
      // The white tip sits on the far end of the tail's long axis (local −Z).
      const tip = m.clone().multiply(M(0, 0, -0.75, t.tip / (t.r * t.s[0]), t.tip / (t.r * t.s[1]), t.tip / (t.r * t.s[2])));
      return [...outlined(part(SPHERE_MID, body, m), HULL_LIMB), part(SPHERE_LO, CHAR_COLOR.white, tip)];
    }
    case 'pig': {
      const t = PIG_TAIL;
      return tube(body, t.R, t.r, t.arc, M(0, t.y, t.z, 1, 1, 1, 0, Math.PI));
    }
    case 'chick': {
      const t = CHICK_TAIL;
      return outlined(part(cone(t.r, t.h), CHAR_COLOR.feather, M(0, t.y, t.z, 1, 1, 1, -t.back)), HULL_LIMB);
    }
  }
}

function torso(animal: AnimalId): BufferGeometry {
  const body = ANIMAL_COLOR[animal];
  const trunk = part(SPHERE, body, M(0, BODY_Y, 0, BODY_E.a, BODY_E.b, BODY_E.c));
  const parts = HULL_TORSO === null ? [trunk] : outlined(trunk, HULL_TORSO);
  const belly = BELLY[animal];
  if (belly) {
    parts.push(part(SPHERE_LO, belly, onSurface(BODY_E, 0, BELLY_Y, -BELLY_SINK, BELLY_R, BELLY_R * 1.1, BELLY_R * 0.35)));
  }
  for (const s of SIDES) {
    const foot = part(SPHERE_LO, body, M(s * FOOT_X, FOOT_Y, FOOT_Z, FOOT_R * FOOT_SCALE[0], FOOT_R * FOOT_SCALE[1], FOOT_R * FOOT_SCALE[2]));
    parts.push(...outlined(foot, HULL_LIMB));
  }
  parts.push(...tail(animal, body));
  return bake(`${animal}:torso`, parts);
}

// ── Arms (shoulder-pivot frame): body-color capsule, ink for the panda, flat wings for the chick ──
function arm(animal: AnimalId, side: 'L' | 'R'): BufferGeometry {
  const p =
    animal === 'chick'
      ? part(SPHERE_LO, CHAR_COLOR.feather, M(0, CHICK_WING.y, 0, CHICK_WING.r * CHICK_WING.s[0], CHICK_WING.r * CHICK_WING.s[1], CHICK_WING.r * CHICK_WING.s[2]))
      : part(capsule(ARM_R, ARM_LEN), animal === 'panda' ? INK : ANIMAL_COLOR[animal], M(0, -ARM_LEN / 2, 0));
  return bake(`${animal}:arm${side}`, outlined(p, HULL_LIMB));
}

// ── Head (head-center frame): head ellipsoid + muzzle / nose / patches / beak ──────────────
function headExtras(animal: AnimalId): BufferGeometry[] {
  const nose = (e: Ellipsoid, y: number, r: number) =>
    part(SPHERE_LO, INK, onSurface(e, 0, y, -r * 0.35, r * 1.25, r * 0.9, r * 0.8));
  const muzzle = (hex: string) => {
    const e = muzzleE(MUZZLE[animal]!);
    return { e, parts: outlined(part(SPHERE_MID, hex, M(e.x, e.y, e.z, e.a, e.b, e.c)), HULL_LIMB) };
  };
  switch (animal) {
    case 'bear': {
      const { e, parts } = muzzle(CHAR_COLOR.bearMuzzle);
      return [...parts, nose(e, e.y + BEAR_NOSE_DY, BEAR_NOSE_R)];
    }
    case 'dog': {
      const { e, parts } = muzzle(CHAR_COLOR.dogMuzzle);
      return [...parts, nose(e, e.y + DOG_NOSE_DY, DOG_NOSE_R)];
    }
    case 'fox': {
      const { e, parts } = muzzle(CHAR_COLOR.white);
      return [...parts, nose(e, e.y + e.b * 0.25, FOX_NOSE_R)];
    }
    case 'rabbit':
    case 'cat': {
      const n = animal === 'rabbit' ? RABBIT_NOSE : CAT_NOSE;
      return [part(SPHERE_LO, CHAR_COLOR.tongue, onSurface(HEAD_E, 0, n.y, -n.r * 0.3, n.r * 1.2, n.r, n.r * 0.7))];
    }
    case 'panda': {
      const p = PANDA_PATCH;
      const patches = SIDES.map((s) =>
        part(SPHERE_LO, INK, onSurface(HEAD_E, s * p.x, p.y, 0, p.r * p.s[0], p.r * p.s[1], p.r * p.s[2], s * p.tilt)),
      );
      return [...patches, nose(HEAD_E, PANDA_NOSE.y, PANDA_NOSE.r)];
    }
    case 'pig': {
      const sn = PIG_SNOUT;
      const at = onSurface(HEAD_E, 0, sn.y, 0);
      const snout = part(new CylinderGeometry(sn.r, sn.r, sn.h, 24), CHAR_COLOR.pigNose, at.clone().multiply(M(0, 0, 0, 1, 1, 1, Math.PI / 2)));
      const n = PIG_NOSTRIL;
      const nostrils = SIDES.map((s) =>
        part(SPHERE_LO, INK, at.clone().multiply(M(s * n.x, 0, sn.h / 2, n.r * n.s[0], n.r * n.s[1], n.r * n.s[2]))),
      );
      return [snout, ...nostrils];
    }
    case 'chick': {
      const b = CHICK_BEAK;
      const beak = part(cone(b.r, b.h), CHAR_COLOR.beak, onSurface(HEAD_E, 0, b.y, b.h * 0.25).multiply(M(0, 0, 0, 1, 1, 1, Math.PI / 2)));
      return outlined(beak, HULL_LIMB);
    }
  }
}

function head(animal: AnimalId): BufferGeometry {
  const skin = animal === 'panda' ? CHAR_COLOR.white : ANIMAL_COLOR[animal];
  const h = part(SPHERE, skin, M(0, 0, 0, HEAD_A, HEAD_B, HEAD_C));
  return bake(`${animal}:head`, [...outlined(h, HULL_HEAD), ...headExtras(animal)]);
}

// ── Ears (head-center frame); the chick gets three head feathers instead ───────────────────
function ears(animal: AnimalId): BufferGeometry {
  const body = ANIMAL_COLOR[animal];
  const parts: BufferGeometry[] = [];
  type ConeEar = { r: number; h: number; x: number; y: number; splay: number; inner?: number; fold?: number };
  const coneEar = (e: ConeEar, hex: string, inner: string | null, s: number) => {
    const m = M(s * e.x, e.y, 0, 1, 1, 1, e.fold ?? 0, 0, -s * e.splay);
    parts.push(...outlined(part(cone(e.r, e.h), hex, m), HULL_HEAD));
    if (inner && e.inner) parts.push(part(cone(e.r, e.h), inner, m.clone().multiply(insetCone(e.r, e.h, e.inner))));
  };
  for (const s of SIDES) {
    switch (animal) {
      case 'bear':
      case 'panda': {
        const e = animal === 'bear' ? BEAR_EAR : PANDA_EAR;
        const hex = animal === 'bear' ? body : INK;
        const c = e.r * e.depth;
        parts.push(...outlined(part(SPHERE_MID, hex, M(s * e.x, e.y, e.z, e.r, e.r, c)), HULL_HEAD));
        if (animal === 'bear') parts.push(roundInner(CHAR_COLOR.bearMuzzle, s * e.x, e.y, e.z, c, BEAR_EAR.inner));
        break;
      }
      case 'rabbit': {
        const e = RABBIT_EAR;
        const m = M(s * e.x, e.y, e.z, 1, 1, 1, -e.back, 0, -s * e.splay);
        parts.push(...outlined(part(capsule(e.r, e.len), body, m), HULL_HEAD));
        const zi = e.r - RABBIT_INNER.r * 0.4 * 0.5;
        parts.push(part(capsule(RABBIT_INNER.r, RABBIT_INNER.len), CHAR_COLOR.cheek, m.clone().multiply(M(0, -0.01, zi, 1, 1, 0.4))));
        break;
      }
      case 'cat':
        coneEar(CAT_EAR, body, CHAR_COLOR.cheek, s);
        break;
      case 'fox':
        coneEar(FOX_EAR, body, CHAR_COLOR.cream, s);
        break;
      case 'pig':
        coneEar(PIG_EAR, CHAR_COLOR.pigNose, null, s);
        break;
      case 'dog': {
        const e = DOG_EAR;
        const m = M(s * e.x, e.y, 0, e.r * e.s[0], e.r * e.s[1], e.r * e.s[2], 0, 0, s * e.tilt);
        parts.push(...outlined(part(SPHERE_MID, CHAR_COLOR.dogEar, m), HULL_HEAD));
        break;
      }
      case 'chick':
        break;
    }
  }
  if (animal === 'chick') {
    const f = CHICK_FEATHER;
    for (const k of [-1, 0, 1]) {
      // Fan out from a pivot on top of the head; the capsule's lower end sits on the pivot.
      const m = M(0, f.y, 0, 1, 1, 1, 0, 0, k * f.fan).multiply(M(0, f.len / 2 + f.r * 0.6, 0));
      parts.push(...outlined(part(capsule(f.r, f.len), CHAR_COLOR.feather, m), HULL_HEAD));
    }
  }
  return bake(`${animal}:ears`, parts);
}

const cache = new Map<AnimalId, ChibiNodes>();

// The six static nodes of one animal, built on first use and shared by every character of it.
export function chibiNodes(animal: AnimalId): ChibiNodes {
  let n = cache.get(animal);
  if (!n) {
    n = {
      ground: ground(animal),
      torso: torso(animal),
      armL: arm(animal, 'L'),
      armR: arm(animal, 'R'),
      head: head(animal),
      ears: ears(animal),
    };
    cache.set(animal, n);
  }
  return n;
}

// Where the closed mouth line sits (head-local): on the muzzle front for bear / dog / fox, on the head
// otherwise (UI-SPEC C2 last column). The chick has a mouth only on joy / winner / surprised.
const MOUTH_Y: Readonly<Record<AnimalId, number>> = {
  bear: -0.125,
  rabbit: -0.1,
  cat: -0.1,
  dog: -0.125,
  panda: -0.11,
  fox: -0.125,
  pig: -0.18,
  chick: -0.13,
};
export function mouthAnchor(animal: AnimalId): { e: Ellipsoid; y: number } {
  const m = MUZZLE[animal];
  return { e: m ? muzzleE(m) : HEAD_E, y: MOUTH_Y[animal] };
}
