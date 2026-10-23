---
phase: 07-chibi-characters
plan: 02
subsystem: game-layout
tags: [chibi, pawn-slots, occlusion, motion-curves, pure, three-free]
status: complete

requires:
  - phase: 06-3d-ring-board
    provides: "ringLayout / tileCenter / tileTop / boardExtents, fitCamera, StartGate pillar constants, Phase 6 pawn hop/bounce math"
provides:
  - "chibiDims.ts: head/body/limb/face-anchor/hull/ground/crown constants, rubric-derived values, EXPRESSIONS + FACE_KEYS"
  - "pawnSlots(order, positions, currentId) + slotTable(n, isStart): UI-SPEC C5 regular and start-tile tables, current turn at k 0 full size"
  - "slotOcclusion.test.ts: fitCamera projection proof of the ≤ 30 % head cover rule plus spacing, footprint and pillar clearance"
  - "charMotion.ts: REST, success/slump/cheer/surprise/bonus beat curves, hop/bounce/breathe, approachAngle, lerpPose, actPose"
affects: [07-03 chibi geometry, 07-04 Character component, 07-05 gallery/UAT tuning]

tech-stack:
  added: []
  patterns:
    - "Frozen slot tables proven by a pure projection test with the real camera fit (no WebGL)"
    - "Clock-free pose curves u ∈ [0, 1] whose endpoints are REST (yaw ≡ 0 mod 2π)"

key-files:
  created:
    - src/game/layout/chibiDims.ts
    - src/game/layout/chibiDims.test.ts
    - src/game/layout/slotOcclusion.test.ts
    - src/game/layout/charMotion.ts
    - src/game/layout/charMotion.test.ts
  modified:
    - src/game/layout/pawnSlots.ts
    - src/game/layout/pawnSlots.test.ts
    - src/game/scene/SceneContents.tsx

key-decisions:
  - "07-02: six start-table slots moved off the gate pillars so no head runs into one (n3 s2, n4 s3, n7 s0/1/6, n8 s0); regular table unchanged"
  - "07-02: successPose keeps yaw at 2π after the spin (continuous, ≡ REST mod 2π) instead of wrapping to 0"
  - "07-02: CHAR-03 / BOARD-05 stay Pending — this plan delivers the pure data; 07-04/07-05 render it and close them"

patterns-established:
  - "Pure layout constants module (chibiDims) shared by geometry, slots and the occlusion proof"

requirements-completed: []  # contributes to BOARD-05, CHAR-03; 07-04/07-05 render the characters and close them
requirements-contributed: [BOARD-05, CHAR-03]

coverage:
  - id: D1
    description: "Chibi rubric fixed as numbers: head/body width 1.53, head 58 % of height, eyes below center, HEAD_TILT 0.6 in 0.5–0.75, lines ≥ 0.012 (D-03)"
    requirement: CHAR-03
    verification:
      - kind: unit
        ref: "src/game/layout/chibiDims.test.ts#chibiDims rubric (D-03)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Current turn stands front-center (start tile: frontmost) at full size; others follow participant order at the table size (D-17)"
    requirement: BOARD-05
    verification:
      - kind: unit
        ref: "src/game/layout/pawnSlots.test.ts#pawnSlots (D-17, BOARD-05)"
        status: pass
      - kind: integration
        ref: "src/game/scene/actors.test.tsx#renders the board, one pawn per participant"
        status: pass
    human_judgment: false
  - id: D3
    description: "6 views × 16/20/24 tiles × every tile × n 2–8 × current on/off: head cover ≤ 30 %, no head interpenetration, no neighbor-tile intrusion, pillar clearance (D-19)"
    requirement: BOARD-05
    verification:
      - kind: unit
        ref: "src/game/layout/slotOcclusion.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Motion curves start and end at REST with the UI-SPEC C4 values (jump 0.55, 360° spin, head down 0.35, arms 2.4, breathing ≤ 2 %)"
    requirement: CHAR-03
    verification:
      - kind: unit
        ref: "src/game/layout/charMotion.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "Start-gate arch tube does not hide back-slot faces on the start tile"
    verification: []
    human_judgment: true
    rationale: "UI-SPEC C6 Open Q2: checked in the 07-05 gallery board view (374×594, 588×290, 8 on the start tile)"

duration: 7min
completed: 2026-10-23
---

# Phase 7 Plan 02: Chibi dims, same-tile slots and motion curves Summary

**Three three-free layout modules: the chibi dimension constants, table-based same-tile slots with the current turn in front (proven ≤ 30 % head cover by projecting with the real fitCamera), and clock-free pose curves that start and end at REST.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-10-23T04:35:32Z
- **Completed:** 2026-10-23T04:42:41Z
- **Tasks:** 3
- **Files modified:** 8 (5 created, 3 modified)

## Accomplishments

- `chibiDims.ts`: every constant listed in the plan with the UI-SPEC C1/C3/C6 values, the derived `HEAD_A/B/C`, `HEAD_WIDTH`, `BODY_WIDTH`, `HEAD_TOP/BOTTOM`, `HEAD_HEIGHT_RATIO`, and the face vocabulary `EXPRESSIONS` / `FACE_KEYS` (9 keys in UI-SPEC order) with their types. The header says HEAD_TILT is the one global tilt and that 07-05 may tune each part by at most ±0.02.
- `pawnSlots.ts`: the 2×2 grid / 0.3 ring rule is replaced by the two frozen UI-SPEC C5 tables. `slotTable(n, isStart)` clamps n to 1..8 (T-07-05). `pawnSlots(order, positions, currentId)` moves the current turn to k 0 of its own tile at scale 1. Everyone else keeps participant order at the table size. A 9th id on one tile would reuse the last slot. `leaders` and `standPoints` are byte-identical.
- `SceneContents.tsx`: `pawnSlots(order, positions, currentId)` with `[order, positions, currentId]` deps. Nothing else in the file changed.
- `slotOcclusion.test.ts`: covers 18 view × board-size cases over every tile, n 2–8, current on/off. The worst cover found is 15.6 % (regular n 6, slot 0 over slot 5, matching RESEARCH). The start tile now peaks at about 9.4 % (n 8, slot 0 over slot 7). The file also checks head spacing, the regular footprint (≤ PITCH − 0.25), the start-block edge (≤ 0.72), body–pillar clearance (≥ 0.03) and head–pillar clearance (≥ 0). A temporary 1 % limit confirmed the test measures real overlaps.
- `charMotion.ts`: `REST` (frozen), the five beat curves, `actPose`, `hopPose`, `bouncePose`, `breathePose`, `approachAngle`, `lerpPose`, the three easings, and every listed constant. The Phase 6 hop/bounce constants were lifted unchanged.
- Suite: 1021 tests green; `tsc -b` and `npm run build` pass. `src/engine`, `store`, `schema`, `io` and `settings` are unchanged.

## Task Commits

1. **Task 1: chibiDims + table-based pawnSlots v2 + SceneContents wiring** - `2accf0d` (feat)
2. **Task 2: projection occlusion / spacing / pillar proof + start-slot fixes** - `74d4817` (test)
3. **Task 3: pure motion curves charMotion** - `b682397` (feat)

## Files Created/Modified

- `src/game/layout/chibiDims.ts` - shared chibi dimensions, face anchors, hull/ground/crown, face keys
- `src/game/layout/chibiDims.test.ts` - D-03 rubric assertions
- `src/game/layout/pawnSlots.ts` - slot tables, `slotTable`, `pawnSlots(order, positions, currentId)`
- `src/game/layout/pawnSlots.test.ts` - rewritten slot cases; leaders/standPoints cases kept
- `src/game/layout/slotOcclusion.test.ts` - D-19 projection proof
- `src/game/layout/charMotion.ts` - pure pose curves
- `src/game/layout/charMotion.test.ts` - curve values and REST endpoints
- `src/game/scene/SceneContents.tsx` - passes `currentId` to `pawnSlots`

## Decisions Made

- Six start-table slots were moved (see Deviations). The regular table is untouched.
- `successPose` holds `yaw = 2π` after the spin rather than wrapping to 0. The value stays continuous, and the endpoint still equals REST mod 2π. 07-04 should set the rotation directly or compare angles mod 2π.
- `lerpPose` uses `a·(1 − w) + b·w`, which gives exactly `a` at 0 and `b` at 1 (the `a + (b − a)·w` form missed `b` by float error).
- CHAR-03 and BOARD-05 were not marked complete, following the 07-01 precedent. This plan only provides pure data. 07-04/07-05 (which list the same IDs) render the characters and close both.

## Deviations from Plan

### Start-table coordinates (planned fix, UI-SPEC C5 → new values)

**1. [Rule 1 - Bug] Heads ran into the start-gate pillars**
- **Found during:** Task 2 (the plan predicted it)
- **Issue:** With the UI-SPEC C5 start table, the head (HEAD_A·scale + pillar 0.09) overlapped a pillar by up to 0.08.
- **Fix:** Moved each failing slot directly away from its pillar in 0.01 steps, as little as possible:

| n | slot | old (x, z) | new (x, z) | note |
|---|------|-----------|-----------|------|
| 3 | 2 | (0.29, −0.46) | (0.27, −0.48) | |
| 4 | 3 | (0.46, −0.54) | (0.37, −0.55) | moving directly away pushed the body off the 1.4 block (edge 0.74 > 0.72), so this one takes the smallest 0.01-grid move that passes every check (0.09) |
| 7 | 0 | (0.09, 0.48) | (0.13, 0.47) | still frontmost |
| 7 | 1 | (0.58, 0) | (0.59, 0.03) | |
| 7 | 6 | (0.45, −0.49) | (0.44, −0.52) | |
| 8 | 0 | (0.06, 0.49) | (0.14, 0.48) | still frontmost (current turn) |

- **Files modified:** src/game/layout/pawnSlots.ts (comment lists the moved slots)
- **Commit:** 74d4817

### Process

- Tasks 1 and 2 ran RED first (new pawnSlots/chibiDims tests failed; the head–pillar test failed before the slot fix). For Task 3 the curves were written before the test file, so there was no RED run. The one failing check (lerpPose endpoint) was fixed in the implementation. As in 07-01, each task lands as a single commit holding test and code, because `tsc -b` type-checks tests and red commits are not allowed.

## TDD Gate Compliance

There are no separate `test(...)` RED commits. The project rules forbid red intermediate commits. Task 2's commit is typed `test(...)` because most of it is the proof test; it also holds the slot fix that turns the proof green.

## Issues Encountered

- `npm run build` still prints the existing >500 kB chunk warning. It was there before this plan and is out of scope.

## Known Stubs

None.

## Next Phase Readiness

- 07-03 can build the geometry from `chibiDims` (HEAD_*, BODY_*, FOOT_*, ARM_*, SHOULDER, face anchors, HULL_*, GROUND_*, CROWN_*). The face keys come from `FACE_KEYS`.
- 07-04 can drive the Character from `actPose(act, u)`, `hopPose(s)`, `bouncePose`/`breathePose`, `approachAngle` with `YAW_RATE_HOP`/`YAW_RATE_REST`, and REST easing at `SETTLE_RATE`. Under reduced motion it holds REST. The scene already passes `currentId`, so the current turn steps to the front (the ~0.3 s slide is intended, Pitfall 10).
- 07-05: the arch-tube vs. back-slot face check (UI-SPEC C6 Open Q2) remains a gallery check. Any slot pulled forward must keep `slotOcclusion.test.ts` green.

## Self-Check: PASSED

- FOUND: src/game/layout/chibiDims.ts, chibiDims.test.ts, pawnSlots.ts, pawnSlots.test.ts, slotOcclusion.test.ts, charMotion.ts, charMotion.test.ts, src/game/scene/SceneContents.tsx
- FOUND commits: 2accf0d, 74d4817, b682397
