// src/game/hud/hud6.test.tsx — Phase 6 DOM HUD parts (06-04: D-21~D-25, D-27, HUD-01~04, ROUND-02, STAB-02).
// Props-only parts render directly; the Banner reads the beat queue store, so both stores are reset
// before every test and the Banner tests run on fake timers (beat length = banner time).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import StatusChips from './StatusChips';
import Banner from './Banner';
import ContextLostOverlay from './ContextLostOverlay';
import { usePresentation } from '../usePresentation';
import { useGameStore } from '../../harness/useGameStore';
import { EMPTY_DISPLAYED } from '../director/displayed';
import type { BeatSpec } from '../director/timeline';
import type { MoveResult } from '../../engine/state';
import type { Event } from '../../schema';

const ev = (eff: Event['eff'], steps: number, name: string, label: Event['label'] = ''): Event => ({
  id: `e-${name}`,
  name,
  eff,
  steps,
  weight: 1,
  label,
});

function move(over: Partial<MoveResult> = {}): MoveResult {
  return {
    roll: 4,
    dicePath: [1, 2, 3, 4],
    landed: 4,
    event: null,
    eventPath: [],
    extraSuppressed: false,
    to: 4,
    finalKind: 'quest',
    startBonus: 0,
    ...over,
  };
}

beforeEach(() => {
  usePresentation.getState().reset(EMPTY_DISPLAYED, null);
  useGameStore.setState({ game: null });
});

afterEach(() => {
  usePresentation.getState().reset(EMPTY_DISPLAYED, null);
  vi.useRealTimers();
});

describe('StatusChips (D-23, UI-SPEC S6a)', () => {
  it('renders the chips in order inside a polite live region; event names never appear', () => {
    const m = move({ startBonus: 1, event: ev('forward', 3, '점프대') });
    const { container } = render(<StatusChips move={m} pending={[]} />);
    const root = container.querySelector('.status-chips')!;
    expect(root).toHaveAttribute('aria-live', 'polite');
    const chips = [...root.querySelectorAll('.status-chip')];
    expect(chips.map((c) => c.textContent)).toEqual(['🎲 4', '🏁 ⭐+1', '➡️ 앞으로 3칸']);
    expect(chips[0]).toHaveClass('status-chip--plain', 'status-chip--dice');
    expect(chips[1]).toHaveClass('status-chip--sun');
    expect(chips[2]).toHaveClass('status-chip--grass');
    expect(root.textContent).not.toContain('점프대');
  });

  it('holds back chips whose beat is still pending; empty live region without a move', () => {
    const m = move({ startBonus: 1, event: ev('backward', 2, '미끄럼') });
    const { container, rerender } = render(<StatusChips move={m} pending={['preview', 'hop', 'startBonus', 'event']} />);
    expect([...container.querySelectorAll('.status-chip')].map((c) => c.textContent)).toEqual(['🎲 4']);
    rerender(<StatusChips move={null} pending={[]} />);
    expect(container.querySelector('.status-chips')).not.toBeNull();
    expect(container.querySelectorAll('.status-chip')).toHaveLength(0);
  });
});

describe('Banner (D-23, D-24, D-25, UI-SPEC S6b)', () => {
  function play(specs: BeatSpec[]) {
    act(() => {
      usePresentation.getState().play(specs);
    });
  }
  function tick(ms: number) {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  }

  it('shows the startBonus beat for exactly its length, then completes it once', () => {
    vi.useFakeTimers();
    const { container } = render(<Banner />);
    expect(container.innerHTML).toBe('');
    play([{ kind: 'startBonus', pid: 'p1', stars: 1, ms: 800 }]);
    const banner = screen.getByRole('status');
    expect(banner).toHaveClass('beat-banner', 'beat-banner--sun');
    expect(banner).toHaveTextContent('🏁 출발 보너스');
    expect(banner).toHaveTextContent('⭐+1');
    tick(799);
    expect(usePresentation.getState().current?.kind).toBe('startBonus');
    expect(screen.getByRole('status')).toBeInTheDocument();
    tick(1);
    expect(usePresentation.getState().busy).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
    expect(usePresentation.getState().displayed).toEqual(EMPTY_DISPLAYED); // drained → resync (no game)
  });

  it('event beat shows the event name and the 함정 chip; names render as text', () => {
    vi.useFakeTimers();
    const { container } = render(<Banner />);
    play([
      { kind: 'event', pid: 'p1', eff: 'backward', steps: 2, suppressed: false, name: '<b>x</b>', label: '함정', ms: 1000 },
    ]);
    const banner = screen.getByRole('status');
    expect(banner).toHaveClass('beat-banner--coral');
    expect(screen.getByText('🕳️ 함정')).toHaveClass('game-event-chip', 'trap');
    expect(screen.getByText('<b>x</b>')).toHaveClass('beat-banner-top');
    expect(screen.getByText('⬅️ 뒤로 2칸!')).toHaveClass('beat-banner-big');
    expect(container.querySelector('b')).toBeNull();
  });

  it('finalRound beat shows both lines; then the next banner beat follows', () => {
    vi.useFakeTimers();
    render(<Banner />);
    play([
      { kind: 'finalRound', ms: 1500 },
      { kind: 'stars', pid: 'p1', stars: 3, ms: 600 },
    ]);
    expect(screen.getByRole('status')).toHaveClass('beat-banner--final');
    expect(screen.getByText('🔔 마지막 라운드!')).toBeInTheDocument();
    expect(screen.getByText('이번 라운드가 마지막이에요')).toHaveClass('beat-banner-sub');
    tick(1500);
    expect(screen.getByText('🎉 성공!')).toBeInTheDocument();
    expect(screen.getByText('⭐+3')).toBeInTheDocument();
    tick(600);
    expect(usePresentation.getState().busy).toBe(false);
  });

  it('a non-banner beat renders nothing and is left to its consumer (store watchdog only)', () => {
    vi.useFakeTimers();
    const { container } = render(<Banner />);
    play([{ kind: 'dice', pid: 'p1', face: 3, ms: 1000 }]);
    expect(container.innerHTML).toBe('');
    tick(1499);
    expect(usePresentation.getState().current?.kind).toBe('dice');
    tick(1);
    expect(usePresentation.getState().current).toBeNull();
  });
});

describe('ContextLostOverlay (D-27, STAB-02, UI-SPEC S7)', () => {
  it('loading: status line, no button', () => {
    const { container } = render(<ContextLostOverlay mode="loading" onRedraw={() => {}} />);
    expect(container.querySelector('.ctx-overlay.ctx-overlay--loading')).not.toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('판을 준비하고 있어요…');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('lost: alertdialog with title/body and a focused redraw button', () => {
    const onRedraw = vi.fn();
    render(<ContextLostOverlay mode="lost" onRedraw={onRedraw} />);
    const dialog = screen.getByRole('alertdialog', { name: '화면이 잠깐 꺼졌어요' });
    expect(dialog).toHaveAccessibleDescription('별과 위치는 그대로예요. 아래 버튼을 눌러 다시 그려 주세요.');
    const btn = screen.getByRole('button', { name: '🔄 화면 다시 그리기' });
    expect(btn).toHaveFocus();
    fireEvent.click(btn);
    expect(onRedraw).toHaveBeenCalledTimes(1);
  });

  it('failed: load-failure copy', () => {
    render(<ContextLostOverlay mode="failed" onRedraw={() => {}} />);
    const dialog = screen.getByRole('alertdialog', { name: '판을 그리지 못했어요' });
    expect(dialog).toHaveAccessibleDescription('게임은 그대로예요. 버튼을 눌러 다시 시도해 주세요.');
    expect(screen.getByRole('button', { name: '🔄 화면 다시 그리기' })).toHaveFocus();
  });
});
