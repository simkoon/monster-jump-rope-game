// src/game/hud/ControlsBar.tsx — the phase-driven PRIMARY buttons (UI-SPEC FSM table).
// 🎴 카드 뽑기 (awaitingDraw), 🎲 주사위 굴리기 (awaitingRoll), 다음 ➡️ (turnResolved, neutral).
// The 성공/실패 pair lives in MissionOverlay (awaitingJudgement). While an animation is
// running (`busy`), the whole bar is HIDDEN so no double-tap can skip a phase (D-07/ART-04).
import type { Phase } from '../../engine/types';

interface ControlsBarProps {
  phase: Phase;
  busy: boolean;
  onDraw: () => void;
  onRoll: () => void;
  onNext: () => void;
}

export default function ControlsBar({ phase, busy, onDraw, onRoll, onNext }: ControlsBarProps) {
  // ANIM_DONE gating: mount the next-phase control ONLY when not animating (D-07).
  if (busy) return null;

  if (phase === 'awaitingDraw') {
    return (
      <div className="game-controls">
        <button type="button" className="game-btn" onClick={onDraw}>
          🎴 카드 뽑기
        </button>
      </div>
    );
  }

  if (phase === 'awaitingRoll') {
    return (
      <div className="game-controls">
        <button type="button" className="game-btn" onClick={onRoll}>
          🎲 주사위 굴리기
        </button>
      </div>
    );
  }

  if (phase === 'turnResolved') {
    return (
      <div className="game-controls">
        <button type="button" className="game-btn game-btn--neutral" onClick={onNext}>
          다음 ➡️
        </button>
      </div>
    );
  }

  // awaitingJudgement → MissionOverlay owns the controls; gameOver → ResultView.
  return null;
}
