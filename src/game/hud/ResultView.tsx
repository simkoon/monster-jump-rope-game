// src/game/hud/ResultView.tsx — the child-facing result screen (D-09, LOOP-09/10, D-05).
// Re-skin of the throwaway src/harness/ResultScreen: REASON_COPY + the tie-break radio
// logic are reused verbatim (display-only teacher pick, no engine change — D-05). Only the
// presentation changes: Display title/winner, --tap-sm radio options, and the two --tap /
// --tap-sm restart paths. All names render through JSX (auto-escaped, threat T-03-03).
import { useState } from 'react';
import { useGameStore } from '../../harness/useGameStore';
import type { EndReason } from '../../engine/types';

const REASON_COPY: Record<EndReason, string> = {
  'reached-finish': '결승선에 먼저 도착했어요!',
  timeout: '시간이 다 됐어요! 가장 앞선 친구가 승리!',
  manual: '게임을 마쳤어요! 가장 앞선 친구가 승리!',
};

export default function ResultView() {
  const game = useGameStore((s) => s.game);
  // Teacher's tie-break pick (display-only; D-05). Declared before any early return.
  const [pickedId, setPickedId] = useState<string | null>(null);

  if (!game) return null; // GameApp only mounts this at phase gameOver.

  const { config, winners, endReason } = game;
  const nameOf = (id: string) => config.participants.find((p) => p.id === id)?.name ?? id;
  const isTie = winners.length > 1;
  const finalWinnerId = isTie ? pickedId : winners[0] ?? null;

  return (
    <div className="game-result">
      <h1 className="game-result-title">게임 끝!</h1>
      {endReason && <p className="game-result-reason">{REASON_COPY[endReason]}</p>}

      {!isTie && finalWinnerId && (
        <p className="game-result-winner">
          🏆 승리: <strong>{nameOf(finalWinnerId)}</strong>
        </p>
      )}

      {isTie && (
        <section className="game-result-tie">
          <p className="game-result-cowinner">공동 승리! 최고 칸에 함께 도착했어요.</p>
          <fieldset className="game-result-pick">
            <legend>최종 승자를 선택하세요</legend>
            {winners.map((id) => (
              <label key={id} className="game-result-pick-option">
                <input
                  type="radio"
                  name="final-winner"
                  value={id}
                  checked={pickedId === id}
                  onChange={() => setPickedId(id)}
                />
                {nameOf(id)}
              </label>
            ))}
          </fieldset>
          {finalWinnerId && (
            <p className="game-result-final">
              🏆 최종 승리: <strong>{nameOf(finalWinnerId)}</strong>
            </p>
          )}
        </section>
      )}

      <ol className="game-result-standings">
        {config.participants.map((p) => (
          <li key={p.id}>
            {p.name} — {p.position}칸
          </li>
        ))}
      </ol>

      <div className="game-result-actions">
        {/* LOOP-10: restart with the SAME config (positions reset via createGame in the bridge). */}
        <button
          type="button"
          className="game-btn"
          onClick={() => useGameStore.getState().startGame(config)}
        >
          🔁 다시 시작
        </button>
        {/* LOOP-10: back to the setup screen (game → null). */}
        <button
          type="button"
          className="game-btn--sm"
          onClick={() => useGameStore.getState().reset()}
        >
          시작 화면으로
        </button>
      </div>
    </div>
  );
}
