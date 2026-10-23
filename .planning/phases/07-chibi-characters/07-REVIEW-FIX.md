---
phase: 07-chibi-characters
fixed_at: 2026-10-23T09:07:40Z
review_path: .planning/phases/07-chibi-characters/07-REVIEW.md
iteration: 2
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 7: Code Review Fix Report

**Fixed at:** 2026-10-23T09:07:40Z
**Source review:** .planning/phases/07-chibi-characters/07-REVIEW.md
**Iteration:** 2 (iteration 1 fixed WR-04 and held CR-01 for a decision; the decision is D-17b, commit 07e2236)

**Summary:**
- Findings in scope: 2 (CR-01, WR-04; fix scope critical_warning)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### CR-01: Theater slot table puts characters between tiles and on the neighbor tile

**Files modified:** `src/game/layout/pawnSlots.ts`, `src/game/layout/pawnSlots.test.ts`, `src/game/layout/slotOcclusion.test.ts`, `src/game/scene/Board.tsx`, `src/game/scene/SceneContents.tsx`, `src/game/scene/faceOcclusion.test.tsx`, `src/game/scene/starClearance.test.tsx`, `.planning/phases/07-chibi-characters/07-UI-SPEC.md`
**Commit:** 7cde8b2
**Status:** fixed: requires human verification (new layout logic and a visible change; see the screenshots and the notes below)

**Applied fix (D-17b):**

**1. Slot rule and tables (`pawnSlots`)**
- Toward either ring neighbor, no slot center goes past `EDGE = 0.45` from its tile center. A crowd spreads only across the ring, and every body stays on the board base (edge 0.95 from the lattice).
- `tileShape(ringSize, i)` picks one table per shape:
  - `z`: bottom and top sides, spread along z.
  - `x`: left side, spread along x. The right side uses it with x mirrored.
  - `near`: the bottom-left corner.
  - `far`: the top-left corner. The top-right corner uses it with x mirrored.
  - `preStart`: the last tile, L − 1.
  - `start`: the 07-08 start tables, unchanged.
- Each shape also has its own lone (n = 1) slot.
- `pawnSlots(order, positions, currentId, ringSize)` now takes the ring size (SceneContents passes `tiles.length`) and applies the mirror.
- The current turn stands front-center at full scale. Scale bands are unchanged (2–4: 0.85–0.90, 5–8: 0.65–0.72). Crowns are not hidden; the lever was not needed.

**2. A deviation to check: `preStart`**
- On tile L − 1, the current takes the **frontmost slot out toward the apron (+x)**, not x = 0, as on the start tile.
- The reason: the start block in front of it is 0.18 taller. Its back-row crowd and the gate star hide the middle of L − 1 at every depth. And when L − 2 is occupied, the current cannot move back far enough to clear the start crowd without being hidden by L − 2's full-size characters.
- Measured: with the current at x = 0, a lone character on L − 1 was up to 100 % hidden with 3–5 characters on start.

**3. Star-row screen rule (`Board`, D-17b(3))**
- A lone character's lifted star row now hides while the ring neighbor straight behind it (z smaller by more than half a pitch) holds a character. Otherwise the row stays lifted.
- Occupancy is counted from props or fresh `displayed`, the same way as WR-04.
- Without this rule, an ordinary 1 + 1 state on the left or right side hid 54–58 % of the rear face, and 1 + 2 hid up to 100 %.

**4. Tests**
- **`slotOcclusion.test.ts`:** the `PITCH − 0.25` rule is replaced. For every L, every tile 1..L − 1 and every n, each slot's offset along the lattice step toward each neighbor is ≤ 0.45, and |x| / |z| + body is ≤ the base half-width. The D-19 disc and spacing checks now loop over the shapes and apply the mirror.
- **`faceOcclusion.test.tsx`:**
  - New describe: two adjacent tiles at once (`mountTiles`). Pairs: left, right and top side middles, the top-left corner pair, and tile L − 1 with the start tile.
  - Splits 1+1, 3+2, 2+3, 4+4, 1+7, 7+1, with p0 (the current) on the first tile. 2 casts × 6 views × 16/20/24 tiles; literal size 2160 records per board size.
  - Unchanged: LIMIT 0.3, SAMPLES 24, MIN_SAMPLES and the single-tile matrix (432 / 3024).
  - The regular positive control now stands 0.3 behind the current's actual slot.
  - File runtime: 15.4 s.
- **`pawnSlots.test.ts`:** rewritten for the shapes. It covers `tileShape`, mirroring, the size bands, the front slot, and slot0 dx = 0 except on `start` and `preStart`.
- **`starClearance.test.tsx`:** one new case for the screen rule. It fails without the Board change.

**5. Docs and gate**
- UI-SPEC §C5 now lists the shipped tables per shape and the new bound and test matrix. §C6 adds the screen rule.
- Gate: `npx tsc -b` clean, `npx vitest run` 52 files / 1133 tests pass, and `npm run build` OK. The draw-call budget test (actors) and sourceGuard pass, and engine/store/schema/io/settings are untouched.

**Measured worst face (≤ 30 % everywhere, LIMIT unchanged):**

| Case | L16 | L20 | L24 | Where |
|------|-----|-----|-----|-------|
| Start tile, n 1–8 (test) | 20.8 % | 20.8 % | 20.8 % | n 8, start crowd and gate star (07-08 values, unchanged) |
| Regular single tile, 7 tiles × n 1–8 (test) | 16.7 % | 20.8 % | 20.8 % | far corner, rabbits n 6, slot 4, 588×290 (front rabbit's ears and crown) |
| Two adjacent tiles, 5 pairs × 6 splits (test) | 29.2 % | 29.2 % | 29.2 % | tile L − 1 + start, roster 1+7, start slot 3 (start crowd with the current elsewhere) |
| Full scratch sweep, regular single (every tile 1..L − 1, n 2–8, 2 casts, current on/off) | 17 % | 21 % | 21 % | far corner n 6 (same as above) |
| Full scratch sweep, every adjacent pair, start pairs included (all 28 splits, 2 casts, current on either tile) | 29 % | 29 % | 29 % | L − 1 + start 1+7 / 1+6 / 4+3 |
| Full scratch sweep, pairs without tile L − 1 + start | 21 % | 21 % | 21 % | 7+1 start + tile 1 (L16); 6+2 corner pair (L20/24) |

The full sweep covered 77,112, 96,600 and 116,088 face-view records for L16, L20 and L24. **0 of them are over 30 %.** Before the fix, the same sweep on the 07-08 tables had about 2,980 over 30 % per board size, up to 100 %.

**Notes for the human check:**
- Crowded tiles now spread past the tile edge, across the ring only. Examples:
  - Back rows on top-side tiles stand up to 0.82 out over the outer apron.
  - Left/right-side crowds stand up to 0.82 out over the apron or the yard.
  - Bodies stay on the board base.
  - This is what D-17b allows ("feet may pass the tile edge"), but it is a visible change from 07-08.
- On tile L − 1, the current stands off-center toward the apron, as explained above.

**Headless captures:**
- Setup:
  - Real gallery board view with a scratch-only `&split=` patch. Reduced motion, so everyone is at REST.
  - Everyone holds 1 star, so all are crowned, and bear is the current.
  - Phone portrait cell 374×594 and phone landscape cell 588×290, at device scale 3.
  - Each case has a full box and a crop around the tiles.
- The patch and the capture script live in the scratch folder. Both temporary worktrees and both dev servers (:5191 for before, :5192 for after) are stopped and removed.

| Case | Before (07e2236) | After (7cde8b2) |
|------|------------------|-----------------|
| 3+2 on tiles 3/4, portrait | `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix/before-3+2-portrait.png`, `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix/before-3+2-portrait-zoom.png` | `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix/after-3+2-portrait.png`, `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix/after-3+2-portrait-zoom.png` |
| 3+2 on tiles 3/4, landscape | `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix/before-3+2-landscape.png`, `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix/before-3+2-landscape-zoom.png` | `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix/after-3+2-landscape.png`, `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix/after-3+2-landscape-zoom.png` |
| 8 on tile 15 (top side), portrait | `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix/before-8-portrait.png`, `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix/before-8-portrait-zoom.png` | `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix/after-8-portrait.png`, `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix/after-8-portrait-zoom.png` |
| 8 on tile 15 (top side), landscape | `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix/before-8-landscape.png`, `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix/before-8-landscape-zoom.png` | `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix/after-8-landscape.png`, `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix/after-8-landscape-zoom.png` |

What the captures show:
- **Before, 3+2:**
  - Tile 3's rabbit (flank at −0.56) and tile 4's panda (flank at +0.56) stand on the same spot in the gap.
  - In landscape, only the rabbit's ears show above the panda's head, which is the review's merge.
- **After, 3+2:**
  - Two separate groups: bear (current) with rabbit and cat on the red tile, dog and panda on the orange tile.
  - All five faces are visible.
- **Before / after, 8 on tile 15:** all faces were already visible before. After, the back row stands out over the outer apron instead of reaching sideways toward the neighbors. The neighbor tiles are clear.

Search tooling (scratch only, not in the repo; it points at the removed worktree path `/tmp/sv-07-reviewfix-lOyr2J`, so re-point `W` before reuse):
- Optimizer: `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/fix2/opt2.test.mjs`, with the fast evaluator `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/fix2/fast.mjs`.
- Real-scene preStart search: `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/fix2/realopt.test.mjs`.
- Full sweep: `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/fix2/eval.test.mjs`. Results are in `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/fix2/full-L16.txt` (and `-L20`, `-L24`).
- Final tables json: `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/fix2/r11.json`.

### WR-04: Moving characters still pass through the resting star rows

**Files modified:** `src/game/scene/Board.tsx`, `src/game/scene/starClearance.test.tsx`, `.planning/phases/07-chibi-characters/07-UI-SPEC.md`
**Commit:** 97f8ee9 (iteration 1, unchanged in iteration 2)
**Status:** fixed: requires human verification (frame timing / state logic)
**Applied fix:**
- During a `hop` beat, the rows of the departure tile and of every path tile snap away. Eased hiding is too slow, because the next tile arrives within 100–250 ms.
- A hidden row takes its new lift at once, so the landing row reappears already lifted.
- Occupancy also reads the fresh `displayed.positions`, because the props lag one render.
- Two starClearance cases (crossing and landing) use a per-frame box check. Both failed on the old Board.

---

_Fixed: 2026-10-23T09:07:40Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
