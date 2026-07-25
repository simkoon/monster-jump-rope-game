// src/game/hud/shell.test.tsx — the child-reskinned setup + result shells (03-02, D-05/D-09).
// Mirrors the deleted harness screen tests against the new SetupView/ResultView, confirming
// the reused Phase 2 logic still holds: the empty-library 시작 guard (MISSION-07), the
// tie-break resolution (D-05), and the two restart paths (LOOP-10).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SetupView from './SetupView';
import ResultView from './ResultView';
import { useStore } from '../../store';
import { useGameStore } from '../../harness/useGameStore';
import type { Mission } from '../../schema';
import type { GameState, GameConfig, Participant, EndReason } from '../../engine/types';

const mission = (id: string): Mission => ({ id, name: `미션-${id}`, desc: '', diff: 'easy', cats: [] });

function setMissions(missions: Mission[]) {
  localStorage.clear();
  useStore.setState({ version: 1, categories: [], missions, events: [] });
}

const participant = (id: string, name: string, position = 0): Participant => ({
  id,
  name,
  character: 'boy',
  position,
  memberNames: [name],
  memberTurnIndex: 0,
});

const gameOver = (
  participants: Participant[],
  winners: string[],
  endReason: EndReason,
): GameState => {
  const config: GameConfig = { mode: 'solo', participants, boardLength: 20, timeLimitMs: null };
  return {
    phase: 'gameOver',
    config,
    boardEvents: [],
    currentIndex: 0,
    card: null,
    lastRoll: null,
    lastLanding: null,
    winners,
    endReason,
  };
};

function setGame(state: GameState) {
  useGameStore.setState({ game: state, remainingMs: null, startBlockedReason: null });
}

describe('SetupView — empty-library guard (MISSION-07)', () => {
  beforeEach(() => useGameStore.getState().reset());

  it('empty mission library → 시작 disabled + editor guidance', () => {
    setMissions([]);
    render(<SetupView />);
    const start = screen.getByRole('button', { name: /시작/ });
    expect(start).toBeDisabled();
    expect(screen.getByText(/미션이 없어요/)).toBeInTheDocument();
  });

  it('non-empty library → 시작 enabled; clicking it launches phase awaitingDraw (SETUP-06)', () => {
    setMissions([mission('a'), mission('b')]);
    render(<SetupView />);
    const start = screen.getByRole('button', { name: /시작/ });
    expect(start).not.toBeDisabled();
    fireEvent.click(start);
    const game = useGameStore.getState().game;
    expect(game).not.toBeNull();
    expect(game!.phase).toBe('awaitingDraw');
  });

  it('renders the 파워점핑 placeholder logo + a --tap 시작 button (ART-04)', () => {
    setMissions([mission('a')]);
    render(<SetupView />);
    expect(screen.getByText('파워점핑')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /시작/ }).className).toContain('game-btn');
  });

  it('team mode reveals member-name inputs and starts a shared-token game (D-01)', () => {
    setMissions([mission('a')]);
    render(<SetupView />);
    fireEvent.click(screen.getByRole('button', { name: '팀전' }));
    expect(screen.getAllByLabelText(/멤버/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /시작/ }));
    expect(useGameStore.getState().game!.config.mode).toBe('team');
  });
});

describe('ResultView — winner / co-winner + restart (D-05/LOOP-10)', () => {
  beforeEach(() => {
    useGameStore.setState({ game: null, remainingMs: null, startBlockedReason: null });
  });
  afterEach(() => vi.restoreAllMocks());

  it('single winner shows the winner + both restart controls', () => {
    setGame(gameOver([participant('p1', '가', 20), participant('p2', '나', 8)], ['p1'], 'reached-finish'));
    render(<ResultView />);
    expect(screen.getByText(/승리:/)).toHaveTextContent('가');
    expect(screen.getByRole('button', { name: /다시 시작/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /시작 화면으로/ })).toBeInTheDocument();
  });

  it('tied winners render 공동 승리 + a radio per participant that resolves to a final winner', () => {
    setGame(gameOver([participant('p1', '가', 12), participant('p2', '나', 12)], ['p1', 'p2'], 'timeout'));
    render(<ResultView />);
    expect(screen.getByText(/공동 승리/)).toBeInTheDocument();
    expect(screen.getAllByRole('radio').length).toBe(2);
    fireEvent.click(screen.getByRole('radio', { name: /나/ }));
    expect(screen.getByText(/최종 승리/)).toHaveTextContent('나');
  });

  it('reflects timeout endReason distinctly', () => {
    setGame(gameOver([participant('p1', '가', 9)], ['p1'], 'timeout'));
    render(<ResultView />);
    expect(screen.getByText(/시간/)).toBeInTheDocument();
  });

  it('다시 시작 restarts with the same config; 시작 화면으로 resets to null (LOOP-10)', () => {
    const state = gameOver([participant('p1', '가', 20)], ['p1'], 'reached-finish');
    const startSpy = vi.spyOn(useGameStore.getState(), 'startGame').mockImplementation(() => {});
    setGame(state);
    render(<ResultView />);
    fireEvent.click(screen.getByRole('button', { name: /다시 시작/ }));
    expect(startSpy).toHaveBeenCalledWith(state.config);

    startSpy.mockRestore();
    setGame(state);
    render(<ResultView />);
    fireEvent.click(screen.getAllByRole('button', { name: /시작 화면으로/ })[0]);
    expect(useGameStore.getState().game).toBeNull();
  });
});
