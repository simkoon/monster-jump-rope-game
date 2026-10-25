// src/game/director/useDirector.ts — the presentation director (D-01, D-24, D-25, HUD-03).
// Feeds every engine transition into the beat queue INSIDE the same store update:
// zustand calls subscribe listeners synchronously within `set`, so the engine change and
// `busy = true` land together and React renders once. Consuming the log in a React effect keyed
// on the game would render one frame of `awaitingJudgement` with `busy = false` (the quest card
// and controls flicker — RESEARCH Pattern 3 / Pitfall 4), so that is deliberately not done here.
// The director never writes the engine store.
import { useEffect } from 'react';
import type { GameState } from '../../engine/state';
import { useGameStore } from '../../harness/useGameStore';
import { usePresentation } from '../usePresentation';
import { prefersReducedMotion } from '../reducedMotion';
import { displayedFrom, EMPTY_DISPLAYED } from './displayed';
import { buildTimeline, type TimelineCtx } from './timeline';

export function timelineCtx(game: GameState): TimelineCtx {
  return {
    totalRounds: game.config.rules.nomination ? Number.POSITIVE_INFINITY : game.config.rules.rounds,
    firstPid: game.config.participants[0].id,
    reducedMotion: prefersReducedMotion(),
    lastEvent: game.lastMove?.event ?? null,
    animalOf: Object.fromEntries(game.config.participants.map((p) => [p.id, p.animal])),
  };
}

export function directGame(next: GameState | null, prev: GameState | null): void {
  if (next === prev) return;
  const p = usePresentation.getState();
  if (!next) {
    p.reset(EMPTY_DISPLAYED, null);
    return;
  }
  // Discontinuity (new game / restart / injected state): resync without beats — except a fresh
  // game's own log, whose timeline is replayed (1-round game → "마지막 라운드!" banner).
  if (!prev || next.board !== prev.board || next.log.seq !== prev.log.seq + 1) {
    p.reset(displayedFrom(next), next.log);
    if (next.log.events[0]?.t === 'gameStarted') p.play(buildTimeline(next.log.events, timelineCtx(next)));
    return;
  }
  // "지금 끝내기" mid-animation: never hold the result screen behind queued beats (Pitfall 11).
  // Only the manual end skips; a rounds-complete end plays its win beat (Phase 7 D-14).
  const ended = next.log.events.find((e) => e.t === 'gameEnded');
  if (ended?.t === 'gameEnded' && ended.reason === 'manual') {
    p.skipAll();
    return;
  }
  // play([]) drains and resyncs, which also covers judgementUndone (Pitfall 10).
  p.play(buildTimeline(next.log.events, timelineCtx(next)));
}

// Mount resync (idempotent, plays nothing), then subscribe. Returns the unsubscribe.
export function startDirector(): () => void {
  const game = useGameStore.getState().game;
  usePresentation.getState().reset(game ? displayedFrom(game) : EMPTY_DISPLAYED, game?.log ?? null);
  return useGameStore.subscribe((s, p) => directGame(s.game, p.game));
}

// StrictMode-safe: a double mount only resyncs twice.
export function useDirector(): void {
  useEffect(() => startDirector(), []);
}
