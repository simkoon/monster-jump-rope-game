// src/game/sfx/useSfx.test.tsx — the beat → sound subscriber (Phase 8 08-08; AUDIO-01, D-08, D-19,
// D-20, D-21, D-23). jsdom + FakeAudio (installFakeAudio) + fake timers (Vitest fakes
// performance.now too, so the early-end / skip edge is deterministic).
import { StrictMode } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { usePresentation } from '../usePresentation';
import { EMPTY_DISPLAYED } from '../director/displayed';
import { successPlan } from '../director/successPlan';
import { useDirector } from '../director/useDirector';
import type { Beat, BeatSpec } from '../director/timeline';
import { useGameStore } from '../../harness/useGameStore';
import { useSettings } from '../../settings';
import { rollDice } from '../../engine/game';
import { boardWith, dice, makeGame } from '../../engine/testkit';
import sfx, { MASTER_CHAIN_NODES, __resetSfxForTests, activeNodeCount, activeVoiceCount } from './sfx';
import { installFakeAudio, type FakeAudioController } from '../../test/fakeAudio';
import { HOP_LEAD_SEC, scheduleBeat, SKIP_TOLERANCE_MS, useSfx } from './useSfx';

const rm = vi.hoisted(() => ({ reduced: false }));
vi.mock('../reducedMotion', () => ({ prefersReducedMotion: () => rm.reduced }));

const P = () => usePresentation.getState();

const STARS2: BeatSpec = { kind: 'stars', pid: 'p1', stars: 2, ms: 1900 };
const STARS1: BeatSpec = { kind: 'stars', pid: 'p1', stars: 1, ms: 1600 };
const HOP3: BeatSpec = { kind: 'hop', pid: 'p1', path: [1, 2, 3], by: 'dice', ms: 750 };
const DICE: BeatSpec = { kind: 'dice', pid: 'p1', face: 3, ms: 1000 };

function Host() {
  useSfx();
  return null;
}
function DirectedHost() {
  useDirector();
  useSfx();
  return null;
}

let audio: FakeAudioController;

// The first user gesture creates the context (D-21).
const gesture = () => fireEvent.pointerUp(document);
const tap = () => {
  gesture();
  vi.advanceTimersByTime(1000); // past the unlock throttle
};
const current = (): Beat => P().current!;
const playSpy = () => vi.spyOn(sfx, 'play');
const playedNames = (spy: ReturnType<typeof playSpy>) => spy.mock.calls.map((c) => c[0]);

beforeEach(() => {
  vi.useFakeTimers();
  rm.reduced = false;
  audio = installFakeAudio();
  useSettings.setState({ soundOn: true });
  useGameStore.setState({ game: null, startBlockedReason: null });
  P().reset(EMPTY_DISPLAYED, null);
});

afterEach(() => {
  cleanup();
  P().reset(EMPTY_DISPLAYED, null);
  useGameStore.setState({ game: null, startBlockedReason: null });
  useSettings.setState({ soundOn: true });
  __resetSfxForTests();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('D-21: the AudioContext only starts inside a user gesture', () => {
  it('no context exists before any gesture, even when a beat plays', () => {
    render(<Host />);
    P().play([STARS2]);
    expect(audio.contexts).toHaveLength(0);
    expect(activeVoiceCount()).toBe(0);
  });

  it('the first pointerup on document creates the context', () => {
    render(<Host />);
    gesture();
    expect(audio.contexts).toHaveLength(1);
  });

  it('touchend, click and keydown are gestures too', () => {
    render(<Host />);
    const unlock = vi.spyOn(sfx, 'unlock');
    fireEvent.touchEnd(document);
    vi.advanceTimersByTime(1000);
    fireEvent.click(document.body);
    vi.advanceTimersByTime(1000);
    fireEvent.keyDown(document.body, { key: 'a' });
    expect(unlock).toHaveBeenCalledTimes(3);
  });

  it('one physical tap (touchend + click in a row) unlocks once — the iOS ladder counts per gesture', () => {
    render(<Host />);
    const unlock = vi.spyOn(sfx, 'unlock');
    fireEvent.touchEnd(document);
    fireEvent.click(document.body);
    expect(unlock).toHaveBeenCalledTimes(1);
  });

  it('a tap on an interrupted (iOS) context calls resume() synchronously inside that gesture (WR-01)', () => {
    render(<Host />);
    tap();
    const ctx = audio.latest()!;
    ctx.state = 'interrupted';
    const before = ctx.resumeCalls;
    fireEvent.touchEnd(document);
    // Still inside the dispatch: no microtask has run, so a suspend().then(resume) would show 0.
    expect(ctx.resumeCalls).toBe(before + 1);
    expect(ctx.suspendCalls).toBe(0);
    expect(ctx.state).toBe('running');
  });

  it('with soundOn off a gesture creates no context', () => {
    useSettings.setState({ soundOn: false });
    render(<Host />);
    gesture();
    expect(audio.contexts).toHaveLength(0);
  });
});

describe('D-19: beat → sound mapping (scheduled when a beat becomes current)', () => {
  it('a ⭐2 stars beat: success2 at landMs, ding at flyToMs, both in the beat group', () => {
    render(<Host />);
    tap();
    const spy = playSpy();
    P().play([STARS2]);
    const id = current().id;
    const plan = successPlan(2, 1900, false);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith('success2', { group: id, delaySec: plan.landMs / 1000 });
    expect(spy).toHaveBeenCalledWith('ding', { group: id, delaySec: plan.flyToMs / 1000 });
    expect(activeVoiceCount()).toBeGreaterThan(0);
  });

  it('a ⭐3 beat plays success3, a ⭐1 beat success1', () => {
    const spy = playSpy();
    scheduleBeat({ kind: 'stars', pid: 'p1', stars: 3, ms: 2200, id: 901 }, false);
    scheduleBeat({ ...STARS1, id: 902 }, false);
    expect(playedNames(spy)).toEqual(['success3', 'ding', 'success1', 'ding']);
  });

  it('D-08 reduced motion: the jingle starts at 0 and the ding at 600 ms', () => {
    const spy = playSpy();
    scheduleBeat({ kind: 'stars', pid: 'p1', stars: 2, ms: 1200, id: 903 }, true);
    expect(spy).toHaveBeenCalledWith('success2', { group: 903, delaySec: 0 });
    expect(spy).toHaveBeenCalledWith('ding', { group: 903, delaySec: 0.6 });
  });

  it('a hop over 3 tiles schedules 3 hop ticks at (k + 1)·seg − 0.03 s', () => {
    const spy = playSpy();
    scheduleBeat({ ...HOP3, id: 904 }, false);
    expect(spy).toHaveBeenCalledTimes(3);
    const seg = 0.75 / 3;
    spy.mock.calls.forEach(([name, opts], k) => {
      expect(name).toBe('hop');
      expect(opts?.group).toBe(904);
      expect(opts?.delaySec).toBeCloseTo((k + 1) * seg - HOP_LEAD_SEC, 6);
    });
  });

  it('dice, miss, startBonus play at the beat start', () => {
    const spy = playSpy();
    scheduleBeat({ ...DICE, id: 905 }, false);
    scheduleBeat({ kind: 'miss', pid: 'p1', retry: false, ms: 700, id: 906 }, false);
    scheduleBeat({ kind: 'startBonus', pid: 'p1', stars: 1, ms: 800, id: 907 }, false);
    expect(spy.mock.calls).toEqual([
      ['dice', { group: 905 }],
      ['miss', { group: 906 }],
      ['startBonus', { group: 907 }],
    ]);
  });

  it('event: lucky → eventBonus, trap → eventTrap (isLuckyEvent)', () => {
    const spy = playSpy();
    const ev = (eff: 'forward' | 'backward' | 'extra', label: '' | '보너스' | '함정', suppressed = false): Beat => ({
      kind: 'event',
      pid: 'p1',
      eff,
      steps: 2,
      suppressed,
      name: 'x',
      label,
      ms: 1000,
      id: 910,
    });
    scheduleBeat(ev('forward', ''), false);
    scheduleBeat(ev('backward', ''), false);
    scheduleBeat(ev('backward', '보너스'), false);
    scheduleBeat(ev('forward', '함정'), false);
    scheduleBeat(ev('extra', '', true), false);
    expect(playedNames(spy)).toEqual(['eventBonus', 'eventTrap', 'eventBonus', 'eventTrap', 'eventTrap']);
  });

  it('finalRound, preview and win play nothing', () => {
    const spy = playSpy();
    scheduleBeat({ kind: 'finalRound', ms: 1500, id: 911 }, false);
    scheduleBeat({ kind: 'preview', pid: 'p1', path: [1, 2], ms: 500, id: 912 }, false);
    scheduleBeat({ kind: 'win', winners: ['p1'], animals: ['bear'], ms: 1500, id: 913 }, false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('each beat of a queue plays when it becomes current', () => {
    render(<Host />);
    tap();
    const spy = playSpy();
    P().play([DICE, HOP3, STARS2]);
    expect(playedNames(spy)).toEqual(['dice']);
    vi.advanceTimersByTime(1000);
    P().completeBeat(current().id);
    expect(playedNames(spy)).toEqual(['dice', 'hop', 'hop', 'hop']);
    vi.advanceTimersByTime(750);
    P().completeBeat(current().id);
    expect(playedNames(spy)).toEqual(['dice', 'hop', 'hop', 'hop', 'success2', 'ding']);
  });

  it('sound never ends a beat (the Banner timer / watchdog own completion)', () => {
    render(<Host />);
    tap();
    P().play([STARS2]);
    const id = current().id;
    vi.advanceTimersByTime(1899);
    expect(current().id).toBe(id);
  });
});

describe('D-19: skip vs natural end', () => {
  it('a stars beat skipped at 300 ms stops its group: nothing of it starts later, nodes back to the master chain', () => {
    render(<Host />);
    tap();
    P().play([STARS2]);
    const id = current().id;
    const stop = vi.spyOn(sfx, 'stopGroup');
    vi.advanceTimersByTime(300);
    audio.advance(0.3);
    P().completeBeat(id); // a tap-to-skip
    expect(stop).toHaveBeenCalledWith(id);
    expect(activeVoiceCount()).toBe(0);
    audio.advance(3);
    expect(activeNodeCount()).toBe(MASTER_CHAIN_NODES);
    expect(audio.liveNodes()).toBe(MASTER_CHAIN_NODES);
  });

  it('a skip while the jingle plays fades it; after onended only the master chain is left', () => {
    render(<Host />);
    tap();
    P().play([STARS1]);
    const id = current().id;
    vi.advanceTimersByTime(800);
    audio.advance(0.8); // the ⭐1 jingle started at 0.56 s
    expect(activeVoiceCount()).toBeGreaterThan(0);
    P().completeBeat(id);
    audio.advance(0.1); // 60 ms fade + stop
    expect(activeVoiceCount()).toBe(0);
    expect(activeNodeCount()).toBe(MASTER_CHAIN_NODES);
  });

  it('a beat that ends on time lets its tails ring (the ding is not stopped)', () => {
    render(<Host />);
    tap();
    P().play([STARS1]);
    const id = current().id;
    const stop = vi.spyOn(sfx, 'stopGroup');
    vi.advanceTimersByTime(1600);
    audio.advance(1.6);
    P().completeBeat(id);
    expect(stop).not.toHaveBeenCalled();
    expect(activeVoiceCount()).toBeGreaterThan(0); // the ding (from 1.472 s, 0.4 s long)
  });

  it(`an end within ${SKIP_TOLERANCE_MS} ms of the beat length counts as on time`, () => {
    render(<Host />);
    tap();
    P().play([STARS1]);
    const stop = vi.spyOn(sfx, 'stopGroup');
    vi.advanceTimersByTime(1600 - SKIP_TOLERANCE_MS);
    P().completeBeat(current().id);
    expect(stop).not.toHaveBeenCalled();
  });

  it('skipAll (지금 끝내기) mid-beat stops the beat group', () => {
    render(<Host />);
    tap();
    P().play([STARS2]);
    const id = current().id;
    const stop = vi.spyOn(sfx, 'stopGroup');
    vi.advanceTimersByTime(200);
    P().skipAll();
    expect(stop).toHaveBeenCalledWith(id);
  });
});

describe('StrictMode and cleanup (D-23)', () => {
  it('a StrictMode double mount plays each beat once', () => {
    render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );
    tap();
    const spy = playSpy();
    P().play([STARS2]);
    expect(playedNames(spy)).toEqual(['success2', 'ding']);
  });

  it('unmount removes every document / window listener and every store subscription it added', () => {
    const TYPES = ['pointerup', 'touchend', 'click', 'keydown', 'visibilitychange'];
    const net: Record<string, number> = {};
    for (const target of [document, window] as EventTarget[]) {
      const add = target.addEventListener.bind(target);
      const remove = target.removeEventListener.bind(target);
      vi.spyOn(target, 'addEventListener').mockImplementation((type: string, l, o?) => {
        net[type] = (net[type] ?? 0) + 1;
        add(type, l, o);
      });
      vi.spyOn(target, 'removeEventListener').mockImplementation((type: string, l, o?) => {
        net[type] = (net[type] ?? 0) - 1;
        remove(type, l, o);
      });
    }
    let subs = 0;
    for (const store of [usePresentation, useSettings, useGameStore] as const) {
      const orig = store.subscribe;
      vi.spyOn(store, 'subscribe').mockImplementation(((l: never) => {
        subs++;
        const un = orig(l);
        return () => {
          subs--;
          un();
        };
      }) as never);
    }
    const { unmount } = render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );
    expect(subs).toBe(3);
    for (const t of TYPES) expect(net[t]).toBe(1);
    unmount();
    expect(subs).toBe(0);
    for (const t of TYPES) expect(net[t] ?? 0).toBe(0);
  });

  it('after unmount a beat schedules nothing and a gesture creates no context', () => {
    const { unmount } = render(<Host />);
    unmount();
    const spy = playSpy();
    gesture();
    P().play([STARS2]);
    expect(spy).not.toHaveBeenCalled();
    expect(audio.contexts).toHaveLength(0);
  });
});

describe('D-20: soundOn is read live', () => {
  it('soundOn off → a stars beat creates zero voice nodes', () => {
    render(<Host />);
    tap();
    const ctx = audio.latest()!;
    const before = ctx.created.length;
    useSettings.getState().setSoundOn(false);
    P().play([STARS2]);
    expect(ctx.created.length).toBe(before);
    expect(activeVoiceCount()).toBe(0);
  });

  it('switching off mid-beat stops everything; switching back on plays the next beat', () => {
    render(<Host />);
    tap();
    P().play([STARS2, STARS1]);
    expect(activeVoiceCount()).toBeGreaterThan(0);
    useSettings.getState().setSoundOn(false);
    expect(activeVoiceCount()).toBe(0);
    useSettings.getState().setSoundOn(true);
    vi.advanceTimersByTime(1900);
    P().completeBeat(current().id);
    expect(current()).toMatchObject({ kind: 'stars', stars: 1 });
    expect(activeVoiceCount()).toBeGreaterThan(0);
  });

  it('mounting with soundOn already off keeps the engine disabled', () => {
    useSettings.setState({ soundOn: false });
    render(<Host />);
    sfx.unlock(); // e.g. the toggle on another path — still silent while off
    P().play([STARS2]);
    expect(activeVoiceCount()).toBe(0);
  });
});

describe('D-21: page visibility', () => {
  let state: DocumentVisibilityState = 'visible';
  beforeEach(() => {
    state = 'visible';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  });
  afterEach(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  });

  it('hidden → stopAll(0); visible again → resume', () => {
    render(<Host />);
    tap();
    P().play([STARS2]);
    const stopAll = vi.spyOn(sfx, 'stopAll');
    const resume = vi.spyOn(sfx, 'resume');
    state = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(stopAll).toHaveBeenCalledWith(0);
    expect(activeVoiceCount()).toBe(0);
    state = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(resume).toHaveBeenCalledTimes(1);
  });
});

describe('D-08: reduced-motion dice from the engine log', () => {
  const game = () => makeGame({ board: boardWith(20), rules: { failRule: 'noStar' } });

  it('a rolled event plays dice once although its 0 ms dice beat never becomes current', () => {
    rm.reduced = true;
    useGameStore.setState({ game: game() });
    render(<DirectedHost />);
    tap();
    const spy = playSpy();
    const g = useGameStore.getState().game!;
    useGameStore.setState({ game: rollDice(g, dice(3)) });
    expect(playedNames(spy).filter((n) => n === 'dice')).toHaveLength(1);
  });

  it('with motion on the dice sound comes from the dice beat only (once)', () => {
    useGameStore.setState({ game: game() });
    render(<DirectedHost />);
    tap();
    const spy = playSpy();
    const g = useGameStore.getState().game!;
    useGameStore.setState({ game: rollDice(g, dice(3)) });
    expect(current().kind).toBe('dice');
    expect(playedNames(spy).filter((n) => n === 'dice')).toHaveLength(1);
  });

  it('a discontinuous engine change (new game) plays no dice', () => {
    rm.reduced = true;
    render(<Host />);
    tap();
    const spy = playSpy();
    useGameStore.setState({ game: rollDice(game(), dice(3)) });
    expect(spy).not.toHaveBeenCalled();
  });
});
