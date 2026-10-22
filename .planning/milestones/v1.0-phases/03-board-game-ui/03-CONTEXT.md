# Phase 3: 3D 보드 & 실제 게임 UI - Context

**Gathered:** 2026-07-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2에서 검증된 **헤드리스 게임 엔진(src/engine)** 을 **Three.js/R3F 3D 보드·토큰·주사위·카드 연출**로 시각화하고, Phase 2의 던져버릴 DOM 하네스를 **아동이 조작하기 쉬운 크고 단순한 실제 게임 UI(앱 셸/HUD)** 로 교체한다. 캐릭터는 **플레이스홀더 토큰**(단순 색/모양) — 표정 있는 귀여운 캐릭터·아트·로고는 Phase 4.

**In scope:** LOOP-06(주사위 값만큼 3D 보드 위 토큰 이동 애니메이션), ART-04(크고 단순한 최소 텍스트 버튼). 3D 씬(보드/토큰/주사위/카드) + ANIM_DONE 게이팅 + 리소스 dispose/성능 예산 + 실제 아동용 앱 셸/HUD/결과 화면.
**Out of scope (다른 phase):** 닌텐도풍 아트 통일·표정 있는 남/여 3D 줄넘기 캐릭터·오리지널 로고(Phase 4). 새 게임 규칙/설정(Phase 2에서 확정). 엔진 로직 변경(재사용만).
</domain>

<decisions>
## Implementation Decisions

### 렌더링 스택
- **D-01 (R3F):** **React Three Fiber v9 + three r185 + @react-three/drei v10** 사용(CLAUDE.md 권장). R3F가 3D 씬을 선언적 React 컴포넌트로 만들어 기존 DOM UI/상태(엔진)와 한 스토어에서 통합된다. 바닐라 three 대신 R3F(무거운 DOM UI가 있으므로). Vite/React 19 라인과 호환.
- **D-02 (신규 의존성):** 이 단계에서 `three`, `@react-three/fiber@9`, `@react-three/drei@10` 설치(Phase 1·2에선 미설치였음). 물리 엔진(rapier/cannon)은 **설치 안 함** — 주사위는 트윈(CLAUDE.md "The Dice Decision" 기본값).

### 3D 씬 (보드/토큰/주사위/카드)
- **D-03 (보드):** 저폴리 스타일 3D 보드 — Phase 2 엔진의 **보드 칸 수(짧게/보통 프리셋)** 만큼 칸이 이어진 경로. 결승 칸 강조. 아트가 아니라 형태(스타일라이즈드 저폴리 프리미티브)로 시작.
- **D-04 (토큰):** 플레이어/팀별 **플레이스홀더 토큰**(서로 다른 색의 단순 말/폰 형태). 캐릭터 메시는 Phase 4. 팀전은 한 팀당 토큰 하나(Phase 2 계약과 동일).
- **D-05 (주사위):** **트윈(canned) 주사위 애니메이션** — 엔진에서 미리 뽑힌 1~6 값으로, 주사위 메시를 빠르게 회전시켰다가 해당 면으로 스냅. 물리 없음, 결정적. (CLAUDE.md 권장 기본.)
- **D-06 (카드):** 카드 뽑기 연출(회전/뒤집기 트윈) 후 미션 이름·설명·난이도를 크게 표시(LOOP-01/02). 3D 카드 or DOM 오버레이 중 구현 편의로 선택(drei `Html` 오버레이 허용).

### 엔진 ↔ 3D 동기화
- **D-07 (ANIM_DONE 게이팅):** 3D 연출(카드 뽑기·주사위·토큰 이동)이 엔진과 **이벤트/상태로 동기화**되어, **애니메이션이 끝나야(ANIM_DONE) 다음 진행으로 넘어간다**(성공 기준 2). 엔진은 순수(Phase 2 계약) — 3D 레이어가 애니메이션 완료를 엔진에 신호로 전달해 다음 전이를 허용. 벽시계/타이머는 여전히 UI 레이어 소유.

### 성능 (대상: 태블릿)
- **D-08 (dispose/재사용):** 여러 게임을 연속 진행해도 **3D 리소스 누수 없이**(GPU 메모리 안정) 동작(성공 기준 4). 지오메트리/머티리얼 **재사용**, 언마운트 시 **dispose**, `dpr`(pixelRatio) **상한** 설정. R3F 관례(useMemo/캐시, drei `<Bounds>`) 활용.

### 실제 아동용 UI (하네스 교체, ART-04)
- **D-09 (앱 셸/HUD):** Phase 2의 플레인 버튼 하네스를 **실제 아동용 게임 UI**로 교체 — **크고 단순한 버튼, 텍스트 최소화**(ART-04), 미션 카드 오버레이, 현재 차례 HUD(누구 차례/팀원 순번), 주사위·성공/실패 버튼, 제한시간/결과 화면. Phase 1 UI-SPEC의 밝은 닌텐도풍 토큰(색/버튼 프레스 감/라운드)을 **재사용**해 통일감. 게임 전체 흐름(시작→플레이→결과)이 이 UI로 조작됨(성공 기준 3).
- **D-10 (편집기와 공존):** 강사용 편집기(Phase 1)는 그대로 유지 — 앱은 "게임"과 "편집기" 두 모드를 오갈 수 있게(현재 App의 뷰 전환 유지/개선). 게임 모드가 기본 진입.

### Claude's Discretion (세부 — 계획/실행에서 확정)
- 카메라 앵글(고정 아이소메트릭 vs 약한 궤도) — 아동 조작 쉬움 우선, 고정/살짝 기울인 뷰 권장.
- 토큰 이동 트윈 경로(칸별 hop vs 슬라이드)와 이벤트 효과(앞/뒤 N칸) 연출.
- drei `Html` 오버레이로 미션 카드/HUD를 DOM으로 얹을지, 순수 3D로 그릴지(구현 편의로 결정 — 접근성·큰 버튼엔 DOM HUD가 유리).
- `dpr` 상한값, 타깃 태블릿 성능 점검 방식.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 요구사항 · 범위
- `.planning/ROADMAP.md` — Phase 3 상세(Goal, Success Criteria, 2 plan: 03-01 이벤트버스 연결 3D 씬(보드/토큰/주사위/카드)+ANIM_DONE+dispose+dpr 상한, 03-02 실제 아동용 앱 셸/HUD + 태블릿 성능 점검)
- `.planning/REQUIREMENTS.md` — LOOP-06, ART-04
- `.planning/PROJECT.md` — 아동 대상 UI 제약, 태블릿 1대 운영

### Phase 1·2 산출물 (재사용 계약)
- `.planning/phases/02-playable-core-loop/02-01-SUMMARY.md` 및 `src/engine/*` — 순수 엔진 공개 API(createGame/drawCard/judge/rollDice/advanceTurn/endGame/resetGame, types.ts GameState/Phase FSM, rng, placement, setup). 3D/UI가 이 엔진을 구독. **엔진은 변경 없이 재사용**.
- `src/harness/*` (Phase 2 DOM 하네스) — 교체 대상(로직 흐름 참고용). `useGameStore` 브리지 로직 재사용/이관.
- `.planning/phases/01-foundation-content-editor/01-UI-SPEC.md` — 밝은 닌텐도풍 디자인 토큰(색/버튼/라운드/라이트·다크). 게임 UI가 이 시스템을 확장.
- `src/store.ts`, `src/schema.ts` — 미션·이벤트 데이터.

### 기술 스택 / 자산 파이프라인
- `.claude/CLAUDE.md` §Technology Stack(R3F 9 / three r185 / drei 10 버전 호환표), §"The Dice Decision"(트윈 기본, 물리 스킵), §"What NOT to Use"(런타임 FBX/OBJ 금지, 물리 주사위 기본 금지). Phase 3에서 R3F 스택을 처음 도입.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/engine/*` (Phase 2): 순수 헤드리스 엔진 — 3D 씬이 GameState를 읽어 보드/토큰/주사위/카드를 렌더. FSM Phase가 어떤 연출을 보일지 결정. **이 API가 Phase 3의 입력 계약.**
- `src/harness/*` (Phase 2): 전체 루프 배선(카드→판정→주사위→이동→이벤트→결과→재시작)과 `useGameStore` 브리지 — 새 아동용 UI가 같은 흐름을 크고 단순한 버튼으로 다시 구현(하네스는 던져버림).
- Phase 1 컴포넌트/토큰(Modal/Toast/색 CSS): 게임 UI에서 재사용.

### Established Patterns
- 순수 엔진 + React 레이어 구독(Zustand). R3F도 같은 스토어를 공유해 3D와 DOM UI가 한 상태를 본다. 애니메이션 완료 → 엔진 다음 전이(ANIM_DONE) 패턴을 명시적으로 도입.

### Integration Points
- 새 R3F `<Canvas>` 씬 + DOM HUD(오버레이)가 Phase 2 엔진을 구동. 시작/설정 화면은 Phase 2 setup을 재사용하되 아동용으로 감쌈. Phase 4가 이 위에 아트·캐릭터·로고만 얹는다(구조는 그대로).
</code_context>

<specifics>
## Specific Ideas
- 아동 조작 최우선: 큰 버튼·최소 텍스트·직관적 흐름. 주사위/이동은 "신나는" 연출이 핵심 가치(부드럽고 빠른 트윈).
- 연속 플레이 안정성(태블릿에서 GPU 누수 없음)이 명시적 성공 기준 — dispose/dpr 상한을 처음부터.
- 아트가 루프를 막지 않는다: 토큰·보드는 플레이스홀더 형태로, Phase 4가 마감.
</specifics>

<deferred>
## Deferred Ideas
- 표정 있는 남/여 3D 줄넘기 캐릭터, 닌텐도풍 아트 통일, 오리지널 로고 → Phase 4.
- 사운드/BGM(AUDIO, v2), 저장·이어하기(QOL, v2).
</deferred>

---

*Phase: 3-3D 보드 & 실제 게임 UI*
*Context gathered: 2026-07-25 (user-directed "proceed"; stack per CLAUDE.md, visual details at Claude's discretion — placeholder tokens, tween dice)*
