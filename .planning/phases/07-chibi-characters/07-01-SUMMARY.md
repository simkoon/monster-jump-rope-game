---
phase: 07-chibi-characters
plan: 01
subsystem: ui
tags: [presentation-queue, timeline, beats, banner, react, zustand]
status: complete

requires:
  - phase: 06-3d-ring-board
    provides: "pure buildTimeline, usePresentation queue with per-beat watchdog, Banner, director, GameStage"
provides:
  - "miss beat (700 ms) for every ❌ judgement, built from the existing judged log event"
  - "win beat (1500 ms, every co-winner + their animals) for a rounds-complete end"
  - "BEAT_MS.stars 900 (D-12), isTimedBeat predicate (banner beats + miss + win)"
  - "Banner completes all timed beats at beat.ms; gold win banner 🏆 우승! / 🏆 공동 우승! + animal emoji row"
  - "director skipAll only for a manual gameEnded; TimelineCtx.animalOf"
  - "GameStage 지금 끝내기 at gameOver → skipAll; canvas aria '{L}칸 순환 보드, 게임 끝' at gameOver"
affects: [07-04 3D character reactions, 08 success animation]

tech-stack:
  added: []
  patterns:
    - "Reaction beats: copy-less timed beats completed by the DOM Banner timer; 3D consumers only read them"
    - "Reduced motion collapses only dice/preview/hop; expression beats keep their length"

key-files:
  created: []
  modified:
    - src/game/director/timeline.ts
    - src/game/director/useDirector.ts
    - src/game/hud/Banner.tsx
    - src/game/labels.ts
    - src/game/GameStage.tsx
    - src/game/styles/game.css
    - src/game/director/timeline.test.ts
    - src/game/director/displayed.test.ts
    - src/game/director/useDirector.test.tsx
    - src/game/hud/hud6.test.tsx
    - src/game/labels.test.ts
    - src/game/stage.test.tsx
    - src/game/hud/hud.test.tsx
    - src/App.test.tsx

key-decisions:
  - "07-01: TDD RED was run locally but test+implementation land in one commit per task (no red commits: tsc -b type-checks tests and CI runs only the build)"
  - "07-01: win beat animals skip winner ids missing from ctx.animalOf (defensive; the engine always has one)"
  - "07-01: stage tests find the beat banner by class, because the Toast is also role=status"

patterns-established:
  - "isTimedBeat: DOM Banner owns completion of banner + reaction beats; watchdog (ms + 500) is the fallback"

requirements-completed: []  # contributes to CHAR-02, CHAR-03 (beat data only); 07-04/07-05 deliver the 3D faces and motions and close them
requirements-contributed: [CHAR-02, CHAR-03]

coverage:
  - id: D1
    description: "Every ❌ judgement plays one 700 ms miss beat that hides the retry card / controls (D-13, HUD-03)"
    requirement: CHAR-03
    verification:
      - kind: unit
        ref: "src/game/director/timeline.test.ts#judged fail with a retry (judged + questDrawn attempt 2) → one miss beat (D-13)"
        status: pass
      - kind: integration
        ref: "src/game/stage.test.tsx#❌ on attempt 1 hides the quest card at once; the retry card shows after the miss beat"
        status: pass
    human_judgment: false
  - id: D2
    description: "Stars beat is 900 ms; scoreboard star rises only when it ends (D-12, D-15)"
    requirement: CHAR-03
    verification:
      - kind: integration
        ref: "src/game/stage.test.tsx#stars rise only after the stars beat"
        status: pass
    human_judgment: false
  - id: D3
    description: "Rounds-complete end plays a 1500 ms win beat with the gold 🏆 우승! / 🏆 공동 우승! banner before the result screen; 지금 끝내기 skips it (D-14, C7d/C7e/C7f)"
    requirement: CHAR-03
    verification:
      - kind: integration
        ref: "src/game/stage.test.tsx#GameStage — win beat at the natural end (07-01, D-14, UI-SPEC C7d/C7f)"
        status: pass
      - kind: unit
        ref: "src/game/hud/hud6.test.tsx#win beat (07-01, D-14, UI-SPEC C7d): gold win banner with the emoji row, done at 1500 ms"
        status: pass
    human_judgment: false
  - id: D4
    description: "Win banner look on a phone (narrow gold box inside the board yard, emoji row wraps ≤ 2 rows)"
    verification: []
    human_judgment: true
    rationale: "Visual fit over the 3D board is checked in the phase-end UAT (D-24)"

duration: 7min
completed: 2026-10-23
---

# Phase 7 Plan 01: Reaction beats (miss / win) Summary

**Engine-free miss (700 ms) and win (1500 ms) beats from the existing judged / gameEnded log events, a 900 ms stars beat, Banner-timed completion of every timed beat, and a gold `🏆 우승!` / `🏆 공동 우승!` win banner with the winners' animal emojis.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-10-23T04:25:34Z
- **Completed:** 2026-10-23T04:32:02Z
- **Tasks:** 2
- **Files modified:** 14 (6 production, 8 tests)

## Accomplishments

- `timeline.ts`: `BEAT_MS` gains `miss: 700`, `win: 1500`; `stars` 600 → 900. `BeatSpec` gains `miss` and `win` (winners + animals in participant order). `TimelineCtx.animalOf` added. `buildTimeline` turns every ❌ into a miss beat and a `rounds-complete` gameEnded into a win beat. Neither goes through `motion()`, so reduced motion keeps their length. New `isTimedBeat`. `isBannerBeat` is unchanged.
- `Banner.tsx`: selects `isTimedBeat`, so it also completes the copy-less miss beat and the win beat at exactly `beat.ms`. Adds the `beat-banner--win` variant class and a `role="img"` emoji line labelled with the fixed animal names.
- `labels.ts`: `bannerCopy` handles `win` (tone `final`, `variant: 'win'`, `bigLabel`). `boardAria(length, name, over)` returns `{L}칸 순환 보드, 게임 끝` while the game is over.
- `useDirector.ts`: `timelineCtx` carries `animalOf`. `skipAll` now runs only for a `manual` gameEnded, so a natural end plays the win beat.
- `GameStage.tsx`: 지금 끝내기 at gameOver calls `skipAll()` (the engine's `endGame` does nothing at that point). The canvas aria passes `over`.
- `game.css`: `Phase 7 — win banner (07-01)` block, tokens only.
- Migrated every test in RESEARCH Pitfall 2. Added coverage for the miss beat, single and co-winner win banners, and 지금 끝내기 during the win banner. Suite: 943 tests green; `tsc -b` and `npm run build` pass.

## Task Commits

1. **Task 1: miss/win beat types + timed-beat Banner + win banner copy/CSS** - `6c7b4b2` (feat)
2. **Task 2: buildTimeline miss/win + stars 900 + director manual branch + GameStage end-now/aria + test migration** - `17b2be3` (feat)

## Files Created/Modified

- `src/game/director/timeline.ts` - miss/win beats, stars 900, animalOf ctx, isTimedBeat
- `src/game/director/useDirector.ts` - animalOf in timelineCtx; manual-only skipAll
- `src/game/hud/Banner.tsx` - completes timed beats; win variant + emoji row
- `src/game/labels.ts` - win banner copy; boardAria gameOver variant
- `src/game/GameStage.tsx` - 지금 끝내기 at gameOver → skipAll; aria `over`
- `src/game/styles/game.css` - Phase 7 win banner block
- Tests: `timeline.test.ts`, `displayed.test.ts`, `useDirector.test.tsx`, `hud6.test.tsx`, `labels.test.ts`, `stage.test.tsx`, `hud.test.tsx`, `App.test.tsx`

## Decisions Made

- One commit per task holds both test and implementation. TDD RED was run locally first (8 failing tests in Task 1; a `tsc` failure on the missing `animalOf` plus 5 failing integration tests in Task 2). A separate red test commit would break the rule that every commit passes `tsc -b`.
- Winner ids without an `animalOf` entry are left out of `animals` (defensive; tested).
- New stage tests find the banner with `.beat-banner` because the Toast also has `role="status"`.

## Deviations from Plan

None in production code: the plan was executed as written. One test-only change: the new stage banner tests use `document.querySelector('.beat-banner')` instead of `getByRole('status')`, because the mounted `<Toast />` is also a status region.

## Requirements Tracking

`requirements.mark-complete CHAR-02 CHAR-03` was run and then reverted in REQUIREMENTS.md. This plan only provides the miss/win/stars beat data that the 3D characters will use. The expressions (CHAR-02) and motions (CHAR-03) are delivered by 07-03 to 07-05, which list the same IDs. Marking them Complete now would overstate progress, so they stay Pending until those plans finish.

## TDD Gate Compliance

The plan asks for RED → GREEN, but there are no separate `test(...)` commits. The project notes rule out red intermediate commits (`tsc -b` type-checks the tests). RED was checked locally before each implementation (see Decisions), and the commits are `feat(...)` with tests included.

## Issues Encountered

- The `.beat-banner-emoji` flex `gap: 4px` only applies between flex items, and the emoji line is one JSX text node (per plan). The emojis are therefore spaced by the space character in the copy, and wrapping still happens at those spaces. If the 07-04/UAT look needs the exact 4 px gap, render each emoji as its own `<span>`.
- `src/game/GameApp.tsx` header comment still says "지금 끝내기 skips the beats (gameEnded → skipAll)". That is still true for the manual end. The file was left untouched per the plan ("GameApp needs no change").

## Known Stubs

None.

## Next Phase Readiness

- 07-04 (3D characters) can read `current.kind === 'miss'` (pid) and `'win'` (winners, animals) for sad / winner faces and cheer motion. It must not complete these beats; the Banner does.
- The engine, store, schema, io and settings are unchanged (`git diff --exit-code` passes).

## Self-Check: PASSED

- FOUND: src/game/director/timeline.ts, src/game/hud/Banner.tsx, src/game/labels.ts, src/game/GameStage.tsx, src/game/director/useDirector.ts, src/game/styles/game.css
- FOUND commits: 6c7b4b2, 17b2be3
