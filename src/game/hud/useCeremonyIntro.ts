// src/game/hud/useCeremonyIntro.ts — the ceremony intro state (Phase 8 D-16, END-03, UI-SPEC F5 / F7
// 등장 연출).
//
// While `active` (the ceremony is showing) a new intro starts once per game: introId + 1,
// introActive true, the fanfare plays once in its own sfx group, and CEREMONY_INTRO_MS later the
// intro ends by itself. A tap anywhere (or Escape) except inside the skip-ignore attribute ends it at
// once and fades the fanfare out (sfx.stopGroup). There is NO input lock after it (UI-SPEC F5): the
// ceremony buttons are live from the first frame and carry the skip-ignore attribute, so a 다시 하기 /
// 처음으로 tap never goes through the skip path.
//
// "Once per game": the run remembers the `gameKey` it was started for (GameStage passes the board,
// which is new on every restart). A rising `active` edge or a new key while active starts the next
// run; the same key never replays. The run is derived during render (React's "adjust state when a
// prop changes" pattern), so StrictMode's double effects cannot start or play twice; the fanfare
// effect is additionally guarded by the run id it has already played.
// Leaving the ceremony (restart / reset while the intro runs) ends the run and fades the fanfare:
// 🔁 다시 하기 flips `active` while the hook stays mounted; 처음으로 sets game = null, GameApp
// unmounts GameStage, and the unmount cleanup fades the group instead (WR-03).
import { useCallback, useEffect, useRef, useState } from 'react';
import sfx from '../sfx/sfx';
import { CEREMONY_INTRO_MS } from '../layout/podiumLayout';
import { useTapToSkip } from '../useSkipOnTap';

interface IntroRun {
  key: unknown;
  id: number;
  active: boolean;
}

export interface CeremonyIntro {
  introId: number;
  introActive: boolean;
  endIntro: () => void;
}

const groupOf = (id: number) => `ceremony-intro-${id}`;

export function useCeremonyIntro(active: boolean, gameKey: unknown): CeremonyIntro {
  const [run, setRun] = useState<IntroRun | null>(null);

  // Render-phase derivation: start a run on a new game key while active, end it when inactive.
  if (active && (run === null || run.key !== gameKey)) {
    setRun({ key: gameKey, id: (run?.id ?? 0) + 1, active: true });
  } else if (!active && run?.active) {
    setRun({ ...run, active: false });
  }

  const introId = run?.id ?? 0;
  const introActive = active && run !== null && run.key === gameKey && run.active;

  // The fanfare: once per run id (StrictMode-safe through the ref).
  const playedRef = useRef(0);
  useEffect(() => {
    if (!introActive || playedRef.current === introId) return;
    playedRef.current = introId;
    sfx.play('fanfare', { group: groupOf(introId) });
  }, [introActive, introId]);

  // Leaving the ceremony while the fanfare may still ring: fade it.
  const wasActive = useRef(false);
  useEffect(() => {
    if (wasActive.current && !active && playedRef.current > 0) sfx.stopGroup(groupOf(playedRef.current));
    wasActive.current = active;
  }, [active]);

  // Unmounted while the fanfare may still ring (처음으로): fade it too. Deferred by one microtask so
  // StrictMode's simulated unmount (cleanup, then the setup again in the same commit) cancels the
  // stop instead of cutting the fanfare it has just started.
  const unmountStop = useRef<{ cancelled: boolean } | null>(null);
  useEffect(() => {
    if (unmountStop.current) unmountStop.current.cancelled = true;
    unmountStop.current = null;
    return () => {
      const id = playedRef.current;
      if (id === 0) return;
      const pending = { cancelled: false };
      unmountStop.current = pending;
      queueMicrotask(() => {
        if (!pending.cancelled) sfx.stopGroup(groupOf(id));
      });
    };
  }, []);

  const finish = useCallback(() => {
    setRun((r) => (r && r.active ? { ...r, active: false } : r));
  }, []);

  // The intro ends by itself after CEREMONY_INTRO_MS (re-armed per run; cleared on unmount).
  useEffect(() => {
    if (!introActive) return;
    const t = setTimeout(finish, CEREMONY_INTRO_MS);
    return () => clearTimeout(t);
  }, [introActive, introId, finish]);

  // A tap ends the intro at once and fades this run's fanfare (60 ms, sfx FADE_SEC).
  const endIntro = useCallback(() => {
    if (introId > 0) sfx.stopGroup(groupOf(introId));
    finish();
  }, [introId, finish]);

  // Tap / Escape ends it at once. Keyed on the run id, so a new intro is installed after the tap
  // that started it (Pitfall 3).
  useTapToSkip(introActive, endIntro, introId);

  return { introId, introActive, endIntro };
}
