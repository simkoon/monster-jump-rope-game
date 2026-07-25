# Phase 2: 플레이 가능한 핵심 루프 & 설정 - Context

**Gathered:** 2026-07-25
**Status:** Ready for planning

<domain>
## Phase Boundary

여러 명(개인전/팀전)이 시작 화면에서 설정을 마치고, **카드 뽑기 → 성공/실패(강사 수동 판정) → 주사위 → 전진 → 이벤트 → 승리**의 전체 게임을 **단순 버튼 DOM UI**로 처음부터 끝까지 플레이한다. 단위 테스트된 **헤드리스 게임 엔진** 위에서 동작하며, 3D 이전에 루프를 검증한다. Phase 1의 미션·이벤트 데이터를 소비한다.

**In scope:** SETUP-01~06, LOOP-01~05·07~10, MISSION-07, EVENT-06 (+ 아래 세션/승리 규칙 결정).
**Out of scope (다른 phase):** 3D 보드·토큰·주사위 연출(Phase 3, LOOP-06), 아동용 실제 게임 UI/큰 버튼 마감(Phase 3, ART-04), 닌텐도풍 아트·캐릭터·로고(Phase 4). Phase 2의 UI는 **던져버릴 단순 버튼 하네스** — 아트는 최소, Phase 3가 실제 UI로 대체한다.
</domain>

<decisions>
## Implementation Decisions

### 게임 모드 (개인전 / 팀전)
- **D-01:** 시작 화면에서 **개인전 / 팀전 둘 다 선택 가능** (SETUP-02). 개인전 = 각자 말 하나. 팀전 = **팀이 말 하나를 공유**하고 팀원이 번갈아 미션을 수행(그 팀의 턴에 지정 순번의 팀원이 미션 수행 → 성공 시 팀 말 전진).
- 각 플레이어/팀: 이름 입력(SETUP-04), 캐릭터(남/여) 배정(SETUP-05), 인원/팀 수 설정(SETUP-03).

### 세션 길이 (20분 수업용 — 강사 요청)
- **D-02:** 이 도구는 **줄넘기 수업 끝에 ~20분 짧게** 돌리는 용도. 게임 길이를 설정으로 조절: **보드 칸 수 프리셋**을 제공(예: "짧게" / "보통"), **기본값 = 짧게**. 한 판이 대략 20분 안에 끝나도록 짧은 보드가 기본. (칸 수가 게임 시간의 핵심 레버.)

### 승리 판정 (두 가지 종료 경로)
- **D-03:** **정상 승리 = 결승선에 먼저 닿거나 넘는 사람/팀** (초과 통과 허용). **정확히 결승 칸에 안 떨어져도 됨** — 주사위 값이 남아도 결승에 도달/초과하면 그 즉시 승리. 강사 요청 명시.
- **D-04:** **제한시간 + 시간 종료 승리.** 설정에 **제한시간(기본 20분)** 옵션 + 게임 중 언제든 누를 수 있는 **"지금 순위로 마치기(게임 종료)"** 버튼. 타이머가 0이 되거나 강사가 종료를 누르면 → **결승에 가장 가까운(가장 앞선) 플레이어/팀이 승리**. (강사 요청: "시간이 안 될 땐 정확히 도착하기 전에 먼저 앞서나간 사람이 승리.")
- **D-05 (동점 처리 — Claude 판단):** 시간 종료 시 최선두가 **동점(같은 칸)** 이면 **공동 승리로 표시**하고 강사가 최종 승자를 선택할 수 있게 한다. 정상 승리는 턴제라 한 명씩 결승 도달을 처리하므로 단일 승자.

### 핵심 루프 (LOOP)
- **D-06:** 턴 순서: 현재 차례 → **카드 뽑기(미션 1장, 이름·설명·난이도 크게 표시)** → 강사가 **성공/실패 수동 판정** → 실패면 전진 없이 다음 차례 → 성공이면 **주사위(1~6)** → 나온 수만큼 전진 → **멈춘 칸의 이벤트 효과 적용** → "한 번 더"면 같은 플레이어/팀 추가 턴, 그 외 다음 차례 → 승리/시간종료 판정. (LOOP-01~05·07~10)
- **D-07 (이벤트 배치, EVENT-06):** 보드 칸의 이벤트는 Phase 1에서 만든 이벤트 라이브러리에서 **가중치(weight) 기반**으로 배치. 격리된 RNG 모듈로 배치·주사위·카드 뽑기를 처리(분포 테스트 가능). 효과 종류는 Phase 1 계약 그대로 forward(앞으로 N)/backward(뒤로 N)/extra(한 번 더).
- **D-08 (빈 목록 안내, MISSION-07):** 카드 뽑기는 Phase 1 미션 목록에서 뽑는다. **미션 목록이 비어 있으면 게임 시작 전에 안내**하고(편집기로 유도) 시작을 막는다.

### 아키텍처
- **D-09:** **헤드리스 게임 엔진**(턴 FSM, 가중치 뽑기, 주사위, 이동, 이벤트 배치·적용, 승리·시간종료 판정)을 **React/DOM과 분리**해 단위 테스트한다. 격리 RNG 모듈은 분포 테스트 포함. UI는 이 엔진을 이벤트/상태로 구독하는 **플레인 DOM 하네스**(Phase 3가 3D+실제 UI로 대체). Phase 1의 store/schema(미션·이벤트) 재사용.

### Claude's Discretion (미논의 세부 — 계획에서 확정)
- 보드 칸 프리셋의 정확한 칸 수(예: 짧게 ~20칸 / 보통 ~30칸)와 기본 인원/팀 수 기본값.
- 타이머 표시 방식(카운트다운 표시)과 "게임 종료" 버튼 위치(하네스라 최소).
- 팀전에서 팀원 순번 UI(누가 이번에 수행하는지 표시).
- 남/여 캐릭터는 이 단계에선 이름표/색상 등 플레이스홀더로만(실제 3D는 Phase 3~4).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 요구사항 · 범위
- `.planning/ROADMAP.md` — Phase 2 상세(Goal, Success Criteria, 3 plan: 02-01 시작/설정, 02-02 헤드리스 엔진+RNG, 02-03 DOM 하네스)
- `.planning/REQUIREMENTS.md` §시작&설정(SETUP-01~06), §핵심 루프(LOOP-01~10; LOOP-06은 Phase 3), §미션(MISSION-07), §이벤트(EVENT-06)
- `.planning/PROJECT.md` §Constraints, §Key Decisions

### Phase 1 산출물(계약 — 반드시 재사용)
- `.planning/phases/01-foundation-content-editor/01-CONTEXT.md` — 미션/이벤트 데이터 모델 결정(D-01~D-08): 난이도 enum, 다중 카테고리, 이벤트 effect(forward/backward/extra)+steps+weight+label
- `.planning/phases/01-foundation-content-editor/01-SUMMARY.md`들 및 실제 코드: `src/schema.ts`(Zod 타입), `src/store.ts`(미션·이벤트 store), `src/seed.ts`, `src/lib/normalize.ts`(가중치→% — 이벤트 배치 확률에 재사용 가능)
- `.planning/phases/01-foundation-content-editor/01-UI-SPEC.md` — 색/토큰(하네스에서 재사용은 선택; Phase 3가 실제 UI)

### 기술 스택
- `.claude/CLAUDE.md` §Technology Stack — React 19 + TS + Vite + Zustand. **주사위/캐릭터 물리엔진 금지**(트윈/로직으로 대체). Three.js/R3F는 여전히 Phase 3부터(Phase 2 미사용). 테스트는 vitest(Phase 1에 설정됨).
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (Phase 1에서 완성)
- `src/store.ts` / `src/schema.ts`: 미션·이벤트 라이브러리와 타입. 엔진이 카드 뽑기·이벤트 배치의 소스로 소비. store는 React/DOM import 없는 순수 상태 — 엔진에서 쓰기 좋음.
- `src/lib/normalize.ts`: 가중치→정규화 %(이벤트 배치 확률 계산에 재사용 가능).
- `src/seed.ts`: 예시 미션 6·이벤트 4·카테고리 3 (빈 목록 아님 → 바로 플레이 가능).
- 접근성 컴포넌트(Modal/ConfirmDialog/Toast/SegmentedControl)와 토큰 CSS: 하네스에서 필요 시 재사용.
- vitest 테스트 하네스가 이미 구성됨 → 헤드리스 엔진 단위·분포 테스트 바로 작성 가능.

### Established Patterns
- 단일 Zustand store + 순수 액션(부작용 없는 상태 전이). 엔진도 같은 스타일(순수 함수/축소기)로 만들면 테스트 용이. RNG는 주입 가능한 격리 모듈로(결정적 테스트).

### Integration Points
- 엔진은 Phase 1 데이터를 읽어 카드·이벤트를 구성하고, 승리/시간종료 상태를 방출. DOM 하네스는 엔진 상태를 구독해 버튼으로 조작. Phase 3가 이 하네스를 3D+실제 UI로 교체(엔진은 그대로 재사용) — 엔진의 공개 API가 Phase 3의 계약이 된다.
</code_context>

<specifics>
## Specific Ideas

- 강사 실제 사용 맥락: **수업 끝 ~20분**. 그래서 "짧게" 기본 + 제한시간 + 즉시 종료가 핵심 — 시간 안에 못 끝내도 최선두 승리로 깔끔히 마무리.
- "정확히 도착 안 해도 먼저 앞선 사람 승리" = 초과 통과 허용 + 시간종료 시 리더 승리. exact-landing 강제 금지(아이들에게 답답함 방지).
- 팀전은 말 공유·번갈아 수행 — 협동 느낌.
</specifics>

<deferred>
## Deferred Ideas

- 게임 도중 저장/이어하기(QOL-01, v2), 카테고리별 게임(QOL-02, v2), 승패 기록/통계(QOL-03, v2) — v1 범위 밖.
- 사운드/BGM(AUDIO, v2).
- 실제 아동용 UI·3D 연출은 Phase 3, 아트·캐릭터·로고는 Phase 4.
</deferred>

---

*Phase: 2-플레이 가능한 핵심 루프 & 설정*
*Context gathered: 2026-07-25 (user-directed; session-length & win-rule decisions per instructor, tie-break at Claude's discretion)*
