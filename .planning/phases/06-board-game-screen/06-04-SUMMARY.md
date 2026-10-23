---
phase: 06-board-game-screen
plan: 04
subsystem: game-hud
tags: [react, hud, a11y, css, beats, tdd]
status: complete

requires:
  - phase: 06-board-game-screen
    plan: 01
    provides: "palette ANIMAL_COLOR, turnOrder nextUp / isFinalRound"
  - phase: 06-board-game-screen
    plan: 02
    provides: "timeline BeatSpec / BeatKind / isBannerBeat, usePresentation v2 (current, completeBeat, play, reset), EMPTY_DISPLAYED"
provides:
  - "labels.ts: NextUpView, nextUpView, nextUpText, roundLabel, roundAria, ROUND_DOTS_MAX, ChipTone, ChipItem, chipItems, BannerTone, BannerCopy, bannerCopy, scoreAria, boardAria, CTX_COPY, REDRAW_LABEL"
  - "hud/StatusChips.tsx: props { move, pending } → div.status-chips (aria-live polite) of span.status-chip.status-chip--{tone} (+ --dice)"
  - "hud/Banner.tsx: no props; consumes the current banner beat, completes it by id after beat.ms; div.beat-banner.beat-banner--{tone} role=status, inline --beat-ms"
  - "hud/ContextLostOverlay.tsx: props { mode: 'loading' | 'lost' | 'failed', onRedraw } → loading status line or alertdialog card with a focused 🔄 화면 다시 그리기 button"
  - "hud/Scoreboard.tsx v2: ol.sb (--sb-cols) → li.sb-cell (is-leader / is-current, --pc, aria-label) → span.sb-body keyed by stars → .sb-avatar(.sb-rank) + .sb-text(.sb-stars, .sb-name)"
  - "hud/TurnHud.tsx v2: new `next: NextUpView | null` prop; .turn-dot, keyed .turn-pill-content, .game-round (role group, is-final, .round-dots/.round-dot), .turn-next"
  - "hud/ControlsBar.tsx v2: `hidden` (replaces the old in-flight prop) + `judgement`; owns the .game-judge-result line; 🎲 in span.game-btn-emoji"
  - "game.css 'Phase 6 — HUD (06-04)' block"
affects: [06-05, 06-06]

tech-stack:
  added: []
  patterns:
    - "Banner = beat consumer: select current banner beat, setTimeout(beat.ms) → completeBeat(id), cleared on change/unmount; store watchdog remains the fallback"
    - "Status chips derived purely from (lastMove, pendingKinds) — a chip shows once its beat kind is no longer pending"
    - "Participant color reaches CSS only through the inline --pc variable (same ANIMAL_COLOR hex as the 3D pawn)"
    - "Keyed spans (turn pill content, scoreboard body) replay CSS enter/pop animations without remounting live regions"

key-files:
  created:
    - src/game/hud/StatusChips.tsx
    - src/game/hud/Banner.tsx
    - src/game/hud/ContextLostOverlay.tsx
    - src/game/hud/hud6.test.tsx
  modified:
    - src/game/labels.ts
    - src/game/labels.test.ts
    - src/game/hud/Scoreboard.tsx
    - src/game/hud/TurnHud.tsx
    - src/game/hud/ControlsBar.tsx
    - src/game/PlayView.tsx
    - src/game/hud/hud.test.tsx
    - src/game/hud/tempHud.test.tsx
    - src/App.test.tsx
    - src/game/styles/game.css

key-decisions:
  - "06-04: chip tones are plain / sun / grass / coral / grape; the dice chip is tone plain plus the extra status-chip--dice class (Heading size), the start-tile chip is plain"
  - "06-04: the suppressed-extra banner carries no 보너스/함정 label chip (its top line is the rule text, not the event name)"
  - "06-04: ControlsBar shows the miss line only when judgement.retry is false; the success line is a single text node '🎉 성공! ⭐+n'"
  - "06-04: round block uses flex-wrap (label on its own row, dots + r/R on the next) so the dots sit left of the number; phone hides the label (aria-label stays)"
  - "06-04: button heights (64px phone / 56px short) are left to 06-06's stage block as its plan specifies"

patterns-established:
  - "HUD parts are props-only except Banner, which reads only usePresentation"

requirements-completed: [HUD-01, HUD-02, HUD-03, HUD-04, ROUND-02, STAB-02]

duration: 8min
completed: 2026-10-23
---

# Phase 6 Plan 04: DOM HUD Parts Summary

**This plan adds the DOM HUD that sits over the 3D board. It includes a star scoreboard v2 whose avatar colors match the pawns, with crown and rank badges. The turn bar v2 gains a color dot, a next-turn block and round dots, plus a 마지막 라운드 emphasis. ControlsBar v2 hides itself instead of disabling and now owns the judgement result line. Three new parts are added: status chips that wait for their beat, a banner that consumes each beat for exactly its length, and a loading / recovery overlay. Every new UI-SPEC string lives in labels.ts.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-10-23T01:36:00Z
- **Completed:** 2026-10-23T01:44:04Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments

- `labels.ts` pins every Phase 6 HUD string: next turn (`🏁 이번이 마지막 차례!`, `🔁 한 번 더: …`, `팀 · 팀원`), round label and aria, status chips, banner copy for each beat kind, score cell aria, board aria and recovery copy.
- The Banner shows the startBonus, event, stars and finalRound beats for exactly `beat.ms` and then completes each one once, by id. It renders nothing for dice, preview and hop beats, so those are ended only by their consumer or by the store watchdog.
- StatusChips adds `🎲 n`, `🏁 ⭐+n`, the event chip and `🏁 출발 칸!` only after the matching beat has finished. Event names never appear in chips.
- ContextLostOverlay shows a loading line, then a `lost` or `failed` alertdialog. Its single `🔄 화면 다시 그리기` button gets focus.
- Scoreboard v2: sorted by stars with shared ranks (1,1,3), a 👑 badge for rank 1 with at least one star, `--pc` set from ANIMAL_COLOR, and at most 4 grid columns. Ranks share the top spot on ties.
- TurnHud v2: color dot, a pill keyed per turn, a round block with R dots when R ≤ 10, `마지막 라운드` with the is-final style, and the next-turn block.
- ControlsBar v2: `hidden` returns null; the 🎲 sits in `span.game-btn-emoji`; the result line sits above the next button.
- The temporary PlayView passes `next` and `judgement`, so the judgement text appears exactly once.
- The game.css "Phase 6 — HUD (06-04)" block is append-only, uses tokens and color-mix only, and turns animations off under reduced motion.

## Task Commits

1. **Task 1: copy helpers + chips + banner + overlay.** RED `ff1fcab` (test) → GREEN `cf9cb48` (feat)
2. **Task 2: scoreboard / turn bar / controls v2 + PlayView + test moves.** RED `0d962fa` (test) → GREEN `e6a5ee7` (feat)
3. **Task 3: Phase 6 — HUD CSS block.** `7946c5a` (feat)

## Files Created/Modified

- `src/game/labels.ts`: Phase 6 HUD copy helpers
- `src/game/hud/StatusChips.tsx`, `Banner.tsx`, `ContextLostOverlay.tsx`: new parts
- `src/game/hud/Scoreboard.tsx`, `TurnHud.tsx`, `ControlsBar.tsx`: v2 rewrites
- `src/game/PlayView.tsx`: passes the new props and drops its own judgement paragraph
- `src/game/hud/hud6.test.tsx`: 27 component tests for the six parts
- `src/game/labels.test.ts`: new copy cases
- `src/game/hud/hud.test.tsx`, `tempHud.test.tsx`: the moved describes were removed
- `src/App.test.tsx`: the two 1-round expectations now read `마지막 라운드1/1`
- `src/game/styles/game.css`: appended HUD block

## Decisions Made

See `key-decisions` in the frontmatter. The main choices: chip tone mapping, no label chip on the suppressed-extra banner, a flex-wrap layout for the round block, and leaving button heights to 06-06.

## Deviations from Plan

None. The plan ran as written. One small test-only adjustment: the hud6 `afterEach` store reset is wrapped in `act()` so React raises no warning when a Banner is still mounted.

## Issues Encountered

None. The stderr lines from `board.test.tsx` were already there (06-03 camera tests) and are unrelated.

## Known Stubs

None. Every part is fully wired to its props or store. GameStage placement is 06-06's job, as planned.

## Threat Flags

None. T-06-08: all user strings render as JSX text, and the `<b>x</b>` / `<i>y</i>` literal-render tests pass. T-06-09: the controls are hidden, never disabled. T-06-10: the Banner timer is cleared on change and completion is guarded by id.

## Next Phase Readiness

- 06-06 can place `TurnHud`, `Scoreboard`, `ControlsBar(hidden=…)`, `StatusChips`, `Banner` and `ContextLostOverlay` in GameStage and remove PlayView along with the dead Phase 5 CSS.

## Self-Check: PASSED

- All 4 created files exist; all 5 commits (ff1fcab, cf9cb48, 0d962fa, e6a5ee7, 7946c5a) are in git log
- `npx vitest run`: 39 files / 881 tests passed; `npm run build`: passed

---
*Phase: 06-board-game-screen*
*Completed: 2026-10-23*
