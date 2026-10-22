// src/game/hud/ControlsBar.tsx — phase-driven action buttons (UI-SPEC S3 단계별 행동 영역 계약).
//   awaitingRoll      → 🎲 주사위 굴리기
//   awaitingJudgement → no primary (the quest card owns ✅/❌)
//   turnResolved      → 다음 ➡️ / 🔁 한 번 더 하기 / 🏆 결과 보기 (same advanceTurn, label only)
//   gameOver          → nothing (the result screen takes over)
// `↩️ 판정 되돌리기` is shown only while an undo exists — hidden, never disabled (D-16).
// Only the buttons of the current phase are rendered, but the next phase's primary button lands in
// the same place (React reuses the node), so this alone does NOT stop a double tap from skipping a
// phase. PlayView wraps every action in the useInputLock guard for that (T-05-19, CR-01).
import type { Phase } from '../../engine/state';

export type NextKind = 'next' | 'extra' | 'result';

const NEXT_LABEL: Record<NextKind, string> = {
  next: '다음 ➡️',
  extra: '🔁 한 번 더 하기',
  result: '🏆 결과 보기',
};

interface ControlsBarProps {
  phase: Phase;
  busy?: boolean;
  canUndo: boolean;
  nextKind: NextKind;
  onRoll: () => void;
  onNext: () => void;
  onUndo: () => void;
}

export default function ControlsBar({
  phase,
  busy = false,
  canUndo,
  nextKind,
  onRoll,
  onNext,
  onUndo,
}: ControlsBarProps) {
  if (busy || phase === 'gameOver') return null;

  let primary = null;
  if (phase === 'awaitingRoll') {
    primary = (
      <button type="button" className="game-btn" onClick={onRoll}>
        🎲 주사위 굴리기
      </button>
    );
  } else if (phase === 'turnResolved') {
    primary = (
      <button type="button" className="game-btn game-btn--neutral" onClick={onNext}>
        {NEXT_LABEL[nextKind]}
      </button>
    );
  }

  if (!primary && !canUndo) return null;

  return (
    <div className="game-controls">
      {primary}
      {canUndo && (
        <button type="button" className="game-btn--sm" onClick={onUndo}>
          ↩️ 판정 되돌리기
        </button>
      )}
    </div>
  );
}
