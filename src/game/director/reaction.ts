// src/game/director/reaction.ts — pure beat → expression / act mapping and blink timing
// (D-07, D-08, D-10, D-14, CHAR-02, UI-SPEC C3 / C4).
// PHASE 6 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of any runtime import of three / @react-three/*,
//   - CLOCK-FREE (time always arrives as a parameter; no wall-clock reads, no timers), and
//   - pure: every function returns new values and never mutates its inputs.
// Each Character asks reactionFor which face to show and which act to play for the current beat.
// Only its own beats (and the win beat, which has no pid) change it; any other beat leaves the
// situation reaction: excited on your turn, idle otherwise. Beat ids let the consumer restart its
// act clock exactly once per beat. Completion is never decided here (D-22).
import type { Act } from '../layout/charMotion';
import type { Expression, FaceKey } from '../layout/chibiDims';
import type { Beat } from './timeline';

export interface Reaction {
  expression: Expression;
  act: Act;
  beatId: number | null; // null = no beat-driven act (situation reaction)
  ms: number;
  stars?: number; // stars beats only: the star count picks the tiered success jump (Phase 8 D-04)
}

// The face that belongs to each act (UI-SPEC C4 table; 'rest' shows the idle face when it is not
// your turn — the situation face comes from reactionFor).
export const ACT_FACE: Readonly<Record<Act, Expression>> = Object.freeze({
  rest: 'idle',
  hop: 'excited',
  success: 'joy',
  bonus: 'joy',
  surprise: 'surprised',
  slump: 'sad',
  cheer: 'winner',
});

export function reactionFor(pid: string, beat: Beat | null, isCurrent: boolean): Reaction {
  const rest: Reaction = { expression: isCurrent ? 'excited' : 'idle', act: 'rest', beatId: null, ms: 0 };
  if (!beat) return rest;
  // The win beat has no pid: every co-winner cheers (D-14). Everybody else just stays idle —
  // cheering for the others is a deferred idea.
  if (beat.kind === 'win') {
    return beat.winners.includes(pid)
      ? { expression: 'winner', act: 'cheer', beatId: beat.id, ms: beat.ms }
      : { expression: 'idle', act: 'rest', beatId: null, ms: 0 };
  }
  if (beat.kind === 'finalRound' || beat.pid !== pid) return rest;
  const r = (expression: Expression, act: Act): Reaction => ({ expression, act, beatId: beat.id, ms: beat.ms });
  switch (beat.kind) {
    case 'stars':
      return { ...r('joy', 'success'), stars: beat.stars };
    case 'startBonus':
      return r('joy', 'bonus');
    case 'miss':
      return r('sad', 'slump');
    case 'hop':
      return r('excited', 'hop');
    case 'event':
      if (beat.eff === 'extra' && !beat.suppressed) return r('joy', 'bonus');
      if (beat.eff === 'backward') return r('sad', 'slump');
      return r('surprised', 'surprise'); // forward, or an extra turn the rules hold back
    default:
      // dice / preview of this pid: Dice and PathPreview own those beats; the character waits.
      return { ...rest, expression: 'excited' };
  }
}

// Deterministic blink (UI-SPEC C3): period 3.0–4.4 s and phase per seed (participant index),
// closed for BLINK_S at the start of each period. Allowed under reduced motion (D-16).
export const BLINK_S = 0.12;

export function blinkClosed(tSec: number, seed: number): boolean {
  const period = 3.0 + (seed % 5) * 0.35;
  return (tSec + seed * 0.731) % period < BLINK_S;
}

// The face geometry key: only idle, excited and sad have a blink variant (joy / winner eyes are
// already closed ^^ arcs, surprised stares).
export function faceKeyFor(expression: Expression, blink: boolean): FaceKey {
  if (!blink) return expression;
  switch (expression) {
    case 'idle':
      return 'idleBlink';
    case 'excited':
      return 'excitedBlink';
    case 'sad':
      return 'sadBlink';
    default:
      return expression;
  }
}
