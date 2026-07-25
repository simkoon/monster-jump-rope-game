import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import MissionTab from './MissionTab';
import App from '../App';
import { useStore } from '../store';
import type { Mission } from '../schema';

const M: Mission[] = [
  { id: 'm1', name: '앞으로 미션', desc: '', diff: 'easy', cats: ['A'] },
  { id: 'm2', name: '뒤로 미션', desc: '', diff: 'hard', cats: ['A', 'B'] },
  { id: 'm3', name: '점프 미션', desc: '', diff: 'hard', cats: ['B'] },
  { id: 'm4', name: '옆으로 미션', desc: '', diff: 'normal', cats: ['C'] },
];

function resetStore() {
  localStorage.clear();
  useStore.setState({ version: 1, categories: ['A', 'B', 'C'], missions: M.map((m) => ({ ...m, cats: [...m.cats] })), events: [] });
}

describe('MissionTab (search + difficulty/category filter + delete)', () => {
  beforeEach(resetStore);

  it('narrows the cards to matching names as you type in search', () => {
    render(<MissionTab />);
    fireEvent.change(screen.getByLabelText('미션 이름으로 찾기'), { target: { value: '점프' } });
    expect(screen.getByText('점프 미션')).toBeInTheDocument();
    expect(screen.queryByText('앞으로 미션')).toBeNull();
    expect(screen.queryByText('뒤로 미션')).toBeNull();
  });

  it('shows only hard missions when the 어려움 difficulty chip is active (OR within difficulty)', () => {
    render(<MissionTab />);
    fireEvent.click(screen.getByRole('button', { name: '어려움' }));
    expect(screen.getByText('뒤로 미션')).toBeInTheDocument();
    expect(screen.getByText('점프 미션')).toBeInTheDocument();
    expect(screen.queryByText('앞으로 미션')).toBeNull();
    expect(screen.queryByText('옆으로 미션')).toBeNull();
  });

  it('shows only missions containing BOTH active categories (AND across categories)', () => {
    render(<MissionTab />);
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    fireEvent.click(screen.getByRole('button', { name: 'B' }));
    // Only m2 has both A and B.
    expect(screen.getByText('뒤로 미션')).toBeInTheDocument();
    expect(screen.queryByText('앞으로 미션')).toBeNull(); // only A
    expect(screen.queryByText('점프 미션')).toBeNull(); // only B
  });

  it('deletes a mission after a confirm dialog that names it', () => {
    render(<MissionTab />);
    fireEvent.click(screen.getByRole('button', { name: '앞으로 미션 삭제' }));
    expect(screen.getByText('"앞으로 미션" 미션을 삭제할까요?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(useStore.getState().missions).toHaveLength(3);
    expect(screen.queryByText('앞으로 미션')).toBeNull();
  });

  it('shows the no-match empty copy when filters exclude everything', () => {
    render(<MissionTab />);
    fireEvent.change(screen.getByLabelText('미션 이름으로 찾기'), { target: { value: 'zzzz' } });
    expect(screen.getByText('조건에 맞는 미션이 없어요')).toBeInTheDocument();
  });

  it('drops a deleted category from the active filter so the list is not stranded (D-02)', () => {
    render(<MissionTab />);
    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    // Only m4 has C.
    expect(screen.getByText('옆으로 미션')).toBeInTheDocument();
    expect(screen.queryByText('앞으로 미션')).toBeNull();

    // Delete category C from the shared store — cascade + reconcile.
    act(() => {
      useStore.getState().deleteCategory('C');
    });

    // The C filter chip is gone and the list is no longer stranded.
    expect(screen.queryByRole('button', { name: 'C' })).toBeNull();
    expect(screen.queryByText('조건에 맞는 미션이 없어요')).toBeNull();
    expect(screen.getByText('앞으로 미션')).toBeInTheDocument();
  });
});

describe('MissionTab tab count pill (via App)', () => {
  beforeEach(resetStore);

  it('keeps the full mission count in the tab pill even when filtered to empty', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('미션 이름으로 찾기'), { target: { value: 'zzzz' } });
    expect(screen.getByText('조건에 맞는 미션이 없어요')).toBeInTheDocument();
    const missionTab = screen.getByRole('tab', { name: /미션/ });
    expect(within(missionTab).getByText('4')).toBeInTheDocument();
  });
});
