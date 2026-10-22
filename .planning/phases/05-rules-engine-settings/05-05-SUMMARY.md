---
phase: 05-rules-engine-settings
plan: 05
subsystem: game-integration
tags: [harness, snapshot, setup-screen, play-screen, result-screen, v1-removal, tdd, integration]
status: complete
requires:
  - "05-01: useSettings (failRule/defaultRounds/startBonus/boardSize), ROUNDS_MIN/MAX, DEFAULT_ROUNDS, DEFAULT_SETTINGS"
  - "05-02: assignAnimals/AnimalId, analyzeContent/estimateMinutes, rankByStars/winnersByStars, board/ring"
  - "05-03: createGame/rollDice/judge/undoJudgement/advanceTurn/endGame + selectors, state.ts types, testkit"
  - "05-04: labels.ts, AnimalPicker, Scoreboard, RingStrip, Phase 5 temp-screen CSS"
provides:
  - "src/harness/useGameStore.ts: v2 seam — GameSetup, startGame(setup, override?) with one-time content+settings snapshot, roll/judge/undo/next/endNow/restart/reset"
  - "src/engine/setup.ts (final): buildParticipants(mode, count, names, animals, members?) → v2 Participant[]"
  - "src/game/PlayView.tsx + TurnHud/ControlsBar(NextKind)/MissionOverlay/DiceResultPanel: temporary DOM play screen (S3)"
  - "src/game/hud/SetupView.tsx (S2) and ResultView.tsx (S4, REASON_COPY by EndReason)"
affects: [06]
tech-stack:
  added: []
  patterns:
    - "Start-time snapshot: the harness reads content + settings once; actions only touch GameState"
    - "Temporary screens render engine state directly — no timers, effects or animation (D-26)"
    - "Setup animal picks are frozen from the displayed assignment so one row's pick never reshuffles another"
key-files:
  created: []
  modified:
    - src/harness/useGameStore.ts
    - src/harness/useGameStore.test.ts
    - src/engine/setup.ts
    - src/engine/setup.test.ts
    - src/game/PlayView.tsx
    - src/game/hud/TurnHud.tsx
    - src/game/hud/ControlsBar.tsx
    - src/game/hud/MissionOverlay.tsx
    - src/game/hud/DiceResultPanel.tsx
    - src/game/hud/hud.test.tsx
    - src/game/hud/SetupView.tsx
    - src/game/hud/ResultView.tsx
    - src/game/hud/shell.test.tsx
    - src/game/styles/game.css
    - src/styles/index.css
    - src/App.tsx
    - src/App.test.tsx
  deleted:
    - src/engine/engine.ts
    - src/engine/engine.test.ts
    - src/engine/types.ts
    - src/engine/placement.ts
    - src/engine/placement.test.ts
    - src/game/scene/BoardScene.tsx
    - src/game/scene/scene.test.tsx
    - src/game/animation.ts
    - src/game/diceRotation.test.ts
    - src/game/boardLayout.ts
    - src/game/boardLayout.test.ts
    - src/game/moveHighlight.ts
    - src/game/moveHighlight.test.ts
    - src/game/hud/PositionReadout.tsx
decisions:
  - "05-05: The harness copies the mission/event arrays at start and reads useSettings.getState() only inside startGame. restart() re-runs startGame with the finished game's mode, participants and rounds, so content and settings are re-snapshotted and the board is reshuffled."
  - "05-05: On the start screen, picking an animal freezes the currently displayed assignment into picks. Rows without an explicit pick therefore keep their animal, and the picked animal is freed for the other rows. Lowering the count truncates picks."
  - "05-05: An empty or whitespace-only participant name falls back to the placeholder ('플레이어 N' / '팀 N'), so the turn bar and results never show a blank name."
  - "05-05: A suppressed extra-turn event shows only the cap line ('🔁 한 번 더는 연속 한 번까지! 이번엔 넘어가요'), not the '한 번 더!' line."
metrics:
  duration: "~10min"
  completed: "2026-10-23"
  tasks: 3
  files: 31
---

# Phase 5 Plan 05: v2 Harness, Temporary Screens and v1 Removal Summary

The app now runs on the v2 ring-board engine end to end. The harness snapshots content and settings once at game start. The start screen gained animals, a round stepper, a time estimate, a rules summary and missing-content notices. A temporary DOM play screen covers dice → move → quest card → stars, plus retry, undo, extra turn and end-now. The result screen shows star standings and co-winners. All v1 race/timer/2D-board code and CSS is gone. `npx tsc -b && npx vitest run && npm run build` passes, with 28 test files and 626 tests.

## What Was Built

### Task 1: harness seam, final setup.ts, v1 removal
- **`useGameStore`** matches the `GameSetup` contract:
  - `startGame` copies the content once (`contentOverride ?? useStore`), gates on `analyzeContent`, and takes `failRule/startBonus/boardSize` from `useSettings.getState()`.
  - Rounds are clamped to an integer in [1, 20]; a non-finite value becomes 5.
  - It then calls `createGame(..., systemRng())`.
  - `roll/judge/undo/next/endNow` wrap the engine transitions, and each does nothing when there is no game.
  - `restart` re-snapshots and `reset` clears.
  - Removed: the clock holder, the card draw and the timeout end reason.
- **`setup.ts`**:
  - `buildParticipants(mode, count, names, animals, members?)` assigns distinct animals through `assignAnimals` and zeroes `position`, `travel`, `lapsCredited` and `stars`.
  - Removed: the v1 board preset and its length helper, the 20-minute constant and the v1 start guard.
- **Deleted with `git rm`:** 14 files (v1 engine/types/placement, the 2D board scene, animation, boardLayout, moveHighlight, the position readout, and their tests).
- **CSS:**
  - Removed: the clock, position readout, time-limit toggle, tie-break radio and the whole 2D board/token/dice section with its keyframes and media blocks, including the selectors inside the 560px and "Phase 4.1" blocks.
  - In `index.css`, the radio option selector became `.game-count-ctl output`.
  - The 05-04 "Phase 5 — 임시 화면" section is untouched.

### Task 2: temporary play screen (S3)
- **`PlayView`** is `div.game-stage.temp-play` holding, in order: TurnHud, Scoreboard, RingStrip, a polite live region (DiceResultPanel plus the judgement line), the in-flow quest card, and ControlsBar. It has no timers, effects or presentation-store import. Undo also shows the toast.
- **`TurnHud`:**
  - The turn line reads `{emoji} {name} 차례`.
  - The `🔁 한 번 더` chip appears on an extra turn, and the team member line in team mode.
  - It shows `라운드 r/R`.
  - `지금 끝내기` opens a ConfirmDialog with the S5 copy.
- **`ControlsBar`:**
  - Exports `NextKind`.
  - Phase buttons: roll in `awaitingRoll`; next / extra / result in `turnResolved`.
  - The undo button is rendered only when an undo exists.
  - Renders nothing while busy or at gameOver.
- **`MissionOverlay`** is an in-flow card: retry badge, name, description (only if non-empty), difficulty badge, and ⭐×N with `aria-label="받을 별 N개"`.
- **`DiceResultPanel`** uses the v2 copy for the roll, the move, the start bonus chip, forward/backward/extra events, the extra-turn cap line, the 보너스/함정 chips and arrival on the start tile.

### Task 3: start screen (S2), result screen (S4), app subtitle, integration
- **`SetupView`:**
  - Each participant gets a card: avatar, name input, AnimalPicker (other rows' animals are taken) and the team member input.
  - Round stepper (`라운드 줄이기/늘리기`, `<output aria-label="라운드 수">`). It starts at `defaultRounds`, read once on mount, and its buttons are disabled at 1 and 20.
  - Below that: the estimate and its basis, the live rules summary plus `RULES_HINT`, the 💡 notices, the guard, and the full-width `게임 시작` button.
- **`ResultView`:**
  - `REASON_COPY: Record<EndReason, (rounds) => string>`.
  - Winner line: `🏆 우승!` for one winner, `🏆 공동 우승!` for several.
  - The `rankByStars` standings mark winner rows with `is-winner`.
  - Buttons: `🔁 다시 하기` calls restart; `처음으로` calls reset.
  - No radio inputs.
- **`App`:** the game subtitle is now `주사위를 굴리고 줄넘기 미션으로 별을 모아요`. `App.test` resets settings and includes a full-game integration test: with settings defaultRounds 1, boardSize 16 and failRule noStar, it clicks through to `게임 끝!` / `1라운드를 모두 마쳤어요!` within 40 clicks, then `🔁 다시 하기` shows `라운드 1/1` on a 16-tile board.

## Verification

- Full gate `npx tsc -b && npx vitest run && npm run build`: exit 0, 28 files and 626 tests.
- Per-task verify commands passed:
  - Task 1: engine, harness, settings, dataPreservation, lib and store, 480 tests.
  - Task 2: hud, harness and engine, 458 tests.
- `git diff --exit-code HEAD -- src/store.ts src/schema.ts src/lib/io.ts` was clean before each of the three feat commits (D-04). The `dataPreservation.test.ts` tripwire passes in the full run.
- Acceptance greps:
  - v1 remnant tokens: 0 hits.
  - `결승|순위로 마치기|시간 제한|카드 뽑기|최종 승자` in src/game and App.tsx: 0 hits.
  - Suppression comments: 0 hits.
  - `dangerouslySetInnerHTML` in the screen files: 0 hits.
  - Radios in ResultView: 0.
  - The subtitle, AnimalPicker, estimateMinutes and missingNotices counts and the CSS removal greps all pass.
  - `public/assets/cc0/kenney` is still present.
- The end-of-phase browser human-check (5 steps in the plan's Task 3 `<human-check>`) has not been done in this run. It is left for the phase verification/UAT step.

## Commits

| Task | Gate | Commit | Message |
|------|------|--------|---------|
| 1 | RED | d8520a7 | test(05-05): add failing tests for v2 harness seam and animal-aware buildParticipants |
| 1 | GREEN | 21bcb29 | feat(05-05): v2 harness seam with start-time snapshot; drop v1 engine and 2D board remnants |
| 2 | RED | 21cc574 | test(05-05): add failing tests for the temporary DOM play screen |
| 2 | GREEN | a9e8ae8 | feat(05-05): temporary DOM play screen on the v2 engine |
| 3 | RED | e664fc9 | test(05-05): add failing tests for the new start/result screens and a full-game integration run |
| 3 | GREEN | a39f1ef | feat(05-05): new start and result screens on the v2 engine; new game subtitle |

All three tasks are committed. The known type-error window (screen files still on v1 types) opened at 21bcb29 and closed at a39f1ef.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The mobile end button still showed the v1 label**
- **Found during:** Task 1 CSS cleanup
- **Issue:** In the "Phase 4.1 iPhone-first" block, `.app--playing .game-topbar .game-btn--sm::before { content:'마치기' }` replaced the button text on phones. It would have shown the v1 '마치기' instead of the new '지금 끝내기' copy.
- **Fix:** The pseudo label now reads '끝내기'.
- **Files modified:** src/game/styles/game.css
- **Commit:** 21bcb29

**2. [Rule 2 - Correctness] Blank participant names**
- **Issue:** A name typed and then cleared was sent as `''`, which would render an empty name in the turn bar and results.
- **Fix:** SetupView trims names and falls back to the placeholder (`플레이어 N` / `팀 N`). This is covered by the shell test.
- **Commit:** a39f1ef

**3. [Rule 1 - Bug] A test helper type was too wide for tsc**
- **Issue:** The `label` parameter of the `ev()` helper in hud.test was typed `string`, which fails the `'' | '보너스' | '함정'` union under `tsc -b`.
- **Fix:** Typed it as `Event['label']`.
- **Commit:** a9e8ae8

### Acceptance-grep note (no change made)

`grep -rnE "'boy'|'girl'|\.character\b|character:" src` still finds 2 lines in `src/engine/animals.test.ts` (05-02, not in this plan's files). They are negative test inputs asserting that legacy v1 character values are rejected by `isAnimalId` / `assignAnimals`. No legacy field remains in production code or in any other test. They were left in place because that file belongs to 05-02 and the tests guard the v1→v2 migration boundary.

## TDD Gate Compliance

Each of the three tasks has a `test(...)` commit followed by a `feat(...)` commit. For Task 1, the harness and setup implementation was drafted before the test commit, but the RED commit d8520a7 contains only tests. Those tests fail against that commit's tree, which still has the v1 `useGameStore`, `buildParticipants(…, characters)` and no `GameSetup`. For Tasks 2 and 3, RED was confirmed by running the tests before implementing (the hud suite failed to load against the v1 components).

## Known Stubs

None. The screens are intentionally temporary (D-26; Phase 6 replaces PlayView/RingStrip/Scoreboard), and every one is wired to live engine state.

## Threat Flags

None. No new network, auth or file surface was added. Mitigations implemented:
- **T-05-15 (XSS):** names are rendered only as JSX text, the grep found no `dangerouslySetInnerHTML`, and the App XSS test is kept.
- **T-05-16 (mid-game edits):** content and settings are snapshotted at start, and a harness test checks that board, pool and rules are unchanged after edits.
- **T-05-17 (rounds):** the harness clamps rounds and the engine normalizes them.
- **T-05-18 (accidental end):** the end action requires ConfirmDialog, and a test checks that 계속하기 keeps the game running.
- **T-05-19 (double taps):** each phase renders only its own buttons, and the engine has phase guards.
- **T-05-20 (content format):** the tripwire test and the pre-commit `git diff` gate both passed.

## Self-Check: PASSED

- FOUND: src/harness/useGameStore.ts, src/engine/setup.ts, src/game/PlayView.tsx, src/game/hud/SetupView.tsx, src/game/hud/ResultView.tsx
- GONE: all 14 deleted v1 files (`git ls-files` prints nothing)
- FOUND commits: d8520a7, 21bcb29, 21cc574, a9e8ae8, e664fc9, a39f1ef
