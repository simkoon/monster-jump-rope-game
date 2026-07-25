# Phase 1: 기반 & 콘텐츠 편집기 - Context

**Gathered:** 2026-07-25
**Status:** Ready for planning

<domain>
## Phase Boundary

강사가 줄넘기 **미션**과 **이벤트**를 자유롭게 만들고 관리하는 **데이터 편집기 앱**을 세운다. CRUD·검색·필터, localStorage 자동 저장, JSON 내보내기/가져오기(검증 포함)까지. 3D·게임 루프는 아직 없고, 이 단계만으로 강사가 단독으로 쓸 수 있는 콘텐츠 관리 도구다.

**In scope:** MISSION-01~06, EVENT-01~05, DATA-01~04 (편집기 CRUD·검색·난이도·카테고리, 이벤트 효과·확률, localStorage 자동 저장, JSON 내보내기/가져오기 + 검증).
**Out of scope (다른 phase):** 카드 뽑기·게임 루프(Phase 2), 3D 보드/토큰(Phase 3), 닌텐도풍 아트·캐릭터·로고(Phase 4). 편집기 UI의 아트 마감도 Phase 4 소관 — Phase 1은 기능 위주.

</domain>

<decisions>
## Implementation Decisions

### 난이도 · 카테고리 체계
- **D-01:** 미션 난이도는 **고정 3단계 — 쉬움 / 보통 / 어려움**. 강사 자유 입력 아님. 드롭다운/버튼으로 빠르게 고르고, 색상·아이콘으로 일관되게 표시(아동 UI 지향). (MISSION-05)
- **D-02:** 미션 카테고리는 **자유롭게 추가·수정·삭제 가능한 목록**. 기본 예시 카테고리를 시드로 제공하되, 강사가 새 카테고리를 얼마든지 만들 수 있어야 한다. **이유(강사 발언):** 아이마다 난도가 달라 카테고리 체계를 유연하게 바꿀 수 있어야 함. (MISSION-06)
- **D-03:** 한 미션이 **여러 카테고리를 태그처럼** 가질 수 있다(다중 카테고리). 단일 카테고리 아님. → 편집 UI는 태그 추가/제거식, 필터는 "해당 태그를 가진 미션" 기준.
- **D-04:** 미션 찾기 = **이름 텍스트 검색 + 카테고리/난이도 필터 조합**. 상단 검색창 + 카테고리·난이도 칩/드롭다운 필터를 함께 적용(예: "이중뛰기 태그 중 어려움"). (MISSION-04)

### 이벤트 효과 · 확률 모델
- **D-05:** 이벤트 발생 확률은 **가중치 숫자(weight)** 로 입력. 합이 100이 아니어도 되며 **자동 정규화**한다. 이벤트를 추가/삭제해도 나머지 값을 다시 맞출 필요 없음. 퍼센트(%) 직접 입력 아님. (EVENT-04, EVENT-06의 기초)
- **D-06:** 내부 효과 종류는 **3가지뿐 — 앞으로 N칸 / 뒤로 N칸 / 한 번 더**. (EVENT-05)
- **D-07:** "보너스 / 함정"은 **별도 게임 메커니즘이 아니라 표시용 라벨**이다. 보너스 = 앞으로(N칸)에 붙는 이름·색상, 함정 = 뒤로(N칸)에 붙는 이름·색상. 데이터 모델: `effect ∈ {FORWARD, BACKWARD, EXTRA_TURN}` + 강사가 정하는 표시 라벨/색상. → 엔진(Phase 2)이 처리할 효과 종류가 3개로 고정돼 범위가 작아진다.
- **D-08:** "앞으로/뒤로 N칸"의 N은 **이벤트마다 고정 숫자**(예: "앞으로 3칸"). 범위(최소~최대) 랜덤 아님. "한 번 더"는 N 값 불필요.

### Claude's Discretion (미논의 — 연구/계획에서 확정, 아래는 권장 방향)
Phase 1 스코프 안이지만 이번 논의에서 다루지 않은 항목들. 다음 기본 방향을 권장하되 researcher/planner가 확정한다:
- **시드/예시 콘텐츠:** 첫 실행 시 빈 화면이면 강사가 막막하므로, 실제 줄넘기 기술 기반 **예시 미션·이벤트 몇 개를 시드로 채워두는 방향 권장**(리셋/삭제 가능하게). 확정은 계획 단계.
- **편집기 화면 구성:** 미션 편집기와 이벤트 편집기를 **탭/섹션으로 분리** 권장(각각 목록+검색+편집 폼). react-hook-form + Zod로 폼 검증.
- **JSON 가져오기 동작:** DATA-04에 따라 형식/버전 검증 실패 시 **기존 데이터를 절대 덮어쓰지 않고 오류 안내**는 고정. 검증 통과 시 "덮어쓰기 vs 병합"은 계획 단계에서 확정(기본은 명시적 확인 후 덮어쓰기 권장).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 요구사항 · 범위
- `.planning/ROADMAP.md` — Phase 1 상세(Goal, Success Criteria, 3개 plan 분할: 01-01 스캐폴드, 01-02 편집기, 01-03 내보내기/가져오기)
- `.planning/REQUIREMENTS.md` §미션 관리(MISSION-01~06), §이벤트 칸 관리(EVENT-01~05), §데이터 저장(DATA-01~04) — 이 phase의 요구사항 원문
- `.planning/PROJECT.md` §Constraints, §Key Decisions — localStorage + JSON 백업, 아동 대상 UI 제약

### 기술 스택 (프로젝트 지침)
- `.claude/CLAUDE.md` §Technology Stack / Recommended Stack — React 19 + TS 5 + Vite 8, Zustand 5 `persist`(localStorage), Zod 4(폼 검증 + import 검증 공용), react-hook-form 7. schemaVersion 포함 스키마 + 마이그레이션. R3F/three/drei는 Phase 3부터(Phase 1 미사용).

_외부 ADR/SPEC 없음 — 상기 문서와 위 decisions로 요구사항이 온전히 캡처됨._

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- 없음 — 그린필드. 소스 코드 아직 없음(`.planning/`, `.git`, config만 존재). Plan 01-01이 스캐폴드를 세운다.

### Established Patterns
- 없음(첫 코드). CLAUDE.md 권장 스택이 사실상의 패턴 기준: Zustand 단일 스토어 + `persist`, Zod 스키마 1개로 폼·import 양쪽 검증, schemaVersion+migrate로 스키마 진화 대비.

### Integration Points
- localStorage(zustand persist)가 이 phase의 유일한 영속 계층. JSON export = persist 슬라이스 직렬화, import = `JSON.parse` → Zod 검증 → 통과 시 `setState`. Phase 2 엔진이 이 미션·이벤트 데이터를 소비하므로, 데이터 모델(미션: 이름/설명/난이도/카테고리[], 이벤트: 이름/effect/N/weight/표시라벨)이 Phase 2의 계약이 된다.

</code_context>

<specifics>
## Specific Ideas

- 카테고리 유연성은 강사가 명시적으로 요구한 핵심: "자유롭게 목록을 추가할 수 있어야 해. 아이들에 따라 난도가 달라지기 때문." → 카테고리 편집을 일급 기능으로 취급.
- 확률은 강사가 "이건 더 자주, 저건 드물게"를 직관적으로 조절하는 경험이 목표(가중치 방식 선택 이유). 정규화된 실제 확률을 UI에서 보조 표시하면 좋음.
- 효과 모델을 3종(FORWARD/BACKWARD/EXTRA_TURN)으로 최소화 — 보너스/함정은 라벨. 엔진 범위 축소가 의도.

</specifics>

<deferred>
## Deferred Ideas

None — 논의가 phase 범위 안에 머물렀다. (시드 콘텐츠·편집기 레이아웃·import 병합 여부는 다른 phase가 아니라 이 phase의 미확정 항목으로, 위 "Claude's Discretion"에 권장 방향과 함께 기록됨.)

</deferred>

---

*Phase: 1-기반 & 콘텐츠 편집기*
*Context gathered: 2026-07-25*
