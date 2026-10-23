// src/game/GameApp.tsx — the real game root (replaces the throwaway GameHarness).
// Mounts the presentation director for the whole game view, then routes on the store:
// no game → SetupView; otherwise → GameStage, the 3D ring board screen. The award ceremony is a
// GameStage mode on the same stage and the same canvas (Phase 8 D-11), so the game end never swaps
// screens here and 🔁 다시 하기 never creates a second WebGL context.
//
// The director (useDirector) subscribes to the engine store synchronously, so every engine change
// and its beats (busy = true) land in one store update and the stage never renders a frame of the
// next phase's controls before its beats (HUD-03, RESEARCH Pattern 3). It lives here, above the
// router, so it keeps listening across setup → stage → ceremony (a fresh game's own log still plays
// its "마지막 라운드!" banner).
// useSfx (Phase 8 D-19) sits right next to it: the one beat → sound subscriber with the gesture unlock.
//
// GameStage holds the ceremony behind the `busy` flag, so a winning move's beats finish on the board
// BEFORE the ceremony takes over (D-07). The per-beat watchdogs guarantee busy always clears, and
// "지금 끝내기" skips the beats (gameEnded → skipAll), so the ceremony can never be blocked.
import { useGameStore } from '../harness/useGameStore';
import { useDirector } from './director/useDirector';
import { useSfx } from './sfx/useSfx';
import SetupView from './hud/SetupView';
import GameStage from './GameStage';

export default function GameApp() {
  useDirector();
  useSfx();
  const game = useGameStore((s) => s.game);

  if (!game) return <SetupView />;
  return <GameStage />;
}
