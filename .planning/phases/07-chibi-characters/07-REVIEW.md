---
phase: 07-chibi-characters
reviewed: 2026-10-23T05:44:42Z
depth: standard
files_reviewed: 40
files_reviewed_list:
  - gallery.html
  - src/App.test.tsx
  - src/gallery.tsx
  - src/game/GameStage.tsx
  - src/game/director/displayed.test.ts
  - src/game/director/reaction.test.ts
  - src/game/director/reaction.ts
  - src/game/director/timeline.test.ts
  - src/game/director/timeline.ts
  - src/game/director/useDirector.test.tsx
  - src/game/director/useDirector.ts
  - src/game/hud/Banner.tsx
  - src/game/hud/hud.test.tsx
  - src/game/hud/hud6.test.tsx
  - src/game/labels.test.ts
  - src/game/labels.ts
  - src/game/layout/charMotion.test.ts
  - src/game/layout/charMotion.ts
  - src/game/layout/chibiDims.test.ts
  - src/game/layout/chibiDims.ts
  - src/game/layout/pawnSlots.test.ts
  - src/game/layout/pawnSlots.ts
  - src/game/layout/slotOcclusion.test.ts
  - src/game/palette.test.ts
  - src/game/palette.ts
  - src/game/scene/Board.tsx
  - src/game/scene/Character.tsx
  - src/game/scene/CharacterGallery.tsx
  - src/game/scene/ChibiModel.tsx
  - src/game/scene/SceneContents.tsx
  - src/game/scene/actorGeometries.ts
  - src/game/scene/actors.test.tsx
  - src/game/scene/board.test.tsx
  - src/game/scene/chibi.test.tsx
  - src/game/scene/chibiFaces.ts
  - src/game/scene/chibiParts.ts
  - src/game/scene/chibiSpecies.ts
  - src/game/sourceGuard.test.ts
  - src/game/stage.test.tsx
  - src/game/styles/game.css
findings:
  critical: 0
  warning: 3
  info: 6
  total: 9
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-10-23T05:44:42Z
**Depth:** standard
**Files Reviewed:** 40 (39 listed files plus the root `gallery.html` dev entry)
**Status:** issues_found

## Summary

Reviewed the Phase 7 diff (`f7a01dc..HEAD`): the new miss/win beats in the timeline, director and
Banner, the pure reaction and motion curves, the slot tables, the code-built chibi models, faces
and parts, the star lift on the Board, the Character beat consumer and the dev-only gallery.
`tsc -p tsconfig.app.json --noEmit` is clean and the full Vitest suite passes (49 files, 1070 tests).

These invariants hold:
- **Beats complete once.** Only `Character` completes hop beats (id-guarded with `doneId`). Only
  `Banner` completes timed beats (`isTimedBeat` = banner beats + `miss` + `win`). The store
  watchdog is still the fallback. No 3D component completes a timed beat.
- **The engine is unchanged.** `GameStage.endNow` calls `skipAll` instead of `endGame` at
  `gameOver`. A manual `gameEnded` still makes `directGame` skip.
- **three stays out of the main chunk.** `reaction.ts`, `charMotion.ts` and `chibiDims.ts` import
  types only. `gallery.html` is not a Vite build input (`vite.config.ts` has no
  `rollupOptions.input`), and `dist/` contains only `index.html`.

No blockers. There are three warnings: face geometry is built lazily inside the frame loop, the
lifted tile stars clip through the success and cheer jumps, and the HUD contradicts the win beat.

## Warnings

### WR-01: Face geometries are built lazily inside `useFrame`, so first use does a mergeGeometries in the frame and a failure skips the error boundary

**File:** `src/game/scene/Character.tsx:199-202` (also `src/game/scene/CharacterGallery.tsx:296-299`, `src/game/scene/chibiFaces.ts:288-296`)
**Issue:** `faceGeo(animal, key)` builds and caches on first call. In the game only the `idle` key
is built during render (`ChibiModel.tsx:101`). The other 8 keys per animal are built the first time
the frame loop asks for them: the first blink, the first `excited` face on a turn, the first
`joy` on a success, and so on. Each of these runs `toNonIndexed` + `mergeGeometries` for dozens of
parts inside `useFrame`, which can cause a visible frame hitch on a classroom tablet exactly at a
reaction moment.

This also breaks two documented contracts:
- `chibiParts.ts:8-9` says a bad part "reaches the existing 3D error boundary". That is only true
  for nodes built during render. An exception from `bake()` inside `useFrame` is thrown from the
  R3F rAF loop, not from React render. `CanvasErrorBoundary` never sees it. R3F re-requests the
  frame before running subscribers (`loop()` calls `requestAnimationFrame` first), so the
  exception repeats every frame and the subscribers after it, including `gl.render`, never run.
  The canvas freezes with no recovery overlay.
- The Character and ChibiModel headers say the loop does "no geometry or material creation".

`chibi.test.tsx` builds every animal × key, so the throw path is unlikely today. The in-frame
build is still real.
**Fix:** Prewarm all face keys of the participating animals during render (or in a layout
effect), so the frame loop only swaps cached references:
```tsx
// ChibiModel.tsx (render scope, runs once per animal thanks to the cache)
import { FACE_KEYS } from '../layout/chibiDims';
const faces = useMemo(() => {
  for (const k of FACE_KEYS) faceGeo(animal, k); // build now, inside render → error boundary
  return true;
}, [animal]);
```

### WR-02: Lifted tile stars (y 1.2) sit inside the success jump and the cheer of the character standing on that tile

**File:** `src/game/scene/Board.tsx:40-41` (curves: `src/game/layout/charMotion.ts:83`, `:118`, `:121`)
**Issue:** On an occupied quest tile the stars rise to `tileTop + 1.2` at 0.75 scale. The star's
outer radius is 0.16 × 0.75 = 0.12, so the star bottom is at about 1.08 above the tile top. The
star row is centered on the tile, and a lone (or current) character stands at slot (0, 0) at
scale 1, directly under the row. The ±0.11–0.23 spacing stays inside the 0.58-wide head.

The success jump peaks at y 0.55, putting the head top at about 0.874 + 0.55 = 1.42 and the crown
higher still. The cheer jumps 0.35, putting the head top at about 1.22. The `stars` beat always
plays on the quest tile that was just judged, which is occupied by definition, so the head passes
through the lifted stars on every ✅ success. That is the core-loop moment this phase was built to
celebrate. Even the idle bounce (+0.08) brings a crown top of about 1.0–1.08 into contact with
the star bottom. The constant's comment ("above the head and the crown top (≈ 1.05)") ignores
every jump curve.
**Fix:** Clear the tallest pose rather than the rest pose. Either:
- raise `STAR_LIFT_UP` above head top + max jump + crown (≈ 1.6–1.7) and check the camera fit;
- push the lifted row behind the head (−z) as well as up; or
- hide or fade the tile stars while the tile's occupant plays a `success`/`cheer` act. For
  example, Board reads `usePresentation.getState().current` in its `useFrame` and targets
  scale 0 for that pid's tile during `stars`/`win`.

Add a geometric test like `slotOcclusion.test.ts` that compares `max(successPose.y)` + head and
crown height against the star bottom.

### WR-03: During the win beat the HUD still shows a current turn, and scoreboard crowns disagree with the 3D crowns

**File:** `src/game/GameStage.tsx:161-171, 210` (versus `src/game/scene/SceneContents.tsx:43, 62`)
**Issue:** Phase 7 makes the 1500 ms win beat say "nobody is current" in several places: the 3D
turn ring is hidden (`isCurrent && !winBeat`), the canvas aria label becomes "…, 게임 끝"
(`boardAria(..., phase === 'gameOver')`), and 3D crowns go to all winners. The DOM HUD on the same
screen still says otherwise:
- `TurnHud` still renders `{emoji} {name} 차례` for the last player, with the `aria-live="polite"`
  pill.
- `Scoreboard` still gets `currentId={cur.id}`, so that cell keeps `is-current`.
- `Scoreboard` crowns only `rank === 1 && stars >= 1`. In the all-zero co-winner case
  (`winnersByStars` → everyone), the 3D board crowns every character while the scoreboard shows
  no crown at all.

Kids and the teacher see a "your turn" pill and a highlighted cell next to a "🏆 공동 우승!"
banner.
**Fix:** Pass a game-over flag into the HUD while `phase === 'gameOver'`:
```tsx
const over = phase === 'gameOver';
<TurnHud ... over={over} />            // render "게임 끝" instead of "{name} 차례"
<Scoreboard entries={entries} currentId={over ? '' : cur.id} crownIds={over ? game.winners : undefined} />
```
Inside `Scoreboard`, compute `crowned = crownIds ? crownIds.includes(item.id) : rank === 1 && item.stars >= 1`.

## Info

### IN-01: Win-banner emoji row is a single text node, so the flex `gap`/`wrap` rules do nothing

**File:** `src/game/styles/game.css:1032-1037`, `src/game/labels.ts:232`
**Issue:** `big` is `animals.map(...).join(' ')`, one string. Inside the `display:flex` paragraph
it becomes a single anonymous flex item, so `gap: 4px` and `flex-wrap` never apply. Spacing comes
from the literal spaces, and wrapping is ordinary text wrapping. With `width: min(60%, 320px)`
on a ~374 px phone canvas, eight `--game-display` emojis fit in about 156 px of content and will
likely wrap to three rows, contradicting the "at most two rows" comment.
**Fix:** Render one `<span>` per animal (keeping the `role="img"` label on the row), or drop the
flex rules and size the font to two rows.

### IN-02: Two sources of truth for act → face

**File:** `src/game/director/reaction.ts:24-32` versus `:45-58`
**Issue:** `ACT_FACE` maps each act to its face, but `reactionFor` hard-codes the same pairs
(`r('joy', 'success')`, `r('sad', 'slump')` …). Only the gallery uses `ACT_FACE`. If one is tuned,
the gallery and the game drift apart silently.
**Fix:** Have `r` take the act only: `const r = (act: Act) => ({ expression: ACT_FACE[act], act, beatId: beat.id, ms: beat.ms })`.

### IN-03: `lerpPose` is an unused production export

**File:** `src/game/layout/charMotion.ts:205-218`
**Issue:** Only tests reference `lerpPose`. Character blends additively with its own loop
(`Character.tsx:171-173`).
**Fix:** Remove it, or use it in Character's blend.

### IN-04: Reduced-motion preference is sampled once per mount

**File:** `src/game/scene/Character.tsx:72`, `src/game/scene/Board.tsx:116`
**Issue:** `useMemo(() => prefersReducedMotion(), [])` freezes the preference at mount, while the
timeline re-reads it on every transition (`useDirector.ts:20`). If the OS setting changes mid-game,
hop beats drop to 0 ms while Character and Board keep animating, or the reverse. This follows the
inherited Phase 6 pattern, so it is low impact.
**Fix:** Subscribe to the media query (`useSyncExternalStore` on `matchMedia(...).addEventListener('change')`).

### IN-05: ReadySignal comment and code disagree on frame count

**File:** `src/game/scene/CharacterGallery.tsx:18, 208-213`
**Issue:** The comments say "after 2 rendered frames", but the code sets `window.__ready` when
`frames.current === 3`. Dev-only, but headless capture scripts rely on it.
**Fix:** Align the comment with the code, or use `=== 2`.

### IN-06: Source guard (g) does not check the build-input claim it documents

**File:** `src/game/sourceGuard.test.ts:153-168` (claim in `src/gallery.tsx:2-4`)
**Issue:** Gallery isolation rests on "`vite.config.ts` lists no extra input", but guard (g) only
scans imports and `main.tsx`/`App.tsx`. If someone later adds `build.rollupOptions.input.gallery`
to `vite.config.ts`, the dev gallery (and `engine/testkit`, which it imports) ships to GitHub
Pages and every test still passes.
**Fix:** Add an assertion that reads `vite.config.ts` (e.g. `?raw` import) and checks it does not
match `/rollupOptions|gallery/`.

---

_Reviewed: 2026-10-23T05:44:42Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
