---
phase: 08-success-fx-awards
plan: 03
subsystem: game-input-director
status: complete
tags: [tap-to-skip, input-lock, budget, fx-03, tdd]
requires: [08-02]
provides:
  - "useInputLock.ts: SKIP_LOCK_MS = 250, lockInputFor(ms) (extend-only module-scope deadline), resetSharedInputLock(); every guard honors the shared lock"
  - "useSkipOnTap.ts: SKIP_IGNORE_ATTR, isSkippable(beat) (stars | win), useTapToSkip(enabled, onSkip, resetKey?), useSkipOnTap()"
  - "data-skip-ignore on the TurnHud 지금 끝내기 button and the Modal overlay root (ConfirmDialog included)"
  - "director/budget.test.ts: pure 2.5 s judge → next budget for every tier × reduced × attempt; misses ≤ 1 s"
affects: [08-07, 08-10]
tech-stack:
  added: []
  patterns:
    - "Skip = document capture click + bubble keydown(Escape); listeners exist only while a skippable beat is current and are re-installed per beat id"
    - "Skip completes the current beat by the id the listener was installed for (completeBeat(id)), never skipAll"
    - "One module-scope performance.now deadline shared by all guards blocks the skip tap from leaking onto 다음 ➡️"
key-files:
  created:
    - src/game/useSkipOnTap.ts
    - src/game/useSkipOnTap.test.tsx
    - src/game/director/budget.test.ts
  modified:
    - src/game/useInputLock.ts
    - src/game/GameStage.tsx
    - src/game/hud/TurnHud.tsx
    - src/components/Modal.tsx
    - src/game/stage.test.tsx
decisions:
  - "useTapToSkip takes an optional resetKey (the beat id in useSkipOnTap) so each new skippable beat re-installs the listeners and stays protected from its starting tap; onSkip is held in a ref so inline callbacks (08-10 ceremony intro) do not churn listeners"
  - "Escape uses a bubble-phase document keydown; Modal's own Escape handler stops propagation and its overlay is data-skip-ignore, so Escape in a dialog only closes the dialog"
  - "A tap dropped by the shared lock does not start the guard's own 400 ms window (the shared check happens before the window is armed)"
metrics:
  duration: "~10 min"
  completed: 2026-10-24
  tasks: 2
  files: 8
---

# Phase 8 Plan 03: Tap-to-skip + 250 ms shared lock + 2.5 s budget Summary

A tap anywhere (document capture click) or Escape now ends the current success (stars) or win beat by its id. Stars are already in the engine, so the scoreboard shows the final value at once. A shared 250 ms lock stops the skip tap from reaching the new 다음 ➡️ button. The judge → next ≤ 2500 ms budget is pinned by a pure test and by an integration test.

## What was built

- **Shared skip lock** (`src/game/useInputLock.ts`): module-scope `performance.now()` deadline, `SKIP_LOCK_MS = 250`, `lockInputFor(ms)` (extends with `max`, never shortens), `resetSharedInputLock()` for tests. Every `useInputLock` guard checks its own 400 ms window and then the shared one. The wall-clock-confined comment is kept and extended.
- **Skip hook** (`src/game/useSkipOnTap.ts`, main chunk, no three):
  - `isSkippable`: only `stars` and `win`. dice, preview, hop, miss, startBonus, event and finalRound are never skippable.
  - `useTapToSkip(enabled, onSkip, resetKey?)`: document **capture** `click` plus document `keydown` (Escape only). Events inside `[data-skip-ignore]` are ignored. Both listeners are removed on disable or unmount (D-23).
  - `useSkipOnTap()`: `lockInputFor(SKIP_LOCK_MS)`, then `completeBeat(beatId)`.
- **Wiring**: `GameStage` calls `useSkipOnTap()` with the other hooks, before the `!game` early return. `data-skip-ignore` is on the TurnHud `지금 끝내기` button and on the Modal overlay root.
- **Tests**:
  - `director/budget.test.ts` (9 tests): ⭐1/2/3 × reduced on/off × attempt 1/2 → exactly `['stars']` and `max(budget, 400) ≤ 2500`. Retry, final and noStar ❌ → `['miss']` ≤ 1000. `STARS_MS[3] + SKIP_LOCK_MS ≤ 2500`.
  - `useSkipOnTap.test.tsx` (17 tests): lock edges at 249 and 250 ms, extend-only behavior, reset, the 400 ms hook window, `isSkippable`, the ignore list, Escape and other keys, capture flag, add/remove spy balance, skip by id leaves the next beat untouched, no listener during miss or dice beats.
  - `stage.test.tsx` new describe `GameStage — tap to skip` (7 tests):
    - the start tap does not skip; a body tap skips and shows ⭐3 with no banner
    - 다음 is blocked at 0 ms and at 249 ms after the skip and works at 250 ms (tested past the ✅ tap's own 400 ms window, so only the shared lock can block it)
    - Escape skips
    - 지금 끝내기 and taps, backdrop or Escape inside the dialog never skip
    - miss and dice beats are not skippable
    - skipping the win beat shows `게임 끝!` at once
    - end to end, 다음 works STARS_MS[3] after ✅

## Commits

| Task | Gate | Commit | Message |
|------|------|--------|---------|
| 1 | RED | 0e8e608 | test(08-03): add failing tests for tap-to-skip, shared skip lock and 2.5 s budget |
| 1 | GREEN | 6d8ecb7 | feat(08-03): shared 250 ms skip lock and tap-to-skip hook |
| 2 | RED | db44ec7 | test(08-03): add failing tap-to-skip integration tests for GameStage |
| 2 | GREEN | f18a290 | feat(08-03): wire tap-to-skip into GameStage, exclude 지금 끝내기 and dialogs |

## Verification

- `npx vitest run src/game/useSkipOnTap.test.tsx src/game/director/budget.test.ts`: 26/26 passed
- `npx vitest run src/game/stage.test.tsx src/game/hud src/components`: 12 files, 159/159 passed
- `npx tsc -b`: exit 0
- `npm test` (full suite): **69 files, 1285/1285 tests passed**
- `npm run build`: built. The only warning is the existing GameCanvas lazy chunk size warning (971.80 kB, lazy 3D chunk).
- Acceptance greps:
  - `SKIP_LOCK_MS = 250` = 1, `export function lockInputFor` = 1
  - capture `addEventListener('click', onClick, true)` = 1
  - `skipAll(` in code = 0, three/@react-three imports = 0
  - `2500` in budget.test = 3
  - `useSkipOnTap()` in GameStage = 1
  - `data-skip-ignore`: TurnHud 2, Modal 2
  - `tap to skip` in stage.test = 1

## TDD Gate Compliance

Each task has a `test(...)` RED commit followed by a `feat(...)` GREEN commit.
- Task 1 RED failed on the missing `useSkipOnTap` module and the missing `SKIP_LOCK_MS`.
- Task 2 RED failed 3 skip tests before the wiring.
- Some tests passed at RED, as expected, because they pin behavior that already worked: the budget-tier cases (08-02 already fixed the numbers), the no-skip cases (miss, dice, dialog) and the end-to-end budget case.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Re-install the skip listeners per beat id**
- **Found during:** Task 1
- **Issue:** The first draft keyed the listener effect only on `enabled`. If two skippable beats ran back to back, the listeners would not be re-installed. The second beat would then lose the starting-tap protection, and the id would not be the one captured at install time as the plan requires.
- **Fix:** Added an optional `resetKey` to `useTapToSkip`. `useSkipOnTap` passes the beat id, so the listeners are installed per beat and the id they complete is the install-time id. `onSkip` is held in a ref, so generic callers can pass inline callbacks.
- **Files modified:** src/game/useSkipOnTap.ts
- **Commit:** 6d8ecb7

**2. [Rule 3 - Blocking] Split the miss/dice integration case into two tests**
- **Found during:** Task 2 RED
- **Issue:** Remounting the app inside one test after `cleanup()` left the fake canvas without the 🎲 button.
- **Fix:** Wrote two separate `it` blocks (miss beat, dice beat).
- **Files modified:** src/game/stage.test.tsx
- **Commit:** db44ec7

## Known Stubs

None.

## Threat Flags

None. Threats T-08-04, T-08-05, T-08-06 and T-08-32 are mitigated as planned:
- skip by an id-guarded completeBeat; the Banner timer and the watchdog stay as fallbacks
- the shared 250 ms lock, tested at 249 and 250 ms
- data-skip-ignore plus the capture-phase click
- listeners only while a skippable beat is current, checked by the spy balance test

## Self-Check: PASSED

- FOUND: src/game/useSkipOnTap.ts, src/game/useSkipOnTap.test.tsx, src/game/director/budget.test.ts
- FOUND commits: 0e8e608, 6d8ecb7, db44ec7, f18a290
