---
phase: 07-chibi-characters
verified: 2026-10-23T11:48:56Z
status: gaps_found
score: 58/59 must-haves verified (1 failed)
behavior_unverified: 0
overrides_applied: 0
automatable_verdict: gaps_found # The single-tile gap (ROADMAP SC4) is closed for every animal order. Two adjacent crowded tiles (D-17b(4)) still go over 30 % for some orders, and 6 of those states are new in iteration 3
re_verification:
  previous_status: gaps_found
  previous_score: 56/57 (1 failed)
  gaps_closed:
    - "ROADMAP SC4 / BOARD-05 (one tile): no face over 30 % for every animal order. Every tile 0..L-1, n 1-8, current here or away, 16/20/24 tiles, 6 views: 0 over, worst 25.0 % (verifier drove sweepOrders over 184,320 records and cross-checked it against its own direct-mount harness: 5,832 faces, 0 mismatches)"
    - "The previous worst casts now measure low: START n8 [pig, fox, dog, chick, bear, panda, cat, rabbit] 7.0 % at full density (was 46-63 %). START n7, preStart n7 and far-corner n6 casts: ≤ 5.9 %"
  gaps_remaining:
    - "D-17b(4) / BOARD-05 (two adjacent tiles): 20 pair states go over 30 % for some animal order (92 records, up to 41.7 % at 24 samples and 39.4 % at full density). They are outside the asserted 5 pairs × 6 splits with the current on the first tile"
  regressions:
    - "6 of those 20 states are new in iteration 3 (0.0 % at 6aaa8f5 for the same casts, now 33-42 %). Cause: far-corner n6 table, slot 0 moved z 0.279 → 0.399 toward the side-tile neighbor (85fb675)"
gaps:
  - truth: "D-17b(4) / D-17 / BOARD-05: with characters on two adjacent tiles, no face is more than 30 % hidden, for every animal order (the run-2 standard was every adjacent pair, all splits, current on either tile)"
    status: failed
    reason: >-
      The verifier ran the shipped sweepOrders (shown exact, see the evidence section) on every adjacent pair of
      16/20/24 tiles. It used all 28 splits na+nb ≤ 8, with the current on the first tile, on the second tile,
      or away. That is 13,860 sweeps and 1,333,248 records. 92 records in 20 states go over 30 %.
      (A) 6 states are regressions from iteration 3. Where the last left-side tile meets the top-left corner
      (2+6, current on the side tile), the current rabbit's ears and crown hide the face in the corner's slot 0:
      L16 t7+t8 37.5 %, L20 t9+t10 41.7 %, L24 t11+t12 37.5 %. Where the top-right corner meets the first
      right-side tile (6+2, current on the side tile), the same occluders hide the corner's slot 0: L16 t12+t13
      33.3 %, L20 t15+t16 37.5 %, L24 t18+t19 33.3 %. At full density these measure 29.9-39.4 %. The same
      casts measured 0.0 % at 6aaa8f5 (verifier worktree, direct mounts). The far n6 table moved slot 0 from
      z 0.279 to 0.399, toward that neighbor.
      (B) 14 states were already there at 6aaa8f5, with the same values. Run 2 missed them because it checked
      pairs with the roster cast only.
      - Tile L-2 + L-1, 1+6: the crown of a character on L-1 hides 33.3 % of a lone pig on L-2 in all 6 views
        (full density 35.7-36.0 %). L16/20/24, current on L-1 or away.
      - Tile L-1 + start, 4+3: 33.3-37.5 % (full density 27.2-29.0 %).
      - L24 side pairs t10+t11 2+5 and t19+t20 5+2: rabbit ears hide a pig, 33.3 % (full density 35.1-35.5 %).
      For comparison, before iteration 3 the same sweep found 500 records over 30 %, up to 54.2 %. So
      iteration 3 improved pairs a lot but did not close them.
      faceOrders.pairs.test.tsx asserts only CROSS_PAIRS (5 pairs) × SPLITS (1+1, 3+2, 2+3, 4+4, 1+7, 7+1)
      with p0, the current, on the first tile. None of the failing splits (2+6, 6+2, 1+6, 4+3, 2+5, 5+2), nor
      the current on the second tile, is in that matrix.
      No later phase covers this (Phase 8 = success FX, ceremony, audio, stability).
    artifacts:
      - path: "src/game/layout/pawnSlots.ts"
        issue: "REGULAR.far n6 (line ~128): slot 0 [0, 0.399] (was [0, 0.279]) sits right behind the neighboring side tile's front-center current. The preStart n6 table, the 1+6 crown case and the x-side 2/5 tables also exceed 30 % for some orders"
      - path: "src/game/scene/faceOrders.pairs.test.tsx"
        issue: "Sweeps every animal order, but only over CROSS_PAIRS × SPLITS with the current on the first tile. The x-side-end + far-corner pairs (t L/2-1 + L/2, t 3L/4 + 3L/4+1), L-2 + L-1, the splits 2+6 / 6+2 / 1+6 / 4+3 / 2+5 / 5+2, and the current on the second tile or away are never asserted"
      - path: "src/game/scene/occlusionKit.tsx"
        issue: "SPLITS / CROSS_PAIRS / sweepPair(currentId fixed to p0) define the narrow pair matrix. The sweep method itself is sound and exact"
    missing:
      - "Widen the asserted pair sweep. At least: every pair kind (side middle, side end + corner on both sides of each corner, L-2+L-1, L-1+start, start+1), all splits na+nb ≤ 8 (or a reasoned worst-case subset that includes 2+6, 6+2, 1+6, 4+3, 2+5, 5+2), and the current on the first tile, the second tile and away. Keep LIMIT 0.3, SAMPLES 24 and the 6 views × 16/20/24 tiles. The verifier's scratch driver (see evidence) runs this in about 4 minutes on 8 cores"
      - "Re-tune until that matrix is green. Start with far n6 slot 0 (the iteration-3 regression: back toward z 0.279, or move it sideways). Then L-2+L-1 1+6 (crown on L-1 over a lone L-2 face), L-1+start 4+3, and the x-side 2/5 tables"
      - "Or, if the user accepts adjacent-tile occlusion up to about 40 % for these orders, record an override for this truth (template in the Gaps Summary)"
human_verification: # Deferred by the user to the end of the phase. These do NOT affect the automatable verdict above.
  - test: "Open the game (and gallery.html grid view on `npm run dev -- --host`) on a phone and compare with the A안 sample"
    expected: "The chibi animals are clearly cuter than the 'basic stacked primitives' sample"
    why_human: "Aesthetic judgement (ROADMAP SC1, D-04, D-24 item 1)"
  - test: "Show the 8 animals to a child for about 3 seconds. Look closely at the dog with its narrower ears from iteration 3"
    expected: "Bear, rabbit, cat, dog, panda, fox, pig and chick are told apart by ears, muzzle, tail and beak. The dog's slimmer ears still read as floppy ears"
    why_human: "Perceptual recognition at phone size (D-24 item 2, D-02)"
  - test: "On a phone, play through idle, your turn, ✅, ❌, a forward/backward event and a natural game end"
    expected: "Six expressions are readable. 07-05 flagged sad vs idle and idle vs excited as close at phone size"
    why_human: "Readability on a real screen (ROADMAP SC2, D-24 item 3)"
  - test: "Judge ✅, ❌ and play to the last round"
    expected: "Success jump and spin (0.9 s), slump (0.7 s) and cheer (1.5 s) feel fun and short. 지금 끝내기 skips to the result. During the win beat the turn bar shows 🏁 게임 끝 and the scoreboard crowns match the 3D crowns"
    why_human: "Motion feel and HUD look (ROADMAP SC3, D-24 item 4, D-14a)"
  - test: "Start an 8-player game in phone portrait and landscape (also with the dog as participant 3). Then crowd 3+2, 4+4, 1+7 and 2+6 on adjacent tiles, including tile L-1 next to start and the tile before a far corner"
    expected: "Every face is visible and each crowd reads as its own tile. The 8-player start now stands in three rows, the back two seen through the arch: judge that it still reads as standing on the start block. Known automated fail (gap): 2+6 before the top-left corner with a rabbit current, and a lone character on L-2 in front of 6 crowned on L-1"
    why_human: "Visible layout change (D-24 item 5, REVIEW-FIX iteration 3 notes)"
  - test: "Hop a character across quest tiles, and land a lone character in front of an occupied tile"
    expected: "Star rows snap away on the hop path and come back lifted on landing. A lone tile's row hides while the tile behind it is occupied (D-17b(3)). No flicker reads as a bug"
    why_human: "Frame timing and look (REVIEW WR-04 and D-17b(3) fixes)"
  - test: "First success / first ❌ / first blink on a classroom tablet"
    expected: "No visible hitch when an expression first appears (faces are prebuilt in render)"
    why_human: "Frame timing on a real device"
  - test: "Phase 6 deferred device checks 6-13 (07-05-SUMMARY / 06-VERIFICATION)"
    expected: "As in 06-VERIFICATION human_verification"
    why_human: "Real devices (carried over from Phase 6)"
---

# Phase 7: 치비 동물 캐릭터 & 표정 Verification Report

**Phase Goal:** 보드의 임시 말이 코드로 만든 귀여운 치비 동물 캐릭터(6~8종)로 바뀌고, 상황에 따라 표정과 동작이 살아 움직이며, 한 칸에 여러 말이 모여도 모두 구분된다. 캐릭터는 비교 데모(A안) 견본보다 확실히 더 귀여워야 한다.
**Verified:** 2026-10-23T11:48:56Z (HEAD ac43e13)
**Status:** gaps_found
**Re-verification:** Yes, the second one, after review fix iteration 3 (85fb675..6aa2a74)

## Re-verification History

| Run | Time (UTC) | Status | Score | Notes |
|-----|------------|--------|-------|-------|
| 1 | 2026-10-23T06:12:18Z | gaps_found | 34/36 | Gap 1: the start gate hides back-slot faces (67-100 %), and rabbit ears hide faces on regular tiles. Gap 2: faces built lazily in useFrame |
| 2 | 2026-10-23T09:32:14Z | gaps_found | 56/57 | Gap 2 closed. Gate, CR-01 neighbor merge, stars and HUD are fixed. SC4 still failed for animal orders outside the test's two casts (up to 63 %) |
| 3 | 2026-10-23T11:48:56Z | gaps_found | 58/59 | **Single-tile SC4 closed for every animal order** (worst 25.0 %). Two adjacent tiles still fail for some orders: 20 states, up to 41.7 %. 6 of them are new in iteration 3 (far n6 slot 0) |

## Goal Achievement

### Roadmap Success Criteria

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | The picked animal appears as a code-built chibi (8 kinds, no model file), the scoreboard icon matches, and it is cuter than the sample | ✓ VERIFIED (cuteness → human, deferred) | Unchanged: `GameStage` → `SceneContents` → `Character` → `ChibiModel`. 8 species. No loaders in `src/game` |
| SC2 | Expressions follow the situation | ✓ VERIFIED (readability → human) | `reaction.ts`. `Character.tsx` swaps `faces[key]`. reaction/actors tests pass |
| SC3 | Idle, hop per tile, success jump and spin, slump, cheer | ✓ VERIFIED (feel → human) | `charMotion.ts` + Character. actors tests pass |
| SC4 | Up to 8 characters on one tile: none hides another, each one is distinguishable | ✓ VERIFIED (look → human) | **Closed.** Verifier drove `sweepOrders` over every tile 0..L-1 × n 1-8 × current here/away × 16/20/24 tiles × 6 views × every distinct animal order: 900 sweeps, 184,320 records, **0 over 30 %**, 0 thin. Worst 25.0 %: far corner n8, a pig in slot 4, 588×290 / 844×390. Run-2 failing casts mounted directly at full density: ≤ 10.8 % (see Occlusion Evidence) |

### Plan must-haves

Run-1 and run-2 truths that passed are regression-checked. The full suite is green, and engine/store/schema/io/settings are unchanged since f7a01dc.

| Plan | Truth (short) | Status | Evidence |
|------|---------------|--------|----------|
| 07-01 (8 truths) | miss/win/stars beats, manual skip, Banner by id, reduced-motion lengths, gameOver label, engine untouched | ✓ VERIFIED (regression) | timeline/useDirector/hud6 green. `git diff --stat f7a01dc -- src/engine src/store.ts src/schema.ts src/lib/io.ts src/settings.ts` is empty |
| 07-02 (5 truths) | chibiDims, pawnSlots determinism, D-19 disc test, motion curves, no three in pure modules | ✓ VERIFIED (regression) | pawnSlots/slotOcclusion/charMotion/sourceGuard green. Main chunk has 0 `WebGLRenderer` |
| 07-03 (6 truths) | primitives only, silhouettes, look, 9 faces prebuilt, ground disc, 7 meshes, three only in scene | ✓ VERIFIED (regression) | chibi / facePrewarm green |
| 07-04 (7 truths) | expressions, blink, bounce/ring, hop + facing, success/slump/cheer + crowns, reduced motion, own-hop completion, ≤ 100 draw calls | ✓ VERIFIED (regression) | actors.test.tsx green (draw-call budget included) |
| 07-05 (5 truths) | dev-only gallery, not shipped, star lift, self-check, UAT list | ✓ VERIFIED (regression) | `ls dist` = assets + index.html. No gallery string in dist or vite.config.ts |
| 07-06 (6 truths) | D-08a prebuilt faces + render-error path, D-12a star clearance, crowd hide, D-16 reduced motion, IN-03/IN-05 | ✓ VERIFIED (regression) | facePrewarm / starClearance green |
| 07-07 (5 truths) | D-14a game-over pill and crowns, outside-gameOver unchanged, emoji items, names as JSX text | ✓ VERIFIED (regression) | hud6 / stage green |
| 07-08 | D-17a(4) face test over the listed matrix (start + 7 regular, roster + rabbits casts) | ✓ VERIFIED | 432 / 3024 records per size, LIMIT 0.3, SAMPLES 24, MIN_SAMPLES 12 unchanged (moved to `occlusionKit.tsx:43-45`). Worst now 12.5 % |
| 07-08 | D-17a(1): slots move in x/z; current front-center / frontmost, full size; size bands; start bodies on the block, pillar clearance ≥ 0.03 | ✓ VERIFIED | New tables: START n4/n7/n8, preStart n6/n7, far n4/n6, `z` n3/n4/n7/n8. Sizes in band (far n4 s 0.86). slotOcclusion "start tile slots clear the gate" green; that file is unchanged since 6aaa8f5 |
| 07-08 | D-17a(2): gate unchanged | ✓ VERIFIED | `git diff --stat d06eaf1 -- src/game/scene/StartGate.tsx` is empty |
| 07-08 | D-17a(3): rabbit ears still the longest (≥ 1.6×) | ✓ VERIFIED | chibi.test.tsx:173-177 green |
| 07-08 | D-19 disc test kept; face test cannot pass vacuously | ✓ VERIFIED | slotOcclusion green. Both faceOcclusion positive controls green |
| D-17b(1) | slots ≤ EDGE 0.45 toward each ring neighbor; bodies on the board base | ✓ VERIFIED | New values checked by hand: z \|dx\| ≤ 0.45 (n7 0.45, n8 0.45); far dx ≤ 0.45, dz ≤ 0.399; preStart \|dz\| ≤ 0.45. slotOcclusion "regular tiles: no slot passes EDGE…" (unchanged test) green |
| D-17b(3) / WR-04 | lone-row hide; hop path hide; lifted landing row | ✓ VERIFIED (regression) | starClearance green |
| **D-17b(4)** | **two adjacent crowded tiles: no face over 30 %, every animal order** | **✗ FAILED** | The asserted matrix (5 pairs × 6 splits, current first) is green for every order. But the full pair sweep fails in 20 states, up to 41.7 %. 6 of them are regressions (far n6 slot 0). See Occlusion Evidence |
| Iter-3 (new) | The order sweep covers every distinct animal order, exactly | ✓ VERIFIED | `occlusionKit.tsx:367-453`. Slot geometry depends only on participant order and the current (`pawnSlots.ts:209-236`). Animals are distinct per game (`assignAnimals`, `animals.ts:15-30`), so the injective search is the right domain. The per-pawn hit masks are a union. Verifier cross-check with its own harness: 11 configurations, 12 casts each, **5,832 faces, 0 measured above the sweep**, and the 22 reported worst orders reproduced exactly. The start-tile control test is green |
| Iter-3 (new) | Dog ears narrowed; D-02 floppy silhouette still holds | ✓ VERIFIED (look → human) | `chibiSpecies.ts:171` r 0.1 × (0.5, 1.4, 0.45), x 0.27, y 0.05, tilt 0.25. chibi.test D-02 "dog ears hang below the head center" green (`chibi.test.tsx:178`) |

**Score:** 58/59 truths verified (1 failed: D-17b(4) adjacent tiles under every animal order). 0 present-but-behavior-unverified.

### Occlusion Evidence (SC4 / BOARD-05 / D-17b(4))

The verifier's own scratch tooling is in `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/reverify2/`:
- `core.mjs`: an independent direct-mount harness. It uses the real SceneContents, reduced motion, everyone crowned, hard tiles and the real fitCamera. `RV_MAXS` / `RV_CAP` set the density.
- `sweepcore.mjs` with `A*.test.mjs` / `B*.test.mjs`: drives the shipped `sweepOrders` over every tile and every pair.
- `exact.test.mjs`: cross-checks the sweep against `core.mjs`.
- `direct.test.mjs`, `pairfail.test.mjs`: mount specific casts.

**1. Is the sweep trustworthy? Yes.** The cross-check covered start n8 (L16/24), start n7, preStart n7, far n6, far n8 (L20), top-side end n8, the near-corner 7+1 pair (L16/20), L-1+start 4+4 with the current on the second tile, and a no-current n5 case. Each was mounted with 2 reported worst orders and 10 random distinct orders. Result: 5,832 faces, 0 direct values above the sweep, 22/22 worst orders reproduced exactly (`out-exact.txt`).

**2. One tile, every order (SC4): closed.**

| Sweep | Sweeps / records | Over 30 % | Worst |
|-------|------------------|-----------|-------|
| L16: every tile, n 1-8, current here/away | 240 / 49,152 | 0 | 25.0 % |
| L20: every tile | 300 / 61,440 | 0 | 25.0 % |
| L24: every tile | 360 / 73,728 | 0 | 25.0 % |

Run-2 failing casts mounted directly (`direct-full.txt` at full density, `direct-24.txt` at 24 samples):

| Case | Run 2 | Now: full density / 24 samples |
|------|-------|--------------------------------|
| START n8 [pig, fox, dog, chick, bear, panda, cat, rabbit] | 46-49 % (up to 63 %) | 7.0 % / 4.2 % |
| START n8 [bear, rabbit, dog, cat, panda, fox, pig, chick] | 43-45 % | 5.7 % / 4.2 % |
| START n8, bear in slot 2 | 31-39 % | 10.8 % / 12.5 % |
| START n7, dog/bear in slot 3, pig in slot 2; rot4 | 31-39 % | 5.9 % / 8.3 % |
| preStart n7 rot4 | 35.4-36.0 % | 3.0 % / 4.2 % |
| far n6, rabbit/dog current | 31-36 % | 0.0 % / 0.0 % |
| far n8, the fixer's reported worst | — | 26.1 % / 25.0 % |

**3. Two adjacent tiles, every order (D-17b(4)): not closed.** Every pair, 28 splits, current first/second/away: 13,860 sweeps, 1,333,248 records, **92 over 30 % in 20 states**. Before iteration 3 (6aaa8f5 worktree, same driver): 500 over, up to 54.2 %.

| State (L, tiles, split, current) | 24 samples | Full density | Occluder → hidden | At 6aaa8f5 |
|----------------------------------|------------|--------------|-------------------|------------|
| L20 t9+t10 2+6, current p0 (x-side end + top-left corner) | **41.7 %** | 30.7 % | current rabbit ears + crown → corner slot 0 (panda/fox/dog) | 0.0 % (**regression**) |
| L16 t7+t8 2+6, current p0 | 37.5 % | 36.4 % | same | 0.0 % (**regression**) |
| L24 t11+t12 2+6, current p0 | 37.5 % | 29.9 % | same | 0.0 % (**regression**) |
| L20 t15+t16 6+2, current p6 (top-right corner + right side) | 37.5 % | 39.4 % | current rabbit ears + crown → corner slot 0 | 0.0 % (**regression**) |
| L16 t12+t13 6+2, current p6 | 33.3 % | 35.3 % | same | 0.0 % (**regression**) |
| L24 t18+t19 6+2, current p6 | 33.3 % | — | same | not over (**regression**) |
| L16/20/24 L-2 + L-1 1+6, current p1 or away (6 states) | 33.3 % in all 6 views | 35.7-36.0 % | crown on L-1 → lone pig on L-2 | 33.3 % (pre-existing) |
| L20/24 L-1 + start 4+3, current p0 (2 states) | 33.3-37.5 % | 27.2-29.0 % | chick/bear ears + crown on start → L-1 slot 0 | same (pre-existing) |
| L24 t10+t11 2+5, t19+t20 5+2 (6 states) | 33.3 % | 35.1-35.5 % | rabbit ears → pig | same (pre-existing) |

The fixer's "tightest margin" case (near corner 7+1, 29.2 % at 24 samples) measures 21.8 % at full density.

Output files:
- `out-A{16,20,24}.txt`, `out-B{16,20,24}-{0..3}.txt`: HEAD
- `out-old-B*.txt`: 6aaa8f5
- `out-pairfail.txt`: direct mounts at HEAD (24 samples and full density), then at 6aaa8f5

### Sweep strength checks (no weakening)

| Check | Result |
|-------|--------|
| LIMIT / SAMPLES / MIN_SAMPLES | 0.3 / 24 / 12, the same values as 6aaa8f5 (`occlusionKit.tsx:43-45`) |
| Views / sizes / tiles | 6 views, 16/20/24 tiles, `REGULAR_TILES`, `CROSS_PAIRS`, `SPLITS` the same. The old record counts 432 / 3024 / 2160 are still asserted |
| Order coverage | Every distinct order, by an exact branch-and-bound over per-pawn hit masks (cross-checked above) |
| Mount timing | `advanceFrames(2, 0.05)` → `(2, 0.1)`: faces are measured with open eyes, not mid-blink for p0. ℹ This is the normal state. The verifier's direct mounts used 0.1 too |
| Pair matrix | ⚠ Narrow: 5 pairs × 6 splits, current on the first tile only. This is the root of the remaining gap |

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/game/scene/occlusionKit.tsx` (new, test-only) | ✓ VERIFIED | Imported only by `*.test.tsx`. Absent from dist |
| `src/game/scene/faceOrders.{start,bottomTop,leftRight,corners,bottomEnds,topEnds,pairs}.test.tsx` | ✓ VERIFIED / ⚠ pairs narrow | Single-tile files cover the start tile, L-1, 7 matrix tiles and 4 side-end tiles. The every-tile sweep confirms the rest |
| `src/game/scene/faceOcclusion.test.tsx` | ✓ VERIFIED | Fixed-cast matrices and controls unchanged |
| `src/game/layout/pawnSlots.ts` | ⚠ single tile ✓, pairs ✗ | far n6 slot 0 regression |
| `src/game/scene/chibiSpecies.ts` | ✓ VERIFIED | Narrower dog ears |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| faceOrders.*.test | occlusionKit | `sweepTile` / `sweepPair` / `sweepOrders` + `expectClean(records, count)` | WIRED |
| occlusionKit | real scene | `ReactThreeTestRenderer.create(<SceneContents …/>)`, `fitCamera`, `ringLayout` | WIRED |
| SceneContents | pawnSlots | `pawnSlots(order, positions, currentId, tiles.length)` | WIRED |
| Run-1/run-2 key links | — | regression: all still present | WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Type check | `npx tsc -b` | exit 0 | ✓ PASS |
| Full suite (run once) | `npx vitest run` | 59 files, 1157 tests passed, 35.6 s | ✓ PASS |
| Production build | `npm run build` | exit 0 (pre-existing > 500 kB GameCanvas chunk warning) | ✓ PASS |
| three out of main chunk | `grep -c WebGLRenderer dist/assets/index-*.js` | 0 | ✓ PASS |
| Gallery / kit not shipped | `ls dist`; grep gallery, occlusionKit, faceOrders in dist; vite.config.ts | assets + index.html only; no matches | ✓ PASS |
| No CDN hosts | URL scan of dist | only library doc strings (w3.org, github.com, react.dev, json-schema.org, opencollective.com, jcgt.org, docs.pmnd.rs). 1 `fetch(` (Vite modulepreload polyfill) | ✓ PASS |
| Engine unchanged | `git diff --stat f7a01dc -- src/engine src/store.ts src/schema.ts src/lib/io.ts src/settings.ts` | empty | ✓ PASS |
| Gate unchanged | `git diff --stat d06eaf1 -- src/game/scene/StartGate.tsx` | empty | ✓ PASS |
| One tile, every order | verifier every-tile sweep | 0 over, worst 25.0 % | ✓ PASS |
| Two tiles, every order | verifier every-pair sweep | 92 over in 20 states, max 41.7 % | ✗ FAIL |

### Probe Execution

Step 7c: SKIPPED. The phase declares no probe scripts, and `scripts/*/tests/probe-*.sh` does not exist.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CHAR-01 | 07-03, 07-04, 07-05 | Code-built cute chibi animals, 6-8 kinds | ✓ SATISFIED (cuteness → human) | unchanged |
| CHAR-02 | 07-01, 07-03, 07-04, 07-06 | Situational expressions | ✓ SATISFIED (readability → human) | unchanged |
| CHAR-03 | 07-01, 07-02, 07-04, 07-06 | Idle, hop, success, slump, cheer | ✓ SATISFIED (feel → human) | unchanged |
| BOARD-05 | 07-02, 07-04, 07-05, 07-06, 07-08 | Up to 8 pawns on one tile all distinguishable | ⚠ PARTIAL: one tile ✓, adjacent tiles ✗ | The literal requirement (one tile) is met for every animal order. The D-17b adjacency proof that the phase adopted is not. REQUIREMENTS.md lines 35 and 147 say Complete |

No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| 11 files changed since 6aaa8f5 | — | TBD / FIXME / XXX / TODO / HACK | — | none found |
| `src/game/scene/faceOrders.pairs.test.tsx` / `occlusionKit.tsx` `SPLITS`, `sweepPair` | — | pair matrix fixed to 6 splits with the current on the first tile | ⚠ Warning (root of the gap) | false green for D-17b(4) |
| `src/game/scene/facePrewarm.test.tsx` | — | REVIEW IN-07 (boundary inside Canvas) | ℹ Info | carried |
| `src/game/hud/TurnHud.tsx` / `Banner.tsx` | — | REVIEW IN-08 (two polite live regions) | ℹ Info | carried |

### Human Verification Required (deferred by the user; these do not change the automatable verdict)

1. **Cuter than the sample.** Gallery grid and game on a phone (SC1).
2. **8 animals in 3 seconds**, including the dog's narrower ears from iteration 3 (fixer's comparison: `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/fix3/cap/dog-cmp3.png`).
3. **Six expressions readable on a phone.** Watch sad vs idle and idle vs excited.
4. **Motions fun and short; game-over HUD.**
5. **8 on one tile and adjacent crowds.** Judge the three-row 8-player start: are the back two rows, seen through the arch, still on the start block? (`/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix3/verifier-start8-portrait-zoom.png`: all 8 faces show; the back row stands at the far edge of the block.) Also look at 2+6 before the top-left corner with a rabbit current (known automated fail).
6. **Hop and landing star rows; star-row screen rule.**
7. **No hitch on the first expression change** on a classroom tablet.
8. **Phase 6 deferred device checks 6-13.**

### Gaps Summary

Iteration 3 closed the gap that run 2 reported:
- On a single tile, no face goes over 30 % for **any** animal order. The verifier checked every tile of 16/20/24-tile boards, 1-8 characters, current here or away, and all 6 views. The worst is 25.0 %.
- The order sweep is exact. The verifier's independent harness matched it on 5,832 faces.
- The narrower dog ears keep the D-02 floppy test green.
- tsc, the 1157-test suite, the build and every bundle guard pass. The engine and the start gate are unchanged.

One must-have still fails: **D-17b(4), two adjacent crowded tiles.** The asserted pair matrix is green for every order, but it is narrow: 5 pairs × 6 splits with the current on the first tile. Applying run 2's standard (every pair, all splits, current on either tile) under every animal order gives 20 failing states, up to 41.7 %. They fall into two groups with different roots:
1. **Regression (6 states).** Iteration 3 moved far-corner n6 slot 0 forward (z 0.279 → 0.399). When the side tile in front holds the current, a full-size rabbit, its ears and crown now cover that face: 33-42 %. The same casts measured 0 % before.
2. **Pre-existing (14 states).** Run 2 missed these because it ran pairs with the roster cast only:
   - L-2 + L-1 1+6: the crown on L-1 covers a lone L-2 face in all 6 views (33 %).
   - L-1 + start 4+3.
   - Two L24 side pairs.

Fix: widen `faceOrders.pairs` to every pair kind, every split and every current position (about 4 minutes of CPU spread over the workers with the existing kit). Then re-tune, starting with far n6 slot 0.

If the user accepts the adjacent-tile look instead:

```yaml
overrides:
  - must_have: "D-17b(4) / D-17 / BOARD-05: with characters on two adjacent tiles, no face is more than 30 % hidden, for every animal order"
    reason: "{e.g. 'one-tile SC4 holds for every order; the remaining adjacent-tile cases are ≤ 42 % for specific orders and splits, and body color, ears and crown still identify each animal'}"
    accepted_by: "{name}"
    accepted_at: "{ISO timestamp}"
```

---

_Verified: 2026-10-23T11:48:56Z_
_Verifier: Claude (gsd-verifier)_
