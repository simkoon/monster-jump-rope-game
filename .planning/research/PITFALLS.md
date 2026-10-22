# Pitfalls Research

**Domain:** 기존 2D 줄넘기 보드게임(헤드리스 엔진 + Zustand 브리지 + ANIM_DONE 게이트 + 영속 ContentSchema v1)에 **3D R3F 순환판 · 코드 생성 치비 캐릭터 · 퀘스트 성공 연출 · 별/라운드/실패 규칙 · 스키마 변경**을 추가하는 마일스톤(v2.0)
**Researched:** 2026-10-22
**Confidence:** HIGH (코드베이스 직접 확인 항목 + zustand persist 소스 확인) / MEDIUM (iOS Safari WebGL 동작, R3F 세부 동작 — 커뮤니티·버그트래커 교차 확인) / LOW 항목은 본문에 따로 표시

> **v1에서 이미 배운 것 (반복 금지):**
> - v1 Phase 3 lbq 퀵태스크에서 **watchdog 예산에 `PREVIEW_S`를 빠뜨려** 토큰이 아직 움직이는데 컨트롤과 승리 화면이 먼저 뜨는 버그가 있었다. v2는 연출 비트가 훨씬 많아 같은 실수가 더 쉽게 난다 (Pitfall 4).
> - v1 Phase 3.1 반려 사유는 스타일이 아니라 **정보 설계 실패**였다(방향·결승·순위·남은 거리가 안 읽힘). 3D로 돌아가면 원근 때문에 이 문제가 더 심해진다 (Pitfall 9).
> - v1 Phase 4.1의 iPhone 검증은 **Chrome CDP 에뮬레이션**이었고 실제 iPhone Safari UAT는 하지 않았다. 에뮬레이션은 Safari WebGL의 컨텍스트 손실·메모리 한계를 재현하지 못한다 (Pitfall 5, 15).
> - v1의 GPU 메모리 누수 UAT(5판 연속 `gl.info.memory`)는 **결국 수행되지 않았다**(status: unknown). v2에서는 사람 손 UAT에만 맡기지 말고 자동화해야 한다 (Pitfall 6).

---

## Critical Pitfalls

### Pitfall 1: 스키마 버전을 올리는 순간 강사의 v1 콘텐츠가 시드로 덮어써진다

**What goes wrong:**
v2에서 퀘스트 칸·실패 규칙·라운드 수 같은 새 필드를 `ContentSchema`에 넣으면서 `SCHEMA_VERSION = 2`로 올린다. 그러면 강사 기기에서 앱을 처음 여는 순간:
1. zustand `persist`가 저장된 version(1)과 현재 version(2)이 다르니 `migrate`를 부른다. 지금 `src/store.ts`의 `migrate`는 `(persisted) => persisted as Content`로, **아무것도 변환하지 않는다**.
2. 그 결과가 `merge`로 넘어가는데, `merge`는 `ContentSchema.safeParse`를 하고 `version: z.literal(SCHEMA_VERSION)`이 이제 `2`라서 **실패**한다. 실패하면 `current`(=시드)를 반환한다.
3. zustand persist는 migrate가 실행되면 **곧바로 `setItem()`으로 `partialize(get())`을 새 version과 함께 저장**한다 (zustand `persist.ts` 소스에서 확인). 이 시점의 상태는 시드다.

결과적으로 **강사가 직접 만든 미션·이벤트가 경고 없이 영구 삭제되고 시드로 덮어써진다.** 동시에 `src/lib/io.ts`의 가져오기도 `ContentSchema.safeParse`로 `version: 1` 파일을 거부하므로, 강사가 예전에 백업한 JSON 파일로도 복구할 수 없다("형식/버전이 맞지 않아요"). 이 프로젝트의 핵심 가치를 정면으로 깨는 실패다.

**Why it happens:**
v1은 버전이 하나뿐이어서 identity `migrate`와 literal 검증이 안전했다. 개발자 기기에서는 시드로 테스트하거나 localStorage를 지운 상태로 테스트하므로, "v1 데이터가 있는 상태에서 v2 앱을 연다"는 시나리오를 한 번도 실행해 보지 않는다. `z.literal(SCHEMA_VERSION)`은 상수를 따라 자동으로 바뀌기 때문에 상수 하나만 고쳐도 위의 연쇄가 일어난다.

**How to avoid:**
- **콘텐츠 스키마를 올리지 않는 쪽을 먼저 검토한다.** 실패 규칙, 라운드/시간 제한, 보드 크기, 연출 길이 같은 *게임 규칙 설정*은 콘텐츠(미션·이벤트)가 아니다. 별도 persist 키(예: `powerjumping_settings_v1`)나 `GameConfig`(시작 화면)에 두면 `ContentSchema`는 v1 그대로 갈 수 있다.
- 꼭 올려야 한다면:
  - `ContentSchemaV1`은 **지우지 말고 그대로 남긴다**. `ContentSchemaV2`를 새로 만들고, `parseAnyContent(raw)` = `version` 기준 `z.discriminatedUnion` → `upgradeV1toV2()` 경로를 하나 만들어 **persist `migrate`와 JSON 가져오기가 같은 함수를 쓰게** 한다.
  - `migrate`는 실제로 v1을 v2로 바꿔야 한다. `merge`가 실패했을 때 시드가 저장소에 써지는 경로를 막는다: 마이그레이션 전에 원본 문자열을 `powerjumping_content_v1_backup` 키로 복사해 두고, 검증이 실패하면 저장하지 말고 사용자에게 알린다.
  - persist `name`(`powerjumping_content_v1`)은 **절대 바꾸지 않는다**. 키 이름을 바꾸면 기존 데이터가 고아가 된다(이름의 `_v1`은 스키마 버전과 상관없다는 주석을 달아 둔다).
  - 내보내기 파일은 v2로 쓰고, 가져오기는 v1과 v2를 모두 받는다.
- **스키마를 바꾸기 전에 지금 v1 형태의 픽스처를 커밋해 둔다**: (a) 실제 localStorage 원문(`{"state":{...},"version":1}`), (b) 실제로 내보낸 `파워점핑-콘텐츠.json`. 이 두 픽스처로 "v2 앱이 v1 데이터를 읽은 뒤 미션 수가 같다", "v1 파일을 가져올 수 있다"를 테스트한다.

**Warning signs:**
- `SCHEMA_VERSION`을 바꾸는 diff에 `migrate` 본문 변경이 없다.
- 스토어 테스트가 모두 시드나 빈 저장소에서 시작한다.
- 업데이트 후 첫 실행 콘솔에 `storage rehydrate failed; using seed` 경고가 뜬다(merge 실패는 이 경고조차 안 뜰 수 있다는 점에 주의).

**Phase to address:**
엔진/규칙 재설계 단계의 **가장 첫 작업**에서 처리한다. "설정은 별도 키, 콘텐츠 스키마는 가능하면 v1 유지"를 결정하고, 픽스처 기반 마이그레이션 테스트를 먼저 깐 다음 엔진을 건드린다.

---

### Pitfall 2: 순환판 수학 — 경계 오프바이원, 음수 모듈로, 출발 칸 보너스 이중 지급, v1 결승 로직 잔재

**What goes wrong:**
v1 엔진과 표시 계층은 "0 → boardLength 결승"인 **직선 보드**를 전제로 만들어졌다. 이 코드를 그대로 두거나 조금만 고치면 다음 버그가 생긴다.
- `src/engine/engine.ts` `rollDice`의 `if (afterRoll >= boardLength) → gameOver`가 남아 있으면 **한 바퀴를 돌자마자 게임이 끝난다**.
- `placeEvents`는 `boardLength + 1` 길이 배열을 만들고 결승 칸(boardLength)을 비워 둔다. 순환판에서는 칸 N과 칸 0이 같은 칸이므로 **유령 칸이 하나 생기거나**, 칸 수가 N+1개로 렌더링된다.
- `endGame`은 `max(position)`으로 승자를 정한다. v2 승리 조건은 별 최다이므로, 이 함수를 그대로 쓰면 **가장 멀리 간 사람이 이긴다**.
- `src/game/animation.ts`의 `clampSquare`/`buildDisplayMovePath`는 경로를 `[0, boardLength]`로 자른다. 출발 칸을 넘어가는 이동이 **끝 칸에 멈춰 있다가 순간이동**한다.
- 뒤로 가기 이벤트나 실패 규칙으로 출발 칸을 거꾸로 넘을 때 `(-2) % 20 === -2`(JS 나머지는 부호를 유지함)이 되어 배열 인덱스가 `undefined`가 된다.
- 출발 칸 통과 보너스 이중 지급이 여러 경로로 생긴다:
  - 주사위 이동으로 출발 칸을 지나고, 같은 턴의 앞으로 N칸 이벤트로 **또 지났다**고 판정된다.
  - "출발 칸에 정확히 도착"을 도착 보너스와 통과 보너스로 **둘 다** 센다.
  - 뒤로 가서 출발 칸을 넘었다가 다음 턴에 앞으로 다시 넘으면 **같은 바퀴에 보너스를 두 번** 받는다.

**Why it happens:**
v1 위치(`position`)는 "위로 무한, 클램프 없음"이었다(D-03). 이 값을 `% N`만 해서 쓰면 바퀴 수, 통과 여부, 역방향을 각 호출부가 따로 추론하게 된다. 랜덤 이동이라 수동 플레이 테스트로는 경계 사례가 거의 나오지 않는다.

**How to avoid:**
- 순환 이동은 **순수 함수 하나**로 모은다: `moveOnLoop(fromTile, steps, N) → { toTile, path: number[], passedStart: boolean, landedOnStart: boolean }`. 엔진, 하이라이트, 토큰 경로가 모두 이 함수의 `path`를 쓴다. 모듈로는 반드시 `((x % N) + N) % N`로 계산한다.
- 상태에는 `tile`(0..N-1)과 함께 **`lapsCredited`(보너스를 받은 바퀴의 최고 기록)**를 둔다. 보너스는 `현재 바퀴 > lapsCredited`일 때만 주고, 주면 즉시 기록을 갱신한다. 뒤로 갔다가 다시 넘어도 중복 지급되지 않는다.
- 정책을 표로 정해 두고 테스트로 고정한다: "정확히 도착 = 통과 1회", "뒤로 넘기 = 보너스 없음", "이벤트 이동으로 넘기 = 지급(턴당 최대 1회)".
- v1 결승 관련 코드(`reached-finish`, `afterRoll >= boardLength`, `max(position)` 승자, `clampSquare`, 이벤트 배치의 결승 칸 제외)를 **목록으로 만들어 하나씩 지운다**. `EndReason`에서 `'reached-finish'`를 빼면 TypeScript가 남은 호출부를 찾아 준다.
- 전수 테스트: 모든 `fromTile`(0..N-1) × 주사위 1..6 × 이벤트 ±1..20 조합에서 `toTile ∈ [0, N)`, `path.length === |steps|`, 보너스는 최대 1회임을 단언한다. 조합이 수천 개 수준이라 금방 끝난다.

**Warning signs:**
- 한 바퀴를 돌면 게임이 끝나거나 결과 화면이 뜬다.
- 보드에 칸이 N+1개 그려진다(출발 칸 옆에 빈 칸이 하나 더 있다).
- 토큰이 코너나 출발 칸에서 대각선으로 가로지르거나 순간이동한다.
- 콘솔에 `Cannot read properties of undefined` (`boardEvents[-k]`)가 찍힌다.

**Phase to address:**
엔진/규칙 재설계 단계. 3D 보드 렌더링보다 **먼저** 순수 함수와 전수 테스트를 끝낸다. 렌더러는 `path`만 소비한다.

---

### Pitfall 3: 라운드/턴 카운팅 버그 — 한 번 더, 팀 모드, 실패 규칙, 시간 종료가 겹칠 때

**What goes wrong:**
"정해진 라운드 후 별 최다 승리"인데 라운드 수가 틀린다.
- "한 번 더" 이벤트도 `advanceTurn`을 거치므로, `advanceTurn` 호출 수로 턴을 세면 **추가 턴이 정규 턴으로 계산**되어 그 플레이어만 일찍 끝나거나 라운드가 빨리 끝난다.
- 팀 모드에서 멤버 로테이션(`memberTurnIndex`)을 턴으로 세면 3명 팀은 라운드가 3배 느려진다. 반대로 팀 턴을 세면서 멤버 수가 다른 팀 사이의 공정성을 놓친다.
- v1 `judge(false)`는 내부에서 바로 `advanceTurn`을 부른다. v2에서 실패 규칙(재도전, 뒤로 N칸, 별 없음 등)을 추가하면 **턴 종료 경로가 여러 개**로 갈라지고, 그중 하나에서 라운드 증가를 빠뜨리거나 두 번 한다.
- 마지막 라운드의 마지막 플레이어가 "한 번 더"를 받았을 때 추가 턴을 하는지 정의되지 않아 게임이 그냥 끝나거나 한 턴 더 진행된다.
- DOM 카운트다운(`PlayView`의 `setInterval`)이 0이 되면 **턴 중간에** `end('timeout')`을 부른다. 아이가 줄넘기를 하고 있거나 성공 연출이 재생 중일 때 결과 화면으로 넘어가고, 앞 순번 플레이어가 한 턴 더 한 상태로 끝나 **불공정**해진다.

**Why it happens:**
"턴"과 "라운드"를 명확히 나누지 않은 채 카운터를 아무 데나 붙인다. 추가 턴, 팀, 시간 종료는 각각 드물게 일어나서 일반 플레이 테스트로는 조합이 거의 나오지 않는다.

**How to avoid:**
- 정의를 고정한다: **라운드 = 모든 참가자(팀이면 팀 단위)가 정규 턴을 한 번씩 마친 것.** 추가 턴은 라운드를 늘리지 않는다. 팀 멤버 로테이션은 표시용이고 라운드와 무관하다.
- 턴 종료는 **한 곳(`endTurn`)으로만** 들어가게 한다. 성공·실패·재도전 포기·추가 턴이 모두 이 함수를 거치게 하고, 라운드 증가는 `currentIndex`가 마지막에서 0으로 넘어가는 **비추가 턴 분기에서만** 한다.
- 종료 판정은 **라운드 경계에서만** 한다. 시간 종료는 즉시 끝내지 말고 `finalRound` 플래그만 세운 뒤 "이번 라운드까지 하고 끝" 처리하는 쪽을 추천한다. 강사에게는 "마지막 라운드!" 배너를 보여 준다. 즉시 종료를 고른다면 최소한 진행 중인 턴과 연출은 끝까지 마친다.
- 마지막 라운드의 추가 턴 정책(하게 한다/안 하게 한다)을 정하고 문서화한다.
- 시나리오 테이블 테스트로 고정한다: "3인, 2라운드, 2번 플레이어가 추가 턴 2회 → 정규 턴 6회 후 종료", "팀 2개(3명/1명), 라운드 2 → 팀 턴 4회", "실패 규칙별 1라운드 진행".

**Warning signs:**
- HUD의 "라운드 n/m"이 추가 턴 때 올라간다.
- 결과 화면에서 플레이어별 턴 수가 서로 다르다(턴 수를 디버그로 기록해서 확인).
- 시간 종료 직후 성공 연출이 끊기고 결과 화면이 뜬다.

**Phase to address:**
엔진/규칙 재설계 단계(라운드·실패 규칙·종료 조건). DOM 카운트다운과 종료 판정의 연결은 HUD/결과 단계에서 다시 확인한다.

---

### Pitfall 4: 애니메이션과 엔진 어긋남, busy 고착 — 연출 비트가 늘수록 watchdog과 완료 신호가 깨진다

**What goes wrong:**
v2 턴은 주사위 → 미리보기 → 이동(코너 회전 포함) → 도착 → 퀘스트 카드 → 판정 → 성공 연출(점프·회전·컨페티·별 버스트·링·큰 별) → 점수판 +1 → 배너로, v1보다 비트가 훨씬 많다. 여기서 나는 버그는 다음과 같다.
- **watchdog 예산 누락**: `PlayView`는 `DICE_S + PREVIEW_S + hops*HOP_S`를 손으로 더한다. 새 비트(코너 회전, 성공 연출, 별 비행)를 하나라도 빼먹으면 watchdog이 연출 도중에 `busy`를 풀고, 아이가 "다음"을 눌러 다음 턴이 시작되는데 화면에서는 컨페티가 계속 날린다. v1 lbq에서 `PREVIEW_S` 누락으로 **실제로 일어났던 버그**다.
- **오래된 완료 신호**: `usePresentation.signalAnimDone()`은 어느 애니메이션이 끝났는지 구분하지 않는다. watchdog이 강제로 풀었거나 사용자가 건너뛴 연출이 늦게 `onComplete`를 부르면 **다음 애니메이션의 busy를 일찍 풀어 버린다**.
- **별 지급이 연출 완료 콜백에 묶임**: "큰 별이 점수판에 도착하면 +1"을 `onComplete`에서 엔진에 반영하면, 연출을 건너뛰거나 watchdog이 발동하거나 탭이 백그라운드로 가서 rAF가 멈췄을 때 **별이 지급되지 않는다**.
- **정해진 흐름 밖의 언마운트**: v1 `GameApp`은 `gameOver && !busy`일 때 `PlayView`(=Canvas)를 언마운트한다. 시간 종료와 성공 연출이 겹치면 연출이 중간에 잘리거나, busy가 고착되어 결과 화면이 뜨지 않는다.
- **React StrictMode 이중 실행**: `main.tsx`는 `<StrictMode>`를 쓴다. 개발 모드에서는 연출을 시작하는 effect가 두 번 돌아 컨페티가 두 번 터지거나 watchdog이 두 번 걸린다. 그래서 "개발에서만 이상하다"며 무시하다가 진짜 버그를 놓친다.

**Why it happens:**
연출을 "엔진 상태의 결과를 그리는 것"이 아니라 "엔진 상태를 바꾸는 트리거"로 쓰기 시작하면 두 계층이 강하게 묶인다. 예산 합산이 데이터가 아니라 코드 곳곳의 산수로 흩어져 있어 비트를 추가할 때 놓친다.

**How to avoid:**
- **엔진이 권위다**: 별 지급, 보너스, 라운드 증가는 모두 `judge`/`roll` 전이 시점에 엔진에서 확정한다. 연출은 `engineStars`와 따로 `displayedStars`를 두고 연출이 끝나면 따라잡는다. 건너뛰거나 watchdog이 발동하거나 언마운트되면 즉시 `displayedStars = engineStars`로 맞춘다.
- **타임라인을 데이터로**: `CELEBRATION_TIMELINE = [{beat:'jump', ms:…}, …]` 같은 상수 배열을 두고 `budgetMs(timeline)`로 watchdog 예산을 계산한다. 비트를 추가하면 예산이 자동으로 늘어난다. 단위 테스트로 "예산 ≥ 모든 비트 합"을 단언한다.
- **애니메이션 ID 범위 지정**: `beginAnim(id)` / `signalAnimDone(id)`로 바꾸고, 현재 ID와 다른 완료 신호는 무시한다. watchdog도 ID를 가진다.
- **busy 해제와 장식 꼬리를 분리**: 컨페티가 떨어지는 꼬리 부분은 busy를 잡지 않는 비차단 장식으로 둔다. 컨트롤은 "점수판 +1"이 보이는 순간 돌아온다.
- 시간 종료/수동 종료는 엔진에 `pendingEnd`만 기록하고, 현재 연출이 끝나거나 건너뛴 뒤 결과로 전환한다.
- 누수와 이중 실행은 **프로덕션 빌드(`vite preview`)에서** 측정한다. StrictMode 때문에 effect가 두 번 돌아도 안전하도록(idempotent) 만든다.

**Warning signs:**
- 연출이 재생 중인데 "다음" 버튼이 보인다.
- 연출을 건너뛰면 점수판 숫자가 1 적다.
- 백그라운드에 갔다 오면 컨트롤이 영영 안 나오거나, 반대로 연출을 건너뛴다.
- watchdog 예산 계산식에 하드코딩된 덧셈이 있다.

**Phase to address:**
엔진/규칙 단계에서 "별은 엔진이 확정"을 계약으로 정한다. 3D 기반 단계에서 `usePresentation`을 ID 기반으로 확장한다. 성공 연출 단계에서 타임라인 데이터와 예산 함수를 도입한다.

---

### Pitfall 5: iOS Safari WebGL — 컨텍스트 손실, 메모리 상한, DPR 3

**What goes wrong:**
- 강사가 수업 중 iPhone/iPad에서 카메라나 카카오톡으로 잠깐 전환했다가 돌아오면 **캔버스가 검게 변하고 복구되지 않는다**. iOS 17 이후 Safari를 백그라운드로 보냈다 돌아올 때 WebGL 컨텍스트를 잃는 사례가 WebKit 버그와 three.js 포럼에 여러 번 보고됐다.
- iPhone은 DPR 3, 12.9" iPad Pro는 2732×2048이다. DPR을 제한하지 않거나 antialias, 후처리(블룸), 섀도맵까지 켜면 프레임이 급락하고 **탭 메모리 상한을 넘겨 탭이 리로드**된다. 정확한 상한은 공개되지 않았고 iOS 버전마다 다르다 (LOW: 구체 수치 미확인).
- 저전력 모드에서 Safari는 rAF를 **30fps로 제한**한다(WebKit이 의도한 동작). 프레임 기반 트윈이 절반 속도로 돈다 (Pitfall 7과 연결).
- 데스크톱 Chrome의 iPhone 에뮬레이션(v1 Phase 4.1 검증 방식)으로는 이 중 어느 것도 재현되지 않는다.

**Why it happens:**
WebGL 컨텍스트가 영구적이라고 가정한다. 개발자 노트북과 에뮬레이터에서만 확인한다. R3F 기본 `dpr`이 `[1, 2]`라 안전하다고 생각하지만, 2배만으로도 iPad 풀스크린은 픽셀이 수백만 개다.

**How to avoid:**
- 캔버스에 `webglcontextlost` 리스너를 달고 `event.preventDefault()`를 호출한다(그래야 `restored` 이벤트가 온다). 손실되면 DOM 오버레이로 "화면 다시 그리기" 큰 버튼을 띄우고, 누르면 `<Canvas key={n}>`로 리마운트한다. **게임 상태는 Zustand에 있으므로** 리마운트해도 진행이 유지된다. 이것이 "씬은 상태의 뷰"라는 원칙을 지켜야 하는 실질적인 이유다.
- `visibilitychange`로 숨겨지면 `frameloop`를 `"never"`로 바꾸고, 다시 보이면 복귀시킨다. 숨겨진 동안에는 연출 타이머도 일시정지하거나 즉시 완료 처리한다.
- `dpr={[1, 1.5]}`부터 시작하고, drei `PerformanceMonitor`로 프레임이 떨어지면 낮춘다. antialias는 DPR이 1.5를 넘으면 끈다. 섀도맵 대신 캐릭터 발밑에 블롭(원형 반투명 평면)을 쓰고, EffectComposer 후처리는 쓰지 않는다.
- **실제 iPhone + iPad Safari**에서 Web Inspector(맥 Safari 개발자 메뉴)로 확인하는 것을 각 시각 단계의 완료 조건에 넣는다. 확인 항목: 백그라운드 전환 후 복귀, 저전력 모드, 5판 연속 플레이.

**Warning signs:**
- 앱 전환 후 돌아오면 검은 캔버스만 보이고 DOM HUD만 살아 있다.
- iPad에서 "이 웹 페이지가 다시 로드되었습니다"가 뜬다.
- 저전력 모드에서 주사위나 토큰이 눈에 띄게 느리다.

**Phase to address:**
3D 기반(Canvas 셸) 단계에서 컨텍스트 손실 처리, DPR 상한, 가시성 처리를 **첫 화면이 뜨기 전에** 넣는다. 이후 시각 단계마다 실기기 체크포인트를 둔다.

---

### Pitfall 6: 판을 반복할수록 GPU 누수 — Canvas 리마운트, 캔버스 여러 개, 표정·컨페티 재생성

**What goes wrong:**
수업 한 시간에 3~6판을 리로드 없이 연속으로 한다. 판마다 누수가 쌓이면 후반에 프레임이 떨어지다가 컨텍스트를 잃는다.
- **Canvas 리마운트**: v1 `GameApp`은 결과 화면에서 `PlayView`를 언마운트하고 "다시 시작" 때 다시 마운트한다. 그래서 **판마다 WebGL 컨텍스트가 새로 생긴다.** R3F v9는 언마운트할 때 컨텍스트를 해제한다고 문서화되어 있지만, 브라우저마다 메모리 회수가 일관되지 않다는 메인테이너 언급이 있고, 브라우저는 활성 컨텍스트 수를 제한한다(Chrome 약 16개, 넘으면 가장 오래된 것을 죽임).
- **캔버스 여러 개**: 시작 화면에서 캐릭터 선택 미리보기를 3D로 보여 주려고 캔버스를 하나 더 띄우면 컨텍스트가 2개 이상 동시에 존재한다.
- **표정 교체 시 재생성**: 표정을 바꿀 때마다 `new CanvasTexture`나 새 지오메트리를 만들고 dispose하지 않는다.
- **연출마다 새 InstancedMesh**: 컨페티, 별 버스트, 링을 연출마다 새 메시와 머티리얼로 만든다.
- **공유 리소스의 이중 처리**: 모듈 수준 공유 지오메트리/머티리얼 캐시를 만들어 놓고 캐릭터 언마운트 때 실수로 dispose한다(다음 판에 검은 캐릭터가 나옴). 반대로 컴포넌트마다 `useMemo`로 만들고 dispose를 안 한다(v1 Dice pip에서 이미 한 번 고친 문제). R3F는 JSX로 선언한 것만 자동 dispose한다.

**Why it happens:**
개발할 때는 판마다 새로고침하므로 누수가 보이지 않는다. v1의 5판 연속 메모리 UAT는 계획만 있었고 실행되지 않았다.

**How to avoid:**
- **Canvas는 `GameApp` 셸에 하나만, 앱 수명 동안 유지**한다. 시작/결과 화면은 캔버스 위 DOM 오버레이로 띄우고 씬 내용만 바꾼다. 덤으로 결과 화면에서 3D 우승 캐릭터 연출도 가능해진다. 캐릭터 선택 미리보기도 같은 캔버스(drei `View`)를 쓰거나, 정적 PNG 스냅샷/SVG로 대체한다.
- 반복 생성되는 객체는 **고정 용량으로 미리 만들어 재사용**한다: 컨페티 InstancedMesh 1개(예: 200개 용량), 별 버스트 1개, 링 1개를 마운트 시 생성하고 연출 때 리셋만 한다.
- 표정은 **눈·입 변형을 모두 미리 만들어 두고 `visible`만 토글**한다. 텍스처를 새로 만들지 않는다.
- 공유 리소스는 `src/game/scene/materials.ts` 같은 모듈 하나에서 관리한다. 앱 수명 동안 유지하고 dispose하지 않으며, 종류 수가 유한한지(색 × 부위) 리뷰에서 확인한다.
- **자동화된 누수 테스트**: Playwright(Chromium, 실제 WebGL 또는 SwiftShader)로 프로덕션 빌드를 띄우고, 개발 전용 훅(`window.__gl = gl`)으로 5판을 자동 진행하면서 `gl.info.memory.geometries/textures`와 `gl.info.programs.length`가 판마다 **평탄**한지 단언한다. 사람 UAT에만 맡기지 않는다.

**Warning signs:**
- 콘솔 경고 `Too many active WebGL contexts. Oldest context will be lost.`
- 판이 거듭될수록 `gl.info.memory` 카운트가 단조 증가한다.
- 3~4판째부터 프레임이 떨어지고, 새로고침하면 회복된다.

**Phase to address:**
3D 기반 단계(단일 영구 Canvas 셸 + 누수 자동 테스트 하네스). 캐릭터 단계(표정 토글, 공유 리소스)와 성공 연출 단계(풀링)에서 다시 확인한다.

---

### Pitfall 7: 프레임레이트 의존 트윈 — 120Hz, 30fps, 백그라운드 복귀, 코너 회전 각도

**What goes wrong:**
- `useFrame`에서 `rotation.y += 0.1`이나 `t += 0.02`처럼 프레임당 고정값을 더하면 **120Hz ProMotion iPad에서는 2배 속도, 저전력 모드에서는 절반 속도**가 된다. watchdog 예산은 벽시계 기준이라 30fps에서는 연출이 끝나기 전에 watchdog이 발동한다 (Pitfall 4와 연결).
- 탭/앱이 숨겨지면 rAF가 멈추고, 돌아오면 첫 `delta`가 수 초가 된다. 컨페티 속도 적분(`v += g*dt; p += v*dt`)이 **폭발**하고 토큰이 순간이동한다.
- 코너에서 캐릭터가 진행 방향을 보도록 `rotation.y`를 선형 보간하면 270°→0°(=360°)에서 **반대로 한 바퀴 돈다**.
- 연출 시간을 `setTimeout` 체인과 `useFrame` 진행도 두 시계로 나눠 쓰면 서로 어긋난다.

**How to avoid:**
- 모든 트윈은 `progress = clamp((now - startedAt) / duration, 0, 1)` 형태의 **경과 시간 기반**으로 한다. 적분을 쓰는 곳(컨페티)은 `dt = Math.min(delta, 1/30)`로 클램프한다.
- 연출 하나의 시계는 하나만 쓴다: 시작 시각을 기록하고 `useFrame`에서 진행도를 계산하며, 완료 판정도 같은 진행도로 한다. `setTimeout`은 watchdog 전용으로만 둔다.
- 각도 보간은 최단 경로로 한다(`shortestAngleDelta`, 또는 쿼터니언 `slerp`). 순수 함수로 만들어 단위 테스트한다.
- 순수 트윈 함수(이징, 경로 보간, 각도)는 `src/game/` 아래 비React 모듈로 둔다. v1 `boardLayout`/`diceRotation` 패턴을 그대로 따른다.

**Warning signs:**
- 기기마다 연출 길이가 다르게 느껴진다.
- 백그라운드에서 복귀하면 컨페티가 화면 밖으로 튀거나 토큰이 점프한다.
- 코너에서 캐릭터가 빙글 돈다.

**Phase to address:**
3D 기반 단계(트윈 유틸 + 델타 클램프 규약). 보드 이동(코너 회전)과 성공 연출 단계에서 다시 확인한다.

---

### Pitfall 8: 세로 폰에서 카메라 프레이밍 — 보드가 잘리거나 HUD에 가려진다

**What goes wrong:**
- `PerspectiveCamera.fov`는 **세로 FOV**다. 390×844(aspect 0.46) 세로 화면에서 가로 FOV가 크게 줄어 정사각 순환판의 **좌우 칸이 잘린다**. 노트북(aspect 1.6)에서 맞춘 카메라 거리는 폰에서 쓸 수 없다.
- 캔버스를 전체 화면으로 깔고 위 HUD(턴/점수판)와 아래 컨트롤(주사위·판정 버튼)을 겹치면, 실제로 보이는 영역은 **화면 높이의 60% 정도**인데 카메라는 전체 화면 기준으로 맞춘다. 그래서 가까운 쪽 칸이 버튼 밑에 숨는다.
- iOS Safari 주소창이 접히고 펴질 때 캔버스 크기가 바뀌고, drei `<Bounds observe>`나 리사이즈마다 다시 맞추는 로직이 **카메라를 계속 흔든다**. v1에서도 `<Bounds>`가 매 이동마다 다시 맞추는 문제로 하이라이트를 Bounds 밖으로 뺀 이력이 있다.
- 이동 중 카메라 추적(follow cam)으로 줌인하면 전체 판도(누가 앞서는지)가 사라지고, 원래 시점으로 돌아오지 않는다.
- 아이가 화면을 문질러 OrbitControls로 판을 돌려 버리면 강사가 되돌릴 방법이 없다.

**How to avoid:**
- 순수 함수 `fitCamera({ aspect, boardHalfExtent, viewportInsets }) → { position, fov, target }`를 만든다. 가로 FOV(`2·atan(tan(vfov/2)·aspect)`)와 세로 FOV 중 **더 빡빡한 쪽**으로 거리를 계산하고, HUD가 차지하는 위·아래 비율만큼 `camera.setViewOffset`으로 시야 중심을 옮긴다(또는 캔버스 자체를 HUD 사이 영역에만 배치한다).
- 390×844, 844×390, 768×1024, 1024×1366, 1440×900에서 "네 코너 칸의 투영 좌표가 가시 영역 안에 있다"는 단위 테스트를 쓴다. three의 `Vector3.project`는 jsdom에서도 돈다.
- 세로 화면에서는 카메라를 더 위에서 내려다보게(top-down에 가깝게) 해서 원근 축소를 줄인다. 보드를 45° 돌린 마름모 배치도 검토한다.
- 리사이즈 재계산은 디바운스하고, **이동·연출 중에는 프레이밍을 고정**한다. 사용자 카메라 조작(OrbitControls)은 넣지 않는다.
- 추적 카메라를 쓴다면 짧게(≤1초) 하고 반드시 개요 시점으로 돌아오게 한다. 기본값은 고정 개요 시점이다.
- v1 Phase 4.1의 `100dvh`, safe-area, `app--playing` 전체화면 규칙을 그대로 쓰고, 캔버스 컨테이너도 같은 높이 규칙을 따른다.

**Warning signs:**
- 폰 세로에서 보드 좌우 끝 칸이 안 보이거나, 아래쪽 칸 위에 버튼이 겹친다.
- 스크롤하거나 주소창이 움직이면 보드가 꿈틀거린다.
- 노트북과 폰의 스크린샷 구도가 크게 다르다.

**Phase to address:**
3D 기반 단계(카메라 맞춤 순수 함수 + 다중 해상도 테스트). HUD 단계에서 HUD 높이가 확정되면 inset 값을 다시 확인한다.

---

### Pitfall 9: 3D 순환판에서 순위·방향·별이 읽히지 않는다 (v1 반려 사유의 재발)

**What goes wrong:**
- 원근 때문에 **먼 쪽 변의 칸이 작고 납작해져** 아이콘과 숫자가 안 읽힌다.
- 순환판에는 결승점이 없어서, 아이들이 **"앞에 있는 사람 = 이기는 사람"**이라고 오해한다. 실제 승부는 별 개수인데 보드에서는 별이 안 보인다.
- 같은 칸에 말이 여러 개 서면 치비 캐릭터끼리 겹쳐 누가 있는지 모른다(최대 8명).
- 큰 캐릭터 머리가 칸 위 이벤트 아이콘이나 방향 화살표를 가린다.
- 진행 방향(시계/반시계)과 출발 칸이 안 보여, 주사위를 굴린 뒤 어디로 갈지 예측할 수 없다.
- 이름과 배너를 drei `<Text>`(troika)로 3D 안에 그리면, 기본 폰트가 **Google Fonts CDN의 Roboto**이고 한글 같은 비라틴 글리프는 **jsDelivr CDN에서 Noto 폴백**을 받아 온다. 학교 와이파이가 막혀 있거나 오프라인이면 글자가 안 나오고, 한글 폰트는 다운로드가 크다.
- drei `<Html>` 라벨에 `occlude`(raycast)를 켜면 iPhone Safari에서 라벨 5개만으로 60→20fps로 떨어진 보고가 있다. 라벨마다 별도 React root가 생기는 것도 비용이다.

**How to avoid:**
- 메모리 규칙 "보드는 3초 안에 읽힌다"를 v2에 맞게 바꿔 **수용 기준으로 명시**한다. 아이가 3초 안에 답할 수 있어야 하는 것: ① 다음에 어디로 가는지 ② 출발 칸이 어디인지 ③ 누가 별이 제일 많은지 ④ 지금 누구 차례인지.
- **순위의 주 표시 수단은 DOM 별 점수판**이다. 항상 보이게 하고, 별 개수 순으로 정렬하고, 1등 왕관을 달고, 캐릭터 색과 동물 아이콘을 보드의 말과 일치시킨다. 보드 위 위치는 순위가 아니라는 점을 시각적으로 분명히 한다.
- 칸마다 진행 방향 화살표를 그리고, 코너에는 굽은 화살표를 둔다. 출발 칸은 크기·색·깃발 아치로 랜드마크로 만든다. 바퀴 수는 점수판에 작게 표시한다.
- 한 칸에 여러 말이 서면 **슬롯 오프셋**(2×2, 3×3 배치)으로 벌리고, 현재 차례 말은 링과 스포트라이트로 강조하면서 살짝 앞으로 낸다. 슬롯 계산은 순수 함수로 테스트한다.
- **한글 텍스트는 전부 DOM**(점수판, 배너, 이름)으로 처리한다. 3D 텍스트가 꼭 필요하면 숫자나 기호만 쓰고, 셀프 호스팅한 작은 서브셋 폰트를 `font` prop으로 지정한다.
- `<Html>`에는 `occlude`를 쓰지 않는다. 이름표는 DOM 점수판으로 대체하는 쪽을 우선한다.
- 판 전체가 한 화면에 들어오는 고정 시점(Pitfall 8)을 유지한다.

**Warning signs:**
- 스크린샷을 아이(또는 강사)에게 3초 보여 주고 물었을 때 ①~④에 바로 답하지 못한다.
- 테스트할 때 사람들이 "앞에 있는 애가 이기는 거야?"라고 묻는다.
- 오프라인에서 3D 텍스트가 빈칸이거나 네모로 나온다.

**Phase to address:**
3D 보드 단계(방향, 출발 랜드마크, 슬롯 오프셋). HUD/점수판 단계(DOM 별 점수판이 주 순위 수단). 각 단계 UAT에 "3초 테스트"를 넣는다.

---

### Pitfall 10: 성공 연출이 너무 길어 수업이 정체된다

**What goes wrong:**
점프·회전 → 컨페티 → 별 버스트 → 충격파 링 → 머리 위 큰 별 → 점수판 +1 → 배너를 **순서대로** 이으면 4~6초가 된다. 수업 한 번에 성공이 30~40회 나오면 **3~4분을 연출만 보며 기다린다.** 처음 몇 번은 신나지만 금방 지루해지고, 강사는 다음 아이를 세울 수 없다. 건너뛸 수 없으면 강사가 화면을 연타하고, 연타가 다른 버튼에 들어가 오작동한다(판정 버튼이 같은 위치에 있으면 특히 위험하다).

**How to avoid:**
- 레이어를 **병렬로** 겹친다. 컨트롤이 돌아오기까지 **약 2.0~2.5초**를 상한 예산으로 정하고, 타임라인 데이터(Pitfall 4)로 단위 테스트에서 이를 단언한다.
- **아무 곳이나 탭하면 건너뛰기**: 즉시 최종 상태(점수판 +1, 표정 원복)로 가고 장식 꼬리만 남긴다. 건너뛰기 탭이 아래 버튼으로 전달되지 않게, 연출 중에는 투명 캐처 레이어가 탭을 먹는다.
- 연출 직후 다음 버튼 위치에 **150~300ms 입력 무시 구간**을 두어 연타가 새 버튼에 들어가지 않게 한다.
- 강사 설정에 "연출 길이: 보통/짧게"를 두고, `prefers-reduced-motion`이면 짧게를 강제한다.
- 큰 연출(풀 버전)은 드문 순간(첫 성공, 바퀴 완주, 마지막 라운드)에 아껴 쓰고, 평소에는 짧은 버전을 쓰면 효과가 오래 간다.
- 실패 피드백은 짧고 부드럽게(1초 이내) 하고 아이를 부끄럽게 만들지 않는다. 실패가 성공보다 길면 안 된다.

**Warning signs:**
- 성공 한 번당 컨트롤이 돌아오기까지 3초를 넘는다.
- 플레이 테스트에서 강사가 화면을 연타한다.
- 연출을 건너뛸 방법이 없다.

**Phase to address:**
성공 연출 단계. 예산 상한을 플랜의 성공 기준에 수치로 넣는다.

---

## Moderate Pitfalls

### Pitfall 11: 치비 캐릭터 8명 × 부위 수십 개 → 드로우콜과 셰이더 폭증

**What goes wrong:**
머리, 귀 2, 눈 2, 볼 2, 입 변형 3, 몸통, 팔다리 4, 줄넘기 손잡이와 줄까지 하면 캐릭터 하나가 메시 20~30개다. 8명이면 **160~240 드로우콜**이 되고, 보드·주사위·컨페티까지 더하면 구형 iPad에서 프레임이 떨어진다. 부위마다 `new MeshToonMaterial({color})`를 만들면 머티리얼 수가 폭증하고, 아웃라인(drei `<Outlines>`, 역방향 헐)을 부위마다 달면 드로우콜이 2배가 된다. `MeshToonMaterial`의 `gradientMap`에 `NearestFilter`를 안 주면 툰 단계가 뭉개져 **그냥 매끈한 셰이딩**처럼 보인다. R3F `<Canvas>` 기본 톤매핑(ACES Filmic)은 닌텐도풍 원색을 **탁하게 만든다**.

**How to avoid:**
- 지오메트리는 종류별로 하나만(구, 캡슐, 원뿔) 만들어 공유하고, 머티리얼은 `색 → MeshToonMaterial` 캐시로 공유한다. gradientMap은 앱 전체에서 하나만 쓰고 `minFilter = magFilter = NearestFilter`로 설정한다.
- 움직이지 않는 부위(몸통+팔다리 등)는 `mergeGeometries`(버텍스 컬러)로 합치는 방안을 검토한다. 표정 부위만 따로 둔다.
- 아웃라인은 머리와 몸통 실루엣에만 쓰거나 아예 빼고, 대신 림라이트나 진한 색 대비로 처리한다.
- `<Canvas flat>`(NoToneMapping)으로 색을 원색 그대로 낸다. 비교 데모와 같은 색이 나오는지 확인한다.
- 측정 기준: `gl.info.render.calls`를 HUD 디버그로 표시하고, 8명 플레이 기준 iPhone에서 60fps(저전력 모드에서는 30fps)를 유지하는지 본다. 드로우콜 목표는 약 150 이하다 (MEDIUM: 기기에 따라 다름. 수치는 실측으로 확정).

**Phase to address:** 캐릭터 단계(공유 리소스와 측정이 첫 작업).

### Pitfall 12: 얼굴 파츠 z-fighting과 모바일 깊이 정밀도

**What goes wrong:** 구형 머리 표면에 눈과 입 평면을 거의 붙여 두면 카메라 거리와 각도에 따라 **깜빡이며 머리 속으로 파묻힌다**. 모바일 GPU의 깊이 정밀도에서 더 심하다. 카메라 `near` 0.01 / `far` 10000처럼 범위를 넓게 잡으면 악화된다.
**How to avoid:** 얼굴 파츠는 표면에서 약간 띄운 얇은 볼륨(납작한 구/캡슐)으로 만들고, `polygonOffset`을 쓰거나 `renderOrder`와 `depthTest`를 조정한다. 카메라 near/far는 장면에 맞게 좁힌다(예: 0.1/100). 표정 변경은 미리 만든 파츠의 `visible`만 토글한다(Pitfall 6).
**Phase to address:** 캐릭터 단계.

### Pitfall 13: InstancedMesh 컨페티가 사라지거나 색이 안 나오고, 매 프레임 GC가 끊김을 만든다

**What goes wrong:** InstancedMesh의 바운딩 스피어는 기준 지오메트리 위치 근처로 잡혀서, 흩어진 조각들이 화면 안에 있어도 **통째로 frustum culling**된다. `setColorAt`을 첫 렌더 **이후에** 처음 호출하면 셰이더가 instanceColor 경로 없이 이미 컴파일된 상태라 **색이 적용되지 않는다**. `instanceMatrix.needsUpdate`를 빼먹으면 움직이지 않는다. `useFrame` 안에서 `new Vector3()`/`new Matrix4()`를 만들면 GC 히치가 생긴다.
**How to avoid:** `frustumCulled={false}`, 마운트 시 전 용량에 `setColorAt`을 호출하고 `instanceColor.needsUpdate = true`, `instanceMatrix.setUsage(DynamicDrawUsage)`, 매 프레임 `needsUpdate = true`, 비활성일 때는 `count = 0`으로 둔다. 수학 객체는 모듈 수준에서 미리 할당해 재사용한다. 비활성 상태에서는 `useFrame`이 조기 반환하게 한다.
**Phase to address:** 성공 연출 단계.

### Pitfall 14: 실패 규칙을 설정 가능하게 하면서 턴 흐름이 여러 갈래로 깨진다

**What goes wrong:** "실패하면 그대로 / 뒤로 N칸 / 한 번 더 도전 / 별 −1" 같은 선택지를 추가하면서 각 분기가 별도 코드 경로가 된다. 뒤로 N칸은 출발 칸 역방향 통과(Pitfall 2), 재도전은 같은 카드 유지 여부와 무한 재도전, 별 −1은 음수 별을 만든다. 설정값을 콘텐츠 스키마에 넣어 Pitfall 1을 일으키기도 한다.
**How to avoid:** 실패 규칙을 `FailRule` 판별 유니언(`{kind:'stay'} | {kind:'back', steps} | {kind:'retry', max:1}`)으로 정의하고 엔진의 `judge` 한 곳에서만 해석한다. 이동은 `moveOnLoop`, 턴 종료는 `endTurn`을 재사용한다. 별은 0 미만으로 내려가지 않게 클램프한다. 재도전 횟수에는 상한을 둔다. 설정은 시작 화면 `GameConfig`와 별도 settings 키에 저장한다. 규칙마다 시나리오 테스트를 둔다. 기본값은 v1 동작과 같은 "그대로(이동 없음, 다음 차례)"로 한다.
**Phase to address:** 엔진/규칙 재설계 단계.

### Pitfall 15: 퀘스트 칸과 미션 연결이 끊긴다 — 삭제, 빈 카테고리, 게임 중 편집

**What goes wrong:** 칸에 특정 미션 ID나 카테고리를 묶었는데 편집기에서 그 미션을 삭제하거나 카테고리를 비우면, 그 칸에 도착했을 때 **뽑을 미션이 없어 턴이 멈춘다**(v1 `drawCard`는 빈 목록이면 상태를 그대로 반환하는 no-op이라 화면이 그대로 멈춤). `useGameStore.draw()`는 매번 **라이브 스토어**에서 미션을 읽기 때문에, 게임 중에 편집이 일어나면 이미 배치된 보드와 불일치가 생긴다.
**How to avoid:** 게임 시작 시 미션과 이벤트를 **스냅샷**으로 게임 상태에 고정한다. `canStart`를 확장해 퀘스트 칸에 필요한 카테고리마다 미션이 1개 이상 있는지 검사한다. 칸에 해당하는 미션이 없으면 전체 목록으로 폴백한다(절대 no-op으로 두지 않음). 칸에는 미션 ID를 직접 묶지 말고 카테고리나 난이도 태그로 묶는 쪽을 권장한다.
**Phase to address:** 엔진/규칙 재설계 단계(스냅샷 + 폴백), 설정 화면 단계(시작 가드 확장).

### Pitfall 16: jsdom에서 R3F 테스트 — 깨지거나, 통과하지만 아무것도 검증하지 않는다

**What goes wrong:** jsdom에는 WebGL도 ResizeObserver도 없어서 `<Canvas>`를 그대로 렌더하면 컨텍스트 생성 오류가 난다. 이를 피하려고 전부 mock하면 테스트는 초록인데 실제 씬은 검증되지 않는다. `@react-three/test-renderer` 안에 `<Canvas>`를 넣으면 안 된다(테스트 렌더러 자체가 헤드리스 캔버스다). Vitest에서 three가 두 번 로드되는 경고가 날 수 있다. v1의 Phase 3.1 전환 때 test-renderer와 three가 package.json에서 빠졌으므로 **다시 추가하면서 버전 고정도 다시 해야 한다**.
**How to avoid:** 테스트를 4층으로 나눈다.
1. **순수 모듈**(loop 수학, 카메라 맞춤, 슬롯 오프셋, 타임라인 예산, 각도 보간): jsdom/node 단위 테스트. 대부분의 회귀를 여기서 잡는다.
2. **씬 구조**: `@react-three/test-renderer`로 `SceneContents`만 렌더해서 칸 수 = N, 말 수 = 참가자 수, 컨페티 instance 용량 등을 단언한다. v1 패턴과 같고, `<Html>`은 `typeof document` 가드를 둔다.
3. **HUD/흐름**: `vi.mock('./scene/BoardScene')`으로 캔버스를 대체하고, busy 게이팅과 페이즈→컨트롤 매핑을 검증한다(v1 hud.test 패턴).
4. **실제 WebGL 스모크**: Playwright Chromium으로 프로덕션 빌드를 띄워 스크린샷, 5판 연속 `gl.info` 평탄성, 콘솔 오류 0을 확인한다. 그래도 Safari 고유 동작은 잡지 못하므로 **실기기 iPhone/iPad UAT는 따로** 둔다.

three, @types/three, fiber, drei, test-renderer는 정확한 버전으로 고정한다(v1 결정 계승).
**Phase to address:** 3D 기반 단계(테스트 하네스 4층 구성이 첫 플랜에 포함되어야 함).

---

## Minor Pitfalls

### Pitfall 17: 캔버스 포인터 이벤트와 iOS 제스처
**What goes wrong:** 3D 오브젝트를 클릭할 일이 없는데도 R3F는 포인터가 움직일 때마다 레이캐스트를 돈다. 캔버스 위에서 더블탭 확대나 핀치가 일어나 레이아웃이 깨지고, HUD 버튼 탭이 캔버스에 먹힌다.
**Prevention:** 3D 상호작용이 없으면 캔버스 래퍼에 `pointer-events: none`을 걸고 HUD만 이벤트를 받게 한다. 컨테이너에는 `touch-action: manipulation`을 준다. 상호작용은 전부 DOM 버튼으로 처리한다(v1 원칙 유지).

### Pitfall 18: 번들 크기로 편집기 첫 로딩이 느려진다
**What goes wrong:** three, R3F, drei가 다시 들어오면 v1 측정 기준 JS가 약 1.2MB(gzip 340KB)로 늘어난다. 편집기만 쓰려는 강사도 3D 번들을 받는다.
**Prevention:** 게임 화면(`GameApp` 3D 부분)을 `React.lazy`로 코드 분할한다. drei는 필요한 모듈만 import한다. 오프라인 대비로 `vite-plugin-pwa` 캐시를 선택 사항으로 검토한다.

### Pitfall 19: StrictMode 때문에 개발에서 측정값이 왜곡된다
**What goes wrong:** 개발 모드에서는 컨텍스트와 effect가 두 번 생겨서, 누수와 이중 연출이 실제 버그인지 StrictMode 때문인지 구분할 수 없다.
**Prevention:** 메모리와 성능 측정은 반드시 `vite build && vite preview`에서 한다. effect는 정리 함수와 함께 idempotent하게 작성한다. StrictMode는 끄지 않는다.

### Pitfall 20: 이전 2D 코드와 3D 코드의 이중 유지
**What goes wrong:** 2D `BoardScene`, `animation.ts`의 클램프 경로, `PositionReadout`의 "결승까지 남은 칸"을 남겨 둔 채 3D를 추가하면, 테스트가 옛 계약(결승, 클램프)을 계속 고정해 새 규칙으로 고칠 때마다 충돌한다.
**Prevention:** 마일스톤 초반에 "폐기 목록"(결승 관련 엔진 분기, 클램프 경로, 남은 거리 표시, 2D 보드)을 만들고, 대체 구현이 들어오는 단계에서 테스트와 함께 삭제한다. 재사용 대상(`usePresentation` 계약, HUD 패턴, 편집기, io)은 명시적으로 보존한다.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `SCHEMA_VERSION`만 올리고 identity `migrate` 유지 | 한 줄 변경 | 강사 콘텐츠가 시드로 덮어써지고 옛 백업 파일도 거부됨 (Pitfall 1) | **Never** |
| 게임 규칙 설정을 `ContentSchema`에 끼워 넣기 | 저장 경로 하나로 끝남 | 스키마 버전 증가 → 마이그레이션 부담, 콘텐츠 공유 파일에 규칙이 섞임 | 거의 없음. 설정은 별도 키로 |
| `position % N`만 써서 순환 처리 | 엔진 수정 최소화 | 음수 모듈로, 바퀴·통과 추론이 흩어지고 보너스 이중 지급 (Pitfall 2) | Never. `moveOnLoop` 하나로 |
| 별 지급을 연출 `onComplete`에서 | 연출과 점수판이 자연스럽게 맞음 | 건너뛰기·watchdog·백그라운드에서 별 유실 (Pitfall 4) | Never. 엔진 확정 + 표시 지연 |
| watchdog 예산을 손으로 더하기 | 빠름 | 비트를 추가할 때마다 누락 위험(v1에서 실제 발생) | Never. 타임라인 데이터로 계산 |
| 화면 전환마다 `<Canvas>` 마운트/언마운트 | React 라우팅 그대로 | 판마다 컨텍스트 생성, 누수, 컨텍스트 상한 (Pitfall 6) | 프로토타입 스파이크에서만 |
| 한글을 drei `<Text>`로 3D 안에 | 3D 일체감 | CDN 의존, 큰 폰트 다운로드, 오프라인 실패 (Pitfall 9) | 숫자·기호만, 셀프 호스팅 폰트일 때 |
| 프레임당 고정 증분 트윈 | 코드 짧음 | 120Hz/30fps에서 속도가 달라지고 watchdog 오작동 (Pitfall 7) | Never |
| 부위마다 새 머티리얼 | 색 조정이 쉬움 | 머티리얼·드로우콜 폭증 (Pitfall 11) | 캐릭터 1명 데모에서만 |
| Chrome 에뮬레이션으로 iPhone 검증 갈음 | 에이전트가 자동으로 확인 가능 | Safari WebGL 컨텍스트 손실·메모리 미검증 (Pitfall 5) | 레이아웃 확인 용도로만. WebGL 안정성은 실기기 필수 |

## Integration Gotchas

기존 v1 모듈과 새 3D·규칙 계층을 연결할 때의 함정.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `src/store.ts` persist (`migrate`/`merge`) | 버전만 올림 → merge 실패 → 시드가 `setItem`으로 저장됨 | 실제 변환 migrate, 원본 백업 키, 픽스처 테스트, persist `name` 불변 |
| `src/lib/io.ts` 가져오기 | `ContentSchema`(literal 최신) 하나로만 검증 → v1 파일 거부 | `parseAnyContent`(v1∪v2 → upgrade) 공유 |
| `src/engine/engine.ts` | `reached-finish` 분기, `max(position)` 승자 잔존 | `EndReason`에서 제거해 컴파일러가 잔재를 찾게 함. 승자는 별 최다(동점 공동) |
| `src/engine/placement.ts` | `boardLength + 1` 배열, 결승 칸 제외 | 길이 N, 출발 칸(0)만 제외, 칸 종류(퀘스트/이벤트) 배치 |
| `src/game/animation.ts` | `clampSquare`/`buildDisplayMovePath` 재사용 | `moveOnLoop().path` 사용, 클램프 경로는 삭제 |
| `src/game/usePresentation.ts` | ID 없는 `signalAnimDone`로 오래된 완료 신호가 새 busy 해제 | `beginAnim(id)`/`signalAnimDone(id)`, watchdog도 ID 범위 |
| `src/game/GameApp.tsx` | `gameOver && !busy`일 때 PlayView(=Canvas) 언마운트 | 영구 Canvas 셸 + 결과는 DOM 오버레이, `pendingEnd` 처리 |
| `PlayView` DOM 카운트다운 | 0이 되면 즉시 `end('timeout')` → 턴·연출 중간 종료 | `finalRound`/`pendingEnd` 플래그 → 라운드(최소한 턴) 경계에서 종료 |
| `useGameStore.draw()` | 라이브 스토어에서 미션을 읽음 → 게임 중 편집 불일치 | 시작 시 콘텐츠 스냅샷을 게임 상태에 고정 |
| drei `<Bounds>` | 리사이즈·이동마다 재맞춤 → 카메라 흔들림 | 순수 `fitCamera` + 디바운스, 이동 중 고정 |
| drei `<Text>` / `<Html occlude>` | CDN 폰트, raycast 가림 처리 비용 | 한글은 DOM, `occlude` 미사용 |
| `main.tsx` StrictMode | 개발 모드 이중 effect를 버그로 오인하거나 진짜 버그를 무시 | 프로덕션 빌드에서 측정, effect를 idempotent하게 |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| DPR 무제한 또는 2 + antialias + 후처리 | iPad 풀스크린에서 프레임 급락, 발열, 탭 리로드 | `dpr={[1,1.5]}` + PerformanceMonitor, 후처리·섀도맵 없음 | iPad Pro, DPR 3 iPhone에서 즉시 |
| 판마다 Canvas 재생성 | 3~4판 후 프레임 저하, 컨텍스트 손실 경고 | 영구 단일 Canvas | 수업 후반(연속 3판 이상) |
| 캐릭터 부위별 메시·머티리얼 | 드로우콜 200 이상, 구형 iPad 끊김 | 공유 지오메트리·머티리얼, 정적 부위 병합 | 참가자 6~8명 |
| 연출마다 새 InstancedMesh | `gl.info.memory`가 성공 횟수에 비례해 증가 | 고정 용량 풀 재사용 | 성공 20회 이상 |
| `useFrame` 내 객체 할당 | 주기적 미세 끊김(GC) | 모듈 수준 임시 객체 재사용 | 저사양 CPU, 긴 세션 |
| drei `<Html occlude>` 라벨 다수 | iPhone에서 라벨 몇 개로 프레임 급락 | 라벨은 DOM HUD로, occlude 금지 | 라벨 5개 이상(포럼 보고) |
| 저전력 모드 30fps | 프레임 기반 트윈이 절반 속도, watchdog 조기 발동 | 시간 기반 트윈, 예산에 여유분 | 강사 폰이 저전력 모드일 때 항상 |

## Security Mistakes

서버·계정이 없는 단일 기기 앱이라 공격 표면은 작다. v2에서 새로 생기는 항목만 적는다.

| Mistake | Risk | Prevention |
|---------|------|------------|
| 가져오기 v1→v2 업그레이드 경로가 검증을 우회 | 변환 후 데이터가 V2 스키마 검증을 거치지 않아 손상된 상태가 저장됨 | 업그레이드 결과를 반드시 `ContentSchemaV2.safeParse`로 재검증한 뒤 confirm → replaceAll (v1의 T-01-05 계약 유지) |
| 미션 이름을 3D 텍스트·`<Html>`에 `dangerouslySetInnerHTML`로 | 가져온 파일의 스크립트 실행 | React 텍스트 노드로만 렌더 (v1 원칙 유지) |
| 3D 텍스트·폰트를 외부 CDN에서 로드 | 교실 네트워크 차단 시 기능 실패, 제3자 요청 발생 | 폰트와 에셋은 모두 셀프 호스팅(`import.meta.env.BASE_URL` 경로, v1 03.1 교훈) |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| 위치가 앞선 사람이 이기는 것처럼 보임 | 아이들이 규칙을 오해하고 결과에 실망 | 별 점수판이 주 순위, 보드 위치는 순위가 아님을 시각적으로 분리 |
| 4~6초짜리 순차 성공 연출 | 수업 정체, 강사 연타 오작동 | 병렬 레이어 2~2.5초, 탭 건너뛰기, 입력 무시 구간 |
| 실패 연출이 길거나 놀리는 느낌 | 아이가 위축 | 1초 이내 부드러운 "아쉬워~" 표정, 다음 기회를 강조 |
| 카메라 자동 줌·회전 남용 | 멀미, 판도 상실 | 고정 개요 시점 기본, 추적은 짧게 하고 복귀 |
| 시간 종료로 턴 중간에 끝남 | "나 아직 안 했는데!" 불공정 | 마지막 라운드 배너 후 라운드 경계에서 종료 |
| 실패 규칙 설정 문구가 어려움 | 강사가 설정을 이해하지 못하고 기본값만 사용 | 3~4개 프리셋 + 한 줄 예시("실패하면 제자리") |
| 컨텍스트 손실 시 검은 화면만 | 강사가 새로고침 → 진행 상황 손실 우려 | "화면 다시 그리기" 버튼, 게임 상태 유지 |

## "Looks Done But Isn't" Checklist

- [ ] **스키마/저장:** v1 localStorage 픽스처로 부팅 → 미션·이벤트 개수가 같다. v1 내보내기 파일 가져오기가 성공한다. 마이그레이션 실패 시 원본이 백업 키에 남는다.
- [ ] **순환 이동:** 모든 칸 × 주사위 1..6 × 이벤트 ±N 전수 테스트에서 `toTile ∈ [0,N)`이고 보너스는 턴당 최대 1회. 뒤로 갔다 다시 넘어도 중복 지급이 없다.
- [ ] **결승 잔재:** 코드에서 `reached-finish`, `afterRoll >= boardLength`, `clampSquare`, `max(position)` 승자 판정이 0건이다.
- [ ] **라운드:** 추가 턴, 팀(멤버 수가 다른 팀 포함), 실패 규칙 시나리오에서 라운드 수와 플레이어별 정규 턴 수가 같다.
- [ ] **시간 종료:** 성공 연출 중에 타이머가 0이 되어도 연출과 별 지급이 끝난 뒤 결과로 간다.
- [ ] **별 권위:** 연출을 건너뛰거나, watchdog이 발동하거나, 백그라운드에 다녀와도 점수판 별 = 엔진 별.
- [ ] **watchdog 예산:** 타임라인 데이터에서 계산되고, 비트를 추가하면 자동 반영된다(단위 테스트).
- [ ] **오래된 완료 신호:** 이전 애니메이션의 늦은 `signalAnimDone`이 현재 busy를 풀지 않는다(ID 테스트).
- [ ] **누수:** 프로덕션 빌드에서 5판 연속 자동 진행 시 `gl.info.memory`와 `programs`가 평탄하다(Playwright).
- [ ] **Canvas 단일성:** 시작 → 플레이 → 결과 → 다시 시작 동안 WebGL 컨텍스트 생성이 1회다.
- [ ] **iOS 실기기:** iPhone과 iPad Safari에서 앱 전환 후 복귀, 저전력 모드, 5판 연속을 확인한다. 에뮬레이션은 인정하지 않는다.
- [ ] **카메라:** 390×844, 844×390, 768×1024, 1024×1366, 1440×900에서 네 코너 칸이 HUD에 가리지 않고 보인다.
- [ ] **3초 테스트:** 스크린샷만 보고 방향, 출발 칸, 별 1등, 현재 차례에 답할 수 있다.
- [ ] **겹침:** 8명이 한 칸에 모여도 모든 캐릭터가 식별된다.
- [ ] **연출 예산:** 성공부터 컨트롤 복귀까지 2.5초 이하이고, 탭하면 건너뛰며, 건너뛴 탭이 아래 버튼을 누르지 않는다.
- [ ] **오프라인:** 네트워크를 끊어도 모든 텍스트와 폰트가 정상 표시된다(CDN 요청 0건).
- [ ] **툰 룩:** `gradientMap` NearestFilter, `<Canvas flat>`으로 비교 데모 색감과 일치한다.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| 시드 덮어쓰기로 강사 콘텐츠 유실 (배포 후 발견) | **HIGH** (복구 불가할 수 있음) | 백업 키가 있으면 복원. 없으면 강사의 JSON 백업을 v1 수용 가져오기로 복원하도록 긴급 패치 → 그래서 "배포 전 픽스처 테스트"가 필수 |
| 순환 수학 버그 | LOW (모듈이 분리되어 있을 때) | `moveOnLoop` 수정 + 전수 테스트 케이스 추가. 흩어져 있으면 MEDIUM |
| 라운드 카운팅 오류 | LOW–MEDIUM | `endTurn` 단일 진입점으로 리팩터, 시나리오 테스트 추가 |
| busy 고착 / desync | MEDIUM | ID 기반 게이트, 엔진 권위 원칙으로 리팩터. 임시로 watchdog 여유분 확대 |
| Canvas 리마운트 누수 | MEDIUM | GameApp을 영구 Canvas 셸로 재구성(라우팅을 오버레이로) |
| iOS 컨텍스트 손실 | LOW–MEDIUM | lost/restored 핸들러 + key 리마운트 + 오버레이 버튼 추가 |
| 카메라 프레이밍 실패 | LOW | `fitCamera` 순수 함수로 교체하고 해상도별 테스트 |
| 연출 과다 길이 | LOW | 타임라인 데이터에서 ms만 조정하고 건너뛰기 추가 |
| 캐릭터 드로우콜 과다 | MEDIUM | 공유 리소스 캐시, 정적 부위 병합, 아웃라인 제거 |

## Pitfall-to-Phase Mapping

로드맵이 아직 없으므로 단계 이름은 주제 기준(제안)이다. 순서 제안: **① 엔진/규칙·저장 → ② 3D 기반(Canvas 셸·카메라·테스트 하네스) → ③ 3D 순환판·이동 → ④ 치비 캐릭터·표정 → ⑤ 성공 연출 → ⑥ HUD·점수판·결과·실기기 검증**

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. 스키마 버전 → 콘텐츠 덮어쓰기 | ① 엔진/규칙·저장 (첫 작업) | v1 localStorage·내보내기 픽스처 테스트 통과, 설정은 별도 키 |
| 2. 순환 수학 / 보너스 이중 지급 | ① 엔진/규칙 | `moveOnLoop` 전수 테스트, 결승 잔재 grep 0건 |
| 3. 라운드/턴 카운팅 | ① 엔진/규칙 (+⑥ 카운트다운 연결) | 시나리오 테이블 테스트, 시간 종료가 경계에서 처리됨 |
| 4. 애니메이션-엔진 desync, busy 고착 | ①(별 권위 계약) + ②(ID 게이트) + ⑤(타임라인 예산) | 건너뛰기·watchdog·오래된 신호 테스트 |
| 5. iOS Safari 컨텍스트 손실/DPR | ② 3D 기반 (+모든 시각 단계 실기기) | 앱 전환 복귀·저전력·5판 연속 실기기 UAT |
| 6. GPU 누수 / Canvas 리마운트 | ② 3D 기반 (+④·⑤ 재확인) | Playwright 5판 `gl.info` 평탄, 컨텍스트 1회 생성 |
| 7. 프레임레이트 의존 트윈 | ② 3D 기반 (+③ 코너, ⑤ 컨페티) | 시간 기반 트윈 단위 테스트, 델타 클램프 |
| 8. 세로 카메라 프레이밍 | ② 3D 기반 (+⑥ HUD inset 재확인) | 5개 해상도 코너 투영 테스트 |
| 9. 순위·방향 가독성 | ③ 순환판 + ⑥ 점수판 | 3초 테스트 UAT, 8인 겹침 확인, 오프라인 텍스트 |
| 10. 연출 과다 길이 | ⑤ 성공 연출 | 예산 ≤2.5초 단위 테스트, 탭 건너뛰기 UAT |
| 11. 캐릭터 드로우콜/셰이더 | ④ 캐릭터 | `gl.info.render.calls` 실측, iPhone 프레임 |
| 12. 얼굴 z-fighting | ④ 캐릭터 | 근거리·원거리 시점 스크린샷 |
| 13. InstancedMesh 컨페티 함정 | ⑤ 성공 연출 | 화면 가장자리 컨페티 보임, 색 적용, 풀 재사용 |
| 14. 실패 규칙 분기 | ① 엔진/규칙 | 규칙별 시나리오 테스트, 기본값 = v1 동작 |
| 15. 퀘스트 칸-미션 연결 | ① 엔진/규칙 + 설정 화면 | 스냅샷 고정, 빈 카테고리 폴백 테스트 |
| 16. jsdom R3F 테스트 | ② 3D 기반 (첫 플랜) | 4층 테스트 구성 존재, 버전 정확 고정 |
| 17~20. 포인터·번들·StrictMode·이중 코드 | ②(17·18·19), 각 대체 단계(20) | 코드 분할 확인, 폐기 목록 소진 |

**더 깊은 조사가 필요한 단계 (research flag):**
- **② 3D 기반:** iOS Safari 컨텍스트 손실 복구 방식(`<Canvas key>` 리마운트와 R3F v9 내부 처리의 상호작용)은 공식 문서가 없다. 스파이크로 실기기 검증이 필요하다 (LOW→검증 필요).
- **④ 캐릭터:** 8인 기준 드로우콜 예산 수치(약 150)는 추정이다. 실측으로 확정해야 한다 (MEDIUM).
- **① 엔진/규칙:** 실패 규칙 선택지, 시간 종료 정책(즉시/턴 경계/라운드 경계), 출발 칸 보너스 여부는 **사용자(강사) 결정 사항**이다. 요구사항 단계에서 확정해야 한다.

## Sources

- **코드베이스 직접 확인 (HIGH):** `src/store.ts`(identity migrate, merge의 literal safeParse, persist name), `src/lib/io.ts`(literal 검증 가져오기), `src/engine/engine.ts`(`reached-finish`, `max(position)` 승자, `judge` 실패 시 advanceTurn), `src/engine/placement.ts`(`boardLength+1`), `src/game/animation.ts`(`clampSquare`), `src/game/usePresentation.ts`(ID 없는 signalAnimDone), `src/game/PlayView.tsx`(수동 watchdog 합산, DOM 카운트다운), `src/game/GameApp.tsx`(gameOver 시 PlayView 언마운트), `src/main.tsx`(StrictMode)
- **v1 이력 (HIGH):** `.planning/milestones/v1.0-research/PITFALLS.md`, v1 phase 03-01/03-02 SUMMARY(R3F 결정, 미수행 메모리 UAT), quick 260726-lbq SUMMARY(PREVIEW_S watchdog 누락 버그, Bounds 재맞춤), 03.1-CONTEXT(정보 설계 반려 사유), 04.1 SUMMARY/VERIFICATION(CDP 에뮬레이션만 수행)
- **zustand persist 소스 (HIGH, 1차 소스):** https://raw.githubusercontent.com/pmndrs/zustand/main/src/middleware/persist.ts — 버전 불일치 시 migrate 호출, migrate 결과 → merge, migrated면 `setItem()`으로 즉시 저장
- **R3F Canvas 문서 (MEDIUM):** https://r3f.docs.pmnd.rs/api/canvas — 기본 dpr `[1,2]`, v9는 언마운트 시 컨텍스트 해제, 컨텍스트 손실 전용 prop 없음(에러 바운더리 권장)
- **R3F 테스트 (MEDIUM):** https://r3f.docs.pmnd.rs/api/testing , https://discourse.threejs.org/t/cannot-render-canvas-in-react-three-test-renderer/42281 , https://github.com/mrdoob/three.js/issues/32142
- **iOS Safari WebGL 컨텍스트 손실 (MEDIUM):** https://bugs.webkit.org/show_bug.cgi?id=261331 , https://discourse.threejs.org/t/context-lost-when-backgrounding-safari-on-ios-17-developer-beta-8/55772 , https://discourse.threejs.org/t/three-js-broken-on-ios-17-with-context-lost/58025 , https://developer.apple.com/forums/thread/741624 , https://discourse.threejs.org/t/ios-18-2-causing-webgl-error/75143
- **WebGL 컨텍스트 수 제한 / 리마운트 (MEDIUM):** https://discourse.threejs.org/t/i-have-a-problem-in-warning-too-many-active-webgl-contexts-oldest-context-will-be-lost/41300 , https://bugs.webkit.org/show_bug.cgi?id=218305 , https://developer.apple.com/forums/thread/741327
- **저전력 모드 rAF 30fps (MEDIUM, 2016–2021 자료):** https://bugs.webkit.org/show_bug.cgi?id=215745 , https://popmotion.io/blog/20180104-when-ios-throttles-requestanimationframe
- **InstancedMesh 컬링·instanceColor (MEDIUM):** https://threejs.org/docs/pages/InstancedMesh.html , https://discourse.threejs.org/t/instance-mesh-culling/25307 , https://github.com/mrdoob/three.js/issues/21786 , https://discourse.threejs.org/t/why-setcolorat-in-instancedmesh-not-working/46197
- **MeshToonMaterial gradientMap NearestFilter (MEDIUM):** https://sbcode.net/threejs/meshtoonmaterial/
- **drei Html occlude 성능 (MEDIUM, 단일 보고):** https://discourse.threejs.org/t/html-tag-low-performance-react/48917
- **troika-three-text 폰트 CDN (MEDIUM):** https://github.com/protectwise/troika/tree/main/packages/troika-three-text — 기본 Roboto는 Google Fonts CDN, 유니코드 폴백은 jsDelivr CDN(전체 셀프 호스팅 시 약 300MB)
- **LOW (미검증, 실측 필요):** iOS 탭 메모리 상한 수치, 8인 치비 드로우콜 예산 수치, R3F v9 컨텍스트 restored 자동 처리 여부

---
*Pitfalls research for: v2.0 3D 블루마블 재구축 — 기존 헤드리스 엔진/편집기 위에 R3F 순환판 · 절차적 치비 캐릭터 · 성공 연출 · 별/라운드/실패 규칙 · 스키마 변경 추가*
*Researched: 2026-10-22*
