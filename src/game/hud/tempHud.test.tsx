// src/game/hud/tempHud.test.tsx — Phase 5 temporary display parts (D-24 AnimalPicker, D-26
// RingStrip; the Scoreboard tests moved to hud6.test.tsx in 06-04). Props-only components: no store, no WebGL.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import AnimalPicker from './AnimalPicker';
import RingStrip, { type RingToken } from './RingStrip';
import { ANIMALS } from '../../engine/animals';
import type { Tile } from '../../engine/board';
import type { Event } from '../../schema';

const ev = (eff: Event['eff'], steps: number, name: string): Event => ({
  id: `e-${name}`,
  name,
  eff,
  steps,
  weight: 1,
  label: '',
});

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

describe('RingStrip (D-26, BOARD-04)', () => {
  const tiles: Tile[] = [
    { kind: 'start' },
    { kind: 'quest', diff: 'easy' },
    { kind: 'event', event: ev('forward', 3, '로켓 점프') },
    { kind: 'quest', diff: 'normal' },
    { kind: 'event', event: ev('backward', 2, '미끄럼') },
    { kind: 'quest', diff: 'hard' },
    { kind: 'event', event: ev('extra', 0, '<b>x</b>') },
    { kind: 'quest', diff: 'easy' },
  ];
  const tokens: RingToken[] = [
    { id: 'p1', animal: 'bear', position: 3 },
    { id: 'p2', animal: 'rabbit', position: 3 },
    { id: 'p3', animal: 'cat', position: 0 },
  ];

  it('renders tiles in ring order with kind modifiers, glyphs and aria-labels', () => {
    render(<RingStrip tiles={tiles} tokens={tokens} currentId="p2" />);
    const list = screen.getByRole('list', { name: '보드 칸' });
    expect(list.tagName).toBe('OL');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(tiles.length);
    const mods = ['start', 'easy', 'event', 'normal', 'event', 'hard', 'event', 'easy'];
    items.forEach((li, i) => {
      expect(li).toHaveClass('ring-tile');
      expect(li).toHaveClass(`ring-tile--${mods[i]}`);
    });
    expect(items.map((li) => li.querySelector('.glyph')?.textContent)).toEqual([
      '🏁',
      '⭐1',
      '➡️3',
      '⭐2',
      '⬅️2',
      '⭐3',
      '🔁',
      '⭐1',
    ]);
    expect(items[0]).toHaveAttribute('aria-label', '0번 칸, 출발, 고양이 있음');
    expect(items[2]).toHaveAttribute('aria-label', '2번 칸, 이벤트 앞으로 3칸(로켓 점프)');
    expect(items[3]).toHaveAttribute('aria-label', '3번 칸, 보통 퀘스트 별 2개, 곰 토끼 있음');
  });

  it('shows the emojis of tokens on each tile, in token order', () => {
    render(<RingStrip tiles={tiles} tokens={tokens} currentId="p1" />);
    const items = screen.getAllByRole('listitem');
    expect(items[3].querySelector('.tokens')?.textContent).toBe('🐻🐰');
    expect(items[0].querySelector('.tokens')?.textContent).toBe('🐱');
    expect(items[1].querySelector('.tokens')?.textContent).toBe('');
  });

  it('marks the tile holding the current token with is-current', () => {
    render(<RingStrip tiles={tiles} tokens={tokens} currentId="p3" />);
    const items = screen.getAllByRole('listitem');
    const current = items.filter((li) => li.classList.contains('is-current'));
    expect(current).toEqual([items[0]]);
  });

  it('never prints a tile index number as on-screen text', () => {
    const many: Tile[] = Array.from({ length: 20 }, (_, i) =>
      i === 0 ? { kind: 'start' } : { kind: 'quest', diff: 'easy' },
    );
    render(<RingStrip tiles={many} tokens={[]} currentId="none" />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(20);
    items.forEach((li, i) => {
      if (i >= 2) expect(li.textContent).not.toContain(String(i));
    });
    // ⭐1 glyph is the only digit on quest tiles; start tile has no digits at all
    expect(items[0].textContent).toBe('🏁');
  });

  it('renders event names in aria-labels as plain attribute text', () => {
    const { container } = render(<RingStrip tiles={tiles} tokens={[]} currentId="none" />);
    expect(screen.getAllByRole('listitem')[6]).toHaveAttribute('aria-label', '6번 칸, 이벤트 한 번 더(<b>x</b>)');
    expect(container.querySelector('b')).toBeNull();
  });
});
