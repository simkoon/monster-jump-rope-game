---
phase: 05-rules-engine-settings
reviewed: 2026-10-23T03:20:00Z
depth: standard
files_reviewed: 45
files_reviewed_list:
  - src/App.test.tsx
  - src/App.tsx
  - src/components/SettingsTab.test.tsx
  - src/components/SettingsTab.tsx
  - src/components/Stepper.tsx
  - src/components/Tabs.tsx
  - src/dataPreservation.test.ts
  - src/engine/animals.test.ts
  - src/engine/animals.ts
  - src/engine/board.test.ts
  - src/engine/board.ts
  - src/engine/fuzz.test.ts
  - src/engine/game.test.ts
  - src/engine/game.ts
  - src/engine/ring.test.ts
  - src/engine/ring.ts
  - src/engine/scoring.test.ts
  - src/engine/scoring.ts
  - src/engine/setup.test.ts
  - src/engine/setup.ts
  - src/engine/state.ts
  - src/engine/testkit.ts
  - src/game/PlayView.tsx
  - src/game/hud/AnimalPicker.tsx
  - src/game/hud/ControlsBar.tsx
  - src/game/hud/DiceResultPanel.tsx
  - src/game/hud/MissionOverlay.tsx
  - src/game/hud/ResultView.tsx
  - src/game/hud/RingStrip.tsx
  - src/game/hud/Scoreboard.tsx
  - src/game/hud/SetupView.tsx
  - src/game/hud/TurnHud.tsx
  - src/game/hud/hud.test.tsx
  - src/game/hud/shell.test.tsx
  - src/game/hud/tempHud.test.tsx
  - src/game/labels.test.ts
  - src/game/labels.ts
  - src/game/styles/game.css
  - src/harness/useGameStore.test.ts
  - src/harness/useGameStore.ts
  - src/lib/io.test.ts
  - src/settings.test.ts
  - src/settings.ts
  - src/styles/index.css
  - src/test/fixtures/v1.ts
findings:
  critical: 1
  warning: 3
  info: 7
  total: 11
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-10-23T03:20:00Z
**Depth:** standard
**Files Reviewed:** 45
**Status:** issues_found

## Summary

I reviewed the v2 ring-board engine (`ring`, `board`, `game`, `scoring`, `setup`, `animals`), the harness seam, the separate settings store, the temporary DOM play, start and result screens, and the data-preservation and fuzz tests. I checked them against the locked rules D-01..D-28 in `05-CONTEXT.md`.

**What holds up (checked by tracing the code, not just the tests):**
- **v1 data preservation.** `src/store.ts`, `src/schema.ts` and `src/lib/io.ts` are byte-unchanged in the reviewed range. Persist `name: 'powerjumping_content_v1'` and `version: 1` are intact. Settings use their own key (`powerjumping_settings_v1`). Settings never pass through `io.ts`, so they are never exported. The tripwire test (`dataPreservation.test.ts` e) pins the key, version, partialize keys and schema key sets.
- **Ring math (`ring.ts` and `game.ts:rollDice`).**
  - Start bonus: paid only when `steps > 0` and the new lap is above `lapsCredited`. `lapsCredited` is raised even when the per-turn cap blocks payment, so a blocked lap can never be paid later. The cap is enforced by `turn.bonusPaid` across the dice move and the event move.
  - Backward wrap: `wrap` and `lapOf` use `floor`, so negative travel wraps correctly.
  - Event moves: an event-forward move that lands on a quest draws a card, and events never chain.
- **Extra turns and round counting.** The extra branch runs first in `advanceTurn` and does not advance the round. On an extra turn, `isExtra` suppresses a second extra in a row. The round increments in exactly one place.
- **Undo window.** The snapshot is taken before the verdict. `rollDice` clears `undo`, `finish` clears it, and it survives `advanceTurn`, as D-16 requires.
- **Manual end.** `endGame` voids the pending card (`card: null`) without awarding stars.

**The main problem is in the temporary play screen, not the engine.** The engine's phase guards make each transition safe against a repeated call in the wrong phase. In the UI, though, the button for the next phase is rendered in the same place as the button just tapped, so a quick second tap triggers the next phase's action. I reproduced this in jsdom:
- A double tap on "다음 ➡️" rolls the die for the next player.
- A double tap on "❌ 실패" uses up the retry.

The first case also closes the undo window, so the instructor can no longer correct the previous verdict. The code comment in `ControlsBar.tsx` (T-05-19) claims this cannot happen.

`tsc --noEmit` is clean and all 626 tests pass.

## Critical Issues

### CR-01: A double tap on a control button triggers the next phase's action (the "다음" double tap rolls for the next player and closes the undo window)

**File:** `src/game/hud/ControlsBar.tsx:7, 39-58` (with `src/game/PlayView.tsx:71-78`)
**Issue:** `ControlsBar` always renders its primary button as the first `<button class="game-btn">` inside `.game-controls`. Each `phase` gets different props on the same element in the same position, and React reuses the DOM node. A tap on that spot therefore fires whatever action the new phase's button has:
- `turnResolved` → "다음 ➡️" → `advanceTurn` → `awaitingRoll`. A second tap rolls the die for the **next** participant. `rollDice` sets `undo: null` (game.ts:231), so the previous verdict can no longer be undone (D-16), and the next child's roll happens without them seeing it.
- `awaitingRoll` → "🎲 주사위 굴리기" lands on an event or start square → `turnResolved`. A second tap advances the turn before anyone reads the event result.

Reproduced with a throwaway jsdom test: two `click`s on the "다음" button left `currentIndex = 1` and p2 `travel = 5`, meaning the next player had already rolled. The header comment "Only the buttons of the current phase are rendered, so double taps cannot skip a phase (T-05-19)" is false.

The engine guard in `game.ts:9-10` ("double-tap safe") only protects against a repeated call in the *same* phase. A real touch double tap is delivered by screen coordinates after React has already re-rendered, so passing a seq token into the handler would not help either. The fix has to be a short input lock after each transition. The `busy` gate already exists for this: `ControlsBar` takes a `busy` prop, but `PlayView` never passes it.
**Fix:** Lock input briefly after every harness action and gate every action button in `PlayView` on that lock:
```tsx
// PlayView.tsx
import { useRef } from 'react';
const INPUT_LOCK_MS = 400;
const lockedUntil = useRef(0);
function act(fn: () => void) {
  const now = performance.now();
  if (now < lockedUntil.current) return; // swallow the second tap of a double tap
  lockedUntil.current = now + INPUT_LOCK_MS;
  fn();
}
<ControlsBar
  onRoll={() => act(() => useGameStore.getState().roll())}
  onNext={() => act(() => useGameStore.getState().next())}
  onUndo={() => act(handleUndo)} ... />
<MissionOverlay onJudge={(ok) => act(() => useGameStore.getState().judge(ok))} ... />
```
In Phase 6 this can move into the existing `usePresentation` busy gate. `ControlsBar` already takes a `busy` prop, but `PlayView` never passes it. Add a regression test that clicks the same button node twice and asserts that only one transition happened (`log.seq` advanced by exactly 1). Also correct the T-05-19 comment in `ControlsBar.tsx:7`.

## Warnings

### WR-01: A double tap on "❌ 실패" uses up the retry

**File:** `src/game/hud/MissionOverlay.tsx:29-35` (with `src/engine/game.ts:279-303`)
**Issue:** Under `retrySame`/`retryNew`, a first failure leaves the game in `awaitingJudgement` with an attempt-2 card. `MissionOverlay` re-renders the ✅/❌ pair in the same place, so a second tap on ❌ judges attempt 2 as a failure too. The phase guard does not block this because the phase has not changed. Reproduced: two clicks on ❌ led to `phase: 'turnResolved', card: null`, which means the child lost the retry D-03 promises. The instructor can recover with undo, which is why this is a warning and not a blocker, but only if they notice.
**Fix:** Apply the same input lock as CR-01 to `onJudge`. Alternatively, key the judge buttons on `attempt` and disable them for a short time after the card changes (`disabled={lockedUntil > now}`).

### WR-02: Tapping the "모드" or "인원 수" caption on the start screen changes the setting

**File:** `src/game/hud/SetupView.tsx:102-113, 115-137`
**Issue:** Both fields are `<label className="game-setup-field">` elements that wrap buttons. A `<label>` with no `for` attribute forwards clicks to its first labelable descendant. Tapping the "인원 수" caption therefore clicks the "−" (줄이기) button. Reproduced in jsdom: the count went from 2 to 1. Tapping "모드" selects 개인전. The markup was inherited from v1, but this phase rewrote the file, and on a shared tablet a stray tap on the caption silently changes the participant count.
**Fix:** Use a non-label container, as the round row already does:
```tsx
<div className="game-setup-field">
  <span>{isTeam ? '팀 수' : '인원 수'}</span>
  ...
</div>
```

### WR-03: Following the start screen's "change rules in the editor" hint discards everything typed into the setup form

**File:** `src/game/hud/SetupView.tsx:53-59, 206` (with `src/App.tsx:52-76`, `src/game/labels.ts:55`)
**Issue:** The start screen now tells the instructor `RULES_HINT = '규칙은 편집기 › ⚙️ 설정에서 바꿀 수 있어요.'`. Switching to the editor unmounts `GameApp`, and with it `SetupView`. All the setup state lives in local `useState`: mode, count, names, team members, animal picks and the per-game round count. Following the app's own advice and coming back wipes the class roster the instructor just typed in.
**Fix:** Move the setup draft into a small zustand store (no persist needed) or into `useGameStore`, so it survives the view switch. The alternative is to keep `GameApp` mounted and hidden when `view === 'editor'`.

## Info

### IN-01: `startBlockedReason` is written but never read

**File:** `src/harness/useGameStore.ts:41, 73, 79, 130`
**Issue:** No component reads `startBlockedReason`. When "🔁 다시 하기" (`restart`) runs after the library was emptied, the harness sets `game: null`, and the player lands on the setup screen without being told why.
**Fix:** Render it in `SetupView`, or remove the field.

### IN-02: The harness and the engine accept zero participants and then crash

**File:** `src/harness/useGameStore.ts:69-80`, `src/engine/game.ts:103-138`
**Issue:** `createGame` with `participants: []` calls `turnStartedEvent` → `currentParticipant(...)` returns `undefined` → `TypeError` on `.id`. The UI cannot trigger this today, because `buildParticipants` clamps to at least 1. But the harness is documented as the single seam and does not validate its input.
**Fix:** In `startGame`, block the start when `setup.participants.length < 1` (set `startBlockedReason`), or throw a descriptive error in `createGame`.

### IN-03: Clamp logic and the stepper are duplicated

**File:** `src/settings.ts:41-44`, `src/harness/useGameStore.ts:54-57`, `src/game/hud/SetupView.tsx:39-41, 175-198`, `src/components/SettingsTab.tsx:92`
**Issue:**
- `clampRounds` is copied verbatim in two modules.
- `SetupView.clampCount` re-implements the engine's private `clampCount` without `floor`.
- The round stepper on the start screen re-implements `Stepper` by hand.
- The hint text hardcodes "1~20" and "기본 5" instead of using `ROUNDS_MIN`/`ROUNDS_MAX`/`DEFAULT_ROUNDS`.
**Fix:** Export one `clampRounds` from `settings.ts`, reuse `Stepper` in `SetupView`, and build the hint from the constants.

### IN-04: A reshuffle can deal the just-played mission again right away

**File:** `src/engine/game.ts:81-82, 90-91`
**Issue:** When a difficulty's deck runs out, `shuffle(src, rng)` puts the whole pool back, and the mission that was just played can come out on top. The same happens on the `retryNew` refill, which includes the attempt-1 mission. This weakens the planner's "avoid repeating the same mission" intent at deck boundaries.
**Fix:** After refilling, if the top card's id matches the last mission drawn and `src.length > 1`, swap it with another position before drawing.

### IN-05: The fuzz test never exercises undo or manual end, and never checks the per-turn bonus cap

**File:** `src/engine/fuzz.test.ts:60-67`
**Issue:** The random walk only calls `rollDice`, `judge` and `advanceTurn`. Mixing in `undoJudgement` and `endGame` would check the D-16/D-17/D-22 invariants under random play: stars restored exactly, `seq` still monotonic, the undo window closed after a roll. An assertion that `lastMove.startBonus <= rules.startBonus` would also pin "at most once per turn" across combined dice and event moves.
**Fix:** Add those actions with a small probability, plus the bonus-cap assertion.

### IN-06: Leftover v1 CSS selectors

**File:** `src/game/styles/game.css:48-59, 150, 165, 299-300, 316, 332-333, 360`
**Issue:** No component references `.game-hud`, `.game-bottom`, `.game-mission-overlay`, `.game-result-cowinner` or `.game-result-final` any more. They are remnants of the deleted 3D HUD and final-pick result screen.
**Fix:** Remove them, or leave them for Phase 6 with a comment saying so.

### IN-07: Minor copy and a11y issues on the temporary screens

**File:** `src/components/SettingsTab.tsx:61, 68, 81, 96, 107`, `src/game/hud/DiceResultPanel.tsx:22-31`
**Issue:**
- The settings banner "지금 하고 있는 게임에는 적용되지 않아요" also appears once a game has finished but the result screen has not been dismissed, because `game !== null` at `gameOver`.
- The settings `<label>` elements are not associated with any control (no `htmlFor`, no content).
- The schema allows `steps: 0` for forward/backward events, and those show "앞으로 0칸" / "뒤로 0칸".
**Fix:**
- Gate the banner on `activeGame && activeGame.phase !== 'gameOver'`.
- Use `<span>` or `aria-labelledby` for the settings captions.
- Hide the step text when `steps === 0`.

---

_Reviewed: 2026-10-23T03:20:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
