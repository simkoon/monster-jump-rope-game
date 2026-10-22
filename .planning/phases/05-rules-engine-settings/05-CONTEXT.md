# Phase 5: 새 규칙 엔진 & 강사 설정 - Context

**Gathered:** 2026-10-22
**Status:** Ready for planning

<domain>
## Phase Boundary

3D 없이(임시 DOM 화면) 강사가 설정을 고르고, 순환판 새 규칙(주사위 → 이동 → 도착 칸 퀘스트 → 판정 → 별, 정한 라운드가 끝나면 별 최다 승리)으로 게임 한 판을 처음부터 끝까지 플레이할 수 있게 한다. 이 과정에서 v1 미션·이벤트(기기 저장분)와 v1 백업 JSON 파일은 하나도 잃지 않는다.

포함: 데이터 보존(DATA-05/06/07), 강사 설정(CFG-01~04), 시작 화면(SETUP-07/08/09), 칸 배치(BOARD-04), 턴 흐름(TURN-01~08), 라운드·승리(ROUND-01/03/04), 임시 DOM 플레이·결과 화면.
제외(다른 단계): 3D 순환판·주사위·카메라·DOM HUD 정식판(Phase 6), 치비 동물 3D 모델·표정(Phase 7), 성공 연출·시상식·효과음·실기기 안정성(Phase 8), "마지막 라운드!" 알림(ROUND-02, Phase 6).

</domain>

<decisions>
## Implementation Decisions

### 이미 확정된 규칙 (요구사항·마일스톤 결정에서 이어받음)
- **D-01:** 게임은 라운드 수로만 끝난다. 시간 제한 타이머는 없다 — v1 타이머·카운트다운(`timeLimitMs`, `DEFAULT_TIME_LIMIT_MS`, `remainingMs`)은 삭제하고 `EndReason = 'rounds-complete' | 'manual'`.
- **D-02:** 별은 쉬움 ⭐1 / 보통 ⭐2 / 어려움 ⭐3. 별은 어떤 경우에도 줄지 않는다.
- **D-03:** 실패 규칙 3종 — 같은 미션 한 번 더(기본) / 다른 미션으로 한 번 더 / 별 없이 다음 차례. 재도전은 1회까지이고, 재도전에서도 실패하면 별 없이 다음 차례.
- **D-04:** 강사 설정(실패 규칙·기본 라운드 수·출발 보너스·보드 크기)은 콘텐츠와 **별도 persist 키**에 저장한다. `ContentSchema`/`SCHEMA_VERSION`(=1)과 persist `name`(`powerjumping_content_v1`)은 올리거나 바꾸지 않는다 → v1 기기 데이터와 v1 백업 파일 호환 유지. 백업 JSON에는 설정이 들어가지 않는다.
- **D-05:** 데이터 보존 작업(v1 저장 데이터 픽스처 + v1 백업 파일 픽스처 테스트)을 엔진 작업보다 **먼저** 한다. 현재 identity `migrate`는 버전 상향 시 강사 미션을 시드로 덮어쓸 수 있으므로, 버전을 올리지 않더라도 회귀 테스트로 고정한다.
- **D-06:** 출발 보너스 기본 +1(끔/+1/+2), 보드 크기 기본 20칸(16/20/24).
- **D-07:** 이벤트 연쇄 없음 — 이벤트로 이동해 퀘스트 칸에 닿으면 그 퀘스트를 수행하고, 이벤트·출발 칸에 닿으면 더 해결하지 않는다.
- **D-08:** "한 번 더"는 같은 플레이어/팀이 추가 턴, 라운드에 세지 않고 연속 1회까지.
- **D-09:** 출발 보너스 — 앞으로 지나가거나(주사위 이동 또는 이벤트 전진) 정확히 멈추면 지급, 뒤로 지날 때는 없음, 같은 바퀴에 두 번 없음(바퀴 기록으로 이중 지급 방지), 한 턴 최대 1회.

### 보드 칸 구성
- **D-10:** 칸 비율 — 출발 칸 1개를 뺀 나머지의 약 75%가 퀘스트, 약 25%가 이벤트. 20칸 = 출발 1 + 퀘스트 14 + 이벤트 5. 16·24칸도 같은 비율(반올림, 이벤트 최소 1칸).
- **D-11:** 퀘스트 칸 난이도 비율 — 쉬움 50% / 보통 35% / 어려움 15% (14칸이면 약 7/5/2).
- **D-12:** 배치 — 매 게임 시작 때 무작위로 섞되 규칙 2개: 이벤트 칸끼리 붙지 않는다, 출발 바로 다음 칸은 쉬운 퀘스트. 이벤트 칸의 이벤트는 편집기 가중치(weight)로 뽑는다(weight 0은 놓이지 않음). 배치는 게임 내내 바뀌지 않는다(BOARD-04).
- **D-13:** 어떤 난이도의 미션이 0개면 시작 화면에서 "어려움 미션이 없어서 어려움 칸 없이 판을 만들어요" 식으로 안내하고, 그 난이도 칸을 빼고(남은 난이도 비율대로 채워) 진행한다. 미션이 아예 0개일 때만 시작을 막는다(SETUP-09, v1 MISSION-07 확장). 이벤트가 0개(또는 가중치 합 0)면 이벤트 칸 없이 퀘스트로 채운다.

### 실패·재도전·되돌리기
- **D-14:** 재도전에서 성공해도 별은 칸 난이도대로 **그대로 다** 받는다(감점 없음).
- **D-15:** 실패 규칙이 "다른 미션으로 한 번 더"인데 그 난이도 미션이 1개뿐이면 **같은 미션으로 재도전**한다.
- **D-16:** 판정 되돌리기 — **직전 판정 1회만**, **다음 주사위를 굴리기 전까지만** 가능. 주사위를 굴리면 되돌리기 기회가 사라진다.
- **D-17:** 되돌리면 **판정 화면으로 돌아간다** — 그 판정으로 받은 별과 재도전 횟수가 판정 전으로 복원되고, 같은 미션 카드가 다시 뜨며 강사가 성공/실패를 다시 고른다(직전 상태 스냅샷 방식).

### 라운드·한 번 더·예상 시간 (사용자 지시: 추천안으로 확정)
- **D-18:** "한 번 더"는 마지막 라운드의 마지막 플레이어에게도 **똑같이 허용**한다(규칙 예외 없음). 그 추가 턴이 끝난 뒤 게임이 끝난다.
- **D-19:** 기본 라운드 수 **5**, 고를 수 있는 범위 **1~20**(설정 화면과 시작 화면 모두 큰 −/+ 스텝퍼).
- **D-20:** 예상 소요 시간 = 참가자(플레이어/팀) 수 × 라운드 수 × **45초**, 분 단위로 올림해 "약 N분"으로 표시. "한 번 더"·재도전 시간은 계산에 넣지 않는다.
- **D-21:** 팀전 — 팀 단위로 턴을 세고 팀원이 돌아가며 수행(v1 `memberTurnIndex` 순환 유지). 재도전과 "한 번 더"는 **같은 팀원**이 이어서 한다.
- **D-22:** "지금 끝내기"는 확인 대화상자를 거쳐 즉시 종료. 판정 대기 중인 퀘스트는 별 없이 무효 처리하고 현재 별로 우승을 정한다(동점은 공동 우승).

### 설정 화면·임시 플레이 화면 (사용자 지시: 추천안으로 확정)
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 범위·요구사항
- `.planning/ROADMAP.md` §"Phase 5: 새 규칙 엔진 & 강사 설정" — 목표·성공 기준 5개
- `.planning/REQUIREMENTS.md` — DATA-05~07, CFG-01~04, SETUP-07~09, BOARD-04, TURN-01~08, ROUND-01/03/04 원문 + Out of Scope 표(타이머·설정 백업 포함 금지·별 잃기 금지 등)
- `.planning/PROJECT.md` — 핵심 가치, 제약(아동용 큰 UI, 오프라인, IP), Key Decisions
- `.planning/STATE.md` §Blockers/Concerns [Phase 5] — persist migrate 위험, 설정 별도 키 방향

### 연구 (v2.0)
- `.planning/research/SUMMARY.md` — Phase 5 범위, Gaps to Address(설정 저장 위치·실패 규칙·출발 보너스 정책)
- `.planning/research/ARCHITECTURE.md` — 엔진 진화 방식(ring/scoring/buildBoard, FSM, 이벤트 로그, harness 스냅샷)
- `.planning/research/PITFALLS.md` — Pitfall 1(스키마 상향 → 시드 덮어쓰기), 2(순환 수학), 3(라운드 카운팅), 14·15·20
- `.planning/research/FEATURES.md` — 장르 관행, 실패 규칙·예상 시간(45초) 근거
- `.planning/research/STACK.md` — Phase 5는 3D 패키지 설치 불필요(Phase 6)

### v1 이력 (참고)
- `.planning/milestones/v1.0-phases/02-playable-core-loop/02-CONTEXT.md` — v1 헤드리스 엔진·팀 모델(D-01)·harness seam 결정
- `.planning/milestones/v1.0-phases/01-foundation-content-editor/01-CONTEXT.md` — 편집기·스키마·저장·가져오기 결정

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/store.ts` — 콘텐츠 persist(`powerjumping_content_v1`, version 1, identity migrate, Zod read-guard merge). 손대지 않거나 회귀 테스트로 고정할 대상. 설정 스토어는 같은 패턴(persist + Zod merge 가드)으로 별도 키에 만든다.
- `src/schema.ts` — `ContentSchema`(version literal 1), `MissionSchema.diff`(easy/normal/hard), `EventSchema.eff`(forward/backward/extra, steps 0~20, weight 0~999, label 보너스/함정/'').
- `src/lib/io.ts` — 내보내기/가져오기(크기 → JSON.parse → ContentSchema.safeParse → 확인 → replaceAll). v1 백업 파일 픽스처 테스트 대상, 설정은 내보내지 않음.
- `src/engine/rng.ts` — `mulberry32`, `systemRng`, `rollDie`, `weightedPick`, `uniformPick` 그대로 재사용.
- `src/engine/setup.ts` — `buildParticipants`(팀 모델·memberNames), `canStart`, `MAX_PARTICIPANTS=8` 재사용·확장(동물, 난이도 누락 안내).
- `src/components/SegmentedControl.tsx`, `ConfirmDialog.tsx`, `Tabs.tsx`, `Toast.tsx` — 설정 탭·지금 끝내기 확인에 재사용.
- `src/game/hud/SetupView.tsx` — 시작 화면 로직(모드·인원·이름·팀원) 재사용, 보드 프리셋·시간 제한 제거.

### Established Patterns
- 엔진은 React/DOM/시계 없는 순수 모듈 + RNG 주입 + 불변 전이(`src/engine/*` 헤더 계약).
- `src/harness/useGameStore.ts`가 엔진과 콘텐츠 스토어를 잇는 유일한 seam.
- 테스트: Vitest 3.2.4 + Testing Library, 결정적 RNG(`mulberry32`)로 엔진 시나리오 테스트(23개 테스트 파일 존재).
- `.npmrc` legacy-peer-deps, vite/vitest 설정 분리 — 새 의존성 설치 시 유지.

### Integration Points
- `src/App.tsx` — 편집기 탭에 "설정" 추가, 게임 모드 부제 문구.
- `src/game/GameApp.tsx` — setup → play → result 라우팅(임시 화면으로 교체), `usePresentation` busy 게이트는 Phase 6에서 확장.
- `src/engine/types.ts` — `Phase`, `Participant.character → animal`, `GameConfig`(rounds·failRule·startBonus·boardSize), `GameState`(별·라운드·보드 칸·로그·undo 스냅샷), `EndReason`.

</code_context>

<specifics>
## Specific Ideas

- 사용자는 이번 단계의 모든 회색 지대에서 추천안을 택했다("싹다 추천으로 하고 만들어보자"). 보드·실패·되돌리기 영역은 직접 답했고, 라운드·설정/임시 화면 영역은 추천안 일괄 적용.
- 보드 관련 원칙(방향·출발 랜드마크·순위가 즉시 읽힘)은 Phase 6의 3D 보드에서 본격 적용하지만, 임시 화면에서도 칸 순서·말 위치·별 순위는 읽혀야 한다.
- 최종 UI는 견본보다 확실히 더 귀엽게 — Phase 5 임시 화면은 기능 위주, 설정 탭·시작 화면은 기존 편집기 톤 유지.

</specifics>

<deferred>
## Deferred Ideas

- 게임 중 라운드 수 바꾸기(QOL-04), 마지막 라운드 별 2배(QOL-05), 난이도 비율 직접 설정(QOL-06) — v2.x 이후(REQUIREMENTS Future).
- 칸 하나하나 편집하는 보드 에디터 — Out of Scope.

</deferred>

---

*Phase: 05-rules-engine-settings*
*Context gathered: 2026-10-22*
