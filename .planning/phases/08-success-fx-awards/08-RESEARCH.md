# Phase 8: 퀘스트 성공 연출 & 시상식 & 마감 - Research

**Researched:** 2026-10-23
**Domain:** 연출 큐(`usePresentation`) 위 등급별 성공 비트, 3D InstancedMesh 파티클 풀, 3D 앵커에서 DOM 점수판으로 별 비행(순수 투영), 같은 캔버스 안 시상식 모드, 엔진 게임 통계와 칭찬 배지, Web Audio 합성 효과음, 5판 연속 누수 점검
**Confidence:** HIGH (레포 소스·node_modules·로컬 vitest·헤드리스 Chrome으로 직접 확인) / MEDIUM (iOS Safari 오디오 동작, 연출 체감은 실기기·사람 확인 필요)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### 성공 연출 구성·길이 (FX-01, FX-02, FX-03, FX-04)
- **D-01:** [auto] 성공 연출은 **기존 `stars` 비트를 확장**한다(새 엔진 이벤트 없음, `buildTimeline` 순수·clock-free 유지). 비트 길이는 별 개수(=난이도 등급)로 정한다: **⭐1 = 1600ms, ⭐2 = 1900ms, ⭐3 = 2200ms**. `BEAT_MS.stars` 단일 값 → 등급별 표로 바꾼다(Phase 7 D-12의 900ms 상한은 Phase 8이 대체; Phase 7 점프·회전은 이 비트의 앞부분에 그대로 쓴다).
- **D-02:** [auto] **2.5초 예산 정의**: "판정 버튼 탭(성공) → 다음 진행 버튼이 눌릴 수 있게 될 때"까지. 그 전환에서 나오는 모든 비트 ms 합 + 입력 잠금 해제 지연이 **≤ 2500ms**여야 한다(⭐3 기준 2200 + 여유 300). 마지막 판정이 게임을 끝내는 경우(`win` 비트, 시상식)는 다음 진행이 아니라 게임 종료이므로 예산에서 제외. 순수 테스트로 고정: 모든 등급 × reduced motion on/off에서 합 ≤ 2500.
- **D-03:** [auto] 성공 비트 안의 순서(대략적 비율, 정확한 ms는 Claude 재량):
  1. 0~35%: 캐릭터 높은 점프 + 360° 회전 + 팔 들기 + 기쁨 표정(Phase 7), 착지 순간 **바닥 충격파 링** + **별 버스트**(작은 별 조각이 방사형으로) + **컨페티**
  2. 30~45%: "퀘스트 성공! ⭐+N" 배너 등장(기존 Banner 컴포넌트 확장)
  3. 40~90%: **큰 별이 캐릭터 머리 위에서 점수판의 해당 참가자 칸으로 비행**(N개면 큰 별 1개 + "+N" 표기, 별 N개를 각각 날리지 않는다 — 길이 고정)
  4. 별 도착 순간 점수판 숫자 증가 + 칸 pop 애니메이션 + "딩" 효과음, 비트 끝
  - 점수판 숫자는 Phase 6 D-01 그대로 **비트 끝(별 도착)**에 오른다.
- **D-04:** [auto] 난이도 등급별 크기(FX-04):
  | 등급 | 컨페티 | 별 버스트 | 충격파 링 | 추가 |
  |---|---|---|---|---|
  | ⭐1 | 적게(약 40) | 작게 | 1겹 | — |
  | ⭐2 | 보통(약 80) | 보통 | 2겹 | 배너 크게 |
  | ⭐3 | 많이(약 140) + 금색 섞음 | 크게 | 2겹 + 금색 | **카메라 흔들림**(≤ 350ms, 작은 진폭, 감쇠) |
- **D-05:** [auto] **별 비행은 DOM 레이어**에서 한다(3D 아님): 캐릭터 머리 월드 좌표를 R3F 카메라로 화면 좌표에 투영해 시작점으로 쓰고, 끝점은 점수판 참가자 칸 아바타의 `getBoundingClientRect()`. DOM 별은 HUD 위를 지나갈 수 있고 점수판과 정확히 정합된다. 좌표 투영은 three 없는 순수 함수 + 카메라 행렬 입력으로 분리해 테스트한다(로드맵 "더 깊은 확인" 항목). 3D가 없거나 꺼졌으면 화면 중앙에서 출발한다(게임 진행은 계속, Phase 6 원칙).
- **D-06:** [auto] **컨페티·별 버스트·충격파 링은 3D**(lazy 3D 청크 안): `InstancedMesh` 풀을 미리 만들어 재사용한다(성공마다 지오메트리·머티리얼 생성 금지 — STAB-01). 연출 중 추가 드로우콜 ≤ 4, 전체 예산은 **연출 중 ≤ 104**(평상시 ≤ 100 유지, Phase 7 D-20). 그림자·후처리 금지 유지.
- **D-07:** [auto] **탭으로 건너뛰기**(FX-03): 성공 비트(그리고 win 비트, 시상식 진입 연출) 동안 화면 아무 곳이나 탭 → 현재 비트를 즉시 `completeBeat(id)` → 별 비행·컨페티 즉시 정리, 점수판은 최종값으로 즉시 표시. 별은 엔진에서 이미 지급됐으므로 건너뛰어도 그대로. **탭이 뒤의 "다음" 버튼으로 새지 않게** 건너뛰기 직후 250ms 동안 진행 버튼 입력을 막는다(기존 `useInputLock` 확장). 주사위·이동·짧은 비트(miss/startBonus/event)는 1초 안팎이라 건너뛰기 대상에서 뺀다.
- **D-08:** [auto] **reduced motion**: 점프·회전·흔들림·컨페티 날림 없이 표정 + 배너 + 별이 점수판 칸에서 페이드인(비행 없음)만. 비트 길이는 Phase 6 규칙대로 줄인다(그래도 ≤ 2500 테스트에 포함).

#### 실패·보너스·이벤트 짧은 연출 (FX-05, FX-06)
- **D-09:** [auto] **실패**: 기존 `miss` 비트(700ms, Phase 7 고개 숙임 + 아쉬움 표정)를 유지하고, 지금은 비어 있는 배너 자리에 **부드러운 응원 문구** 1줄(예: "괜찮아! 다시 해 보자 💪" / 재도전 없는 실패는 "다음엔 꼭! 💪")을 부드러운 하늘·연보라 톤으로 띄운다. **빨간색·X 표시·버저음 금지**. 효과음은 낮고 짧은 2음 "뿅~"(하강하지만 부드러운 음색). 전체 ≤ 1000ms.
- **D-10:** [auto] **출발 보너스**(800ms): 기존 배너 + 캐릭터 발밑 **작은 금색 반짝이 버스트**(성공용 풀 재사용, 소량) + 차임 효과음. **이벤트**(1000ms): 보너스 계열 = 반짝이 + 밝은 효과음, 함정 계열 = 작은 연기 퍼프 + "뽀용" 같은 귀여운 효과음(겁주지 않게). 비트 길이는 늘리지 않는다.

#### 시상식 (END-01, END-02, END-03)
- **D-11:** [auto] 시상식은 **3D 시상대 + DOM 오버레이**로 만든다. 같은 lazy 3D 캔버스에서 "시상식 모드"로 전환해 보드 대신(또는 보드 앞 마당에) 시상대를 놓고 **실제 치비 캐릭터**를 세운다(Phase 7 `ChibiModel` 재사용, 우승 표정·환호 동작). 3D가 없거나 꺼졌으면 **DOM 전용 시상대**(이모지 + 색 원 + 단 블록)로 대체하고 나머지는 동일하게 동작한다.
- **D-12:** [auto] **시상대 구성 — 꼴찌를 강조하지 않는다**: 가운데 1단(가장 높은 금색 단)에 **우승자 전원**(공동 우승이면 나란히, 최대 8마리 — 크기 축소 규칙은 Phase 7 D-17 수치 재사용)이 선다. 2·3등 단은 **만들지 않는다**. 나머지 참가자는 시상대 앞 바닥에 **한 줄로 서서 함께 환호**(모두 기쁨 표정). 별 0개 공동 우승도 Phase 7 D-14a대로 우승자 전원.
- **D-13:** [auto] **별 개수 목록**: 모든 참가자/팀을 별 많은 순으로 보여 주되, **등수 숫자는 우승자에게만**(🏆 표시) 붙이고 나머지는 숫자 없이 "이름 + ⭐N"만. 현재 `ResultView`의 "N등" 표시는 없앤다. 끝난 이유 문구(라운드 완료/일찍 마침)는 유지.
- **D-14:** [auto] **칭찬 배지**(END-02): **모든 참가자가 정확히 1개 이상** 받는다(승패와 무관). 후보와 기준(동점이면 모두 받음):
  | 배지 | 기준(게임 통계) |
  |---|---|
  | 🏃 도전왕 | 퀘스트 도전 횟수(재도전 포함) 최다 |
  | 💪 끈기왕 | 실패 후 다시 도전해 성공한 횟수 최다(0이면 미지급) |
  | 🌏 여행왕 | 이동한 칸 수(`travel`) 최다 |
  | 🔥 고수왕 | ⭐3 퀘스트 성공 횟수 최다(0이면 미지급) |
  | 🍀 행운왕 | 보너스 이벤트·출발 보너스 받은 횟수 최다(0이면 미지급) |
  | 🎉 응원왕 | 위 배지를 하나도 못 받은 참가자 전원(대체 배지) |
  - 배정은 **순수 함수 `awardBadges(stats, participants)`**, 결정적, 테스트: 2~8명 · 무작위 시드 다수에서 "모두 ≥ 1개, 한 사람 최대 2개 표시"(표시는 대표 배지 1~2개로 제한해 화면을 단순하게).
- **D-15:** [auto] **게임 통계는 엔진에서 누적**한다: `GameStateCore`에 참가자별 `stats`(attempts, successes, failures, retrySuccesses, hardSuccesses, luckyCount)를 넣고 판정·이벤트·출발 보너스 처리 때 갱신(엔진 순수 함수 원칙 유지). 되돌리기(undo) 스냅샷에 자연히 포함되어 되돌리면 통계도 되돌아간다. 이동 칸 수는 기존 `travel` 사용. 영속 데이터·백업 스키마는 바꾸지 않는다(게임 진행 상태만).
- **D-16:** [auto] 시상식 진입 흐름: 라운드 완료 종료 = Phase 7 `win` 비트(1500ms) → 시상식. "지금 끝내기" = `win` 비트 없이 바로 시상식(Phase 6/7 결정 유지). 시상식 첫 등장 연출(우승자 단상 점프 + 컨페티 + 팡파르)은 ≤ 2초, 탭으로 건너뛸 수 있다. "🔁 다시 하기"(기존 `restart()`) / "처음으로"(기존 `reset()`)는 연출 중에도 바로 보이고 누를 수 있다.

#### 효과음 (AUDIO-01, AUDIO-02)
- **D-17:** [auto] 효과음은 **코드로 합성한 Web Audio 소리**로 만든다(외부 파일·CDN·새 의존성 없음, howler 미사용). 프로젝트가 만든 소리이므로 `public/assets/cc0/LICENSE.md`에 "project-created, CC0 1.0"으로 명시해 "CC0 소리만" 조건을 만족한다. 오프라인 동작(STAB-04) 유지. 이후 Kenney CC0 오디오 파일로 바꿀 수 있게 `sfx` 모듈 인터페이스(`play(name, opts)`)를 하나로 둔다.
- **D-18:** [auto] 소리 목록(최소): 주사위 굴림 달그락 · 칸 이동 톡(칸마다, 작게) · 퀘스트 성공 징글(등급별 길이·음높이 상승, ⭐3 가장 화려) · 별 도착 "딩" · 실패 부드러운 2음 · 출발 보너스 차임 · 이벤트 보너스/함정 · 시상식 팡파르. 버튼 클릭음은 넣지 않는다(소음 최소화).
- **D-19:** [auto] 소리는 **연출 비트 시작에 맞춰** 하나의 구독자(`useSfx`, `usePresentation` 구독)가 재생한다 → 건너뛰기 시 남은 소리는 재생하지 않고 진행 중 소리는 짧게 페이드아웃. 비트 데이터가 소리의 단일 출처.
- **D-20:** [auto] **켜고 끄기**: `soundOn: boolean`(기본 **켜짐**)을 강사 설정 스토어(`src/settings.ts`, 별도 persist 키, **백업에 포함하지 않음** — DATA-07 원칙)에 추가하고, ① 게임 화면 컨트롤 바에 크고 단순한 🔊/🔇 토글 버튼, ② 강사 설정 탭에 같은 스위치. `SettingsSchema` 필드별 `.catch(true)`로 예전 저장분과 호환.
- **D-21:** [auto] `AudioContext`는 첫 사용자 탭(게임 시작 버튼)에서 만들고/resume 한다(iOS 자동재생 정책). 앱이 백그라운드에서 돌아오면 resume 재시도. 음량은 고정 중간값, 아이 교실 환경 고려해 클리핑 없게 마스터 리미터(간단 gain) 하나.

#### 안정성 마감 (STAB-01, STAB-03)
- **D-22:** [auto] **5판 연속 자동 점검**: ① jsdom 테스트 — 엔진+디렉터+연출 큐로 5판을 끝까지 돌려 타이머·구독·연출 큐 항목이 판마다 0으로 돌아오는지 확인. ② dev 전용 진입점(예: `?soak=5`, 프로덕션 메인 경로 비노출 — Phase 7 갤러리 방식)에서 실제 브라우저로 5판 자동 플레이 후 `renderer.info.memory`(geometries/textures)·드로우콜·JS heap(가능하면)을 판마다 기록해 **증가 없음**을 확인. Claude가 실행 중 헤드리스 Chrome으로 돌려 수치를 VERIFICATION에 남긴다.
- **D-23:** [auto] 누수 방지 규칙: 연출용 지오메트리·머티리얼은 모듈 싱글턴/풀(재생성 금지), DOM 별·컨페티 요소는 비트 종료 시 반드시 제거, 모든 `setTimeout`/`requestAnimationFrame`/이벤트 리스너는 언마운트 정리, `AudioNode`는 재생 후 disconnect.
- **D-24:** [auto] **실기기 확인(STAB-03)과 연출 체감**은 단계 끝 사람 UAT로 모은다(Phase 7 UAT 8건과 함께 한 번에): ① iPhone Safari ② iPad Safari ③ 노트북 Chrome에서 성공/실패/시상식/효과음/5판 연속 ④ 성공 연출이 신나는가·2.5초 안에 끝나 답답하지 않은가 ⑤ 실패 반응이 다정한가 ⑥ 꼴찌가 민망하지 않은가 ⑦ iOS 무음 스위치·소리 토글 동작.

### Claude's Discretion
- 성공 비트 내부 정확한 타이밍·이징, 컨페티 색·모양·물리 수식, 충격파 링 반경, 카메라 흔들림 수식, 별 비행 곡선(포물선/베지어)
- 합성 효과음의 파형·음높이·엔벨로프
- 시상대 모델 치수, 시상식 카메라 구도, DOM 대체 시상대 레이아웃
- 배지 문구 세부, 대표 배지 우선순위
- soak 진입점 형태, 측정 지표 세부

### Deferred Ideas (OUT OF SCOPE)
- 배경음악(BGM) — AUDIO-03, 후속 마일스톤
- 줄넘기 줄 소품 / 성공 시 줄넘기 동작 — Phase 7에서 넘어온 후보. 이번 성공 연출은 요구사항의 점프·회전·팔 들기로 한정(형태·드로우콜 부담)
- 차례가 아닌 캐릭터가 남의 성공에 박수 치는 반응 — 시선 집중 원칙 우선, 후속 폴리시(단 시상식에서는 전원 환호)
- Kenney CC0 오디오 파일로 효과음 교체 — `sfx` 인터페이스 뒤에서 언제든 가능
- 3D 캐릭터 얼굴을 점수판 아이콘으로 — Phase 7 deferred 유지
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FX-01 | 성공하면 점프·회전·팔 들기, 컨페티, 별 버스트, 바닥 충격파 링 | Pattern 2(`successPlan` 단일 시간표), Pattern 4(always-mounted InstancedMesh 풀 4개, 93 → 97 draws), 등급별 `successPose` |
| FX-02 | 큰 별이 캐릭터 위에서 점수판으로 날아가 점수가 오르고 "퀘스트 성공! ⭐+N" 배너 | Pattern 3(three 없는 순수 투영, three와 오차 7e-16 확인), `data-pid` 대상 칸, portal 고정 레이어, Banner 지연 등장 |
| FX-03 | 판정 → 다음 진행 ≤ 2.5초, 탭으로 건너뛰기(별 유지) | 성공 전환 = `judged` 이벤트 1개 → `stars` 비트 1개(game.ts:266-276), 순수 예산 테스트, Pattern 5(document capture `click` + 공유 잠금 250ms) |
| FX-04 | 난이도가 높을수록 더 크게(⭐3 화면 흔들림) | `successPlan` 등급 표, CameraRig 안 흔들림(fit 기준 위치 복원) |
| FX-05 | 실패 ≤ 1초, 다정한 반응(빨간 X·버저음 없음) | miss 700ms 유지 + `retry` 필드 + soft 톤 배너, 부드러운 2음 |
| FX-06 | 출발 보너스·이벤트 짧은 연출 | 같은 풀 재사용(반짝이/연기 퍼프), `eventTone` 분류 함수, 비트 길이 불변 |
| END-01 | 시상대에 우승자, 전원 별 개수, 꼴찌 강조 없음 | Pattern 6(GameStage 안 시상식 모드 — 같은 캔버스), 순수 `podiumLayout`, DOM 대체 시상대, 우승자만 🏆 |
| END-02 | 칭찬 배지 | Pattern 7(엔진 `stats` + 순수 `awardBadges`, 퍼즈 불변식) |
| END-03 | 다시 하기 / 처음으로 | 기존 `restart()`/`reset()`(useGameStore.ts:119-130) 그대로, 시상식 연출 중에도 누를 수 있게 |
| AUDIO-01 | 주사위·이동·성공·별·시상식 효과음(CC0) | Pattern 8(Web Audio 합성, 비트 구독자 1개, 노드 정리), LICENSE.md 고지 |
| AUDIO-02 | 효과음 켜고 끄기 | `SettingsSchema.soundOn.catch(true)`, 항상 보이는 토글(ControlsBar는 비트 중 null을 반환하므로 그 밖에 둠) |
| STAB-01 | 5판 연속 느려짐·멈춤 없음 | Pattern 9(jsdom 5판 테스트 + dev `soak.html` + 헤드리스 Chrome 실측), "같은 캔버스에서 아무것도 리마운트하지 않기" 규칙 |
| STAB-03 | iPhone·iPad Safari, 노트북 Chrome 실기기 | UAT 항목(D-24) + LAN dev 서버로 `soak.html`을 실기기에서 열어 수치 확인 |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- 기술 스택 고정: React 19 + TypeScript + three 0.186.1 + R3F 9.8.2 + drei 10.7.9 + Zustand 5 + zod 4 + Vite 8 + Vitest 3.2.4(package.json). **새 런타임 의존성 없음**(D-17: howler 미사용).
- 데이터: 서버 없이 localStorage + JSON 내보내기/가져오기. 강사 설정은 별도 키 `powerjumping_settings_v1`, 백업에 포함하지 않음(DATA-07, settings.ts:32).
- 아동 대상 UI: 크고 단순, 밝고 경쾌(닌텐도풍), 글자 최소화. 사용자 기억: "최종 게임은 견본보다 확실히 더 귀엽게".
- IP: 실제 브랜드·저작권 자산 금지. 오리지널·CC0만.
- 3D 공간 안에 한글 텍스트 금지(소스 가드 (c)), 외부 CDN·URL 금지(소스 가드 (b)), 물리 엔진·후처리 금지(소스 가드 (e)), 그림자 맵 금지(소스 가드 (f)), 메인 청크에 three 값 import 금지(소스 가드 (d)).
- GSD 워크플로 강제: 파일 변경은 GSD 명령(`/gsd-execute-phase`) 안에서만.
- 전역 지침: 대화는 한국어 선호. 비밀값·개인정보를 Obsidian에 쓰지 않는다.

## Summary

성공 연출은 **새 엔진 이벤트 없이** 끝낼 수 있다. 성공 판정 전환은 `judged` 이벤트 하나만 만든다(game.ts:266-276, `phase: 'turnResolved'`). 그래서 `buildTimeline`이 내는 비트도 `stars` 하나다. 다음 버튼은 `!busy && consumedLog === game.log && ready && failure === null`일 때 보인다(GameStage.tsx:134). 따라서 "판정 → 다음 가능" 시간은 `stars` 비트 길이와 같고, 2.5초 예산은 순수 테스트로 고정할 수 있다(⭐3 = 2200). 판정 탭 자체의 400ms 잠금(useInputLock.ts:15)은 비트가 끝나기 훨씬 전에 풀린다. 게임 종료는 판정이 아니라 다음 탭(`advanceTurn` → `gameEnded`)에서 일어나므로 성공 전환에 `win` 비트가 섞이는 경우는 없다. [VERIFIED: src/engine/game.ts, src/game/GameStage.tsx 읽음]

가장 위험한 항목이었던 **3D 앵커 → DOM 좌표 정합**은 브리지 없이 풀린다. 카메라가 고정이고, 그 자세가 순수 함수 `fitCamera(aspect, boardExtents(ringLayout(L)))`로만 정해지기 때문이다(CameraRig.tsx:18-31). 캐릭터 위치도 순수 함수 `standPoints` + `pawnSlots`로 정해진다(SceneContents.tsx:37-46, Character.tsx:140-145). 그러면 메인 청크에서 three 없이 머리 위 월드 좌표 → NDC → `.stage-canvas` 사각형 → 화면 좌표를 계산할 수 있다. three 없는 lookAt/원근 투영 수식을 `Vector3.project(PerspectiveCamera)`와 16/20/24칸 × 4개 화면 비율에서 비교했더니 **최대 오차 6.7e-16**이었다. DPR은 CSS 픽셀 공간과 무관하다. 시작점과 끝점을 모두 `getBoundingClientRect`(같은 좌표계)로 재므로 safe-area, 회전, iOS 주소창 변화도 비행을 시작하는 순간에만 맞으면 된다. [VERIFIED: 로컬 vitest 임시 테스트, 실행 후 삭제]

시상식은 **GameStage 안의 모드**로 만들어야 한다(D-11 "같은 lazy 3D 캔버스"). 그러면 다시 하기를 5번 해도 WebGL 컨텍스트가 하나로 유지된다. 대신 새 규칙이 하나 생긴다. **살아 있는 캔버스 안에서는 씬 노드를 리마운트하지 않는다.** three r186에서 InstancedMesh의 GPU 버퍼는 `dispose` 이벤트로만 풀린다(WebGLObjects.js:70-82). 그런데 이 프로젝트는 모든 InstancedMesh에 `dispose={null}`을 쓴다. drei `ContactShadows`는 `useMemo`에서 WebGLRenderTarget 2개를 만들고 dispose하지 않는다(ContactShadows.js:29-31). 그래서 판마다 리마운트하면 판마다 누수가 생긴다. 보드·주사위·그림자는 `visible`로 숨기고, 연출 풀은 처음부터 항상 마운트해 둔다. 지금 드로우콜은 8마리 + 왕관 8 + 링 기준 **93**으로 실측했다. 풀 4개를 항상 마운트해도 97로, 기존 ≤ 100 테스트를 통과한다. [VERIFIED: node_modules 소스, 로컬 vitest 측정]

**Primary recommendation:** 순수 단일 시간표 `successPlan(stars, ms, reduced)`를 먼저 만든다. 이를 Character 점프, FX 풀, DOM 별 비행, Banner 지연, 효과음 일정이 모두 읽게 한다. 시상식은 GameStage 안의 캔버스 모드로 넣고 "리마운트 금지"를 지킨다. 5판 점검은 jsdom 테스트(캔버스 마운트 1회, 타이머·구독 수 고정)와 dev 전용 `soak.html`(헤드리스 Chrome 실측) 두 겹으로 한다.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 게임 통계 누적(attempts…luckyCount) | 순수 엔진 `src/engine/game.ts` + `state.ts` | — | D-15. undo 스냅샷(`snapshotOf`, game.ts:249-252)에 자동 포함 |
| 칭찬 배지 배정 | 순수 `src/game/awards.ts`(React·three 없음) | `labels.ts`(문구) | 결정적·퍼즈 테스트 대상 |
| 등급별 비트 길이·miss 재도전 여부 | 순수 `director/timeline.ts` | — | clock-free 계약(timeline.ts:2-5) 유지 |
| 성공 비트 내부 시간표 | 순수 `director/successPlan.ts` | — | 모든 소비자가 같은 ms를 읽게 하는 단일 출처 |
| 비트 완료(타이머) | DOM `Banner`(메인 청크) | 스토어 watchdog | 기존 D-22 유지 — stars도 Banner가 ms에 완료 |
| 탭 건너뛰기·건너뛴 뒤 입력 잠금 | DOM 훅(`useSkipOnTap`) + `useInputLock` 공유 잠금 | — | 3D는 포인터를 받지 않음(GameCanvas.tsx:36) |
| 머리 위 → 화면 좌표 | 순수 `layout/project.ts`, `layout/headAnchor.ts` | DOM `StarFlight` | three 없이 메인 청크에서 계산(소스 가드 (d)) |
| 별 비행 DOM 요소 | DOM `StarFlight`(portal → body) | `Scoreboard`(`data-pid`) | `.stage-canvas-cell { overflow: hidden }`(game.css:870-875) 밖으로 나가야 함 |
| 컨페티·버스트·링·퍼프 | lazy 3D 청크 `scene/FxPools.tsx` | 순수 `layout/fxMotion.ts`(입자 수식) | 풀 재사용, 프레임 루프 할당 없음 |
| 카메라 흔들림 | lazy 3D `scene/CameraRig.tsx` | 순수 `layout/fxMotion.ts`(흔들림 곡선) | fit 기준 위치를 소유한 곳에서 더해야 리핏과 충돌 없음 |
| 시상식 모드 전환 | `GameStage`(라우팅) | `GameApp`(라우팅 축소) | 캔버스 노드 유지 = 컨텍스트 1개 |
| 시상대 배치 | 순수 `layout/podiumLayout.ts` | lazy 3D `scene/Podium.tsx` + `Character` | 결정적·투영 가림 테스트 |
| 효과음 합성·스케줄 | 메인 청크 `src/game/sfx/*` (Web Audio, three 없음) | `useSfx`(usePresentation 구독) | 비트 데이터가 소리의 단일 출처(D-19) |
| soundOn 저장 | `src/settings.ts` | `ControlsBar`/`SettingsTab` | 설정 키에 저장, 백업 미포함 |
| 5판 누수 점검 | vitest(jsdom) | dev 전용 `soak.html` + 헤드리스 Chrome | 자동 2겹, 실기기는 UAT |

## Standard Stack

### Core (모두 설치되어 있음 — 새 패키지 없음)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | 0.186.1 | InstancedMesh 풀, RingGeometry, MeshBasicMaterial | 이미 사용 중(package.json). `setColorAt`/`instanceColor` 패턴은 Board 칸에 이미 있음 |
| @react-three/fiber | 9.8.2 | `useFrame` + `getState()` 비트 소비 | Phase 6 Pattern 4 그대로 |
| @react-three/drei | 10.7.9 | 새로 쓰는 것 없음 | `Html`·`Text` 등은 소스 가드 (a)가 금지 |
| zustand | 5.0.14 | `usePresentation`·`useSettings` 구독 | 이미 사용 중 |
| zod | 4.4.3 | `soundOn: z.boolean().catch(true)` | 필드별 복구 패턴(settings.ts:23-28) |
| Web Audio API | 브라우저 내장 | 합성 효과음 | D-17. 파일·의존성 없음 |

### Supporting (dev 도구, 저장소에 설치하지 않음)
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Playwright (npx 캐시) | 1.64.0 (`~/.npm/_npx/e41f203b7505f1fb`) | `soak.html`을 헤드리스로 돌려 수치 기록 | 실행 단계 검증. `chromium.launch({ channel: 'chrome' })`로 시스템 Chrome 155 사용 |
| @react-three/test-renderer | 9.1.1 (devDep) | 풀·흔들림·시상식 씬 테스트(node 환경) | 기존 actors.test 패턴 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Web Audio 합성 | howler + Kenney CC0 파일 | D-17이 잠금. `sfx.play(name)` 인터페이스 뒤에서 나중에 바꿀 수 있음 |
| DOM 별 비행 | 3D 별 + drei `Html` | D-05 잠금. `Html`은 소스 가드 (a)가 금지 |
| 순수 투영(카메라 재계산) | 3D 청크가 매 프레임 머리 좌표를 store에 쓰는 브리지 | 브리지는 프레임마다 store를 써야 하고(Character 규칙 위반: "no store write per frame", Character.tsx:22) 테스트하기 어렵다. 순수 계산은 three와 7e-16 오차로 일치 |
| GameStage 안 시상식 모드 | 별도 Canvas를 가진 ResultView | 판마다 컨텍스트 2개를 만들고 버림. D-11 잠금("같은 lazy 3D 캔버스") |
| CSS 애니메이션(별 비행) | Web Animations API(`el.animate`) | jsdom에 `animate`가 없다(확인함) → 테스트 불가. CSS 변수 + keyframes는 jsdom에서 스타일 단언 가능 |

**Installation:** 없음. `npm install` 단계 없음.

**Version verification:** 위 런타임 패키지는 모두 저장소 package.json에 정확 버전으로 고정되어 있다. 이번 단계에서 버전 변경 없음. [VERIFIED: package.json]

## Package Legitimacy Audit

이번 단계는 **외부 패키지를 설치하지 않는다**(D-17: 새 의존성 없음).

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| playwright (dev 도구, 저장소 미설치) | npm | 2015~ (최신 릴리스 2026-10-14) | 약 6,984만/주 | github.com/microsoft/playwright | [SUS: too-new — 최신 버전 게시 9일 경과 때문] | 승인(조건부): 저장소에 추가하지 않고 이미 캐시된 1.64.0만 `npx`로 사용. `postinstall` 없음 |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** playwright — "too-new"는 최신 태그 기준 신호다. 이번에 쓰는 것은 로컬 캐시에 이미 있는 1.64.0이고, 저장소 의존성으로 설치하지 않는다. 플래너가 이 도구로 새 버전을 받는 단계를 넣는다면 `checkpoint:human-verify`를 둔다.

## Architecture Patterns

### System Architecture Diagram

```
 강사 탭 ✅ (MissionOverlay, guard)
      │
      ▼
 useGameStore.judge ──► engine.judge(state) ──► state.stats 갱신 + log.events=[judged]
      │  (zustand set, 동기 구독)
      ▼
 useDirector.directGame ──► buildTimeline ──► [{kind:'stars', stars:N, ms: STARS_MS[N] | 1200}]
      │
      ▼
 usePresentation.play ──► current = stars 비트 (watchdog ms+500)
      │
      ├──► Banner (DOM)            : bannerMs에 "퀘스트 성공! ⭐+N" 등장 → ms에 completeBeat(id)
      ├──► Character (3D, useFrame): successPlan.landMs까지 점프·회전 → 이후 기쁨 유지 → REST
      ├──► FxPools (3D, useFrame)  : landMs에 링·버스트·컨페티 방출(풀), 비트가 바뀌면 즉시 숨김
      ├──► CameraRig (3D)          : ⭐3이면 landMs부터 ≤350ms 흔들림, 끝나면 fit 위치 복원
      ├──► StarFlight (DOM portal) : headAnchor→project→.stage-canvas rect ⇒ 시작점
      │                              [data-pid] .sb-avatar rect ⇒ 끝점, flyFrom→flyTo CSS 비행
      ├──► useSfx (Web Audio)      : 비트 시작에 징글(landMs)·딩(flyToMs) 예약, 비트가 바뀌면 페이드
      └──► useSkipOnTap (DOM)      : document capture 'click' → lockInputFor(250) → completeBeat(id)
      │
      ▼ completeBeat → applyBeat(displayed.stars += N) → 큐 비면 drained(엔진으로 재동기화)
 Scoreboard 숫자 증가 + sb-body pop(키 = 별 수) ──► ControlsBar "다음 ➡️" 보임 (≤ 2200ms)

 게임 끝: advanceTurn → gameEnded(rounds-complete) → win 비트(1500) → (busy=false)
      ▼
 GameStage ceremony 모드: 같은 Canvas, SceneContents mode='ceremony'
      ├─ 보드·주사위·그림자 visible=false (리마운트 금지), Podium visible
      ├─ Character들이 podiumLayout 좌표로 이동, 우승자=winner 얼굴·환호, 나머지=joy
      ├─ CeremonyView(DOM): 🏆 우승자 · 전원 "이름 ⭐N" · awardBadges · 🔁 다시 하기 / 처음으로
      └─ 3D 없음/꺼짐 → DomPodium(이모지·색 원·단 블록)
 다시 하기 → restart() → 새 board → directGame이 reset → GameStage 그대로(캔버스 유지)
```

### Recommended Project Structure (새 파일·변경 파일)
```
src/engine/
├── state.ts            # + PlayerStats, GameStateCore.stats
├── game.ts             # createGame 초기화, judge/rollDice 갱신
├── stats.ts            # (신규, 순수) emptyStats, bump, isLuckyEvent
└── fuzz.test.ts        # + 통계 불변식
src/game/
├── awards.ts           # (신규, 순수) awardBadges, displayBadges
├── director/
│   ├── timeline.ts     # STARS_MS 표, starsBeatMs, miss.retry
│   └── successPlan.ts  # (신규, 순수) 등급별 시간표·크기
├── layout/
│   ├── project.ts      # (신규, 순수) projectNdc, ndcToClient
│   ├── headAnchor.ts   # (신규, 순수) 머리 위 월드 좌표
│   ├── fxMotion.ts     # (신규, 순수) 입자·링·흔들림 수식
│   ├── podiumLayout.ts # (신규, 순수) 시상대 배치
│   └── charMotion.ts   # successPose 등급화(시간 기반)
├── sfx/
│   ├── recipes.ts      # (신규, 순수 데이터) 음 목록
│   ├── sfx.ts          # (신규) AudioContext·마스터·재생·정리
│   └── useSfx.ts       # (신규) usePresentation 구독자
├── hud/
│   ├── StarFlight.tsx  # (신규) DOM 별 비행 portal
│   ├── CeremonyView.tsx# (신규, ResultView 대체)
│   ├── DomPodium.tsx   # (신규) WebGL 없을 때 시상대
│   ├── SoundToggle.tsx # (신규) 🔊/🔇
│   ├── Banner.tsx      # stars 지연 등장, miss 문구
│   └── Scoreboard.tsx  # li에 data-pid
├── useSkipOnTap.ts     # (신규)
├── useInputLock.ts     # + lockInputFor(ms) 공유 잠금
├── scene/
│   ├── FxPools.tsx     # (신규) InstancedMesh 4개
│   ├── Podium.tsx      # (신규) 시상대 메시 1~2개
│   ├── CameraRig.tsx   # + 흔들림, + ceremony 프레이밍
│   ├── SceneContents.tsx # + mode, 보드 묶음 visible 토글
│   ├── Character.tsx   # 등급별 success, ceremony 서기
│   └── GameCanvas.tsx  # ContactShadows visible 토글, DEV __pjRenderInfo
├── GameStage.tsx       # ceremony 모드
└── GameApp.tsx         # gameOver도 GameStage로
soak.html + src/soak.tsx  # (신규, dev 서버 전용 — gallery.html 방식)
```

### Pattern 1: 등급별 stars 비트 + miss 재도전 플래그 (순수, clock-free)
**What:** `BEAT_MS.stars` 단일 값을 등급 표로 바꾼다. reduced motion에서는 고정 1200ms(배너 + 페이드인만)로 줄인다. miss에는 같은 전환에 `questDrawn attempt 2`가 있는지로 `retry`를 붙인다. 문구가 달라지기 때문이다(D-09).
**When to use:** `judged` 이벤트를 비트로 바꿀 때.
**Example:**
```ts
// src/game/director/timeline.ts — PHASE 6 CONTRACT 유지(React/DOM/settings 없음, clock-free, pure)
export const STARS_MS = { 1: 1600, 2: 1900, 3: 2200 } as const; // D-01
export const STARS_MS_REDUCED = 1200; // D-08: 비행·컨페티 없음, 배너 + 페이드인 (Claude 재량 값)
export type StarTier = 1 | 2 | 3;
export const starTier = (stars: number): StarTier => (stars >= 3 ? 3 : stars <= 1 ? 1 : 2);
export const starsBeatMs = (stars: number, reduced: boolean): number =>
  reduced ? STARS_MS_REDUCED : STARS_MS[starTier(stars)];

// BeatSpec: | { kind: 'miss'; pid: string; retry: boolean; ms: number }
case 'judged':
  if (e.success) out.push({ kind: 'stars', pid: e.pid, stars: e.stars, ms: starsBeatMs(e.stars, ctx.reducedMotion) });
  else out.push({
    kind: 'miss', pid: e.pid, ms: BEAT_MS.miss,
    retry: events.some((x) => x.t === 'questDrawn' && x.pid === e.pid && x.attempt === 2), // game.ts:298-301
  });
  break;
```
`isBannerBeat`에 `miss`를 넣는다(timeline.ts:128-129). `isTimedBeat`는 그대로 둔다. `bannerCopy(miss)`가 soft 톤 문구를 돌려주게 바꾼다(labels.ts:215-249, 새 `BannerTone` `'soft'`).

### Pattern 2: `successPlan` — 성공 비트 하나의 단일 시간표
**What:** 등급·길이·reduced를 받아 모든 소비자가 쓰는 시점과 크기를 돌려주는 순수 함수다. 숫자가 한 곳에만 있으므로 점프 착지, 링 방출, 징글, 배너, 비행, 딩이 어긋나지 않는다.
**Example (권장 값, Claude 재량):**
```ts
// src/game/director/successPlan.ts — 순수, clock-free, three/React 없음
export interface SuccessPlan {
  tier: StarTier; ms: number;
  landMs: number;     // 착지 = 링·버스트·컨페티·징글 시작
  bannerMs: number;   // 배너 등장(30%)
  flyFromMs: number;  // 비행 시작(40%)
  flyToMs: number;    // 도착 = 딩(≈92%); 숫자는 ms(비트 끝)에 오른다
  jumpHeight: number; shakeMs: number; shakeAmp: number;
  confetti: number; burst: number; rings: number; gold: boolean;
}
const SIZE = {
  1: { confetti: 40,  burst: 8,  rings: 1, gold: false, jumpHeight: 0.55, shakeMs: 0,   shakeAmp: 0 },
  2: { confetti: 80,  burst: 12, rings: 2, gold: false, jumpHeight: 0.65, shakeMs: 0,   shakeAmp: 0 },
  3: { confetti: 140, burst: 18, rings: 2, gold: true,  jumpHeight: 0.75, shakeMs: 320, shakeAmp: 0.06 },
} as const;
export function successPlan(stars: number, ms: number, reduced: boolean): SuccessPlan {
  const tier = starTier(stars);
  const s = SIZE[tier];
  if (reduced) return { tier, ms, landMs: 0, bannerMs: 0, flyFromMs: 0, flyToMs: Math.round(ms * 0.5),
    jumpHeight: 0, shakeMs: 0, shakeAmp: 0, confetti: 0, burst: 0, rings: 0, gold: s.gold };
  return { tier, ms, ...s,
    landMs: Math.round(ms * 0.35), bannerMs: Math.round(ms * 0.3),
    flyFromMs: Math.round(ms * 0.4), flyToMs: Math.round(ms * 0.92) };
}
```
⭐1 1600: 착지 560 · 배너 480 · 비행 640→1472 · 끝 1600. ⭐3 2200: 착지 770 · 흔들림 770→1090 · 비행 880→2024 · 끝 2200. 테스트: 모든 등급 × reduced에서 `0 ≤ bannerMs ≤ landMs ≤ flyFromMs < flyToMs ≤ ms`, `shakeMs ≤ 350`, `confetti ≤ CONFETTI_CAP`. (D-03 비율, D-04 표)

**Character:** `successPose(u)`(charMotion.ts:71-91)는 비트 전체 u를 쓴다. 이제 비트가 1.6~2.2s로 늘어나므로 그대로 두면 점프가 느려진다. **점프는 `t / landMs`로 진행**하고(곡선 그대로, 높이는 `jumpHeight`), 착지 후에는 팔을 든 기쁨 유지 자세가 비트 끝에 REST로 돌아오는 곡선을 붙인다(끝점 = REST, Phase 7 Pitfall 8 유지). `reactionFor`(reaction.ts:47-48)의 `Reaction`에 `stars?: number`를 추가해 Character가 `successPlan`을 만들 수 있게 한다.

### Pattern 3: 순수 투영으로 별 비행 시작점 구하기 (브리지 없음)
**What:** 카메라와 캐릭터 위치는 이미 순수 함수로 정해진다. DOM 쪽에서 같은 함수를 다시 불러 머리 위 화면 좌표를 계산한다.
**Example (three와 대조해 오차 6.7e-16 확인한 수식):**
```ts
// src/game/layout/project.ts — 순수, three 없음 (fitCamera.ts와 같은 계약)
export type V3 = readonly [number, number, number];
export interface CamPose { position: V3; target: V3; fovDeg: number; aspect: number }
export function projectNdc(p: V3, cam: CamPose): { x: number; y: number; inFront: boolean } {
  const f = norm(sub(cam.target, cam.position));      // 앞
  const r = norm(cross(f, [0, 1, 0]));                 // 오른쪽 (three lookAt, up = +Y)
  const u = cross(r, f);                               // 위
  const d = sub(p, cam.position);
  const zc = dot(d, f);
  const t = Math.tan((cam.fovDeg * Math.PI) / 360);
  return { x: dot(d, r) / (zc * t * cam.aspect), y: dot(d, u) / (zc * t), inFront: zc > 0 };
}
export const ndcToClient = (n: { x: number; y: number }, rect: { left: number; top: number; width: number; height: number }) =>
  ({ x: rect.left + ((n.x + 1) / 2) * rect.width, y: rect.top + ((1 - n.y) / 2) * rect.height });

// src/game/layout/headAnchor.ts — SceneContents/Character와 같은 입력
export function headAnchor(tiles, order, positions, currentId, pid, lift = STAR_START_LIFT): V3 {
  const pts = standPoints(tiles);                                   // pawnSlots.ts:247
  const slots = pawnSlots(order, positions, currentId, tiles.length); // pawnSlots.ts:209
  const p = pts[positions[pid] ?? 0] ?? pts[0];
  const s = slots[pid] ?? { dx: 0, dz: 0, scale: 1 };
  return [p.x + s.dx, p.y + (HEAD_TOP + lift) * s.scale, p.z + s.dz]; // Character.tsx:140-145 규칙
}
// StarFlight에서: rect = .stage-canvas.getBoundingClientRect();
// fit = fitCamera(rect.width / rect.height, boardExtents(ringLayout(L)))  (CameraRig.tsx:19-20와 동일)
// start = ndcToClient(projectNdc(headAnchor(...), { position: fit.position, target: fit.target, fovDeg: fit.fov, aspect }), rect)
```
**정합에서 지켜야 할 점:**
- 시작 사각형은 `.stage-canvas`(R3F 캔버스가 100%로 채우는 절대 배치 div, game.css:877-882)를 쓴다. R3F `size`도 이 컨테이너를 잰 값이라 aspect가 같다.
- 끝점: `Scoreboard`의 `<li>`에 `data-pid={item.id}`를 추가하고 `[data-pid="…"] .sb-avatar`를 잰다(Scoreboard.tsx:36-46). 셀 안 `sb-body`는 별 수를 key로 리마운트된다(:42). 그래서 **비행 시작 순간에 한 번** 재고, 요소 참조는 들고 있지 않는다.
- DPR(GameCanvas.tsx:55)은 CSS 픽셀 좌표와 무관하다. 둘 다 `getBoundingClientRect`이므로 같은 좌표계(레이아웃 뷰포트 기준)다. 별 요소는 `position: fixed`로 **`document.body`에 portal**한다. 이유는 두 가지다. `.stage-canvas-cell`이 `overflow: hidden`이고(game.css:870-875), `.game-stage.stage > *`가 `position: relative`를 강제한다(game.css:850). 그리고 조상에 transform이 생기면 fixed의 기준이 바뀐다. [CITED: CSSOM View — getBoundingClientRect는 viewport 기준]
- 3D가 없거나(`!ready || failure`) 투영 결과가 화면 밖이거나 `inFront=false`면 캔버스 사각형 중앙에서 출발한다(D-05).
- 테스트: (a) node 환경에서 `projectNdc`와 `Vector3.project(PerspectiveCamera)` 비교(16/20/24 × VIEWS 6개, ≤ 1e-9). (b) test-renderer로 SceneContents를 마운트하고 프레임을 돌린 뒤, `pawn-{pid}` 그룹 월드 위치와 `headAnchor`의 x·z가 일치하는지 본다. (c) jsdom에서 `getBoundingClientRect`를 `vi.spyOn`으로 고정하고 StarFlight의 CSS 변수(`--x0/--y0/--dx/--dy`)를 단언한다.

### Pattern 4: 항상 마운트된 InstancedMesh 연출 풀
**What:** 컨페티·별 버스트·링·퍼프용 InstancedMesh 3~4개를 SceneContents 첫 마운트 때 만든다. 쉴 때는 `count = 0`으로 두고, 비트가 바뀌면 즉시 0으로 되돌린다. Arrows.tsx 패턴(공유 GEO/MAT, `dispose={null}`, `args={[geo, mat, CAP]}`)을 따른다.
**Rules:**
- **용량 고정:** CONFETTI_CAP 160, BURST_CAP 24, RING_CAP 3, PUFF는 BURST 풀 재사용(색만 `setColorAt`로 회색·금색 교체). `args`가 바뀌면 메시가 재생성되므로(Phase 6 Pitfall 8) 용량은 상수다.
- **`frustumCulled={false}`:** InstancedMesh의 boundingSphere는 처음 한 번만 계산되고 matrix를 바꿔도 갱신되지 않는다. 그대로 두면 날아가는 입자가 잘린다. count 0일 때 컬링되면 셰이더가 첫 성공 순간에 컴파일되어 끊긴다. `frustumCulled={false}` + `visible` 유지로 두면 첫 프레임에 프로그램이 컴파일된다(three는 drawCount 검사 전에 `setProgram`을 부른다, WebGLRenderer.js renderBufferDirect). [VERIFIED: node_modules/three/src/renderers/WebGLRenderer.js]
- **instanceColor는 마운트 때 전 인스턴스에 미리 설정**한다. 첫 `setColorAt`가 속성을 만들기 때문에, 게임 중간에 만들면 프로그램 키(`instancingColor`)가 바뀌어 재컴파일된다.
- **재질:** `MeshBasicMaterial`(조명 무관, `flat` 캔버스에서 팔레트 색 그대로). 컨페티는 `side: DoubleSide`, 불투명. 링은 `transparent`, `depthWrite: false`. opacity는 재질 하나를 공유하므로 링끼리 같은 페이드를 쓴다.
- **프레임 루프:** `usePresentation.getState().current`를 읽는다(Character.tsx:104 패턴). 방출 시점은 `successPlan.landMs`다. 입자 위치는 순수 `fxMotion.confetti(i, tSec, seed, tier)`로 계산하고, 모듈 스코프 `Object3D`/`Matrix4` 하나로 `setMatrixAt`한다(프레임당 할당 0). 새 비트 id면 시계를 다시 시작하고, 비트가 끝났거나 바뀌면 `count = 0`.
- **드로우콜:** 지금 8마리 + 왕관 8 + 링 = **93**(실측). 풀 4개를 항상 마운트하면 기존 `countDraws`(Mesh 인스턴스 수, actors.test.tsx:525-534)가 **97**로 ≤ 100을 그대로 통과한다. 새 테스트로 "⭐3 연출 중 보이는 메시 ≤ 104"와 "풀 생성자 호출 0회(5번 성공 반복)"를 단언한다.
- **reduced motion:** 풀은 방출하지 않는다(D-08).
- **출발 보너스/이벤트(D-10):** 같은 풀을 소량(버스트 6~8개)으로 쓴다. 보너스 계열 = 금색 반짝이, 함정 계열 = 회색·연보라 퍼프(천천히 위로 퍼짐). 비트 길이는 그대로다.

### Pattern 5: 탭 건너뛰기 = document capture `click` + 공유 입력 잠금
**What:** 건너뛸 수 있는 비트(`stars`, `win`) 동안 `document`에 **capture 단계** `click` 리스너를 단다. 탭하면 `lockInputFor(250)` 후 `completeBeat(current.id)`를 부른다. 오버레이를 깔지 않으므로 "지금 끝내기"(TurnHud) 같은 버튼을 가리지 않는다.
**Why capture + click:**
- 별 비트를 시작한 ✅ 클릭은 이미 document capture 단계를 지난 뒤에 리스너가 붙는다. 그래서 시작 탭이 곧바로 건너뛰기가 되지 않는다. bubble 단계로 달면 같은 클릭이 document까지 올라오면서 **방금 시작한 비트를 바로 끝낸다**(Pitfall 3).
- `pointerdown`에서 건너뛰면 다시 렌더된 "다음" 버튼이 같은 위치에서 뒤따르는 `click`을 받는다(유령 클릭). `click`에서 건너뛰면 대상이 이미 정해진 뒤라 그렇지 않다. 그래도 빠른 두 번째 탭은 새 버튼에 맞으므로 D-07의 250ms 잠금이 필요하다.
- 탭은 사용자 활성화(activation)라 같은 핸들러에서 `sfx.unlock()`도 할 수 있다(HTML 표준: touch는 `pointerup`/`touchend`가 활성화 이벤트). [CITED: html.spec.whatwg.org/multipage/interaction.html#activation-triggering-input-event]
**Example:**
```ts
// src/game/useInputLock.ts — 기존 지역 잠금 + 모듈 공유 잠금 (같은 시계 performance.now)
let sharedUntil = Number.NEGATIVE_INFINITY;
export const SKIP_LOCK_MS = 250;
export function lockInputFor(ms: number): void { sharedUntil = Math.max(sharedUntil, performance.now() + ms); }
export function resetSharedInputLock(): void { sharedUntil = Number.NEGATIVE_INFINITY; } // 테스트용
// guard 안: if (now < lockedUntil.current || now < sharedUntil) return;

// src/game/useSkipOnTap.ts
export const isSkippable = (b: Beat) => b.kind === 'stars' || b.kind === 'win';
export function useSkipOnTap(): void {
  const beat = usePresentation((s) => (s.current && isSkippable(s.current) ? s.current : null));
  useEffect(() => {
    if (!beat) return;
    const id = beat.id;
    const onClick = () => { lockInputFor(SKIP_LOCK_MS); usePresentation.getState().completeBeat(id); };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [beat]);
}
```
**건너뛰기 후 정리:** `completeBeat`(usePresentation.ts:101-105)는 id 가드가 있다. 큐가 비면 `drained()`가 엔진으로 재동기화해 점수판이 최종값이 된다. Banner 타이머는 `beat`가 바뀌어 cleanup된다(Banner.tsx:21-26). Character는 반응 소스가 바뀌어 SETTLE_RATE로 REST에 돌아온다(Character.tsx:151-160). FxPools·StarFlight·useSfx는 "현재 비트 id ≠ 시작 id"를 보고 즉시 숨기거나 제거하고, 소리는 페이드한다. Vitest 3 fake timer는 `performance.now`와 rAF까지 가짜로 바꾸므로(기본 `toFake` = nextTick 외 전부) 잠금 테스트가 결정적이다. [VERIFIED: node_modules/vitest/dist config.d.ts]

### Pattern 6: GameStage 안 시상식 모드 (같은 캔버스, 리마운트 금지)
**What:** `GameApp`은 `!game → SetupView`, 그 밖에는 언제나 `GameStage`를 렌더한다(GameApp.tsx:28-30의 ResultView 분기 제거). `GameStage`가 `ceremony = phase === 'gameOver' && !busy`를 계산해 다음을 한다.
1. `<CanvasErrorBoundary key={canvasKey}><Suspense><LazyCanvas/>`를 **트리의 같은 위치**에 둔다. 조건부 래퍼를 바꾸면 캔버스가 리마운트된다.
2. `canvasProps.mode = ceremony ? 'ceremony' : 'board'`, `winners`, `stats`를 넘긴다.
3. HUD(TurnHud·ControlsBar·Scoreboard·MissionOverlay) 대신 `CeremonyView`를 렌더한다. 레이아웃 클래스는 바꿔도 된다(캔버스 셀 크기가 바뀌면 CameraRig가 리핏).
4. `!ready || failure`이면 `ContextLostOverlay` 대신 `DomPodium`을 보여 준다(D-11). 다시 그리기 버튼은 작게 남긴다.

**씬 쪽(SceneContents):**
- `mode === 'ceremony'`: Board·Dice·PathPreview를 `<group visible={false}>`로 숨긴다(언마운트 금지). GameCanvas의 `ContactShadows`도 `<group visible={mode==='board'}>`로 감싼다. drei ContactShadows는 `useMemo`에서 WebGLRenderTarget 2개를 만들고 dispose하지 않으므로(ContactShadows.js:29-31), 리마운트하면 판마다 텍스처 2개가 샌다.
- `Podium`(메시 1~2개, 공유 지오메트리)은 항상 마운트하고 시상식 때만 `visible`로 켠다.
- 같은 `Character` 컴포넌트를 재사용한다(pid로 key, 리마운트 없음). 새 prop `stand?: { x; y; z; scale }`가 있으면 칸 + 슬롯 대신 그 자리로 SETTLE_RATE 감쇠 이동한다. 새 prop `celebrate?: 'winner' | 'joy'`는 환호를 반복하게 한다(`cheerPose((t % 1.5) / 1.5)`). 우승자는 `winner` 얼굴 + 왕관, 나머지는 `joy` 얼굴이다. reduced motion이면 REST에 얼굴만 바뀐다.
- `CameraRig`는 `mode`에 따라 시상대 영역 extents로 `fitCamera`를 부른다(순수 함수 재사용).
- 시상식 첫 등장(≤ 2s, D-16): CeremonyView의 지역 상태다(엔진 비트가 아님). 우승자 점프와 FxPools 컨페티는 `ceremonyIntroId`(지역 카운터)로 트리거한다. 탭하면 즉시 끝낸다. 버튼은 처음부터 보이고 눌린다(인트로 탭 캐처가 버튼을 가리지 않게 document capture 방식 재사용).

**다시 하기:** `restart()`(useGameStore.ts:119-127)는 같은 participants로 `createGame`을 부른다. `board`가 바뀌므로 `directGame`이 reset 후 새 로그를 재생한다(useDirector.ts:35-38). GameStage와 캔버스는 그대로라 컨텍스트 1개로 5판을 한다. 캐릭터는 시상대에서 출발 칸으로 약 0.3s 동안 미끄러져 돌아간다(SETTLE_RATE 12).
**처음으로:** `reset()` → `game=null` → SetupView → GameStage 언마운트. R3F 9.8.2는 언마운트 때 `renderer.dispose()` + `forceContextLoss()`를 한다. [VERIFIED: node_modules/@react-three/fiber/dist/events-*.cjs.dev.js:1126-1142]

**시상대 배치(순수 `podiumLayout`):** 우승자 수 1~8은 금색 1단 위에 한 줄(5명 이상이면 두 줄)로 선다. 크기는 Phase 7 D-17 수치(2~4명 0.85~1.0, 5~8명 0.65~0.75)를 쓰고, 1명이면 1.15 정도로 키운다(재량). 나머지는 단 앞 바닥에 한 줄로 서고 같은 크기 규칙을 따른다. 2·3등 단은 없다(D-12). 테스트: 같은 `fitCamera` 투영 원판 겹침 ≤ 30%(slotOcclusion.test.ts 방식), 모든 머리가 NDC 안, 결정적.
**드로우콜(시상식):** 보이는 것은 캐릭터 56 + 왕관(우승자 수) + 단 1~2 + 풀 4 ≤ 70. 숨긴 보드 메시까지 세는 기존 카운터로는 93 + 단 2 + 풀 4 = 99다. 새 테스트는 `traverseVisible`로 센다.

### Pattern 7: 엔진 통계 + 순수 배지
```ts
// src/engine/state.ts
export interface PlayerStats {
  attempts: number; successes: number; failures: number;
  retrySuccesses: number; hardSuccesses: number; luckyCount: number;
}
export interface GameStateCore { /* …기존… */ stats: Readonly<Record<string, PlayerStats>>; }

// src/engine/stats.ts (순수)
export const EMPTY_STATS: PlayerStats = Object.freeze({ attempts: 0, successes: 0, failures: 0, retrySuccesses: 0, hardSuccesses: 0, luckyCount: 0 });
export function bump(stats, pid, d: Partial<PlayerStats>) { const s = stats[pid] ?? EMPTY_STATS; return { ...stats, [pid]: { ...s, ...sumFields(s, d) } }; }
// 행운 이벤트(D-14 🍀 + D-10 반짝이/퍼프 분류의 단일 출처):
export function isLuckyEvent(ev: Pick<Event, 'eff' | 'label'>, suppressed: boolean): boolean {
  if (ev.eff === 'extra' && suppressed) return false;
  if (ev.label === '보너스') return true;
  if (ev.label === '함정') return false;
  return ev.eff !== 'backward';
}
```
**갱신 지점:**
- `createGame`(game.ts:103-139): 모든 participant id를 `EMPTY_STATS`로 초기화한다. `restart`는 createGame을 거치므로 새 판 통계는 0이다.
- `judge`(game.ts:257-314): 세 가지 반환 경로 모두 `attempts + 1`. 성공이면 `successes + 1`, `card.attempt === 2`면 `retrySuccesses + 1`, `card.stars === 3`이면 `hardSuccesses + 1`. 실패 두 경로는 `failures + 1`이다. 반환 객체에 `stats`를 반드시 넣는다(재도전 경로는 `...state`를 펼치므로 빠뜨리기 쉽다).
- `rollDice`(game.ts:143-246): `payBonusIf`에서 `bonusStars > 0`으로 실제 지급될 때마다(game.ts:155-161) `luckyCount + 1`, `isLuckyEvent(ev, extraSuppressed)`이면 `+1`.
- `undoJudgement`: `snapshotOf`가 core 전체를 담으므로 자동으로 되돌아간다(game.ts:249-252, 318-325). 테스트를 추가한다.
- `endGame('manual')`: 걸려 있던 퀘스트는 무효다. 도전 횟수에 넣지 않는다.
- 영속 상태 없음: `useGameStore`는 `persist`가 없는 순수 `create`다(useGameStore.ts:65). 마이그레이션이 필요 없다. 엔진 상태를 손으로 만든 리터럴 테스트도 없다(grep 0건). 모든 테스트가 `makeGame` → `createGame`을 거친다.

**퍼즈 불변식 추가(fuzz.test.ts:52-109 루프 안):**
- 전환마다 모든 통계 필드는 줄지 않는다(퍼즈에는 undo가 없다).
- `attempts === successes + failures`, `retrySuccesses ≤ successes`, `hardSuccesses ≤ successes`.
- 누적 `judged` 이벤트 수(pid별) === `attempts`, 성공 `judged` 수 === `successes`.
- `luckyCount ≥ startBonus 이벤트 수`(pid별).
- 게임 끝 `p.stars === Σ judged.stars + Σ startBonus.stars`(별의 출처는 이 둘뿐).

**배지(순수 `src/game/awards.ts`):**
```ts
export type BadgeId = 'master' | 'persistent' | 'lucky' | 'traveler' | 'challenger' | 'cheer';
const RULES: readonly { id: BadgeId; metric: (s: PlayerStats, p: { travel: number }) => number }[] = [
  { id: 'master', metric: (s) => s.hardSuccesses },   // 🔥 고수왕
  { id: 'persistent', metric: (s) => s.retrySuccesses }, // 💪 끈기왕
  { id: 'lucky', metric: (s) => s.luckyCount },      // 🍀 행운왕
  { id: 'traveler', metric: (_, p) => p.travel },    // 🌏 여행왕
  { id: 'challenger', metric: (s) => s.attempts },   // 🏃 도전왕
]; // 배열 순서 = 대표 배지 우선순위(희귀한 것 먼저, 재량)
export function awardBadges(stats, participants): Record<string, BadgeId[]> {
  const out = Object.fromEntries(participants.map((p) => [p.id, [] as BadgeId[]]));
  for (const r of RULES) {
    const vals = participants.map((p) => r.metric(stats[p.id] ?? EMPTY_STATS, p));
    const max = Math.max(...vals);
    if (!(max > 0)) continue;                       // 0이면 미지급 (A1: 도전왕·여행왕에도 적용)
    participants.forEach((p, i) => { if (vals[i] === max) out[p.id].push(r.id); }); // 동점은 모두
  }
  for (const p of participants) if (out[p.id].length === 0) out[p.id].push('cheer'); // 🎉 응원왕
  return out;
}
export const displayBadges = (all: readonly BadgeId[]) => all.slice(0, 2);
```
테스트: 퍼즈 게임 300판(엔진 실통계)과 무작위 통계 다수에서 참가자 2~8명이면 **모두 ≥ 1개, 표시는 1~2개**, 같은 입력이면 같은 출력, 동점은 모두 받음, `participants` 순서를 바꿔도 결과 집합은 같음.

### Pattern 8: Web Audio 합성 효과음 (`sfx` 단일 인터페이스)
**구성:**
```
voice(Osc/BufferSource → Gain 엔벨로프[→ BiquadFilter]) ─┐
voice …                                                  ├─► master Gain(0.5) ─► DynamicsCompressor(리미터) ─► destination
```
- **생성/unlock:** `sfx.unlock()`은 사용자 제스처 안에서만 부른다. 게임 시작 버튼, 그리고 `GameApp`에 한 번 다는 document capture `pointerup`/`touchend`/`keydown` 리스너가 대상이다. `const Ctor = window.AudioContext ?? window.webkitAudioContext`, `new Ctor({ latencyHint: 'interactive' })`. 상태가 `'running'`이 아니면 `ctx.resume().catch(() => {})`.
- **iOS 복귀:** `visibilitychange`로 다시 보이면 `resume()`을 시도한다. iOS는 `'interrupted'` 상태가 될 수 있고, resume이 실패하거나 소리 없이 `'running'`이 되는 WebKit 버그 보고가 있다. 다음 제스처에서도 `'running'`이 아니면 `suspend()` 후 `resume()`, 그래도 안 되면 `close()` 후 새로 만든다(최대 3회). [CITED: bugs.webkit.org/show_bug.cgi?id=263627, 237878 — MEDIUM]
- **숨김:** 탭이 숨겨지면 GameStage가 `skipAll`을 부른다(GameStage.tsx:113-116). sfx는 모든 voice를 즉시 정지한다.
- **스케줄:** 비트 시작에 `t0 = ctx.currentTime`을 잡고 `successPlan` 시점(징글 = landMs, 딩 = flyToMs), hop 칸마다 `t0 + (k+1)·seg − 0.03`으로 미리 예약한다(샘플 정확). voice는 비트 id 그룹으로 추적한다.
- **건너뛰기·끄기:** `stopGroup(id)`는 그룹의 gain을 `now`에서 `now + 0.06`까지 0으로 램프하고 `stop(now + 0.07)`을 부른다. soundOn을 끄면 master gain을 0으로 램프하고 전부 정지한다.
- **정리(D-23):** 각 voice의 마지막 노드 `onended`에서 그 voice의 모든 노드를 `disconnect()`하고 활성 Set에서 지운다. 노이즈 버퍼(1초, 결정적 LCG)는 컨텍스트마다 한 번만 만들어 재사용한다.
- **음 목록(순수 `recipes.ts`, 재량):** 주사위 = 대역통과(1.8~3kHz) 노이즈 버스트 25ms × 7개를 600ms에 걸쳐 감쇠 · hop = 삼각파 880→1320Hz 60ms, gain 0.12 · 성공⭐1 = C5-E5-G5 아르페지오(삼각파) · ⭐2 = + C6 · ⭐3 = C5-E5-G5-C6-E6 + 고음 반짝이(사각파 소량) · 딩 = 사인 G6 + C7 배음, 지수 감쇠 400ms · miss = 사인 E5→C5 2음 각 120ms, 저역통과 1.2kHz, gain 0.15(부드러운 하강, 버저 아님) · 출발 보너스 = C6·G6 벨 300ms · 이벤트 보너스 = 삼각파 400→900Hz 상승 250ms · 함정 = 사인 520→260Hz "뽀용" + 약한 비브라토 300ms · 팡파르 = G4-C5-E5-G5(유지) 약 1.4s.
- **엔벨로프:** `setValueAtTime(0.0001, t)` → `linearRampToValueAtTime(peak, t + 0.005)` → `exponentialRampToValueAtTime(0.0001, t + dur)`. 클릭 잡음이 없다.
- **리미터:** `DynamicsCompressorNode`(threshold −10dB, knee 0, ratio 12, attack 0.003, release 0.15) — 내장 노드라 "간단 gain" 요구와 맞는다.
- **구독자 `useSfx`:** `GameApp`에서 마운트한다(`useDirector` 옆). `usePresentation.subscribe((s, p) => s.current?.id !== p.current?.id && …)`로 **전이에서만** 재생한다. 모듈 스코프 `lastPlayedId`로 중복을 막아 StrictMode 이중 effect에도 두 번 울리지 않는다. 시상식 팡파르는 CeremonyView 인트로가 `sfx.play('fanfare', { group: introKey })`로 부르고, 게임 객체 기준으로 한 번만 울린다.
- **jsdom:** AudioContext가 없다(확인함). `sfx`는 생성자가 없으면 no-op이다. 테스트는 `vi.stubGlobal('AudioContext', FakeAudioContext)`로 만든 노드·`connect`·`disconnect`·`start`·`stop`·`onended`를 기록한다. 단언: 비트 하나 → 예상 voice 수, `onended` 후 활성 노드 0, `stopGroup` 후 남은 예약 없음, soundOn=false면 노드 생성 0.
- **iOS 무음 스위치:** 기본 오디오 세션(`auto`)에서는 무음 스위치를 켜면 Web Audio가 들리지 않는다. `navigator.audioSession.type = 'playback'`을 쓰면 들리지만, 다른 앱의 재생(강사가 튼 음악)을 멈춘다. [CITED: developer.mozilla.org/docs/Web/API/AudioSession/type, bugs.webkit.org/show_bug.cgi?id=251532] → Open Question 1.

### Pattern 9: 5판 연속 점검 (STAB-01)
**① jsdom 통합(`src/game/soak.test.tsx`):** `App` + fake canvas(`vi.mock('./scene/GameCanvas', () => import('../test/fakeGameCanvas'))`), fake timers, 2명 × 1~2라운드. 버튼을 눌러 시상식까지 가고 "🔁 다시 하기"를 누른다. 이것을 5번 반복한다(App.test.tsx:73-110 루프 방식).
판마다 시상식에서 기록하고 1판과 5판이 같아야 하는 값:
- `vi.getTimerCount()`
- `usePresentation` queue 길이 0 · current null
- `usePresentation.subscribe`·`useGameStore.subscribe`·`useSettings.subscribe` 활성 구독 수(subscribe를 감싸 증감 계수)
- `document`/`window` `addEventListener` − `removeEventListener` 차이(spy)
- `document.body.childElementCount`(portal 잔여물 없음)
- `.fx-star` 요소 0
- FakeAudioContext 활성 노드 0
- **`fakeCanvas.mounts === 1`**(5판 내내 캔버스 1개 = 컨텍스트 1개)
마지막에 "처음으로" 경로도 한 번 지나 언마운트 후 구독·리스너가 0으로 돌아오는지 본다.

**② 엔진만(빠름):** `fuzz.test.ts`처럼 `createGame` → 끝까지 → `restart`와 같은 입력으로 5판을 돌린다. `directGame`으로 큐를 먹이고 `skipAll`로 비운다. 큐·watchdog 타이머 0을 확인한다.

**③ 실제 브라우저(dev 전용 `soak.html` + `src/soak.tsx`):** gallery.html 방식이다(Phase 7 Pitfall 11: `vite build`는 index.html만 묶는다, vite.config.ts에 input 없음).
- `src/soak.tsx`는 실제 `App`을 마운트하고 자동 플레이어를 붙인다. 자동 플레이어는 `usePresentation`이 `!busy && consumedLog === game.log`가 될 때 `useGameStore` 동작(roll/judge(무작위)/next)을 부르고, 시상식에서는 `restart()`를 부른다. 판마다 `window.__pjRenderInfo?.()`와 `performance.memory?.usedJSHeapSize`를 기록해 화면 표와 `window.__soakResult`에 쓴다. 쿼리 `?games=5&players=8&rounds=2`.
- `GameCanvas.handleCreated`의 DEV 블록(GameCanvas.tsx:62-64, 지금 `__loseContext` 자리)에 `window.__pjRenderInfo = () => ({ geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, programs: gl.info.programs?.length ?? 0, calls: gl.info.render.calls })`를 추가한다. `render.calls`는 프레임마다 초기화되므로 직전 프레임 값이다.
- 소스 가드 (g)를 확장한다. `src/soak.tsx`는 아무도 import하지 않고, `main.tsx`/`App.tsx`는 soak를 언급하지 않는다. soak.tsx는 three를 import하지 않는다(가드 (d)).
- 실행: `npx vite --port 5199 &` 후 Playwright 1.64(npx 캐시) `chromium.launch({ channel: 'chrome', headless: true, args: ['--js-flags=--expose-gc'] })`로 `http://localhost:5199/monster-jump-rope-game/soak.html?games=5`를 연다. 판 사이에 `window.gc()`를 부른다.
- 통과 기준: 2~5판의 geometries·textures·programs가 1판과 같고, heap 증가가 1판 대비 작은 여유(예: +10%) 안이며, 드로우콜이 평상시 ≤ 100이다. 이 수치를 VERIFICATION에 기록한다.
- 이 페이지는 실기기 UAT(STAB-03) 보조로도 쓴다. `npm run dev -- --host`로 띄우고 iPad에서 `soak.html`을 열면 같은 표를 볼 수 있다.

### Anti-Patterns to Avoid
- **성공마다 `new InstancedMesh`/`new Geometry`/JSX `<ringGeometry/>`:** 판마다 GPU 누수가 생긴다(`dispose={null}` 규칙과 충돌). 풀은 한 번만 만든다.
- **조건부 `{mode==='board' && <Board/>}`·`{show && <ContactShadows/>}`:** 리마운트 누수(Pattern 6). `visible`로 토글한다.
- **Character·FX가 프레임마다 store에 좌표를 쓰기:** Character 계약 위반(Character.tsx:22). 투영은 순수 계산으로 한다.
- **ControlsBar 안에만 🔊 토글을 두기:** ControlsBar는 비트 중(`hidden`)과 gameOver에 `null`을 반환한다(ControlsBar.tsx:44). 성공 연출 중 소리를 끌 수 없게 된다. 토글은 항상 렌더되는 자리에 둔다(Open Question 2).
- **효과음을 effect 마운트 때 재생:** StrictMode 이중 마운트로 두 번 울린다. 전이 + id 중복 방지로 재생한다.
- **`BEAT_MS.stars`를 다른 곳에서 계속 참조:** 등급마다 길이가 다르므로 `starsBeatMs`/`STARS_MS`로 바꾼다(CharacterGallery.tsx:79, stage.test.tsx:178).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 3D → 화면 좌표 | 3D 청크 → store 좌표 브리지, drei `Html` | 순수 `projectNdc` + `fitCamera` 재사용 | 카메라가 고정·순수라 같은 함수를 다시 부르면 끝난다. three와 7e-16 일치 |
| 비트 타이밍 | 소비자마다 따로 둔 비율 상수 | `successPlan` 하나 | 착지·징글·링·배너가 어긋나는 것을 구조적으로 막는다 |
| 오디오 리미터 | 직접 만든 소프트 클리퍼(WaveShaper) | `DynamicsCompressorNode` | 내장·검증됨 |
| 오디오 시계 | `setTimeout`으로 음 재생 | `ctx.currentTime` 기준 `start(t)` 예약 | 탭 지연·타이머 지터 없이 샘플 정확 |
| 입자 물리 | 물리 엔진 | 닫힌 형태 탄도식 `p0 + v·t + ½g·t²` | 소스 가드 (e)가 물리 패키지를 금지. 결정적이라 테스트 가능 |
| 메모리 측정 | 직접 만든 GL 객체 계수 | `renderer.info.memory`·`info.programs`·`performance.memory` | three 내장 지표 |
| 시상대 가림 검사 | 눈대중 | slotOcclusion.test.ts 방식의 투영 원판 겹침 | Phase 7에서 검증한 방법 |
| 배지 동점 처리 | 정렬 후 1등만 | max 비교 후 같은 값 모두 | D-14 "동점이면 모두" |

**Key insight:** 이 레포는 "순수 계산 → 소비자는 결과만 그린다"는 구조를 지켜 왔다. Phase 8의 어려운 문제(좌표 정합, 타이밍 일치, 배지)도 모두 순수 함수 하나로 고정할 수 있다. 3D·DOM·오디오는 같은 데이터를 읽기만 한다.

## Common Pitfalls

### Pitfall 1: 기존 테스트가 stars 길이·miss 형태·결과 화면에 묶여 있다
**What goes wrong:** 등급별 길이, miss 배너, ResultView 교체 때문에 초록이던 테스트가 깨진다. CI가 `tsc -b && vite build`를 돌리므로 타입 오류 하나로 배포가 막힌다.
**Affected (확인함):**
- `src/game/director/timeline.test.ts:160-161`(`BEAT_MS.stars`, `toBe(900)`), `:167`·`:171`·`:219-221`(miss 객체에 `retry` 추가), `:224-231`(D-15 상한 단언 → STARS_MS 표 단언으로 교체)
- `src/game/stage.test.tsx:168-187`(`BEAT_MS.stars - 1` → `STARS_MS[3] - 1`, `getByText('🎉 성공!')` → `'퀘스트 성공!'`), `:189-204`(`.beat-banner`가 null이라는 miss 단언 → soft 배너 단언), `:207-231`(1500ms 뒤 '게임 끝!' → 시상식 DOM)
- `src/game/hud/hud6.test.tsx:143-153`("miss beat: no DOM" → 문구 단언)
- `src/game/labels.test.ts:317-321`(`bannerCopy(miss)` null → 문구), `:350`(stars 배너 문구)
- `src/game/director/reaction.test.ts:11,35`(miss 픽스처에 `retry`, Reaction에 `stars`)
- `src/game/scene/actors.test.tsx:117`, `facePrewarm.test.tsx:107`, `starClearance.test.tsx:209,347`(ms 900 리터럴. 데이터라 대부분 통과하지만 Character가 `successPlan`을 쓰면 단언 시점이 바뀔 수 있음)
- `src/game/hud/shell.test.tsx:247-320`(ResultView 전체 — "N등" 행 단언 → CeremonyView), `src/App.test.tsx:73-110`('게임 끝!', '1라운드를 모두 마쳤어요!', `/^🏆 (공동 )?우승! /`)
- `src/settings.test.ts:33-46`(`SettingsSchema.parse({})` 정확 비교에 `soundOn: true` 추가), `pickSettings`
- `src/game/scene/CharacterGallery.tsx:79`(`BEAT_MS.stars` 컴파일 오류)
**How to avoid:** 바뀌는 계약과 그 테스트 수정을 **같은 플랜**에 둔다. 플랜 끝마다 `npx tsc -b && npx vitest run`이 초록이어야 한다. 시상식 문구에서 '게임 끝!'·끝난 이유 문구·'🏆 우승! '/'🏆 공동 우승! ' 접두는 유지하는 편이 수정량이 적다.

### Pitfall 2: 살아 있는 캔버스에서 리마운트하면 판마다 GPU가 샌다
**What goes wrong:** 시상식이 같은 캔버스를 쓰고 다시 하기도 캔버스를 유지하면, 판마다 보드·그림자·풀을 다시 만들 때 해제되지 않는 GPU 자원이 쌓인다.
**Why:** `dispose={null}` InstancedMesh는 `dispose` 이벤트가 없어 `instanceMatrix`/`instanceColor` 버퍼와 VAO 상태가 남는다(three WebGLObjects.js:70-82). drei ContactShadows는 render target 2개를 dispose하지 않는다.
**How to avoid:** 시상식·다시 하기에서 씬 노드를 리마운트하지 않는다(`visible` 토글, Character pid key 유지). SceneContents에 판마다 바뀌는 `key`를 주지 않는다. soak의 `info.memory.textures`·`geometries`·`programs`로 확인한다.
**Warning signs:** soak 표에서 판마다 textures +2(그림자), geometries 증가.

### Pitfall 3: 건너뛰기 리스너가 비트를 시작한 탭을 받는다
**What goes wrong:** ✅ 클릭 → 동기 구독으로 비트 시작 → React가 이산 이벤트의 effect를 동기로 flush → document **bubble** 리스너가 붙는다 → 같은 클릭이 document에 올라와 방금 시작한 성공 연출이 0ms에 끝난다.
**How to avoid:** `addEventListener('click', fn, true)`(capture)를 쓴다. 테스트: `fireEvent.click(✅)` 직후 `current.kind === 'stars'`가 남아 있는지, 다음 클릭에서 끝나는지 본다.

### Pitfall 4: 건너뛰기 탭이 새 "다음" 버튼으로 샌다
**What goes wrong:** 건너뛰기 → 큐 비움 → 같은 렌더에 "다음 ➡️"가 보임 → 아이의 연타 두 번째 탭이 다음 차례로 넘긴다.
**How to avoid:** `lockInputFor(250)`(공유 잠금)를 모든 `guard`가 확인한다(useInputLock.ts:19-29 확장). GameStage의 guard는 컴포넌트별 ref라 그것만으로는 막지 못한다. 테스트: 건너뛴 뒤 249ms에 다음을 클릭하면 seq가 그대로이고, 250ms 뒤에는 진행된다.

### Pitfall 5: 별 비행 레이어가 잘리거나 엉뚱한 곳에서 시작한다
**What goes wrong:** 별 요소를 `.stage-canvas-cell` 안에 넣으면 `overflow: hidden`(game.css:870-875)에 잘려 점수판에 닿지 못한다. 그리드 자식으로 넣으면 `.game-stage.stage > * { position: relative }`(game.css:850)에 묶인다.
**How to avoid:** `createPortal(…, document.body)` + `position: fixed; inset: 0; pointer-events: none; z-index` 최상위. 좌표는 비행을 시작할 때 한 번 잰다. 점수판이 별 순으로 다시 정렬되어 칸이 옮겨질 수 있다(비트 끝, Scoreboard.tsx:32). 도착 후 pop은 새 위치에서 일어나므로 허용한다.

### Pitfall 6: 늘어난 비트에서 점프가 느려진다
**What goes wrong:** `actPose('success', actT / beatSec)`(Character.tsx:169)를 그대로 두면 0.9s용 점프 곡선이 2.2s로 늘어나 둔해진다.
**How to avoid:** 점프는 `successPlan.landMs`를 기준으로 진행하고, 그 뒤는 유지 곡선이 비트 끝에 REST로 돌아오게 한다. 테스트: `pose(landMs) ≈ 착지 자세`, `pose(ms) ≈ REST`(yaw 2π).

### Pitfall 7: 카메라 흔들림이 리핏과 싸우거나 원위치로 돌아오지 않는다
**What goes wrong:** 흔들림을 따로 둔 컴포넌트의 `useFrame`이 `camera.position`에 더하면, 흔들림 중 리사이즈(회전) 때 CameraRig의 `useLayoutEffect`가 덮어쓰고, 흔들림은 엉뚱한 기준으로 복원한다.
**How to avoid:** CameraRig 안에서 `fit`을 ref로 들고 `useFrame`에서 `position = fit.position + offset(t)`로 쓴다. 흔들림이 끝나거나 비트가 바뀌면 정확히 `fit.position`과 `lookAt(target)`으로 복원한다. reduced motion이면 흔들림 없음. 테스트(test-renderer): 흔들림 후 카메라 위치가 fit과 같다(1e-9).

### Pitfall 8: 첫 성공에서 셰이더 컴파일로 끊긴다
**What goes wrong:** 풀이 처음 보이는 순간 새 재질(MeshBasic + instanceColor, 투명 링)을 컴파일한다. iPad에서 수십 ms가 걸려 성공 순간이 끊긴다(Phase 7 UAT 7 "첫 성공 끊김"과 같은 종류).
**How to avoid:** Pattern 4의 `frustumCulled={false}` + 항상 `visible` + 마운트 때 `setColorAt` 전체 설정. 그러면 첫 프레임에 컴파일된다. UAT ④·Phase 7 UAT 7에서 체감을 확인한다.

### Pitfall 9: soundOn이 게임 스냅샷에 들어가거나 "다음 판부터 적용" 안내 아래에 놓인다
**What goes wrong:** `startGame`은 failRule/startBonus/boardSize만 스냅샷한다(useGameStore.ts:76-77). soundOn을 같은 흐름으로 다루면 진행 중 판에서 토글이 듣지 않는다. 설정 탭에는 "지금 하고 있는 게임에는 적용되지 않아요" 배너가 있다(SettingsTab.tsx:62-66).
**How to avoid:** sfx는 `useSettings.getState().soundOn`을 실시간으로 읽고 구독한다. 설정 탭의 소리 스위치에는 "바로 적용돼요" 힌트를 둔다. `partialize`에 `soundOn`을 추가한다(settings.ts:59-64). persist `version`은 올리지 않는다(필드별 `.catch(true)`가 예전 저장분을 복구한다).

### Pitfall 10: iOS에서 소리가 안 나거나 돌아온 뒤 멈춘다
**What goes wrong:** 무음 스위치, `'interrupted'` 상태, 백그라운드 복귀 후 resume 실패.
**How to avoid:** Pattern 8의 unlock·복귀·재생성 순서를 따르고, 모든 `resume()` 실패는 삼킨다(게임은 소리 없이도 계속). UAT ⑦에서 무음 스위치·토글·백그라운드 복귀를 확인한다.

### Pitfall 11: 시상식 진입 때 캔버스 셀 크기가 바뀌어 한 프레임 튄다
**What goes wrong:** 시상식 레이아웃으로 바꾸면 캔버스 셀 크기가 달라져 R3F가 리사이즈하고 CameraRig가 리핏한다. 캐릭터가 시상대로 이동하는 동안 프레이밍이 한 번 바뀐다.
**How to avoid:** 의도된 동작으로 둔다. 시상식 프레이밍은 새 aspect 기준 `fitCamera`라 결과는 늘 맞는다. 바뀌는 순간을 인트로 시작과 맞춰 눈에 띄지 않게 한다. 별도 Canvas를 만들지 않는다.

### Pitfall 12: 헤드리스 Chrome에서 WebGL·heap
**What goes wrong:** npx 캐시 Playwright 1.64는 chromium 1248을 찾지만 캐시에는 1228만 있다(Phase 7 Pitfall 12).
**How to avoid:** `channel: 'chrome'`(시스템 Chrome 155)을 쓴다. 이번 세션 확인 결과 플래그 없이 `ANGLE Metal Renderer: Apple M1`, `performance.memory` 사용 가능했다. 대안은 `--use-angle=swiftshader --enable-unsafe-swiftshader`(SwiftShader). heap 비교에는 `--js-flags=--expose-gc`가 필요하다. [VERIFIED: 로컬 실행]

## Code Examples

### 2.5초 예산 순수 테스트 (D-02)
```ts
// src/game/director/budget.test.ts
import { judge, rollDice } from '../../engine/game';
import { boardWith, dice, makeGame, questTile } from '../../engine/testkit';
import { buildTimeline, budgetMs, STARS_MS } from './timeline';
import { timelineCtx } from './useDirector';
import { SKIP_LOCK_MS } from '../useInputLock';

const DIFF = { 1: 'easy', 2: 'normal', 3: 'hard' } as const;
describe('FX-03 / D-02: 성공 판정 → 다음 진행 ≤ 2500 ms', () => {
  it.each([1, 2, 3].flatMap((s) => [[s, false], [s, true]] as const))('⭐%i reduced=%s', (stars, reduced) => {
    for (const attempt of [1, 2]) {
      let g = rollDice(makeGame({ board: boardWith(20, { 3: questTile(DIFF[stars]) }) }), dice(3));
      if (attempt === 2) g = judge(g, false, dice(1)); // retrySame → attempt 2
      const done = judge(g, true, dice(1));
      const beats = buildTimeline(done.log.events, { ...timelineCtx(done), reducedMotion: reduced });
      expect(beats.map((b) => b.kind)).toEqual(['stars']); // 이 전환엔 다른 비트가 없다
      // 판정 탭의 400 ms 잠금(INPUT_LOCK_MS)은 비트 안에서 이미 풀린다.
      // 건너뛰기 잠금은 건너뛸 때만 생기며, 그때 총 시간은 (탭 시점 + 250) < 비트 길이다.
      expect(budgetMs(beats)).toBeLessThanOrEqual(2500);
    }
    expect(Math.max(...Object.values(STARS_MS))).toBe(2200); // ⭐3 = 2200, 여유 300
    expect(SKIP_LOCK_MS).toBeLessThanOrEqual(2500 - 2200);
  });
});
```
통합 버전: stage.test.tsx:168-187 패턴으로 ✅ 클릭 → `advanceTimersByTime(STARS_MS[3])` → "다음 ➡️" 보임을 확인한다. ✅ 클릭 → 다음 클릭 → `advanceTimersByTime(SKIP_LOCK_MS)` → 다음 클릭 → seq + 1을 확인한다.

### 건너뛰기 통합 테스트 골격
```ts
it('탭으로 건너뛰면 별은 최종값, 250ms 동안 다음이 막힌다', async () => {
  await mountApp(atJudgement()); vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: '✅ 성공' }));
  expect(P().current?.kind).toBe('stars');            // 시작 탭은 건너뛰지 않는다 (Pitfall 3)
  fireEvent.click(document.body);                      // 아무 곳이나 탭
  expect(P().busy).toBe(false);
  expect(within(screen.getByRole('list', { name: '별 순위' })).getByText('⭐3')).toBeInTheDocument();
  const seq = engine().log.seq;
  fireEvent.click(screen.getByRole('button', { name: '다음 ➡️' }));
  expect(engine().log.seq).toBe(seq);                  // 잠금 (Pitfall 4)
  act(() => { vi.advanceTimersByTime(SKIP_LOCK_MS); });
  fireEvent.click(screen.getByRole('button', { name: '다음 ➡️' }));
  expect(engine().log.seq).toBe(seq + 1);
  expect(document.querySelectorAll('.fx-star')).toHaveLength(0);
});
```

### settings.soundOn
```ts
export const SettingsSchema = z.object({
  failRule: FailRule.catch('retrySame'),
  defaultRounds: z.number().int().min(ROUNDS_MIN).max(ROUNDS_MAX).catch(DEFAULT_ROUNDS),
  startBonus: z.union([z.literal(0), z.literal(1), z.literal(2)]).catch(1),
  boardSize: z.union([z.literal(16), z.literal(20), z.literal(24)]).catch(20),
  soundOn: z.boolean().catch(true), // D-20: 없거나 손상되면 켜짐
});
// partialize에 soundOn, setSoundOn: (v) => set({ soundOn: v }). version 1 유지.
// 테스트: 예전 저장분 {state:{failRule:'noStar',...}} (soundOn 없음) → soundOn true, 나머지 유지
//        soundOn: 'yes' → true, false → false, 백업 export에 soundOn 없음 (io.ts는 설정을 모름 — dataPreservation 유지)
```

### FakeAudioContext (jsdom)
```ts
class FakeNode { connected = new Set<FakeNode>(); connect(n: FakeNode) { this.connected.add(n); return n; } disconnect() { this.connected.clear(); live.delete(this); } }
class FakeParam { setValueAtTime() { return this; } linearRampToValueAtTime() { return this; } exponentialRampToValueAtTime() { return this; } cancelScheduledValues() { return this; } value = 1; }
const live = new Set<FakeNode>();
class FakeSource extends FakeNode { frequency = new FakeParam(); onended: (() => void) | null = null; start() {} stop() { this.onended?.(); } }
class FakeAudioContext { state = 'running'; currentTime = 0; destination = new FakeNode();
  createOscillator() { const n = new FakeSource(); live.add(n); return n; }
  createGain() { const n = Object.assign(new FakeNode(), { gain: new FakeParam() }); live.add(n); return n; }
  /* createBiquadFilter, createBufferSource, createBuffer, createDynamicsCompressor … */
  resume() { this.state = 'running'; return Promise.resolve(); } close() { return Promise.resolve(); } }
vi.stubGlobal('AudioContext', FakeAudioContext);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `webkitAudioContext` 접두사 | 접두사 없는 `AudioContext` | Safari 14.1 무렵 [ASSUMED] | 대체 경로 한 줄은 비용이 없으니 남긴다 |
| 무음 스위치를 우회하려고 `<audio>` 무음 루프를 재생하는 해킹 | `navigator.audioSession.type`(WebKit 전용, 기능 감지 필요) | Safari 16.4~17 무렵 [ASSUMED 버전] | Open Question 1 |
| 결과 화면용 별도 Canvas | 같은 캔버스에서 모드 전환 | 이번 단계(D-11) | 컨텍스트 1개, 대신 리마운트 금지 규칙 |
| Phase 7 성공 900ms 고정 | 등급 1600/1900/2200 | 이번 단계(D-01) | 소비자 모두 `successPlan` 사용 |

**Deprecated/outdated:**
- `BEAT_MS.stars`: `STARS_MS`/`starsBeatMs`로 대체한다.
- `ResultView`의 "N등" 표시: D-13에 따라 제거하고 CeremonyView로 대체한다.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 🏃 도전왕·🌏 여행왕도 최댓값이 0이면 미지급하고 🎉 응원왕으로 대체한다(D-14 표에는 이 두 배지에 "0이면 미지급"이 없음) | Pattern 7 | 낮음. 바로 끝낸 판에서 전원이 "도전 0회 도전왕"을 받는 어색함만 생긴다 |
| A2 | 🍀 행운 이벤트 분류 = `isLuckyEvent`(label 우선, 없으면 eff: backward 제외, 막힌 한 번 더 제외) | Pattern 7 | 낮음. 배지·반짝이/퍼프 분류만 바뀐다 |
| A3 | reduced motion에서 stars 비트 1200ms 고정 | Pattern 1 | 낮음. ≤ 2500 안이다 |
| A4 | `successPlan` 비율(착지 35%, 배너 30%, 비행 40→92%)과 크기 값 | Pattern 2 | 낮음. 재량 항목이고 UAT ④에서 체감 확인 |
| A5 | iOS Web Audio는 기본 세션에서 무음 스위치에 따라 무음이다 | Pattern 8 | 중간. 교실에서 "소리가 안 난다"는 문의가 생길 수 있음 → UAT ⑦ |
| A6 | 접두사 없는 AudioContext는 Safari 14.1 이상에서 지원된다 | State of the Art | 낮음. 대체 경로를 둔다 |
| A7 | `position: fixed` 요소와 `getBoundingClientRect`가 iOS Safari 핀치 줌 상태에서도 같은 좌표계다 | Pattern 3 | 낮음. 앱은 확대 없이 쓴다. 문제가 있으면 비행 시작점만 어긋남 |
| A8 | `DynamicsCompressorNode` 설정값이 교실 스피커에서 찌그러짐 없이 들린다 | Pattern 8 | 낮음. UAT에서 음량 확인 |

## Open Questions

1. **iOS 무음 스위치가 켜져 있을 때 소리를 낼 것인가?**
   - What we know: 기본(`auto`)은 무음 스위치를 따른다. `navigator.audioSession.type = 'playback'`이면 소리가 나지만 다른 앱 음악을 멈춘다(MDN: "exclusive").
   - What's unclear: 강사가 수업 중 같은 기기로 음악을 트는지 여부.
   - Recommendation: 기본은 `auto`(무음 스위치 존중)로 두고, 설정 탭 소리 스위치 아래에 "아이폰·아이패드 무음 모드에서는 소리가 나지 않아요" 힌트를 둔다. UAT ⑦에서 사용자에게 확인하고, 원하면 `'playback'` 옵션을 추가한다.
2. **🔊/🔇 토글 위치(D-20 "컨트롤 바").**
   - What we know: `ControlsBar`는 비트 중과 gameOver에 `null`을 반환한다(ControlsBar.tsx:44). `.stage-bottom` 첫 줄은 버튼 한 줄 높이를 예약한다(game.css "stage-bottom").
   - Recommendation: `SoundToggle`을 ControlsBar의 hidden 분기 밖(같은 `.stage-bottom` 영역의 고정 작은 버튼)이나 TurnHud 오른쪽에 두어 연출 중·시상식에서도 보이게 한다. UI-SPEC 단계에서 확정한다.
3. **시상식 레이아웃(세로 폰)에서 캔버스 셀 비율.**
   - Recommendation: UI-SPEC에서 "위 = 3D 시상대 셀, 아래 = 목록·배지·버튼"으로 정한다. `podiumLayout` 투영 테스트에 그 셀 크기들(VIEWS)을 넣는다.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | 빌드·테스트 | ✓ | 22.23.1 | — |
| npm | 스크립트 | ✓ | 10.9.8 | — |
| Vitest + jsdom | 전체 테스트 | ✓ | 3.2.4 / 27.0.0 — 기준선 64파일 1175개 통과, 약 52s | — |
| Google Chrome(시스템) | soak 헤드리스 | ✓ | 155.0.8059.85 | Playwright 캐시 chromium-1228 headless shell + SwiftShader |
| Playwright(npx 캐시) | soak 자동 실행 | ✓ | 1.64.0 (`~/.npm/_npx/e41f203b7505f1fb`) | — |
| 헤드리스 WebGL | soak 렌더 지표 | ✓ | ANGLE Metal(Apple M1), SwiftShader도 동작 | — |
| `performance.memory` | heap 기록 | ✓(Chrome) | — | heap 생략, GPU 지표만 |
| Playwright WebKit | Safari 근사 실행 | ✗ | 캐시 webkit-2311 ≠ 1.64 요구 리비전 | 실기기 UAT(STAB-03) |
| iPhone·iPad 실기기 | STAB-03 | 사람 | — | 대체 없음 → UAT |
| jsdom `AudioContext`·`Element.animate`·`matchMedia` | 테스트 | ✗(셋 다 없음, 확인함) | — | FakeAudioContext 주입, CSS 애니메이션, reducedMotion 모킹 |

**Missing dependencies with no fallback:** 실기기 확인(STAB-03) — 단계 끝 사람 UAT로 처리(D-24).
**Missing dependencies with fallback:** WebKit 헤드리스 → 실기기 UAT. jsdom 오디오·애니메이션 → 가짜 객체·CSS 단언.

## Validation Architecture

> `workflow.nyquist_validation`은 false다. 오케스트레이터가 요구사항별 검증 매핑을 요청했으므로 아래에 둔다.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 (jsdom 27; 씬 테스트는 `// @vitest-environment node` + @react-three/test-renderer 9.1.1) |
| Config file | `vitest.config.ts` (setup `src/test/setup.ts`) |
| Quick run command | `npx vitest run src/game/director src/engine src/game/layout` |
| Full suite command | `npx tsc -b && npx vitest run` (그리고 `npm run build`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FX-01 | 성공 비트 중 풀 방출, 착지 시점, 비트 종료 시 count 0, 생성자 재호출 0 | 씬(node) | `npx vitest run src/game/scene/fx.test.tsx` | ❌ Wave 0 |
| FX-01 | 등급별 successPose 끝점 REST, 착지 시점 | 단위 | `npx vitest run src/game/layout/charMotion.test.ts` | ✅(확장) |
| FX-02 | 투영 = three(≤1e-9), headAnchor = 마운트된 pawn 위치 | 단위/씬 | `npx vitest run src/game/layout/project.test.ts` | ❌ Wave 0 |
| FX-02 | StarFlight 시작/끝 CSS 변수, 3D 없음 → 중앙, 비트 끝 제거, "퀘스트 성공! ⭐+N" | jsdom | `npx vitest run src/game/hud/starFlight.test.tsx` | ❌ Wave 0 |
| FX-03 | 모든 등급 × reduced 합 ≤ 2500, 전환에 stars 1개뿐 | 순수 | `npx vitest run src/game/director/budget.test.ts` | ❌ Wave 0 |
| FX-03 | 탭 건너뛰기: 시작 탭 무시, 별 최종값, 250ms 잠금 | 통합 | `npx vitest run src/game/stage.test.tsx` | ✅(확장) |
| FX-04 | successPlan 등급 단조(컨페티·버스트·링·높이), ⭐3만 흔들림 ≤ 350, 카메라 복원 | 순수/씬 | `npx vitest run src/game/director/successPlan.test.ts src/game/scene/fx.test.tsx` | ❌ Wave 0 |
| FX-04 | 연출 중 보이는 메시 ≤ 104, 평상시 ≤ 100 | 씬 | `npx vitest run src/game/scene/actors.test.tsx` | ✅(확장) |
| FX-05 | miss ≤ 1000ms, retry 문구 두 가지, soft 톤(coral/❌ 없음) | 순수/jsdom | `npx vitest run src/game/labels.test.ts src/game/hud/hud6.test.tsx` | ✅(확장) |
| FX-06 | startBonus/event 비트 길이 불변, 보너스/함정 분류, 소량 버스트 | 순수/씬 | `npx vitest run src/game/director/timeline.test.ts src/game/scene/fx.test.tsx` | ✅/❌ |
| END-01 | 시상식: 우승자(공동 포함) 단 위, 우승자에게만 🏆, 나머지 숫자 없음, 꼴찌 전용 스타일 없음, DOM 대체 | jsdom/순수 | `npx vitest run src/game/hud/ceremony.test.tsx src/game/layout/podiumLayout.test.ts` | ❌ Wave 0 |
| END-01 | 같은 캔버스 유지(fake canvas mounts 1), 시상대 가림 ≤ 30% | 통합/순수 | 위 + `src/game/stage.test.tsx` | ❌/✅ |
| END-02 | 통계 갱신·undo 복원·퍼즈 불변식, awardBadges 모두 ≥ 1·표시 ≤ 2·결정적 | 순수/퍼즈 | `npx vitest run src/engine src/game/awards.test.ts` | ✅(확장)/❌ |
| END-03 | 다시 하기(같은 참가자, 새 보드, 통계 0), 처음으로, 인트로 중에도 동작 | 통합 | `npx vitest run src/game/hud/ceremony.test.tsx src/App.test.tsx` | ❌/✅ |
| AUDIO-01 | 비트별 voice 예약 수·시점, 건너뛰기 페이드, onended 후 노드 0, 팡파르 1회(StrictMode) | jsdom(Fake) | `npx vitest run src/game/sfx` | ❌ Wave 0 |
| AUDIO-01 | LICENSE.md에 project-created CC0 문구 | 소스 | `npx vitest run src/game/sourceGuard.test.ts` | ✅(확장) |
| AUDIO-02 | soundOn 기본 true, .catch 복구, 백업 미포함, 토글이 연출 중에도 보임, off → 노드 0 | 단위/jsdom | `npx vitest run src/settings.test.ts src/dataPreservation.test.ts src/game/hud/hud6.test.tsx` | ✅(확장) |
| STAB-01 | 5판 연속: 타이머·구독·리스너·portal·오디오 노드·캔버스 마운트 고정 | 통합 | `npx vitest run src/game/soak.test.tsx` | ❌ Wave 0 |
| STAB-01 | 실브라우저 5판: geometries/textures/programs 불변, heap 여유 안, draws ≤ 100 | 헤드리스 수동 실행 | `npx vite --port 5199` + Playwright 스크립트(soak.html) | ❌ Wave 0 |
| STAB-03 | iPhone·iPad Safari, 노트북 Chrome 실기기 | UAT(사람) | `08-UAT.md` (Phase 7 UAT 8건과 함께) | ❌ |

### Sampling Rate
- **Per task commit:** 바뀐 영역의 quick run
- **Per wave merge:** `npx tsc -b && npx vitest run`
- **Phase gate:** 전체 초록 + `npm run build` + `dist/`에 soak.html·gallery.html 없음 + soak 헤드리스 수치 기록, 이후 `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/game/director/budget.test.ts`, `successPlan.test.ts` — FX-03/04
- [ ] `src/game/layout/project.test.ts`, `podiumLayout.test.ts`, `fxMotion.test.ts`
- [ ] `src/game/scene/fx.test.tsx` — 풀·흔들림·연출 중 드로우콜
- [ ] `src/game/hud/starFlight.test.tsx`, `ceremony.test.tsx`
- [ ] `src/game/awards.test.ts`, `src/engine/stats.test.ts`
- [ ] `src/game/sfx/sfx.test.ts` + `src/test/fakeAudio.ts`(공유 FakeAudioContext)
- [ ] `src/game/soak.test.tsx` + 구독·리스너 계수 헬퍼
- [ ] `soak.html` + `src/soak.tsx` + 소스 가드 (g) 확장

## Security Domain

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | 계정 없음(Out of Scope) |
| V3 Session Management | no | — |
| V4 Access Control | no | 단일 기기 |
| V5 Input Validation | yes | localStorage 설정은 zod 필드별 `.catch`(soundOn 포함). 참가자 이름은 시상식·배지에서도 **JSX 텍스트로만** 렌더(T-05-15 계열). `innerHTML`·`dangerouslySetInnerHTML` 금지. 별 비행 CSS 변수에는 계산된 숫자만 넣고 사용자 문자열은 넣지 않는다 |
| V6 Cryptography | no | 주사위 난수는 기존 `systemRng`(crypto) 그대로 |
| V14 Configuration | yes | dev 전용 진입점(soak.html)과 `window.__pjRenderInfo`는 `import.meta.env.DEV`·dev 서버 전용으로 둔다. 빌드 산출물 검사와 소스 가드 (g) 확장 |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 이름에 HTML/스크립트 문자열(시상식·배지 표시) | Tampering/XSS | React JSX 텍스트 렌더, 기존 테스트 패턴(T-06-08)을 시상식에 복제 |
| 반복 플레이 자원 누수로 멈춤 | Denial of Service | 풀 재사용, 리마운트 금지, soak 2겹 측정, 노드 disconnect |
| 손상된 localStorage `soundOn` 값 | Tampering | `z.boolean().catch(true)`, merge가 throw하지 않음(settings.ts:66-70) |
| 갑작스런 큰 소리(아동 청력) | — (안전) | 마스터 gain 0.5 + 컴프레서 리미터, 고정 중간 음량, 끄기 토글 |
| dev 훅·soak 페이지 운영 노출 | Information Disclosure | DEV 가드 + 빌드 산출물에 없음 확인 |

## Plan Decomposition (권장, coarse)

| Plan | 내용 | 요구사항 | 의존 |
|------|------|----------|------|
| 08-01 | 엔진 `stats` + `isLuckyEvent` + undo·퍼즈 불변식 + 순수 `awardBadges` | END-02 | — |
| 08-02 | `STARS_MS`·`starsBeatMs`·miss `retry`·`successPlan`·예산 테스트·Banner(지연 등장, 성공/miss 문구, soft 톤)·공유 입력 잠금·`useSkipOnTap` + 깨지는 테스트 일괄 수정 | FX-02(배너), FX-03, FX-05, FX-06(문구) | — |
| 08-03 | 3D: `fxMotion` 순수 수식, `FxPools`, 등급별 `successPose`, CameraRig 흔들림, 드로우콜 테스트 | FX-01, FX-04, FX-06 | 08-02 |
| 08-04 | 순수 `project`/`headAnchor` + `StarFlight` portal + Scoreboard `data-pid`/pop | FX-02 | 08-02 |
| 08-05 | 시상식: GameApp/GameStage 모드, `podiumLayout`, `Podium`, Character `stand`/`celebrate`, ContactShadows 토글, `CeremonyView`·`DomPodium`, 인트로·건너뛰기, ResultView 제거와 테스트 이전 | END-01, END-02(표시), END-03 | 08-01, 08-03 |
| 08-06 | 오디오: `recipes`·`sfx`·`useSfx`·unlock·iOS 복귀, `soundOn` 설정, `SoundToggle`·설정 탭 스위치, LICENSE.md 고지 | AUDIO-01, AUDIO-02 | 08-02 |
| 08-07 | 안정성: jsdom 5판 soak, DEV `__pjRenderInfo`, `soak.html`, 소스 가드 (g) 확장, 헤드리스 실측 기록, `08-UAT.md`(D-24 + Phase 7 UAT 8건) | STAB-01, STAB-03 | 전부 |

Wave 1: 08-01, 08-02 · Wave 2: 08-03, 08-04, 08-06 · Wave 3: 08-05 · Wave 4: 08-07.

## Sources

### Primary (HIGH confidence)
- 레포 소스(직접 읽음): `src/game/director/timeline.ts`, `usePresentation.ts`, `director/useDirector.ts`, `director/displayed.ts`, `director/reaction.ts`, `hud/Banner.tsx`, `hud/Scoreboard.tsx`, `hud/ControlsBar.tsx`, `hud/ResultView.tsx`, `GameApp.tsx`, `GameStage.tsx`, `useInputLock.ts`, `scene/{GameCanvas,SceneContents,CameraRig,Character,Arrows,geometries,ChibiModel}.tsx/ts`, `layout/{charMotion,fitCamera}.ts`, `src/engine/{state,game,scoring,testkit,fuzz.test}.ts`, `src/settings.ts`, `src/harness/useGameStore.ts`, `src/game/sourceGuard.test.ts`, `src/game/styles/game.css`
- 로컬 실측: vitest 기준선(64파일 1175개 통과), 임시 테스트로 8마리 씬 메시 수 93 측정, 순수 투영과 three `Vector3.project` 비교 최대 오차 6.7e-16(임시 파일 2개는 실행 후 삭제, `git status` 깨끗)
- node_modules 소스: three r186 `WebGLObjects.js:70-82`(InstancedMesh dispose 경로), `WebGLRenderer.js` renderBufferDirect(setProgram이 drawCount 검사 전), drei `ContactShadows.js:29-31`(render target, dispose 없음), R3F `events-*.cjs.dev.js:1126-1142`(언마운트 시 dispose + forceContextLoss), vitest `config.d.ts`(fake timers 기본 toFake)
- 로컬 헤드리스 확인: Playwright 1.64 + `channel: 'chrome'` → ANGLE Metal WebGL, `performance.memory`, `AudioContext` 존재. jsdom 27 → `animate`·`AudioContext`·`matchMedia`·`visualViewport` 없음

### Secondary (MEDIUM confidence)
- [HTML Standard — activation triggering input event](https://html.spec.whatwg.org/multipage/interaction.html) — touch는 pointerup/touchend
- [MDN — AudioSession.type](https://developer.mozilla.org/docs/Web/API/AudioSession/type) — playback은 exclusive, 제한적 지원
- [W3C Audio Session](https://www.w3.org/TR/audio-session/)

### Tertiary (LOW confidence — 실기기 UAT로 확인)
- [WebKit Bug 263627 — AudioContext not consistently resumed on foreground](https://bugs.webkit.org/show_bug.cgi?id=263627)
- [WebKit Bug 237878](https://bugs.webkit.org/show_bug.cgi?id=237878), [WebKit Bug 251532](https://bugs.webkit.org/show_bug.cgi?id=251532), [WebKit Bug 264473](https://bugs.webkit.org/show_bug.cgi?id=264473), [WebKit Bug 237322](https://auto-bugs.webkit.org/show_bug.cgi?id=237322)
- [Adactio — webaudio](https://adactio.com/tags/webaudio)(무음 스위치·audioSession 사례)
- [PlayCanvas forum — iOS audio not resuming after standby](https://forum.playcanvas.com/t/ios-audio-not-resuming-after-standby/26408)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 새 의존성 없음, 모두 설치·고정 버전
- Architecture: HIGH — 비트 흐름·예산·투영·드로우콜·누수 경로를 소스와 로컬 실측으로 확인
- Pitfalls: HIGH(레포 내부) / MEDIUM(iOS 오디오, 셰이더 프리웜 체감)
- Audio on iOS: MEDIUM-LOW — 버그 트래커 보고 기반, UAT ⑦ 필요

**Research date:** 2026-10-23
**Valid until:** 2026-11-22 (스택 고정, 30일)
