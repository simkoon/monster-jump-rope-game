// src/game/hud/ControlsBar.tsx — phase-driven action area v2 (HUD-03, HUD-04, D-21, D-25, UI-SPEC S5).
//   awaitingRoll      → one big 🎲 주사위 굴리기 (die emoji at display size, thumb area)
//   awaitingJudgement → no primary (the quest card owns ✅/❌)
//   turnResolved      → result line (🎉 성공! ⭐+n / 아쉬워요! …) above 다음 ➡️ / 🔁 한 번 더 하기 /
//                       🏆 결과 보기 (same advanceTurn, label only, same slot as 🎲)
//   gameOver          → nothing (the result screen takes over)
// `hidden` hides the whole area while presentation beats run — hidden, never disabled (D-25), so
// the result line and the buttons appear together only after the beats end.
// `↩️ 판정 되돌리기` is shown only while an undo exists — hidden, never disabled (D-16).
// The next phase's primary button lands in the same place (React reuses the node), so this alone
// does NOT stop a double tap from skipping a phase: the screen component wraps every action in the
// useInputLock guard for that (T-05-19, CR-01, T-06-09).
import type { JudgementResult, Phase } from '../../engine/state';

export type NextKind = 'next' | 'extra' | 'result';

const NEXT_LABEL: Record<NextKind, string> = {
  next: '다음 ➡️',
  extra: '🔁 한 번 더 하기',
  result: '🏆 결과 보기',
};

interface ControlsBarProps {
  phase: Phase;
  hidden?: boolean;
  canUndo: boolean;
  nextKind: NextKind;
  judgement: JudgementResult | null;
  onRoll: () => void;
  onNext: () => void;
  onUndo: () => void;
}

export default function ControlsBar({
  phase,
  hidden = false,
  canUndo,
  nextKind,
  judgement,
  onRoll,
  onNext,
  onUndo,
}: ControlsBarProps) {
  if (hidden || phase === 'gameOver') return null;

  let primary = null;
  let result = null;
  if (phase === 'awaitingRoll') {
    primary = (
      <button type="button" className="game-btn" onClick={onRoll}>
        <span className="game-btn-emoji">🎲</span> 주사위 굴리기
      </button>
    );
  } else if (phase === 'turnResolved') {
    primary = (
      <button type="button" className="game-btn game-btn--neutral" onClick={onNext}>
        {NEXT_LABEL[nextKind]}
      </button>
    );
    if (judgement?.success) {
      result = (
        <p className="game-judge-result ok" aria-live="polite">
          {`🎉 성공! ⭐+${judgement.starsAwarded}`}
        </p>
      );
    } else if (judgement && !judgement.retry) {
      result = (
        <p className="game-judge-result miss" aria-live="polite">
          아쉬워요! 이번엔 별 없이 다음 차례
        </p>
      );
    }
  }

  if (!primary && !canUndo) return null;

  return (
    <div className="game-controls">
      {result}
      {primary}
      {canUndo && (
        <button type="button" className="game-btn--sm" onClick={onUndo}>
          ↩️ 판정 되돌리기
        </button>
      )}
    </div>
  );
}
