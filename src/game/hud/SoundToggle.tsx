// src/game/hud/SoundToggle.tsx — the always-visible 🔊 / 🔇 sound toggle (Phase 8 AUDIO-02, D-20,
// D-21, UI-SPEC F8).
// D-20: flips the same teacher setting as the 설정 탭 효과음 group (useSettings.soundOn, persisted
//   under powerjumping_settings_v1, never in the backup) and applies at once — useSfx reads soundOn
//   live, so turning it off mid-beat stops every sound.
// D-21: turning sound ON is a user gesture, so the same click handler calls sfx.unlock() (creates /
//   resumes the AudioContext). Turning it off does not touch the context.
// The skip-ignore attribute: a tap here never skips the success / win beat (useSkipOnTap). No input-lock
//   guard either — this is not a play action. The emoji shows the current state; aria-label and
//   title say what a tap will do (no aria-pressed, the label already changes).
// Placement (canvas cell top-right) and styling are added by 08-10 (GameStage layout).
import { useSettings } from '../../settings';
import { SOUND_TOGGLE_EMOJI, soundToggleLabel } from '../labels';
import sfx from '../sfx/sfx';

export default function SoundToggle() {
  const soundOn = useSettings((s) => s.soundOn);
  const setSoundOn = useSettings((s) => s.setSoundOn);
  const label = soundToggleLabel(soundOn);

  const onClick = () => {
    const next = !soundOn;
    setSoundOn(next);
    if (next) sfx.unlock();
  };

  return (
    <button type="button" className="sound-toggle" data-skip-ignore aria-label={label} title={label} onClick={onClick}>
      {soundOn ? SOUND_TOGGLE_EMOJI.on : SOUND_TOGGLE_EMOJI.off}
    </button>
  );
}
