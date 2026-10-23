---
phase: 08-success-fx-awards
fixed_at: 2026-10-23T19:28:13Z
review_path: .planning/phases/08-success-fx-awards/08-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 8: Code Review Fix Report

**Fixed at:** 2026-10-23T19:28:13Z
**Source review:** .planning/phases/08-success-fx-awards/08-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (CR-01, CR-02, WR-01 ~ WR-04; IN-01 ~ IN-05 left alone by scope)
- Fixed: 6
- Skipped: 0
- Verification: `npm test` 83 files / **1562 passed** (the baseline was 1547, so 15 tests are new). `npm run build` (`tsc -b && vite build`) passes. The only build warning is the existing >500 kB GameCanvas chunk warning. The built CSS contains the new ceremony grid rule.
- Each new regression test was run against the pre-fix source and failed there. It passes with the fix.
- Contracts kept: no new npm dependency; the main chunk still does not import three (sourceGuard passes); timeline.ts is untouched; beat completion stays by id; the ceremony stays a mode of the same canvas (the mount-count tests still pass).

## Fixed Issues

### CR-01: Ceremony buttons bypass the shared input lock (skip-tap and double-tap leak)

**Files modified:** `src/game/hud/CeremonyView.tsx`, `src/game/hud/ceremony.test.tsx`, `src/game/stage.test.tsx`
**Commit:** d46b500
**Applied fix:** CeremonyPanel now calls `useInputLock()` itself, the second option the review offers, so the component API stays the same. 🔁 다시 하기 and 처음으로 both run through `guard(...)`. The guard honors the shared `sharedLockedUntil`, so the 250 ms win-beat skip lock now covers the ceremony buttons too. 🔁 다시 하기 also calls `lockInputFor(INPUT_LOCK_MS)` before `restart()`, so the new game's 🎲, which appears under the finger, ignores the second tap of a double tap.
**Tests:**
- stage: after a win-beat skip tap, taps on 처음으로 / 🔁 다시 하기 inside SKIP_LOCK_MS change nothing. After the window, 처음으로 works.
- stage: a double tap on 🔁 다시 하기 does not roll the new game's 🎲. After INPUT_LOCK_MS it does roll.
- ceremony unit tests: a double tap restarts only once, and another `useInputLock` guard is blocked for INPUT_LOCK_MS. Inside the shared skip lock, neither button runs.
**Test infrastructure:** the shared lock lives at module scope, so restart now leaves it set. `resetSharedInputLock()` was added to the top-level before/after hooks of stage.test and ceremony.test. The "three restarts keep one canvas" test now uses fake timers and advances INPUT_LOCK_MS between restarts, the same pattern soak.test already used.

### CR-02: Portrait ceremony overflows the fixed-height stage, so 다시 하기 / 처음으로 get clipped

**Files modified:** `src/game/styles/game.css`, `src/game/hud/ceremony.test.tsx`
**Commit:** 7752a14
**Applied fix:** the portrait ceremony grid changed from `auto minmax(200px, 1fr) auto auto` to `auto minmax(min(160px, 22dvh), 1fr) minmax(0, auto) auto`. `.ceremony-panel` already had `min-height: 0; max-height: 48dvh; overflow-y: auto`, so the panel row now gives up height first and scrolls inside, and the actions row keeps its height. The CSS block header comment was updated. The landscape rules are unchanged.
**Tests:** the CSS contract test now pins the new `grid-template-rows` rule text and the panel's `min-height: 0`.
**Visual check moved to the phase-end UAT (U9):** jsdom cannot lay out the grid, so the test only checks rule text. U9 needs to confirm that with 8 players on an iPhone in portrait Safari, and also at 375×548, the 다시 하기 / 처음으로 row stays fully on screen and the card panel scrolls.

### WR-01: iOS unlock path calls `resume()` outside the user gesture

**Files modified:** `src/game/sfx/sfx.ts`, `src/game/sfx/sfx.test.ts`, `src/game/sfx/useSfx.ts` (comment only), `src/game/sfx/useSfx.test.tsx`
**Commit:** c68a728
**Applied fix:** for a `suspended` / `interrupted` context, `unlock()` now calls `c.resume()` synchronously inside the gesture. Before, it ran `c.suspend().then(() => c.resume())`. Removing `suspend()` also means a later tap can no longer cancel a `resume()` that a fresh `create()` still has pending. The stuck counter and the at-most-MAX_RECREATE ladder are unchanged: the second stuck gesture still recreates. The header comments in sfx.ts and useSfx.ts were updated.
**Tests:**
- sfx: right after `unlock()`, with no await, `resumeCalls` is +1 and `suspendCalls` is 0. A pending fresh context is never suspended.
- useSfx: a document `touchend` on an interrupted context calls `resume()` synchronously within that dispatch.
- The existing ladder test was updated: gesture 1 now resumes and does not suspend.

### WR-02: ContactShadows renders once, so a 🔁 다시 하기 with a new board size shows a stale shadow

**Files modified:** `src/game/scene/GameCanvas.tsx`, `src/game/scene/gameCanvas.test.tsx`
**Commit:** 29a48be
**Status:** fixed (defensive). The review's premise is only partly right.
**Applied fix:** GameCanvas keeps `{ tiles, frames }` in state. When `tiles.length` changes, `frames` goes up by one during render (React's "adjust state when a prop changes" pattern), so there is no extra commit and no remount. `<ContactShadows frames={shadow.frames}>` therefore draws the shadow again for the new board. The ContactShadows stays mounted inside the same `<group visible={!scene.ceremony}>`, so the existing Pattern 6 source test still passes.
**Note for the developer:** in the installed drei 10.7.9, ContactShadows declares `let count = 0` in the component body, and R3F's `useFrame` always calls the latest closure. So the count already resets on every ContactShadows render, and a re-render after a board-size change would also redraw the shadow today. The bump makes the redraw follow drei's documented `frames` contract instead of relying on that internal detail.
**Separate issue, not fixed:** drei's `useMemo` depends on `scale`, so each board-size change creates two new 512² render targets and never disposes the old ones. This leak happens only when the board size changes between games, so the 5-game soak with a fixed size does not show it. It is out of scope for WR-02.
**Tests:** gameCanvas.test captures the Canvas children. `frames` starts at 1, stays at 1 for a new board array of the same size, then goes to 2 and 3 as the size changes 20 → 24 → 16. The shadow scale follows the size, the canvas DOM node stays the same, and `onReady` fires only once.

### WR-03: Fanfare keeps ringing when 처음으로 is tapped during the intro

**Files modified:** `src/game/hud/useCeremonyIntro.ts`, `src/game/hud/ceremony.test.tsx`, `src/game/stage.test.tsx`
**Commit:** 3e97685
**Applied fix:** an unmount cleanup in `useCeremonyIntro` calls `sfx.stopGroup('ceremony-intro-N')` for the run whose fanfare has played. The stop is deferred by one microtask and cancelled by the effect's re-setup. Without this, StrictMode's simulated unmount, which `src/main.tsx` triggers in dev, would cut the fanfare right after it starts. The header comment was updated.
**Tests:**
- ceremony: unmounting during the intro stops `ceremony-intro-1`.
- ceremony: a StrictMode mount plays one fanfare and stops nothing.
- ceremony: unmounting before any intro stops nothing.
- stage: 처음으로 during the intro unmounts GameStage and calls `stopGroup('ceremony-intro-1')`.

### WR-04: Sounds can start while the page is hidden

**Files modified:** `src/game/sfx/sfx.ts`, `src/game/sfx/sfx.test.ts`, `src/game/GameStage.tsx`, `src/game/stage.test.tsx`
**Commit:** ba9ae8e
**Applied fix:**
- `play()` returns 0 when `document.visibilityState === 'hidden'`. The check is guarded for environments without `document`.
- GameStage passes `... && visible` into `useCeremonyIntro`'s `active`. A ceremony reached in a hidden tab now starts its intro and fanfare only when the page is shown.
- Hiding the page mid-intro ends the intro the same way leaving the ceremony does: the fanfare group fades and the run does not replay on return.
**Tests:**
- sfx: while hidden, `play()` returns 0 and creates no voice nodes. Once visible, it plays again.
- stage: hidden → 지금 끝내기 → the ceremony shows with `introId 0, introActive false` and no fanfare. Visible → intro 1 starts with one fanfare.
- stage: hiding mid-intro ends the intro and calls `stopGroup('ceremony-intro-1')`, and the fanfare does not replay when the page is visible again.

---

_Fixed: 2026-10-23T19:28:13Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
