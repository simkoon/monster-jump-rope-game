// src/engine/board.ts — ring board generator, built once at game start (BOARD-04, D-10..D-13).
// PHASE 5 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of src/store.ts / src/settings,
//   - CLOCK-FREE (no wall-clock reads, no timers), and
//   - pure: every random draw goes through the injected Rng; inputs are never mutated.
// No sort-with-random comparators (biased) and no retry/rejection loops (T-05-06).
import type { Difficulty, Event, Mission } from '../schema';
import { weightedPick, type Rng } from './rng';

// Event tiles hold a COPY of the event so editor edits mid-game cannot orphan or mutate the board.
export type Tile = { kind: 'start' } | { kind: 'quest'; diff: Difficulty } | { kind: 'event'; event: Event };
export type TileKind = Tile['kind'];

export const DIFF_ORDER: readonly Difficulty[] = ['easy', 'normal', 'hard'];
export const DIFF_RATIO = { easy: 50, normal: 35, hard: 15 } as const; // D-11

// D-10: about a quarter of the non-start squares are events (16→4, 20→5, 24→6).
export function eventTileCount(L: number): number {
  return Math.max(1, Math.round((L - 1) * 0.25));
}

// Hamilton largest-remainder apportionment: the result always sums to n and is as close
// to the ratios as integers allow. Remainder ties break in key insertion order (no RNG).
export function apportion<K extends string>(n: number, ratios: Record<K, number>): Record<K, number> {
  const keys = Object.keys(ratios) as K[];
  const out = {} as Record<K, number>;
  const sum = keys.reduce((s, k) => s + Math.max(0, ratios[k]), 0);
  if (sum <= 0 || n <= 0) {
    for (const k of keys) out[k] = 0;
    return out;
  }
  const fracs: { k: K; frac: number; order: number }[] = [];
  let given = 0;
  keys.forEach((k, order) => {
    const exact = (n * Math.max(0, ratios[k])) / sum;
    const floor = Math.floor(exact);
    out[k] = floor;
    given += floor;
    fracs.push({ k, frac: exact - floor, order });
  });
  fracs.sort((a, b) => b.frac - a.frac || a.order - b.order);
  for (let i = 0; i < n - given; i++) out[fracs[i].k]++;
  return out;
}

// D-10/D-11/D-13: tile counts for a board of L squares. Only difficulties that have at least
// one mission get quest squares; with no placeable events the quests fill all L−1 squares.
export function tileQuotas(
  L: number,
  availDiffs: readonly Difficulty[],
  hasEvents: boolean,
): { events: number; quests: Record<Difficulty, number> } {
  const events = hasEvents ? eventTileCount(L) : 0;
  const questCount = L - 1 - events;
  const ratios = {} as Record<Difficulty, number>;
  for (const d of DIFF_ORDER) if (availDiffs.includes(d)) ratios[d] = DIFF_RATIO[d];
  const share = apportion(questCount, ratios);
  const quests = { easy: 0, normal: 0, hard: 0 } as Record<Difficulty, number>;
  for (const d of DIFF_ORDER) quests[d] = share[d] ?? 0;
  return { events, quests };
}

// Uniformly choose k pairwise non-adjacent positions in [lo, hi] without rejection sampling:
// pick k distinct offsets c_0<…<c_{k−1} from {0..m−k}, then pos_j = lo + c_j + j.
export function chooseNonAdjacent(lo: number, hi: number, k: number, rng: Rng): number[] {
  const m = hi - lo + 1;
  if (k < 0 || k > Math.ceil(m / 2)) {
    throw new RangeError(`cannot place ${k} non-adjacent squares in [${lo}, ${hi}]`);
  }
  if (k === 0) return [];
  const pool = Array.from({ length: m - k + 1 }, (_, i) => i);
  // partial Fisher–Yates: the first k slots become a uniform random k-subset
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rng.next() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool
    .slice(0, k)
    .sort((a, b) => a - b)
    .map((c, j) => lo + c + j);
}

// Fisher–Yates on a copy (the input is never mutated).
export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildBoard(
  boardSize: number,
  missions: readonly Mission[],
  events: readonly Event[],
  rng: Rng,
): Tile[] {
  const L = boardSize;
  // (1) difficulties that actually have missions (D-13)
  const avail = DIFF_ORDER.filter((d) => missions.some((m) => m.diff === d));
  if (avail.length === 0) throw new Error('buildBoard: no missions to place on the board');

  // (2) only events with a positive weight can be placed (D-13)
  const placeable = events.filter((e) => e.weight > 0);

  // (3) tile counts
  const quotas = tileQuotas(L, avail, placeable.length > 0);
  const quests = { ...quotas.quests };

  // (4) event squares (ascending): never square 1 (D-12); L−1 next to the start square is allowed
  const eventIdx = new Set(chooseNonAdjacent(2, L - 1, quotas.events, rng));

  // (5) start + square 1 = easiest available difficulty (easy when present, A2)
  const tiles: Tile[] = new Array<Tile>(L);
  tiles[0] = { kind: 'start' };
  const first = avail[0];
  tiles[1] = { kind: 'quest', diff: first };
  quests[first] = Math.max(0, quests[first] - 1);

  // (6) remaining difficulties shuffled onto the remaining non-event squares in ascending order
  const diffs: Difficulty[] = [];
  for (const d of DIFF_ORDER) for (let i = 0; i < quests[d]; i++) diffs.push(d);
  const order = shuffle(diffs, rng);
  let q = 0;
  for (let i = 2; i < L; i++) {
    if (eventIdx.has(i)) continue;
    tiles[i] = { kind: 'quest', diff: order[q++] };
  }

  // (7) weighted event per event square, stored as a copy (BOARD-04)
  for (const i of eventIdx) {
    const picked = weightedPick(placeable, (e) => e.weight, rng);
    // placeable is non-empty with positive weights whenever eventIdx is non-empty
    tiles[i] = { kind: 'event', event: { ...(picked as Event) } };
  }
  return tiles;
}
