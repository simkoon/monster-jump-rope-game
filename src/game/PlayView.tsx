// src/game/PlayView.tsx — the playable 3D slice: <BoardScene> + the child-facing DOM HUD
// (03-02). It orchestrates the ANIM_DONE flow (D-07): pressing 주사위 굴리기 sets busy, calls
// the engine roll(), plays the dice spin → then the token hop, and only clears busy
// (revealing the resolved panel + 다음) when the token arrives. A watchdog guarantees busy
// can never stay stuck (Pitfall 1).
//
// The countdown clock is DOM-owned and reused verbatim from the harness pattern (D-04): it
// computes remaining ms from Date.now(), stops at gameOver, and clears on unmount (no leak).
//
// The thin 03-01 controls are replaced by the composed HUD: TurnHud (top), MissionOverlay
// (centered card at awaitingJudgement), ControlsBar + DiceResultPanel (bottom), and the
// PositionReadout strip. All big-button controls are gated by usePresentation.busy (ART-04).
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../harness/useGameStore';
import { usePresentation } from './usePresentation';
import BoardScene from './scene/BoardScene';
import { type MoveSpec, HOP_S } from './scene/Token';
import { DICE_S } from './scene/Dice';
import TurnHud from './hud/TurnHud';
import MissionOverlay from './hud/MissionOverlay';
import ControlsBar from './hud/ControlsBar';
import DiceResultPanel from './hud/DiceResultPanel';
import PositionReadout from './hud/PositionReadout';

// Animation sub-sequence within a single roll: dice spin → token hop → idle.
type Seq = 'idle' | 'dice' | 'token';

export default function PlayView() {
  const game = useGameStore((s) => s.game);
  const remainingMs = useGameStore((s) => s.remainingMs);
  const busy = usePresentation((s) => s.busy);

  const [rollId, setRollId] = useState(0);
  const [seq, setSeq] = useState<Seq>('idle');
  const [move, setMove] = useState<MoveSpec | null>(null);
  const watchdogCancel = useRef<(() => void) | null>(null);

  // DOM-owned countdown (Pitfall 1 / D-04). Re-arms on phase change; clears on unmount.
  const startedAtRef = useRef<number | null>(null);
  const phase = game?.phase;
  const timeLimitMs = game?.config.timeLimitMs ?? null;
  useEffect(() => {
    if (timeLimitMs == null || phase === 'gameOver' || phase == null) return;
    if (startedAtRef.current == null) startedAtRef.current = Date.now();
    const startedAt = startedAtRef.current;
    const store = useGameStore.getState();
    const tick = () => {
      const remaining = timeLimitMs - (Date.now() - startedAt);
      store.setRemainingMs(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        store.end('timeout');
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [phase, timeLimitMs]);

  // Clear any pending watchdog if the view unmounts mid-animation.
  useEffect(() => () => watchdogCancel.current?.(), []);

  if (!game) return null; // GameApp only mounts this with an active game.

  const { config, currentIndex, phase: p, card, lastRoll, lastLanding } = game;
  const current = config.participants[currentIndex];
  const activeMember =
    current.memberNames[current.memberTurnIndex] ?? current.memberNames[0] ?? current.name;
  const isTeam = config.mode === 'team';

  function handleRoll() {
    if (!game) return;
    const from = game.config.participants[game.currentIndex].position;
    const idx = game.currentIndex;
    usePresentation.getState().beginAnim();

    useGameStore.getState().roll();
    const g2 = useGameStore.getState().game;
    if (!g2 || g2.lastRoll == null) {
      // Defensive: nothing to animate → clear gating immediately (never lock).
      usePresentation.getState().signalAnimDone();
      return;
    }
    const roll = g2.lastRoll;
    const to = g2.config.participants[idx].position;
    const afterRoll = from + roll;
    const hops = Math.abs(afterRoll - from) + Math.abs(to - afterRoll);
    // Deadlock guard: dice spin + every hop + buffer (Pitfall 1).
    watchdogCancel.current = usePresentation
      .getState()
      .startWatchdog(DICE_S * 1000 + hops * HOP_S * 1000);

    const nextId = rollId + 1;
    setRollId(nextId);
    setMove({ id: nextId, from, afterRoll, to });
    setSeq('dice');
  }

  function handleDiceSettled() {
    setSeq('token');
  }

  function handleTokenArrive() {
    watchdogCancel.current?.();
    watchdogCancel.current = null;
    usePresentation.getState().signalAnimDone();
    setSeq('idle');
    setMove(null);
  }

  return (
    <div className="game-stage">
      <BoardScene
        boardLength={config.boardLength}
        participants={config.participants}
        activeIndex={currentIndex}
        move={move}
        runToken={seq === 'token'}
        // Never during 'dice': revealing the destination before the face is readable would
        // make the dice animation pointless (D-E).
        highlight={seq === 'token' ? move : null}
        rollId={rollId}
        face={lastRoll}
        onDiceSettled={handleDiceSettled}
        onTokenArrive={handleTokenArrive}
      />

      {/* DOM HUD overlay — siblings of the Canvas (ART-04 big tap targets, a11y). */}
      <div className="game-hud">
        <TurnHud
          currentName={current.name}
          isTeam={isTeam}
          activeMember={activeMember}
          timeLimitMs={timeLimitMs}
          remainingMs={remainingMs}
          onManualEnd={() => useGameStore.getState().end('manual')}
        />

        {/* Centered mission card + 성공/실패 at awaitingJudgement (hidden while busy). */}
        {!busy && p === 'awaitingJudgement' && card && (
          <MissionOverlay
            mission={card.mission}
            onJudge={(success) => useGameStore.getState().judge(success)}
          />
        )}

        {/* Bottom controls region: dice result (polite live) + phase-driven buttons. */}
        <div className="game-bottom">
          <div aria-live="polite">
            {!busy && p === 'turnResolved' && lastLanding && (
              <DiceResultPanel lastRoll={lastRoll} lastLanding={lastLanding} />
            )}
          </div>

          <ControlsBar
            phase={p}
            busy={busy}
            onDraw={() => useGameStore.getState().draw()}
            onRoll={handleRoll}
            onNext={() => useGameStore.getState().next()}
          />

          <PositionReadout participants={config.participants} currentIndex={currentIndex} />
        </div>
      </div>
    </div>
  );
}
