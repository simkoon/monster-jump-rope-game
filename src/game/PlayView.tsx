// src/game/PlayView.tsx — the temporary DOM play screen (UI-SPEC S3, D-26). Phase 6 replaces it
// with the 3D ring board and the presentation director.
//
// It draws the engine state as-is: turn bar → star scoreboard → ring strip → last-move panel +
// judgement line → in-flow quest card → phase-driven buttons. No animation, no timers, no effects:
// every tap calls one harness action and the screen simply re-renders from the new state.
// All names (participants, missions, events) render as JSX text only (T-05-15).
import { useGameStore } from '../harness/useGameStore';
import { activeMember, canUndo, currentParticipant, willEndOnAdvance } from '../engine/game';
import { showToast } from '../components/Toast';
import TurnHud from './hud/TurnHud';
import Scoreboard from './hud/Scoreboard';
import RingStrip from './hud/RingStrip';
import DiceResultPanel from './hud/DiceResultPanel';
import MissionOverlay from './hud/MissionOverlay';
import ControlsBar, { type NextKind } from './hud/ControlsBar';

export default function PlayView() {
  const game = useGameStore((s) => s.game);
  if (!game) return null; // GameApp only mounts this with an active game.

  const { phase, card, lastMove, lastJudgement, turn, config } = game;
  const current = currentParticipant(game);
  const participants = config.participants;
  const nextKind: NextKind = turn.extraGranted ? 'extra' : willEndOnAdvance(game) ? 'result' : 'next';
  const showMove = lastMove !== null && (phase === 'awaitingJudgement' || phase === 'turnResolved');

  function handleUndo() {
    useGameStore.getState().undo();
    showToast('판정을 되돌렸어요. 다시 골라 주세요.');
  }

  return (
    <div className="game-stage temp-play">
      <TurnHud
        animal={current.animal}
        name={current.name}
        isTeam={config.mode === 'team'}
        activeMember={activeMember(game)}
        isExtra={turn.isExtra}
        round={game.round}
        totalRounds={config.rules.rounds}
        onEndNow={() => useGameStore.getState().endNow()}
      />

      <Scoreboard entries={participants} currentId={current.id} />

      <RingStrip tiles={game.board} tokens={participants} currentId={current.id} />

      <div aria-live="polite">
        {showMove && lastMove && <DiceResultPanel move={lastMove} />}
        {phase === 'turnResolved' && lastJudgement && (
          lastJudgement.success ? (
            <p className="game-judge-result ok">🎉 성공! ⭐+{lastJudgement.starsAwarded}</p>
          ) : (
            <p className="game-judge-result miss">아쉬워요! 이번엔 별 없이 다음 차례</p>
          )
        )}
      </div>

      {phase === 'awaitingJudgement' && card && (
        <MissionOverlay
          mission={card.mission}
          diff={card.diff}
          stars={card.stars}
          attempt={card.attempt}
          onJudge={(success) => useGameStore.getState().judge(success)}
        />
      )}

      <ControlsBar
        phase={phase}
        canUndo={canUndo(game)}
        nextKind={nextKind}
        onRoll={() => useGameStore.getState().roll()}
        onNext={() => useGameStore.getState().next()}
        onUndo={handleUndo}
      />
    </div>
  );
}
