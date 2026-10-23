---
phase: 06-board-game-screen
plan: 03
subsystem: game-3d-board
tags: [three, r3f, instancing, board, camera, tdd]
status: complete

requires:
  - phase: 06-board-game-screen
    plan: 01
    provides: "ringLayout / tileCenter / gapPoint / cornerArrows / boardExtents, fitCamera, palette (DIFF_COLOR, EVENT_COLOR, SCENE_COLOR), 3D stack + test-renderer"
provides:
  - "scene/geometries.ts: module-singleton GEO + MAT, TILE_CAP 24 / STAR_CAP 72, starShape/chevronShape/arrowShape, DIFF_THREE"
  - "scene/Board.tsx: static ring board (base/track/yard, quest-tiles, event-pads, event-pad-tops, tile-stars, start-tile) + StartGate + Arrows + TileIcons"
  - "scene/StartGate.tsx: start-gate group (pillars, arch, pennants, gold star) facing the board diagonal"
  - "scene/Arrows.tsx: arrows / arrow-outlines (n + 1), corner-arcs / corner-heads / corner-outlines (4)"
  - "scene/TileIcons.tsx: icon-forward / icon-backward / icon-loop-arcs / icon-loop-heads"
  - "scene/CameraRig.tsx: fixed fitCamera-driven camera that re-fits on canvas size change"
affects: [06-04, 06-05, 06-06]

tech-stack:
  added: []
  patterns:
    - "Shared GEO/MAT passed by reference with dispose={null}; only size-dependent base slabs are useMemo'd and disposed"
    - "Fixed-capacity InstancedMesh + mesh.count + needsUpdate in useLayoutEffect"
    - "Flat icons baked into a local frame (travel = local +Z) and oriented with rotation.y = heading"
    - "Scene structure tests in node env via @react-three/test-renderer; instance pose checked by decomposing matrices"

key-files:
  created:
    - src/game/scene/geometries.ts
    - src/game/scene/Board.tsx
    - src/game/scene/StartGate.tsx
    - src/game/scene/Arrows.tsx
    - src/game/scene/TileIcons.tsx
    - src/game/scene/CameraRig.tsx
    - src/game/scene/board.test.tsx
  modified: []

key-decisions:
  - "06-03: InstancedMesh capacities (TILE_CAP 24, STAR_CAP 72) live in geometries.ts, not Board.tsx, so Arrows/TileIcons do not import Board (module cycle would hit a TDZ at import)"
  - "06-03: chevron instance k = gap k; the second start-gap '»' chevron is instance n, so instance i (i >= 1) sits exactly at gapPoint(l, i)"
  - "06-03: corner arrow outline = one merged geometry (arc + head, y-squashed 0.6) so the ink rim shows around the white arrow without covering it"
  - "06-03: start gate shifted 0.2 toward the outer corner along the diagonal, rotation.y = atan2(sx, sz) = pi/4"

requirements-completed: [BOARD-01, BOARD-02, BOARD-03]

duration: 7min
completed: 2026-10-23
---

# Phase 6 Plan 03: Static 3D Ring Board Summary

**Static 3D ring board built from shared singleton geometry: difficulty-colored rounded quest tiles with floating 3D stars, purple hex event pads with arrow and loop icons, a gold start block with an arch gate, n + 1 gap chevrons with four corner turn arrows, and a fixed fitCamera rig that re-fits on every canvas size. The whole static board is at most 30 draw calls.**

## Performance

- **Duration:** about 7 min
- **Completed:** 2026-10-23
- **Tasks:** 2/2
- **Files:** 7 created

## Accomplishments

- `geometries.ts` builds every geometry and material once at import. RoundedBox comes from `three/addons/geometries/RoundedBoxGeometry.js`. Stars, chevrons, arrows and pennants are `Shape` + `ExtrudeGeometry`. The corner and loop arrows are partial `TorusGeometry` with `ConeGeometry` heads, all baked into a local frame where travel is +Z. The file never calls `.dispose()`.
- `Board` draws:
  - A two-layer candy base with a mint yard. These three slabs depend on the board size, so they are memoized per layout and disposed.
  - `quest-tiles` with `setColorAt(DIFF_COLOR)`.
  - `event-pads` (hexagons with a vertex along travel) and `event-pad-tops`.
  - `tile-stars`: starsFor(diff) stars per quest tile, spaced 0.30 across travel, 0.55 above the tile top, tilted back 20°.
  - `start-tile`, plus StartGate, Arrows and TileIcons.
- InstancedMesh capacities are fixed (24 for tiles, pads and icons, 25 for chevrons, 72 for stars, 4 for corners). Only `count` changes with the board.
- `CameraRig` reads `size` and `camera` from `useThree`. On every size or layout change it applies `fitCamera(aspect, boardExtents(layout))`: position, fov 35, aspect, `lookAt`, `updateProjectionMatrix`, `invalidate`. There are no controls and no follow.
- The board contains no text, numbers, drei or DOM labels, and no shadow props.

## Task Commits

1. **Task 1 RED: board tiles/stars/start tests** — `b077a4a` (test)
2. **Task 1 GREEN: geometries + Board + StartGate** — `9fd333e` (feat)
3. **Task 2 RED: arrows/icons/camera tests** — `1eb4ce3` (test)
4. **Task 2 GREEN: Arrows + TileIcons + CameraRig, wired into Board** — `70d3ebf` (feat)

## Verification

- `npx vitest run src/game/scene/board.test.tsx`: 19 tests passed. They cover:
  - counts for 16/20/24 boards
  - DIFF_COLOR per quest tile
  - fixed capacities
  - the GEO.tile dispose spy and stable uuid
  - chevron pose at gapPoint with heading direction, and the 1.3× "»"
  - forward/backward icon directions
  - the 30-draw-call budget on a 24-tile board
  - camera framing for 390×520, 520×520 and 844×330 on 16 and 24 tiles (8 corners inside NDC)
  - re-fit on `setSize`
- `npx tsc -b`: exit 0
- `npx vitest run`: 38 files, 845 tests passed
- `npm run build`: built. The main chunk is still 349 kB because nothing imports the scene yet; GameCanvas wiring comes in a later plan.
- Acceptance greps all pass:
  - the addons RoundedBox import appears once
  - no three-stdlib
  - no drei, castShadow or receiveShadow in Board, StartGate or geometries
  - no `.dispose()` in geometries
  - no OrbitControls or Bounds
  - `fitCamera(` appears once in CameraRig

## Decisions Made

See the `key-decisions` frontmatter. The main one is that the capacity constants moved to `geometries.ts`. That avoids a Board ↔ Arrows/TileIcons import cycle, which would read `TILE_CAP` before initialization when the module loads.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Import cycle for instance capacities**
- **Found during:** Task 2 GREEN
- **Issue:** Arrows and TileIcons needed `TILE_CAP`, which was in Board.tsx, and Board imports both of them. `const CHEVRON_CAP = TILE_CAP + 1` at module scope would hit a TDZ ReferenceError.
- **Fix:** Moved `TILE_CAP` and `STAR_CAP` to `geometries.ts`, next to the other shared module singletons.
- **Files modified:** src/game/scene/geometries.ts, src/game/scene/Board.tsx, Arrows.tsx, TileIcons.tsx
- **Commit:** 70d3ebf

**2. [Rule 2 - Completeness] Extra `corner-outlines` geometry**
- The plan names a `corner-outlines` mesh but no GEO entry for it. Added `GEO.cornerOutline`: the arc and head merged with `mergeGeometries`, made thicker and flattened in y, so a single instanced mesh draws the ink rim. The draw-call total stays within budget.
- **Commit:** 9fd333e

## Known Stubs

None. The board reads every visual from `tiles`. Pawns, dice and the preview are planned for 06-05.

## Threat Flags

None. There are no new network, auth or file surfaces. T-06-06 is covered by fixed capacities, never-disposed singletons (with a spy test) and size-specific base slabs that are disposed on change. T-06-07 is covered because no text reaches the scene.

## Notes for Later Plans

- R3F's test-renderer prints `THREE.Clock: This module has been deprecated` and a `require("three")` CJS deprecation to stderr. Both are harmless and come from the library internals.
- Visual checks still need a manual look in a real browser at UAT: candy look, whether the gate hides anything at the 50–60° pitch, and how the start-gap "»" overlaps the taller start block.

## TDD Gate Compliance

Both tasks have a `test(...)` RED commit (`b077a4a`, `1eb4ce3`) followed by a `feat(...)` GREEN commit (`9fd333e`, `70d3ebf`). Each RED run failed because the module did not exist yet.

## Self-Check: PASSED

All 7 created files exist, and commits b077a4a, 9fd333e, 1eb4ce3 and 70d3ebf are in git log.
