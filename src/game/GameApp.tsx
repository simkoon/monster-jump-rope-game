// src/game/GameApp.tsx — the real game root (replaces the throwaway GameHarness).
// Routes on the store: no game → SetupView; gameOver → ResultView; otherwise → PlayView.
// The setup/result screens are the child-facing re-skins (03-02) reusing ALL Phase 2 logic
// via the useGameStore bridge; the play screen is the 3D slice with the play HUD.
//
// gameOver is held behind the ANIM_DONE `busy` flag so a winning roll's token hop finishes
// animating in PlayView BEFORE the result screen takes over (D-07) — otherwise the Canvas
// would unmount mid-move. The watchdog guarantees busy always clears, so the result screen
// can never be blocked.
import { useGameStore } from '../harness/useGameStore';
import { usePresentation } from './usePresentation';
import SetupView from './hud/SetupView';
import ResultView from './hud/ResultView';
import PlayView from './PlayView';

export default function GameApp() {
  const game = useGameStore((s) => s.game);
  const busy = usePresentation((s) => s.busy);

  if (!game) return <SetupView />;
  if (game.phase === 'gameOver' && !busy) return <ResultView />;
  return <PlayView />;
}
