// src/game/layout/pawnSlots.ts — where pawns stand on their tiles (D-17, D-18, HUD-01).
// PHASE 6 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of any runtime import of three / @react-three/*
//     (main-chunk safety — the HUD may read `leaders`), and
//   - pure: every function returns new values and never mutates its inputs.
// Slot rule (UI-SPEC S2 "같은 칸 여러 말"): 1 pawn → tile center; 2–4 → a 2×2 grid at ±0.2 in a fixed
// order; 5–8 → a ring of radius 0.3 at 0.8 scale, first slot on the camera-near side (+Z).
// Slots follow participant order only, so the same game state always looks the same.
// Telling 8 pawns apart on one tile properly is Phase 7 (BOARD-05).
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

const GRID = 0.2;
// Back row first (away from the camera), so the front row never hides a lone back pawn.
const GRID_SLOTS: ReadonlyArray<readonly [number, number]> = [
  [-GRID, -GRID],
  [GRID, -GRID],
  [-GRID, GRID],
  [GRID, GRID],
];
const RING_R = 0.3;
const RING_SCALE = 0.8;

function slotFor(k: number, count: number): PawnSlot {
  if (count <= 1) return { dx: 0, dz: 0, scale: 1 };
  if (count <= 4) {
    const [dx, dz] = GRID_SLOTS[k];
    return { dx, dz, scale: 1 };
  }
  const a = (k * 2 * Math.PI) / count;
  return { dx: RING_R * Math.sin(a), dz: RING_R * Math.cos(a), scale: RING_SCALE };
}

// Slot offset per participant id. A participant missing from `positions` stands on the start tile.
export function pawnSlots(order: readonly string[], positions: Readonly<Record<string, number>>): Record<string, PawnSlot> {
  const byTile = new Map<number, string[]>();
  for (const id of order) {
    const tile = positions[id] ?? 0;
    const list = byTile.get(tile);
    if (list) list.push(id);
    else byTile.set(tile, [id]);
  }
  const out: Record<string, PawnSlot> = {};
  for (const ids of byTile.values()) {
    ids.forEach((id, k) => {
      out[id] = slotFor(k, ids.length);
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
