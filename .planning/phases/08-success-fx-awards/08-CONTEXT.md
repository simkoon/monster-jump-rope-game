# Phase 8: 퀘스트 성공 연출 & 시상식 & 마감 - Context

**Gathered:** 2026-10-23
**Status:** Ready for planning
**Mode:** auto (사용자가 Phase 7과 같이 전 영역 위임 — "ㄱㄱ", `_auto_chain_active: true`). 모든 [auto] 결정은 권장안이며 사람 확인은 단계 끝 UAT로 몰아서 받는다(중간 차단 체크포인트 없음).

<domain>
## Phase Boundary

이번 마일스톤의 마무리 단계. Phase 6~7이 만든 연출 큐(`usePresentation`)·타임라인(`buildTimeline`)·치비 캐릭터 위에 다음을 얹는다:

1. **퀘스트 성공 대형 연출**(FX-01~04): 점프·회전·팔 들기 + 컨페티·별 버스트·바닥 충격파 링 → 큰 별이 캐릭터 위에서 점수판으로 비행 → 점수 오름 + "퀘스트 성공! ⭐+N" 배너. 난이도(⭐1~3)별로 커지고 ⭐3은 화면 흔들림. 판정→다음 진행 가능까지 ≤ 2.5초, 탭으로 건너뛰기(별은 그대로).
2. **실패·출발 보너스·이벤트 짧은 연출**(FX-05, FX-06).
3. **시상식**(END-01~03): 임시 `ResultView`를 시상식 화면으로 교체 — 시상대 + 우승자(공동 포함) + 전원 별 개수 + 전원 칭찬 배지 + 다시 하기/처음으로.
4. **효과음 + 켜고 끄기**(AUDIO-01, AUDIO-02).
5. **안정성 마감**(STAB-01 5판 연속, STAB-03 실기기).

범위 밖: BGM(AUDIO-03, 후속), 새 게임 규칙, 편집기 변경, 캐릭터 외형 변경.

</domain>

<decisions>
## Implementation Decisions

### 성공 연출 구성·길이 (FX-01, FX-02, FX-03, FX-04)
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

### 실패·보너스·이벤트 짧은 연출 (FX-05, FX-06)
- **D-09:** [auto] **실패**: 기존 `miss` 비트(700ms, Phase 7 고개 숙임 + 아쉬움 표정)를 유지하고, 지금은 비어 있는 배너 자리에 **부드러운 응원 문구** 1줄(예: "괜찮아! 다시 해 보자 💪" / 재도전 없는 실패는 "다음엔 꼭! 💪")을 부드러운 하늘·연보라 톤으로 띄운다. **빨간색·X 표시·버저음 금지**. 효과음은 낮고 짧은 2음 "뿅~"(하강하지만 부드러운 음색). 전체 ≤ 1000ms.
- **D-10:** [auto] **출발 보너스**(800ms): 기존 배너 + 캐릭터 발밑 **작은 금색 반짝이 버스트**(성공용 풀 재사용, 소량) + 차임 효과음. **이벤트**(1000ms): 보너스 계열 = 반짝이 + 밝은 효과음, 함정 계열 = 작은 연기 퍼프 + "뽀용" 같은 귀여운 효과음(겁주지 않게). 비트 길이는 늘리지 않는다.

### 시상식 (END-01, END-02, END-03)
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

### 효과음 (AUDIO-01, AUDIO-02)
- **D-17:** [auto] 효과음은 **코드로 합성한 Web Audio 소리**로 만든다(외부 파일·CDN·새 의존성 없음, howler 미사용). 프로젝트가 만든 소리이므로 `public/assets/cc0/LICENSE.md`에 "project-created, CC0 1.0"으로 명시해 "CC0 소리만" 조건을 만족한다. 오프라인 동작(STAB-04) 유지. 이후 Kenney CC0 오디오 파일로 바꿀 수 있게 `sfx` 모듈 인터페이스(`play(name, opts)`)를 하나로 둔다.
- **D-18:** [auto] 소리 목록(최소): 주사위 굴림 달그락 · 칸 이동 톡(칸마다, 작게) · 퀘스트 성공 징글(등급별 길이·음높이 상승, ⭐3 가장 화려) · 별 도착 "딩" · 실패 부드러운 2음 · 출발 보너스 차임 · 이벤트 보너스/함정 · 시상식 팡파르. 버튼 클릭음은 넣지 않는다(소음 최소화).
- **D-19:** [auto] 소리는 **연출 비트 시작에 맞춰** 하나의 구독자(`useSfx`, `usePresentation` 구독)가 재생한다 → 건너뛰기 시 남은 소리는 재생하지 않고 진행 중 소리는 짧게 페이드아웃. 비트 데이터가 소리의 단일 출처.
- **D-20:** [auto] **켜고 끄기**: `soundOn: boolean`(기본 **켜짐**)을 강사 설정 스토어(`src/settings.ts`, 별도 persist 키, **백업에 포함하지 않음** — DATA-07 원칙)에 추가하고, ① 게임 화면 컨트롤 바에 크고 단순한 🔊/🔇 토글 버튼, ② 강사 설정 탭에 같은 스위치. `SettingsSchema` 필드별 `.catch(true)`로 예전 저장분과 호환.
- **D-21:** [auto] `AudioContext`는 첫 사용자 탭(게임 시작 버튼)에서 만들고/resume 한다(iOS 자동재생 정책). 앱이 백그라운드에서 돌아오면 resume 재시도. 음량은 고정 중간값, 아이 교실 환경 고려해 클리핑 없게 마스터 리미터(간단 gain) 하나.

### 안정성 마감 (STAB-01, STAB-03)
- **D-22:** [auto] **5판 연속 자동 점검**: ① jsdom 테스트 — 엔진+디렉터+연출 큐로 5판을 끝까지 돌려 타이머·구독·연출 큐 항목이 판마다 0으로 돌아오는지 확인. ② dev 전용 진입점(예: `?soak=5`, 프로덕션 메인 경로 비노출 — Phase 7 갤러리 방식)에서 실제 브라우저로 5판 자동 플레이 후 `renderer.info.memory`(geometries/textures)·드로우콜·JS heap(가능하면)을 판마다 기록해 **증가 없음**을 확인. Claude가 실행 중 헤드리스 Chrome으로 돌려 수치를 VERIFICATION에 남긴다.
- **D-23:** [auto] 누수 방지 규칙: 연출용 지오메트리·머티리얼은 모듈 싱글턴/풀(재생성 금지), DOM 별·컨페티 요소는 비트 종료 시 반드시 제거, 모든 `setTimeout`/`requestAnimationFrame`/이벤트 리스너는 언마운트 정리, `AudioNode`는 재생 후 disconnect.
- **D-24:** [auto] **실기기 확인(STAB-03)과 연출 체감**은 단계 끝 사람 UAT로 모은다(Phase 7 UAT 8건과 함께 한 번에): ① iPhone Safari ② iPad Safari ③ 노트북 Chrome에서 성공/실패/시상식/효과음/5판 연속 ④ 성공 연출이 신나는가·2.5초 안에 끝나 답답하지 않은가 ⑤ 실패 반응이 다정한가 ⑥ 꼴찌가 민망하지 않은가 ⑦ iOS 무음 스위치·소리 토글 동작.

### Claude's Discretion
- 성공 비트 내부 정확한 타이밍·이징, 컨페티 색·모양·물리 수식, 충격파 링 반경, 카메라 흔들림 수식, 별 비행 곡선(포물선/베지어)
- 합성 효과음의 파형·음높이·엔벨로프
- 시상대 모델 치수, 시상식 카메라 구도, DOM 대체 시상대 레이아웃
- 배지 문구 세부, 대표 배지 우선순위
- soak 진입점 형태, 측정 지표 세부

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 범위·요구사항
- `.planning/ROADMAP.md` §Phase 8 — 목표·성공 기준 5개, "3D 캐릭터 위치 → DOM 점수판 별 비행 좌표 정합" 심층 확인 항목
- `.planning/REQUIREMENTS.md` — FX-01~06, END-01~03, AUDIO-01~02, STAB-01·03 (AUDIO-03 BGM은 후속)
- `.planning/PROJECT.md` — 아동 대상 UI 원칙, IP/CC0 제약, 오프라인

### 이전 단계 결정(연출 큐·캐릭터)
- `.planning/phases/06-board-game-screen/06-CONTEXT.md` — 연출 디렉터·비트·watchdog·점수판 비트 끝 증가(D-01)·입력 잠금·3D 꺼짐 시 진행 유지
- `.planning/phases/06-board-game-screen/06-UI-SPEC.md` — HUD·배너·색 토큰
- `.planning/phases/07-chibi-characters/07-CONTEXT.md` — 표정·동작 비트(stars/miss/win), D-14/D-14a 우승자 규칙, D-17 크기 규칙, D-20 드로우콜 예산, D-21 lazy 청크 원칙
- `.planning/phases/07-chibi-characters/07-UI-SPEC.md` — 캐릭터·표정 시각 계약
- `.planning/phases/07-chibi-characters/07-UAT.md` — 미뤄 둔 사람 확인 8건(Phase 8 UAT와 함께 진행)

### 라이선스
- `public/assets/cc0/LICENSE.md` — CC0 자산 고지(합성 효과음 고지 추가 위치)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/game/director/timeline.ts` — `BEAT_MS`, `BeatSpec`(`stars`/`miss`/`startBonus`/`event`/`win`): 성공 비트 길이 등급화 지점. 순수·clock-free 계약 유지.
- `src/game/usePresentation.ts` — 연출 큐, `completeBeat(id)`(id 가드), watchdog: 건너뛰기·효과음 구독의 기반.
- `src/game/hud/Banner.tsx` + `src/game/labels.ts` `bannerCopy()` — 성공/실패 배너 문구 확장 지점(miss는 현재 문구 없음).
- `src/game/hud/Scoreboard.tsx` — 별 도착 목표 칸(`.sb-avatar`), pop 애니메이션 추가 지점.
- `src/game/hud/ResultView.tsx` — 시상식으로 교체할 임시 결과 화면(`restart()`/`reset()` 연결 재사용).
- `src/game/scene/ChibiModel.tsx`, `Character.tsx`, `chibiFaces.ts` — 시상대 캐릭터·기쁨/우승 표정 재사용.
- `src/game/scene/Arrows.tsx` — `InstancedMesh` + 공유 GEO/MAT + `dispose={null}` 패턴(컨페티 풀에 그대로 적용).
- `src/game/useInputLock.ts` — 건너뛰기 후 탭 새는 것 방지.
- `src/game/reducedMotion.ts` — reduced motion 분기.
- `src/settings.ts` — `soundOn` 추가 지점(필드별 `.catch`, 별도 persist 키).
- `src/engine/state.ts` / `src/engine/game.ts` — `GameStateCore`에 참가자 통계 추가, `judged`/`eventApplied`/`startBonus` 이벤트.
- `src/gallery.tsx` — dev 전용 진입점 선례(soak 진입점 형태 참고).

### Established Patterns
- 엔진 로그 → `buildTimeline` → 비트(ms 데이터) → 3D/DOM이 소비 → `completeBeat` 한 번. 새 연출도 이 경로만 탄다.
- 3D 코드는 lazy 청크에만(메인 청크 three 금지 소스 가드 `sourceGuard.test.ts`).
- 드로우콜 예산 테스트(`actors.test.tsx`), 그림자·후처리 금지.
- 3D 꺼짐/없음에도 게임은 진행(watchdog).

### Integration Points
- `GameApp.tsx` — phase `gameOver`에서 `ResultView` → 시상식 화면 교체.
- `GameCanvas.tsx`/`SceneContents.tsx` — 연출 FX 레이어·시상식 모드·카메라 흔들림.
- `ControlsBar.tsx` — 🔊/🔇 토글.
- `SettingsTab.tsx` — 소리 스위치.

</code_context>

<specifics>
## Specific Ideas

- 성공 배너 문구는 요구사항 그대로 **"퀘스트 성공! ⭐+N"**.
- 실패는 "빨간 X·버저음 없음" — 색·소리 모두 다정하게.
- 칭찬 배지 예시는 요구사항의 도전왕·끈기왕·여행왕을 반드시 포함.
- 사용자 기억: 최종 게임은 견본보다 확실히 더 귀엽게(닌텐도풍 밝음) — 연출도 같은 톤.

</specifics>

<deferred>
## Deferred Ideas

- 배경음악(BGM) — AUDIO-03, 후속 마일스톤
- 줄넘기 줄 소품 / 성공 시 줄넘기 동작 — Phase 7에서 넘어온 후보. 이번 성공 연출은 요구사항의 점프·회전·팔 들기로 한정(형태·드로우콜 부담)
- 차례가 아닌 캐릭터가 남의 성공에 박수 치는 반응 — 시선 집중 원칙 우선, 후속 폴리시(단 시상식에서는 전원 환호)
- Kenney CC0 오디오 파일로 효과음 교체 — `sfx` 인터페이스 뒤에서 언제든 가능
- 3D 캐릭터 얼굴을 점수판 아이콘으로 — Phase 7 deferred 유지

</deferred>

---

*Phase: 08-success-fx-awards*
*Context gathered: 2026-10-23*
