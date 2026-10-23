// src/game/useSkipOnTap.ts — tap (or Escape) to skip the success / win beat (Phase 8 FX-03, D-07,
// D-23, UI-SPEC F5, RESEARCH Pattern 5).
//
// While a skippable beat is current, a tap anywhere on the page ends THAT beat at once: the hook
// calls the id-guarded completeBeat(id) with the id captured when the listener was installed, so a
// late tap can never end a later beat (T-08-04). Stars are already paid by the engine, so the
// queue drains / moves on and the scoreboard shows the final value immediately. No overlay is
// laid over the stage, so 지금 끝내기 and the dialogs stay reachable.
//
// Why a document CAPTURE `click` (Pitfall 3): the ✅ tap that starts the stars beat has already
// passed the document capture phase when React flushes the effect that installs the listener, so
// the starting tap never skips. A bubble listener would receive that same click on its way up and
// end the celebration at 0 ms. `click` (not pointerdown) so the skip tap is not re-targeted onto
// the 다음 ➡️ button that re-renders under the finger.
//
// Why the shared lock (Pitfall 4): skipping empties the queue and 다음 ➡️ shows in the same
// render; lockInputFor(SKIP_LOCK_MS) makes every guarded play action ignore taps for 250 ms.
//
// Ignore list: taps / Escape inside [data-skip-ignore] (지금 끝내기, every Modal overlay incl.
// ConfirmDialog; later the sound toggle and the ceremony buttons) never skip. Short beats (dice,
// preview, hop, miss, startBonus, event, finalRound) are never skippable (D-07).
// D-23: listeners exist only while enabled and are removed on disable / unmount.
import { useEffect, useRef } from 'react';
import { usePresentation } from './usePresentation';
import { lockInputFor, SKIP_LOCK_MS } from './useInputLock';
import type { Beat } from './director/timeline';

export const SKIP_IGNORE_ATTR = 'data-skip-ignore';

export const isSkippable = (beat: Beat | null): boolean => beat?.kind === 'stars' || beat?.kind === 'win';

function ignored(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(`[${SKIP_IGNORE_ATTR}]`) !== null;
}

// Generic: while `enabled`, a page tap or Escape calls onSkip (reused by the ceremony intro, 08-10).
// onSkip may be an inline callback (the latest one is always called, no re-install per render);
// a change of `resetKey` re-installs the listeners, so a newly started beat is again protected
// from the tap that started it (Pitfall 3).
export function useTapToSkip(enabled: boolean, onSkip: () => void, resetKey?: unknown): void {
  const onSkipRef = useRef(onSkip);
  onSkipRef.current = onSkip;

  useEffect(() => {
    if (!enabled) return;
    const onClick = (e: MouseEvent) => {
      if (ignored(e.target)) return;
      onSkipRef.current();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || ignored(e.target)) return;
      onSkipRef.current();
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [enabled, resetKey]);
}

// The stage hook: skip the current stars / win beat by its id, then lock play input for 250 ms.
export function useSkipOnTap(): void {
  const beatId = usePresentation((s) => (s.current && isSkippable(s.current) ? s.current.id : null));
  // Keyed on the beat id: the listeners are installed per beat, so `beatId` here is the id the
  // listener was installed for, and the id guard in completeBeat drops it once that beat is over.
  useTapToSkip(
    beatId !== null,
    () => {
      if (beatId === null) return;
      lockInputFor(SKIP_LOCK_MS);
      usePresentation.getState().completeBeat(beatId);
    },
    beatId,
  );
}
