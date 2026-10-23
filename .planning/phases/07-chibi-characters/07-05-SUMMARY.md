---
phase: 07-chibi-characters
plan: 05
subsystem: game-scene
tags: [chibi, gallery, dev-only, star-lift, headless-capture, self-check, uat]
status: complete

requires:
  - phase: 07-chibi-characters
    provides: "07-02 chibiDims / pawnSlots v2 / charMotion; 07-03 ChibiModel, createChibiRig, applyPose, faceGeo; 07-04 Character, SceneContents, reactionFor, blinkClosed, faceKeyFor, ACT_FACE"
  - phase: 06-3d-ring-board
    provides: "Board instanced stars (STAR_LIFT 0.55, STAR_SPACING 0.3), GameCanvas Canvas props, CameraRig / fitCamera, StartGate, sourceGuard rules (a)-(f)"
provides:
  - "gallery.html + src/gallery.tsx: dev-server-only entry (not a build input)"
  - "scene/CharacterGallery.tsx: grid (8 x 9 faces), board (real SceneContents at 374x594 / w x h), act (motion replay, &u freeze), &reduced=1, window.__ready"
  - "sourceGuard (g): only src/gallery.tsx imports CharacterGallery; main.tsx / App.tsx never mention the gallery"
  - "Board occupied prop: stars of an occupied quest tile rise to tile top + 1.20 at 0.75x size and spacing, eased (snap under reduced motion)"
  - "SceneContents passes the displayed positions to Board as occupied"
affects: [phase-07 verification and end-of-phase UAT, 08 success animation]

tech-stack:
  added: []
  patterns:
    - "Dev-only page = extra root HTML served by the Vite dev server; vite.config.ts keeps no input list, so vite build never sees it"
    - "Per-tile lift factor k in a Float32Array; instance matrices rewritten only on frames where some k moved"
    - "Headless self-check: Playwright + SwiftShader element captures of a fixed-size canvas box, plus a raycast measure of arch cover with the real fitCamera (scratch only)"

key-files:
  created:
    - gallery.html
    - src/gallery.tsx
    - src/game/scene/CharacterGallery.tsx
  modified:
    - src/game/sourceGuard.test.ts
    - src/game/scene/Board.tsx
    - src/game/scene/board.test.tsx
    - src/game/scene/SceneContents.tsx
    - src/game/scene/chibiSpecies.ts
    - src/game/layout/pawnSlots.ts

key-decisions:
  - "07-05: the act row in the gallery is 120 px wide per cell but 240 px tall, so the success jump and the cheer have head room (the grid view keeps 120 x 120 cells)"
  - "07-05: &reduced=1 answers the reduced-motion media query with 'reduce' at gallery module load, so Character and Board (which read it once on mount) both honor it with no app-code change"
  - "07-05: dog floppy ears r 0.09 -> 0.11 and x 0.27 -> 0.29 (within +-0.02): they now clear the head sides and read as ears at phone size"
  - "07-05: start table n 5 slot 1 pulled 0.10 toward +z (arch cover 51 % -> 27 %); the other arch-covered start slots get no better within the 0.10 +z bound and are left failed for the human UAT and a follow-up decision"
  - "07-05: HEAD_TILT stays 0.6 and the torso hull stays off: faces read in every capture and the white rabbit keeps its ink outline on the gold start block and the colored tiles"

requirements-completed: [CHAR-01, CHAR-02, CHAR-03, BOARD-05]

coverage:
  - id: D1
    description: "Dev-only gallery: grid 8 x 9 faces on a 55 deg orthographic camera, board view with the real SceneContents at 374x594 / 588x290, act view replaying 7 motions with &u freeze, &reduced=1, window.__ready (D-23)"
    requirement: CHAR-01
    verification:
      - kind: other
        ref: "headless captures grid.png, board-portrait.png, board-landscape.png, act-*.png (scratchpad, not committed)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Gallery never reaches production: no dist/gallery.html, no gallery title string in dist JS, vite.config.ts never mentions gallery, only src/gallery.tsx imports CharacterGallery (T-07-14)"
    verification:
      - kind: unit
        ref: "src/game/sourceGuard.test.ts#(g) keeps the dev gallery out of the app"
        status: pass
      - kind: other
        ref: "npm run build && test ! -e dist/gallery.html && ! grep -l '캐릭터 갤러리' dist/assets/*.js && ! grep -qi gallery vite.config.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Stars of an occupied quest tile rise to top + 1.20 at 0.75x / 0.225 spacing and ease back when it empties; start / event tiles ignored; instant under reduced motion; star count and draw budget unchanged (UI-SPEC C6, BOARD-05)"
    requirement: BOARD-05
    verification:
      - kind: integration
        ref: "src/game/scene/board.test.tsx#Board — star lift (07-05)"
        status: pass
    human_judgment: false
  - id: D4
    description: "D-03 rubric self-check from SwiftShader captures, with in-bound tuning (dog ears, n 5 start slot 1)"
    requirement: CHAR-02
    verification:
      - kind: other
        ref: "self-check table below; npx vitest run src/game/layout src/game/scene (273 tests) green after each change"
        status: pass
    human_judgment: true
    rationale: "Cuteness, 3-second recognition and phone readability need a person on a real device (D-24). The start-gate arch still hides one back-slot face for most player counts (see Known Issues)."

duration: 14min
completed: 2026-10-23
---

# Phase 7 Plan 05: Gallery, star lift and cuteness self-check Summary

**A dev-only character gallery (grid of 8 animals x 9 faces, the real board at phone size, and a motion replay) that never reaches the production build; floating stars that rise above characters standing on a quest tile; and a headless self-check of the D-03 rubric with two in-bound fixes. One finding fails at the locked bounds: the start-gate arch hides a back-slot face for most player counts.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-10-23T05:20:34Z
- **Completed:** 2026-10-23T05:34:07Z
- **Tasks:** 3
- **Files modified:** 9 (3 created, 6 modified)

## Accomplishments

- **Gallery entry.** `gallery.html` at the repo root is a copy of `index.html` with the dev title and `/src/gallery.tsx`. `src/gallery.tsx` renders `CharacterGallery` inside StrictMode with `./styles/index.css`. It imports no three and does not preload the lazy canvas. `vite.config.ts` is untouched.
- **`scene/CharacterGallery.tsx`.** It reads the query params once at module load and has three views:
  - **grid** (default): a CSS grid `96px repeat(8, 120px)` x `32px repeat(9, 120px)`. Column heads show emoji and name; row heads use the nine face labels. One 960x1080 orthographic Canvas sits over the cells, pitched 55° with zoom 120, so a row step of `1 / sin 55°` is one cell. Characters stand still in REST with no blinking. Faint cell lines come from a CSS background.
  - **board**: a `#board-box` of 374x594 (or `&w=&h=`). It holds a Canvas with the GameCanvas camera props and `SceneContents` on a 24-tile board with hard and normal quests and one event of each effect.
    - Default scene: 8 animals on the start tile with the rabbit current and holding 2 stars (crown). Gallery-only duplicates stand on quest tiles: x1 cat and x2 fox on tile 7, x3 chick on tile 12.
    - `&tile=T&n=N` puts N of the 8 animals on tile T instead.
    - `usePresentation` is seeded with `reset()` before mount.
  - **act**: one row of 8 `GalleryActor`s driving `ChibiModel` through `applyPose`, with face swaps through the ref.
    - success, bonus, surprise, slump and cheer use `BEAT_MS` lengths (900 / 800 / 1000 / 700 / 1500) with `actPose` and `ACT_FACE`.
    - hop is 3 in-place `hopPose` tiles of 250 ms.
    - idle: even columns bounce with the excited face, odd columns breathe with the idle face, and both blink.
    - Each loop plays the motion, then 600 ms of REST. `&u` freezes every actor. `&reduced=1` holds REST while faces still change.
  - Every view: `ReadySignal` sets `window.__ready` after 2 rendered frames. `&reduced=1` makes the reduced-motion media query answer "reduce".
- **Source guard (g).** No source other than `/src/gallery.tsx` imports a `CharacterGallery` basename. `gallery.tsx` does import it. `main.tsx` and `App.tsx` contain no `gallery` (case-insensitive). The "scans the real sources" test now also expects `Character.tsx` and `CharacterGallery.tsx`.
- **Star lift (`Board.tsx`).**
  - New optional `occupied` prop, defaulting to an empty module set.
  - New constants: `STAR_LIFT_UP = 1.2`, `STAR_SCALE_UP = 0.75`, `LIFT_RATE 12`.
  - The layout effect now records one star row per quest tile (tile, center, cross axis, count, first instance), and `writeStars()` writes every star from the per-tile lift factor.
  - `useFrame` eases k toward 1 or 0 (delta clamped to 0.25 s; snaps under reduced motion) and re-uploads the matrices only when some k moved.
  - There is no new mesh, the capacities are unchanged, and there are no shadow props.
- **`SceneContents.tsx`** passes `occupied = new Set(Object.values(positions))`.
- **`board.test.tsx`** gets 6 new cases:
  - lift height, size and spacing (other tiles unchanged)
  - eased return, strictly in between at 0.1 s
  - start and event tiles ignored
  - reduced-motion snap
  - star count and ≤ 30 board meshes with occupied tiles
  - SceneContents wiring
- **Suite:** 49 files and 1070 tests green. `tsc -b` and `npm run build` pass. There is no `dist/gallery.html` and no gallery string in dist. The main chunk has no `WebGLRenderer`, dist has no CDN host, and the engine, store, schema, io and settings files are unchanged.

## Task Commits

1. **Task 1: dev-only gallery + isolation guard** - `06bbd1a` (feat)
2. **Task 2: star lift on occupied quest tiles** - `25e7587` (feat)
3. **Task 3: in-bound look tuning from the self-check** - `439bf75` (fix)

## Cuteness self-check (D-03, D-04, UI-SPEC "귀여움 자체 점검표")

All captures are headless SwiftShader renders in the session scratchpad (not committed). Directory: `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap/`

| # | Rubric item | Result | Evidence (capture) | Notes |
|---|-------------|--------|--------------------|-------|
| 1 | Head bigger than the body (≥ 1.3, design 1.53; 58 % of height) | pass | grid.png; chibiDims.test | Big round heads on short bodies in every column |
| 2 | Big low eyes with highlights | pass | grid.png | Eyes sit below the head center with white highlights on idle, excited and surprised |
| 3 | Cheeks on every face, small mouth | pass | grid.png | Pink cheeks on all 72 cells; small ∪ idle mouth |
| 4 | Round shapes, short limbs | pass | grid.png, act-cheer-u03.png | No boxes; stubby arms show only when raised |
| 5 | Glossy toy material | pass | grid.png, act-surprise-u03.png | Specular highlight on every head; flat canvas colors match the palette |
| 6 | Phone scale: idle ↔ joy ↔ sad and the 8 ear silhouettes | pass (with caveats) | phone-scale-faces.png, zoom-portrait-start.png, zoom-tile7-n8.png, dog-before.png → dog-after.png | joy (^^ + red mouth) clearly differs from idle. sad reads mainly by its sweat drop and brows, which are subtle at about 21 px heads. idle vs excited is close. The dog ears were the weak silhouette and were fixed in bounds (see Tuning) |
| 7 | Line thickness (≥ 0.012) | pass | grid.png, phone-scale-faces.png; chibi.test | Blink lines and mouths survive downscaling |
| 8 | Budget (8 + 8 crowns + ring ≤ 100; ≤ 7 per character) | pass | actors.test | Unchanged by this plan; the board test keeps ≤ 30 board meshes with lifted stars |
| 9 | Eye vs muzzle ≤ 25 % covered | pass | grid.png | Bear, dog and fox eyes sit fully above their muzzles |
| 10 | Start arch covers no back-slot face > 30 % | **fail** | zoom-portrait-start.png, zoom-landscape-start.png, zoom-portrait-start-dogear.png + raycast measure | n 8 at 374x594: slot 6 (pig) 92 %, slot 1 (bear) 62 % covered. n 5 slot 1 was fixed (51 → 27 %). The rest cannot be fixed within the 0.10 +z bound — see Known Issues |
| 11 | Stars above heads on occupied quest tiles | pass | zoom-portrait-tile7.png, zoom-portrait-tile12.png, zoom-tile7-n8.png | Tile 7 (hard) shows 3 small stars over the cat and fox; tile 12 shows 2 over the chick; count stays readable |
| 12 | Clearly cuter than the "basic stacked primitives" baseline (D-04) | pass (self-judgment) | grid.png, act-success-u015.png, act-cheer-u03.png | Distinct species, expressive faces and pose acts against a capsule + sphere pawn; final call is UAT item 1 |
| 13 | White rabbit visible on light surfaces (torso hull decision) | pass | board-portrait.png, zoom-tile7-n8.png | The ink outline and participant disc keep it visible; torso hull stays off |
| 14 | Motion frames end cleanly, faces match acts | pass | act-success-u015.png (joy jump), act-success-u045.png (mid-spin, from behind), act-slump-u05.png (head down, sad), act-cheer-u03.png (arms up, winner sparkles), act-surprise-u03.png, act-hop-u05.png | Feel and length are UAT item 4 |

### Tuned constants (old → new, all inside the locked bounds)

| Constant | Old | New | Bound | Why |
|----------|-----|-----|-------|-----|
| `chibiSpecies.ts` `DOG_EAR.r` | 0.09 | 0.11 | part ±0.02 | Floppy ears hid against the head sides |
| `chibiSpecies.ts` `DOG_EAR.x` | 0.27 | 0.29 | part ±0.02 | Ear center was inside the 0.292 head half-width |
| `pawnSlots.ts` START n 5 slot 1 | (0.02, 0.15) | (0.02, 0.25) | ≤ 0.10 toward +z | Arch cover 51 % → 27 %; slot occlusion, spacing and pillar tests stay green |
| `HEAD_TILT` | 0.6 | 0.6 (unchanged) | 0.5–0.75 | Faces read in every capture |
| `HULL_TORSO` | null | null (unchanged) | ≤ 1.03 | Rabbit stays visible without it |

After each change, `npx vitest run src/game/layout src/game/scene` passed (273 tests), and the affected views were captured again.

### Captures produced

Directory: `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/8790a882-ef62-4030-8d1a-b93015f3835e/scratchpad/cap/` (not committed)

- `grid.png` — grid before the dog-ear change. `grid-dogear.png` — after.
- `board-portrait.png` — 374x594 @1.5, default scene. `board-portrait-dogear.png` — the same after the dog-ear change.
- `board-landscape.png` — 588x290 @1.5.
- `board-tile7-n8.png` — 8 animals on regular tile 7.
- `board-reduced.png` — `&reduced=1`.
- `act-success-u045.png`, `act-success-u015.png`, `act-cheer-u03.png`, `act-slump-u05.png`, `act-surprise-u03.png`, `act-hop-u05.png`.
- 4x crops:
  - start tile: `zoom-portrait-start.png`, `zoom-portrait-start-dogear.png`, `zoom-landscape-start.png`
  - quest tiles: `zoom-portrait-tile7.png`, `zoom-portrait-tile12.png`, `zoom-tile7-n8.png`
- `phone-scale-faces.png` — grid rows idle / excited / joy / sad shrunk to about 21 px heads, then enlarged 4x.
- `dog-before.png` / `dog-after.png` — the cat, dog and panda columns before and after the ear change.
- Scripts in the scratchpad: `capture.mjs` and `arch/arch.test.mjs`, the raycast measure of arch cover with the real `fitCamera`.

### What still looks weak (plainly)

- **Start-gate arch over back slots (fails).** At game start everyone stands on the start tile. With 2–8 players, the arch tube or the far pillar hides one back-slot face, and from 6 players up it hides two. Worst case over 6 viewports × 16/20/24 tiles:

  | Players | Slot | Face covered |
  |---------|------|--------------|
  | 2 | 1 | 37 % |
  | 3 | 2 | 68 % |
  | 4 | 3 | 75 % |
  | 5 | 4 | 94 % |
  | 6 | 1 | 83 % |
  | 6 | 5 | 90 % |
  | 7 | 6 | 98 % |
  | 8 | 1 | 75 % |
  | 8 | 6 | 98 % |

  Moving these slots toward +z by up to 0.10 gives no improvement and is often worse, because the face slides along the arch's projected band. Several of the shifts also break the 0.03 pillar clearance. Fixing it needs something outside the locked bounds: x moves of those slots, or a smaller or further-outward gate. That is a decision for the user.
- **sad vs idle at phone size.** The difference is mostly the light-blue sweat drop and the brows. Real phones will be sharper than this downscale proxy, but this is worth a look in UAT item 3.
- **idle vs excited** are close at phone size. This is acceptable, because the turn ring, the front slot and the bounce also mark the current turn.
- **The success capture at u = 0.45** is mid-spin, seen from behind. The joy face shows in the u = 0.15 frame.

## Files Created/Modified

- `gallery.html` - dev-only HTML entry (root)
- `src/gallery.tsx` - gallery React root
- `src/game/scene/CharacterGallery.tsx` - grid / board / act views, ready signal, reduced override
- `src/game/sourceGuard.test.ts` - rule (g), new expected sources
- `src/game/scene/Board.tsx` - occupied star lift
- `src/game/scene/board.test.tsx` - star-lift block, reduced-motion mock
- `src/game/scene/SceneContents.tsx` - passes occupied to Board
- `src/game/scene/chibiSpecies.ts` - dog ear size and position
- `src/game/layout/pawnSlots.ts` - start n 5 slot 1, comment

## Decisions Made

- The act row is 240 px tall. With a 120 px row, the success jump (0.55) and the cheer would clip at the canvas top.
- `&reduced=1` stubs `matchMedia` at gallery module load, before any Character or Board reads it. App code is untouched, and the gallery module only ever loads on the gallery page.
- The board view uses its own fixed `#board-box`, so captures clip to exactly the 374x594 phone canvas regardless of the viewport and the top bar.
- Requirements CHAR-01, CHAR-02, CHAR-03 and BOARD-05 are marked complete. Every automated part is delivered. The look check (D-24) stays an end-of-phase human UAT item below, as the user asked, and does not block mid-phase.

## Deviations from Plan

### Auto-fixed Issues

None in product code. The capture script's first run used `split('=', 2)`, which dropped the query, so every capture rendered the grid. I fixed it in the scratchpad and captured again. This is a tooling detail; nothing in the repo changed.

### Execution notes

- Task 3 step 1: `npx vite --port 5173 --strictPort` exited with "Port 5173 is already in use". A Vite dev server for this repo had been running since 03:47 (`vite --host 127.0.0.1 --port 5173`), before this session, and every capture was served by it. It serves this working tree with HMR, and the dog-ear change appeared in the next capture, so the captures show the current code. I did not stop that server, because this plan did not start it.
- Pillow is not installed, so the 4x crops use macOS `sips`. Python was not needed.
- I added the arch-cover raycast measure in the scratchpad because judging "> 30 %" by eye on a 20 px face was unreliable. It uses the real `fitCamera`, `slotTable`, `ringLayout`, the StartGate dimensions and the tilted head ellipsoid. It agrees with the captures: the pig is almost fully hidden in portrait.

## TDD Gate Compliance

Task 2 (`tdd="true"`) ran RED first. Four of the six new cases failed before the implementation. The two that passed early ("ignores start/event tiles" and "count and budget") describe behavior that must not change. The tests and the code are in one commit (`25e7587`), because the project forbids red intermediate commits (`tsc -b` type-checks tests), as in 07-01..07-04.

## Issues Encountered

- `npm run build` still prints the existing chunk-size warning (> 500 kB). It predates this plan.
- `THREE.Clock` deprecation lines in the test stderr come from R3F internals. They predate this plan.

## Known Issues (for the phase verifier / UAT)

- **Start-gate arch hides back-slot faces at game start** (UI-SPEC C6 "출발 아치 가림", rubric row 10, fail at bounds). See the table under "What still looks weak". Options outside this plan's bounds: move the affected start slots in x (off the line from the far pillar to the arch apex), shrink the arch, or move the gate further outward. The user should pick one. A follow-up plan should add an arch-cover projection test like the scratch measure, so the fix is pinned.

## Known Stubs

None.

## Threat Flags

None. The gallery is a dev-only page with fixed strings (T-07-14 mitigated by the build check and guard (g)). The capture scripts and PNGs stay in the scratchpad (T-07-15: `git status` shows no PNG or capture script). No package was installed (T-07-16).

## End-of-phase human UAT (D-24 + deferred Phase 6 device checks)

**How:** run `npm run build && npx vite preview --host` (or open the GitHub Pages deploy) on an iPhone (Safari, portrait), an iPad (landscape) and a laptop (Chrome). Start a game with 8 players (all animals) and roll several times. Judge ✅ and ❌, land on each event type, and play a short game to the last round so it ends by rounds. Also try 지금 끝내기 once. For a close look at the characters, run `npm run dev -- --host` and open `/monster-jump-rope-game/gallery.html` (grid, board and act views; act links: 대기 · 칸 이동 · 성공 · 보너스 · 놀람 · 아쉬움 · 우승).

Phase 7 (D-24):
1. The chibi animals are clearly cuter than the "basic stacked primitives" sample (A안).
2. A child can tell all 8 animals apart within about 3 seconds (bear, rabbit, cat, dog, panda, fox, pig, chick — by ears, muzzle, tail, beak).
3. On a phone the six expressions are readable: idle, excited on your turn, joy ^^ on success, sad on ❌, surprised on an event, winner with sparkles at the end.
4. The success jump-and-spin, the sad slump after ❌ and the winner cheer feel fun and never too long (success ≈ 0.9 s, fail ≈ 0.7 s, win 1.5 s once per game; 지금 끝내기 goes straight to the result).
5. With all 8 characters on the start tile (game start) and with several on one quest tile, every character's face is visible and nobody hides another. **Known self-check failure: the start-gate arch hides one back-slot face (two from 6 players up) — confirm how bad it looks on a real phone and choose a fix.**

Phase 6 deferred device checks (06-VERIFICATION):
6. iPhone Safari portrait: the whole board fits between the turn bar and the 🎲 button/scoreboard, nothing cut off, no scroll.
7. A child reads within about 3 s the gold start arch, clockwise chevrons and corner arrows, quest colors with 1/2/3 stars vs purple hex event pads, who is 1st (crown/👑) and whose turn it is.
8. The board as a whole reads as a cute glossy 3D toy board game.
9. 🎲 → the die lands on the chip number → path dots and ring → tile-by-tile hops → only then buttons or the quest card; 🔔 마지막 라운드! at the last round.
10. Quest tile colors match the difficulty colors, and each character's color matches its scoreboard avatar.
11. iPhone/iPad: after about 30 s in another app or locked, 🔄 화면 다시 그리기 restores the board with the same stars, positions and turn.
12. Load once, turn on airplane mode, start a game: all text and the 3D board render.
13. iPad landscape and laptop: scoreboard and buttons in the right panel and the board fits.

## Next Phase Readiness

- The phase verifier can rely on the automated gate (1070 tests, build, dist checks). The look items above go to the end-of-phase UAT.
- Phase 8 (success animation) can reuse the gallery act view for new effects. `Board` takes `occupied` from `SceneContents`, so effects that change displayed positions lift and drop the stars automatically.
- Open decision: the start-gate arch fix (outside the 07-05 bounds).

## Self-Check: PASSED

- FOUND: gallery.html, src/gallery.tsx, src/game/scene/CharacterGallery.tsx, src/game/scene/Board.tsx, src/game/sourceGuard.test.ts, 07-05-SUMMARY.md
- FOUND commits: 06bbd1a, 25e7587, 439bf75
