---
phase: 02-playable-core-loop
plan: 02
subsystem: harness
status: complete
tags: [setup, harness, zustand-bridge, react, dom-ui]
requires:
  - "src/engine/setup.ts (buildParticipants, boardLengthFor, canStart, DEFAULT_TIME_LIMIT_MS, DEFAULT_PARTICIPANT_COUNT, MAX_PARTICIPANTS)"
  - "src/engine/engine.ts (createGame, drawCard, judge, rollDice, advanceTurn, endGame)"
  - "src/engine/rng.ts (systemRng)"
  - "src/store.ts (useStore — Phase-1 content)"
provides:
  - "useGameStore — the engine⇄content bridge API (startGame/draw/judge/roll/next/end/reset/setRemainingMs) that 02-03 consumes"
  - "SetupScreen — teacher configures a game and presses 시작"
  - "GameHarness — routes setup vs. active game; 02-03 replaces the active branch"
  - "게임 view mounted in App next to the 미션/이벤트 editor"
affects:
  - "src/App.tsx (additive 편집기/게임 top-level switch)"
tech-stack:
  added: []
  patterns:
    - "Single bridge module (useGameStore) is the ONLY file coupling src/engine + src/store; engine stays unaware of both"
    - "Harness injects systemRng() at every engine call; engine stays clock-free/RNG-injected"
    - "contentOverride param on startGame makes the empty/non-empty paths deterministic in tests"
key-files:
  created:
    - src/harness/useGameStore.ts
    - src/harness/useGameStore.test.ts
    - src/harness/SetupScreen.tsx
    - src/harness/SetupScreen.test.tsx
    - src/harness/GameHarness.tsx
  modified:
    - src/App.tsx
decisions:
  - "reset() returns game→null (back to SetupScreen) per plan; engine's resetGame (same-config restart) is deferred to 02-03's play loop"
  - "Team member names entered as one comma-separated input per team (throwaway-UI discretion, D-01); members rotate in listed order"
  - "Top-level 편집기/게임 switch added in App.tsx rather than modifying the Phase-1 Tabs component (kept files_modified additive)"
metrics:
  duration_min: 6
  completed: 2026-07-25
  tasks: 3
  files: 6
  tests_total: 125
  tests_added: 9
---

# Phase 2 Plan 02: START / SETUP Flow Summary

A throwaway plain-DOM setup screen plus the thin zustand bridge that wires it to the pure engine: the teacher picks solo/team, counts, names, boy/girl characters, a board preset (짧게/보통) and a 20-min limit, then presses 시작 to launch the engine into phase `awaitingDraw` — with an empty mission library hard-blocking start and pointing to the editor (MISSION-07).

## What Was Built

- **`useGameStore` (Task 1)** — the single seam between the durable engine and the disposable UI. State `{ game: GameState | null, remainingMs: number | null, startBlockedReason: string | null }`; actions `startGame(config, contentOverride?)`, `draw()`, `judge(success)`, `roll()`, `next()`, `end('timeout'|'manual')`, `reset()`, `setRemainingMs(ms)`. Each play action wraps the matching engine transition and injects `systemRng()`. `startGame` resolves `{missions, events}` from `contentOverride ?? useStore.getState()`, gates on `canStart` (MISSION-07), and calls `createGame` only when ok. No wall-clock logic beyond the `remainingMs` holder (the countdown effect is 02-03's job).
- **`SetupScreen` (Task 2)** — plain-DOM form: "파워점핑" text-logo placeholder (SETUP-01), solo/team SegmentedControl (SETUP-02/D-01), count control clamped to `[1, MAX_PARTICIPANTS]` default 2 (SETUP-03), per-row name input (SETUP-04) + 남/여 toggle (SETUP-05), team member-name inputs (D-01), board preset 짧게(default)/보통 (D-02), 20분 limit checkbox default on (D-04), and a 시작 button (SETUP-06) that is disabled with `canStart` guidance when the library is empty (MISSION-07/D-08). Builds the `GameConfig` via `buildParticipants` + `boardLengthFor`.
- **`GameHarness` (Task 3)** — renders `SetupScreen` when no game is active; otherwise a minimal placeholder showing phase, current participant, and every token's position (02-03 replaces this branch with PlayHarness/ResultScreen). Mounted in `App.tsx` behind an additive 편집기/게임 top-level switch — the Phase-1 mission/event tabs are untouched.

## The Bridge API (what 02-03 consumes)

`useGameStore.getState()` exposes: `startGame(config, contentOverride?)`, `draw()`, `judge(success)`, `roll()`, `next()`, `end(reason)`, `reset()`, `setRemainingMs(ms)`, plus selectors `game`, `remainingMs`, `startBlockedReason`. 02-03 drives the play loop (draw→judge→roll→next), owns the countdown (`setRemainingMs` + `end('timeout')`), and replaces the GameHarness active branch.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Unused updater param broke `tsc -b`**
- **Found during:** Task 3 (`npm run build`)
- **Issue:** The count −/+ buttons used `setCount((c) => …)` while computing from the closed-over `clampedCount`, leaving `c` unused → `TS6133` fails the strict build.
- **Fix:** Passed the next value directly (`setCount(Math.max(1, clampedCount - 1))`), dropping the unused param.
- **Files modified:** src/harness/SetupScreen.tsx
- **Commit:** a9ad76a

### Test-Robustness Note (not a code deviation)

The Task-2 test originally asserted the mode/preset controls via `getByRole('button', { name })`. The **selected** SegmentedControl button (e.g. default `개인전`, `짧게`) does not resolve by accessible name under dom-accessibility-api (a quirk of the pressed-toggle markup); non-selected buttons and `getByText` resolve fine. Since `SegmentedControl` is a Phase-1 component (out of scope to modify per the Scope Boundary), the test now asserts the labeled `role="group"` + each toggle label via `getByText`. Functional coverage is unchanged.

## Verification

- `npm run test` — 17 files, 125 tests pass (9 added here; Phase-1 suite unchanged/green)
- `npm run build` — `tsc -b` type-checks and `vite build` succeeds with the harness mounted
- Bridge seam intact: `useGameStore.ts` is the only harness file importing both `src/engine` and `src/store`

## Requirements Delivered

SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05, SETUP-06, MISSION-07 — and honors D-01 (team shared token + member rotation), D-02 (preset default 짧게), D-04 (20분 limit), D-08 (empty-library guidance).

## Known Stubs / Placeholders (intentional, resolved by later phases)

- Text "파워점핑" logo — real original logo is Phase 4 (ART-05).
- 남/여 character toggle is a placeholder label only — real character art is Phase 3~4.
- GameHarness active-game branch is a phase/position placeholder — Phase 2 plan 02-03 fills in the play UI (PlayHarness/ResultScreen).
- Whole setup UI is disposable — Phase 3 replaces it with the child-friendly 3D UI (D-09).

## Self-Check: PASSED

All 6 source artifacts + SUMMARY.md exist on disk; all 5 task commits (d362b9f, 93813ce, d8db5a8, 31a2cb8, a9ad76a) present in git history.
