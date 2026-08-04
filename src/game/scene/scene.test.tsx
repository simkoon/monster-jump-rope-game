// src/game/scene/scene.test.tsx — DOM 2D board structure assertions (Phase 3.1).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import BoardScene, { SceneContents } from './BoardScene';
import type { MoveSpec } from '../animation';
import { buildParticipants } from '../../engine/setup';

const noop = () => {};

afterEach(() => vi.useRealTimers());

function renderScene(boardLength: number, count: number, highlight: MoveSpec | null = null) {
  const participants = buildParticipants(
    'solo',
    count,
    Array.from({ length: count }, (_, i) => `P${i + 1}`),
    Array.from({ length: count }, (_, i): 'boy' | 'girl' => (i % 2 === 0 ? 'boy' : 'girl')),
  );
  return render(
    <SceneContents
      boardLength={boardLength}
      participants={participants}
      activeIndex={0}
      move={null}
      runToken={false}
      tokenPoses={{}}
      rollId={0}
      face={null}
      highlight={highlight}
      onDiceSettled={noop}
      onTokenArrive={noop}
    />,
  );
}

describe('BoardScene 2D DOM structure', () => {
  it('renders boardLength + 1 countable squares including the finish landmark', () => {
    renderScene(6, 2);
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByLabelText('6번 칸, 결승')).toBeInTheDocument();
    expect(screen.getByLabelText('진행 방향과 결승점이 보이는 2D 보드')).toBeInTheDocument();
  });

  it('renders one Kenney character sprite token per participant', () => {
    const { container } = renderScene(6, 4);
    expect(screen.getAllByLabelText(/말$/)).toHaveLength(4);
    expect(screen.getByTitle('P1')).toBeInTheDocument();
    expect(screen.getByTitle('P4')).toBeInTheDocument();
    const srcs = Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src') ?? '');
    expect(srcs.some((src) => src.includes('/assets/cc0/kenney/toon-characters/boy-rope.png'))).toBe(true);
    expect(srcs.some((src) => src.includes('/assets/cc0/kenney/toon-characters/girl-rope.png'))).toBe(true);
  });

  it('switches Kenney token sprites for cheer, hurt, and walk poses', () => {
    const participants = buildParticipants('solo', 2, ['P1', 'P2'], ['boy', 'girl']);
    const { container, rerender } = render(
      <SceneContents
        boardLength={6}
        participants={participants}
        activeIndex={0}
        move={null}
        runToken={false}
        tokenPoses={{ p1: 'cheer', p2: 'hurt' }}
        rollId={0}
        face={null}
        highlight={null}
        onDiceSettled={noop}
        onTokenArrive={noop}
      />,
    );
    let srcs = Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src') ?? '');
    expect(srcs.some((src) => src.includes('/assets/cc0/kenney/toon-characters/boy-cheer0.png'))).toBe(true);
    expect(srcs.some((src) => src.includes('/assets/cc0/kenney/toon-characters/girl-hurt.png'))).toBe(true);
    rerender(
      <SceneContents
        boardLength={6}
        participants={participants}
        activeIndex={0}
        move={{ id: 1, from: 0, afterRoll: 2, to: 2 }}
        runToken={true}
        tokenPoses={{}}
        walkFrame={2}
        rollId={1}
        face={2}
        highlight={null}
        onDiceSettled={noop}
        onTokenArrive={noop}
      />,
    );
    srcs = Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src') ?? '');
    expect(srcs.some((src) => src.includes('/assets/cc0/kenney/toon-characters/boy-walk2.png'))).toBe(true);
  });

  it('shows dice face text without WebGL', () => {
    renderScene(6, 2);
    expect(screen.getByText('주사위')).toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});

describe('BoardScene animation timers', () => {
  it('keeps dice-settled timer alive across parent callback re-renders', () => {
    vi.useFakeTimers();
    const participants = buildParticipants('solo', 2, ['P1', 'P2'], ['boy', 'girl']);
    const firstSettled = vi.fn();
    const secondSettled = vi.fn();
    const { rerender } = render(
      <BoardScene
        boardLength={6}
        participants={participants}
        activeIndex={0}
        move={{ id: 1, from: 0, afterRoll: 2, to: 2 }}
        runToken={false}
        tokenPoses={{}}
        rollId={1}
        face={2}
        highlight={null}
        onDiceSettled={firstSettled}
        onTokenArrive={noop}
      />,
    );
    rerender(
      <BoardScene
        boardLength={6}
        participants={participants}
        activeIndex={0}
        move={{ id: 1, from: 0, afterRoll: 2, to: 2 }}
        runToken={false}
        tokenPoses={{}}
        rollId={1}
        face={2}
        highlight={null}
        onDiceSettled={secondSettled}
        onTokenArrive={noop}
      />,
    );
    act(() => vi.advanceTimersByTime(800));
    expect(firstSettled).not.toHaveBeenCalled();
    expect(secondSettled).toHaveBeenCalledTimes(1);
  });
});

describe('move destination highlight (LOOP-05/06/07)', () => {
  it('marks the dice destination and in-between step squares', () => {
    const { container } = render(
      <SceneContents
        boardLength={20}
        participants={buildParticipants('solo', 2, ['P1', 'P2'], ['boy', 'girl'])}
        activeIndex={0}
        move={null}
        runToken={false}
        rollId={0}
        face={null}
        highlight={{ id: 1, from: 0, afterRoll: 4, to: 4 }}
        onDiceSettled={noop}
        onTokenArrive={noop}
      />,
    );
    expect(container.querySelectorAll('.is-step')).toHaveLength(3);
    expect(container.querySelectorAll('.is-dest')).toHaveLength(1);
    expect(container.querySelectorAll('.is-final')).toHaveLength(0);
  });

  it('adds an event final marker when to !== afterRoll', () => {
    const { container } = render(
      <SceneContents
        boardLength={20}
        participants={buildParticipants('solo', 2, ['P1', 'P2'], ['boy', 'girl'])}
        activeIndex={0}
        move={null}
        runToken={false}
        rollId={0}
        face={null}
        highlight={{ id: 2, from: 3, afterRoll: 6, to: 9 }}
        onDiceSettled={noop}
        onTokenArrive={noop}
      />,
    );
    expect(container.querySelectorAll('.is-dest')).toHaveLength(1);
    expect(container.querySelectorAll('.is-final')).toHaveLength(1);
  });

  it('mounts without throwing on an overshoot win', () => {
    expect(() => renderScene(20, 2, { id: 3, from: 18, afterRoll: 22, to: 22 })).not.toThrow();
  });
});
