// src/game/soak.test.tsx — 5 games in a row without a reload (Phase 8 STAB-01, D-22 ①, D-23,
// RESEARCH Pattern 9 ① ②, T-08-28).
//
// ① jsdom: the real App (StrictMode) with the fake canvas and the FakeAudioContext plays 5 full games
//   by pressing the visible buttons (🎲, ✅ / ❌ alternating, 다음 / 한 번 더 / 결과 보기) and advancing
//   fake time past each beat — the Banner timers and the store watchdogs end the beats, nothing is
//   skipped by the test itself except the occasional page tap during a success beat (D-07). At every
//   ceremony (after CEREMONY_INTRO_MS) a snapshot of the leak counters is taken; games 1–5 must be
//   identical, and after 처음으로 the subscription / listener counts return to the setup-screen
//   baseline. Constant per-mount costs (useSfx: 5 document listeners + 3 store subscriptions; the
//   ceremony intro's 2 document listeners exist only while it runs) are the same in every game.
// ② engine only: 5 random games driven through directGame, every queue drained (watchdog timers or
//   skipAll), leave no beat and no watchdog timer behind.
//
// Subscriptions are counted at the zustand seam: `create` is wrapped so every store's api.subscribe
// (which React's useSyncExternalStore reads at call time) counts active listeners — the hooks'
// subscriptions included, not only the explicit .subscribe calls.
import { StrictMode } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { useStore } from '../store';
import { seedContent } from '../seed';
import { useGameStore } from '../harness/useGameStore';
import { useSettings, DEFAULT_SETTINGS } from '../settings';
import { useSetupDraft } from './useSetupDraft';
import { usePresentation } from './usePresentation';
import { EMPTY_DISPLAYED } from './director/displayed';
import { directGame } from './director/useDirector';
import { INPUT_LOCK_MS, resetSharedInputLock } from './useInputLock';
import { CEREMONY_INTRO_MS } from './layout/podiumLayout';
import { __resetSfxForTests, activeNodeCount, MASTER_CHAIN_NODES } from './sfx/sfx';
import { installFakeAudio, type FakeAudioController } from '../test/fakeAudio';
import { fakeCanvas, waitForCanvas } from '../test/fakeGameCanvas';
import { advanceTurn, judge, rollDice } from '../engine/game';
import { ANIMALS } from '../engine/animals';
import { mulberry32 } from '../engine/rng';
import { makeGame, player } from '../engine/testkit';
import type { GameState } from '../engine/state';

vi.mock('./scene/GameCanvas', () => import('../test/fakeGameCanvas'));

// Count active subscriptions per store (see header). The counter rides on the bound hook.
vi.mock('zustand', async (importOriginal) => {
  const actual = await importOriginal<typeof import('zustand')>();
  const { createStore } = await import('zustand/vanilla');
  type Init = import('zustand/vanilla').StateCreator<unknown>;
  const make = (init: Init) => {
    const api = createStore(init);
    const subs = { active: 0 };
    const inner = api.subscribe;
    api.subscribe = (listener) => {
      subs.active++;
      const un = inner(listener);
      let live = true;
      return () => {
        if (live) {
          live = false;
          subs.active--;
        }
        un();
      };
    };
    const hook = (selector?: (s: unknown) => unknown) => actual.useStore(api, selector as never);
    return Object.assign(hook, api, { __subs: subs });
  };
  return { ...actual, create: (init?: Init) => (init ? make(init) : make) };
});

const subsOf = (store: unknown): number => (store as { __subs: { active: number } }).__subs.active;

const GAMES = 5;
const MAX_CLICKS_PER_GAME = 60;
const MAX_IDLE_STEPS = 200;
const IDLE_STEP_MS = 1000; // beats running: advance past them (Banner timers / watchdogs)

interface Counters {
  timers: number;
  queue: number;
  current: number | null;
  subsPresentation: number;
  subsGame: number;
  subsSettings: number;
  docListeners: number;
  winListeners: number;
  bodyChildren: number;
  fxStars: number;
  audioNodes: number;
  fakeAudioLive: number;
  canvasMounts: number;
  canvasNodes: number;
}

let audio: FakeAudioController;
let docAdd: ReturnType<typeof vi.spyOn>;
let docRemove: ReturnType<typeof vi.spyOn>;
let winAdd: ReturnType<typeof vi.spyOn>;
let winRemove: ReturnType<typeof vi.spyOn>;

function listenerBalance(): { doc: number; win: number } {
  return {
    doc: docAdd.mock.calls.length - docRemove.mock.calls.length,
    win: winAdd.mock.calls.length - winRemove.mock.calls.length,
  };
}

function countSubscriptions() {
  return {
    subsPresentation: subsOf(usePresentation),
    subsGame: subsOf(useGameStore),
    subsSettings: subsOf(useSettings),
  };
}

function snapshotCounters(): Counters {
  const p = usePresentation.getState();
  const l = listenerBalance();
  return {
    timers: vi.getTimerCount(),
    queue: p.queue.length,
    current: p.current?.id ?? null,
    ...countSubscriptions(),
    docListeners: l.doc,
    winListeners: l.win,
    bodyChildren: document.body.childElementCount,
    fxStars: document.querySelectorAll('.fx-star').length,
    audioNodes: activeNodeCount(),
    fakeAudioLive: audio.liveNodes(),
    canvasMounts: fakeCanvas.mounts,
    canvasNodes: document.querySelectorAll('[data-testid="fake-canvas"]').length,
  };
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

const PLAY_LABELS = ['🎲 주사위 굴리기', '✅ 성공', '❌ 실패', '🔁 한 번 더 하기', '다음 ➡️', '🏆 결과 보기'];
const visibleButton = (name: string) => screen.queryByRole('button', { name });
// classList, not a `.stage--ceremony` selector: jsdom's selector cache can miss a class added later.
const inCeremony = () => document.querySelector('.game-stage')?.classList.contains('stage--ceremony') ?? false;

// Play one game from its first turn to the ceremony by pressing what a teacher would press.
function playToCeremony(game: number) {
  let clicks = 0;
  let verdict = game % 2 === 0; // alternate ✅ / ❌, starting differently per game
  let judged = 0;
  let idle = 0;
  while (!inCeremony()) {
    if (clicks >= MAX_CLICKS_PER_GAME || idle > MAX_IDLE_STEPS) {
      throw new Error(`game ${game} did not reach the ceremony (${clicks} clicks, ${idle} idle steps)`);
    }
    const judging = visibleButton('✅ 성공') !== null;
    let btn: HTMLElement | null = null;
    if (judging) {
      btn = visibleButton(verdict ? '✅ 성공' : '❌ 실패');
    } else {
      for (const name of PLAY_LABELS) {
        btn = visibleButton(name);
        if (btn) break;
      }
    }
    if (!btn) {
      advance(IDLE_STEP_MS); // beats still running: the controls are hidden until they end (HUD-03)
      idle++;
      continue;
    }
    fireEvent.click(btn);
    clicks++;
    if (judging) {
      judged++;
      // D-07: tap the page 500 ms into every other success beat (a child skipping the celebration).
      if (verdict && judged % 2 === 1) {
        advance(500);
        if (usePresentation.getState().current?.kind === 'stars') fireEvent.click(document.body);
      }
      verdict = !verdict;
    }
    advance(INPUT_LOCK_MS);
  }
  // The intro ends by itself; let every running sound end on the fake audio clock.
  advance(CEREMONY_INTRO_MS + 100);
  audio.advance(10);
}

function resetToSeed() {
  localStorage.clear();
  useGameStore.getState().reset();
  useSettings.setState({ ...DEFAULT_SETTINGS, defaultRounds: 1, boardSize: 16, failRule: 'noStar' });
  useSetupDraft.getState().reset();
  useSetupDraft.getState().patch({ targetJumps: 3, playOrder: 'sequential' });
  usePresentation.getState().reset(EMPTY_DISPLAYED, null);
  fakeCanvas.reset();
  const s = seedContent();
  useStore.setState({ version: s.version, categories: s.categories, missions: s.missions, events: s.events });
}

beforeEach(() => {
  resetToSeed();
  resetSharedInputLock();
  __resetSfxForTests();
  audio = installFakeAudio();
  docAdd = vi.spyOn(document, 'addEventListener');
  docRemove = vi.spyOn(document, 'removeEventListener');
  winAdd = vi.spyOn(window, 'addEventListener');
  winRemove = vi.spyOn(window, 'removeEventListener');
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  __resetSfxForTests();
  audio.uninstall();
  usePresentation.getState().reset(EMPTY_DISPLAYED, null);
  useGameStore.setState({ game: null, startBlockedReason: null });
  fakeCanvas.reset();
});

describe('STAB-01: 5 games in a row (jsdom)', () => {
  it('keeps timers, queue, subscriptions, listeners, DOM, audio nodes and the canvas constant over 5 games', async () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    const baseline = { ...countSubscriptions(), ...listenerBalance() };
    expect(screen.getByRole('button', { name: '게임 시작' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '게임 시작' }));
    await waitForCanvas(); // the lazy (fake) chunk resolves on real timers
    // The game's own opening beat (마지막 라운드!) was timed on real timers: let it end on them.
    await waitFor(() => expect(usePresentation.getState().busy).toBe(false), { timeout: 4000 });
    vi.useFakeTimers();
    // StrictMode runs the fake canvas's mount effect twice on its first (only) mount, so the mount
    // count is taken here and must never rise again; the canvas DOM node itself must stay the same.
    const mountsAtStart = fakeCanvas.mounts;
    expect(mountsAtStart).toBeLessThanOrEqual(2);
    const canvasNode = screen.getByTestId('fake-canvas');

    const snaps: Counters[] = [];
    for (let game = 1; game <= GAMES; game++) {
      if (game > 1) {
        fireEvent.click(screen.getByRole('button', { name: '🔁 다시 하기' }));
        expect(inCeremony()).toBe(false);
        advance(INPUT_LOCK_MS);
      }
      playToCeremony(game);
      expect(screen.getByRole('button', { name: '🔁 다시 하기' })).toBeInTheDocument();
      snaps.push(snapshotCounters());
      expect(screen.getByTestId('fake-canvas'), `game ${game}: same canvas node`).toBe(canvasNode);
    }

    // Every ceremony looks the same: nothing grows from game to game.
    const first = snaps[0];
    expect(first.queue).toBe(0);
    expect(first.current).toBeNull();
    expect(first.fxStars).toBe(0);
    expect(first.canvasMounts).toBe(mountsAtStart); // one canvas = one WebGL context, never remounted
    expect(first.canvasNodes).toBe(1);
    expect(first.audioNodes).toBe(MASTER_CHAIN_NODES);
    expect(first.fakeAudioLive).toBe(MASTER_CHAIN_NODES);
    for (let i = 1; i < snaps.length; i++) expect(snaps[i], `game ${i + 1} vs game 1`).toEqual(first);

    // 처음으로 → the setup screen: subscriptions and listeners are back to the baseline.
    fireEvent.click(screen.getByRole('button', { name: '처음으로' }));
    advance(INPUT_LOCK_MS);
    expect(screen.getByRole('button', { name: '게임 시작' })).toBeInTheDocument();
    expect({ ...countSubscriptions(), ...listenerBalance() }).toEqual(baseline);
    expect(document.querySelectorAll('.fx-star').length).toBe(0);
    expect(fakeCanvas.mounts).toBe(mountsAtStart);
  });
});

describe('STAB-01: 5 engine games', () => {
  it('5 random games through directGame leave no beat and no watchdog timer behind', () => {
    vi.useFakeTimers();
    const rng = mulberry32(20261024);
    let prev: GameState | null = null;
    for (let game = 1; game <= GAMES; game++) {
      const n = 2 + Math.floor(rng.next() * 7); // 2..8 players
      let g = makeGame({
        seed: game * 97,
        participants: Array.from({ length: n }, (_, i) => player(`p${i + 1}`, `P${i + 1}`, ANIMALS[i])),
        rules: { rounds: 1 + (game % 2), failRule: 'noStar' },
      });
      directGame(g, prev);
      let step = 0;
      while (g.phase !== 'gameOver') {
        if (step++ > 2000) throw new Error(`engine game ${game} did not end`);
        const before = g;
        g =
          g.phase === 'awaitingRoll'
            ? rollDice(g, rng)
            : g.phase === 'awaitingJudgement'
              ? judge(g, rng.next() < 0.6, rng)
              : advanceTurn(g);
        directGame(g, before);
        // Drain: every other step through the watchdogs (one beat at a time), else skipAll.
        if (step % 2 === 0) {
          act(() => {
            vi.runAllTimers();
          });
        } else {
          usePresentation.getState().skipAll();
        }
        expect(usePresentation.getState().busy).toBe(false);
      }
      const p = usePresentation.getState();
      expect(p.queue).toEqual([]);
      expect(p.current).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
      prev = g;
    }
  });
});
