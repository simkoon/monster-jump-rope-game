# Phase 7: 치비 동물 캐릭터 & 표정 - Context

**Gathered:** 2026-10-23
**Status:** Ready for planning
**Mode:** 사용자가 모든 회색 지대를 "다 알아서"로 위임 → 아래 결정은 모두 [auto] 추천안이다. 귀여움 최종 판단(성공 기준 1)만 단계 끝 사람 확인으로 남는다.

<domain>
## Phase Boundary

Phase 6의 **임시 말**(`src/game/scene/Pawn.tsx`: 캡슐 몸 + 둥근 머리)을 **코드로 만든 치비 동물 캐릭터 8종**(bear, rabbit, cat, dog, panda, fox, pig, chick — `src/engine/animals.ts`의 `ANIMALS`)으로 바꾼다. 캐릭터는 상황에 따라 **표정 6가지**(기본 / 두근 / 기쁨 ^^ / 아쉬움 / 놀람 / 우승)와 **동작 5가지**(대기 / 칸 이동 점프 / 성공 점프·회전 / 실패 아쉬움 / 우승 환호)를 보여 준다. **한 칸에 최대 8마리**가 모여도 모두 구분된다(BOARD-05).

요구사항: CHAR-01, CHAR-02, CHAR-03, BOARD-05.

포함하지 않음(다른 단계):
- 퀘스트 성공 대형 연출(컨페티, 별 버스트, 바닥 링, 머리 위 큰 별 → 점수판 비행, "퀘스트 성공! ⭐+N" 배너 확장), 시상식, 효과음, 탭으로 연출 건너뛰기 → Phase 8
- 규칙 엔진(`src/engine/*`), 저장 형식, 편집기, 시작·결과 화면 구성 변경 → 없음(엔진 규칙 변경 금지, Phase 6 D-01 유지)
- 외부 3D 모델·텍스처 파일(.glb/.png) → 금지(CHAR-01)

</domain>

<decisions>
## Implementation Decisions

### 캐릭터 생김새와 색 (CHAR-01)
- **D-01:** [auto] **몸·머리의 주 색 = `ANIMAL_COLOR[animal]`** (`src/game/palette.ts`, 점수판 아바타 원 `--pc`와 같은 값). 참가자 색과 동물이 1:1이므로(엔진이 동물을 겹치지 않게 배정) 보드 캐릭터 ↔ 점수판 대응은 "같은 동물 + 같은 색"으로 유지된다. 색 값을 바꿔야 하면 `palette.ts` 한 곳에서 바꾸고 점수판도 같이 따라가야 한다(단일 출처 유지, palette.test 갱신).
- **D-02:** [auto] **동물 구분은 색이 아니라 실루엣으로** 한다. 종별 필수 특징:
  - bear: 둥근 귀 2개 + 밝은 주둥이(머즐)
  - rabbit: 긴 귀 2개(안쪽 분홍) + 둥근 꼬리
  - cat: 세모 귀 2개 + 가는 꼬리
  - dog: 늘어진 귀 2개 + 코 + 짧은 꼬리
  - panda: 검은 둥근 귀 + 눈 주위 검은 패치(몸 주 색 `--ink`와 대비되는 흰 얼굴판으로 판다로 읽히게 처리)
  - fox: 뾰족 귀 2개 + 흰 주둥이 + 굵은 꼬리(끝 흰색)
  - pig: 납작한 코(콧구멍 2개) + 작은 세모 귀
  - chick: 부리 + 머리 위 깃털 1~3가닥 + 작은 날개, 귀 없음
- **D-03:** [auto] **치비 비율 규칙(귀여움 루브릭)** — 연구·UI-SPEC·실행 모두 이 기준으로 자체 점검한다:
  1. 머리가 몸보다 크다(머리 지름 ≥ 몸 너비의 1.3배, 전체 키의 55~60%가 머리)
  2. 큰 눈을 얼굴 **아래쪽 절반**에 넓게 배치, 눈동자 하이라이트(흰 점) 필수
  3. 볼터치(분홍 원) 필수, 입은 작게
  4. 모서리 없는 둥근 형태(구·캡슐·둥근 원뿔), 짧은 팔다리(뭉툭한 발 2개)
  5. 광택 있는 장난감 재질(Phase 6 판과 같은 조명·`flat` 렌더 유지)
  6. 폰 세로(390×844)에서 캐릭터 한 마리가 칸 안에 서 있을 때 **눈·볼·귀가 식별 가능**해야 한다
- **D-04:** [auto] 비교 기준 "A안 견본"(2026-10-22 비교 데모: Three.js 기본 도형 치비 동물 + 성공 시 ^^ 눈)은 저장소에 없다. 기준선은 **"기본 도형만 쌓은 단순 치비"**로 보고, D-03 루브릭 + 표정 변화 + 동작으로 그보다 확실히 귀엽게 만든다.
- **D-05:** [auto] 점수판·시작 화면 아이콘은 **지금처럼 동물 이모지 + `ANIMAL_COLOR` 원**을 유지한다(같은 동물·같은 색으로 대응). 3D 캐릭터 얼굴을 DOM 아이콘으로 렌더하는 것은 하지 않는다(Deferred).
- **D-06:** [auto] 줄넘기 줄 같은 소품은 이번 단계에서 **넣지 않는다**(형태·드로우콜 부담; Phase 8 성공 연출 아이디어로 Deferred). 지금 차례 링·바닥 블롭 그림자·1등 왕관(Phase 6)은 캐릭터에 맞게 위치만 조정해 유지한다.

### 표정 (CHAR-02)
- **D-07:** [auto] 표정 6종과 트리거:
  | 표정 | 모양 | 언제 |
  |------|------|------|
  | 기본 | 동그란 눈 + 작은 입 + 주기적 눈 깜빡임 | 지금 차례가 아닐 때 |
  | 두근 | 반짝 눈(하이라이트 크게) + 살짝 벌린 입 | 지금 차례 대기 중(🎲 전·이동 중) |
  | 기쁨 | **^^ 눈** + 크게 벌린 입 | 이 캐릭터의 성공(`stars` 비트), 출발 보너스(`startBonus` 비트), 이벤트 `extra` |
  | 아쉬움 | 처진 눈(ㅠ) + 아래로 굽은 입 + 땀방울 | 이 캐릭터의 ❌ 실패 판정, 이벤트 `backward` |
  | 놀람 | 커진 동그란 눈 + O 입 | 이 캐릭터의 이벤트 비트(`forward`, 제한된 `extra` 등 위에 없는 효과) 시작 순간 |
  | 우승 | ^^ 눈 + 벌린 입 + 반짝이(별) | 게임이 라운드 종료로 끝났을 때 우승자(공동 우승 포함) |
- **D-08:** [auto] 표정은 **즉시 바뀐다**(교차 페이드 없음, 깜빡임만 애니메이션). 비트가 끝나면 그 캐릭터의 상황 표정(두근/기본)으로 돌아간다.
- **D-09:** [auto] 표정 구현 방식(3D 도형 눈 모양 변형 / 코드로 그린 CanvasTexture 얼굴 교체 / 둘의 조합)은 **Claude 재량**. 조건: 외부 이미지 파일 없음, 표정 전환에 머티리얼·지오메트리 재생성 없음(미리 만든 것을 켜고 끄기), 폰에서 읽혀야 함(D-03-6).

### 동작 (CHAR-03)
- **D-10:** [auto] **대기**: 지금 차례 캐릭터 = Phase 6처럼 통통 튀는 바운스(조금 더 귀엽게: 착지 squash + 귀/꼬리 흔들림). **차례가 아닌 캐릭터 = 아주 약한 숨쉬기(스케일 ≤ 2%) + 눈 깜빡임만**, 캐릭터마다 위상을 다르게. Phase 6 원칙 "움직이는 건 지금 차례뿐 → 시선이 지금 차례로 모인다"를 지키면서 CHAR-03 "기다리는 동안 살짝 움직임"을 만족하는 절충.
- **D-11:** [auto] **칸 이동 점프**: Phase 6 hop 비트(칸마다 포물선 + 착지 squash)를 그대로 쓰고, 진행 방향을 바라보도록 몸을 돌리며 귀·꼬리가 뒤로 젖혀지는 2차 동작만 더한다. 이동이 끝나면 카메라 쪽을 다시 바라본다.
- **D-12:** [auto] **성공 점프·회전**: 이 캐릭터의 `stars` 비트 동안 높은 점프 + 공중 360° 회전 + 기쁨 표정. `BEAT_MS.stars`는 **600 → 900ms 이내**로 늘려도 된다(점수판 별은 여전히 비트 끝에 오른다, Phase 6 D-01). Phase 8이 이 자리를 대형 성공 연출로 확장한다.
- **D-13:** [auto] **실패 아쉬움**: ❌ 판정마다(재도전으로 이어지는 첫 실패 포함) 새 **반응 비트**(예: `miss`, 약 700ms)로 고개 숙임 + 어깨 처짐 + 아쉬움 표정. 엔진은 바꾸지 않는다 — 이미 로그에 있는 판정 이벤트를 `buildTimeline`이 비트로 바꾼다(타임라인은 순수 함수 유지, 비트마다 ms 데이터 + watchdog). 비트가 끝나야 재도전 카드/다음 버튼이 나온다(HUD-03 규칙 그대로).
- **D-14:** [auto] **우승 환호**: 게임이 **정한 라운드를 다 마쳐 끝나면** 결과 화면 전에 새 비트(예: `win`, 약 1500ms)로 우승자(공동 우승 모두)가 팔 들고 점프하며 우승 표정 + 왕관. **"지금 끝내기"로 끝내면 이 비트 없이 바로 결과 화면**(Phase 6 Pitfall 11 결정 유지: 강사가 끝내려는 의도). 결과 화면(DOM)·시상식은 Phase 8.
- **D-15:** [auto] 동작 길이 상한: 한 전환에 Phase 7이 더하는 대기 시간은 **1초 이하**(성공 +≤300ms, 실패 ≈700ms, 우승 1500ms는 게임당 1회). 이벤트 비트(1000ms) 안에서 놀람 반응을 소화하고 비트 길이를 늘리지 않는다.
- **D-16:** [auto] **reduced motion**(`prefersReducedMotion`): 점프·회전·흔들림 없이 **표정 변화만** 보여 주고, 비트 길이는 Phase 6 규칙대로 줄인다. 대기 바운스·숨쉬기도 끈다(깜빡임은 허용).

### 같은 칸 여러 마리 (BOARD-05)
- **D-17:** [auto] 같은 칸 배치 규칙(`src/game/layout/pawnSlots.ts` 확장, 순수 함수 유지):
  - **지금 차례 캐릭터는 항상 앞줄 가운데(카메라 쪽) 슬롯 + 원래 크기**
  - 나머지는 뒤쪽으로 부채꼴/계단식으로 배치해 **카메라에서 얼굴이 가려지지 않게** 한다(앞 캐릭터가 뒤 캐릭터 얼굴을 30% 넘게 가리지 않음)
  - 2~4마리: 크기 0.85~1.0, 5~8마리: 크기 0.65~0.75
  - 칸 가장자리를 살짝 넘어가도 되지만 **이웃 칸 중심 쪽 절반은 침범하지 않는다**
  - 배치는 참가자 순서 + 지금 차례로만 정해진다(같은 상태 = 같은 모습, 결정적)
- **D-18:** [auto] 작은 크기에서도 구분되도록 각 캐릭터 발밑에 **참가자 색 바닥 원판**(작은 디스크)을 둔다. 지금 차례 링(Phase 6 하늘색)은 그대로.
- **D-19:** [auto] 가림 검증은 **순수 계산 테스트**로 한다: 고정 카메라(`fitCamera`)로 슬롯마다 머리 구를 화면에 투영해 겹침 비율을 계산하고, 8마리·24칸·세로/가로 비율에서 한계를 넘지 않음을 확인한다(jsdom에서 WebGL 없이 가능).

### 성능·기술 제약
- **D-20:** [auto] 드로우콜 예산: **8캐릭터 + 24칸 판 전체 ≤ 100**(Phase 6 `actors.test.tsx` 예산 유지). 캐릭터당 대략 ≤ 8. 종별 지오메트리는 모듈 싱글턴으로 공유하고, 같은 재질 부품은 병합한다(Phase 6 06-05 패턴: 눈·볼 병합). 그림자 맵·후처리 금지 유지.
- **D-21:** [auto] 캐릭터 코드는 **lazy 3D 청크 안에만** 둔다(메인 청크에 three 금지, Phase 6 소스 가드 유지). 순수 계산(슬롯, 표정 상태 결정, 비트 → 표정 매핑)은 three 없는 모듈로 분리해 jsdom에서 테스트한다.
- **D-22:** [auto] 표정·동작은 **연출 큐(`usePresentation`) 비트를 소비**해서 결정한다(Phase 6 Pattern 4: `useFrame`에서 `getState()` 읽기, `completeBeat(id)` 한 번). 새 비트(miss, win)도 watchdog이 끝낼 수 있어야 하고, 3D가 없거나 꺼져도 게임은 진행된다.

### 확인 방법
- **D-23:** [auto] 귀여움 확인용 **캐릭터 갤러리**를 만든다: 8종 × 표정 6종을 한 화면에 보여 주는 개발용 화면(프로덕션 빌드 메인 경로에는 노출하지 않음 — 예: dev 전용 진입점 또는 쿼리 파라미터). 실행 중 Claude가 헤드리스 캡처로 D-03 루브릭을 자체 점검하고, 최종 승인은 **단계 끝 사람 확인**으로 넘긴다(사용자가 사람 확인은 나중에 몰아서 하기를 원함 — 중간 차단 체크포인트 없음).
- **D-24:** [auto] 실기기·사람 확인 항목(단계 끝 UAT로 수집): ① 견본보다 확실히 귀여운가 ② 8종이 3초 안에 구분되는가 ③ 표정 6종이 폰에서 읽히는가 ④ 성공/실패/우승 동작이 신나는가·길지 않은가 ⑤ 한 칸 8마리에서 모두 보이는가.

### Claude's Discretion
- 표정 구현 기법(D-09), 종별 정확한 치수·부품 수, 2차 동작(귀·꼬리 흔들림) 수식, 새 비트 이름과 정확한 ms(상한 D-15 안에서), 갤러리 진입 방식, 같은 칸 배치의 정확한 좌표(D-17 제약 안에서).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 범위·요구사항
- `.planning/ROADMAP.md` §"Phase 7: 치비 동물 캐릭터 & 표정" — 목표와 성공 기준 4개
- `.planning/REQUIREMENTS.md` — CHAR-01, CHAR-02, CHAR-03, BOARD-05
- `.planning/PROJECT.md` — 아동 대상·닌텐도풍·IP 제약(오리지널 아트만)

### Phase 6 결정과 계약 (이어받음)
- `.planning/phases/06-board-game-screen/06-CONTEXT.md` — D-01(엔진 불변·displayed), D-04(그림자 맵·후처리 금지), D-06(lazy 청크), D-17(임시 말 → Phase 7 교체), D-25(연출 끝나야 버튼)
- `.planning/phases/06-board-game-screen/06-UI-SPEC.md` §S2(3D 씬 치수·"움직이는 건 지금 차례 말뿐"), §"Color"
- `.planning/phases/06-board-game-screen/06-RESEARCH.md` — Pattern 4(비트 소비자), Pitfall 11(지금 끝내기 중 연출)
- `.planning/phases/06-board-game-screen/06-05-SUMMARY.md` — 말·주사위 구현 패턴, 드로우콜 병합, 소스 가드
- `.planning/phases/06-board-game-screen/06-VERIFICATION.md` — 남은 실기기 확인 8개(Phase 7 UAT와 함께 진행 가능)

### 연구 자료
- `.planning/research/STACK.md` — 3D 패키지 버전 고정, drei에서 쓰지 말 것

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/game/scene/Pawn.tsx` — hop 비트 소비자(칸마다 포물선·squash, `completeBeat` 1회, watchdog 후 displayed로 정착), 지금 차례 링·왕관·블롭 그림자. 캐릭터 몸만 교체하고 이동 로직은 재사용.
- `src/game/scene/actorGeometries.ts` — `ACTOR_GEO`/`ACTOR_MAT` 싱글턴, `pawnMaterial(animal)`, `eyeMaterial(hex)`, `HEAD_Y`/`CROWN_Y`. 종별 지오메트리 싱글턴을 같은 방식으로 추가.
- `src/game/layout/pawnSlots.ts` — `pawnSlots(order, positions)`(1 / 2×2 / 링 0.8배), `leaders`, `standPoints`. BOARD-05용으로 지금 차례 인자를 받도록 확장.
- `src/game/palette.ts` — `ANIMAL_COLOR`, `ANIMAL_EYE`(어두운 몸엔 흰 눈). 볼·코·안쪽 귀 색 추가 위치.
- `src/game/director/timeline.ts` — `BEAT_MS`, `BeatSpec`, `buildTimeline`(순수). miss/win 비트 추가 위치.
- `src/game/usePresentation.ts` — 비트 큐·watchdog·`skipAll`·`displayed`.
- `src/game/layout/fitCamera.ts` — 가림 계산 테스트(D-19)에 쓸 고정 카메라.
- `src/game/scene/actors.test.tsx` — test-renderer 기반 비트 소비·드로우콜 예산 테스트 패턴.
- `src/game/sourceGuard.test.ts` — 메인 청크 three 금지·외부 URL 금지 가드.

### Established Patterns
- 비트 소비자는 `useFrame`에서 `usePresentation.getState()`를 읽고 startedId/doneId ref로 `completeBeat` 정확히 1회.
- 땅 그룹(xz·바닥·슬롯 스케일·그림자·링) + 몸 그룹(점프·squash·바운스) 분리.
- 반복 소부품 병합으로 캐릭터당 드로우콜 제한.
- 순수 계산은 three 없는 `layout/` 모듈, 3D는 `scene/`(lazy 청크).

### Integration Points
- `SceneContents.tsx`가 참가자마다 `Pawn`을 렌더 → 캐릭터 컴포넌트로 교체.
- `timeline.ts` + `displayed.ts` + `pendingKinds` + `Banner`/`StatusChips`: 새 비트 종류가 HUD에서 무시되거나(배너 없음) 적절히 처리되도록.
- `GameApp` 라우팅: 결과 화면은 `gameOver && !busy` 뒤에 뜸 → win 비트가 끝난 뒤 자연스럽게 전환.

</code_context>

<specifics>
## Specific Ideas

- 성공 표정은 **^^ 눈 + 벌린 입**(2026-10-22 사용자가 A안을 고른 이유: "표정이 있어서", Kenney Mini Characters는 표정이 없어 탈락).
- 사용자 피드백 이력: 기하학 도형 말은 "너무 일차원적" → 반드시 캐릭터. 최종본은 견본보다 "확실히 더 귀엽게".
- 닌텐도풍 밝고 광택 있는 장난감 느낌(Phase 6 판과 통일).

</specifics>

<deferred>
## Deferred Ideas

- 3D 캐릭터 얼굴을 렌더해 점수판·시작 화면 아이콘으로 쓰기(이모지 대체) — 후속 폴리시
- 줄넘기 줄 소품 / 성공 시 줄넘기 동작 — Phase 8 성공 연출 후보
- 차례가 아닌 캐릭터가 남의 성공에 박수 치는 반응 — Phase 8 연출 후보(지금은 시선 집중 원칙 우선)
- 캐릭터 커스터마이즈(모자·색 선택) — 범위 밖, 백로그

</deferred>

---

*Phase: 07-chibi-characters*
*Context gathered: 2026-10-23*
