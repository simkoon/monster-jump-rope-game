// src/game/sfx/recipes.ts — synthesized sound recipes (Phase 8 D-09, D-17, D-18, AUDIO-01).
// PURE DATA: no Web Audio, no React, no DOM, no clock. sfx.ts turns each Voice into nodes.
// Every sound is project-created (Web Audio synthesis, CC0 1.0 — public/assets/cc0/LICENSE.md);
// no audio file ships. Times are seconds from the sound start; frequencies in Hz.
// Safety (T-08-17): every peak ≤ 0.35 before the master gain 0.5 + limiter; no harsh waveform —
// a quiet square sparkle on the ⭐3 jingle is the only non-sine/triangle voice. No click sound (D-18).
import type { StarTier } from '../director/timeline';

export type SfxName =
  | 'dice'
  | 'hop'
  | 'success1'
  | 'success2'
  | 'success3'
  | 'ding'
  | 'miss'
  | 'startBonus'
  | 'eventBonus'
  | 'eventTrap'
  | 'fanfare';

export interface ToneVoice {
  kind: 'tone';
  wave: 'sine' | 'triangle' | 'square';
  f0: number; // start frequency
  f1?: number; // exponential glide target at `dur`
  at: number; // start offset
  dur: number; // length (envelope reaches silence here)
  peak: number; // envelope peak gain
  lowpass?: number; // low-pass cutoff
  vibrato?: { rate: number; depth: number }; // LFO Hz, ± Hz
}

export interface NoiseVoice {
  kind: 'noise';
  at: number;
  dur: number;
  peak: number;
  band: readonly [number, number]; // band-pass range
}

export type Voice = ToneVoice | NoiseVoice;

// Equal-tempered note table (A4 = 440).
const N = {
  G4: 392.0,
  C5: 523.25,
  E5: 659.25,
  G5: 783.99,
  C6: 1046.5,
  E6: 1318.51,
  G6: 1567.98,
  C7: 2093.0,
  E7: 2637.02,
} as const;

const tri = (f0: number, at: number, dur: number, peak: number): ToneVoice => ({ kind: 'tone', wave: 'triangle', f0, at, dur, peak });
const sine = (f0: number, at: number, dur: number, peak: number): ToneVoice => ({ kind: 'tone', wave: 'sine', f0, at, dur, peak });

// Dice rattle: 7 band-passed noise bursts (25 ms) over ≈ 0.6 s, fading out.
const DICE: NoiseVoice[] = Array.from({ length: 7 }, (_, i) => ({
  kind: 'noise' as const,
  at: i * 0.09,
  dur: 0.025,
  peak: 0.28 - i * 0.03,
  band: [1800, 3000] as const,
}));

export const SFX_RECIPES: Readonly<Record<SfxName, readonly Voice[]>> = {
  dice: DICE,
  // One small "tok" per hop tile.
  hop: [{ kind: 'tone', wave: 'triangle', f0: 880, f1: 1320, at: 0, dur: 0.06, peak: 0.12 }],
  // Success jingles (D-18): rising arpeggios, richer and higher per tier (C5-E5-G5 → +C6 → +E6).
  success1: [tri(N.C5, 0, 0.18, 0.22), tri(N.E5, 0.1, 0.18, 0.22), tri(N.G5, 0.2, 0.45, 0.24)],
  success2: [
    tri(N.C5, 0, 0.16, 0.22),
    tri(N.E5, 0.09, 0.16, 0.22),
    tri(N.G5, 0.18, 0.18, 0.22),
    tri(N.C6, 0.27, 0.5, 0.24),
  ],
  success3: [
    tri(N.C5, 0, 0.15, 0.2),
    tri(N.E5, 0.08, 0.15, 0.2),
    tri(N.G5, 0.16, 0.15, 0.2),
    tri(N.C6, 0.24, 0.18, 0.22),
    tri(N.E6, 0.32, 0.6, 0.24),
    // Quiet high sparkle on top of the last note.
    { kind: 'tone', wave: 'square', f0: N.C7, at: 0.36, dur: 0.07, peak: 0.05 },
    { kind: 'tone', wave: 'square', f0: N.E7, at: 0.46, dur: 0.07, peak: 0.04 },
    { kind: 'tone', wave: 'square', f0: N.C7, at: 0.56, dur: 0.09, peak: 0.035 },
  ],
  // Star arrival "ding": G6 with a soft C7 partial, exponential decay.
  ding: [sine(N.G6, 0, 0.4, 0.2), sine(N.C7, 0, 0.3, 0.08)],
  // D-09: the gentle miss — two soft sine notes falling E5 → C5 behind a 1.2 kHz low-pass. No buzzer.
  miss: [
    { kind: 'tone', wave: 'sine', f0: N.E5, at: 0, dur: 0.16, peak: 0.15, lowpass: 1200 },
    { kind: 'tone', wave: 'sine', f0: N.C5, at: 0.14, dur: 0.16, peak: 0.15, lowpass: 1200 },
  ],
  // Start-tile bonus: a little C6 · G6 bell.
  startBonus: [sine(N.C6, 0, 0.3, 0.18), sine(N.G6, 0.05, 0.28, 0.14)],
  // Bonus event: a bright rising sweep.
  eventBonus: [{ kind: 'tone', wave: 'triangle', f0: 400, f1: 900, at: 0, dur: 0.25, peak: 0.2 }],
  // Trap event: a cute falling "boing" with a light wobble — never scary.
  eventTrap: [
    { kind: 'tone', wave: 'sine', f0: 520, f1: 260, at: 0, dur: 0.3, peak: 0.2, vibrato: { rate: 12, depth: 14 } },
  ],
  // Ceremony fanfare: G4-C5-E5 lead-in, then a held G5 over a soft C5/E5 chord (≈ 1.4 s).
  fanfare: [
    tri(N.G4, 0, 0.2, 0.22),
    tri(N.C5, 0.18, 0.2, 0.22),
    tri(N.E5, 0.36, 0.2, 0.22),
    tri(N.G5, 0.54, 0.85, 0.24),
    tri(N.C5, 0.54, 0.85, 0.1),
    tri(N.E5, 0.54, 0.85, 0.1),
  ],
};

// Length of a sound: the latest voice end.
export function recipeLengthSec(name: SfxName): number {
  return SFX_RECIPES[name].reduce((m, v) => Math.max(m, v.at + v.dur), 0);
}

// The success jingle of a star tier.
export function successSfx(tier: StarTier): 'success1' | 'success2' | 'success3' {
  return tier === 3 ? 'success3' : tier === 2 ? 'success2' : 'success1';
}
