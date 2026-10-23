# Phase 7: 치비 동물 캐릭터 & 표정 - Research

**Researched:** 2026-10-23
**Domain:** three r186 절차적(코드 생성) 캐릭터 지오메트리, 버텍스 컬러 병합·표정 지오메트리 교체, R3F 비트 소비자 애니메이션, 순수 비트 확장(miss/win), 같은 칸 배치·투영 가림 계산, dev 전용 갤러리
**Confidence:** HIGH (레포 소스·node_modules·로컬 vitest·헤드리스 SwiftShader 렌더로 직접 확인) / MEDIUM (귀여움·표정 가독성 체감은 사람 확인 필요)

## Summary

이번 단계의 가장 큰 위험은 **폰에서 캐릭터가 아주 작다는 점**이다. 실제 무대를 헤드리스 Chromium으로 재 보니 390×844 세로 화면의 캔버스 칸은 374×594 px이다. 그 안에서 칸 한 변(1.0)은 33~51 px이고, 키 0.8짜리 말은 **13~22 px**, 머리 폭 0.5는 **17~26 px**로 보인다(16/20/24칸 기준). 카메라가 50~60°로 내려다보기 때문에, 정면(+Z)을 보는 얼굴은 화면에서 머리 꼭대기에 가려 아래쪽 띠로 납작해진다. 곰 프로토타입을 실제 폰 배율로 렌더해 보니 **머리를 뒤로 약 0.6 rad(≈35°) 젖혀 카메라를 올려다보게 해야** ^^ 눈·벌린 입·하이라이트가 구분됐다. 결론적으로 캐릭터를 Phase 6 임시 말보다 크게 만들고(머리 폭 ≈0.58), 얼굴을 위로 젖히고, 표정은 굵은 실루엣 차이(동그란 눈 ↔ ^^ 호, 작은 입 ↔ 큰 빨간 입)로 설계한다. [VERIFIED: 로컬 Playwright + SwiftShader 렌더]

D-09(표정 기법)의 후보 중 **코드로 그린 CanvasTexture 얼굴은 쓸 수 없다**. Phase 6 소스 가드 `sourceGuard.test.ts (c)`가 `src/game/scene/` 안의 `CanvasTexture`·`fillText`를 금지하고, jsdom에는 2D 캔버스 컨텍스트도 없다. 그래서 **3D 도형 얼굴 부품을 표정마다 미리 병합해 둔 지오메트리(버텍스 컬러)**로 만들고, 얼굴 메시 하나의 `geometry`만 바꿔 끼운다. 이렇게 하면 재질·지오메트리를 새로 만들지 않고 드로우콜도 1개다. 캐릭터 한 마리는 **7 드로우콜**(바닥 1 · 몸통 1 · 팔 2 · 머리 1 · 귀 1 · 얼굴 1)로 만든다. 판·주사위 등 캐릭터 외 메시는 28개로 실측했다. 최악의 경우는 28 + 7×8 + 링 1 + 왕관 8 = **93**으로, 예산 100 안에 들어간다. 꼬리는 몸통에, 반짝이는 우승 얼굴 지오메트리에 병합해 추가 드로우콜을 없앤다. 재질은 버텍스 컬러를 쓰는 `MeshStandardMaterial` 하나를 모든 캐릭터가 공유한다. [VERIFIED: 로컬 vitest 메시 수 측정, three 소스]

새 비트는 엔진을 바꾸지 않고 `buildTimeline`에서 만든다. `judged(success:false)`는 `miss`(700 ms), `gameEnded(reason:'rounds-complete')`는 `win`(1500 ms, `winners` 포함)이 된다. `useDirector`는 지금 **모든** `gameEnded`에서 `skipAll`을 하므로, `manual`일 때만 건너뛰고 라운드 종료일 때는 win 비트를 재생하도록 바꿔야 한다. miss/win은 배너 없는 비트라 3D만 소비하면 캔버스가 없을 때 watchdog(+500 ms)까지 기다리게 된다. 그래서 **Banner의 타이머가 '시간 비트'(배너 비트 + miss + win)를 모두 정확히 ms에 끝내게** 한다. 이 변경 때문에 기존 테스트 6개 파일이 깨지며, 목록과 수정법은 아래에 정리했다. 같은 칸 배치는 투영 계산으로 고른 표(일반 칸 2~8, 출발 칸 2~8 별도 — 출발 게이트 기둥 회피)를 쓴다. 6개 화면 비율 × 16/20/24칸 × 모든 칸에서 앞 머리가 뒤 머리를 가리는 비율이 **최대 7.9%**(한계 30%)이고 머리끼리 3D로 박히지 않음을 확인했다. [VERIFIED: 로컬 vitest 투영 계산]

**Primary recommendation:** (1) miss/win 비트 + 디렉터·배너 + 깨지는 통합 테스트를 한 플랜에서 함께 고치고, (2) three 없는 순수 모듈(치수·슬롯·동작 곡선·반응 매핑)을 TDD로 만든 뒤, (3) 버텍스 컬러 병합 부품 빌더로 8종 × 7개 얼굴 지오메트리를 만들고, (4) `Pawn`을 `Character`로 바꾸고, (5) dev 전용 `gallery.html`로 헤드리스 캡처해 귀여움을 스스로 점검한다.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 실패·우승 사실(judged/gameEnded) | 순수 엔진 `src/engine` (변경 없음) | — | Phase 6 D-01: 엔진 불변, 로그만 읽는다 |
| 로그 → miss/win 비트, 비트 길이 | 순수 `director/timeline.ts` | — | 시계 없음·순수 계약 유지, ms가 데이터 |
| 비트 완료(타이머) | DOM `Banner`(메인 청크) | 스토어 watchdog | 3D가 없거나 꺼져도 정확히 ms에 끝나야 함 |
| 라운드 종료 vs 지금 끝내기 분기 | `director/useDirector.ts` | `GameApp`(`gameOver && !busy`) | win 비트 동안 GameStage 유지, manual은 즉시 결과 |
| 캐릭터별 표정·동작 결정 | 순수 `director/reaction.ts` (three 없음) | — | jsdom 단위 테스트, 3D는 결과만 적용 |
| 동작 곡선(점프·회전·처짐·환호·숨쉬기) | 순수 `layout/charMotion.ts` (three 없음) | — | 끝점=휴식 자세 단언 가능 |
| 같은 칸 배치 | 순수 `layout/pawnSlots.ts` | `layout/chibiDims.ts`(치수) | 결정적, 투영 가림 테스트 |
| 지오메트리·재질 생성 | lazy 3D 청크 `scene/chibi*.ts` | — | 메인 청크 three 금지(D-21) |
| 프레임 애니메이션·지오메트리 교체 | lazy 3D 청크 `scene/Character.tsx` | — | `useFrame` + `getState()`, ref만 변경 |
| 귀여움 확인 갤러리 | dev 전용 `gallery.html` 진입점 | 헤드리스 캡처(일회용 스크립트) | 프로덕션 빌드에 들어가지 않음(검증함) |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### 캐릭터 생김새와 색 (CHAR-01)
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

#### 표정 (CHAR-02)
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

#### 동작 (CHAR-03)
- **D-10:** [auto] **대기**: 지금 차례 캐릭터 = Phase 6처럼 통통 튀는 바운스(조금 더 귀엽게: 착지 squash + 귀/꼬리 흔들림). **차례가 아닌 캐릭터 = 아주 약한 숨쉬기(스케일 ≤ 2%) + 눈 깜빡임만**, 캐릭터마다 위상을 다르게. Phase 6 원칙 "움직이는 건 지금 차례뿐 → 시선이 지금 차례로 모인다"를 지키면서 CHAR-03 "기다리는 동안 살짝 움직임"을 만족하는 절충.
- **D-11:** [auto] **칸 이동 점프**: Phase 6 hop 비트(칸마다 포물선 + 착지 squash)를 그대로 쓰고, 진행 방향을 바라보도록 몸을 돌리며 귀·꼬리가 뒤로 젖혀지는 2차 동작만 더한다. 이동이 끝나면 카메라 쪽을 다시 바라본다.
- **D-12:** [auto] **성공 점프·회전**: 이 캐릭터의 `stars` 비트 동안 높은 점프 + 공중 360° 회전 + 기쁨 표정. `BEAT_MS.stars`는 **600 → 900ms 이내**로 늘려도 된다(점수판 별은 여전히 비트 끝에 오른다, Phase 6 D-01). Phase 8이 이 자리를 대형 성공 연출로 확장한다.
- **D-13:** [auto] **실패 아쉬움**: ❌ 판정마다(재도전으로 이어지는 첫 실패 포함) 새 **반응 비트**(예: `miss`, 약 700ms)로 고개 숙임 + 어깨 처짐 + 아쉬움 표정. 엔진은 바꾸지 않는다 — 이미 로그에 있는 판정 이벤트를 `buildTimeline`이 비트로 바꾼다(타임라인은 순수 함수 유지, 비트마다 ms 데이터 + watchdog). 비트가 끝나야 재도전 카드/다음 버튼이 나온다(HUD-03 규칙 그대로).
- **D-14:** [auto] **우승 환호**: 게임이 **정한 라운드를 다 마쳐 끝나면** 결과 화면 전에 새 비트(예: `win`, 약 1500ms)로 우승자(공동 우승 모두)가 팔 들고 점프하며 우승 표정 + 왕관. **"지금 끝내기"로 끝내면 이 비트 없이 바로 결과 화면**(Phase 6 Pitfall 11 결정 유지: 강사가 끝내려는 의도). 결과 화면(DOM)·시상식은 Phase 8.
- **D-15:** [auto] 동작 길이 상한: 한 전환에 Phase 7이 더하는 대기 시간은 **1초 이하**(성공 +≤300ms, 실패 ≈700ms, 우승 1500ms는 게임당 1회). 이벤트 비트(1000ms) 안에서 놀람 반응을 소화하고 비트 길이를 늘리지 않는다.
- **D-16:** [auto] **reduced motion**(`prefersReducedMotion`): 점프·회전·흔들림 없이 **표정 변화만** 보여 주고, 비트 길이는 Phase 6 규칙대로 줄인다. 대기 바운스·숨쉬기도 끈다(깜빡임은 허용).

#### 같은 칸 여러 마리 (BOARD-05)
- **D-17:** [auto] 같은 칸 배치 규칙(`src/game/layout/pawnSlots.ts` 확장, 순수 함수 유지):
  - **지금 차례 캐릭터는 항상 앞줄 가운데(카메라 쪽) 슬롯 + 원래 크기**
  - 나머지는 뒤쪽으로 부채꼴/계단식으로 배치해 **카메라에서 얼굴이 가려지지 않게** 한다(앞 캐릭터가 뒤 캐릭터 얼굴을 30% 넘게 가리지 않음)
  - 2~4마리: 크기 0.85~1.0, 5~8마리: 크기 0.65~0.75
  - 칸 가장자리를 살짝 넘어가도 되지만 **이웃 칸 중심 쪽 절반은 침범하지 않는다**
  - 배치는 참가자 순서 + 지금 차례로만 정해진다(같은 상태 = 같은 모습, 결정적)
- **D-18:** [auto] 작은 크기에서도 구분되도록 각 캐릭터 발밑에 **참가자 색 바닥 원판**(작은 디스크)을 둔다. 지금 차례 링(Phase 6 하늘색)은 그대로.
- **D-19:** [auto] 가림 검증은 **순수 계산 테스트**로 한다: 고정 카메라(`fitCamera`)로 슬롯마다 머리 구를 화면에 투영해 겹침 비율을 계산하고, 8마리·24칸·세로/가로 비율에서 한계를 넘지 않음을 확인한다(jsdom에서 WebGL 없이 가능).

#### 성능·기술 제약
- **D-20:** [auto] 드로우콜 예산: **8캐릭터 + 24칸 판 전체 ≤ 100**(Phase 6 `actors.test.tsx` 예산 유지). 캐릭터당 대략 ≤ 8. 종별 지오메트리는 모듈 싱글턴으로 공유하고, 같은 재질 부품은 병합한다(Phase 6 06-05 패턴: 눈·볼 병합). 그림자 맵·후처리 금지 유지.
- **D-21:** [auto] 캐릭터 코드는 **lazy 3D 청크 안에만** 둔다(메인 청크에 three 금지, Phase 6 소스 가드 유지). 순수 계산(슬롯, 표정 상태 결정, 비트 → 표정 매핑)은 three 없는 모듈로 분리해 jsdom에서 테스트한다.
- **D-22:** [auto] 표정·동작은 **연출 큐(`usePresentation`) 비트를 소비**해서 결정한다(Phase 6 Pattern 4: `useFrame`에서 `getState()` 읽기, `completeBeat(id)` 한 번). 새 비트(miss, win)도 watchdog이 끝낼 수 있어야 하고, 3D가 없거나 꺼져도 게임은 진행된다.

#### 확인 방법
- **D-23:** [auto] 귀여움 확인용 **캐릭터 갤러리**를 만든다: 8종 × 표정 6종을 한 화면에 보여 주는 개발용 화면(프로덕션 빌드 메인 경로에는 노출하지 않음 — 예: dev 전용 진입점 또는 쿼리 파라미터). 실행 중 Claude가 헤드리스 캡처로 D-03 루브릭을 자체 점검하고, 최종 승인은 **단계 끝 사람 확인**으로 넘긴다(사용자가 사람 확인은 나중에 몰아서 하기를 원함 — 중간 차단 체크포인트 없음).
- **D-24:** [auto] 실기기·사람 확인 항목(단계 끝 UAT로 수집): ① 견본보다 확실히 귀여운가 ② 8종이 3초 안에 구분되는가 ③ 표정 6종이 폰에서 읽히는가 ④ 성공/실패/우승 동작이 신나는가·길지 않은가 ⑤ 한 칸 8마리에서 모두 보이는가.

### Claude's Discretion
- 표정 구현 기법(D-09), 종별 정확한 치수·부품 수, 2차 동작(귀·꼬리 흔들림) 수식, 새 비트 이름과 정확한 ms(상한 D-15 안에서), 갤러리 진입 방식, 같은 칸 배치의 정확한 좌표(D-17 제약 안에서).

### Deferred Ideas (OUT OF SCOPE)
- 3D 캐릭터 얼굴을 렌더해 점수판·시작 화면 아이콘으로 쓰기(이모지 대체) — 후속 폴리시
- 줄넘기 줄 소품 / 성공 시 줄넘기 동작 — Phase 8 성공 연출 후보
- 차례가 아닌 캐릭터가 남의 성공에 박수 치는 반응 — Phase 8 연출 후보(지금은 시선 집중 원칙 우선)
- 캐릭터 커스터마이즈(모자·색 선택) — 범위 밖, 백로그
</user_constraints>

**연구가 잠긴 결정을 바꿔야 하는 곳(증거 포함):**
- **D-09:** CanvasTexture 방식은 실현할 수 없다. `src/game/sourceGuard.test.ts:105-109`의 `(c)` 규칙이 `src/game/scene/` 안의 `/\b(fillText|CanvasTexture|TextGeometry|FontLoader)\b/`를 금지한다. 가드를 풀지 않는 한 남는 선택지는 "3D 도형 얼굴"뿐이다. 이 연구는 그 방식을 권장한다(D-09가 Claude 재량이라 결정 위반은 아님).
- **D-17 "앞줄 가운데":** 출발 칸에서는 게이트 기둥(출발 칸 중심 기준 (0.53, −0.25)과 (−0.25, 0.53))이 가운데 앞 슬롯과 부딪힌다. 그래서 출발 칸에서는 지금 차례가 **맨 앞(z 최대) 슬롯**에 서되 x 가운데는 아닐 수 있다. 출발 칸 전용 표를 아래에 두었다.
- **D-17 크기:** 일반 칸 표는 2~4마리 0.85~0.9, 5~8마리 0.65~0.72로 D-17 범위 안이다.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAR-01 | 말은 코드로 만든 귀여운 치비 동물 캐릭터이며 여러 종(6~8종)이 있다 (외부 3D 모델 파일 없음) | Pattern 1(버텍스 컬러 병합 부품), §종별 부품표(8종 치수), §귀여움 규칙(머리 기울기·비율·외곽선), 7 드로우콜 예산 표, palette 확장 |
| CHAR-02 | 캐릭터는 상황에 따라 표정이 바뀐다 — 기본 / 두근 / 기쁨(^^ 눈) / 아쉬움 / 놀람 / 우승 | Pattern 2(얼굴 지오메트리 교체), §표정 부품표, Pattern 3(`reactionFor` 순수 매핑), 깜빡임 순수 함수 |
| CHAR-03 | 캐릭터는 대기, 칸 이동 점프, 성공 점프·회전, 실패 아쉬움, 우승 환호 동작을 한다 | Pattern 4(동작 곡선 순수 모듈), Pattern 5(miss/win 비트 + Banner 타이머 완료), Pattern 6(디렉터 라운드 종료 분기), hop 소비자 재사용 + 방향 전환 |
| BOARD-05 | 한 칸에 말이 여러 개(최대 8개) 서 있어도 모든 말이 구분된다 | Pattern 7(슬롯 표: 일반 칸·출발 칸, 투영 검증치), 투영 가림 테스트 코드, 참가자 색 바닥 원판, 칸 위 별 들어올리기 |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- 스택: 브라우저 + Three.js(WebGL), React 19 + R3F 9 + drei 10 + Zustand 5 + Vite 8 + TypeScript 5. 설치 없이 바로 실행.
- 데이터는 서버 없이 localStorage/JSON. 이번 단계는 저장 형식을 바꾸지 않는다.
- 대상은 아동이다. UI는 크고 단순하게, 밝고 경쾌한 닌텐도풍, 텍스트는 최소화한다.
- **IP:** 실제 브랜드·캐릭터 자산을 쓰지 않는다. 오리지널 아트만 쓴다. 외부 모델(.glb)·텍스처(.png)도 금지(CHAR-01).
- STACK "What NOT to Use": rigid-body 물리 금지, Ready Player Me/ARKit 블렌드셰이프 금지, 런타임 FBX/OBJ 금지, 실제 브랜드 자산 금지.
- GSD 흐름: 파일 변경은 GSD 명령(`/gsd-execute-phase` 등)으로만 한다.
- 대화 응답은 한국어를 우선한다(전역 CLAUDE.md).
- Phase 6에서 이어받은 가드(`sourceGuard.test.ts`): drei `Text/Html/Environment/useGLTF/Bounds/OrbitControls/StatsGl…` 금지, `src/game` 안 원격 URL 금지, `src/game/scene` 안 3D 텍스트·CanvasTexture 금지, 메인 청크에서 three 금지, 물리·후처리 금지, 그림자 맵 금지.

## Standard Stack

이번 단계는 **새 패키지를 설치하지 않는다.** 모두 이미 설치된 버전을 쓴다. [VERIFIED: package.json]

### Core
| Library | Version (설치됨) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | **0.186.1** | 기본 지오메트리(Sphere/Capsule/Cone/Torus/Circle/Cylinder/Extrude), `mergeGeometries`, 버텍스 컬러 | 프로젝트 고정. 참고: 작업 지시의 "0.185.x"가 아니라 실제 설치 버전은 0.186.1이다 |
| @react-three/fiber | 9.8.2 | `useFrame` 비트 소비자, 선언적 메시 | Phase 6 패턴 |
| @react-three/test-renderer | 9.1.1 (dev) | WebGL 없이 씬 그래프·`advanceFrames` 테스트 | Phase 6 `actors.test.tsx` 패턴 |
| zustand | 5.0.14 | `usePresentation` 비트 큐 | 기존 |
| vitest | 3.2.4 + jsdom 27 | 순수 모듈·통합 테스트 | 기존(현재 44파일 925테스트 통과, 8 s) |

### Supporting (코드 경로)
| Module | Import path | Purpose |
|--------|-------------|---------|
| `mergeGeometries` | `three/addons/utils/BufferGeometryUtils.js` | 부품 병합. `package.json` exports `"./addons/*": "./examples/jsm/*"`이고 `actorGeometries.ts:24`가 이미 이 경로를 쓴다 [VERIFIED: node_modules/three/package.json] |
| `RoundedBoxGeometry` | `three/addons/geometries/RoundedBoxGeometry.js` | (필요 시) 이미 사용 중 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 3D 도형 얼굴 + 지오메트리 교체 | CanvasTexture 얼굴 아틀라스 | 소스 가드 (c)가 금지하고 jsdom에 2D 컨텍스트가 없다. 불가 |
| 3D 도형 얼굴 + 지오메트리 교체 | 모프 타깃(표정 블렌드) | 즉시 전환(D-08)에는 블렌드가 필요 없다. R3F `<mesh geometry>`는 생성 후 지오메트리를 넣으므로 `updateMorphTargets()`를 따로 불러야 하는 함정이 있다. 쓰지 않는다 |
| 메시 7개/마리 | InstancedMesh(종 간 공유) | 캐릭터마다 다른 애니메이션 자세(팔·머리·귀)와 표정을 인스턴스 행렬로 표현하려면 부품마다 InstancedMesh가 필요하다. 8마리 규모에서는 이득이 작고 비트 소비자 구조만 복잡해진다 |
| 버텍스 컬러 병합 | 부품별 메시 + 공유 재질 | 마리당 20개 이상의 메시가 되어 예산 100을 넘는다 |
| 외곽선: 병합 inverted hull(감은 방향 뒤집기) | 별도 BackSide 외곽선 메시 | 별도 메시는 드로우콜이 2배가 된다. 감은 방향을 뒤집은 hull을 같은 지오메트리에 넣으면 추가 드로우콜이 0이다(프로토타입에서 렌더 확인) |

**Installation:** 없음.

**Version verification:** `package.json`의 exact pin을 확인했다(three 0.186.1, fiber 9.8.2, drei 10.7.9, test-renderer 9.1.1, vitest 3.2.4).

## Package Legitimacy Audit

이번 단계는 외부 패키지를 설치하지 않는다.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (없음) | — | — | — | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

참고: 헤드리스 캡처에는 사용자 npx 캐시에 이미 있는 Playwright 1.64(`/Users/simkoon/.npm/_npx/e41f203b7505f1fb/node_modules/playwright`)를 **일회용 스크립트로만** 쓴다. 프로젝트 의존성에는 추가하지 않는다.

## Architecture Patterns

### System Architecture Diagram

```
 강사 탭(✅/❌/다음/🎲)
      │
      ▼
 useGameStore (엔진, 변경 없음) ── GameLog.events: judged{success} / gameEnded{reason,winners} / ...
      │ subscribe (동기, Phase 6 Pattern 3)
      ▼
 useDirector.directGame ──┬─ gameEnded.reason==='manual' ──► skipAll ──► GameApp: ResultView
      │                   └─ 그 외 ──► buildTimeline(events) (순수)
      ▼                                   │  judged ok  → stars (900ms)
 usePresentation (비트 큐 + watchdog)      │  judged ✗   → miss  (700ms)   ← NEW
      │ current beat                       │  rounds-complete → win(winners,1500ms) ← NEW
      ├──────────────► Banner (DOM, 메인 청크): isTimedBeat → setTimeout(ms) → completeBeat(id)
      │                     (배너 문구는 bannerCopy가 있을 때만 렌더; miss는 문구 없음)
      │
      └──────────────► lazy 3D 청크
                         SceneContents
                           ├─ pawnSlots(order, positions, currentId)  (순수, 표 기반)
                           └─ Character × N  (useFrame: getState())
                                 ├─ hop 비트(자기 pid) → 칸별 포물선 + 진행 방향 회전 → completeBeat(id) 1회
                                 ├─ reactionFor(pid, beat, isCurrent) (순수) → {expression, act, beatId}
                                 ├─ charMotion.poseFor(act, u) (순수) → 그룹 transform(ref)
                                 └─ face.geometry = FACE[animal][expr | blink] (미리 만든 지오메트리 교체)
```

### Recommended Project Structure

```
src/game/
├── director/
│   ├── timeline.ts         # + miss/win BeatSpec, BEAT_MS.stars 900 / miss 700 / win 1500, isTimedBeat
│   ├── reaction.ts         # NEW 순수: reactionFor(), blinkClosed()  (three 없음)
│   └── useDirector.ts      # gameEnded: manual만 skipAll, rounds-complete는 play
├── layout/
│   ├── chibiDims.ts        # NEW 순수 치수 상수(HEAD_C, HEAD_R, BODY_R, HEAD_TILT …) — 슬롯 테스트와 지오메트리가 공유
│   ├── charMotion.ts       # NEW 순수 동작 곡선 Pose
│   └── pawnSlots.ts        # 표 기반 v2: pawnSlots(order, positions, currentId)
├── hud/Banner.tsx          # isTimedBeat 완료, 배너 문구 있을 때만 렌더
└── scene/
    ├── chibiParts.ts       # NEW part()/hull()/onHead()/bake 헬퍼 (three)
    ├── chibiSpecies.ts     # NEW 종별 정적 지오메트리 싱글턴(ground/torso/armL/armR/head/ears)
    ├── chibiFaces.ts       # NEW 종별·표정별 얼굴 지오메트리(지연 생성 캐시)
    ├── ChibiModel.tsx      # NEW 보이기만 하는 모델(그룹 ref 노출) — Character·갤러리 공용
    ├── Character.tsx       # NEW Pawn 대체: hop 소비 + 반응 적용
    ├── CharacterGallery.tsx# NEW dev 갤러리 씬(scene 폴더라 three 허용)
    └── Pawn.tsx            # 삭제
gallery.html                # NEW 저장소 루트, dev 서버 전용(빌드 입력 아님)
src/gallery.tsx             # NEW 갤러리 진입(React root) — scene/CharacterGallery만 import
```

### Pattern 1: 애니메이션 노드 하나 = 버텍스 컬러 병합 메시 하나

**What:** 함께 움직이는 부품(예: 머리 + 주둥이 + 코 + 판다 눈 패치)은 각각 `toNonIndexed()` → `uv` 삭제 → `color` 속성(선형 색) 추가 → 행렬 적용 후 `mergeGeometries`로 하나로 합친다. 재질은 `MeshStandardMaterial({ vertexColors: true })` **하나**를 모든 캐릭터가 공유한다.

**Why toNonIndexed + uv 삭제:** `mergeGeometries`는 모든 입력의 index 유무와 속성 집합이 같아야 하고, 아니면 `null`을 돌려주며 `console.error`를 낸다(`BufferGeometryUtils.js:133-190`). Sphere·Capsule·Torus·Circle은 indexed이고 ExtrudeGeometry(반짝이 별)는 non-indexed라 섞이면 실패한다. 모두 non-indexed로 바꾸고 `position/normal/color`만 남기면 항상 합쳐진다. [VERIFIED: node 실행 — Sphere/Capsule/Torus indexed=true, Extrude indexed=false]

**Why linear color:** `ColorManagement.enabled = true`, working space = `srgb-linear`이다. `new Color('#9C6644').r`는 0.3325(선형)이고 0x9C/255는 0.6118이다. 버텍스 컬러는 working space(선형)로 해석되므로 `new Color(hex)`의 r/g/b를 써야 `flat` 캔버스에서 palette hex와 같은 색이 나온다. [VERIFIED: node 실행]

**캐릭터 노드 구조(마리당 7 드로우콜):**

| 그룹(움직임) | 메시 | 병합 내용 | 재질 |
|---|---|---|---|
| ground (xz·슬롯 스케일, 바닥 고정) | `chibi-ground` | 참가자 색 원판 r 0.22 + 잉크 테두리 0.22~0.25 + 블롭 그림자 r 0.30 (color itemSize 4, 원판 α=1 / 그림자 α=0.22) | `MeshBasicMaterial({vertexColors, transparent, depthWrite:false})` — itemSize 4면 `vertexAlphas`가 자동으로 켜진다 [VERIFIED: WebGLPrograms.js:311] |
| ground | `turn-ring` (지금 차례만) | 기존 `ACTOR_GEO.turnRing` | 기존 |
| body (점프·squash·yaw·숨쉬기) | `chibi-torso` | 몸통 + 배 패치 + 발 2 + **꼬리(정적)** + 몸통 hull(선택) | 공유 CHAR_MAT |
| body › armL / armR (어깨 피벗) | `chibi-arm-l`, `chibi-arm-r` | 팔 캡슐(어깨에 끝이 오도록 이동) + hull | CHAR_MAT |
| body › head (머리 중심 피벗, 기울기·끄덕임) | `chibi-head` | 머리 타원구 + 주둥이/코/패치/부리 + hull | CHAR_MAT |
| head › ears (귀 피벗) | `chibi-ears` | 귀 2개(+안쪽색) + hull; 병아리는 머리 깃털 | CHAR_MAT |
| head | `chibi-face` | 표정별 지오메트리(눈·하이라이트·볼·입·눈썹·땀·반짝이) | CHAR_MAT |
| head | `crown` (1등·우승자만) | 기존 `ACTOR_GEO.crown` | 기존 |

**드로우콜 예산(최악 = 8마리 모두 왕관):**

| 항목 | 메시 수 | 근거 |
|---|---|---|
| 캐릭터 외(판·칸·화살표·게이트·주사위·미리보기) | 28 (보이는 것 26) | 로컬 실측: Phase 6 SceneContents, 참가자 0명, 24칸 [VERIFIED: 스크래치 vitest] |
| 캐릭터 7 × 8 | 56 | 위 표 |
| 지금 차례 링 | 1 | |
| 왕관(동점 8명) | 8 | `leaders()`가 8명 모두 돌려줄 수 있음 |
| **합계** | **93 ≤ 100** | 여유 7. 꼬리를 따로 흔들려면 +8 = 101이 되어 초과한다. 그래서 꼬리는 몸통에 병합한다 |

참고: 현재 Phase 6 말 8개 씬은 93(말 7 × 8 + 왕관 8 + 링 1 + 28)이다. 새 캐릭터도 같은 수치를 유지한다.

### Pattern 2: 표정 = 미리 만든 얼굴 지오메트리 교체(즉시, D-08)

**What:** `chibi-face` 메시 하나에 표정별 지오메트리 `idle, idleBlink, excited, excitedBlink, joy, sad, sadBlink, surprised, winner`(9개)를 미리 만든다. `useFrame`에서 바뀔 때만 `faceRef.current.geometry = faceGeo(animal, key)`로 바꾼다. 재질은 같고 속성 구성(position/normal/color)도 같아서 셰이더 프로그램이 다시 컴파일되지 않는다. 지오메트리는 `(animal, key)` Map 캐시에 **처음 쓸 때 만들고** 버리지 않는다(Phase 6 Pitfall 9: 싱글턴은 dispose하지 않음, `dispose={null}`).

**R3F 주의:** `<mesh geometry={faceGeo(animal,'idle')} />`처럼 처음 값을 prop으로 주고 이후 교체는 ref로 한다. R3F `applyProps`는 **이전 prop과 새 prop**을 비교하므로 prop이 같은 객체면 다시 렌더해도 덮어쓰지 않는다. 그래도 테스트로 "isCurrent 변경으로 다시 렌더돼도 비트 중 표정이 유지된다"를 단언한다. [CITED: R3F applyProps 동작 — Phase 6 Pawn·Dice가 같은 패턴으로 이미 통과]

**깜빡임:** 별도 애니메이션이 아니라 `idle → idleBlink` 교체를 120 ms 한다. `excited`, `sad`도 같다. `joy/winner`는 이미 눈을 감고 있고 `surprised`는 깜빡이지 않는다. reduced motion에서도 깜빡임은 허용한다(D-16).

### Pattern 3: 순수 반응 매핑 `reactionFor` (three 없음, `src/game/director/reaction.ts`)

```ts
// Source: 이 연구의 권장 API (timeline.ts의 Beat 타입만 type-import)
import type { Beat } from './timeline';

export type Expression = 'idle' | 'excited' | 'joy' | 'sad' | 'surprised' | 'winner';
export type Act = 'rest' | 'hop' | 'success' | 'bonus' | 'surprise' | 'slump' | 'cheer';
export interface Reaction { expression: Expression; act: Act; beatId: number | null; ms: number }

export function reactionFor(pid: string, beat: Beat | null, isCurrent: boolean): Reaction {
  const rest: Reaction = { expression: isCurrent ? 'excited' : 'idle', act: 'rest', beatId: null, ms: 0 };
  if (!beat) return rest;
  if (beat.kind === 'win') {
    return beat.winners.includes(pid)
      ? { expression: 'winner', act: 'cheer', beatId: beat.id, ms: beat.ms }
      : { ...rest, expression: 'idle' }; // 남의 우승에 박수는 Deferred
  }
  if (beat.kind === 'finalRound' || beat.pid !== pid) return rest;
  const r = (expression: Expression, act: Act): Reaction => ({ expression, act, beatId: beat.id, ms: beat.ms });
  switch (beat.kind) {
    case 'stars': return r('joy', 'success');
    case 'startBonus': return r('joy', 'bonus');
    case 'miss': return r('sad', 'slump');
    case 'hop': return r('excited', 'hop');
    case 'event':
      if (beat.eff === 'extra' && !beat.suppressed) return r('joy', 'bonus');
      if (beat.eff === 'backward') return r('sad', 'slump');
      return r('surprised', 'surprise'); // forward, suppressed extra
    default: return { ...rest, expression: 'excited' }; // dice / preview of this pid
  }
}

// 결정적 깜빡임: 캐릭터마다 다른 주기(3.0~4.4 s)와 위상, 120 ms 감기.
export function blinkClosed(tSec: number, seed: number): boolean {
  const period = 3.0 + (seed % 5) * 0.35;
  const t = (tSec + seed * 0.731) % period;
  return t < 0.12;
}
```

TDD 단언: 각 비트 종류와 pid 일치/불일치, `win`에서 공동 우승 모두 'winner', `finalRound`는 rest, `blinkClosed`는 주기당 정확히 0.12 s 동안만 true이고 seed마다 위상이 다르다.

### Pattern 4: 순수 동작 곡선 `charMotion.ts` (three 없음)

```ts
// Source: 이 연구의 권장 API
export interface Pose { y: number; yaw: number; squashY: number; headPitch: number; armL: number; armR: number; earTilt: number; lean: number }
export const REST: Pose = { y: 0, yaw: 0, squashY: 1, headPitch: 0, armL: 0, armR: 0, earTilt: 0, lean: 0 };
// u = elapsed / (beat.ms/1000) ∈ [0,1]; 모든 곡선은 pose(0) ≈ REST, pose(1) ≈ REST (비트 끝에 튀지 않음)
export function successPose(u: number): Pose;  // 0~0.15 웅크림(squash 0.85) → 0.15~0.75 점프 y≤0.55 + yaw 0→2π(easeInOut) + 팔 위로 → 0.75~1 착지 squash
export function slumpPose(u: number): Pose;    // 0~0.25 고개 숙임(headPitch +0.35) + 팔 안쪽 처짐 + squashY 0.94, 유지, 0.8~1 회복
export function cheerPose(u: number): Pose;    // 점프 2번(y 0.35) + 팔 만세(±2.4 rad) + 끝에 회복
export function surprisePose(u: number): Pose; // 0~0.3 뒤로 깡총(y 0.12, lean −0.2) + 팔 번쩍, 0.3~0.6 복귀 (1000ms 이벤트 비트 안)
export function bonusPose(u: number): Pose;    // 작은 깡총 2번(y 0.2)
export function bouncePose(tSec: number): Pose;            // 지금 차례: Phase 6 바운스(주기 0.8 s, 0.08) + 착지 squash + 귀 lag
export function breathePose(tSec: number, seed: number): Pose; // 차례 아님: squashY = 1 + 0.015·sin(2πt/2.6 + seed·1.7) (≤2%)
```

**Character의 적용 규칙:**
- 비트 시작(새 `beatId`)에서 경과 시간을 0으로 맞추고 `u = min(1, elapsed/(ms/1000))`로 계산한다.
- 비트가 watchdog·skipAll로 먼저 끝나면 그때 자세에서 REST로 `1 − exp(−12·dt)` 감쇠한다(Pawn의 `lift` 감쇠와 같은 방식).
- 회전: hop 중에는 `yaw = atan2(to.x − a.x, to.z − a.z)`(뒤로 이벤트 hop도 실제 진행 방향)이다. 쉬는 중에는 0(카메라 쪽)이다. 최단 각도로 보간한다.
- reduced motion: `y/yaw/lean/armL/armR/earTilt`는 0으로 두고 표정만 바꾼다. 숨쉬기·바운스도 끈다(D-16).
- 프레임마다 스토어에 쓰지 않는다. ref 변경만 하고, 지오메트리 교체는 키가 바뀔 때만 한다.

### Pattern 5: miss / win 비트 + Banner의 시간 비트 완료

```ts
// timeline.ts 변경 (순수 유지)
export const BEAT_MS = { ...기존, stars: 900, miss: 700, win: 1500 } as const;
export type BeatSpec =
  | ...기존
  | { kind: 'miss'; pid: string; ms: number }
  | { kind: 'win'; winners: string[]; ms: number };

case 'judged':
  out.push(e.success
    ? { kind: 'stars', pid: e.pid, stars: e.stars, ms: BEAT_MS.stars }
    : { kind: 'miss', pid: e.pid, ms: BEAT_MS.miss });
  break;
case 'gameEnded':
  if (e.reason === 'rounds-complete') out.push({ kind: 'win', winners: [...e.winners], ms: BEAT_MS.win });
  break;

// DOM 타이머가 끝내는 비트: 배너 비트 + 반응 비트(miss/win). isBannerBeat는 그대로 둔다(테스트 고정).
export const isTimedBeat = (b: BeatSpec): boolean => isBannerBeat(b) || b.kind === 'miss' || b.kind === 'win';
```

- **reduced motion:** `motion()`은 dice/preview/hop에만 적용한다(현행). miss/win은 표정을 보여 주는 비트라 길이를 유지한다(D-16 "표정 변화만 보여 준다"). 0 ms가 되면 current가 되지 않아 표정이 아예 안 보인다.
- **Banner:** 선택자와 effect를 `isTimedBeat`로 바꾸고, `bannerCopy(beat)`가 null이면 아무것도 렌더하지 않는다(miss). win 배너 문구(`🏆 우승!` 등)를 둘지는 UI-SPEC이 정한다. 문구 없이 1.5 s 동안 작은 캐릭터만 움직이면 폰에서 "멈춘 것처럼" 보일 위험이 있어 **배너를 권장한다**. 이름을 넣는다면 JSX 텍스트로만 렌더한다.
- **displayed.applyBeat:** `default` 분기가 그대로 처리한다(위치·별 변화 없음).
- **StatusChips/chipItems:** `dice/startBonus/event/hop`만 보므로 영향이 없다.
- **watchdog:** 비트마다 `ms + 500`이 자동으로 걸린다(`usePresentation.startNext`). 캔버스가 없어도 Banner가 ms에 끝내고, Banner도 없으면 watchdog이 끝낸다.

### Pattern 6: 디렉터 — 라운드 종료만 win 비트

```ts
// useDirector.ts directGame (변경 부분)
const ended = next.log.events.find((e) => e.t === 'gameEnded');
if (ended && ended.t === 'gameEnded' && ended.reason === 'manual') {
  p.skipAll(); // Pitfall 11 유지: "지금 끝내기"는 바로 결과
  return;
}
p.play(buildTimeline(next.log.events, timelineCtx(next))); // rounds-complete → [win]
```

- 자연 종료는 `advanceTurn`의 단일 이벤트 전환(`[gameEnded]`)이다. 그 직전에는 컨트롤이 `!busy`일 때만 보이므로 큐가 비어 있고, win 비트가 바로 current가 된다. [VERIFIED: engine/game.ts:327-381]
- `GameApp`은 `phase==='gameOver' && !busy`일 때 ResultView를 그리므로 win 비트 동안 GameStage(캔버스)가 유지되고, 끝나면 자연스럽게 결과 화면으로 넘어간다. [VERIFIED: GameApp.tsx:29]
- win 비트 동안 TurnHud의 "끝내기"는 엔진에서 아무 일도 하지 않는다(`endGame`이 gameOver면 같은 상태를 돌려줌 → `next === prev`). 강사 의도를 살리려면 `GameStage`의 `onEndNow`에서 `phase==='gameOver'`이면 `usePresentation.getState().skipAll()`을 호출하게 한다(권장, 작은 변경).
- 우승자 왕관: `leaders(displayed.stars)`는 모두 0별이면 []를 돌려주지만 `winnersByStars`는 전원을 돌려준다. win 비트 중에는 `crowned = new Set(current.winners)`로 덮어쓴다. 지금 차례 링도 win 비트 중에는 숨긴다(권장).

### Pattern 7: 같은 칸 배치 — 투영으로 검증한 표

**치수 가정(`chibiDims.ts`와 일치시킬 것):** 머리 중심 y = 0.62·s, 머리 반지름 0.27(x 1.08배), 몸 반지름 0.19, 머리 기울기는 **머리 중심 피벗**(중심이 움직이지 않아 투영 테스트가 그대로 유효)으로 한다.

**순서:** 그 칸의 지금 차례(있으면)가 k=0이고, 나머지는 참가자 순서대로 k=1..n−1이다. **k=0 크기 = 1.0(지금 차례일 때) / 아니면 표의 s**, 나머지는 s다.

**일반 칸 (x, z), 카메라 = +z 쪽:**

| n | s(나머지) | 슬롯 [k0 … ] | 투영 최대 가림 |
|---|---|---|---|
| 1 | — | (0, 0) s=1 | — |
| 2 | 0.90 | (0, 0.30), (0.36, −0.30) | 10.6% |
| 3 | 0.85 | (0, 0.40), (−0.44, −0.18), (0.44, −0.18) | 5.2% |
| 4 | 0.85 | (0, 0.44), (−0.48, −0.08), (0.48, −0.08), (0, −0.42) | 3.1% |
| 5 | 0.70 | (0, 0.48), (−0.50, 0.06), (0.50, 0.06), (−0.22, −0.44), (0.22, −0.44) | 4.7% |
| 6 | 0.66 | (0, 0.48), (−0.52, 0.22), (0.52, 0.22), (−0.38, −0.46), (0.38, −0.46), (0, −0.36) | 15.6% |
| 7 | 0.65 | (0, 0.50), (−0.52, 0.26), (0.52, 0.26), (−0.50, −0.20), (0.50, −0.20), (−0.18, −0.48), (0.18, −0.48) | 7.9% |
| 8 | 0.65 | (0, 0.52), (−0.52, 0.42), (0.52, 0.42), (−0.52, −0.06), (0.52, −0.06), (−0.36, −0.52), (0.36, −0.52), (0, −0.40) | 5.2% |

**출발 칸(index 0, 1.4×1.4, 게이트 기둥 회피) 전용 표:**

| n | s | 슬롯 [k0 = 맨 앞] | 가림 | 기둥 여유 |
|---|---|---|---|---|
| 2 | 0.90 | (0.32, 0.15), (0.12, −0.46) | 0% | 0.17 |
| 3 | 0.85 | (0.15, 0.27), (−0.53, 0.01), (0.29, −0.46) | 0% | 0.07 |
| 4 | 0.85 | (0.28, 0.42), (−0.09, −0.53), (−0.55, 0.22), (0.46, −0.54) | 0% | 0.05 |
| 5 | 0.72 | (0.46, 0.37), (0.02, 0.15), (−0.58, −0.16), (−0.24, −0.57), (0.47, −0.57) | 0% | 0.10 |
| 6 | 0.68 | (0.51, 0.42), (−0.08, 0.09), (−0.57, 0.27), (−0.51, −0.42), (−0.03, −0.56), (0.37, −0.52) | 0% | 0.10 |
| 7 | 0.65 | (0.09, 0.48), (0.58, 0), (−0.24, −0.12), (−0.57, 0.23), (−0.59, −0.32), (0.02, −0.55), (0.45, −0.49) | 0% | 0.04 |
| 8 | 0.65 | (0.06, 0.49), (−0.06, −0.09), (−0.53, 0.42), (−0.45, −0.13), (−0.47, −0.57), (0, −0.56), (0.47, −0.55), (0.59, 0.40) | 0% | 0.03 |

검증 조건(모두 통과): 화면 6종(374×594 폰 세로 캔버스 실측, 390×844, 588×290 폰 가로 캔버스 실측, 844×390, 728×726, 728×644) × 16/20/24칸 × **모든 칸** × 지금 차례 포함/불포함. 머리 xz 중심 거리 ≥ 0.85·(r_i + r_j)(머리끼리 3D로 박히지 않음). 발자국 ≤ 0.63 < 0.89(= pitch 1.14 − 이웃 칸 절반 0.25). 출발 칸은 가장자리 ≤ 0.72, 기둥(r 0.09)과 몸 사이 여유 ≥ 0.03. [VERIFIED: 스크래치 vitest + three `Vector3.project`]

**알려진 한계:** 이웃한 두 칸에 **둘 다** 무리가 있으면 바깥 슬롯끼리 0.1~0.2만큼 가까워질 수 있다(드묾, D-19 범위 밖). 출발 칸 뒤쪽 슬롯은 아치 너머로 보이므로 갤러리 board 뷰 캡처로 아치 튜브가 얼굴을 가리지 않는지 확인한다.

### Pattern 8: 귀여움 규칙 — 구현 가능한 수치

1. **머리 젖히기(가장 중요):** 머리 그룹 `rotation.x = −HEAD_TILT`, `HEAD_TILT ≈ 0.6 rad`(갤러리에서 0.5~0.75로 조정). 카메라 피치가 50~60°라 0이면 얼굴이 화면 아래 띠로 납작해진다. 프로토타입에서 0.6이 폰 배율로 ^^ 눈·빨간 입·하이라이트를 구분하게 했다. 0.35는 부족했다. [VERIFIED: 헤드리스 렌더 비교 tilt 0 / 0.35 / 0.6 / 0.8] 결과적으로 아이가 카메라를 올려다보는 귀여운 자세가 된다.
2. **비율(D-03-1):** 머리 타원구 0.27 × (1.08, 0.94, 1.0), 중심 y 0.62 → 폭 0.583, 꼭대기 0.874. 몸 구 r 0.19 × (1, 1, 0.92), 중심 y 0.22 → 폭 0.38. 머리 폭/몸 폭 = 1.53(≥1.3), 머리 높이 비율 = (0.874−0.366)/0.874 = 58%(55~60%).
3. **눈(D-03-2):** 머리 로컬 (±0.105, −0.035) — 중심보다 아래, 간격 0.21(머리 폭의 36%). 잉크 타원 (0.05, 0.062, 0.025), 하이라이트 흰 구 r 0.02를 (+0.018, +0.025)에 둔다. 폰에서 눈 하나는 약 4 px이다. 그래서 하이라이트·^^ 호 굵기는 **튜브 ≥ 0.022**(≈1 css px)로 한다. 0.009 같은 가는 선은 폰에서 사라진다.
4. **볼(D-03-3):** (±0.185, −0.105)에 분홍 #FF9EC4(palette 신규, `SCENE_COLOR.cheek` #FF80B5보다 밝게) 납작 구 (0.05, 0.032, 0.012). 불투명하게 해 투명 정렬 문제를 없앤다.
5. **둥근 형태·짧은 팔다리(D-03-4):** 발 2개는 구 r 0.075 × (1, 0.6, 1.25), 위치 (±0.09, 0.045, 0.03). 팔은 캡슐 r 0.055, 길이 0.08, 어깨 피벗 (±0.15, 0.30, 0.02), 쉬는 자세는 바깥 아래로 ±0.45 rad.
6. **재질(D-03-5):** 공유 `MeshStandardMaterial({ vertexColors: true, color: white, roughness: 0.32, metalness: 0.05 })`. `<Canvas flat>`과 기존 `LIGHTS`(hemi 1.4 / key 1.6 / rim 0.5)를 유지한다. MeshToonMaterial은 판의 광택 장난감 느낌과 달라져 쓰지 않는다. fresnel `onBeforeCompile`은 갤러리 검토에서 밋밋할 때만 고려하는 폴리시 옵션이다(테스트 불가, 기본은 쓰지 않음).
7. **외곽선:** 같은 지오메트리에 감은 방향을 뒤집은 hull(1.03~1.05배, 잉크 #173A57, 법선 반전)을 넣는다 → 추가 드로우콜 0. 프로토타입에서 몸통 hull 1.06은 머리 아래로 두꺼운 남색 띠가 되어 보기 나빴다. **머리·귀 1.04~1.05, 몸통은 없거나 1.03**에서 시작해 갤러리에서 조정한다. 흰 토끼가 크림색 트랙·이벤트 윗면에서 묻히지 않게 하는 데 특히 필요하다.
8. **바닥 원판(D-18):** 참가자 색 원판 + 잉크 테두리로, 작은 크기에서도 누구인지 보이게 한다(흰 토끼·크림 칸 대비).

### 종별 부품표 (머리 로컬 = 머리 중심 원점, 머리 반지름 a=0.292(x), b=0.254(y), c=0.27(z))

| 종 | 머리 메시에 병합(정적) | 귀 메시(흔들림) | 몸통에 병합(꼬리 등) | 팔 | 얼굴 키트 |
|---|---|---|---|---|---|
| bear #9C6644 | 주둥이 구 r 0.09 × (1.25, 0.85, 0.7) 연갈색 #E8C9A0 at (0, −0.075, 표면−0.05), 코 잉크 r 0.03 | 둥근 귀 구 r 0.085 × (1, 1, 0.6) at (±0.20, 0.20, −0.02) + 안쪽 연갈색 r 0.05 | 배 패치 연갈색, 꼬리 구 r 0.05 at (0, 0.14, −0.18) | 몸색 캡슐 | ink 눈, 입=주둥이 앞 |
| rabbit #FFFFFF | 분홍 코 r 0.02 at (0, −0.06, 표면) | 긴 귀 캡슐 r 0.06 길이 0.22 at (±0.10, 0.36, −0.04), z ∓0.12 V자 + 안쪽 분홍 캡슐 × (1, 1, 0.4) | 흰 솜꼬리 구 r 0.07 at (0, 0.12, −0.19) | 흰 캡슐 | ink 눈, 입=평면 |
| cat #9A7DFF | 분홍 코 r 0.022 | 세모 귀 원뿔 r 0.085 h 0.15 at (±0.17, 0.25, 0), z ∓0.35 + 안쪽 분홍 원뿔 | 가는 꼬리 Torus(0.12, 0.028, 8, 16, 0.9π), 옆으로 감아 실루엣에 보이게 | 보라 캡슐 | ink 눈 |
| dog #1183D6 | 주둥이 연하늘 #EAF6FF 구 r 0.09 × (1.3, 0.8, 0.7), 큰 코 잉크 r 0.035 | 늘어진 귀 구 r 0.09 × (0.6, 1.3, 0.45) at (±0.27, 0.06, 0), z ±0.35, 진한 파랑 #0C5E9A | 짧은 꼬리 캡슐 r 0.035 길이 0.07, 위-뒤로 | 파랑 캡슐 | **sclera** 눈(흰자 + 잉크 동공) |
| panda 몸 #173A57 | **머리 흰색 #FFFFFF**, 눈 패치 잉크 구 r 0.07 × (0.85, 1.15, 0.35) at (±0.105, −0.03, 표면), z ±0.5(물방울 기울기), 코 잉크 r 0.025 | 잉크 둥근 귀 r 0.08 | 배 패치 흰색, 꼬리 잉크 r 0.045 | 잉크 캡슐 | **sclera** 눈(패치 위) |
| fox #FF9F1C | 흰 주둥이 구 r 0.11 × (1.4, 0.8, 0.6) at (0, −0.09, 표면−0.05), 코 잉크 r 0.025 | 뾰족 귀 원뿔 r 0.09 h 0.2, z ∓0.3 + 안쪽 크림 | **굵은 꼬리** 구 r 0.11 × (0.8, 0.8, 1.6) at (0.12, 0.16, −0.24), y 0.5 회전 + 흰 끝 r 0.07 | 주황 캡슐 | ink 눈, 입=주둥이 앞 |
| pig #FF80B5 | 납작 코 Cylinder r 0.075 h 0.06(+Z 향함) 진분홍 #F0609E at (0, −0.07, 표면), 콧구멍 잉크 2 r 0.016 × (1, 1.3, 0.4) | 작은 세모 귀 원뿔 r 0.07 h 0.1, z ∓0.5, x +0.4(앞으로 접힘) 진분홍 | 꼬불 꼬리 Torus(0.04, 0.012, 6, 12, 1.6π) | 분홍 캡슐 | ink 눈, 입=코 아래 (0, −0.165) |
| chick #FFCB2E | 부리 원뿔 r 0.05 h 0.08 주황 #FF9F1C, +Z 향함 at (0, −0.06, 표면) | **머리 깃털** 3가닥 캡슐 r 0.025 h 0.1 at (0, 0.27, 0), z −0.4/0/0.4 진노랑 #FFB020 | 꼬리 깃 원뿔 r 0.05 h 0.08 뒤-위 | **날개** 납작 구 r 0.08 × (0.5, 1, 0.9) | ink 눈, 입 없음(부리 고정; joy만 부리 아래 작은 빨간 반원 선택) |

`ANIMAL_EYE`(dog·panda = 흰색)는 그대로 두고 "sclera 스타일 필요" 신호로 해석한다(`ANIMAL_EYE[a] === '#FFFFFF'` → sclera). 이렇게 하면 `palette.test`의 `ANIMAL_EYE` 단언이 그대로 유지된다. 새 색(주둥이·안쪽 귀·코·부리·땀·입·반짝이·볼)은 `palette.ts`에 `CHAR_COLOR`로 추가하고 palette.test에 hex 고정 테스트를 추가한다.

### 표정 부품표 (머리 로컬, 눈 중심 E = (±0.105, −0.035), 입 M = 종별)

| 키 | 눈 | 입·기타 | 비고 |
|---|---|---|---|
| idle | 잉크 타원 (0.05, 0.062, 0.025) + 하이라이트 r 0.02 | 작은 ∪ 미소 Torus(0.024, 0.012, 8, 12, π) z π 회전 + 볼 | 깜빡임 대상 |
| idleBlink | 가로 캡슐 r 0.013 길이 0.07 | idle과 같음 | 120 ms |
| excited | 타원 ×1.1 + 하이라이트 r 0.026 + 작은 하이라이트 r 0.012 (−0.016, −0.022) | 작게 벌린 입: 아래 반원 Circle(0.032, 16, π, π) #C2304F + 볼 ×1.15 | 지금 차례 |
| excitedBlink | 캡슐 | excited 입 | |
| joy | **^^** Torus(0.044, 0.024, 8, 16, π)(∩ 모양) at E−(0, 0.012) | 크게 벌린 입 반원 r 0.05 #C2304F + 혀 분홍 반원 r 0.025 + 볼 ×1.2 | |
| sad | 타원 ×0.85, 0.01 아래 + 눈썹 캡슐 r 0.012 길이 0.06 at (±0.105, +0.05), 안쪽 끝이 올라가게 기울임 | ∩ 입 Torus(0.024, 0.012, π) + **땀방울** 하늘 #7FD3FF (구 r 0.03 + 원뿔 r 0.03 h 0.05) at (0.25, 0.12, 표면) | 깜빡임 대상 |
| sadBlink | 캡슐(아래로 휜 ∩ 작은 호도 가능) | sad와 같음 | |
| surprised | 둥근 눈 (0.058, 0.068) + 작은 하이라이트 r 0.014 + 올라간 눈썹 | **O 입** Torus(0.026, 0.013, 8, 16) 잉크 | |
| winner | joy 눈 | joy 입 + **반짝이 3개** 4각 별(Extrude) 금색 #FFCB2E 크기 0.06 at (−0.33, 0.18, 0.05), (0.34, 0.22, 0), (0.28, −0.12, 0.12) | 반짝이를 얼굴 지오메트리에 넣어 드로우콜 0 |

Torus `arc=π`는 +X에서 시작해 +Y를 지나 −X로 가는 ∩(아치)다. 그래서 그대로 쓰면 ^^ 눈이고, z축 π 회전하면 ∪ 미소다. `CircleGeometry(r, seg, π, π)`는 아래 반원(벌린 입)이다. [VERIFIED: three r186 TorusGeometry/CircleGeometry 생성식]

### Anti-Patterns to Avoid
- **표정마다 메시를 따로 두고 `visible` 토글:** 현재 드로우콜 테스트(`actors.test.tsx:357-366`)는 `traverse`로 **모든** 메시를 센다. 숨긴 메시도 예산을 잡아먹는다. 지오메트리 교체를 쓴다.
- **부품마다 재질 하나:** 재질 수만큼 드로우콜이 늘어난다. 버텍스 컬러로 묶는다.
- **꼬리를 따로 흔들기:** 101 드로우콜로 예산을 넘는다. 몸통 흔들림(lean/yaw)으로 꼬리가 같이 움직이게 한다.
- **3D 쪽에서 miss/win `completeBeat`:** 공동 우승자 중 누가 끝내야 하는지 모호하다. 캔버스가 없으면 +500 ms가 늦어진다. Banner 타이머가 끝낸다.
- **프레임마다 `set()`/`setState`:** Phase 6 원칙대로 ref만 바꾼다.
- **`new Color(hex)` 대신 hex/255로 버텍스 컬러:** 선형/sRGB가 섞여 palette 색과 달라진다.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 지오메트리 합치기 | 직접 Float32Array 이어 붙이기 | `mergeGeometries`(three addons) | 속성 검사·그룹·모프 처리가 들어 있다. 실패하면 null로 감지할 수 있다 |
| 기본 도형 | 직접 정점 생성 | Sphere/Capsule/Cone/Torus(arc)/Circle(theta)/Cylinder/Extrude | r186에 모든 형태가 있다(Torus `arc`, Circle `thetaStart/Length`) |
| 3D → 화면 투영(가림 테스트) | 직접 행렬 유도 | 테스트에서 three `PerspectiveCamera` + `Vector3.project` | Phase 6 fitCamera 테스트와 같은 방식이다. 테스트 파일은 소스 가드 대상이 아니다 |
| 헤드리스 캡처 | 새 devDependency 설치 | npx 캐시 Playwright + 캐시 Chromium `executablePath` | 이미 있고, SwiftShader WebGL 동작을 이번 세션에 확인했다 |
| 비트 길이·완료 | 캐릭터별 setTimeout | 비트 ms 데이터 + Banner 타이머 + 스토어 watchdog | Phase 6 교착 방지 계약 |

**Key insight:** 이 단계의 복잡성은 형태보다 **예산과 계약**에 있다. 7 드로우콜, 순수 비트, 완료 주체는 하나, 프레임에서는 ref만 바꾼다는 원칙이다. 이 틀을 지키면 종별 모양은 데이터 표(부품 목록)로 반복할 수 있다.

## Common Pitfalls

### Pitfall 1: 폰에서 얼굴이 안 보인다
**What goes wrong:** 정면(+Z)을 보는 얼굴이 50~60° 내려다보는 카메라에서 머리 꼭대기 아래로 숨는다. 폰 세로에서는 머리 폭이 17~26 px이다.
**Why:** 고정 쿼터뷰 카메라(Phase 6 D-09/D-10)와 작은 칸.
**How to avoid:** `HEAD_TILT ≈ 0.6 rad`, 머리 폭 ≈0.58(임시 말 0.32의 1.8배), 굵은 표정 부품(튜브 ≥0.022, 입은 빨간 면), 귀는 뒤로 기울여 얼굴을 가리지 않게 한다.
**Warning signs:** 갤러리 `board` 뷰 374×594 캡처를 4배 확대했을 때 idle과 joy가 구분되지 않는다.

### Pitfall 2: miss 비트가 기존 통합 테스트 6개 파일을 깨뜨린다
**What goes wrong:** ❌ 직후 재도전 카드·"아쉬워요!" 줄이 700 ms 동안 숨겨진다(HUD-03 규칙). stars 600→900, 라운드 종료 win 비트도 있다.
**Affected tests (확인함):**
- `src/game/director/timeline.test.ts:149`(stars ms 600), `:152`(fail+retry → "no beats"), `:158`(final fail → "no beats"), `:168`(gameEnded manual은 여전히 no beats — 유지하고 rounds-complete → win 테스트 추가), `:224-237` isBannerBeat 목록(miss/win을 `all`에 넣고 제외됨을 단언)
- `src/game/director/displayed.test.ts:145-147` 퍼즈 beat 종류 목록에 `'miss'` 추가(퍼즈는 gameOver 전환을 건너뛰므로 `'win'`은 나오지 않음)
- `src/game/director/useDirector.test.tsx:72-83` "no beats" 예시로 `judge(false)`를 쓴다 → miss가 생기므로 다른 무비트 전환(undo 또는 advance)으로 바꾸거나 `P().skipAll()`을 추가한다. rounds-complete → win 재생 테스트와 manual → skipAll 유지 테스트를 추가한다
- `src/game/stage.test.tsx:146-157` `advanceTimersByTime(600)` → `BEAT_MS.stars` 사용
- `src/game/hud/hud.test.tsx:175-186`(첫 ❌ 뒤 바로 카드 기대 → `settle()` 추가), `:263-279`(❌ 연타: 첫 클릭 뒤 카드가 언마운트되어 두 번째 클릭은 분리된 노드라 무시됨 — seq 단언은 유지. 이어서 `settle()` 후 버튼을 **다시 조회**해야 한다. 기존 `fail` 참조는 죽은 노드다)
- `src/App.test.tsx:84-99` 한 판 루프: `🏆 결과 보기` 뒤 win 비트 동안 버튼이 없다 → `settle()` 뒤 `게임 끝!`이 보이면 루프를 빠져나오도록 `if (screen.queryByText('게임 끝!')) break;`를 추가한다
**Not affected:** 비트 spec을 직접 만드는 테스트(`usePresentation.test.ts:14`, `labels.test.ts:305`, `hud6.test.tsx:130` 등 ms 600 리터럴)는 데이터일 뿐이라 통과한다. `BEAT_MS.finalRound === 1500` 단언(`timeline.test.ts:40`)도 그대로다.
**How to avoid:** 타임라인·디렉터·배너 변경과 이 테스트 수정을 **같은 플랜**에 넣어 플랜마다 CI(`tsc -b && vite build` + vitest)를 초록으로 유지한다.

### Pitfall 3: 출발 칸 게이트 기둥과 충돌
**What goes wrong:** 일반 칸 표를 출발 칸에 쓰면 앞 가운데 슬롯이 기둥 (−0.25, 0.53)에 박힌다.
**Why:** 게이트 중심 = 출발 칸 중심 + 0.2·(1,1)/√2, 기둥은 그 중심에서 ±0.55만큼 (1,−1)/√2 방향(`StartGate.tsx:12-26`). 출발 칸은 게임 시작 때 **모든 참가자**가 모이는 곳이라 가장 흔한 8마리 상황이다.
**How to avoid:** `pawnSlots`에서 타일 index 0은 출발 칸 전용 표를 쓴다(위 Pattern 7). 투영 테스트에 기둥 여유 단언을 넣는다. 아치 튜브와 얼굴이 겹치는지는 갤러리 board 뷰 캡처로 확인한다.

### Pitfall 4: 칸 위 떠 있는 별이 캐릭터 머리를 뚫는다
**What goes wrong:** 퀘스트 칸 별은 칸 윗면 + 0.55 높이에 진행 방향과 수직으로 0.3 간격으로 떠 있다(`Board.tsx:29-31,84-106`). 새 머리(중심 +0.62, 반지름 0.27)와 같은 높이다. 별 1개는 머리 속에 묻히고, 3개면 옆 별이 얼굴 앞이나 머리 옆으로 튀어나온다.
**How to avoid:** `Board`가 `displayed.positions`로 **사람이 서 있는 칸**의 별을 머리 위(윗면 + 1.2, 크기 0.75)로 올린다(권장 — 칸 종류 정보 유지). 대안은 그 칸만 별을 숨기는 것이다. 어느 쪽이든 UI-SPEC에서 확정하고 `board.test.tsx`에 단언한다. 왕관(머리 위 ≈0.9~1.0)과 겹치지 않게 1.2 이상으로 둔다.

### Pitfall 5: `mergeGeometries`가 조용히 null을 돌려준다
**What goes wrong:** indexed/non-indexed나 `uv` 유무가 섞이면 `console.error` 후 null → `mesh.geometry = null`로 크래시하거나 빈 메시가 된다.
**How to avoid:** 모든 부품을 `part()` 헬퍼(toNonIndexed + uv 삭제 + color 추가)로 통과시킨다. 지오메트리 테스트에서 8종 × 모든 노드 × 9개 얼굴이 non-null이고 속성 키가 정확히 `['position','normal','color']`인지 단언한다. `console.error` 스파이 0회도 단언한다.

### Pitfall 6: hull 외곽선이 내부 부품 주위에 잉크 띠를 만든다
**What goes wrong:** 배 패치·볼처럼 표면에 붙은 부품에 hull을 씌우면 얼굴·배 안에 잉크 원이 생긴다. 프로토타입에서 몸통 hull 1.06은 머리 아래에 굵은 남색 띠가 됐다.
**How to avoid:** hull은 실루엣 부품(머리·귀·팔·발·꼬리)에만 씌우고 두께는 1.03~1.05로 한다. 몸통은 갤러리에서 보고 결정한다.

### Pitfall 7: 드로우콜 예산을 숨긴 메시로 초과
**What goes wrong:** `visible={false}` 메시도 현재 테스트 카운터는 센다(`dest-ring`/`dest-cone`이 이미 2개).
**How to avoid:** 마리당 7메시를 구조로 고정하고, 표정·깜빡임은 지오메트리 교체로만 한다. 테스트는 그대로 둔다(보수적). 새 테스트로 "8마리 + 8왕관 + 링 ≤ 100" 및 "캐릭터 하나의 메시 ≤ 7(+링/왕관)"을 단언한다.

### Pitfall 8: 비트 경계에서 자세가 튄다
**What goes wrong:** Banner가 ms에 비트를 끝내는 순간 곡선이 REST가 아니면 점프 중인 캐릭터가 순간이동한다.
**How to avoid:** 모든 곡선 `pose(1) ≈ REST`(charMotion 테스트로 단언)이다. 비트가 먼저 끝나도 REST로 감쇠한다.

### Pitfall 9: reduced motion에서 miss/win이 0 ms가 되어 표정이 안 보인다
**How to avoid:** `motion()`을 miss/win에 적용하지 않는다(표정 비트). 테스트: `reducedMotion: true`에서도 miss 700 / win 1500이다.

### Pitfall 10: 슬롯 재배치로 미끄러짐
**What goes wrong:** 차례가 바뀔 때마다 같은 칸 무리에서 새 차례 캐릭터가 앞으로 나온다(D-17 의도). 기존 감쇠(12/s)로 약 0.3 s 미끄러진다.
**How to avoid:** 의도된 동작으로 둔다. hop 시작 위치는 `g.position`에서 복사하므로(현행) 미끄러지는 도중 hop이 와도 튀지 않는다.

### Pitfall 11: 갤러리가 프로덕션에 섞인다
**How to avoid:** 저장소 루트 `gallery.html`은 Vite dev 서버가 자동으로 서빙하지만 `vite build`의 기본 입력은 `index.html`뿐이다(**스크래치 Vite 8 프로젝트로 확인**: dev에서 `/x/gallery.html` 200, build 결과에 `gallery.html` 없음). `vite.config.ts`에 `rollupOptions.input`을 추가하지 않는다. 검증: 빌드 후 `dist/`에 gallery 산출물이 없음을 확인하고, 소스 가드에 "`src/main.tsx`/`src/App.tsx`가 gallery를 import하지 않음" 단언을 추가한다.

### Pitfall 12: 헤드리스 Chromium 버전 불일치
**What goes wrong:** npx 캐시 Playwright 1.64는 `chromium_headless_shell-1248`을 찾는데, 캐시에는 `-1228`만 있다 → "Executable doesn't exist".
**How to avoid:** `executablePath`에 `~/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`을 지정한다. 플래그는 `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`이다(이번 세션 동작 확인). `--use-gl=angle` 없이 2초만 기다리면 캔버스가 비어 있을 수 있다. 캡처 전에 4~6 s를 기다리거나 `window.__ready` 신호를 기다린다.

## Code Examples

### 버텍스 컬러 부품·hull·머리 표면 배치 (헤드리스 렌더로 동작 확인한 프로토타입 정리)

```ts
// src/game/scene/chibiParts.ts — lazy 3D 청크 (three import 허용)
import { BufferAttribute, Color, Euler, Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';

export const M = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0): Matrix4 =>
  new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromEuler(new Euler(rx, ry, rz)), new Vector3(sx, sy, sz));

// toNonIndexed + uv 제거 + 선형 버텍스 컬러(itemSize 3) → mergeGeometries가 항상 성공하는 형태.
export function part(src: BufferGeometry, hex: string, m?: Matrix4): BufferGeometry {
  const g = src.index ? src.toNonIndexed() : src.clone();
  g.deleteAttribute('uv');
  if (m) g.applyMatrix4(m);
  const c = new Color(hex); // 선형(working space) 값
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[3 * i] = c.r; a[3 * i + 1] = c.g; a[3 * i + 2] = c.b; }
  g.setAttribute('color', new BufferAttribute(a, 3));
  return g;
}

// 같은 드로우콜 안의 inverted hull: 중심 기준 확대 → 삼각형 감은 방향 뒤집기 → 법선 반전 → 잉크색.
export function hull(p: BufferGeometry, scale: number, inkHex: string): BufferGeometry {
  const h = p.clone();
  h.computeBoundingSphere();
  const c = h.boundingSphere!.center.clone();
  h.translate(-c.x, -c.y, -c.z).scale(scale, scale, scale).translate(c.x, c.y, c.z);
  const pos = h.attributes.position.array as Float32Array;
  const nor = h.attributes.normal.array as Float32Array;
  for (let i = 0; i < pos.length; i += 9) {
    for (let k = 0; k < 3; k++) {
      [pos[i + 3 + k], pos[i + 6 + k]] = [pos[i + 6 + k], pos[i + 3 + k]];
      [nor[i + 3 + k], nor[i + 6 + k]] = [nor[i + 6 + k], nor[i + 3 + k]];
    }
  }
  for (let i = 0; i < nor.length; i++) nor[i] = -nor[i];
  const ink = new Color(inkHex);
  const col = h.attributes.color.array as Float32Array;
  for (let i = 0; i < col.length; i += 3) { col[i] = ink.r; col[i + 1] = ink.g; col[i + 2] = ink.b; }
  return h;
}

// 머리 타원구(a,b,c) 앞 표면의 z (머리 로컬, 중심 원점). 얼굴 부품을 표면에 붙일 때 사용.
export const surfaceZ = (x: number, y: number, a: number, b: number, c: number, lift: number): number =>
  c * Math.sqrt(Math.max(0, 1 - (x / a) ** 2 - (y / b) ** 2)) + lift;
```

### Character 프레임 루프 골격 (Pawn hop 소비자 재사용 + 반응 적용)

```tsx
// src/game/scene/Character.tsx (요지) — 그룹 이름은 기존 테스트 재사용을 위해 유지: `pawn-${pid}`, `pawn-body`
useFrame((_, delta) => {
  const d = Math.min(delta, 0.25);
  const store = usePresentation.getState();
  const cur = store.current;
  // 1) hop 비트: Pawn.tsx:69-102 로직 그대로 + yaw = atan2(to.x - a.x, to.z - a.z)
  // 2) 반응
  const rx = reactionFor(pid, cur, isCurrent);
  if (rx.beatId !== actId.current) { actId.current = rx.beatId; actT.current = 0; }
  actT.current += d;
  const u = rx.ms > 0 ? Math.min(1, actT.current / (rx.ms / 1000)) : 0;
  const pose = reduced ? REST : poseFor(rx.act, u, clock.current, seed, isCurrent); // charMotion
  applyPose(refs, pose, d); // y/yaw/squash/headPitch/arms/ears — ref만 변경
  // 3) 표정(즉시) + 깜빡임
  const blink = (rx.expression === 'idle' || rx.expression === 'excited' || rx.expression === 'sad') && blinkClosed(clock.current, seed);
  const key = blink ? `${rx.expression}Blink` : rx.expression;
  if (key !== faceKey.current) { faceKey.current = key; face.current.geometry = faceGeo(animal, key as FaceKey); }
});
```

### 투영 가림 테스트 (스크래치에서 실행한 코드의 정리본)

```ts
// src/game/layout/slotOcclusion.test.ts — three는 테스트에서만 import (소스 가드는 *.test 제외)
import { PerspectiveCamera, Vector3 } from 'three';
import { fitCamera } from './fitCamera';
import { boardExtents, ringLayout, tileCenter, tileTop } from './ringLayout';
import { slotTable } from './pawnSlots';          // (n, isStart) → {s, slots}
import { HEAD_C_Y, HEAD_R } from './chibiDims';

const VIEWS = [[374, 594], [390, 844], [588, 290], [844, 390], [728, 726], [728, 644]] as const;
function lens(r1: number, r2: number, d: number): number {
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const a = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
  const b = r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
  return a + b - 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
}
it.each(VIEWS.flatMap(([w, h]) => [16, 20, 24].map((n) => [w, h, n] as const)))(
  'no face covered > 30%% at %ix%i, %i tiles', (w, h, n) => {
    const l = ringLayout(n);
    const fit = fitCamera(w / h, boardExtents(l));
    const cam = new PerspectiveCamera(fit.fov, w / h, 0.1, 200);
    cam.position.set(...fit.position); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    for (let i = 0; i < n; i++) for (let cnt = 2; cnt <= 8; cnt++) for (const cur of [true, false]) {
      const { s, slots } = slotTable(cnt, i === 0);
      const t = tileCenter(l, i), y0 = tileTop(i === 0 ? 'start' : 'quest');
      const discs = slots.map(([dx, dz], k) => {
        const sc = k === 0 && cur ? 1 : s;
        const p = new Vector3(t.x + dx, y0 + HEAD_C_Y * sc, t.z + dz);
        const q = p.clone().project(cam), e = p.clone().add(new Vector3(HEAD_R * sc, 0, 0)).project(cam);
        return { x: (q.x * w) / 2, y: (q.y * h) / 2, r: Math.hypot(((e.x - q.x) * w) / 2, ((e.y - q.y) * h) / 2), dist: p.distanceTo(cam.position) };
      });
      for (const A of discs) for (const B of discs) {
        if (A === B || A.dist >= B.dist) continue; // A가 더 가까움 → B를 가릴 수 있음
        expect(lens(A.r, B.r, Math.hypot(A.x - B.x, A.y - B.y)) / (Math.PI * B.r ** 2)).toBeLessThanOrEqual(0.3);
      }
    }
  });
```

### dev 전용 갤러리 진입

```html
<!-- gallery.html (저장소 루트) — dev 서버에서만: http://localhost:5173/monster-jump-rope-game/gallery.html -->
<!doctype html><html lang="ko"><head><meta charset="UTF-8" /><title>캐릭터 갤러리 (dev)</title></head>
<body><div id="root"></div><script type="module" src="/src/gallery.tsx"></script></body></html>
```

```tsx
// src/gallery.tsx — three는 직접 import하지 않는다(소스 가드 d). scene 모듈만 가져온다.
import { createRoot } from 'react-dom/client';
import CharacterGallery from './game/scene/CharacterGallery';
createRoot(document.getElementById('root')!).render(<CharacterGallery />);
```

`CharacterGallery`의 뷰(쿼리 파라미터):
- `?view=grid` — 8종(열) × 9개 얼굴 키(행), 카메라 피치 55°, `<Canvas flat>` + 같은 `LIGHTS`
- `?view=board` — 실제 `SceneContents`, 24칸, 출발 칸 8마리 + 다른 칸 2마리, 374×594 뷰포트로 폰 배율 확인
- `?view=act&act=success|slump|cheer|surprise` — 큐에 비트를 반복 재생해 동작 확인
- 캡처가 끝났다는 신호로 `window.__ready = true`를 둔다

### 헤드리스 캡처 (일회용, 스크래치패드에 두고 커밋하지 않음)

```js
// 이번 세션에 실제로 동작한 설정
import { chromium } from '/Users/simkoon/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const browser = await chromium.launch({
  executablePath: `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 374, height: 594 }, deviceScaleFactor: 1.5 });
await page.goto('http://localhost:5173/monster-jump-rope-game/gallery.html?view=board');
await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 });
await page.screenshot({ path: '<scratchpad>/gallery-board.png' });
await browser.close();
```

## Plan Decomposition (권장)

플랜마다 ≤3 태스크, 대략 12파일 이하. 플랜 하나가 끝날 때마다 `npm run build`(`tsc -b`가 테스트까지 타입 검사)와 `npx vitest run`이 초록이어야 한다.

| Wave | Plan | 내용 | 주요 파일 | 의존 |
|---|---|---|---|---|
| 1 | **07-01 반응 비트·디렉터·배너** | T1(TDD): timeline miss/win/stars 900/isTimedBeat + 테스트. T2: useDirector manual 분기 + Banner 시간 비트 완료(+win 배너 문구는 UI-SPEC대로) + GameStage onEndNow(gameOver → skipAll). T3: 깨지는 통합 테스트 수정(Pitfall 2 목록) | timeline.ts, timeline.test.ts, displayed.test.ts, useDirector.ts, useDirector.test.tsx, Banner.tsx, hud6.test.tsx, labels.ts(+test), GameStage.tsx, stage.test.tsx, hud.test.tsx, App.test.tsx | — |
| 1 | **07-02 순수 배치·치수·동작 곡선** | T1(TDD): chibiDims + pawnSlots v2(표, currentId, 출발 칸 표) + pawnSlots.test 재작성. T2(TDD): slotOcclusion.test(투영) + SceneContents에 currentId 전달. T3(TDD): charMotion 곡선 + 테스트 | layout/chibiDims.ts, layout/pawnSlots.ts(+test), layout/slotOcclusion.test.ts, layout/charMotion.ts(+test), scene/SceneContents.tsx | — |
| 2 | **07-03 치비 지오메트리·얼굴·모델** | T1: chibiParts 헬퍼 + palette CHAR_COLOR(+test). T2: chibiSpecies 8종 정적 노드 + chibiFaces 9개 키 + 노드 테스트(null 없음·속성 키·루브릭 수치·메시 ≤7). T3: ChibiModel(보이기만, ref 노출) | scene/chibiParts.ts, scene/chibiSpecies.ts, scene/chibiFaces.ts, scene/ChibiModel.tsx, scene/chibi.test.ts(node env), palette.ts, palette.test.ts | 07-02(치수) |
| 3 | **07-04 Character로 교체** | T1(TDD): director/reaction.ts + 테스트. T2: Character.tsx(hop 재사용 + 반응·깜빡임·방향) + SceneContents 교체 + 왕관/링 win 처리, Pawn.tsx 삭제, actorGeometries 정리. T3: actors.test 갱신(hop 테스트 이식, stars→joy+회전, miss→sad, win→공동 우승 모두 winner, 숨쉬기 ≤2%, reduced motion 정지, 예산 ≤100) | director/reaction.ts(+test), scene/Character.tsx, scene/SceneContents.tsx, scene/actorGeometries.ts, scene/Pawn.tsx(삭제), scene/actors.test.tsx | 07-01, 07-02, 07-03 |
| 3 | **07-05 갤러리·별 들어올리기·자체 점검** | T1: gallery.html + src/gallery.tsx + CharacterGallery(grid/board/act) + 소스 가드 단언(메인이 gallery를 import하지 않음). T2: Board 사람 있는 칸 별 들어올리기 + board.test. T3: 헤드리스 캡처로 D-03 루브릭 점검(필요하면 치수·HEAD_TILT·hull 조정) + 단계 끝 UAT 항목 기록(D-24 + Phase 6 남은 실기기 8개) | gallery.html, src/gallery.tsx, scene/CharacterGallery.tsx, scene/Board.tsx, scene/board.test.tsx, sourceGuard.test.ts | 07-03 (Character와 병렬 가능; board 뷰는 07-04 뒤가 정확) |

참고: 07-05 T3의 board 뷰 캡처는 Character 교체(07-04) 뒤에 의미가 있다. 07-05를 07-04 뒤(Wave 4)에 두거나 T3만 마지막에 실행한다. UI-SPEC(`ui_phase: true`)이 이 연구의 수치(HEAD_TILT, 색, win 배너 문구, 별 들어올리기 방식)를 먼저 확정한다.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `BufferGeometryUtils.mergeBufferGeometries` | `mergeGeometries` (`three/addons/utils/BufferGeometryUtils.js`) | three r151대 이름 변경 | 새 이름만 쓴다(프로젝트가 이미 사용 중) |
| `THREE.Clock` | `THREE.Timer` | r18x에서 deprecated 경고 | 프로젝트 콘솔에 경고가 보이지만(R3F 내부) 기능 영향 없음 [VERIFIED: 헤드리스 콘솔] |
| 별도 BackSide 외곽선 메시 | 같은 지오메트리 안 감은 방향 뒤집은 hull | — | 드로우콜 0 추가 |

**Deprecated/outdated:** 이번 단계에서 새로 쓰는 API 중 deprecated는 없다.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `HEAD_TILT ≈ 0.6 rad`가 8종 모두에서 귀엽고 읽힌다(곰 한 종으로만 확인) | Pattern 8 | 종마다 귀·주둥이 때문에 0.5~0.75로 다를 수 있다 → 갤러리에서 조정(전역 값 하나 권장) |
| A2 | 폰에서 표정 6종이 "식별 가능"(D-03-6/D-24③) | Pitfall 1 | 머리 17~26 px라 ^^/O/땀방울의 미세 차이는 약할 수 있다. 배너·동작이 보조하고, 최종은 사람 확인 |
| A3 | win 비트에 배너 문구를 두는 것이 낫다 | Pattern 5 | UI-SPEC 결정 사항. 없어도 기능상 문제 없음 |
| A4 | 사람 있는 칸 별은 숨기기보다 들어올리기가 낫다 | Pitfall 4 | 시각 취향. 둘 다 구현 비용이 비슷하다 |
| A5 | 종별 부품 치수표가 "기본 도형 쌓기 견본보다 확실히 귀엽다" | 종별 부품표 | 귀여움은 주관적이다. 단계 끝 UAT ①에서 확인 |
| A6 | 이웃 두 칸에 동시에 무리가 있을 때의 근접은 무시해도 된다 | Pattern 7 | 드물지만 생기면 머리가 겹친다. 필요하면 진행 방향 오프셋을 줄인 변형 표를 만든다 |

## Open Questions (RESOLVED)

> 세 질문 모두 07-UI-SPEC.md에서 확정했다(사용자 위임, [자동 선택]). 아래 각 항목의 RESOLVED 줄이 최종 결정이다.

1. **win 배너 문구와 이름 표시** — **RESOLVED** (UI-SPEC §C7(d)): 금색 `win` 배너 `🏆 우승!` / `🏆 공동 우승!` + 우승자 동물 이모지 줄, 이름 없음, 1500 ms.
   - What we know: 결과 화면이 바로 이어서 우승자를 보여 준다(ResultView).
   - What's unclear: 1.5 s 동안 배너 "🏆 우승!"만 둘지, 이모지+이름까지 넣을지.
   - Recommendation: UI-SPEC에서 `🏆 우승!`(이름 없음) + 작은 배너로 확정. 이름을 넣는다면 JSX 텍스트로.
2. **출발 칸 아치가 뒤쪽 캐릭터 얼굴을 가리는지** — **RESOLVED** (UI-SPEC §C6 "출발 아치 가림"): 갤러리 보드 보기로 확인하고, 30% 넘게 가려지는 슬롯만 +z로 최대 0.10 당긴 뒤 표와 테스트에 고정한다(기둥 여유 ≥ 0.03, 아치는 그대로).
   - What we know: 기둥 충돌은 표로 해결했다.
   - What's unclear: 아치 튜브(높이 0.7~1.34)가 투영상 뒤쪽 슬롯 얼굴과 겹치는지.
   - Recommendation: 07-05 board 뷰 캡처로 확인하고, 문제가 있으면 출발 표의 뒤쪽 슬롯을 앞으로 당긴다(테스트로 고정).
3. **병아리 입 표정** — **RESOLVED** (UI-SPEC §C3 "병아리 입"): 평소 입 없음, joy·winner에서 부리 아래 (0, −0.13) 반원 r 0.03, surprised에서 O 입 Torus(0.018, 0.012).
   - What we know: 부리가 머리 메시(정적)에 있다.
   - Recommendation: joy/winner/surprised에서만 부리 아래 작은 빨간 반원/O를 얼굴 지오메트리에 넣는다. 갤러리에서 판단한다.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | 빌드·테스트 | ✓ | 22.23.1 | — |
| vitest + jsdom + test-renderer | 순수·씬 테스트 | ✓ | 3.2.4 / 27 / 9.1.1 | — (현재 925 통과) |
| Vite dev 서버 | 갤러리 | ✓ | 8.1.5 | — |
| Playwright(npx 캐시) | 헤드리스 캡처(D-23) | ✓ | 1.64.0 | 버전에 맞는 브라우저 없음 → `executablePath`로 캐시 headless shell 1228 지정(동작 확인) |
| Chromium headless shell + SwiftShader | WebGL 캡처 | ✓ | 1228 | `--use-gl=angle --use-angle=swiftshader` 필수 |
| Pillow(python3) | 캡처 확대·자르기(선택) | ✓ (`python3`, `-I` 없이) | 11.3.0 | 원본 PNG로 판단 |

**Missing dependencies with no fallback:** 없음.
**Missing dependencies with fallback:** Playwright 기본 브라우저(1248)는 없지만 캐시된 1228로 대체한다.

## Validation Architecture

`workflow.nyquist_validation: false`이므로 이 절은 생략한다. 테스트 전략은 Plan Decomposition의 TDD 항목과 Pitfall 2 목록을 따른다.

## Security Domain

`security_enforcement: true`, ASVS L1.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | 로그인 없음 |
| V3 Session Management | no | — |
| V4 Access Control | no | 단일 기기 로컬 앱 |
| V5 Input Validation | yes(제한적) | 새 입력 없음. win 배너에 참가자 이름을 넣으면 JSX 텍스트로만 렌더한다(`dangerouslySetInnerHTML` 금지, Phase 6 T-06-08 패턴) |
| V6 Cryptography | no | — |
| V14 Configuration | yes | dev 갤러리가 프로덕션 빌드에 들어가지 않음(빌드 산출물 확인 + 소스 가드), `src/game` 원격 URL 금지 가드 유지 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 이름 문자열 XSS(배너) | Tampering | JSX 텍스트 렌더, 테스트로 `<b>x</b>`가 글자로 보이는지 단언(기존 hud6 패턴) |
| 연출 교착(새 비트가 끝나지 않아 버튼 영구 숨김) | Denial of Service | 비트별 watchdog(ms+500) + Banner 타이머 + `skipAll` 경로(숨은 탭, 화면 다시 그리기, 지금 끝내기) |
| dev 전용 화면 노출 | Information Disclosure | `gallery.html`은 build 입력이 아님(검증됨). `rollupOptions.input` 추가 금지 |
| 외부 리소스 로드 | Tampering | 모델·텍스처·폰트 없음. 소스 가드 (a)(b)(c) 유지 |

## Sources

### Primary (HIGH confidence)
- 레포 소스: `src/game/scene/Pawn.tsx`, `actorGeometries.ts`, `SceneContents.tsx`, `Board.tsx`, `StartGate.tsx`, `GameCanvas.tsx`, `director/timeline.ts`, `director/useDirector.ts`, `director/displayed.ts`, `usePresentation.ts`, `hud/Banner.tsx`, `labels.ts`, `GameApp.tsx`, `GameStage.tsx`, `layout/pawnSlots.ts`, `layout/fitCamera.ts`, `layout/ringLayout.ts`, `palette.ts`, `engine/state.ts`, `engine/game.ts`, `sourceGuard.test.ts`, 영향받는 테스트 파일들
- `node_modules/three` 0.186.1: `examples/jsm/utils/BufferGeometryUtils.js`(mergeGeometries 제약), `src/renderers/WebGLRenderer.js:1862`(visible=false 건너뜀), `src/renderers/webgl/WebGLPrograms.js:311`(vertexAlphas), 지오메트리 생성자 시그니처, `package.json` exports
- 로컬 실행: vitest 전체 44파일/925테스트 통과, 스크래치 vitest로 메시 수(28/93), 화면 픽셀 크기, 슬롯 투영 가림·3D 간격·기둥 여유 계산, node로 Color 선형값·index 여부
- 헤드리스 Chromium(SwiftShader): 실제 무대 캔버스 크기(374×594, 588×290), 곰 프로토타입 tilt 비교 렌더
- 스크래치 Vite 8 프로젝트: 추가 HTML이 dev에서는 서빙되고 build에는 들어가지 않음

### Secondary (MEDIUM confidence)
- Phase 6 문서: `06-CONTEXT.md`, `06-UI-SPEC.md` §S2, `06-RESEARCH.md` Pattern 4 / Pitfall 11, `06-VERIFICATION.md`

### Tertiary (LOW confidence)
- 귀여움·표정 가독성 판단(곰 1종 프로토타입 기준) — 사람 확인 필요

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 새 패키지 없음, 설치 버전 확인
- Architecture(비트·디렉터·배너·순수 모듈): HIGH — 소스와 테스트를 직접 읽고 영향 범위 확인
- 드로우콜·슬롯·투영 수치: HIGH — 로컬 계산으로 검증
- 캐릭터 치수·표정 부품·귀여움: MEDIUM — 곰 프로토타입 렌더로 방향 확인, 나머지 7종은 표 기반 추정
- Pitfalls: HIGH(테스트 영향·게이트·별 충돌·빌드 분리) / MEDIUM(폰 가독성)

**Research date:** 2026-10-23
**Valid until:** 2026-11-22 (스택 고정, 코드베이스 변경이 없으면 유효)
