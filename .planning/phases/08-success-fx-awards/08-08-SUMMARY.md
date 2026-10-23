---
phase: 08-success-fx-awards
plan: 08
subsystem: audio
status: complete
tags: [audio, web-audio, sfx, settings, hud, tdd]
requires: [08-01, 08-02, 08-03, 08-06]
provides:
  - "sfx/useSfx.ts: useSfx(), startSfx(), scheduleBeat(beat, reduced), SKIP_TOLERANCE_MS = 50, HOP_LEAD_SEC = 0.03, UNLOCK_THROTTLE_MS = 400, GESTURE_EVENTS"
  - "GameApp: useSfx() right after useDirector()"
  - "hud/SoundToggle.tsx: default SoundToggle — button.sound-toggle[type=button][data-skip-ignore], 🔊 / 🔇, aria-label / title 효과음 끄기 / 효과음 켜기"
affects: [08-10, 08-11]
tech-stack:
  added: []
  patterns:
    - "Transition-only beat subscriber with module lastPlayedId (StrictMode-safe playback)"
    - "Skip detection by wall-clock start vs beat.ms (performance.now, UI-only) → stopGroup(beat id)"
    - "One unlock per physical tap: capture gesture listeners + 400 ms throttle, touch pointerup deferred to touchend"
key-files:
  created:
    - src/game/sfx/useSfx.ts
    - src/game/sfx/useSfx.test.tsx
    - src/game/hud/SoundToggle.tsx
    - src/game/hud/soundToggle.test.tsx
  modified:
    - src/game/GameApp.tsx
decisions:
  - "A beat counts as skipped when it stops being current more than 50 ms before its length (tap-to-skip, skipAll, reset) → sfx.stopGroup(id); an on-time end lets the ding tail ring"
  - "Gesture unlock is throttled to one call per 400 ms and a touch pointerup is left to its touchend, so one tap advances sfx's iOS recovery ladder by one step, not three"
  - "Reduced-motion dice is played from the engine log (continuous seq + rolled event), without a group; the 0 ms dice beat never becomes current so there is no double play"
  - "useSfx does not stop sounds on unmount (only listeners / subscriptions are removed); win / preview / finalRound beats are silent — the ceremony fanfare belongs to 08-10"
metrics:
  duration: "~6 min"
  completed: 2026-10-24
  tasks: 2
  files: 5
---

# Phase 8 Plan 08: Beat → Sound Subscriber useSfx + 🔊/🔇 SoundToggle Summary

The 08-06 synthesized sound engine is now connected to the game. `useSfx`, mounted once in GameApp next to `useDirector`, schedules every sound from the beat data at the moment a beat becomes current. It stops a skipped beat's sounds with the 60 ms fade, lets on-time beats ring out, creates the AudioContext only inside a user gesture, follows `soundOn` live and removes every listener and subscription on unmount. The `SoundToggle` button flips the same persisted `soundOn`, unlocks audio when turning on and never skips a beat. Its placement and styling are left to 08-10.

## What was built

**Task 1: `useSfx` + GameApp mount (AUDIO-01, D-08, D-19, D-20, D-21, D-23)**
- `scheduleBeat(beat, reduced)` maps beats to sounds (UI-SPEC F8 소리 큐):
  - dice → `dice`
  - hop → one `hop` per tile at `(k + 1)·seg − 0.03 s`, where `seg = ms / tiles`
  - stars → `successSfx(tier)` at `landMs`, then `ding` at `flyToMs`, both read from `successPlan(stars, ms, reduced)`. Under reduced motion that gives 0 and 600 ms.
  - miss → `miss`, startBonus → `startBonus`
  - event → `eventBonus` / `eventTrap`, chosen by `isLuckyEvent({ eff, label }, suppressed)`
  - preview / finalRound / win → no sound
  - Every voice is placed in the beat-id group.
- `startSfx()` sets up five things:
  - (a) `usePresentation.subscribe`, which reacts only when `current.id` changes. If the previous beat ended more than 50 ms early, it calls `sfx.stopGroup(prev.id)`. A module `lastPlayedId` makes sure each beat id is scheduled once.
  - (b) `sfx.setEnabled(soundOn)` on mount, plus a `useSettings` subscription for later changes.
  - (c) Document capture listeners for pointerup / touchend / click / keydown that call `sfx.unlock()`, only while soundOn is on.
  - (d) `visibilitychange`: hidden → `stopAll(0)`, visible → `resume()`.
  - (e) Under reduced motion, a `useGameStore` subscription that plays `dice` once for a continuous log (seq = prev + 1, same board) that contains `rolled`.
  - One cleanup function removes all five.
- The hook never calls `completeBeat`. Beat completion stays with the Banner timer, the 3D consumers and the watchdog.
- `GameApp.tsx` calls `useSfx()` right after `useDirector()` and adds one header comment line. Routing is unchanged.

**Task 2: `SoundToggle` (AUDIO-02, D-20, D-21)**
- A `<button type="button" className="sound-toggle" data-skip-ignore>` showing 🔊 / 🔇 from `SOUND_TOGGLE_EMOJI`. `aria-label` and `title` both come from `soundToggleLabel(soundOn)`.
- A click calls `setSoundOn(!soundOn)`, which is persisted under `powerjumping_settings_v1`. Turning sound on also calls `sfx.unlock()` inside the same click. There is no input-lock guard.

## Verification

- `npm test`: **79 files, 1471 tests passed** (06-era baseline 1402 + 08-07's tests + 29 useSfx + 6 SoundToggle)
- `npm run build`: built OK, with only the existing >500 kB chunk-size warning
- `npx tsc -b`: clean
- `npx vitest run src/game/hud src/game/sfx src/game/stage.test.tsx`: 10 files, 209 tests passed
- Acceptance greps:

  | Check | Result |
  |-------|--------|
  | `useSfx()` in GameApp.tsx | 1 |
  | `usePresentation.subscribe` in useSfx.ts | 1 |
  | `stopGroup(` in useSfx.ts | 1 |
  | `completeBeat` in useSfx.ts (non-comment) | 0 |
  | three / @react-three import in useSfx.ts | 0 |
  | `data-skip-ignore` in SoundToggle.tsx | 1 |
  | `type="button"` in SoundToggle.tsx | 1 |
  | `soundToggleLabel(` in SoundToggle.tsx | 1 |
  | `setSoundOn` in SoundToggle.tsx | 2 |

## TDD Gate Compliance

- Task 1: RED `d56d04d` (test) → GREEN `2183d37` (feat)
- Task 2: RED `471a9af` (test) → GREEN `6875d9e` (feat)
- No refactor commits were needed.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 RED | d56d04d | test(08-08): add failing tests for the beat → sound subscriber useSfx |
| 1 GREEN | 2183d37 | feat(08-08): beat → sound subscriber useSfx mounted in GameApp |
| 2 RED | 471a9af | test(08-08): add failing tests for the 🔊 / 🔇 SoundToggle |
| 2 GREEN | 6875d9e | feat(08-08): 🔊 / 🔇 SoundToggle flips the live soundOn setting |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] One physical tap would have used up the iOS recovery ladder**
- **Found during:** Task 1 design
- **Issue:** The plan installs four gesture listeners, and a single touch tap fires three of them (pointerup, touchend and click). sfx counts a gesture that finds the context not running as one "stuck" step and recreates the context on the second step. On Safari, a context created on pointerup is still `suspended` when click arrives a moment later. That one tap would therefore close and recreate the context it had just made, and use one of the `MAX_RECREATE` slots.
- **Fix:**
  - The gesture handler calls `unlock()` at most once per `UNLOCK_THROTTLE_MS = 400` ms.
  - A pointerup with `pointerType === 'touch'` is ignored, so its touchend (the event iOS has always honoured for audio) does the unlock.
  - Mouse and keyboard taps unlock on pointerup / keydown as before.
  - Test: touchend + click in a row → `unlock` is called once.
- **Files modified:** src/game/sfx/useSfx.ts
- **Commit:** 2183d37

**2. [Acceptance grep] The header comment mentioned the attribute name**
- The `data-skip-ignore` count in SoundToggle.tsx must be exactly 1. The header comment named the attribute, which gave a count of 2, so the comment now says "The skip-ignore attribute".
- **Commit:** 6875d9e

Otherwise the plan was executed as written.

## Notes for downstream plans

- **08-10:**
  - Place `<SoundToggle />` in the canvas cell, top-right (and the podium cell in the ceremony), and style `.sound-toggle` (56 / 48 px circle, z 4).
  - Play the fanfare from the ceremony intro with `sfx.play('fanfare', { group: introKey })`. useSfx does not play anything for `win`.
  - Removing the ResultView branch in GameApp does not affect useSfx, which sits above the router.
- **08-11 (soak):** useSfx adds 5 document listeners (4 capture gesture listeners + visibilitychange) and 3 store subscriptions (usePresentation, useSettings, useGameStore) per mount. They should be counted as constant across games.

## Known Stubs

- `SoundToggle` is not rendered anywhere yet. This is intentional: the plan assigns its placement and styling to 08-10, because GameStage / game.css belong to 08-07 / 08-10.

## Threat Flags

None. The listeners, the gesture unlock, the toggle's skip-ignore and the skip fade are covered by T-08-35 … T-08-38. No new network, storage key or trust boundary was added.

## Self-Check: PASSED

- FOUND: src/game/sfx/useSfx.ts, src/game/sfx/useSfx.test.tsx, src/game/hud/SoundToggle.tsx, src/game/hud/soundToggle.test.tsx
- FOUND commits: d56d04d, 2183d37, 471a9af, 6875d9e
