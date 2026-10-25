// src/game/hud/MissionOverlay.tsx — the in-flow quest card at awaitingJudgement (UI-SPEC S3, TURN-02).
// Retry badge (attempt 2), mission name, description (only when non-empty), difficulty badge +
// the stars to earn (⭐ × stars, by tile difficulty), and the ✅ 성공 / ❌ 실패 pair.
// Every element carries text (color independence); mission text renders as JSX text only (T-05-15).
import type { Difficulty, Mission } from '../../schema';
import { DIFF_LABEL } from '../labels';

interface MissionOverlayProps {
  mission: Mission;
  diff: Difficulty;
  stars: number;
  attempt: 1 | 2;
  targetJumps?: number;
  onJudge: (success: boolean) => void;
}

export default function MissionOverlay({ mission, diff, stars, attempt, targetJumps, onJudge }: MissionOverlayProps) {
  return (
    <div className="game-quest-card" role="group" aria-label="미션 판정">
      <div className="game-mission-card">
        {attempt === 2 && <span className="game-event-chip extra">🔁 한 번 더 도전!</span>}
        <h2 className="game-mission-name">{mission.name}</h2>
        {targetJumps !== undefined && <p className="mission-target-count">이 기술은 {targetJumps}번 넘기!</p>}
        {mission.desc && <p className="game-mission-desc">{mission.desc}</p>}
        <div className="game-quest-meta">
          <span className={`game-diff-badge ${diff}`}>{DIFF_LABEL[diff]}</span>
          <span className="game-quest-stars" role="img" aria-label={`받을 별 ${stars}개`}>
            {'⭐'.repeat(stars)}
          </span>
        </div>
        <div className="game-judge">
          <button type="button" className="game-btn game-btn--success" onClick={() => onJudge(true)}>
            ✅ 성공
          </button>
          <button type="button" className="game-btn game-btn--danger" onClick={() => onJudge(false)}>
            ❌ 실패
          </button>
        </div>
      </div>
    </div>
  );
}
