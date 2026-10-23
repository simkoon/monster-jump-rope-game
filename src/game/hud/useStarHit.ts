// src/game/hud/useStarHit.ts — which scoreboard cell shows the star arrival flash (08-07, D-03, UI-SPEC F3).
// During [flyToMs, flyToMs + HIT_MS] of the current stars beat it returns that beat's pid; otherwise
// null. The hit is keyed by the beat id, so a beat that ends or is skipped clears it in the same
// render (D-07). Reduced motion (D-08) never flashes. Timers are cleared on beat change / unmount.
// It never completes a beat (the Banner timer and the store watchdog own that, Phase 7 D-22).
import { useEffect, useMemo, useState } from 'react';
import { successPlan } from '../director/successPlan';
import { prefersReducedMotion } from '../reducedMotion';
import { usePresentation } from '../usePresentation';

export const HIT_MS = 240;

export function useStarHit(): string | null {
  const beat = usePresentation((s) => (s.current?.kind === 'stars' ? s.current : null));
  const reduced = useMemo(prefersReducedMotion, []);
  const [hit, setHit] = useState<{ id: number; pid: string } | null>(null);

  useEffect(() => {
    if (!beat || reduced) return;
    const { id, pid } = beat;
    const { flyToMs } = successPlan(beat.stars, beat.ms, false);
    const on = setTimeout(() => setHit({ id, pid }), flyToMs);
    const off = setTimeout(() => setHit(null), flyToMs + HIT_MS);
    return () => {
      clearTimeout(on);
      clearTimeout(off);
    };
  }, [beat, reduced]);

  return hit && beat && hit.id === beat.id ? hit.pid : null;
}
