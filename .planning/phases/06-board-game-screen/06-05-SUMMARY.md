---
phase: 06-board-game-screen
plan: 05
subsystem: game-3d-actors
tags: [three, r3f, beats, pawn, dice, canvas, lazy-chunk, source-guard, tdd]
status: complete

requires:
  - phase: 06-board-game-screen
    plan: 01
    provides: "palette, ringLayout/tileCenter/tileTop, FACE_UP_EULER/PIP_GRID/pipPosition/diceSize, CAMERA_FOV, watchContextLoss"
  - phase: 06-board-game-screen
    plan: 02
    provides: "Beat types, usePresentation v2 (current/displayed/completeBeat/skipAll), prefersReducedMotion"
  - phase: 06-board-game-screen
    plan: 03
    provides: "Board, CameraRig, shared GEO/MAT"
provides:
  - "layout/pawnSlots.ts: pawnSlots, leaders, standPoints (pure, main-chunk safe)"
  - "scene/actorGeometries.ts: ACTOR_GEO / ACTOR_MAT singletons, pawnMaterial(animal), eyeMaterial(hex)"
  - "scene/Pawn.tsx: temporary toy pawn + hop beat consumer (pawn-{pid}, pawn-body, turn-ring, crown)"
  - "scene/PathPreview.tsx: preview beat consumer (path-dots, dest-ring, dest-cone)"
  - "scene/Dice.tsx: tween die + dice beat consumer (dice, dice-body, dice-pips)"
  - "scene/SceneContents.tsx: WebGL-free scene graph + SceneProps"
  - "scene/GameCanvas.tsx: the single lazy Canvas + GameCanvasProps"
  - "scene/loadGameCanvas.ts: dynamic-import entry for React.lazy and preload"
  - "sourceGuard.test.ts: offline / no-text / main-chunk / no-physics / no-shadow-map guard"
affects: [06-06, phase-07-characters]

tech-stack:
  added: []
  patterns:
    - "Beat consumers read usePresentation.getState() inside useFrame (never a stale render closure); a subscribed selector only lays out the first frame"
    - "Completion guarded by startedId/doneId refs: completeBeat(id) exactly once; a beat ended by watchdog/skipAll just settles to displayed"
    - "Ground group (xz, floor height, slot scale, blob, ring) + body group (arc, squash, bounce) split for pawns"
    - "Repeated small parts merged (eyes, cheeks, outline, crown) to hold 7 draw calls per pawn"
    - "Source guard over import.meta.glob raw sources"

key-files:
  created:
    - src/game/layout/pawnSlots.ts
    - src/game/layout/pawnSlots.test.ts
    - src/game/scene/actorGeometries.ts
    - src/game/scene/Pawn.tsx
    - src/game/scene/PathPreview.tsx
    - src/game/scene/Dice.tsx
    - src/game/scene/SceneContents.tsx
    - src/game/scene/GameCanvas.tsx
    - src/game/scene/loadGameCanvas.ts
    - src/game/scene/actors.test.tsx
    - src/game/sourceGuard.test.ts
  modified: []

key-decisions:
  - "06-05: beat consumers read usePresentation.getState() in useFrame instead of a subscribed beat — frames can run before React re-renders after a store change (test-renderer advanceFrames runs without re-render; real R3F can too)"
  - "06-05: standPoints(tiles) lives in pure layout/pawnSlots.ts so SceneContents and tests share one stand-point rule"
  - "06-05: same-tile 2x2 grid fills the back row (away from the camera) first; 5-8 ring starts at +Z"
  - "06-05: dice spin starts from the previous face plus whole turns (start + 4pi/6pi/4pi) so the jump never flashes the new face early"
  - "06-05: dice squash pivots on the yard floor (outer dice-root group), the dice group keeps rotation + uniform size"

requirements-completed: [BOARD-01, HUD-01, HUD-03, STAB-02, STAB-04]

duration: 11min
completed: 2026-10-23
---

# Phase 6 Plan 05: Moving 3D Actors and the Lazy Canvas Summary

**Each participant has a toy pawn in the same color as their scoreboard dot. On a roll the dice beat plays, the destination preview appears, and the pawn hops one tile at a time in an arc. Each 3D consumer completes its beat exactly once. Everything sits in one lazy `GameCanvas` (flat, transparent, DPR-capped, watches for context loss), and a source-guard test keeps the scene offline, text-free and out of the main chunk.**

## Performance

- **Duration:** about 11 min (10:45 to 10:56 KST)
- **Completed:** 2026-10-23
- **Tasks:** 2/2, each RED then GREEN
- **Files:** 11 created

## Accomplishments

- **`pawnSlots` / `leaders` / `standPoints` (pure):**
  - One pawn on a tile stands in the center.
  - 2 to 4 pawns take a fixed ±0.2 2×2 grid, back row first.
  - 5 to 8 pawns stand on a 0.3 ring at 0.8 scale, with the first slot at +Z.
  - Leaders are everyone tied for the most stars, as long as that is at least 1.
  - Stand points are the tile center at `tileTop`, so the start block is higher.
- **`actorGeometries`:** shared singleton geometries and materials, sized from UI-SPEC S2.
  - Eyes, cheeks, outline (body+head ×1.06, BackSide ink) and crown (open band + 5 cones) are each merged into one geometry, so a pawn is 7 draw calls.
  - `pawnMaterial(animal)` and `eyeMaterial(hex)` are cached, one material per key.
- **`Pawn`:**
  - The `pawn-{pid}` ground group handles xz position, floor height, slot scale, the blob shadow and the turn ring. The `pawn-body` group handles the jump, squash and bounce.
  - Hop: each tile takes `beat.ms / path.length`, with a parabolic arc of 0.5 and a y-squash down to 0.88 over the last 30% of each tile. Delta is clamped with `Math.min(delta, 0.25)`, and `completeBeat(id)` is called once.
  - If the watchdog or `skipAll` ends a hop early, the pawn eases to its displayed tile + slot and its leftover height falls away.
  - Idle (current pawn only, off under reduced motion): a 0.08 bounce every 0.8 s, and the ring breathes from 1.0 to 1.08.
  - Only the current pawn gets a `turn-ring`; only leaders get a `crown`.
- **`PathPreview`:**
  - During a preview beat, path dots pop in over 120 ms, the `dest-ring` sits on the destination and the `dest-cone` bobs ±0.1 at 1.1 above it.
  - It completes the preview beat once after its ms.
  - During the dice hop that follows, dots drop from the front as tiles are passed (`floor(elapsed / perTile)`).
  - Event hops and all other beats show nothing.
- **`Dice`:**
  - Shape: v1 rounded body with 21 instanced pips, in the yard center, scaled by `diceSize(n)`.
  - Motion: 0 to 0.2 jump to 1.2; 0.2 to 0.85 ease-out cubic spin starting from the previous face + [4π, 6π, 4π]; exact snap at 0.85; 0.85 to 1 drop, then a 0.9 squash pivoting on the floor. `completeBeat` is called once.
  - At rest it shows `FACE_UP_EULER[restFace]`, or keeps its rotation when there is no rest face. No idle float.
- **`SceneContents`:**
  - Code-only lights from `LIGHTS` (hemisphere, key, rim), plus `CameraRig`, `Board`, one `Pawn` per participant (slots from `displayed.positions`, crowns from `displayed.stars`), `Dice` and `PathPreview`.
  - **93 draw calls** with 8 crowned pawns on a 24-tile board with all three event effects (budget 100).
- **`GameCanvas`:**
  - `<Canvas flat>`, alpha with clear alpha 0, DPR `[1, 1.5]` on phones (smaller window side ≤ 560) and `[1, 2]` elsewhere, `frameloop` `'always'` while visible and `'never'` while hidden.
  - Camera fov uses `CAMERA_FOV`, with `pointer-events: none` and `touch-action: manipulation`.
  - One static drei `ContactShadows frames={1}` (opacity 0.35, blur 2.5, `#123A58`, scale = base width × 1.3).
  - `onCreated` registers `watchContextLoss`, reports `onReady`, and in DEV only sets `window.__loseContext`. The watcher is removed on unmount.
- **`loadGameCanvas`:** a single `() => import('./GameCanvas')`, with no static import.
- **`sourceGuard.test.ts`** enforces rules (a) to (f), plus checks that GameCanvas is only reached through the dynamic loader, and a self-test that the `<Canvas` tag regex sees past `=>`.

## Task Commits

1. **Task 1 RED:** pawn slots, pawn hop, path preview tests — `6aa20b7` (test)
2. **Task 1 GREEN:** pawnSlots, actorGeometries, Pawn, PathPreview — `ad17bcc` (feat)
3. **Task 2 RED:** dice beat, SceneContents budget, source guard tests — `2740497` (test)
4. **Task 2 GREEN:** Dice, SceneContents, GameCanvas, loadGameCanvas — `24f51e4` (feat)

## Verification

- `npx vitest run src/game/scene src/game/sourceGuard.test.ts`: 49 tests passed (board 19, actors 17, contextLoss 4, sourceGuard 9)
- `npx tsc -b`: exit 0. GameCanvas is checked only here and in the build, never evaluated in tests.
- `npx vitest run`: 42 files, 918 tests passed
- `npm run build`: built. The main chunk is 351.84 kB and still has no three, because nothing imports `loadGameCanvas` until 06-06.
- Scratch Vite build of `loadGameCanvas.ts` as the entry, output kept outside the repo: a separate `GameCanvas-*.js` chunk was produced, with 0 CDN host strings (googleapis/jsdelivr/githack/gstatic/unpkg) and 0 `__loseContext` in production mode.
- Acceptance greps:
  - `Math.min(delta, 0.25)` appears once in Pawn.
  - `useGameStore|setState(` appears 0 times in Pawn and PathPreview.
  - Shadow props appear 0 times in Pawn and actorGeometries.
  - `flat` appears 2 times and `frames={1}` once in GameCanvas.
  - `import.meta.env.DEV` appears 2 times.
  - `^import` appears 0 times in loadGameCanvas.
  - Float/Environment/useGLTF appear 0 times.

## Decisions Made

See the `key-decisions` frontmatter. The main one is that **consumers read `getState()` inside the frame loop**. `@react-three/test-renderer`'s `advanceFrames` runs every frame for one subscriber before the next, with no React re-render between frames. In a real canvas, a frame can also land between a store change and the re-render. With a closure-captured beat, the consumer would miss the next beat or act on a finished one. The `startedId`/`doneId` refs keep completion at exactly once no matter which path ends the beat.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Consumers read the store in the frame loop instead of a render-time selector**
- **Found during:** Task 1 (test design against the test-renderer frame loop)
- **Issue:** The RESEARCH Pattern 4 sketch keeps the beat from a subscribed selector in the `useFrame` closure. When one consumer completes a beat inside a frame (for example, the preview finishing and the hop starting), the other consumers keep the stale beat until React re-renders. In tests that never happens inside `advanceFrames`.
- **Fix:** Pawn, PathPreview and Dice read `usePresentation.getState().current` / `displayed` each frame (read-only). PathPreview keeps a narrow selector only to lay out the first frame of a new beat. Tests that use the selector wrap frames in `act`, and one test checks that the frame loop alone hides the preview with no re-render.
- **Files modified:** src/game/scene/Pawn.tsx, PathPreview.tsx, Dice.tsx, actors.test.tsx
- **Commits:** ad17bcc, 24f51e4

**2. [Rule 3 - Blocking test design] PathPreview hop test completes the hop by hand**
- **Issue:** `advanceFrames` runs all frames of one subscriber before the next. With Pawn and PathPreview mounted together, the pawn would see the hop for the whole batch and finish it early, which makes the dot counts depend on the test harness.
- **Fix:** PathPreview is mounted alone and the hop is completed with `completeBeat(hop.id)` inside `act`. The test also checks that PathPreview never completes a hop.
- **Commit:** 2740497

**3. [Rule 2 - Completeness] `standPoints(tiles)` added to pawnSlots.ts**
- The plan computes stand points in the parent. They are shared by SceneContents and the tests, so they live in the pure layout module, which keeps the rule in one place.
- **Commit:** ad17bcc

## Known Stubs

None that block the plan goal. The toy pawn is the planned temporary pawn (D-17). Phase 7 replaces it with chibi animals. GameCanvas is not mounted yet, by design: 06-06 `GameStage` lazy-loads it through `loadGameCanvas`.

## Threat Flags

None beyond the threat register. T-06-11 is covered by the source guard and the scratch-build CDN grep. T-06-12 is covered by the DEV-only hook, which is absent from the production chunk. T-06-13 is covered by the DPR cap, the frameloop toggle, shared geometries and the 93/100 draw-call test. T-06-14 is covered by consumers that only read presentation state and complete by id, with the skipAll path tested.

## Notes for 06-06

- `GameStage` should use `useMemo(() => lazy(loadGameCanvas), [attempt])` and preload with `loadGameCanvas()` at idle.
- jsdom tests should `vi.mock('../scene/GameCanvas')` or the loader.
- `GameCanvasProps = SceneProps & { visible, onReady, onLost }`, where `SceneProps = { tiles, participants: {id, animal}[], currentId, restFace }`. `restFace` should be the engine's last roll (null before the first roll).
- Visual tuning (pawn proportions, crown height, cone bob, ContactShadows `far`) still needs a real-browser UAT.

## TDD Gate Compliance

Each task has a `test(06-05)` RED commit (`6aa20b7`, `2740497`) followed by a `feat(06-05)` GREEN commit (`ad17bcc`, `24f51e4`). RED failed because the modules did not exist yet. Most source-guard rules already passed at RED because they guard existing code; the loader rule failed as expected. No refactor commit was needed.

## Self-Check: PASSED
