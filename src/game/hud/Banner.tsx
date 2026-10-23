// src/game/hud/Banner.tsx — the beat banner over the canvas (D-23, D-24, D-25, UI-SPEC S6b).
// Completes every timed beat of the presentation queue (Phase 7 D-22, UI-SPEC C7a): the
// startBonus / event / stars / finalRound / miss banner beats and the win beat.
// It shows the beat's copy and completes the beat by id exactly beat.ms after the beat started.
// Phase 8 (08-02): the success banner ("퀘스트 성공!" / "⭐+N", FX-02) enters late, at
// successPlan(...).bannerMs (render nothing before), sized per star tier (beat-banner--tier1/2/3,
// --banner-pop). Its entry delay never moves the completion timer, which still runs from the beat
// start (T-08-30). The miss beat shows the soft one-liner at once (D-09, beat-banner--soft).
// Completion is id-guarded in the store, so a late or duplicate timer is harmless, and the store
// watchdog still ends the beat if this component is not mounted (T-06-10, T-07-01). Dice /
// preview / hop beats belong to the 3D scene: the Banner renders nothing for them and never
// completes them.
// Reduced motion keeps the same duration (the beat data decides it); only CSS animation is dropped,
// and the success banner shows at 0 ms (successPlan reduced → bannerMs 0, D-08).
// The event name renders as JSX text only (T-06-08); the win banner holds only animal emojis and
// fixed animal names (T-07-02). Its emoji row holds one item per animal so the flex gap and wrap
// apply (IN-01); more than 4 winners add is-many for the smaller size.
import { Fragment, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { usePresentation } from '../usePresentation';
import { isTimedBeat } from '../director/timeline';
import { successPlan } from '../director/successPlan';
import { prefersReducedMotion } from '../reducedMotion';
import { bannerCopy } from '../labels';

export default function Banner() {
  const beat = usePresentation((s) => (s.current && isTimedBeat(s.current) ? s.current : null));
  const reduced = useMemo(prefersReducedMotion, []);
  const plan = beat?.kind === 'stars' ? successPlan(beat.stars, beat.ms, reduced) : null;
  const showAt = plan?.bannerMs ?? 0;
  // The id of the delayed (stars) beat whose banner entry time has passed.
  const [shownId, setShownId] = useState<number | null>(null);

  // Completion: from the beat start, exactly beat.ms, id-guarded in the store (unchanged contract).
  useEffect(() => {
    if (!beat) return;
    const id = beat.id;
    const timer = setTimeout(() => usePresentation.getState().completeBeat(id), beat.ms);
    return () => clearTimeout(timer);
  }, [beat]);

  // Delayed entry of the success banner (D-03); a 0 ms entry renders at once.
  useEffect(() => {
    if (!beat || showAt <= 0) return;
    const id = beat.id;
    const timer = setTimeout(() => setShownId(id), showAt);
    return () => clearTimeout(timer);
  }, [beat, showAt]);

  if (!beat) return null;
  if (showAt > 0 && shownId !== beat.id) return null;
  const copy = bannerCopy(beat);
  if (!copy) return null;

  const classes = ['beat-banner', `beat-banner--${copy.tone}`];
  if (copy.variant) classes.push(`beat-banner--${copy.variant}`);
  if (copy.tier) classes.push(`beat-banner--tier${copy.tier}`);
  const style: Record<string, string> = { '--beat-ms': `${beat.ms}ms` };
  if (plan) {
    style['--banner-pop'] = String(plan.bannerPop);
    // The banner mounts at bannerMs, so its end fade is offset by the entry time (UI-SPEC F4).
    style['--banner-at'] = `${plan.bannerMs}ms`;
  }

  return (
    <div key={beat.id} className={classes.join(' ')} role="status" style={style as CSSProperties}>
      {copy.label === '보너스' && <span className="game-event-chip bonus">🎁 보너스</span>}
      {copy.label === '함정' && <span className="game-event-chip trap">🕳️ 함정</span>}
      {copy.top && <p className="beat-banner-top">{copy.top}</p>}
      {copy.big &&
        (copy.bigLabel ? (
          <p
            className={`beat-banner-big beat-banner-emoji${(copy.bigItems?.length ?? 0) > 4 ? ' is-many' : ''}`}
            role="img"
            aria-label={copy.bigLabel}
          >
            {copy.bigItems
              ? copy.bigItems.map((item, i) => (
                  <Fragment key={i}>
                    {i > 0 && ' '}
                    <span className="beat-banner-emoji-item">{item}</span>
                  </Fragment>
                ))
              : copy.big}
          </p>
        ) : (
          <p className="beat-banner-big">{copy.big}</p>
        ))}
      {copy.sub && <p className="beat-banner-sub">{copy.sub}</p>}
    </div>
  );
}
