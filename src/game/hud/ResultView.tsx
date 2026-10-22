// src/game/hud/ResultView.tsx — the temporary result screen (UI-SPEC S4, D-27, ROUND-03).
// Title, end reason, the single winner or the co-winners (ties stand — no final-pick radios),
// star standings with shared ranks (1,1,3; winner rows bold), and the two exits:
// 🔁 다시 하기 (same participants/animals/rounds, content + settings re-snapshotted, new board)
// and 처음으로 (back to the start screen). Names render as JSX text only (T-05-15).
import { useGameStore } from '../../harness/useGameStore';
import type { EndReason, Participant } from '../../engine/state';
import { rankByStars } from '../../engine/scoring';
import PowerJumpingLogo from '../../components/PowerJumpingLogo';
import { ANIMAL_EMOJI } from '../labels';

const REASON_COPY: Record<EndReason, (rounds: number) => string> = {
  'rounds-complete': (rounds) => `${rounds}라운드를 모두 마쳤어요!`,
  manual: () => '게임을 일찍 마쳤어요!',
};

const who = (p: Participant) => `${ANIMAL_EMOJI[p.animal]} ${p.name}`;

export default function ResultView() {
  const game = useGameStore((s) => s.game);
  if (!game) return null; // GameApp only mounts this at phase gameOver.

  const { config, winners, endReason } = game;
  const winnerPs = winners
    .map((id) => config.participants.find((p) => p.id === id))
    .filter((p): p is Participant => p !== undefined);

  let winnerLine: string | null = null;
  if (winnerPs.length === 1) winnerLine = `🏆 우승! ${who(winnerPs[0])}`;
  else if (winnerPs.length > 1) winnerLine = `🏆 공동 우승! ${winnerPs.map(who).join(', ')}`;

  return (
    <div className="game-result">
      <PowerJumpingLogo variant="compact" subtitle="오늘의 점핑 결과" className="game-result-logo" />
      <h1 className="game-result-title">게임 끝!</h1>
      {endReason && <p className="game-result-reason">{REASON_COPY[endReason](config.rules.rounds)}</p>}

      {winnerLine && <p className="game-result-winner">{winnerLine}</p>}

      <ol className="game-result-standings" aria-label="별 순위">
        {rankByStars(config.participants).map(({ item, rank }) => (
          <li key={item.id} className={winners.includes(item.id) ? 'is-winner' : undefined}>
            {`${rank}등 ${who(item)} ⭐${item.stars}`}
          </li>
        ))}
      </ol>

      <div className="game-result-actions">
        <button type="button" className="game-btn" onClick={() => useGameStore.getState().restart()}>
          🔁 다시 하기
        </button>
        <button type="button" className="game-btn--sm" onClick={() => useGameStore.getState().reset()}>
          처음으로
        </button>
      </div>
    </div>
  );
}
