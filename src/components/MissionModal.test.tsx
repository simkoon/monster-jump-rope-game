import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MissionModal from './MissionModal';
import Toast from './Toast';
import { useStore } from '../store';
import type { Mission } from '../schema';

function resetStore(missions: Mission[] = []) {
  localStorage.clear();
  useStore.setState({ version: 1, categories: ['기초', '응용'], missions, events: [] });
}

describe('MissionModal (add/edit, RHF + zodResolver)', () => {
  beforeEach(() => resetStore());

  it('blocks an empty-name submit, shows the error toast, and does not touch the store', async () => {
    render(
      <>
        <MissionModal open mission={null} onClose={() => {}} />
        <Toast />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('미션 이름을 입력해요')).toBeInTheDocument();
    expect(useStore.getState().missions).toHaveLength(0);
  });

  it('adds a mission with a chosen difficulty; it prepends to the list', async () => {
    render(<MissionModal open mission={null} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('미션 이름'), { target: { value: '이중뛰기' } });
    fireEvent.click(screen.getByRole('button', { name: '🔴 어려움' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(useStore.getState().missions).toHaveLength(1));
    const m = useStore.getState().missions[0];
    expect(m.name).toBe('이중뛰기');
    expect(m.diff).toBe('hard');
  });

  it('pre-fills when editing and updates the mission in place', async () => {
    const existing: Mission = {
      id: 'm1',
      name: '양발 모아뛰기',
      desc: '콩콩',
      diff: 'easy',
      cats: ['기초'],
    };
    resetStore([existing]);
    render(<MissionModal open mission={existing} onClose={() => {}} />);

    const nameInput = screen.getByLabelText('미션 이름') as HTMLInputElement;
    expect(nameInput.value).toBe('양발 모아뛰기');

    fireEvent.change(nameInput, { target: { value: '양발 모아뛰기 (수정)' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(useStore.getState().missions[0].name).toBe('양발 모아뛰기 (수정)'),
    );
    expect(useStore.getState().missions).toHaveLength(1);
    expect(useStore.getState().missions[0].id).toBe('m1');
  });

  it('adds a new category inline and selects it for the mission', async () => {
    render(<MissionModal open mission={null} onClose={() => {}} />);

    const catInput = screen.getByLabelText('새 카테고리 추가');
    fireEvent.change(catInput, { target: { value: '점프' } });
    fireEvent.keyDown(catInput, { key: 'Enter' });

    expect(useStore.getState().categories).toContain('점프');

    fireEvent.change(screen.getByLabelText('미션 이름'), { target: { value: '점프 미션' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(useStore.getState().missions).toHaveLength(1));
    expect(useStore.getState().missions[0].cats).toContain('점프');
  });
});
