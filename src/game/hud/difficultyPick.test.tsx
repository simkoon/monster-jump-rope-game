// src/game/hud/difficultyPick.test.tsx — "오늘의 난이도": only the chosen difficulties go on the board.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SetupView from './SetupView';
import { useStore } from '../../store';
import { useSettings, DEFAULT_SETTINGS } from '../../settings';
import { useGameStore } from '../../harness/useGameStore';
import { useSetupDraft } from '../useSetupDraft';
import { buildParticipants } from '../../engine/setup';
import { mission } from '../../engine/testkit';

function resetAll() {
  localStorage.clear();
  useGameStore.getState().reset();
  useSettings.setState({ ...DEFAULT_SETTINGS });
  useSetupDraft.getState().reset();
  useSetupDraft.getState().patch({ targetJumps: 5 });
  useStore.setState({ version: 1, categories: [], missions: [mission('e', 'easy'), mission('n', 'normal'), mission('h', 'hard')], events: [] });
}

const questDiffs = () =>
  new Set(useGameStore.getState().game!.board.flatMap((t) => (t.kind === 'quest' ? [t.diff] : [])));

beforeEach(resetAll);
afterEach(cleanup);

describe('오늘의 난이도', () => {
  it('mixes all three by default', () => {
    render(<SetupView />);
    expect(screen.getByText('모든 난이도를 섞어서 판을 만들어요.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '게임 시작' }));
    expect(questDiffs()).toEqual(new Set(['easy', 'normal', 'hard']));
    expect(useGameStore.getState().game!.config.rules.diffs).toBeUndefined();
  });

  it('builds a board with only the chosen difficulties, kept on restart', () => {
    render(<SetupView />);
    fireEvent.click(screen.getByRole('button', { name: /^✔ 쉬움/ }));
    expect(screen.getByText('보통·어려움 미션만 판에 나와요.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '게임 시작' }));
    expect(questDiffs()).toEqual(new Set(['normal', 'hard']));
    useGameStore.getState().restart();
    expect(questDiffs()).toEqual(new Set(['normal', 'hard']));
    expect(useGameStore.getState().game!.pool.easy).toEqual([]);
  });

  it('blocks the start with nothing chosen or with no missions in the chosen difficulty', () => {
    useStore.setState({ missions: [mission('e', 'easy')] });
    render(<SetupView />);
    fireEvent.click(screen.getByRole('button', { name: /^✔ 쉬움/ }));
    expect(screen.getByText('고른 난이도에 미션이 없어요. 다른 난이도를 골라 주세요.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '게임 시작' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /^✔ 보통/ }));
    fireEvent.click(screen.getByRole('button', { name: /^✔ 어려움/ }));
    expect(screen.getAllByText('난이도를 하나 이상 골라 주세요.').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '게임 시작' })).toBeDisabled();
  });

  it('store: a direct start with an empty chosen difficulty is blocked', () => {
    useStore.setState({ missions: [mission('e', 'easy')] });
    useGameStore.getState().startGame({ mode: 'solo', participants: buildParticipants('solo', 2, [], []), rounds: 3, diffs: ['hard'] });
    expect(useGameStore.getState().game).toBeNull();
    expect(useGameStore.getState().startBlockedReason).toBe('고른 난이도에 미션이 없어요. 다른 난이도를 골라 주세요.');
  });
});
