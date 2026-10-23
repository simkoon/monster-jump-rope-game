---
phase: 07-chibi-characters
verified: 2026-10-23T09:32:14Z
status: gaps_found
score: 56/57 must-haves verified (1 failed)
behavior_unverified: 0
overrides_applied: 0
automatable_verdict: gaps_found # ROADMAP SC4 / BOARD-05 fails for some animal orders. The suite's two casts never put those animals in those slots
re_verification:
  previous_status: gaps_found
  previous_score: 34/36 (1 failed, 1 partial)
  gaps_closed:
    - "07-03 D-07/D-09 + D-08a: all 9 faces per animal are prebuilt in render (faceSet). The frame loop only swaps cached references"
    - "SC4 partial: the start gate no longer hides back-slot faces for the tested casts (was 67-100 % at every game start; now ≤ 20.8 %)"
    - "SC4 partial: two adjacent crowded tiles no longer merge (REVIEW CR-01, D-17b). Full pair sweep, current on either tile: 0 faces over 30 %"
    - "REVIEW WR-02/WR-03/WR-04: stars clear jumps, cheers and hops; the DOM HUD shows game over during the win beat"
  gaps_remaining:
    - "ROADMAP SC4 / BOARD-05: faces still go over 30 % for animal orders outside the suite's two casts (worst: 63 % at an 8-player game start)"
  regressions: []
gaps:
  - truth: "ROADMAP SC4 / BOARD-05 / D-17 / D-17a(4): with up to 8 characters on one tile, every character stays distinguishable, and no face is more than 30 % hidden"
    status: failed
    reason: >-
      faceOcclusion.test.tsx checks only two casts. One is `roster`: ANIMALS order, so bear, rabbit,
      cat, dog, ... always sit in the same slots. The other is `rabbits`: 8 rabbits. The test assumes
      the rabbit's ears are the worst occluder. They are not. The dog's wide ears and head, and the
      bear's ears, hide more. Which animal is hidden also matters: bear, pig, panda and chick faces
      lose more than a rabbit face behind the same occluder. Players pick their own animals, so any
      order can happen.
      The verifier used the suite's own method (real SceneContents, real fitCamera, rays to camera-facing
      chibi-face vertices, everyone crowned, all tiles hard, reduced motion) at the suite's density
      (24 samples) and at full density (every camera-facing vertex). It found these:
      (1) START n8 (every 8-player game start), slot 2 hides slot 4. Participants
      [pig, fox, DOG, chick, BEAR, panda, cat, rabbit]: the bear's face is 46-49 % hidden in all
      6 views on 16/20/24 tiles. With [bear, rabbit, DOG, cat, PANDA, ...] (the default order with cat and
      dog swapped), the panda's face is 43-45 % hidden. A dog in slot 2 and a bear in slot 4 gives up
      to 63 %. A bear in slot 2 gives 31-39 %.
      (2) START n7: a bear or dog in slot 3 hides 31-39 % of a pig in slot 2. A rabbit in slot 5 hides
      31-33 % of a bear in slot 4.
      (3) preStart (tile L-1) n7: a rabbit in slot 5 hides 35-36 % of a pig in slot 2 (6 views, all sizes,
      full density 35.4-36.0 %).
      (4) Regular tiles: a rabbit or dog as the current turn (front-center, full size) hides 31-36 % of
      a chick, panda or bear face behind it (far corners n6, preStart n7).
      Headless captures confirm (1): the bear behind the dog shows only its ears and crown in portrait.
      No later phase covers this (Phase 8 = success FX, ceremony, audio, stability).
    artifacts:
      - path: "src/game/scene/faceOcclusion.test.tsx"
        issue: "CASTS = ['roster', 'rabbits'] (line 56, castOf line 92). The fixed roster order and the all-rabbit cast never put a dog, bear, cat, fox or panda as the occluder in the slot pairs above, so the matrix passes while real animal orders exceed 30 %"
      - path: "src/game/layout/pawnSlots.ts"
        issue: "START n8 (START[6]): slot 2 [-0.58, -0.38] stands in front of slot 4 [-0.35, -0.59] (worst pair). START n7 (START[5]): slot 3 [-0.15, -0.25] in front of slot 2 [0.08, -0.57]. preStart n7: slot 5 [-0.08, 0.10] in front of slot 2 [0.07, -0.42]. far n6: current [0, 0.279] in front of slot 4 [-0.15, -0.818]"
      - path: "src/game/scene/chibiSpecies.ts"
        issue: "dog ears (wide, floppy) and bear ears are larger occluders than the rabbit ears the test treats as the worst case"
    missing:
      - "Make the occlusion matrix independent of animal order. Option A: for every tile shape and n, put each species as the single occluder in each slot (others filled with the most exposed face species, e.g. bear / pig / chick). Option B: a few adversarial casts (e.g. dog/bear in front slots, bear/pig/panda/chick behind). Keep LIMIT 0.3, SAMPLES and the asserted matrix size"
      - "Re-tune at least START n8 slots 2/4, START n7 slots 2/3 and 4/5, preStart n7 slots 2/5 and the far-corner n6 back row until that wider matrix is green. A (2) fix option, inside D-17a(3): narrow the dog ears"
      - "Or, if the user accepts the current look, record an override for SC4 (template in the Gaps Summary)"
human_verification: # Deferred by the user to the end of the phase. These do NOT affect the automatable verdict above.
  - test: "Open the game (and gallery.html grid view on `npm run dev -- --host`) on a phone and compare with the A안 sample"
    expected: "The chibi animals are clearly cuter than the 'basic stacked primitives' sample"
    why_human: "Aesthetic judgement (ROADMAP SC1, D-04, D-24 item 1)"
  - test: "Show the 8 animals to a child for about 3 seconds"
    expected: "Bear, rabbit, cat, dog, panda, fox, pig and chick are told apart by ears, muzzle, tail and beak"
    why_human: "Perceptual recognition at phone size (D-24 item 2)"
  - test: "On a phone, play through idle, your turn, ✅, ❌, a forward/backward event and a natural game end"
    expected: "Six expressions are readable. 07-05 flagged sad vs idle and idle vs excited as close at phone size"
    why_human: "Readability on a real screen (ROADMAP SC2, D-24 item 3)"
  - test: "Judge ✅, ❌ and play to the last round"
    expected: "Success jump and spin (0.9 s), slump (0.7 s) and cheer (1.5 s) feel fun and short. 지금 끝내기 skips to the result. During the win beat the turn bar shows 🏁 게임 끝 and the scoreboard crowns match the 3D crowns"
    why_human: "Motion feel and HUD look (ROADMAP SC3, D-24 item 4, D-14a)"
  - test: "Start an 8-player game in phone portrait and landscape (also with the dog as participant 3). Then crowd 3+2, 4+4 and 1+7 on adjacent tiles, including tile L-1 next to start"
    expected: "Every face is visible and each crowd reads as its own tile. Known automated fail (gap): dog/bear in start slot 2 hides slot 4. Also judge the D-17b look: back rows standing out over the apron or yard, and the current off-center on tile L-1"
    why_human: "Shows how bad the gap looks on a device. The D-17b spread is a visible layout change (D-24 item 5, REVIEW-FIX notes)"
  - test: "Hop a character across quest tiles, and land a lone character in front of an occupied tile"
    expected: "Star rows snap away on the hop path and come back lifted on landing. A lone tile's row hides while the tile behind it is occupied (D-17b(3)). No flicker reads as a bug"
    why_human: "Frame timing and look (REVIEW WR-04 and D-17b(3) fixes)"
  - test: "First success / first ❌ / first blink on a classroom tablet"
    expected: "No visible hitch when an expression first appears (faces are now prebuilt in render)"
    why_human: "Frame timing on a real device"
  - test: "Phase 6 deferred device checks 6-13 (07-05-SUMMARY / 06-VERIFICATION)"
    expected: "As in 06-VERIFICATION human_verification"
    why_human: "Real devices (carried over from Phase 6)"
---

# Phase 7: 치비 동물 캐릭터 & 표정 Verification Report

**Phase Goal:** 보드의 임시 말이 코드로 만든 귀여운 치비 동물 캐릭터(6~8종)로 바뀌고, 상황에 따라 표정과 동작이 살아 움직이며, 한 칸에 여러 말이 모여도 모두 구분된다. 캐릭터는 비교 데모(A안) 견본보다 확실히 더 귀여워야 한다.
**Verified:** 2026-10-23T09:32:14Z (HEAD 124662d)
**Status:** gaps_found
**Re-verification:** Yes, after gap closure 07-06..07-08 and review fix iteration 2 (97f8ee9, 7cde8b2)

## Re-verification History

| Run | Time (UTC) | Status | Score | Notes |
|-----|------------|--------|-------|-------|
| 1 | 2026-10-23T06:12:18Z | gaps_found | 34/36 | Gap 1: the start gate hides back-slot faces (67-100 %), and rabbit ears hide faces on regular tiles. Gap 2: faces built lazily in useFrame |
| 2 | 2026-10-23T09:32:14Z | gaps_found | 56/57 | Gap 2 closed. Gate, CR-01 neighbor merge, stars and HUD are fixed. **SC4 still fails** for animal orders outside the test's two casts (up to 63 %) |

## Goal Achievement

### Roadmap Success Criteria

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | The picked animal appears as a code-built chibi (8 kinds, no model file), the scoreboard icon matches, and it is cuter than the sample | ✓ VERIFIED (cuteness → human, deferred) | Unchanged since run 1: `GameStage` → `SceneContents` → `Character` → `ChibiModel`. 8 species. No loaders in `src/game` |
| SC2 | Expressions follow the situation | ✓ VERIFIED (readability → human) | `reaction.ts`. `Character.tsx:203` swaps `faces[key]`. reaction/actors tests pass |
| SC3 | Idle, hop per tile, success jump and spin, slump, cheer | ✓ VERIFIED (feel → human) | `charMotion.ts` + Character. actors tests pass |
| SC4 | Up to 8 characters on one tile: none hides another, each one is distinguishable | ✗ FAILED | Every tested state passes (start / 7 regular / 5 pairs, roster + rabbits casts, worst 29.2 %). The verifier's full sweep agrees for those casts and for every adjacent pair, all splits, current on either tile: 0 over 30 %. **But** other animal orders exceed 30 %: an 8-player start with a dog in slot 2 hides 43-63 % of slot 4's face. See the Occlusion Evidence section |

### Plan must-haves

Run-1 truths that passed are regression-checked: the full suite is green, and engine/store/schema/io/settings are unchanged since f7a01dc.

| Plan | Truth (short) | Status | Evidence |
|------|---------------|--------|----------|
| 07-01 (8 truths) | miss/win/stars beats, manual skip, Banner by id, reduced-motion lengths, gameOver label, engine untouched | ✓ VERIFIED (regression) | timeline/useDirector/hud6 tests green. `git diff --stat f7a01dc -- src/engine src/store.ts src/schema.ts src/lib/io.ts src/settings.ts` is empty |
| 07-02 (5 truths) | chibiDims, pawnSlots determinism, D-19 disc test, motion curves, no three in pure modules | ✓ VERIFIED | pawnSlots/slotOcclusion/charMotion/sourceGuard tests green. Main chunk has 0 `WebGLRenderer` |
| 07-03 (6 truths) | primitives only, silhouettes, look, **9 faces prebuilt**, ground disc, 7 meshes, three only in scene | ✓ VERIFIED | **Run-1 partial now closed**: `faceSet(animal)` (`chibiFaces.ts:305-315`) builds all `FACE_KEYS` and is called in `useMemo` from `ChibiModel.tsx:77`, `Character.tsx:73` and `CharacterGallery.tsx:290`. `faceGeo` has no other production caller. useFrame only assigns `faces[key]` (`Character.tsx:203`) |
| 07-04 (7 truths) | expressions, blink, bounce/ring, hop + facing, success/slump/cheer + crowns, reduced motion, own-hop completion, ≤ 100 draw calls | ✓ VERIFIED (regression) | actors.test.tsx green |
| 07-05 (5 truths) | dev-only gallery, not shipped, star lift, self-check, UAT list | ✓ VERIFIED (regression) | `ls dist` = assets + index.html. No gallery string in dist or vite.config.ts |
| 07-06 | D-08a: 9 faces in render, 0 builds in the frame loop across blinks and every reaction | ✓ VERIFIED | facePrewarm.test.tsx: 27 bakes at mount (3 animals × 9), then `[]` after 120 frames plus stars/miss/event/win beats; `seen.size ≥ 4` swaps |
| 07-06 | D-08a: a failing face build is a render error an error boundary catches | ✓ VERIFIED (ℹ caveat) | facePrewarm "raises a failing face build in render" passes. The boundary sits inside the R3F tree. The DOM `CanvasErrorBoundary` path is not exercised (REVIEW IN-07) |
| 07-06 | D-12a: lifted stars at tile top + 1.35 clear the crowned bounce; hidden during the stars and win beats | ✓ VERIFIED | starClearance.test.tsx frame-by-frame cases 1-3 |
| 07-06 | BOARD-05: a tile with 2+ characters hides its stars | ✓ VERIFIED | starClearance "hides the stars of a tile with 2 characters…" |
| 07-06 | D-16: reduced motion snaps the lift and crowd hide; no act hide | ✓ VERIFIED | starClearance reduced-motion block |
| 07-06 | IN-03 / IN-05 cleanups | ✓ VERIFIED | no `lerpPose` export. ReadySignal says 3 frames |
| 07-07 | D-14a: during gameOver the pill shows `🏁 게임 끝` and no next block; round and 지금 끝내기 stay | ✓ VERIFIED | `GameStage.tsx:131,173`, `TurnHud.tsx:60-95`. hud6 "game over (07-07, D-14a)", stage.test.tsx:214-245 |
| 07-07 | D-14a: no is-current cell; crowns = game.winners, incl. all-zero co-winners | ✓ VERIFIED | `GameStage.tsx:215-216`. hud6 "crownIds crowns exactly the engine winners…" |
| 07-07 | Outside gameOver nothing changes | ✓ VERIFIED | hud6 / stage suites green |
| 07-07 | IN-01 emoji items, `is-many` for more than 4 | ✓ VERIFIED | hud6 suite green (REVIEW: resolved) |
| 07-07 | Names as JSX text only (T-06-08, T-07-02) | ✓ VERIFIED | no `dangerouslySetInnerHTML` in the changed HUD files |
| 07-08 | D-17a(4) face test over the listed matrix (start + 7 regular, roster + rabbits casts) | ✓ VERIFIED as written, ✗ insufficient | 432 / 3024 records per size, LIMIT 0.3, SAMPLES 24, MIN_SAMPLES 12 asserted. Worst 20.8 % (start), 20.8 % (regular). The cast choice misses the failing orders (SC4) |
| 07-08 | D-17a(1): slots move in x/z; current front-center (regular, except preStart) / frontmost (start), full size; size bands; start bodies on the block, pillar clearance ≥ 0.03 | ✓ VERIFIED | `pawnSlots.ts:183-206`. slotOcclusion "start tile slots clear the gate" (4 tests). The preStart exception is documented in UI-SPEC §C5 (`07-UI-SPEC.md:298`) |
| 07-08 | D-17a(2): gate unchanged | ✓ VERIFIED | `git diff --stat d06eaf1 -- src/game/scene/StartGate.tsx` is empty. Board tests green |
| 07-08 | D-17a(3): rabbit ears shortened and still the longest (≥ 1.6×) | ✓ VERIFIED | `chibiSpecies.ts:157` (`len: 0.15`). chibi.test.tsx:173-177 |
| 07-08 | D-19 disc test kept; face test cannot pass vacuously (positive controls ≥ 90 %) | ✓ VERIFIED | slotOcclusion 18 view×size cases green. faceOcclusion controls (arch, behind current) green |
| 07-08 | test file < ~20 s | ✓ VERIFIED | 17.5 s in the full run |
| 07-08 | before/after captures in the scratchpad | ✓ VERIFIED | `scratchpad/cap-after/*.png`, `scratchpad/cap-fix/*.png` exist |
| D-17b (REVIEW CR-01) | slots ≤ EDGE 0.45 toward each ring neighbor; bodies on the board base | ✓ VERIFIED | Tables inspected by hand: every along-ring offset ≤ 0.45 (z: \|dx\| ≤ 0.45; x and preStart: \|dz\| ≤ 0.45; near: dx ≤ 0.42, dz ≥ −0.45; far: dx ≤ 0.42, dz ≤ 0.359). slotOcclusion "regular tiles: no slot passes EDGE…" projects each slot onto the lattice step to both neighbors for every L / tile / n |
| D-17b(4) | two adjacent tiles in the face test (sides, corner, L-1 + start; 6 splits) | ✓ VERIFIED | 2160 records per size, worst 29.2 % (L-1 + start, 1+7). Verifier sweep: every pair, all 28 splits, current on either tile, 16/20/24 → 0 over 30 % (worst 28.6 %) |
| D-17b(3) / WR-04 | a lone row hides while the tile behind is occupied; rows hide on the hop path and the landing row is already lifted | ✓ VERIFIED | `Board.tsx:226-246`. starClearance cases "hides the rows of the departure tile and every crossed tile…", "lands under an already lifted row…", "hides a lone tile's lifted row…" |

**Score:** 56/57 truths verified (1 failed: SC4). 0 present-but-behavior-unverified: each behavior-dependent truth (prewarm, star hide on hop and beats, HUD at gameOver) has a passing named test in the single full-suite run.

### Occlusion Evidence (SC4 / BOARD-05)

The verifier wrote its own harness in the scratchpad (not the executor's tooling):
`/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/reverify/core.mjs`.
It uses the same method as the suite:
- mount the real `SceneContents`, with reduced motion mocked, everyone crowned and every quest tile hard;
- cast rays from the real `fitCamera` positions (6 views) to camera-facing `chibi-face` vertices;
- prune by exact y.

Two sampling densities were used: 48 samples per face for the sweeps, and the suite's 24 and full density (every vertex) for confirmation.

**What passes (closes run-1 gap 1 for those casts):**

| Sweep | Records (L16/L20/L24) | Over 30 % | Worst |
|-------|-----------------------|-----------|-------|
| Every adjacent pair (incl. L-1+0, 0+1), all 28 splits, current on the first or second tile, roster cast | 32,256 / 40,320 / 48,384 | **0** | 22.4 / 28.6 / 28.6 % |
| Every tile 0..L-1, n 1-8, current on / absent, roster and rabbits casts | (part of the sweep below) | **0** | ≤ 30 % |
| Start tile at game start (run-1: 67-100 %) | in the suite | 0 | 20.8 % |

**What fails (independent of the suite's casts):**

| Case | Occluder → hidden | Face hidden | Where |
|------|-------------------|-------------|-------|
| START n8, cast [pig, fox, **dog**, chick, **bear**, panda, cat, rabbit] | dog (slot 2) ears + head → bear (slot 4) | **46-49 %** at full density, all 6 views, L16/20/24 | every 8-player game start with this order |
| START n8, cast [bear, rabbit, **dog**, cat, **panda**, fox, pig, chick] (default order, cat and dog swapped) | dog (slot 2) → panda (slot 4) | **43-45 %** full density (40-54 % at 24 samples) | same |
| START n8, dog in slot 2, bear in slot 4 (probe) | dog → bear | up to **63 %** (588x290) | same |
| START n8, bear in slot 2 | bear ears + head → slot 4 | 31-39 % | same |
| START n7 | bear/dog (slot 3) → pig (slot 2) | 31-39 % | 7-player start |
| START n7, rot4 cast (bear slot 4, rabbit slot 5) | rabbit ears → bear | 30.6-32.7 % (full density 30.6-30.8 %) | 7-player start |
| preStart (tile L-1) n7, rot4 cast | rabbit (slot 5) ears → pig (slot 2) | **35.4-36.0 %** (24 samples and full density) | all sizes |
| far corner n6 / preStart n7 | rabbit or dog current (front, full size) → chick / panda / bear in the back row | 31-36 % | landscape views |

Probe output:
- `.../scratchpad/reverify/out-A{16,20,24}.txt`, `out-B{16,20,24}.txt` (sweeps)
- `.../scratchpad/reverify-perm/perm-*.txt`: one rabbit in each slot, the other slots filled with one species, 9 tiles × n 2-8, L20
- `.../scratchpad/reverify-perm2/perm-*.txt`: dog / cat / fox / panda / bear as the single occluder
- `.../scratchpad/reverify-real/r.test.mjs`: distinct 8-animal casts at 24 samples and full density

Visual confirmation: a scratch worktree with a gallery `order=` patch, since removed. Captures:
- `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/rv-cap/dogthird-portrait-zoom.png`: the bear behind the blue dog shows only its ears and crown.
- `.../rv-cap/dogthird-landscape-zoom.png`: about half of the bear's face shows.
- `.../rv-cap/roster-portrait-zoom.png`: the same slots with the roster order; all faces visible.
- `.../rv-cap/prestart7-land-zoom.png`: the pig's face is partly behind the rabbit's ears.

Assessment: the run-1 failure was 67-100 % at every game start. That is fixed, and the CR-01 neighbor merge is fixed. What remains is narrower but real and reproducible:
- The phase's own final criterion (D-17a(4): "얼굴마다 30% 이하") is broken by ordinary game states. Players choose their animals, and every 8-player game starts with all 8 on the start tile.
- The test passes only because its two casts happen to put a cat (roster) or a rabbit (rabbits) in start slot 2.

The metric counts vertices, not pixel area. The dog/bear case is well above the limit at every density, so the metric does not decide the result.

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/game/scene/chibiFaces.ts` | ✓ VERIFIED | `faceSet` prebuild (gap 2 closed) |
| `src/game/scene/ChibiModel.tsx`, `Character.tsx`, `CharacterGallery.tsx` | ✓ VERIFIED | `useMemo(() => faceSet(animal))`; frame loop swaps only |
| `src/game/scene/facePrewarm.test.tsx` | ✓ VERIFIED | build counting via a pass-through `bake` mock |
| `src/game/scene/Board.tsx` | ✓ VERIFIED | lift 1.35, act / crowd / hop / screen hides |
| `src/game/scene/starClearance.test.tsx` | ✓ VERIFIED | 10 cases incl. hop and screen rule |
| `src/game/GameStage.tsx`, `hud/TurnHud.tsx`, `hud/Scoreboard.tsx`, `hud/Banner.tsx` | ✓ VERIFIED | `over` wiring, `crownIds`, emoji items |
| `src/game/layout/pawnSlots.ts` | ⚠ WIRED, fails contract for some casts | `tileShape`, per-shape tables, EDGE 0.45, `ringSize` passed from `SceneContents.tsx:44`. START n8 slots 2/4 and others listed in the gap |
| `src/game/layout/slotOcclusion.test.ts` | ✓ VERIFIED | D-19 discs + D-17b bound + gate clearance |
| `src/game/scene/faceOcclusion.test.tsx` | ⚠ insufficient | sound method, controls and limits; casts do not cover animal order |
| `src/game/scene/chibiSpecies.ts` | ✓ VERIFIED | rabbit ear `len 0.15`; dog ears are the main remaining occluder |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| ChibiModel / Character / Gallery | chibiFaces | `faceSet(animal)` in `useMemo` | WIRED |
| Character useFrame | face mesh | `rig.face.current.geometry = faces[key]` | WIRED |
| SceneContents | pawnSlots | `pawnSlots(order, positions, currentId, tiles.length)` | WIRED |
| SceneContents | Board | `occupied`, `crowded` props; Board also reads fresh `displayed` and the current beat | WIRED |
| GameStage | TurnHud / Scoreboard | `over`, `currentId={over ? null : cur.id}`, `crownIds={over ? game.winners : undefined}` | WIRED |
| Run-1 key links (17) | — | regression: all still present | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| SceneContents → Character | participants (id, animal) | `game.config.participants` via GameStage | yes | ✓ FLOWING |
| Board | occupied / crowded / hop path | `displayed.positions` + `usePresentation` current beat | yes | ✓ FLOWING |
| Scoreboard (gameOver) | crownIds | `game.winners` (engine) | yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Type check | `npx tsc -b` | exit 0 | ✓ PASS |
| Full suite (run once) | `npx vitest run` | 52 files, 1133 tests passed (faceOcclusion 13 tests, 17.5 s) | ✓ PASS |
| Production build | `npm run build` | exit 0 (pre-existing > 500 kB GameCanvas chunk warning) | ✓ PASS |
| three out of main chunk | `grep -c WebGLRenderer dist/assets/index-*.js` | 0 (GameCanvas chunk: 6) | ✓ PASS |
| Gallery not shipped | `ls dist`; `grep -il gallery dist/assets/*`; `grep -i gallery vite.config.ts` | only assets + index.html; no matches | ✓ PASS |
| No CDN hosts | URL scan of dist | only library doc / metadata strings (w3.org, github.com, react.dev, json-schema.org, opencollective.com, docs.pmnd.rs, jcgt.org). The only `fetch(` in the main chunk is Vite's modulepreload polyfill (same-origin `e.href`) | ✓ PASS |
| Engine unchanged | `git diff --stat f7a01dc -- src/engine src/store.ts src/schema.ts src/lib/io.ts src/settings.ts` | empty | ✓ PASS |
| Start gate unchanged | `git diff --stat d06eaf1 -- src/game/scene/StartGate.tsx` | empty | ✓ PASS |
| Occlusion, roster/rabbit casts, all tiles and pairs | verifier sweep | 0 over 30 % | ✓ PASS |
| Occlusion, other animal orders | verifier probes | up to 63 % (START n8 dog → slot 4) | ✗ FAIL |

### Probe Execution

Step 7c: SKIPPED. The phase declares no probe scripts, and `scripts/*/tests/probe-*.sh` does not exist.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CHAR-01 | 07-03, 07-04, 07-05 | Code-built cute chibi animals, 6-8 kinds | ✓ SATISFIED (cuteness → human) | unchanged from run 1 |
| CHAR-02 | 07-01, 07-03, 07-04, 07-06 | Situational expressions | ✓ SATISFIED (readability → human) | plus prebuilt faces (D-08a) |
| CHAR-03 | 07-01, 07-02, 07-04, 07-06 | Idle, hop, success, slump, cheer | ✓ SATISFIED (feel → human) | plus star clearance (D-12a, WR-04) |
| BOARD-05 | 07-02, 07-04, 07-05, 07-06, 07-08 | Up to 8 pawns on one tile all distinguishable | ✗ BLOCKED | gap above. REQUIREMENTS.md lines 35 and 147 say Complete, which is not accurate until the gap closes |

No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| 26 files changed since d06eaf1 | — | TBD / FIXME / XXX / TODO / HACK / placeholder | — | none found |
| `src/game/scene/faceOcclusion.test.tsx` | `CASTS` | the test's coverage claim ("rabbits: the longest ears in every slot … covers") is not true for other animals | ⚠ Warning (root of the gap) | false green for BOARD-05 |
| `src/game/scene/facePrewarm.test.tsx` | 69-71, 120-143 | first case depends on test order; the boundary is in-Canvas, not `CanvasErrorBoundary` (REVIEW IN-07) | ℹ Info | test robustness only |
| `src/game/hud/TurnHud.tsx` / `Banner.tsx` | — | two polite live regions announce at game end (REVIEW IN-08) | ℹ Info | screen readers only |
| `src/game/director/reaction.ts`, `Character.tsx`, `sourceGuard.test.ts` | — | REVIEW IN-02, IN-04, IN-06 carried | ℹ Info | none on must-haves |

### Human Verification Required (deferred by the user; these do not change the automatable verdict)

1. **Cuter than the sample.** Gallery grid and game on a phone (SC1).
2. **8 animals in 3 seconds.** A child tells them apart.
3. **Six expressions readable on a phone.** Watch sad vs idle and idle vs excited.
4. **Motions fun and short; game-over HUD.** 0.9 / 0.7 / 1.5 s; 🏁 게임 끝 and matching crowns during the win beat.
5. **8 on one tile and adjacent crowds.** Include an 8-player start with the dog as participant 3 (the known automated fail). Judge the D-17b spread over the apron or yard, and the off-center current on tile L-1.
6. **Hop and landing star rows; star-row screen rule.**
7. **No hitch on the first expression change** on a classroom tablet.
8. **Phase 6 deferred device checks 6-13.**

### Gaps Summary

The run-1 gaps are mostly closed:
- Faces are prebuilt in render.
- The start gate no longer hides anyone in the tested casts (run 1: 67-100 %; now ≤ 20.8 %).
- Rabbit ears are shorter.
- Adjacent crowds stay apart (D-17b, 0 failures over every pair, split and current position).
- Stars clear jumps, cheers and hops.
- The HUD shows game over during the win beat.

tsc, the 1133-test suite, the build and every bundle guard pass. The engine and the start gate are unchanged.

One must-have still fails: **ROADMAP SC4 / BOARD-05**. The mounted-scene face test is the right tool, but it checks only two animal orders: ANIMALS order, and 8 rabbits. It assumes the rabbit's ears are the worst occluder. With the suite's own method, other orders break the 30 % limit:
- An 8-player game that starts with a dog as participant 3 hides 43-63 % of participant 5's face in every view and on every board size. A bear there hides 31-39 %.
- Smaller breaches (31-36 %) appear at START n7, on tile L-1 with 7 characters, and in the far corners with 6.

Players pick their own animals, so these are ordinary game states. No later phase takes this over.

The fix is focused:
1. Make the face test independent of animal order (per-slot single-occluder casts, or a few adversarial casts), keeping LIMIT 0.3.
2. Re-tune the listed slot pairs, starting with START n8 slots 2/4, and/or narrow the dog ears.

If the user accepts the current look, record an override instead:

```yaml
overrides:
  - must_have: "ROADMAP SC4 / BOARD-05 / D-17 / D-17a(4): with up to 8 characters on one tile, every character stays distinguishable, and no face is more than 30 % hidden"
    reason: "{e.g. 'remaining cases are animal-order specific (≤ 63 % at an 8-player start with a dog in slot 2); body color, ears and crown still identify each animal'}"
    accepted_by: "{name}"
    accepted_at: "{ISO timestamp}"
```

---

_Verified: 2026-10-23T09:32:14Z_
_Verifier: Claude (gsd-verifier)_
