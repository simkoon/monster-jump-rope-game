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
// Tap to skip (Phase 8 FX-03, D-07): useSkipOnTap ends the current stars / win beat on a page tap
// or Escape (document capture click, so the starting ✅ tap never skips) and takes the shared
// 250 ms input lock, which `guard` honors, so the skip tap cannot leak onto the new 다음 ➡️.
// 지금 끝내기 and the dialogs carry data-skip-ignore.
//
// Star flight (Phase 8 FX-02, D-05): StarFlight (next to the Banner) portals the big +N star from
// the judged character's head to its scoreboard cell; useStarHit gives the Scoreboard the arrival
// flash. Both read the beat queue and never end a beat.
//
// Ceremony mode (Phase 8 D-11, END-01 ~ END-03, UI-SPEC F7, RESEARCH Pattern 6): once the game is
// over and its beats have ended (`phase === 'gameOver' && !busy` — after the 1500 ms win beat, at
// once after 지금 끝내기, or right after a tapped-away win beat) this same stage becomes the ceremony:
// `.stage--ceremony`, CeremonyHead in place of the turn bar, CeremonyPanel (winner line, 모두의 별
// cards, 🔁 다시 하기 / 처음으로) in place of the bottom area, and `canvasProps.ceremony` turns the SAME
// canvas into the 3D podium. The stage always has exactly three child slots — (1) turn bar | head,
// (2) the canvas cell, (3) bottom area | panel — so the canvas cell never changes type or position
// and the canvas is never remounted across play → ceremony → 다시 하기 × n (RESEARCH Pitfall 2,
// one WebGL context, STAB-01). In the ceremony StatusChips and the quest card are not rendered, and a
// missing 3D podium (loading, lost, failed) shows DomPodium instead of the recovery card — no error
// copy for the children. useCeremonyIntro owns the intro (fanfare once per game, tap to end).
//
// Sound toggle (Phase 8 D-20, UI-SPEC F8): the 🔊/🔇 toggle lives in the canvas cell's top-right
// corner in both modes, outside ControlsBar (which hides during beats), so it can always be tapped;
// it is skip-ignored, so tapping it never ends a beat or the intro.
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
import StarFlight from './hud/StarFlight';
import { useStarHit } from './hud/useStarHit';
import ContextLostOverlay from './hud/ContextLostOverlay';
import MissionOverlay from './hud/MissionOverlay';
import SoundToggle from './hud/SoundToggle';
import DomPodium from './hud/DomPodium';
import { CeremonyHead, CeremonyPanel } from './hud/CeremonyView';
import { useCeremonyIntro } from './hud/useCeremonyIntro';
import { useInputLock } from './useInputLock';
import { useSkipOnTap } from './useSkipOnTap';
import { ANIMAL_EMOJI, boardAria, nextUpView, podiumAria } from './labels';

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
  useSkipOnTap();
  const hitId = useStarHit();
  // D-16: the ceremony intro run, keyed on the board (new on every 🔁 다시 하기). Only while the
  // page is visible (WR-04): a ceremony reached in a hidden tab starts its intro and fanfare once
  // the page is shown, and hiding the page mid-intro ends it like leaving the ceremony does.
  const intro = useCeremonyIntro(game?.phase === 'gameOver' && !busy && visible, game?.board);

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
  const nomination = !!config.rules.nomination;
  const waiting = phase === 'awaitingNomination';
  // D-14a: during the win beat the DOM HUD shows the finished game, like the 3D scene does.
  const over = phase === 'gameOver';
  // D-11: the ceremony starts once the win / end beats are over.
  const ceremony = over && !busy;
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
    ceremony: ceremony ? { winners: game.winners, introId: intro.introId, introActive: intro.introActive } : null,
  };
  const canvasAria = ceremony
    ? podiumAria(participants.filter((p) => game.winners.includes(p.id)).map((p) => p.name))
    : nomination && (waiting || phase === 'turnResolved')
      ? `${game.board.length}칸 순환 보드, 선생님 지목 대기`
      : boardAria(game.board.length, cur.name, over);

  // UI-SPEC C7e: at gameOver (the win beat) the engine's endGame is a no-op, so 지금 끝내기 skips
  // the beats instead and the ceremony shows at once (T-07-03).
  function endNow() {
    if (useGameStore.getState().game?.phase === 'gameOver') usePresentation.getState().skipAll();
    else useGameStore.getState().endNow();
  }

  function handleUndo() {
    useGameStore.getState().undo();
    showToast('판정을 되돌렸어요. 다시 골라 주세요.');
  }

  return (
    <div className={ceremony ? 'game-stage stage stage--ceremony' : 'game-stage stage'}>
      {ceremony ? (
        <CeremonyHead game={game} />
      ) : (
        <TurnHud
          nomination={nomination}
          waiting={waiting || (nomination && phase === 'turnResolved')}
          animal={cur.animal}
          name={cur.name}
          isTeam={config.mode === 'team'}
          activeMember={activeMember(game)}
          isExtra={turn.isExtra}
          round={game.round}
          totalRounds={config.rules.rounds}
          targetJumps={config.rules.targetJumps}
          next={nextUpView(game)}
          onEndNow={endNow}
          over={over}
        />
      )}

      <div className="stage-canvas-cell">
        <div className="stage-canvas" role="img" aria-label={canvasAria}>
          <CanvasErrorBoundary key={canvasKey} onError={handleError}>
            <Suspense fallback={null}>
              <LazyCanvas {...canvasProps} />
            </Suspense>
          </CanvasErrorBoundary>
        </div>

        {!ceremony && <StatusChips move={lastMove} pending={pendingKinds(current, queue)} />}

        {!ceremony && controlsVisible && phase === 'awaitingJudgement' && card && (
          <MissionOverlay
            targetJumps={config.rules.targetJumps}
            mission={card.mission}
            diff={card.diff}
            stars={card.stars}
            attempt={card.attempt}
            onJudge={(success) => guard(() => useGameStore.getState().judge(success))}
          />
        )}

        <Banner />
        <StarFlight
          tiles={game.board}
          order={participants.map((p) => p.id)}
          currentId={cur.id}
          canvasOk={ready && failure === null}
        />
        <SoundToggle />

        {(!ready || failure) &&
          (ceremony ? (
            <DomPodium game={game} onRedraw={redraw} />
          ) : (
            <ContextLostOverlay mode={failure ?? 'loading'} onRedraw={redraw} />
          ))}
      </div>

      {ceremony ? (
        <CeremonyPanel game={game} introActive={intro.introActive} />
      ) : (
        <div className="stage-bottom">
          {nomination && !over && controlsVisible && (waiting || phase === 'turnResolved') && (
            <section className="nomination-panel" aria-label="선생님 지목">
              <h2>누구에게 기회를 줄까요?</h2>
              <p>선생님이 이름을 누르면 그 친구만 한 번 돌릴 수 있어요. 같은 친구를 다시 지목해도 돼요.</p>
              <div className="nomination-choices">
                {participants.map((p) => (
                  <button type="button" className="game-btn--sm" key={p.id}
                    onClick={() => guard(() => useGameStore.getState().nominate(p.id))}
                    aria-label={p.name + ' 지목하기'}>
                    {ANIMAL_EMOJI[p.animal]} {p.name} 지목
                  </button>
                ))}
              </div>
              <p>별은 계속 누적돼요. 수업을 마칠 때 ‘지금 끝내기’를 눌러 우승을 확인하세요.</p>
            </section>
          )}
          <ControlsBar
            nomination={nomination}
            phase={phase}
            hidden={!controlsVisible}
            canUndo={canUndo(game)}
            nextKind={nextKind}
            judgement={phase === 'turnResolved' ? lastJudgement : null}
            onRoll={() => guard(() => useGameStore.getState().roll())}
            onNext={() => guard(() => useGameStore.getState().next())}
            onUndo={() => guard(handleUndo)}
          />
          <Scoreboard
            entries={entries}
            currentId={over || (nomination && (waiting || phase === 'turnResolved')) ? null : cur.id}
            crownIds={over ? game.winners : undefined}
            hitId={hitId}
          />
        </div>
      )}
    </div>
  );
}
