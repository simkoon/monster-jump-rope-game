---
phase: 07-chibi-characters
reviewed: 2026-10-23T07:47:38Z
depth: standard
files_reviewed: 26
files_reviewed_list:
  - src/game/GameStage.tsx
  - src/game/hud/Banner.tsx
  - src/game/hud/Scoreboard.tsx
  - src/game/hud/TurnHud.tsx
  - src/game/hud/hud6.test.tsx
  - src/game/labels.test.ts
  - src/game/labels.ts
  - src/game/layout/charMotion.test.ts
  - src/game/layout/charMotion.ts
  - src/game/layout/pawnSlots.test.ts
  - src/game/layout/pawnSlots.ts
  - src/game/layout/slotOcclusion.test.ts
  - src/game/scene/Board.tsx
  - src/game/scene/Character.tsx
  - src/game/scene/CharacterGallery.tsx
  - src/game/scene/ChibiModel.tsx
  - src/game/scene/SceneContents.tsx
  - src/game/scene/board.test.tsx
  - src/game/scene/chibi.test.tsx
  - src/game/scene/chibiFaces.ts
  - src/game/scene/chibiSpecies.ts
  - src/game/scene/faceOcclusion.test.tsx
  - src/game/scene/facePrewarm.test.tsx
  - src/game/scene/starClearance.test.tsx
  - src/game/stage.test.tsx
  - src/game/styles/game.css
findings:
  critical: 1
  warning: 1
  info: 5
  total: 7
status: issues_found
---

# Phase 7: Code Review Report (re-review after gap plans 07-06..07-08)

**Reviewed:** 2026-10-23T07:47:38Z
**Depth:** standard
**Files Reviewed:** 26
**Status:** issues_found

## Summary

This review covers the gap-closure diff `6e07e5e..HEAD`:
- face prewarm through `faceSet`
- star lift raised to 1.35, plus the act and crowd hide in `Board`
- game-over HUD: the `over` pill, Scoreboard `crownIds` and `currentId: null`
- win-banner emoji items and `is-many`
- new theater / start / lone-start slot tables
- shorter rabbit ears
- the mounted-scene `faceOcclusion`, `facePrewarm` and `starClearance` tests

`tsc -p tsconfig.app.json --noEmit` is clean. The full Vitest suite passes (52 files, 1092 tests).

All three earlier warnings are fixed as written (see "Previous findings"). However, the new regular-tile theater table (07-08) adds a regression that none of the tests can see. Every occlusion test mounts **one** crowded tile at a time. The new flank and back-row offsets (|dx| up to 0.68, |dz| up to 0.65) reach past the 1.0 quest tile (half-width 0.5) and over the 0.14 gap onto the neighboring tile, whose edge is 0.64 from center. Characters on two adjacent tiles now merge into one spot in common splits such as 3 + 2, and with 4 or more on a tile a character stands closer to the neighbor's center than to its own. That breaks both BOARD-05 (faces ≤ 30 % hidden) and the "board must show which tile each character is on" requirement. This is one blocker.

There is also one warning. The star fix only covers characters standing still: a moving chibi still passes through the resting star rows (head height) of every quest tile it hops across, and lands inside the destination row before the row lifts.

## Previous findings (round 1, 2026-10-23T05:44:42Z)

| ID | Title | Status |
|----|-------|--------|
| WR-01 | Face geometries built lazily inside `useFrame` | **Resolved.** `faceSet(animal)` builds all 9 keys in render (`ChibiModel.tsx:77`, `Character.tsx:73`, `CharacterGallery.tsx:290`). The frame loops only swap `faces[key]`, and `faceGeo` has no other production caller. `facePrewarm.test.tsx` shows 27 bakes at mount and 0 across blinks plus stars/miss/event/win beats, and that a failing bake is a render error (see IN-07 for the remaining test gap). |
| WR-02 | Lifted stars inside the success jump and cheer | **Resolved for standing characters.** `STAR_LIFT_UP` is 1.35, and the row hides during the `stars` beat for the jumper's tile and during the `win` beat for each winner's tile. Tiles with 2 or more characters hide their row. `starClearance.test.tsx` checks a crowned rabbit frame by frame. Hops are not covered; see WR-04. |
| WR-03 | HUD shows a current turn and different crowns during the win beat | **Resolved.** `over = phase === 'gameOver'` (`GameStage.tsx:131`). It lines up with the win beat: `finish()` runs only from `advanceTurn`, and its only beat is `win`, while a manual end skips every beat. The `TurnHud` pill shows `🏁 게임 끝` with no next block, `Scoreboard` gets `currentId={null}` and `crownIds={game.winners}`, and the all-zero co-winner case now crowns everyone (`stage.test.tsx`). |
| IN-01 | Win emoji row was one text node | **Resolved.** One `.beat-banner-emoji-item` per animal. The whitespace text nodes between the flex items are not rendered, so `gap: 4px` applies. `.is-many` (more than 4 winners) uses `--game-heading`, which fits 8 into two rows of a 176 px content box. |
| IN-02 | Two sources of truth for act → face | **Open** (carried below; `reaction.ts` unchanged). |
| IN-03 | Unused `lerpPose` export | **Resolved.** Removed along with its test. |
| IN-04 | Reduced motion sampled once per mount | **Open** (carried below). |
| IN-05 | ReadySignal comment vs code | **Resolved.** The comment now says 3 frames. |
| IN-06 | Source guard does not check `vite.config.ts` | **Open** (carried below; outside this diff). |

## Critical Issues

### CR-01: Theater slot table puts characters between tiles and on the neighbor tile, so crowds on adjacent tiles merge into each other

**File:** `src/game/layout/pawnSlots.ts:43-56` (the guard that allows it is `src/game/layout/slotOcclusion.test.ts:120-130`; the coverage gap is in `src/game/scene/faceOcclusion.test.tsx:94-115`)

**Issue:** A quest tile is 1.0 wide (`ringLayout.ts:11`, half-width 0.5), and the lattice pitch is 1.14, so the neighboring tile starts 0.64 from this tile's center. The 07-08 regular table places:
- the n = 2/3 flank at ±0.56, over the gap
- the n ≥ 4 flank at ±0.60–0.68, past the neighbor's edge
- the back row at dz −0.62/−0.65 and the front-center current at dz +0.62, so the full-size current's body center is 0.12 off its own tile and its feet hang in the air at tile-top height

On a side where the ring runs along that axis, the flank of tile *a* and the opposite flank of tile *a + 1* end up almost on the same point.

I ran `pawnSlots` with the real `ringLayout` / `tileCenter` for every adjacent pair on 16/20/24-tile boards and every split with na + nb ≤ 8:
- **Heads merged more than 50 % across tiles:** splits 2+3, 3+2, 3+3, 2+4, 4+2, 3+4, 4+3, 4+4, 2+6, 6+2. The worst case is 3 + 2 on tiles 3/4: slot 1 of each tile is **0.020 apart** at the same dz (ratio 0.04 of the summed head radii), so one face is fully inside the other. Five players with three on one tile and two on the next is an ordinary game state.
- **A character stands closer to the neighbor's center than its own:** splits 1+4…1+7, 2+4…2+6, 3+4, 3+5, 4+1…4+4, 5+1…5+3, 6+1, 6+2, 7+1 (561–873 configurations per board size). Example: 4 on tile *a* and 1 on tile *a + 1*. The flank at 0.60 from its own center is 0.54 from the neighbor's center, so it looks like it is standing on the neighbor's tile.
- **Baseline:** the pre-07-08 tables (6e07e5e) had **zero** "nearer the neighbor" cases, and only 4+4 merged.

The tests miss this for two reasons:
- `faceOcclusion.test.tsx` mounts every character on one tile (`mountTile`), so a neighboring crowd is never in the scene.
- The bound test lets the ground disc reach `PITCH − 0.25 = 0.89` from center, i.e. into the neighbor's outer quarter, so a slot center past the neighbor's edge still passes.

In a board game for kids, "which tile is my animal on" is the core readability requirement (project memory: the board must show position at a glance). BOARD-05's 30 % face limit is broken outright in the 3 + 2 case.

**Fix:** Keep every slot on its own tile, then re-tune the theater shape inside that footprint:
1. Add a hard bound to `slotOcclusion.test.ts`, replacing the `PITCH − 0.25` rule:
```ts
// body center on the tile, body within tile + half the gap
expect(Math.max(Math.abs(dx), Math.abs(dz)), `n ${cnt}, slot ${k}`).toBeLessThanOrEqual(TILE_SIZE / 2 - 0.05);
expect(Math.max(Math.abs(dx), Math.abs(dz)) + BODY_R * sc).toBeLessThanOrEqual(TILE_SIZE / 2 + (PITCH - TILE_SIZE) / 2);
```
2. Add a cross-tile case to `faceOcclusion.test.tsx`: mount two adjacent tiles (for example splits 3+2, 4+4, 1+7) on a straight side and at a corner, and run the same ≤ 30 % check over all faces.
3. Re-solve the regular table within |dx|, |dz| ≤ ~0.45. Use smaller s for n ≥ 4, or let the current step forward by less, and/or hide the crown on crowded tiles during the frozen rest. Then update UI-SPEC §C5 to match.

## Warnings

### WR-04: Moving characters still pass through the resting star rows; the lift only follows `displayed.positions`, which changes when the hop completes

**File:** `src/game/scene/Board.tsx:198-222` (cause: `src/game/director/displayed.ts:31-36`; motion: `src/game/scene/Character.tsx:110-133`)

**Issue:** A row lifts only when `occupied.has(tile)`, and `occupied` comes from `displayed.positions`. `applyBeat` moves a pid only when its hop beat completes. During the hop, `Character` touches down at every intermediate tile center (`points[beat.path[k]]`, `hopPose(s)` gives y = 0 at s = 0/1) at its slot scale, which is usually 1 because the mover is the current turn.

At that moment the head spans tile top + 0.35…0.89 (`HEAD_C_Y` 0.62 ± `HEAD_R` 0.27), and the un-lifted star row sits at tile top + 0.55 ± 0.16, directly over the center. So at every quest tile it crosses, the chibi's head goes straight through the row. Most tiles are quest tiles, so this happens on almost every move.

On the destination tile, the character drops into the resting row for the last segment and stays inside it while the lift eases up (1 − e^(−12t), about 0.1–0.15 s of overlap after `completeBeat`). The pre-Phase 7 pawns were shorter, so this is a Phase 7 regression. The 07-06 fix and `starClearance.test.tsx` cover only standing characters (no hop case). It is the same "stars clip the core-loop animation" problem WR-02 described.

**Fix:** In Board's frame loop, treat the current hop's path as acting, the same way the `stars`/`win` hide works:
```ts
const hopTiles = beat?.kind === 'hop' && !reduced ? beat.path : null;
// …
let acting = row.tile === jumper || (hopTiles?.includes(row.tile) ?? false);
```
Hide (or lift) those rows while the hop plays. The destination then lifts at once when the beat completes, because it becomes `occupied`. Add a `starClearance` case that plays a `hop` beat across a hard quest tile and checks `expectClear` on every frame.

## Info

### IN-02 (carried): Two sources of truth for act → face

**File:** `src/game/director/reaction.ts:24-32` versus `:45-58`
**Issue:** Unchanged from round 1. `reactionFor` hard-codes the `ACT_FACE` pairs, and only the gallery reads `ACT_FACE`.
**Fix:** `const r = (act: Act) => ({ expression: ACT_FACE[act], act, beatId: beat.id, ms: beat.ms })`.

### IN-04 (carried): Reduced-motion preference is sampled once per mount

**File:** `src/game/scene/Character.tsx:74`, `src/game/scene/Board.tsx:141`
**Issue:** Unchanged. Board now also uses `reduced` to turn the act hide off, so a mid-game OS toggle leaves Board and Character on a different setting from the timeline.
**Fix:** Subscribe to `matchMedia('(prefers-reduced-motion: reduce)')` through `useSyncExternalStore`.

### IN-06 (carried): Source guard does not check the build-input claim

**File:** `src/game/sourceGuard.test.ts` (claim in `src/gallery.tsx:2-4`)
**Issue:** Unchanged and outside this diff. Nothing asserts that `vite.config.ts` has no `rollupOptions.input` gallery entry.
**Fix:** Read `vite.config.ts?raw` in the guard and assert it does not match `/rollupOptions|gallery/`.

### IN-07: The prewarm error test proves only an in-Canvas boundary, and its first case depends on test order

**File:** `src/game/scene/facePrewarm.test.tsx:69-71, 117-143`
**Issue:**
- The failure case puts a React `Boundary` inside the R3F reconciler. The game's `CanvasErrorBoundary` sits in the DOM tree outside `<Canvas>` and relies on R3F re-throwing root errors into the parent tree. That chain is what WR-01 was about, and the test does not exercise it. The comments in `ChibiModel.tsx:8` and `chibiFaces.ts:14-16` claim it.
- `'builds no face before mounting'` passes only because it runs first in a fresh module registry. A `.only`, a shuffle, or a reorder breaks it.

**Fix:** Add a `GameStage`-level (jsdom) or `GameCanvas` test that makes `bake` throw and asserts the recovery overlay (`failure === 'failed'`). Fold the "no face before mount" assertion into the start of the second test.

### IN-08: Two polite live regions announce at once when the game ends

**File:** `src/game/hud/TurnHud.tsx:59-64`, `src/game/hud/Banner.tsx` (role="status")
**Issue:** On the `gameOver` render, the turn pill (`aria-live="polite"`) switches to `🏁 게임 끝` in the same commit in which the banner's `role="status"` shows `🏆 우승!` plus the winner names. Screen readers often drop or merge simultaneous polite updates, so the winner announcement can be lost. This matters little for the kids, but the teacher-facing accessibility work in Phase 6 deliberately kept a single announcement per beat.
**Fix:** Mark the pill content `aria-live="off"` (or `aria-hidden`) while `over`, and let the banner be the announcement.

---

_Reviewed: 2026-10-23T07:47:38Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
