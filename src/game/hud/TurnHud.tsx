// src/game/hud/TurnHud.tsx — fixed top turn HUD bar (UI-SPEC Component Inventory).
// Left: current player/team name pill (Display) with a --sky active tint + a team
// member sub-line. Right: the ⏱️ timer (only when a limit is set) + the secondary
// 지금 순위로 마치기 button, which routes through the reused focus-trapped ConfirmDialog
// so a stray tap can never end a live game (threat T-03-04). aria-live announces turns.
import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';

interface TurnHudProps {
  currentName: string;
  isTeam: boolean;
  activeMember: string;
  timeLimitMs: number | null;
  remainingMs: number | null;
  onManualEnd: () => void;
}

// MM:SS from remaining ms (UI-SPEC ⏱️ MM:SS, tabular-nums). Clamped at 0.
function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TurnHud({
  currentName,
  isTeam,
  activeMember,
  timeLimitMs,
  remainingMs,
  onManualEnd,
}: TurnHudProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <header className="game-topbar">
      {/* Turn change is announced to assistive tech (Accessibility live regions). */}
      <div className="game-turn-pill" aria-live="polite">
        <span className="game-turn-name">
          {currentName} <span className="suffix">차례</span>
        </span>
        {isTeam && (
          <span className="game-turn-member">
            이번엔 <strong>{activeMember}</strong> 님이 도전!
          </span>
        )}
      </div>

      <span className="spacer" />

      {timeLimitMs != null && (
        <span className="game-clock" aria-label="남은 시간">
          ⏱️ {formatClock(remainingMs ?? timeLimitMs)}
        </span>
      )}

      <button
        type="button"
        className="game-btn--sm"
        onClick={() => setConfirmOpen(true)}
      >
        지금 순위로 마치기
      </button>

      <ConfirmDialog
        open={confirmOpen}
        message="지금 순위로 게임을 마칠까요?"
        confirmLabel="마치기"
        cancelLabel="취소"
        onConfirm={() => {
          setConfirmOpen(false);
          onManualEnd();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </header>
  );
}
