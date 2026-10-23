// src/game/stage.test.tsx — GameStage / GameApp integration (06-06 Task 1; D-01, D-22, D-23, D-25,
// D-27, HUD-01/02/03, ROUND-02, STAB-02).
// The lazy 3D chunk is swapped for the fake canvas (jsdom has no WebGL — RESEARCH Pitfall 2/3).
// The fake never completes 3D beats, so dice / preview / hop beats end only through the store
// watchdog or settle(). Mounts run on real timers (the lazy import resolves asynchronously);
// fake timers are switched on only after the canvas is ready.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import GameApp from './GameApp';
import GameStage, { READY_TIMEOUT_MS } from './GameStage';
import { usePresentation, WATCHDOG_BUFFER_MS } from './usePresentation';
import { displayedFrom, EMPTY_DISPLAYED } from './director/displayed';
import { startDirector } from './director/useDirector';
import { useGameStore } from '../harness/useGameStore';
import Toast, { useToastStore } from '../components/Toast';
import { rollDice } from '../engine/game';
import { boardWith, dice, eventTile, makeGame, mission, questTile } from '../engine/testkit';
import type { GameState } from '../engine/state';
import { fakeCanvas, settle, waitForCanvas } from '../test/fakeGameCanvas';

vi.mock('./scene/GameCanvas', () => import('../test/fakeGameCanvas'));

const HARD = mission('h1', 'hard', { name: '양발 모아뛰기', desc: '제자리에서 열 번 뛰기' });
const EASY = mission('e1', 'easy', { name: '한 발 뛰기', desc: '' });

function baseGame(over: Parameters<typeof makeGame>[0] = {}): GameState {
  return makeGame({
    missions: [EASY, HARD],
    board: boardWith(20, { 3: questTile('hard'), 2: eventTile('extra', 0, { name: '보너스 점프' }) }),
    ...over,
  });
}

const atJudgement = () => rollDice(baseGame(), dice(3));
const P = () => usePresentation.getState();
const engine = () => useGameStore.getState().game!;

// The runtime die reads crypto.getRandomValues: pin it so 🎲 lands on 3 (the hard quest).
function pinDie(face: number) {
  const u = Math.floor(((face - 1 + 0.5) / 6) * 4294967296);
  vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(((arr: Uint32Array) => {
    arr[0] = u;
    return arr;
  }) as unknown as typeof crypto.getRandomValues);
}

async function mountApp(g: GameState) {
  useGameStore.setState({ game: g, startBlockedReason: null });
  const r = render(
    <>
      <GameApp />
      <Toast />
    </>,
  );
  await waitForCanvas();
  return r;
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

const rollBtn = () => screen.queryByRole('button', { name: '🎲 주사위 굴리기' });
const questCard = () => screen.queryByRole('group', { name: '미션 판정' });

let unsub: (() => void) | null = null;

beforeEach(() => {
  useGameStore.setState({ game: null, startBlockedReason: null });
  P().reset(EMPTY_DISPLAYED, null);
  useToastStore.setState({ msg: '', kind: 'neutral', seq: 0 });
  fakeCanvas.reset();
});

afterEach(() => {
  cleanup(); // unmount before the stores reset (no updates outside act)
  unsub?.();
  unsub = null;
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (document as unknown as { visibilityState?: string }).visibilityState; // back to the jsdom getter
  P().reset(EMPTY_DISPLAYED, null);
  useGameStore.setState({ game: null, startBlockedReason: null });
  fakeCanvas.reset();
});

describe('GameStage — layout (D-22, BOARD-01)', () => {
  it('shows the stage, turn bar, board cell and scoreboard; controls only after the canvas is ready', async () => {
    useGameStore.setState({ game: baseGame(), startBlockedReason: null });
    const { container } = render(<GameApp />);
    expect(container.querySelector('.game-stage.stage')).not.toBeNull();
    expect(container.querySelector('.game-topbar')).not.toBeNull();
    expect(screen.getByRole('img', { name: '20칸 순환 보드, 지금 P1 차례' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: '별 순위' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: '보드 칸' })).toBeNull();
    expect(screen.getByText('판을 준비하고 있어요…')).toBeInTheDocument();
    expect(rollBtn()).toBeNull();

    await waitForCanvas();
    expect(screen.queryByText('판을 준비하고 있어요…')).toBeNull();
    expect(rollBtn()).toBeInTheDocument();
    expect(screen.getByTestId('fake-canvas')).toBeInTheDocument();
    expect(fakeCanvas.lastProps!.tiles).toBe(engine().board);
    expect(fakeCanvas.lastProps!.currentId).toBe('p1');
    expect(fakeCanvas.lastProps!.visible).toBe(true);
    expect(READY_TIMEOUT_MS).toBe(8000);
  });
});

describe('GameStage — no flicker (HUD-03, D-25)', () => {
  it('🎲 onto a quest hides every control synchronously; after the beats the card and 🎲 3 chip appear', async () => {
    await mountApp(baseGame());
    pinDie(3);
    fireEvent.click(rollBtn()!);
    expect(engine().phase).toBe('awaitingJudgement');
    expect(rollBtn()).toBeNull();
    expect(questCard()).toBeNull();
    expect(screen.queryByRole('button', { name: '↩️ 판정 되돌리기' })).toBeNull();
    expect(P().busy).toBe(true);

    settle();
    expect(questCard()).toBeInTheDocument();
    expect(screen.getByText('🎲 3')).toHaveClass('status-chip');
  });

  it('watchdogs alone bring the quest card back when no 3D consumer completes the beats', async () => {
    await mountApp(baseGame());
    vi.useFakeTimers();
    pinDie(3);
    fireEvent.click(rollBtn()!);
    const { current, queue } = P();
    const beats = [current!, ...queue];
    const total = beats.reduce((s, b) => s + b.ms + WATCHDOG_BUFFER_MS, 0);
    act(() => {
      vi.advanceTimersByTime(total);
    });
    expect(P().busy).toBe(false);
    expect(questCard()).toBeInTheDocument();
  });
});

describe('GameStage — displayed stars (D-01, HUD-01)', () => {
  it('stars rise only after the 600 ms stars beat', async () => {
    await mountApp(atJudgement());
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: '✅ 성공' }));
    expect(engine().config.participants[0].stars).toBe(3);
    const board = screen.getByRole('list', { name: '별 순위' });
    expect(within(board).getAllByText('⭐0')).toHaveLength(2);
    expect(screen.getByText('🎉 성공!')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '다음 ➡️' })).toBeNull();

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(within(screen.getByRole('list', { name: '별 순위' })).getByText('⭐3')).toBeInTheDocument();
    expect(screen.getByText('🎉 성공! ⭐+3')).toHaveClass('game-judge-result', 'ok');
    expect(screen.getByRole('button', { name: '다음 ➡️' })).toBeInTheDocument();
  });
});

describe('GameStage — final round banner (ROUND-02, D-24)', () => {
  it('a fresh 1-round game shows 🔔 마지막 라운드! and hides 🎲 for 1500 ms', async () => {
    await mountApp(baseGame());
    vi.useFakeTimers();
    act(() => {
      useGameStore.setState({ game: makeGame({ board: boardWith(20), rules: { rounds: 1 } }) });
    });
    expect(screen.getByText('🔔 마지막 라운드!')).toBeInTheDocument();
    expect(rollBtn()).toBeNull();
    expect(document.querySelector('.game-round')!.textContent).toContain('마지막 라운드');
    act(() => {
      vi.advanceTimersByTime(1499);
    });
    expect(rollBtn()).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(rollBtn()).toBeInTheDocument();
    expect(screen.queryByText('🔔 마지막 라운드!')).toBeNull();
  });
});

describe('GameStage — context loss and recovery (STAB-02, D-27)', () => {
  it('lost → overlay over the canvas cell, controls hidden; redraw remounts with the game unchanged', async () => {
    const { container } = await mountApp(baseGame());
    const before = engine();
    act(() => {
      fakeCanvas.lastProps!.onLost();
    });
    const dialog = screen.getByRole('alertdialog', { name: '화면이 잠깐 꺼졌어요' });
    expect(container.querySelector('.stage-canvas-cell')!.contains(dialog)).toBe(true);
    expect(rollBtn()).toBeNull();
    expect(container.querySelector('.game-topbar')).not.toBeNull();
    expect(screen.getByRole('list', { name: '별 순위' })).toBeInTheDocument();
    const redraw = within(dialog).getByRole('button', { name: '🔄 화면 다시 그리기' });
    expect(redraw).toHaveFocus();

    fireEvent.click(redraw);
    await waitForCanvas(2);
    expect(fakeCanvas.mounts).toBe(2);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(rollBtn()).toBeInTheDocument();
    expect(engine()).toBe(before);
  });

  it('a redraw mid-beat ends the beats and shows the engine state', async () => {
    await mountApp(baseGame());
    pinDie(3);
    fireEvent.click(rollBtn()!);
    expect(P().busy).toBe(true);
    const g = engine();
    act(() => {
      fakeCanvas.lastProps!.onLost();
    });
    fireEvent.click(screen.getByRole('button', { name: '🔄 화면 다시 그리기' }));
    expect(P().busy).toBe(false);
    expect(P().displayed).toEqual(displayedFrom(g));
    expect(P().consumedLog).toBe(g.log);
    await waitForCanvas(2);
    expect(questCard()).toBeInTheDocument();
    expect(engine()).toBe(g);
  });

  it('a canvas that throws shows 판을 그리지 못했어요; redraw after the cause clears mounts it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fakeCanvas.throwOnRender = true;
    useGameStore.setState({ game: baseGame(), startBlockedReason: null });
    render(<GameApp />);
    const dialog = await screen.findByRole('alertdialog', { name: '판을 그리지 못했어요' });
    expect(rollBtn()).toBeNull();
    fakeCanvas.throwOnRender = false;
    fireEvent.click(within(dialog).getByRole('button', { name: '🔄 화면 다시 그리기' }));
    await waitForCanvas(1);
    await waitFor(() => expect(rollBtn()).toBeInTheDocument());
  });

  it('a canvas that never reports ready times out into the failed overlay', async () => {
    fakeCanvas.skipReady = true;
    useGameStore.setState({ game: baseGame(), startBlockedReason: null });
    unsub = startDirector();
    render(<GameStage readyTimeoutMs={50} />);
    expect(await screen.findByRole('alertdialog', { name: '판을 그리지 못했어요' })).toBeInTheDocument();
    expect(rollBtn()).toBeNull();
  });
});

describe('GameStage — tab visibility (D-27)', () => {
  it('hidden ends the beats and pauses the canvas; visible resumes it', async () => {
    await mountApp(baseGame());
    pinDie(3);
    fireEvent.click(rollBtn()!);
    expect(P().busy).toBe(true);
    setVisibility('hidden');
    expect(P().busy).toBe(false);
    expect(fakeCanvas.lastProps!.visible).toBe(false);
    setVisibility('visible');
    expect(fakeCanvas.lastProps!.visible).toBe(true);
    expect(questCard()).toBeInTheDocument();
  });
});

describe('GameStage — 지금 끝내기 during beats (Pitfall 11)', () => {
  it('shows the result screen at once', async () => {
    await mountApp(baseGame());
    pinDie(3);
    fireEvent.click(rollBtn()!);
    expect(P().busy).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '지금 끝내기' }));
    fireEvent.click(screen.getByRole('button', { name: '게임 끝내기' }));
    expect(engine().phase).toBe('gameOver');
    expect(P().busy).toBe(false);
    expect(screen.getByText('게임 끝!')).toBeInTheDocument();
  });
});
