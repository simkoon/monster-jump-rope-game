// src/harness/ResultScreen.test.tsx — winner / co-winner + restart paths (Task 2, TDD).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultScreen from './ResultScreen';
import { useGameStore } from './useGameStore';
import type { GameState, GameConfig, Participant, EndReason } from '../engine/types';

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

describe('ResultScreen — winner / co-winner + restart', () => {
  beforeEach(() => {
    useGameStore.setState({ game: null, remainingMs: null, startBlockedReason: null });
  });
  afterEach(() => vi.restoreAllMocks());

  it('single winner (reached-finish) shows the winner + both restart controls (LOOP-09/10)', () => {
    setGame(
      gameOver([participant('p1', '가', 20), participant('p2', '나', 8)], ['p1'], 'reached-finish'),
    );
    render(<ResultScreen />);
    expect(screen.getByText(/승리:/)).toHaveTextContent('가');
    expect(screen.getByRole('button', { name: /다시 시작/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /시작 화면으로/ })).toBeInTheDocument();
  });

  it('tied winners render 공동 승리 + a teacher-selectable control (D-05)', () => {
    setGame(
      gameOver([participant('p1', '가', 12), participant('p2', '나', 12)], ['p1', 'p2'], 'timeout'),
    );
    render(<ResultScreen />);
    expect(screen.getByText(/공동 승리/)).toBeInTheDocument();
    // A selection control exists for each tied participant.
    expect(screen.getAllByRole('radio').length).toBe(2);
  });

  it('picking a co-winner shows that participant as the final winner (D-05)', () => {
    setGame(
      gameOver([participant('p1', '가', 12), participant('p2', '나', 12)], ['p1', 'p2'], 'manual'),
    );
    render(<ResultScreen />);
    fireEvent.click(screen.getByRole('radio', { name: /나/ }));
    expect(screen.getByText(/최종 승리/)).toHaveTextContent('나');
  });

  it('reflects endReason (timeout/manual) distinctly from reached-finish', () => {
    setGame(gameOver([participant('p1', '가', 9)], ['p1'], 'timeout'));
    render(<ResultScreen />);
    expect(screen.getByText(/시간/)).toBeInTheDocument();
  });

  it('다시 시작 restarts a game with the same config (bridge startGame)', () => {
    const startSpy = vi.spyOn(useGameStore.getState(), 'startGame').mockImplementation(() => {});
    const state = gameOver([participant('p1', '가', 20)], ['p1'], 'reached-finish');
    setGame(state);
    render(<ResultScreen />);
    fireEvent.click(screen.getByRole('button', { name: /다시 시작/ }));
    expect(startSpy).toHaveBeenCalledWith(state.config);
  });

  it('시작 화면으로 resets game to null (LOOP-10)', () => {
    setGame(gameOver([participant('p1', '가', 20)], ['p1'], 'reached-finish'));
    render(<ResultScreen />);
    fireEvent.click(screen.getByRole('button', { name: /시작 화면으로/ }));
    expect(useGameStore.getState().game).toBeNull();
  });
});
