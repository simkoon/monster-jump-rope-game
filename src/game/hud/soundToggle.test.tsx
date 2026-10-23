// src/game/hud/soundToggle.test.tsx — the 🔊 / 🔇 toggle (Phase 8 08-08; AUDIO-02, D-20, D-21,
// UI-SPEC F8 / Copywriting). jsdom + FakeAudio.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import SoundToggle from './SoundToggle';
import { SETTINGS_KEY, useSettings } from '../../settings';
import { SOUND_TOGGLE_EMOJI } from '../labels';
import { useSkipOnTap } from '../useSkipOnTap';
import { resetSharedInputLock } from '../useInputLock';
import { usePresentation } from '../usePresentation';
import { EMPTY_DISPLAYED } from '../director/displayed';
import sfx, { __resetSfxForTests } from '../sfx/sfx';
import { installFakeAudio } from '../../test/fakeAudio';

const P = () => usePresentation.getState();

function StageHost() {
  useSkipOnTap();
  return <SoundToggle />;
}

const button = () => screen.getByRole('button');
const persisted = () => JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}').state?.soundOn;

beforeEach(() => {
  vi.useFakeTimers();
  installFakeAudio();
  resetSharedInputLock();
  useSettings.setState({ soundOn: true });
  P().reset(EMPTY_DISPLAYED, null);
});

afterEach(() => {
  cleanup();
  P().reset(EMPTY_DISPLAYED, null);
  useSettings.setState({ soundOn: true });
  resetSharedInputLock();
  __resetSfxForTests();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('SoundToggle (AUDIO-02, D-20)', () => {
  it('soundOn true → 🔊 with aria-label and title 효과음 끄기', () => {
    render(<SoundToggle />);
    expect(button()).toHaveTextContent(SOUND_TOGGLE_EMOJI.on);
    expect(button()).toHaveAttribute('aria-label', '효과음 끄기');
    expect(button()).toHaveAttribute('title', '효과음 끄기');
  });

  it('soundOn false → 🔇 with 효과음 켜기', () => {
    useSettings.setState({ soundOn: false });
    render(<SoundToggle />);
    expect(button()).toHaveTextContent(SOUND_TOGGLE_EMOJI.off);
    expect(button()).toHaveAttribute('aria-label', '효과음 켜기');
    expect(button()).toHaveAttribute('title', '효과음 켜기');
  });

  it('is a type=button with class sound-toggle and data-skip-ignore', () => {
    render(<SoundToggle />);
    expect(button()).toHaveAttribute('type', 'button');
    expect(button()).toHaveClass('sound-toggle');
    expect(button()).toHaveAttribute('data-skip-ignore');
  });

  it('a click flips soundOn and persists it under powerjumping_settings_v1', () => {
    render(<SoundToggle />);
    fireEvent.click(button());
    expect(useSettings.getState().soundOn).toBe(false);
    expect(persisted()).toBe(false);
    expect(button()).toHaveTextContent(SOUND_TOGGLE_EMOJI.off);
    fireEvent.click(button());
    expect(useSettings.getState().soundOn).toBe(true);
    expect(persisted()).toBe(true);
    expect(button()).toHaveAttribute('aria-label', '효과음 끄기');
  });

  it('D-21: turning on unlocks the audio context inside the tap; turning off does not', () => {
    const unlock = vi.spyOn(sfx, 'unlock');
    render(<SoundToggle />);
    fireEvent.click(button()); // off
    expect(unlock).not.toHaveBeenCalled();
    fireEvent.click(button()); // on
    expect(unlock).toHaveBeenCalledTimes(1);
  });

  it('a tap on the toggle never skips the current stars beat', () => {
    render(<StageHost />);
    P().play([{ kind: 'stars', pid: 'p1', stars: 3, ms: 2200 }]);
    const id = P().current!.id;
    fireEvent.click(button());
    expect(P().current?.id).toBe(id);
    fireEvent.keyDown(button(), { key: 'Escape' });
    expect(P().current?.id).toBe(id);
    // A tap elsewhere still skips (the ignore is the toggle's own).
    fireEvent.click(document.body);
    expect(P().current).toBeNull();
  });
});
