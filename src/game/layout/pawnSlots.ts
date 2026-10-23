// src/game/layout/pawnSlots.ts — where characters stand on their tiles (D-17, D-18, BOARD-05, HUD-01).
// PHASE 6 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of any runtime import of three / @react-three/*
//     (main-chunk safety — the HUD may read `leaders`), and
//   - pure: every function returns new values and never mutates its inputs.
// Slot rule (Phase 7, UI-SPEC C5, D-17): two frozen tables measured by projecting head discs with the
// real camera fit (slotOcclusion.test.ts proves them). On a tile the current turn (if it stands there)
// takes k = 0 — front-center on a regular tile, the frontmost slot on the start tile — at full size;
// everyone else follows participant order at the table size s (0.85–0.90 for 2–4, 0.65–0.72 for 5–8).
// The start tile (index 0) has its own table so nobody stands in the gate pillars (Pitfall 3).
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

// Regular tiles, index n − 2 (UI-SPEC C5; max projected cover 15.6 %, limit 30 %). Camera = +z.
const REGULAR: readonly SlotTable[] = [
  { s: 0.9, slots: [[0, 0.3], [0.36, -0.3]] },
  { s: 0.85, slots: [[0, 0.4], [-0.44, -0.18], [0.44, -0.18]] },
  { s: 0.85, slots: [[0, 0.44], [-0.48, -0.08], [0.48, -0.08], [0, -0.42]] },
  { s: 0.7, slots: [[0, 0.48], [-0.5, 0.06], [0.5, 0.06], [-0.22, -0.44], [0.22, -0.44]] },
  { s: 0.66, slots: [[0, 0.48], [-0.52, 0.22], [0.52, 0.22], [-0.38, -0.46], [0.38, -0.46], [0, -0.36]] },
  {
    s: 0.65,
    slots: [[0, 0.5], [-0.52, 0.26], [0.52, 0.26], [-0.5, -0.2], [0.5, -0.2], [-0.18, -0.48], [0.18, -0.48]],
  },
  {
    s: 0.65,
    slots: [[0, 0.52], [-0.52, 0.42], [0.52, 0.42], [-0.52, -0.06], [0.52, -0.06], [-0.36, -0.52], [0.36, -0.52], [0, -0.4]],
  },
];

// Start tile (1.4 × 1.4), index n − 2: slot 0 is the frontmost (largest z); every slot keeps clear
// of the two gate pillars (StartGate.tsx). UI-SPEC C5 values, except six slots moved off the pillars
// so no head runs into one (07-02, slotOcclusion.test.ts): n 3 slot 2, n 4 slot 3, n 7 slots 0/1/6,
// n 8 slot 0. 07-05 (UI-SPEC C6 arch check): n 5 slot 1 pulled 0.10 toward +z, which brings the
// arch's cover of that face from about 51 % to 27 %; the other arch-covered back slots do not get
// better within the 0.10 bound and are left for the phase-end look check.
const START: readonly SlotTable[] = [
  { s: 0.9, slots: [[0.32, 0.15], [0.12, -0.46]] },
  { s: 0.85, slots: [[0.15, 0.27], [-0.53, 0.01], [0.27, -0.48]] },
  { s: 0.85, slots: [[0.28, 0.42], [-0.09, -0.53], [-0.55, 0.22], [0.37, -0.55]] },
  { s: 0.72, slots: [[0.46, 0.37], [0.02, 0.25], [-0.58, -0.16], [-0.24, -0.57], [0.47, -0.57]] },
  { s: 0.68, slots: [[0.51, 0.42], [-0.08, 0.09], [-0.57, 0.27], [-0.51, -0.42], [-0.03, -0.56], [0.37, -0.52]] },
  {
    s: 0.65,
    slots: [[0.13, 0.47], [0.59, 0.03], [-0.24, -0.12], [-0.57, 0.23], [-0.59, -0.32], [0.02, -0.55], [0.44, -0.52]],
  },
  {
    s: 0.65,
    slots: [[0.14, 0.48], [-0.06, -0.09], [-0.53, 0.42], [-0.45, -0.13], [-0.47, -0.57], [0, -0.56], [0.47, -0.55], [0.59, 0.4]],
  },
];

// The slot table for n characters on one tile. n is clamped to 1..8 (MAX_PARTICIPANTS, T-07-05).
export function slotTable(n: number, isStart: boolean): SlotTable {
  const c = Number.isFinite(n) ? Math.min(8, Math.max(1, Math.floor(n))) : 1;
  if (c === 1) return CENTER_TABLE;
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
