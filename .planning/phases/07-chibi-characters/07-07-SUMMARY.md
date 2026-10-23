---
phase: 07-chibi-characters
plan: 07
subsystem: game-hud
tags: [hud, game-over, crowns, win-banner, gap-closure]
status: complete

requires:
  - phase: 07-chibi-characters
    provides: "07-01 win beat (1500 ms at gameOver), win banner copy, boardAria over flag; engine game.winners (winnersByStars)"
provides:
  - "labels.GAME_OVER_PILL ('🏁 게임 끝'); BannerCopy.bigItems (one fixed animal emoji per winner)"
  - "TurnHud over prop: game-over pill (keyed 'over'), no dot / 차례 suffix / 🔁 chip / member line, no 다음 block; round block and 지금 끝내기 kept"
  - "Scoreboard currentId: string | null and crownIds override of the rank-1-with-stars crown rule"
  - "Banner win row: one .beat-banner-emoji-item per animal, is-many class above 4 winners; CSS .beat-banner-emoji.is-many uses --game-heading"
  - "GameStage: one over = phase === 'gameOver' flag drives TurnHud, Scoreboard (currentId null, crownIds = game.winners) and the canvas aria"
affects: [07-08 occlusion measurement, phase 7 re-verification, Phase 8 result/award screens]

tech-stack:
  added: []
  patterns:
    - "Optional override props on presentational HUD parts (over, crownIds) so GameStage derives the game-over view from one engine flag"
    - "Emoji-only rows render one flex item per glyph with single-space text nodes between, so textContent stays the joined string and the row aria-label still names it"

key-files:
  created: []
  modified:
    - src/game/labels.ts
    - src/game/labels.test.ts
    - src/game/hud/TurnHud.tsx
    - src/game/hud/Scoreboard.tsx
    - src/game/hud/Banner.tsx
    - src/game/styles/game.css
    - src/game/hud/hud6.test.tsx
    - src/game/GameStage.tsx
    - src/game/stage.test.tsx

key-decisions:
  - "07-07: during gameOver the scoreboard crowns exactly game.winners (crownIds overrides the rank rule), so all-zero-star co-winners get the 👑 like the 3D win crowns; no cell is current"
  - "07-07: the win banner keeps the joined big string for text/tests and adds bigItems; more than 4 winners switch the row to --game-heading so 8 fit in two rows of min(60%, 320px)"

requirements-completed: [CHAR-03]

duration: 4min
completed: 2026-10-23
---

# Phase 7 Plan 07: Game-over HUD and win-banner emoji items Summary

**During the 1500 ms win beat the DOM HUD now matches the 3D scene. The turn bar reads `🏁 게임 끝` with no next block, no scoreboard cell is marked current, and the 👑 goes to exactly the engine winners, including all-zero-star co-winners. The win banner emoji row also renders one flex item per animal, so the gap and wrap rules apply and 8 winners fit in two rows.**

## Performance

- **Duration:** about 4 min
- **Completed:** 2026-10-23
- **Tasks:** 2
- **Files:** 9 (all modified)

## Accomplishments

- Closes 07-REVIEW WR-03 (D-14a). The `🏆 공동 우승!` banner no longer sits next to an `OO 차례` pill and a different set of crowns.
- Closes 07-REVIEW IN-01. The emoji row is no longer a single text node inside a flex box.
- One `over` flag in GameStage now drives the turn pill, the scoreboard and the canvas aria label, so the three cannot disagree.
- Nothing changes outside gameOver. All existing TurnHud, Scoreboard and stage cases pass unchanged.

## Task Commits

1. **Task 1: game-over turn pill, scoreboard props, win banner emoji items** - `015cf26` (feat; tests and code together)
2. **Task 2: GameStage wiring and win-beat integration tests** - `f658801` (feat; tests and code together)

## Verification

- `npx tsc -b && npx vitest run && npm run build`: 51 files, 1083 tests pass; build OK (only the existing chunk-size warning).
- `git diff --exit-code f7a01dc -- src/engine src/store.ts src/schema.ts src/lib/io.ts src/settings.ts` is clean.
- All acceptance greps pass. `dangerouslySetInnerHTML` count is 0 in TurnHud, Scoreboard and Banner.

## TDD Gate Compliance

Both tasks are `tdd="true"`. For each one the tests were written first and run to confirm they failed: 5 failures in hud6/labels for Task 1 and 2 in stage.test for Task 2. The code was then written to make them pass. Following the plan and the project's rule that every commit must be green, each task's tests and code went into a single `feat` commit, so there are no separate `test(...)` RED commits.

## Deviations from Plan

None. The plan was executed as written.

## Threat Mitigations

- T-07-21: names are still JSX text only. The game-over pill is the fixed `GAME_OVER_PILL` constant, the win items are fixed `ANIMAL_EMOJI` values, and the existing `<b>x</b>` tests stay green.
- T-07-22: the pill, the scoreboard and the canvas aria all read one `over` flag from the engine phase. Crowns come from `game.winners`. Stage tests pin both the one-winner case and the all-zero co-winner case.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: all 9 modified files
- FOUND: 015cf26, f658801
