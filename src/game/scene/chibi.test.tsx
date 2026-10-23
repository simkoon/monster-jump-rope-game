// @vitest-environment node
// src/game/scene/chibi.test.tsx — the code-built chibi animals (D-01..D-03, D-07, D-09, D-18, D-20, CHAR-01/02).
// Runs in node (no WebGL): the geometry helpers, the 8 species nodes, the 9 faces per species, the
// shared materials and the view-only ChibiModel mounted with @react-three/test-renderer.
import { describe, it, expect } from 'vitest';
import { BufferGeometry, Color, Float32BufferAttribute, SphereGeometry, Vector3 } from 'three';
import { bake, hull, M, part, surfaceZ } from './chibiParts';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const keys = (g: BufferGeometry) => Object.keys(g.attributes).sort();

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
