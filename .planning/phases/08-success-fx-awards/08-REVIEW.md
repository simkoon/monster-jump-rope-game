---
phase: 08-success-fx-awards
reviewed: 2026-10-24T00:00:00Z
depth: standard
files_reviewed: 79
files_reviewed_list:
  - public/assets/cc0/LICENSE.md
  - soak.html
  - src/App.test.tsx
  - src/components/Modal.tsx
  - src/components/SettingsTab.test.tsx
  - src/components/SettingsTab.tsx
  - src/engine/fuzz.test.ts
  - src/engine/game.test.ts
  - src/engine/game.ts
  - src/engine/state.ts
  - src/engine/stats.test.ts
  - src/engine/stats.ts
  - src/game/GameApp.tsx
  - src/game/GameStage.tsx
  - src/game/awards.test.ts
  - src/game/awards.ts
  - src/game/director/budget.test.ts
  - src/game/director/reaction.test.ts
  - src/game/director/reaction.ts
  - src/game/director/successPlan.test.ts
  - src/game/director/successPlan.ts
  - src/game/director/timeline.test.ts
  - src/game/director/timeline.ts
  - src/game/hud/Banner.tsx
  - src/game/hud/CeremonyView.tsx
  - src/game/hud/DomPodium.tsx
  - src/game/hud/Scoreboard.tsx
  - src/game/hud/SoundToggle.tsx
  - src/game/hud/StarFlight.tsx
  - src/game/hud/TurnHud.tsx
  - src/game/hud/ceremony.test.tsx
  - src/game/hud/hud6.test.tsx
  - src/game/hud/shell.test.tsx
  - src/game/hud/soundToggle.test.tsx
  - src/game/hud/starFlight.test.tsx
  - src/game/hud/useCeremonyIntro.ts
  - src/game/hud/useStarHit.ts
  - src/game/labels.test.ts
  - src/game/labels.ts
  - src/game/layout/charMotion.test.ts
  - src/game/layout/charMotion.ts
  - src/game/layout/fxMotion.test.ts
  - src/game/layout/fxMotion.ts
  - src/game/layout/headAnchor.ts
  - src/game/layout/podiumLayout.test.ts
  - src/game/layout/podiumLayout.ts
  - src/game/layout/project.test.ts
  - src/game/layout/project.ts
  - src/game/palette.test.ts
  - src/game/palette.ts
  - src/game/scene/CameraRig.tsx
  - src/game/scene/Character.tsx
  - src/game/scene/CharacterGallery.tsx
  - src/game/scene/FxPools.tsx
  - src/game/scene/GameCanvas.tsx
  - src/game/scene/Podium.tsx
  - src/game/scene/SceneContents.tsx
  - src/game/scene/actors.test.tsx
  - src/game/scene/ceremonyScene.test.tsx
  - src/game/scene/fx.test.tsx
  - src/game/scene/headAnchor.test.tsx
  - src/game/scene/successJump.test.tsx
  - src/game/sfx/recipes.test.ts
  - src/game/sfx/recipes.ts
  - src/game/sfx/sfx.test.ts
  - src/game/sfx/sfx.ts
  - src/game/sfx/useSfx.test.tsx
  - src/game/sfx/useSfx.ts
  - src/game/soak.test.tsx
  - src/game/sourceGuard.test.ts
  - src/game/stage.test.tsx
  - src/game/styles/game.css
  - src/game/useInputLock.ts
  - src/game/useSkipOnTap.test.tsx
  - src/game/useSkipOnTap.ts
  - src/settings.test.ts
  - src/settings.ts
  - src/soak.tsx
  - src/test/fakeAudio.ts
findings:
  critical: 2
  warning: 4
  info: 5
  total: 11
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-10-24
**Depth:** standard
**Files Reviewed:** 79 (44 source files read in full; test files read only to see what behavior they expect)
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

I reviewed the Phase 8 changes: engine stats (D-15), the success-beat director tables, tap-to-skip with the shared input lock, the star flight, the ceremony as a mode of the same canvas, synthesized sfx with the iOS unlock ladder, the soundOn setting, and the dev soak page. I also traced the related store code (`usePresentation`, `useDirector`, `useGameStore.restart`) and the CSS grid of the play and ceremony stages.

Several areas check out:
- **Engine stats and undo:** stats live in `GameStateCore`, so undo snapshots restore them exactly. `endGame` over a pending quest counts no attempt. Every transition stays pure.
- **Beat ids:** beat-id guards are consistent everywhere (Banner, StarFlight, useStarHit, CameraRig, FxPools, Character, useSfx).
- **Skip listener timing:** the document-capture skip listener is installed after the dispatch that starts the beat, so the starting tap cannot also skip it.
- **Audio cleanup:** voices release their nodes in `onended`.
- **Settings and backup:** `soundOn` stays out of the content backup.
- **Production build:** a scratch `vite build` contains no soak code and no `__pjRenderInfo` / `__loseContext` hooks.

**Two blockers, both in the ceremony shell:**
1. The ceremony buttons skip the input lock. A child's double tap that skips the win beat can land on 처음으로 or 다시 하기, and a double tap on 🔁 다시 하기 can roll the next game's first die. This is the same double-tap leak that CR-01 / Pitfall 4 fixed for the play controls.
2. In portrait, the ceremony grid can be taller than its fixed `100dvh` / `overflow: hidden` stage. With 8 players on a typical iPhone in Safari, the 다시 하기 / 처음으로 row is clipped off the screen.

The warnings cover:
- an iOS resume call that runs outside the user gesture;
- a stale ContactShadows texture when a restart reuses the canvas with a different board size;
- a fanfare that keeps playing when 처음으로 is tapped during the intro;
- sound that can start while the page is hidden.

## Critical Issues

### CR-01: Ceremony buttons bypass the shared input lock (skip-tap and double-tap leak)

**File:** `src/game/hud/CeremonyView.tsx:100-115` (with `src/game/useSkipOnTap.ts:68-76`, `src/game/GameStage.tsx:168-172, 270`)

**Issue:** 🔁 다시 하기 and 처음으로 call `useGameStore.getState().restart()` / `.reset()` directly. They do not go through `guard` and do not honor `sharedLockedUntil`. This opens two leaks, the same class of bug as the CR-01 / Pitfall 4 fix:

1. **A win-beat skip tap leaks onto the ceremony buttons.** `win` is skippable. The skip tap calls `completeBeat(winId)`, the queue drains, `busy` goes false, and `ceremony = over && !busy` becomes true in the same render. So the ceremony buttons appear right under the finger. Kids tap repeatedly to skip, and their second tap lands on 처음으로 or 다시 하기. 처음으로 wipes the game, so the award ceremony is lost before anyone sees it. `lockInputFor(SKIP_LOCK_MS)` does not help, because only `guard`-wrapped play actions check it, and these buttons carry `data-skip-ignore`, which only keeps them from *triggering* a skip.
2. **A double tap on 🔁 다시 하기 rolls the dice.** `restart()` replaces the game while the canvas stays mounted, so `ready` stays true. `directGame` resets and drains the empty timeline at once, so `consumedLog === game.log` and `!busy`. `controlsVisible` is therefore true in the same render, and the stage-bottom 🎲 appears. In landscape, the ceremony actions (column 2, row 3, 360px column) and the play controls (bottom of the 240px right column, `margin-top: auto`) overlap by about 110px horizontally at the bottom of the screen. GameStage's `guard` ref was never armed by the restart tap, so the second tap runs `roll()`. Rolling closes the undo window (D-16), so the teacher cannot take it back.

**Fix:** Send both ceremony actions through the same lock, and have the restart take the lock for the next screen:
```tsx
// CeremonyPanel: accept the stage guard (or call useInputLock() locally)
export function CeremonyPanel({ game, introActive, guard }: { game: GameState; introActive: boolean; guard: Guard }) {
  ...
  <button ... onClick={() => guard(() => { lockInputFor(INPUT_LOCK_MS); useGameStore.getState().restart(); })}>
  <button ... onClick={() => guard(() => useGameStore.getState().reset())}>
```
In `useInputLock`, `guard` already rejects taps inside `sharedLockedUntil`. That covers the win-beat skip tap (250 ms). The `lockInputFor(INPUT_LOCK_MS)` inside restart covers the 🎲 that appears under the finger. Also consider calling `lockInputFor(SKIP_LOCK_MS)` when the ceremony becomes visible, not only on a skip.

### CR-02: Portrait ceremony overflows the fixed-height stage, so 다시 하기 / 처음으로 get clipped

**File:** `src/game/styles/game.css:1254-1257, 1285-1293` (stage: `game.css:24-30, 325-333`)

**Issue:** `.game-stage` is `height: 100dvh; overflow: hidden`. The portrait ceremony grid is `auto minmax(200px, 1fr) auto auto`, and `.ceremony-panel` is capped at `max-height: 48dvh`. None of the four rows can shrink below these sizes:
- head: about 75px (40px title × 1.1 + 4px gap + 27px reason);
- canvas: at least 200px;
- panel: up to 48dvh;
- actions: 56px;
- plus 3 gaps and the stage padding.

With 8 players the cards form 4 rows of 2 columns (about 344px plus the winner line), so the panel hits its 48dvh cap. Worked example, iPhone 14 in Safari (390×844, dvh ≈ 664 with toolbars visible, safe-area top/bottom 47/34): 81 + 24 + 75 + 200 + 319 + 56 ≈ 755px > 664px. The actions row ends about 90px below the stage's clipped bottom edge, so 다시 하기 / 처음으로 cannot be reached. On an iPhone SE in Safari (dvh ≈ 548), the actions are already clipped with 4 players. The landscape layout is fine. jsdom cannot catch this, and the CSS tests only check rule text.

**Fix:** Let the panel row shrink before anything is pushed out, and give the canvas a smaller floor:
```css
.game-stage.stage.stage--ceremony {
  grid-template-rows: auto minmax(min(160px, 22dvh), 1fr) minmax(0, auto) auto;
}
.ceremony-panel { max-height: 48dvh; min-height: 0; overflow-y: auto; } /* row track can now go below content */
```
A `minmax(0, auto)` track has base size 0, so under negative free space it gives up height first while the actions row keeps its 56px. Verify on a 375×548 and a 390×664 viewport with 8 participants.

## Warnings

### WR-01: iOS unlock path calls `resume()` outside the user gesture

**File:** `src/game/sfx/sfx.ts:164-174`

**Issue:** For a `suspended` / `interrupted` context, the first gesture runs `c.suspend().then(() => c.resume())`. Here `resume()` runs in a promise callback after `suspend()` settles, which is outside the gesture's activation. WebKit requires `resume()` to be called synchronously inside the gesture handler. That first gesture therefore never resumes the context, and the second gesture always falls through to `recreate()`, which spends one of the session's 3 `MAX_RECREATE` slots each time an iPad comes back from the background. There is a second problem: if a fresh `create()` is still resolving its own `resume()` when the next tap arrives more than 400 ms later, `stuck++` followed by `suspend()` cancels that pending resume.

**Fix:** Call `resume()` synchronously first, and use suspend + resume only as the fallback:
```ts
stuck++;
if (stuck >= 2 && recreated < MAX_RECREATE) { recreate(); return; }
try {
  swallow(c.resume()); // synchronous, inside the gesture
} catch { /* ignore */ }
```

### WR-02: ContactShadows renders once, so a 🔁 다시 하기 with a new board size shows a stale shadow

**File:** `src/game/scene/GameCanvas.tsx:69-70, 111-122`

**Issue:** `ContactShadows frames={1}` renders its depth texture only on the first frame. In drei, the frame counter `count` is never reset. Before Phase 8, the result screen replaced the stage, so every game got a fresh canvas. Now `restart()` keeps the same canvas, and it re-snapshots the settings, so a 보드 크기 change made in the editor during a game (16/20/24) gives the next game a different board. Only `shadowScale` follows the change: the old board's shadow texture is stretched under the new board.

**Fix:** Re-render the shadow when the board size changes, without remounting it, for example by tying `frames` to a counter that bumps on `tiles.length`:
```tsx
const [shadowFrames, setShadowFrames] = useState(1);
useEffect(() => setShadowFrames((f) => f + 1), [scene.tiles.length]); // drei renders while count < frames
<ContactShadows frames={shadowFrames} ... />
```
Alternatively, accept this behavior explicitly and document it.

### WR-03: Fanfare keeps ringing when 처음으로 is tapped during the intro

**File:** `src/game/hud/useCeremonyIntro.ts:57-62`

**Issue:** The header comment says "Leaving the ceremony (restart / reset while the intro runs) ends the run and fades the fanfare". That only works when `active` flips while the hook is still mounted (restart). 처음으로 sets `game = null`, and GameApp then unmounts GameStage, so this hook unmounts with nothing that stops the `ceremony-intro-N` group. The fanfare (about 1.4 s) keeps playing on the setup screen.

**Fix:** Stop the group in a cleanup on unmount:
```ts
useEffect(() => () => {
  if (playedRef.current > 0) sfx.stopGroup(groupOf(playedRef.current));
}, []);
```

### WR-04: Sounds can start while the page is hidden

**File:** `src/game/sfx/useSfx.ts:119-123`, `src/game/sfx/sfx.ts:289-292`, `src/game/GameStage.tsx:149-152`

**Issue:** When the page is hidden, `onVisibility` calls `stopAll(0)` right away. Then GameStage's effect runs `skipAll()`. If a win beat was playing, the ceremony mounts in the hidden tab and `useCeremonyIntro` plays the fanfare. `play()` has no visibility gate, and desktop Chrome keeps the context running in background tabs. The 1.8 s intro also runs out unseen. This breaks the D-23 contract ("Hidden page → every voice stops").

**Fix:** In `play()`, return 0 when `document.visibilityState === 'hidden'`. Also, start the intro run only while the page is visible: pass `visible` into `useCeremonyIntro`'s `active`.

## Info

### IN-01: 🍀 행운왕 title says "보너스" but luckyCount also counts forward moves and extra turns

**File:** `src/game/labels.ts` (BADGE_COPY.lucky) vs `src/engine/stats.ts:43-48`, `src/engine/game.ts:165, 203`

**Issue:** `luckyCount` goes up for a paid start bonus, any unlabeled forward event, a granted extra, and any event labelled 보너스. The mouse-over title reads "보너스를 가장 많이 받았어요".

**Fix:** Reword it, for example "행운 칸을 가장 많이 만났어요".

### IN-02: Redundant `miss` check in `isTimedBeat`

**File:** `src/game/director/timeline.ts:165-166`

**Issue:** `isBannerBeat` already includes `miss`.

**Fix:** Change it to `isBannerBeat(beat) || beat.kind === 'win'`.

### IN-03: Fades read `AudioParam.value` during automation

**File:** `src/game/sfx/sfx.ts:325-328, 359-361`

**Issue:** `setValueAtTime(g.value, now)` depends on the getter returning the value the automation has actually reached. Some engines return the intrinsic value instead (for a voice env, that is the default 1). The fade would then start from full gain and pop.

**Fix:** Prefer `g.cancelAndHoldAtTime?.(now)`, and fall back to the current code where it is missing.

### IN-04: GameStage header says "exactly three child slots", but the ceremony renders four grid items

**File:** `src/game/GameStage.tsx:30-33, 260-261`

**Issue:** `CeremonyPanel` returns a fragment, so the panel and the actions are two grid items. The canvas is still not remounted (slot index 1 is stable), but the comment is misleading for anyone who edits the grid.

**Fix:** Update the comment.

### IN-05: The star can fly to a scrolled-out scoreboard cell

**File:** `src/game/hud/StarFlight.tsx:64-71`

**Issue:** In landscape, `.sb` scrolls (`overflow-y: auto`). With 8 players, the judged participant's `.sb-avatar` can be scrolled out of view. Its rect then lies outside the panel, and the portaled star flies to an invisible spot.

**Fix:** Clamp the end point to the `.sb` scroll container's rect, or scroll the cell into view (`scrollIntoView({ block: 'nearest' })`) when the flight starts.

---

_Reviewed: 2026-10-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
