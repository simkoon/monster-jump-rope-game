---
phase: 08-success-fx-awards
plan: 01
subsystem: engine
status: complete
tags: [engine, stats, awards, badges, fuzz, tdd]
requires: []
provides:
  - "PlayerStats type and GameStateCore.stats (undo snapshots carry it)"
  - "src/engine/stats.ts: EMPTY_STATS, initStats, bumpStats, isLuckyEvent"
  - "src/game/awards.ts: BadgeId, BADGE_PRIORITY, MAX_SHOWN_BADGES, awardBadges, displayBadges"
affects: [08-04, 08-10]
tech-stack:
  added: []
  patterns:
    - "Stats live in GameStateCore so snapshotOf/undoJudgement restore them automatically"
    - "isLuckyEvent is the single source for the 🍀 badge and the 3D sparkle-vs-puff choice"
key-files:
  created:
    - src/engine/stats.ts
    - src/engine/stats.test.ts
    - src/game/awards.ts
    - src/game/awards.test.ts
  modified:
    - src/engine/state.ts
    - src/engine/game.ts
    - src/engine/game.test.ts
    - src/engine/fuzz.test.ts
decisions:
  - "A rule whose maximum is 0 awards nobody (RESEARCH A1), including 도전왕/여행왕; those players get 🎉 응원왕"
  - "luckyCount +1 per start bonus actually paid (startBonus > 0) and +1 per lucky resolved event; one roll can count twice"
  - "Badge copy (emoji/name/title) stays out of awards.ts; 08-10 adds it to labels.ts"
metrics:
  duration: "~6 min"
  completed: 2026-10-24
  tasks: 2
  files: 8
---

# Phase 8 Plan 01: Engine game stats + pure praise badges Summary

엔진이 참가자별 통계 6종(attempts, successes, failures, retrySuccesses, hardSuccesses, luckyCount)을 순수하게 누적한다. 그 통계와 travel만 보고 모든 참가자에게 칭찬 배지를 1개 이상 주는 결정적 함수 `awardBadges`/`displayBadges`도 만들었다(D-14, D-15, END-02).

## What Was Built

### Task 1: engine stats (D-15)
- `state.ts`: `PlayerStats` 인터페이스를 추가했다. `GameStateCore.stats: Readonly<Record<string, PlayerStats>>`가 core에 있으므로 undo 스냅샷이 통계를 함께 담는다.
- `stats.ts` (신규, 순수): `EMPTY_STATS`(frozen), `initStats`, `bumpStats`(새 record 반환, 입력 불변), `isLuckyEvent`(막힌 extra → false, 라벨 보너스 → true, 함정 → false, 그 외 eff !== backward).
- `game.ts`: `createGame`이 모두 0으로 초기화한다(다시 하기도 createGame을 거침). `judge`는 세 반환 경로 모두에 `stats`를 넣는다. 성공 시 attempts/successes를 올리고, attempt 2면 retrySuccesses, ⭐3이면 hardSuccesses도 올린다. 실패 두 경로는 attempts/failures를 올린다. `rollDice`는 출발 보너스가 실제로 지급될 때(bonusStars > 0)와 도착한 이벤트가 `isLuckyEvent`일 때 luckyCount를 1씩 올린다. `endGame`/`advanceTurn`/`undoJudgement`에는 통계 코드가 없다(state를 펼치거나 스냅샷을 복원하므로).
- 테스트: `stats.test.ts` 10개, `game.test.ts`의 `stats (D-15)` 블록 18개, 퍼즈 300판의 모든 전환에 불변식 추가. 통계 단조 증가, attempts = successes + failures, retry/hard ≤ successes, pid별 judged 이벤트 수 = attempts, 성공 judged 수 = successes, luckyCount ≥ startBonus 이벤트 수, 게임 종료 시 stars = Σ judged.stars + Σ startBonus.stars.

### Task 2: praise badges (D-14)
- `src/game/awards.ts` (신규, 순수, React/three 없음): 규칙을 우선순위 순서로 적용한다(master ← hardSuccesses, persistent ← retrySuccesses, lucky ← luckyCount, traveler ← travel, challenger ← attempts). 최댓값과 같은 사람은 모두 받고, 최댓값이 0인 규칙은 아무에게도 주지 않는다(A1). 배지가 없는 사람은 `cheer`를 받는다. `displayBadges`는 앞에서부터 최대 2개를 보여준다.
- 테스트 11개: 규칙·동점·0 최댓값·cheer 단독·우선순위·결정성·입력 불변을 확인한다. 속성 테스트는 2–8명으로 300판을 실제 엔진 퍼즈로 돌리고 무작위 통계표 500개를 더 넣었다. 모두 ≥ 1개, 표시 1–2개이고, 참가자 순서를 바꿔도 배지 집합은 같다.

## Verification

- `npx vitest run src/engine src/game/awards.test.ts`: 10 files, 462 tests 통과
- `npm test` (전체): **66 files, 1214 tests 통과** (dataPreservation 포함)
- `npm run build` (`tsc -b && vite build`): 통과. 기존 청크 크기 경고만 있음
- `git diff --exit-code HEAD -- src/schema.ts src/store.ts src/lib/io.ts src/settings.ts`: 변경 없음(저장 형식·백업·설정 그대로)
- 인수 grep 전부 기대값: PlayerStats 1, stats 필드 1, stats.ts export 4, 순수성 0, `bumpStats(` 4회, awards export 각 1, `MAX_SHOWN_BADGES = 2` 1, react/three import 0

## TDD Gate Compliance

- Task 1: RED `0b615f9` (test) → GREEN `4b9afb7` (feat)
- Task 2: RED `92b87c7` (test) → GREEN `50a113d` (feat)
- REFACTOR 커밋은 필요 없었다.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 RED | 0b615f9 | test(08-01): add failing tests for per-participant game stats |
| 1 GREEN | 4b9afb7 | feat(08-01): accumulate per-participant game stats in the engine |
| 2 RED | 92b87c7 | test(08-01): add failing tests for praise badge assignment |
| 2 GREEN | 50a113d | feat(08-01): pure praise badge assignment awardBadges/displayBadges |

## Deviations from Plan

None. 계획대로 실행했다. 기존 테스트 중 GameState 전체를 toEqual로 비교하는 것이 없어서 기대값을 고친 곳도 없다.

## Known Stubs

None.

## Threat Flags

None. 새 네트워크·저장·입력 경로는 없다. 통계는 메모리 안의 게임 상태에만 있다(T-08-01). undo 복원은 테스트로 고정했다(T-08-02). 통계가 없는 pid와 최댓값 ≤ 0은 처리했다(T-08-03).

## Self-Check: PASSED

- FOUND: src/engine/stats.ts, src/engine/stats.test.ts, src/game/awards.ts, src/game/awards.test.ts
- FOUND commits: 0b615f9, 4b9afb7, 92b87c7, 50a113d
