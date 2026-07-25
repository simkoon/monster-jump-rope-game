// src/harness/PlayHarness.tsx — the throwaway plain-DOM play screen that drives the
// full turn loop (draw → judge → roll → move → event → advance) on the pure engine,
// plus the DOM-OWNED countdown (default 20분) and the 지금 순위로 마치기 manual end.
//
// Pitfall 1 / D-04: the wall clock lives ONLY here. The engine never reads time — the
// countdown effect computes remaining ms from Date.now() and only calls end(reason).
// This whole screen is disposable: Phase 3 replaces it with the 3D board + child UI (D-09).
import { useEffect, useRef } from 'react';
import { useGameStore } from './useGameStore';
import type { Difficulty } from '../schema';

// LOOP-02: show the drawn mission's difficulty as a friendly Korean label.
const DIFF_LABEL: Record<Difficulty, string> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
};

function formatClock(ms: number): string {
  const clamped = Math.max(0, ms);
  const total = Math.ceil(clamped / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function PlayHarness() {
  const game = useGameStore((s) => s.game);
  const remainingMs = useGameStore((s) => s.remainingMs);

  // Capture the session start once per game so re-renders don't reset the clock.
  const startedAtRef = useRef<number | null>(null);

  // DOM-owned countdown (Pitfall 1). Re-arms whenever the phase changes so it stops at
  // gameOver, and always clears its interval on unmount / re-run (T-02-09 no leak).
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
    tick(); // paint an immediate value instead of waiting a full interval
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [phase, timeLimitMs]);

  if (!game) return null; // GameHarness only mounts this with an active game.

  const { config, currentIndex, phase: p, card, lastRoll, lastLanding } = game;
  const current = config.participants[currentIndex];
  const activeMember =
    current.memberNames[current.memberTurnIndex] ?? current.memberNames[0] ?? current.name;
  const isTeam = config.mode === 'team';

  return (
    <div className="play">
      {/* Countdown + manual end (D-04). Both are DOM-owned; the engine only gets end(reason). */}
      <header className="play-topbar">
        {timeLimitMs != null && (
          <span className="play-clock" aria-label="남은 시간">
            남은 시간 {formatClock(remainingMs ?? timeLimitMs)}
          </span>
        )}
        <button type="button" onClick={() => useGameStore.getState().end('manual')}>
          지금 순위로 마치기
        </button>
      </header>

      {/* Current-turn banner: participant + (team) the member taking this turn (D-01). */}
      <div className="play-turn-banner">
        <strong>{current.name}</strong> 차례
        {isTeam && (
          <span className="play-member">
            {' '}
            — 이번엔 <strong>{activeMember}</strong> 님이 도전!
          </span>
        )}
      </div>

      {/* Phase-driven control set, in the locked loop order (D-06). */}
      {p === 'awaitingDraw' && (
        <section className="play-stage">
          <p>카드를 뽑아 미션을 확인하세요.</p>
          <button type="button" onClick={() => useGameStore.getState().draw()}>
            카드 뽑기
          </button>
        </section>
      )}

      {p === 'awaitingJudgement' && card && (
        <section className="play-stage play-mission">
          {/* LOOP-02: name / desc / difficulty shown large. */}
          <h2 className="play-mission-name">{card.mission.name}</h2>
          {card.mission.desc && <p className="play-mission-desc">{card.mission.desc}</p>}
          <p className="play-mission-diff">{DIFF_LABEL[card.mission.diff]}</p>
          {/* LOOP-03/04: instructor verdict — 실패 advances with no move. */}
          <div className="play-judge">
            <button type="button" onClick={() => useGameStore.getState().judge(true)}>
              성공
            </button>
            <button type="button" onClick={() => useGameStore.getState().judge(false)}>
              실패
            </button>
          </div>
        </section>
      )}

      {p === 'awaitingRoll' && (
        <section className="play-stage">
          <p>성공! 주사위를 굴려 전진하세요.</p>
          <button type="button" onClick={() => useGameStore.getState().roll()}>
            주사위 굴리기
          </button>
        </section>
      )}

      {p === 'turnResolved' && lastLanding && (
        <section className="play-stage play-resolved">
          {/* LOOP-05/07: roll + move + landed event. */}
          <p className="play-roll">
            주사위: <strong>{lastRoll}</strong>
          </p>
          <p className="play-move">
            {lastLanding.from}칸 → <strong>{lastLanding.to}칸</strong>
          </p>
          {lastLanding.label && <p className="play-event-label">{lastLanding.label}</p>}
          {/* LOOP-08: an extra-turn event repeats the SAME player/member. */}
          {lastLanding.extraTurn && <p className="play-extra">한 번 더! 같은 차례를 이어가요.</p>}
          <button type="button" onClick={() => useGameStore.getState().next()}>
            다음
          </button>
        </section>
      )}

      {/* Every token's position (shared board readout). */}
      <ol className="play-positions">
        {config.participants.map((pt, i) => (
          <li key={pt.id} className={i === currentIndex ? 'is-current' : undefined}>
            {pt.name} — {pt.position}칸
          </li>
        ))}
      </ol>
    </div>
  );
}
