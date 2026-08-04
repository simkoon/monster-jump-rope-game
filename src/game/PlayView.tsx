// src/game/PlayView.tsx — the playable 2D slice: <BoardScene> + the child-facing DOM HUD
// (03-02). It orchestrates the ANIM_DONE flow (D-07): pressing 주사위 굴리기 sets busy, calls
// the engine roll(), plays the dice spin → the destination preview → then the token hop, and
// only clears busy (revealing the resolved panel + 다음) when the token arrives. A watchdog
// guarantees busy can never stay stuck (Pitfall 1).
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
import BoardScene, { type TokenPose } from './scene/BoardScene';
import { type MoveSpec, HOP_S, DICE_S, PREVIEW_S } from './animation';
import TurnHud from './hud/TurnHud';
import MissionOverlay from './hud/MissionOverlay';
import ControlsBar from './hud/ControlsBar';
import DiceResultPanel from './hud/DiceResultPanel';
import PositionReadout from './hud/PositionReadout';

// Animation sub-sequence within a single roll: dice spin → destination preview → token hop
// → idle. The 'preview' beat is what makes the board readable BEFORE the token moves.
type Seq = 'idle' | 'dice' | 'preview' | 'token';
type PoseMap = Partial<Record<string, TokenPose>>;
const REACTION_MS = 650;

export default function PlayView() {
  const game = useGameStore((s) => s.game);
  const remainingMs = useGameStore((s) => s.remainingMs);
  const busy = usePresentation((s) => s.busy);

  const [rollId, setRollId] = useState(0);
  const [seq, setSeq] = useState<Seq>('idle');
  const [move, setMove] = useState<MoveSpec | null>(null);
  const [tokenPoses, setTokenPoses] = useState<PoseMap>({});
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchdogCancel = useRef<(() => void) | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPreviewTimer = () => {
    if (previewTimer.current != null) {
      clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }
  };

  const clearReactionTimer = () => {
    if (reactionTimer.current != null) {
      clearTimeout(reactionTimer.current);
      reactionTimer.current = null;
    }
  };

  const setActivePose = (participantId: string, pose: TokenPose) => {
    setTokenPoses({ [participantId]: pose });
  };

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

  // Clear any pending watchdog AND the preview timer if the view unmounts mid-animation.
  // A winning turn unmounts PlayView (GameApp switches to ResultView) the moment the token
  // arrives, so a surviving timer would setState on an unmounted component.
  useEffect(
    () => () => {
      watchdogCancel.current?.();
      if (previewTimer.current != null) clearTimeout(previewTimer.current);
      if (reactionTimer.current != null) clearTimeout(reactionTimer.current);
    },
    [],
  );

  if (!game) return null; // GameApp only mounts this with an active game.

  const { config, currentIndex, phase: p, card, lastRoll, lastLanding } = game;
  const current = config.participants[currentIndex];
  const activeMember =
    current.memberNames[current.memberTurnIndex] ?? current.memberNames[0] ?? current.name;
  const isTeam = config.mode === 'team';

  function handleJudge(success: boolean) {
    clearReactionTimer();
    if (!game) return;
    const activeId = game.config.participants[game.currentIndex].id;
    setActivePose(activeId, success ? 'cheer' : 'hurt');
    usePresentation.getState().beginAnim();
    reactionTimer.current = setTimeout(() => {
      reactionTimer.current = null;
      useGameStore.getState().judge(success);
      usePresentation.getState().signalAnimDone();
      if (!success) setTokenPoses({});
    }, REACTION_MS);
  }

  function handleRoll() {
    if (!game) return;
    const from = game.config.participants[game.currentIndex].position;
    const idx = game.currentIndex;
    const activeId = game.config.participants[idx].id;
    setActivePose(activeId, 'rope');
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
    // Deadlock guard: dice spin + destination preview + every hop (+ the store's buffer).
    // PREVIEW_S MUST be included — omitting it makes the watchdog fire mid-hop, releasing busy
    // early so the controls and the win screen pop up while the token is still moving.
    watchdogCancel.current = usePresentation
      .getState()
      .startWatchdog(DICE_S * 1000 + PREVIEW_S * 1000 + hops * HOP_S * 1000);

    const nextId = rollId + 1;
    setRollId(nextId);
    setMove({ id: nextId, from, afterRoll, to });
    setSeq('dice');
  }

  // The die has stopped → hold the token still and let the board show WHERE it is going for
  // PREVIEW_S, then start the hop.
  function handleDiceSettled() {
    clearPreviewTimer(); // defensive: a re-entrant settle must not stack timers
    setSeq('preview');
    previewTimer.current = setTimeout(() => {
      previewTimer.current = null;
      setSeq('token');
    }, PREVIEW_S * 1000);
  }

  function handleTokenArrive() {
    clearPreviewTimer();
    watchdogCancel.current?.();
    watchdogCancel.current = null;
    usePresentation.getState().signalAnimDone();
    const settledGame = useGameStore.getState().game;
    const activeId = settledGame?.config.participants[settledGame.currentIndex]?.id;
    if (activeId) setActivePose(activeId, 'cheer');
    setSeq('idle');
    setMove(null); // clearing the move also removes the highlight
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
        highlight={seq === 'preview' || seq === 'token' ? move : null}
        rollId={rollId}
        face={lastRoll}
        tokenPoses={tokenPoses}
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
            onJudge={handleJudge}
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
            onNext={() => { setTokenPoses({}); useGameStore.getState().next(); }}
          />

          <PositionReadout participants={config.participants} currentIndex={currentIndex} boardLength={config.boardLength} />
        </div>
      </div>
    </div>
  );
}
