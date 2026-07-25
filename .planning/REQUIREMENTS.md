# Requirements: 파워점핑 — 신나는 줄넘기 미션

**Defined:** 2026-07-25
**Core Value:** 카드로 뽑은 줄넘기 미션을 실제로 성공 → 주사위 → 전진 → 먼저 도착하면 승리, 이 핵심 루프가 아이들에게 신나고 매끄럽게 돌아가고, 강사가 미션을 자유롭게 관리할 수 있는 것.

## v1 Requirements

초기 릴리스 범위. 각 요구사항은 로드맵 단계(phase)에 매핑된다.

### 시작 & 설정 (SETUP)

- [ ] **SETUP-01**: 사용자는 시작 화면에서 "파워점핑" 오리지널 제목 로고와 시작 버튼을 볼 수 있다
- [ ] **SETUP-02**: 사용자는 시작 화면에서 개인전 또는 팀전 모드를 선택할 수 있다
- [ ] **SETUP-03**: 사용자는 플레이어(또는 팀)의 인원 수를 설정할 수 있다
- [ ] **SETUP-04**: 사용자는 각 플레이어/팀의 이름을 입력할 수 있다
- [ ] **SETUP-05**: 사용자는 각 플레이어/팀에 캐릭터(남자/여자)를 선택해 배정할 수 있다
- [ ] **SETUP-06**: 사용자는 설정을 마친 뒤 게임을 시작할 수 있다

### 핵심 게임 루프 (LOOP)

- [ ] **LOOP-01**: 현재 차례 플레이어가 턴 시작 버튼을 누르면 카드가 회전하는 연출과 함께 미션 1장이 뽑힌다
- [ ] **LOOP-02**: 뽑힌 미션(줄넘기 기술)의 이름/설명/난이도가 화면에 크게 표시된다
- [ ] **LOOP-03**: 사용자(강사)는 미션 수행 결과를 "성공" 또는 "실패" 버튼으로 수동 판정할 수 있다
- [ ] **LOOP-04**: 실패 시 전진 없이 다음 플레이어에게 차례가 넘어간다
- [ ] **LOOP-05**: 성공 시 주사위가 등장하고, 굴리면 1~6 중 한 값이 나온다
- [ ] **LOOP-06**: 주사위 값만큼 3D 보드판 위에서 현재 플레이어의 말(토큰)이 칸을 이동하는 애니메이션이 재생된다
- [ ] **LOOP-07**: 말이 멈춘 칸에 이벤트가 있으면 해당 이벤트 효과(보너스/함정/앞으로 N칸/뒤로 N칸/한 번 더 등)가 적용된다
- [ ] **LOOP-08**: "한 번 더" 효과는 같은 플레이어가 추가 턴을, 그 외에는 다음 플레이어에게 차례가 넘어간다
- [ ] **LOOP-09**: 어떤 플레이어/팀이 결승 칸에 먼저 도달하면 승리로 판정되고 결과 화면이 표시된다
- [ ] **LOOP-10**: 사용자는 결과 화면에서 다시 시작하거나 시작 화면으로 돌아갈 수 있다

### 미션 관리 (MISSION)

- [ ] **MISSION-01**: 사용자는 새 줄넘기 미션(이름, 설명, 난이도, 카테고리)을 추가할 수 있다
- [ ] **MISSION-02**: 사용자는 기존 미션의 내용을 수정할 수 있다
- [ ] **MISSION-03**: 사용자는 미션을 삭제할 수 있다
- [ ] **MISSION-04**: 사용자는 이름/카테고리 등으로 미션을 검색할 수 있다
- [ ] **MISSION-05**: 사용자는 미션의 난이도를 변경할 수 있다 (예: 쉬움/보통/어려움)
- [ ] **MISSION-06**: 사용자는 미션의 카테고리를 변경할 수 있다
- [ ] **MISSION-07**: 카드 뽑기는 이 미션 목록에서 뽑으며, 목록이 비어 있으면 게임 시작 전 안내한다

### 이벤트 칸 관리 (EVENT)

- [ ] **EVENT-01**: 사용자는 새 이벤트(이름, 효과 종류, 효과 값, 발생 확률)를 추가할 수 있다
- [ ] **EVENT-02**: 사용자는 기존 이벤트를 수정할 수 있다
- [ ] **EVENT-03**: 사용자는 이벤트를 삭제할 수 있다
- [ ] **EVENT-04**: 사용자는 이벤트의 발생 확률(가중치)을 변경할 수 있다
- [ ] **EVENT-05**: 지원 이벤트 효과 종류에는 보너스, 함정, 앞으로 N칸, 뒤로 N칸, 한 번 더가 포함된다
- [ ] **EVENT-06**: 보드 칸에 이벤트가 배치되는 방식은 설정된 확률/가중치를 따른다

### 데이터 저장 (DATA)

- [x] **DATA-01**: 미션·이벤트·설정 데이터는 브라우저(localStorage)에 자동 저장되어 새로고침 후에도 유지된다
- [ ] **DATA-02**: 사용자는 미션·이벤트 목록을 파일(JSON)로 내보내기 할 수 있다
- [ ] **DATA-03**: 사용자는 파일(JSON)에서 미션·이벤트 목록을 가져오기(복원) 할 수 있다
- [ ] **DATA-04**: 가져오기 시 데이터 형식/버전을 검증해, 잘못된 파일은 기존 데이터를 덮어쓰지 않고 오류를 안내한다

### 디자인 & 아트 (ART)

- [ ] **ART-01**: 전체 UI는 닌텐도풍의 밝고 경쾌한 색상으로, 아동이 좋아할 스타일이다
- [ ] **ART-02**: 남자 캐릭터와 여자 캐릭터가 각각 3D로 제공되며 줄넘기를 든 모습을 포함한다
- [ ] **ART-03**: 캐릭터는 상황(성공/실패/이동 등)에 따라 다양한 표정을 보여준다
- [ ] **ART-04**: 버튼은 크고 단순하며 텍스트를 최소화해 아동이 쉽게 조작할 수 있다
- [ ] **ART-05**: 게임 제목 "파워점핑" 로고는 실제 브랜드를 쓰지 않은 오리지널 디자인이다

## v2 Requirements

이후 릴리스로 연기. 추적하되 현재 로드맵에는 없음.

### 사운드 & 연출 (AUDIO)

- **AUDIO-01**: 성공/실패/이동/승리 시 효과음(SFX)
- **AUDIO-02**: 배경음악(BGM) 및 음소거 토글

### 진행 편의 (QOL)

- **QOL-01**: 게임 도중 저장/이어하기
- **QOL-02**: 미션 카테고리별 게임(특정 카테고리만 출제)
- **QOL-03**: 승패 기록/통계

## Out of Scope

명시적으로 제외. 스코프 크립 방지용.

| Feature | Reason |
|---------|--------|
| 온라인 멀티플레이어 / 여러 기기 실시간 동기화 | 강사 기기 1대 로컬 운영으로 충분, 서버 복잡도·비용 과다 |
| 계정 / 로그인 / 인증 | 단일 기기 현장 운영이라 불필요 |
| 줄넘기 성공 자동 판정(센서/영상 인식) | 강사 수동 판정으로 대체, v1 범위 과다 |
| 실제 브랜드 / 저작권 캐릭터 / 상표 사용 | 오리지널 디자인만 사용 |
| 결제 / 수익화 | 강습 도구, 수익 모델 없음 |
| 물리 엔진 기반 주사위/캐릭터 | 턴제 보드게임에 과함 — 트윈 애니메이션으로 대체 |

## Traceability

로드맵 생성 시 채워진다. 각 요구사항은 정확히 한 개의 phase에 매핑된다.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 2 | Pending |
| SETUP-02 | Phase 2 | Pending |
| SETUP-03 | Phase 2 | Pending |
| SETUP-04 | Phase 2 | Pending |
| SETUP-05 | Phase 2 | Pending |
| SETUP-06 | Phase 2 | Pending |
| LOOP-01 | Phase 2 | Pending |
| LOOP-02 | Phase 2 | Pending |
| LOOP-03 | Phase 2 | Pending |
| LOOP-04 | Phase 2 | Pending |
| LOOP-05 | Phase 2 | Pending |
| LOOP-06 | Phase 3 | Pending |
| LOOP-07 | Phase 2 | Pending |
| LOOP-08 | Phase 2 | Pending |
| LOOP-09 | Phase 2 | Pending |
| LOOP-10 | Phase 2 | Pending |
| MISSION-01 | Phase 1 | Pending |
| MISSION-02 | Phase 1 | Pending |
| MISSION-03 | Phase 1 | Pending |
| MISSION-04 | Phase 1 | Pending |
| MISSION-05 | Phase 1 | Pending |
| MISSION-06 | Phase 1 | Pending |
| MISSION-07 | Phase 2 | Pending |
| EVENT-01 | Phase 1 | Pending |
| EVENT-02 | Phase 1 | Pending |
| EVENT-03 | Phase 1 | Pending |
| EVENT-04 | Phase 1 | Pending |
| EVENT-05 | Phase 1 | Pending |
| EVENT-06 | Phase 2 | Pending |
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 1 | Pending |
| ART-01 | Phase 4 | Pending |
| ART-02 | Phase 4 | Pending |
| ART-03 | Phase 4 | Pending |
| ART-04 | Phase 3 | Pending |
| ART-05 | Phase 4 | Pending |

**Coverage:**

- v1 requirements: 38 total (열거된 ID 기준 — SETUP 6 + LOOP 10 + MISSION 7 + EVENT 6 + DATA 4 + ART 5)
- Mapped to phases: 38 ✓
- Unmapped: 0 ✓

> 참고: 이전 헤더에 "34 total"로 기재되어 있었으나 실제 열거된 v1 요구사항 ID는 38개다. 로드맵은 38개 전부를 정확히 한 phase씩에 매핑했다. (Phase 1: 15, Phase 2: 17, Phase 3: 2, Phase 4: 4)

---
*Requirements defined: 2026-07-25*
*Last updated: 2026-07-25 after roadmap traceability mapping*
