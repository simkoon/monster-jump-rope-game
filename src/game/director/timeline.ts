// src/game/director/timeline.ts — pure engine-log → beat mapping (D-01, D-19, D-24).
// PHASE 6 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of src/store.ts / src/settings,
//   - CLOCK-FREE (no wall-clock reads, no timers), and
//   - pure: every function returns new values and never mutates its inputs.
// One engine transition (GameLog.events) becomes a list of data beats. Every beat carries its
// own length in ms, so the presentation queue arms one watchdog per beat and no hand-summed
// animation budget exists anywhere (the v1 missing-preview bug cannot come back).
import type { AnimalId } from '../../engine/animals';
import type { Effect, Event, GameEvent } from '../../engine/state';

// Fixed beat lengths. The success (stars) beat is not here: its length depends on the star tier
// (STARS_MS below, Phase 8 D-01 — replaces the single Phase 7 D-12 900 ms value).
export const BEAT_MS = {
  dice: 1000,
  preview: 500,
  hopMax: 250,
  hopMin: 100,
  moveCap: 2000,
  startBonus: 800,
  event: 1000,
  finalRound: 1500,
  // Phase 7 reaction beats (D-13, D-14): the 3D characters show their sad / winner faces here.
  miss: 700,
  win: 1500,
} as const;

// Phase 8 D-01: the success beat grows with the star tier so ⭐3 is clearly bigger. The longest
// (2200 ms) leaves 300 ms of the 2.5 s judge → next budget for input locks (D-02).
export const STARS_MS = { 1: 1600, 2: 1900, 3: 2200 } as const;
// D-08: under reduced motion every tier plays one fixed 1200 ms beat (banner + fade-in, no flight,
// no confetti). It is NOT collapsed to 0 like the motion beats — the banner still has to be read.
export const STARS_MS_REDUCED = 1200;

export type StarTier = 1 | 2 | 3;

// Clamp a star count into a tier (0 → 1, 4+ → 3).
export const starTier = (stars: number): StarTier => (stars >= 3 ? 3 : stars <= 1 ? 1 : 2);

export const starsBeatMs = (stars: number, reduced: boolean): number =>
  reduced ? STARS_MS_REDUCED : STARS_MS[starTier(stars)];

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
  | { kind: 'finalRound'; ms: number }
  // Phase 7 (07-01): one ❌ judgement of pid, and the natural game end (winners and their
  // animals in participant order; no pid — every co-winner cheers).
  // Phase 8 D-09: retry = a retry quest follows in the same transition (the soft banner reads
  // "괜찮아! 다시 해 보자" instead of "다음엔 꼭!"). buildTimeline always sets it; absent = false.
  | { kind: 'miss'; pid: string; retry?: boolean; ms: number }
  | { kind: 'win'; winners: string[]; animals: AnimalId[]; ms: number };

export type BeatKind = BeatSpec['kind'];

export type Beat = BeatSpec & { id: number };

export interface TimelineCtx {
  totalRounds: number;
  firstPid: string;
  // Reduced motion: dice/preview/hop collapse to 0 ms; banner and reaction beats keep their length,
  // and the stars beat becomes STARS_MS_REDUCED (Phase 8 D-08).
  reducedMotion: boolean;
  // The event tile resolved by this roll (GameState.lastMove.event) — supplies name/label.
  lastEvent: Pick<Event, 'name' | 'label'> | null;
  // Participant id → animal, so the win beat carries the winners' animals (D-14).
  animalOf: Readonly<Record<string, AnimalId>>;
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
        // D-13: every ❌ (also the first one that leads to a retry) is one miss beat. Miss and win
        // keep their length under reduced motion — they show expressions (D-16, Pitfall 9).
        // Phase 8 D-01 / D-08: the stars length comes from the tier table, never from motion().
        // D-09: the engine's retry path pushes questDrawn attempt 2 of the same pid in this log.
        if (e.success) {
          out.push({ kind: 'stars', pid: e.pid, stars: e.stars, ms: starsBeatMs(e.stars, ctx.reducedMotion) });
        } else {
          const pid = e.pid;
          const retry = events.some((x) => x.t === 'questDrawn' && x.pid === pid && x.attempt === 2);
          out.push({ kind: 'miss', pid, retry, ms: BEAT_MS.miss });
        }
        break;
      case 'gameEnded': {
        // D-14: only the natural end plays the win beat. A manual end (지금 끝내기) yields nothing
        // here and the director skips every beat, so the result screen shows at once.
        if (e.reason !== 'rounds-complete') break;
        const animals = e.winners.flatMap((pid) => (ctx.animalOf[pid] ? [ctx.animalOf[pid]] : []));
        out.push({ kind: 'win', winners: [...e.winners], animals, ms: BEAT_MS.win });
        break;
      }
      case 'turnStarted':
        // ROUND-02 / D-24: only the first regular turn of the last round.
        if (e.round === ctx.totalRounds && !e.isExtra && e.pid === ctx.firstPid) {
          out.push({ kind: 'finalRound', ms: BEAT_MS.finalRound });
        }
        break;
      default:
        // landed, questDrawn, gameStarted, judgementUndone → no beat
        break;
    }
  }
  return out;
}

export const budgetMs = (beats: readonly BeatSpec[]): number => beats.reduce((s, b) => s + b.ms, 0);

// Beats shown as a DOM banner over the canvas (UI-SPEC S6). Phase 8 D-09: miss now shows the soft
// one-line banner too.
export const isBannerBeat = (beat: BeatSpec): boolean =>
  beat.kind === 'startBonus' ||
  beat.kind === 'event' ||
  beat.kind === 'stars' ||
  beat.kind === 'finalRound' ||
  beat.kind === 'miss';

// Beats completed by the DOM Banner timer at exactly beat.ms (D-22, UI-SPEC C7a): the banner beats
// (miss included, with its soft copy since Phase 8 D-09) plus the win beat. 3D consumers never
// complete them; the store watchdog (ms + 500) is the fallback when no Banner is mounted.
export const isTimedBeat = (beat: BeatSpec): boolean =>
  isBannerBeat(beat) || beat.kind === 'miss' || beat.kind === 'win';
