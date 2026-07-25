---
plan: 02-01
phase: 2
title: 헤드리스 게임 엔진 + 격리 RNG
status: complete
requirements: [LOOP-01, LOOP-03, LOOP-04, LOOP-05, LOOP-07, LOOP-08, LOOP-09, EVENT-06, MISSION-07]
key_files:
  created:
    - src/engine/types.ts
    - src/engine/rng.ts
    - src/engine/placement.ts
    - src/engine/setup.ts
    - src/engine/engine.ts
    - src/engine/rng.test.ts
    - src/engine/placement.test.ts
    - src/engine/setup.test.ts
    - src/engine/engine.test.ts
  modified:
    - src/schema.ts
commits:
  - 2e1f407 test(02-01): failing distribution + edge tests for isolated RNG
  - 683e062 feat(02-01): isolated seedable RNG + pure engine types
  - a711e5c test(02-01): failing tests for event placement + setup builders
  - b03b5ff feat(02-01): weighted event placement + setup builders + empty guard
  - 6180c54 test(02-01): failing turn-FSM engine tests
  - 93fd47a feat(02-01): turn-FSM engine (win/overshoot/timeout-leader/team) + Effect type export
provides:
  - "Pure headless game engine (src/engine/*) — NO React/DOM/wall-clock imports; the Phase 3 contract"
  - "engine.ts: createGame, drawCard, judge, rollDice, advanceTurn, endGame, resetGame (turn FSM)"
  - "rng.ts: injectable Rng interface, mulberry32 (seedable/test), systemRng (runtime), rollDie, weightedPick, uniformPick"
  - "placement.ts: placeEvents — weight-based event assignment to board squares (EVENT-06)"
  - "setup.ts: BoardPreset short/normal (boardLengthFor), DEFAULT_TIME_LIMIT_MS (20min), buildParticipants, canStart (empty-mission guard, MISSION-07)"
  - "types.ts: GameState, Participant, GameConfig, Phase FSM, LandingResult, EndReason"
  - "schema.ts: Effect/Difficulty/EventLabel type aliases (value+type share one name)"
---

# Plan 02-01 Summary — 헤드리스 게임 엔진 + 격리 RNG

## What was built

A **pure, framework-agnostic TypeScript game engine** under `src/engine/` — no React, DOM, or wall-clock (`Date.now`/`setInterval`) imports, enforced by grep purity gates. This is the durable contract Phase 3 will reuse behind the 3D UI.

- **Turn FSM** (`engine.ts`): `awaitingDraw → awaitingJudgement → awaitingRoll → turnResolved → gameOver`, driven by pure transitions `drawCard / judge / rollDice / advanceTurn / endGame / resetGame`.
- **Isolated RNG** (`rng.ts`): injectable `Rng` interface; `mulberry32(seed)` for deterministic tests, `systemRng()` at runtime; `rollDie`, `weightedPick`, `uniformPick`.
- **Weighted event placement** (`placement.ts`, EVENT-06): `placeEvents` assigns Phase-1 events to board squares by `weight`; handles all-zero weights / no events / short boards.
- **Setup builders** (`setup.ts`): board-length presets `short`(짧게, default) / `normal` as the ~20-min duration lever (D-02); `DEFAULT_TIME_LIMIT_MS = 20min` (D-04); `buildParticipants` (solo + team-shared-token); `canStart` blocks start on empty mission list (MISSION-07).
- Reuses Phase 1 `src/schema.ts` (`Mission`/`Event`/`Effect`) and does **not** duplicate the data model.

## Win / timeout rules (locked decisions)

- **D-03 normal win:** first to **reach or pass** the finish — overshoot allowed, no exact-landing, no upper clamp.
- **D-04 timeout/manual end:** `endGame(reason)` (engine has NO wall-clock — the DOM harness owns the countdown); the **furthest-along** participant wins.
- **D-05 tie:** participants tied at the max position become **co-winners** (teacher resolves later).
- **D-01 team:** a team is one `Participant` sharing a single token with `memberTurnIndex`; members alternate.

## Decision recorded for UAT (checker warning #1)

**"한 번 더"(extra) in team mode repeats the SAME team member** (same participant + same member goes again). CONTEXT.md did not lock this rule-feel; RESEARCH flagged it MEDIUM. Implemented as a reasonable default and isolated to one branch so it can flip if the instructor prefers "next member on extra." → surface in UAT.

## Verification

- **116 tests pass** (`vitest run`), incl. 45 engine tests: FSM 16 · placement 8 · RNG 10 · setup 11 — with **distribution tests** (dice fairness, weighted-placement ratio) per the roadmap.
- **`npm run build` succeeds** (`tsc -b` + vite). Fixed a build blocker: engine imported `Effect` as a type but Phase 1 only exported it as a Zod value — added `export type Effect` (+ Difficulty/EventLabel) aliases to `schema.ts`.
- Purity gates hold: no React/DOM/`Date.now`/`setInterval` in `src/engine/`.

## Notes

- Executor crashed (API connection) just before writing this SUMMARY; the FSM impl + schema fix were completed and committed during orchestrator recovery. All work is on `main`-tracked commits above.
- Zero new dependencies (no three.js/R3F/physics — deferred to Phase 3).
