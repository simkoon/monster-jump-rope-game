// src/game/hud/Banner.tsx — the beat banner over the canvas (D-23, D-24, D-25, UI-SPEC S6b).
// Completes every timed beat of the presentation queue (Phase 7 D-22, UI-SPEC C7a): the
// startBonus / event / stars / finalRound banner beats, the copy-less miss beat and the win beat.
// It shows the beat's copy (none for miss) for exactly beat.ms and then completes it by id.
// Completion is id-guarded in the store, so a late or duplicate timer is harmless, and the store
// watchdog still ends the beat if this component is not mounted (T-06-10, T-07-01). Dice /
// preview / hop beats belong to the 3D scene: the Banner renders nothing for them and never
// completes them.
// Reduced motion keeps the same duration (the beat data decides it); only CSS animation is dropped.
// The event name renders as JSX text only (T-06-08); the win banner holds only animal emojis and
// fixed animal names (T-07-02).
import { useEffect, type CSSProperties } from 'react';
import { usePresentation } from '../usePresentation';
import { isTimedBeat } from '../director/timeline';
import { bannerCopy } from '../labels';

export default function Banner() {
  const beat = usePresentation((s) => (s.current && isTimedBeat(s.current) ? s.current : null));

  useEffect(() => {
    if (!beat) return;
    const id = beat.id;
    const timer = setTimeout(() => usePresentation.getState().completeBeat(id), beat.ms);
    return () => clearTimeout(timer);
  }, [beat]);

  if (!beat) return null;
  const copy = bannerCopy(beat);
  if (!copy) return null;

  return (
    <div
      key={beat.id}
      className={`beat-banner beat-banner--${copy.tone}${copy.variant ? ` beat-banner--${copy.variant}` : ''}`}
      role="status"
      style={{ '--beat-ms': `${beat.ms}ms` } as CSSProperties}
    >
      {copy.label === '보너스' && <span className="game-event-chip bonus">🎁 보너스</span>}
      {copy.label === '함정' && <span className="game-event-chip trap">🕳️ 함정</span>}
      {copy.top && <p className="beat-banner-top">{copy.top}</p>}
      {copy.big &&
        (copy.bigLabel ? (
          <p className="beat-banner-big beat-banner-emoji" role="img" aria-label={copy.bigLabel}>
            {copy.big}
          </p>
        ) : (
          <p className="beat-banner-big">{copy.big}</p>
        ))}
      {copy.sub && <p className="beat-banner-sub">{copy.sub}</p>}
    </div>
  );
}
