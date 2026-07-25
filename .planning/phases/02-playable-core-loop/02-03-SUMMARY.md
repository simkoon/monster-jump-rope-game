---
phase: 02-playable-core-loop
plan: 03
subsystem: harness
status: complete
tags: [harness, play-loop, countdown, result-screen, dom-ui, throwaway]
requires:
  - "src/engine/engine.ts (drawCard/judge/rollDice/advanceTurn/endGame — the turn FSM)"
  - "src/engine/types.ts (GameState.phase, card, lastRoll, lastLanding, winners, endReason, config.participants)"
  - "src/harness/useGameStore.ts (draw/judge/roll/next/end/setRemainingMs/startGame/reset bridge, from 02-02)"
  - "src/schema.ts (Mission name/desc/diff for LOOP-02)"
provides:
  - "PlayHarness — the full phase-driven turn UI (draw→judge→roll→move→event→advance) + DOM-owned countdown + 지금 순위로 마치기 manual end"
  - "ResultScreen — winner / 공동 승리 co-winner (teacher-picked) + 다시 시작 / 시작 화면으로 restart paths"
  - "GameHarness — routes null→SetupScreen, gameOver→ResultScreen, else→PlayHarness (the whole loop is playable end to end)"
affects:
  - "src/harness/GameHarness.tsx (replaced the 02-02 placeholder active branch with Play/Result routing)"
tech-stack:
  added: []
  patterns:
    - "Wall-clock countdown lives ONLY in PlayHarness (useEffect + Date.now + setInterval); the engine receives end(reason) only — never a clock value (D-04, Pitfall 1)"
    - "Per-phase control rendering keyed off GameState.phase — the FSM drives the UI, the UI holds no game rules"
    - "Co-winner tie resolution is display-only React state (pickedId); no engine mutation (D-05, Pitfall 2)"
    - "startedAtRef captures the session start once so re-renders don't reset the countdown; effect re-keys on phase and clears its interval (no setInterval leak, T-02-09)"
key-files:
  created:
    - src/harness/PlayHarness.tsx
    - src/harness/PlayHarness.test.tsx
    - src/harness/ResultScreen.tsx
    - src/harness/ResultScreen.test.tsx
  modified:
    - src/harness/GameHarness.tsx
decisions:
  - "Difficulty rendered as friendly Korean labels (easy→쉬움 / normal→보통 / hard→어려움) at awaitingJudgement (LOOP-02)"
  - "Countdown format mm:ss with an immediate first tick so the clock paints instantly instead of after 250ms"
  - "다시 시작 calls startGame(game.config) via the bridge (re-runs createGame → positions/members reset), keeping restart in the engine, not the harness"
  - "endReason drives distinct result copy: reached-finish vs timeout vs manual"
metrics:
  duration_min: 7
  completed: 2026-07-25
  tasks: 2
  files: 5
  tests_total: 140
  tests_added: 15
requirements: [LOOP-01, LOOP-02, LOOP-03, LOOP-04, LOOP-05, LOOP-07, LOOP-08, LOOP-09, LOOP-10]
commits:
  - "da096ee test(02-03): failing tests for phase-driven play loop + DOM countdown"
  - "841e60f feat(02-03): PlayHarness full turn loop + DOM-owned countdown"
  - "885d7a1 test(02-03): failing tests for ResultScreen winner/co-winner + restart"
  - "be09e3d feat(02-03): ResultScreen winner/co-winner + GameHarness routing"
---

# Phase 2 Plan 03: Playable Loop — Play Screen + Countdown + Result Summary

The throwaway plain-DOM play/result harness that wires the pure engine (02-01) and the
setup bridge (02-02) into a game a real person can play start→finish with buttons:
draw a mission → judge 성공/실패 → roll → move → apply the landed event → advance (or
한 번 더), until someone reaches/passes the finish or the 20-min countdown / 지금 순위로 마치기
ends the session on the furthest-along leader. Ties surface as 공동 승리 for the teacher to
resolve, then 다시 시작 or 시작 화면으로.

## What Was Built

- **`PlayHarness` (Task 1)** — the phase-driven play screen. It reads `useGameStore(s => s.game)`
  and renders exactly the control for the current `phase` in the locked loop order (D-06):
  `awaitingDraw`→카드 뽑기 (LOOP-01), `awaitingJudgement`→large mission name/desc/difficulty +
  성공/실패 (LOOP-02/03; 실패 advances with no move, LOOP-04), `awaitingRoll`→주사위 굴리기 (LOOP-05),
  `turnResolved`→roll value + from→to move + event label + a 한 번 더 marker when `extraTurn`,
  with a 다음 button (LOOP-07/08). A turn banner shows the current participant and, in team
  mode, the active member per `memberTurnIndex` (D-01); every token's position is listed.
- **DOM-owned countdown (Task 1, D-04 / Pitfall 1)** — a `useEffect` captures a start
  timestamp in a ref, computes remaining ms from `Date.now()` on a ~250ms `setInterval`,
  pushes it to `setRemainingMs` for a mm:ss display, and at 0 clears the interval and calls
  `end('timeout')`. A 지금 순위로 마치기 button calls `end('manual')`. All wall-clock logic is
  confined to this component; the engine only ever receives `end(reason)`.
- **`ResultScreen` (Task 2)** — maps `game.winners` ids → participant names. A single winner
  shows prominently (LOOP-09); `winners.length > 1` renders 공동 승리 with a radio group so the
  teacher picks the final winner (display-only harness state, D-05 / Pitfall 2). `endReason`
  drives distinct copy (reached-finish vs timeout/manual). 다시 시작 calls `startGame(config)`
  (same-config restart via `createGame`), 시작 화면으로 calls `reset()` → back to SetupScreen (LOOP-10).
- **`GameHarness` (Task 2, edit)** — replaced the 02-02 placeholder branch: `game == null`
  → SetupScreen, `phase === 'gameOver'` → ResultScreen, otherwise → PlayHarness.

## How The Timer Stays Out Of The Engine (D-04 / Pitfall 1)

The countdown never enters `src/engine`. PlayHarness owns `Date.now()` + `setInterval`,
and the only thing crossing the boundary is `end('timeout' | 'manual')`. The engine's
`endGame` computes the furthest-along leader(s) purely from `participants[].position` — no
clock read — so timeout resolution stays deterministically unit-tested (02-01).

## Verification

- `npm run test` — **19 files, 140 tests pass** (15 added here: PlayHarness 9 + ResultScreen 6; all prior suites green)
- `npm run build` — `tsc -b` type-checks and `vite build` succeeds with all three game screens wired
- **Engine stays clock-free:** `grep -rnE "Date\.now|setInterval|performance\.now" src/engine` matches
  only two lines — both are the CONTRACT COMMENTS in `engine.ts`/`types.ts` that name the banned
  APIs; no executable clock code exists (`grep … | grep -vE ':\s*//'` returns nothing). Pitfall 1 holds.

## Deviations from Plan

None — plan executed as written. (Two test assertions were tightened during GREEN because a
participant name / roll value legitimately appears in more than one place on screen — the banner
and the position list — which is correct component behavior, not a bug; `vi.spyOn` also calls
through by default, so button-wiring tests use `.mockImplementation(() => {})` to isolate the click
from real state transitions.)

## Requirements Delivered

LOOP-01, LOOP-02, LOOP-03, LOOP-04, LOOP-05, LOOP-07, LOOP-08, LOOP-09, LOOP-10 — honoring
D-01 (team shared token + member rotation banner), D-04 (20-min countdown + manual end → leader
wins), D-05 (co-winner tie → teacher picks), D-06 (locked loop order).

## Known Stubs / Placeholders (intentional — Phase 3 replaces this)

- The entire play/result UI is a **throwaway plain-DOM harness** (D-09). Phase 3 replaces it with
  the child-friendly 3D board (token movement, dice animation, character reactions). There is no
  3D, no animation, no sound here by design — the goal was to prove the full loop runs on the
  pure engine before building the real UI.
- Difficulty/character are plain text/labels; real art is Phase 3~4.

## Self-Check: PASSED

All 5 source artifacts + SUMMARY.md exist on disk; all 4 task commits (da096ee, 841e60f, 885d7a1, be09e3d) present in git history.
