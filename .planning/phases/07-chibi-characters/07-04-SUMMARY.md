---
phase: 07-chibi-characters
plan: 04
subsystem: game-scene
tags: [chibi, character, beat-consumer, reactions, blink, reduced-motion, r3f, draw-budget]
status: complete

requires:
  - phase: 07-chibi-characters
    provides: "07-01 miss / win beats and Banner-timed completion; 07-02 pawnSlots v2, charMotion curves, chibiDims face keys; 07-03 ChibiModel, createChibiRig, applyPose, faceGeo"
  - phase: 06-3d-ring-board
    provides: "Phase 6 Pawn hop consumer (startedId / doneId, completeBeat once, rest easing, watchdog fall-through), actors.test helpers, draw-budget test"
provides:
  - "director/reaction.ts: reactionFor(pid, beat, isCurrent), blinkClosed(t, seed), BLINK_S, faceKeyFor(expression, blink), ACT_FACE"
  - "scene/Character.tsx: chibi character = Phase 6 hop consumer + travel yaw + reactions + blinks + reduced motion"
  - "SceneContents: Character per participant (seed = index); win beat crowns the winners and hides the turn ring"
  - "actorGeometries trimmed to turnRing / crown / pathDot / destRing / destCone / diceBody / dicePip"
affects: [07-05 gallery and UAT tuning, 08 success animation]

tech-stack:
  added: []
  patterns:
    - "Pose source key (beat id / bounce / breathe): a source change restarts the act clock and starts an additive blend-out of the last pose (offset from REST × exp(−12·t))"
    - "Face swap by ref on key change only; ChibiModel face prop stays constant so R3F never re-applies the geometry"
    - "Tests compare face geometries by key name (a failing BufferGeometry diff stalls vitest's pretty-printer)"

key-files:
  created:
    - src/game/director/reaction.ts
    - src/game/director/reaction.test.ts
    - src/game/scene/Character.tsx
  modified:
    - src/game/scene/SceneContents.tsx
    - src/game/scene/actors.test.tsx
    - src/game/scene/actorGeometries.ts
    - src/game/palette.ts
    - src/game/palette.test.ts
  deleted:
    - src/game/scene/Pawn.tsx

key-decisions:
  - "07-04: the pose blend-out is additive (new curve + (old pose − REST)·exp(−12·t)) instead of lerping toward the old pose, so a new curve (the first hop tile, the success jump) plays at full height"
  - "07-04: the success spin takes its yaw from the curve (plus the faded start yaw); hop yaw eases toward atan2 of the segment at rate 20; every other act eases back to 0 at rate 8; yaw is wrapped to [−π, π] outside the spin"
  - "07-04: the ring breathes only while the current character is in its rest bounce (not during beats), as in Phase 6"
  - "07-04: CHAR-01 / CHAR-02 / CHAR-03 / BOARD-05 stay Pending — 07-05 (gallery + UAT, same IDs) closes them after the human look check"

patterns-established:
  - "Character never completes timed beats: one completeBeat call site (hop), verified by grep and by a spy across 1.2 s of frames"

requirements-completed: []  # CHAR-01..03, BOARD-05 are delivered in-game here; 07-05 closes them after the gallery/UAT
requirements-contributed: [CHAR-01, CHAR-02, CHAR-03, BOARD-05]

coverage:
  - id: D1
    description: "Every participant is its chibi animal on the board (Phase 6 pawn deleted); scoreboard / start-screen icons unchanged (D-05)"
    requirement: CHAR-01
    verification:
      - kind: integration
        ref: "src/game/scene/actors.test.tsx#renders the board, one character per participant, the die and one turn ring"
        status: pass
      - kind: other
        ref: "git diff --exit-code HEAD -- src/game/hud/Scoreboard.tsx AnimalPicker.tsx SetupView.tsx TurnHud.tsx"
        status: pass
    human_judgment: false
  - id: D2
    description: "Faces follow the beats (excited / idle / joy / sad / surprised / winner) and return to the situation face; blinks every 3.0–4.4 s for 120 ms per seed (D-07, D-08)"
    requirement: CHAR-02
    verification:
      - kind: unit
        ref: "src/game/director/reaction.test.ts"
        status: pass
      - kind: integration
        ref: "src/game/scene/actors.test.tsx#stars: joy face from the first frame, crouch-jump-spin, never completed by the character (D-12, D-22)"
        status: pass
      - kind: integration
        ref: "src/game/scene/actors.test.tsx#miss: sad face, head down; events and the start bonus pick their faces (D-13, D-07)"
        status: pass
      - kind: integration
        ref: "src/game/scene/actors.test.tsx#blinks: a short idleBlink now and then, idle most of the time"
        status: pass
    human_judgment: false
  - id: D3
    description: "Motions: current bounces ≤ 0.08 with a breathing ring, others breathe ≤ 2 % out of phase; hop faces the travel direction and turns back; success jump 0.55 + 360° spin; miss slump; win cheer with raised arms for every winner (D-10..D-14)"
    requirement: CHAR-03
    verification:
      - kind: integration
        ref: "src/game/scene/actors.test.tsx#Character — hop beat consumer and reactions"
        status: pass
      - kind: integration
        ref: "src/game/scene/actors.test.tsx#win beat: every co-winner (0 stars) cheers with the winner face and a crown; no turn ring (D-14)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Reduced motion: no body motion, bounce, breathing or ring breath; faces and blinks still change (D-16)"
    requirement: CHAR-03
    verification:
      - kind: integration
        ref: "src/game/scene/actors.test.tsx#Character — reduced motion (D-16): faces and blinks only"
        status: pass
    human_judgment: false
  - id: D5
    description: "7 meshes per character; 8 characters + 8 crowns + ring on a 24-tile board ≤ 100 draw calls, also during an 8-winner win beat (D-20, BOARD-05)"
    requirement: BOARD-05
    verification:
      - kind: integration
        ref: "src/game/scene/actors.test.tsx#stays within 100 draw calls with 8 characters (all leaders) on a 24-tile board"
        status: pass
      - kind: integration
        ref: "src/game/scene/actors.test.tsx#stays within 100 draw calls during a win beat of all 8 (8 crowns, no ring)"
        status: pass
    human_judgment: false
  - id: D6
    description: "The characters look cute and readable in the real game; the start-gate arch vs front-slot overlap"
    verification: []
    human_judgment: true
    rationale: "07-05 gallery + UAT. A scratch headless render of the built game (844×600, SwiftShader) showed the bear with its ring and the rabbit on the start tile, the bear facing its travel direction mid-hop, and the game moving on to the quest card. The start-gate arch tube crosses the front-slot bear (UI-SPEC C6 Open Q2, a 07-05 item)."

duration: 12min
completed: 2026-10-23
---

# Phase 7 Plan 04: Chibi Character in the game Summary

**The Phase 6 capsule pawn is gone. Each participant is now a 7-mesh chibi animal that keeps the Phase 6 hop consumer (one `completeBeat`) and adds travel-direction yaw, per-beat faces and acts from a pure `reactionFor`, deterministic blinks, a smooth blend-out when a beat ends early, and a reduced-motion mode where only faces change. 8 characters with 8 crowns stay ≤ 100 draw calls.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-10-23T05:04:30Z
- **Completed:** 2026-10-23T05:16:30Z
- **Tasks:** 3
- **Files modified:** 10 (3 created, 6 modified, 1 deleted)

## Accomplishments

- `director/reaction.ts` (pure, three-free, clock-free):
  - `reactionFor` follows the UI-SPEC C4 table. The win branch runs before the pid check. A non-winner during win stays idle (cheering for others is deferred). `finalRound` and other-pid beats give the situation reaction. Own dice and preview beats give excited with act rest and beat id null.
  - `blinkClosed` uses a period of 3.0 + (seed mod 5)·0.35 s, a phase of seed·0.731 and `BLINK_S` 0.12.
  - `faceKeyFor` maps blinks to idle, excited and sad only. `ACT_FACE` maps each act to its face.
- `scene/Character.tsx` renders `pawn-{pid}` holding `ChibiModel` with one `createChibiRig()`. In `useFrame` (`d = Math.min(delta, 0.25)`, `getState()`):
  - Hop: the Phase 6 consumer is carried over unchanged (startedId / doneId, completes once, rest easing, watchdog fall-through). The body follows `hopPose(s)`, and the yaw eases toward `atan2(dx, dz)` of the segment at `YAW_RATE_HOP`.
  - Reaction: a change of pose source (beat id / bounce / breathe) restarts the act clock. It also blends the last pose out additively at `SETTLE_RATE`.
  - Acts and rest: beat acts use `actPose(act, u)`. At rest the current character uses `bouncePose` and the others use `breathePose(clock, seed)`.
  - Yaw: success takes its yaw from the curve; every other act eases back to 0 at `YAW_RATE_REST`.
  - Ring: it breathes during the rest bounce.
  - Face: the geometry is swapped through the ref, and only when the key changes.
  - Reduced motion: REST and yaw 0, while faces and blinks keep changing.
  - No store writes and no new geometries or materials.
- `SceneContents.tsx` has a win-beat selector. During the win beat `crowned = winners`, so co-winners get crowns even with 0 stars. `isCurrent` is false for everyone, so the ring is hidden and nobody bounces. Slots keep `currentId`. `seed` is the participant index.
- `Pawn.tsx` was deleted with `git rm`.
- `actors.test.tsx`:
  - Every Phase 6 pawn test is ported to Character, and the mesh test is tightened from ≤ 7 to exactly 7.
  - New cases cover breathing (bounds and phase), hop yaw and the turn back, the stars spin and jump with no self-completion, the miss head-down, faces for event and start bonus, joy surviving a re-render with `isCurrent` toggled, blinks, and two reduced-motion cases.
  - The win beat is tested in SceneContents (faces, crowns, no ring, arm raise), plus a second ≤ 100 draw-call test for an 8-winner win beat.
- `actorGeometries.ts` keeps only `turnRing`, `crown`, `pathDot`, `destRing`, `destCone`, `diceBody` and `dicePip` with their materials. The header is rewritten.
- `palette.ts`: `SCENE_COLOR.pawnBase` and `SCENE_COLOR.cheek` were removed, and the `ANIMAL_EYE` comment now describes the line-eye color and the white sclera signal.
- Suite: 49 files, 1063 tests green. `tsc -b` and `npm run build` pass, and the main chunk has no `WebGLRenderer`. The engine, store, schema, io, settings and HUD icon files are unchanged.

## Task Commits

1. **Task 1: pure reactionFor + blinkClosed + faceKeyFor** - `ee7c3b9` (feat)
2. **Task 2: Character + SceneContents win crowns/ring + Pawn deleted + actors.test port** - `08f7ef9` (feat)
3. **Task 3: drop Phase 6 pawn parts and pawn-only colors + full gate** - `49a4d51` (refactor)

## Files Created/Modified

- `src/game/director/reaction.ts` - beat → face/act mapping, blink timing, face keys
- `src/game/director/reaction.test.ts` - 11 tests for the C4 table, blink timing and face keys
- `src/game/scene/Character.tsx` - chibi character, hop consumer, reactions
- `src/game/scene/SceneContents.tsx` - Character per participant, win-beat crowns / ring
- `src/game/scene/actors.test.tsx` - Character, reduced-motion and win-beat budget tests
- `src/game/scene/actorGeometries.ts` - only ring / crown / preview / die parts remain
- `src/game/palette.ts` - pawn-only scene colors removed, ANIMAL_EYE comment
- `src/game/palette.test.ts` - SCENE_COLOR count floor 22 → 20
- `src/game/scene/Pawn.tsx` - deleted

## Decisions Made

- **Additive blend-out.** The plan says to "blend the last pose out with weight exp(−SETTLE_RATE·t)". A plain lerp toward the old pose would also scale the new curve down: the first hop tile would peak near 0.39 instead of 0.5. So the old pose's offset from REST is added on top and decays. The new curve plays at full size, and a beat that ends early still settles without snapping.
- **Pose source key.** The source is the beat id, `bounce` or `breathe`. When `isCurrent` flips at rest, the bounce restarts at its landing and the switch is blended too. A stars beat is not restarted by an `isCurrent` re-render.
- **Ring breath.** As in Phase 6, the ring breathes only in the rest bounce. It holds scale 1 during beats and under reduced motion.
- **Requirements stay Pending.** CHAR-01..03 and BOARD-05 stay Pending, following 07-01..07-03. 07-05 lists the same IDs and closes them after the gallery and UAT look check.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The palette count test still counted the removed colors**
- **Found during:** Task 3
- **Issue:** `palette.test.ts` asserted `Object.values(SCENE_COLOR).length >= 22`, which counted the two removed pawn colors, so the test failed.
- **Fix:** The floor is now 20, with a comment saying why.
- **Files modified:** src/game/palette.test.ts
- **Commit:** 49a4d51

**2. [Rule 3 - Blocking] A failing face assertion stalled vitest**
- **Found during:** Task 2 (mutation probe)
- **Issue:** `expect(mesh.geometry).toBe(faceGeo(...))` makes vitest pretty-print a diff of two large BufferGeometries when it fails. That stalled the run for minutes.
- **Fix:** The `faceOf()` helper now returns the face key name (it looks the geometry up in `FACE_KEYS`), and the assertions compare names.
- **Files modified:** src/game/scene/actors.test.tsx
- **Commit:** 08f7ef9

### Acceptance-criterion note

- `grep -cE "pawnBase|cheek:" src/game/palette.ts` returns 1, not 0. The match is `CHAR_COLOR.cheek` (`#FF9EC4`), which 07-03 shipped as a live chibi part color for cheeks and inner ears. The criterion was written before 07-03 named that key. Both Phase 6 pawn-only entries (`SCENE_COLOR.pawnBase`, `SCENE_COLOR.cheek`) are gone, and nothing in `src` references them.
- In the stars test, the plan's "body returns to y ≈ 0 after skipAll" is checked as y ≤ 0.08. The character is current, so after the beat it goes back to its idle bounce, which peaks at 0.08.

### Process

- Task 1 ran RED first: the test failed on the missing module, then passed. In Task 2 the Character was written before its tests, so the new cases passed on their first run. To show the tests do catch bugs, I ran mutation probes. Each of these changes made the named tests fail:
  - reduced motion forced off
  - `isCurrent` not cleared during win
  - no hop yaw
  - no blinks
  - no face swap (6 tests)
  - crowns from leaders only during win
- As in 07-01..07-03, each task is one commit holding both tests and code, because `tsc -b` type-checks tests and red commits are not allowed.

## TDD Gate Compliance

There are no separate `test(...)` RED commits, because the project rules forbid red intermediate commits (see Process). Task 1 was verified RED locally.

## Issues Encountered

- `npm run build` still prints the existing >500 kB chunk warning. It predates this plan.
- Look check: a headless SwiftShader capture of the built game showed the start-gate arch tube crossing the front-slot character on the start tile (UI-SPEC C6 Open Q2). This is listed for the 07-05 gallery. A 404 console line in the capture comes from a resource the page response listener did not see (likely the favicon). It is unrelated to this plan.

## Known Stubs

None.

## Next Phase Readiness

- 07-05 (gallery and UAT) can mount `ChibiModel` or `Character` directly. For tuning:
  - per-species constants: `chibiSpecies.ts` and `chibiFaces.ts`
  - motion feel: `charMotion.ts` constants
  - blink timing: `reaction.ts` `BLINK_S`
- Open look items for 07-05: the start-gate arch over the front slot, plus the dog-ear, eye-vs-muzzle and sweat-drop items carried from 07-03.

## Self-Check: PASSED

- FOUND: src/game/director/reaction.ts, src/game/director/reaction.test.ts, src/game/scene/Character.tsx, src/game/scene/SceneContents.tsx, src/game/scene/actors.test.tsx, src/game/scene/actorGeometries.ts, src/game/palette.ts, src/game/palette.test.ts
- DELETED as planned: src/game/scene/Pawn.tsx
- FOUND commits: ee7c3b9, 08f7ef9, 49a4d51
