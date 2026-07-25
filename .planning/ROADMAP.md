# Roadmap: 파워점핑 — 신나는 줄넘기 미션

## Overview

이 로드맵은 연구가 강조한 의존성 순서를 따른다: **콘텐츠가 있어야 미션을 뽑고, 헤드리스 루프가 검증되어야 3D를 얹는다.** Phase 1은 강사가 미션·이벤트를 편집하고 저장·백업하는 데이터 앱을 세운다(3D 없이 단독으로 쓸 수 있는 강사 도구). Phase 2는 단위 테스트 가능한 헤드리스 게임 엔진과 단순 DOM 버튼으로 카드→판정→주사위→이동→이벤트→승리의 전체 루프를 처음부터 끝까지 플레이 가능하게 만든다. Phase 3는 검증된 루프를 Three.js 3D 보드·토큰·주사위 연출과 아동용 실제 UI로 감싼다(캐릭터는 플레이스홀더 토큰). Phase 4는 닌텐도풍 아트, 표정 있는 남/여 캐릭터, 오리지널 로고를 시간 상자 안에서 마감한다 — 아트는 절대 플레이 가능 루프를 막지 않는다.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: 기반 & 콘텐츠 편집기** - 강사가 미션·이벤트를 CRUD·검색·편집하고, localStorage 자동 저장 + JSON 내보내기/가져오기로 백업한다 (completed 2026-07-25)
- [ ] **Phase 2: 플레이 가능한 핵심 루프 & 설정** - 검증된 헤드리스 엔진 위에서 단순 버튼 UI로 전체 게임(카드→판정→주사위→이동→이벤트→승리)을 처음부터 끝까지 플레이한다
- [ ] **Phase 3: 3D 보드 & 실제 게임 UI** - 검증된 루프를 Three.js 3D 보드·토큰·주사위·카드 연출과 아동용 큰 버튼 UI로 시각화한다(캐릭터는 플레이스홀더 토큰)
- [ ] **Phase 4: 닌텐도풍 아트 & 캐릭터** - 밝고 경쾌한 아트, 표정 있는 남/여 줄넘기 캐릭터, 오리지널 "파워점핑" 로고로 마감한다

## Phase Details

### Phase 1: 기반 & 콘텐츠 편집기

**Goal**: 강사가 줄넘기 미션과 이벤트 라이브러리를 자유롭게 만들고 관리하며, 그 데이터가 자동 저장되고 파일로 백업·복원된다 (3D·게임 없이 단독으로 쓸 수 있는 강사 도구).
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: MISSION-01, MISSION-02, MISSION-03, MISSION-04, MISSION-05, MISSION-06, EVENT-01, EVENT-02, EVENT-03, EVENT-04, EVENT-05, DATA-01, DATA-02, DATA-03, DATA-04
**Success Criteria** (what must be TRUE):

  1. 강사가 미션을 추가·수정·삭제하고 이름/카테고리로 검색하며, 난이도·카테고리를 변경할 수 있다
  2. 강사가 이벤트를 추가·수정·삭제하고, 효과 종류(보너스/함정/앞으로 N칸/뒤로 N칸/한 번 더)와 발생 확률(가중치)을 설정할 수 있다
  3. 편집한 미션·이벤트·설정이 localStorage에 자동 저장되어 새로고침 후에도 그대로 유지된다
  4. 강사가 미션·이벤트 목록을 JSON 파일로 내보내고 다시 가져올 수 있으며, 형식/버전이 잘못된 파일은 기존 데이터를 덮어쓰지 않고 오류가 안내된다

**Plans**: 3/3 plans complete
**UI hint**: yes

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Walking Skeleton: 스캐폴드(Vite/React 19/TS 5.9.3/Tailwind 4/Zustand persist/Zod), 버전 포함 schema.ts, read-guard localStorage 자동 저장, 시드 라이브러리를 보여주는 부팅되는 2탭 셸(읽기 전용) — 새로고침 유지 (R3F는 Phase 3)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — 미션 편집기: 추가/수정/삭제, 이름 검색 + 난이도(OR)·카테고리(AND) 필터, 다중 카테고리 인라인 관리 + 공용 접근성 Modal/ConfirmDialog/SegmentedControl

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — 이벤트 편집기(추가/수정/삭제, 효과/가중치 실시간 정규화 %) + JSON 내보내기/가져오기(Zod 검증·잘못된 파일은 덮어쓰지 않고 오류 안내)

### Phase 2: 플레이 가능한 핵심 루프 & 설정

**Goal**: 여러 명(개인전/팀전)이 시작 화면에서 설정을 마치고, 카드 뽑기→성공/실패 판정→주사위→전진→이벤트→승리의 전체 게임을 단순 버튼 UI로 처음부터 끝까지 플레이할 수 있다 (단위 테스트된 헤드리스 엔진 기반, 3D 이전에 루프 검증).
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05, SETUP-06, LOOP-01, LOOP-02, LOOP-03, LOOP-04, LOOP-05, LOOP-07, LOOP-08, LOOP-09, LOOP-10, MISSION-07, EVENT-06
**Success Criteria** (what must be TRUE):

  1. 강사가 시작 화면에서 개인전/팀전을 고르고 플레이어·팀의 인원·이름·캐릭터를 설정한 뒤 게임을 시작할 수 있다 (미션 목록이 비어 있으면 시작 전 안내한다)
  2. 턴 버튼을 누르면 미션 목록에서 미션 1장이 뽑혀 이름·설명·난이도가 크게 표시되고, 강사가 성공/실패를 수동 판정한다
  3. 실패하면 전진 없이 다음 차례로 넘어가고, 성공하면 주사위(1~6)를 굴려 나온 수만큼 현재 플레이어의 말이 칸을 전진한다
  4. 말이 멈춘 칸의 이벤트 효과(보너스/함정/앞으로 N칸/뒤로 N칸/한 번 더)가 설정된 확률에 따라 적용되며, "한 번 더"는 같은 플레이어가 추가 턴을 갖고 그 외에는 다음 플레이어로 넘어간다
  5. 어떤 플레이어/팀이 결승 칸에 먼저 도달하면 승리·결과 화면이 표시되고, 다시 시작하거나 시작 화면으로 돌아갈 수 있다

**Plans**: 1/3 plans executed
**UI hint**: yes

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — 헤드리스 게임 엔진 + 격리 RNG(분포 테스트): 순수 TS types/rng/placement/setup/engine — 턴 FSM, 가중치 뽑기, 주사위, 이동(초과 통과 승리), 확률 기반 이벤트 배치(EVENT-06), 승리·시간종료·동점 판정, 팀 공유 말·빈 목록 가드 (LOOP-01·03·04·05·07·08·09, EVENT-06, MISSION-07)

**Wave 2** *(엔진 위에서 동작 — 02-01 완료 후)*

- [ ] 02-02-PLAN.md — 시작/설정 흐름 하네스 + 엔진-스토어 브리지: 개인전·팀전 선택, 인원·이름·캐릭터 배정, 보드 프리셋·제한시간, 게임 시작, 미션 목록 비어있음 안내·차단 (SETUP-01~06, MISSION-07)

**Wave 3** *(설정 하네스 위에서 동작 — 02-02 완료 후)*

- [ ] 02-03-PLAN.md — 플레이 & 결과 플레인 DOM 하네스: 카드 뽑기·성공/실패·주사위·위치·이벤트·한 번 더, DOM 카운트다운+즉시 종료, 승자/공동승자 결과·재시작 (LOOP-01·02·03·04·05·07·08·09·10)

### Phase 3: 3D 보드 & 실제 게임 UI

**Goal**: Phase 2에서 검증된 게임 루프가 Three.js 3D 보드·토큰·주사위·카드 연출로 시각화되고, 아동이 조작하기 쉬운 크고 단순한 실제 게임 UI로 감싸진다 (캐릭터는 플레이스홀더 토큰, 아트는 아직 아님).
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: LOOP-06, ART-04
**Success Criteria** (what must be TRUE):

  1. 성공 후 주사위를 굴리면 3D 보드판 위에서 현재 플레이어의 말(토큰)이 나온 수만큼 칸을 이동하는 애니메이션이 재생된다
  2. 카드 뽑기·주사위 굴리기·말 이동 연출이 엔진과 동기화되어(ANIM_DONE), 애니메이션이 끝나야 다음 진행으로 넘어간다
  3. 게임 전체 흐름(시작→플레이→결과)이 크고 단순하며 텍스트가 최소화된 아동용 버튼 UI로 조작된다
  4. 여러 게임을 연속으로 진행해도 3D 리소스 누수 없이(GPU 메모리 안정) 대상 태블릿에서 원활하게 동작한다

**Plans**: 2 plans
**UI hint**: yes

Plans:

- [ ] 03-01: 이벤트 버스로 엔진과 연결된 3D 씬 (보드, 플레이스홀더 토큰, 주사위, 카드), ANIM_DONE 게이팅, 메시 재사용/dispose, 픽셀비율 상한
- [ ] 03-02: 던져버릴 하네스를 대체하는 실제 아동용 앱 셸/HUD (큰 단순 버튼, 미션 카드 오버레이, 턴 HUD, 결과 화면) + 태블릿 성능 점검

### Phase 4: 닌텐도풍 아트 & 캐릭터

**Goal**: 완전히 동작하는 게임이 밝고 경쾌한 닌텐도풍 아트로 마감되고, 표정이 살아있는 남/여 줄넘기 캐릭터와 오리지널 "파워점핑" 로고가 적용된다 (시간 상자 안에서만; 플레이 가능 루프를 절대 막지 않는다).
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: ART-01, ART-02, ART-03, ART-05
**Success Criteria** (what must be TRUE):

  1. 전체 UI(시작·설정·플레이·결과·편집기)가 밝고 경쾌한 닌텐도풍 컬러 스타일로 통일된다
  2. 남자·여자 줄넘기 캐릭터가 3D로 보드 위 플레이스홀더 토큰을 대체하며, 각자 줄넘기를 든 모습을 보여준다
  3. 캐릭터가 성공·실패·이동 등 상황에 따라 다양한 표정으로 반응한다
  4. 시작 화면에 실제 브랜드를 쓰지 않은 오리지널 "파워점핑" 제목 로고가 표시된다

**Plans**: 2 plans
**UI hint**: yes

Plans:

- [ ] 04-01: 모든 화면에 적용되는 닌텐도풍 비주얼 시스템 + 오리지널 "파워점핑" 로고
- [ ] 04-02: 플레이스홀더 토큰을 대체하는 남/여 3D 줄넘기 캐릭터 + 상황별 표정(성공/실패/이동) — 텍스처 스왑 우선, 시간 상자

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. 기반 & 콘텐츠 편집기 | 3/3 | Complete   | 2026-07-25 |
| 2. 플레이 가능한 핵심 루프 & 설정 | 1/3 | In Progress|  |
| 3. 3D 보드 & 실제 게임 UI | 0/2 | Not started | - |
| 4. 닌텐도풍 아트 & 캐릭터 | 0/2 | Not started | - |
