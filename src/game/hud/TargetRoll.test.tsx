import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import TargetRoll, { TARGET_ROLL_MS } from './TargetRoll';
import * as rng from '../../engine/rng';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

function Host() {
  const [value, setValue] = useState<number | null>(null);
  return <TargetRoll value={value} onDecide={setValue} />;
}

describe('two-dice target roll', () => {
  it('never totals below 5 and stays within 12', () => {
    const seeded = rng.mulberry32(42);
    for (let i = 0; i < 2000; i++) {
      const [a, b] = rng.rollTargetDice(seeded);
      expect(a + b).toBeGreaterThanOrEqual(5);
      expect(a + b).toBeLessThanOrEqual(12);
    }
  });
});

describe('one target-count roll per game', () => {
  it('rolls two dice, shows their sum, and cannot roll again', () => {
    const draw = vi.spyOn(rng, 'rollTargetDice').mockReturnValue([3, 4]);
    render(<Host />);
    const button = screen.getByRole('button', { name: '오늘의 횟수 주사위 굴리기' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(draw).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button')).toBeDisabled();
    act(() => { vi.advanceTimersByTime(TARGET_ROLL_MS); });
    expect(screen.getByRole('status')).toHaveTextContent('오늘은 7번 넘기!');
    expect(screen.getByRole('button', { name: '이 게임의 횟수 확정' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button'));
    expect(draw).toHaveBeenCalledTimes(1);
  });
  it('restores a decided count without another random draw', () => {
    const draw = vi.spyOn(rng, 'rollTargetDice');
    render(<TargetRoll value={2} onDecide={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('오늘은 2번 넘기!');
    expect(screen.getByRole('button')).toBeDisabled();
    expect(draw).not.toHaveBeenCalled();
  });
  it('cleans up its timers when leaving setup during the animation', () => {
    const decide = vi.fn();
    const view = render(<TargetRoll value={null} onDecide={decide} />);
    fireEvent.click(screen.getByRole('button'));
    view.unmount();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(decide).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
