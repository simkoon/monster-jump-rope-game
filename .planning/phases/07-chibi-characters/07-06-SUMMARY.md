---
phase: 07-chibi-characters
plan: 06
subsystem: game-scene
tags: [chibi, faces, prewarm, error-boundary, star-lift, star-hide, gap-closure]
status: complete

requires:
  - phase: 07-chibi-characters
    provides: "07-03 ChibiModel / faceGeo cache / bake; 07-04 Character reactions and beat consumer; 07-05 Board occupied star lift, gallery"
provides:
  - "chibiFaces.faceSet(animal): frozen per-animal record of the 9 face geometries, built through the faceGeo cache"
  - "ChibiModel, Character and GalleryActor build all 9 faces in render (useMemo); useFrame only swaps cached references"
  - "Board: STAR_LIFT_UP 1.35, crowded prop, per-tile visibility (SHOW_RATE 30) hiding a row during its character's stars / win beat and on tiles with 2+ characters"
  - "SceneContents passes occupied (>= 1 character) and crowded (>= 2) to Board"
  - "facePrewarm.test.tsx and starClearance.test.tsx"
affects: [07-07 HUD gap closure, 07-08 occlusion measurement of the final scene, phase 7 re-verification]

tech-stack:
  added: []
  patterns:
    - "Render-time prewarm: build every variant a frame loop may swap to during render (useMemo), so a build failure is a render error an error boundary catches"
    - "Second per-tile Float32Array factor (visibility) multiplied into the instance scale; rows shrink in place and are rewritten only when a factor moved"
    - "Pass-through vi.mock(importOriginal) wrapper around bake to count builds by name"

key-files:
  created:
    - src/game/scene/facePrewarm.test.tsx
    - src/game/scene/starClearance.test.tsx
  modified:
    - src/game/scene/chibiFaces.ts
    - src/game/scene/ChibiModel.tsx
    - src/game/scene/Character.tsx
    - src/game/scene/CharacterGallery.tsx
    - src/game/scene/Board.tsx
    - src/game/scene/SceneContents.tsx
    - src/game/scene/board.test.tsx
    - src/game/layout/charMotion.ts
    - src/game/layout/charMotion.test.ts

key-decisions:
  - "07-06: faces are prebuilt per participating animal in render through faceSet (one frozen record per animal, stable identity); faceGeo stays exported for tests"
  - "07-06: STAR_LIFT_UP 1.2 -> 1.35; the row hides (scale to 0 at 1 - exp(-30 dt)) while its character plays the stars or win beat, and on any tile with 2+ displayed characters; under reduced motion the act hide is off (REST stays below the lifted row)"

requirements-completed: [CHAR-02, CHAR-03, BOARD-05]

duration: 9min
completed: 2026-10-23
---

# Phase 7 Plan 06: Face prewarm and star clearance Summary

**All 9 faces of each participating animal are now built during React render through a new `faceSet` record, so the frame loop only swaps references and a failing build reaches the error boundary. The floating quest-tile stars sit at tile top + 1.35, hide during their character's success jump and winner cheer, and hide on tiles with 2 or more characters. Two new tests check this frame by frame with the real meshes.**

## Performance

- **Duration:** about 9 min
- **Completed:** 2026-10-23
- **Tasks:** 3
- **Files:** 11 (2 created, 9 modified)

## Accomplishments

- D-08a / WR-01 / VERIFICATION gap 2: `faceSet(animal)` builds the 9 FACE_KEYS through the existing cache and memoizes one frozen record per animal. ChibiModel, Character and the gallery `GalleryActor` take it in render with `useMemo`. Character's useFrame assigns `faces[key]` and no longer imports `faceGeo`.
- facePrewarm.test: in a fresh module registry, mounting SceneContents with a bear, a rabbit and a chick builds exactly 27 faces during `create`. After that, 6 s of blinks plus stars, miss, event-forward and win beats build 0 more faces, and the bear's face shows at least 4 distinct geometries. A `pig:face:` bake made to throw is caught by a class error boundary's `componentDidCatch`.
- D-12a / WR-02: `STAR_LIFT_UP = 1.35`. A per-tile visibility array (`SHOW_RATE = 30`) hides a row while its character plays the stars beat or is a winner during the win beat. Each row is checked directly, with no allocation per frame.
- BOARD-05 / D-17a(4): new `crowded` prop. A tile with 2 or more displayed characters hides its stars. SceneContents works out `occupied` and `crowded` in one memo.
- starClearance.test (7 cases) uses the real Character and Board meshes and checks every frame:
  - a lone crowned rabbit's idle bounce, with the stars clear by at least 0.03
  - the stars beat and the win beat, where stars are hidden or clear and at least one frame has them all hidden
  - the crowd hide, and the stars coming back when a character leaves
  - the star count, the 72-instance capacity and the board's draw calls (30 or fewer)
  - reduced motion: the lift snaps, the stars stay over the REST pose through a stars beat, and the crowd hide snaps
- IN-03: removed the unused `lerpPose` export and its test. IN-05: the gallery ReadySignal comments now say 3 frames, and the code still uses `=== 3`.

## Task Commits

1. **Task 1: render-time face prewarm (D-08a, WR-01, IN-05)**: `b4ac248` (feat; tests and code committed together, no red commits)
2. **Task 2: star lift 1.35, act hide and crowd hide (D-12a, WR-02, BOARD-05)**: `43cf90c` (feat)
3. **Task 3: IN-03 cleanup and full gate**: `edee707` (refactor)

RED was checked before each GREEN by temporarily reverting the component files:
- facePrewarm's 27-build case failed on the old ChibiModel/Character.
- 6 of the 7 starClearance cases failed on the old Board/SceneContents. The capacity/draw-call case passes either way.

## Full gate (Task 3 verify)

```
 Test Files  51 passed (51)
      Tests  1079 passed (1079)
dist/assets/index-CED7rV4w.js       360.35 kB │ gzip: 112.33 kB
dist/assets/GameCanvas-j7Cn_tq4.js  969.02 kB │ gzip: 261.63 kB
✓ built in 317ms
GATE_OK   (tsc -b, vitest, build, main chunk free of WebGLRenderer, no dist/gallery.html,
           src/engine + store/schema/io/settings unchanged since f7a01dc)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test read the wrong scale for hidden stars**
- **Found during:** Task 2
- **Issue:** three r185's `Matrix4.decompose` returns scale 1 for a matrix with zero scale, so hidden stars looked visible, with their bottom at their center.
- **Fix:** `tileStars` now reads the scale from the length of matrix column 0 (with a comment), and the position from `setFromMatrixPosition`.
- **Files modified:** src/game/scene/starClearance.test.tsx
- **Commit:** 43cf90c

**2. [Rule 3 - Blocking] Drain reset `displayed` after completeBeat in the test**
- **Found during:** Task 2
- **Issue:** With no engine game in the store, completing the last beat resyncs `displayed` to EMPTY_DISPLAYED. The tile then looked empty and the stars went back to + 0.55.
- **Fix:** The test's `complete(id, back)` puts the displayed cast back in the same `act`. Board code is unchanged.
- **Files modified:** src/game/scene/starClearance.test.tsx
- **Commit:** 43cf90c

## Notes for 07-08

- The crowned rabbit passes the lone idle-bounce clearance today, with its current ears. 07-08's ear shortening only adds margin.
- The final scene for the occlusion measurement is set. Lifted rows are at + 1.35 at 0.75× size, and tiles with 2 or more characters show no stars.

## Self-Check: PASSED

- FOUND: src/game/scene/facePrewarm.test.tsx, src/game/scene/starClearance.test.tsx, .planning/phases/07-chibi-characters/07-06-SUMMARY.md
- FOUND commits: b4ac248, 43cf90c, edee707
