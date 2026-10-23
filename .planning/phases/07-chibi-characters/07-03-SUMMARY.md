---
phase: 07-chibi-characters
plan: 03
subsystem: game-scene
tags: [chibi, vertex-colors, inverted-hull, merge-geometries, faces, r3f, three]
status: complete

requires:
  - phase: 07-chibi-characters
    provides: "07-02 chibiDims (HEAD_*, BODY_*, FOOT_*, ARM_*, SHOULDER, face anchors, HULL_*, GROUND_*, CROWN_*, FACE_KEYS) and charMotion (Pose, REST)"
  - phase: 06-3d-ring-board
    provides: "palette.ts single hex source, ACTOR_GEO.turnRing / crown and ACTOR_MAT, mergeGeometries import path, sourceGuard rules"
provides:
  - "palette.ts CHAR_COLOR: 15 part colors, 6 new hexes, pinned by palette.test"
  - "chibiParts: M, part, hull, surfaceZ, onSurface, bake (named merge error), Ellipsoid"
  - "chibiSpecies: chibiNodes(animal) → ground/torso/armL/armR/head/ears, CHAR_MAT, GROUND_MAT, HEAD_E, mouthAnchor"
  - "chibiFaces: faceGeo(animal, key) — 9 cached faces per species"
  - "ChibiModel: view-only 7-mesh model, createChibiRig, applyPose"
affects: [07-04 Character component, 07-05 gallery and UAT tuning]

tech-stack:
  added: []
  patterns:
    - "One animated node = one merged non-indexed position/normal/color geometry under one shared vertex-color material"
    - "Inverted hull merged into the same geometry (no extra draw call); tube outlines from a fattened inverted copy"
    - "Face parts placed normal-aligned on an ellipsoid surface (onSurface) so flat parts lie on the curved head"
    - "Expression = cached geometry swap through a ref; the component holds no state and no frame loop"

key-files:
  created:
    - src/game/scene/chibiParts.ts
    - src/game/scene/chibiSpecies.ts
    - src/game/scene/chibiFaces.ts
    - src/game/scene/ChibiModel.tsx
    - src/game/scene/chibi.test.tsx
  modified:
    - src/game/palette.ts
    - src/game/palette.test.ts

key-decisions:
  - "07-03: parts are placed with onSurface (surface normal = local +Z) on the head, body or muzzle ellipsoid, so the closed mouth of bear / dog / fox sits on the muzzle front (mouthAnchor)"
  - "07-03: panda eyes are lifted 0.022 over the ink patches and scaled 0.8 so the patch still reads around the sclera"
  - "07-03: torus tails (cat, pig) and line arcs get round end caps; their outline is a fattened inverted torus (scaling a torus about its center would shift the rim off the tube)"
  - "07-03: the chick keeps its beak closed while excited (UI-SPEC C3 rule), so the 'excited has the mouth color' check excludes the chick"
  - "07-03: CHAR-01 / CHAR-02 stay Pending — this plan builds the parts; 07-04 puts the characters in the game and 07-05 closes them after the gallery"

patterns-established:
  - "Species start values as named constant groups at the top of chibiSpecies / chibiFaces, for 07-05's ±0.02 tuning"

requirements-completed: []  # contributes to CHAR-01, CHAR-02; 07-04/07-05 render the characters and close them
requirements-contributed: [CHAR-01, CHAR-02]

coverage:
  - id: D1
    description: "8 animals from code primitives only; body/head color = ANIMAL_COLOR (panda head white); part colors only from CHAR_COLOR (D-01)"
    requirement: CHAR-01
    verification:
      - kind: unit
        ref: "src/game/scene/chibi.test.tsx#D-01: body color = ANIMAL_COLOR, only the panda head is white"
        status: pass
      - kind: unit
        ref: "src/game/palette.test.ts#CHAR_COLOR (Phase 7 chibi parts)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Silhouettes differ: rabbit ears ≥ bear + 0.15, dog ears hang below the head center, cat/rabbit inner ears, chick feathers above HEAD_B and beak, pig snout and nostrils, bear muzzle, fox white muzzle and thick white-tipped tail (D-02)"
    requirement: CHAR-01
    verification:
      - kind: unit
        ref: "src/game/scene/chibi.test.tsx#D-02: animals differ by silhouette"
        status: pass
    human_judgment: false
  - id: D3
    description: "9 faces per animal with highlights, cheeks on every key, mouths, sweat only on sad/sadBlink, sparkles only on winner, eyes in the lower half, sclera eyes for dog/panda; all cached with the shared layout (D-03, D-07, D-09)"
    requirement: CHAR-02
    verification:
      - kind: unit
        ref: "src/game/scene/chibi.test.tsx#chibiFaces (D-03, D-07, D-09, CHAR-02)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every node and face merges to non-indexed position/normal/color with no console.error (D-20, T-07-09)"
    verification:
      - kind: unit
        ref: "src/game/scene/chibi.test.tsx#builds 6 mergeable nodes for every animal without a merge error"
        status: pass
    human_judgment: false
  - id: D5
    description: "ChibiModel = exactly 7 meshes per animal (+ ring on the floor, crown on the head pivot), shared materials, REST pose on mount, applyPose sign conventions (D-08, D-20)"
    requirement: CHAR-01
    verification:
      - kind: unit
        ref: "src/game/scene/chibi.test.tsx#ChibiModel (D-08, D-20, D-21)"
        status: pass
    human_judgment: false
  - id: D6
    description: "The characters look cute and read at phone size (eye vs muzzle 25 % rule, dog ear visibility, sweat drop contrast on the dog)"
    verification: []
    human_judgment: true
    rationale: "Visual judgment; 07-05 gallery (374×594, 588×290) and UAT. A scratch headless render in this plan showed all 8 readable, with the dog's floppy ears mostly hidden against the head sides (tuning item)."

duration: 14min
completed: 2026-10-23
---

# Phase 7 Plan 03: Chibi geometry, faces and view-only model Summary

**The 8 chibi animals are built from code primitives only. Each animal is 6 merged vertex-color nodes plus 9 faces cached per species, all drawn with one shared glossy material. A view-only `ChibiModel` assembles them into exactly 7 meshes, and the caller drives it through rig refs and `applyPose`.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-10-23T04:46:35Z
- **Completed:** 2026-10-23T05:00:34Z
- **Tasks:** 3
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments

- `palette.ts` gains `CHAR_COLOR` with all 15 keys. Only `cheek`, `mouth`, `sweat`, `bearMuzzle`, `dogEar` and `pigNose` are new hexes. The other 9 reuse palette values, plus `--panel-2` for `dogMuzzle`. `palette.test` pins every value and every reuse, and checks that only those six are new.
- `chibiParts.ts`:
  - `part` makes a primitive non-indexed, drops its uv and adds a linear `new Color(hex)` color (itemSize 3, or 4 with alpha). A mirroring matrix keeps the faces front-facing.
  - `hull` is the inverted-hull outline.
  - `surfaceZ` gives the front of an ellipsoid. `onSurface` places a part along the surface normal of any ellipsoid.
  - `bake` throws `chibi merge failed: <name>` instead of returning null.
- `chibiSpecies.ts`: `chibiNodes(animal)` builds 6 nodes on first use and caches them.
  - ground: blob shadow α 0.22, ink rim and participant disc
  - torso: body, belly patch on bear/dog/panda, 2 feet and the tail, merged together
  - arms: hanging from the shoulder pivot; the chick gets flat wings
  - head: head, muzzle, nose, panda patches or chick beak
  - ears: ears with their inner color; the chick gets 3 feathers
  - The UI-SPEC C2 start values sit as named constants grouped by species. `CHAR_MAT` is roughness 0.32 / metalness 0.05 with vertexColors. `GROUND_MAT` is transparent with no depth write.
- `chibiFaces.ts`: `faceGeo(animal, key)` covers the 9 keys and caches each `${animal}:${key}`.
  - idle: ink eyes with a highlight and a ∪ smile
  - blinks: line capsules in `ANIMAL_EYE`
  - excited: larger eyes, 2 highlights and an open half-disc mouth
  - joy / winner: ^^ arcs, a big mouth with a tongue and cheeks ×1.2; winner also gets 3 extruded sparkles
  - sad: smaller eyes, slanted brows, a ∩ mouth and a sweat drop
  - surprised: big eyes, raised brows and an O mouth
  - Dog and panda get sclera eyes. The chick's mouth appears only on joy, winner and surprised.
- `ChibiModel.tsx` renders `chibi-ground`, `turn-ring` (outside `pawn-body`), `pawn-body`, `chibi-torso`, the shoulder pivots with `chibi-arm-l/r`, `chibi-head-pivot` with `chibi-head`, the ears pivot with `chibi-ears`, `chibi-face`, and `crown` (inside the head pivot, ×1.3 at CROWN_LOCAL). Every mesh gets `dispose={null}`. It has no state and no frame loop. `applyPose` writes the UI-SPEC C4 signs with no allocation, using YXZ order so lean follows yaw. Mount applies REST.
- Suite: 1043 tests green (22 new in chibi.test, 3 new in palette.test). `tsc -b` and `npm run build` pass. `src/engine`, `store`, `schema`, `io` and `settings` are unchanged. sourceGuard passes.

## Task Commits

1. **Task 1: CHAR_COLOR + part / hull / surfaceZ / bake helpers** - `feea170` (feat)
2. **Task 2: 8 species static nodes + 9 cached faces per species** - `9854dad` (feat)
3. **Task 3: view-only ChibiModel + rig refs + applyPose** - `87014cf` (feat)

## Files Created/Modified

- `src/game/palette.ts` - `CHAR_COLOR` part colors
- `src/game/palette.test.ts` - CHAR_COLOR values, reuse and "only six new" tests
- `src/game/scene/chibiParts.ts` - mergeable part, hull, surface placement, bake
- `src/game/scene/chibiSpecies.ts` - species nodes, shared materials, head ellipsoid and mouth anchors
- `src/game/scene/chibiFaces.ts` - 9 faces per species, lazy cache
- `src/game/scene/ChibiModel.tsx` - view-only model, `createChibiRig`, `applyPose`
- `src/game/scene/chibi.test.tsx` - node-env tests: parts, species, faces, materials, model

## Decisions Made

- I added `onSurface(e, x, y, lift, sx, sy, sz, rz)` to chibiParts, beyond the planned exports. It moves a part along the ellipsoid normal and turns the part's +Z onto it. That way eyes, cheeks, patches and noses lie on the curved head instead of poking out of it. It also lets bear, dog and fox mouths sit on the muzzle front (`mouthAnchor`).
- Panda eyes are lifted 0.022 and scaled 0.8 so the sclera sits on the ink patch and the patch still shows around it.
- Torus tails (cat, pig) and arc lines get round end caps. Their outline is a fattened inverted torus, because scaling a torus about its center shifts the rim off the tube.
- The fox tail turns `−0.5` about y, not `+0.5`, so its white tip sweeps outward to +x and shows. With +0.5 the tip pointed back toward the body.
- Each arm capsule hangs with the center of its top cap on the shoulder pivot, so the shoulder turns like a ball joint. The plan said "top end at the pivot".
- Ears, muzzles and the fox tail use a 20×14 sphere. The head and trunk use 28×20. This cut the bear's ear node from 14k to about 6k vertices.
- CHAR-01 / CHAR-02 stay Pending, following the 07-01/07-02 precedent. 07-04 and 07-05 list the same IDs and close them once the characters are in the game.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] A header comment would have broken sourceGuard (c)**
- **Found during:** Task 2
- **Issue:** The chibiFaces header said "no CanvasTexture". sourceGuard (c) bans that word in `src/game/scene`, and the plan's grep check expects 0.
- **Fix:** Reworded it to "no canvas texture".
- **Files modified:** src/game/scene/chibiFaces.ts
- **Commit:** 9854dad

### Test adjustments against the plan text

- The behavior list says "excited, joy and winner contain CHAR_COLOR.mouth". UI-SPEC C3 gives the chick no mouth on excited, so the chick's check covers only joy and winner. Tongues are checked for every animal except the chick.

### Process

- Tasks 1 and 3 ran RED first: the tests failed on the missing module. In Task 2 the species and face code was written before its test block, so there was no RED run there. The values were then probed (rabbit ears 0.533 vs bear 0.289, fox tail min z −0.425 vs bear −0.231, dog ears down to −0.056) to make sure the checks were not passing trivially. As in 07-01/07-02, each task is one commit holding both test and code, because `tsc -b` type-checks tests and red commits are not allowed.
- Optional look check: a scratch Vite app rendered the 8 animals and the dog's 9 faces headless (SwiftShader). It ran from the session scratchpad with `/@fs` imports, and nothing was added to the repo. The faces read under the 0.6 head tilt, with the ring, crown and discs in place. The dog's floppy ears mostly hide against the head sides, which is a 07-05 tuning item.

## TDD Gate Compliance

There are no separate `test(...)` RED commits, because the project rules forbid red intermediate commits (see Process).

## Issues Encountered

- `npm run build` still prints the existing >500 kB chunk warning. It predates this plan and is out of scope.

## Known Stubs

None. ChibiModel is not mounted in the game yet; 07-04 replaces the Phase 6 Pawn with it, as planned.

## Next Phase Readiness

- 07-04: create one `createChibiRig()` per Character and render `<ChibiModel animal rig face ring crown />` inside the `pawn-{pid}` ground group. Drive it each frame with `applyPose(rig, pose)`. Swap expressions with `rig.face.current.geometry = faceGeo(animal, key)` only when the key changes. Use `rig.ring` for the ring breath. Then remove the Phase 6 pawn parts (`base/body/head/eyes/cheeks/outline`, `pawnMaterial`, `eyeMaterial`, `SCENE_COLOR.pawnBase/cheek` if unused).
- 07-05: the gallery should tune the dog ear offset, the eye vs muzzle 25 % rule, the sweat-drop contrast on the dog and the open-mouth fit on the muzzles. Start values are grouped per species at the top of `chibiSpecies.ts` and `chibiFaces.ts`.

## Self-Check: PASSED

- FOUND: src/game/palette.ts, palette.test.ts, scene/chibiParts.ts, scene/chibiSpecies.ts, scene/chibiFaces.ts, scene/ChibiModel.tsx, scene/chibi.test.tsx
- FOUND commits: feea170, 9854dad, 87014cf
