---
phase: 05-rules-engine-settings
fixed_at: 2026-10-23T03:25:00Z
review_path: .planning/phases/05-rules-engine-settings/05-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 5: Code Review Fix Report

**Fixed at:** 2026-10-23T03:25:00Z
**Source review:** .planning/phases/05-rules-engine-settings/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (CR-01, WR-01, WR-02, WR-03; IN-01..IN-07 out of scope)
- Fixed: 4
- Skipped: 0

**Verification (final HEAD):**
- `npm test`: 28 files, **637 tests passed**, 0 failed (baseline before fixes: 626)
- `npm run build` (`tsc -b && vite build`): exit 0
- Each regression test was run before its fix and failed with the reported behavior, then passed after the fix.

**Locked rules kept:** D-16/D-17 are unchanged. Undo is still available until the next roll and is closed by a roll. The input lock only drops the second tap of a double tap. A deliberate tap after the lock window still rolls and closes the undo window, and a test pins this. The engine is unchanged and has no clock (D-01). The draft store is not persisted, and the v1 data and settings keys are untouched.

## Fixed Issues

### CR-01: A double tap on a control button triggers the next phase's action

**Files modified:** `src/game/useInputLock.ts` (new), `src/game/PlayView.tsx`, `src/game/hud/ControlsBar.tsx`, `src/game/hud/hud.test.tsx`, `src/App.test.tsx`
**Commit:** 0b864ad
**Applied fix:**
- Added the `useInputLock` hook: one shared 400 ms lock based on `performance.now()`. The first tap runs; any tap inside the window is dropped.
- `PlayView` routes roll, next and undo through the lock. `endNow` stays outside it because it goes through a confirm dialog.
- Corrected the false T-05-19 comment in `ControlsBar`.

Regression tests (fake timers):
- Clicking the same "다음 ➡️" node twice moves `log.seq` by exactly 1. The test also asserts that this node is now the 🎲 button, which is the hazard itself. P2 has not rolled (`travel` 0), and the undo button is still shown.
- A double tap on 🎲 that lands on an event tile stays at `turnResolved`.
- A deliberate tap after the lock window still works and closes undo (D-16).

The existing tests that tap several play buttons in a row now step the fake clock past the lock between taps.

### WR-01: A double tap on "❌ 실패" uses up the retry

**Files modified:** `src/game/PlayView.tsx`, `src/game/hud/hud.test.tsx`
**Commit:** 641ca26
**Applied fix:**
- `MissionOverlay`'s `onJudge` goes through the same `useInputLock` guard.

Regression test (`it.each` over `retrySame` and `retryNew`):
- Two clicks on the same ❌ node leave the game in `awaitingJudgement` with `card.attempt === 2`, `log.seq` +1, and the retry badge shown.
- A later deliberate tap still judges attempt 2.

### WR-02: Tapping the "모드" or "인원 수" caption on the start screen changes the setting

**Files modified:** `src/game/hud/SetupView.tsx`, `src/game/hud/shell.test.tsx`
**Commit:** 5db7521
**Applied fix:**
- The two `<label className="game-setup-field">` wrappers are now `<div>`, matching the 라운드 row. The CSS selects only the class, so the layout is unchanged.

Regression tests:
- Tapping the 인원 수 or 팀 수 caption keeps the count at 2.
- Tapping the 모드 caption keeps 팀전 selected.
- No `label.game-setup-field` remains.

### WR-03: Following the start screen's "change rules in the editor" hint discards everything typed into the setup form

**Files modified:** `src/game/useSetupDraft.ts` (new), `src/game/hud/SetupView.tsx`, `src/game/hud/shell.test.tsx`, `src/App.test.tsx`
**Commit:** eaadcf2
**Applied fix:**
- Added `useSetupDraft`, a small in-memory zustand store with no persist. It holds mode, count, names, members, animal picks and this game's rounds.
- `SetupView` reads and writes the draft instead of local `useState`.
- Rounds are `null` until the stepper is touched. While null, the start screen shows the settings default, read once per mount (D-19). So a default changed in ⚙️ 설정 (the hint flow) appears when the instructor comes back, and a per-game choice is kept.
- The draft is cleared once a game actually starts, so "처음으로" still opens a fresh form (the previous behavior).

Regression tests (App level):
- The full team roster survives 편집기 → 게임 (mode, count, names, members, panda pick, rounds 6) and starts the expected game.
- An untouched round count follows a default changed in the settings tab; a touched one is kept.
- After a start, 처음으로 shows an empty form.

The test reset helpers now also reset the draft. The clamp test resets it explicitly before its second "fresh screen" render.

**Behavior note for the developer:**
- The lock window (400 ms) and the draft-reset point (on a successful start) are judgment calls.
- If you want the roster kept after "처음으로" as well, remove the reset in `SetupView.handleStart`.

---

_Fixed: 2026-10-23T03:25:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
