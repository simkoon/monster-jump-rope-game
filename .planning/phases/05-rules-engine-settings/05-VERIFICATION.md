---
phase: 05-rules-engine-settings
verified: 2026-10-23T03:30:00Z
status: human_needed
score: 53/53 must-haves verified (5 roadmap success criteria + 48 plan truths)
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Settings persist across a real page reload, and the export file has no settings (05-05 human-check step 1). Run npm run dev and open it in Chrome. In 편집기 → ⚙️ 설정, set 실패 규칙 to 다른 미션으로 한 번 더, 기본 라운드 to 3, 출발 칸 보너스 to ⭐ +2 and 보드 크기 to 16칸. Reload the page, then click ⬇️ 내보내기 and open the downloaded JSON."
    expected: "All four values are still selected after the reload. The JSON has only version, categories, missions and events."
    why_human: "Tests cover persist write and rehydrate in jsdom, but a real browser reload with real localStorage has not been tried."
  - test: "Start screen in a real browser at 390×844 (05-05 step 2). Open 🎮 게임."
    expected: "There are no 남/여, 보드 길이 or 시간 제한 controls. Each player card has an animal avatar and 8 animal buttons, and an animal taken by one player is greyed out for the others. 라운드 starts at 3. ⏱️ 약 N분 updates when players or rounds change. The summary reads '16칸 보드 · 출발 보너스 ⭐+2 · 실패하면 다른 미션으로 한 번 더'."
    why_human: "Layout, tap size and readability on a phone-width screen cannot be checked by grep or jsdom."
  - test: "Play one full game by hand (05-05 step 3)."
    expected: "🎲 moves the token emoji along the 칸 줄 and wraps past 🏁. The quest card shows the name, description and ⭐ count. ✅ adds stars on the scoreboard. ❌ gives one retry with a different mission. ↩️ 판정 되돌리기 brings back the same card and disappears after the next 🎲. A 🔁 한 번 더 event gives an extra turn. Passing 🏁 shows 🏁 출발 보너스 ⭐+2."
    why_human: "The App-level integration test plays a whole game with a fixed tap order. A person still needs to confirm that the flow reads clearly and that the 400 ms input lock does not swallow real, deliberate taps."
  - test: "End the game early and use the result screen exits (05-05 step 4)."
    expected: "지금 끝내기 asks for confirmation. 계속하기 keeps the game going. 게임 끝내기 shows the result screen, with co-winners when there is a tie. 🔁 다시 하기 starts a new game with the same animals. 처음으로 returns to the start screen."
    why_human: "Real-browser confirmation of the dialog focus and the screen transitions."
  - test: "Readability at 390px with no timer (05-05 step 5)."
    expected: "Text stays big and readable at 390px width, and no timer appears anywhere."
    why_human: "Visual check."
  - test: "Upgrade a real v1 device (Success Criterion 1, real-world). On a browser profile where the v1 build (commit 0a51651) was used to create or edit missions and events, load the current build."
    expected: "Every mission, event and category is still there and unchanged. A JSON file exported earlier from v1 imports through the confirm step."
    why_human: "Code evidence is strong: src/store.ts, src/schema.ts, src/lib/io.ts and src/seed.ts are byte-identical to v1 commit 0a51651, v1 used no other storage key, and the boot simulation tests pass. Running it on a real upgraded device is still the final proof."
---

# Phase 5: 새 규칙 엔진 & 강사 설정 Verification Report

**Phase Goal:** 3D 없이(임시 DOM 화면) 강사가 설정을 고르고, 순환판 새 규칙(주사위 → 이동 → 도착 칸 퀘스트 → 판정 → 별, 정한 라운드가 끝나면 별 최다 승리)으로 게임 한 판을 처음부터 끝까지 플레이할 수 있다. 이 과정에서 v1에서 만든 미션·이벤트와 예전 백업 파일은 하나도 잃지 않는다.
**Verified:** 2026-10-23T03:30:00Z
**Status:** human_needed
**Re-verification:** No. This is the first verification.

All automated evidence passes. The status is human_needed only because the plan deferred a 5-step real-browser check to the end of the phase (human_verify_mode: end-of-phase), and no one has done it yet.

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A v1 device updated to v2 loses no missions or events, and an old v1 backup file (JSON) still imports | ✓ VERIFIED | `git diff 0a51651 HEAD -- src/store.ts src/schema.ts src/lib/io.ts src/seed.ts` is empty, so the storage path is byte-identical to the v1 release. v1 used only `powerjumping_content_v1` plus the theme key (`git grep localStorage 0a51651`). `src/dataPreservation.test.ts` boots the store from the raw v1 storage after `vi.resetModules()`. The content matches, the raw value is not rewritten, the first edit keeps all 7 v1 missions, and minimal old records get defaults instead of falling back to the seed. A content tripwire pins the persist name, version, partialize keys and schema keys. `src/lib/io.test.ts` "v1 백업 파일 가져오기" imports both the formal and the field-missing v1 backups through the confirm step. |
| 2 | Settings for fail rule, default rounds, start bonus (끔/+1/+2) and board size (16/20/24) persist after a refresh and are not in the export file | ✓ VERIFIED | `src/settings.ts` uses its own persist key `powerjumping_settings_v1`, recovers corrupted fields one by one with Zod `.catch`, and defaults to retrySame/5/1/20. `src/components/SettingsTab.tsx` has 3 fail rules, a 1–20 stepper, 끔/⭐+1/⭐+2 and 16/20/24칸, all saved immediately. It is wired into `App.tsx` via `Tabs`. In `settings.test.ts`, the rehydrate test restores the stored values, the confirmed import leaves settings unchanged, and settings actions never write the content key. `SettingsTab.test.tsx` checks that the export JSON keys are exactly categories/events/missions/version. `Header.tsx:48` exports only those 4 fields. |
| 3 | The start screen assigns an animal to each player or team, shows an estimated time from the round count, and warns before start when a board difficulty has no missions | ✓ VERIFIED | `SetupView.tsx` gives each row an `AnimalPicker` with 8 animals. `assignAnimals` keeps animals distinct, and an animal taken elsewhere is disabled. The round stepper starts from the settings `defaultRounds` (1–20). `estimateLine(estimateMinutes(n, rounds))` uses ceil(n×rounds×45/60) and shows the basis line. `missingNotices` shows 💡 notices for missing difficulties or events, and an empty library disables 게임 시작 with a guard message. Covered by `shell.test.tsx` (SETUP-07/08/09 blocks). |
| 4 | Dice give 1–6, the token loops past start, a quest tile draws a mission of that difficulty and shows name/desc/stars, a success gives ⭐1/2/3, a failure follows the fail rule (one retry, stars never drop), the last judgement can be undone, and the board never changes during the game | ✓ VERIFIED | `rng.rollDie` returns 1+floor(r×6). `ring.moveBy`/`wrap` (exhaustive property test over L∈{16,20,24}). `game.rollDice` draws from the tile's difficulty deck and refills from the pool when the deck is empty. `MissionOverlay` shows the name, the description, the difficulty badge and ⭐×stars. `judge` uses `starsFor` 1/2/3. retrySame/retryNew/noStar allow attempt 2 at most. `undoJudgement` restores the snapshot taken before the judgement, and `rollDice` clears it. The fuzz test (300 seeds) asserts stars never decrease, `s.board` keeps the same reference, positions stay in [0,L), and an awaitingJudgement card matches its tile difficulty. `useGameStore.test` checks that edits mid-game leave the board, pool and rules unchanged. |
| 5 | Event tiles (forward/back N, extra) and the start bonus follow the rules: an event that lands on a quest runs that quest, there is no bonus for a backward pass or a second pass in the same lap, an extra turn is not counted and is limited to one in a row, a round passes after every player/team takes one regular turn (team members rotate), and the game ends at the set round or on a confirmed 지금 끝내기, with the most stars winning and ties shared | ✓ VERIFIED | `rollDice` resolves one event (no chaining) and draws the quest after an event move. `moveBy` pays only for `steps>0 && lap>lapsCredited` and at most once per turn (`bonusPaid`). An extra during an extra turn is `extraSuppressed`. `advanceTurn` takes the extra branch first, increases the round only when wrapping to index 0, and rotates only the leaving team's member. Past `rounds` it ends with `rounds-complete`. `endGame('manual')` is reachable only through the ConfirmDialog in `TurnHud`. `winnersByStars` returns everyone tied at the top. Covered by game.test (events/advanceTurn/endGame blocks), the fuzz test (every participant gets exactly `rounds` regular turns, never two extra turns in a row, winners equal the max-star set) and `ResultView` co-winner tests. |

**Score:** 5/5 roadmap success criteria verified. All 48 plan must-have truths (05-01: 7, 05-02: 10, 05-03: 12, 05-04: 7, 05-05: 12) were checked against code and tests and verified. 0 are present but behavior-unverified: every behavior-dependent truth (undo window, retry state, round counting, extra-turn cap, bonus cap, board immutability) is exercised by a named test that passed in the single full run.

### Plan Prohibitions (05-05)

| Prohibition | Status | Evidence |
|-------------|--------|----------|
| src/store.ts, src/schema.ts, src/lib/io.ts not changed | ✓ held | `git diff 1cff657 HEAD` and `git diff 0a51651 HEAD` on these files are both empty. The tripwire test in dataPreservation.test.ts also enforces it. |
| No setTimeout/setInterval/animation sequence in the temp play/result screens | ✓ held | grep finds a timer only in `usePresentation.ts`, the pre-existing watchdog, which PlayView/ResultView do not arm. `useInputLock` reads `performance.now()` and starts no timer. The engine has no clock. |
| public/assets/cc0/kenney not deleted | ✓ held | `public/assets/cc0/kenney/{NOTICE.md, board-game-icons, toon-characters}` exist. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/test/fixtures/v1.ts` | v1 raw fixtures | ✓ VERIFIED | Exports all 6 named fixtures. Used by dataPreservation/io/settings tests. |
| `src/dataPreservation.test.ts` | boot simulation + tripwire | ✓ VERIFIED | Uses `vi.resetModules` and dynamic `import('./store')`. |
| `src/settings.ts` | separate settings persist store | ✓ VERIFIED | 73 lines. Separate key, per-field recovery, partialize keeps 4 fields. |
| `src/components/SettingsTab.tsx`, `Stepper.tsx` | ⚙️ 설정 tab | ✓ VERIFIED | Wired in App.tsx (`tab === 'settings'` branch). The banner shows only while a game exists. |
| `src/engine/ring.ts`, `scoring.ts`, `board.ts`, `animals.ts`, `setup.ts` | pure building blocks | ✓ VERIFIED | All substantive. Imported by game.ts, SetupView, labels, Scoreboard and ResultView. |
| `src/engine/state.ts`, `game.ts`, `testkit.ts`, `fuzz.test.ts` | v2 FSM | ✓ VERIFIED | game.ts is 398 lines, with phase guards and immutable transitions. Driven by the harness. |
| `src/game/labels.ts`, `hud/AnimalPicker.tsx`, `Scoreboard.tsx`, `RingStrip.tsx` | temp HUD parts | ✓ VERIFIED | Rendered by SetupView and PlayView with live engine state. |
| `src/harness/useGameStore.ts` | single engine seam with start-time snapshot | ✓ VERIFIED | `createGame(..., snapshotContent(), systemRng())`. Settings are read once with `useSettings.getState()`. |
| `src/game/PlayView.tsx`, `hud/SetupView.tsx`, `hud/ResultView.tsx` | temp screens | ✓ VERIFIED | Routed by `GameApp`: no game → Setup, gameOver → Result, otherwise → Play. |
| v1 remnants deleted (engine.ts, types.ts, placement.ts, scene/, animation.ts, boardLayout.ts, moveHighlight.ts, PositionReadout.tsx) | removed | ✓ VERIFIED | `ls` reports all of them missing. The plan's remnant grep gates print nothing (the only 'boy'/'girl' hits are negative assertions in animals.test.ts). |

### Key Link Verification

The `verify.key-links` tool reported several "Invalid regex pattern" failures. These come from double-escaped patterns in the plan YAML, not from the code. Each link was checked by hand with grep:

| From | To | Via | Status |
|------|----|-----|--------|
| SettingsTab.tsx | settings.ts | `useSettings(` (8 hits) | ✓ WIRED |
| App.tsx | SettingsTab.tsx | `tab === 'settings'` branch | ✓ WIRED |
| dataPreservation.test.ts | store.ts | `import('./store')` (2 hits) | ✓ WIRED |
| board.ts | rng.ts | `weightedPick(` | ✓ WIRED |
| setup.ts | board.ts | `DIFF_ORDER` | ✓ WIRED |
| game.ts | ring/board/scoring | `moveBy(`, `buildBoard(`, `winnersByStars(` | ✓ WIRED |
| Scoreboard.tsx | scoring.ts | `rankByStars(` | ✓ WIRED |
| RingStrip.tsx | labels.ts | `tileAriaLabel(` | ✓ WIRED |
| labels.ts | animals.ts | `Record<AnimalId` | ✓ WIRED |
| useGameStore.ts | game.ts | `createGame(` plus roll/judge/undo/next/endNow wrappers | ✓ WIRED |
| useGameStore.ts | settings.ts | `useSettings.getState()` | ✓ WIRED |
| SetupView.tsx | setup.ts | `analyzeContent(`, `estimateMinutes`, `buildParticipants` | ✓ WIRED |
| PlayView.tsx | RingStrip.tsx | `<RingStrip tiles={game.board} …>` | ✓ WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| PlayView | `game` | `useGameStore` ← `createGame(content snapshot from useStore, settings from useSettings)` | Yes (live persisted content + settings) | ✓ FLOWING |
| SetupView | missions/events/settings | `useStore`, `useSettings` selectors | Yes | ✓ FLOWING |
| ResultView | winners/participants | `finish()` → `winnersByStars` | Yes | ✓ FLOWING |
| SettingsTab | 4 settings | `useSettings` persist store | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Typecheck | `npx tsc -b` | exit 0 | ✓ PASS |
| Whole suite (run once) | `npx vitest run` | 28 files, 637 tests passed, exit 0 | ✓ PASS |
| Production build | `npm run build` | 149 modules, built OK | ✓ PASS |
| Full game from 게임 시작 to 결과, then 🔁 다시 하기 | App.test.tsx "plays one full game … (Phase 5 goal)" (in the run above) | passed | ✓ PASS |
| 300-seed whole-game invariants | fuzz.test.ts (in the run above) | 300/300 passed | ✓ PASS |
| v1 remnant grep gates (05-05 acceptance) | 3 grep gates | no output (only negative-test hits for 'boy'/'girl') | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED. The phase declares no probe scripts and `scripts/*/tests/probe-*.sh` does not exist.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|-------------|--------|----------|
| DATA-05 | 05-01 | ✓ SATISFIED | Storage path identical to v1; boot simulation tests |
| DATA-06 | 05-01 | ✓ SATISFIED | v1 backup import tests (formal and minimal) |
| DATA-07 | 05-01, 05-05 | ✓ SATISFIED | Separate key; export has 4 keys; import leaves settings alone; start-time snapshot |
| CFG-01..04 | 05-01 | ✓ SATISFIED | SettingsTab and its tests |
| SETUP-07 | 05-02, 05-04, 05-05 | ✓ SATISFIED | AnimalPicker + assignAnimals + buildParticipants |
| SETUP-08 | 05-02, 05-04, 05-05 | ✓ SATISFIED | Round stepper + estimate |
| SETUP-09 | 05-02, 05-04, 05-05 | ✓ SATISFIED | missingNotices + empty-library guard |
| BOARD-04 | 05-02..05 | ✓ SATISFIED | buildBoard runs once; event copies; same board reference (fuzz); harness snapshot |
| TURN-01..08 | 05-02, 05-03, 05-05 | ✓ SATISFIED | game.ts plus game, fuzz and hud tests |
| ROUND-01, ROUND-03, ROUND-04 | 05-02, 05-03, 05-05 | ✓ SATISFIED | advanceTurn/finish/endGame plus ConfirmDialog |

Every one of the 22 phase IDs appears in at least one PLAN `requirements` field. REQUIREMENTS.md maps no other ID to Phase 5, so no requirement is orphaned. ROUND-02 belongs to Phase 6. The temporary `라운드 r/R` readout exists, but the "마지막 라운드!" notice is Phase 6 scope.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (all src files changed in this phase) | — | TBD/FIXME/XXX/TODO/HACK | — | None found |
| src/harness/useGameStore.ts | 41 | `startBlockedReason` written, never rendered (review IN-01) | ℹ️ Info | The setup screen's live guard shows the same message, so nothing is lost |
| src/game/styles/game.css | various | Leftover v1 selectors (review IN-06) | ℹ️ Info | Dead CSS only |
| src/engine/game.ts | 81-91 | A reshuffle can deal the just-played mission again (review IN-04) | ℹ️ Info | Does not break any truth. TURN-02 is still satisfied |

The code review findings CR-01, WR-01, WR-02 and WR-03 are fixed, and regression tests for them are in the passing suite (hud.test "double-tap lock", shell.test "captions are inert", App.test "draft survives the 편집기").

### Human Verification Required

These are the planner's end-of-phase human-check (05-05 Task 3, steps 1–5) plus a real-device upgrade check for Success Criterion 1. Full details are in the frontmatter.

1. **Settings persist after a real reload, and the export has no settings.** Change all four settings, reload, export, then inspect the JSON.
2. **Start screen at 390×844.** Animal pickers, round default, estimate and rules summary.
3. **Hand-played full game.** Ring wrap, quest card, ✅/❌ retry, undo appears and disappears, extra turn, start bonus chip. Also confirm the 400 ms input lock never swallows deliberate taps.
4. **지금 끝내기 confirm and result screen exits.** Co-winners, 🔁 다시 하기, 처음으로.
5. **Readability at 390px with no timer.**
6. **Real upgraded v1 device.** Content survives, and an old export imports.

### Gaps Summary

No gaps. Every roadmap success criterion and plan truth is backed by real, wired code and by tests that passed in this verification run: tsc exit 0, vitest 637/637 and a successful build. The v1 data guarantee is very strong because the storage modules are byte-identical to the v1 release commit. The only remaining work is the deferred real-browser human check.

---

_Verified: 2026-10-23T03:30:00Z_
_Verifier: Claude (gsd-verifier)_
