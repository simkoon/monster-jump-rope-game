---
phase: 06-board-game-screen
plan: 01
subsystem: game-3d-foundation
tags: [three, r3f, layout, camera, palette, tdd, package-gate]
status: complete

requires:
  - phase: 05-engine-v2
    provides: "GameState, currentParticipant/activeMember selectors, Tile/TileKind, AnimalId, testkit"
provides:
  - "exact-pinned 3D stack (three 0.186.1, @react-three/fiber 9.8.2, @react-three/drei 10.7.9, dev @types/three 0.186.0, @react-three/test-renderer 9.1.1), recorded in 06-01-VERSIONS.json"
  - "palette.ts: ANIMAL_COLOR / ANIMAL_EYE / DIFF_COLOR / EVENT_COLOR / SCENE_COLOR / LIGHTS (single hex source for DOM + 3D)"
  - "ringLayout.ts: square ring geometry + tileCenter/tileTop/footprintHalf/gapPoint/cornerArrows/boardExtents"
  - "fitCamera.ts: closed-form fixed quarter-view camera fit (CAMERA_FOV 35)"
  - "diceFaces.ts: FACE_UP_EULER / FACE_NORMAL / PIP_GRID / pipPosition / diceSize / isDieFace"
  - "turnOrder.ts: nextUp / isFinalRound"
  - "scene/contextLoss.ts: watchContextLoss"
  - "ResizeObserver stub in src/test/setup.ts"
affects: [06-03, 06-04, 06-05, 06-06, phase-07-characters]

tech-stack:
  added: ["three@0.186.1", "@react-three/fiber@9.8.2", "@react-three/drei@10.7.9", "@types/three@0.186.0 (dev)", "@react-three/test-renderer@9.1.1 (dev)"]
  patterns:
    - "Pure 3D-contract modules (layout, palette, turn order) carry no runtime three import, so the main chunk stays three-free"
    - "Geometry invariants proven by numeric tests (footprint gap, clockwise walk, 8-corner projection)"
    - "Test-only three imports (Euler/Vector3/PerspectiveCamera) to verify the pure math against the real renderer math"
    - "Palette pinned to index.css light tokens via `?raw` import"

key-files:
  created:
    - .planning/phases/06-board-game-screen/06-01-VERSIONS.json
    - src/game/palette.ts
    - src/game/palette.test.ts
    - src/game/layout/ringLayout.ts
    - src/game/layout/ringLayout.test.ts
    - src/game/layout/diceFaces.ts
    - src/game/layout/diceFaces.test.ts
    - src/game/layout/fitCamera.ts
    - src/game/layout/fitCamera.test.ts
    - src/game/turnOrder.ts
    - src/game/turnOrder.test.ts
    - src/game/scene/contextLoss.ts
    - src/game/scene/contextLoss.test.ts
  modified:
    - package.json
    - package-lock.json
    - src/test/setup.ts
    - vitest.config.ts

key-decisions:
  - "06-01: D-05 3D versions kept (user approved after registry check) — recorded in 06-01-VERSIONS.json as set d05"
  - "06-01: event hex pad circumradius 0.52 (not UI-SPEC 0.56) so the D-11 tile gap stays >= 0.1t with a vertex along travel"
  - "06-01: start tile center shifted +0.2 on BOTH x and z (Pitfall 7) — 0.12t gap to its neighbors"
  - "06-01: vitest css.include = [/\\.css\\?raw$/] so raw CSS text reaches tests; normal CSS imports stay blanked"

requirements-completed: [BOARD-01, BOARD-02, HUD-02, STAB-02]

duration: 7min
completed: 2026-10-23
---

# Phase 6 Plan 01: 3D Foundation (packages, palette, ring layout, camera fit) Summary

**Installed the exact-pinned three/R3F/drei stack once the user approved the registry check, then added the pure three-free modules the Phase 6 screen builds on: a shared color palette, the clockwise square-ring geometry (gap >= 0.1t proven), a closed-form camera fit that frames the board for aspects 0.45–2.4, the die face table, the next-turn selector and the WebGL context-loss watcher.**

## Performance

- **Duration:** ~7 min
- **Completed:** 2026-10-23
- **Tasks:** 3/3
- **Files:** 13 created, 4 modified

## Task 1 — Package legitimacy gate (T-06-SC)

The orchestrator ran the read-only `npm view` checks and showed the results to the user before anything was installed:

| Package | Version | Repository | Install scripts | Published |
|---------|---------|------------|-----------------|-----------|
| three | 0.186.1 | github.com/mrdoob/three.js | none | 2026-09-24 |
| @types/three | 0.186.0 | DefinitelyTyped | none | 2026-09-11 |
| @react-three/fiber | 9.8.2 | github.com/pmndrs/react-three-fiber | none | 2026-10-14 |
| @react-three/drei | 10.7.9 | github.com/pmndrs/drei | none | 2026-09-25 |
| @react-three/test-renderer | 9.1.1 | github.com/pmndrs/react-three-fiber | none | 2026-07-31 |

**User answer: "approved"** (keep the D-05 versions). Recorded in `06-01-VERSIONS.json` as `"set": "d05"` with the five versions. The record check passed, and `package.json`/`package-lock.json` were unchanged at recording time.

## Accomplishments

- 3D stack installed with `npm install --save-exact` on top of the existing lockfile, with `.npmrc` (`legacy-peer-deps=true`) unchanged. `package.json` and `npm ls` both match `06-01-VERSIONS.json`.
- `palette.ts` holds every DOM/3D hex. Tests pin DIFF_COLOR and 7 of the 8 animal colors to the index.css light tokens, check that bear `#9C6644` is the one new color, and check that all 8 participant colors are distinct.
- `ringLayout`: start is at the bottom-right and the walk runs clockwise, with corners at 0/s/2s/3s and lattice step = pitch 1.14. Every pair of footprints is at least 0.1t apart for the 16/20/24 boards and quest/event/alternating mixes. Corner arrows sit ≥ 0.34 from every tile, and `boardExtents` = half + 0.95, h 2.0.
- `fitCamera`: all 8 board-box corners project inside NDC, and the tight axis is filled ≥ 90%, for 8 aspects × 3 board sizes (24 projection tests). Pitch is 60° in portrait and 50° on wide screens, and a bad aspect is treated as 1.
- `diceFaces`: every face's normal rotates to +Y under FACE_UP_EULER (checked with real three Euler math).
- `nextUp`: wraps around, returns null on the last turn of the game, repeats the same participant on an extra turn, and rotates team members (including the single-participant case). `isFinalRound` is also in place.
- `watchContextLoss`: calls `preventDefault` and `onLost` once per loss, calls `onRestored` when given, and stops after unsubscribe.

## Task Commits

1. **Task 1: version record (approved D-05)** — `c099dc6` (docs)
2. **Task 2 RED: palette / ringLayout / dice tests** — `4141fbf` (test)
3. **Task 2 GREEN: install + setup stub + palette + ringLayout + diceFaces** — `8b638cd` (feat)
4. **Task 3 RED: fitCamera / nextUp / contextLoss tests** — `0134132` (test)
5. **Task 3 GREEN: fitCamera + turnOrder + contextLoss** — `05ad930` (feat)

## Decisions Made

- **Event pad radius 0.52 (discretion, recorded as the plan asked):** UI-SPEC lists a circumradius of 0.56. With a hex vertex pointing along travel, that leaves only 0.08t to a square neighbor. 0.52 keeps the D-11 minimum of ≥ 0.1t (0.10 event-to-event, 0.12 event-to-quest), and the inner top disc (r 0.40) still fits inside the 0.45 apothem.
- **Start offset on both axes:** the start tile center sits at (half + 0.2, half + 0.2), leaving a 0.12t gap to tiles 1 and n−1.
- **Corner arrow inset 0.85:** the clearance to the nearest tile is 0.35, against the 0.34 required (R 0.32 + 0.02).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vitest blanks `?raw` CSS imports**
- **Found during:** Task 2 GREEN
- **Issue:** Vitest's `vitest:css-disable` plugin replaces every CSS id that is not in `test.css.include` with an empty string, including `index.css?raw`. The palette token tests therefore read `""`.
- **Fix:** Added `css: { include: [/\.css\?raw$/] }` to `vitest.config.ts`. Only raw CSS text gets through; normal `.css` imports stay blanked, so tests still skip Tailwind processing. The full suite stayed green.
- **Files modified:** vitest.config.ts
- **Commit:** 8b638cd

**2. [Rule 1 - Test setup] Team test set memberTurnIndex before createGame**
- **Found during:** Task 3 GREEN
- **Issue:** `createGame` resets every team's `memberTurnIndex` to 0, so the team test passed a stale index.
- **Fix:** Set the index after creation with the testkit `patchParticipant`. The selector itself did not change.
- **Files modified:** src/game/turnOrder.test.ts
- **Commit:** 05ad930

## Deferred Issues

- `npm audit` reports 6 vulnerabilities, all in the vite 8.1.5 / vitest 3.2.4 dev toolchain that was already installed (none from the 3D packages). Logged in `deferred-items.md`. `audit fix --force` was not run because it would move vite outside the pinned range.

## Verification

- `npx tsc -b`: exit 0
- `npx vitest run`: 37 files, 826 tests passed
- `npm run build`: built. The main chunk is 349 kB and has no three import, because nothing in the app imports the new modules at runtime yet.
- Purity grep (`^import [^t].*from 'three|@react-three'`): 0 for palette, ringLayout, diceFaces, fitCamera, turnOrder, contextLoss
- `git diff HEAD -- src/engine`: empty (engine untouched)
- `.npmrc` still `legacy-peer-deps=true`

## Known Stubs

None. These are pure modules with no UI wiring; plans 06-03 to 06-06 will consume them.

## TDD Gate Compliance

Task 2 and Task 3 each have a `test(...)` RED commit (`4141fbf`, `0134132`) followed by a `feat(...)` GREEN commit (`8b638cd`, `05ad930`). RED failed for the expected reason (the modules did not exist yet).

## Self-Check: PASSED

All 8 key files exist; commits c099dc6, 4141fbf, 8b638cd, 0134132, 05ad930 are in git log.
