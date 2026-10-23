// src/game/layout/pawnSlots.ts — where characters stand on their tiles (D-17, D-18, BOARD-05, HUD-01).
// PHASE 6 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of any runtime import of three / @react-three/*
//     (main-chunk safety — the HUD may read `leaders`), and
//   - pure: every function returns new values and never mutates its inputs.
// Slot rule (Phase 7, UI-SPEC C5, D-17, D-17a): two frozen tables. faceOcclusion.test.tsx is the final
// proof (D-17a(4)): it mounts the real scene — gate, ears, crowns, stars — and keeps every face ≤ 30 %
// hidden from the real camera; slotOcclusion.test.ts stays as the head-disc check (D-19). On a tile the
// current turn (if it stands there) takes k = 0 — front-center on a regular tile, the frontmost slot on
// the start tile — at full size; everyone else follows participant order at the table size s
// (0.85–0.90 for 2–4, 0.65–0.72 for 5–8). The start tile (index 0) has its own tables, a lone
// character included, so nobody stands in the gate pillars (Pitfall 3) or behind the arch.
// Slots depend only on (order, positions, currentId), so the same game state always looks the same.
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

const CENTER_TABLE: SlotTable = { s: 1, slots: [[0, 0]] };

// Regular tiles, index n − 2 (UI-SPEC C5). Camera = +z. A theater layout: the current turn stands
// front-center, two flank slots, then a back row. A full-size crowned current hides the faces
// straight behind it across the whole depth of a far tile, so the others stand ≥ 0.5 to its side or
// in the back row, and the back row sees over the flank slots (D-17a(1), proven by
// faceOcclusion.test.tsx).
const REGULAR: readonly SlotTable[] = [
  { s: 0.9, slots: [[0, 0.45], [0.56, -0.3]] },
  { s: 0.85, slots: [[0, 0.55], [-0.56, -0.3], [0.56, -0.3]] },
  { s: 0.85, slots: [[0, 0.62], [-0.6, -0.05], [0.6, -0.05], [0, -0.62]] },
  { s: 0.7, slots: [[0, 0.62], [-0.66, -0.02], [0.66, -0.02], [-0.3, -0.64], [0.3, -0.64]] },
  { s: 0.66, slots: [[0, 0.62], [-0.68, 0], [0.68, 0], [-0.45, -0.64], [0, -0.64], [0.45, -0.64]] },
  {
    s: 0.65,
    slots: [[0, 0.62], [-0.68, 0], [0.68, 0], [-0.6, -0.65], [-0.2, -0.65], [0.2, -0.65], [0.6, -0.65]],
  },
  {
    s: 0.65,
    slots: [[0, 0.62], [-0.68, 0], [0.68, 0], [-0.62, -0.65], [-0.31, -0.65], [0, -0.65], [0.31, -0.65], [0.62, -0.65]],
  },
];

// Start tile (1.4 × 1.4), index n − 2: slot 0 is the frontmost (largest z); every slot keeps clear
// of the two gate pillars (StartGate.tsx). Seen from the camera the arch and its star hide a diagonal
// band from the back-right corner to the front-left pillar, so the slots fill the gate-free zones —
// the back-left region, the outer (front-right) corner and the front row (D-17a(1), proven by
// faceOcclusion.test.tsx; the gate itself is unchanged, D-17a(2)).
const START: readonly SlotTable[] = [
  { s: 0.9, slots: [[0.25, 0.25], [-0.45, 0.1]] },
  { s: 0.85, slots: [[0.2, 0.4], [-0.55, -0.55], [-0.05, -0.55]] },
  { s: 0.85, slots: [[0.5, 0.4], [-0.55, -0.55], [0.05, 0.35], [-0.1, -0.55]] },
  { s: 0.72, slots: [[0.5, 0.5], [0.05, 0.45], [-0.55, 0.15], [-0.55, -0.5], [-0.1, -0.55]] },
  { s: 0.68, slots: [[0.5, 0.4], [-0.55, -0.55], [-0.55, 0.25], [-0.25, -0.2], [0.05, -0.55], [0.05, 0.35]] },
  {
    s: 0.65,
    slots: [[0.49, 0.53], [0.07, 0.42], [0.08, -0.57], [-0.15, -0.25], [-0.41, -0.03], [-0.54, 0.45], [-0.58, -0.55]],
  },
  {
    s: 0.65,
    slots: [[0.47, 0.51], [-0.36, 0.01], [-0.58, -0.38], [0.12, -0.59], [-0.35, -0.59], [-0.55, 0.47], [0.11, 0.21], [-0.11, -0.27]],
  },
];

// A lone character on the start tile stands off the arch band (at the center the arch hides about
// half of its face).
const START_LONE: SlotTable = { s: 1, slots: [[0.25, 0.3]] };

// The slot table for n characters on one tile. n is clamped to 1..8 (MAX_PARTICIPANTS, T-07-05).
export function slotTable(n: number, isStart: boolean): SlotTable {
  const c = Number.isFinite(n) ? Math.min(8, Math.max(1, Math.floor(n))) : 1;
  if (c === 1) return isStart ? START_LONE : CENTER_TABLE;
  return (isStart ? START : REGULAR)[c - 2];
}

// Slot offset per participant id. A participant missing from `positions` stands on the start tile.
export function pawnSlots(
  order: readonly string[],
  positions: Readonly<Record<string, number>>,
  currentId: string | null,
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
    const { s, slots } = slotTable(ranked.length, tile === 0);
    ranked.forEach((id, k) => {
      // More than 8 on one tile cannot happen (participants ≤ 8); reuse the last slot just in case.
      const [dx, dz] = slots[Math.min(k, slots.length - 1)];
      out[id] = { dx, dz, scale: k === 0 && id === currentId ? 1 : s };
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
