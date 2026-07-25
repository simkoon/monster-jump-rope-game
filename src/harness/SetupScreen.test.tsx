// src/harness/SetupScreen.test.tsx — setup form + empty-list guard (Task 2, TDD).
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SetupScreen from './SetupScreen';
import { useStore } from '../store';
import { useGameStore } from './useGameStore';
import type { Mission } from '../schema';

const mission = (id: string): Mission => ({ id, name: `미션-${id}`, desc: '', diff: 'easy', cats: [] });

function setMissions(missions: Mission[]) {
  localStorage.clear();
  useStore.setState({ version: 1, categories: [], missions, events: [] });
}

describe('SetupScreen', () => {
  beforeEach(() => useGameStore.getState().reset());

  it('empty mission library → 시작 disabled + editor guidance (MISSION-07)', () => {
    setMissions([]);
    render(<SetupScreen />);
    const start = screen.getByRole('button', { name: /시작/ });
    expect(start).toBeDisabled();
    expect(screen.getByText(/미션이 없어요/)).toBeInTheDocument();
  });

  it('non-empty library → clicking 시작 launches phase awaitingDraw (SETUP-06)', () => {
    setMissions([mission('a'), mission('b')]);
    render(<SetupScreen />);
    const start = screen.getByRole('button', { name: /시작/ });
    expect(start).not.toBeDisabled();
    fireEvent.click(start);
    const game = useGameStore.getState().game;
    expect(game).not.toBeNull();
    expect(game!.phase).toBe('awaitingDraw');
  });

  it('renders the 파워점핑 logo placeholder and the mode/preset controls (SETUP-01/02, D-02)', () => {
    setMissions([mission('a')]);
    render(<SetupScreen />);
    expect(screen.getByText('파워점핑')).toBeInTheDocument();
    // Mode + preset segmented controls are present as labeled groups...
    expect(screen.getByRole('group', { name: '게임 모드' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '보드 길이' })).toBeInTheDocument();
    // ...with all four toggle labels rendered (selected toggles resolve by text,
    // an accessible-name quirk of the pressed-button markup).
    for (const label of ['개인전', '팀전', '짧게', '보통']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('team mode reveals member-name inputs and starts a shared-token game (D-01)', () => {
    setMissions([mission('a')]);
    render(<SetupScreen />);
    fireEvent.click(screen.getByRole('button', { name: '팀전' }));
    // Member inputs appear in team mode.
    expect(screen.getAllByLabelText(/멤버/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /시작/ }));
    const game = useGameStore.getState().game;
    expect(game!.config.mode).toBe('team');
  });
});
