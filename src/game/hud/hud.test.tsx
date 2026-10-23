// src/game/hud/hud.test.tsx — play flow on the 3D game screen (GameStage; TURN-01~08, D-16/D-17,
// D-22, D-25). Deterministic engine states come from the testkit (makeGame + boardWith + engine
// transitions with scripted dice) and are injected with useGameStore.setState before GameApp mounts
// (the director resyncs on mount and plays no beats). The lazy 3D canvas is the fake test double;
// it never completes beats, so settle() ends them after every action that produces some (🎲, ✅).
// Mounting runs on real timers (the lazy chunk resolves asynchronously); multi-tap tests switch to
// fake timers after mounting to step past the double-tap input lock (CR-01).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within, act, cleanup } from '@testing-library/react';
import GameApp from '../GameApp';
import GameStage from '../GameStage';
import { INPUT_LOCK_MS } from '../useInputLock';
import { usePresentation } from '../usePresentation';
import { EMPTY_DISPLAYED } from '../director/displayed';
import { useGameStore } from '../../harness/useGameStore';
import Toast, { useToastStore } from '../../components/Toast';
import { rollDice, judge, advanceTurn } from '../../engine/game';
import { makeGame, boardWith, questTile, eventTile, dice, mission, player } from '../../engine/testkit';
import type { GameState } from '../../engine/state';
import { fakeCanvas, settle, waitForCanvas } from '../../test/fakeGameCanvas';

vi.mock('../scene/GameCanvas', () => import('../../test/fakeGameCanvas'));

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

// Real taps on the play screen are separated by more than the double-tap lock (CR-01). Tests that
// tap several play buttons in a row run on fake timers and step the clock past the lock between taps.
function pause() {
  act(() => {
    vi.advanceTimersByTime(INPUT_LOCK_MS);
  });
}

async function renderPlay() {
  const r = render(
    <>
      <GameApp />
      <Toast />
    </>,
  );
  await waitForCanvas(); // controls appear only once the (fake) canvas is ready
  return r;
}

beforeEach(() => {
  useGameStore.setState({ game: null, startBlockedReason: null });
  usePresentation.getState().reset(EMPTY_DISPLAYED, null);
  useToastStore.setState({ msg: '', kind: 'neutral', seq: 0 });
  fakeCanvas.reset();
});

afterEach(() => {
  cleanup(); // unmount before the stores reset (no updates outside act)
  vi.useRealTimers();
  usePresentation.getState().reset(EMPTY_DISPLAYED, null);
  useGameStore.setState({ game: null, startBlockedReason: null });
  fakeCanvas.reset();
});

describe('GameStage — layout (D-22, D-26)', () => {
  it('renders the 3D stage with turn bar, board cell and scoreboard; no strip, no clock', async () => {
    setGame(baseGame());
    const { container } = await renderPlay();
    const stage = container.querySelector('.game-stage.stage');
    expect(stage).not.toBeNull();
    expect(container.querySelector('.game-topbar')).not.toBeNull();
    expect(screen.getByRole('list', { name: '별 순위' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '20칸 순환 보드, 지금 P1 차례' })).toBeInTheDocument();
    expect(container.querySelector('.stage-canvas-cell')).not.toBeNull();
    expect(screen.queryByRole('list', { name: '보드 칸' })).toBeNull();
    expect(stage!.textContent).not.toContain('⏱️');
  });

  it('renders nothing without a game', () => {
    const { container } = render(<GameStage />);
    expect(container.innerHTML).toBe('');
  });

  it('awaitingRoll: only the dice button; no quest card, no undo, no status chips', async () => {
    setGame(baseGame());
    const { container } = await renderPlay();
    expect(screen.getByRole('button', { name: '🎲 주사위 굴리기' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: '미션 판정' })).toBeNull();
    expect(screen.queryByRole('button', { name: '↩️ 판정 되돌리기' })).toBeNull();
    expect(container.querySelector('.status-chip')).toBeNull();
  });
});

describe('GameStage — quest card + judgement (TURN-02/03/04)', () => {
  it('awaitingJudgement: dice chip + quest card with name, desc, badge and stars; no dice button', async () => {
    setGame(atJudgement());
    await renderPlay();
    expect(screen.getByText('🎲 3')).toHaveClass('status-chip');
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

  it('omits the description line when it is empty', async () => {
    const g = rollDice(
      makeGame({ missions: [EASY], board: boardWith(20, { 1: questTile('easy') }) }),
      dice(1),
    );
    setGame(g);
    const { container } = await renderPlay();
    expect(screen.getByRole('heading', { name: '한 발 뛰기' })).toBeInTheDocument();
    expect(container.querySelector('.game-mission-desc')).toBeNull();
  });

  it('✅ 성공 → result line, scoreboard ⭐3, 다음 ➡️ and the undo button', async () => {
    setGame(atJudgement());
    await renderPlay();
    fireEvent.click(screen.getByRole('button', { name: '✅ 성공' }));
    settle();
    expect(screen.getByText('🎉 성공! ⭐+3')).toHaveClass('game-judge-result', 'ok');
    const board = screen.getByRole('list', { name: '별 순위' });
    expect(within(board).getByText('⭐3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음 ➡️' })).toHaveClass('game-btn', 'game-btn--neutral');
    expect(screen.getByRole('button', { name: '↩️ 판정 되돌리기' })).toHaveClass('game-btn--sm');
  });

  it('↩️ 판정 되돌리기 → same quest card, stars restored, toast shown (D-17)', async () => {
    setGame(atJudgement());
    await renderPlay();
    vi.useFakeTimers(); // pause() steps past the double-tap lock between taps
    fireEvent.click(screen.getByRole('button', { name: '✅ 성공' }));
    settle();
    pause();
    fireEvent.click(screen.getByRole('button', { name: '↩️ 판정 되돌리기' }));
    const card = screen.getByRole('group', { name: '미션 판정' });
    expect(within(card).getByRole('heading', { name: '양발 모아뛰기' })).toBeInTheDocument();
    expect(useGameStore.getState().game!.config.participants[0].stars).toBe(0);
    expect(within(screen.getByRole('list', { name: '별 순위' })).getAllByText('⭐0')).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent('판정을 되돌렸어요. 다시 골라 주세요.');
  });

  it('undo stays available on the next awaitingRoll and disappears after rolling (D-16)', async () => {
    setGame(atJudgement());
    await renderPlay();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: '✅ 성공' }));
    settle();
    pause();
    fireEvent.click(screen.getByRole('button', { name: '다음 ➡️' }));
    expect(useGameStore.getState().game!.currentIndex).toBe(1);
    expect(screen.getByRole('button', { name: '🎲 주사위 굴리기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '↩️ 판정 되돌리기' })).toBeInTheDocument();
    pause();
    fireEvent.click(screen.getByRole('button', { name: '🎲 주사위 굴리기' }));
    expect(screen.queryByRole('button', { name: '↩️ 판정 되돌리기' })).toBeNull();
  });

  it('retrySame: first fail shows the retry badge with the same mission; second fail ends with no star', async () => {
    setGame(atJudgement());
    await renderPlay();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: '❌ 실패' }));
    const card = screen.getByRole('group', { name: '미션 판정' });
    expect(within(card).getByText('🔁 한 번 더 도전!')).toBeInTheDocument();
    expect(within(card).getByRole('heading', { name: '양발 모아뛰기' })).toBeInTheDocument();
    pause();
    fireEvent.click(screen.getByRole('button', { name: '❌ 실패' }));
    expect(screen.getByText('아쉬워요! 이번엔 별 없이 다음 차례')).toHaveClass('game-judge-result', 'miss');
    expect(screen.queryByRole('group', { name: '미션 판정' })).toBeNull();
  });
});

describe('GameStage — next button kinds (TURN-07, D-08, D-18)', () => {
  it('extra event → 🔁 한 번 더 하기, and the next turn shows the 🔁 한 번 더 badge', async () => {
    setGame(rollDice(baseGame(), dice(2)));
    await renderPlay();
    expect(screen.getByText('🔁 한 번 더!')).toHaveClass('status-chip', 'status-chip--grape');
    fireEvent.click(screen.getByRole('button', { name: '🔁 한 번 더 하기' }));
    settle();
    const g = useGameStore.getState().game!;
    expect(g.currentIndex).toBe(0);
    expect(g.turn.isExtra).toBe(true);
    expect(screen.getByText('🔁 한 번 더')).toHaveClass('game-event-chip', 'extra');
  });

  it('the last regular turn of the last round shows 🏆 결과 보기', async () => {
    const g = makeGame({
      rules: { rounds: 1 },
      patch: (s) => ({ ...s, phase: 'turnResolved', currentIndex: 1 }),
    });
    setGame(g);
    await renderPlay();
    expect(screen.getByRole('button', { name: '🏆 결과 보기' })).toHaveClass('game-btn', 'game-btn--neutral');
  });
});

// CR-01 / WR-01: the next phase's button is drawn in the same place as the one just tapped and React
// reuses the DOM node, so clicking the SAME node twice is exactly what a real double tap does.
describe('GameStage — double-tap lock (CR-01, WR-01, D-25)', () => {
  // Fake timers only after mounting: the lazy canvas resolves on real timers.
  async function mountFake(g: GameState) {
    setGame(g);
    await renderPlay();
    vi.useFakeTimers();
  }

  const seq = () => useGameStore.getState().game!.log.seq;

  it('a double tap on 다음 ➡️ advances one turn only: the next player has not rolled and undo stays open (D-16)', async () => {
    await mountFake(atJudgement());
    fireEvent.click(screen.getByRole('button', { name: '✅ 성공' }));
    settle();
    pause();
    const next = screen.getByRole('button', { name: '다음 ➡️' });
    const before = seq();
    fireEvent.click(next);
    // The hazard: the very same node is now the next player's dice button.
    expect(next).toHaveTextContent('🎲 주사위 굴리기');
    fireEvent.click(next);
    const g = useGameStore.getState().game!;
    expect(g.log.seq).toBe(before + 1);
    expect(g.currentIndex).toBe(1);
    expect(g.phase).toBe('awaitingRoll');
    expect(g.config.participants[1].travel).toBe(0);
    expect(screen.getByRole('button', { name: '↩️ 판정 되돌리기' })).toBeInTheDocument();
  });

  it('a double tap on 🎲 that lands on an event tile does not skip the event result', async () => {
    const extra = eventTile('extra', 0, { name: '보너스 점프' });
    const board = boardWith(20, { 1: extra, 2: extra, 3: extra, 4: extra, 5: extra, 6: extra });
    await mountFake(makeGame({ missions: [EASY], board }));
    const roll = screen.getByRole('button', { name: '🎲 주사위 굴리기' });
    const before = seq();
    fireEvent.click(roll);
    // The second tap lands while the controls are hidden by the beats (D-25).
    expect(screen.queryByRole('button', { name: '🔁 한 번 더 하기' })).toBeNull();
    fireEvent.click(roll);
    const g = useGameStore.getState().game!;
    expect(g.log.seq).toBe(before + 1);
    expect(g.phase).toBe('turnResolved');
    expect(g.turn.isExtra).toBe(false);
    settle();
    expect(screen.getByRole('button', { name: '🔁 한 번 더 하기' })).toBeInTheDocument();
  });

  it.each(['retrySame', 'retryNew'] as const)(
    'a double tap on ❌ 실패 keeps the retry (%s, D-03)',
    async (failRule) => {
      await mountFake(atJudgement({ rules: { failRule } }));
      const fail = screen.getByRole('button', { name: '❌ 실패' });
      const before = seq();
      fireEvent.click(fail);
      fireEvent.click(fail); // the retry card's ❌ is the same node
      const g = useGameStore.getState().game!;
      expect(g.log.seq).toBe(before + 1);
      expect(g.phase).toBe('awaitingJudgement');
      expect(g.card!.attempt).toBe(2);
      expect(screen.getByText('🔁 한 번 더 도전!')).toBeInTheDocument();
      pause();
      fireEvent.click(fail); // a deliberate tap on attempt 2 still judges it
      expect(useGameStore.getState().game!.phase).toBe('turnResolved');
      expect(screen.getByText('아쉬워요! 이번엔 별 없이 다음 차례')).toBeInTheDocument();
    },
  );

  it('only the double tap is swallowed: after the lock window the same button works again', async () => {
    await mountFake(atJudgement());
    fireEvent.click(screen.getByRole('button', { name: '✅ 성공' }));
    settle();
    pause();
    const next = screen.getByRole('button', { name: '다음 ➡️' });
    fireEvent.click(next);
    pause();
    fireEvent.click(next); // a deliberate second tap: P2 rolls, which closes the undo window (D-16)
    const g = useGameStore.getState().game!;
    expect(g.currentIndex).toBe(1);
    expect(g.phase).not.toBe('awaitingRoll');
    expect(g.config.participants[1].travel).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: '↩️ 판정 되돌리기' })).toBeNull();
  });
});

describe('TurnHud (TURN-01, D-21, D-22)', () => {
  it('shows emoji + name + 차례 and the round readout', async () => {
    setGame(baseGame());
    const { container } = await renderPlay();
    const name = container.querySelector('.game-turn-name')!;
    expect(name.textContent).toBe('🐻 P1 차례');
    expect(container.querySelector('.game-round')!.textContent).toBe('라운드1/3');
    expect(screen.queryByText('🔁 한 번 더')).toBeNull();
  });

  it('team mode shows the active member line', async () => {
    setGame(
      makeGame({
        mode: 'team',
        participants: [
          player('t1', 'A팀', 'fox', { memberNames: ['민수', '지아'] }),
          player('t2', 'B팀', 'pig', { memberNames: ['하준'] }),
        ],
      }),
    );
    const { container } = await renderPlay();
    expect(container.querySelector('.game-turn-member')!.textContent).toBe('이번엔 민수 님이 도전!');
  });

  it('지금 끝내기 opens the confirm dialog; 계속하기 keeps the game running', async () => {
    setGame(baseGame());
    await renderPlay();
    fireEvent.click(screen.getByRole('button', { name: '지금 끝내기' }));
    const dialog = screen.getByRole('dialog', { name: '지금 게임을 끝낼까요? 지금까지 모은 별로 우승을 정해요.' });
    fireEvent.click(within(dialog).getByRole('button', { name: '계속하기' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(useGameStore.getState().game!.phase).toBe('awaitingRoll');
  });

  it('게임 끝내기 ends the game manually (pending quest voided)', async () => {
    setGame(atJudgement());
    await renderPlay();
    fireEvent.click(screen.getByRole('button', { name: '지금 끝내기' }));
    fireEvent.click(screen.getByRole('button', { name: '게임 끝내기' }));
    const g = useGameStore.getState().game!;
    expect(g.phase).toBe('gameOver');
    expect(g.endReason).toBe('manual');
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
