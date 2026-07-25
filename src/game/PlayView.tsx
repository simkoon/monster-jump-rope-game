// src/game/PlayView.tsx — the playable 3D slice: <BoardScene> + a THIN phase-driven DOM
// control overlay (the polished child HUD replaces this in 03-02). It orchestrates the
// ANIM_DONE flow (D-07): pressing 주사위 굴리기 sets busy, calls the engine roll(), plays the
// dice spin → then the token hop, and only clears busy (revealing the resolved panel + 다음)
// when the token arrives. A watchdog guarantees busy can never stay stuck (Pitfall 1).
//
// The countdown clock is DOM-owned and reused verbatim from the harness pattern (D-04): it
// computes remaining ms from Date.now(), stops at gameOver, and clears on unmount (no leak).
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../harness/useGameStore';
import { usePresentation } from './usePresentation';
import BoardScene from './scene/BoardScene';
import { type MoveSpec, HOP_S } from './scene/Token';
import { DICE_S } from './scene/Dice';
import type { Difficulty } from '../schema';

const DIFF_LABEL: Record<Difficulty, string> = { easy: '쉬움', normal: '보통', hard: '어려움' };

function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

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
    <div className="game-stage" style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <BoardScene
        boardLength={config.boardLength}
        participants={config.participants}
        activeIndex={currentIndex}
        move={move}
        runToken={seq === 'token'}
        rollId={rollId}
        face={lastRoll}
        onDiceSettled={handleDiceSettled}
        onTokenArrive={handleTokenArrive}
      />

      {/* DOM HUD overlay — siblings of the Canvas (ART-04 big tap targets, a11y). */}
      <div className="game-hud" aria-live="polite">
        <header className="game-topbar">
          {timeLimitMs != null && (
            <span className="game-clock" aria-label="남은 시간">
              ⏱️ {formatClock(remainingMs ?? timeLimitMs)}
            </span>
          )}
          <button type="button" onClick={() => useGameStore.getState().end('manual')}>
            지금 순위로 마치기
          </button>
        </header>

        <div className="game-turn-banner">
          <strong>{current.name}</strong> 차례
          {isTeam && (
            <span className="game-member">
              {' '}
              — 이번엔 <strong>{activeMember}</strong> 님이 도전!
            </span>
          )}
        </div>

        {/* Phase-driven controls — hidden while busy so no double-tap skips the engine (D-07). */}
        {!busy && p === 'awaitingDraw' && (
          <section className="game-controls">
            <button type="button" onClick={() => useGameStore.getState().draw()}>
              🎴 카드 뽑기
            </button>
          </section>
        )}

        {!busy && p === 'awaitingJudgement' && card && (
          <section className="game-controls game-mission">
            <h2 className="game-mission-name">{card.mission.name}</h2>
            {card.mission.desc && <p className="game-mission-desc">{card.mission.desc}</p>}
            <p className="game-mission-diff">{DIFF_LABEL[card.mission.diff]}</p>
            <div className="game-judge">
              <button type="button" onClick={() => useGameStore.getState().judge(true)}>
                ✅ 성공
              </button>
              <button type="button" onClick={() => useGameStore.getState().judge(false)}>
                ❌ 실패
              </button>
            </div>
          </section>
        )}

        {!busy && p === 'awaitingRoll' && (
          <section className="game-controls">
            <button type="button" onClick={handleRoll}>
              🎲 주사위 굴리기
            </button>
          </section>
        )}

        {!busy && p === 'turnResolved' && lastLanding && (
          <section className="game-controls game-resolved">
            <p className="game-roll">
              🎲 <strong>{lastRoll}</strong>
            </p>
            <p className="game-move">
              {lastLanding.from}칸 → <strong>{lastLanding.to}칸</strong>
            </p>
            {lastLanding.eff === 'forward' && (
              <p className="game-event eff-forward">➡️ 앞으로!</p>
            )}
            {lastLanding.eff === 'backward' && (
              <p className="game-event eff-backward">⬅️ 뒤로!</p>
            )}
            {lastLanding.extraTurn && <p className="game-event eff-extra">🔁 한 번 더!</p>}
            <button type="button" onClick={() => useGameStore.getState().next()}>
              다음 ➡️
            </button>
          </section>
        )}

        <ol className="game-positions">
          {config.participants.map((pt, i) => (
            <li key={pt.id} className={i === currentIndex ? 'is-current' : undefined}>
              {pt.name} — {pt.position}칸
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
