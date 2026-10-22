// src/game/hud/TurnHud.tsx — top turn bar of the temporary play screen (UI-SPEC S3, D-26).
// Left: the turn pill `{animal emoji} {name} 차례` (+ the `🔁 한 번 더` badge on an extra turn,
// + the team member line — D-21). Middle: `라운드 r/R`. Right: `지금 끝내기`, which always goes
// through the reused ConfirmDialog (cancel focused by default) so a stray tap never ends a game
// (D-22, T-05-18). No clock (D-01). Names render as JSX text only.
import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import type { AnimalId } from '../../engine/animals';
import { ANIMAL_EMOJI } from '../labels';

interface TurnHudProps {
  animal: AnimalId;
  name: string;
  isTeam: boolean;
  activeMember: string;
  isExtra: boolean;
  round: number;
  totalRounds: number;
  onEndNow: () => void;
}

export default function TurnHud({
  animal,
  name,
  isTeam,
  activeMember,
  isExtra,
  round,
  totalRounds,
  onEndNow,
}: TurnHudProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <header className="game-topbar">
      {/* Turn change is announced to assistive tech. */}
      <div className="game-turn-pill" aria-live="polite">
        <span className="game-turn-name">
          {ANIMAL_EMOJI[animal]} {name}
          <span className="suffix"> 차례</span>
        </span>
        {isExtra && <span className="game-event-chip extra">🔁 한 번 더</span>}
        {isTeam && <span className="game-turn-member">이번엔 {activeMember} 님이 도전!</span>}
      </div>

      <div className="game-round">
        <span className="label">라운드</span>
        <span className="value">
          {round}/{totalRounds}
        </span>
      </div>

      <span className="spacer" />

      <button type="button" className="game-btn--sm" onClick={() => setConfirmOpen(true)}>
        지금 끝내기
      </button>

      <ConfirmDialog
        open={confirmOpen}
        message="지금 게임을 끝낼까요? 지금까지 모은 별로 우승을 정해요."
        confirmLabel="게임 끝내기"
        cancelLabel="계속하기"
        onConfirm={() => {
          setConfirmOpen(false);
          onEndNow();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </header>
  );
}
