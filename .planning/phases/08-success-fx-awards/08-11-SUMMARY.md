---
phase: 08-success-fx-awards
plan: 11
subsystem: stability-soak-uat
status: complete
tags: [stab-01, stab-03, soak, leak-test, headless-chrome, uat, dev-only]
requires: [08-01, 08-02, 08-03, 08-04, 08-05, 08-06, 08-07, 08-08, 08-09, 08-10]
provides:
  - "src/game/soak.test.tsx: describe 'STAB-01: 5 games in a row (jsdom)' + 'STAB-01: 5 engine games'; local countSubscriptions / listenerBalance / snapshotCounters"
  - "GameCanvas: DEV-only window.__pjRenderInfo() → { geometries, textures, programs, calls }, deleted on unmount; exported type PjRenderInfo"
  - "soak.html + src/soak.tsx: dev-server-only auto player (?games, players, rounds, skip, seed), on-page .soak-table, window.__soakResult / __soakDone / __soakError"
  - "sourceGuard (g): soak stays out of the app (no import by basename, main.tsx / App.tsx never mention it, soak imports no 3D package)"
  - "08-UAT.md: 24 pending phase-end checks (U1-U16 + 07-UAT #1-#8) and the automated soak record"
affects: [08-VERIFICATION]
tech-stack:
  added: []
  patterns:
    - "Count every zustand subscription (hooks included) by mocking `create` to wrap api.subscribe, which useSyncExternalStore reads at call time"
    - "Seeded soak (?seed): reseed crypto.getRandomValues + the verdict picks before each game so games replay exactly and first-use GPU uploads separate from leaks"
key-files:
  created:
    - src/game/soak.test.tsx
    - soak.html
    - src/soak.tsx
    - .planning/phases/08-success-fx-awards/08-UAT.md
  modified:
    - src/game/scene/GameCanvas.tsx
    - src/game/sourceGuard.test.ts
decisions:
  - "Subscriptions are counted at the zustand seam (vi.mock('zustand') wrapping create) so React hook subscriptions count, not only explicit .subscribe calls"
  - "Under StrictMode the fake canvas's mount effect runs twice on its single mount; the test pins the count taken after the first mount and the canvas DOM node identity instead of the literal 1"
  - "The soak page gets an optional ?seed mode (identical games) in addition to the random default, so a geometry count that rises from first-use uploads can be told apart from a leak"
  - "A re-executed soak entry (hot update) reloads the page instead of mounting a second root and a second auto player"
  - "No leaking module was found, so no app module was changed for cleanup"
metrics:
  duration: "~45 min"
  completed: 2026-10-24
  tasks: 3
  files: 6
---

# Phase 8 Plan 11: 5-game soak (jsdom + headless Chrome) and phase-end UAT Summary

Five games in a row were checked twice and no leak turned up. The first check is a jsdom test that plays the real App with every leak counter compared per ceremony. The second is a dev-only `soak.html` page, run in headless Chrome 155 with its numbers recorded. Its geometry count still rises in random games. That rise comes from first-use GPU uploads of the shared face cache, which has a fixed upper bound. A seeded run that replays the same game stays flat from game 2. The 24 checks that only a person can do (iPhone / iPad Safari, laptop Chrome, how the effects feel, sound) are collected in `08-UAT.md`.

## What was built

- **Task 1 — `src/game/soak.test.tsx`** (commit 8284f21)
  - **Setup:** the real `<StrictMode><App/></StrictMode>` with the fake canvas and FakeAudio, 2 players, 1 round, 16 tiles, `noStar`.
  - **Play:** it presses the visible buttons, alternating ✅ and ❌, and moves fake time past each beat, so the Banner timers and the watchdogs end the beats. It taps the page 500 ms into some success beats. A click cap and an idle cap stop a game that never ends.
  - **Checks at each ceremony:** these counters are deep-equal for games 1–5:
    - timers
    - queue length and current beat
    - subscriptions on usePresentation, useGameStore and useSettings
    - the document and window listener balance
    - body children
    - `.fx-star` count
    - sfx `activeNodeCount` and FakeAudio live nodes, both 2 (the master chain)
    - canvas mounts, and the canvas DOM node itself
  - **처음으로:** after it, subscriptions and listeners are back at the setup-screen baseline.
  - **Engine-only describe:** 5 random games of 2–8 players go through `directGame`. They are drained alternately by `runAllTimers` (the watchdogs) and by `skipAll`. After each game the queue is empty, current is null and the timer count is 0.
- **Task 2** (commit 7b79969)
  - `GameCanvas` gets a DEV-only `window.__pjRenderInfo`, deleted on unmount.
  - `soak.html` and `src/soak.tsx` add the auto player, the on-page table and `window.__soakResult` / `window.__soakDone`.
  - The source guard (g) rule is extended to the soak page.
  - Follow-up in commit 5107860: the `?seed` identical-games mode and the guard against a hot re-run (see Deviations).
- **Task 3** (commit c57226f)
  - Headless runs of the soak page. The scratch runner and its JSON outputs live only in the session scratchpad.
  - `08-UAT.md`: U1–U16, the 8 carried 07-UAT checks (#4 updated to 1.6 / 1.9 / 2.2 s), all `[pending]`, and the `자동 점검 기록` section.

## Soak measurements (for VERIFICATION)

**jsdom (Task 1):** passed. Every ceremony had the same values:

| Counter | Value |
|---|---|
| Timers | 0 |
| Queue / current beat | 0 / null |
| Subscriptions (presentation / game / settings) | 10 / 5 / 3 |
| Document / window listener balance | 7 / 0 |
| Body children | 1 |
| `.fx-star` | 0 |
| Audio nodes | 2 |
| Canvas nodes | 1, never remounted |

The setup-screen baseline was presentation 1, game 4, settings 4 subscriptions, and document 6, window 0 listeners. After 처음으로 the counts matched it again.

**Headless Chrome:**
- System Chrome 155 headless, using the cached Playwright 1.64 (`channel: 'chrome'`, `--js-flags=--expose-gc`), at 1024 × 768.
- Renderer: `ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)`.
- `performance.memory` and `window.gc` were both available, so **heap was measured and judged**.

Run 1, the plan's default random run: `soak.html?games=5&players=8&rounds=1&skip=0.3`

| game | geometries | textures | programs | idleCalls | heapMB | audioNodes | fxStars | maxFrameMs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 126 | 3 | 15 | 81 | 84.4 | 2 | 0 | 166.7 |
| 2 | 136 | 3 | 15 | 81 | 84.9 | 2 | 0 | 16.8 |
| 3 | 138 | 3 | 15 | 81 | 85.3 | 2 | 0 | 16.8 |
| 4 | 139 | 3 | 15 | 83 | 85.7 | 2 | 0 | 16.8 |
| 5 | 142 | 3 | 15 | 80 | 85.9 | 2 | 0 | 16.8 |

Run 2, the same game replayed: `soak.html?games=5&players=8&rounds=1&skip=0.3&seed=7`

| game | geometries | textures | programs | idleCalls | heapMB | audioNodes | fxStars | maxFrameMs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 126 | 3 | 15 | 81 | 84.4 | 2 | 0 | 150.0 |
| 2 | 129 | 3 | 15 | 81 | 84.8 | 2 | 0 | 16.8 |
| 3 | 129 | 3 | 15 | 81 | 85.2 | 2 | 0 | 16.8 |
| 4 | 129 | 3 | 15 | 81 | 85.6 | 2 | 0 | 16.8 |
| 5 | 129 | 3 | 15 | 81 | 85.8 | 2 | 0 | 16.8 |

Supporting run, 12 random games with the original soak code: geometries went 122, 132, 134, 137, 140, 140, 140, 144, 145, 146, 146, 148. Textures stayed at 3 and programs at 15. Heap went from 84.4 to 86.4 MB.

**Verdict against the must_haves pass rule:**

| Criterion | Result |
|---|---|
| Textures and programs equal game 1 | Pass |
| Idle draw calls ≤ 100 | Pass (80–83) |
| `.fx-star` = 0 after every game | Pass |
| Audio nodes = 2 (master chain) after every game | Pass |
| Heap game 5 ≤ game 1 × 1.10 | Pass (+1.8% random, +1.7% seeded) |
| Geometries equal game 1 | **Not met as written** (see below) |

**Geometries:** random 126 → 142; seeded game 1 is 126 and games 2–5 are 129.

**Why this is not a leak:**
- The face geometries are a fixed cache of 8 animals × 9 expressions = 72. They are built on the CPU up front, shared, and by design never disposed (`chibiFaces.ts`).
- three uploads a geometry to the GPU, and counts it in `info.memory.geometries`, only the first time it is drawn. Each face shown for the first time therefore adds one, up to that bound.
- The seeded run, which replays the same game, does not grow after game 2. The +3 is a one-time upload on the first restart.
- The 12-game random run slows down and has several games with 0 growth (games 6, 7 and 11). A per-game leak would grow every game.

**maxFrameMs:** the 150–167 ms frame happens once, at the start of game 1 (first shader compile and upload). From game 2 on it is 16.8 ms. Real-device feel is U5 and 07-UAT #7 (UAT items 5 and 23).

**Page errors:** none. Two 404 console entries came from an icon request of the dev page.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The jsdom ceremony check could not see the ceremony class**
- **Found during:** Task 1
- **Issue:** `document.querySelector('.stage--ceremony')` returned null even though the stage's className contained `stage--ceremony`. The jsdom selector lookup missed the class added in a later render, so the loop never saw the ceremony.
- **Fix:** read `classList.contains('stage--ceremony')` on `.game-stage`.
- **Files modified:** src/game/soak.test.tsx
- **Commit:** 8284f21

**2. [Rule 1 - Bug] The opening beat runs on real timers**
- **Found during:** Task 1
- **Issue:** the game's own "마지막 라운드!" beat (1500 ms) was armed before the switch to fake timers, so advancing fake time never ended it.
- **Fix:** wait on real timers until `busy` is false, then switch to fake timers.
- **Files modified:** src/game/soak.test.tsx
- **Commit:** 8284f21

**3. [Plan adjustment] Canvas mount count under StrictMode**
- **Found during:** Task 1
- **Issue:** the plan asks for `fakeCanvas.mounts` = 1 while also mounting in StrictMode. The fake's mount effect counts 2 for one StrictMode mount.
- **Fix:** the test records the count after the first mount (≤ 2), asserts it never rises over 5 games and after 처음으로, and asserts that the canvas DOM node is the same element and the only one at every ceremony. This is a stronger "one canvas, one context" check.
- **Files modified:** src/game/soak.test.tsx
- **Commit:** 8284f21

**4. [Rule 1 - Bug] A hot update ran a second auto player**
- **Found during:** Task 3
- **Issue:** an edit to `src/soak.tsx` while a headless run was in progress made Vite run the entry again in the open page: "createRoot() on a container that has already been passed". Two auto players then pressed each other's buttons, and that run aborted with "no 🔁 다시 하기".
- **Fix:** a re-executed entry reloads the page instead of starting again (`window.__soakStarted`). The measured runs then used a fresh dev server with no edits during the runs. The runs affected by the hot update were discarded and are not in the tables.
- **Files modified:** src/soak.tsx
- **Commit:** 5107860

**5. [Rule 2 - Missing measurement] `?seed` mode for identical games**
- **Found during:** Task 3
- **Issue:** with random games, the strict "geometries equal game 1" rule cannot tell first-use uploads of the shared face cache from a leak.
- **Fix:** add an optional `?seed=N` that reseeds `crypto.getRandomValues` (the engine's only randomness, `systemRng`) and the page's own verdict and skip picks before each game. The default random soak is unchanged.
- **Files modified:** src/soak.tsx
- **Commit:** 5107860

### Pass rule not met as written (not auto-fixable, recorded for the verifier)

- Headless geometries do not stay equal to game 1: random +16, seeded +3 once and flat afterwards. The analysis above concludes this is bounded first-use uploads, not a leak.
- No app module was changed, because no leaking owner exists.
- Making the rule pass as written would need one of two changes:
  - prewarm all 72 face geometries on the GPU when the canvas starts, which changes rendering behaviour (a candidate if U5 / 07-UAT #7 show a hitch on the first expression);
  - restate the rule as "no growth per game in the seeded run".
- That choice is left to the verifier and the user.

## TDD Gate Compliance

Task 1 (`tdd="true"`) is a regression guard over existing behaviour. Its RED run failed only because of the two harness bugs above (#1 and #2). Once they were fixed, it passed without any app change, because no leak exists. So there is a `test(08-11)` commit (8284f21) and no `feat` commit for Task 1. This is expected for a leak guard and is not a skipped GREEN.

## Known Stubs

None.

## Threat Flags

None. The dev-only surface (soak page, `__pjRenderInfo`, the `crypto.getRandomValues` override, which applies only in the soak page with `?seed`) is covered by T-08-27. The build is checked to contain no `soak.html`, no soak title, no `__soak*`, no `__pjRenderInfo` and no `__loseContext`. `vite.config.ts`, `package.json` and the lockfile are unchanged, and nothing was installed (T-08-SC). The scratch runner and its outputs stay in the session scratchpad (T-08-29).

## Verification

- `npx tsc -b`: passed.
- `npx vitest run`: **83 files, 1547 tests passed**.
- `npm run build`: passed. There is no `dist/soak.html` or `dist/gallery.html`. The bundles contain no CDN host and no DEV hook or soak strings. `git diff HEAD -- package.json package-lock.json vite.config.ts` is empty.
- 08-UAT.md acceptance checks:
  - `result: [pending]` = 24
  - U-number lines = 21
  - `07-UAT #` = 10
  - `STAB-03` = 3
  - `자동 점검 기록` = 1
  - heap mentions in that section = 6
  - no PNG or soak scripts in `git status`

## Self-Check: PASSED

- FOUND: src/game/soak.test.tsx, soak.html, src/soak.tsx, .planning/phases/08-success-fx-awards/08-UAT.md
- FOUND commits: 8284f21, 7b79969, 5107860, c57226f
