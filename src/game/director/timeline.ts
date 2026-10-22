// src/game/director/timeline.ts — pure engine-log → beat mapping (D-01, D-19, D-24).
// PHASE 6 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of src/store.ts / src/settings,
//   - CLOCK-FREE (no wall-clock reads, no timers), and
//   - pure: every function returns new values and never mutates its inputs.
// One engine transition (GameLog.events) becomes a list of data beats. Every beat carries its
// own length in ms, so the presentation queue arms one watchdog per beat and no hand-summed
// animation budget exists anywhere (the v1 missing-preview bug cannot come back).
import type { Effect, Event, GameEvent } from '../../engine/state';

export const BEAT_MS = {
  dice: 1000,
  preview: 500,
  hopMax: 250,
  hopMin: 100,
  moveCap: 2000,
  startBonus: 800,
  event: 1000,
  stars: 600,
  finalRound: 1500,
} as const;

// Per-tile hop length: clamp(2000 / len, 100, 250). One move (event steps ≤ 20 by schema) stays
// within about 2 s.
export const hopMs = (len: number): number =>
  Math.min(BEAT_MS.hopMax, Math.max(BEAT_MS.hopMin, BEAT_MS.moveCap / Math.max(1, len)));

export type BeatSpec =
  | { kind: 'dice'; pid: string; face: number; ms: number }
  | { kind: 'preview'; pid: string; path: number[]; ms: number }
  | { kind: 'hop'; pid: string; path: number[]; by: 'dice' | 'event'; ms: number }
  | { kind: 'startBonus'; pid: string; stars: number; ms: number }
  | {
      kind: 'event';
      pid: string;
      eff: Effect;
      steps: number;
      suppressed: boolean;
      name: string;
      label: Event['label'];
      ms: number;
    }
  | { kind: 'stars'; pid: string; stars: number; ms: number }
  | { kind: 'finalRound'; ms: number };

export type BeatKind = BeatSpec['kind'];

export type Beat = BeatSpec & { id: number };

export interface TimelineCtx {
  totalRounds: number;
  firstPid: string;
  // Reduced motion: dice/preview/hop collapse to 0 ms; banner beats keep their length.
  reducedMotion: boolean;
  // The event tile resolved by this roll (GameState.lastMove.event) — supplies name/label.
  lastEvent: Pick<Event, 'name' | 'label'> | null;
}

export function buildTimeline(events: readonly GameEvent[], ctx: TimelineCtx): BeatSpec[] {
  const motion = (ms: number) => (ctx.reducedMotion ? 0 : ms);
  const hopBeatMs = (len: number) => motion(Math.round(hopMs(len) * len));
  const out: BeatSpec[] = [];
  for (const e of events) {
    switch (e.t) {
      case 'rolled':
        out.push({ kind: 'dice', pid: e.pid, face: e.face, ms: motion(BEAT_MS.dice) });
        break;
      case 'moved':
        if (e.by === 'dice') out.push({ kind: 'preview', pid: e.pid, path: [...e.path], ms: motion(BEAT_MS.preview) });
        out.push({ kind: 'hop', pid: e.pid, path: [...e.path], by: e.by, ms: hopBeatMs(e.path.length) });
        break;
      case 'startBonus':
        out.push({ kind: 'startBonus', pid: e.pid, stars: e.stars, ms: BEAT_MS.startBonus });
        break;
      case 'eventApplied':
        out.push({
          kind: 'event',
          pid: e.pid,
          eff: e.eff,
          steps: e.steps,
          suppressed: e.suppressed,
          name: ctx.lastEvent?.name ?? '',
          label: ctx.lastEvent?.label ?? '',
          ms: BEAT_MS.event,
        });
        break;
      case 'judged':
        if (e.success) out.push({ kind: 'stars', pid: e.pid, stars: e.stars, ms: BEAT_MS.stars });
        break;
      case 'turnStarted':
        // ROUND-02 / D-24: only the first regular turn of the last round.
        if (e.round === ctx.totalRounds && !e.isExtra && e.pid === ctx.firstPid) {
          out.push({ kind: 'finalRound', ms: BEAT_MS.finalRound });
        }
        break;
      default:
        // landed, questDrawn, gameStarted, judgementUndone, gameEnded → no beat
        break;
    }
  }
  return out;
}

export const budgetMs = (beats: readonly BeatSpec[]): number => beats.reduce((s, b) => s + b.ms, 0);

// Beats shown as a DOM banner over the canvas (UI-SPEC S6).
export const isBannerBeat = (beat: BeatSpec): boolean =>
  beat.kind === 'startBonus' || beat.kind === 'event' || beat.kind === 'stars' || beat.kind === 'finalRound';
