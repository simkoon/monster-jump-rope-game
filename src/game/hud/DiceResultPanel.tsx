// src/game/hud/DiceResultPanel.tsx — the resolved-turn readout (UI-SPEC Dice result +
// move panel, LOOP-05/07/08). Dice value (Display, 🎲 N), the from칸 → to칸 move, and the
// landed-event banner when lastLanding.eff is set: forward=grass / backward=coral /
// extra=grape, each with emoji + text (never color-only). An optional 🎁 보너스 / 🕳️ 함정
// chip mirrors lastLanding.label. Announced via the parent aria-live region.
import type { LandingResult } from '../../engine/types';

interface DiceResultPanelProps {
  lastRoll: number | null;
  lastLanding: LandingResult;
}

// The event's own delta = final square − (pre-roll square + dice). forward > 0,
// backward < 0, extra = 0 (no move). Derived from the engine data, not stored.
function eventDelta(lastLanding: LandingResult, lastRoll: number | null): number {
  return lastLanding.to - (lastLanding.from + (lastRoll ?? 0));
}

export default function DiceResultPanel({ lastRoll, lastLanding }: DiceResultPanelProps) {
  const delta = eventDelta(lastLanding, lastRoll);
  const label = lastLanding.label; // '보너스' | '함정' | ''

  return (
    <div className="game-resolved">
      <p className="game-roll">
        🎲 <strong>{lastRoll}</strong>
      </p>
      <p className="game-move">
        {lastLanding.from}칸 → <strong>{lastLanding.to}칸</strong>
      </p>

      {lastLanding.eff === 'forward' && (
        <p className="game-event eff-forward">➡️ {Math.abs(delta)}칸 앞으로!</p>
      )}
      {lastLanding.eff === 'backward' && (
        <p className="game-event eff-backward">⬅️ {Math.abs(delta)}칸 뒤로!</p>
      )}
      {lastLanding.eff === 'extra' && (
        <p className="game-event eff-extra">🔁 한 번 더!</p>
      )}

      {label === '보너스' && <span className="game-event-chip bonus">🎁 보너스</span>}
      {label === '함정' && <span className="game-event-chip trap">🕳️ 함정</span>}
    </div>
  );
}
