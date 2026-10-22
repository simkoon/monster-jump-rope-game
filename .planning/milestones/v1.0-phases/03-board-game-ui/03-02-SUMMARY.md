---
phase: 03-board-game-ui
plan: 02
subsystem: ui
tags: [react, hud, child-ui, r3f-overlay, big-buttons, mission-card, setup, result, ART-04, D-09, D-10]

# Dependency graph
requires:
  - phase: 03-board-game-ui
    plan: 01
    provides: R3F 3D board (BoardScene), PlayView orchestration, usePresentation ANIM_DONE store, GameApp routing, App default 게임 (D-10)
  - phase: 02-playable-core-loop
    provides: pure engine + useGameStore bridge (draw/judge/roll/next/end/reset/startGame), SetupScreen/ResultScreen flow (now retired)
  - phase: 01-foundation-content-editor
    provides: index.css design tokens, SegmentedControl/Modal/ConfirmDialog, mission/event store + zod schema
provides:
  - Child-facing play HUD over the 3D board — big (>=72px) minimal-text buttons, turn HUD, mission-card overlay, dice-result/event panel, position readout (ART-04)
  - game-screen token layer (--tap/--tap-sm/--hud-h + 4-size type scale) extending Phase 1 index.css without forking it
  - Child-reskinned SetupView + ResultView reusing ALL Phase 2 logic (empty-library guard, tie-break) via the useGameStore bridge
  - GameApp routing entirely on the real child UI; the throwaway harness screens are deleted
affects: [phase-4-art, hud, perf-tablet]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - presentational-hud-components-driven-by-store-in-playview
    - dom-hud-overlay-siblings-of-canvas-not-drei-html
    - game-token-layer-extends-phase1-css-vars-no-fork
    - confirmdialog-gates-disruptive-manual-end
    - vi-mock-boardscene-for-headless-hud-tests

key-files:
  created:
    - src/game/styles/game.css
    - src/game/hud/TurnHud.tsx
    - src/game/hud/MissionOverlay.tsx
    - src/game/hud/ControlsBar.tsx
    - src/game/hud/DiceResultPanel.tsx
    - src/game/hud/PositionReadout.tsx
    - src/game/hud/SetupView.tsx
    - src/game/hud/ResultView.tsx
    - src/game/hud/hud.test.tsx
    - src/game/hud/shell.test.tsx
  modified:
    - src/game/PlayView.tsx
    - src/game/GameApp.tsx
    - src/main.tsx
    - src/App.test.tsx
  deleted:
    - src/harness/GameHarness.tsx
    - src/harness/PlayHarness.tsx
    - src/harness/PlayHarness.test.tsx
    - src/harness/SetupScreen.tsx
    - src/harness/SetupScreen.test.tsx
    - src/harness/ResultScreen.tsx
    - src/harness/ResultScreen.test.tsx

key-decisions:
  - "HUD components are presentational (props-driven); PlayView owns the store wiring + ANIM_DONE sequence. Keeps the components jsdom-testable without the engine or Canvas."
  - "game.css declares additive tokens only (--tap/--tap-sm/--hud-h + 40/26/20/15 scale) and reuses every Phase 1 hue/radius/shadow verbatim — no palette fork (UI-SPEC EXTENDS Phase 1)."
  - "The event banner's N칸 is derived (to - (from + lastRoll)) since LandingResult carries no event magnitude; keeps the engine unchanged while honoring the UI-SPEC copy."
  - "Manual end (지금 순위로 마치기) routes through the reused focus-trapped ConfirmDialog before end('manual') so a stray child tap can't end a live game (threat T-03-04)."
  - "hud.test.tsx mocks BoardScene (vi.mock) so PlayView mounts headlessly in jsdom — the phase->controls mapping and busy-gating are asserted without WebGL."

requirements-completed: [ART-04]

coverage:
  - id: C1
    description: "Play HUD phase->visible-controls mapping over the 3D board (awaitingDraw/judgement/roll/resolved), busy-gated (ART-04, D-07)"
    requirement: ART-04
    verification:
      - kind: integration
        ref: "src/game/hud/hud.test.tsx#PlayView HUD — phase → visible controls (FSM, ART-04/D-07)"
        status: pass
    human_judgment: false
  - id: C2
    description: "PRIMARY game buttons carry the --tap sizing class + text label (color independence); difficulty badge + event-banner copy per effect"
    requirement: ART-04
    verification:
      - kind: unit
        ref: "src/game/hud/hud.test.tsx#ControlsBar/MissionOverlay/DiceResultPanel"
        status: pass
    human_judgment: false
  - id: C3
    description: "Manual end gated by focus-trapped ConfirmDialog (threat T-03-04); timer shown only when a limit is set"
    verification:
      - kind: unit
        ref: "src/game/hud/hud.test.tsx#TurnHud — manual end gated by ConfirmDialog"
        status: pass
    human_judgment: false
  - id: C4
    description: "SetupView reuses Phase 2 logic — empty-library 시작 guard (MISSION-07), team-mode member inputs, launches awaitingDraw"
    verification:
      - kind: integration
        ref: "src/game/hud/shell.test.tsx#SetupView — empty-library guard (MISSION-07)"
        status: pass
    human_judgment: false
  - id: C5
    description: "ResultView reuses REASON_COPY + tie-break radio (D-05); 다시 시작/시작 화면으로 restart paths (LOOP-10)"
    verification:
      - kind: integration
        ref: "src/game/hud/shell.test.tsx#ResultView — winner / co-winner + restart (D-05/LOOP-10)"
        status: pass
    human_judgment: false
  - id: C6
    description: "GameApp routes setup/play/result on the reskinned views; App opens in 게임 mode rendering SetupView, editor reachable via the switch (D-10)"
    requirement: ART-04
    verification:
      - kind: integration
        ref: "src/App.test.tsx#App shell — default 게임 entry (D-10)"
        status: pass
    human_judgment: false
  - id: C7
    description: "Tablet GPU-memory stability across 5+ consecutive games (gl.info.memory flat, no leak) + big-button child ergonomics + reduced-motion playability + editor coexistence"
    verification:
      - kind: manual_procedural
        ref: "03-02-PLAN.md Task 2 <human-check> — end-of-phase tablet perf/leak UAT (D-08 / Success Criterion 4)"
        status: unknown
    human_judgment: true
    rationale: "GPU-memory growth across consecutive games and child tap ergonomics need a real WebGL context on the target tablet; not observable in headless jsdom. Consolidated with the 03-01 playthrough UAT (D6/D7)."

# Metrics
duration: 6min
completed: 2026-07-25
status: complete
---

# Phase 3 Plan 02: Real Child-Facing App Shell / HUD Summary

**The throwaway Phase 2 harness is retired and the game now runs entirely on the real child UI: a big-button DOM HUD (turn bar, mission-card overlay, 성공/실패, dice-result/event panel, position readout) overlaying the 03-01 3D board, plus child-reskinned setup/result — all built on additive game-screen tokens that extend Phase 1 without forking it (ART-04, D-09/D-10).**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-25T14:46:00Z
- **Completed:** 2026-07-25T14:52:20Z
- **Tasks:** 2
- **Files:** 14 created, 4 modified, 7 deleted

## Accomplishments
- Authored `src/game/styles/game.css`: the additive tap-target tokens (`--tap:72px`, `--tap-sm:56px`, `--hud-h:88px`) and the game-screen 4-size type scale (40/26/20/15), reusing every Phase 1 hue/radius/shadow/press-affordance verbatim — imported from `main.tsx` alongside `index.css`.
- Built the child play HUD as DOM siblings of the `<Canvas>` (Pattern 6, real `<button>`s not drei `<Html>`): `TurnHud` (turn pill + team sub-line + ⏱️ timer + confirm-gated 마치기, aria-live), `MissionOverlay` (name/desc/difficulty + ✅ 성공 / ❌ 실패), `ControlsBar` (🎴 카드 뽑기 / 🎲 주사위 굴리기 / 다음 ➡️), `DiceResultPanel` (🎲 N + move + event banner), `PositionReadout`.
- Rewired `PlayView` to compose the HUD while keeping the 03-01 ANIM_DONE roll sequence (beginAnim → roll → dice spin → token hop → signalAnimDone) and the DOM-owned countdown intact — all controls hidden while `usePresentation.busy` (D-07).
- Reskinned setup + result into `SetupView`/`ResultView` reusing 100% of the Phase 2 logic through the `useGameStore` bridge (empty-library `canStart` guard, `buildParticipants`/`boardLengthFor`, `REASON_COPY`, the tie-break radio) with big `--tap`/`--tap-sm` child controls and the reused `SegmentedControl`.
- Repointed `GameApp` to route setup(`SetupView`)/play(`PlayView`)/result(`ResultView`); deleted the four throwaway harness screens + their three tests; kept `useGameStore` (+ test) unchanged. Grep confirms no code imports the deleted files.
- Added `hud.test.tsx` (19 tests, BoardScene mocked for headless PlayView mounting) and `shell.test.tsx` (12 tests); updated `App.test.tsx` to assert the reskinned game view mounts on first mount. Full suite 170 green; `npm run build` passes.

## Task Commits
1. **Task 1: Child play HUD over the 3D board (ART-04)** — `ad603fd` (feat)
2. **Task 2: Child-reskin setup + result, route via GameApp, delete harness (D-09/D-10)** — `c390f2f` (feat)

## Deviations from Plan

None — the plan executed exactly as written. `src/App.tsx` was NOT modified (the D-10 default flip landed in 03-01, as specified). The `App.test.tsx` change is an additive assertion (the reskinned SetupView renders on first mount), not a re-flip of the default. No architectural changes, no auth gates, no auto-fixed bugs.

## Known Stubs
None. The only `placeholder` occurrences are legitimate HTML `<input placeholder>` attributes in `SetupView`. The `파워점핑` text logo is an intentional placeholder per the phase boundary — the original art logo is Phase 4 (ART-05), documented in the UI-SPEC.

## Reused / Temporary (not stubs)
- Placeholder token/board/dice meshes remain stylized primitives by design (D-03/D-04); Phase 4 swaps in real art through the same color-identity + `<Html>` label seam. Not incomplete stubs.

## Outstanding MANUAL / UAT (end-of-phase human verification)
This is the phase-closing human verification (D-08 / Success Criterion 4), to run on the target tablet in Chrome — it CANNOT be asserted headlessly (jsdom has no WebGL):

1. **GPU-memory / leak check (D-08, Success Criterion 4):** log `gl.info.memory` (geometries/textures) and `gl.info.render.calls` after each game; play 5+ consecutive games (다시 시작 and 시작 화면으로 → new game) and confirm the counts return to a flat baseline (no monotonic growth) and frame pacing stays smooth.
2. **Big-button child ergonomics (ART-04):** confirm every primary button is comfortably tappable (>=72px), 성공/실패 and 다음 have enough spacing to avoid mis-taps, and the flow start→play→result is operable by a child without adult help.
3. **Reduced-motion playability:** with `prefers-reduced-motion: reduce`, the game still advances (card/dice/token snap to final state, ANIM_DONE fires).
4. **Editor coexistence (D-10):** 편집기 mode still opens the Phase 1 editor and 게임 is the default entry.
5. **3D playthrough (carried from 03-01 D6):** dice top face matches the DOM roll, token hops diceValue squares, controls appear only after ANIM_DONE, finish highlight + win.

## Next Phase Readiness
- The game is fully playable and controllable via the child UI on a tablet; the engine (`src/engine/*`) and the `useGameStore` bridge are unchanged. Phase 4 can drop real art/characters/logo onto the placeholder token/board/dice seam and the `파워점핑` text-logo slot without touching this HUD contract.
- **Bundle note:** production JS remains ~1.23 MB (344 KB gzip) from three — expected/accepted; code-splitting the game bundle is an optional later optimization.

## Self-Check: PASSED

All 10 created files verified present on disk; both task commits (`ad603fd`, `c390f2f`) verified in git history; the 7 harness files confirmed deleted. Full suite 170 tests green and `npm run build` passes.

---
*Phase: 03-board-game-ui*
*Completed: 2026-07-25*
