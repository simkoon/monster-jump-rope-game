// src/game/sfx/sfx.test.ts — Web Audio engine on a FakeAudioContext (AUDIO-01, D-17, D-21, D-23).
import { describe, it, expect, afterEach, vi } from 'vitest';
import license from '../../../public/assets/cc0/LICENSE.md?raw';
import sfx, {
  FADE_SEC,
  LIMITER,
  MASTER_CHAIN_NODES,
  MASTER_GAIN,
  MAX_RECREATE,
  __resetSfxForTests,
  activeNodeCount,
  activeVoiceCount,
  play,
  resume,
  setEnabled,
  stopAll,
  stopGroup,
  unlock,
} from './sfx';
import { SFX_RECIPES, recipeLengthSec } from './recipes';
import {
  FakeBufferSource,
  FakeCompressor,
  FakeGain,
  FakeOscillator,
  installFakeAudio,
  type FakeAudioContext,
  type FakeNode,
} from '../../test/fakeAudio';

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

afterEach(() => {
  __resetSfxForTests();
  vi.unstubAllGlobals();
});

function setup() {
  const audio = installFakeAudio();
  unlock();
  const ctx = audio.latest()!;
  const master = ctx.created.find((n): n is FakeGain => n instanceof FakeGain)!;
  const limiter = ctx.created.find((n): n is FakeCompressor => n instanceof FakeCompressor)!;
  return { audio, ctx, master, limiter };
}

describe('sfx without Web Audio (jsdom, old browser)', () => {
  it('every call is a silent no-op', () => {
    expect((globalThis as { AudioContext?: unknown }).AudioContext).toBeUndefined();
    expect(() => unlock()).not.toThrow();
    expect(() => resume()).not.toThrow();
    expect(play('success3', { group: 1 })).toBe(0);
    expect(() => stopGroup(1)).not.toThrow();
    expect(() => stopAll()).not.toThrow();
    expect(() => setEnabled(false)).not.toThrow();
    expect(activeVoiceCount()).toBe(0);
    expect(activeNodeCount()).toBe(0);
  });

  it('a throwing constructor is swallowed too', () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('NotAllowedError');
        }
      },
    );
    expect(() => unlock()).not.toThrow();
    expect(play('dice')).toBe(0);
  });
});

describe('sfx graph and lifecycle (D-21)', () => {
  it('nothing is created before unlock (only gestures call it)', () => {
    const audio = installFakeAudio();
    expect(play('dice')).toBe(0);
    expect(audio.contexts).toHaveLength(0);
  });

  it('unlock creates exactly one interactive context, idempotent', () => {
    const { audio, ctx } = setup();
    unlock();
    unlock();
    expect(audio.contexts).toHaveLength(1);
    expect(ctx.options).toEqual({ latencyHint: 'interactive' });
  });

  it('wires master gain 0.5 → limiter → destination', () => {
    const { ctx, master, limiter } = setup();
    expect(MASTER_GAIN).toBe(0.5);
    expect(master.gain.value).toBe(0.5);
    expect([...master.outputs]).toEqual([limiter]);
    expect([...limiter.outputs]).toEqual([ctx.destination]);
    expect(LIMITER).toEqual({ threshold: -10, knee: 0, ratio: 12, attack: 0.003, release: 0.15 });
    expect(limiter.threshold.value).toBe(-10);
    expect(limiter.knee.value).toBe(0);
    expect(limiter.ratio.value).toBe(12);
    expect(limiter.attack.value).toBe(0.003);
    expect(limiter.release.value).toBe(0.15);
    expect(activeNodeCount()).toBe(MASTER_CHAIN_NODES);
    expect(MASTER_CHAIN_NODES).toBe(2);
  });

  it('a suspended new context is resumed inside the same gesture', () => {
    const audio = installFakeAudio();
    const Orig = (globalThis as unknown as { AudioContext: new (o?: unknown) => FakeAudioContext }).AudioContext;
    vi.stubGlobal(
      'AudioContext',
      class extends Orig {
        constructor(o?: unknown) {
          super(o);
          this.state = 'suspended';
        }
      },
    );
    unlock();
    const ctx = audio.latest()!;
    expect(ctx.resumeCalls).toBe(1);
    expect(ctx.state).toBe('running');
  });

  it('builds one deterministic noise buffer per context and reuses it', () => {
    const { ctx } = setup();
    play('dice');
    play('dice');
    expect(ctx.buffers).toHaveLength(1);
    const data = ctx.buffers[0].getChannelData(0);
    expect(ctx.buffers[0].length).toBe(ctx.sampleRate); // 1 s
    expect(data.some((x) => x !== 0)).toBe(true);
    expect(data.every((x) => x >= -1 && x <= 1)).toBe(true);
    const sources = ctx.created.filter((n): n is FakeBufferSource => n instanceof FakeBufferSource);
    expect(sources).toHaveLength(14);
    expect(new Set(sources.map((s) => s.buffer)).size).toBe(1);

    __resetSfxForTests();
    const again = installFakeAudio();
    unlock();
    play('dice');
    expect(Array.from(again.latest()!.buffers[0].getChannelData(0).slice(0, 64))).toEqual(Array.from(data.slice(0, 64)));
  });
});

describe('sfx play / schedule / cleanup (D-23)', () => {
  it('play("success3", { group, delaySec }) starts every voice at currentTime + delay + offset', () => {
    const { ctx, audio } = setup();
    ctx.currentTime = 1;
    const n = play('success3', { group: 7, delaySec: 0.77 });
    const recipe = SFX_RECIPES.success3;
    expect(n).toBe(recipe.length);
    expect(activeVoiceCount()).toBe(recipe.length);
    const whens = audio.started.map((s) => s.when);
    expect(whens).toHaveLength(recipe.length);
    recipe.forEach((v, i) => expect(whens[i]).toBeCloseTo(1 + 0.77 + v.at, 9));
  });

  it('each voice: envelope 0.0001 → peak in 5 ms → exponential to 0.0001 at dur, into the master', () => {
    const { ctx, master } = setup();
    play('hop');
    const osc = ctx.created.find((n): n is FakeOscillator => n instanceof FakeOscillator)!;
    const v = SFX_RECIPES.hop[0];
    if (v.kind !== 'tone') throw new Error('hop is a tone');
    expect(osc.type).toBe(v.wave);
    const env = [...osc.outputs][0] as FakeGain;
    expect(env).toBeInstanceOf(FakeGain);
    expect([...env.outputs]).toEqual([master]);
    expect(env.gain.events).toEqual([
      { type: 'set', value: 0.0001, time: 0 },
      { type: 'linear', value: v.peak, time: 0.005 },
      { type: 'exp', value: 0.0001, time: v.dur },
    ]);
    expect(osc.frequency.events[0]).toEqual({ type: 'set', value: v.f0, time: 0 });
    expect(osc.frequency.events[1]).toEqual({ type: 'exp', value: v.f1, time: v.dur });
  });

  it('miss voices pass a low-pass filter (≤ 1.2 kHz)', () => {
    const { ctx } = setup();
    play('miss');
    const filters = ctx.created.filter((n) => n.kind === 'biquad') as unknown as { type: string; frequency: { value: number } }[];
    expect(filters).toHaveLength(2);
    for (const f of filters) {
      expect(f.type).toBe('lowpass');
      expect(f.frequency.value).toBeLessThanOrEqual(1200);
    }
  });

  it('after the sources end, every voice node is disconnected (master chain only)', () => {
    const { ctx, audio } = setup();
    play('success3', { group: 1 });
    play('dice', { group: 2 });
    play('eventTrap'); // vibrato: 2 sources in one voice
    play('miss');
    expect(activeNodeCount()).toBeGreaterThan(MASTER_CHAIN_NODES);
    expect(audio.liveNodes()).toBe(activeNodeCount());

    audio.advance(0.1); // part-way: some short dice bursts are done
    expect(activeVoiceCount()).toBeGreaterThan(0);

    audio.advance(5);
    expect(activeVoiceCount()).toBe(0);
    expect(activeNodeCount()).toBe(MASTER_CHAIN_NODES);
    expect(audio.liveNodes()).toBe(MASTER_CHAIN_NODES);
    // Every node except the master gain and the limiter (the first two created) is disconnected.
    const voiceNodes: FakeNode[] = ctx.created.slice(MASTER_CHAIN_NODES);
    expect(voiceNodes.length).toBeGreaterThan(0);
    for (const n of voiceNodes) expect(n.disconnected).toBe(true);
    expect(ctx.created[0].disconnected).toBe(false);
    expect(ctx.created[1].disconnected).toBe(false);
  });

  it('five games of sounds leave no nodes behind', () => {
    const { audio } = setup();
    for (let g = 0; g < 5; g++) {
      for (const name of Object.keys(SFX_RECIPES) as (keyof typeof SFX_RECIPES)[]) play(name, { group: g });
      audio.advance(recipeLengthSec('fanfare') + 1);
    }
    expect(activeVoiceCount()).toBe(0);
    expect(audio.liveNodes()).toBe(MASTER_CHAIN_NODES);
  });

  it('stopGroup cancels not-yet-started voices and fades playing ones; other groups keep playing', () => {
    const { ctx, audio } = setup();
    play('fanfare', { group: 7 }); // starts now
    play('success1', { group: 7, delaySec: 0.5 }); // not yet started
    play('fanfare', { group: 8 });
    const g8 = SFX_RECIPES.fanfare.length;
    const before = activeVoiceCount();
    expect(before).toBe(g8 * 2 + SFX_RECIPES.success1.length);

    ctx.currentTime = 0.2;
    stopGroup(7);
    // Scheduled-only voices are gone at once; group 8 untouched.
    expect(activeVoiceCount()).toBeLessThanOrEqual(g8 * 2);
    // Playing group-7 voices ramp to silence over FADE_SEC and stop right after.
    const g7Started = ctx.created.filter(
      (n): n is FakeOscillator => n instanceof FakeOscillator && n.startedAt !== null && n.startedAt <= 0.2 && n.stoppedAt !== null && n.stoppedAt <= 0.2 + FADE_SEC + 0.02,
    );
    expect(g7Started.length).toBeGreaterThan(0);
    const env = [...g7Started[0].outputs][0] as FakeGain;
    const ramp = env.gain.events.filter((e) => e.type !== 'cancel').at(-1)!;
    expect(ramp.value).toBeLessThanOrEqual(0.0001);
    expect(ramp.time).toBeCloseTo(0.2 + FADE_SEC, 9);

    audio.advance(FADE_SEC + 0.05);
    expect(activeVoiceCount()).toBeGreaterThan(0); // group 8 still sounding (fanfare ≈ 1.4 s)
    audio.advance(3);
    expect(activeVoiceCount()).toBe(0);
    expect(audio.liveNodes()).toBe(MASTER_CHAIN_NODES);
  });

  it('stopAll stops everything; fadeSec 0 cleans up at once', () => {
    const { audio } = setup();
    play('fanfare', { group: 1 });
    play('success3', { group: 2, delaySec: 1 });
    stopAll(0);
    expect(activeVoiceCount()).toBe(0);
    expect(audio.liveNodes()).toBe(MASTER_CHAIN_NODES);
  });

  it('play returns 0 for a context that is not running (no backlog burst on resume)', () => {
    const { ctx } = setup();
    ctx.state = 'suspended';
    expect(play('dice')).toBe(0);
    expect(activeVoiceCount()).toBe(0);
  });
});

describe('sfx hidden page (D-23, WR-04)', () => {
  afterEach(() => {
    delete (document as unknown as { visibilityState?: string }).visibilityState; // back to the jsdom getter
  });

  it('play() is a no-op while the page is hidden, and plays again once visible', () => {
    const { audio } = setup();
    let state: DocumentVisibilityState = 'hidden';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    expect(play('fanfare', { group: 'ceremony-intro-1' })).toBe(0);
    expect(play('hop')).toBe(0);
    expect(activeVoiceCount()).toBe(0);
    expect(audio.liveNodes()).toBe(MASTER_CHAIN_NODES);
    state = 'visible';
    expect(play('hop')).toBe(1);
  });
});

describe('sfx setEnabled (D-20)', () => {
  it('off: master ramps to 0, everything stops, later play creates no nodes; on: back to MASTER_GAIN', () => {
    const { ctx, master, audio } = setup();
    play('fanfare', { group: 1 });
    ctx.currentTime = 0.3;
    setEnabled(false);
    expect(master.gain.events.at(-1)).toEqual({ type: 'linear', value: 0, time: 0.3 + FADE_SEC });

    const created = ctx.created.length;
    expect(play('success3')).toBe(0);
    expect(ctx.created.length).toBe(created);
    audio.advance(FADE_SEC + 0.05);
    expect(activeVoiceCount()).toBe(0);
    expect(audio.liveNodes()).toBe(MASTER_CHAIN_NODES);

    setEnabled(true);
    expect(master.gain.events.at(-1)).toEqual({ type: 'linear', value: MASTER_GAIN, time: ctx.currentTime + FADE_SEC });
    expect(play('hop')).toBe(1);
  });

  it('disabled before unlock: the new master starts silent', () => {
    const audio = installFakeAudio();
    setEnabled(false);
    unlock();
    const master = audio.latest()!.created.find((n): n is FakeGain => n instanceof FakeGain)!;
    expect(master.gain.value).toBe(0);
    expect(play('dice')).toBe(0);
  });
});

describe('sfx resume / iOS recovery (D-21)', () => {
  it('resume() retries a suspended context and swallows rejections', async () => {
    const { ctx } = setup();
    ctx.state = 'suspended';
    resume();
    expect(ctx.resumeCalls).toBeGreaterThanOrEqual(1);
    expect(ctx.state).toBe('running');

    ctx.state = 'interrupted';
    ctx.resume = () => Promise.reject(new Error('NotAllowedError'));
    expect(() => resume()).not.toThrow();
    await flush();
  });

  it('a stuck / interrupted context is resumed on the next gesture, then recreated (≤ MAX_RECREATE)', async () => {
    const { audio, ctx } = setup();
    expect(MAX_RECREATE).toBe(3);
    ctx.resumeWorks = false;
    ctx.state = 'interrupted';
    const before = ctx.resumeCalls;

    unlock(); // gesture 1: resume() inside the gesture
    await flush();
    expect(ctx.suspendCalls).toBe(0);
    expect(ctx.resumeCalls).toBe(before + 1);
    expect(audio.contexts).toHaveLength(1);

    unlock(); // gesture 2: still not running → close + recreate
    await flush();
    expect(ctx.closeCalls).toBe(1);
    expect(audio.contexts).toHaveLength(2);
    expect(audio.latest()!.state).toBe('running');
    expect(audio.liveNodes()).toBe(MASTER_CHAIN_NODES); // the old master chain is disconnected
    expect(play('hop')).toBe(1);
  });

  it('the gesture calls resume() synchronously, not from a promise callback (WR-01, WebKit)', () => {
    const { ctx } = setup();
    ctx.state = 'interrupted';
    const before = ctx.resumeCalls;
    unlock();
    // No await: a resume() chained after suspend() would only run in a later microtask.
    expect(ctx.resumeCalls).toBe(before + 1);
    expect(ctx.suspendCalls).toBe(0);
    expect(ctx.state).toBe('running');
  });

  it('a later gesture never suspends a fresh context whose own resume() is still pending (WR-01)', () => {
    const { ctx } = setup();
    ctx.state = 'suspended'; // e.g. create()'s resume() has not settled yet
    unlock();
    expect(ctx.suspendCalls).toBe(0);
  });

  it('recreates at most MAX_RECREATE times, never throws', async () => {
    const audio = installFakeAudio();
    const Orig = (globalThis as unknown as { AudioContext: new (o?: unknown) => FakeAudioContext }).AudioContext;
    vi.stubGlobal(
      'AudioContext',
      class extends Orig {
        constructor(o?: unknown) {
          super(o);
          this.state = 'interrupted';
          this.resumeWorks = false;
        }
      },
    );
    for (let i = 0; i < 20; i++) {
      expect(() => unlock()).not.toThrow();
      await flush();
    }
    expect(audio.contexts).toHaveLength(1 + MAX_RECREATE);
    expect(play('dice')).toBe(0); // never running → silent
  });

  it('a closed context is recreated on the next gesture', () => {
    const { audio, ctx } = setup();
    ctx.state = 'closed';
    unlock();
    expect(audio.contexts).toHaveLength(2);
  });
});

describe('sfx default export + CC0 notice (D-17)', () => {
  it('bundles the one interface', () => {
    expect(Object.keys(sfx).sort()).toEqual(
      ['activeNodeCount', 'activeVoiceCount', 'play', 'resume', 'setEnabled', 'stopAll', 'stopGroup', 'unlock'].sort(),
    );
  });

  it('LICENSE.md states the project-created CC0 sound notice', () => {
    expect(license).toContain('Sound effects: project-created (Web Audio synthesis), CC0 1.0');
  });
});
