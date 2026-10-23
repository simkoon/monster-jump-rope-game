---
phase: 07-chibi-characters
plan: 08
subsystem: game-scene
tags: [slots, occlusion, raycast, start-gate, rabbit-ears, gap-closure]
status: complete
requires:
  - phase: 07-chibi-characters
    provides: "07-06 star lift 1.35 / act hide / crowd hide (the measured scene); 07-07 game-over HUD (UI-SPEC C7 sync)"
provides:
  - "src/game/scene/faceOcclusion.test.tsx: mounted-scene face-vertex raycast test, the final BOARD-05 criterion (D-17a(4))"
  - "pawnSlots START (gate-free zones), START_LONE (0.25, 0.3) and theater REGULAR tables"
  - "shorter rabbit ears (len 0.15, y 0.31, inner 0.11), still the longest (D-17a(3))"
  - "UI-SPEC C2/C5/C6/C7 synced to 07-06 / 07-07 / 07-08"
affects: [phase 7 re-verification, end-of-phase human UAT items 5 and 6]
tech-stack:
  added: []
  patterns:
    - "Acceptance raycast test over the mounted R3F scene: exact y-prune (camera above every face), occluders sorted by world box top, matrix size written as a literal, positive controls that must see >= 90 % cover"
key-files:
  created:
    - src/game/scene/faceOcclusion.test.tsx
  modified:
    - src/game/layout/pawnSlots.ts
    - src/game/layout/pawnSlots.test.ts
    - src/game/layout/slotOcclusion.test.ts
    - src/game/scene/chibiSpecies.ts
    - src/game/scene/chibi.test.tsx
    - .planning/phases/07-chibi-characters/07-UI-SPEC.md
key-decisions:
  - "07-08: faceOcclusion.test.tsx (mounted scene, real gate / ears / crowns / stars, <= 30 % per face over 6 views x 16/20/24 x start + 7 regular tiles x 2 casts x n 1-8) is the final BOARD-05 criterion; slotOcclusion.test.ts stays as the D-19 disc check"
  - "07-08: the start gate is unchanged (D-17a(2)); the start table moved to the gate-free zones and a lone start character stands at (0.25, 0.3)"
  - "07-08: regular tiles use a theater layout (current front-center at (0, 0.62) for n 4-8, two flank slots, a back row)"
  - "07-08: rabbit ears len 0.22 -> 0.15, y 0.36 -> 0.31, inner 0.17 -> 0.11; they stay >= 1.6x the tallest other head part"
requirements-completed: [BOARD-05]
duration: 7min
completed: 2026-10-23
---

# Phase 7 Plan 08: Mounted-scene face occlusion and slot re-tune Summary

**A new test mounts the real scene (gate, ears, crowns and stars) and shoots rays from the real camera at every character's face. With new start and regular slot tables and shorter rabbit ears, no face is more than 20.8 % hidden in any of the 10,368 face measurements, down from as much as 100 % before. The start gate did not need to change.**

## Performance

- **Duration:** about 7 min
- **Started:** 2026-10-23T07:31:08Z
- **Completed:** 2026-10-23T07:38Z
- **Tasks:** 3
- **Files:** 7 (1 created, 6 modified)

## Accomplishments

- Closes 07-VERIFICATION gap 1 (BOARD-05, ROADMAP SC4, D-17a(4)). On the start tile the arch and its star hid back-row faces by 63-100 % for n 2-8. On regular tiles the current turn's crown and head, and the rabbit ears, hid faces in the slots behind them by 42-100 %. Both are fixed.
- The final test cannot pass by accident. LIMIT 0.3 and SAMPLES 24 are named constants. The matrix size (432 start and 3,024 regular faces per board size) is written as a literal. Every face needs at least 12 samples. Two positive controls must see at least 90 % cover: one character behind the arch, one behind the full-size current.
- The test file runs in 8.3 s on its own (limit about 20 s).

## Task Commits

1. **Task 1: start-tile face occlusion test, START / START_LONE tables, rabbit ears** - `83ce9f4` (feat)
2. **Task 2: regular-tile describe, theater REGULAR table** - `72e99e3` (feat)
3. **Task 3: UI-SPEC C2/C5-C7 sync** - `756c9b5` (docs)

## Worst face before / after (from the test logs)

Before = the new test run against the earlier code (Task 1 RED, then Task 2 RED on the Task 1 code). Over 30 %: 363 start records and 827 regular records.

| Tile kind | n | Before (worst) | Where / occluder | After |
|-----------|---|----------------|------------------|-------|
| start | 1 | 54 % | L16 588×290, gate-arch (lone character at the center) | ≤ 20.8 % |
| start | 2 | 63 % | L16 390×844, gate-star | ≤ 20.8 % |
| start | 3 | 100 % | L16 rabbits 390×844, gate-star + arch + p0 ears | ≤ 20.8 % |
| start | 4 | 100 % | L16 390×844, gate-star + arch | ≤ 20.8 % |
| start | 5-8 | 100 % | L16 374×594, gate-star + arch (n 8 also rabbit ears 46-58 %) | ≤ 20.8 % |
| regular | 2 | 46 % | L24 t21 588×290, p0 crown + ears | ≤ 16.7 % |
| regular | 3 | ≤ 30 % | (no record over the limit) | ≤ 16.7 % |
| regular | 4 | 79 % | L24 t15 588×290, p0 crown | ≤ 16.7 % |
| regular | 5 | 83 % | L24 t12 rabbits 588×290, p0 ears + crown | ≤ 16.7 % |
| regular | 6 | 100 % | L16 t10 588×290, p0 crown | ≤ 16.7 % |
| regular | 7 | 92 % | L16 t12 rabbits 588×290, p1 ears + crown | ≤ 16.7 % |
| regular | 8 | 100 % | L24 t15 rabbits 588×290, p0 ears + crown | ≤ 16.7 % |

After, logged per board size:
- start L16: 20.8 % (n 8 slot 4, 728×726, p2 head)
- start L20: 20.8 % (n 8 slot 3, 390×844, p7 crown + gate-star)
- start L24: 20.8 % (n 8 slot 7, 588×290, p1 crown)
- regular L16: 8.3 %, L20: 16.7 %, L24: 8.3 % (n 7 slot 6, 588×290, p2 crown)

## Changed constants (old → new)

- `RABBIT_EAR.len` 0.22 → 0.15, `RABBIT_EAR.y` 0.36 → 0.31, `RABBIT_INNER.len` 0.17 → 0.11. The ears now rise about 0.19 above the head top instead of 0.28.
- `START_LONE` (new): `{ s: 1, slots: [[0.25, 0.3]] }`. `slotTable(1, true)` returns it; regular n 1 stays at the tile center.
- `START` n 2-8: replaced with the planner-probe tables (n 2 `[0.25, 0.25], [-0.45, 0.1]` … n 8 `[0.47, 0.51]` …). The sizes are unchanged (0.9 / 0.85 / 0.85 / 0.72 / 0.68 / 0.65 / 0.65).
- `REGULAR` n 2-8: theater layout. The current slot moves (0, 0.30…0.52) → (0, 0.45 / 0.55 / 0.62); flank slots sit at x ±0.56…0.68; the back row sits at z −0.62…−0.65. The sizes are unchanged.
- Gate: no change. `git diff cb452ae -- StartGate.tsx geometries.ts` is empty.

## Verification

Full gate (`npx tsc -b && npx vitest run && npm run build && … && git diff --exit-code f7a01dc -- src/engine src/store.ts src/schema.ts src/lib/io.ts src/settings.ts`):

```
 Test Files  52 passed (52)
      Tests  1092 passed (1092)
✓ built in 310ms
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.   (existing warning)
EXIT 0
```

- `/usr/bin/time -p npx vitest run src/game/scene/faceOcclusion.test.tsx`: 9 tests pass, `real 8.33`.
- Both positive controls pass: the arch control at (0.35, −0.45) on 16 tiles, and the control behind the current on tile 2.
- slotOcclusion.test.ts (D-19 discs, spacing, footprint, start body and pillar clearances), pawnSlots.test.ts, chibi.test.tsx (D-02 + the new 1.6× rule) and board.test.tsx (BOARD-02) all pass.
- The acceptance greps pass (`LIMIT = 0.3`, `SAMPLES = 24`, `questTile('hard')`, `'rabbits'`, `START_LONE` ×2, no `phase-end look check`, ear lengths, `1.6`, `REGULAR_TILES`, `3024`, `432`, `[0, 0.62]`, UI-SPEC `faceOcclusion.test.tsx` / `1.35` / `D-14a`). `git status` shows no PNG or capture script.

## Headless captures (scratchpad only, not committed)

The dev server was already running on :5173, so it was left alone. All captures used SCRATCH/capture.mjs and finished with no errors.

| Before | After |
|--------|-------|
| /private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap/board-portrait.png | /private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-after/board-portrait.png |
| /private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap/zoom-portrait-start.png | /private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-after/zoom-portrait-start.png |
| /private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap/zoom-landscape-start.png | /private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-after/zoom-landscape-start.png |
| /private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/verify/cap/land-start.png | /private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-after/board-landscape.png |
| /private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/verify/cap/land-t7n8-zoom.png | /private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-after/board-tile7-n8-land.png (4× crop: /private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-after/zoom-landscape-t7n8.png) |

Also captured: /private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-after/board-tile7-n8.png (portrait, tile 7, n 8).

Notes per image (the gallery board scene has the rabbit as the current turn, with bounce and blink on):
- **board-portrait / zoom-portrait-start:** all 8 start-tile faces are visible. Panda, dog, cat and chick are in the back-left, bear and fox on the left, pig in the front row, rabbit in the outer corner. Before, the pig stood behind the arch and the chick was partly behind the rabbit. Only a thin part of the flag pole crosses near the fox's cheek, off the eyes.
- **board-landscape / zoom-landscape-start (588×290):** all 8 faces are visible. The near pillar touches the left edge of the pig's head, but its eyes and snout show. Before, the pig's face was behind the arch and pillar.
- **board-tile7-n8-land / zoom-landscape-t7n8:** all 8 faces are clear. The five-character back row stands over the line of crowned heads, the flanks (bear, cat) stand beside the current rabbit, and nothing crosses a face. Before, the rabbit current's ears and crown sat on the fox and chick, and the floating stars hid the back row.
- **board-tile7-n8 (portrait):** all faces are visible at phone size.
- Looks fine but worth a human glance in UAT, as they are not occlusion issues: on regular tiles with n 7-8 the back row stands at the far edge of the tile, close to the next tile (allowed by the PITCH − 0.25 footprint rule). The front neighbor tile's floating stars sit by the current character's turn ring. Neither touches a face.

## UAT note

- End-of-phase human UAT item 5 (8 on one tile, all faces visible) should now pass. The mounted-scene test and the start / tile-7 captures both show every face.
- Item 6 (no hitch on the first expression) was addressed by 07-06 (faceSet prewarm).

## Decisions Made

- The planner-probe tables were used as written. With the real harness every face came in under the limit on the first green run, so no slot nudges (fallback a) or gate changes (fallback b) were needed.
- The arch positive control kept its planned point (0.35, −0.45). The regular control is (0, −0.15) on tile 2 of the 16-tile board, behind the n 2 current at (0, 0.45).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test harness: pawn ownership by pid, not by name prefix**
- **Found during:** Task 1 (first RED run)
- **Issue:** ChibiModel's inner body group is named `pawn-body`. Matching any `pawn-*` name gave the faces the wrong owner, so no `chibi-face` was found.
- **Fix:** The owner map is built from `getObjectByName('pawn-{pid}')` for each participant.
- **Files modified:** src/game/scene/faceOcclusion.test.tsx
- **Commit:** 83ce9f4

**2. [Scope - docs] UI-SPEC C2 rabbit row also synced**
- **Found during:** Task 3
- **Issue:** The C2 table still listed ear length 0.22 / y 0.36, which no longer matches the code.
- **Fix:** Updated the row to 0.15 / 0.31 / inner 0.11 and marked it D-17a(3) (gap closure 2026-10-23). This is the only edit outside C5-C7.
- **Commit:** 756c9b5

## TDD Gate Compliance

Tasks 1 and 2 are `tdd="true"`. In each, the test was written first and seen to fail on the earlier code: Task 1 had 3 start tests red (363 records over the limit), and Task 2 had 3 regular tests red (827 records). The code was then changed until the tests passed. Both the plan and the project rule (CI runs `tsc -b`, no red commits) require every commit to be green, so each task's test and code went into a single `feat` commit. There are no separate `test(...)` RED commits.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: src/game/scene/faceOcclusion.test.tsx, src/game/layout/pawnSlots.ts, src/game/scene/chibiSpecies.ts, .planning/phases/07-chibi-characters/07-UI-SPEC.md
- FOUND commits: 83ce9f4, 72e99e3, 756c9b5
