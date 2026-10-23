// src/game/layout/headAnchor.ts — the world point just above a character's head (D-05, FX-02).
// PHASE 6 CONTRACT: pure math — no React/DOM, no runtime import of three / @react-three/*
// (main-chunk safety). The DOM star flight starts here.
// It MUST mirror Character's rest placement: the `pawn-{pid}` group stands at
// (stand point + slot dx, stand point y, stand point + slot dz) with scale slot.scale, and the head
// top is HEAD_TOP above the group in character-local units. The same inputs SceneContents feeds the
// scene (standPoints(tiles), pawnSlots(order, displayed positions, currentId, L)) give the same
// point; src/game/scene/headAnchor.test.tsx pins this against the mounted scene.
import type { Tile } from '../../engine/board';
import { HEAD_TOP } from './chibiDims';
import { pawnSlots, standPoints } from './pawnSlots';
import type { V3 } from './project';

// How far above the head top the star appears (character-local units, scaled with the slot).
export const STAR_START_LIFT = 0.45;

const CENTER = { dx: 0, dz: 0, scale: 1 } as const;

export function headAnchor(
  tiles: readonly Tile[],
  order: readonly string[],
  positions: Readonly<Record<string, number>>,
  currentId: string | null,
  pid: string,
  lift: number = STAR_START_LIFT,
): V3 {
  const pts = standPoints(tiles);
  const p = pts[positions[pid] ?? 0] ?? pts[0];
  if (!p) return [0, HEAD_TOP + lift, 0];
  const s = order.includes(pid) ? (pawnSlots(order, positions, currentId, tiles.length)[pid] ?? CENTER) : CENTER;
  return [p.x + s.dx, p.y + (HEAD_TOP + lift) * s.scale, p.z + s.dz];
}
