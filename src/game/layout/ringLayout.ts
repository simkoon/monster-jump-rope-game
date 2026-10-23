// src/game/layout/ringLayout.ts — pure geometry of the square ring board (D-07, D-08, D-11, D-12, D-13).
// PHASE 6 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of any runtime import of three / @react-three/*
//     (main-chunk safety — the HUD may read it; the 3D code lives in the lazy chunk), and
//   - pure: every function returns new values and never mutates its inputs.
// World axes: the camera looks from +Z toward −Z, so screen right = +X and screen bottom = +Z.
// Index 0 (start) is the bottom-right corner and the walk is clockwise on screen:
// bottom edge leftward → left edge up → top edge rightward → right edge down.
import type { TileKind } from '../../engine/board';

export const TILE_SIZE = 1; // quest tile edge t
export const PITCH = 1.14; // lattice step: 0.14t gap between tiles (D-11, 12–15%)
export const START_SIZE = 1.4; // start tile edge (D-12)
// The start tile center moves outward by this much on BOTH x and z (Pitfall 7). Moving it 0.2
// along the diagonal instead would leave only 0.08t to its neighbors.
export const START_OFFSET = 0.2;
// Event hexagon circumradius, a vertex pointing along travel. UI-SPEC lists 0.56, but with a vertex
// along travel that leaves 0.08t to a square neighbor; 0.52 keeps the D-11 gap ≥ 0.1t.
export const EVENT_PAD_R = 0.52;
export const TRACK_TOP = 0.08; // top of the track slab the tiles stand on
export const TILE_H = 0.32; // quest / event tile height
export const START_H = 0.5; // start tile height
export const BASE_MARGIN = 0.95; // board base half-width = half + BASE_MARGIN
export const SCENE_HEIGHT = 2.0; // tallest thing on the board (gate, pawns) for camera fitting
export const CORNER_ARROW_INSET = 0.85; // corner arrow sits this far toward the yard on each axis
export const CORNER_ARROW_R = 0.32; // corner arrow arc radius

const COS30 = Math.cos(Math.PI / 6);

export interface TileXZ {
  x: number;
  z: number;
  corner: boolean;
  side: 0 | 1 | 2 | 3;
}

export interface RingLayout {
  n: number;
  perSide: number;
  pitch: number;
  half: number;
  tiles: TileXZ[]; // lattice positions
  heading: number[]; // atan2(dx, dz) toward tile i+1 — axis-aligned
}

export interface CornerArrow {
  i: number;
  x: number;
  z: number;
  inHeading: number;
  outHeading: number;
}

export function ringLayout(n: number, pitch: number = PITCH): RingLayout {
  if (!Number.isInteger(n) || n < 8 || n % 4 !== 0) throw new RangeError(`ring size ${n}`);
  const s = n / 4; // steps per side (16 → 4, 20 → 5, 24 → 6)
  const half = (s * pitch) / 2;
  const tiles: TileXZ[] = [];
  for (let i = 0; i < n; i++) {
    const side = Math.floor(i / s) as 0 | 1 | 2 | 3;
    const d = (i % s) * pitch;
    const t =
      side === 0 ? { x: half - d, z: half } // bottom edge, moving left
      : side === 1 ? { x: -half, z: half - d } // left edge, moving up
      : side === 2 ? { x: -half + d, z: -half } // top edge, moving right
      : { x: half, z: -half + d }; // right edge, moving down
    tiles.push({ ...t, corner: i % s === 0, side });
  }
  const heading = tiles.map((a, i) => {
    const b = tiles[(i + 1) % n];
    return Math.atan2(b.x - a.x, b.z - a.z);
  });
  return { n, perSide: s, pitch, half, tiles, heading };
}

// Where a tile (and the pawns on it) actually stands: the lattice point, except the start tile.
export function tileCenter(l: RingLayout, i: number): { x: number; z: number } {
  const t = l.tiles[i];
  if (i === 0) return { x: t.x + Math.sign(t.x) * START_OFFSET, z: t.z + Math.sign(t.z) * START_OFFSET };
  return { x: t.x, z: t.z };
}

// Height of a tile's top surface (pawns stand here).
export function tileTop(kind: TileKind): number {
  return TRACK_TOP + (kind === 'start' ? START_H : TILE_H);
}

// Axis-aligned half-extents of a tile footprint. `heading` is the tile's travel direction.
export function footprintHalf(kind: TileKind, heading: number): { hx: number; hz: number } {
  if (kind === 'start') return { hx: START_SIZE / 2, hz: START_SIZE / 2 };
  if (kind === 'quest') return { hx: TILE_SIZE / 2, hz: TILE_SIZE / 2 };
  const alongX = Math.abs(Math.sin(heading)) > Math.abs(Math.cos(heading));
  const along = EVENT_PAD_R;
  const across = EVENT_PAD_R * COS30;
  return alongX ? { hx: along, hz: across } : { hx: across, hz: along };
}

// Middle of the gap between tile i and tile i+1 (direction chevron spot).
export function gapPoint(l: RingLayout, i: number): { x: number; z: number } {
  const a = l.tiles[i];
  const b = l.tiles[(i + 1) % l.n];
  return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
}

// Turn arrows on the yard side of the four corners (D-13).
export function cornerArrows(l: RingLayout): CornerArrow[] {
  const out: CornerArrow[] = [];
  for (let k = 0; k < 4; k++) {
    const i = k * l.perSide;
    const t = l.tiles[i];
    out.push({
      i,
      x: t.x - Math.sign(t.x) * CORNER_ARROW_INSET,
      z: t.z - Math.sign(t.z) * CORNER_ARROW_INSET,
      inHeading: l.heading[(i - 1 + l.n) % l.n],
      outHeading: l.heading[i],
    });
  }
  return out;
}

// Board box used to fit the camera: base half-width and the tallest scene height.
export function boardExtents(l: RingLayout): { hx: number; hz: number; h: number } {
  const b = l.half + BASE_MARGIN;
  return { hx: b, hz: b, h: SCENE_HEIGHT };
}
