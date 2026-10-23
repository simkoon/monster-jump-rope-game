---
phase: 07-chibi-characters
fixed_at: 2026-10-23T11:30:22Z
review_path: .planning/phases/07-chibi-characters/07-VERIFICATION.md
iteration: 3
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 7: Code Review Fix Report

**Fixed at:** 2026-10-23T11:30:22Z
**Source review:** .planning/phases/07-chibi-characters/07-VERIFICATION.md (the frontmatter `gaps:` entry)
**Iteration:** 3. Iteration 1 fixed WR-04. Iteration 2 fixed CR-01 (D-17b). This iteration fixes the remaining verification gap.

**Summary:**
- Findings in scope: 1 (ROADMAP SC4 / BOARD-05: whether a face is hidden depended on the animal order, up to 63 % at an 8-player game start)
- Fixed: 1
- Skipped: 0

## Fixed Issues

### SC4 / BOARD-05: Face occlusion depends on the animal order

**Files modified:** `src/game/scene/occlusionKit.tsx` (new), `src/game/scene/faceOcclusion.test.tsx`, `src/game/scene/faceOrders.{start,bottomTop,leftRight,corners,bottomEnds,topEnds,pairs}.test.tsx` (new), `src/game/layout/pawnSlots.ts`, `src/game/scene/chibiSpecies.ts`, `.planning/phases/07-chibi-characters/07-UI-SPEC.md`

**Commits:**

| Commit | What |
|--------|------|
| 85fb675 | fix: narrower dog ears; new START n4/n7/n8, preStart n6/n7 and far n4/n6 tables |
| 1ff23c8 | test: the shared harness, the order sweeps and the control |
| 2746aac | test: the order sweeps also cover n = 1 |
| 57c48c8 | docs: UI-SPEC §C2 / §C5 |
| bb476c9 | fix: bottom / top side (`z`) table, n 3/4/7/8, for the tiles next to the corners |
| 6aa2a74 | test: order sweeps on those tiles; UI-SPEC test list and numbers |

**Status:** fixed: requires human verification. This is new slot geometry and a visible change to the dog's ears. See the captures and the notes below.

#### 1. The check no longer depends on animal order (verification "missing" item 1)

**The harness.** `occlusionKit.tsx` holds the harness that used to live in `faceOcclusion.test.tsx`:
- the real `SceneContents` with the real gate, ears, crowns and stars;
- rays from the real `fitCamera` camera;
- `LIMIT 0.3`, `SAMPLES 24`, `MIN_SAMPLES 12`, and the same views, sizes and tiles.

The existing single-tile and two-tile matrices are unchanged: casts, record counts 432 / 3024 / 2160, and both positive controls.

**How `sweepOrders` works:**
1. It mounts 8 rotated casts. In cast r, participant k is `ANIMALS[(k + r) % 8]`, so every slot holds every animal once.
2. It keeps a frozen copy of every pawn's meshes.
3. For every pair of (slot, animal) it computes a 24-bit hit mask: which face samples of one are hidden by the other.
4. Per face and view, it takes the worst of **all distinct animal orders**. This is a depth-first search over the other slots, pruned by the union of what can still be added.

**Why this is exact.** A sample counts as hidden when anything lies on its ray. So the hidden set of a face is exactly `scene ∪ ⋃ pawn(j, animal_j)`, and the search finds the true worst order. Two checks back this up:
- In scratch, every reported worst order was mounted directly and gave the same number, with 0 mismatches.
- The new control test re-mounts the 3 worst orders of START n8 at 16 tiles, plus the verifier's cast, and checks them against the sweep. When the check was deliberately broken, the control failed.

**What the sweeps cover** (all with `LIMIT 0.3`, 6 views, 16/20/24 tiles, and record counts asserted):

| Area | n | Current turn | Records |
|------|---|--------------|---------|
| Start tile, tile L − 1, the 7 regular matrix tiles, and the first and last tile of the bottom and top sides | 1–8 | on the tile or away (n 8: always on the tile) | 3072 per tile |
| The 5 matrix pairs × 6 splits | as split | on the first tile | 1728 per pair |

**Open eyes.** Faces are now measured with open eyes. The mount advances 2 frames of 0.1 s instead of 0.05 s. Before, seed 0 (p0) was always caught in its first blink (t < 0.12 s).

**Runtime, each file run alone:**

| File | Time |
|------|------|
| faceOcclusion | 8.3 s |
| start | 13.3 s |
| bottomTop | 9.9 s |
| leftRight | 10.1 s |
| corners | 15.4 s |
| bottomEnds | 9.8 s |
| topEnds | 10.9 s |
| pairs | 15.4 s |

The full suite now has 59 files and 1157 tests. Wall time is about 37 s on 8 cores. About 205 s of CPU is spread over the workers.

#### 2. Re-tune (verification "missing" item 2)

**Dog ears** (`chibiSpecies.ts`, UI-SPEC §C2):
- Before: r 0.11 × (0.6, 1.3, 0.45) at x 0.29, tilt 0.35.
- After: r 0.10 × (0.5, 1.4, 0.45) at x 0.27, y 0.05, tilt 0.25.
- They are narrower and longer. They still hang well below the head center, so the chibi.test D-02 check passes.
- Measured on the failing slot pairs, the old ear hid the face behind it 2–4 × as much as any other animal's ears (for example, dog 12 of 24 samples against 4 for the others). After the change the dog is in line with the bear and the panda.
- Gallery comparison (old, then two narrower variants; the third is shipped): `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/fix3/cap/dog-cmp3.png`.
- The bear's ears were not trimmed, and crowns were not hidden. Neither lever was needed.

**START n8.** Measured on the start tile, a 0.65 face stays clear whatever animal stands in front, when that character is either:
- ≥ 0.55 nearer the camera, or
- ≥ 0.4 to the side.

The 8 slots now stand in three such rows 0.55 apart:
- front: (−0.55, 0.50), the current turn at (0.15, 0.52), and (0.57, 0.50);
- middle: (−0.59, −0.03), (−0.29, −0.03);
- back: (−0.56, −0.57), (−0.24, −0.58), (0.06, −0.58).

The back two rows are seen through the arch. The layout was found by a surrogate packing search over measured pair and gate maps, then confirmed exactly. All start-tile constraints still hold: block ≤ 0.72, pillar clearance ≥ 0.03, head clearing the pillars, head spacing, D-19 discs, and slot 0 frontmost.

**Other tables.** All within D-17b (along the ring ≤ 0.45, on the board base) and the size bands:

| Table | Change |
|-------|--------|
| START n4 | slot 3 z −0.55 → −0.34 |
| START n7 | 4 slots moved |
| preStart n6 | 2 slots moved |
| preStart n7 | 3 slots moved |
| far n4 | s 0.85 → 0.86, 2 slots moved |
| far n6 | 3 slots moved |
| `z` n3, n4, n7, n8 | small back-row moves for the tiles next to the corners |

UI-SPEC §C5 has the shipped numbers.

**Constraints checked:**
- Gate unchanged.
- `src/engine/*`, `store.ts`, `schema.ts`, `lib/io.ts` and `settings.ts` unchanged (`git diff --stat 6aaa8f5` is empty for them).
- three is imported only in `src/game/scene/*` (sourceGuard green).
- Draw-call budget test (actors) green.
- `npx tsc -b`, `npx vitest run` and `npm run build` all pass at every commit.

#### 3. Measured worst face over all animal orders

These numbers come from a scratch sweep of **every** tile 0..L − 1, for 16/20/24 tiles, n 1–8, current on the tile or away. That is wider than the test matrix.

| n | start | preStart | z (bottom/top) | x (left/right) | near corner | far corners |
|---|-------|----------|----------------|----------------|-------------|-------------|
| 1 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| 2 | 0.0 | 0.0 | 8.3 | 0.0 | 8.3 | 4.2 |
| 3 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| 4 | 8.3 | 4.2 | 12.5 | 16.7 | 0.0 | 0.0 |
| 5 | 0.0 | 20.8 | 4.2 | 0.0 | 0.0 | 0.0 |
| 6 | 20.8 | 8.3 | 20.8 | 0.0 | 12.5 | 0.0 |
| 7 | 12.5 | 20.8 | 8.3 | 12.5 | 12.5 | 16.7 |
| 8 | 12.5 | 4.2 | 12.5 | 12.5 | 12.5 | **25.0** |

All values are percent. The worst single face is 25.0 %, far corner n 8 at 588×290: a pig in slot 4, order [bear, cat, rabbit, dog, pig, panda, fox, chick].

**Every adjacent pair**, all 6 splits, current on the first tile:

| Split | Worst | Where |
|-------|-------|-------|
| 1+1 | 0.0 % | |
| 2+3 | 8.3 % | |
| 3+2 | 0.0 % | |
| 1+7 | 20.8 % | |
| 4+4 | 20.8 % | tile L − 1 + start |
| 7+1 | **29.2 %** | near corner 7 + first left-side tile 1, the lone pig; 16/20/24 tiles |

The 7+1 near-corner pair is **the tightest margin anywhere**. It is not in the asserted matrix. Inside the asserted matrix the worst is 25.0 %.

**Before → after, all orders** (same method, worst over 16/20/24 tiles):

| Case | Before | After |
|------|--------|-------|
| START n8 | 62.5–66.7 % | 12.5 % |
| START n7 | 41.7–45.8 % | 12.5 % |
| preStart n7 | 45.8 % | 20.8 % |
| far n4 / n6 | 37.5 % | 0.0 % |
| L − 1 + start pairs | up to 45.8 % | ≤ 20.8 % |
| Top-side end tiles, 24 tiles | 33.3 % | 20.8 % |

The fixed-cast matrices in `faceOcclusion.test.tsx` now peak at 12.5 % (start, regular and pairs).

#### 4. After-captures of the verifier's worst case

- Setup: START n8 with [pig, fox, dog, chick, bear, panda, cat, rabbit]. Everyone is crowned, the pig is the current turn, reduced motion is on.
- Rendered on the real gallery board (24 tiles) through a scratch-only `&order=` patch. It used a detached temporary worktree and a dev server on :5194. Both are stopped and removed.

| View | Full box | Zoom |
|------|----------|------|
| Portrait 374×594 | `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix3/verifier-start8-portrait.png` | `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix3/verifier-start8-portrait-zoom.png` |
| Landscape 588×290 | `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix3/verifier-start8-landscape.png` | `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix3/verifier-start8-landscape-zoom.png` |

What they show: all 8 faces are visible in both views.
- Front row: the pig (current) with the fox at its right and the dog at the front-left.
- Middle row: the chick and the bear.
- Back row, through the arch: the panda, the cat and the rabbit.
- Before, the bear behind the dog showed only its ears and crown (verifier's `rv-cap/dogthird-portrait-zoom.png`).

**Notes for the human check:**
- The dog's ears are slimmer than the 07-05 look. Judge whether they still read as floppy ears at phone size (gallery grid; D-24 item 2).
- At an 8-player start the crowd now stands in three rows, and the back two rows show through the arch. Judge whether that reads well.

**Scratch tooling** (not in the repo), all under `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/fix3/`:

| Item | Path |
|------|------|
| Exact all-order tuner, plus coordinate-descent / annealing optimizers | `scripts/zz3/tune.tsx`, `t3.test.tsx` |
| Every-tile sweep | `scripts/zz3/all{16,20,24}.test.tsx`, results in `all{16,20,24}.tsv` |
| Packing search on the pair and gate maps | `py/pack.py`, maps in `map1.txt`, `map-full.txt`, `gate065.txt` |
| Baseline sweep of the old tables | `base/b{16,20,24}.txt` |

---

_Fixed: 2026-10-23T11:30:22Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
