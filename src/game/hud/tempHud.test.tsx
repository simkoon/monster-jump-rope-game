// src/game/hud/tempHud.test.tsx — Phase 5 display part still in use: AnimalPicker (D-24).
// The Scoreboard tests moved to hud6.test.tsx in 06-04. Props-only component: no store, no WebGL.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import AnimalPicker from './AnimalPicker';
import { ANIMALS } from '../../engine/animals';

describe('AnimalPicker (D-24)', () => {
  it('renders a labelled group of 8 emoji buttons in ANIMALS order with Korean aria-labels', () => {
    render(<AnimalPicker groupLabel="플레이어 1 동물" value="bear" taken={[]} onChange={() => {}} />);
    const group = screen.getByRole('group', { name: '플레이어 1 동물' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons).toHaveLength(8);
    expect(buttons.map((b) => b.textContent)).toEqual(['🐻', '🐰', '🐱', '🐶', '🐼', '🦊', '🐷', '🐥']);
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      '곰',
      '토끼',
      '고양이',
      '강아지',
      '판다',
      '여우',
      '돼지',
      '병아리',
    ]);
    expect(ANIMALS).toHaveLength(8);
    for (const b of buttons) expect(b.getAttribute('type')).toBe('button');
  });

  it('marks the selected animal aria-pressed=true and the rest false', () => {
    render(<AnimalPicker groupLabel="g" value="cat" taken={[]} onChange={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(screen.getByRole('button', { name: '고양이' })).toHaveAttribute('aria-pressed', 'true');
    expect(buttons.filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(buttons.filter((b) => b.getAttribute('aria-pressed') === 'false')).toHaveLength(7);
  });

  it('disables animals taken by another participant with the explanatory aria-label', () => {
    const onChange = vi.fn();
    render(<AnimalPicker groupLabel="g" value="bear" taken={['rabbit', 'fox']} onChange={onChange} />);
    const rabbit = screen.getByRole('button', { name: '토끼 — 다른 친구가 골랐어요' });
    const fox = screen.getByRole('button', { name: '여우 — 다른 친구가 골랐어요' });
    expect(rabbit).toBeDisabled();
    expect(fox).toBeDisabled();
    fireEvent.click(rabbit);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clicking an enabled animal calls onChange with its id', () => {
    const onChange = vi.fn();
    render(<AnimalPicker groupLabel="g" value="bear" taken={['rabbit']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '병아리' }));
    expect(onChange).toHaveBeenCalledWith('chick');
  });
});
