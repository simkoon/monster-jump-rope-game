// src/game/GameStage.tsx — the 3D game screen (replaces the Phase 5 temporary play screen; D-22,
// D-23, D-25, D-27, BOARD-01, HUD-01~04, ROUND-02, STAB-02, UI-SPEC S1/S5/S6/S7).
//
// Layout (CSS grid, game.css "Phase 6 — stage"): turn bar on top → canvas cell (the lazy 3D board
// with the status chips, the floating quest card, the beat banner and the loading / recovery
// overlay on top) → bottom area (controls above the star scoreboard). In landscape the bottom area
// becomes a right panel.
//
// Controls gate (HUD-03, UI-SPEC S5): the controls and the quest card render only when no beat is
// queued or playing AND the director has consumed the engine's current log AND the canvas is ready
// AND no failure overlay is up. So after 🎲 / 다음 / ✅ / ❌ nothing flickers: the engine change and
// busy = true land in the same store update (the director in GameApp subscribes synchronously),
// and the next controls appear in the same place only after the last beat. The 400 ms input lock
// stays on every action (T-06-18).
//
// 3D chunk (D-06, STAB-04): only the loader and the props type come from the scene — never three.
// Each attempt gets a fresh React.lazy (a rejected lazy stays rejected), inside an error boundary
// keyed by the same canvasKey. Recovery (D-27): webglcontextlost, a thrown chunk / WebGL creation
// or READY_TIMEOUT_MS without a ready canvas → the overlay; its button runs skipAll → closes the
// overlay → canvasKey + 1. That button is the ONLY remount path (no automatic retry loop on iOS).
// A hidden tab stops the canvas frameloop and ends the beats (the engine state is already final).
// All names render as JSX text only (T-06-20).
import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useGameStore } from '../harness/useGameStore';
import { activeMember, canUndo, currentParticipant, willEndOnAdvance } from '../engine/game';
import { showToast } from '../components/Toast';
import { pendingKinds, usePresentation } from './usePresentation';
import { loadGameCanvas } from './scene/loadGameCanvas';
import type { GameCanvasProps } from './scene/GameCanvas';
import TurnHud from './hud/TurnHud';
import Scoreboard from './hud/Scoreboard';
import ControlsBar, { type NextKind } from './hud/ControlsBar';
import StatusChips from './hud/StatusChips';
import Banner from './hud/Banner';
import ContextLostOverlay from './hud/ContextLostOverlay';
import MissionOverlay from './hud/MissionOverlay';
import { useInputLock } from './useInputLock';
import { boardAria, nextUpView } from './labels';

// UI-SPEC S7: a canvas that is not ready within 8 s shows the recovery overlay.
export const READY_TIMEOUT_MS = 8000;

type Failure = 'lost' | 'failed';

function subscribeVisibility(cb: () => void): () => void {
  document.addEventListener('visibilitychange', cb);
  return () => document.removeEventListener('visibilitychange', cb);
}

function usePageVisible(): boolean {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState !== 'hidden',
    () => true,
  );
}

// Catches a rejected 3D chunk or a throwing WebGL canvas; keyed by canvasKey so a redraw starts clean.
class CanvasErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function GameStage({ readyTimeoutMs = READY_TIMEOUT_MS }: { readyTimeoutMs?: number }) {
  const game = useGameStore((s) => s.game);
  const guard = useInputLock();
  const busy = usePresentation((s) => s.busy);
  const consumedLog = usePresentation((s) => s.consumedLog);
  const current = usePresentation((s) => s.current);
  const queue = usePresentation((s) => s.queue);
  const displayed = usePresentation((s) => s.displayed);
  const [canvasKey, setCanvasKey] = useState(0);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const visible = usePageVisible();
  const hasGame = game !== null;

  // A fresh lazy component per attempt (RESEARCH Pitfall 6).
  const LazyCanvas = useMemo(() => lazy(loadGameCanvas), [canvasKey]);

  const handleReady = useCallback(() => setReady(true), []);
  const handleLost = useCallback(() => setFailure('lost'), []);
  const handleError = useCallback(() => setFailure('failed'), []);

  // Ready timeout (UI-SPEC S7): restarts with every attempt, cleared once the canvas is ready.
  useEffect(() => {
    if (!hasGame || ready || failure) return;
    const t = setTimeout(() => setFailure('failed'), readyTimeoutMs);
    return () => clearTimeout(t);
  }, [hasGame, ready, failure, canvasKey, readyTimeoutMs]);

  // Hidden tab (D-27): end the beats now; the canvas pauses through `visible`.
  useEffect(() => {
    if (!visible) usePresentation.getState().skipAll();
  }, [visible]);

  // The only remount path (RESEARCH Pattern 6): skipAll → close the overlay → new key.
  const redraw = useCallback(() => {
    usePresentation.getState().skipAll();
    setFailure(null);
    setReady(false);
    setCanvasKey((k) => k + 1);
  }, []);

  if (!game) return null; // GameApp only mounts this with an active game.

  const { phase, card, lastMove, lastJudgement, turn, config } = game;
  const cur = currentParticipant(game);
  const participants = config.participants;
  const nextKind: NextKind = turn.extraGranted ? 'extra' : willEndOnAdvance(game) ? 'result' : 'next';
  const controlsVisible = !busy && consumedLog === game.log && ready && failure === null;

  // D-01: the scoreboard shows displayed stars, so a star never rises before its beat.
  const entries = participants.map((p) => ({ ...p, stars: displayed.stars[p.id] ?? p.stars }));

  const canvasProps: GameCanvasProps = {
    tiles: game.board,
    participants,
    currentId: cur.id,
    restFace: lastMove?.roll ?? null,
    visible,
    onReady: handleReady,
    onLost: handleLost,
  };

  function handleUndo() {
    useGameStore.getState().undo();
    showToast('판정을 되돌렸어요. 다시 골라 주세요.');
  }

  return (
    <div className="game-stage stage">
      <TurnHud
        animal={cur.animal}
        name={cur.name}
        isTeam={config.mode === 'team'}
        activeMember={activeMember(game)}
        isExtra={turn.isExtra}
        round={game.round}
        totalRounds={config.rules.rounds}
        next={nextUpView(game)}
        onEndNow={() => useGameStore.getState().endNow()}
      />

      <div className="stage-canvas-cell">
        <div className="stage-canvas" role="img" aria-label={boardAria(game.board.length, cur.name)}>
          <CanvasErrorBoundary key={canvasKey} onError={handleError}>
            <Suspense fallback={null}>
              <LazyCanvas {...canvasProps} />
            </Suspense>
          </CanvasErrorBoundary>
        </div>

        <StatusChips move={lastMove} pending={pendingKinds(current, queue)} />

        {controlsVisible && phase === 'awaitingJudgement' && card && (
          <MissionOverlay
            mission={card.mission}
            diff={card.diff}
            stars={card.stars}
            attempt={card.attempt}
            onJudge={(success) => guard(() => useGameStore.getState().judge(success))}
          />
        )}

        <Banner />

        {(!ready || failure) && <ContextLostOverlay mode={failure ?? 'loading'} onRedraw={redraw} />}
      </div>

      <div className="stage-bottom">
        <ControlsBar
          phase={phase}
          hidden={!controlsVisible}
          canUndo={canUndo(game)}
          nextKind={nextKind}
          judgement={phase === 'turnResolved' ? lastJudgement : null}
          onRoll={() => guard(() => useGameStore.getState().roll())}
          onNext={() => guard(() => useGameStore.getState().next())}
          onUndo={() => guard(handleUndo)}
        />
        <Scoreboard entries={entries} currentId={cur.id} />
      </div>
    </div>
  );
}
