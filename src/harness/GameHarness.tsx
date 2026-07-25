// src/harness/GameHarness.tsx — harness root. Routes between the setup form (no
// active game) and a MINIMAL active-game placeholder. This active branch is
// intentionally thin: 02-03 replaces it with the real PlayHarness/ResultScreen.
// Keeping it here makes 02-02 shippable end-to-end (start a game → see it entered).
import { useGameStore } from './useGameStore';
import SetupScreen from './SetupScreen';

export default function GameHarness() {
  const game = useGameStore((s) => s.game);

  // No game yet → configure and start one (SETUP-01..06).
  if (!game) return <SetupScreen />;

  const current = game.config.participants[game.currentIndex];
  return (
    <div className="game-active">
      <h2>게임 진행 중</h2>
      <p>
        단계: <b>{game.phase}</b>
      </p>
      <p>
        현재 차례: <b>{current?.name}</b>
      </p>
      <ol className="game-positions">
        {game.config.participants.map((p) => (
          <li key={p.id}>
            {p.name} — {p.position}칸
          </li>
        ))}
      </ol>
      {/* LOOP-10 foundation: back to setup. Full play controls arrive in 02-03. */}
      <button type="button" onClick={() => useGameStore.getState().reset()}>
        처음으로
      </button>
    </div>
  );
}
