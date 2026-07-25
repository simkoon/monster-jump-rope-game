import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EventModal from './EventModal';
import Toast from './Toast';
import { useStore } from '../store';
import type { Event } from '../schema';

function resetStore(events: Event[] = []) {
  localStorage.clear();
  useStore.setState({ version: 1, categories: [], missions: [], events });
}

describe('EventModal (add/edit, RHF + zodResolver)', () => {
  beforeEach(() => resetStore());

  it('blocks an empty-name submit, shows the error toast, and does not touch the store', async () => {
    render(
      <>
        <EventModal open event={null} onClose={() => {}} />
        <Toast />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('이벤트 이름을 입력해요')).toBeInTheDocument();
    expect(useStore.getState().events).toHaveLength(0);
  });

  it('hides the 몇 칸? field for the extra effect and saves steps === 0 (D-08)', async () => {
    render(<EventModal open event={null} onClose={() => {}} />);

    // steps field visible for the default forward effect
    expect(screen.getByLabelText('몇 칸?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '🔁 한 번 더' }));
    // steps field hidden once extra is chosen
    expect(screen.queryByLabelText('몇 칸?')).toBeNull();

    fireEvent.change(screen.getByLabelText('이벤트 이름'), { target: { value: '한 번 더 도전!' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(useStore.getState().events).toHaveLength(1));
    const e = useStore.getState().events[0];
    expect(e.eff).toBe('extra');
    expect(e.steps).toBe(0);
  });

  it('stores the entered steps for a forward event and prepends it', async () => {
    resetStore([{ id: 'e0', name: '기존', eff: 'forward', steps: 1, weight: 1, label: '' }]);
    render(<EventModal open event={null} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('이벤트 이름'), { target: { value: '슈퍼 점프!' } });
    fireEvent.change(screen.getByLabelText('몇 칸?'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(useStore.getState().events).toHaveLength(2));
    const first = useStore.getState().events[0];
    expect(first.name).toBe('슈퍼 점프!');
    expect(first.eff).toBe('forward');
    expect(first.steps).toBe(5);
  });

  it('pre-fills when editing and updates the event in place', async () => {
    const existing: Event = { id: 'e1', name: '발이 꼬였어요', eff: 'backward', steps: 2, weight: 2, label: '함정' };
    resetStore([existing]);
    render(<EventModal open event={existing} onClose={() => {}} />);

    const nameInput = screen.getByLabelText('이벤트 이름') as HTMLInputElement;
    expect(nameInput.value).toBe('발이 꼬였어요');

    fireEvent.change(nameInput, { target: { value: '발이 꼬였어요 (수정)' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(useStore.getState().events[0].name).toBe('발이 꼬였어요 (수정)'));
    expect(useStore.getState().events).toHaveLength(1);
    expect(useStore.getState().events[0].id).toBe('e1');
    expect(useStore.getState().events[0].eff).toBe('backward');
  });

  it('stores the literal 보너스 label when the 보너스 segment is chosen', async () => {
    render(<EventModal open event={null} onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('이벤트 이름'), { target: { value: '보너스 칸' } });
    fireEvent.click(screen.getByRole('button', { name: '🎁 보너스' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(useStore.getState().events).toHaveLength(1));
    expect(useStore.getState().events[0].label).toBe('보너스');
  });
});
