---
phase: 07-chibi-characters
fixed_at: 2026-10-23T14:09:25Z
review_path: .planning/phases/07-chibi-characters/07-VERIFICATION.md
iteration: 4
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 7: Code Review Fix Report

**Fixed at:** 2026-10-23T14:09:25Z
**Source review:** .planning/phases/07-chibi-characters/07-VERIFICATION.md (the frontmatter `gaps:` entry, re-verification 2)
**Iteration:** 4. Iteration 1 fixed WR-04, iteration 2 fixed CR-01 (D-17b), and iteration 3 fixed single-tile SC4 for every animal order. This iteration fixes the last gap: D-17b(4), two adjacent crowded tiles.

**Summary:**
- Findings in scope: 1 (D-17b(4) / D-17 / BOARD-05: 20 two-tile states went over 30 % for some animal order, up to 41.7 %)
- Fixed: 1
- Skipped: 0
- All 20 states are now ≤ 30 %: the 6 iteration-3 regressions (A) and the 14 pre-existing states (B). Slot moves alone were enough. No crowns are hidden and no ears are trimmed.

## Fixed Issues

### D-17b(4): two adjacent crowded tiles, every animal order

**Files modified:** `src/game/layout/pawnSlots.ts`, `src/game/scene/occlusionKit.tsx`, `src/game/scene/faceOrders.start.test.tsx` (header comment only), `src/game/scene/faceOrders.{crowdSides,crowdTop,crowdCorners,crowdStart,crowdStates}.test.tsx` (new), `.planning/phases/07-chibi-characters/07-UI-SPEC.md`

**Commits:**

| Commit | What |
|--------|------|
| 0ca4fe7 | fix: 4 slots move (far n6, x n5, preStart n4, preStart n6) |
| 8c0718b | test: `sweepPairCurrents` and the 5 new `faceOrders.crowd*` files |
| 33d2e6e | docs: UI-SPEC §C5 tables, test list and measured numbers |

**Status:** fixed: requires human verification. These are slot geometry changes. The automated proof is complete (see below), but how the crowds look is still part of the deferred human check (D-24 item 5).

#### 1. Re-tune (`pawnSlots.ts`, UI-SPEC §C5)

Every move stays within D-17b: along the ring ≤ 0.45, spread only across the ring, on the board base. Sizes are unchanged and in band. The current is still front-center at full size, and slot 0 is still the frontmost (largest z) on every table.

| Table | Slot | Before → after | Fixes |
|-------|------|----------------|-------|
| far n6 | 0 | (0, 0.399) → (0, **0.33**) | (A) all 6 regressions: L16 t7+t8, L20 t9+t10, L24 t11+t12 2+6 and L16 t12+t13, L20 t15+t16, L24 t18+t19 6+2. The full-size current on the side tile in front no longer covers this face with its ears and crown. z 0.279 (the 6aaa8f5 value) brings back other 2+6 / 6+2 fails (37.5 %), and moving the slot sideways is worse (up to 54 %). 0.33 is the value that clears both |
| x n5 | 2 | (0.5, 0.2) → (**0.58**, 0.2) | (B) L24 t10+t11 2+5 and t19+t20 5+2 (current on either tile or away, 6 states). The face is no longer in line with the rabbit ears on the neighbor's x n2 back slot (0.54, −0.02). Same x as the x n6 slot 2 |
| preStart n4 | 0 | (0.55, 0.34) → (**0.62**, 0.34) | (B) L20 t19+t0 and L24 t23+t0 4+3, current on L − 1. The face moves clear of the start tile's back-row ears and crown. Safe band measured: x 0.58–0.64 at z 0.34. At z < 0.33 slot 0 would stop being the frontmost (pawnSlots.test) |
| preStart n6 | 2 | (−0.03, −0.42) → (**0.2**, −0.42) | (B) L16/20/24 L − 2 + L − 1 1+6, current on L − 1 or away (6 states). Its crown no longer covers the lone face on L − 2 at (0, 0.4) |

One tried fix was rejected: moving the x n2 front slot from z 0.28 to 0.4 fixes (A), but it breaks L − 2 + L − 1 2+6 (up to 45.8 %).

**Constraints checked:**
- `src/engine/*`, `store.ts`, `schema.ts`, `lib/io.ts`, `settings.ts` and `StartGate.tsx` are unchanged (`git diff --stat b8007d8` is empty for them).
- three is imported only in `src/game/scene/*` (sourceGuard green).
- Draw-call budget test (actors) green.
- `npm run build` passes. The main chunk has 0 `WebGLRenderer`, and no kit or test strings are in dist.
- `npx tsc -b && npx vitest run` passes at every commit: 64 files, 1175 tests.

#### 2. Tests: wider pinned two-tile coverage

**New kit function.** `occlusionKit.sweepPairCurrents(L, a, b)` uses the existing exact `sweepOrders` (every distinct animal order). It covers:
- the splits `CROWD_SPLITS` = 2+6, 6+2, 1+6, 4+3, 2+5, 5+2;
- the current on the first tile, on the second tile, or on neither (8 on two tiles always include the current);
- 5568 records per pair.

**Kept as is:** `LIMIT 0.3`, `SAMPLES 24`, `MIN_SAMPLES 12`, the 6 views, 16/20/24 tiles, and every existing file and record count (`faceOrders.pairs` still covers CROSS_PAIRS × SPLITS).

| File | Pairs (16/20/24 tiles) | Worst | Alone | In the full suite |
|------|------------------------|-------|-------|-------------------|
| `faceOrders.crowdSides` | middle of the left and right sides | 29.2 % (L16 t6+t7 2+6) | 18.5 s | 30 s |
| `faceOrders.crowdTop` | middle of the top side | 16.7 % | 9.7 s | 15 s |
| `faceOrders.crowdCorners` | last left tile + top-left corner, top-right corner + first right tile (also checks the shapes are `far` + `x`) | 25.0 % | 19.5 s | 30 s |
| `faceOrders.crowdStart` | L − 2 + L − 1, L − 1 + start (also checks the shapes) | 25.0 % | 20.5 s | 33 s |
| `faceOrders.crowdStates` | the 20 failing states of `out-pairfail.txt` / `hs.txt`, pinned exactly (state, split, current), in 4 groups | 25.0 % | 9.9 s | 7 s |

- "Alone" is wall time including about 1 s of startup. The full-suite time is higher because 8 workers share the CPU (the existing faceOrders files also take 18–28 s there).
- Each `it` (one ring size) takes about 6 s alone, well under its 60 s timeout.
- Full suite: 54 s wall, about 320 s of CPU (before: 37–42 s, about 205 s).
- On 16 tiles, L − 2 + L − 1 is also the right side's middle pair, so it is swept twice. That costs about 3 s.

**Negative control.** With the iteration-3 tables restored (`git show b8007d8:src/game/layout/pawnSlots.ts`), 11 of the 16 new sweep tests fail (the 2 shape checks still pass):
- crowdCorners: all 3 ring sizes;
- crowdStart: all 3;
- crowdStates: all 4 groups;
- crowdSides: 16 tiles.

#### 3. Verifier's full pair sweep, re-run at the final HEAD

- Tool: the verifier's own driver, `reverify2/{A,B}*.test.mjs` with `sweepcore.mjs`.
- Setup: `RV_P` points at the fix worktree (HEAD 33d2e6e, same code as 8c0718b); `RV_TAG=fix4-`.

| Sweep | Sweeps / records | Over 30 % | Worst |
|-------|------------------|-----------|-------|
| Every tile, n 1–8, current here or away (L16/20/24) | 900 / 184,320 | **0** | 25.0 % (far corner n8, and L24 t18 n6, a pig) |
| Every adjacent pair, all 28 splits na + nb ≤ 8, current on the first or second tile or away (L16/20/24) | 4,620 / 1,290,240 | **0** (was 92 records in 20 states) | **29.2 %** (near corner 7+1, unchanged; L16 t6+t7 2+6; L16 t13+t14 6+2) |

**Thin faces:** 0.

**Record counts.** These are the same counts the verifier's B files print (4 parts × 308 / 385 / 462 sweeps). The verification text's "13,860 sweeps / 1,333,248 records" does not match its own DONE lines.

**Direct mounts of the verifier's 13 casts** (`pairfail.test.mjs` copied to `fix4pf.test.mjs`):

| Case | 24 samples | Full density | Before (24 samples / full density) |
|------|------------|--------------|------------------------------------|
| far 2+6 / 6+2 (5 casts) | ≤ 20.8 % | ≤ 21.3 % | 33–42 % / up to 39.4 % |
| L − 2 + L − 1 1+6 | 4.2 % | ≤ 1.4 % | 33.3 % / 35.7–36.0 % |
| L − 1 + start 4+3 | 12.5 % | ≤ 9.9 % | 33–38 % / 27–29 % |
| L24 side 2+5 / 5+2 | 0.0 % | 2.4 % | 33.3 % / 35.1–35.5 % |
| near-corner 7+1 controls (unchanged tables) | 29.2 % | 21.8 % | 29.2 % / 21.8 % |

**Output files**, all under `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/reverify2/`:
- `out-fix4-A{16,20,24}.txt`
- `out-fix4-B{16,20,24}-{0..3}.txt`
- `out-fix4-pairfail.txt`
- `fix4-sweeps.log`

The verifier's original outputs were not overwritten.

**Remaining (B) states that could not be fixed:** none. No override is needed.

**Notes for the human check (D-24 item 5):**
- Crowd 6 on the tile before the start: one back-row character now stands a little right of center, (0.2, −0.42) instead of (−0.03, −0.42).
- Crowd 4 there: the current stands slightly further out toward the board edge (x 0.62).
- On a far corner, the front face of a 6-crowd stands a little further back (z 0.33).
- On a side tile with 5, slot 2 is 0.08 further out.
- Judge whether each crowd still reads as its own tile. The VERIFICATION human item 5 no longer needs its "known automated fail" note.

**Scratch tooling** (not in the repo), under `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/fix4/`:
- `aff.mjs` / `run.sh` / `sh{0..7}.test.mjs`: affected-set sweeps (every tile and pair state touching the given tables) with in-process table overrides, sharded over 8 forks.
- `res/*.all`: one line per state.
- `res/full1.all`: the full tiles + pairs sweep with the candidate tables before they were committed.

---

_Fixed: 2026-10-23T14:09:25Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 4_
