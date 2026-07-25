// src/harness/ResultScreen.tsx — throwaway plain-DOM result screen (LOOP-09/10, D-05).
// Renders the winner (single), or a 공동 승리 tie the teacher resolves by picking the
// final winner (display-only harness state — no engine change, D-05 / Pitfall 2), plus
// the two restart paths. Phase 3 replaces this with the child-friendly 3D result UI (D-09).
import { useState } from 'react';
import { useGameStore } from './useGameStore';
import type { EndReason } from '../engine/types';

// D-03/D-04: the copy differs for a reached-finish win vs a timed/manual session end.
const REASON_COPY: Record<EndReason, string> = {
  'reached-finish': '결승선에 먼저 도착했어요!',
  timeout: '시간이 다 됐어요! 가장 앞선 친구가 승리!',
  manual: '게임을 마쳤어요! 가장 앞선 친구가 승리!',
};

export default function ResultScreen() {
  const game = useGameStore((s) => s.game);
  // Teacher's tie-break pick (display-only; D-05). Must be declared before any early return.
  const [pickedId, setPickedId] = useState<string | null>(null);

  if (!game) return null; // GameHarness only mounts this at phase gameOver.

  const { config, winners, endReason } = game;
  const nameOf = (id: string) =>
    config.participants.find((p) => p.id === id)?.name ?? id;
  const isTie = winners.length > 1;
  const finalWinnerId = isTie ? pickedId : winners[0] ?? null;

  return (
    <div className="result">
      <h1 className="result-title">게임 끝!</h1>
      {endReason && <p className="result-reason">{REASON_COPY[endReason]}</p>}

      {!isTie && finalWinnerId && (
        <p className="result-winner">
          🏆 승리: <strong>{nameOf(finalWinnerId)}</strong>
        </p>
      )}

      {isTie && (
        <section className="result-tie">
          <p className="result-cowinner">공동 승리! 최고 칸에 함께 도착했어요.</p>
          {/* D-05: teacher picks the final winner among the tied participants. */}
          <fieldset className="result-pick">
            <legend>최종 승자를 선택하세요</legend>
            {winners.map((id) => (
              <label key={id} className="result-pick-option">
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
            <p className="result-final">
              🏆 최종 승리: <strong>{nameOf(finalWinnerId)}</strong>
            </p>
          )}
        </section>
      )}

      {/* Every participant's final standing. */}
      <ol className="result-standings">
        {config.participants.map((p) => (
          <li key={p.id}>
            {p.name} — {p.position}칸
          </li>
        ))}
      </ol>

      <div className="result-actions">
        {/* LOOP-10: restart with the SAME config (positions reset via createGame in the bridge). */}
        <button type="button" onClick={() => useGameStore.getState().startGame(config)}>
          다시 시작
        </button>
        {/* LOOP-10: back to the setup screen (game → null). */}
        <button type="button" onClick={() => useGameStore.getState().reset()}>
          시작 화면으로
        </button>
      </div>
    </div>
  );
}
