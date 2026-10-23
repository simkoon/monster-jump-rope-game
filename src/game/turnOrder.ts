// src/game/turnOrder.ts — "who plays next" selector for the turn bar (HUD-02, ROUND-02).
// PHASE 6 CONTRACT: pure — no React/DOM, no runtime import of three / @react-three/*.
// It mirrors the engine's advanceTurn rule and reads only engine selectors; the engine is not edited:
//   - an extraGranted turn repeats the same participant and member (also on the last turn);
//   - otherwise next = (currentIndex + 1) % n, and the leaving participant's member rotates;
//   - the game ends when the next index wraps to 0 in the last round.
// Note: extraGranted is only decided at turnResolved, so earlier phases show the regular next.
import { activeMember, currentParticipant } from '../engine/game';
import type { GameState } from '../engine/state';

export type NextUp = { pid: string; member: string; sameAgain: boolean };

export function nextUp(g: GameState): NextUp | null {
  if (g.phase === 'gameOver') return null;
  if (g.turn.extraGranted) {
    const p = currentParticipant(g);
    return { pid: p.id, member: activeMember(g), sameAgain: true };
  }
  const n = g.config.participants.length;
  if (n === 0) return null;
  const ni = (g.currentIndex + 1) % n;
  if (ni === 0 && g.round >= g.config.rules.rounds) return null; // this turn is the last of the game
  const p = g.config.participants[ni];
  // With a single participant the "next" one is the leaving one, whose member rotates first.
  const idx = ni === g.currentIndex ? (p.memberTurnIndex + 1) % (p.memberNames.length || 1) : p.memberTurnIndex;
  return { pid: p.id, member: p.memberNames[idx] ?? p.name, sameAgain: false };
}

export function isFinalRound(g: GameState): boolean {
  return g.round >= g.config.rules.rounds;
}
