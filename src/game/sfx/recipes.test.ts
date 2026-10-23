// src/game/sfx/recipes.test.ts — synthesized sound recipes (AUDIO-01, D-09, D-17, D-18).
import { describe, it, expect } from 'vitest';
import { SFX_RECIPES, recipeLengthSec, successSfx, type SfxName, type Voice } from './recipes';
import { STARS_MS, type StarTier } from '../director/timeline';
import { successPlan } from '../director/successPlan';

const NAMES: SfxName[] = [
  'dice',
  'hop',
  'success1',
  'success2',
  'success3',
  'ding',
  'miss',
  'startBonus',
  'eventBonus',
  'eventTrap',
  'fanfare',
];

const tones = (name: SfxName) => SFX_RECIPES[name].filter((v): v is Extract<Voice, { kind: 'tone' }> => v.kind === 'tone');
const topPitch = (name: SfxName) => Math.max(...tones(name).filter((v) => v.wave !== 'square').map((v) => Math.max(v.f0, v.f1 ?? 0)));

describe('SFX_RECIPES (D-18)', () => {
  it('has exactly the D-18 sound list — no button click sound', () => {
    expect(Object.keys(SFX_RECIPES).sort()).toEqual([...NAMES].sort());
    expect(Object.keys(SFX_RECIPES).some((k) => /click|tap|button/i.test(k))).toBe(false);
  });

  it.each(NAMES)('%s: every voice is valid and quiet (peak ≤ 0.35, positive length, non-negative start)', (name) => {
    const voices = SFX_RECIPES[name];
    expect(voices.length).toBeGreaterThan(0);
    for (const v of voices) {
      expect(v.peak).toBeGreaterThan(0);
      expect(v.peak).toBeLessThanOrEqual(0.35);
      expect(v.dur).toBeGreaterThan(0.005);
      expect(v.at).toBeGreaterThanOrEqual(0);
      if (v.kind === 'tone') {
        expect(['sine', 'triangle', 'square']).toContain(v.wave);
        expect(v.f0).toBeGreaterThan(0);
        if (v.f1 !== undefined) expect(v.f1).toBeGreaterThan(0);
      } else {
        expect(v.band[0]).toBeGreaterThan(0);
        expect(v.band[1]).toBeGreaterThan(v.band[0]);
      }
    }
  });

  it('no sawtooth anywhere; square only as the quiet success3 sparkle (peak ≤ 0.06)', () => {
    for (const name of NAMES) {
      for (const v of tones(name)) {
        expect(v.wave as string).not.toBe('sawtooth');
        if (v.wave === 'square') {
          expect(name).toBe('success3');
          expect(v.peak).toBeLessThanOrEqual(0.06);
        }
      }
    }
    expect(tones('success3').some((v) => v.wave === 'square')).toBe(true);
  });

  it('dice: 7 band-passed noise bursts within 0.7 s', () => {
    const v = SFX_RECIPES.dice;
    expect(v).toHaveLength(7);
    for (const b of v) {
      expect(b.kind).toBe('noise');
      if (b.kind === 'noise') expect(b.band).toEqual([1800, 3000]);
    }
    expect(recipeLengthSec('dice')).toBeLessThanOrEqual(0.7);
  });

  it('hop ≤ 0.08 s, ding ≤ 0.45 s, startBonus ≤ 0.35 s, eventTrap ≤ 0.35 s, fanfare ≤ 1.6 s', () => {
    expect(recipeLengthSec('hop')).toBeLessThanOrEqual(0.08);
    expect(recipeLengthSec('ding')).toBeLessThanOrEqual(0.45);
    expect(recipeLengthSec('startBonus')).toBeLessThanOrEqual(0.35);
    expect(recipeLengthSec('eventTrap')).toBeLessThanOrEqual(0.35);
    expect(recipeLengthSec('fanfare')).toBeLessThanOrEqual(1.6);
    expect(recipeLengthSec('fanfare')).toBeGreaterThan(1);
  });

  it('success jingles: 3 < 4 < 5 notes (+ sparkle on ⭐3), each higher than the last', () => {
    const notes = (name: SfxName) => tones(name).filter((v) => v.wave !== 'square').length;
    expect(notes('success1')).toBe(3);
    expect(notes('success2')).toBe(4);
    expect(notes('success3')).toBe(5);
    expect(topPitch('success1')).toBeLessThan(topPitch('success2'));
    expect(topPitch('success2')).toBeLessThan(topPitch('success3'));
  });

  it('miss (D-09): two soft sine notes falling E5 → C5 through a low-pass ≤ 1.2 kHz — no buzzer', () => {
    const v = tones('miss');
    expect(SFX_RECIPES.miss).toHaveLength(2);
    expect(v.map((t) => t.wave)).toEqual(['sine', 'sine']);
    expect(v[0].f0).toBeCloseTo(659.25, 1);
    expect(v[1].f0).toBeCloseTo(523.25, 1);
    expect(v[1].at).toBeGreaterThan(v[0].at);
    for (const t of v) {
      expect(t.lowpass).toBeDefined();
      expect(t.lowpass!).toBeLessThanOrEqual(1200);
      expect(t.peak).toBeLessThanOrEqual(0.15);
      expect(t.f0).toBeGreaterThan(200); // no harsh low tone
    }
  });

  it('eventBonus rises, eventTrap falls (a soft "boing" with vibrato)', () => {
    const up = tones('eventBonus')[0];
    expect(up.f1!).toBeGreaterThan(up.f0);
    const down = tones('eventTrap')[0];
    expect(down.wave).toBe('sine');
    expect(down.f1!).toBeLessThan(down.f0);
    expect(down.vibrato).toBeDefined();
  });

  it('successSfx maps a tier to its jingle', () => {
    expect([1, 2, 3].map((t) => successSfx(t as StarTier))).toEqual(['success1', 'success2', 'success3']);
  });

  it.each([1, 2, 3] as StarTier[])('⭐%i jingle ends inside its stars beat and before the ding', (tier) => {
    const plan = successPlan(tier, STARS_MS[tier], false);
    const end = plan.landMs / 1000 + recipeLengthSec(successSfx(tier));
    expect(end).toBeLessThanOrEqual(STARS_MS[tier] / 1000);
    expect(end).toBeLessThanOrEqual(plan.flyToMs / 1000);
  });

  it('recipeLengthSec is the latest voice end', () => {
    const v = SFX_RECIPES.ding;
    expect(recipeLengthSec('ding')).toBeCloseTo(Math.max(...v.map((x) => x.at + x.dur)), 6);
  });
});
