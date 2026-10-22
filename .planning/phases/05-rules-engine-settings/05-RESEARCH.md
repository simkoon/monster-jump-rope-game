# Phase 5: 새 규칙 엔진 & 강사 설정 - Research

**Researched:** 2026-10-22
**Domain:** 순수 TypeScript 게임 규칙 엔진(순환판·별·라운드) + Zustand persist 데이터 보존 + 임시 DOM 화면
**Confidence:** HIGH (현재 코드·node_modules 소스를 직접 읽고 Zod/수학을 실행해 확인함. 새 외부 패키지 없음)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### 이미 확정된 규칙 (요구사항·마일스톤 결정에서 이어받음)
- **D-01:** 게임은 라운드 수로만 끝난다. 시간 제한 타이머는 없다 — v1 타이머·카운트다운(`timeLimitMs`, `DEFAULT_TIME_LIMIT_MS`, `remainingMs`)은 삭제하고 `EndReason = 'rounds-complete' | 'manual'`.
- **D-02:** 별은 쉬움 ⭐1 / 보통 ⭐2 / 어려움 ⭐3. 별은 어떤 경우에도 줄지 않는다.
- **D-03:** 실패 규칙 3종 — 같은 미션 한 번 더(기본) / 다른 미션으로 한 번 더 / 별 없이 다음 차례. 재도전은 1회까지이고, 재도전에서도 실패하면 별 없이 다음 차례.
- **D-04:** 강사 설정(실패 규칙·기본 라운드 수·출발 보너스·보드 크기)은 콘텐츠와 **별도 persist 키**에 저장한다. `ContentSchema`/`SCHEMA_VERSION`(=1)과 persist `name`(`powerjumping_content_v1`)은 올리거나 바꾸지 않는다 → v1 기기 데이터와 v1 백업 파일 호환 유지. 백업 JSON에는 설정이 들어가지 않는다.
- **D-05:** 데이터 보존 작업(v1 저장 데이터 픽스처 + v1 백업 파일 픽스처 테스트)을 엔진 작업보다 **먼저** 한다. 현재 identity `migrate`는 버전 상향 시 강사 미션을 시드로 덮어쓸 수 있으므로, 버전을 올리지 않더라도 회귀 테스트로 고정한다.
- **D-06:** 출발 보너스 기본 +1(끔/+1/+2), 보드 크기 기본 20칸(16/20/24).
- **D-07:** 이벤트 연쇄 없음 — 이벤트로 이동해 퀘스트 칸에 닿으면 그 퀘스트를 수행하고, 이벤트·출발 칸에 닿으면 더 해결하지 않는다.
- **D-08:** "한 번 더"는 같은 플레이어/팀이 추가 턴, 라운드에 세지 않고 연속 1회까지.
- **D-09:** 출발 보너스 — 앞으로 지나가거나(주사위 이동 또는 이벤트 전진) 정확히 멈추면 지급, 뒤로 지날 때는 없음, 같은 바퀴에 두 번 없음(바퀴 기록으로 이중 지급 방지), 한 턴 최대 1회.

#### 보드 칸 구성
- **D-10:** 칸 비율 — 출발 칸 1개를 뺀 나머지의 약 75%가 퀘스트, 약 25%가 이벤트. 20칸 = 출발 1 + 퀘스트 14 + 이벤트 5. 16·24칸도 같은 비율(반올림, 이벤트 최소 1칸).
- **D-11:** 퀘스트 칸 난이도 비율 — 쉬움 50% / 보통 35% / 어려움 15% (14칸이면 약 7/5/2).
- **D-12:** 배치 — 매 게임 시작 때 무작위로 섞되 규칙 2개: 이벤트 칸끼리 붙지 않는다, 출발 바로 다음 칸은 쉬운 퀘스트. 이벤트 칸의 이벤트는 편집기 가중치(weight)로 뽑는다(weight 0은 놓이지 않음). 배치는 게임 내내 바뀌지 않는다(BOARD-04).
- **D-13:** 어떤 난이도의 미션이 0개면 시작 화면에서 "어려움 미션이 없어서 어려움 칸 없이 판을 만들어요" 식으로 안내하고, 그 난이도 칸을 빼고(남은 난이도 비율대로 채워) 진행한다. 미션이 아예 0개일 때만 시작을 막는다(SETUP-09, v1 MISSION-07 확장). 이벤트가 0개(또는 가중치 합 0)면 이벤트 칸 없이 퀘스트로 채운다.

#### 실패·재도전·되돌리기
- **D-14:** 재도전에서 성공해도 별은 칸 난이도대로 **그대로 다** 받는다(감점 없음).
- **D-15:** 실패 규칙이 "다른 미션으로 한 번 더"인데 그 난이도 미션이 1개뿐이면 **같은 미션으로 재도전**한다.
- **D-16:** 판정 되돌리기 — **직전 판정 1회만**, **다음 주사위를 굴리기 전까지만** 가능. 주사위를 굴리면 되돌리기 기회가 사라진다.
- **D-17:** 되돌리면 **판정 화면으로 돌아간다** — 그 판정으로 받은 별과 재도전 횟수가 판정 전으로 복원되고, 같은 미션 카드가 다시 뜨며 강사가 성공/실패를 다시 고른다(직전 상태 스냅샷 방식).

#### 라운드·한 번 더·예상 시간 (사용자 지시: 추천안으로 확정)
- **D-18:** "한 번 더"는 마지막 라운드의 마지막 플레이어에게도 **똑같이 허용**한다(규칙 예외 없음). 그 추가 턴이 끝난 뒤 게임이 끝난다.
- **D-19:** 기본 라운드 수 **5**, 고를 수 있는 범위 **1~20**(설정 화면과 시작 화면 모두 큰 −/+ 스텝퍼).
- **D-20:** 예상 소요 시간 = 참가자(플레이어/팀) 수 × 라운드 수 × **45초**, 분 단위로 올림해 "약 N분"으로 표시. "한 번 더"·재도전 시간은 계산에 넣지 않는다.
- **D-21:** 팀전 — 팀 단위로 턴을 세고 팀원이 돌아가며 수행(v1 `memberTurnIndex` 순환 유지). 재도전과 "한 번 더"는 **같은 팀원**이 이어서 한다.
- **D-22:** "지금 끝내기"는 확인 대화상자를 거쳐 즉시 종료. 판정 대기 중인 퀘스트는 별 없이 무효 처리하고 현재 별로 우승을 정한다(동점은 공동 우승).

#### 설정 화면·임시 플레이 화면 (사용자 지시: 추천안으로 확정)
- **D-23:** 강사 설정은 **편집기에 새 "설정" 탭**(미션·이벤트 탭 옆)으로 둔다. 항목: 실패 규칙(3택), 기본 라운드 수(스텝퍼), 출발 보너스(끔/+1/+2), 보드 크기(16/20/24). 기존 SegmentedControl 등 편집기 컴포넌트 재사용. 바뀌면 즉시 자동 저장.
- **D-24:** 동물 고르기 — v1 `character: 'boy'|'girl'`을 `animal`(종 id)로 교체. Phase 5 후보 8종: 곰·토끼·고양이·강아지·판다·여우·돼지·병아리(최종 종 목록·3D 모습은 Phase 7에서 확정). 시작 화면에서는 이모지 큰 버튼으로 고르고, 참가자마다 **서로 다른 동물이 자동 배정**되며 이미 고른 동물은 다른 참가자가 고를 수 없다(최대 8명 = 8종).
- **D-25:** 시작 화면(SetupView) 개편 — 개인전/팀전·인원·이름·팀원은 v1 그대로, 보드 프리셋·시간 제한 UI는 삭제(보드 크기는 설정에서), 라운드 수(설정 기본값이 초깃값) + 예상 소요 시간 + 난이도 누락 안내 추가.
- **D-26:** 임시 플레이 화면은 **기능 위주 최소 DOM**: 칸 목록을 링 순서대로 보여 주는 단순 칸 줄(칸 종류·난이도 색·말 위치), 별 점수판(별 순), 지금 차례·라운드 표시, 큰 주사위 버튼, 퀘스트 카드(미션 이름·설명·받을 별), 성공/실패 버튼, 되돌리기, 지금 끝내기. 아동용 큰 버튼 원칙은 지키되 연출·애니메이션은 넣지 않는다(Phase 6에서 3D로 교체).
- **D-27:** 임시 결과 화면 — 우승자(공동 우승 포함)와 모든 참가자의 별 개수, 다시 하기/처음으로. 정식 시상식은 Phase 8.
- **D-28:** 새 엔진에서 컴파일되지 않는 v1 2D 보드·결승 레이스 잔재(`boardLayout`, `moveHighlight`, `PositionReadout`, 2D `BoardScene`, 카드 뽑기 단계 `awaitingDraw`, `'reached-finish'`)는 삭제하거나 임시 화면으로 대체한다. Kenney 2D 캐릭터 자산 삭제는 Phase 7.

### Claude's Discretion
- 작은 보드에서 이벤트 이동 칸 수(편집기 최대 20칸): 그대로 순환 적용(한 바퀴 넘게 돌 수 있음), 출발 보너스는 D-09 규칙대로. 편집기 스키마는 바꾸지 않는다.
- 같은 미션 반복 방지: 난이도별로 섞은 덱에서 뽑고 다 쓰면 다시 섞기.
- 엔진 구조: 순수·시계 없음·RNG 주입·불변 전이 계약과 `useGameStore` 단일 seam 유지, 순환 위치 수학(`ring.ts`)·점수(`scoring.ts`) 순수 모듈 분리, FSM `awaitingRoll → awaitingJudgement → turnResolved → gameOver`, 전이마다 도메인 이벤트 로그(Phase 6 Director용) — 연구 ARCHITECTURE 권장안을 따르되 세부는 planner 재량.
- 게임 시작 시 미션·이벤트·설정 스냅샷(게임 중 편집이 진행 중 게임에 영향 없음).
- 설정 persist 키 이름·스키마 형태, 손상된 설정 값은 기본값으로 복구.
- 임시 화면의 레이아웃 세부, 앱 헤더 부제 문구 갱신.

### Deferred Ideas (OUT OF SCOPE)
- 게임 중 라운드 수 바꾸기(QOL-04), 마지막 라운드 별 2배(QOL-05), 난이도 비율 직접 설정(QOL-06) — v2.x 이후(REQUIREMENTS Future).
- 칸 하나하나 편집하는 보드 에디터 — Out of Scope.
</user_constraints>

> **주의 — 연구 문서와 CONTEXT의 충돌:** `.planning/research/ARCHITECTURE.md` §4는 설정을 `ContentSchema` v2의 `settings` 필드에 넣고 `SCHEMA_VERSION=2` + 실제 migrate를 권장한다. **이 권장은 D-04로 폐기되었다.** ARCHITECTURE §4(parseAnyContent, ContentSchemaV2, upgradeV1toV2, replaceAll 시그니처 변경)를 따르면 안 된다. 같은 문서의 시간 제한(`timeLimitMs`, `requestEnd('timeout')`)도 D-01로 폐기됐다. 그 외 엔진 진화 방식(ring/scoring/buildBoard, FSM, 이벤트 로그, 시작 시 스냅샷)은 유효하다.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-05 | v1 기기 저장 미션·이벤트가 v2 후에도 유지 | §Pattern 1 — persist 수화 경로 실측(같은 version이면 migrate·setItem 없음), v1 localStorage 원문 픽스처 + `vi.resetModules()` 부팅 테스트 + tripwire 테스트 |
| DATA-06 | v1 백업 JSON 가져오기 | §Pattern 1 — `io.ts`/`ContentSchema` 무변경, v1 내보내기 원문·구형(필드 누락) 픽스처로 `importContent` 테스트 |
| DATA-07 | 설정은 별도 자동 저장, 백업 미포함 | §Pattern 2 — `powerjumping_settings_v1` 별도 persist + Zod `.catch` 필드별 복구, Header `onExport`는 콘텐츠 스토어만 읽으므로 구조적으로 미포함 + 회귀 테스트 |
| CFG-01 | 실패 규칙 3택 | §Pattern 2 `FailRule = 'retrySame'|'retryNew'|'noStar'`, SettingsTab SegmentedControl |
| CFG-02 | 기본 라운드 수 | §Pattern 2 `defaultRounds` int 1..20 `.catch(5)`, 스텝퍼 |
| CFG-03 | 출발 보너스 끔/+1/+2 | §Pattern 2 `startBonus: 0|1|2 .catch(1)` |
| CFG-04 | 보드 16/20/24 | §Pattern 2 `boardSize: 16|20|24 .catch(20)` |
| SETUP-07 | 동물 배정 | §Pattern 7 `ANIMALS` 8종 + `assignAnimals` 순수 함수(중복 금지·자동 배정) |
| SETUP-08 | 라운드 선택 + 예상 시간 | §Pattern 7 `estimateMinutes(n, rounds) = ceil(n·rounds·45/60)` |
| SETUP-09 | 난이도 누락 안내 | §Pattern 7 `analyzeContent(missions, events)` → `{ok, missingDiffs, notices}` |
| BOARD-04 | 시작 때 배치·게임 중 불변 | §Pattern 4 `buildBoard` (비인접 이벤트 균등 추출 + 최대잉여 할당 + Fisher–Yates), 타일에 이벤트 **객체 사본** 저장 |
| TURN-01 | 주사위 1~6, 순환 이동 | §Pattern 3 `ring.ts` (`wrap`, `travel` 누적 좌표), `rollDie` 재사용 |
| TURN-02 | 퀘스트 칸 미션 뽑기·별 표시 | §Pattern 5 난이도별 덱(시작 시 섞음, pop, 소진 시 재셔플) |
| TURN-03 | 성공 시 난이도별 별 | §Pattern 5 `starsFor(diff)` — **칸 난이도** 기준 |
| TURN-04 | 실패 규칙·재도전 1회·별 불감소 | §Pattern 5 `judge` 단일 해석 지점, `attempt: 1|2` |
| TURN-05 | 이벤트 효과·연쇄 없음 | §Pattern 5 `rollDice` 내 2단 해결(주사위 → 이벤트 1회 → 퀘스트면 퀘스트) |
| TURN-06 | 출발 보너스 규칙 | §Pattern 3 `lapsCredited` 최대값 기록 + 턴당 `bonusPaid` 플래그 |
| TURN-07 | 한 번 더(라운드 미포함·연속 1회) | §Pattern 6 `turn.isExtra`/`turn.extraGranted` |
| TURN-08 | 직전 판정 되돌리기 | §Pattern 6 `undo` 스냅샷(직전 1개, `rollDice`에서 소거, 로그 seq는 단조 증가) |
| ROUND-01 | 라운드 = 전원 정규 턴 1회, 팀 단위 | §Pattern 6 `advanceTurn` 비추가 분기에서만 `next===0 → round+1` |
| ROUND-03 | 라운드 종료 → 별 최다 승리·동점 공동 | §Pattern 6 + `scoring.winnersByStars` |
| ROUND-04 | 확인 후 지금 끝내기 | §Pattern 6 `endGame('manual')`(대기 퀘스트 무효) + 기존 `ConfirmDialog` |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- 기술 스택: React 19 + TypeScript + Zustand 5 persist + Zod 4 + Vite 8 + Vitest 3.2.4. 서버 없음, localStorage + JSON 내보내기/가져오기만. **Phase 5는 새 패키지를 설치하지 않는다**(3D 스택은 Phase 6).
- 아동 대상: UI는 크고 단순하게, 밝게, 텍스트 최소화(임시 화면도 큰 버튼 원칙 유지 — D-26).
- IP: 실제 브랜드·저작권 자산 금지. 동물 선택은 시스템 이모지 사용(자산 추가 없음).
- GSD 워크플로 강제: 파일 변경은 `/gsd-execute-phase` 등 GSD 명령 안에서.
- 기존 확립 규칙(STATE.md Decisions): `.npmrc` legacy-peer-deps 유지, `vite.config.ts`/`vitest.config.ts` 분리 유지, `useGameStore`가 엔진↔콘텐츠의 유일한 seam, `src/engine/*`와 `src/store.ts`는 React/DOM import 금지·엔진은 시계(Date.now/setInterval) 금지.
- 응답·문서 언어: 한국어 선호(코드 식별자는 영어).

## Summary

이번 단계는 **세 덩어리**다. (1) 데이터 보존 + 설정 저장, (2) 순수 규칙 엔진 교체, (3) 그 엔진을 쓰는 임시 DOM 화면과 v1 잔재 삭제. (1)은 다른 것과 독립적이고 위험이 가장 크므로 먼저 한다(D-05).

데이터 보존은 생각보다 단순하다. zustand 5.0.14 `persist`의 수화 코드를 직접 읽어 보니, **저장된 version과 옵션 version이 같으면 `migrate`를 부르지 않고 수화 후 `setItem`도 하지 않는다**(`[false, state]` 경로). D-04대로 `SCHEMA_VERSION=1`·이름·`ContentSchema`를 그대로 두면 v1 기기 데이터는 지금과 똑같은 경로로 읽힌다. `store.ts`는 커밋 48d64a8(Phase 01-01) 이후 한 번도 바뀌지 않았으므로, 지금까지 배포된 저장 형식은 `{"state":{"version":1,"categories":[…],"missions":[…],"events":[…]},"version":1}` 하나뿐이다. 남은 위험은 "누군가 나중에 버전이나 스키마를 바꾸는 것"이다. 그러니 이번 단계의 할 일은 **바꾸지 않는 것 + 바뀌면 깨지는 tripwire 테스트 + 실제 원문 픽스처로 부팅 테스트**다. 설정은 새 키 `powerjumping_settings_v1`의 별도 persist 스토어에 두고, Zod 4의 필드별 `.catch()`로 손상된 값만 기본값으로 복구한다(실행해 확인함). 내보내기(`Header.onExport`)는 콘텐츠 스토어에서 네 필드만 골라 쓰므로 설정은 구조적으로 백업에 들어갈 수 없다.

엔진은 v1 계약(순수·시계 없음·RNG 주입·불변 전이)을 유지하되 내부를 갈아엎는다. 핵심 설계는 다음과 같다. 위치를 `travel`(누적 부호 있는 이동량)로 관리하고 `position = wrap(travel)`, 바퀴 = `floor(travel / L)`로 둔다. 출발 보너스는 "새 바퀴 번호 > `lapsCredited` 그리고 이번 턴에 아직 안 받음"일 때만 준다. 이 한 줄 규칙이 D-09의 모든 경우(정확히 도착, 뒤로 넘기, 같은 바퀴 재통과, 이벤트 전진, 턴당 1회)를 덮는다(스크래치 실행으로 확인). 보드는 비인접 이벤트 위치를 **조합 균등 추출**(거부 루프 없음)로 고르고, 난이도 개수는 **최대잉여법**으로 정한다. 20칸이면 7/5/2로 D-11과 정확히 일치한다. 판정 되돌리기는 `judge` 직전 상태 스냅샷 1개로 처리하고, 라운드는 비추가 턴 분기에서만 증가시킨다.

**Primary recommendation:** 계획 순서는 ① 데이터 보존 tripwire·픽스처 + 설정 스토어·설정 탭 → ② 새 순수 모듈(ring/scoring/board/animals/lobby + v2 FSM)을 **기존 코드 옆에 추가만**(빌드 green 유지) → ③ harness·SetupView·임시 PlayView/ResultView를 새 엔진으로 전환하면서 v1 잔재와 그 테스트를 한 번에 삭제한다. `tsc -b`가 테스트 파일까지 타입 검사하고 CI는 `npm run build`만 돌린다. 그래서 낡은 테스트 하나만 남아도 배포가 깨진다.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| v1 콘텐츠 보존(DATA-05) | Storage (localStorage via `src/store.ts` persist) | — | 저장 형식·키·버전 불변이 곧 보존이다. 코드 변경 없음 + 테스트 |
| v1 백업 가져오기(DATA-06) | Client lib (`src/lib/io.ts`) | Storage | 검증 → 확인 → `replaceAll` 경로 그대로 |
| 강사 설정 저장(DATA-07, CFG-*) | Storage (새 `settings` persist 스토어) | Browser UI (`SettingsTab`) | 콘텐츠와 분리된 키, Zod 필드별 복구 |
| 규칙 판정(이동·보너스·별·라운드·실패·되돌리기) | Pure engine (`src/engine/*`) | — | React/DOM/시계 없는 불변 전이. 테스트의 중심 |
| 보드 배치(BOARD-04) | Pure engine (`board.ts`) | — | RNG 주입, 시작 때 1회 |
| 콘텐츠·설정 스냅샷, RNG 주입 | Harness (`src/harness/useGameStore.ts`) | — | 유일한 engine↔store seam |
| 시작 화면 계산(동물 배정·예상 시간·누락 안내) | Pure engine (`lobby.ts` 또는 `setup.ts`) | Browser UI (`SetupView`) | 계산은 순수 함수, UI는 표시만 |
| 임시 플레이/결과 화면 | Browser UI (`src/game/*`) | — | 엔진 상태를 그대로 렌더(연출 없음, D-26) |

## Standard Stack

### Core (모두 설치되어 있음 — 버전은 `node_modules/*/package.json`에서 확인)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.14 | 콘텐츠·설정 persist, 게임 harness 스토어 | 이미 쓰는 중. `persist` 수화 동작을 소스로 확인 [VERIFIED: node_modules/zustand/esm/middleware.mjs] |
| zod | 4.4.3 | 설정 스키마(필드별 `.catch` 복구), 기존 ContentSchema | `.catch`/`.default`/unknown key strip 동작을 실행으로 확인 [VERIFIED: 스크래치 node 실행] |
| react / react-dom | 19.2.8 | 설정 탭·시작·임시 화면 | 기존 |
| vitest | 3.2.4 (+jsdom 27, RTL 16.3) | 엔진·스토어·화면 테스트 | 기존 23파일·183테스트 green (2026-10-22 실행) [VERIFIED: npx vitest run] |
| typescript | 5.9.3 | `tsc -b` (src 전체 + 테스트 타입 검사) | `resolveJsonModule`가 bundler 모드에서 true [VERIFIED: tsc --showConfig] |

### Supporting
없음. `rng.ts`(`mulberry32`, `systemRng`, `rollDie`, `weightedPick`, `uniformPick`)를 그대로 재사용한다.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 별도 settings persist 키 | ContentSchema v2 `settings` 필드 | **D-04로 금지.** 백업 호환이 깨지고 migrate 위험이 생긴다 |
| `travel`(누적 좌표) + `lapsCredited` | 각 이동마다 "출발 통과 여부" 불리언만 계산 | 같은 바퀴 이중 지급(뒤로 넘었다 다시 넘기)을 막지 못한다 |
| 보드 배치: 조합 균등 추출 | 무작위 배치 후 인접 시 재시도(거부 루프) | 거부 루프는 실행 시간이 비결정적이다. 실패 가능성이 낮아도 상한을 따로 둬야 한다 |

**Installation:** 없음 (`npm install` 불필요).

## Package Legitimacy Audit

이번 단계는 외부 패키지를 설치하지 않는다.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | — | — | — | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
 [편집기 탭: 미션 | 이벤트 | ⚙️설정(신규)]                [게임]
        │ store actions          │ settings actions        SetupView ──(모드·인원·이름·팀원·동물·라운드)
        ▼                        ▼                              │  analyzeContent / estimateMinutes / assignAnimals (순수)
 ┌──────────────────┐   ┌──────────────────────┐               │
 │ useStore(persist) │   │ useSettings(persist) │               ▼
 │ key: powerjumping │   │ key: powerjumping_   │      useGameStore.startGame(setup)
 │ _content_v1, v=1  │   │ settings_v1, v=1     │        ├─ 스냅샷: missions·events(useStore) + rules(useSettings + setup.rounds)
 │ (변경 금지)        │   │ Zod 필드별 .catch    │        └─ engine.createGame(config, content, systemRng())
 └────────┬─────────┘   └──────────────────────┘                  │  buildBoard(L) → Tile[]  (게임 내내 불변)
          │ Header 내보내기/가져오기(io.ts, 콘텐츠만)              │  decks[diff] = shuffle(missions of diff)
          ▼                                                       ▼
   파워점핑-콘텐츠.json (v1 그대로)              ┌──────── 순수 FSM (state, …, rng) => state ────────┐
                                                │ awaitingRoll ──roll──► (주사위 이동·보너스)         │
                                                │    ▲                ├─ 퀘스트 칸 ─► awaitingJudgement│
                                                │    │                ├─ 이벤트 칸 ─► 이벤트 1회 적용 ─┤
                                                │    │                │     └─ 퀘스트 칸이면 ─► 판정   │
                                                │    │                └─ 출발/이벤트·extra ─► turnResolved
                                                │    │  judge(✓) ⭐+n ─► turnResolved                  │
                                                │    │  judge(✗) ─ 재도전(1회) ─► awaitingJudgement    │
                                                │    │  undo ◄── 스냅샷(직전 판정 1개, roll 시 소거)    │
                                                │    └── next(advanceTurn): extra? 같은 말 : 다음 말    │
                                                │                 next===0 → round+1 > rounds → gameOver│
                                                │  endGame('manual') ─ 어느 단계에서든 → gameOver      │
                                                └──────────────── log {seq, events[]} ─────────────────┘
                                                                  ▼
                                   임시 PlayView(칸 줄·점수판·라운드·🎲·퀘스트 카드·되돌리기·지금 끝내기)
                                   → ResultView(공동 우승·별 목록·다시 하기/처음으로)
```

### Recommended Project Structure (Phase 5 종료 시점)
```
src/
├── schema.ts            # 무변경 (ContentSchema v1, SCHEMA_VERSION=1)
├── store.ts             # 무변경 (주석만 추가 가능: "_v1은 스키마 버전과 무관, 절대 변경 금지")
├── settings.ts          # 신규: FailRule/SettingsSchema/DEFAULT_SETTINGS + useSettings persist (React/DOM import 금지)
├── lib/io.ts            # 무변경
├── test/fixtures/v1.ts  # 신규: v1 localStorage 원문 문자열, v1 내보내기 원문, 구형(필드 누락) 백업
├── engine/
│   ├── rng.ts           # 무변경
│   ├── ring.ts          # 신규: wrap, walkPath, moveBy(travel 기반, 보너스 판정)
│   ├── scoring.ts       # 신규: STARS_BY_DIFF, starsFor, winnersByStars, rankByStars
│   ├── board.ts         # 신규: tileQuotas, chooseNonAdjacent, buildBoard  (placement.ts 대체 → 삭제)
│   ├── animals.ts       # 신규: ANIMALS, AnimalId, assignAnimals
│   ├── setup.ts         # 수정: buildParticipants(animal), analyzeContent, estimateMinutes, ROUNDS_MIN/MAX
│   ├── types.ts         # 재작성: v2 타입 (아래 Pattern 3~6)
│   └── engine.ts        # 재작성: createGame / rollDice / judge / undoJudgement / advanceTurn / endGame
├── harness/useGameStore.ts  # 재작성: 스냅샷 + roll/judge/undo/next/endNow/restart/reset
├── components/
│   ├── SettingsTab.tsx  # 신규 (SegmentedControl ×3 + 라운드 스텝퍼)
│   └── Tabs.tsx         # 수정: TabKey에 'settings' 추가
└── game/
    ├── GameApp.tsx      # 소폭 수정
    ├── PlayView.tsx     # 재작성: 임시 DOM (BoardScene 없음)
    ├── usePresentation.ts (+test)  # 유지(Phase 6이 확장). 임시 화면은 busy를 안 씀
    ├── hud/SetupView.tsx, ResultView.tsx, TurnHud.tsx, ControlsBar.tsx, MissionOverlay.tsx(→ 퀘스트 카드)
    ├── hud/RingStrip.tsx, Scoreboard.tsx  # 신규(임시)
    └── styles/game.css  # 2D 보드/토큰/스프라이트·시계·positions 규칙 정리
```
> 파일 이름은 planner 재량이다. "단계별 green 유지" 전략(아래 Pattern 8)을 쓰려면 ②에서는 v2 FSM을 **새 이름**(예: `engine/game.ts` + `engine/state.ts`)으로 추가하고, ③에서 harness/UI를 옮긴 뒤 옛 `engine.ts`/`types.ts`/`placement.ts`를 지운다. 이름을 `types.ts`/`engine.ts`로 유지하고 싶다면 ②와 ③을 하나의 계획으로 합쳐야 한다.

### Pattern 1: v1 데이터 보존 = "바꾸지 않기" + tripwire + 원문 픽스처 부팅 테스트 (DATA-05/06)

**실측한 수화 경로** [VERIFIED: node_modules/zustand/esm/middleware.mjs L380-440, zustand 5.0.14]:
1. `storage.getItem(name)` → JSON.parse. localStorage는 동기라 `toThenable`도 동기로 실행된다. **스토어 모듈을 import하는 순간 수화가 끝난다.**
2. `typeof stored.version === 'number' && stored.version !== options.version`일 때만 `migrate` → `[true, migrated]`. **같은 버전이면 `[false, stored.state]`가 되어 migrate를 부르지 않는다.**
3. `merge(migratedState, current)` → `set(result, true)`.
4. `migrated === true`일 때만 즉시 `setItem()`을 한다. 같은 버전이면 수화 후 저장소를 **다시 쓰지 않는다**.
5. 단, 이후 어떤 액션이든 `set`이 일어나면 `setItem(partialize(get()))`을 한다. 그래서 merge가 실패해 시드로 떨어진 상태에서 강사가 무엇이든 편집하면 **시드가 원본을 덮어쓴다**. Zod 스키마를 조금이라도 엄격하게 바꾸면 v1 데이터가 merge에서 떨어지고, 그다음 편집이 원본을 지운다. **`ContentSchema`/`MissionSchema`/`EventSchema`는 이번 단계에서 한 글자도 바꾸지 않는다.**

**테스트 3종 (엔진 작업보다 먼저):**

```ts
// src/test/fixtures/v1.ts — v1 앱이 실제로 쓰던 바이트 그대로 (store.ts 48d64a8 이후 불변)
export const V1_CONTENT = {
  version: 1,
  categories: ['기초', '응용', '고난도', '우리반'],
  missions: [ /* 강사가 만든 것처럼: 한글·이모지·빈 desc·다중 cats·세 난이도 모두, 시드와 다른 id */ ],
  events:   [ /* forward/backward/extra(steps 0), label '보너스'|'함정'|'', weight 0 포함 */ ],
};
// zustand persist 래퍼: {"state":<partialize 결과>,"version":1}
export const V1_LOCALSTORAGE_RAW = JSON.stringify({ state: V1_CONTENT, version: 1 });
// Header.onExport → exportContent → JSON.stringify(content, null, 2)
export const V1_BACKUP_FILE_TEXT = JSON.stringify(V1_CONTENT, null, 2);
// 손으로 고친/옛 파일: desc·cats·label 누락 → Zod default로 채워져야 함
export const V1_BACKUP_MINIMAL_TEXT = '{"version":1,"categories":[],"missions":[{"id":"a","name":"줄넘기","diff":"easy"}],"events":[{"id":"e","name":"점프","eff":"forward","steps":2,"weight":1}]}';
```

```ts
// (a) 실제 부팅 시뮬레이션 — 모듈을 새로 import해서 스토어 생성 시점 수화를 그대로 재현
it('v1 기기 저장분이 v2 부팅 후에도 그대로 (DATA-05)', async () => {
  localStorage.clear();
  localStorage.setItem('powerjumping_content_v1', V1_LOCALSTORAGE_RAW);
  vi.resetModules();
  const { useStore } = await import('../store');           // 새 인스턴스 → 생성 시 수화
  const s = useStore.getState();
  expect(s.missions).toEqual(V1_CONTENT.missions);
  expect(s.events).toEqual(V1_CONTENT.events);
  expect(s.categories).toEqual(V1_CONTENT.categories);
  // 같은 버전 → 수화가 저장소를 다시 쓰지 않음
  expect(localStorage.getItem('powerjumping_content_v1')).toBe(V1_LOCALSTORAGE_RAW);
  // 설정 스토어도 같이 부팅돼도 콘텐츠 키를 건드리지 않음
  await import('../settings');
  expect(localStorage.getItem('powerjumping_content_v1')).toBe(V1_LOCALSTORAGE_RAW);
});

// (b) tripwire — 누가 버전/키/스키마 모양을 바꾸면 즉시 빨간불
it('콘텐츠 저장 계약은 v1 그대로', () => {
  const o = useStore.persist.getOptions();
  expect(o.name).toBe('powerjumping_content_v1');
  expect(o.version).toBe(1);
  expect(SCHEMA_VERSION).toBe(1);
  expect(Object.keys(ContentSchema.shape).sort()).toEqual(['categories','events','missions','version']);
  expect(ContentSchema.safeParse(V1_CONTENT).success).toBe(true);
});

// (c) v1 백업 파일 가져오기 (DATA-06) — io.test.ts의 runImport 헬퍼 재사용
it.each([['정식 내보내기', V1_BACKUP_FILE_TEXT], ['필드 누락 구형', V1_BACKUP_MINIMAL_TEXT]])(
  'v1 백업(%s) 가져오기 성공', async (_n, text) => {
    const r = await runImport(jsonFile(text), true);
    expect(r.askedToConfirm).toBe(true);
    // 미션 수·이름 일치, minimal은 desc '' / cats [] / label '' 기본값
  });
```

**주의:** `vi.resetModules()` + 동적 import를 쓰면 같은 테스트 파일의 정적 import `useStore`와 다른 인스턴스가 된다. 부팅 테스트는 별도 파일(예: `src/dataPreservation.test.ts`)에 두고, 그 파일 안에서는 동적 import만 쓴다.

### Pattern 2: 설정 스토어 — 별도 키 + Zod 필드별 `.catch` 복구 (DATA-07, CFG-01~04)

```ts
// src/settings.ts — PHASE 5 CONTRACT: React/DOM import 금지 (store.ts와 같은 규칙)
import { z } from 'zod';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const FailRule = z.enum(['retrySame', 'retryNew', 'noStar']);   // D-03 순서·기본 retrySame
export type FailRule = z.infer<typeof FailRule>;
export const ROUNDS_MIN = 1, ROUNDS_MAX = 20, DEFAULT_ROUNDS = 5;       // D-19

export const SettingsSchema = z.object({
  failRule: FailRule.catch('retrySame'),
  defaultRounds: z.number().int().min(ROUNDS_MIN).max(ROUNDS_MAX).catch(DEFAULT_ROUNDS),
  startBonus: z.union([z.literal(0), z.literal(1), z.literal(2)]).catch(1),        // D-06
  boardSize: z.union([z.literal(16), z.literal(20), z.literal(24)]).catch(20),     // D-06
});
export type Settings = z.infer<typeof SettingsSchema>;
export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({});

interface SettingsStore extends Settings {
  setFailRule(v: FailRule): void; setDefaultRounds(n: number): void;
  setStartBonus(v: 0|1|2): void; setBoardSize(v: 16|20|24): void;
}

export const useSettings = create<SettingsStore>()(persist((set) => ({
  ...DEFAULT_SETTINGS,
  setFailRule: (failRule) => set({ failRule }),
  setDefaultRounds: (n) => set({ defaultRounds: Math.min(ROUNDS_MAX, Math.max(ROUNDS_MIN, Math.round(n))) }),
  setStartBonus: (startBonus) => set({ startBonus }),
  setBoardSize: (boardSize) => set({ boardSize }),
}), {
  name: 'powerjumping_settings_v1',
  storage: createJSONStorage(() => localStorage),
  version: 1,
  partialize: (s) => ({ failRule: s.failRule, defaultRounds: s.defaultRounds, startBonus: s.startBonus, boardSize: s.boardSize }),
  // merge는 persisted가 undefined(저장 없음)일 때도 호출된다 → 반드시 안전하게
  merge: (persisted, current) => {
    const r = SettingsSchema.safeParse(persisted);       // 객체면 필드별 .catch로 항상 성공
    return r.success ? { ...current, ...r.data } : current; // null/문자열/배열 → 기본값 유지
  },
}));
```

[VERIFIED: 스크래치 실행, zod 4.4.3] `SettingsSchema.parse({})` → 전부 기본값. `{failRule:'bogus', defaultRounds:99, startBonus:2, boardSize:18, extra:1}` → `{retrySame, 5, 2, 20}` (정상 필드는 유지하고, 모르는 키는 제거). `safeParse(null)`과 `safeParse('x')` → `success:false`.

- **백업 미포함은 구조적으로 보장된다:** `Header.onExport`는 `useStore.getState()`에서 `{version, categories, missions, events}`만 꺼낸다(src/components/Header.tsx:48-49). 그래도 회귀 테스트로 고정한다. 설정을 바꾼 뒤 `exportContent`의 Blob을 파싱해 키가 정확히 4개인지, `failRule` 등이 없는지 확인한다. 가져오기(`replaceAll`) 후 설정이 바뀌지 않았는지도 확인한다.
- `startBonus`/`boardSize`를 리터럴 유니언으로 두면 SegmentedControl의 `T extends string` 제약과 맞지 않는다. **SegmentedControl은 문자열 값만 받는다.** 옵션 값을 `'0'|'1'|'2'`, `'16'|'20'|'24'` 문자열로 쓰고 onChange에서 `Number()`로 바꾸거나, 스키마 자체를 문자열 enum으로 둔다. 어느 쪽이든 한 곳에서 변환한다.
- 설정 탭 문구 예시(UX Pitfall "실패 규칙 문구가 어려움" 대응): "같은 미션 한 번 더 / 다른 미션으로 한 번 더 / 별 없이 다음 차례". 푸터에 "설정은 이 기기에만 저장돼요(내보내기 파일에는 안 들어가요)"를 넣으면 DATA-07이 눈에 보인다.

### Pattern 3: 순환 이동 수학 — `travel` + `lapsCredited` (TURN-01, TURN-06)

```ts
// src/engine/ring.ts — 순수
export const wrap = (x: number, L: number) => ((x % L) + L) % L;   // JS %는 음수 부호 유지 → 반드시 이렇게

// 지나가는 칸 순서(출발 제외, 도착 포함). 길이 = |steps|. steps<0이면 역방향.
export function walkPath(fromTravel: number, steps: number, L: number): number[] {
  const d = Math.sign(steps), out: number[] = [];
  for (let k = 1; k <= Math.abs(steps); k++) out.push(wrap(fromTravel + d * k, L));
  return out;
}

export interface RingPos { travel: number; lapsCredited: number }   // Participant에 포함
export interface MoveOutcome { travel: number; position: number; lapsCredited: number; path: number[]; bonusEarned: boolean }

// D-09 전체를 이 한 함수가 판정한다. canEarnBonus = !turn.bonusPaid
export function moveBy(p: RingPos, steps: number, L: number, canEarnBonus: boolean): MoveOutcome {
  const travel = p.travel + steps;
  const lap = Math.floor(travel / L);                       // 음수 travel에서도 floor가 맞음 (-2/20 → -1)
  const bonusEarned = steps > 0 && canEarnBonus && lap > p.lapsCredited;
  return {
    travel, position: wrap(travel, L), path: walkPath(p.travel, steps, L), bonusEarned,
    lapsCredited: Math.max(p.lapsCredited, lap),            // 지급하든(턴 상한으로) 못 하든 기록은 갱신
  };
}
```

[VERIFIED: 스크래치 실행] L=20 기준 결과:
| 시나리오 | travel 변화 | 결과 |
|---|---|---|
| 19에서 +1 (출발 칸에 정확히 도착) | 19→20, lap 1 > 0 | **지급**, lapsCredited=1 |
| 이어서 −1 (뒤로 출발 넘기) | 20→19, lap 0 | 지급 없음, lapsCredited 1 유지 |
| 이어서 +3 (같은 바퀴 다시 넘기) | 19→22, lap 1 = 1 | **지급 없음**(이중 지급 방지) |
| 이어서 +20 | 22→42, lap 2 > 1 | 지급 |

- **턴당 1회:** 주사위로 넘어 받았으면 같은 턴의 이벤트 전진은 `canEarnBonus=false`다. 16칸 + 전진 20칸처럼 한 번에 두 바퀴를 넘으면 한 번만 주고, `lapsCredited`는 최대값으로 갱신해 지나간 바퀴는 버린다. 다음 턴에 "가만히 있는데 보너스"가 나오지 않게 하려면 이 갱신이 반드시 있어야 한다.
- **게임 시작:** `travel=0, lapsCredited=0`이다. 출발 칸에서 시작하는 것은 보너스가 아니다.
- **[ASSUMED, A1]** 뒤로 출발 칸을 넘었다가(lap −1) 다시 앞으로 출발 칸에 정확히 도착해도(lap 0) 보너스는 없다. 0바퀴는 시작 때 이미 기록된 것으로 친다. D-09의 "바퀴 기록으로 이중 지급 방지"를 그대로 적용한 결과이고, 한 바퀴를 새로 돈 것이 아니라는 직관과도 맞다.
- **전수 테스트:** L∈{16,20,24} × fromTravel∈[−2L, 3L] × steps∈[−20..20]에 대해 `position∈[0,L)`, `path.length===|steps|`, `path.at(-1)===position`(steps≠0), `bonusEarned ⇒ steps>0`, `lapsCredited` 단조 비감소를 단언한다. 약 1.5만 케이스라 밀리초 단위로 끝난다.

### Pattern 4: 보드 생성 — 비인접 균등 추출 + 최대잉여 할당 (BOARD-04, D-10~D-13)

```ts
// src/engine/board.ts — 순수, RNG 주입
export type Tile = { kind: 'start' } | { kind: 'quest'; diff: Difficulty } | { kind: 'event'; event: Event };
// ↑ eventId가 아니라 Event 객체 "사본"을 저장 → 게임 중 편집기에서 이벤트를 지워도 고아 없음(BOARD-04)

const DIFF_RATIO = { easy: 50, normal: 35, hard: 15 } as const;          // D-11
export const eventTileCount = (L: number) => Math.max(1, Math.round((L - 1) * 0.25)); // D-10

// 최대잉여법(Hamilton): 합이 정확히 n, 비율에 가장 가까움
export function apportion<K extends string>(n: number, ratios: Record<K, number>): Record<K, number>;

// k개 비인접 위치를 [lo..hi]에서 균등 추출 (거부 루프 없음):
// m = hi-lo+1 칸에서 c_0<…<c_{k-1}을 {0..m-k}에서 무작위 k개 고른 뒤 정렬, pos_j = lo + c_j + j
export function chooseNonAdjacent(lo: number, hi: number, k: number, rng: Rng): number[];

export function shuffle<T>(arr: readonly T[], rng: Rng): T[];   // Fisher–Yates (sort(()=>rng-0.5) 금지: 편향)

export function buildBoard(L: number, missions: Mission[], events: Event[], rng: Rng): Tile[] {
  // 1) avail = 미션이 1개 이상인 난이도 (0개면 호출 전 analyzeContent가 막음)
  // 2) placeable = events.filter(e => e.weight > 0); k = placeable.length ? eventTileCount(L) : 0   (D-13)
  // 3) 이벤트 위치 = chooseNonAdjacent(2, L-1, k, rng)   ← 1번 칸은 퀘스트 고정, L-1과 0(출발)은 인접해도 무방
  // 4) 나머지 1..L-1 = 퀘스트. quota = apportion(questCount, avail 비율만)
  // 5) 1번 칸 = 'easy' (없으면 avail 중 가장 쉬운 난이도 — A2), 그 quota에서 1 차감
  // 6) 나머지 난이도 목록 shuffle → 남은 퀘스트 칸에 배정
  // 7) 이벤트 칸마다 weightedPick(placeable, e => e.weight, rng) → { kind:'event', event: { ...picked } }
}
```

[VERIFIED: 스크래치 실행] 칸 수(D-10/D-11 적용):
| L | 이벤트 | 퀘스트 | 쉬움/보통/어려움 | 어려움 없음 | 이벤트 없음(퀘스트 L−1) | 비인접 최대 수용 |
|---|---|---|---|---|---|---|
| 16 | 4 | 11 | 5/4/2 | 6/5 | 8/5/2 | 7 |
| 20 | 5 | 14 | **7/5/2** (D-11과 일치) | 8/6 | 9/7/3 | 9 |
| 24 | 6 | 17 | 8/6/3 | 10/7 | 12/8/3 | 11 |

모든 크기에서 필요한 이벤트 수가 비인접 최대 수용치(⌈(L−2)/2⌉) 이하라서 항상 배치할 수 있다.

**보드 불변식 테스트(seed 여러 개):** `length===L`, `[0].kind==='start'`, `[1]`은 퀘스트이고 easy(있을 때), 1..L−2 범위에서 `event` 인접 쌍 0개, 칸 종류·난이도 개수가 표와 일치, weight 0 이벤트 미등장, 누락 난이도 미등장, 같은 seed면 같은 보드. 이벤트 선택 비율은 seed 2000개 정도로 돌려 가중치 비율 ±5% 이내인지 본다.

### Pattern 5: 상태 모양과 턴 해결 (TURN-02~05)

```ts
// src/engine/types.ts (v2) — 권장 형태
export type Phase = 'awaitingRoll' | 'awaitingJudgement' | 'turnResolved' | 'gameOver';
export type EndReason = 'rounds-complete' | 'manual';                    // D-01 (timeout 삭제)
export interface Participant {
  id: string; name: string; animal: AnimalId;                            // D-24 (character 삭제)
  memberNames: string[]; memberTurnIndex: number;                        // v1 팀 모델 유지(D-21)
  position: number;            // 0..L-1, 항상 wrap(travel)
  travel: number; lapsCredited: number;                                  // Pattern 3
  stars: number;                                                         // 단조 비감소(D-02)
}
export interface GameRules { rounds: number; failRule: FailRule; startBonus: 0 | 1 | 2; boardSize: 16 | 20 | 24 }
export interface GameConfig { mode: 'solo' | 'team'; participants: Participant[]; rules: GameRules }
export interface QuestCard { mission: Mission; diff: Difficulty; stars: 1 | 2 | 3; attempt: 1 | 2 }
export interface TurnInfo { isExtra: boolean; bonusPaid: boolean; extraGranted: boolean }
export interface MoveResult {
  roll: number; dicePath: number[]; landed: number;
  event: Event | null; eventPath: number[]; extraSuppressed: boolean;
  to: number; startBonus: number;                                        // 이번 턴에 받은 출발 보너스 별(0이면 없음)
}
export interface GameState {
  phase: Phase; config: GameConfig;
  board: Tile[];                                   // 불변
  pool: Record<Difficulty, Mission[]>;             // 스냅샷(재셔플 원본)
  decks: Record<Difficulty, Mission[]>;            // 남은 덱, 끝에서 pop
  currentIndex: number; round: number;             // round는 1부터
  turn: TurnInfo;
  card: QuestCard | null;
  lastMove: MoveResult | null;
  lastJudgement: { success: boolean; starsAwarded: number; retry: boolean } | null;
  undo: UndoSnapshot | null;                       // Pattern 6
  log: { seq: number; events: GameEvent[] };       // 이번 전이에서 생긴 이벤트만
  winners: string[]; endReason: EndReason | null;
}
```

**콘텐츠를 상태 안에 스냅샷으로 둔다(권장):** `pool`/`decks`/`board`가 미션·이벤트 사본을 갖고 있으므로, 전이 함수는 더 이상 콘텐츠를 인자로 받지 않는다(`rollDice(state, rng)`, `judge(state, success, rng)`). 이렇게 하면 (1) 게임 중 편집이 진행 중인 게임에 영향을 주지 않고(Claude 재량 항목), (2) 되돌리기 스냅샷이 덱까지 포함해 정확히 복원되며, (3) 테스트에서 콘텐츠를 매번 넘길 필요가 없다. "엔진은 store를 import하지 않는다"는 계약은 그대로다. 콘텐츠는 `createGame`의 인자로만 들어온다.

**`rollDice(state, rng)` 해결 순서** (phase !== 'awaitingRoll'이면 state를 그대로 반환. 연타 방지):
1. `undo = null` (D-16: 주사위를 굴리면 되돌리기 기회가 사라짐), `lastJudgement = null`.
2. `roll = rollDie(rng)` → `moveBy(p, roll, L, !turn.bonusPaid)`. 보너스를 받으면 `stars += rules.startBonus`(0이면 지급 0, 로그도 생략), `turn.bonusPaid = true`.
3. 도착 칸 `board[landed]`:
   - `start` → `turnResolved`
   - `quest` → `drawFromDeck(diff)` → `card{attempt:1, stars: starsFor(diff)}` → `awaitingJudgement`
   - `event`:
     - `forward`/`backward`: `moveBy(p, ±steps, L, !turn.bonusPaid)`(뒤로는 `steps<0`이라 보너스 불가). 최종 칸이 `quest`면 미션 뽑기 → `awaitingJudgement`, 아니면(`event`/`start`) **더 해결하지 않고** `turnResolved` (D-07)
     - `extra`: `turn.isExtra`이면 `extraSuppressed=true`(연속 1회 상한, D-08), 아니면 `turn.extraGranted=true` → `turnResolved`
4. 덱 뽑기: `decks[diff]`가 비면 `shuffle(pool[diff], rng)`로 다시 채운 뒤 pop한다. 재셔플 직후 맨 위가 직전 카드면 한 칸 돌려 연속 중복을 피한다(선택). **rng는 주사위 1회 + (재셔플 시) 셔플에만 쓰인다.** 그래서 테스트에서 주사위 눈을 스크립트로 정할 수 있다(Test Strategy 참고).

**`judge(state, success, rng)`** (phase !== 'awaitingJudgement'이면 그대로 반환):
- `undo = snapshotOf(state)`를 먼저 잡는다.
- 성공: `stars += card.stars`(칸 난이도 기준. 재도전이어도 전액, D-14) → `turnResolved`.
- 실패: `card.attempt === 1 && failRule !== 'noStar'`이면 `attempt: 2`로 바꾸고 `awaitingJudgement`를 유지한다.
  - `retrySame`: 같은 미션
  - `retryNew`: 같은 난이도 덱에서 **현재 미션과 id가 다른** 미션을 뽑는다. `pool[diff].length === 1`이면 같은 미션(D-15)
- 그 외(noStar 또는 attempt 2 실패) → `turnResolved`. 별은 0을 더할 뿐 절대 빼지 않는다(D-02).
- 팀전에서 재도전은 `memberTurnIndex`를 건드리지 않으므로 같은 팀원이 한다(D-21).

### Pattern 6: 되돌리기·턴 진행·라운드·종료 (TURN-07/08, ROUND-01/03/04)

```ts
type UndoSnapshot = Omit<GameState, 'undo' | 'log'>;
const snapshotOf = ({ undo: _u, log: _l, ...rest }: GameState): UndoSnapshot => rest;

export function undoJudgement(state: GameState): GameState {
  if (!state.undo || state.phase === 'gameOver') return state;
  return {
    ...state.undo, undo: null,                                   // 직전 1회만 (D-16)
    log: { seq: state.log.seq + 1, events: [{ t: 'judgementUndone' }] }, // ★ seq는 계속 증가
  };                                                             // phase=awaitingJudgement, 같은 카드·attempt·별 복원 (D-17)
}
```
- **로그 seq를 스냅샷으로 되돌리면 안 된다.** Phase 6 Director는 `log.seq` 변화를 구독한다(ARCHITECTURE Pattern 1). seq가 과거 값으로 돌아가면 중복 재생이나 누락이 생긴다. 스냅샷에서 `log`를 빼고 복원 시 `seq+1`을 붙인다.
- **되돌리기 창:** `judge` 직후(`turnResolved`, 재도전 `awaitingJudgement`) → `advanceTurn` 후 다음 사람의 `awaitingRoll`까지 유효하고, `rollDice`가 소거한다(D-16). 스냅샷이 `currentIndex`·`round`·`turn`·`decks`·참가자 별까지 포함하므로 다음 사람 차례에서 되돌려도 정확히 복원된다. `gameOver`에서는 불가하다(아래 참고).
- 재도전 흐름에서 1차 실패 → 스냅샷 A(attempt 1). 2차 판정 → 스냅샷 B(attempt 2)가 A를 대체한다. "직전 판정 1회"와 정확히 맞는다.

```ts
export function advanceTurn(state: GameState): GameState {       // phase !== 'turnResolved' → 그대로
  if (state.turn.extraGranted) {                                 // D-08/D-18: 마지막 라운드 마지막 사람도 허용
    return { ...state, phase: 'awaitingRoll', card: null,
             turn: { isExtra: true, bonusPaid: false, extraGranted: false } };   // 같은 말·같은 팀원, round 그대로
  }
  const n = participants.length, leaving = state.currentIndex;
  // 떠나는 팀의 memberTurnIndex만 회전 (v1 규칙 유지, D-21)
  const next = (leaving + 1) % n;
  const round = next === 0 ? state.round + 1 : state.round;      // ★ 라운드 증가는 오직 여기(비추가 분기)
  if (round > state.config.rules.rounds) return finish(state', 'rounds-complete');   // undo=null, card=null
  return { ...state', currentIndex: next, round, phase: 'awaitingRoll', card: null,
           turn: { isExtra: false, bonusPaid: false, extraGranted: false } };       // undo는 유지(D-16)
}

export function endGame(state: GameState, reason: 'manual'): GameState {   // 어느 단계에서든
  // D-22: 판정 대기 퀘스트는 무효(card=null, 별 없음), undo=null, winners=winnersByStars
}
```
- **라운드 정의(ROUND-01):** `round`는 "모든 말이 정규 턴을 한 번씩 마치면 +1"이다. 추가 턴과 팀원 순환은 세지 않는다. 마지막 참가자의 정규 턴이 끝나 `next===0`이 되고 `round+1 > rounds`일 때 종료한다. 마지막 참가자가 extra를 받았으면 extra 분기가 먼저라서 추가 턴을 하고, 그 턴이 끝난 뒤 종료한다(D-18).
- **`winnersByStars`:** 최댓값을 가진 전원(동점이면 공동). 전원 0이면 전원 공동 우승. 결과 화면 순위는 동점 같은 등수(1,1,3 경쟁 순위)로 매긴다.
- **턴 종료 판정을 `turnResolved` + "다음" 버튼으로 남기는 이유:** 강사가 판정을 잘못 눌렀을 때 결과 화면으로 튀기 전에 되돌릴 창이 생긴다(게임 종료는 `advanceTurn` 안에서만 일어남). Phase 6은 연출 뒤 자동 진행으로 바꿀 수 있다.
- **도메인 이벤트 로그(Phase 6용, 최소 세트 권장):** `gameStarted`, `turnStarted{pid, member, round, isExtra}`, `rolled{face}`, `moved{pid, path, by:'dice'|'event'}`, `startBonus{pid, stars}`, `landed{pid, tile, kind}`, `eventApplied{pid, eff, steps, suppressed}`, `questDrawn{pid, missionId, diff, stars, attempt}`, `judged{pid, success, stars}`, `judgementUndone`, `gameEnded{reason, winners}`. 전이마다 `seq+1`이고, `events`에는 이번 전이분만 넣는다. 임시 화면은 로그를 쓰지 않아도 되지만 엔진 테스트에서 로그 내용을 단언해 두면 Phase 6이 그대로 믿고 쓸 수 있다.

### Pattern 7: 시작 화면 순수 헬퍼 (SETUP-07/08/09)

```ts
// src/engine/animals.ts
export const ANIMALS = ['bear', 'rabbit', 'cat', 'dog', 'panda', 'fox', 'pig', 'chick'] as const; // D-24
export type AnimalId = (typeof ANIMALS)[number];
// picks[i]가 유효하고 앞사람과 겹치지 않으면 유지, 아니면 아직 안 쓴 첫 종으로 채움 → 항상 서로 다름
export function assignAnimals(count: number, picks: ReadonlyArray<AnimalId | undefined>): AnimalId[];

// src/engine/setup.ts
export const SECONDS_PER_TURN = 45;                                         // D-20
export const estimateMinutes = (n: number, rounds: number) => Math.ceil((n * rounds * SECONDS_PER_TURN) / 60);
// 예: 2명×5라운드=8분, 3×5=12분(675초→11.25 올림), 4×5=15분, 8×5=30분
export function analyzeContent(missions: Mission[], events: Event[]): {
  ok: boolean; reason?: string;                 // 미션 0개일 때만 false (D-13)
  missingDiffs: Difficulty[];                   // 안내: "어려움 미션이 없어서 어려움 칸 없이 판을 만들어요"
  hasEventTiles: boolean;                       // weight>0 이벤트가 있는지
};
```
- 이모지 매핑(🐻🐰🐱🐶🐼🦊🐷🐥)과 한글 이름(곰·토끼·고양이·강아지·판다·여우·돼지·병아리)은 UI 모듈에 둔다. 엔진은 id만 안다. Phase 7이 3D 모습을 같은 id에 붙인다.
- SetupView: 참가자 행마다 8개 큰 버튼(`aria-pressed`), 다른 참가자가 고른 종은 `disabled`. 인원을 늘리면 `assignAnimals`가 새 행을 빈 종으로 채운다.
- 라운드 스텝퍼는 `.game-count-ctl` 패턴(−/숫자/+)을 재사용하고, `useState(() => useSettings.getState().defaultRounds)`로 초기화한다. 이번 판의 라운드 값은 설정에 다시 저장하지 않는다.

### Pattern 8: 단계별 green 유지 — 타입 교체의 파급 범위

`src/engine/types.ts`·`harness/useGameStore.ts`를 import하는 파일은 **23개**다(App, App.test, engine/{engine,placement,setup,types}+tests, game/{GameApp,PlayView,boardLayout.test}, hud/{ControlsBar,DiceResultPanel,PositionReadout,ResultView,SetupView,hud.test,shell.test}, scene/{BoardScene,scene.test}, harness+test). `tsconfig.app.json`이 `include: ["src"]`이므로 `tsc -b`(= `npm run build` = CI 배포)는 **테스트 파일까지 타입 검사한다** [VERIFIED: tsconfig.app.json, .github/workflows/deploy.yml]. `Participant.character`를 지우거나 `Phase`에서 `awaitingDraw`를 빼는 순간 이 파일들이 한꺼번에 깨진다.

권장 순서:
1. **계획 A (wave 1):** 픽스처 + tripwire + 부팅/가져오기 테스트 → `settings.ts` + 테스트 → `SettingsTab` + `Tabs`('settings') + App 3방향 분기. 엔진은 건드리지 않는다.
2. **계획 B (wave 1, A와 병렬 가능):** `ring.ts`, `scoring.ts`, `board.ts`, `animals.ts` + 각 테스트. v2 FSM과 v2 타입은 **새 파일**(예: `engine/game.ts`, `engine/state.ts`)에 만들고, 시작 화면 헬퍼(`estimateMinutes`, `analyzeContent`, v2 participant builder)도 새 파일에 둔다. 기존 코드는 손대지 않는다. 결과: 빌드 green, 새 테스트 green.
3. **계획 C (wave 2):** harness 재작성 → SetupView/PlayView(임시)/ResultView/TurnHud/ControlsBar/퀘스트 카드/RingStrip/Scoreboard → **같은 계획 안에서** 삭제 목록(아래 표) 처리 → hud/shell/App/harness 테스트 재작성 → `npx tsc -b && npx vitest run` green. 필요하면 C를 "C1 harness+삭제+최소 UI"와 "C2 UI 다듬기"로 나눌 수 있지만, C1이 끝날 때 빌드가 green이어야 한다.

### v1 잔재 처리 목록 (D-28)

| 파일 | 처리 | 근거 |
|---|---|---|
| `src/game/scene/BoardScene.tsx`, `scene/scene.test.tsx` | 삭제 | 2D 보드, `character` 스프라이트, `boardLength` 의존 |
| `src/game/boardLayout.ts` + test | 삭제 | 지그재그·결승 레이아웃 |
| `src/game/moveHighlight.ts` + test | 삭제 | 결승 클램프 하이라이트 |
| `src/game/animation.ts` + `diceRotation.test.ts` | 삭제 | `clampSquare`/선형 경로/타이밍 상수. 사용처는 BoardScene·PlayView·moveHighlight뿐 [VERIFIED: grep] |
| `src/game/hud/PositionReadout.tsx` | 삭제 → `Scoreboard`(별 순) | "결승까지 남은 칸" 개념 소멸 |
| `src/game/hud/DiceResultPanel.tsx` | 삭제 또는 v2로 재작성(🎲 눈, 이벤트 효과, 출발 보너스 +N) | `LandingResult`·결승 문구 |
| `src/game/PlayView.tsx` | 재작성(임시 DOM). 카운트다운 effect·watchdog·seq 타이머 전부 삭제 | D-01, D-26 |
| `src/game/hud/TurnHud.tsx` | 시계·`formatClock` 삭제, 라운드 n/N 추가, 버튼 "지금 끝내기" + 기존 ConfirmDialog 유지 | D-01, ROUND-04 |
| `src/game/hud/ControlsBar.tsx` | `awaitingDraw`(🎴) 분기 삭제 | D-28 |
| `src/game/hud/MissionOverlay.tsx` | 받을 별 ⭐×N 추가, 재도전(attempt 2) 표시 | TURN-02 |
| `src/game/hud/ResultView.tsx` | `REASON_COPY`를 새 EndReason 2개로, 동점 라디오(최종 승자 선택) 삭제 → 공동 우승 표시, `p.position칸` → 별 | ROUND-03, D-27 |
| `src/game/hud/SetupView.tsx` | 남/여·보드 프리셋·시간 제한 삭제, 동물·라운드·예상 시간·누락 안내 추가 | D-25 |
| `src/engine/placement.ts` + test | 삭제(→ `board.ts`) | 결승 칸 제외·`boardLength+1` 배열 |
| `src/engine/engine.ts`/`types.ts` + `engine.test.ts` | 재작성/교체 | `reached-finish`, `afterRoll >= boardLength`, `max(position)` 승자 |
| `src/engine/setup.ts` | `BoardPreset`/`boardLengthFor`/`DEFAULT_TIME_LIMIT_MS` 삭제, `character`→`animal` | D-01, D-24 |
| `src/harness/useGameStore.ts` | `remainingMs`/`setRemainingMs`/`draw`/`end('timeout')` 삭제 | D-01, D-28 |
| `src/game/styles/game.css` | `.game-clock`, `.game-positions`, 2D 보드/토큰/스프라이트 규칙 정리(HUD 토큰 `--tap` 등은 유지) | 사용 안 하는 CSS |
| `src/App.tsx` 부제 | "카드 미션을 성공하고 결승까지 점프해요" → 새 문구 (App.test.tsx:44가 이 문자열을 `getByLabelText`로 단언하므로 같이 수정) | Claude 재량 |
| `public/assets/cc0/kenney/toon-characters/*` | **유지**(Phase 7에서 삭제, D-28) | — |
| `src/game/usePresentation.ts` + test | **유지** | Phase 6 Director가 확장. GameApp의 busy 게이트도 무해하므로 유지 |

삭제 후 확인용 grep(0건이어야 함): `reached-finish|timeout'|timeLimitMs|remainingMs|awaitingDraw|boardLength|character|clampSquare|PositionReadout|BoardScene`.

### Anti-Patterns to Avoid
- **`SCHEMA_VERSION`을 올리거나 Content/Mission/EventSchema를 엄격하게 바꾸기:** merge 실패 → 시드로 떨어지고 → 다음 편집에서 원본을 덮어쓴다(Pattern 1의 5번).
- **설정을 콘텐츠 스토어 `partialize`에 섞기:** 내보내기 파일과 v1 앱 호환이 깨진다(D-04).
- **`position % L`만 저장:** 바퀴 정보가 사라져 이중 지급 방지가 불가능해진다. `travel`을 둔다.
- **`judge(false)` 안에서 바로 `advanceTurn` 호출(v1 방식):** 턴 종료 경로가 여러 갈래가 되어 라운드 증가 누락이나 중복이 생긴다(PITFALLS 3). 턴 종료는 `advanceTurn` 하나로 모은다.
- **하네스가 전이마다 라이브 `useStore`를 읽기(v1 `content()`):** 게임 중 편집으로 고아 id가 생기고 빈 덱에서 멈춘다(PITFALLS 15). 시작 때 1회 스냅샷.
- **`arr.sort(() => rng.next() - 0.5)`로 섞기:** 분포가 편향되고 엔진마다 결과가 다르다. Fisher–Yates.
- **되돌리기 스냅샷에 `log`를 포함:** seq가 되감긴다.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| v1→v2 콘텐츠 마이그레이션 | `migrate` 함수, `parseAnyContent`, `ContentSchemaV2` | **아무것도 만들지 않음**(D-04) | 같은 버전이면 zustand가 migrate를 안 부른다. 만들수록 위험만 늘어난다 |
| 설정 검증·복구 | 손으로 쓴 `typeof` 체크 + 기본값 분기 | Zod 4 필드별 `.catch()` | 필드 단위 복구, 모르는 키 제거, 타입 추론이 한 번에 된다 |
| 난수 | `Math.random` 직접 호출 | `rng.ts`의 `Rng` 주입(`mulberry32`/`systemRng`), `rollDie`, `weightedPick` | 결정적 테스트, crypto 우선 |
| 가중치 추첨 | 새 구현 | 기존 `weightedPick` (weight 0·NaN·합 0 처리 완비) | 이미 테스트됨(rng.test.ts) |
| 확인 대화상자 | 새 모달 | 기존 `ConfirmDialog`(포커스 트랩, 취소 기본 포커스) | 실수 탭 방지가 검증됨 |
| 세그먼트 선택 UI | 새 라디오 그룹 | 기존 `SegmentedControl` (값은 문자열) | D-23 |

**Key insight:** 이번 단계의 데이터 안전은 "새 코드"가 아니라 **변경하지 않기 + 그걸 강제하는 테스트**에서 나온다.

## Runtime State Inventory

> 이 단계는 저장 형식 보존(마이그레이션 회피)과 리팩터가 섞여 있어 인벤토리를 작성한다.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | 강사 기기 localStorage: `powerjumping_content_v1` = `{"state":{version:1,categories,missions,events},"version":1}` (store.ts 48d64a8 이후 형식 불변 [VERIFIED: git log]), `powerjumping_theme`('light'/'dark', Header). 새 키 `powerjumping_settings_v1` 추가 | **데이터 마이그레이션 없음.** 코드도 무변경. 픽스처 테스트로 고정 |
| Live service config | 없음 — 서버·외부 서비스 없음. GitHub Pages 정적 배포뿐 | 없음 |
| OS-registered state | 없음 — 서비스워커/PWA 미사용(package.json에 vite-plugin-pwa 없음 [VERIFIED]) → 캐시된 옛 번들 고착 위험 없음 | 없음 |
| Secrets/env vars | 없음 | 없음 |
| Build artifacts | `dist/`(gitignore, CI가 매번 새로 빌드), `node_modules/.tmp/*.tsbuildinfo` — 파일 삭제 후 `tsc -b` 증분 정보가 남아도 자동 갱신 | 없음. 이상하면 `rm -rf node_modules/.tmp` |
| 진행 중 게임 상태 | `useGameStore`는 persist가 아님(메모리) → 업데이트 시 진행 중 게임이 이어질 일 없음 | 없음 |

**저위험 참고:** `01-PROTOTYPE.html`도 같은 키 `powerjumping_content_v1`을 썼지만 zustand 래퍼 없이 저장했다. 프로토타입을 쓴 기기라면 v1 앱에서도 이미 시드로 떨어지는 경로였고, v2에서 새로 생기는 위험은 아니다(배포된 적 없는 디자인 산출물로 추정 — A3).

## Common Pitfalls

### Pitfall 1: 부팅 테스트가 "이미 수화된 정적 import 스토어"를 검사한다
**What goes wrong:** `localStorage.setItem(...)` 후 정적으로 import한 `useStore`를 읽으면, 수화는 모듈 로드 때 이미 끝났으므로 픽스처가 반영되지 않는다. 그런데 `useStore.setState`로 같은 값을 넣고 통과시키면 아무것도 검증하지 않게 된다.
**How to avoid:** 별도 테스트 파일에서 `vi.resetModules()` + `await import('../store')`를 쓰거나, 최소한 `await useStore.persist.rehydrate()`를 쓴다. 저장소 원문이 수화 후에도 바이트 단위로 같은지(`toBe(raw)`)도 단언한다.
**Warning signs:** 테스트가 `useStore.setState`로 시작한다.

### Pitfall 2: 출발 보너스 이중 지급 또는 "가만히 있는데 보너스"
**What goes wrong:** 통과 여부를 이동마다 따로 계산하면 같은 바퀴를 뒤로 갔다 다시 넘을 때 또 지급한다. 턴 상한 때문에 지급을 막은 바퀴의 기록을 갱신하지 않으면, 나중 이동에서 엉뚱하게 지급된다.
**How to avoid:** Pattern 3의 `moveBy` 하나로만 판정하고, `lapsCredited = max(...)`를 항상 갱신한다. 전수 테스트로 고정한다.

### Pitfall 3: 라운드가 extra 턴이나 재도전 때 증가
**How to avoid:** `round` 증가는 `advanceTurn`의 비추가 분기, `next===0`일 때 한 곳에서만 한다. 시나리오: "3인 2라운드, 2번이 extra 2회 → 정규 턴 6회 후 종료", "팀 2개(3명/1명) 2라운드 → 팀 턴 4회, 3명 팀은 멤버 0→1 순환", "마지막 라운드 마지막 사람 extra → 한 턴 더 후 종료(D-18)", "extra 턴에 또 extra 칸 → suppressed".

### Pitfall 4: 퀘스트 칸인데 뽑을 미션이 없어 멈춤
**What goes wrong:** v1 `drawCard`는 빈 목록이면 no-op이었다. 그대로 두면 `awaitingRoll`에 고착된다.
**How to avoid:** `buildBoard`는 미션이 있는 난이도로만 퀘스트 칸을 만든다. 덱은 소진되면 `pool`에서 재셔플하고, pool은 스냅샷이라 줄지 않는다. 그러니 퀘스트 칸에 도착했는데 미션이 없는 상태는 구조적으로 생길 수 없다. 단위 테스트로 단언한다.

### Pitfall 5: 연타로 단계 건너뛰기
**What goes wrong:** 임시 화면에는 busy 게이트가 없으니 주사위나 성공 버튼을 두 번 누르면 전이가 두 번 일어날 수 있다.
**How to avoid:** 모든 전이 함수 첫 줄에서 phase를 확인하고 아니면 `return state`. 테스트: `rollDice(rollDice(s))`는 두 번째 호출에서 상태가 바뀌지 않는다.

### Pitfall 6: SegmentedControl에 숫자 값
**What goes wrong:** `SegmentedControl<T extends string>`이라 `0|1|2`, `16|20|24`를 넣으면 타입 오류가 나거나 `data-v` 스타일이 어긋난다.
**How to avoid:** 문자열 옵션 + 변환을 한 곳에서 한다(Pattern 2 참고).

### Pitfall 7: 낡은 테스트 하나가 배포를 깨뜨림
**What goes wrong:** 로컬에서 `vitest run src/engine`만 돌리고 넘어가면 `tsc -b`가 `scene.test.tsx` 같은 낡은 테스트에서 실패하고, CI 배포가 멈춘다.
**How to avoid:** 각 계획의 완료 조건에 `npx tsc -b && npx vitest run`(전체)을 넣는다.

### Pitfall 8: retryNew가 같은 미션을 다시 뽑음
**How to avoid:** `pool[diff].length > 1`이면 현재 id와 다른 미션이 나올 때까지 덱에서 뽑는다. 재셔플은 최대 1회만 하고, 이후 `pool`에서 현재 id를 뺀 목록으로 고른다(무한 루프 방지). 길이가 1이면 같은 미션(D-15).

## Code Examples

### 결정적 주사위 스크립트 RNG (테스트 헬퍼)
```ts
// rollDie = 1 + floor(next*6) → next = (face - 0.5) / 6 이면 정확히 그 눈
export function scriptedRng(values: number[]): Rng {
  let i = 0;
  return { next: () => values[i++ % values.length] };
}
export const dice = (...faces: number[]) => scriptedRng(faces.map((f) => (f - 0.5) / 6));
// rollDice가 rng를 주사위 1회(+재셔플 시 셔플)에만 쓰도록 설계하면 시나리오 테스트가 간단해진다
```

### 손으로 만든 보드로 시나리오 테스트
```ts
const L = 20;
const Q = (diff: Difficulty): Tile => ({ kind: 'quest', diff });
const E = (eff: Effect, steps = 0): Tile => ({ kind: 'event', event: { id: `e-${eff}${steps}`, name: eff, eff, steps, weight: 1, label: '' } });
function boardWith(over: Record<number, Tile>): Tile[] {
  return Array.from({ length: L }, (_, i) => (i === 0 ? { kind: 'start' } : over[i] ?? Q('easy')));
}
// 예: 18에서 주사위 4 → 2 (출발 통과, +startBonus), board[2]가 forward 3 → 5가 hard 퀘스트 → awaitingJudgement, card.stars===3
```

### 전 게임 불변식 퍼즈 (mulberry32)
```ts
it.each(seeds(500))('seed %i: 불변식', (seed) => {
  const rng = mulberry32(seed);
  let s = createGame(randomConfig(rng), randomContent(rng), rng);
  for (let step = 0; step < 5000 && s.phase !== 'gameOver'; step++) {
    const before = s;
    s = s.phase === 'awaitingRoll' ? rollDice(s, rng)
      : s.phase === 'awaitingJudgement' ? judge(s, rng.next() < 0.6, rng)
      : advanceTurn(s);
    // 별 비감소, position ∈ [0,L), round ≤ rules.rounds, 보드 불변(=== 참조 또는 deepEqual)
  }
  expect(s.phase).toBe('gameOver');                    // 반드시 종료
  // turnStarted 로그로 집계한 참가자별 정규 턴 수 === rules.rounds (전원 동일)
});
```

## State of the Art (v1 → v2 in this codebase)

| Old Approach (v1) | Current Approach (v2 Phase 5) | Impact |
|---|---|---|
| 직선 보드 0→boardLength, 결승 도착 승리 | 순환판 L칸, `travel`/`wrap`, 라운드 종료 후 별 최다 | `reached-finish`, `max(position)` 승자 삭제 |
| `awaitingDraw → judge → awaitingRoll`(카드 먼저) | `awaitingRoll → 도착 칸 퀘스트 → judge`(주사위 먼저) | 🎴 버튼 삭제 |
| 이벤트 확률 배치(밀도 0.5, 결승 제외) | 고정 비율(75/25) + 비인접 + 1번 칸 쉬움 + 가중치 이벤트 | `placement.ts` → `board.ts` |
| 20분 타이머(DOM 시계) + `timeout` | 라운드 수만(D-01) | TurnHud 시계·PlayView interval 삭제 |
| 남/여 캐릭터 | 동물 8종 id | `Participant.animal` |
| 하네스가 전이마다 라이브 콘텐츠 읽음 | 시작 시 스냅샷(상태 안에) | 게임 중 편집 안전 |
| 동점 시 강사 라디오로 최종 승자 선택 | 공동 우승 그대로 표시 | ResultView 단순화 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 뒤로 출발을 넘었다가(lap −1) 다시 출발에 도착·통과해도 0바퀴는 시작 때 기록된 것으로 보고 보너스 없음 | Pattern 3 | 낮음 — 사용자가 다르게 원하면 `lapsCredited` 초기값을 `-∞`로 바꾸면 되지만, 그러면 출발 근처를 왕복하는 것만으로 보너스를 얻는 악용이 가능해진다 |
| A2 | 쉬움 미션이 0개면 "출발 다음 칸은 쉬운 퀘스트" 규칙은 남은 난이도 중 가장 쉬운 것으로 대체 | Pattern 4 | 낮음 — D-12와 D-13이 충돌하는 경우에 대한 합리적 해석 |
| A3 | `01-PROTOTYPE.html`은 강사 기기에 배포된 적이 없다 | Runtime State Inventory | 낮음 — 배포됐더라도 v1에서 이미 같은 동작이었고 v2 회귀는 아님 |
| A4 | 되돌리기는 `gameOver`에서는 불가(마지막 판정은 "다음"을 누르기 전 `turnResolved`에서만 되돌릴 수 있음) | Pattern 6 | 낮음 — D-16 "다음 주사위 전까지"와 맞고, 결과 화면에서 되돌리기를 원하면 ResultView에 버튼만 추가하면 된다 |
| A5 | 출발 보너스 "한 턴 최대 1회"에서 extra 턴은 별개의 턴으로 본다(extra 턴에서 새 바퀴를 넘으면 다시 받을 수 있음) | Pattern 3/6 | 낮음 — 바퀴 기록이 이중 지급을 막으므로 실제로 받으려면 한 바퀴를 새로 돌아야 한다 |
| A6 | 재셔플 직후 직전 카드가 맨 위면 피하는 처리는 선택 사항 | Pattern 5 | 매우 낮음 |

## Open Questions

1. **최종 파일 이름(`types.ts`/`engine.ts` 유지 vs 새 이름)**
   - What we know: 단계별 green 유지와 이름 유지는 동시에 하기 어렵다(Pattern 8).
   - Recommendation: planner가 고른다. 계획 수를 줄이고 싶으면 B와 C를 합쳐 이름을 유지하고, 위험을 줄이고 싶으면 새 이름으로 추가한 뒤 교체한다.
2. **"다시 하기"가 콘텐츠와 설정을 다시 스냅샷할지**
   - What we know: D-27은 "다시 하기/처음으로"만 정했다.
   - Recommendation: 같은 참가자·같은 라운드 수로 하되, 콘텐츠·설정(실패 규칙·보너스·보드 크기)은 **새로 스냅샷**하고 보드도 새로 섞는다. 판 사이에 강사가 미션을 고쳤다면 반영되는 쪽이 자연스럽다.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | 테스트·빌드 | ✓ | (로컬 설치, CI는 node 20) | — |
| vitest + jsdom | 전체 테스트 | ✓ | 3.2.4 / 27.0.0 | — |
| TypeScript | `tsc -b` | ✓ | 5.9.3 | — |

기준선: `npx vitest run` → 23 files / 183 tests green, `npx tsc -b` → exit 0 (2026-10-22 실행). 외부 서비스 의존 없음.

## Test Strategy (Vitest — nyquist_validation=false라서 정식 Validation Architecture 대신 계획용 맵만 제공)

| 항목 | 값 |
|---|---|
| Framework | Vitest 3.2.4 + jsdom + @testing-library/react 16.3, `globals: true`, `src/test/setup.ts` |
| Quick run | `npx vitest run src/engine src/settings.test.ts src/dataPreservation.test.ts` |
| Full gate | `npx tsc -b && npx vitest run` (각 계획 완료 조건) |

| Req ID | Behavior | Type | File (신규=❌) |
|---|---|---|---|
| DATA-05 | v1 localStorage 원문 → 새 모듈 부팅 → 동일 콘텐츠, 원문 불변 / tripwire | unit | `src/dataPreservation.test.ts` ❌ |
| DATA-06 | v1 내보내기 원문·필드 누락 구형 파일 가져오기 성공 | unit | `src/lib/io.test.ts`(케이스 추가) |
| DATA-07 | 설정 키 분리, 손상 값 필드별 복구, 내보내기 JSON에 설정 없음, 가져오기 후 설정 불변 | unit | `src/settings.test.ts` ❌ |
| CFG-01~04 | 설정 탭 조작 → 스토어·localStorage 반영 → 재수화 후 유지 | component | `src/components/SettingsTab.test.tsx` ❌ |
| SETUP-07 | `assignAnimals` 중복 없음·자동 채움 / SetupView 고른 종 disabled | unit+component | `src/engine/animals.test.ts` ❌, `shell.test.tsx` |
| SETUP-08 | `estimateMinutes` 표 / 라운드 스텝퍼 초깃값 = 설정 defaultRounds, 1~20 클램프 | unit+component | `setup.test.ts`, `shell.test.tsx` |
| SETUP-09 | 난이도 누락 안내 문구 / 미션 0개면 시작 disabled | unit+component | `setup.test.ts`, `shell.test.tsx` |
| BOARD-04 | 보드 불변식(Pattern 4), 진행 중 board 참조 불변, 편집기 삭제 후에도 칸 이벤트 유지 | unit | `src/engine/board.test.ts` ❌, harness test |
| TURN-01/06 | 링 전수 테스트, 보너스 표(정확 도착·뒤로·재통과·이벤트 전진·턴당 1회·startBonus 0) | unit | `src/engine/ring.test.ts` ❌, engine test |
| TURN-02/03/04 | 퀘스트 도착 → 카드(칸 난이도·별), 성공 ⭐1/2/3, 실패 규칙 3종 × attempt 1/2, D-14/D-15 | unit | `engine.test.ts`(재작성) |
| TURN-05 | 이벤트 전진/후진 → 퀘스트면 판정, 이벤트·출발이면 종료(연쇄 없음), extra | unit | `engine.test.ts` |
| TURN-07 | extra 라운드 미포함, 연속 1회(suppressed), 같은 팀원 | unit | `engine.test.ts` |
| TURN-08 | undo → 같은 카드·attempt·별 복원, roll 후 불가, 직전 1회만, seq 단조 증가 | unit | `engine.test.ts` |
| ROUND-01/03 | 라운드 시나리오 표(Pitfall 3), 공동 우승, 전원 0점 | unit | `engine.test.ts`, `scoring.test.ts` ❌ |
| ROUND-04 | 지금 끝내기 확인 → 대기 퀘스트 무효 → 결과 화면 | unit+component | `engine.test.ts`, `hud.test.tsx` |
| 전체 | 시드 퍼즈 불변식(종료 보장·정규 턴 수 동일·별 비감소) | unit | `src/engine/fuzz.test.ts` ❌ |
| 화면 | 설정→시작→한 판 끝까지(App 수준, 시드 콘텐츠 + 강제 판정) | integration | `src/App.test.tsx` |

**삭제·재작성되는 테스트:** `scene.test.tsx`, `boardLayout.test.ts`, `moveHighlight.test.ts`, `diceRotation.test.ts`, `placement.test.ts`(삭제), `engine.test.ts`·`hud.test.tsx`·`shell.test.tsx`·`useGameStore.test.ts`(재작성), `App.test.tsx`(부제 문구·`.game-stage` 단언 확인). `rng.test.ts`, `store.test.ts`, `schema.test.ts`, `io.test.ts`, `usePresentation.test.ts`, 편집기 테스트들은 **유지**한다.

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | 계정 없음(Out of Scope) |
| V3 Session Management | no | — |
| V4 Access Control | no | 단일 기기 |
| V5 Input Validation | yes | Zod: 설정 localStorage 값(`SettingsSchema` 필드별 `.catch`), 가져오기 파일(기존 `ContentSchema` + 5MB 제한 + 확인 후 커밋, 무변경), 참가자 이름은 JSX 텍스트로만 렌더 |
| V6 Cryptography | no | (주사위는 `systemRng`가 `crypto.getRandomValues` 우선 — 공정성 목적, 보안 목적 아님) |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 조작·손상된 설정 localStorage 값(예: rounds 1e9 → 끝나지 않는 게임) | Tampering / DoS | `SettingsSchema` 범위 검증 + `.catch` 기본값, 스텝퍼 클램프 |
| 가져온 미션/이름 문자열로 마크업 주입 | Tampering (XSS) | JSX 텍스트 노드만 사용, `dangerouslySetInnerHTML` 금지(App.test.tsx XSS 테스트 유지) |
| 업데이트로 강사 콘텐츠 소실 | Repudiation/Data loss | 스키마·버전·키 불변 + tripwire + 부팅 픽스처 테스트 |

## Sources

### Primary (HIGH confidence)
- 코드 직접 확인: `src/store.ts`, `src/schema.ts`, `src/lib/io.ts`, `src/seed.ts`, `src/components/{Header,Tabs,SegmentedControl,ConfirmDialog}.tsx`, `src/engine/{types,engine,rng,setup,placement}.ts`, `src/harness/useGameStore.ts`, `src/game/{GameApp,PlayView,usePresentation,animation}.ts(x)`, `src/game/hud/*.tsx`, 테스트 파일들, `tsconfig.app.json`, `.github/workflows/deploy.yml`, `package.json`
- `node_modules/zustand/esm/middleware.mjs` (zustand 5.0.14) — persist hydrate/migrate/merge/setItem 순서, `toThenable` 동기 실행
- Zod 4.4.3 실행 결과(스크래치 `z.mjs`) — `.catch`/`.default`/unknown key strip/비객체 실패
- 보드 할당·보너스 수학 실행 결과(스크래치 `m.mjs`)
- `git log --follow src/store.ts src/schema.ts` — 저장 형식이 01-01 이후 불변
- 기준선 `npx vitest run`(183 green), `npx tsc -b`(exit 0)

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md`(엔진 진화·FSM·이벤트 로그·스냅샷 — §4 설정 위치와 시간 제한은 D-04/D-01로 폐기), `PITFALLS.md` 1/2/3/14/15/20, `FEATURES.md`(45초 근거, LOW 출처 기반 추정)

### Tertiary (LOW confidence)
- 없음

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 새 패키지 없음, 설치된 버전을 실측
- Data preservation: HIGH — persist 소스·git 이력·Zod 동작을 직접 확인
- Engine math/FSM: HIGH — 수학은 실행으로 확인. FSM 세부(로그 이벤트 이름, 파일 이름)는 권장안이며 planner 재량
- Pitfalls: HIGH — 코드 근거 + v2 연구 교차 확인

**Research date:** 2026-10-22
**Valid until:** 2026-11-21 (의존성 고정, 코드베이스 내부 연구라 안정적)
