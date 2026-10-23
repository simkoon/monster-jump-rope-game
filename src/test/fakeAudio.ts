// src/test/fakeAudio.ts — a recording FakeAudioContext for jsdom tests (Phase 8 D-21, D-23).
// jsdom has no Web Audio. installFakeAudio() stubs the global AudioContext with a fake whose nodes
// record connect / disconnect / start / stop and every AudioParam automation call, so sfx tests can
// assert graph wiring, schedule times and that every voice node is disconnected after it ends.
// Shared by 08-06 (sfx engine), 08-08 (useSfx / SoundToggle), 08-10 and 08-11 (soak).
//
// Time is manual: sources do not end on their own. advance(sec) moves every context's clock and
// fires onended for each source whose stop time has been reached (once per source).
import { vi } from 'vitest';

export interface ParamEvent {
  type: 'set' | 'linear' | 'exp' | 'cancel' | 'target';
  value?: number;
  time: number;
}

export class FakeParam {
  value: number;
  readonly events: ParamEvent[] = [];
  constructor(value = 0) {
    this.value = value;
  }
  setValueAtTime(value: number, time: number): this {
    this.events.push({ type: 'set', value, time });
    this.value = value;
    return this;
  }
  linearRampToValueAtTime(value: number, time: number): this {
    this.events.push({ type: 'linear', value, time });
    this.value = value;
    return this;
  }
  exponentialRampToValueAtTime(value: number, time: number): this {
    this.events.push({ type: 'exp', value, time });
    this.value = value;
    return this;
  }
  setTargetAtTime(value: number, time: number): this {
    this.events.push({ type: 'target', value, time });
    this.value = value;
    return this;
  }
  cancelScheduledValues(time: number): this {
    this.events.push({ type: 'cancel', time });
    return this;
  }
  // The last ramp / set target value (what the param is heading to).
  get lastValue(): number | undefined {
    for (let i = this.events.length - 1; i >= 0; i--) {
      const e = this.events[i];
      if (e.value !== undefined) return e.value;
    }
    return undefined;
  }
}

export class FakeNode {
  readonly ctx: FakeAudioContext;
  readonly kind: string;
  readonly outputs = new Set<FakeNode | FakeParam>();
  disconnected = false;
  constructor(ctx: FakeAudioContext, kind: string, track = true) {
    this.ctx = ctx;
    this.kind = kind;
    if (track) {
      ctx.live.add(this);
      ctx.created.push(this);
    }
  }
  connect<T extends FakeNode | FakeParam>(dest: T): T {
    this.outputs.add(dest);
    return dest;
  }
  disconnect(): void {
    this.outputs.clear();
    this.disconnected = true;
    this.ctx.live.delete(this);
  }
}

export class FakeGain extends FakeNode {
  readonly gain = new FakeParam(1);
  constructor(ctx: FakeAudioContext) {
    super(ctx, 'gain');
  }
}

export class FakeBiquad extends FakeNode {
  type = 'lowpass';
  readonly frequency = new FakeParam(350);
  readonly Q = new FakeParam(1);
  readonly gain = new FakeParam(0);
  constructor(ctx: FakeAudioContext) {
    super(ctx, 'biquad');
  }
}

export class FakeCompressor extends FakeNode {
  readonly threshold = new FakeParam(-24);
  readonly knee = new FakeParam(30);
  readonly ratio = new FakeParam(12);
  readonly attack = new FakeParam(0.003);
  readonly release = new FakeParam(0.25);
  readonly reduction = 0;
  constructor(ctx: FakeAudioContext) {
    super(ctx, 'compressor');
  }
}

export class FakeSource extends FakeNode {
  onended: (() => void) | null = null;
  startedAt: number | null = null;
  startOffset = 0;
  stoppedAt: number | null = null;
  ended = false;
  start(when = 0, offset = 0): void {
    if (this.startedAt !== null) throw new Error('InvalidStateError: start called twice');
    this.startedAt = when;
    this.startOffset = offset;
    this.ctx.started.push({ node: this, when });
  }
  stop(when = 0): void {
    if (this.startedAt === null) throw new Error('InvalidStateError: stop before start');
    this.stoppedAt = when;
  }
  // Fires onended once when the clock reaches the stop time (called by advance()).
  tick(now: number): void {
    if (this.ended || this.stoppedAt === null || now < this.stoppedAt) return;
    this.ended = true;
    this.onended?.();
  }
}

export class FakeOscillator extends FakeSource {
  type = 'sine';
  readonly frequency = new FakeParam(440);
  readonly detune = new FakeParam(0);
  constructor(ctx: FakeAudioContext) {
    super(ctx, 'oscillator');
  }
}

export class FakeBufferSource extends FakeSource {
  buffer: FakeBuffer | null = null;
  readonly playbackRate = new FakeParam(1);
  constructor(ctx: FakeAudioContext) {
    super(ctx, 'bufferSource');
  }
}

export class FakeBuffer {
  readonly numberOfChannels: number;
  readonly length: number;
  readonly sampleRate: number;
  private readonly data: Float32Array[];
  constructor(channels: number, length: number, sampleRate: number) {
    this.numberOfChannels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.data = Array.from({ length: channels }, () => new Float32Array(length));
  }
  get duration(): number {
    return this.length / this.sampleRate;
  }
  getChannelData(ch: number): Float32Array {
    return this.data[ch];
  }
}

export class FakeAudioContext {
  state: string = 'running';
  currentTime = 0;
  readonly sampleRate = 48000;
  readonly options: unknown;
  readonly live = new Set<FakeNode>();
  readonly created: FakeNode[] = [];
  readonly started: { node: FakeSource; when: number }[] = [];
  readonly buffers: FakeBuffer[] = [];
  readonly destination: FakeNode;
  resumeCalls = 0;
  suspendCalls = 0;
  closeCalls = 0;
  // false = resume() resolves but the context stays where it is (iOS 'interrupted' / stuck).
  resumeWorks = true;
  constructor(options?: unknown) {
    this.options = options;
    this.destination = new FakeNode(this, 'destination', false);
  }
  createGain(): FakeGain {
    return new FakeGain(this);
  }
  createOscillator(): FakeOscillator {
    return new FakeOscillator(this);
  }
  createBufferSource(): FakeBufferSource {
    return new FakeBufferSource(this);
  }
  createBiquadFilter(): FakeBiquad {
    return new FakeBiquad(this);
  }
  createDynamicsCompressor(): FakeCompressor {
    return new FakeCompressor(this);
  }
  createBuffer(channels: number, length: number, sampleRate: number): FakeBuffer {
    const b = new FakeBuffer(channels, length, sampleRate);
    this.buffers.push(b);
    return b;
  }
  resume(): Promise<void> {
    this.resumeCalls++;
    if (this.state === 'closed') return Promise.reject(new Error('InvalidStateError: closed'));
    if (this.resumeWorks) this.state = 'running';
    return Promise.resolve();
  }
  suspend(): Promise<void> {
    this.suspendCalls++;
    if (this.state === 'closed') return Promise.reject(new Error('InvalidStateError: closed'));
    this.state = 'suspended';
    return Promise.resolve();
  }
  close(): Promise<void> {
    this.closeCalls++;
    this.state = 'closed';
    return Promise.resolve();
  }
  // Move the clock forward and end every source whose stop time is reached.
  advance(sec: number): void {
    this.currentTime += sec;
    for (const n of [...this.created]) if (n instanceof FakeSource) n.tick(this.currentTime);
  }
}

export interface FakeAudioController {
  readonly contexts: FakeAudioContext[]; // every context constructed, in order
  readonly started: { node: FakeSource; when: number }[]; // every source start, all contexts
  liveNodes: () => number; // connected (not yet disconnected) nodes across all contexts
  latest: () => FakeAudioContext | undefined;
  advance: (sec: number) => void; // advance every context's clock
  reset: () => void; // forget recorded contexts / starts (the stub stays installed)
  uninstall: () => void;
}

// Stub the global AudioContext (vi.stubGlobal also sets it on window under jsdom).
export function installFakeAudio(): FakeAudioController {
  const contexts: FakeAudioContext[] = [];
  const started: { node: FakeSource; when: number }[] = [];
  class TrackedAudioContext extends FakeAudioContext {
    constructor(options?: unknown) {
      super(options);
      contexts.push(this);
      const own = this.started;
      // Mirror this context's starts into the shared list.
      own.push = (...items) => {
        started.push(...items);
        return Array.prototype.push.apply(own, items);
      };
    }
  }
  vi.stubGlobal('AudioContext', TrackedAudioContext);
  return {
    contexts,
    started,
    liveNodes: () => contexts.reduce((n, c) => n + c.live.size, 0),
    latest: () => contexts[contexts.length - 1],
    advance: (sec) => {
      for (const c of contexts) c.advance(sec);
    },
    reset: () => {
      contexts.length = 0;
      started.length = 0;
    },
    uninstall: () => vi.unstubAllGlobals(),
  };
}
