// src/game/sfx/useSfx.ts — the one beat → sound subscriber (Phase 8 AUDIO-01, D-08, D-19, D-20,
// D-21, D-23, RESEARCH Pattern 8). Mounted once in GameApp, next to useDirector.
//
// D-19: the beat data is the single source of every game sound. A usePresentation subscription
//   schedules a beat's sounds only on a TRANSITION (current.id changes), never on an effect mount,
//   and a module-scoped lastPlayedId plays each beat id at most once — a StrictMode double mount or
//   a remount can never play a beat twice. Sounds are scheduled ahead on the audio clock
//   (sfx.play delaySec) in the beat's id group; this hook never ends a beat (the Banner timer, the
//   3D consumers and the store watchdog own completion).
// Skip vs natural end: when a beat stops being current earlier than its length (minus
//   SKIP_TOLERANCE_MS) — tap-to-skip, 지금 끝내기 / skipAll, a reset — its group is stopped
//   (scheduled voices cancelled, playing ones faded over sfx.FADE_SEC). A beat that ends on time
//   lets its tails ring (the ding runs ~270 ms past a ⭐1 beat). The start time comes from
//   performance.now(), the same wall-clock confinement as the queue watchdog: UI timing only.
// D-20: soundOn is read live from useSettings — the engine is synced on mount and on every
//   change via sfx.setEnabled (off = everything stops, no new nodes; on = the next beat plays).
// D-21: the AudioContext is created / resumed only inside a user gesture: document capture
//   pointerup / touchend / click / keydown call sfx.unlock() (when soundOn). One physical tap fires
//   several of these events; UNLOCK_THROTTLE_MS folds them into one unlock so sfx's iOS recovery
//   ladder (suspend + resume, then recreate) counts gestures, not events. A touch pointerup is
//   left to its touchend (the event iOS has always honoured for audio). The 게임 시작 tap is the
//   first gesture. Hidden page → every voice stops at once; visible again → resume is retried.
// D-08: under reduced motion the dice beat is 0 ms and never becomes current, so the dice sound
//   is played once from the engine log instead (a continuous log, seq = prev + 1, with `rolled`).
// D-23: every listener and store subscription is installed in one effect and removed in its
//   cleanup.
import { useEffect } from 'react';
import { isLuckyEvent } from '../../engine/stats';
import { useGameStore } from '../../harness/useGameStore';
import { useSettings } from '../../settings';
import { successPlan } from '../director/successPlan';
import type { Beat } from '../director/timeline';
import { prefersReducedMotion } from '../reducedMotion';
import { usePresentation } from '../usePresentation';
import { successSfx } from './recipes';
import sfx from './sfx';

// A beat that ends within this many ms of its length ended on time (not a skip).
export const SKIP_TOLERANCE_MS = 50;
// A hop tick sounds slightly before the token touches down (seconds).
export const HOP_LEAD_SEC = 0.03;
// Events of one tap closer together than this unlock once.
export const UNLOCK_THROTTLE_MS = 400;
export const GESTURE_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'] as const;

// Module scope (survives StrictMode / remounts): the last beat id whose sounds were scheduled, and
// when the current beat started.
let lastPlayedId: number | null = null;
let playing: { id: number; at: number } | null = null;

// Schedule the sounds of one beat (UI-SPEC F8 소리 큐). Pure mapping onto sfx.play.
export function scheduleBeat(beat: Beat, reduced: boolean): void {
  const group = beat.id;
  switch (beat.kind) {
    case 'dice':
      sfx.play('dice', { group });
      break;
    case 'hop': {
      const n = beat.path.length;
      if (n === 0 || beat.ms <= 0) break;
      const seg = beat.ms / n / 1000;
      for (let k = 0; k < n; k++) sfx.play('hop', { group, delaySec: Math.max(0, (k + 1) * seg - HOP_LEAD_SEC) });
      break;
    }
    case 'stars': {
      const plan = successPlan(beat.stars, beat.ms, reduced);
      sfx.play(successSfx(plan.tier), { group, delaySec: plan.landMs / 1000 });
      sfx.play('ding', { group, delaySec: plan.flyToMs / 1000 });
      break;
    }
    case 'miss':
      sfx.play('miss', { group });
      break;
    case 'startBonus':
      sfx.play('startBonus', { group });
      break;
    case 'event':
      sfx.play(isLuckyEvent({ eff: beat.eff, label: beat.label }, beat.suppressed) ? 'eventBonus' : 'eventTrap', { group });
      break;
    default:
      // preview, finalRound, win → no sound (the ceremony plays the fanfare itself)
      break;
  }
}

function onBeatChange(cur: Beat | null, prev: Beat | null): void {
  const now = performance.now();
  if (prev && playing?.id === prev.id && now - playing.at < prev.ms - SKIP_TOLERANCE_MS) {
    sfx.stopGroup(prev.id);
  }
  playing = cur ? { id: cur.id, at: now } : null;
  if (cur && cur.id !== lastPlayedId) {
    lastPlayedId = cur.id;
    scheduleBeat(cur, prefersReducedMotion());
  }
}

export function startSfx(): () => void {
  const unBeats = usePresentation.subscribe((s, p) => {
    if (s.current?.id !== p.current?.id) onBeatChange(s.current, p.current);
  });

  sfx.setEnabled(useSettings.getState().soundOn);
  const unSettings = useSettings.subscribe((s, p) => {
    if (s.soundOn !== p.soundOn) sfx.setEnabled(s.soundOn);
  });

  let lastUnlock = -Infinity;
  const onGesture = (e: Event) => {
    if (!useSettings.getState().soundOn) return;
    if (e.type === 'pointerup' && (e as PointerEvent).pointerType === 'touch') return; // its touchend follows
    const now = performance.now();
    if (now - lastUnlock < UNLOCK_THROTTLE_MS) return;
    lastUnlock = now;
    sfx.unlock();
  };
  for (const type of GESTURE_EVENTS) document.addEventListener(type, onGesture, true);

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') sfx.stopAll(0);
    else sfx.resume();
  };
  document.addEventListener('visibilitychange', onVisibility);

  const unGame = useGameStore.subscribe((s, p) => {
    const next = s.game;
    const prev = p.game;
    if (!next || !prev || next === prev) return;
    if (next.board !== prev.board || next.log.seq !== prev.log.seq + 1) return;
    if (!prefersReducedMotion()) return;
    if (next.log.events.some((e) => e.t === 'rolled')) sfx.play('dice');
  });

  return () => {
    unBeats();
    unSettings();
    unGame();
    for (const type of GESTURE_EVENTS) document.removeEventListener(type, onGesture, true);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

// StrictMode-safe: the double mount installs and removes once, then installs again.
export function useSfx(): void {
  useEffect(() => startSfx(), []);
}
