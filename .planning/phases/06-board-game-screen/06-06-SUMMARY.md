---
phase: 06-board-game-screen
plan: 06
subsystem: game-stage
tags: [react, lazy-chunk, director, hud, css-grid, context-loss, offline, tdd]
status: complete

requires:
  - phase: 06-board-game-screen
    plan: 02
    provides: "useDirector, usePresentation v2 (busy/consumedLog/displayed/skipAll), pendingKinds"
  - phase: 06-board-game-screen
    plan: 04
    provides: "TurnHud, Scoreboard, ControlsBar(hidden), StatusChips, Banner, ContextLostOverlay"
  - phase: 06-board-game-screen
    plan: 05
    provides: "loadGameCanvas, GameCanvasProps, lazy GameCanvas chunk"
provides:
  - "GameStage.tsx: 3D game screen shell (replaces the Phase 5 temporary play screen), READY_TIMEOUT_MS"
  - "GameApp.tsx: useDirector() mount + routing (setup / result after beats / stage)"
  - "src/test/fakeGameCanvas.tsx: fake lazy canvas + fakeCanvas controller, settle(), waitForCanvas()"
  - "stage.test.tsx: hide/flicker, watchdog, displayed stars, final-round banner, context loss, failure, timeout, visibility, end-now"
  - "main.tsx: idle preload of the 3D chunk"
  - "game.css 'Phase 6 — stage (06-06)': portrait/landscape grid, floating quest card, 72/64/56px targets"
affects: [phase-07-characters, phase-08-celebrate]

key-files:
  created:
    - src/game/GameStage.tsx
    - src/test/fakeGameCanvas.tsx
    - src/game/stage.test.tsx
  modified:
    - src/game/GameApp.tsx
    - src/App.test.tsx
    - src/game/hud/hud.test.tsx
    - src/game/hud/tempHud.test.tsx
    - src/game/hud/ControlsBar.tsx
    - src/game/labels.ts
    - src/main.tsx
    - src/game/styles/game.css
  deleted:
    - src/game/PlayView.tsx
    - src/game/hud/RingStrip.tsx
    - src/game/hud/DiceResultPanel.tsx

key-decisions:
  - "06-06: controlsVisible = !busy && consumedLog === game.log && ready && !failure; the quest card uses the same gate (D-23/D-25)"
  - "06-06: the recovery button is the only remount path (skipAll → close → canvasKey + 1, fresh React.lazy per attempt)"
  - "06-06: the portrait bottom area reserves one primary-button row (grid minmax(var(--tap), auto)) so the canvas cell — and the fitted board — does not jump when the controls hide during beats"
  - "06-06: tileGlyph / tileAriaLabel kept in labels.ts (tested) for a future DOM tile description"
  - "06-06: in the stage the turn-bar name stays on one line (ellipsis); it wraps only in team mode (:has(.game-turn-member))"

requirements-completed: [BOARD-01, BOARD-02, BOARD-03, HUD-01, HUD-02, HUD-03, HUD-04, ROUND-02, STAB-02, STAB-04]

duration: 2 sessions
completed: 2026-10-23
---

# Phase 6 Plan 06: GameStage 3D game screen — Summary

**Starting a game now opens the 3D ring-board stage: turn bar on top, the whole board in the middle, the 🎲 / next button and star scoreboard at the bottom (right panel in landscape). Controls and the quest card appear only after every beat ends; context loss, chunk failure, an 8 s ready timeout and a hidden tab all recover without losing stars, positions or turn.**

## Tasks

| Task | Commits | Result |
|------|---------|--------|
| 1. GameStage + director mount + fake canvas + integration tests | `1da5fc4` (RED), `2ff6a18` (GREEN) | stage.test.tsx + App 'plays one full game' green |
| 2. Flow-test migration, Phase 5 parts deleted, idle preload | `17a0bc1` | hud.test.tsx on GameApp + fake canvas; PlayView/RingStrip/DiceResultPanel removed; `loadGameCanvas()` at idle |
| 3. Stage CSS, dead CSS removed, build/offline guards | `e0febc5`, `c39ca9f` | all acceptance greps 0; guard command passes |

## Verification

- `npx tsc -b && npx vitest run` — 43 files, 918 tests passed
- `npm run build` + guards: no WebGLRenderer in the main chunk, a separate 3D chunk with it, no CDN host in dist, no `__loseContext` in dist, `/monster-jump-rope-game/assets/` in index.html — **GUARDS-OK**
- `git diff HEAD -- src/engine src/store.ts src/schema.ts src/lib/io.ts src/settings.ts` empty (engine/content/settings untouched)
- Chunk sizes: main `index-*.js` 359 KB (112 KB gzip), `GameCanvas-*.js` 950 KB (254 KB gzip), CSS 59.5 KB

### Headless layout check (Chromium + SwiftShader, `vite preview`)

| Viewport | Canvas cell | Primary button | Page scroll |
|----------|-------------|----------------|-------------|
| 390×844 | 374×594 | 64px | none |
| 360×640 | 344×398 | 56px | none |
| 768×1024 | 728×726 | 72px | none |
| 1024×768 (landscape panel) | 728×644 | 72px | none |
| 844×390 (phone landscape, 200px panel) | 588×290 | 56px | none |

The whole board fits in every viewport; the quest card docks to the bottom in portrait with the board top still visible.

## Deviations from Plan

1. **[Rule 1 – Bug] 2px page overflow on the stage.** `.panel--game-shell` has a 1px border around the 100dvh stage, so the page scrolled 2px. Fixed in game.css (`.app--playing .panel--game-shell { border-width: 0 }`).
2. **[Rule 1 – Bug] Phone '지금 끝내기' showed "끝내기지…".** A later Phase 4.1 rule restored the label font size after the `font-size: 0` + `::before '끝내기'` trick. Re-applied `font-size: 0` inside the stage at ≤560px.
3. **[Rule 2 – Layout] Landscape turn bar was ~150px tall** (desktop 40px name wrapping, end-now label wrapping), leaving the phone-landscape canvas only 190px tall. Added one-line name/label rules, a heading-size name in landscape and a slim bar at max-height 500px; the canvas cell grew to 290px (844×390) and 644px (1024×768).
4. **[Rule 2 – Layout] Reserved controls row in portrait** (not in the plan): without it the canvas cell grew by a button height whenever the controls hid during beats, re-fitting (resizing) the board every turn.

## Human checks (end of phase, D-29)

The 8 real-device checks from Task 3 `<human-check>` remain for the phase UAT: iPhone portrait fit, 3-second readability, cuteness, beat order, color sameness, iOS context-loss recovery, airplane-mode start, iPad/laptop landscape panel.

## Self-Check: PASSED
