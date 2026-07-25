// src/lib/normalize.ts — weight → display-percent, ported verbatim from prototype renderE.
// Display-only: teachers edit integer weights; the Phase 2 draw uses raw weights, not these %.
import type { Event } from '../schema';

export function normalizedPercents(events: Event[]): Map<string, number> {
  const total = events.reduce((s, e) => s + (Number.isFinite(e.weight) ? e.weight : 0), 0);
  const pct = new Map<string, number>();
  for (const e of events) {
    // total 0 (all-zero or empty) → 0, no divide-by-zero. Per-event Math.round
    // may make the column sum to 99/101 — an accepted display artifact (no rebalancing).
    pct.set(e.id, total > 0 ? Math.round((e.weight / total) * 100) : 0);
  }
  return pct;
}
