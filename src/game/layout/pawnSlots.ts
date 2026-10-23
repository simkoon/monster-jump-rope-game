// src/game/layout/pawnSlots.ts — where characters stand on their tiles (D-17, D-18, BOARD-05, HUD-01).
// PHASE 6 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of any runtime import of three / @react-three/*
//     (main-chunk safety — the HUD may read `leaders`), and
//   - pure: every function returns new values and never mutates its inputs.
// Slot rule (Phase 7, UI-SPEC C5, D-17, D-17a, D-17b): one frozen table per tile shape.
// faceOcclusion.test.tsx and faceOrders.*.test.tsx are the final proof (D-17a(4)): they mount the
// real scene — gate, ears, crowns, stars, and two adjacent crowded tiles — and keep every face ≤ 30 %
// hidden from the real camera, for every animal order (07-VERIFICATION, SC4); slotOcclusion.test.ts
// stays as the head-disc check (D-19) and pins the bound. On a tile
// the current turn (if it stands there) takes k = 0 — front-center on a regular tile, the frontmost
// slot on the start tile — at full size; everyone else follows participant order at the table size
// s (0.85–0.90 for 2–4, 0.65–0.72 for 5–8). D-17b: toward either ring neighbor no slot center goes
// past EDGE = 0.45 from its tile center, so a character is always nearer its own tile and two
// adjacent crowds never mix; a crowd spreads only across the ring (bottom / top side: along z, left /
// right side: along x, corners: away from both neighbors) and stays on the board base. The start
// tile (index 0) has its own tables, a lone character included, so nobody stands in the gate pillars
// (Pitfall 3) or behind the arch. Slots depend only on (order, positions, currentId, ring size), so
// the same game state always looks the same.
import type { Tile } from '../../engine/board';
import { ringLayout, tileCenter, tileTop } from './ringLayout';

export interface PawnSlot {
  dx: number;
  dz: number;
  scale: number;
}

export interface StandPoint {
  x: number;
  y: number;
  z: number;
}

type Slot = readonly [number, number];

export interface SlotTable {
  s: number;
  slots: ReadonlyArray<Slot>;
}

// D-17b tile shapes. A table is written for one orientation; `mirror` = −1 flips x for the other:
//   'z'    bottom and top sides: ≤ EDGE along x (the ring), spread along z (yard / outer apron)
//   'x'    left side (the right side mirrors): ≤ EDGE along z, spread along x (−x = outer apron)
//   'near' the bottom-left corner: ≤ EDGE toward +x and −z, spread toward −x and +z
//   'far'  the top-left corner (top-right mirrors): ≤ EDGE toward +x and +z, spread toward −x and −z
//   'preStart' the last tile (right side, written as seen there): ≤ EDGE along z, spread along x.
//          The start block in front of it is taller and its crowd stands at its back, which hides
//          the middle of this tile at any depth, so here the current takes the frontmost slot out
//          toward the apron (+x), like the start tile's current, instead of the middle.
// The bottom-right corner is the start tile.
export type SlotShape = 'start' | 'z' | 'x' | 'near' | 'far' | 'preStart';
type RegularShape = Exclude<SlotShape, 'start'>;

export const EDGE = 0.45; // max slot offset toward a ring neighbor (D-17b(1))

// A lone character per shape: n = 1.
const LONE: Record<RegularShape, SlotTable> = {
  z: { s: 1, slots: [[0, 0]] },
  x: { s: 1, slots: [[0, 0.4]] },
  near: { s: 1, slots: [[0, 0.16]] },
  far: { s: 1, slots: [[0, 0]] },
  preStart: { s: 1, slots: [[0.58, 0.3]] },
};

// Regular tiles, index n − 2 (UI-SPEC C5). Camera = +z. The current turn stands front-center (the
// frontmost slot on 'preStart'); a
// full-size crowned current hides the faces straight behind it across a whole tile, so the others
// stand in lanes beside it, and a row stands behind another only far enough back to see over it.
// Toward a ring neighbor the rows stop at EDGE, and the rows of two neighbors never line up across
// the gap (D-17b, proven by faceOcclusion.test.tsx with two adjacent crowded tiles).
const REGULAR: Record<RegularShape, readonly SlotTable[]> = {
  z: [
    { s: 0.9, slots: [[0, 0.66], [0.26, -0.43]] },
    { s: 0.85, slots: [[0, 0.71], [-0.26, -0.46], [0.38, -0.38]] },
    { s: 0.85, slots: [[0, 0.74], [-0.37, -0.26], [0.43, -0.26], [0.04, -0.78]] },
    { s: 0.7, slots: [[0, 0.46], [-0.45, 0.38], [0.45, 0.38], [-0.38, -0.72], [0.38, -0.72]] },
    { s: 0.66, slots: [[0, 0.62], [-0.45, 0.54], [0.45, 0.22], [-0.45, -0.64], [0, -0.64], [0.45, -0.64]] },
    {
      s: 0.65,
      slots: [[0, 0.54], [-0.45, 0.46], [0.45, 0.46], [-0.45, -0.36], [0.45, -0.32], [-0.14, -0.82], [0.16, -0.82]],
    },
    {
      s: 0.65,
      slots: [[0, 0.74], [-0.45, 0.7], [0.45, 0.7], [-0.45, -0.06], [0.45, -0.12], [-0.3, -0.76], [0, -0.76], [0.3, -0.82]],
    },
  ],
  x: [
    { s: 0.9, slots: [[0, 0.28], [0.54, -0.02]] },
    { s: 0.85, slots: [[0, 0.22], [-0.66, -0.12], [0.56, -0.08]] },
    { s: 0.85, slots: [[0, 0.26], [-0.66, 0.2], [0.44, 0.22], [0.77, -0.26]] },
    { s: 0.7, slots: [[0, 0.34], [-0.5, 0.28], [0.5, 0.2], [-0.75, -0.42], [0.78, -0.42]] },
    { s: 0.66, slots: [[0, 0.42], [-0.58, 0.26], [0.58, 0.18], [-0.72, -0.42], [0.8, -0.42], [0.25, -0.42]] },
    {
      s: 0.65,
      slots: [[0, 0.42], [-0.58, 0.26], [0.58, 0.1], [-0.8, -0.42], [0.8, -0.42], [0.25, -0.42], [-0.49, -0.42]],
    },
    {
      s: 0.65,
      slots: [[0, 0.42], [-0.58, 0.26], [0.5, 0.18], [-0.8, -0.42], [0.8, -0.42], [0.25, -0.42], [-0.49, -0.42], [0.82, 0.22]],
    },
  ],
  near: [
    { s: 0.9, slots: [[0, 0.57], [0.35, 0.045]] },
    { s: 0.85, slots: [[0, 0.615], [-0.57, -0.15], [0.27, -0.07]] },
    { s: 0.85, slots: [[0, 0.758], [-0.6, 0.39], [0.26, 0.06], [-0.39, -0.278]] },
    { s: 0.7, slots: [[0, 0.758], [-0.6, 0.39], [0.38, 0.23], [-0.45, -0.45], [0.39, -0.45]] },
    {
      s: 0.66,
      slots: [[0, 0.758], [-0.6, 0.39], [0.38, 0.39], [-0.6, -0.45], [-0.23, -0.37], [0.38, -0.45]],
    },
    {
      s: 0.65,
      slots: [[0, 0.758], [-0.68, 0.47], [0.38, 0.39], [-0.6, -0.06], [0.38, -0.14], [-0.37, -0.45], [-0.01, -0.45]],
    },
    {
      s: 0.65,
      slots: [[0, 0.678], [-0.68, 0.47], [0.42, 0.63], [-0.68, -0.06], [0.42, 0.06], [-0.45, -0.45], [-0.15, -0.45], [0.15, -0.45]],
    },
  ],
  far: [
    { s: 0.9, slots: [[0, 0.145], [0.27, -0.742]] },
    { s: 0.85, slots: [[0, 0.112], [-0.57, -0.455], [0.27, -0.775]] },
    { s: 0.86, slots: [[0, 0.319], [-0.6, 0.115], [0.36, -0.405], [-0.15, -0.779]] },
    { s: 0.7, slots: [[0, 0.039], [-0.68, 0.035], [0.42, -0.005], [-0.57, -0.778], [0.33, -0.798]] },
    {
      s: 0.66,
      slots: [[0, 0.399], [-0.6, 0.115], [0.45, -0.125], [-0.6, -0.778], [-0.15, -0.818], [0.38, -0.818]],
    },
    {
      s: 0.65,
      slots: [[0, 0.359], [-0.68, 0.195], [0.38, 0.355], [-0.72, -0.48], [0.42, -0.36], [-0.41, -0.817], [0.09, -0.797]],
    },
    {
      s: 0.65,
      slots: [[0, 0.339], [-0.76, 0.275], [0.38, 0.275], [-0.68, -0.36], [0.42, -0.36], [-0.45, -0.816], [-0.15, -0.816], [0.15, -0.816]],
    },
  ],
  preStart: [
    { s: 0.9, slots: [[0.71, 0.22], [-0.46, -0.06]] },
    { s: 0.85, slots: [[0.71, 0.22], [-0.46, -0.14], [0.13, -0.08]] },
    { s: 0.85, slots: [[0.55, 0.34], [-0.3, -0.06], [0.13, -0.12], [-0.78, 0.33]] },
    { s: 0.7, slots: [[0.6, 0.32], [-0.8, 0.28], [-0.5, -0.05], [-0.8, -0.42], [0.45, -0.42]] },
    {
      s: 0.66,
      slots: [[0.49, 0.45], [-0.35, -0.38], [-0.03, -0.42], [0.67, -0.44], [-0.75, -0.1], [0, 0.18]],
    },
    {
      s: 0.65,
      slots: [[0.31, 0.4], [-0.35, -0.38], [0.07, -0.42], [0.75, -0.42], [-0.75, -0.02], [-0.14, 0.1], [-0.45, 0.34]],
    },
    {
      s: 0.65,
      slots: [[0, 0.42], [0.58, 0.26], [-0.5, 0.18], [0.8, -0.42], [-0.8, -0.42], [-0.25, -0.42], [0.49, -0.42], [-0.82, 0.22]],
    },
  ],
};

// Start tile (1.4 × 1.4), index n − 2: slot 0 is the frontmost (largest z); every slot keeps clear
// of the two gate pillars (StartGate.tsx). Seen from the camera the arch and its star hide a diagonal
// band from the back-right corner to the front-left pillar, so the slots fill the gate-free zones —
// the back-left region, the outer (front-right) corner and the front row (D-17a(1), proven by
// faceOcclusion.test.tsx; the gate itself is unchanged, D-17a(2)). Whatever animal stands in front,
// a 0.65 face stays clear when that character is ≥ 0.55 nearer the camera or ≥ 0.4 to the side, so
// 8 stand in three such rows 0.55 apart (3 + 2 + 3), the back two seen through the arch
// (faceOrders.start.test.tsx, every animal order).
const START: readonly SlotTable[] = [
  { s: 0.9, slots: [[0.25, 0.25], [-0.45, 0.1]] },
  { s: 0.85, slots: [[0.2, 0.4], [-0.55, -0.55], [-0.05, -0.55]] },
  { s: 0.85, slots: [[0.5, 0.4], [-0.55, -0.55], [0.05, 0.35], [-0.1, -0.34]] },
  { s: 0.72, slots: [[0.5, 0.5], [0.05, 0.45], [-0.55, 0.15], [-0.55, -0.5], [-0.1, -0.55]] },
  { s: 0.68, slots: [[0.5, 0.4], [-0.55, -0.55], [-0.55, 0.25], [-0.25, -0.2], [0.05, -0.55], [0.05, 0.35]] },
  {
    s: 0.65,
    slots: [[0.49, 0.53], [0.01, 0.42], [0.02, -0.57], [-0.285, -0.49], [-0.53, -0.03], [-0.54, 0.51], [-0.58, -0.55]],
  },
  {
    s: 0.65,
    slots: [[0.15, 0.52], [0.57, 0.5], [-0.55, 0.5], [-0.59, -0.03], [-0.29, -0.03], [-0.56, -0.57], [-0.24, -0.58], [0.06, -0.58]],
  },
];

// A lone character on the start tile stands off the arch band (at the center the arch hides about
// half of its face).
const START_LONE: SlotTable = { s: 1, slots: [[0.25, 0.3]] };

// The shape of tile i on a ring of ringSize tiles, and whether its tables mirror x (D-17b).
export function tileShape(ringSize: number, i: number): { shape: SlotShape; mirror: 1 | -1 } {
  const perSide = Math.max(1, Math.floor(ringSize / 4));
  const side = Math.floor(i / perSide);
  if (i === 0) return { shape: 'start', mirror: 1 };
  if (i === ringSize - 1) return { shape: 'preStart', mirror: 1 };
  if (i % perSide === 0) {
    return side === 1 ? { shape: 'near', mirror: 1 } : { shape: 'far', mirror: side === 2 ? 1 : -1 };
  }
  if (side === 0 || side === 2) return { shape: 'z', mirror: 1 };
  return { shape: 'x', mirror: side === 1 ? 1 : -1 };
}

// The slot table for n characters on a tile of this shape (unmirrored). n is clamped to 1..8
// (MAX_PARTICIPANTS, T-07-05).
export function slotTable(n: number, shape: SlotShape): SlotTable {
  const c = Number.isFinite(n) ? Math.min(8, Math.max(1, Math.floor(n))) : 1;
  if (shape === 'start') return c === 1 ? START_LONE : START[c - 2];
  return c === 1 ? LONE[shape] : REGULAR[shape][c - 2];
}

// Slot offset per participant id. A participant missing from `positions` stands on the start tile.
export function pawnSlots(
  order: readonly string[],
  positions: Readonly<Record<string, number>>,
  currentId: string | null,
  ringSize: number,
): Record<string, PawnSlot> {
  const byTile = new Map<number, string[]>();
  for (const id of order) {
    const tile = positions[id] ?? 0;
    const list = byTile.get(tile);
    if (list) list.push(id);
    else byTile.set(tile, [id]);
  }
  const out: Record<string, PawnSlot> = {};
  for (const [tile, ids] of byTile) {
    const k0 = currentId === null ? -1 : ids.indexOf(currentId);
    const ranked = k0 > 0 ? [ids[k0], ...ids.slice(0, k0), ...ids.slice(k0 + 1)] : ids;
    const { shape, mirror } = tileShape(ringSize, tile);
    const { s, slots } = slotTable(ranked.length, shape);
    ranked.forEach((id, k) => {
      // More than 8 on one tile cannot happen (participants ≤ 8); reuse the last slot just in case.
      const [dx, dz] = slots[Math.min(k, slots.length - 1)];
      // + 0 turns a mirrored −0 into 0.
      out[id] = { dx: mirror * dx + 0, dz, scale: k === 0 && id === currentId ? 1 : s };
    });
  }
  return out;
}

// Everyone tied for the most stars, as long as that is at least 1 (crown, D-18).
export function leaders(stars: Readonly<Record<string, number>>): string[] {
  const entries = Object.entries(stars);
  const top = entries.reduce((m, [, s]) => Math.max(m, s), 0);
  if (top < 1) return [];
  return entries.filter(([, s]) => s === top).map(([id]) => id);
}

// Where a pawn stands on each tile: the tile center at the tile's top surface.
export function standPoints(tiles: readonly Tile[]): StandPoint[] {
  const l = ringLayout(tiles.length);
  return tiles.map((t, i) => {
    const c = tileCenter(l, i);
    return { x: c.x, y: tileTop(t.kind), z: c.z };
  });
}
