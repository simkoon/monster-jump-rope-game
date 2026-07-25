import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EventTab from './EventTab';
import { useStore } from '../store';
import type { Event } from '../schema';

// Four events, each weight 1 → each normalizes to 25% of the full list.
const E: Event[] = [
  { id: 'ev1', name: '앞 이벤트', eff: 'forward', steps: 3, weight: 1, label: '' },
  { id: 'ev2', name: '뒤 이벤트', eff: 'backward', steps: 2, weight: 1, label: '함정' },
  { id: 'ev3', name: '더 이벤트', eff: 'extra', steps: 0, weight: 1, label: '보너스' },
  { id: 'ev4', name: '한칸 이벤트', eff: 'forward', steps: 1, weight: 1, label: '' },
];

function resetStore() {
  localStorage.clear();
  useStore.setState({ version: 1, categories: [], missions: [], events: E.map((e) => ({ ...e })) });
}

describe('EventTab (search + live probability + edit/delete)', () => {
  beforeEach(resetStore);

  it('renders every seed event with a normalized probability % and its 가중치', () => {
    render(<EventTab />);
    // All four weight-1 events each show 25% · 가중치 1.
    expect(screen.getAllByText('25% · 가중치 1')).toHaveLength(4);
    expect(screen.getByText('앞 이벤트')).toBeInTheDocument();
    expect(screen.getByText('더 이벤트')).toBeInTheDocument();
  });

  it('shows the probability hint banner', () => {
    render(<EventTab />);
    expect(screen.getByText(/합이 100이 아니어도 괜찮아요/)).toBeInTheDocument();
  });

  it('renders an extra event as 한 번 더 with no 칸 suffix (D-06)', () => {
    render(<EventTab />);
    const effText = screen.getByText('🔁 한 번 더!');
    expect(effText).toBeInTheDocument();
    expect(effText.textContent).not.toContain('칸');
  });

  it('re-derives every event % live when one weight is edited, without altering others (D-05)', async () => {
    render(<EventTab />);
    // Edit ev1's weight to 5 → total 8: ev1 63%, the three weight-1 events 13%.
    fireEvent.click(screen.getByRole('button', { name: '앞 이벤트 수정' }));
    const weightInput = screen.getByLabelText('가중치 (자주 나올수록 크게)') as HTMLInputElement;
    fireEvent.change(weightInput, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(screen.getByText('63% · 가중치 5')).toBeInTheDocument());
    // The other three events re-derive to 13% but their STORED weights stay 1.
    expect(screen.getAllByText('13% · 가중치 1')).toHaveLength(3);
    const evs = useStore.getState().events;
    expect(evs.find((e) => e.id === 'ev1')!.weight).toBe(5);
    expect(evs.find((e) => e.id === 'ev2')!.weight).toBe(1);
    expect(evs.find((e) => e.id === 'ev3')!.weight).toBe(1);
    expect(evs.find((e) => e.id === 'ev4')!.weight).toBe(1);
  });

  it('narrows the cards to matching names as you type in search', () => {
    render(<EventTab />);
    fireEvent.change(screen.getByLabelText('이벤트 이름으로 찾기'), { target: { value: '앞' } });
    expect(screen.getByText('앞 이벤트')).toBeInTheDocument();
    expect(screen.queryByText('뒤 이벤트')).toBeNull();
    expect(screen.queryByText('더 이벤트')).toBeNull();
  });

  it('shows the no-match empty copy when the search excludes everything', () => {
    render(<EventTab />);
    fireEvent.change(screen.getByLabelText('이벤트 이름으로 찾기'), { target: { value: 'zzzz' } });
    expect(screen.getByText('찾는 이벤트가 없어요')).toBeInTheDocument();
  });

  it('deletes an event after a confirm dialog that names it', () => {
    render(<EventTab />);
    fireEvent.click(screen.getByRole('button', { name: '뒤 이벤트 삭제' }));
    expect(screen.getByText('"뒤 이벤트" 이벤트를 삭제할까요?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(useStore.getState().events).toHaveLength(3);
    expect(screen.queryByText('뒤 이벤트')).toBeNull();
  });
});
