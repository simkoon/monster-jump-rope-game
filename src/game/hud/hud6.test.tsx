// src/game/hud/hud6.test.tsx — Phase 6 DOM HUD parts (06-04: D-21~D-25, D-27, HUD-01~04, ROUND-02, STAB-02).
// Props-only parts render directly; the Banner reads the beat queue store, so both stores are reset
// before every test and the Banner tests run on fake timers (beat length = banner time).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import StatusChips from './StatusChips';
import Banner from './Banner';
import ContextLostOverlay from './ContextLostOverlay';
import Scoreboard, { type ScoreEntry } from './Scoreboard';
import TurnHud from './TurnHud';
import ControlsBar from './ControlsBar';
import { ANIMAL_COLOR } from '../palette';
import { ANIMALS } from '../../engine/animals';
import type { NextUpView } from '../labels';
import { usePresentation } from '../usePresentation';
import { useGameStore } from '../../harness/useGameStore';
import { EMPTY_DISPLAYED } from '../director/displayed';
import type { BeatSpec } from '../director/timeline';
import type { JudgementResult, MoveResult } from '../../engine/state';
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
  act(() => {
    usePresentation.getState().reset(EMPTY_DISPLAYED, null);
  });
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

  it('miss beat (07-01, D-13): no DOM, completed by the Banner at exactly 700 ms', () => {
    vi.useFakeTimers();
    const { container } = render(<Banner />);
    play([{ kind: 'miss', pid: 'p1', ms: 700 }]);
    expect(container.innerHTML).toBe('');
    tick(699);
    expect(usePresentation.getState().current?.kind).toBe('miss');
    tick(1); // the Banner timer, not the 1200 ms watchdog
    expect(usePresentation.getState().busy).toBe(false);
    expect(container.innerHTML).toBe('');
  });

  it('win beat (07-01, D-14, UI-SPEC C7d): gold win banner with the emoji row, done at 1500 ms', () => {
    vi.useFakeTimers();
    render(<Banner />);
    play([{ kind: 'win', winners: ['p1', 'p2'], animals: ['bear', 'rabbit'], ms: 1500 }]);
    const banner = screen.getByRole('status');
    expect(banner).toHaveClass('beat-banner', 'beat-banner--final', 'beat-banner--win');
    expect(banner).toHaveTextContent('🏆 공동 우승!');
    const row = within(banner).getByRole('img', { name: '곰, 토끼' });
    expect(row).toHaveClass('beat-banner-big', 'beat-banner-emoji');
    expect(row).toHaveTextContent('🐻 🐰');
    tick(1499);
    expect(usePresentation.getState().current?.kind).toBe('win');
    tick(1);
    expect(usePresentation.getState().busy).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('win banner emoji row (07-07, IN-01): one flex item per animal; 5+ winners switch to is-many', () => {
    vi.useFakeTimers();
    render(<Banner />);
    play([{ kind: 'win', winners: ['p1', 'p2'], animals: ['bear', 'rabbit'], ms: 1500 }]);
    const row = within(screen.getByRole('status')).getByRole('img', { name: '곰, 토끼' });
    const items = row.querySelectorAll('.beat-banner-emoji-item');
    expect([...items].map((i) => i.textContent)).toEqual(['🐻', '🐰']);
    expect(row).not.toHaveClass('is-many');
    expect(row).toHaveTextContent('🐻 🐰');
    tick(1500);
    play([{ kind: 'win', winners: ANIMALS.map((_, i) => `p${i}`), animals: [...ANIMALS], ms: 1500 }]);
    const many = within(screen.getByRole('status')).getByRole('img');
    expect(many.querySelectorAll('.beat-banner-emoji-item')).toHaveLength(8);
    expect(many).toHaveClass('beat-banner-emoji', 'is-many');
  });

  it('a one-winner win banner says 🏆 우승!', () => {
    vi.useFakeTimers();
    render(<Banner />);
    play([{ kind: 'win', winners: ['p1'], animals: ['fox'], ms: 1500 }]);
    expect(screen.getByRole('status')).toHaveTextContent('🏆 우승!');
    expect(screen.getByRole('img', { name: '여우' })).toHaveTextContent('🦊');
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

describe('Scoreboard v2 (HUD-01, D-22, UI-SPEC S4)', () => {
  const entries: ScoreEntry[] = [
    { id: 'p1', name: '민수', animal: 'bear', stars: 2 },
    { id: 'p2', name: '지아', animal: 'rabbit', stars: 5 },
    { id: 'p3', name: '하준', animal: 'cat', stars: 5 },
  ];
  const cells = () => within(screen.getByRole('list', { name: '별 순위' })).getAllByRole('listitem');

  it('sorts by stars with shared ranks; crown badges for rank 1 with stars', () => {
    const { container } = render(<Scoreboard entries={entries} currentId="p1" />);
    const list = screen.getByRole('list', { name: '별 순위' });
    expect(list.tagName).toBe('OL');
    expect(list).toHaveClass('sb');
    expect(list.style.getPropertyValue('--sb-cols')).toBe('3');
    const items = cells();
    expect(items.every((li) => li.classList.contains('sb-cell'))).toBe(true);
    expect(items.map((li) => li.querySelector('.sb-name')?.textContent)).toEqual(['지아', '하준', '민수']);
    expect(items.map((li) => li.querySelector('.sb-rank')?.textContent)).toEqual(['👑', '👑', '3']);
    expect(items.map((li) => li.querySelector('.sb-stars')?.textContent)).toEqual(['⭐5', '⭐5', '⭐2']);
    expect(items.map((li) => li.classList.contains('is-leader'))).toEqual([true, true, false]);
    expect(container.querySelector('.sb-avatar')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.sb-avatar')!.textContent).toContain('🐰');
  });

  it('uses the pawn color (ANIMAL_COLOR) as --pc and an aria-label per cell', () => {
    render(<Scoreboard entries={entries} currentId="p1" />);
    const items = cells();
    expect(items[0].style.getPropertyValue('--pc')).toBe(ANIMAL_COLOR.rabbit);
    expect(items[2].style.getPropertyValue('--pc')).toBe(ANIMAL_COLOR.bear);
    expect(items[0]).toHaveAttribute('aria-label', '1등 왕관, 1등 토끼 지아 별 5개');
    expect(items[2]).toHaveAttribute('aria-label', '3등 곰 민수 별 2개');
  });

  it('marks the current participant with is-current', () => {
    render(<Scoreboard entries={entries} currentId="p3" />);
    const current = cells().filter((li) => li.classList.contains('is-current'));
    expect(current).toHaveLength(1);
    expect(current[0].querySelector('.sb-name')?.textContent).toBe('하준');
  });

  it('all-zero stars: numeric badges 1,1,1, no crown, no leader', () => {
    const zero = entries.map((e) => ({ ...e, stars: 0 }));
    render(<Scoreboard entries={zero} currentId="p1" />);
    const items = cells();
    expect(items.map((li) => li.querySelector('.sb-rank')?.textContent)).toEqual(['1', '1', '1']);
    expect(items.some((li) => li.classList.contains('is-leader'))).toBe(false);
  });

  it('game over (07-07, D-14a): currentId null marks no cell is-current', () => {
    render(<Scoreboard entries={entries} currentId={null} />);
    expect(cells().some((li) => li.classList.contains('is-current'))).toBe(false);
  });

  it('crownIds crowns exactly the engine winners, all-zero co-winners included (D-14a)', () => {
    const zero = entries.map((e) => ({ ...e, stars: 0 }));
    const { rerender } = render(<Scoreboard entries={zero} currentId={null} crownIds={['p1', 'p2']} />);
    const byName = (n: string) => cells().find((li) => li.querySelector('.sb-name')?.textContent === n)!;
    for (const n of ['민수', '지아']) {
      expect(byName(n)).toHaveClass('is-leader');
      expect(byName(n).querySelector('.sb-rank')?.textContent).toBe('👑');
      expect(byName(n).getAttribute('aria-label')).toMatch(/^1등 왕관, /);
    }
    expect(byName('하준')).not.toHaveClass('is-leader');
    expect(byName('하준').querySelector('.sb-rank')?.textContent).toBe('1');
    rerender(<Scoreboard entries={entries} currentId={null} crownIds={['p2']} />);
    expect(byName('지아')).toHaveClass('is-leader');
    expect(byName('지아').querySelector('.sb-rank')?.textContent).toBe('👑');
    expect(byName('하준')).not.toHaveClass('is-leader');
    expect(byName('하준').querySelector('.sb-rank')?.textContent).toBe('1');
    expect(byName('하준')).toHaveAttribute('aria-label', '1등 고양이 하준 별 5개');
  });

  it('caps the grid at 4 columns', () => {
    const many: ScoreEntry[] = (['bear', 'rabbit', 'cat', 'dog', 'panda', 'fox'] as const).map((a, i) => ({
      id: `p${i}`,
      name: `P${i}`,
      animal: a,
      stars: i,
    }));
    render(<Scoreboard entries={many} currentId="p0" />);
    expect(screen.getByRole('list', { name: '별 순위' }).style.getPropertyValue('--sb-cols')).toBe('4');
  });

  it('renders names as text (no HTML injection)', () => {
    const { container } = render(
      <Scoreboard entries={[{ id: 'x', name: '<b>x</b>', animal: 'pig', stars: 0 }]} currentId="x" />,
    );
    expect(screen.getByText('<b>x</b>')).toBeInTheDocument();
    expect(container.querySelector('b')).toBeNull();
  });
});

describe('TurnHud v2 (HUD-02, ROUND-02, D-22, D-24, UI-SPEC S3)', () => {
  const sky: NextUpView = { animal: 'bear', name: '하늘', member: null, sameAgain: false };
  const base = {
    animal: 'cat' as const,
    name: '가',
    isTeam: false,
    activeMember: '가',
    isExtra: false,
    round: 2,
    totalRounds: 5,
    next: sky,
    onEndNow: () => {},
  };

  it('turn pill: color dot before the name; text stays emoji + name + 차례', () => {
    const { container } = render(<TurnHud {...base} />);
    const pill = container.querySelector('.game-turn-pill')!;
    expect(pill).toHaveAttribute('aria-live', 'polite');
    const dot = pill.querySelector('.turn-dot') as HTMLElement;
    expect(dot).toHaveAttribute('aria-hidden', 'true');
    expect(dot.style.getPropertyValue('--pc')).toBe(ANIMAL_COLOR.cat);
    expect(container.querySelector('.game-turn-name')!.textContent).toBe('🐱 가 차례');
  });

  it('round block: r/R with R dots (filled 1..r, r-th is-now), role group + aria', () => {
    const { container } = render(<TurnHud {...base} />);
    const round = screen.getByRole('group', { name: '라운드 5개 중 2번째' });
    expect(round).toHaveClass('game-round');
    expect(round).not.toHaveClass('is-final');
    expect(round.textContent).toBe('라운드2/5');
    const dots = [...container.querySelectorAll('.round-dot')];
    expect(dots).toHaveLength(5);
    expect(dots.map((d) => d.classList.contains('is-filled'))).toEqual([true, true, false, false, false]);
    expect(dots.map((d) => d.classList.contains('is-now'))).toEqual([false, true, false, false, false]);
    expect(container.querySelector('.round-dots')).toHaveAttribute('aria-hidden', 'true');
  });

  it('more than 10 rounds: numbers only; last round: 마지막 라운드 + is-final', () => {
    const { container, rerender } = render(<TurnHud {...base} round={3} totalRounds={12} />);
    expect(container.querySelectorAll('.round-dot')).toHaveLength(0);
    expect(container.querySelector('.game-round')!.textContent).toBe('라운드3/12');
    rerender(<TurnHud {...base} round={5} totalRounds={5} />);
    const round = container.querySelector('.game-round')!;
    expect(round).toHaveClass('is-final');
    expect(round.textContent).toBe('마지막 라운드5/5');
  });

  it('next block: 다음 + dot + next name; team member; sameAgain; last turn', () => {
    const { container, rerender } = render(<TurnHud {...base} />);
    const nextBlock = () => container.querySelector('.turn-next')!;
    expect(nextBlock().querySelector('.label')!.textContent).toBe('다음');
    expect(nextBlock().querySelector('.value')!.textContent).toBe('🐻 하늘');
    expect((nextBlock().querySelector('.turn-dot') as HTMLElement).style.getPropertyValue('--pc')).toBe(
      ANIMAL_COLOR.bear,
    );
    rerender(<TurnHud {...base} next={{ animal: 'fox', name: 'A팀', member: '민수', sameAgain: false }} />);
    expect(nextBlock().querySelector('.value')!.textContent).toBe('🦊 A팀 · 민수');
    rerender(<TurnHud {...base} next={{ ...sky, sameAgain: true }} />);
    expect(nextBlock().querySelector('.value')!.textContent).toBe('🔁 한 번 더: 🐻 하늘');
    rerender(<TurnHud {...base} next={null} />);
    expect(nextBlock().querySelector('.value')!.textContent).toBe('🏁 이번이 마지막 차례!');
    expect(nextBlock().querySelector('.turn-dot')).toBeNull();
  });

  it('team member line and the extra badge', () => {
    const { container } = render(<TurnHud {...base} isTeam activeMember="민수" isExtra />);
    expect(container.querySelector('.game-turn-member')!.textContent).toBe('이번엔 민수 님이 도전!');
    expect(screen.getByText('🔁 한 번 더')).toHaveClass('game-event-chip', 'extra');
  });

  it('names render as text', () => {
    const { container } = render(
      <TurnHud {...base} name="<b>x</b>" next={{ animal: 'pig', name: '<i>y</i>', member: null, sameAgain: false }} />,
    );
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('i')).toBeNull();
    expect(container.querySelector('.turn-next .value')!.textContent).toBe('🐷 <i>y</i>');
  });

  it('game over (07-07, D-14a): 🏁 게임 끝 pill, no next block; round and 지금 끝내기 stay', () => {
    const onEndNow = vi.fn();
    const { container } = render(<TurnHud {...base} isTeam activeMember="민수" isExtra over onEndNow={onEndNow} />);
    const pill = container.querySelector('.game-turn-pill')!;
    expect(pill).toHaveAttribute('aria-live', 'polite');
    expect(pill.textContent).toBe('🏁 게임 끝');
    expect(pill.querySelector('.turn-dot')).toBeNull();
    expect(pill.querySelector('.suffix')).toBeNull();
    expect(pill.querySelector('.game-turn-member')).toBeNull();
    expect(screen.queryByText('🔁 한 번 더')).toBeNull();
    expect(container.querySelector('.turn-next')).toBeNull();
    expect(screen.getByRole('group', { name: '라운드 5개 중 2번째' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '지금 끝내기' }));
    fireEvent.click(screen.getByRole('button', { name: '게임 끝내기' }));
    expect(onEndNow).toHaveBeenCalledTimes(1);
  });

  it('지금 끝내기 calls onEndNow only on confirm', () => {
    const onEndNow = vi.fn();
    render(<TurnHud {...base} onEndNow={onEndNow} />);
    fireEvent.click(screen.getByRole('button', { name: '지금 끝내기' }));
    expect(onEndNow).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '게임 끝내기' }));
    expect(onEndNow).toHaveBeenCalledTimes(1);
  });
});

describe('ControlsBar v2 (HUD-03, HUD-04, D-21, D-25, UI-SPEC S5)', () => {
  const noop = () => {};
  const props = {
    canUndo: false,
    nextKind: 'next' as const,
    judgement: null as JudgementResult | null,
    onRoll: noop,
    onNext: noop,
    onUndo: noop,
  };

  it('renders nothing while hidden (never disabled) or at gameOver', () => {
    const { container, rerender } = render(<ControlsBar {...props} phase="awaitingRoll" hidden canUndo />);
    expect(container.innerHTML).toBe('');
    rerender(<ControlsBar {...props} phase="gameOver" canUndo />);
    expect(container.innerHTML).toBe('');
  });

  it('awaitingRoll: one big 🎲 button with the die in span.game-btn-emoji', () => {
    const onRoll = vi.fn();
    render(<ControlsBar {...props} phase="awaitingRoll" onRoll={onRoll} />);
    const btn = screen.getByRole('button', { name: '🎲 주사위 굴리기' });
    expect(btn).toHaveClass('game-btn');
    expect(btn).not.toBeDisabled();
    expect(btn.querySelector('.game-btn-emoji')!.textContent).toBe('🎲');
    fireEvent.click(btn);
    expect(onRoll).toHaveBeenCalledTimes(1);
  });

  it('awaitingJudgement has no primary button; undo only when canUndo', () => {
    const { container, rerender } = render(<ControlsBar {...props} phase="awaitingJudgement" />);
    expect(container.querySelectorAll('button')).toHaveLength(0);
    rerender(<ControlsBar {...props} phase="awaitingJudgement" canUndo />);
    expect(screen.getByRole('button', { name: '↩️ 판정 되돌리기' })).toHaveClass('game-btn--sm');
    expect(container.querySelectorAll('button')).toHaveLength(1);
  });

  it('turnResolved labels per nextKind and calls onNext', () => {
    const onNext = vi.fn();
    const { rerender } = render(<ControlsBar {...props} phase="turnResolved" onNext={onNext} />);
    fireEvent.click(screen.getByRole('button', { name: '다음 ➡️' }));
    expect(onNext).toHaveBeenCalledTimes(1);
    rerender(<ControlsBar {...props} phase="turnResolved" nextKind="extra" />);
    expect(screen.getByRole('button', { name: '🔁 한 번 더 하기' })).toHaveClass('game-btn');
    rerender(<ControlsBar {...props} phase="turnResolved" nextKind="result" />);
    expect(screen.getByRole('button', { name: '🏆 결과 보기' })).toHaveClass('game-btn');
  });

  it('turnResolved result line above the next button; none without a judgement', () => {
    const ok: JudgementResult = { success: true, starsAwarded: 3, retry: false };
    const miss: JudgementResult = { success: false, starsAwarded: 0, retry: false };
    const { container, rerender } = render(<ControlsBar {...props} phase="turnResolved" judgement={ok} />);
    const line = screen.getByText('🎉 성공! ⭐+3');
    expect(line).toHaveClass('game-judge-result', 'ok');
    const root = container.querySelector('.game-controls')!;
    expect(root.firstElementChild).toBe(line);
    rerender(<ControlsBar {...props} phase="turnResolved" judgement={miss} />);
    expect(screen.getByText('아쉬워요! 이번엔 별 없이 다음 차례')).toHaveClass('game-judge-result', 'miss');
    rerender(<ControlsBar {...props} phase="turnResolved" judgement={{ ...miss, retry: true }} />);
    expect(container.querySelector('.game-judge-result')).toBeNull();
    rerender(<ControlsBar {...props} phase="turnResolved" judgement={null} />);
    expect(container.querySelector('.game-judge-result')).toBeNull();
    rerender(<ControlsBar {...props} phase="turnResolved" judgement={ok} hidden />);
    expect(container.innerHTML).toBe('');
  });
});
