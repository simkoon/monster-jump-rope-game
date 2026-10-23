// src/game/scene/chibiParts.ts — vertex-color part helpers for the code-built chibi animals (D-01, D-03, D-20, D-21).
// Every chibi node (torso, arm, head, ears, face, ground) is ONE merged mesh drawn with one shared
// vertex-color material, so a character costs 7 draw calls (RESEARCH Pattern 1). That only works if
// every input to mergeGeometries has the same layout: three's Sphere/Capsule/Torus/Circle/Cone/
// Cylinder are indexed and carry uv, ExtrudeGeometry is not indexed, and mergeGeometries returns
// null (with a console.error) when index presence or attribute sets differ (RESEARCH Pitfall 5).
// So every primitive goes through `part()`: non-indexed, uv removed, a `color` attribute added —
// position / normal / color only. `bake()` merges and throws a named Error instead of returning
// null, so a bad part reaches the existing 3D error boundary rather than rendering an empty mesh.
// Colors are written from `new Color(hex)`: ColorManagement's working space is srgb-linear, and
// vertex colors are read in that space, so the linear r/g/b keep the palette hex on the flat canvas
// (hex / 255 would come out too light).
// The outline is an inverted hull merged into the same geometry (no extra draw call): a grown copy
// with reversed winding and negated normals in ink, used on silhouette parts only (Pitfall 6).
// This module lives in the lazy 3D chunk, so it may import three at runtime.
import { BufferAttribute, Color, Euler, Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Translation · rotation (XYZ euler) · scale as one matrix.
export const M = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0): Matrix4 =>
  new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromEuler(new Euler(rx, ry, rz)), new Vector3(sx, sy, sz));

// Swap vertices 1 and 2 of every triangle in an attribute (reverses the winding).
function swapWinding(attr: BufferAttribute): void {
  const a = attr.array as Float32Array;
  const s = attr.itemSize;
  const tri = 3 * s;
  for (let i = 0; i + tri <= a.length; i += tri) {
    for (let k = 0; k < s; k++) {
      const t = a[i + s + k];
      a[i + s + k] = a[i + 2 * s + k];
      a[i + 2 * s + k] = t;
    }
  }
}

// A primitive as a mergeable part: non-indexed, no uv, transformed by `m`, one linear color
// (itemSize 3, or 4 with `alpha` for the transparent ground node). A mirroring matrix keeps the
// faces front-facing.
export function part(src: BufferGeometry, hex: string, m?: Matrix4, alpha?: number): BufferGeometry {
  const g = src.index ? src.toNonIndexed() : src.clone();
  g.deleteAttribute('uv');
  if (m) {
    g.applyMatrix4(m);
    if (m.determinant() < 0) {
      swapWinding(g.attributes.position as BufferAttribute);
      swapWinding(g.attributes.normal as BufferAttribute);
    }
  }
  const c = new Color(hex);
  const n = g.attributes.position.count;
  const size = alpha === undefined ? 3 : 4;
  const a = new Float32Array(n * size);
  for (let i = 0; i < n; i++) {
    a[size * i] = c.r;
    a[size * i + 1] = c.g;
    a[size * i + 2] = c.b;
    if (size === 4) a[size * i + 3] = alpha!;
  }
  g.setAttribute('color', new BufferAttribute(a, size));
  return g;
}

// Inverted hull of a part: grown by `scale` about its bounding-sphere center, winding reversed,
// normals negated and recolored to the ink, so it shows only as a rim behind the part.
export function hull(p: BufferGeometry, scale: number, inkHex: string): BufferGeometry {
  const h = p.clone();
  h.computeBoundingSphere();
  const c = h.boundingSphere!.center.clone();
  h.translate(-c.x, -c.y, -c.z).scale(scale, scale, scale).translate(c.x, c.y, c.z);
  swapWinding(h.attributes.position as BufferAttribute);
  swapWinding(h.attributes.normal as BufferAttribute);
  const nor = h.attributes.normal.array as Float32Array;
  for (let i = 0; i < nor.length; i++) nor[i] = -nor[i];
  const ink = new Color(inkHex);
  const col = h.attributes.color;
  const arr = col.array as Float32Array;
  for (let i = 0; i < arr.length; i += col.itemSize) {
    arr[i] = ink.r;
    arr[i + 1] = ink.g;
    arr[i + 2] = ink.b;
  }
  h.boundingSphere = null;
  return h;
}

// Front (+Z) surface z of the ellipsoid with semi-axes (a, b, c) at (x, y), plus `lift`. Outside the
// ellipse the square root clamps to 0, so it returns the lift alone (never NaN).
export const surfaceZ = (x: number, y: number, a: number, b: number, c: number, lift: number): number =>
  c * Math.sqrt(Math.max(0, 1 - (x / a) ** 2 - (y / b) ** 2)) + lift;

// An ellipsoid surface parts can sit on: center (x, y, z) and semi-axes (a, b, c) in the node frame.
export interface Ellipsoid {
  x: number;
  y: number;
  z: number;
  a: number;
  b: number;
  c: number;
}

const Z_AXIS = new Vector3(0, 0, 1);

// A part placed on the front surface of `e` at node-frame (x, y): moved `lift` along the surface
// normal and turned so its local +Z is that normal (flat parts — eyes, cheeks, patches — then lie
// on the curved face instead of poking out of it), then turned by `rz` and scaled.
export function onSurface(e: Ellipsoid, x: number, y: number, lift: number, sx = 1, sy = 1, sz = 1, rz = 0): Matrix4 {
  const dx = x - e.x;
  const dy = y - e.y;
  const dz = surfaceZ(dx, dy, e.a, e.b, e.c, 0);
  const n = new Vector3(dx / (e.a * e.a), dy / (e.b * e.b), dz / (e.c * e.c)).normalize();
  const q = new Quaternion().setFromUnitVectors(Z_AXIS, n).multiply(new Quaternion().setFromEuler(new Euler(0, 0, rz)));
  const p = new Vector3(x, y, e.z + dz).addScaledVector(n, lift);
  return new Matrix4().compose(p, q, new Vector3(sx, sy, sz));
}

// One node from its parts. Never returns null: a layout mismatch is a bug, surfaced by name.
export function bake(name: string, parts: BufferGeometry[]): BufferGeometry {
  const g = mergeGeometries(parts);
  if (!g) throw new Error('chibi merge failed: ' + name);
  g.computeBoundingSphere();
  return g;
}
