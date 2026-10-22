---
phase: 05-rules-engine-settings
plan: 03
subsystem: engine
tags: [engine, fsm, ring-board, undo, rounds, fuzz, tdd]
status: complete
requires:
  - "05-02: ring.moveBy, board.buildBoard/shuffle/DIFF_ORDER, scoring.starsFor/winnersByStars, animals.AnimalId"
provides:
  - "src/engine/state.ts: v2 types Phase, EndReason, FailRule, StartBonus, BoardSize, Participant, GameRules, GameConfig, GameContent, QuestCard, TurnInfo, MoveResult, JudgementResult, GameEvent, GameLog, GameStateCore, GameState, UndoSnapshot"
  - "src/engine/game.ts: createGame, rollDice, judge, undoJudgement, advanceTurn, endGame, canUndo, willEndOnAdvance, currentParticipant, activeMember"
  - "src/engine/testkit.ts: scriptedRng, dice, questTile, eventTile, boardWith, mission, event, player, makeGame (+ defaultMissions, patchParticipant)"
affects: [05-04, 05-05, 06]
tech-stack:
  added: []
  patterns:
    - "Content snapshot inside state (board + per-difficulty pool/decks) so transitions never take content arguments"
    - "Undo snapshot = GameStateCore (everything except undo and log); log seq never rewinds"
    - "Per-transition domain event log (seq +1, events = this transition only) for the Phase 6 director"
    - "Single turn-exit path (advanceTurn) with the extra branch first and one round-increment site"
key-files:
  created:
    - src/engine/state.ts
    - src/engine/game.ts
    - src/engine/testkit.ts
    - src/engine/game.test.ts
    - src/engine/fuzz.test.ts
  modified: []
decisions:
  - "05-03: v2 FSM lives in new files state.ts/game.ts; v1 engine.ts/types.ts/placement.ts untouched until 05-05 removes them"
  - "05-03: Deck draw takes from the end; empty deck refills from the pool snapshot; retryNew picks the last deck entry with a different id and refills at most once (Pitfall 8)"
  - "05-03: A forward/backward event with steps 0 does not move and resolves the turn on the event tile"
  - "05-03: Finishing on rounds-complete keeps round = rules.rounds; finish() clears card and undo, keeps lastMove"
metrics:
  duration: "6min"
  completed: "2026-10-23"
  tasks: 2
  files: 5
---

# Phase 5 Plan 03: v2 Ring-Board Rules FSM Summary

`createGame` takes one snapshot of the content (board, plus a mission pool and shuffled deck per difficulty). After that, the turn rules all run as pure transitions with no content arguments: move around the ring, start bonus at most once per turn, one event per landing with no chaining, extra-turn cap, quest draws, three fail rules with one retry, last-judgement undo, rounds and team rotation, and manual end. Scenario tests pin the rules down, and a 300-seed whole-game fuzz checks the invariants.

## What Was Built

- **state.ts**: the type-only v2 state model, copied exactly from the plan interface. FailRule, StartBonus and BoardSize are plain unions, so the engine never imports the settings store.
- **game.ts**:
  - `createGame` resets participants (an empty `memberNames` becomes `[name]`), clamps `rounds` to an integer of at least 1, calls `buildBoard` once and snapshots pool and decks. Its log is `{seq 1, [gameStarted, turnStarted]}`.
  - `rollDice` does the dice move with `moveBy(p, roll, L, !turn.bonusPaid)`, then at most one forward/backward event move through the same `moveBy`. If the final square is a quest, it draws a card. On an extra square it grants an extra turn, or suppresses it during an extra turn. It also clears undo and `lastJudgement`.
  - `judge` takes the undo snapshot before applying the verdict. On success it adds the full star value for the square's difficulty (D-14). On a failure it applies retrySame, retryNew or noStar. It never calls `advanceTurn`.
  - `undoJudgement` restores the snapshot with `seq + 1`.
  - `advanceTurn` handles the extra branch first (D-18), rotates only the leaving team's member, and increments the round in exactly one place.
  - `endGame('manual')` voids any pending card and picks the tied leaders as winners.
  - Selectors.
- **testkit.ts**: pure helpers for deterministic tests. `dice(...faces)` scripts exact die faces, `boardWith` builds a hand-made ring, and `makeGame` accepts board and patch overrides.
- **game.test.ts**: 53 scenario tests, which reference D-07/D-08/D-09/D-14/D-15/D-16/D-17/D-18/D-21/D-22.
- **fuzz.test.ts**: 300 seeds covering random solo/team mode, 1–8 participants, 1–6 rounds, every fail rule, start bonus and board size, and events including weight 0. Invariants checked: stars never decrease, `position === wrap(travel)`, round stays in [1, rounds], board reference never changes, seq goes up by exactly 1, the quest card matches the difficulty of the square underneath, no two extra turns in a row, the game always ends with `rounds-complete`, every participant gets exactly `rounds` regular turns, and winners equal `winnersByStars`. Runtime is about 3 s.

## Verification

- `npx tsc -b && npx vitest run`: 32 files, 622 tests passed.
- `src/engine/fuzz.test.ts`: about 3.2 s, under the 20 s limit.
- Acceptance greps:
  - Forbidden imports and tokens: none found.
  - `moveBy(`: 2 occurrences. `buildBoard(`: 1.
  - `round + 1` in non-comment lines: 1.
  - `advanceTurn(` inside `judge` and `rollDice`: 0.
  - Phase and EndReason union lines: 1 each.
- `git diff --exit-code HEAD -- src/engine/engine.ts src/engine/types.ts src/engine/placement.ts src/harness`: clean.

## Commits

| Task | Gate | Commit | Message |
|------|------|--------|---------|
| 1 | RED | 44eaed8 | test(05-03): add failing tests for v2 createGame/rollDice |
| 1 | GREEN | d7366ae | feat(05-03): implement v2 createGame and rollDice |
| 1 | fix | 9894d71 | fix(05-03): keep testkit header free of forbidden-token grep hits |
| 2 | RED | c0e1246 | test(05-03): add failing tests for judge/undo/advanceTurn/endGame and fuzz |
| 2 | GREEN | 127266f | feat(05-03): implement judge, undo, advanceTurn, endGame and selectors |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The testkit header comment tripped the purity grep**
- **Found during:** Task 1 acceptance check
- **Issue:** The header comment in testkit.ts contained the literal token `Math.random`, so the forbidden-token grep printed a match.
- **Fix:** Reworded the comment to "no global randomness (Rng only)".
- **Files modified:** src/engine/testkit.ts
- **Commit:** 9894d71

**2. [Rule 2 - Robustness] Defensive handling of an empty mission pool**
- `drawFromDeck` returns `mission: null` when `pool[diff]` is empty, and `rollDice` then resolves the turn instead of getting stuck. Under `buildBoard` this cannot happen; the guard only matters for hand-made boards.
- retryNew falls back to the top card if every pool entry shares the avoided id.
- No commit of its own; included in d7366ae and 127266f.

### Additions

- testkit also exports `defaultMissions` and `patchParticipant` for scenario setup. These are additive and pure.

## TDD Gate Compliance

Both tasks have a `test(...)` RED commit followed by a `feat(...)` GREEN commit. During the Task 2 RED run, only the selector test passed, because Task 1 had already implemented `currentParticipant` and `activeMember`. Every other new test failed as expected.

## Known Stubs

None.

## Threat Flags

None. These are pure engine files with no new I/O surface. The mitigations for T-05-09 to T-05-12 are implemented and tested: phase guards with identity tests, round clamping plus a single round-increment site plus deck refill plus a fuzz test proving every game ends, stars that only ever increase, and undo with domain log events.

## Self-Check: PASSED

- FOUND: src/engine/state.ts, src/engine/game.ts, src/engine/testkit.ts, src/engine/game.test.ts, src/engine/fuzz.test.ts
- FOUND commits: 44eaed8, d7366ae, 9894d71, c0e1246, 127266f
