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
// Placement (canvas cell top-right, GameStage) and styling (game.css, 08-10); `is-off` only picks
// the flat off background.
import { useState } from 'react';
import { useSettings } from '../../settings';
import { SOUND_TOGGLE_EMOJI, soundToggleLabel } from '../labels';
import sfx from '../sfx/sfx';

export default function SoundToggle() {
  const [testResult, setTestResult] = useState('');
  const soundOn = useSettings((s) => s.soundOn);
  const setSoundOn = useSettings((s) => s.setSoundOn);
  const label = soundToggleLabel(soundOn);

  const onClick = () => {
    const next = !soundOn;
    setSoundOn(next);
    if (next) sfx.unlock();
  };

  async function checkSound() {
    setSoundOn(true);
    setTestResult('소리 확인 중…');
    const result = await sfx.testSound();
    setTestResult(result.voices > 0
      ? '확인음을 재생했어요. 안 들리면 볼륨과 출력 장치를 확인해 주세요.'
      : '오디오가 열리지 않았어요 (' + result.state + '). 소리 확인을 다시 눌러 주세요.');
  }

  return (
    <>
    <button
      type="button"
      className={soundOn ? 'sound-toggle' : 'sound-toggle is-off'}
      data-skip-ignore
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {soundOn ? SOUND_TOGGLE_EMOJI.on : SOUND_TOGGLE_EMOJI.off}
    </button>
    <div className="sound-check" data-skip-ignore>
      <button type="button" className="game-btn--sm" onClick={checkSound}>소리 확인</button>
      {testResult && <p role="status">{testResult}</p>}
    </div>
    </>
  );
}
