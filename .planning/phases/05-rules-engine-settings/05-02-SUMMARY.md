---
phase: 05-rules-engine-settings
plan: 02
subsystem: engine
tags: [engine, ring-board, scoring, board-generation, animals, tdd]
status: complete
requires: []
provides:
  - "src/engine/ring.ts: wrap/lapOf/walkPath/moveBy (travel + lapsCredited start-bonus rule)"
  - "src/engine/scoring.ts: STARS_BY_DIFF/starsFor/winnersByStars/rankByStars"
  - "src/engine/board.ts: Tile types, DIFF_ORDER/DIFF_RATIO, eventTileCount, apportion, tileQuotas, chooseNonAdjacent, shuffle, buildBoard"
  - "src/engine/animals.ts: ANIMALS/AnimalId/isAnimalId/assignAnimals"
  - "src/engine/setup.ts: SECONDS_PER_TURN, estimateMinutes, ContentAnalysis, analyzeContent"
affects: [05-03, 05-04, 05-05]
tech-stack:
  added: []
  patterns:
    - "Unwrapped travel + lapsCredited as the single source of truth for start bonus"
    - "Hamilton largest-remainder apportionment for tile quotas"
    - "Uniform non-adjacent subset via offset trick (no rejection loop)"
    - "Event tiles store an object copy, not an id"
key-files:
  created:
    - src/engine/ring.ts
    - src/engine/ring.test.ts
    - src/engine/scoring.ts
    - src/engine/scoring.test.ts
    - src/engine/board.ts
    - src/engine/board.test.ts
    - src/engine/animals.ts
    - src/engine/animals.test.ts
  modified:
    - src/engine/setup.ts
    - src/engine/setup.test.ts
decisions:
  - "05-02: Start bonus judged only in ring.moveBy; lapsCredited always raised to max(lap) even when the per-turn cap blocks payment (D-09, A1)"
  - "05-02: buildBoard throws on zero missions and uses only weight>0 events; square 1 is the easiest available difficulty (A2)"
  - "05-02: apportion remainder ties break by key insertion order (DIFF_ORDER), deterministic without RNG"
metrics:
  duration: "4min"
  completed: "2026-10-23"
  tasks: 3
  files: 10
---

# Phase 5 Plan 02: Ring Rules Building Blocks Summary

순환판 v2 규칙에 쓸 순수 엔진 모듈을 v1 코드 옆에 추가했다. ring.ts는 travel/lapsCredited로 이동과 출발 보너스(D-09)를 계산하고, scoring.ts는 난이도별 별과 공동 우승·경쟁 순위를 정한다. board.ts는 시드로 재현되는 보드를 만든다. 이벤트 칸은 서로 붙지 않게 균등 추출하고, 칸 수는 최대잉여법으로 나누며, 1번 칸은 가장 쉬운 퀘스트로 둔다. animals.ts는 참가자마다 서로 다른 동물을 배정하고, setup.ts에는 예상 시간 계산과 콘텐츠 누락 분석을 더했다.

## What Was Built

- **ring.ts**: `moveBy`가 D-09를 혼자 판정한다. `bonusEarned = steps > 0 && canEarnBonus && lap > lapsCredited`이고, 보너스를 줄 수 없을 때도 `lapsCredited = max(lapsCredited, lap)`으로 갱신한다. 그래서 이중 지급, 뒤로 넘을 때 지급, 가만히 있는데 지급되는 경우가 생기지 않는다. 검증은 L 16/20/24에서 약 1.5만 케이스를 도는 전수 속성 테스트, L=20 검증표 시나리오, A1(뒤로 넘었다가 다시 출발 칸 도착) 케이스로 했다.
- **scoring.ts**: `starsFor`는 쉬움 1, 보통 2, 어려움 3이다. `winnersByStars`는 최다 별 전원을 돌려주고 전원 0점이면 모두 우승이다. `rankByStars`는 별 내림차순, 같은 별은 입력 순서를 유지하며 1,1,3 순위를 매긴다.
- **board.ts**: `tileQuotas`는 16/20/24칸에서 RESEARCH 표 값(7/5/2, 5/4/2, 8/6/3, 이벤트 없음 9/7/3, 어려움 없음 8/6)과 정확히 일치한다. `chooseNonAdjacent`는 비인접 수용치를 넘으면 RangeError를 던진다. `buildBoard`는 이벤트 객체 사본을 저장하고, 가중치 6/3/1의 실제 비율이 ±5%p 안에 든다.
- **animals.ts**: D-24 순서로 8종을 둔다. 2-pass 배정이라 결과는 항상 서로 다르다. 유효한 선택은 먼저 예약하고, 남은 자리는 아직 안 쓴 첫 종으로 채운다.
- **setup.ts (추가분)**: `estimateMinutes`(2×5=8, 3×5=12, 4×5=15, 8×5=30)와 `analyzeContent`를 더했다. `analyzeContent`는 미션이 0개일 때만 막는다. 이때 v1 안내 문구를 그대로 쓴다. 기존 v1 export는 그대로 두었고 05-05에서 제거한다.

## Verification

- `npx tsc -b` 통과, `npx vitest run` 30 files / 269 tests green
- `git diff --exit-code HEAD -- src/engine/engine.ts src/engine/types.ts src/engine/placement.ts src/engine/rng.ts`: 변경 없음
- 금지 패턴(react/store/settings import, Date.now, timers, Math.random) grep: 새 엔진 파일 4개 모두 0건
- board.ts에 `.sort(() =>` 0건, `while (true)` 0건, `weightedPick(` 1건

## TDD Gate Compliance

태스크마다 RED(`test(...)`) 다음에 GREEN(`feat(...)`) 커밋 순서를 지켰다.
- Task 1: 74a74d5 (test) → 0f08638 (feat)
- Task 2: 9e04019 (test) → 0bae731 (feat)
- Task 3: ec520cf (test) → a4212da (feat)

RED 단계 테스트가 예상보다 먼저 통과한 경우는 없었다. 새 모듈은 RED 시점에 존재하지 않았고, setup 추가분 테스트 6개도 실패했다.

## Deviations from Plan

None - plan executed exactly as written.

(사소한 정리 하나: setup.test.ts에 추가한 import는 파일 맨 아래가 아니라 기존 최상단 import 블록에 합쳤다. 기존 테스트 본문은 수정하지 않았다.)

## Threat Mitigations

- T-05-06: `chooseNonAdjacent`는 거부 루프 없이 균등 추출하고, 수용치를 넘으면 RangeError를 던진다. 미션이 0개면 `buildBoard`가 Error를 던진다. 16/20/24칸 모두에서 이벤트 수가 수용치 이하라는 점은 테스트로 고정했다.
- T-05-07: 셔플은 주입 RNG를 쓰는 Fisher–Yates다. 가중치 비율은 2000개 시드 통계 테스트로 확인했다.
- T-05-08: 보너스 판정은 `moveBy` 한 곳에서만 하고 전수 속성 테스트로 고정했다.

## Known Stubs

None.

## Commits

- 74a74d5 test(05-02): add failing tests for ring math and star scoring
- 0f08638 feat(05-02): implement ring move math and star scoring
- 9e04019 test(05-02): add failing tests for ring board generator
- 0bae731 feat(05-02): implement ring board generator
- ec520cf test(05-02): add failing tests for animal assignment and setup helpers
- a4212da feat(05-02): add animal assignment and start-screen helpers

## Self-Check: PASSED
