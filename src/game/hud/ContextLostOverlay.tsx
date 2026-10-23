// src/game/hud/ContextLostOverlay.tsx — board loading line and the recovery overlay (D-27, STAB-02,
// UI-SPEC S7). Props-only.
//   loading      → bouncing 🎲 + 판을 준비하고 있어요… (role status, no action)
//   lost/failed  → alertdialog card with title, body and one 🔄 화면 다시 그리기 button, focused on
//                  open because it is the only action on this screen. No confirmation: redrawing
//                  keeps stars, positions and the turn (state-preserving).
import { useEffect, useId, useRef } from 'react';
import { CTX_COPY, REDRAW_LABEL } from '../labels';

interface ContextLostOverlayProps {
  mode: 'loading' | 'lost' | 'failed';
  onRedraw: () => void;
}

export default function ContextLostOverlay({ mode, onRedraw }: ContextLostOverlayProps) {
  const titleId = useId();
  const bodyId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (mode !== 'loading') btnRef.current?.focus();
  }, [mode]);

  if (mode === 'loading') {
    return (
      <div className="ctx-overlay ctx-overlay--loading" role="status">
        <span className="ctx-dice" aria-hidden="true">
          🎲
        </span>
        <p className="ctx-loading">{CTX_COPY.loading}</p>
      </div>
    );
  }

  const copy = CTX_COPY[mode];
  return (
    <div className="ctx-overlay" role="alertdialog" aria-labelledby={titleId} aria-describedby={bodyId}>
      <div className="game-mission-card ctx-card">
        <span className="ctx-icon" aria-hidden="true">
          🔄
        </span>
        <h2 id={titleId} className="ctx-title">
          {copy.title}
        </h2>
        <p id={bodyId} className="ctx-body">
          {copy.body}
        </p>
        <button ref={btnRef} type="button" className="game-btn ctx-btn" onClick={onRedraw}>
          {REDRAW_LABEL}
        </button>
      </div>
    </div>
  );
}
