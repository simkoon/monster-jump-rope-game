// src/game/hud/DiceResultPanel.tsx — the last-move panel of the temporary play screen (UI-SPEC S3).
// Shows the die face, the dice move, the start bonus, the one landed event (never chained — D-07),
// the extra-turn cap notice (D-08), the 보너스/함정 label chip and the start-tile arrival line.
// Event names render as JSX text only (T-05-15). Announced via the parent aria-live region.
import type { MoveResult } from '../../engine/state';

interface DiceResultPanelProps {
  move: MoveResult;
}

export default function DiceResultPanel({ move }: DiceResultPanelProps) {
  const ev = move.event;
  return (
    <div className="game-resolved">
      <p className="game-roll">🎲 {move.roll}</p>
      <p className="game-move">{move.roll}칸 앞으로!</p>

      {move.startBonus > 0 && (
        <span className="game-event-chip start-bonus">🏁 출발 보너스 ⭐+{move.startBonus}</span>
      )}

      {ev?.eff === 'forward' && (
        <p className="game-event eff-forward">
          ➡️ {ev.name} · 앞으로 {ev.steps}칸
        </p>
      )}
      {ev?.eff === 'backward' && (
        <p className="game-event eff-backward">
          ⬅️ {ev.name} · 뒤로 {ev.steps}칸
        </p>
      )}
      {ev?.eff === 'extra' && !move.extraSuppressed && (
        <p className="game-event eff-extra">🔁 {ev.name} · 한 번 더!</p>
      )}
      {move.extraSuppressed && <p className="game-event eff-extra">🔁 한 번 더는 연속 한 번까지! 이번엔 넘어가요</p>}

      {ev?.label === '보너스' && <span className="game-event-chip bonus">🎁 보너스</span>}
      {ev?.label === '함정' && <span className="game-event-chip trap">🕳️ 함정</span>}

      {move.finalKind === 'start' && <p className="game-move">🏁 출발 칸에 도착!</p>}
    </div>
  );
}
