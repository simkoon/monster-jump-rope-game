---
phase: 07-chibi-characters
verified: 2026-10-23T06:12:18Z
status: gaps_found
score: 34/36 must-haves verified (1 failed, 1 partial)
behavior_unverified: 0
overrides_applied: 0
automatable_verdict: gaps_found # BOARD-05 / ROADMAP SC4 fails on an automatable, reproducible measure; everything else automatable passes
gaps:
  - truth: "ROADMAP SC4 / BOARD-05 / D-17 / UI-SPEC C6: with up to 8 characters on one tile, every character stays visible and distinguishable, and nothing covers more than 30 % of a face (the contract's measure of 'distinguishable')"
    status: failed
    reason: >-
      Every game starts with everyone on the start tile, and for every player count from 2 to 8 the
      start gate (arch tube, apex star, far pillar) hides 67-100 % of at least one back-slot face, and
      from 6 players up it hides two. The verifier's own raycast against the REAL mounted SceneContents
      (real StartGate meshes, real chibi meshes, real fitCamera, 6 viewports x 16/20/24 tiles) agrees
      with the 07-05 self-check and is slightly worse. A second cause: the D-19 proof models heads only
      as discs, so it misses ears. The rabbit's long ears in a front slot cover 54-73 % of the face behind
      it on regular tiles (worst at phone landscape 588x290), which breaks D-17 ("앞 캐릭터가 뒤 캐릭터
      얼굴을 30% 넘게 가리지 않음"). The UI-SPEC C6 fix (move a slot up to 0.10 toward +z) was applied
      and does not work. No later phase (Phase 8 goal or success criteria) takes this over.
    artifacts:
      - path: "src/game/layout/pawnSlots.ts"
        issue: "START table (lines 59-72): n2 slot1, n3 slot2, n4 slot3, n5 slot4, n6 slots 1/5, n7 slot6, n8 slots 1/6 sit behind the gate as the camera sees them. Comment at lines 54-58 says these were 'left for the phase-end look check'."
      - path: "src/game/scene/StartGate.tsx"
        issue: "PILLAR_H 0.7 / ARCH_R 0.55 / ARCH_TUBE 0.09 / OUTWARD 0.2 (lines 9-12). The arch tube (height 0.7-1.34) and the apex star (y about 1.54) cross the line of sight to the back-right start slots."
      - path: "src/game/layout/slotOcclusion.test.ts"
        issue: "The D-19 proof (lines 54-98) projects head discs only. It ignores the gate arch/star (it checks pillar clearance only, lines 128+) and every character's ears, so it passes while real faces are 60-100 % hidden."
      - path: "src/game/scene/chibiSpecies.ts"
        issue: "RABBIT_EAR (line 155) is about 0.22 long above the head. From a front slot it covers the face of the character behind (not modelled by any test)."
    missing:
      - "Pick a fix outside the 07-05 bounds (needs a user decision): move the arch-covered START slots in x (off the line of sight from the camera through the arch apex and far pillar), and/or shrink or move the gate outward (StartGate OUTWARD / ARCH_R), and/or move the start crowd so the camera sees it in front of the gate"
      - "Add an automated arch- and ear-aware occlusion test, e.g. raycast the mounted SceneContents from fitCamera to the face-mesh vertices (as the verifier's scratch test does) for n 2-8 x 6 viewports x 16/20/24 tiles, with the limit at 30 % per face, start tile and regular tiles"
      - "Re-tune REGULAR / START slots (or rabbit ear length, inside the D-02 silhouette rule) until that test is green"
  - truth: "07-03 D-07 / D-09: the 9 face geometries per animal are prebuilt into one shared cache, and no geometry or material is created when the expression changes"
    status: partial
    reason: >-
      faceGeo() builds each face lazily on first use (src/game/scene/chibiFaces.ts:285-296). Only the
      'idle' key is built during render (ChibiModel.tsx:101). The other 8 keys per animal are built the
      first time Character's useFrame asks for them (Character.tsx:199-202), running mergeGeometries
      inside the frame loop at a reaction moment. An exception there also bypasses the canvas error
      boundary (REVIEW WR-01). Later swaps do reuse the cache, so expressions work. The 'prebuilt' part
      of the truth does not hold.
    artifacts:
      - path: "src/game/scene/chibiFaces.ts"
        issue: "lines 285-296: lazy build-on-first-use cache"
      - path: "src/game/scene/Character.tsx"
        issue: "lines 199-202: first faceGeo(animal, key) call for each key happens inside useFrame"
    missing:
      - "Prewarm every FACE_KEYS entry for the participating animals during render or a layout effect (for example in ChibiModel with useMemo over [animal]), so the frame loop only swaps cached references"
human_verification: # Deferred by the user to the end of the phase. These do NOT affect the automatable verdict above.
  - test: "Open the game (and /monster-jump-rope-game/gallery.html grid view on `npm run dev -- --host`) on a phone and compare with the A안 sample"
    expected: "The chibi animals are clearly cuter than the 'basic stacked primitives' sample"
    why_human: "Aesthetic judgement (ROADMAP SC1, D-04, D-24 item 1)"
  - test: "Show the 8 animals to a child for about 3 seconds"
    expected: "Bear, rabbit, cat, dog, panda, fox, pig and chick are told apart by ears, muzzle, tail and beak"
    why_human: "Perceptual recognition at phone size (D-24 item 2)"
  - test: "On a phone, play through idle, your turn, ✅, ❌, a forward/backward event and a natural game end"
    expected: "Six expressions are readable: idle, excited, joy ^^, sad (sweat and brows), surprised, winner with sparkles. 07-05 self-check flagged sad vs idle and idle vs excited as close at phone size"
    why_human: "Readability on a real screen (ROADMAP SC2, D-24 item 3)"
  - test: "Judge ✅, ❌ and play to the last round"
    expected: "Success jump and spin (0.9 s), sad slump (0.7 s) and winner cheer (1.5 s) feel fun and never too long. 지금 끝내기 skips straight to the result"
    why_human: "Motion feel (ROADMAP SC3, D-24 item 4)"
  - test: "Start an 8-player game in phone portrait and landscape, then put several characters on one quest tile"
    expected: "Every face is visible. KNOWN AUTOMATED FAIL (gap 1): the start gate hides back-slot faces at game start. Also check whether the lifted tile stars (Board.tsx:40, y 1.20) sit across a back-row face in landscape (verifier capture land-t7n8-zoom.png shows them over the fox's eyes)"
    why_human: "Confirms how bad the gap looks on a device and informs the fix choice (D-24 item 5)"
  - test: "First success / first ❌ / first blink on a classroom tablet"
    expected: "No visible frame hitch when an expression first appears"
    why_human: "Frame timing on a real device (relates to gap 2 / REVIEW WR-01)"
  - test: "Phase 6 deferred device checks 6-13 listed in 07-05-SUMMARY (iPhone portrait fit, 3-second read, toy-board look, dice → hop gating, color match, context-loss restore, offline, iPad/laptop landscape)"
    expected: "As in 06-VERIFICATION human_verification"
    why_human: "Real devices (carried over from Phase 6)"
---

# Phase 7: 치비 동물 캐릭터 & 표정 Verification Report

**Phase Goal:** 보드의 임시 말이 코드로 만든 귀여운 치비 동물 캐릭터(6~8종)로 바뀌고, 상황에 따라 표정과 동작이 살아 움직이며, 한 칸에 여러 말이 모여도 모두 구분된다. 캐릭터는 비교 데모(A안) 견본보다 확실히 더 귀여워야 한다.
**Verified:** 2026-10-23T06:12:18Z
**Status:** gaps_found
**Re-verification:** No (initial verification)

## Goal Achievement

### Roadmap Success Criteria

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | The animal picked on the start screen appears on the board as a code-built chibi (6-8 kinds, no model file), the scoreboard icon matches, and it is clearly cuter than the sample | ✓ VERIFIED (cuteness → human, deferred) | `GameStage.tsx:136-139` passes `config.participants` (with `animal`) → `GameCanvas` → `SceneContents.tsx:54-64` renders one `Character` per participant → `ChibiModel` → `chibiNodes(animal)`. 8 species in `chibiSpecies.ts`; body color `ANIMAL_COLOR[animal]` (`chibiSpecies.ts:244`), the same hex as the Scoreboard `--pc` (`Scoreboard.tsx:36`). There is no GLTF/texture/loader anywhere in `src/game` (grep), and `Pawn.tsx` is deleted. `chibi.test.tsx` "D-02: animals differ by silhouette" passes |
| SC2 | Expressions change with the situation: idle, excited on your turn, joy ^^, sad, surprised, winner | ✓ VERIFIED (phone readability → human) | `reaction.ts:34-63` maps beats to expressions. `Character.tsx:149,195-202` swaps the face geometry on a key change. Tests pass: reaction.test.ts (5 mapping cases, blink) and actors.test.tsx "stars: joy face…", "miss: sad face…", "win beat: every co-winner…winner face", "blinks" |
| SC3 | Idle motion, a hop per tile, success jump and spin, sad slump on a fail, winner cheer | ✓ VERIFIED (feel → human) | `charMotion.ts` pure curves, `Character.tsx:107-184` drives them. Tests pass: actors.test.tsx "hops tile by tile and completes the hop beat exactly once", "faces the travel direction…", "stars: …crouch-jump-spin", "current character bounces…", reduced-motion block; charMotion.test.ts (start/end = REST) |
| SC4 | With up to 8 characters on one tile, none hides another and each one is distinguishable | ✗ FAILED | See the Occlusion Evidence section. At every game start (2-8 players), the start gate hides 67-100 % of at least one face. On regular tiles, rabbit ears in front cover 54-73 % of the face behind |

### Plan must-haves (merged; 07-04 truth 1 deduplicated into SC1)

| Plan | Truth (short) | Status | Evidence |
|------|---------------|--------|----------|
| 07-01 | D-13 miss beat 700 ms per ❌, from the `judged` event, HUD hidden until it ends | ✓ VERIFIED | `timeline.ts:97-101`; timeline.test.ts "judged fail with a retry → one miss beat", hud6 "miss beat … completed by the Banner at exactly 700 ms" |
| 07-01 | D-12/15 stars 900, others unchanged | ✓ VERIFIED | `timeline.ts:20`; timeline.test.ts "D-15 length caps" |
| 07-01 | D-14 win beat 1500 ms with co-winners + animals, gold banner; manual end skips | ✓ VERIFIED | `timeline.ts:104-108`, `useDirector.ts:41-48`; useDirector.test.tsx "rounds-complete end plays one win beat", "manual gameEnded … skipAll"; hud6 "win beat … gold win banner" |
| 07-01 | C7e 지금 끝내기 during win → skipAll | ✓ VERIFIED | `GameStage.tsx:148-150` |
| 07-01 | D-22 Banner completes timed beats by id; watchdog fallback | ✓ VERIFIED | `Banner.tsx:18` `isTimedBeat`; hud6 tests |
| 07-01 | D-16 reduced motion keeps miss/win lengths | ✓ VERIFIED | timeline.test.ts "reducedMotion keeps miss 700 and win 1500" |
| 07-01 | C7f gameOver aria label | ✓ VERIFIED | labels.ts / labels.test.ts (suite green) |
| 07-01 | Engine/store/schema/io/settings unchanged | ✓ VERIFIED | `git diff --exit-code f7a01dc -- src/engine src/store.ts src/schema.ts src/lib/io.ts src/settings.ts` → clean |
| 07-02 | D-03 chibi proportions in one pure module | ✓ VERIFIED | `chibiDims.ts`; chibiDims.test.ts |
| 07-02 | D-17 current turn in slot 0, table sizes, deterministic | ✓ VERIFIED | `pawnSlots.ts:84-106`; pawnSlots.test.ts |
| 07-02 | D-19 projection test: no head DISC covers >30 % of another, spacing, pillar clearance | ✓ VERIFIED as written, ✗ insufficient | `slotOcclusion.test.ts` passes. It models head discs only (no ears, no arch, no apex star), which is why SC4 fails anyway |
| 07-02 | Pure clock-free motion curves start/end at REST | ✓ VERIFIED | charMotion.test.ts |
| 07-02 | chibiDims/pawnSlots/charMotion import no three/React | ✓ VERIFIED | sourceGuard.test.ts green; main chunk has 0 `WebGLRenderer` |
| 07-03 | CHAR-01/D-01 code primitives only, ANIMAL_COLOR body, CHAR_COLOR in palette | ✓ VERIFIED | `chibiSpecies.ts:203,244`; palette.test.ts; no loaders in `src/game` |
| 07-03 | D-02 silhouettes per species | ✓ VERIFIED | chibi.test.tsx "D-02: animals differ by silhouette" |
| 07-03 | D-03 proportions, eyes, cheeks, glossy material, inverted hull | ✓ VERIFIED (look → human) | chibi.test.tsx (hull test) + 07-05 captures |
| 07-03 | D-07/D-09 9 faces per animal **prebuilt** in a shared cache, no geometry created on expression change | ⚠ PARTIAL | The cache exists and the swap works, but faces are built lazily on first use inside `useFrame` (`chibiFaces.ts:285-296`, `Character.tsx:199-202`; REVIEW WR-01) |
| 07-03 | D-18/D-06 participant-color disc + blob shadow merged into one ground mesh | ✓ VERIFIED | `chibiSpecies.ts:203`; actors "is exactly 7 meshes" |
| 07-03 | D-20 exactly 7 meshes (+ ring, crown), mergeGeometries never null | ✓ VERIFIED | actors.test.tsx:240 |
| 07-03 | D-21 three-using code only in src/game/scene | ✓ VERIFIED | sourceGuard; bundle check |
| 07-04 | D-07/D-08 expressions follow beats, blink 3.0-4.4 s | ✓ VERIFIED | reaction.test.ts, actors "blinks" |
| 07-04 | D-10 only current bounces + ring breathes; others breathe | ✓ VERIFIED | actors "the current character bounces and its ring breathes" |
| 07-04 | D-11 hop consumer + travel facing + turn back | ✓ VERIFIED | actors "faces the travel direction…" |
| 07-04 | D-12/13/14 success jump-spin, slump, winners cheer with crowns, ring hidden | ✓ VERIFIED | actors "stars…", "miss…", "win beat: every co-winner (0 stars) cheers…"; `SceneContents.tsx:39,43,62` |
| 07-04 | D-16 reduced motion = faces/blinks only | ✓ VERIFIED | actors reduced-motion describe |
| 07-04 | D-22 character completes only its own hop | ✓ VERIFIED | `Character.tsx:119-124`; actors "never completed by the character", "skipAll ends the hop first…" |
| 07-04 | D-20/BOARD-05 ≤ 100 draw calls with 8 + crowns + ring; slots from pawnSlots | ✓ VERIFIED | actors.test.tsx:574-589; `SceneContents.tsx:42` |
| 07-05 | D-23 dev-only gallery with grid/board/act, `__ready`, `&reduced=1` | ✓ VERIFIED | `gallery.html:10`, `CharacterGallery.tsx`; verifier captured board views from the running dev server |
| 07-05 | T-07-14 gallery never in production | ✓ VERIFIED | no `dist/gallery.html`, no gallery string in dist, `vite.config.ts` never mentions gallery, sourceGuard (g) green |
| 07-05 | C6 star lift on occupied quest tiles | ✓ VERIFIED | `Board.tsx:40-41`, `SceneContents.tsx:45,53`; board.test.tsx "star lift (07-05)" |
| 07-05 | D-03/D-04 headless self-check recorded with in-bound tuning | ✓ VERIFIED (process) | 07-05-SUMMARY table; it honestly records row 10 (arch) as **fail** |
| 07-05 | D-24 end-of-phase UAT list | ✓ VERIFIED | 07-05-SUMMARY "End-of-phase human UAT" (13 items) |

**Score:** 34/36 truths verified (1 failed: SC4; 1 partial: 07-03 prebuilt faces). 0 present-but-behavior-unverified: every behavior-dependent truth has a passing named test in the single full-suite run.

### Occlusion Evidence (SC4 / BOARD-05)

The verifier wrote its own measure in the session scratchpad
(`/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/verify/occ/occ.test.mjs`,
`.../verify/occ3/occ3.test.mjs`). It does not reuse the executor's script. It mounts the **real**
`SceneContents` with `@react-three/test-renderer`, puts all n characters on one tile, and builds the
camera with the real `fitCamera`. It then raycasts from the camera to every camera-facing vertex of
each character's real `chibi-face` mesh against all other meshes, and reports the hidden fraction
and what hides it.

Game start: everyone on the start tile, current = participant 1, worst over 6 viewports x 16/20/24 tiles.

| Players | Slot | Face hidden | Visible body hidden | Hidden by |
|---------|------|-------------|---------------------|-----------|
| 2 | 1 | 67 % | 33 % | gate star |
| 3 | 2 | 94-100 % | 60-67 % | gate arch + star |
| 4 | 3 | 100 % | 70 % | gate arch + star |
| 5 | 4 | 100 % | 63 % | gate arch + star |
| 6 | 5 | 100 % | 73 % | gate arch + star |
| 6 | 1 | 86-89 % | 48-67 % | gate arch |
| 7 | 6 | 100 % | 61 % | gate arch + star |
| 8 | 6 | 100 % | 60 % | gate arch + star |
| 8 | 1 | 83-85 % | 51-58 % | gate arch |

Regular tile 7, rotating which animal sits in which slot. Worst cases all come from the **rabbit's
ears** in a nearer slot: n8 slot4 73 %, n8 slot7 63 %, n8 slot3 62 %, n7 slot5 61 %, n5 slot3 58 %,
n7 slot3 57 %, n4 slot3 54 % (mostly at 588x290 phone landscape). On the start tile with the rabbit
in front, n8 slot4 is 64 % and n8 slot5 46 %.

Visual confirmation (headless SwiftShader, gallery board view):
- `.../scratchpad/cap/zoom-portrait-start-dogear.png` (07-05): the pig's face is entirely behind the arch and pillar, the bear's is partly behind the arch, and the arch crosses the current rabbit's body.
- `.../scratchpad/verify/cap/land-start.png` (verifier, 588x290): the arch slices through the back-right of the start crowd.
- `.../scratchpad/verify/cap/land-t7n8-zoom.png` (verifier, 588x290): on a regular tile all 8 animals can still be identified. The rabbit's ears and crown sit in front of the back row, and the lifted tile stars lie across the fox's eyes.

Metric caveat: the measure counts face-mesh vertices, not projected pixel area, so the
regular-tile ear numbers may overstate the area somewhat. The start-gate result does not depend on
the metric: 100 % of face samples are hidden, the captures agree, and the executor's independent
ellipsoid-sample raycast also gives 37-98 %. A character whose face is fully hidden at the start of
every 3-8 player game does not meet "하나하나 구분된다" by the phase's own 30 % contract (D-17,
UI-SPEC C6).

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/game/director/timeline.ts` | ✓ VERIFIED | miss/win beats, `isTimedBeat`, stars 900 |
| `src/game/director/useDirector.ts` | ✓ VERIFIED | `reason === 'manual'` branch, `animalOf` |
| `src/game/hud/Banner.tsx` | ✓ VERIFIED | `isTimedBeat` selector, win banner |
| `src/game/labels.ts` | ✓ VERIFIED | `공동 우승` |
| `src/game/GameStage.tsx` | ✓ VERIFIED | `skipAll` at gameOver |
| `src/game/layout/chibiDims.ts` | ✓ VERIFIED | `HEAD_TILT`, `FACE_KEYS`, `EXPRESSIONS` |
| `src/game/layout/pawnSlots.ts` | ⚠ WIRED but fails contract | exports present and wired (`SceneContents.tsx:42`); START table leaves faces behind the gate |
| `src/game/layout/slotOcclusion.test.ts` | ⚠ insufficient | head discs only (no ears, arch or star) |
| `src/game/layout/charMotion.ts` | ✓ VERIFIED | all listed exports |
| `src/game/palette.ts` | ✓ VERIFIED | `CHAR_COLOR` |
| `src/game/scene/chibiParts.ts`, `chibiSpecies.ts`, `ChibiModel.tsx` | ✓ VERIFIED | 8 species, 7 meshes, rig + `applyPose` |
| `src/game/scene/chibiFaces.ts` | ⚠ PARTIAL | lazy build-on-first-use (gap 2) |
| `src/game/director/reaction.ts` | ✓ VERIFIED | `reactionFor`, `blinkClosed`, `faceKeyFor`, `ACT_FACE` |
| `src/game/scene/Character.tsx` | ✓ VERIFIED | `completeBeat`, `reactionFor`, `applyPose`, `faceGeo` |
| `src/game/scene/SceneContents.tsx` | ✓ VERIFIED | Character per participant, win crowns, occupied |
| `src/game/scene/actors.test.tsx` | ✓ VERIFIED | `toBeLessThanOrEqual(100)` |
| `gallery.html`, `src/gallery.tsx`, `src/game/scene/CharacterGallery.tsx` | ✓ VERIFIED | dev-only, served at /monster-jump-rope-game/gallery.html (HTTP 200 on the running dev server) |
| `src/game/scene/Board.tsx` | ✓ VERIFIED | `occupied` star lift |
| `src/game/sourceGuard.test.ts` | ✓ VERIFIED | rule (g) |

### Key Link Verification

All 17 plan key links were found by pattern: `isTimedBeat(` in Banner, `reason === 'manual'` in useDirector, `skipAll()` in GameStage, `pawnSlots(order, positions, currentId)` in SceneContents, `HEAD_C_Y` in slotOcclusion.test, `ANIMAL_COLOR[` and `chibiDims` in chibiSpecies, `faceGeo(` in ChibiModel and Character, `reactionFor(` and `applyPose(` in Character, `'win'` in SceneContents, `occupied` from SceneContents to Board, `src="/src/gallery.tsx"` in gallery.html, and `ChibiModel` in CharacterGallery. All are WIRED.

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| SceneContents → Character | participants (id, animal) | `game.config.participants` (start-screen pick) via GameStage canvasProps | yes | ✓ FLOWING |
| Character | positions / current beat | `usePresentation.getState()` (director timeline built from the engine log) | yes | ✓ FLOWING |
| Board | occupied | `displayed.positions` | yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Type check | `npx tsc -b` | exit 0 | ✓ PASS |
| Full suite (run once) | `npx vitest run` | 49 files, 1070 tests passed | ✓ PASS |
| Production build | `npm run build` | exit 0 (pre-existing >500 kB chunk warning) | ✓ PASS |
| three out of main chunk | `grep -c WebGLRenderer dist/assets/index-*.js` | 0 (GameCanvas chunk: 6) | ✓ PASS |
| Gallery not shipped | `ls dist`, `grep -i gallery dist/assets/*`, `grep -i gallery vite.config.ts` | nothing found | ✓ PASS |
| No CDN hosts | URL scan of dist | only library doc/namespace strings (w3.org, react.dev, github.com, json-schema.org) and no runtime fetch hosts | ✓ PASS |
| Engine unchanged | `git diff --exit-code f7a01dc -- src/engine src/store.ts src/schema.ts src/lib/io.ts src/settings.ts` | clean | ✓ PASS |
| Same-tile occlusion with real meshes | verifier scratch raycast (see above) | start tile 67-100 % face hidden for n 2-8 | ✗ FAIL |

### Probe Execution

Step 7c: SKIPPED. The phase declares no probe scripts, and `scripts/*/tests/probe-*.sh` does not exist.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CHAR-01 | 07-03, 07-04, 07-05 | Code-built cute chibi animals, 6-8 kinds, no external model file | ✓ SATISFIED (cuteness → human) | 8 species from primitives; no loaders/assets used by game code |
| CHAR-02 | 07-01, 07-03, 07-04, 07-05 | Expressions idle / excited / joy ^^ / sad / surprised / winner | ✓ SATISFIED (phone readability → human) | reaction.ts + Character face swap + tests |
| CHAR-03 | 07-01, 07-02, 07-04, 07-05 | Idle, per-tile hop, success jump and spin, sad slump, winner cheer | ✓ SATISFIED (feel → human) | charMotion + Character + tests |
| BOARD-05 | 07-02, 07-04, 07-05 | Up to 8 pawns on one tile are all distinguishable | ✗ BLOCKED | Gap 1. REQUIREMENTS.md lines 35 and 147 mark it Complete. That is inaccurate until gap 1 closes |

No orphaned requirements: REQUIREMENTS.md maps exactly CHAR-01, CHAR-02, CHAR-03 and BOARD-05 to Phase 7, and every plan's `requirements` field covers them.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (41 phase-modified files) | — | TBD / FIXME / XXX / TODO / HACK / placeholder | — | none found |
| `src/game/scene/chibiFaces.ts` / `Character.tsx` | 285-296 / 199-202 | geometry build inside useFrame on first use (REVIEW WR-01) | ⚠ Warning | possible first-reaction hitch; an exception bypasses the error boundary (gap 2) |
| `src/game/scene/Board.tsx` | 40 | lifted stars at y 1.20 pass through the success jump and cheer (REVIEW WR-02) | ℹ Info | UI-SPEC C6 explicitly allows brief overlap. Separately, in landscape the lifted row lies across back-row faces (human item) |
| `src/game/GameStage.tsx` | 161-171, 210 | HUD still shows "{name} 차례" and the current cell during the win beat; scoreboard crowns differ from the 3D crowns when all winners have 0 stars (REVIEW WR-03) | ⚠ Warning | not a phase must-have; a small consistency fix worth folding into the gap plan |
| `src/game/layout/pawnSlots.ts` | 54-58 | comment records known-failed arch slots "left for the phase-end look check" | ⚠ Warning | the known failure behind gap 1 |

REVIEW info items IN-01..IN-06 do not affect any must-have.

### Human Verification Required (deferred by user; does not change the automatable verdict)

1. **Cuter than the sample.** Look at the gallery grid and the game on a phone. Expected: clearly cuter than the A안 "basic stacked primitives" sample.
2. **8 animals in 3 seconds.** A child tells all 8 apart by silhouette.
3. **Six expressions readable on a phone.** Watch sad vs idle and idle vs excited, which the 07-05 self-check flagged as close.
4. **Motions are fun and short.** Success 0.9 s, fail 0.7 s, win 1.5 s; 지금 끝내기 skips to the result.
5. **8 on one tile, all faces visible.** Known automated fail at the start gate (gap 1). Also check rabbit ears and lifted stars over back-row faces in landscape.
6. **No hitch on the first expression change** on a classroom tablet (gap 2).
7. **Phase 6 deferred device checks 6-13** (see 07-05-SUMMARY and 06-VERIFICATION).

### Gaps Summary

The characters themselves are delivered and wired: 8 code-built chibi species in the participants' colors, beat-driven expressions and motions, the miss and win beats, the draw budget, the dev-only gallery and the star lift. tsc, the 1070-test suite, the build and every bundle guard pass. The engine is untouched.

One must-have fails: **ROADMAP SC4 / BOARD-05** ("한 칸에 말이 최대 8개 모여도 모든 캐릭터가 서로 가리지 않고 하나하나 구분된다"). Every game begins with every player on the start tile. For every player count from 2 to 8, the start gate's arch, apex star or far pillar hides one back-slot face (two from 6 players up), up to 100 %. The phase's own contract caps this at 30 % (D-17, UI-SPEC C6). The contract's built-in fix (shift up to 0.10 toward +z) was tried and does not work, and the executor reported this honestly. The verifier reproduced it independently with the real meshes. The automated proof (D-19) passes only because it models heads as discs and ignores the gate's arch and star and every character's ears. The same blind spot hides a second, smaller problem: rabbit ears in a front slot cover more than half of the face behind them on regular tiles in phone landscape. No later phase takes this over, so it is not deferred.

Closing it needs a decision outside the 07-05 bounds: move the affected start slots in x, and/or shrink or move the gate. It also needs a mesh-aware occlusion test pinned in the suite. If the user decides the current look is acceptable, an override can be recorded instead:

```yaml
overrides:
  - must_have: "ROADMAP SC4 / BOARD-05 / D-17 / UI-SPEC C6: with up to 8 characters on one tile, every character stays visible and distinguishable, and nothing covers more than 30 % of a face"
    reason: "{why the start-gate cover is acceptable, e.g. 'body and head color still identify each animal; fixed later'}"
    accepted_by: "{name}"
    accepted_at: "{ISO timestamp}"
```

Gap 2 is a partial: face geometries are built lazily in the frame loop instead of prebuilt. It is a small, low-risk fix (prewarm FACE_KEYS during render). It can go into the same gap plan, together with REVIEW WR-03 (HUD current-turn and crowns during the win beat).

---

_Verified: 2026-10-23T06:12:18Z_
_Verifier: Claude (gsd-verifier)_
