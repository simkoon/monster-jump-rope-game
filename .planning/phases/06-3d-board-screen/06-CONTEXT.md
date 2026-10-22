# Phase 6: 3D 순환판 & 게임 화면 - Context

**Gathered:** 2026-10-23
**Status:** Ready for planning
**Mode:** `--auto` — 사용자 지시("ㄱㄱ 다음으로 해", Phase 5에서 "싹다 추천으로") 에 따라 모든 회색 지대를 추천안으로 자동 선택. 각 선택은 아래 `[auto]`로 표시.

<domain>
## Phase Boundary

Phase 5의 임시 DOM 플레이 화면(`PlayView` + `RingStrip`)을 **3D 사각 순환판 게임 화면**으로 교체한다. 세로 폰 화면에서도 판 전체가 한 화면에 들어오고, 처음 보는 아이도 3초 안에 출발 칸·진행 방향·칸 종류·별 1등·지금 차례를 읽을 수 있어야 한다. 3D 주사위가 굴러 수가 나오고 말이 칸마다 한 칸씩 이동하며, 연출이 끝나야 다음 단계 버튼이 나타난다. 한글 글자는 모두 3D 밖 DOM 화면에 둔다. 3D 화면이 꺼지면 "화면 다시 그리기"로 상태를 유지한 채 복구한다.

포함 요구사항: BOARD-01, BOARD-02, BOARD-03, HUD-01, HUD-02, HUD-03, HUD-04, ROUND-02, STAB-02, STAB-04.

제외(다른 단계): 치비 동물 캐릭터·표정·같은 칸 다중 말 구분(Phase 7 — 이 단계의 말은 **임시 말**), 퀘스트 성공 연출·별 비행·시상식·효과음·탭 건너뛰기·실기기 최종 UAT(Phase 8). 규칙 엔진(`src/engine/*`)과 시작·결과 화면·설정 탭은 Phase 5 그대로 재사용한다(엔진 규칙 변경 없음).

</domain>

<decisions>
## Implementation Decisions

### 이어받은 결정 (Phase 5 · 마일스톤)
- **D-01:** 엔진은 순수·시계 없음 계약 그대로. 3D 화면은 엔진 상태를 **바꾸지 않고** 엔진이 남긴 도메인 이벤트 로그(`GameLog.events`: rolled/moved/startBonus/landed/eventApplied/questDrawn/judged/…)를 연출 비트로 재생한다. 별·위치의 진실은 엔진, 화면은 `displayed` 값으로 뒤따른다.
- **D-02:** 3D 공간 안에 한글 텍스트 금지(STAB-04). drei `<Text>`/troika 등 폰트를 받는 3D 텍스트 사용 금지. 글자는 모두 DOM 오버레이.
- **D-03:** 외부 CDN 요청 금지 — HDRI·원격 폰트·원격 모델 없음. 조명은 코드로 만든 라이트만(STAB-04).
- **D-04:** 물리 엔진 없음, 주사위·이동은 트윈(자체 `useFrame(delta)` 타임라인). 후처리(postprocessing) 없음, 섀도맵 없음(가짜 바닥 그림자/ContactShadows 수준만).
- **D-05:** 스택 — three / @react-three/fiber 9 / @react-three/drei 10 exact pin, `@react-three/test-renderer`(dev). 버전은 `.planning/research/STACK.md` 권장(three 0.186.1 · @types/three 0.186.0 · fiber 9.8.2 · drei 10.7.9 · test-renderer 9.1.1) 기준, 설치 시점 레지스트리 확인. 기존 lockfile 위에서 설치(`.npmrc` legacy-peer-deps 유지).
- **D-06:** 캔버스는 게임 중 **하나만** 유지(Canvas 단일·lazy 로드). 결과 화면은 Phase 5 ResultView 그대로(캔버스 언마운트 허용 — 판 사이 GPU 누수 점검은 Phase 8 STAB-01).

### 판 모양과 카메라
- **D-07:** [auto] 사각 순환판 — 네 변에 칸을 고르게 나누고 네 모서리 칸을 둔다. 보드 크기(16/20/24)는 엔진 `board` 길이를 그대로 따른다(16=변당 4칸+모서리 공유, 20=변당 5, 24=변당 6 식으로 둘레를 균등 배치하는 순수 함수 `ringLayout(n)`).
- **D-08:** [auto] **출발 칸은 화면 아래-오른쪽 모서리**, 진행 방향은 **시계 방향**(아래 변을 따라 왼쪽으로 → 왼쪽 변 위로 → 위 변 오른쪽으로 → 오른쪽 변 아래로). 부루마불·모노폴리 관례.
- **D-09:** [auto] 카메라는 **고정 쿼터뷰**(위에서 약 50~60° 내려다봄), 사용자 회전·줌 없음(OrbitControls 없음). 순수 함수 `fitCamera(aspect, hudInsets)`가 가로/세로 FOV 중 빡빡한 쪽에 맞춰 판 전체(+말 높이 여유)가 화면에 들어오게 거리 계산. 세로 폰(390×844)·가로 태블릿·노트북 모두 판 전체가 보여야 한다(BOARD-01). 리사이즈·회전 시 재계산.
- **D-10:** [auto] 이동 중 카메라 추적 없음(전체 판이 항상 보이는 것이 "3초 읽기"에 유리).

### 칸 표현 (글자 없이 읽히게 — BOARD-02/03)
- **D-11:** [auto] 칸 사이 **간격**을 둔다(칸 크기의 약 12~15%) — 하나씩 셀 수 있게. 칸은 둥근 사각 블록(RoundedBox), 밝은 캔디 톤.
- **D-12:** [auto] **출발 칸 = 랜드마크**: 다른 칸보다 크고(약 1.4배) 높은 받침 + 아치/깃발 게이트 3D 도형 + 금색 계열. 멀리서도 한눈에 구분.
- **D-13:** [auto] **진행 방향**: 칸마다 바닥에 작은 화살표(셰브런) 도형을 다음 칸 방향으로 배치. 모서리 칸은 꺾인 방향.
- **D-14:** [auto] **퀘스트 칸**: 난이도 색 — 쉬움 = 초록, 보통 = 주황/노랑, 어려움 = 빨강/분홍(기존 편집기 난이도 색 토큰과 같은 색상 계열을 사용) + 칸 위에 **받을 별 개수만큼 작은 3D 별**(⭐1/2/3)이 떠 있다.
- **D-15:** [auto] **이벤트 칸**: 퀘스트 칸과 다른 모양(원형/육각 발판)과 보라 계열 + 효과별 3D 아이콘 — 앞으로 = 앞쪽을 향한 큰 화살표, 뒤로 = 뒤쪽 화살표(경고색), 한 번 더 = 회전 화살표(🔁 모양). 이동 칸 수는 3D에 표시하지 않는다(도착 후 DOM 배너로 안내).
- **D-16:** [auto] 칸 번호는 표시하지 않는다(순환판이라 결승까지 거리 개념 없음, 3D 텍스트 금지). 대신 주사위 결과가 나오면 **목적지 칸 하이라이트 + 경로 점**을 잠깐 보여 준 뒤 이동(v1 quick-lbq 패턴 재사용).

### 말(임시 말)과 이동
- **D-17:** [auto] 임시 말 = 둥근 캡슐+머리 형태의 장난감 말, **참가자 색**(점수판과 같은 색)으로 구분. 동물 모습은 Phase 7. 같은 칸에 여러 말이 있으면 칸 안에서 작은 고정 오프셋으로 비켜 세운다(완전한 구분은 Phase 7 BOARD-05).
- **D-18:** [auto] 지금 차례 말은 발밑 링 + 살짝 통통 튀는 대기 동작으로 강조.
- **D-19:** [auto] 연출 타이밍 — 주사위 굴림 약 1.0초 → 목적지 미리보기 약 0.5초 → 칸당 약 0.25초 홉(포물선 점프) → 출발 보너스/이벤트 짧은 표시. 이벤트로 인한 이동도 같은 홉으로 재생. 모든 비트 길이는 데이터(타임라인)로 두어 watchdog 예산을 자동 계산(v1 `PREVIEW_S` 누락 버그 재발 방지).

### 주사위
- **D-20:** [auto] 3D 주사위는 v1 `d7b9b73` Dice(둥근 모서리·광택)를 복원·개량 — 판 가운데에서 굴러 결과 면이 위로 오며 멈춘다. 결과 수는 엔진이 이미 정한 값(`rolled.face`)으로 스냅. 주사위 눈은 3D 점(글자 아님).
- **D-21:** [auto] 주사위 버튼은 화면 아래쪽 **큰 🎲 버튼**(글자 최소, 엄지 영역). 판 위 주사위를 직접 탭해도 굴릴 수 있게 하지는 않는다(오작동 방지).

### 화면 정보 (DOM HUD — HUD-01~04, ROUND-02)
- **D-22:** [auto] 세로 화면 배치: **위** = 차례 바(지금 차례: 색 점 + 이름, 팀전이면 "이번엔 ○○ 님!", 다음 차례 작게) + 라운드 `r/R`(●●●○○ 점 표시) + 지금 끝내기, **가운데** = 3D 판, **아래** = 큰 주사위/다음 버튼 + 가로 스크롤 없는 **별 점수판**(별 순 정렬, 동점 같은 등수, 말과 같은 색 점·Phase 5 동물 이모지). 가로 화면에서는 점수판을 오른쪽 세로 패널로.
- **D-23:** [auto] 퀘스트 카드·판정(✅/❌)·되돌리기·출발 보너스/이벤트 안내는 3D 위 DOM 오버레이(Phase 5 MissionOverlay 재사용·재스킨). 카드가 떠 있는 동안에도 판은 뒤에 보인다.
- **D-24:** [auto] "마지막 라운드!" — 마지막 라운드의 첫 턴이 시작될 때 화면 가운데 큰 DOM 배너 약 1.5초(ROUND-02), 이후 라운드 표시에 강조색 유지.
- **D-25:** [auto] 연출 중(주사위·미리보기·홉·안내 비트)에는 진행 버튼을 **숨기고**(비활성 아님), 비트가 끝나야 나타난다(HUD-03). Phase 5의 400ms 입력 잠금은 유지·통합. 연출 건너뛰기 탭은 Phase 8 범위.
- **D-26:** [auto] Phase 5 `RingStrip`(칸 줄)은 3D 판으로 대체되어 플레이 화면에서 제거한다(컴포넌트·테스트 정리는 planner 재량).

### 3D 화면 꺼짐 복구 & 오프라인 (STAB-02/04)
- **D-27:** [auto] `webglcontextlost` 감지 시 3D 영역 위에 큰 **"🔄 화면 다시 그리기"** 버튼 오버레이. 누르면 `<Canvas key>` 증가로 캔버스를 다시 만들고, 상태는 Zustand에 있으므로 별·위치·차례가 그대로 복원된다(진행 중 연출은 최종 상태로 스냅). 탭 숨김(visibilitychange) 동안 frameloop 정지.
- **D-28:** [auto] 성능 기본값 — DPR 상한 2(폰은 1.5 검토), 공유 geometry/material 모듈, 칸은 InstancedMesh 또는 소수 메시, 프레임 루프는 연출 중에만 연속 렌더(`frameloop="demand"` + invalidate) 우선 검토.
- **D-29:** [auto] 실기기 확인(iPhone/iPad Safari) 항목은 단계 끝 사람 확인(UAT)으로 남긴다 — 컨텍스트 손실 재현, 세로 화면 맞춤. 자동 테스트는 jsdom + `@react-three/test-renderer`(씬 구조·`advanceFrames` 타임라인) + 순수 함수(`ringLayout`, `fitCamera`, 타임라인 예산) 단위 테스트.

### Claude's Discretion
- 정확한 색상 값·조명 배치·칸/말/주사위 치수(UI-SPEC 단계에서 확정).
- 연출 디렉터 구조(`buildTimeline(events) → Beat[]`, `usePresentation` v2 큐·비트별 watchdog·id 멱등 완료) — 연구 ARCHITECTURE 권장안을 따르되 세부는 planner 재량.
- 3D 모듈 lazy import 경계, 파일 이름.
- InstancedMesh vs 개별 메시, `frameloop` 모드 최종 선택.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 범위·요구사항
- `.planning/ROADMAP.md` §"Phase 6: 3D 순환판 & 게임 화면" — 목표·성공 기준 5개
- `.planning/REQUIREMENTS.md` — BOARD-01~03, HUD-01~04, ROUND-02, STAB-02, STAB-04 + Out of Scope(3D 한글 텍스트·물리 주사위·외부 .glb 금지)
- `.planning/PROJECT.md` — 아동 대상 큰 UI·밝은 색·오프라인·IP 제약

### 연구 (v2.0)
- `.planning/research/SUMMARY.md` §Phase 6 — 전달물·Avoids 목록(Pitfall 4~9, 16~18)
- `.planning/research/ARCHITECTURE.md` — Director 패턴, `usePresentation` v2, DOM 오버레이 HUD, CameraRig/`fitCamera`, 단일 Canvas
- `.planning/research/PITFALLS.md` — iOS Safari WebGL 컨텍스트 손실, busy 고착, GPU 누수, 세로 카메라 프레이밍, 연출 길이
- `.planning/research/STACK.md` — 3D 패키지 버전·exact pin·설치 주의(ERESOLVE), drei에서 쓰지 말 것(`Text`, `StatsGl`), postprocessing 금지

### 이전 단계
- `.planning/phases/05-rules-engine-settings/05-CONTEXT.md` — 규칙 엔진 결정(D-01~D-28), 이벤트 로그 계약
- `.planning/phases/05-rules-engine-settings/05-UI-SPEC.md` — 기존 색·타이포·간격 토큰, 플레이 화면 문구
- `.planning/phases/05-rules-engine-settings/05-05-SUMMARY.md`, `05-REVIEW-FIX.md` — 임시 화면 구조, 400ms 입력 잠금(`useInputLock`)
- `.planning/milestones/v1.0-phases/03-board-game-ui/03-CONTEXT.md`, `03-UI-SPEC.md` — v1 R3F 보드·ANIM_DONE 게이트·HUD 결정(참고)
- git `d7b9b73` — v1 3D Dice/Token/BoardTiles 소스(복원 참고)
- `.planning/quick/*260726-lbq*` — 목적지 하이라이트 패턴과 watchdog 예산 누락 교훈

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/engine/state.ts` `GameEvent`/`GameLog` — 연출 비트의 입력(rolled.face, moved.path, startBonus, landed.kind, eventApplied, questDrawn, judged, judgementUndone, gameEnded).
- `src/engine/game.ts` 셀렉터 + `src/harness/useGameStore.ts` — 단일 엔진↔스토어 seam(스냅샷 포함).
- `src/game/usePresentation.ts` — busy 게이트 + watchdog(단일 애니메이션). Phase 6에서 비트 큐로 확장.
- `src/game/useInputLock.ts` — 400ms 연속 탭 잠금(Phase 5 CR-01 수정).
- `src/game/hud/{Scoreboard,TurnHud,ControlsBar,MissionOverlay,DiceResultPanel}.tsx`, `src/game/labels.ts` — DOM HUD 부품·문구.
- `src/engine/animals.ts` + `labels.ts` 동물 이모지 — 점수판·차례 표시 아이콘.
- `src/game/styles/game.css` 토큰(--tap/--tap-sm/--hud-h, 40/26/20/15) · `src/styles/index.css` 색 토큰.

### Established Patterns
- 엔진 순수성(React/DOM/시계 없음) — 3D 코드는 엔진을 import해 읽기만.
- 결정적 테스트(mulberry32), Vitest + Testing Library + jsdom.
- `tsc -b`가 테스트 파일까지 검사, CI는 `npm run build`만 → 깨진 테스트 하나도 배포를 막음.

### Integration Points
- `src/game/PlayView.tsx` — 임시 DOM 플레이 화면 → 3D 캔버스 + DOM HUD 오버레이로 교체.
- `src/game/GameApp.tsx` — setup/play/result 라우팅, gameOver를 busy 뒤로 보류.
- `package.json` / lockfile — 3D 패키지 추가(현재 three 계열 미설치).
- `vite.config.ts` base `/monster-jump-rope-game/` (GitHub Pages) — 자산 경로 상대 처리.

</code_context>

<specifics>
## Specific Ideas

- 사용자는 "3D로 하기로 했는데 왜 이렇게 되어 있냐"고 물었다 — 이 단계의 결과물은 **눈에 띄게 3D 게임처럼** 보여야 한다(임시 말이라도 장난감 같은 입체감, 캔디 톤, 부드러운 조명).
- 메모리 원칙: 보드는 3초 안에 진행 방향·출발(랜드마크)·순위·차례가 읽혀야 한다(2026-07-26 시안 두 번 반려 사유 — "칸이 붙어 있고 어디로 가는지 모르겠다"). 최종은 견본보다 확실히 귀엽게.
- 배포: 사용자가 GitHub(`simkoon/monster-jump-rope-game`, main push → Pages) 배포를 원했으나 Phase 5 임시 화면 상태라 보류. Phase 6 완료 후 배포가 자연스러운 시점.

</specifics>

<deferred>
## Deferred Ideas

- 치비 동물 말·표정·같은 칸 최대 8말 구분 — Phase 7.
- 성공 연출(컨페티·별 비행·배너), 연출 탭 건너뛰기, 효과음, 시상식, 5판 연속 누수 점검, iPhone/iPad 최종 실기기 UAT — Phase 8.
- 칸 번호 표시 — 3D 텍스트 금지 원칙상 보류(필요하면 DOM 라벨로 재검토).

</deferred>

---

*Phase: 06-3d-board-screen*
*Context gathered: 2026-10-23 (auto mode)*
