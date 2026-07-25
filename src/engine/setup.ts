// src/engine/setup.ts — board presets, participant builder, empty-mission guard.
// PHASE 2/3 CONTRACT: no React/DOM imports. Ids come from a stable local counter
// (not seed.uid) to keep the engine free of content dependencies.
import type { Mission } from '../schema';
import type { Participant } from './types';

export type BoardPreset = 'short' | 'normal'; // "짧게" / "보통" (D-02)

// Claude discretion (A1): short 20 squares / normal 30 squares. Board length is the
// main lever for the ~20-minute session target (D-02).
export function boardLengthFor(preset: BoardPreset): number {
  return preset === 'short' ? 20 : 30;
}

export const DEFAULT_TIME_LIMIT_MS = 20 * 60 * 1000; // D-04 default 20 minutes
export const MAX_PARTICIPANTS = 8; // A3 upper bound (T-02-01 clamp target)
export const DEFAULT_PARTICIPANT_COUNT = 2; // A3 default count

function clampCount(count: number): number {
  if (!Number.isFinite(count)) return 1;
  return Math.min(MAX_PARTICIPANTS, Math.max(1, Math.floor(count)));
}

// Build participant tokens. Solo → each participant is its own single-member token.
// Team (D-01) → each team is ONE token sharing memberNames; members rotate turns.
// count is clamped into [1, MAX_PARTICIPANTS] (T-02-01). Ids use a stable local counter.
export function buildParticipants(
  mode: 'solo' | 'team',
  count: number,
  names: string[],
  characters: Array<'boy' | 'girl'>,
  memberNamesPerParticipant?: string[][],
): Participant[] {
  const n = clampCount(count);
  const out: Participant[] = [];
  for (let i = 0; i < n; i++) {
    const fallbackName = mode === 'team' ? `팀 ${i + 1}` : `플레이어 ${i + 1}`;
    const name = names[i] ?? fallbackName;
    const character = characters[i] ?? 'boy';
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
      character,
      position: 0,
      memberNames,
      memberTurnIndex: 0,
    });
  }
  return out;
}

// MISSION-07 / D-08: block starting when the mission library is empty; guide to the editor.
export function canStart(missions: Mission[]): { ok: boolean; reason?: string } {
  if (missions.length === 0)
    return { ok: false, reason: '미션이 없어요. 편집기에서 미션을 먼저 추가해 주세요.' };
  return { ok: true };
}
