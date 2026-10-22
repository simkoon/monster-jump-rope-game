// src/game/hud/hud.test.tsx — Phase 5 temporary play screen (D-26, TURN-01~08, D-16/D-17, D-22).
// Deterministic engine states come from the testkit (makeGame + boardWith + engine transitions with
// scripted dice) and are injected with useGameStore.setState. No timers, no 3D, no mocks.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import PlayView from '../PlayView';
import { useGameStore } from '../../harness/useGameStore';
import Toast, { useToastStore } from '../../components/Toast';
import TurnHud from './TurnHud';
import ControlsBar from './ControlsBar';
import DiceResultPanel from './DiceResultPanel';
import { rollDice, judge, advanceTurn } from '../../engine/game';
import { makeGame, boardWith, questTile, eventTile, dice, mission, player } from '../../engine/testkit';
import type { GameState, MoveResult } from '../../engine/state';
import type { Event } from '../../schema';

const HARD = mission('h1', 'hard', { name: '양발 모아뛰기', desc: '제자리에서 열 번 뛰기' });
const EASY = mission('e1', 'easy', { name: '한 발 뛰기', desc: '' });

function baseGame(over: Parameters<typeof makeGame>[0] = {}): GameState {
  return makeGame({
    missions: [EASY, HARD],
    board: boardWith(20, { 3: questTile('hard'), 2: eventTile('extra', 0, { name: '보너스 점프' }) }),
    ...over,
  });
}

// P1 rolled a 3 onto the hard quest → awaitingJudgement.
const atJudgement = (over: Parameters<typeof makeGame>[0] = {}) => rollDice(baseGame(over), dice(3));

function setGame(g: GameState) {
  useGameStore.setState({ game: g, startBlockedReason: null });
}

function renderPlay() {
  return render(
    <>
      <PlayView />
      <Toast />
    </>,
  );
}

beforeEach(() => {
  useGameStore.setState({ game: null, startBlockedReason: null });
  useToastStore.setState({ msg: '', kind: 'neutral', seq: 0 });
});

describe('PlayView — layout (D-26)', () => {
  it('renders the temp-play stage with turn bar, scoreboard and ring strip; no clock', () => {
    setGame(baseGame());
    const { container } = renderPlay();
    const stage = container.querySelector('.game-stage.temp-play');
    expect(stage).not.toBeNull();
    expect(container.querySelector('.game-topbar')).not.toBeNull();
    expect(screen.getByRole('list', { name: '별 순위' })).toBeInTheDocument();
    const strip = screen.getByRole('list', { name: '보드 칸' });
    expect(within(strip).getAllByRole('listitem')).toHaveLength(20);
    expect(stage!.textContent).not.toContain('⏱️');
  });

  it('renders nothing without a game', () => {
    const { container } = render(<PlayView />);
    expect(container.innerHTML).toBe('');
  });

  it('awaitingRoll: only the dice button; no quest card, no undo, no move panel', () => {
    setGame(baseGame());
    const { container } = renderPlay();
    expect(screen.getByRole('button', { name: '🎲 주사위 굴리기' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: '미션 판정' })).toBeNull();
    expect(screen.queryByRole('button', { name: '↩️ 판정 되돌리기' })).toBeNull();
    expect(container.querySelector('.game-resolved')).toBeNull();
  });
});

describe('PlayView — quest card + judgement (TURN-02/03/04)', () => {
  it('awaitingJudgement: move panel + quest card with name, desc, badge and stars; no dice button', () => {
    setGame(atJudgement());
    renderPlay();
    expect(screen.getByText('🎲 3')).toBeInTheDocument();
    expect(screen.getByText('3칸 앞으로!')).toBeInTheDocument();
    const card = screen.getByRole('group', { name: '미션 판정' });
    expect(within(card).getByRole('heading', { name: '양발 모아뛰기' })).toBeInTheDocument();
    expect(within(card).getByText('제자리에서 열 번 뛰기')).toBeInTheDocument();
    expect(within(card).getByText('어려움')).toHaveClass('game-diff-badge', 'hard');
    const stars = within(card).getByLabelText('받을 별 3개');
    expect(stars.textContent).toBe('⭐⭐⭐');
    expect(within(card).getByRole('button', { name: '✅ 성공' })).toHaveClass('game-btn', 'game-btn--success');
    expect(within(card).getByRole('button', { name: '❌ 실패' })).toHaveClass('game-btn', 'game-btn--danger');
    expect(screen.queryByRole('button', { name: '🎲 주사위 굴리기' })).toBeNull();
  });

  it('omits the description line when it is empty', () => {
    const g = rollDice(
      makeGame({ missions: [EASY], board: boardWith(20, { 1: questTile('easy') }) }),
      dice(1),
    );
    setGame(g);
    const { container } = renderPlay();
    expect(screen.getByRole('heading', { name: '한 발 뛰기' })).toBeInTheDocument();
    expect(container.querySelector('.game-mission-desc')).toBeNull();
  });

  it('✅ 성공 → result line, scoreboard ⭐3, 다음 ➡️ and the undo button', () => {
    setGame(atJudgement());
    renderPlay();
    fireEvent.click(screen.getByRole('button', { name: '✅ 성공' }));
    expect(screen.getByText('🎉 성공! ⭐+3')).toHaveClass('game-judge-result', 'ok');
    const board = screen.getByRole('list', { name: '별 순위' });
    expect(within(board).getByText('⭐3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음 ➡️' })).toHaveClass('game-btn', 'game-btn--neutral');
    expect(screen.getByRole('button', { name: '↩️ 판정 되돌리기' })).toHaveClass('game-btn--sm');
  });

  it('↩️ 판정 되돌리기 → same quest card, stars restored, toast shown (D-17)', () => {
    setGame(atJudgement());
    renderPlay();
    fireEvent.click(screen.getByRole('button', { name: '✅ 성공' }));
    fireEvent.click(screen.getByRole('button', { name: '↩️ 판정 되돌리기' }));
    const card = screen.getByRole('group', { name: '미션 판정' });
    expect(within(card).getByRole('heading', { name: '양발 모아뛰기' })).toBeInTheDocument();
    expect(useGameStore.getState().game!.config.participants[0].stars).toBe(0);
    expect(within(screen.getByRole('list', { name: '별 순위' })).getAllByText('⭐0')).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent('판정을 되돌렸어요. 다시 골라 주세요.');
  });

  it('undo stays available on the next awaitingRoll and disappears after rolling (D-16)', () => {
    setGame(atJudgement());
    renderPlay();
    fireEvent.click(screen.getByRole('button', { name: '✅ 성공' }));
    fireEvent.click(screen.getByRole('button', { name: '다음 ➡️' }));
    expect(useGameStore.getState().game!.currentIndex).toBe(1);
    expect(screen.getByRole('button', { name: '🎲 주사위 굴리기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '↩️ 판정 되돌리기' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '🎲 주사위 굴리기' }));
    expect(screen.queryByRole('button', { name: '↩️ 판정 되돌리기' })).toBeNull();
  });

  it('retrySame: first fail shows the retry badge with the same mission; second fail ends with no star', () => {
    setGame(atJudgement());
    renderPlay();
    fireEvent.click(screen.getByRole('button', { name: '❌ 실패' }));
    const card = screen.getByRole('group', { name: '미션 판정' });
    expect(within(card).getByText('🔁 한 번 더 도전!')).toBeInTheDocument();
    expect(within(card).getByRole('heading', { name: '양발 모아뛰기' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '❌ 실패' }));
    expect(screen.getByText('아쉬워요! 이번엔 별 없이 다음 차례')).toHaveClass('game-judge-result', 'miss');
    expect(screen.queryByRole('group', { name: '미션 판정' })).toBeNull();
  });
});

describe('PlayView — next button kinds (TURN-07, D-08, D-18)', () => {
  it('extra event → 🔁 한 번 더 하기, and the next turn shows the 🔁 한 번 더 badge', () => {
    setGame(rollDice(baseGame(), dice(2)));
    renderPlay();
    expect(screen.getByText('🔁 보너스 점프 · 한 번 더!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '🔁 한 번 더 하기' }));
    const g = useGameStore.getState().game!;
    expect(g.currentIndex).toBe(0);
    expect(g.turn.isExtra).toBe(true);
    expect(screen.getByText('🔁 한 번 더')).toHaveClass('game-event-chip', 'extra');
  });

  it('the last regular turn of the last round shows 🏆 결과 보기', () => {
    const g = makeGame({
      rules: { rounds: 1 },
      patch: (s) => ({ ...s, phase: 'turnResolved', currentIndex: 1 }),
    });
    setGame(g);
    renderPlay();
    expect(screen.getByRole('button', { name: '🏆 결과 보기' })).toHaveClass('game-btn', 'game-btn--neutral');
  });
});

describe('TurnHud (TURN-01, D-21, D-22)', () => {
  it('shows emoji + name + 차례 and the round readout', () => {
    setGame(baseGame());
    const { container } = renderPlay();
    const name = container.querySelector('.game-turn-name')!;
    expect(name.textContent).toBe('🐻 P1 차례');
    expect(container.querySelector('.game-round')!.textContent).toBe('라운드1/3');
    expect(screen.queryByText('🔁 한 번 더')).toBeNull();
  });

  it('team mode shows the active member line', () => {
    setGame(
      makeGame({
        mode: 'team',
        participants: [
          player('t1', 'A팀', 'fox', { memberNames: ['민수', '지아'] }),
          player('t2', 'B팀', 'pig', { memberNames: ['하준'] }),
        ],
      }),
    );
    const { container } = renderPlay();
    expect(container.querySelector('.game-turn-member')!.textContent).toBe('이번엔 민수 님이 도전!');
  });

  it('지금 끝내기 opens the confirm dialog; 계속하기 keeps the game running', () => {
    setGame(baseGame());
    renderPlay();
    fireEvent.click(screen.getByRole('button', { name: '지금 끝내기' }));
    const dialog = screen.getByRole('dialog', { name: '지금 게임을 끝낼까요? 지금까지 모은 별로 우승을 정해요.' });
    fireEvent.click(within(dialog).getByRole('button', { name: '계속하기' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(useGameStore.getState().game!.phase).toBe('awaitingRoll');
  });

  it('게임 끝내기 ends the game manually (pending quest voided)', () => {
    setGame(atJudgement());
    renderPlay();
    fireEvent.click(screen.getByRole('button', { name: '지금 끝내기' }));
    fireEvent.click(screen.getByRole('button', { name: '게임 끝내기' }));
    const g = useGameStore.getState().game!;
    expect(g.phase).toBe('gameOver');
    expect(g.endReason).toBe('manual');
  });

  it('standalone props: the extra badge and onEndNow only on confirm', () => {
    const onEndNow = vi.fn();
    render(
      <TurnHud
        animal="cat"
        name="가"
        isTeam={false}
        activeMember="가"
        isExtra
        round={2}
        totalRounds={5}
        onEndNow={onEndNow}
      />,
    );
    expect(screen.getByText('🔁 한 번 더')).toBeInTheDocument();
    expect(screen.getByText('2/5')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '지금 끝내기' }));
    expect(onEndNow).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '게임 끝내기' }));
    expect(onEndNow).toHaveBeenCalledTimes(1);
  });
});

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

describe('DiceResultPanel copy (UI-SPEC S3)', () => {
  it('roll + move line', () => {
    render(<DiceResultPanel move={move()} />);
    expect(screen.getByText('🎲 4')).toHaveClass('game-roll');
    expect(screen.getByText('4칸 앞으로!')).toHaveClass('game-move');
  });

  it('start bonus chip', () => {
    render(<DiceResultPanel move={move({ startBonus: 1 })} />);
    expect(screen.getByText('🏁 출발 보너스 ⭐+1')).toHaveClass('game-event-chip', 'start-bonus');
  });

  it('forward / backward / extra event lines', () => {
    const { rerender } = render(<DiceResultPanel move={move({ event: ev('forward', 3, '점프대'), finalKind: 'quest' })} />);
    expect(screen.getByText('➡️ 점프대 · 앞으로 3칸')).toHaveClass('game-event', 'eff-forward');
    rerender(<DiceResultPanel move={move({ event: ev('backward', 2, '미끄럼'), finalKind: 'quest' })} />);
    expect(screen.getByText('⬅️ 미끄럼 · 뒤로 2칸')).toHaveClass('game-event', 'eff-backward');
    rerender(<DiceResultPanel move={move({ event: ev('extra', 0, '보너스 점프'), finalKind: 'event' })} />);
    expect(screen.getByText('🔁 보너스 점프 · 한 번 더!')).toHaveClass('game-event', 'eff-extra');
  });

  it('suppressed extra line replaces the extra line', () => {
    render(<DiceResultPanel move={move({ event: ev('extra', 0, '보너스 점프'), finalKind: 'event', extraSuppressed: true })} />);
    expect(screen.getByText('🔁 한 번 더는 연속 한 번까지! 이번엔 넘어가요')).toBeInTheDocument();
    expect(screen.queryByText('🔁 보너스 점프 · 한 번 더!')).toBeNull();
  });

  it('start-tile arrival line', () => {
    render(<DiceResultPanel move={move({ to: 0, finalKind: 'start' })} />);
    expect(screen.getByText('🏁 출발 칸에 도착!')).toBeInTheDocument();
  });

  it('보너스 / 함정 label chips', () => {
    const { rerender } = render(<DiceResultPanel move={move({ event: ev('forward', 2, '점프대', '보너스') })} />);
    expect(screen.getByText('🎁 보너스')).toHaveClass('game-event-chip', 'bonus');
    rerender(<DiceResultPanel move={move({ event: ev('backward', 2, '구덩이', '함정') })} />);
    expect(screen.getByText('🕳️ 함정')).toHaveClass('game-event-chip', 'trap');
  });
});

describe('ControlsBar (phase table)', () => {
  const noop = () => {};
  const props = { canUndo: false, nextKind: 'next' as const, onRoll: noop, onNext: noop, onUndo: noop };

  it('renders nothing while busy or at gameOver', () => {
    const { container, rerender } = render(<ControlsBar {...props} phase="awaitingRoll" busy />);
    expect(container.innerHTML).toBe('');
    rerender(<ControlsBar {...props} phase="gameOver" canUndo />);
    expect(container.innerHTML).toBe('');
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

  it('awaitingRoll calls onRoll', () => {
    const onRoll = vi.fn();
    render(<ControlsBar {...props} phase="awaitingRoll" onRoll={onRoll} />);
    const btn = screen.getByRole('button', { name: '🎲 주사위 굴리기' });
    expect(btn).toHaveClass('game-btn');
    fireEvent.click(btn);
    expect(onRoll).toHaveBeenCalledTimes(1);
  });
});

// Sanity: the engine helpers used to build fixtures behave as the tests assume.
describe('fixtures', () => {
  it('atJudgement lands P1 on the hard quest; advanceTurn after judge moves to P2', () => {
    const g = atJudgement();
    expect(g.phase).toBe('awaitingJudgement');
    expect(g.card!.diff).toBe('hard');
    const done = judge(g, true, dice(1));
    expect(advanceTurn(done).currentIndex).toBe(1);
  });
});
