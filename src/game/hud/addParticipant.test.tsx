// src/game/hud/addParticipant.test.tsx — "＋ 친구 추가" during a running game, and the 20-player start screen.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AddParticipant from './AddParticipant';
import SetupView from './SetupView';
import { useStore } from '../../store';
import { useSettings, DEFAULT_SETTINGS } from '../../settings';
import { useGameStore } from '../../harness/useGameStore';
import { useSetupDraft } from '../useSetupDraft';
import { buildParticipants, MAX_PARTICIPANTS } from '../../engine/setup';
import { mission } from '../../engine/testkit';

function resetAll() {
  localStorage.clear();
  useGameStore.getState().reset();
  useSettings.setState({ ...DEFAULT_SETTINGS });
  useSetupDraft.getState().reset();
  useStore.setState({ version: 1, categories: [], missions: [mission('e', 'easy'), mission('n', 'normal')], events: [] });
}

function start(count: number, mode: 'solo' | 'team' = 'solo') {
  useGameStore.getState().startGame({ mode, participants: buildParticipants(mode, count, [], []), rounds: 3, targetJumps: 5 });
}

beforeEach(resetAll);
afterEach(cleanup);

describe('AddParticipant', () => {
  it('adds a named friend with the chosen animal at the end of the order', () => {
    start(2);
    render(<AddParticipant />);
    fireEvent.click(screen.getByRole('button', { name: '＋ 친구 추가' }));
    fireEvent.change(screen.getByLabelText('추가할 친구 이름'), { target: { value: '하늘' } });
    fireEvent.click(screen.getByRole('button', { name: '여우' }));
    fireEvent.click(screen.getByRole('button', { name: '추가하기' }));
    const list = useGameStore.getState().game!.config.participants;
    expect(list).toHaveLength(3);
    expect(list[2]).toMatchObject({ name: '하늘', animal: 'fox', position: 0, stars: 0 });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('uses the placeholder name and team members in team mode', () => {
    start(2, 'team');
    render(<AddParticipant />);
    fireEvent.click(screen.getByRole('button', { name: '＋ 팀 추가' }));
    fireEvent.change(screen.getByLabelText('추가할 팀 멤버 이름'), { target: { value: '민수, 지아' } });
    fireEvent.click(screen.getByRole('button', { name: '추가하기' }));
    const p = useGameStore.getState().game!.config.participants[2];
    expect(p.name).toBe('팀 3');
    expect(p.memberNames).toEqual(['민수', '지아']);
  });

  it('cancel adds nobody; the button is gone at the limit and after the game ends', () => {
    start(2);
    const view = render(<AddParticipant />);
    fireEvent.click(screen.getByRole('button', { name: '＋ 친구 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(useGameStore.getState().game!.config.participants).toHaveLength(2);
    view.unmount();

    start(MAX_PARTICIPANTS);
    const full = render(<AddParticipant />);
    expect(screen.queryByRole('button', { name: '＋ 친구 추가' })).toBeNull();
    full.unmount();

    start(2);
    useGameStore.getState().endNow();
    render(<AddParticipant />);
    expect(screen.queryByRole('button', { name: '＋ 친구 추가' })).toBeNull();
  });
});

describe('SetupView with up to 20 participants', () => {
  it('steps the count up to 20 and starts with 20 participants', () => {
    useSetupDraft.getState().patch({ targetJumps: 5, playOrder: 'sequential' });
    render(<SetupView />);
    const plus = screen.getByRole('button', { name: '늘리기' });
    for (let i = 0; i < 25; i++) fireEvent.click(plus);
    expect(screen.getByLabelText('인원 수')).toHaveValue(20);
    fireEvent.click(screen.getByRole('button', { name: '게임 시작' }));
    const list = useGameStore.getState().game!.config.participants;
    expect(list).toHaveLength(20);
    expect(new Set(list.map((p) => p.animal)).size).toBe(8);
  });
});
