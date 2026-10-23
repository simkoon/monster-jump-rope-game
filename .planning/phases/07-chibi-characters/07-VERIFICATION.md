---
phase: 07-chibi-characters
verified: 2026-10-23T14:19:07Z
status: human_needed
score: 59/59 must-haves verified
behavior_unverified: 0
overrides_applied: 0
automatable_verdict: passed # Every automatable must-have holds. Only the human/visual/device checks the user deferred to the end of the phase remain
re_verification:
  previous_status: gaps_found
  previous_score: 58/59 (1 failed)
  gaps_closed:
    - "D-17b(4) / BOARD-05 (two adjacent tiles): the verifier's own full pair sweep finds 0 records over 30 % (run 3: 92 records in 20 states, up to 41.7 %). It covered every adjacent pair, all 28 splits na+nb ≤ 8, and the current on the first tile, the second tile or away, on 16/20/24 tiles: 4,620 sweeps, 1,290,240 records, worst 29.2 % (full density ≤ 25.5 %)"
    - "Iteration-3 regression fixed: far-corner n6 slot 0 is now z 0.33 (was 0.399). The 6 regressed states now measure 0.0-20.8 % at 24 samples and 0.0-21.3 % at full density"
  gaps_remaining: []
  regressions: []
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
    expected: "Every face is visible and each crowd reads as its own tile. The 8-player start stands in three rows, the back two seen through the arch: judge that it still reads as standing on the start block. Also judge the D-17b spread over the apron or yard and the off-center current on tile L-1"
    why_human: "Visible layout change (D-24 item 5, REVIEW-FIX iterations 3-4)"
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
**Verified:** 2026-10-23T14:19:07Z (HEAD a101bd6)
**Status:** human_needed. All automatable checks pass; only the deferred human checks remain.
**Re-verification:** Yes, the third one, after review fix iteration 4 (0ca4fe7, 8c0718b, 33d2e6e). Scoped to the remaining D-17b(4) gap, plus the regression gates.

## Re-verification History

| Run | Time (UTC) | Status | Score | Notes |
|-----|------------|--------|-------|-------|
| 1 | 2026-10-23T06:12:18Z | gaps_found | 34/36 | Gap 1: the start gate hides back-slot faces (67-100 %), and rabbit ears hide faces on regular tiles. Gap 2: faces built lazily in useFrame |
| 2 | 2026-10-23T09:32:14Z | gaps_found | 56/57 | Gap 2 closed. Gate, CR-01 neighbor merge, stars and HUD are fixed. SC4 still failed for animal orders outside the test's two casts (up to 63 %) |
| 3 | 2026-10-23T11:48:56Z | gaps_found | 58/59 | Single-tile SC4 closed for every animal order (worst 25.0 %). Two adjacent tiles still failed for some orders: 20 states, up to 41.7 %; 6 were new in iteration 3 (far n6 slot 0) |
| 4 | 2026-10-23T14:19:07Z | human_needed | 59/59 | **D-17b(4) closed.** Every tile and every pair, all splits, current first/second/away, every animal order: 0 over 30 %. Only the deferred human checks remain |

## Goal Achievement

### Roadmap Success Criteria

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | The picked animal appears as a code-built chibi (8 kinds, no model file), the scoreboard icon matches, and it is cuter than the sample | ✓ VERIFIED (cuteness → human, deferred) | Unchanged: `GameStage` → `SceneContents` → `Character` → `ChibiModel`. 8 species. No loaders in `src/game` |
| SC2 | Expressions follow the situation | ✓ VERIFIED (readability → human) | `reaction.ts`; `Character.tsx` swaps `faces[key]`. reaction/actors tests pass |
| SC3 | Idle, hop per tile, success jump and spin, slump, cheer | ✓ VERIFIED (feel → human) | `charMotion.ts` + Character. actors tests pass |
| SC4 | Up to 8 characters on one tile: none hides another, each one is distinguishable | ✓ VERIFIED (look → human) | Re-run on HEAD: every tile 0..L-1, n 1-8, current here/away, 16/20/24 tiles, 6 views, every distinct animal order. 900 sweeps, 184,320 records, **0 over 30 %**, 0 thin, worst 25.0 % |

### Plan must-haves

Truths from runs 1-3 are regression-checked. The full suite is green. Engine/store/schema/io/settings are unchanged since f7a01dc, and the gate since d06eaf1.

| Plan | Truth (short) | Status | Evidence |
|------|---------------|--------|----------|
| 07-01 (8 truths) | miss/win/stars beats, manual skip, Banner by id, reduced-motion lengths, gameOver label, engine untouched | ✓ VERIFIED (regression) | timeline/useDirector/hud6 green. Engine diff since f7a01dc is empty |
| 07-02 (5 truths) | chibiDims, pawnSlots determinism, D-19 disc test, motion curves, no three in pure modules | ✓ VERIFIED (regression) | pawnSlots/slotOcclusion/charMotion/sourceGuard green. Main chunk has 0 `WebGLRenderer` |
| 07-03 (6 truths) | primitives only, silhouettes, look, 9 faces prebuilt, ground disc, 7 meshes, three only in scene | ✓ VERIFIED (regression) | chibi / facePrewarm green |
| 07-04 (7 truths) | expressions, blink, bounce/ring, hop + facing, success/slump/cheer + crowns, reduced motion, own-hop completion, ≤ 100 draw calls | ✓ VERIFIED (regression) | actors.test.tsx green |
| 07-05 (5 truths) | dev-only gallery, not shipped, star lift, self-check, UAT list | ✓ VERIFIED (regression) | `ls dist` = assets + index.html. No gallery string in dist or vite.config.ts |
| 07-06 (6 truths) | D-08a prebuilt faces + render-error path, D-12a star clearance, crowd hide, D-16 reduced motion, IN-03/IN-05 | ✓ VERIFIED (regression) | facePrewarm / starClearance green |
| 07-07 (5 truths) | D-14a game-over pill and crowns, outside-gameOver unchanged, emoji items, names as JSX text | ✓ VERIFIED (regression) | hud6 / stage green |
| 07-08 | D-17a(4) face test over the listed matrix | ✓ VERIFIED | `faceOcclusion.test.tsx` unchanged since run 3. 432 / 3024 / 2160 records, LIMIT 0.3. Worst 12.5 % |
| 07-08 | D-17a(1): slots move in x/z; current front-center / frontmost, full size; size bands; start bodies on the block, pillar clearance ≥ 0.03 | ✓ VERIFIED | Iteration 4 changes only x n5, far n6, preStart n4 and preStart n6, all inside the bands. slotOcclusion (unchanged, 30 tests) green |
| 07-08 | D-17a(2): gate unchanged | ✓ VERIFIED | `git diff --stat d06eaf1 -- src/game/scene/StartGate.tsx` is empty |
| 07-08 | D-17a(3): rabbit ears still the longest (≥ 1.6×) | ✓ VERIFIED | chibi.test.tsx green; chibiSpecies.ts unchanged since run 3 |
| 07-08 | D-19 disc test kept; face test cannot pass vacuously | ✓ VERIFIED | slotOcclusion green. faceOcclusion positive controls green |
| D-17b(1) | slots ≤ EDGE 0.45 toward each ring neighbor; bodies on the board base | ✓ VERIFIED | Iteration-4 values checked by hand: x n5 slot 2 (0.58, 0.2): the 0.58 is perpendicular to the ring, and \|dz\| 0.2 ≤ 0.45. far n6 slot 0 dz 0.33 ≤ 0.45. preStart n4 slot 0 \|dz\| 0.34. preStart n6 slot 2 \|dz\| 0.42. slotOcclusion "regular tiles: no slot passes EDGE…" green |
| D-17b(3) / WR-04 | lone-row hide; hop path hide; lifted landing row | ✓ VERIFIED (regression) | starClearance green |
| **D-17b(4)** | **two adjacent crowded tiles: no face over 30 %, every animal order** | **✓ VERIFIED** | **Closed.** See Occlusion Evidence: 0 over 30 % in the verifier's full pair sweep. The 20 run-3 states are now ≤ 21.3 % at full density. New asserted tests: `faceOrders.crowd{Corners,Sides,Start,Top,States}.test.tsx` |
| Iter-3 | The order sweep covers every distinct animal order, exactly | ✓ VERIFIED (regression) | `sweepOrders` is unchanged (iteration 4 only appends `CROWD_SPLITS` / `sweepPairCurrents`). Run-3 cross-check: 5,832 faces, 0 mismatches. Run 4: the verifier's independent harness reproduced every 24-sample worst value it re-mounted (e.g. 29.2 %, 25.0 %) |
| Iter-3 | Dog ears narrowed; D-02 floppy silhouette holds | ✓ VERIFIED (look → human) | chibiSpecies.ts unchanged since run 3. chibi.test D-02 green |

**Score:** 59/59 truths verified. 0 present-but-behavior-unverified.

### Occlusion Evidence (re-run on HEAD a101bd6)

The verifier re-ran its own tooling in `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/reverify2/`. Run-3 outputs are kept in `run2-out/`.
- `sweepcore.mjs` with `A*.test.mjs` / `B*.test.mjs`: drives the shipped `sweepOrders`.
- `core.mjs` with `pairfail3.test.mjs`: the independent direct-mount harness.

**Every tile (SC4):**

| Board | Sweeps / records | Over 30 % | Worst |
|-------|------------------|-----------|-------|
| L16 | 240 / 49,152 | 0 | 25.0 % |
| L20 | 300 / 61,440 | 0 | 25.0 % |
| L24 | 360 / 73,728 | 0 | 25.0 % (t18 n8, a pig in slot 6) |

**Every adjacent pair (D-17b(4)):** every pair including L-1+start, all 28 splits na+nb ≤ 8, current on the first tile, on the second tile or away. (Run 3 printed the totals of this same sweep as 13,860 / 1,333,248, an arithmetic slip; the per-file counts were the same as below.)

| Board | Sweeps / records | Over 30 % | Worst |
|-------|------------------|-----------|-------|
| L16 | 1,232 / 344,064 | 0 | 29.2 % |
| L20 | 1,540 / 430,080 | 0 | 29.2 % |
| L24 | 1,848 / 516,096 | 0 | 29.2 % |
| Total | 4,620 / 1,290,240 | **0** (run 3: 92) | 29.2 %: near corner 7+1; L16 t6+t7 2+6; L16 t13+t14 6+2 |

**Direct mounts with the independent harness** (`out-pairfail3.txt`, 24 samples / full density):

| Case | Run 3 | Now |
|------|-------|-----|
| far corner + side tile 2+6 / 6+2 (6 regressed states) | 33-42 % / 30-39 % | 0.0-20.8 % / 0.0-21.3 % |
| L-2 + L-1 1+6 (crown over a lone L-2 face) | 33.3 % / 35.7-36.0 % | 4.2 % / 0.5-1.4 % |
| L-1 + start 4+3 | 33.3-37.5 % / 27.2-29.0 % | 12.5 % / 9.2-9.9 % |
| L24 side pairs 2+5 / 5+2 | 33.3 % / 35.1-35.5 % | 0.0 % / 2.4 % |
| New near-limit records: 7+1 near corner (L16/20/24), L16 t6+t7 2+6, L16 t13+t14 6+2, L24 L-1+start 5+3 | — | 25.0-29.2 % / 21.8-25.5 % |

ℹ Margin: the tightest records sit at 29.2 % at the suite's 24 samples, which is 7 of 24 vertices. At full density they measure ≤ 25.5 %, so they are not a sampling artifact on the wrong side of the limit.

### Test strength checks (no weakening)

| Check | Result |
|-------|--------|
| LIMIT / SAMPLES / MIN_SAMPLES | 0.3 / 24 / 12. `occlusionKit.tsx` has only additions since run 3 (the diff has no removed lines) |
| Views / sizes / existing matrices | 6 views, 16/20/24 tiles. `faceOcclusion.test.tsx` and `faceOrders.pairs.test.tsx` are unchanged. All existing record counts are still asserted |
| New record counts | `PAIR_CURRENTS_SWEEP_RECORDS` = 116 slot sets × 8 animals × 6 views. Check: 2+6 and 6+2 at 8 slots × 2 currents, plus four 7-slot splits × 3 currents = 16 + 16 + 84 = 116. `crowdStates` asserts Σ(na+nb) × 8 × 6 for the 20 pinned run-3 states |
| Coverage | The new crowd tests assert 6 splits × current first/second/away on the far corner + side pairs, mid-side, mid-top, L-2+L-1 and L-1+start, plus the 20 pinned states. Other splits and pairs are covered by the verifier's full sweep (0 over), not by CI. ℹ Info only |

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/game/layout/pawnSlots.ts` | ✓ VERIFIED | Iteration 4: x n5, far n6 (slot 0 z 0.33), preStart n4, preStart n6 |
| `src/game/scene/occlusionKit.tsx` (test-only) | ✓ VERIFIED | Adds `CROWD_SPLITS` and `sweepPairCurrents`. Absent from dist |
| `src/game/scene/faceOrders.crowd{Corners,Sides,Start,Top,States}.test.tsx` | ✓ VERIFIED | All green in the full run; record counts asserted |
| Earlier artifacts | ✓ VERIFIED (regression) | as in run 3 |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| faceOrders.crowd*.test | occlusionKit | `sweepPairCurrents` / `sweepOrders` + `expectClean(records, count)` | WIRED |
| SceneContents | pawnSlots | `pawnSlots(order, positions, currentId, tiles.length)` | WIRED |
| Run-1..3 key links | — | regression: all still present | WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Type check | `npx tsc -b` | exit 0 | ✓ PASS |
| Full suite (run once) | `npx vitest run` | 64 files, 1175 tests passed, 55.3 s | ✓ PASS |
| Production build | `npm run build` | exit 0 (pre-existing > 500 kB GameCanvas chunk warning) | ✓ PASS |
| three out of main chunk | `grep -c WebGLRenderer dist/assets/index-*.js` | 0 | ✓ PASS |
| Gallery / kit not shipped | `ls dist`; grep gallery, occlusionKit, faceOrders in dist; vite.config.ts | assets + index.html only; no matches | ✓ PASS |
| No CDN hosts | URL scan of dist | only library doc strings (w3.org, github.com, react.dev, json-schema.org, opencollective.com, jcgt.org, docs.pmnd.rs). 1 `fetch(` (Vite modulepreload polyfill) | ✓ PASS |
| Engine unchanged | `git diff --stat f7a01dc -- src/engine src/store.ts src/schema.ts src/lib/io.ts src/settings.ts` | empty | ✓ PASS |
| Gate unchanged | `git diff --stat d06eaf1 -- src/game/scene/StartGate.tsx` | empty | ✓ PASS |
| One tile, every order | verifier every-tile sweep | 0 over, worst 25.0 % | ✓ PASS |
| Two tiles, every order, all splits, any current | verifier every-pair sweep | 0 over, worst 29.2 % | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED. The phase declares no probe scripts, and `scripts/*/tests/probe-*.sh` does not exist.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CHAR-01 | 07-03, 07-04, 07-05 | Code-built cute chibi animals, 6-8 kinds | ✓ SATISFIED (cuteness → human) | unchanged |
| CHAR-02 | 07-01, 07-03, 07-04, 07-06 | Situational expressions | ✓ SATISFIED (readability → human) | unchanged |
| CHAR-03 | 07-01, 07-02, 07-04, 07-06 | Idle, hop, success, slump, cheer | ✓ SATISFIED (feel → human) | unchanged |
| BOARD-05 | 07-02, 07-04, 07-05, 07-06, 07-08 | Up to 8 pawns on one tile all distinguishable | ✓ SATISFIED (look → human) | One tile and adjacent tiles: 0 faces over 30 % for every animal order |

No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| 8 files changed in iteration 4 | — | TBD / FIXME / XXX / TODO / HACK | — | none found |
| `faceOrders.crowd*.test.tsx` | — | CI asserts 6 crowded splits; the other 22 splits off the CROSS_PAIRS / crowd pairs are covered only by the verifier's scratch sweep | ℹ Info | none today. A future table change could regress an unasserted split |
| `src/game/scene/facePrewarm.test.tsx` | — | REVIEW IN-07 (boundary inside Canvas) | ℹ Info | carried |
| `src/game/hud/TurnHud.tsx` / `Banner.tsx` | — | REVIEW IN-08 (two polite live regions) | ℹ Info | carried |

### Human Verification Required (deferred by the user; these do not change the automatable verdict)

1. **Cuter than the sample.** Gallery grid and game on a phone (SC1).
2. **8 animals in 3 seconds**, including the dog's narrower ears (fixer's comparison: `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/fix3/cap/dog-cmp3.png`).
3. **Six expressions readable on a phone.** Watch sad vs idle and idle vs excited.
4. **Motions fun and short; game-over HUD.**
5. **8 on one tile and adjacent crowds.**
   - Judge the three-row 8-player start: are the back two rows, seen through the arch, still on the start block? (`/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap-fix3/verifier-start8-portrait-zoom.png`)
   - Judge adjacent crowds (3+2, 4+4, 1+7, 2+6), the D-17b spread, and the off-center current on L-1.
6. **Hop and landing star rows; star-row screen rule.**
7. **No hitch on the first expression change** on a classroom tablet.
8. **Phase 6 deferred device checks 6-13.**

### Gaps Summary

No automatable gaps remain.
- Iteration 4 fixed the run-3 regression: far-corner n6 slot 0 is back at z 0.33.
- It re-tuned the x n5 and preStart n4/n6 tables.
- It added asserted order sweeps for the crowded splits with the current on either tile or away.

The verifier's own full sweeps on HEAD find 0 faces over 30 %:
- every tile: 184,320 records, worst 25.0 %;
- every adjacent pair, all splits, any current: 1,290,240 records, worst 29.2 %, ≤ 25.5 % at full density.

The direct mounts of all 20 run-3 failing states measure ≤ 21.3 % at full density. tsc, the 1175-test suite, the build and every bundle guard pass. The engine and the start gate are unchanged.

Only the user-deferred human checks remain (status `human_needed`).

---

_Verified: 2026-10-23T14:19:07Z_
_Verifier: Claude (gsd-verifier)_
