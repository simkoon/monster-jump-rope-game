// src/harness/PlayHarness.test.tsx — the phase-driven play loop + DOM countdown (Task 1, TDD).
// Drives crafted GameStates through useGameStore.setState so each phase's control is
// asserted deterministically; fake timers exercise the DOM-owned countdown (Pitfall 1).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PlayHarness from './PlayHarness';
import { useGameStore } from './useGameStore';
import type { GameState, GameConfig, Participant, DrawnCard, LandingResult } from '../engine/types';

const participant = (
  id: string,
  name: string,
  position = 0,
  memberNames: string[] = [name],
  memberTurnIndex = 0,
): Participant => ({ id, name, character: 'boy', position, memberNames, memberTurnIndex });

const baseConfig = (over: Partial<GameConfig> = {}): GameConfig => ({
  mode: 'solo',
  participants: [participant('p1', '가'), participant('p2', '나')],
  boardLength: 20,
  timeLimitMs: null,
  ...over,
});

const baseState = (over: Partial<GameState> = {}): GameState => ({
  phase: 'awaitingDraw',
  config: baseConfig(over.config ? {} : {}),
  boardEvents: [],
  currentIndex: 0,
  card: null,
  lastRoll: null,
  lastLanding: null,
  winners: [],
  endReason: null,
  ...over,
});

const card = (): DrawnCard => ({
  mission: { id: 'm1', name: '양발 모아뛰기', desc: '제자리에서 열 번 뛰기', diff: 'hard', cats: [] },
});

const landing = (over: Partial<LandingResult> = {}): LandingResult => ({
  eventId: null,
  eff: null,
  label: '',
  from: 3,
  to: 6,
  extraTurn: false,
  ...over,
});

function setGame(state: GameState, remainingMs: number | null = null) {
  useGameStore.setState({ game: state, remainingMs });
}

describe('PlayHarness — phase-driven loop', () => {
  beforeEach(() => {
    useGameStore.setState({ game: null, remainingMs: null, startBlockedReason: null });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('awaitingDraw → 카드 뽑기 button calls draw() (LOOP-01)', () => {
    // mockImplementation isolates the click from real state transitions.
    const drawSpy = vi.spyOn(useGameStore.getState(), 'draw').mockImplementation(() => {});
    setGame(baseState({ phase: 'awaitingDraw' }));
    render(<PlayHarness />);
    fireEvent.click(screen.getByRole('button', { name: /카드 뽑기/ }));
    expect(drawSpy).toHaveBeenCalledTimes(1);
  });

  it('awaitingJudgement shows mission name/desc/difficulty large + 성공/실패 (LOOP-02/03/04)', () => {
    const judgeSpy = vi.spyOn(useGameStore.getState(), 'judge').mockImplementation(() => {});
    setGame(baseState({ phase: 'awaitingJudgement', card: card() }));
    render(<PlayHarness />);
    expect(screen.getByText('양발 모아뛰기')).toBeInTheDocument();
    expect(screen.getByText('제자리에서 열 번 뛰기')).toBeInTheDocument();
    expect(screen.getByText('어려움')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /성공/ }));
    expect(judgeSpy).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: /실패/ }));
    expect(judgeSpy).toHaveBeenCalledWith(false);
  });

  it('awaitingRoll → 주사위 굴리기 button calls roll() (LOOP-05)', () => {
    const rollSpy = vi.spyOn(useGameStore.getState(), 'roll').mockImplementation(() => {});
    setGame(baseState({ phase: 'awaitingRoll', card: card() }));
    render(<PlayHarness />);
    fireEvent.click(screen.getByRole('button', { name: /주사위 굴리기/ }));
    expect(rollSpy).toHaveBeenCalledTimes(1);
  });

  it('turnResolved shows roll + landing (from→to, label) and 다음 calls next() (LOOP-07)', () => {
    const nextSpy = vi.spyOn(useGameStore.getState(), 'next').mockImplementation(() => {});
    setGame(
      baseState({
        phase: 'turnResolved',
        lastRoll: 3,
        lastLanding: landing({ eventId: 'e1', eff: 'forward', label: '보너스', from: 3, to: 8 }),
      }),
    );
    render(<PlayHarness />);
    expect(screen.getByText(/주사위/)).toHaveTextContent('3'); // roll shown
    expect(screen.getByText('보너스')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /다음/ }));
    expect(nextSpy).toHaveBeenCalledTimes(1);
  });

  it('turnResolved with extraTurn renders a 한 번 더 marker (LOOP-08)', () => {
    setGame(
      baseState({
        phase: 'turnResolved',
        lastRoll: 4,
        lastLanding: landing({ eventId: 'e2', eff: 'extra', label: '', from: 3, to: 7, extraTurn: true }),
      }),
    );
    render(<PlayHarness />);
    expect(screen.getByText(/한 번 더/)).toBeInTheDocument();
  });

  it('shows the current-turn participant and, in team mode, the active member (D-01)', () => {
    const team = participant('p1', '파랑팀', 0, ['철수', '영희'], 1);
    setGame(
      baseState({
        phase: 'awaitingDraw',
        config: baseConfig({ mode: 'team', participants: [team, participant('p2', '빨강팀')] }),
        currentIndex: 0,
      }),
    );
    render(<PlayHarness />);
    // 파랑팀 shows in both the turn banner and the position list.
    expect(screen.getAllByText(/파랑팀/).length).toBeGreaterThan(0);
    expect(screen.getByText(/영희/)).toBeInTheDocument(); // memberTurnIndex 1 → 영희
  });

  it('lists every participant position', () => {
    setGame(
      baseState({
        config: baseConfig({
          participants: [participant('p1', '가', 5), participant('p2', '나', 12)],
        }),
      }),
    );
    render(<PlayHarness />);
    expect(screen.getByText(/5칸/)).toBeInTheDocument();
    expect(screen.getByText(/12칸/)).toBeInTheDocument();
  });

  it('countdown reaching 0 calls end("timeout") (D-04, Pitfall 1)', () => {
    vi.useFakeTimers();
    const endSpy = vi.spyOn(useGameStore.getState(), 'end');
    setGame(baseState({ phase: 'awaitingDraw', config: baseConfig({ timeLimitMs: 1000 }) }), 1000);
    render(<PlayHarness />);
    act(() => {
      vi.advanceTimersByTime(1300);
    });
    expect(endSpy).toHaveBeenCalledWith('timeout');
  });

  it('지금 순위로 마치기 button calls end("manual") (D-04)', () => {
    const endSpy = vi.spyOn(useGameStore.getState(), 'end');
    setGame(baseState({ phase: 'awaitingDraw', config: baseConfig({ timeLimitMs: 20 * 60 * 1000 }) }), 20 * 60 * 1000);
    render(<PlayHarness />);
    fireEvent.click(screen.getByRole('button', { name: /지금 순위로 마치기/ }));
    expect(endSpy).toHaveBeenCalledWith('manual');
  });
});
