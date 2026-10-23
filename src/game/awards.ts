// src/game/awards.ts — praise badges for the award ceremony (D-14, END-02).
// Badges are independent of winning: every participant gets at least one.
// CONTRACT: this file MUST stay
//   - free of React/DOM and three / @react-three imports (main-chunk safe),
//   - CLOCK-FREE (no wall-clock reads, no timers), and
//   - pure: inputs are never mutated; results are new arrays/objects.
// Copy (emoji, names, titles) lives in labels.ts — this module only decides badge ids.
import { EMPTY_STATS } from '../engine/stats';
import type { PlayerStats } from '../engine/state';

export type BadgeId = 'master' | 'persistent' | 'lucky' | 'traveler' | 'challenger' | 'cheer';

// Display priority: 🔥 고수왕 → 💪 끈기왕 → 🍀 행운왕 → 🌏 여행왕 → 🏃 도전왕 → 🎉 응원왕.
export const BADGE_PRIORITY: readonly BadgeId[] = Object.freeze([
  'master',
  'persistent',
  'lucky',
  'traveler',
  'challenger',
  'cheer',
]);

export const MAX_SHOWN_BADGES = 2;

interface AwardInput {
  id: string;
  travel: number;
}

// Rules in BADGE_PRIORITY order (cheer is the fallback, not a rule).
const RULES: readonly { id: BadgeId; metric: (s: PlayerStats, p: AwardInput) => number }[] = [
  { id: 'master', metric: (s) => s.hardSuccesses },
  { id: 'persistent', metric: (s) => s.retrySuccesses },
  { id: 'lucky', metric: (s) => s.luckyCount },
  { id: 'traveler', metric: (_, p) => p.travel },
  { id: 'challenger', metric: (s) => s.attempts },
];

// Each rule goes to every participant tied at the maximum. A rule whose maximum is 0 awards
// nobody (RESEARCH A1): an all-zero rule would hand a meaningless badge to everyone, so those
// players fall back to 🎉 응원왕 instead. Anyone left without a badge gets 'cheer'.
// Each returned list is in BADGE_PRIORITY order; the result does not depend on input order.
export function awardBadges(
  stats: Readonly<Record<string, PlayerStats>>,
  participants: readonly AwardInput[],
): Record<string, BadgeId[]> {
  const out: Record<string, BadgeId[]> = {};
  for (const p of participants) out[p.id] = [];
  if (participants.length === 0) return out;
  for (const rule of RULES) {
    const vals = participants.map((p) => rule.metric(stats[p.id] ?? EMPTY_STATS, p));
    const max = Math.max(...vals);
    if (!(max > 0)) continue; // A1 (also guards NaN)
    participants.forEach((p, i) => {
      if (vals[i] === max) out[p.id].push(rule.id);
    });
  }
  for (const p of participants) if (out[p.id].length === 0) out[p.id].push('cheer');
  return out;
}

// The ceremony shows at most MAX_SHOWN_BADGES, highest priority first.
export function displayBadges(ids: readonly BadgeId[]): BadgeId[] {
  return ids.slice(0, MAX_SHOWN_BADGES);
}
