// src/game/hud/MissionOverlay.tsx — centered mission-card overlay shown at
// awaitingJudgement (UI-SPEC Mission card overlay, D-06/LOOP-02/03). Mission name
// (Heading), description (Body), a color+text difficulty badge, and the ✅ 성공 /
// ❌ 실패 --tap pair. Every element carries a text label (color independence).
// All mission text renders through JSX (auto-escaped — threat T-03-03, no HTML sink).
import type { Mission, Difficulty } from '../../schema';

const DIFF_LABEL: Record<Difficulty, string> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
};

interface MissionOverlayProps {
  mission: Mission;
  onJudge: (success: boolean) => void;
}

export default function MissionOverlay({ mission, onJudge }: MissionOverlayProps) {
  return (
    <div className="game-mission-overlay" role="group" aria-label="미션 판정">
      <div className="game-mission-card">
        <h2 className="game-mission-name">{mission.name}</h2>
        {mission.desc && <p className="game-mission-desc">{mission.desc}</p>}
        <span className={`game-diff-badge ${mission.diff}`}>{DIFF_LABEL[mission.diff]}</span>
        <div className="game-judge">
          <button
            type="button"
            className="game-btn game-btn--success"
            onClick={() => onJudge(true)}
          >
            ✅ 성공
          </button>
          <button
            type="button"
            className="game-btn game-btn--danger"
            onClick={() => onJudge(false)}
          >
            ❌ 실패
          </button>
        </div>
      </div>
    </div>
  );
}
