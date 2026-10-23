// @vitest-environment node
// src/game/scene/chibi.test.tsx — the code-built chibi animals (D-01..D-03, D-07, D-09, D-18, D-20, CHAR-01/02).
// Runs in node (no WebGL): the geometry helpers, the 8 species nodes, the 9 faces per species, the
// shared materials and the view-only ChibiModel mounted with @react-three/test-renderer.
import { afterEach, describe, it, expect, vi } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { BufferGeometry, Color, Float32BufferAttribute, Mesh, SphereGeometry, Vector3, type Object3D } from 'three';
import { ANIMALS, type AnimalId } from '../../engine/animals';
import { REST } from '../layout/charMotion';
import { ARM_REST, FACE_KEYS, HEAD_B, HEAD_TILT, type FaceKey } from '../layout/chibiDims';
import { ANIMAL_COLOR, ANIMAL_EYE, CHAR_COLOR, SCENE_COLOR } from '../palette';
import { bake, hull, M, part, surfaceZ } from './chibiParts';
import { CHAR_MAT, GROUND_MAT, chibiNodes } from './chibiSpecies';
import { faceGeo } from './chibiFaces';
import ChibiModel, { applyPose, createChibiRig, type ChibiRig } from './ChibiModel';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const keys = (g: BufferGeometry) => Object.keys(g.attributes).sort();

// Indices of the vertices whose linear color is `hex` (and alpha, when given), within 1e-4.
function withColor(g: BufferGeometry, hex: string, alpha?: number): number[] {
  const c = new Color(hex);
  const col = g.attributes.color;
  const out: number[] = [];
  for (let i = 0; i < col.count; i++) {
    const ok =
      Math.abs(col.getX(i) - c.r) < 1e-4 &&
      Math.abs(col.getY(i) - c.g) < 1e-4 &&
      Math.abs(col.getZ(i) - c.b) < 1e-4 &&
      (alpha === undefined || Math.abs(col.getW(i) - alpha) < 1e-4);
    if (ok) out.push(i);
  }
  return out;
}
const hasColor = (g: BufferGeometry, hex: string, alpha?: number) => withColor(g, hex, alpha).length > 0;

const box = (g: BufferGeometry) => {
  g.computeBoundingBox();
  return g.boundingBox!;
};

describe('chibiParts', () => {
  it('part: non-indexed, no uv, linear vertex color with itemSize 3', () => {
    const g = part(new SphereGeometry(0.1, 8, 6), '#9C6644');
    expect(g.index).toBeNull();
    expect(keys(g)).toEqual(['color', 'normal', 'position']);
    expect(g.attributes.color.itemSize).toBe(3);
    const lin = new Color('#9C6644');
    expect(g.attributes.color.getX(0)).toBeCloseTo(lin.r, 6);
    expect(g.attributes.color.getX(0)).toBeCloseTo(0.3325, 3); // linear, not 0x9C / 255 = 0.61
    expect(g.attributes.color.count).toBe(g.attributes.position.count);
  });

  it('part: applies the matrix and writes the alpha as a 4th color component', () => {
    const src = new SphereGeometry(0.1, 8, 6);
    const plain = part(src, '#FFFFFF');
    const moved = part(src, '#FFFFFF', M(1, 2, 3, 2, 2, 2));
    const p0 = new Vector3().fromBufferAttribute(plain.attributes.position, 5);
    const p1 = new Vector3().fromBufferAttribute(moved.attributes.position, 5);
    expect(p1.x).toBeCloseTo(p0.x * 2 + 1, 6);
    expect(p1.y).toBeCloseTo(p0.y * 2 + 2, 6);
    expect(p1.z).toBeCloseTo(p0.z * 2 + 3, 6);

    const a = part(src, '#123A58', undefined, 0.22);
    expect(a.attributes.color.itemSize).toBe(4);
    const arr = a.attributes.color.array as Float32Array;
    for (let i = 3; i < arr.length; i += 4) expect(arr[i]).toBeCloseTo(0.22, 6);
  });

  it('hull: grown copy with reversed winding, negated normals and ink color', () => {
    const p = part(new SphereGeometry(0.2, 10, 8), '#FFFFFF');
    const h = hull(p, 1.05, '#173A57');
    expect(h.attributes.position.count).toBe(p.attributes.position.count);
    p.computeBoundingSphere();
    h.computeBoundingSphere();
    expect(h.boundingSphere!.radius).toBeCloseTo(p.boundingSphere!.radius * 1.05, 4);

    // Vertices 1 and 2 of each triangle are swapped; normals follow and are negated.
    const pn = p.attributes.normal;
    const hn = h.attributes.normal;
    const swap = (i: number) => (i % 3 === 1 ? i + 1 : i % 3 === 2 ? i - 1 : i);
    for (let i = 0; i < pn.count; i++) {
      const j = swap(i);
      expect(hn.getX(i)).toBeCloseTo(-pn.getX(j), 6);
      expect(hn.getY(i)).toBeCloseTo(-pn.getY(j), 6);
      expect(hn.getZ(i)).toBeCloseTo(-pn.getZ(j), 6);
    }
    // First triangle: the geometric face normal points the other way (winding reversed).
    const tri = (g: BufferGeometry) => {
      const [a, b, c] = [0, 1, 2].map((k) => new Vector3().fromBufferAttribute(g.attributes.position, k));
      return new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
    };
    const pf = tri(p);
    const hf = tri(h);
    if (pf.lengthSq() > 1e-12) expect(pf.dot(hf)).toBeLessThan(0);

    const ink = new Color('#173A57');
    const col = h.attributes.color.array as Float32Array;
    for (let i = 0; i < col.length; i += 3) {
      expect(col[i]).toBeCloseTo(ink.r, 6);
      expect(col[i + 1]).toBeCloseTo(ink.g, 6);
      expect(col[i + 2]).toBeCloseTo(ink.b, 6);
    }
  });

  it('surfaceZ: front z of the head ellipsoid, the lift alone outside it', () => {
    expect(surfaceZ(0, 0, 0.292, 0.254, 0.27, 0)).toBeCloseTo(0.27, 9);
    expect(surfaceZ(0, 0, 0.292, 0.254, 0.27, 0.01)).toBeCloseTo(0.28, 9);
    const out = surfaceZ(0.4, 0.3, 0.292, 0.254, 0.27, 0.005);
    expect(Number.isNaN(out)).toBe(false);
    expect(out).toBeCloseTo(0.005, 9);
  });

  it('bake: merges matching parts and throws a named error on a mismatch', () => {
    const a = part(new SphereGeometry(0.1, 8, 6), '#FFFFFF');
    const b = part(new SphereGeometry(0.05, 6, 4), '#173A57', M(0.2, 0, 0));
    const g = bake('x', [a, b]);
    expect(g.attributes.position.count).toBe(a.attributes.position.count + b.attributes.position.count);
    expect(keys(g)).toEqual(['color', 'normal', 'position']);

    const odd = new BufferGeometry();
    odd.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
    const silenced = console.error;
    console.error = () => {};
    try {
      expect(() => bake('x', [a, odd])).toThrow('chibi merge failed: x');
    } finally {
      console.error = silenced;
    }
  });
});

describe('chibiSpecies (D-01, D-02, D-18, D-20, CHAR-01)', () => {
  it('builds 6 mergeable nodes for every animal without a merge error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      for (const a of ANIMALS) {
        const n = chibiNodes(a);
        for (const [name, g] of Object.entries(n)) {
          expect(g, `${a}:${name}`).not.toBeNull();
          expect(g.index, `${a}:${name}`).toBeNull();
          expect(keys(g), `${a}:${name}`).toEqual(['color', 'normal', 'position']);
          expect(g.attributes.color.itemSize, `${a}:${name}`).toBe(name === 'ground' ? 4 : 3);
        }
        expect(chibiNodes(a)).toBe(n); // cached, built once
      }
      expect(err).not.toHaveBeenCalled();
    } finally {
      err.mockRestore();
    }
  });

  it('D-01: body color = ANIMAL_COLOR, only the panda head is white; ground = participant disc + shadow', () => {
    for (const a of ANIMALS) {
      const n = chibiNodes(a);
      expect(hasColor(n.torso, ANIMAL_COLOR[a]), `${a} torso`).toBe(true);
      if (a === 'panda') {
        expect(hasColor(n.head, CHAR_COLOR.white)).toBe(true);
        expect(hasColor(n.head, CHAR_COLOR.ink)).toBe(true);
      } else {
        expect(hasColor(n.head, ANIMAL_COLOR[a]), `${a} head`).toBe(true);
      }
      expect(hasColor(n.ground, ANIMAL_COLOR[a], 1), `${a} disc`).toBe(true);
      expect(hasColor(n.ground, CHAR_COLOR.ink, 1), `${a} rim`).toBe(true);
      expect(hasColor(n.ground, SCENE_COLOR.shadow, 0.22), `${a} blob`).toBe(true);
    }
  });

  it('D-02: animals differ by silhouette — ears, muzzle, nose, beak, tail', () => {
    const N = Object.fromEntries(ANIMALS.map((a) => [a, chibiNodes(a)])) as Record<(typeof ANIMALS)[number], ReturnType<typeof chibiNodes>>;
    expect(box(N.rabbit.ears).max.y).toBeGreaterThanOrEqual(box(N.bear.ears).max.y + 0.15);
    // D-17a(3): the shortened rabbit ears still stand ≥ 1.6 × as far above the head top as the
    // tallest head part of any other species (the chick's feathers count).
    const above = (a: AnimalId) => box(N[a].ears).max.y - HEAD_B;
    const others = Math.max(...ANIMALS.filter((a) => a !== 'rabbit').map(above));
    expect(above('rabbit')).toBeGreaterThanOrEqual(1.6 * others);
    expect(box(N.dog.ears).min.y).toBeLessThan(0); // floppy ears hang below the head center
    expect(hasColor(N.dog.ears, CHAR_COLOR.dogEar)).toBe(true);
    expect(hasColor(N.cat.ears, CHAR_COLOR.cheek)).toBe(true); // inner ear
    expect(hasColor(N.rabbit.ears, CHAR_COLOR.cheek)).toBe(true);
    expect(hasColor(N.fox.ears, CHAR_COLOR.cream)).toBe(true);
    expect(hasColor(N.panda.ears, CHAR_COLOR.ink)).toBe(true);
    expect(hasColor(N.chick.ears, CHAR_COLOR.feather)).toBe(true); // head feathers, no ears
    expect(box(N.chick.ears).max.y).toBeGreaterThan(HEAD_B);
    expect(hasColor(N.chick.head, CHAR_COLOR.beak)).toBe(true);
    expect(hasColor(N.pig.head, CHAR_COLOR.pigNose)).toBe(true);
    expect(withColor(N.pig.head, CHAR_COLOR.ink).length).toBeGreaterThan(withColor(N.cat.head, CHAR_COLOR.ink).length); // nostrils
    expect(hasColor(N.bear.head, CHAR_COLOR.bearMuzzle)).toBe(true);
    expect(hasColor(N.dog.head, CHAR_COLOR.dogMuzzle)).toBe(true);
    expect(hasColor(N.fox.head, CHAR_COLOR.white)).toBe(true); // white muzzle
    expect(hasColor(N.fox.torso, CHAR_COLOR.white)).toBe(true); // white tail tip
    expect(box(N.fox.torso).min.z).toBeLessThanOrEqual(box(N.bear.torso).min.z - 0.1); // thick tail
    expect(hasColor(N.rabbit.torso, CHAR_COLOR.white)).toBe(true);
    expect(hasColor(N.chick.armL, CHAR_COLOR.feather)).toBe(true); // wings
  });
});

describe('chibiFaces (D-03, D-07, D-09, CHAR-02)', () => {
  it('builds every animal × face key with the shared layout, cached', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      for (const a of ANIMALS) {
        for (const k of FACE_KEYS) {
          const g = faceGeo(a, k);
          expect(g, `${a}:${k}`).not.toBeNull();
          expect(g.index).toBeNull();
          expect(keys(g), `${a}:${k}`).toEqual(['color', 'normal', 'position']);
          expect(g.attributes.color.itemSize).toBe(3);
          expect(faceGeo(a, k)).toBe(g);
        }
      }
      expect(err).not.toHaveBeenCalled();
    } finally {
      err.mockRestore();
    }
  });

  it('D-03: highlights, cheeks on every key, mouths, sweat and sparkles where the table puts them', () => {
    for (const a of ANIMALS) {
      const cheek = a === 'pig' ? CHAR_COLOR.cheekPig : CHAR_COLOR.cheek;
      for (const k of FACE_KEYS) {
        const g = faceGeo(a, k);
        expect(hasColor(g, cheek), `${a}:${k} cheek`).toBe(true);
        expect(hasColor(g, CHAR_COLOR.sparkle), `${a}:${k} sparkle`).toBe(k === 'winner');
      }
      for (const k of ['idle', 'excited', 'surprised'] as const) {
        expect(hasColor(faceGeo(a, k), CHAR_COLOR.white), `${a}:${k} highlight`).toBe(true);
      }
      // The chick keeps its beak closed while excited (UI-SPEC C3 chick mouth rule).
      for (const k of a === 'chick' ? (['joy', 'winner'] as const) : (['excited', 'joy', 'winner'] as const)) {
        expect(hasColor(faceGeo(a, k), CHAR_COLOR.mouth), `${a}:${k} mouth`).toBe(true);
      }
      for (const k of ['joy', 'winner'] as const) {
        if (a !== 'chick') expect(hasColor(faceGeo(a, k), CHAR_COLOR.tongue), `${a}:${k} tongue`).toBe(true);
      }
      for (const k of ['sad', 'sadBlink'] as const) {
        expect(hasColor(faceGeo(a, k), CHAR_COLOR.sweat), `${a}:${k} sweat`).toBe(true);
      }
      expect(faceGeo(a, 'idle').attributes.position.count).not.toBe(faceGeo(a, 'idleBlink').attributes.position.count);
    }
  });

  it('D-03-2: eyes sit in the lower half of the face; dog and panda get sclera eyes', () => {
    for (const a of ANIMALS) {
      const g = faceGeo(a, 'idle');
      if (ANIMAL_EYE[a] === CHAR_COLOR.white) {
        expect(hasColor(g, CHAR_COLOR.white), `${a} sclera`).toBe(true);
        expect(hasColor(g, CHAR_COLOR.ink), `${a} pupil`).toBe(true);
        continue;
      }
      const pos = g.attributes.position;
      const eye = withColor(g, CHAR_COLOR.ink).filter((i) => Math.abs(pos.getX(i)) > 0.06);
      expect(eye.length, a).toBeGreaterThan(0);
      const meanY = eye.reduce((s, i) => s + pos.getY(i), 0) / eye.length;
      expect(meanY, a).toBeLessThan(0);
    }
  });

  it('line eyes use ANIMAL_EYE (white on the dog and the panda)', () => {
    for (const a of ANIMALS) {
      expect(hasColor(faceGeo(a, 'idleBlink'), ANIMAL_EYE[a]), a).toBe(true);
      expect(hasColor(faceGeo(a, 'joy'), ANIMAL_EYE[a]), a).toBe(true);
    }
  });
});

describe('chibi materials (D-03-5)', () => {
  it('CHAR_MAT is the glossy shared vertex-color material; GROUND_MAT is transparent without depth write', () => {
    expect(CHAR_MAT.vertexColors).toBe(true);
    expect(CHAR_MAT.roughness).toBe(0.32);
    expect(CHAR_MAT.metalness).toBe(0.05);
    expect(CHAR_MAT.color.getHex()).toBe(0xffffff);
    expect(GROUND_MAT.vertexColors).toBe(true);
    expect(GROUND_MAT.transparent).toBe(true);
    expect(GROUND_MAT.depthWrite).toBe(false);
  });
});

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

const named = (r: Renderer, name: string): Object3D[] =>
  r.scene.findAll((n) => (n.instance as Object3D | undefined)?.name === name).map((n) => n.instance as Object3D);

const one = (r: Renderer, name: string): Object3D => {
  const found = named(r, name);
  expect(found, name).toHaveLength(1);
  return found[0];
};

function meshes(r: Renderer): Mesh[] {
  const out: Mesh[] = [];
  (r.scene.instance as Object3D).traverse((o) => {
    if (o instanceof Mesh) out.push(o);
  });
  return out;
}

let open: Renderer[] = [];
afterEach(async () => {
  for (const r of open) await r.unmount();
  open = [];
});

async function mountModel(
  animal: AnimalId,
  opts: { ring?: boolean; crown?: boolean; face?: FaceKey } = {},
): Promise<{ r: Renderer; rig: ChibiRig }> {
  const rig = createChibiRig();
  const r = await ReactThreeTestRenderer.create(
    <ChibiModel animal={animal} rig={rig} face={opts.face ?? 'idle'} ring={opts.ring ?? false} crown={opts.crown ?? false} />,
  );
  open.push(r);
  return { r, rig };
}

const CHIBI_MESHES = ['chibi-ground', 'chibi-torso', 'chibi-arm-l', 'chibi-arm-r', 'chibi-head', 'chibi-ears', 'chibi-face'];

describe('ChibiModel (D-08, D-20, D-21)', () => {
  it('is exactly 7 named meshes per animal, inside one pawn-body group', async () => {
    for (const a of ANIMALS) {
      const { r } = await mountModel(a);
      const m = meshes(r);
      expect(m.map((x) => x.name).sort(), a).toEqual([...CHIBI_MESHES].sort());
      one(r, 'pawn-body');
    }
  });

  it('adds the turn ring on the floor and the crown on the tilted head', async () => {
    const { r } = await mountModel('rabbit', { ring: true, crown: true });
    expect(meshes(r)).toHaveLength(9);
    const body = one(r, 'pawn-body');
    const headPivot = one(r, 'chibi-head-pivot');
    const ancestors = (o: Object3D) => {
      const out: Object3D[] = [];
      o.traverseAncestors((p) => out.push(p));
      return out;
    };
    expect(ancestors(one(r, 'turn-ring'))).not.toContain(body);
    expect(ancestors(one(r, 'crown'))).toContain(headPivot);
  });

  it('uses the shared materials and the face geometry of the face prop', async () => {
    const { r } = await mountModel('fox', { face: 'joy' });
    expect((one(r, 'chibi-face') as Mesh).geometry).toBe(faceGeo('fox', 'joy'));
    for (const name of CHIBI_MESHES) {
      expect((one(r, name) as Mesh).material, name).toBe(name === 'chibi-ground' ? GROUND_MAT : CHAR_MAT);
    }
    expect((one(r, 'chibi-head') as Mesh).geometry).toBe(chibiNodes('fox').head);
  });

  it('mounts in the rest pose: head tilted back, arms resting outward', async () => {
    const { rig } = await mountModel('bear');
    expect(rig.head.current!.rotation.x).toBeCloseTo(-HEAD_TILT, 9);
    expect(rig.armR.current!.rotation.z).toBeCloseTo(ARM_REST, 9);
    expect(rig.armL.current!.rotation.z).toBeCloseTo(-ARM_REST, 9);
    const b = rig.body.current!;
    expect(b.position.y).toBe(0);
    expect([b.rotation.x, b.rotation.y, b.rotation.z]).toEqual([0, 0, 0]);
    expect([b.scale.x, b.scale.y, b.scale.z]).toEqual([1, 1, 1]);
    expect(rig.ears.current!.rotation.x).toBeCloseTo(0, 9);
  });

  it('applyPose writes the UI-SPEC C4 sign conventions', async () => {
    const { rig } = await mountModel('cat');
    applyPose(rig, { ...REST, squashY: 0.9 });
    const b = rig.body.current!;
    expect(b.scale.y).toBeCloseTo(0.9, 9);
    expect(b.scale.x).toBeCloseTo(1.05, 9);
    expect(b.scale.z).toBeCloseTo(1.05, 9);
    applyPose(rig, { ...REST, armR: 2.4, armL: 0.5 });
    expect(rig.armR.current!.rotation.z).toBeCloseTo(ARM_REST + 2.4, 9);
    expect(rig.armL.current!.rotation.z).toBeCloseTo(-(ARM_REST + 0.5), 9);
    applyPose(rig, { ...REST, headPitch: 0.35 });
    expect(rig.head.current!.rotation.x).toBeCloseTo(-HEAD_TILT + 0.35, 9);
    applyPose(rig, { ...REST, yaw: 1, lean: 0.08, y: 0.3 });
    expect(b.rotation.y).toBeCloseTo(1, 9);
    expect(b.rotation.x).toBeCloseTo(0.08, 9);
    expect(b.position.y).toBeCloseTo(0.3, 9);
    applyPose(rig, { ...REST, earTilt: 0.4 });
    expect(rig.ears.current!.rotation.x).toBeCloseTo(-0.4, 9);
  });

  it('applyPose is a no-op on an unmounted rig', () => {
    expect(() => applyPose(createChibiRig(), { ...REST, y: 1 })).not.toThrow();
  });
});
