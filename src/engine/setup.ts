// src/engine/setup.ts — participant builder, start-screen estimate and content analysis.
// PHASE 5 CONTRACT: no React/DOM imports, no store/settings imports. Ids come from a stable
// local counter (not seed.uid) to keep the engine free of content dependencies.
import type { Difficulty, Event, Mission } from '../schema';
import type { Participant } from './state';
import { assignAnimals, type AnimalId } from './animals';
import { DIFF_ORDER } from './board';

export const MAX_PARTICIPANTS = 8; // upper bound (= number of animal species, T-02-01 clamp target)
export const DEFAULT_PARTICIPANT_COUNT = 2;

function clampCount(count: number): number {
  if (!Number.isFinite(count)) return 1;
  return Math.min(MAX_PARTICIPANTS, Math.max(1, Math.floor(count)));
}

// Build participants. Solo → each participant is its own single-member token.
// Team (D-01) → each team is ONE token sharing memberNames; members rotate turns (D-21).
// count is clamped into [1, MAX_PARTICIPANTS]. Animals go through assignAnimals so every
// participant gets a distinct species even when picks collide or are missing (SETUP-07, D-24).
export function buildParticipants(
  mode: 'solo' | 'team',
  count: number,
  names: string[],
  animals: ReadonlyArray<AnimalId | undefined>,
  memberNamesPerParticipant?: string[][],
): Participant[] {
  const n = clampCount(count);
  const assigned = assignAnimals(n, animals);
  const out: Participant[] = [];
  for (let i = 0; i < n; i++) {
    const fallbackName = mode === 'team' ? `팀 ${i + 1}` : `플레이어 ${i + 1}`;
    const name = names[i] ?? fallbackName;
    let memberNames: string[];
    if (mode === 'team') {
      const members = memberNamesPerParticipant?.[i]?.filter((m) => m && m.length > 0) ?? [];
      // A team with no listed members still needs at least one performer: use the team name.
      memberNames = members.length > 0 ? members : [name];
    } else {
      memberNames = [name]; // solo: the player is the only member
    }
    out.push({
      id: `p${i + 1}`,
      name,
      animal: assigned[i],
      memberNames,
      memberTurnIndex: 0,
      position: 0,
      travel: 0,
      lapsCredited: 0,
      stars: 0,
    });
  }
  return out;
}

// ---- start-screen estimate and content analysis (SETUP-08/09, D-13, D-20) ----

export const SECONDS_PER_TURN = 45; // D-20: rough time per turn used for the start-screen estimate

// D-20: estimated minutes = ceil(participants × rounds × 45s / 60). 2×5=8, 3×5=12, 4×5=15, 8×5=30.
export function estimateMinutes(n: number, rounds: number): number {
  if (!Number.isFinite(n) || !Number.isFinite(rounds) || n < 1 || rounds < 1) return 0;
  return Math.ceil((n * rounds * SECONDS_PER_TURN) / 60);
}

export interface ContentAnalysis {
  ok: boolean;
  reason?: string;
  missingDiffs: Difficulty[]; // informational: those quest tiles are simply left out (D-13)
  hasEventTiles: boolean; // false when no event has weight > 0 (board uses quests only)
}

// D-13: only an empty mission library blocks a game; missing difficulties and
// unplaceable events are informational guidance on the start screen.
export function analyzeContent(missions: readonly Mission[], events: readonly Event[]): ContentAnalysis {
  const missingDiffs = DIFF_ORDER.filter((d) => !missions.some((m) => m.diff === d));
  const hasEventTiles = events.some((e) => e.weight > 0);
  if (missions.length === 0) {
    return {
      ok: false,
      reason: '미션이 없어요. 편집기에서 미션을 먼저 추가해 주세요.',
      missingDiffs,
      hasEventTiles,
    };
  }
  return { ok: true, missingDiffs, hasEventTiles };
}
