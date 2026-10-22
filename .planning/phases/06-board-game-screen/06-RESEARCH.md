# Phase 6: 3D 순환판 & 게임 화면 - Research

**Researched:** 2026-10-23
**Domain:** React 19 + R3F 9 3D 보드 씬, 연출 디렉터(이벤트 로그 → 비트 큐), DOM HUD 오버레이, 카메라 맞춤, WebGL 컨텍스트 손실 복구
**Confidence:** HIGH (설치·테스트·빌드를 레포 사본에서 직접 실행해 확인) / MEDIUM (iOS 실기기 동작, 연출 길이 체감)

## Summary

이번 단계의 핵심은 3D 그림 자체보다 **연출 계약(Director)**이다. Phase 5 엔진은 `rollDice` 한 번에 이동·출발 보너스·이벤트·미션 뽑기까지 모두 확정하고, 그 결과를 `log.events`로 남긴다. 그래서 엔진 `phase`는 탭 직후 이미 `awaitingJudgement`가 되어 있다. 화면이 연출을 끝내기 전에 퀘스트 카드나 "다음" 버튼이 먼저 보이는 일을 막으려면, 연출 큐가 **같은 클릭 안에서 동기적으로** `busy=true`가 되어야 한다. 이를 위해 Director는 `useEffect`가 아니라 `useGameStore.subscribe`로 로그 변화를 받아야 한다. 이 차이는 레포 사본에서 테스트로 확인했다. `useEffect` 방식은 `awaitingJudgement && !busy`인 프레임을 한 번 렌더하고, `subscribe` 방식은 렌더하지 않는다. [VERIFIED: 로컬 vitest]

3D 스택은 D-05 버전(three 0.186.1 · @types/three 0.186.0 · fiber 9.8.2 · drei 10.7.9 · test-renderer 9.1.1)이 지금도 npm `latest`다. 레포 사본에서 기존 lockfile 위에 exact pin으로 설치했고 ERESOLVE 없이 끝났다. 기존 637개 테스트와 프로토타입 테스트 15개가 모두 통과했고, `tsc -b && vite build`도 성공했다. `React.lazy`로 분리하면 메인 청크는 348→350 KB(+1.5 KB)이고 three는 3D 청크(약 925 KB, gzip 246 KB)에만 들어간다. [VERIFIED: npm registry + 로컬 빌드]

`ringLayout(n)`(출발 칸 = 아래-오른쪽, 시계 방향)과 `fitCamera(aspect, …)`는 three를 import하지 않는 순수 함수로 만들 수 있다. 카메라를 시선 방향으로만 옮기면 카메라 공간의 x·y는 변하지 않는다는 성질을 쓰면 반복 계산 없이 닫힌 식으로 거리를 구한다. 이 방식이 390×844, 844×390, 768×1024, 1024×1366, 1440×900, 360×640, 320×480 화면에서 16/20/24칸 판의 모든 꼭짓점을 화면 안에 넣는다는 것을 three `Vector3.project` 테스트로 확인했다. [VERIFIED: 로컬 vitest]

**Primary recommendation:** 먼저 `timeline.ts`(순수) + `usePresentation` v2(비트 큐, 비트별 watchdog, id 멱등 완료, `skipAll`) + `subscribe` 기반 `useDirector`를 테스트와 함께 만든다. 그다음 lazy `GameCanvas`(단일 Canvas, `flat`, `dpr` 상한, ErrorBoundary, `key` 리마운트)와 three 없는 순수 레이아웃·카메라 모듈을 붙인다. 3D 씬은 비트를 소비만 한다.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 규칙 결과(위치·별·라운드·차례) | 순수 엔진 `src/engine` (변경 없음) | 하네스 `useGameStore` | D-01: 엔진이 진실이고 화면은 따라간다 |
| 연출 순서·길이·완료 판정 | Director (DOM 쪽 Zustand 스토어, 메인 청크) | — | 3D가 꺼지거나 로딩 중이어도 게임이 막히면 안 되므로 Canvas 밖에 둔다 |
| 표시용 위치·별 (`displayed`) | `usePresentation` | 엔진(드레인 시 resync) | 별이 연출보다 먼저 오르거나 말이 순간이동하는 것을 막는다 |
| 판·칸·화살표·말·주사위 그리기 | 브라우저 WebGL (lazy 3D 청크) | — | 비트를 소비만 하고 상태는 바꾸지 않는다 |
| 한글 글자·버튼·점수판·배너·카드 | DOM HUD (메인 청크) | — | STAB-04, D-02: 3D 텍스트 금지 |
| 판 좌표·카메라 거리 계산 | 순수 함수 (three import 없음) | 3D 청크가 소비 | jsdom 단위 테스트 가능, 메인 청크를 오염시키지 않음 |
| 컨텍스트 손실 감지·복구 | DOM 셸(`GameStage`)의 오버레이 + Canvas `key` | 3D 청크(`onCreated`에서 리스너 등록) | 복구 버튼은 DOM이어야 3D가 죽어도 누를 수 있다 |
| 오프라인 표시 | 빌드 산출물(번들 내 코드·시스템 폰트) | 3D 청크 예열(preload) | 외부 CDN 요청 0, lazy 청크는 온라인일 때 미리 받아 둔다 |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### 이어받은 결정 (Phase 5 · 마일스톤)
- **D-01:** 엔진은 순수·시계 없음 계약 그대로. 3D 화면은 엔진 상태를 **바꾸지 않고** 엔진이 남긴 도메인 이벤트 로그(`GameLog.events`: rolled/moved/startBonus/landed/eventApplied/questDrawn/judged/…)를 연출 비트로 재생한다. 별·위치의 진실은 엔진, 화면은 `displayed` 값으로 뒤따른다.
- **D-02:** 3D 공간 안에 한글 텍스트 금지(STAB-04). drei `<Text>`/troika 등 폰트를 받는 3D 텍스트 사용 금지. 글자는 모두 DOM 오버레이.
- **D-03:** 외부 CDN 요청 금지 — HDRI·원격 폰트·원격 모델 없음. 조명은 코드로 만든 라이트만(STAB-04).
- **D-04:** 물리 엔진 없음, 주사위·이동은 트윈(자체 `useFrame(delta)` 타임라인). 후처리(postprocessing) 없음, 섀도맵 없음(가짜 바닥 그림자/ContactShadows 수준만).
- **D-05:** 스택 — three / @react-three/fiber 9 / @react-three/drei 10 exact pin, `@react-three/test-renderer`(dev). 버전은 `.planning/research/STACK.md` 권장(three 0.186.1 · @types/three 0.186.0 · fiber 9.8.2 · drei 10.7.9 · test-renderer 9.1.1) 기준, 설치 시점 레지스트리 확인. 기존 lockfile 위에서 설치(`.npmrc` legacy-peer-deps 유지).
- **D-06:** 캔버스는 게임 중 **하나만** 유지(Canvas 단일·lazy 로드). 결과 화면은 Phase 5 ResultView 그대로(캔버스 언마운트 허용 — 판 사이 GPU 누수 점검은 Phase 8 STAB-01).

#### 판 모양과 카메라
- **D-07:** [auto] 사각 순환판 — 네 변에 칸을 고르게 나누고 네 모서리 칸을 둔다. 보드 크기(16/20/24)는 엔진 `board` 길이를 그대로 따른다(16=변당 4칸+모서리 공유, 20=변당 5, 24=변당 6 식으로 둘레를 균등 배치하는 순수 함수 `ringLayout(n)`).
- **D-08:** [auto] **출발 칸은 화면 아래-오른쪽 모서리**, 진행 방향은 **시계 방향**(아래 변을 따라 왼쪽으로 → 왼쪽 변 위로 → 위 변 오른쪽으로 → 오른쪽 변 아래로). 부루마불·모노폴리 관례.
- **D-09:** [auto] 카메라는 **고정 쿼터뷰**(위에서 약 50~60° 내려다봄), 사용자 회전·줌 없음(OrbitControls 없음). 순수 함수 `fitCamera(aspect, hudInsets)`가 가로/세로 FOV 중 빡빡한 쪽에 맞춰 판 전체(+말 높이 여유)가 화면에 들어오게 거리 계산. 세로 폰(390×844)·가로 태블릿·노트북 모두 판 전체가 보여야 한다(BOARD-01). 리사이즈·회전 시 재계산.
- **D-10:** [auto] 이동 중 카메라 추적 없음(전체 판이 항상 보이는 것이 "3초 읽기"에 유리).

#### 칸 표현 (글자 없이 읽히게 — BOARD-02/03)
- **D-11:** [auto] 칸 사이 **간격**을 둔다(칸 크기의 약 12~15%) — 하나씩 셀 수 있게. 칸은 둥근 사각 블록(RoundedBox), 밝은 캔디 톤.
- **D-12:** [auto] **출발 칸 = 랜드마크**: 다른 칸보다 크고(약 1.4배) 높은 받침 + 아치/깃발 게이트 3D 도형 + 금색 계열. 멀리서도 한눈에 구분.
- **D-13:** [auto] **진행 방향**: 칸마다 바닥에 작은 화살표(셰브런) 도형을 다음 칸 방향으로 배치. 모서리 칸은 꺾인 방향.
- **D-14:** [auto] **퀘스트 칸**: 난이도 색 — 쉬움 = 초록, 보통 = 주황/노랑, 어려움 = 빨강/분홍(기존 편집기 난이도 색 토큰과 같은 색상 계열을 사용) + 칸 위에 **받을 별 개수만큼 작은 3D 별**(⭐1/2/3)이 떠 있다.
- **D-15:** [auto] **이벤트 칸**: 퀘스트 칸과 다른 모양(원형/육각 발판)과 보라 계열 + 효과별 3D 아이콘 — 앞으로 = 앞쪽을 향한 큰 화살표, 뒤로 = 뒤쪽 화살표(경고색), 한 번 더 = 회전 화살표(🔁 모양). 이동 칸 수는 3D에 표시하지 않는다(도착 후 DOM 배너로 안내).
- **D-16:** [auto] 칸 번호는 표시하지 않는다(순환판이라 결승까지 거리 개념 없음, 3D 텍스트 금지). 대신 주사위 결과가 나오면 **목적지 칸 하이라이트 + 경로 점**을 잠깐 보여 준 뒤 이동(v1 quick-lbq 패턴 재사용).

#### 말(임시 말)과 이동
- **D-17:** [auto] 임시 말 = 둥근 캡슐+머리 형태의 장난감 말, **참가자 색**(점수판과 같은 색)으로 구분. 동물 모습은 Phase 7. 같은 칸에 여러 말이 있으면 칸 안에서 작은 고정 오프셋으로 비켜 세운다(완전한 구분은 Phase 7 BOARD-05).
- **D-18:** [auto] 지금 차례 말은 발밑 링 + 살짝 통통 튀는 대기 동작으로 강조.
- **D-19:** [auto] 연출 타이밍 — 주사위 굴림 약 1.0초 → 목적지 미리보기 약 0.5초 → 칸당 약 0.25초 홉(포물선 점프) → 출발 보너스/이벤트 짧은 표시. 이벤트로 인한 이동도 같은 홉으로 재생. 모든 비트 길이는 데이터(타임라인)로 두어 watchdog 예산을 자동 계산(v1 `PREVIEW_S` 누락 버그 재발 방지).

#### 주사위
- **D-20:** [auto] 3D 주사위는 v1 `d7b9b73` Dice(둥근 모서리·광택)를 복원·개량 — 판 가운데에서 굴러 결과 면이 위로 오며 멈춘다. 결과 수는 엔진이 이미 정한 값(`rolled.face`)으로 스냅. 주사위 눈은 3D 점(글자 아님).
- **D-21:** [auto] 주사위 버튼은 화면 아래쪽 **큰 🎲 버튼**(글자 최소, 엄지 영역). 판 위 주사위를 직접 탭해도 굴릴 수 있게 하지는 않는다(오작동 방지).

#### 화면 정보 (DOM HUD — HUD-01~04, ROUND-02)
- **D-22:** [auto] 세로 화면 배치: **위** = 차례 바(지금 차례: 색 점 + 이름, 팀전이면 "이번엔 ○○ 님!", 다음 차례 작게) + 라운드 `r/R`(●●●○○ 점 표시) + 지금 끝내기, **가운데** = 3D 판, **아래** = 큰 주사위/다음 버튼 + 가로 스크롤 없는 **별 점수판**(별 순 정렬, 동점 같은 등수, 말과 같은 색 점·Phase 5 동물 이모지). 가로 화면에서는 점수판을 오른쪽 세로 패널로.
- **D-23:** [auto] 퀘스트 카드·판정(✅/❌)·되돌리기·출발 보너스/이벤트 안내는 3D 위 DOM 오버레이(Phase 5 MissionOverlay 재사용·재스킨). 카드가 떠 있는 동안에도 판은 뒤에 보인다.
- **D-24:** [auto] "마지막 라운드!" — 마지막 라운드의 첫 턴이 시작될 때 화면 가운데 큰 DOM 배너 약 1.5초(ROUND-02), 이후 라운드 표시에 강조색 유지.
- **D-25:** [auto] 연출 중(주사위·미리보기·홉·안내 비트)에는 진행 버튼을 **숨기고**(비활성 아님), 비트가 끝나야 나타난다(HUD-03). Phase 5의 400ms 입력 잠금은 유지·통합. 연출 건너뛰기 탭은 Phase 8 범위.
- **D-26:** [auto] Phase 5 `RingStrip`(칸 줄)은 3D 판으로 대체되어 플레이 화면에서 제거한다(컴포넌트·테스트 정리는 planner 재량).

#### 3D 화면 꺼짐 복구 & 오프라인 (STAB-02/04)
- **D-27:** [auto] `webglcontextlost` 감지 시 3D 영역 위에 큰 **"🔄 화면 다시 그리기"** 버튼 오버레이. 누르면 `<Canvas key>` 증가로 캔버스를 다시 만들고, 상태는 Zustand에 있으므로 별·위치·차례가 그대로 복원된다(진행 중 연출은 최종 상태로 스냅). 탭 숨김(visibilitychange) 동안 frameloop 정지.
- **D-28:** [auto] 성능 기본값 — DPR 상한 2(폰은 1.5 검토), 공유 geometry/material 모듈, 칸은 InstancedMesh 또는 소수 메시, 프레임 루프는 연출 중에만 연속 렌더(`frameloop="demand"` + invalidate) 우선 검토.
- **D-29:** [auto] 실기기 확인(iPhone/iPad Safari) 항목은 단계 끝 사람 확인(UAT)으로 남긴다 — 컨텍스트 손실 재현, 세로 화면 맞춤. 자동 테스트는 jsdom + `@react-three/test-renderer`(씬 구조·`advanceFrames` 타임라인) + 순수 함수(`ringLayout`, `fitCamera`, 타임라인 예산) 단위 테스트.

### Claude's Discretion
- 정확한 색상 값·조명 배치·칸/말/주사위 치수(UI-SPEC 단계에서 확정).
- 연출 디렉터 구조(`buildTimeline(events) → Beat[]`, `usePresentation` v2 큐·비트별 watchdog·id 멱등 완료) — 연구 ARCHITECTURE 권장안을 따르되 세부는 planner 재량.
- 3D 모듈 lazy import 경계, 파일 이름.
- InstancedMesh vs 개별 메시, `frameloop` 모드 최종 선택.

### Deferred Ideas (OUT OF SCOPE)
- 치비 동물 말·표정·같은 칸 최대 8말 구분 — Phase 7.
- 성공 연출(컨페티·별 비행·배너), 연출 탭 건너뛰기, 효과음, 시상식, 5판 연속 누수 점검, iPhone/iPad 최종 실기기 UAT — Phase 8.
- 칸 번호 표시 — 3D 텍스트 금지 원칙상 보류(필요하면 DOM 라벨로 재검토).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BOARD-01 | 3D 사각 순환판, 세로 폰에서도 판 전체가 한 화면에 | `ringLayout(n)`(§Code 1), `fitCamera` 닫힌 식(§Code 2) + 7개 화면 비율 투영 테스트(검증 완료), Canvas는 HUD 사이 grid 셀에(Pattern 5) |
| BOARD-02 | 출발 랜드마크, 칸마다 방향, 칸 간격 | 칸 간격 pitch 1.13–1.15, 출발 칸 1.4배 겹침 계산과 바깥 대각 오프셋(Pitfall 7), `heading[i]`로 셰브런 회전, 모서리 꺾인 화살표 |
| BOARD-03 | 글자 없이 칸 종류 구분 | 난이도 색 InstancedMesh(`instanceColor`) + 별 InstancedMesh(개수 = 별 합), 이벤트는 육각 발판 + 아이콘 지오메트리, `<Canvas flat>`로 CSS 토큰 색 일치(Pitfall 5) |
| HUD-01 | 별 순 점수판, 동점 같은 등수, 말과 같은 색·아이콘 | 기존 `rankByStars`를 `displayed.stars`에 적용, `ANIMAL_COLOR`(동물 id → 색, 게임 안에서 유일) 공유 팔레트 |
| HUD-02 | 지금 차례 + 다음 차례(팀 이름 + 팀원) | `nextUp(game)` 순수 셀렉터(§Code 7). 엔진 `turnStarted.member`와 `memberTurnIndex` 의미 확인 완료 |
| HUD-03 | 연출 중 진행 버튼 숨김 | `subscribe` 기반 Director(검증), `controlsVisible = !busy && consumedLog === game.log`, 비트별 watchdog |
| HUD-04 | 크고 단순한 버튼 | 기존 `--tap 72px` 토큰과 `ControlsBar` 재사용, 🎲 버튼 하단 엄지 영역 |
| ROUND-02 | r/R 표시 + "마지막 라운드!" | `buildTimeline`에서 `turnStarted(round===R && !isExtra && pid===participants[0].id)` → `finalRound` 비트 1.5초. R>10이면 점 대신 숫자 |
| STAB-02 | 컨텍스트 손실 복구 | three가 이미 `preventDefault()`를 호출함(소스 확인). `webglcontextlost` → DOM 오버레이 → `skipAll()` + `key++`. ErrorBoundary로 컨텍스트 생성 실패·청크 로드 실패도 같은 버튼으로 처리 |
| STAB-04 | 오프라인 정상 표시 | 시스템 폰트(이미 사용 중), drei CDN 모듈 금지 목록(소스에서 확인), 3D 청크 예열, dist에 CDN 문자열 0건 확인(검증 완료) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **GSD 워크플로 강제:** 파일 변경은 `/gsd-execute-phase` 등 GSD 명령 안에서만 한다.
- **기술 스택:** 웹 + Three.js(WebGL) 3D, React 19 + R3F 9 + drei 10, Zustand 5, Vite 8. CLAUDE.md의 버전(three 0.185 등)은 v1 기준이고, v2에서는 D-05(0.186.1 등)가 우선한다. CLAUDE.md의 rapier, postprocessing, howler, gltfjsx/Mixamo는 이 단계에서 쓰지 않는다(D-04, Out of Scope).
- **플랫폼:** 최신 브라우저, 강사 기기 1대(iPhone/iPad Safari가 1차 대상).
- **데이터:** 서버 없음. 게임 진행 상태는 메모리(Zustand)에만 있고, 이 단계에서 persist하지 않는다(QOL-01은 연기됨).
- **대상:** 아동. UI는 크고 단순하게, 밝고 경쾌한 색(닌텐도풍), 텍스트는 최소화한다.
- **IP:** 실제 브랜드·상표·저작권 자산을 쓰지 않는다. 오리지널 아트만 쓴다. 이 단계는 코드로 만든 도형만 쓴다.
- **사용자 메모리:** 보드는 3초 안에 방향·출발·순위·차례가 읽혀야 한다(v1 시안 두 번 반려). 최종 결과물은 견본보다 확실히 귀여워야 한다. 사용자는 "눈에 띄게 3D 게임처럼" 보이기를 요구했다.

## Standard Stack

### Core (신규 설치 — exact pin)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | 0.186.1 | WebGL 렌더링, `RoundedBoxGeometry`(`three/addons/geometries/RoundedBoxGeometry.js`), `ExtrudeGeometry`, `InstancedMesh` | npm `latest`(2026-09-24). 주간 다운로드 약 1,400만 [VERIFIED: npm registry] |
| @react-three/fiber | 9.8.2 | React 렌더러. 씬과 HUD가 같은 Zustand를 공유 | npm `latest`. peer `react >=19 <19.4`이고 레포는 19.2.8 [VERIFIED: npm view] |
| @react-three/drei | 10.7.9 | `ContactShadows` 등 필요한 것만 named import | npm `latest`. peer `fiber ^9.0.0`, `three >=0.159` [VERIFIED: npm view] |

### Supporting (dev)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/three | 0.186.0 | three 타입. three minor와 lockstep으로 맞춘다 | 항상. `three/addons/*` 타입도 포함한다(확인) [VERIFIED: 로컬 tsc -b] |
| @react-three/test-renderer | 9.1.1 | WebGL 없이 씬 그래프 렌더, `advanceFrames(n, delta)`, `create(el, {width,height})` | 씬 구조·비트 소비자 테스트(node 환경) [VERIFIED: 로컬 vitest] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 자체 `useFrame` 트윈 | react-spring / gsap | 자체 rAF 시계라 `advanceFrames`로 결정적 테스트를 할 수 없다. 연구 STACK에서 이미 탈락시켰다 |
| `three/addons` RoundedBoxGeometry | drei `<RoundedBox>` / v1의 `three-stdlib` import | v1 Dice·BoardTiles는 `three-stdlib`에서 import했는데, 이는 drei의 transitive phantom 의존성이다. **복원할 때 import 경로를 바꿔야 한다** |
| `frameloop="always"` | `demand` + invalidate (D-28) | D-18의 지금 차례 말 대기 바운스는 계속 움직이므로 demand로 얻는 이득이 거의 없다. `always`에 숨김 시 `never`를 권장한다(Pattern 6) |
| drei `ContactShadows` | 말 발밑 원형 반투명 평면(blob) | ContactShadows는 매 프레임 깊이 패스와 블러 렌더 타깃을 쓴다. 판에만 `frames={1}`(정적)으로 쓰고, 움직이는 말은 blob으로 처리하는 것을 권장한다 [ASSUMED: 비용 비교는 drei 구현 지식 기반] |

**Installation (기존 lockfile 위에서 — `npm ci` 금지, `.npmrc` 유지):**
```bash
npm install --save-exact three@0.186.1 @react-three/fiber@9.8.2 @react-three/drei@10.7.9
npm install --save-exact -D @types/three@0.186.0 @react-three/test-renderer@9.1.1
```
레포 사본에서 실행한 결과: 58개 + 1개 패키지가 추가됐고 ERESOLVE가 없었다. `npm ls`에서 three는 0.186.1로 dedupe된다. 예외는 drei→`stats-gl`이 끌어오는 nested `three@0.170.0`인데, `StatsGl`을 import하지 않으면 번들에 들어가지 않는다(빌드 산출물에 Stats 0건 확인). [VERIFIED: 로컬 설치]

## Package Legitimacy Audit

| Package | Registry | Age (this version) | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| three | npm | 2026-09-24 (약 1개월) | 약 14.1M/주 | github.com/mrdoob/three.js | [SUS] reason: `too-new` | Flagged — planner must add checkpoint |
| @react-three/fiber | npm | 2026-10-14 (9일) | 약 4.0M/주 | github.com/pmndrs/react-three-fiber | [SUS] reason: `too-new` | Flagged — planner must add checkpoint |
| @react-three/drei | npm | 2026-09-25 (약 1개월) | 약 2.6M/주 | github.com/pmndrs/drei | [SUS] reason: `too-new` | Flagged — planner must add checkpoint |
| @react-three/test-renderer | npm | 2026-07-31 | 약 40K/주 | github.com/pmndrs/react-three-fiber | [OK] | Approved |
| @types/three | npm | 2026-09-11 | 약 9.2M/주 | github.com/DefinitelyTyped/DefinitelyTyped | [OK] | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `three` [WARNING: flagged as suspicious — verify before using.], `@react-three/fiber` [WARNING: flagged as suspicious — verify before using.], `@react-three/drei` [WARNING: flagged as suspicious — verify before using.]
- 세 패키지 모두 SUS 사유는 **해당 버전의 공개일이 최근이라는 것(`too-new`) 하나뿐**이다. 공식 저장소이고, 주간 다운로드가 수백만에서 천만 단위이며, `postinstall`이 없다(`npm view … scripts.postinstall` 빈 값). 같은 계열을 v1(0.185.1/9.6.1/10.7.7)에서 이미 썼다. planner는 설치 태스크 앞에 `checkpoint:human-verify`를 두어 버전과 레지스트리를 재확인한다. 대안으로 공개된 지 오래된 v1 검증 조합(three 0.185.1 · @types/three 0.185.1 · fiber 9.6.1 · drei 10.7.7 · test-renderer 9.1.0)으로 내릴 수 있지만, 그러려면 D-05를 바꿔야 하므로 사용자 확인이 필요하다.

## Architecture Patterns

### System Architecture Diagram

```
[강사 탭: 🎲 / ✅❌ / 다음 / 지금 끝내기]   (DOM HUD, 메인 청크)
        │ guard(useInputLock 400ms)
        ▼
useGameStore.roll/judge/next/endNow ──► 순수 엔진 전이 ──► game' (phase 확정, log={seq+1, events})
        │ zustand set() → 리스너 **동기** 호출 (같은 클릭 안)
        ▼
useDirector (useGameStore.subscribe)
   ├─ 불연속(새 게임/주입/undo) ─► reset + resync(displayed ← 엔진)
   ├─ gameEnded 포함 ───────────► skipAll() (즉시 결과 화면)
   └─ 정상 ──► buildTimeline(events, ctx) ─► BeatSpec[] ─► presentation.play()
                                                          │ busy=true, current=beat#1, watchdog(ms+500)
        ┌─────────────────────────────────────────────────┤
        ▼                                                 ▼
 3D 청크 (lazy GameCanvas)                         DOM 비트 소비자
  Dice: kind=dice → 스핀 → face 스냅 ─┐            Banner: startBonus/event/finalRound
  PathPreview: kind=preview           ├─ completeBeat(id) ─┤ (useBeatTimer: setTimeout(ms))
  Pawn(pid): kind=hop → 칸마다 홉 ────┘                    │
        ▲ displayed.positions                              ▼
        │                              presentation: applyBeat(displayed, beat) → 다음 비트
        │                              큐가 비면: resync(엔진) · busy=false · consumedLog=game.log
        └──────────── 화면 ◄──────────────────────────────┘
 HUD: 점수판(displayed.stars) · 차례 바(엔진) · 버튼(!busy && consumedLog===game.log)
 GameApp: phase==='gameOver' && !busy → ResultView (Canvas 언마운트, D-06)

 [webglcontextlost] ─► GameStage.lost=true ─► 오버레이 "🔄 화면 다시 그리기"
        └─ 탭 ─► presentation.skipAll() → canvasKey++ → 새 Canvas가 displayed/엔진에서 다시 그림
 [visibilitychange hidden] ─► frameloop='never' + skipAll()   [visible] ─► frameloop='always'
```

### Recommended Project Structure
```
src/game/
├── director/
│   ├── timeline.ts        # 순수: BEAT_MS, hopMs(len), buildTimeline(events, ctx) → BeatSpec[], budgetMs
│   ├── displayed.ts       # 순수: Displayed 타입, displayedFrom(game), applyBeat(d, beat)
│   ├── useDirector.ts     # useGameStore.subscribe → play / reset / skipAll
│   └── *.test.ts          # 타임라인·예산·fuzz 불변식
├── usePresentation.ts     # v2: queue/current/busy/displayed/consumedLog + play/completeBeat/skipAll/reset (기존 API 교체)
├── layout/
│   ├── ringLayout.ts      # 순수(three import 금지): 좌표·heading·모서리·발판 크기
│   ├── fitCamera.ts       # 순수(three import 금지): 닫힌 식 거리
│   └── diceFaces.ts       # 순수: v1 FACE_UP_EULER를 튜플로(three Euler 대신)
├── palette.ts             # ANIMAL_COLOR, DIFF_COLOR, EVENT_COLOR hex (DOM·3D 공용, three import 금지)
├── turnOrder.ts           # nextUp(game), isFinalRoundStart(...)
├── GameStage.tsx          # PlayView 대체: grid 레이아웃 + HUD + CanvasHost + 오버레이
├── scene/                 # ↓ 이 폴더만 three/R3F를 import (lazy 청크)
│   ├── loadGameCanvas.ts  # export const loadGameCanvas = () => import('./GameCanvas')  (예열용)
│   ├── GameCanvas.tsx     # default export: <Canvas flat dpr frameloop onCreated> + 조명 + SceneContents
│   ├── SceneContents.tsx  # WebGL 없이 마운트 가능한 씬 그래프 (테스트 대상)
│   ├── geometries.ts      # 모듈 단위 공유 geometry/material (앱 수명, dispose 안 함)
│   ├── Board.tsx · StartGate.tsx · Arrows.tsx · TileIcons.tsx · PathPreview.tsx
│   ├── Pawn.tsx · Dice.tsx · CameraRig.tsx
│   └── scene.test.tsx     # // @vitest-environment node
└── hud/
    ├── Scoreboard.tsx (displayed + 색 점) · TurnHud.tsx (+다음 차례, 라운드 점) · ControlsBar.tsx
    ├── Banner.tsx (startBonus/event/finalRound 비트 소비) · ContextLostOverlay.tsx
    └── MissionOverlay.tsx (재사용)  · RingStrip.tsx → 삭제(D-26)
```

### Pattern 1: 이벤트 로그 → 비트(데이터) → 예산 자동 계산
**What:** 엔진 이벤트 배치 하나를 순수 함수가 `BeatSpec[]`로 바꾼다. 각 비트의 `ms`는 데이터에서 나오고, watchdog은 비트마다 `ms + WATCHDOG_BUFFER_MS`로 걸린다. 합산 코드가 따로 없으므로 비트를 추가해도 예산이 저절로 맞는다(v1 `PREVIEW_S` 누락 버그 재발 방지).

| GameEvent | Beat | ms (D-19 기준) | displayed 효과(완료 시) |
|---|---|---|---|
| `rolled{face}` | `dice{pid,face}` | 1000 | — |
| `moved{by:'dice',path}` | `preview{pid,path}` → `hop{pid,path,by}` | 500 → `hopMs(len)·len` | hop: `positions[pid]=last(path)` |
| `startBonus{stars}` | `startBonus{pid,stars}` | 800 | `stars[pid]+=stars` |
| `eventApplied{eff,steps,suppressed}` | `event{pid,eff,steps,suppressed}` | 1000 | — |
| `moved{by:'event',path}` | `hop{pid,path,by:'event'}` | `hopMs(len)·len` | positions |
| `judged{success:true,stars}` | `stars{pid,stars}` | 600 (Phase 8이 celebrate로 교체) | `stars[pid]+=stars` |
| `turnStarted` (마지막 라운드 첫 정규 턴) | `finalRound` | 1500 | — |
| `landed`, `questDrawn`, `judged{false}`, `gameStarted`, 그 밖의 `turnStarted` | 없음 | 0 | — |
| `judgementUndone` | 없음 → 드레인 시 resync | 0 | 엔진 값으로 강제 일치 |
| `gameEnded` | 없음, Director가 `skipAll()` | 0 | resync |

- `hopMs(len) = clamp(2000/len, 100, 250)`. 이벤트 `steps`는 스키마상 **최대 20**이다(`schema.ts` `max(20)`). 칸당 0.25초로 고정하면 20칸 이동에 5초가 걸린다. 이동 비트 하나의 상한을 약 2초로 묶는다. [VERIFIED: src/schema.ts]
- 최악의 roll 배치 = 1000 + 500 + 1500 + 800 + 1000 + 2000 ≈ 6.8초다(출발 보너스는 턴당 1회 상한이라 한 번만 들어간다). 보통은 약 2.4초다. 테스트로 `budgetMs(worst) ≤ 7000`을 단언한다.

### Pattern 2: `usePresentation` v2 — 비트 큐 + 비트별 watchdog + id 멱등 완료 + `skipAll`
**What:** 기존 `busy/beginAnim/signalAnimDone/startWatchdog` API를 교체한다. 현재 이 API를 쓰는 곳은 `GameApp`(busy 읽기)과 `ControlsBar`(`busy` prop)뿐이다. [VERIFIED: grep]
- `play(specs)`: id를 전역 증가 카운터로 붙이고 큐 뒤에 붙인다. `current`가 없으면 시작한다.
- `ms === 0`인 비트(reduced-motion 등)는 **루프 안에서 동기적으로** 즉시 완료한다. 재귀가 아니라 반복문으로 처리한다.
- `completeBeat(id)`: `current?.id !== id`이면 무시한다. 늦게 온 콜백, 이중 호출, watchdog과 정상 완료의 경합을 모두 이것으로 막는다.
- `skipAll()`: current와 큐의 모든 비트를 `applyBeat`로 적용하고 큐를 비운 뒤 resync한다. 이 함수 하나를 컨텍스트 손실 복구, 화면 숨김, `gameEnded`, **테스트 헬퍼**, Phase 8의 탭 건너뛰기가 함께 쓴다.
- 큐가 비면 `resync(useGameStore.getState().game)`, `busy=false`, `consumedLog=game.log`로 정리한다.
- 타이머 핸들은 모듈 스코프에 하나만 둔다(현행과 같음).

### Pattern 3: Director는 `subscribe`로 (useEffect 금지)
**What:** zustand `set()`은 리스너를 동기적으로 호출한다. 같은 클릭 핸들러 안에서 엔진 상태와 presentation 상태가 함께 바뀌므로 React는 한 번만 렌더한다. `useEffect([game.log])` 방식은 `phase=awaitingJudgement, busy=false`인 렌더가 한 번 생겨 **퀘스트 카드와 다음 버튼이 한 프레임 깜빡인다.** 이 차이는 테스트로 재현해 확인했다. [VERIFIED: 로컬 vitest batch.test]
- 이중 안전장치로 컨트롤 표시 조건을 `!busy && consumedLog === game.log`로 둔다.
- 마운트할 때(StrictMode 이중 실행 포함) `resync + consumedLog=game.log`를 한다. 멱등이고 비트를 재생하지 않는다.
- 불연속 판정: `next.board !== prev?.board`(새 게임이나 restart)이거나 `next.log.seq !== prev.log.seq + 1`(테스트 주입 등)이면 reset + resync한다. 이벤트가 `gameStarted`로 시작하면 resync한 뒤 타임라인을 재생한다(1라운드 게임의 "마지막 라운드!" 배너).
- 구독 위치는 `GameApp`의 `useEffect`(cleanup에서 unsubscribe)다. 편집기로 갔다 오면 다시 마운트되고 resync된다. 그 사이 비트는 모듈 타이머 watchdog이 끝낸다.

### Pattern 4: 비트 소비자 — 진행도는 ref, 완료는 한 번
```tsx
// scene/Pawn.tsx (요지) — 프로토타입으로 검증한 형태
const beat = usePresentation((s) => (s.current?.kind === 'hop' && s.current.pid === pid ? s.current : null));
const rest = usePresentation((s) => s.displayed.positions[pid]);   // 비트 밖에서는 항상 여기에 선다
const t = useRef(0); const done = useRef(-1);
useEffect(() => { t.current = 0; }, [beat?.id]);
useFrame((_, dt) => {
  if (!beat || done.current === beat.id) { placeAt(rest); return; }      // watchdog이 끝내도 자동 스냅
  t.current += Math.min(dt, 0.25);                                      // 백그라운드 복귀 첫 delta 폭주 방지
  const hop = beat.ms / beat.path.length;                               // 데이터에서 온 칸당 시간
  /* from=rest, path[k] 사이를 포물선 보간 — ref transform만 바꾼다(setState 금지) */
  if (t.current * 1000 >= beat.ms) { done.current = beat.id; usePresentation.getState().completeBeat(beat.id); }
});
```
- 진행도 계산에 쓰는 delta 클램프는 **넉넉하게(0.25s)** 둔다. 1/20처럼 빡빡하게 두면 저전력 30fps 아래에서 연출이 벽시계보다 느려지고, watchdog(ms+500)이 먼저 발동한다. 프로토타입에서 1/20 클램프와 큰 delta가 겹쳐 완료가 늦어지는 것을 확인했다. [VERIFIED: 로컬 vitest]
- 출발점은 `displayed.positions[pid]`(아직 갱신 전 값)이다. `applyBeat`는 완료 시점에만 적용한다. 칸 경계마다 store를 갱신하지 않는다.

### Pattern 5: 레이아웃 — Canvas는 HUD 사이 grid 셀, 오버레이는 그 셀 위
- 세로: `grid-template-rows: auto 1fr auto`(차례 바 / 캔버스 셀 / 버튼+점수판). 가로(`@media (orientation: landscape)`): `grid-template-columns: 1fr auto`로 점수판을 오른쪽에 둔다(D-22).
- 캔버스 셀은 `position:relative; min-height:0; min-width:0`이어야 한다. 빠뜨리면 grid/flex 자식이 줄어들지 않아 R3F가 잰 크기가 화면을 넘는다. [ASSUMED: CSS 일반 지식]
- 캔버스 셀 자체가 HUD를 뺀 영역이므로 `fitCamera`의 insets는 0이나 작은 값이면 된다. 퀘스트 카드는 D-23에 따라 판 위에 겹쳐도 된다. 기존 `.app--playing .game-stage { height:100dvh }`와 safe-area 규칙을 재사용한다. [VERIFIED: game.css]
- 캔버스 래퍼에 `pointer-events:none; touch-action:manipulation`을 준다. 3D 상호작용이 없고(D-21), 더블탭 확대도 막는다.

### Pattern 6: Canvas 설정과 수명
```tsx
<Canvas
  flat                              // NoToneMapping: R3F 기본 ACESFilmic은 캔디 색을 탁하게 만든다(소스 확인)
  dpr={[1, isPhone ? 1.5 : 2]}      // D-28
  frameloop={visible ? 'always' : 'never'}
  gl={{ antialias: true }}
  camera={{ fov: 35, near: 0.1, far: 200 }}
  onCreated={({ gl }) => watchContextLoss(gl.domElement, onLost)}
>
```
- three `WebGLRenderer`는 `webglcontextlost`에서 **이미 `event.preventDefault()`를 호출하고**, `webglcontextrestored`에서 `initGLContext()`로 다시 초기화한다. 손실된 동안에는 `render()`가 즉시 return한다. 따라서 앱은 감지와 UI만 맡으면 된다. [VERIFIED: three.module.js 17150–17180, 17683]
- R3F 9.8.2는 언마운트할 때 `renderer.dispose()` 다음에 `forceContextLoss()`를 호출한다. `key` 리마운트를 해도 이전 컨텍스트가 정리된다. [VERIFIED: fiber dist `disposeRenderer`] 그래도 iOS에서 리마운트를 반복하면 컨텍스트가 누적됐다는 보고가 있으므로, **리마운트는 사용자 버튼으로만** 한다. [CITED: developer.apple.com/forums/thread/741327]

### Anti-Patterns to Avoid
- **메인 청크 모듈에서 `import { … } from 'three'`(값 import):** `palette.ts`가 `new Color()` 하나만 써도 three 전체가 메인 번들로 들어간다. 순수 모듈은 `Math`만 쓰고, 타입은 `import type`으로만 가져온다(`verbatimModuleSyntax`). 빌드 후 `grep -c WebGLRenderer dist/assets/index-*.js`가 0인지 확인한다. [VERIFIED: 로컬 빌드에서 index 0건 / 3D 청크 6건]
- **씬이 엔진 `position`/`stars`를 직접 렌더:** 말이 순간이동하고 별이 먼저 오른다. `displayed`를 쓴다.
- **useFrame 안에서 프레임마다 `set()`/setState 호출:** 비트 경계에서만 호출한다.
- **drei의 CDN 의존 모듈:** `Text`, `Text3D`, `Environment`(preset), `Stage`(내부에서 Environment 사용), `Cloud`, `useGLTF`/`Gltf`(draco 디코더), `Ktx2`, `MatcapTexture`, `NormalTexture`, `StatsGl`. drei 소스에서 `cdn.jsdelivr`, `githack`, `gstatic`를 참조하는 모듈은 Cloud, Gltf, Ktx2, MatcapTexture, NormalTexture, useEnvironment다. [VERIFIED: node_modules/@react-three/drei grep]
- **`<Html>`로 칸·말 라벨:** 프레임마다 DOM transform이 갱신되고, test-renderer에서 document 가드가 필요하다. 이 단계에서는 쓰지 않는다.
- **OrbitControls / 카메라 추적:** D-09, D-10에 따라 금지한다.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 둥근 블록 칸·주사위 | 직접 만든 버텍스 | `three/addons/geometries/RoundedBoxGeometry.js` | three 본체 export다(`./addons/*` 확인). v1의 `three-stdlib` 경로는 phantom 의존성이다 |
| 별·화살표·셰브런 모양 | 커스텀 버퍼 | `THREE.Shape` + `ExtrudeGeometry`(bevel) | 2D 윤곽만 정의하면 된다. 모듈 스코프에서 한 번 생성 |
| 회전 화살표(🔁) | — | `TorusGeometry(r, tube, seg, seg, arc<2π)` + `ConeGeometry` 머리 | 기본 지오메트리 조합으로 충분하다 |
| 다수 칸·별 | 칸마다 `<mesh>` | `InstancedMesh` + `setMatrixAt`/`setColorAt` | 판 전체를 드로우콜 약 10개 이내로 |
| 바닥 그림자 | 섀도맵 | drei `ContactShadows frames={1}`(판) + 말 blob 평면 | D-04 |
| 주사위 면 → 회전 | 새로 계산 | v1 `FACE_UP_EULER` 표(git e230f7b `diceRotation.ts`) | 6면 모두 면 법선이 +Y로 오는지 손으로 검증했다(Code 5). 테스트로 고정 |
| 경로·이동 거리 | `(pos+i)%L` 재계산 | 엔진 `moved.path`(이미 wrap 반영) | 엔진이 유일한 진실이다(D-01) |
| 순위 | 새 정렬 | `rankByStars`(engine/scoring) | 동점 1,1,3 규칙이 이미 테스트되어 있다 |
| 컨텍스트 복원 처리 | 직접 `getExtension('WEBGL_lose_context')` 루프 | three 내장 처리 + `key` 리마운트 | three가 preventDefault와 재초기화를 이미 한다 |
| 트윈 라이브러리 | gsap/spring | 비트 `ms` + `useFrame(delta)` | 결정적 테스트(`advanceFrames`) |

**Key insight:** 이 단계에서 어려운 부분은 그림이 아니라 "언제 버튼을 보여 주는가"다. 그 판단은 데이터(비트)와 동기 구독, 멱등 완료라는 세 가지만으로 해결하고, 3D 컴포넌트에는 판단을 맡기지 않는다.

## Runtime State Inventory

Rename·refactor 단계가 아니므로 생략한다. 지우는 것은 코드뿐이다(`RingStrip`, `PlayView`의 `temp-play`). 저장 데이터 키(`powerjumping_content_v1`, `powerjumping_settings_v1`)는 건드리지 않는다. 게임 진행 상태는 persist하지 않는다. 확인 방법: `src/harness/useGameStore.ts`는 `create()`만 쓰고 persist를 쓰지 않는다.

## Common Pitfalls

### Pitfall 1: 테스트에서 store 변경이 씬에 반영되지 않음 (test-renderer + act)
**What goes wrong:** test-renderer로 마운트한 뒤 `act` 밖에서 `usePresentation.getState().play(...)`를 호출하면, 컴포넌트가 다시 렌더되지 않는다. 그러면 `useFrame` 클로저가 옛 `beat=null`을 보고, `advanceFrames`를 아무리 돌려도 비트가 끝나지 않는다.
**How to avoid:** `await ReactThreeTestRenderer.act(async () => { play(...) })`로 감싼다. 파일 상단에 `// @vitest-environment node`와 `globalThis.IS_REACT_ACT_ENVIRONMENT = true`를 둔다. [VERIFIED: 로컬 vitest — act 없이는 실패, act로 감싸면 통과]
**Warning signs:** 씬 테스트에서 `busy`가 끝까지 true로 남는다.

### Pitfall 2: 기존 HUD·App 테스트가 busy 게이트 때문에 깨짐
**What goes wrong:** `App.test`의 "한 판 끝까지" 루프와 `hud.test`의 연속 탭 테스트는 탭 직후 다음 버튼이 바로 있다고 가정한다. 비트가 생기면 버튼이 숨겨져 `expect(btn).toBeTruthy()`가 실패한다. `tsc -b`가 테스트 파일까지 검사하고 CI는 build만 돌리므로, 깨진 테스트 하나가 배포를 막는다.
**How to avoid:** 테스트 헬퍼 `settle()` = `act(() => usePresentation.getState().skipAll())`를 둔다. App 루프에서는 버튼이 없으면 `settle()`을 호출하거나 fake timer로 watchdog을 넘긴다. HUD 테스트에서는 `vi.mock('../scene/GameCanvas')`로 3D 청크를 막는다. `.temp-play` 클래스를 단언하는 부분도 함께 고친다. [VERIFIED: App.test.tsx 65–95, hud.test.tsx 구조]

### Pitfall 3: jsdom에서 `<Canvas>`
**What goes wrong:** `ResizeObserver`가 없으면 throw한다.
**How to avoid:** `src/test/setup.ts`에 RO stub(observe/unobserve/disconnect no-op)을 둔다. 그러면 크기가 0이어서 R3F 루트가 구성되지 않고, 에러 없이 렌더된 채 아무것도 하지 않는다(`onCreated`도 불리지 않음). 따라서 jsdom에서 컨텍스트 손실은 **`watchContextLoss`를 순수 DOM 함수로 분리해** 일반 `<canvas>`에 `dispatchEvent(new Event('webglcontextlost', {cancelable:true}))`를 보내 테스트한다. 오버레이와 리마운트는 GameCanvas를 mock해 `onLost` prop을 직접 호출하는 방식으로 테스트한다. [VERIFIED: 로컬 vitest canvas.test]

### Pitfall 4: 컨트롤이 한 프레임 깜빡임
Pattern 3 참고. `useEffect`로 로그를 소비하면 생긴다. [VERIFIED]

### Pitfall 5: 3D 색과 DOM 색이 다름 (HUD-01 "같은 색")
**What goes wrong:** R3F 9 기본값은 `toneMapping = ACESFilmic`이라 `#25D6A0` 같은 채도 높은 캔디 색이 탁해진다. 그러면 점수판 색 점과 말 색이 다르게 보인다.
**How to avoid:** `<Canvas flat>`(NoToneMapping)을 쓰고, hemisphere나 ambient 조명을 충분히 둔다. 색은 `palette.ts` 한 곳에서 관리한다. 필요하면 `index.css` 토큰 값과 일치하는지 단언하는 작은 테스트를 둔다. [VERIFIED: fiber dist `changed('flat')`]
**참고:** 말 색 8개는 동물 id 기준(`ANIMAL_COLOR`)으로 정한다. 엔진 `assignAnimals`가 게임 안에서 동물을 겹치지 않게 배정하므로 색도 겹치지 않고, Phase 7 캐릭터도 같은 키를 쓴다. 말 색이 난이도 칸 색(초록·주황·빨강·보라·금)과 겹치지 않게 하거나, 흰 테두리나 링으로 구분한다.

### Pitfall 6: lazy 3D 청크와 오프라인 (STAB-04)
**What goes wrong:** 교실에서 앱을 온라인으로 열고 편집기만 보다가 오프라인이 된 뒤 게임을 시작하면, 3D 청크를 받은 적이 없어서 동적 import가 실패한다.
**How to avoid:** 앱 시작 후(예: `SetupView` 마운트나 idle 시점) `loadGameCanvas()`를 한 번 호출해 청크를 예열한다. 모듈은 페이지 수명 동안 메모리에 남는다. `React.lazy`는 실패한 promise를 영구히 캐시하므로, 재시도하려면 `useMemo(() => lazy(loadGameCanvas), [attempt])`처럼 lazy 컴포넌트를 새로 만들어야 한다. ErrorBoundary가 청크 로드 실패와 WebGL 생성 실패를 잡아 같은 "🔄 화면 다시 그리기" 오버레이를 띄운다. 브라우저가 실패한 모듈 fetch를 캐시해 재시도까지 실패할 수 있으므로, 최종 안전장치는 예열이다. [ASSUMED: 실패한 동적 import의 module map 캐시 동작은 브라우저마다 다를 수 있음]

### Pitfall 7: 출발 칸 1.4배가 이웃 칸과 겹침
**What goes wrong:** 칸 크기 t=1, pitch=1.13이면 모서리 출발 칸의 반폭은 0.7t이고 이웃 칸 안쪽 모서리는 0.63t다. 0.07t만큼 겹쳐서 D-11의 간격이 사라진다.
**How to avoid:** 출발 칸 중심을 바깥 대각선으로 δ≈0.2t 옮기면 간격이 0.13t가 된다. 말이 서는 좌표도 이 중심을 쓴다. 또는 바닥은 1.2배로 두고 높이와 게이트로 랜드마크를 만든다. 순수 테스트로 "모든 발판 footprint가 겹치지 않고 최소 간격 ≥ 0.1t"를 단언한다. [VERIFIED: 산수, ringLayout 프로토타입 pitch 테스트]

### Pitfall 8: InstancedMesh 용량과 색
**What goes wrong:** 판 크기가 바뀌어(16→24) `args`가 바뀌면 메시가 재생성된다. `instanceColor`는 `setColorAt`을 처음 호출할 때 생기므로 `needsUpdate`를 빠뜨리면 색이 나오지 않는다.
**How to avoid:** 용량은 24(최대)로 고정하고 `mesh.count`로 조절한다. `useLayoutEffect`에서 `setMatrixAt`/`setColorAt`을 호출한 뒤 `instanceMatrix.needsUpdate = instanceColor.needsUpdate = true`를 설정한다(v1 BoardTiles 패턴). [CITED: git e230f7b BoardTiles.tsx]

### Pitfall 9: 공유 geometry 이중 dispose와 dispose 누락
**What goes wrong:** 모듈 스코프 공유 geometry를 컴포넌트 언마운트 때 dispose하면 리마운트 후 메시가 검게 나오거나 사라진다. 반대로 컴포넌트마다 `useMemo`로 만들고 dispose하지 않으면 리마운트할 때마다 누수가 생긴다.
**How to avoid:** 칸·별·화살표·주사위처럼 종류가 유한한 것은 `geometries.ts` 모듈 싱글턴으로 두고 앱 수명 동안 dispose하지 않는다. `geometry={shared}` prop은 R3F가 dispose하지 않는다. 새 컨텍스트(리마운트)에서는 three가 다시 업로드한다. JSX로 선언한 `<sphereGeometry/>`는 R3F가 자동 dispose한다. [ASSUMED: R3F의 prop 전달 geometry 비-dispose 동작은 v1 경험과 R3F 문서 지식 기반이며, 이번 세션에서 소스를 확인하지 않음]

### Pitfall 10: 되돌리기(undo)와 표시 상태
**What goes wrong:** D-16에 따라 undo는 **다음 roll 전까지** 가능하다. 다음 차례로 넘어간 뒤에도 undo하면 `currentIndex`와 `round`가 이전 턴으로 돌아간다. `displayed.stars`만 따로 두면 별이 남는다.
**How to avoid:** `judgementUndone`이 오면 비트 없이 resync한다. 차례 바는 엔진을 직접 읽으므로 그대로 맞는다. undo 후 다시 "다음"을 누르면 마지막 라운드 배너가 한 번 더 나올 수 있는데, 허용한다.

### Pitfall 11: 지금 끝내기와 연출 중
**What goes wrong:** `TurnHud`의 "지금 끝내기"는 busy여도 보인다. 연출 중에 끝내면 `gameEnded`가 큐 뒤에 붙고, 결과 화면이 연출이 끝날 때까지 늦어진다.
**How to avoid:** `gameEnded`가 포함된 배치는 `skipAll()` 후 처리한다. `GameApp`의 `phase==='gameOver' && !busy` 규칙은 그대로 둔다.

## Code Examples

### Code 1: `ringLayout(n)` — 검증한 프로토타입 (16/20/24 테스트 통과)
```ts
// src/game/layout/ringLayout.ts — three import 금지(메인 청크 안전)
// Index 0 = bottom-right corner (start). Camera looks from +Z toward -Z: screen right=+X, screen bottom=+Z.
export interface TileXZ { x: number; z: number; corner: boolean; side: 0 | 1 | 2 | 3 }
export function ringLayout(n: number, pitch = 1.13) {
  if (!Number.isInteger(n) || n < 8 || n % 4 !== 0) throw new RangeError(`ring size ${n}`);
  const s = n / 4;                       // steps per side (16→4, 20→5, 24→6)
  const half = (s * pitch) / 2;
  const tiles: TileXZ[] = [];
  for (let i = 0; i < n; i++) {
    const side = Math.floor(i / s) as 0 | 1 | 2 | 3;
    const d = (i % s) * pitch;
    const t = side === 0 ? { x: half - d, z: half }      // bottom edge, moving left
            : side === 1 ? { x: -half, z: half - d }     // left edge, moving up
            : side === 2 ? { x: -half + d, z: -half }    // top edge, moving right
            :              { x: half, z: -half + d };    // right edge, moving down
    tiles.push({ ...t, corner: i % s === 0, side });
  }
  const heading = tiles.map((a, i) => { const b = tiles[(i + 1) % n]; return Math.atan2(b.x - a.x, b.z - a.z); });
  return { n, perSide: s, pitch, half, tiles, heading };
}
// 테스트(검증함): 인접 칸 거리 == pitch, 모서리 = 0,s,2s,3s, 화면 좌표 (x,-z) 부호 면적 < 0 (= 시계 방향)
```

### Code 2: `fitCamera` — 닫힌 식 (7개 화면 비율 × 3개 판 크기 투영 테스트 통과)
```ts
// src/game/layout/fitCamera.ts — three import 금지
const DEG = Math.PI / 180;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export interface Insets { top: number; bottom: number; left: number; right: number } // fractions of the canvas
// Fit an axis-aligned box (half-extent hx, hz, height h) seen from +Z. Moving the camera along its
// view axis leaves camera-space x,y unchanged, so each corner gives a lower bound on distance d.
export function fitCamera(aspect: number, o: { hx: number; hz: number; h: number; fov?: number; insets?: Insets; margin?: number }) {
  const fov = o.fov ?? 35, ins = o.insets ?? { top: 0, bottom: 0, left: 0, right: 0 }, m = o.margin ?? 0.04;
  const pitchDeg = lerp(60, 50, clamp((aspect - 0.5) / 1.1, 0, 1)); // portrait steeper (D-09 50–60°)
  const p = pitchDeg * DEG, tanV = Math.tan((fov * DEG) / 2), tanH = tanV * aspect;
  const xMin = -1 + 2 * ins.left + m, xMax = 1 - 2 * ins.right - m;
  const yMin = -1 + 2 * ins.bottom + m, yMax = 1 - 2 * ins.top - m;
  const need = (v: number, tan: number, lo: number, hi: number) =>
    v >= 0 ? (hi > 0 ? v / (tan * hi) : Infinity) : lo < 0 ? v / (tan * lo) : Infinity;
  let d = 0;
  for (const x of [-o.hx, o.hx]) for (const z of [-o.hz, o.hz]) for (const y of [0, o.h]) {
    const cy = y * Math.cos(p) - z * Math.sin(p);        // camera-space up
    const along = -y * Math.sin(p) - z * Math.cos(p);    // depth offset along forward
    d = Math.max(d, need(x, tanH, xMin, xMax) - along, need(cy, tanV, yMin, yMax) - along);
  }
  return { position: [0, d * Math.sin(p), d * Math.cos(p)] as const, target: [0, 0, 0] as const, fov, pitchDeg };
}
```
테스트 패턴: `new PerspectiveCamera(fov, w/h)`, `position.set`, `lookAt(0,0,0)`, `updateMatrixWorld()`, `updateProjectionMatrix()`를 차례로 적용한 뒤 8개 꼭짓점을 `Vector3.project`해 |x|,|y| ≤ 1을 단언하고, 빡빡한 축이 0.9 이상 차는지도 단언한다. 화면 비율은 실제 **캔버스 셀** 기준으로 넣는다(예: 390×844에서 HUD를 빼면 약 0.7). `hx = hz = half + 출발칸 여유`, `h = 게이트·말 높이`를 쓴다. CameraRig는 test-renderer `create(el, {width, height})`로 크기를 지정해 통합 확인할 수 있다. [VERIFIED: test-renderer d.ts `CreateCanvasParameters`]

### Code 3: 타임라인 (요지)
```ts
// src/game/director/timeline.ts
import type { GameEvent } from '../../engine/state';
export const BEAT_MS = { dice: 1000, preview: 500, hopMax: 250, hopMin: 100, moveCap: 2000,
                         startBonus: 800, event: 1000, stars: 600, finalRound: 1500 } as const;
export const hopMs = (len: number) => Math.min(BEAT_MS.hopMax, Math.max(BEAT_MS.hopMin, BEAT_MS.moveCap / Math.max(1, len)));
export type BeatSpec =
  | { kind: 'dice'; pid: string; face: number; ms: number }
  | { kind: 'preview'; pid: string; path: number[]; ms: number }
  | { kind: 'hop'; pid: string; path: number[]; by: 'dice' | 'event'; ms: number }
  | { kind: 'startBonus'; pid: string; stars: number; ms: number }
  | { kind: 'event'; pid: string; eff: 'forward' | 'backward' | 'extra'; steps: number; suppressed: boolean; ms: number }
  | { kind: 'stars'; pid: string; stars: number; ms: number }
  | { kind: 'finalRound'; ms: number };
export interface TimelineCtx { totalRounds: number; firstPid: string; reducedMotion: boolean }
export function buildTimeline(events: readonly GameEvent[], ctx: TimelineCtx): BeatSpec[] { /* 표(Pattern 1) 그대로 */ }
export const budgetMs = (beats: readonly BeatSpec[]) => beats.reduce((s, b) => s + b.ms, 0);
```
**핵심 불변식 테스트(fuzz):** `mulberry32` 시드로 수백 판을 진행한다. 전이마다 `displayed' = beats.reduce(applyBeat, displayed)`를 계산하고, undo를 제외하면 `displayed'`가 엔진의 위치·별과 **resync 없이도** 일치하는지 단언한다. 이 테스트는 "이벤트 이동 뒤 출발 보너스" 같은 비트 누락을 잡는다. 엔진 testkit(`makeGame`, `boardWith`, `dice`)이 이미 있다. [VERIFIED: src/engine/testkit.ts 존재, hud.test 사용]

### Code 4: 씬 테스트 (node 환경, advanceFrames) — 검증한 형태
```tsx
// @vitest-environment node
import ReactThreeTestRenderer from '@react-three/test-renderer';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
it('hop beat completes exactly once after its ms', async () => {
  const r = await ReactThreeTestRenderer.create(<Pawn pid="a" />);
  await ReactThreeTestRenderer.act(async () => {
    usePresentation.getState().play([{ kind: 'hop', pid: 'a', path: [1, 2, 3], by: 'dice', ms: 750 }]);
  });
  await r.advanceFrames(10, 0.05);                      // 0.5 s
  expect(usePresentation.getState().busy).toBe(true);
  await r.advanceFrames(6, 0.05);                       // 0.8 s
  expect(usePresentation.getState().busy).toBe(false);
  expect(usePresentation.getState().displayed.positions.a).toBe(3);
  await r.unmount();
});
// 구조: r.scene.findAll(n => n.instance?.name === 'quest-tiles') → InstancedMesh count == 퀘스트 칸 수,
// 'tile-stars' count == Σ stars, 'start-gate' 1개, 'arrow' 인스턴스 n개, 'pawn-*' == 참가자 수, 'dice' 1개
```

### Code 5: 주사위 면 표 검증 (v1 표 재사용)
```ts
// v1 FACE_UP_EULER (git e230f7b src/game/diceRotation.ts) — pip layout 1:+Y 6:-Y 2:+Z 5:-Z 3:+X 4:-X
// 테스트: 각 면의 바깥 법선에 FACE_UP_EULER[f]를 적용하면 (0,1,0)이 된다.
for (const [f, n] of [[1,[0,1,0]],[6,[0,-1,0]],[2,[0,0,1]],[5,[0,0,-1]],[3,[1,0,0]],[4,[-1,0,0]]] as const) {
  const v = new Vector3(...n).applyEuler(new Euler(...FACE_UP[f])); expect(v.y).toBeCloseTo(1);
}
```
손으로 확인한 결과: Rx(−π/2)는 +Z를 +Y로, Rz(π/2)는 +X를 +Y로, Rz(−π/2)는 −X를 +Y로, Rx(π/2)는 −Z를 +Y로, Rx(π)는 −Y를 +Y로 보낸다. 6면 모두 맞는다. [VERIFIED: 계산]
v1 Dice의 스핀은 `target + (1−ease)·extraTurns`로 감속하며 정확히 스냅한다. `DICE_S`만 `BEAT_MS.dice`로 바꾸고, 완료 시 `completeBeat(id)`를 호출한다. `DICE_POS`는 판 가운데(0, h, 0)로 옮긴다. [CITED: git e230f7b Dice.tsx]

### Code 6: 컨텍스트 손실 감시 (순수 DOM, jsdom 테스트 가능)
```ts
// src/game/scene/contextLoss.ts — three import 없음(메인 청크 둘 다 사용 가능)
export function watchContextLoss(el: HTMLCanvasElement, onLost: () => void, onRestored?: () => void): () => void {
  const lost = (e: Event) => { e.preventDefault(); onLost(); };   // three도 preventDefault 하지만 멱등
  const restored = () => onRestored?.();
  el.addEventListener('webglcontextlost', lost);
  el.addEventListener('webglcontextrestored', restored);
  return () => { el.removeEventListener('webglcontextlost', lost); el.removeEventListener('webglcontextrestored', restored); };
}
// GameStage: const [lost, setLost] = useState(false); const [key, setKey] = useState(0);
// 버튼: usePresentation.getState().skipAll(); setLost(false); setKey(k => k + 1);
// 개발 전용 재현: if (import.meta.env.DEV) window.__loseContext = () => gl.forceContextLoss();
```

### Code 7: 다음 차례 셀렉터
```ts
// src/game/turnOrder.ts — 엔진 규칙 그대로(advanceTurn과 같은 판단), 엔진 파일은 수정하지 않음
export function nextUp(g: GameState): { pid: string; member: string; sameAgain: boolean } | null {
  if (g.phase === 'gameOver') return null;
  if (g.turn.extraGranted) { const p = currentParticipant(g); return { pid: p.id, member: activeMember(g), sameAgain: true }; }
  const n = g.config.participants.length, ni = (g.currentIndex + 1) % n;
  if (ni === 0 && g.round >= g.config.rules.rounds && !g.turn.extraGranted) return null; // 이번 턴이 마지막
  const p = g.config.participants[ni];
  return { pid: p.id, member: p.memberNames[p.memberTurnIndex] ?? p.name, sameAgain: false };
}
```
주의: `awaitingRoll`/`awaitingJudgement` 단계에서는 `extraGranted`가 아직 정해지지 않았을 수 있다. 화면 문구는 "다음: ○○"이고, 한 번 더가 걸리면 `turnResolved`에서 "🔁 한 번 더" 표시로 바뀐다.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| v1 PlayView: `useState<Seq>` + setTimeout 3개 + 손으로 합산한 watchdog | 비트 데이터 + 비트별 watchdog + id 멱등 | 이번 단계 | 예산 누락 버그가 구조적으로 생길 수 없다 |
| v1 `<Bounds fit>` 자동 프레이밍 | 순수 `fitCamera` 닫힌 식 | 이번 단계 | 이동 중 리프레임 흔들림이 없고 단위 테스트가 가능하다 |
| `three-stdlib` RoundedBoxGeometry | `three/addons/geometries/RoundedBoxGeometry.js` | three 패키지 exports `./addons/*` | phantom 의존성 제거 |
| `THREE.Clock` | `THREE.Timer` (r186에서 Clock deprecated) | three r186 | R3F 9.8.2 내부가 경고를 낸다. 동작에는 영향 없다. 코드에서는 `state.clock`을 읽지 말고 `delta`만 쓴다 [VERIFIED: 테스트 로그 경고] |

**Deprecated/outdated:**
- `require("three")`(CJS): node 환경 테스트에서 `THREE_CJS_DEPRECATED` 경고가 나온다. test-renderer와 fiber의 CJS 경로에서 생기는 것이고 결과에는 영향이 없다. [VERIFIED: 로컬 테스트 로그]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ContactShadows를 매 프레임 쓰는 것보다 `frames={1}` + blob이 iOS에서 싸다 | Standard Stack / Don't Hand-Roll | 낮음 — 실기기 UAT에서 프레임을 보고 조정 |
| A2 | grid/flex 캔버스 셀에 `min-height:0`이 없으면 R3F 크기가 넘친다 | Pattern 5 | 낮음 — 개발 중 바로 보인다 |
| A3 | 실패한 동적 import가 브라우저 module map에 캐시되어 재시도도 실패할 수 있다 | Pitfall 6 | 중간 — 예열로 완화. 오프라인 UAT 항목으로 확인 |
| A4 | R3F는 `geometry={shared}` prop으로 넘긴 geometry를 언마운트 때 dispose하지 않는다 | Pitfall 9 | 중간 — 틀리면 리마운트 후 메시가 사라진다. 리마운트 씬 테스트(`unmount` 후 `create`, geometry `uuid` 유지와 `dispose` 스파이)로 확인 가능 |
| A5 | 1라운드 게임 시작 시에도 "마지막 라운드!" 배너를 띄우는 것이 맞다 | Pattern 1 | 낮음 — UI-SPEC에서 정책 확정 |
| A6 | 세로에서 피치를 60°, 가로에서 50°로 두는 것이 읽기에 낫다 | Code 2 | 낮음 — 상수 2개, UAT에서 조정 |

## Open Questions (RESOLVED)

1. **SUS 판정(`too-new`)인 three/fiber/drei 버전을 그대로 쓸지** — **RESOLVED**
   - 알고 있는 것: 공식 패키지이고 다운로드가 많으며 postinstall이 없다. 로컬 설치·테스트·빌드가 모두 정상이었다.
   - 결정: D-05 버전(three 0.186.1 · @types/three 0.186.0 · fiber 9.8.2 · drei 10.7.9 · test-renderer 9.1.1)을 유지하고, 기존 lockfile 위에 exact pin으로 설치한다(사용자가 이미 3D 스택을 승인함). 패키지 정당성 게이트상 [SUS] 판정은 자동 승인할 수 없으므로, 설치 직전 06-01 Task 1에서 레지스트리 근거(`npm view` 결과)를 한 번 보여 주고 사용자가 "approved"로 확인한다. 별도의 버전 재협상은 없다.
2. **"마지막 라운드!" 비트를 버튼을 숨기는 비트로 할지** — **RESOLVED**
   - 결정: 버튼을 숨기는 1.5초(1500ms) `finalRound` 비트로 한다(UI-SPEC S6(b), 06-02 `BEAT_MS.finalRound`). 배너 밑에서 주사위를 굴리지 않게 하기 위해서이고, D-25 "안내 비트" 해석과 맞다. 1라운드 게임은 게임 시작 직후 한 번 나온다(A5 채택).
3. **R(라운드 수)이 클 때 ●○ 점 표시** — **RESOLVED**
   - 알고 있는 것: `ROUNDS_MAX = 20`이다. [VERIFIED: settings.ts]
   - 결정: R ≤ 10이면 점 R개 + `r/R`, 10을 넘으면 숫자 `r/R`만 쓴다(UI-SPEC S3, 06-04 `ROUND_DOTS_MAX = 10`).
4. **판정 성공 비트(`stars`, 600ms)를 Phase 6에 둘지** — **RESOLVED**
   - 결정: 둔다. 성공 판정 뒤 600ms `stars` 비트(배너 `🎉 성공!` / `⭐+N`)가 끝나는 순간 점수판 별이 오른다(06-02, 06-04). Phase 8은 같은 자리를 celebrate 연출로 교체만 하면 된다.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | 빌드·테스트 | ✓ | v22.23.1 | — |
| npm | 패키지 설치 | ✓ | 10.9.8 | — |
| npm registry 접근 | 3D 패키지 설치 | ✓ | — | — |
| 실제 iPhone/iPad Safari | STAB-02 컨텍스트 손실 재현, 세로 맞춤, 3초 읽기 | 사람(강사 기기) | — | 데스크톱 Chrome DevTools 기기 에뮬레이션 + `window.__loseContext`(DEV)는 보조 수단일 뿐 대체할 수 없다 → 단계 끝 UAT(D-29) |
| WebGL 브라우저(Chrome) | 시각 확인 | 사람 | — | `npm run dev` / `vite preview` |

**Missing dependencies with no fallback:** 없음 (실기기는 UAT 항목으로 남김)

## Validation Architecture (테스트 계층)

> nyquist_validation은 꺼져 있다. 아래는 planner가 태스크별 검증 명령을 고를 때 참고할 최소 계층이다.

| 계층 | 환경 | 대상 | 명령 |
|------|------|------|------|
| 1. 순수 | jsdom(기본) | `ringLayout`, `fitCamera`(three `project`로 검증), `buildTimeline`/`budgetMs`/`hopMs`, `applyBeat` fuzz 불변식, `diceFaces`, `nextUp`, `watchContextLoss`, 발판 겹침 | `npx vitest run src/game/layout src/game/director` |
| 2. 스토어 | jsdom + fake timers | `usePresentation` v2: 순서, 0ms 즉시 완료, 늦은 id 무시, 비트별 watchdog, `skipAll`, 드레인 resync, `consumedLog` | `npx vitest run src/game/usePresentation.test.ts` |
| 3. 씬 | `// @vitest-environment node` + test-renderer | 인스턴스 수와 이름, `advanceFrames`로 dice/hop 완료 1회, CameraRig `create(el,{width,height})` | `npx vitest run src/game/scene` |
| 4. HUD/흐름 | jsdom + RO stub + `vi.mock('./scene/GameCanvas')` | 버튼 숨김과 재등장, 깜빡임 없음(렌더 로그), 점수판 `displayed` 순위, 다음 차례, 마지막 라운드 배너, 컨텍스트 손실 오버레이 → `key` 증가 + 상태 보존, App 한 판 끝까지(`settle()`) | `npx vitest run src/game src/App.test.tsx` |
| 5. 빌드·오프라인 가드 | CLI | `tsc -b`(테스트 파일 포함), 메인 청크에 three 없음, dist에 CDN 문자열 0건 | `npm run build && ! grep -lE "googleapis|jsdelivr|githack|gstatic|unpkg" dist/assets/*.js && [ "$(grep -c WebGLRenderer dist/assets/index-*.js)" = 0 ]` |
| 6. 사람 UAT | iPhone/iPad Safari, 노트북 Chrome | 세로 한 화면 맞춤, 앱 전환 후 복구, 비행기 모드에서 게임 시작, 3초 읽기(출발·방향·칸 종류·1등·차례), 장난감 같은 입체감 | 단계 끝 체크리스트 |

- 소스 가드(선택, 빠름): `src/game/**`에서 drei 금지 named import(`Text|Text3D|Environment|Stage|Cloud|useGLTF|Gltf|StatsGl|Html`)와 `https?://` 문자열이 없는지 vitest로 스캔한다.
- 전체 스위트: `npm test`(현재 637개 통과). 단계 게이트: `npm test && npm run build`.

## Security Domain

### Applicable ASVS Categories (L1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (계정 없음) |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Validation, Sanitization & Encoding | yes | 참가자·미션·이벤트 이름은 **JSX 텍스트로만** 렌더한다(현행 T-05-15 유지). `dangerouslySetInnerHTML`와 drei `<Html>` 안의 사용자 문자열은 쓰지 않는다. 숫자 입력(steps≤20, rounds≤20)은 기존 Zod 스키마가 보장하며, 연출 길이 상한은 `hopMs`로 막는다 |
| V6 Cryptography | no | — |
| V10 Malicious Code / V14 Configuration (공급망) | yes | exact pin + 커밋된 lockfile + `postinstall` 없음 확인. drei 중 CDN을 부르는 모듈은 금지한다. 개발 전용 훅(`window.__loseContext`)은 `import.meta.env.DEV` 가드로 감싼다 |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 이름에 HTML/스크립트 주입 | Tampering | React JSX 이스케이프, innerHTML 금지 |
| 악성·하이재킹된 npm 버전 | Tampering | exact pin, lockfile, 설치 전 human-verify 체크포인트(SUS 3종) |
| 외부 CDN 요청(폰트/HDRI/디코더)으로 오프라인 고장과 정보 유출 | Information Disclosure / DoS | 금지 모듈 목록, dist 문자열 가드. 선택 사항으로 빌드 시에만 주입하는 meta CSP(`connect-src 'self'`)도 있다 [ASSUMED: 이번 세션에서 검증하지 않음] |
| 긴 이벤트 이동이나 리마운트 반복으로 GPU/메모리 고갈 | DoS | `hopMs` 상한, 리마운트는 사용자 버튼으로만, DPR 상한, 공유 geometry |

## Sources

### Primary (HIGH confidence)
- npm registry `npm view`(2026-10-23): three 0.186.1, @types/three 0.186.0, @react-three/fiber 9.8.2(peer react `>=19 <19.4`, three `>=0.156`), drei 10.7.9(peer fiber `^9.0.0`), test-renderer 9.1.1(peer fiber `>=9.0.0`). postinstall 없음
- `gsd-tools query package-legitimacy check`: 패키지별 verdict(위 표)
- 레포 사본(scratchpad)에서 실행: lockfile 위 설치(ERESOLVE 없음), 전체 vitest 652/652 통과, `tsc -b && vite build` 성공, lazy 청크 크기, dist CDN grep 0건
- 소스 직접 확인: `three/build/three.module.js`(`onContextLost` preventDefault, `onContextRestore`→`initGLContext`, 렌더 가드), `@react-three/fiber/dist/events-*.esm.js`(`disposeRenderer`→`forceContextLoss`, `flat`→NoToneMapping 아니면 ACESFilmic, frameloop never), `@react-three/test-renderer` d.ts(`advanceFrames`, `create` width/height), drei 소스의 CDN 참조 모듈 목록, three `package.json` exports `./addons/*`
- 레포 코드: `src/engine/{state,game,ring,board,scoring,animals}.ts`, `src/harness/useGameStore.ts`, `src/game/{usePresentation,useInputLock,GameApp,PlayView}.ts(x)`, `src/game/hud/*`, `src/schema.ts`(steps ≤ 20), `src/settings.ts`(ROUNDS_MAX 20), `src/App.test.tsx`, `src/game/hud/hud.test.tsx`
- git `e230f7b`(v1 3D 마지막 상태): `diceRotation.ts`, `scene/{Dice,Token,BoardTiles,BoardScene,scene.test}.tsx` / `0819ca3`(3D 제거, Phase 3.1 사유)

### Secondary (MEDIUM confidence)
- `.planning/research/{STACK,ARCHITECTURE,PITFALLS,SUMMARY}.md` (v2.0 연구, 2026-10-22)
- [Apple Developer Forums: Leaking WebGLRenderer when rerendering on iOS](https://developer.apple.com/forums/thread/741327) — Canvas 리마운트 반복 시 컨텍스트 누적
- [three.js forum: Context Lost when backgrounding Safari on iOS 17](https://discourse.threejs.org/t/context-lost-when-backgrounding-safari-on-ios-17-developer-beta-8/55772) — 백그라운드 복귀 시 손실, restored 처리 권장
- [WebKit Bug 261331](https://bugs.webkit.org/show_bug.cgi?id=261331) — iPadOS 백그라운드 후 컨텍스트 손실
- [three.js forum: Context lost when routing in R3F](https://discourse.threejs.org/t/context-lost-when-i-route-to-another-page-in-react-three-fiber/61736) — Canvas를 유지하고 내용만 바꾸라는 권고

### Tertiary (LOW confidence)
- iOS 탭 메모리 상한 수치와 저전력 모드 30fps 동작의 세부 — 실기기 UAT로만 확인 가능

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 레지스트리 조회, 로컬 설치, 전체 테스트, 빌드로 확인
- Architecture (Director·subscribe·레이아웃·카메라): HIGH — 핵심 주장 4개(깜빡임 없음, advanceFrames 완료 1회, 카메라 맞춤, lazy 분리)를 프로토타입으로 검증
- Pitfalls: HIGH(코드·소스로 확인한 항목) / MEDIUM(iOS 실기기, 비용 비교)

**Research date:** 2026-10-23
**Valid until:** 2026-11-22 (fiber와 drei가 자주 패치되므로 설치 시점에 `npm view`를 다시 확인)
