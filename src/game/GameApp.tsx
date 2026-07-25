// src/game/GameApp.tsx — the real game root (replaces the throwaway GameHarness).
// Routes on the store: no game → SetupScreen; gameOver → ResultScreen; otherwise → PlayView.
// The setup/result screens reuse the Phase 2 harness screens UNCHANGED for now (03-02
// re-skins them into the child-friendly views); the play screen is the new 3D slice.
//
// gameOver is held behind the ANIM_DONE `busy` flag so a winning roll's token hop finishes
// animating in PlayView BEFORE the result screen takes over (D-07) — otherwise the Canvas
// would unmount mid-move. The watchdog guarantees busy always clears, so the result screen
// can never be blocked.
import { useGameStore } from '../harness/useGameStore';
import { usePresentation } from './usePresentation';
import SetupScreen from '../harness/SetupScreen';
import ResultScreen from '../harness/ResultScreen';
import PlayView from './PlayView';

export default function GameApp() {
  const game = useGameStore((s) => s.game);
  const busy = usePresentation((s) => s.busy);

  if (!game) return <SetupScreen />;
  if (game.phase === 'gameOver' && !busy) return <ResultScreen />;
  return <PlayView />;
}
