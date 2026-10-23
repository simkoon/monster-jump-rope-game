// src/engine/stats.ts — per-participant game stats (D-15) and the lucky-event rule (A2).
// PHASE 5 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of src/store.ts / src/settings,
//   - CLOCK-FREE (no wall-clock reads, no timers), and
//   - pure: inputs are never mutated; results are new arrays/objects.
import type { Event } from '../schema';
import type { PlayerStats } from './state';

export const EMPTY_STATS: Readonly<PlayerStats> = Object.freeze({
  attempts: 0,
  successes: 0,
  failures: 0,
  retrySuccesses: 0,
  hardSuccesses: 0,
  luckyCount: 0,
});

const KEYS = Object.keys(EMPTY_STATS) as (keyof PlayerStats)[];

// Every id starts at all zeros (createGame, and therefore restart).
export function initStats(ids: readonly string[]): Record<string, PlayerStats> {
  const out: Record<string, PlayerStats> = {};
  for (const id of ids) out[id] = { ...EMPTY_STATS };
  return out;
}

// Adds `delta` to one participant's stats; a missing pid starts from EMPTY_STATS.
// Returns a new record with a new inner object for `pid`; every other entry is shared.
export function bumpStats(
  stats: Readonly<Record<string, PlayerStats>>,
  pid: string,
  delta: Partial<PlayerStats>,
): Record<string, PlayerStats> {
  const cur = stats[pid] ?? EMPTY_STATS;
  const next = { ...cur };
  for (const k of KEYS) next[k] = cur[k] + (delta[k] ?? 0);
  return { ...stats, [pid]: next };
}

// A2: the single source for the 🍀 badge and the 3D sparkle-vs-puff choice.
// A suppressed extra gives nothing; the instructor's label wins next; otherwise only a
// backward move is unlucky.
export function isLuckyEvent(ev: Pick<Event, 'eff' | 'label'>, suppressed: boolean): boolean {
  if (ev.eff === 'extra' && suppressed) return false;
  if (ev.label === '보너스') return true;
  if (ev.label === '함정') return false;
  return ev.eff !== 'backward';
}
