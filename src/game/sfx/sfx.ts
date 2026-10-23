// src/game/sfx/sfx.ts — the one sound interface of the game (Phase 8 D-17, D-19, D-20, D-21, D-23).
// Main-chunk module: no three, no React, no settings import (the subscriber in 08-08 syncs
// soundOn through setEnabled()).
//
// D-17: every sound is synthesized at runtime from SFX_RECIPES (project-created, CC0 1.0 —
//   public/assets/cc0/LICENSE.md). No audio file, URL or library. All playback goes through
//   play(name, opts), so CC0 sample files could replace the recipes later behind the same call.
// D-21: the single AudioContext is created lazily by unlock(), which callers only ever invoke from
//   a user gesture (autoplay policy). Graph: voices → master gain (MASTER_GAIN) → limiter
//   (DynamicsCompressor, LIMITER) → destination. resume() retries a suspended context (tab back in
//   view). iOS can leave the context 'interrupted' or stuck: a later gesture calls resume()
//   synchronously inside that gesture (WebKit ignores a resume() from a promise callback, so no
//   suspend-then-resume chain), and if the next gesture still finds it not running it is closed
//   and recreated, at most MAX_RECREATE times.
//   Every resume / suspend / close rejection is swallowed — the game never depends on sound.
//   iOS note: with the default audio session the ring/silent switch mutes Web Audio (the 설정 탭
//   hint says so); no 'playback' session is requested, so a teacher's music is not interrupted.
// D-23: each voice's nodes are disconnected in the onended of its last source and removed from
//   the active set, so after any sound (or stopAll) only the master chain stays connected.
// Without Web Audio (jsdom, old browser) or after a failed construction every call is a silent
// no-op and play() returns 0.
import { SFX_RECIPES, type NoiseVoice, type SfxName, type ToneVoice, type Voice } from './recipes';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export const MASTER_GAIN = 0.5;
export const LIMITER = { threshold: -10, knee: 0, ratio: 12, attack: 0.003, release: 0.15 } as const;
export const FADE_SEC = 0.06; // skip / off fade-out
export const MAX_RECREATE = 3;
export const MASTER_CHAIN_NODES = 2; // master gain + limiter

const SILENT = 0.0001; // exponential ramps cannot reach 0
const ATTACK_SEC = 0.005;
const TAIL_SEC = 0.02; // a source stops a little after its envelope reaches silence
const NOISE_SEC = 1;

export type SfxGroup = string | number;

export interface PlayOptions {
  group?: SfxGroup; // e.g. the beat id — stopGroup(group) silences this sound on a skip
  delaySec?: number; // schedule ahead of currentTime (sample-accurate)
}

interface ActiveVoice {
  group: SfxGroup | undefined;
  nodes: AudioNode[];
  sources: AudioScheduledSourceNode[];
  env: GainNode;
  startAt: number;
  stopAt: number;
  pending: number; // sources not yet ended
  done: boolean;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let limiter: DynamicsCompressorNode | null = null;
let noise: AudioBuffer | null = null;
let enabled = true;
let recreated = 0;
let stuck = 0; // gestures in a row that found the context not running
const voices = new Set<ActiveVoice>();

function audioCtor(): (new (options?: AudioContextOptions) => AudioContext) | null {
  if (typeof window === 'undefined') return null;
  return window.AudioContext ?? window.webkitAudioContext ?? null;
}

const swallow = (p: Promise<unknown> | undefined): void => {
  p?.catch(() => {});
};

// One deterministic second of white noise per context (integer LCG — no Math.random).
function makeNoise(c: AudioContext): AudioBuffer {
  const len = Math.max(1, Math.round(c.sampleRate * NOISE_SEC));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  let seed = 0x2f6b1d3;
  for (let i = 0; i < len; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] = seed / 0x80000000 - 1;
  }
  return buf;
}

function create(): void {
  const Ctor = audioCtor();
  if (!Ctor) return;
  try {
    const c = new Ctor({ latencyHint: 'interactive' });
    const m = c.createGain();
    m.gain.value = enabled ? MASTER_GAIN : 0;
    const lim = c.createDynamicsCompressor();
    lim.threshold.value = LIMITER.threshold;
    lim.knee.value = LIMITER.knee;
    lim.ratio.value = LIMITER.ratio;
    lim.attack.value = LIMITER.attack;
    lim.release.value = LIMITER.release;
    m.connect(lim);
    lim.connect(c.destination);
    ctx = c;
    master = m;
    limiter = lim;
    noise = null; // built on the first noise voice of this context
    stuck = 0;
    if (String(c.state) !== 'running') swallow(c.resume());
  } catch {
    ctx = null;
    master = null;
    limiter = null;
  }
}

// Drop the current context (voices, master chain) and close it.
function teardown(): void {
  stopAll(0);
  for (const n of [master, limiter]) {
    try {
      n?.disconnect();
    } catch {
      /* already gone */
    }
  }
  const old = ctx;
  ctx = null;
  master = null;
  limiter = null;
  noise = null;
  if (old && String(old.state) !== 'closed') {
    try {
      swallow(old.close());
    } catch {
      /* ignore */
    }
  }
}

function recreate(): void {
  if (recreated >= MAX_RECREATE) return;
  recreated++;
  teardown();
  create();
}

// Call from a user gesture only (game start button, the one document gesture listener in 08-08).
export function unlock(): void {
  if (!audioCtor()) return;
  if (!ctx) {
    create();
    return;
  }
  const c = ctx;
  const state = String(c.state);
  if (state === 'running') {
    stuck = 0;
    return;
  }
  if (state === 'closed') {
    recreate();
    return;
  }
  // 'suspended' / 'interrupted' (iOS) after an earlier resume attempt.
  stuck++;
  if (stuck >= 2 && recreated < MAX_RECREATE) {
    recreate();
    return;
  }
  // Synchronously, inside the gesture: WebKit only honors a resume() made in the gesture handler.
  // No suspend() first — it would also cancel a resume() a fresh create() still has pending.
  try {
    swallow(c.resume());
  } catch {
    /* ignore */
  }
}

// Retry a suspended context (e.g. the tab is visible again). Never creates one.
export function resume(): void {
  if (!ctx) return;
  const state = String(ctx.state);
  if (state === 'running' || state === 'closed') return;
  try {
    swallow(ctx.resume());
  } catch {
    /* ignore */
  }
}

function envelope(param: AudioParam, t: number, peak: number, dur: number): void {
  param.setValueAtTime(SILENT, t);
  param.linearRampToValueAtTime(peak, t + ATTACK_SEC);
  param.exponentialRampToValueAtTime(SILENT, t + dur);
}

function release(v: ActiveVoice): void {
  if (v.done) return;
  v.done = true;
  for (const s of v.sources) s.onended = null;
  for (const n of v.nodes) {
    try {
      n.disconnect();
    } catch {
      /* already disconnected */
    }
  }
  voices.delete(v);
}

function track(v: ActiveVoice): void {
  voices.add(v);
  for (const s of v.sources) {
    s.onended = () => {
      v.pending--;
      if (v.pending <= 0) release(v);
    };
  }
}

function buildTone(c: AudioContext, out: AudioNode, v: ToneVoice, t: number, group: SfxGroup | undefined): ActiveVoice {
  const nodes: AudioNode[] = [];
  const { wave } = v;
  const osc = c.createOscillator();
  nodes.push(osc);
  osc.type = wave;
  osc.frequency.setValueAtTime(v.f0, t);
  if (v.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(v.f1, t + v.dur);
  const env = c.createGain();
  nodes.push(env);
  envelope(env.gain, t, v.peak, v.dur);
  let head: AudioNode = osc;
  if (v.lowpass !== undefined) {
    const f = c.createBiquadFilter();
    nodes.push(f);
    f.type = 'lowpass';
    f.frequency.value = v.lowpass;
    head.connect(f);
    head = f;
  }
  head.connect(env);
  env.connect(out);
  const sources: AudioScheduledSourceNode[] = [osc];
  if (v.vibrato) {
    const lfo = c.createOscillator();
    const depth = c.createGain();
    nodes.push(lfo, depth);
    lfo.type = 'sine';
    lfo.frequency.value = v.vibrato.rate;
    depth.gain.value = v.vibrato.depth;
    lfo.connect(depth);
    depth.connect(osc.frequency);
    sources.push(lfo);
  }
  const stopAt = t + v.dur + TAIL_SEC;
  for (const s of sources) {
    s.start(t);
    s.stop(stopAt);
  }
  return { group, nodes, sources, env, startAt: t, stopAt, pending: sources.length, done: false };
}

function buildNoise(c: AudioContext, out: AudioNode, v: NoiseVoice, t: number, group: SfxGroup | undefined, k: number): ActiveVoice {
  if (!noise) noise = makeNoise(c);
  const nodes: AudioNode[] = [];
  const src = c.createBufferSource();
  nodes.push(src);
  src.buffer = noise;
  const [lo, hi] = v.band;
  const center = Math.sqrt(lo * hi);
  const f = c.createBiquadFilter();
  nodes.push(f);
  f.type = 'bandpass';
  f.frequency.value = center;
  f.Q.value = center / (hi - lo);
  const env = c.createGain();
  nodes.push(env);
  envelope(env.gain, t, v.peak, v.dur);
  src.connect(f);
  f.connect(env);
  env.connect(out);
  const stopAt = t + v.dur + TAIL_SEC;
  // A different (deterministic) slice of the noise per burst.
  src.start(t, (k * 0.137) % (NOISE_SEC - 0.1));
  src.stop(stopAt);
  return { group, nodes, sources: [src], env, startAt: t, stopAt, pending: 1, done: false };
}

// Schedule one sound. Returns the number of voices started (0 = silent: no context, not running,
// disabled, or an unknown name).
export function play(name: SfxName, opts: PlayOptions = {}): number {
  const c = ctx;
  const out = master;
  if (!c || !out || !enabled || String(c.state) !== 'running') return 0;
  const recipe: readonly Voice[] | undefined = SFX_RECIPES[name];
  if (!recipe) return 0;
  const t0 = c.currentTime + Math.max(0, opts.delaySec ?? 0);
  let count = 0;
  recipe.forEach((v, k) => {
    const t = t0 + v.at;
    try {
      const voice = v.kind === 'tone' ? buildTone(c, out, v, t, opts.group) : buildNoise(c, out, v, t, opts.group, k);
      track(voice);
      count++;
    } catch {
      /* a broken voice stays silent; the game goes on */
    }
  });
  return count;
}

function stopVoice(v: ActiveVoice, now: number, fadeSec: number): void {
  if (v.done) return;
  if (v.startAt > now || fadeSec <= 0) {
    // Not started yet (or an immediate stop): cancel and clean up at once.
    for (const s of v.sources) {
      try {
        s.stop(now);
      } catch {
        /* ignore */
      }
    }
    release(v);
    return;
  }
  try {
    const g = v.env.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(g.value, SILENT), now);
    g.linearRampToValueAtTime(SILENT, now + fadeSec);
    const stopAt = Math.min(v.stopAt, now + fadeSec + 0.01);
    for (const s of v.sources) s.stop(stopAt);
    v.stopAt = stopAt;
  } catch {
    release(v);
  }
}

// Fade out (FADE_SEC) the playing voices of one group and cancel its scheduled ones (D-19 skip).
export function stopGroup(group: SfxGroup, fadeSec: number = FADE_SEC): void {
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const v of [...voices]) if (v.group === group) stopVoice(v, now, fadeSec);
}

export function stopAll(fadeSec: number = FADE_SEC): void {
  if (!ctx) {
    for (const v of [...voices]) release(v);
    return;
  }
  const now = ctx.currentTime;
  for (const v of [...voices]) stopVoice(v, now, fadeSec);
}

// D-20: off → the master fades to 0, every voice stops and play() creates nothing; on → MASTER_GAIN.
export function setEnabled(on: boolean): void {
  enabled = on;
  if (ctx && master) {
    try {
      const now = ctx.currentTime;
      const g = master.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(on ? MASTER_GAIN : 0, now + FADE_SEC);
    } catch {
      /* ignore */
    }
  }
  if (!on) stopAll();
}

export function activeVoiceCount(): number {
  return voices.size;
}

// Connected nodes owned by sfx: the master chain plus every live voice node.
export function activeNodeCount(): number {
  let n = ctx ? MASTER_CHAIN_NODES : 0;
  for (const v of voices) n += v.nodes.length;
  return n;
}

export function __resetSfxForTests(): void {
  teardown();
  voices.clear();
  enabled = true;
  recreated = 0;
  stuck = 0;
}

const sfx = { unlock, resume, play, stopGroup, stopAll, setEnabled, activeVoiceCount, activeNodeCount };
export default sfx;
