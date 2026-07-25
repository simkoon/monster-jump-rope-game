---
phase: 03-board-game-ui
plan: 01
subsystem: ui
tags: [react-three-fiber, three, drei, r3f, zustand, 3d, board-game, animation]

# Dependency graph
requires:
  - phase: 02-playable-core-loop
    provides: pure engine (createGame/drawCard/judge/rollDice/advanceTurn/endGame) + useGameStore bridge + SetupScreen/ResultScreen flow
  - phase: 01-foundation-content-editor
    provides: mission/event content store, zod schema, index.css design tokens, App view switch
provides:
  - R3F 3D board scene (instanced tiles + highlighted finish) framed by a fixed iso camera
  - Placeholder token per participant with a two-stage hop tween driven by the engine position (LOOP-06)
  - Tween dice that spins then snaps to the engine's pre-rolled face (no physics)
  - ANIM_DONE gating store (busy flag + deadlock-proof watchdog) that hides next-phase controls until animation completes
  - Pure, unit-testable boardLayout (index→Vector3) and diceRotation (face→Euler) modules
  - GameApp routing (setup/play/result) and App defaulting to 게임 mode (D-10)
affects: [03-02, phase-4-art, hud, perf-tablet]

# Tech tracking
tech-stack:
  added: [three@0.185.1, "@react-three/fiber@9.6.1", "@react-three/drei@10.7.7", "@types/three@0.185.1 (dev)", "@react-three/test-renderer@9.1.0 (dev)"]
  patterns: [pure-math-modules-outside-react, presentation-store-gates-controls-not-engine, useFrame-ref-mutation-no-per-frame-setState, instanced-tiles-single-draw-call, test-renderer-for-webgl-free-scene-assertions]

key-files:
  created:
    - src/game/boardLayout.ts
    - src/game/diceRotation.ts
    - src/game/usePresentation.ts
    - src/game/scene/BoardScene.tsx
    - src/game/scene/BoardTiles.tsx
    - src/game/scene/Token.tsx
    - src/game/scene/Dice.tsx
    - src/game/PlayView.tsx
    - src/game/GameApp.tsx
  modified:
    - src/App.tsx
    - src/App.test.tsx
    - src/components/MissionTab.test.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "frameloop='always' chosen over demand+invalidate for reliability (avoids Pitfall 4 freeze); demand is an optional 03-02 battery optimization."
  - "GameApp holds gameOver behind the busy flag so the winning token hop animates before the result screen mounts (prevents Canvas unmount mid-move)."
  - "Board tiles rendered as a single native <instancedMesh> (not drei <Instances>) so the scene test can assert instance.count === boardLength deterministically."
  - "drei <Html> labels are guarded behind typeof document !== 'undefined' so @react-three/test-renderer can mount the graph in a node env."
  - "R3F stack exact-pinned (no caret) — three/@types/three locked to 0.185.1 in lockstep (Pitfall 5)."

patterns-established:
  - "Pattern 1: pure layout/rotation math lives in non-React modules (boardLayout/diceRotation) and is unit-tested directly."
  - "Pattern 2: a presentation Zustand store (usePresentation) gates control VISIBILITY via a busy flag; the pure engine is never blocked (ANIM_DONE, D-07)."
  - "Pattern 3: token/dice tweens mutate refs inside useFrame (never setState per frame); state only changes at animation boundaries."
  - "Pattern 4: scene STRUCTURE is asserted via @react-three/test-renderer (no WebGL); motion feel is a manual check."

requirements-completed: [LOOP-06]

coverage:
  - id: D1
    description: "Pure snake-path board layout (squarePosition index→Vector3), D-03"
    requirement: LOOP-06
    verification:
      - kind: unit
        ref: "src/game/boardLayout.test.ts#snake path index→world mapping"
        status: pass
    human_judgment: false
  - id: D2
    description: "Pure dice face→up-rotation table (FACE_UP_EULER), D-05"
    verification:
      - kind: unit
        ref: "src/game/diceRotation.test.ts#FACE_UP_EULER table"
        status: pass
    human_judgment: false
  - id: D3
    description: "ANIM_DONE presentation store: busy flag + idempotent signalAnimDone + deadlock-proof watchdog (D-07, Pitfall 1)"
    verification:
      - kind: unit
        ref: "src/game/usePresentation.test.ts#ANIM_DONE gating store"
        status: pass
    human_judgment: false
  - id: D4
    description: "R3F scene structure: one instanced mesh of boardLength tiles + finish tile + one Token per participant + dice (D-03/D-04/D-08)"
    verification:
      - kind: integration
        ref: "src/game/scene/scene.test.tsx#BoardScene graph structure (headless, no WebGL)"
        status: pass
    human_judgment: false
  - id: D5
    description: "App defaults to 게임 mode and routes to GameApp; 편집기 still reachable (D-10)"
    requirement: LOOP-06
    verification:
      - kind: integration
        ref: "src/App.test.tsx#App shell — default 게임 entry (D-10)"
        status: pass
    human_judgment: false
  - id: D6
    description: "3D playthrough: dice spins & snaps to the shown roll, token hops diceValue squares, next controls appear only after ANIM_DONE, finish highlight + win — on the target tablet/Chrome"
    verification:
      - kind: manual_procedural
        ref: "03-01-PLAN.md Task 2 <human-check> — play a full game in 게임 mode"
        status: unknown
    human_judgment: true
    rationale: "WebGL rendering, tween feel, and the FACE_UP_EULER face-vs-DOM-number match (Open Q2) cannot be asserted headlessly — jsdom has no WebGL. Consolidated with the 03-02 tablet perf/leak UAT."
  - id: D7
    description: "GPU resource hygiene foundation: dpr [1,2], shared/instanced geometry, auto-dispose + explicit dispose of memoized pip geo/mat (D-08)"
    verification:
      - kind: manual_procedural
        ref: "03-02 tablet perf check — gl.info.memory flat across 5+ consecutive games (Pitfall 2)"
        status: unknown
    human_judgment: true
    rationale: "Memory stability across consecutive games needs a real WebGL context on the target device; not observable in headless tests."

# Metrics
duration: 32min
completed: 2026-07-25
status: complete
---

# Phase 3 Plan 01: R3F 3D Board — Playable Slice Summary

**A React-Three-Fiber 3D board where the engine's pre-rolled dice spins-and-snaps and the current player's token hops diceValue squares, all gated by an ANIM_DONE busy flag with a deadlock-proof watchdog — and the app now opens in 게임 mode.**

## Performance

- **Duration:** 32 min
- **Started:** 2026-07-25T14:06:32Z
- **Completed:** 2026-07-25T14:38:47Z
- **Tasks:** 2
- **Files modified:** 19 (14 created, 5 modified)

## Accomplishments
- Installed the R3F stack at exact-pinned, peer-verified versions (three 0.185.1, fiber 9.6.1, drei 10.7.7, dev @types/three + test-renderer) with NO physics engine (D-02).
- Built pure, unit-tested `boardLayout` (snake index→Vector3, D-03) and `diceRotation` (face→Euler, D-05) modules — zero React/DOM imports.
- Built the ANIM_DONE presentation store (`usePresentation`): busy flag, idempotent `signalAnimDone`, and a watchdog that guarantees the game can never lock forever (Pitfall 1).
- Rendered the 3D scene: one instanced-mesh tile path + highlighted finish (D-03/D-08), a placeholder pawn per participant with an `<Html>` name label and two-stage hop tween (D-04/LOOP-06), and a tween die that snaps to the engine's pre-rolled face (D-05).
- Wired the playable slice: PlayView orchestrates roll → dice spin → token hop → ANIM_DONE, hiding the next-phase controls while busy (D-07); GameApp routes setup/play/result and holds gameOver behind busy so the winning move animates first.
- Flipped App's default view to 게임 and routed it to GameApp, keeping the 편집기 reachable via the mode switch (D-10).

## Task Commits

1. **Task 1: Install R3F stack + pure layout/rotation math + ANIM_DONE store** - `21a9be9` (feat)
2. **Task 2: R3F board scene + playable PlayView + default 게임 (D-10)** - `be1e459` (feat)
3. **Follow-up: exact-pin the R3F stack (Pitfall 5)** - `bf59832` (chore)

**Plan metadata:** _(docs commit for SUMMARY/STATE/ROADMAP)_

_Note: this plan's TDD task (Task 1) was committed as a single feat commit — test + implementation for the three pure modules landed together and pass._

## Files Created/Modified
- `src/game/boardLayout.ts` (+test) - pure snake-path `squarePosition(index)→Vector3` (D-03)
- `src/game/diceRotation.ts` (+test) - pure `FACE_UP_EULER` face→up-rotation table (D-05)
- `src/game/usePresentation.ts` (+test) - ANIM_DONE busy flag + deadlock-proof watchdog (D-07)
- `src/game/scene/BoardScene.tsx` - `<Canvas>` root (dpr cap, iso camera, theme clear color, Bounds) + exported `SceneContents` for tests
- `src/game/scene/BoardTiles.tsx` - single instancedMesh tile path + highlighted finish tile
- `src/game/scene/Token.tsx` - placeholder pawn + `<Html>` label + two-stage hop tween → onArrive
- `src/game/scene/Dice.tsx` - white cube + pips, spin→snap to pre-rolled face, disposes memoized pip geo/mat
- `src/game/scene/scene.test.tsx` - headless scene-structure assertions via test-renderer
- `src/game/PlayView.tsx` - orchestration + thin DOM HUD + DOM-owned countdown
- `src/game/GameApp.tsx` - setup/play/result routing (gameOver held behind busy)
- `src/App.tsx` - default view `'editor'`→`'game'`, renders `GameApp` (D-10)
- `src/App.test.tsx`, `src/components/MissionTab.test.tsx` - enter 편집기 before editor assertions
- `package.json`, `package-lock.json` - R3F deps, exact-pinned

## Decisions Made
- **frameloop="always"** for reliability (avoids Pitfall 4 demand-freeze); a comment marks demand+invalidate as an optional 03-02 battery optimization.
- **GameApp holds gameOver behind `busy`** so the winning token hop finishes animating before ResultScreen mounts — otherwise the Canvas would unmount mid-move. The watchdog guarantees busy always clears, so the result screen can never be blocked.
- **Native `<instancedMesh>` (not drei `<Instances>`)** for tiles — lets the scene test assert `instance.count === boardLength` deterministically while still being one draw call (D-08).
- **`<Html>` labels guarded by `typeof document !== 'undefined'`** so the node-env test-renderer can mount the scene graph (Pitfall 3).
- **Two-stage token move** (from→afterRoll→to) with a `run` flag so the active token holds at `from` during the dice spin and never teleports to the destination early.
- **Exact-pinned R3F versions** (dropped caret) to keep three/@types/three in lockstep (Pitfall 5).
- **Participant token colors cycle index % 6** for participants 7–8 (Open Q1) — the `<Html>` name label guarantees color-independent identity.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing editor tests broke when the default view flipped to 게임 (D-10)**
- **Found during:** Task 2 (App.tsx default flip)
- **Issue:** `src/App.test.tsx` and `src/components/MissionTab.test.tsx` render `<App/>` and asserted editor content assuming the editor was the default view. After D-10 the app opens in 게임 mode, so those assertions failed (SetupScreen shown instead of the mission list).
- **Fix:** Added a scoped `enterEditor()` click on the `✏️ 편집기` toggle (scoped to the `화면 전환` nav to avoid a `/게임/` name collision with SetupScreen copy) before the editor assertions; added a new game-default test. MissionTab.test.tsx was in the same situation and given the same fix (not in the plan's files list, but breaking it was a direct consequence of the required D-10 change).
- **Files modified:** src/App.test.tsx, src/components/MissionTab.test.tsx
- **Verification:** Full suite green (162 tests).
- **Committed in:** be1e459 (Task 2 commit)

**2. [Rule 2 - Missing Critical] Explicit dispose of the memoized dice pip geometry/material (D-08)**
- **Found during:** Task 2 (Dice.tsx)
- **Issue:** The shared pip `SphereGeometry`/`MeshStandardMaterial` are created imperatively in `useMemo` and passed via props — R3F does NOT auto-dispose objects it did not create declaratively, so they would leak GPU memory on unmount (Pitfall 2).
- **Fix:** Added an unmount `useEffect` cleanup that calls `.dispose()` on both.
- **Files modified:** src/game/scene/Dice.tsx
- **Verification:** Build passes; grep confirms the only imperative geo/mat allocations are memoized+disposed.
- **Committed in:** be1e459 (Task 2 commit)

**3. [Rule 3 - Blocking] Exact-pinned the R3F stack (removed caret ranges)**
- **Found during:** Post-Task-2 verification
- **Issue:** `npm install` wrote caret ranges (`^0.185.1`); the plan and Pitfall 5 call for exact pins so three/@types/three never drift out of the same minor.
- **Fix:** Set exact versions in package.json and `npm install --package-lock-only` to resync the lockfile.
- **Files modified:** package.json, package-lock.json
- **Verification:** `npm ls` shows no unmet/invalid peers at 0.185.1 / 9.6.1 / 10.7.7.
- **Committed in:** bf59832

---

**Total deviations:** 3 auto-fixed (1 bug, 1 missing critical, 1 blocking)
**Impact on plan:** All three were necessary for correctness (test suite), resource hygiene (D-08), and version-drift safety (Pitfall 5). No scope creep — the engine and useGameStore are unchanged.

## Issues Encountered
- **Pre-existing vitest advisory (GHSA-5xrq-8626-4rwp, critical):** surfaced by `npm audit` during the install; it is a Vitest-UI-server vector in the ALREADY-present `vitest@3.2.4`, NOT introduced by the R3F install. Left unfixed and logged to `deferred-items.md` — `npm audit fix --force` would bump vitest outside the project's pinned range and risk re-triggering the Vitest/Vite-8 bundled-Vite type clash the project deliberately worked around. The project uses `vitest run` only (no UI server).
- **test-renderer noise:** `act(...) not configured` and `THREE.Clock deprecated` warnings print to stderr during scene tests; they are non-fatal and the assertions pass.

## Reused / Temporary (not stubs)
- **SetupScreen and ResultScreen are reused verbatim from `src/harness/`** for now (per plan) — 03-02 re-skins them into the child-friendly views. The harness `PlayHarness`/`GameHarness` remain in the tree but are no longer routed to from App (deletion is a 03-02 concern).
- **Token/board/dice meshes are stylized placeholder primitives** by design (D-03/D-04) — Phase 4 swaps in the real art through the same color-identity + `<Html>` label seam. These are intentional per the phase boundary, not incomplete stubs.

## User Setup Required
None - no external service configuration required. New dependencies are standard npm packages (no postinstall scripts, per the RESEARCH Package Legitimacy Audit).

## Next Phase Readiness
- The validated loop is playable on a 3D board with ANIM_DONE gating in place — 03-02 can now wrap this slice in the polished child HUD, re-skin setup/result, add the DOM mission-card overlay, and run the tablet perf/leak check.
- **Outstanding MANUAL/UAT (deferred to end-of-phase human_verify):** (1) full 3D playthrough — dice top face matches the DOM roll (validates FACE_UP_EULER, Open Q2), token hops diceValue squares, controls appear only after ANIM_DONE, finish highlight + win; (2) GPU-memory stability across 5+ consecutive games on the target tablet (D-08 / Pitfall 2). Consolidated with the 03-02 perf check.
- **Bundle note:** the production JS is ~1.23 MB (343 KB gzip) from three — expected and accepted (threat T-03-BUNDLE); code-splitting the game bundle is an optional later optimization the 03-02 perf check may weigh.

## Self-Check: PASSED

All 11 created files verified present on disk; all 3 task commits (`21a9be9`, `be1e459`, `bf59832`) verified in git history. Full suite green (162 tests) and `npm run build` passes.

---
*Phase: 03-board-game-ui*
*Completed: 2026-07-25*
