// src/harness/GameHarness.tsx — harness root. Routes the three game screens:
//   game === null            → SetupScreen  (configure + 시작)
//   game.phase === 'gameOver' → ResultScreen (winner / 다시 시작 / 시작 화면으로)
//   otherwise                → PlayHarness  (the full turn loop + countdown)
// All three screens are throwaway plain-DOM (D-09): Phase 3 replaces them with the 3D UI.
import { useGameStore } from './useGameStore';
import SetupScreen from './SetupScreen';
import PlayHarness from './PlayHarness';
import ResultScreen from './ResultScreen';

export default function GameHarness() {
  const game = useGameStore((s) => s.game);

  if (!game) return <SetupScreen />; // SETUP-01..06
  if (game.phase === 'gameOver') return <ResultScreen />; // LOOP-09/10
  return <PlayHarness />; // LOOP-01..08
}
