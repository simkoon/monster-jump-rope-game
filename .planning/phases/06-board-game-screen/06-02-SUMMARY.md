---
phase: 06-board-game-screen
plan: 02
subsystem: game-presentation
tags: [zustand, presentation, beat-queue, director, tdd, fuzz]
status: complete

requires:
  - phase: 05-engine-v2
    provides: "pure ring-board engine with per-transition GameLog.events (seq +1 per transition)"
provides:
  - "pure buildTimeline: engine log batch -> data beats (BEAT_MS, hopMs, budgetMs, isBannerBeat)"
  - "Displayed state model (displayedFrom, applyBeat, EMPTY_DISPLAYED)"
  - "usePresentation v2 beat queue (play / completeBeat / skipAll / reset, per-beat watchdog, pendingKinds)"
  - "useDirector: synchronous useGameStore.subscribe feed (startDirector, directGame, timelineCtx)"
  - "prefersReducedMotion guard"
affects: [06-03, 06-04, 06-05, 06-06, phase-08-celebration]

tech-stack:
  added: []
  patterns:
    - "Beat = data with its own ms; one watchdog per beat (no summed budget)"
    - "Director subscribes synchronously to the engine store (no useEffect log consumption)"
    - "Controls visible only when !busy && consumedLog === game.log"
    - "Drain/undo/discontinuity resync from the engine (engine always wins)"

key-files:
  created:
    - src/game/reducedMotion.ts
    - src/game/director/timeline.ts
    - src/game/director/timeline.test.ts
    - src/game/director/displayed.ts
    - src/game/director/displayed.test.ts
    - src/game/director/useDirector.ts
    - src/game/director/useDirector.test.tsx
  modified:
    - src/game/usePresentation.ts
    - src/game/usePresentation.test.ts

key-decisions:
  - "Beat lengths are data (BEAT_MS); each non-zero beat arms ms + 500 ms watchdog — no hand-summed animation budget"
  - "skipAll and every drain resync displayed from the engine, so the engine wins over applied beats (undo, drift)"
  - "play([]) while a beat is playing is a no-op; the eventual drain consumes the latest engine log"
  - "The v1 single-animation API was removed outright (no consumers); busy is kept as a stored boolean for GameApp"

patterns-established:
  - "Director pattern: useGameStore.subscribe((s, p) => directGame(s.game, p.game)) with mount resync"
  - "Fuzz invariant: prev displayed + beats === next engine across 300 seeded games"

requirements-completed: [HUD-03, ROUND-02]

coverage:
  - id: D1
    description: "Pure engine-log -> beat timeline with data beat lengths, reduced-motion rule and <= 7000 ms worst roll"
    requirement: "ROUND-02"
    verification:
      - kind: unit
        ref: "src/game/director/timeline.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Displayed state model + 300-seed fuzz proving no missing beat"
    verification:
      - kind: unit
        ref: "src/game/director/displayed.test.ts#fuzz: beats reproduce the engine (D-01)"
        status: pass
    human_judgment: false
  - id: D3
    description: "usePresentation v2 beat queue with per-beat watchdog, id-guarded completion, skipAll, drain resync"
    requirement: "HUD-03"
    verification:
      - kind: unit
        ref: "src/game/usePresentation.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Synchronous director: busy set in the same store update; no flicker of quest controls"
    requirement: "HUD-03"
    verification:
      - kind: integration
        ref: "src/game/director/useDirector.test.tsx#no flicker"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-10-23
---

# Phase 6 Plan 02: Presentation Director Summary

**The engine log is turned into data beats with their own lengths, played through a beat queue store with one watchdog per beat, and fed by a director that subscribes to the engine store synchronously, so `busy` turns on in the same update as the engine change and quest controls never flicker. Everything is covered by tests without any 3D packages.**

## Performance

- **Duration:** about 5 min
- **Started:** 2026-10-22T20:41:45Z
- **Completed:** 2026-10-22T20:46:08Z
- **Tasks:** 3 (each RED then GREEN)
- **Files modified:** 9 (7 created, 2 rewritten)

## Accomplishments

- `buildTimeline` (pure, clock-free) maps rolled/moved/startBonus/eventApplied/judged/turnStarted to dice/preview/hop/startBonus/event/stars/finalRound beats. `hopMs` is clamped to 100..250 ms per tile, the worst roll takes exactly 6800 ms (≤ 7000), and with reduced motion dice/preview/hop drop to 0 ms while banners keep their length.
- `displayedFrom` / `applyBeat` give the display state model. A 300-seed fuzz (up to 200 transitions each, with forward, backward and extra events and random rules) checks that `prev + beats === engine` and that every beat kind actually occurs.
- `usePresentation` v2 provides the beat queue, strictly increasing ids, id-guarded `completeBeat`, 0 ms beats applied in a loop, a watchdog of `ms + 500` per beat, `skipAll`, a resync from the engine on drain, `reset` and `pendingKinds`. `GameApp` compiles unchanged against `busy`.
- `useDirector` / `startDirector` / `directGame` handle: a mount resync that plays no beats; discontinuity (board change or seq jump) leading to a reset; a `gameStarted` replay so a 1-round game gets the final-round banner; `gameEnded` leading to `skipAll`; undo resync; null reset; and unsubscribe. A render-record probe shows no frame of awaitingJudgement with controls visible.

## Task Commits

1. **Task 1: timeline + displayed + fuzz.** RED `a3cc56d`, GREEN `fc5f77e`
2. **Task 2: usePresentation v2.** RED `7e5c2a0`, GREEN `6a08c08`
3. **Task 3: useDirector.** RED `81f3ef5`, GREEN `e79c288`

## Files Created/Modified

- `src/game/reducedMotion.ts`: guarded `prefersReducedMotion()`
- `src/game/director/timeline.ts`: BEAT_MS, hopMs, BeatSpec/Beat/BeatKind, TimelineCtx, buildTimeline, budgetMs, isBannerBeat
- `src/game/director/displayed.ts`: Displayed, EMPTY_DISPLAYED, displayedFrom, applyBeat
- `src/game/usePresentation.ts`: v2 beat queue store (rewritten)
- `src/game/director/useDirector.ts`: timelineCtx, directGame, startDirector, useDirector
- Tests: `timeline.test.ts` (30), `displayed.test.ts` (6, including the fuzz), `usePresentation.test.ts` (18), `useDirector.test.tsx` (17)

## Decisions Made

- When the queue drains (including `skipAll`), `displayed` is always reset to the engine values. Applied beats are only an intermediate display, and the engine is the source of truth.
- `play([])` while a beat is playing changes nothing. The next drain sets `consumedLog` to the latest log, so no transition is lost.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug, test] Narrowed the hop move cap assertion to reachable path lengths**
- **Found during:** Task 1 GREEN
- **Issue:** The test I first wrote looped len 1..40 and asserted `round(hopMs(len)·len) ≤ 2000`. That conflicts with the specified `hopMs(40) = 100` (40 tiles = 4000 ms by design).
- **Fix:** The cap assertion now covers only reachable paths, len 1..20 (dice ≤ 6 and event steps ≤ 20 by schema). `hopMs(40) = 100` stays asserted separately.
- **Files modified:** src/game/director/timeline.test.ts
- **Commit:** fc5f77e

**2. [Rule 1 - Bug, test] React act warning in the director test**
- **Found during:** Task 3 GREEN
- **Issue:** `afterEach` reset the stores while the Probe was still mounted, which printed "not wrapped in act".
- **Fix:** `afterEach` now calls `cleanup()` first.
- **Files modified:** src/game/director/useDirector.test.tsx
- **Commit:** e79c288

## Issues Encountered

None. `npx tsc -b`, `npx vitest run` (31 files, 702 tests) and `npm run build` are all green.

## Known Stubs

None. As planned, the director is not mounted yet; plan 06-06 wires `useDirector` into GameApp.

## Next Phase Readiness

- 06-03..06-05 (3D scene, beat consumers, banners) can read `current` / `displayed` / `pendingKinds` and call `completeBeat(id)`.
- 06-06 mounts `useDirector()` in GameApp and gates controls on `!busy && consumedLog === game.log`.
- This plan did not depend on the 3D packages (06-01 not yet run).

## TDD Gate Compliance

Each task has a `test(06-02)` RED commit followed by a `feat(06-02)` GREEN commit. No refactor commits were needed.

## Self-Check: PASSED
