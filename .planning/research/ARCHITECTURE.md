# Architecture Research — v2.0 3D 블루마블 재구축

**Domain:** 기존 React 19 + Zustand 앱의 게임 화면을 R3F 3D 순환판(블루마블식) + 별 모으기 규칙으로 다시 만드는 작업
**Researched:** 2026-10-22
**Confidence:** HIGH (통합 지점: 실제 코드를 읽고 확인) / MEDIUM (씬 연출 시퀀싱: v1 Phase 3에서 쓴 패턴을 확장한 설계) / LOW 없음

> 범위: 새 기능을 **어디에, 어떻게 붙이는가**만 다룬다. 스택 버전 선택은 STACK.md, 기능 우선순위는 FEATURES.md 소관이다.

---

## 0. 결론 먼저 (Roadmap 작성자용 요약)

1. **엔진은 새로 쓰지 말고 진화시킨다.** `src/engine`의 모듈 경계(순수·시계 없음·RNG 주입·불변 전이 `(state, …args, rng) => state`)와 `src/harness/useGameStore.ts` 단일 seam은 그대로 둔다. `rng.ts`는 손대지 않는다. `types.ts`, `engine.ts`, `placement.ts`는 내부를 새로 작성하고(순환판, 별, 라운드), 테스트도 새로 쓴다. 새 순수 모듈 `ring.ts`(감기·경로·출발 통과 계산)와 `scoring.ts`(난이도별 별, 승자 계산)를 추가한다.
2. **FSM은 `awaitingDraw`를 없애고 4+1 단계로 줄인다:** `awaitingRoll → (quest 칸) awaitingJudgement → turnResolved → awaitingRoll | gameOver`. 칸 해결(미션 뽑기 포함)은 `rollDice` 전이 하나 안에서 끝낸다. 강사가 누를 버튼이 줄어든다.
3. **엔진 전이마다 도메인 이벤트 로그(`log: { seq, events[] }`)를 남긴다.** 씬은 엔진 상태를 바로 읽지 않는다. 순수 함수 `buildTimeline(events)`가 로그를 연출 비트(beat) 큐로 바꾸고, `usePresentation`(ANIM_DONE 게이트)을 **비트 큐 + 표시용 상태(displayed positions/stars)** 로 확장한다. 지금 PlayView에 흩어진 `seq`/타이머/watchdog 예산 계산을 이 Director가 대신한다.
4. **강사 설정(실패 규칙, 기본 라운드 수, 출발 보너스)은 `ContentSchema` v2의 `settings` 필드에 넣는다.** persist `migrate`를 **실제로 v1→v2 변환하도록** 고쳐야 한다. 지금 코드(`migrate: p => p`)를 그대로 두고 버전만 올리면 merge에서 Zod 검증이 실패하고, 시드 데이터가 강사의 미션 위에 **덮어써진다**. 이번 마일스톤에서 가장 위험한 통합 지점이다. 아래 §4 참고.
5. **HUD는 Canvas 형제 DOM 오버레이로 유지한다**(v1 Phase 3에서 검증한 방식). drei `<Html>`/`<Text>`는 쓰지 않거나 최소한으로만 쓴다. 3D → DOM으로 넘어가는 유일한 연출은 "큰 별 → 점수판"이다. 이 연출은 투영 좌표를 넘겨 DOM에서 처리한다.
6. **빌드 순서:** (A) 데이터·엔진·하네스 + 임시 DOM 루프 화면 → (B) 3D 보드 골격 + Director + DOM HUD(플레이스홀더 말) → (C) 치비 동물 캐릭터·표정 → (D) 축하 연출·결과 화면·성능/정리. A는 3D가 없어도 끝까지 플레이할 수 있어야 한다. v1에서 효과를 본 "헤드리스 루프 먼저" 원칙을 그대로 따른다.

---

## 1. Standard Architecture

### System Overview

```
┌──────────────────────────────── App.tsx (view: editor | game) ────────────────────────────────┐
│                                                                                                │
│  [편집기]  src/components                         [게임]  src/game                              │
│  MissionTab · EventTab · ★SettingsTab(신규)       GameApp ─ SetupView(DOM, 수정)                │
│        │                                                  ─ GameShell(신규: game≠null 동안      │
│        │ useStore actions                                    Canvas 계속 마운트)               │
│        ▼                                                     ├─ GameCanvas (R3F, lazy)         │
│  ┌───────────────────────┐                                   │   Scene: Board/Tile/Pawn/Dice/  │
│  │ src/store.ts (persist)│◄── io.ts (import/export,          │   CelebrationFX/CameraRig       │
│  │ Content v2 =          │     parseAnyContent v1|v2)        │   (표시용 상태 + 현재 beat 구독)│
│  │ categories·missions·  │                                   ├─ HUD (DOM 오버레이)            │
│  │ events·★settings      │                                   │   Scoreboard·QuestCard·Controls│
│  └──────────┬────────────┘                                   │   Banner·FlyingStarLayer       │
│             │ 게임 시작 시 1회 스냅샷                          └─ ResultOverlay(DOM) + 시상대   │
│             ▼                                                        ▲ busy / beat / displayed │
│  ┌──────────────────────────────┐   전이 호출   ┌───────────────────┴─────────────────────┐    │
│  │ src/harness/useGameStore.ts  │◄──────────────│ src/game/director (신규)                 │    │
│  │ (유일한 engine↔store seam)    │──log.seq 변화─►│ buildTimeline(events) → beats           │    │
│  │ + contentSnapshot, systemRng │               │ usePresentation v2: queue·current·busy· │    │
│  └──────────┬───────────────────┘               │ displayed{positions,stars}·watchdog     │    │
│             │ 순수 전이                          └──────────────────────────────────────────┘    │
│             ▼                                                                                  │
│  ┌────────────────────────────────────────────────────────────┐                               │
│  │ src/engine (React/DOM/시계 없음)                            │                               │
│  │ types · engine(FSM) · ★ring · ★scoring · placement(→buildBoard) · setup · rng(변경 없음)   │
│  └────────────────────────────────────────────────────────────┘                               │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| 컴포넌트 | 책임 | 신규/수정 | 구현 |
|---|---|---|---|
| `engine/types.ts` | 타일·참가자(별·바퀴 수)·규칙·이동 결과·도메인 이벤트·GameState 타입 | **대폭 수정** | 순수 타입 |
| `engine/engine.ts` | 순환판 FSM 전이 `createGame / rollDice / judge / advanceTurn / requestEnd / endGame / resetGame` | **대폭 수정**(내부 재작성, 파일·스타일 유지) | 불변 전이 |
| `engine/ring.ts` | `wrap(i,L)`, `forwardPath(from,steps,L)`, `backwardPath`, `passesStart(from,steps,L)` | **신규** | 순수 함수 + 단위 테스트 |
| `engine/scoring.ts` | `starsFor(diff)`(1/2/3), `winnersByStars(ps)`(동점이면 모두 공동 우승) | **신규** | 순수 |
| `engine/placement.ts` | `buildBoard(size, events, rng)` → `Tile[]` (출발 1칸 + 퀘스트 다수 + 가중치 이벤트) | **재작성** | 기존 `weightedPick` 재사용 |
| `engine/setup.ts` | 판 크기 프리셋, `buildParticipants`(동물 배정), `canStart` | **수정** | 순수 |
| `engine/rng.ts` | mulberry32 / systemRng / rollDie / weightedPick / uniformPick | **변경 없음** | — |
| `schema.ts` | `ContentSchemaV1`, `ContentSchemaV2`(+`settings`), `parseAnyContent`, `upgradeV1toV2` | **수정** | Zod 4 |
| `store.ts` | persist v2, **실제 migrate**, `updateSettings` 액션 | **수정** | Zustand persist |
| `lib/io.ts` | 가져오기 시 v1/v2 둘 다 받아 v2로 올림, 내보내기는 v2 | **수정** | — |
| `components/SettingsTab.tsx` | 실패 규칙·기본 라운드·출발 보너스(·시간 제한) 편집 | **신규** | react-hook-form + zod |
| `harness/useGameStore.ts` | 전이 래핑 + 시작 시 콘텐츠·규칙 **스냅샷** + `requestEnd` | **수정** | Zustand |
| `game/director/timeline.ts` | 도메인 이벤트 → Beat[] (지속시간 포함) | **신규** | 순수 + 단위 테스트 |
| `game/usePresentation.ts` | busy 게이트 → beat 큐 + 비트별 watchdog + displayed 상태 | **수정(확장)** | Zustand |
| `game/layout/ringLayout.ts` | 타일 index → 월드 좌표/회전, 같은 칸 다중 말 슬롯 오프셋 | **신규**(`boardLayout.ts` 대체) | 순수 |
| `game/scene/*` | GameCanvas, Board, Tile, Pawn, ChibiAnimal, Dice, CameraRig, CelebrationFX | **신규**(2D BoardScene 삭제) | R3F |
| `game/hud/*` | Scoreboard, QuestCard, ControlsBar, EventBanner, TurnBanner, FlyingStarLayer, ResultOverlay | 일부 수정, 일부 신규 | DOM + CSS |

---

## 2. 엔진 FSM 설계 (순환판 + 별 + 라운드)

### 2.1 다시 쓸까, 진화시킬까 → **진화** (HIGH)

근거:
- 지금 엔진의 **계약**(순수, 시계 없음, RNG 주입, 불변 전이, harness만 store와 결합)은 v2에서도 그대로 맞다. 바뀌는 것은 규칙뿐이다.
- `rng.ts`(시드 RNG, 공정 주사위, 가중치 추첨)와 `setup.ts`의 팀 모델(팀 = 말 1개를 공유하고 `memberTurnIndex`로 멤버가 돌아가며 수행)은 그대로 재사용된다.
- 바뀌는 범위: 결승선 개념 제거, 위치를 모듈러 연산으로 처리, 별·라운드·실패 규칙 추가, `awaitingDraw` 제거. `engine.ts` 162줄은 거의 다 다시 쓰게 된다. 그래도 **파일·함수 이름·전이 스타일을 유지**하면 harness와 HUD가 받는 충격이 작다.
- `engine.test.ts`(263줄)는 결승선 규칙에 묶여 있으니 **새로 쓴다**. `rng.test.ts`는 그대로 둔다.

### 2.2 새 FSM

```
                 ┌────────────────────────────────────────────────────────────────┐
                 ▼                                                                │
         ┌──────────────┐  rollDice(missions, events, rng)                        │
 start ─►│ awaitingRoll │──────────────┬──────────────────────────┐               │
         └──────────────┘              │ 도착=퀘스트 칸            │ 도착=이벤트/출발│
                                       ▼ (미션 1장 뽑음)           ▼               │
                          ┌───────────────────┐              ┌──────────────┐     │
                          │ awaitingJudgement │──judge(true)►│ turnResolved │─────┤ advanceTurn
                          │  card{mission,    │  (+별)        │              │     │ (다음 말 또는
                          │   attempt}        │──judge(false)►│              │     │  extra면 같은 말)
                          └───────┬───────────┘  규칙=noStar  └──────┬───────┘     │
                                  │ 규칙=retryOnce && attempt<2       │             │
                                  └──► awaitingJudgement(attempt=2)   │ round>max   │
                                       (같은 미션 / redraw면 새 미션)  │ or endRequested
                                                                      ▼             │
                                                               ┌──────────┐        │
                     endGame('manual') (어느 단계에서든) ──────►│ gameOver │        │
                                                               └──────────┘        │
```

단계 이름은 `awaitingRoll / awaitingJudgement / turnResolved / gameOver`를 **그대로 쓴다**. `ControlsBar`·`GameApp`의 단계 분기와 HUD 테스트 구조를 이어서 쓸 수 있다. `awaitingDraw`만 지운다.

### 2.3 상태 필드 (제안)

```ts
// src/engine/types.ts (v2)
export type TileKind = 'start' | 'quest' | 'event';
export interface Tile { kind: TileKind; eventId: string | null } // event 칸만 eventId

export type Animal = 'bear' | 'rabbit' | 'cat' | 'dog' | 'panda' | 'fox' | 'pig' | 'chick';

export interface Participant {
  id: string; name: string; animal: Animal;   // 'boy'|'girl' → animal
  position: number;                            // 0..L-1 (항상 wrap된 값)
  stars: number;                               // 신규
  laps: number;                                // 출발을 지난 횟수(표시용)
  memberNames: string[]; memberTurnIndex: number;
}

export type FailRule = 'noStar' | 'retryOnce' | 'redrawOnce';
export interface GameRules {                   // settings 스냅샷 (게임 중 불변)
  maxRounds: number;
  startBonusStars: number;                     // 0이면 보너스 없음
  failRule: FailRule;
}

export interface GameConfig {
  mode: 'solo' | 'team';
  participants: Participant[];
  boardSize: number;                           // L (16/20/24 프리셋)
  rules: GameRules;
  timeLimitMs: number | null;                  // DOM 시계가 읽음 (엔진은 모름)
}

export interface MoveResult {
  roll: number; from: number;
  dicePath: number[];          // 주사위로 밟은 칸 순서 (wrap 반영)
  passedStart: number;         // 출발 칸 통과/도착 횟수 (주사위 + 이벤트 전진 합)
  landed: number;              // 주사위 도착 칸
  event: { id: string; eff: Effect; steps: number; label: EventLabel } | null;
  eventPath: number[];         // 이벤트로 추가 이동한 칸 순서
  to: number;                  // 최종 칸
  extraTurn: boolean;
}

export type GameEvent =        // ★ 씬 연출의 유일한 입력
  | { t: 'rolled'; face: number }
  | { t: 'moved'; pid: string; path: number[]; by: 'dice' | 'event' }
  | { t: 'passedStart'; pid: string; stars: number }
  | { t: 'landed'; pid: string; tile: number; kind: TileKind }
  | { t: 'eventApplied'; pid: string; eventId: string; eff: Effect; steps: number }
  | { t: 'questDrawn'; missionId: string; attempt: 1 | 2 }
  | { t: 'judged'; pid: string; success: boolean }
  | { t: 'starsAwarded'; pid: string; stars: number; reason: 'quest' | 'start' }
  | { t: 'turnStarted'; pid: string; member: string; round: number; isExtra: boolean }
  | { t: 'finalRound' }
  | { t: 'gameEnded'; reason: EndReason; winners: string[] };

export type EndReason = 'rounds-complete' | 'timeout' | 'manual';

export interface GameState {
  phase: Phase;
  config: GameConfig;
  board: Tile[];                         // length L, board[0].kind === 'start'
  currentIndex: number;
  round: number;                         // 1-based
  extraUsedThisTurn: boolean;            // extra 연쇄 상한 (1회)
  card: { mission: Mission; attempt: 1 | 2 } | null;
  lastMove: MoveResult | null;
  log: { seq: number; events: GameEvent[] }; // 전이마다 seq+1, events는 이번 전이분만
  endRequested: Extract<EndReason, 'timeout'> | null;
  winners: string[];
  endReason: EndReason | null;
}
```

### 2.4 규칙 세부 (권장 기본값 + 결정 필요 항목)

| 주제 | 권장 | 근거 / 비고 |
|---|---|---|
| **wrap** | `position = ((x % L) + L) % L`. 후진 이벤트도 wrap되며, 출발 칸을 거꾸로 지나도 보너스는 없다 | `ring.ts`에서 한 번만 구현하고 엔진·레이아웃·타임라인이 같이 쓴다 |
| **출발 통과 판정** | 전진 이동에서 `passes = floor((from + steps) / L)`. 출발 칸에 정확히 **도착해도 1회**로 친다(블루마블 월급 관례). 이벤트 전진으로 지나가도 센다 | `passedStart × startBonusStars`를 바로 지급하고 `starsAwarded{reason:'start'}`를 남긴다 |
| **이벤트 연쇄** | 이벤트로 이동한 칸이 **퀘스트면 퀘스트를 수행**하고, 이벤트·출발 칸이면 더 해결하지 않는다(연쇄 1단계) | 줄넘기를 더 하게 되니 핵심 가치에 맞고, 무한 연쇄도 막는다. **discuss-phase에서 확인할 것** |
| **extra 턴** | `extraTurn` → 같은 말, 같은 멤버. 라운드를 세지 않는다. **턴당 1회 상한**(`extraUsedThisTurn`) | 라운드 기준 공정성 유지 |
| **라운드** | `advanceTurn`에서 `next = (i+1) % n`. `next === 0`이면 `round+1`. `round > maxRounds` 또는 `endRequested`이면 `gameOver('rounds-complete' | 'timeout')` | 모든 말이 같은 횟수의 턴을 받는다. 시작 순서에 따른 불이익이 없다 |
| **팀 라운드** | 라운드 = **말(팀) 단위** 1턴. 멤버 순환은 그 안에서 일어난다 | 팀 인원이 많으면 라운드 수를 늘려야 모두 뛴다. SetupView에서 "팀원 모두 1번씩 = N라운드" 힌트를 계산해 보여준다(UI 책임) |
| **시간 제한** | DOM 시계가 0이 되면 `requestEnd('timeout')`만 호출한다. 엔진은 **현재 라운드가 끝날 때** 종료하고 `finalRound` 이벤트로 "마지막 라운드!" 배너를 띄운다 | 아이가 퀘스트를 하는 도중에 게임이 끊기지 않게 하고, 턴 수 공정성도 지킨다. v1의 즉시 종료(`end('timeout')`)는 이번 규칙에 맞지 않는다 |
| **수동 종료** | `endGame('manual')`은 즉시 종료(확인 다이얼로그는 기존 그대로) | 강사의 결정이다 |
| **실패 규칙** | `noStar`(기본: 별 없이 턴 종료), `retryOnce`(같은 미션 1회 재도전), `redrawOnce`(새 미션 1회) | 별을 깎는 규칙이나 뒤로 가는 규칙은 아동 대상에 맞지 않아 넣지 않는다(FEATURES와 맞출 것) |
| **별** | 성공 시 `starsFor(diff)` = easy 1 / normal 2 / hard 3. 엔진 상수로 둔다(설정으로 노출하지 않음) | 요구사항에 고정값으로 나와 있다. 나중에 필요하면 settings로 올리기 쉽다 |
| **승자** | `max(stars)`인 참가자 전원. 모두 0점이면 모두 공동 우승 | 아동용으로는 무해하다 |
| **판 배치** | `buildBoard`: 0 = 출발, 나머지는 퀘스트 약 70%, 이벤트 약 30%. 이벤트끼리 붙지 않게 하고, 이벤트 종류는 가중치 추첨. 이벤트 목록이 비었거나 가중치 합이 0이면 그 칸은 퀘스트 | 칸 종류는 게임 내내 고정되고 아이콘으로 보인다(메모리: "보드는 상태를 즉시 읽히게") |
| **판 크기** | 프리셋 16(5×5 둘레) / **20(6×6, 기본)** / 24(7×7). L = 4·(한 변 칸 수 − 1) | 블루마블 40칸은 20분 수업에 너무 크다 |

### 2.5 미션·이벤트 스냅샷 (harness 책임)

지금 harness는 `draw`/`roll`을 할 때마다 `useStore.getState()`로 **살아 있는** 콘텐츠를 읽는다. 게임 도중에 편집기로 이동할 수 있으므로(App 뷰 전환이 `activeGame`을 유지함), 진행 중에 이벤트를 지우면 `board[i].eventId`가 고아가 된다. **`startGame` 시점에 `{missions, events, rules}`를 harness 상태(`contentSnapshot`)로 복사**하고, 이후 전이는 이 스냅샷만 쓴다. 엔진 계약(콘텐츠는 인자로만 받는다)은 바뀌지 않는다.

---

## 3. 데이터 흐름

### 3.1 한 턴의 흐름 (주사위 → 이동 → 퀘스트 → 별)

```
[강사: 🎲 탭]  (ControlsBar: phase=awaitingRoll && !busy)
   │
   ▼
useGameStore.roll() ─► engine.rollDice(state, snapshot.missions, snapshot.events, rng)
   │                     · 엔진은 한 번에 끝까지 해결: 이동·출발 보너스·이벤트·미션 뽑기
   │                     · log = {seq+1, [rolled, moved(dice), passedStart?, starsAwarded(start)?,
   │                                      landed, eventApplied?, moved(event)?, questDrawn?]}
   ▼
useDirector (PlayView/GameShell에서 log.seq 구독)
   │  beats = buildTimeline(log.events, reducedMotion)
   │  presentation.play(beats)   → busy=true, displayed는 아직 이전 상태
   ▼
Scene / HUD가 presentation.current(beat)를 구독
   dice(1.0s) → hop×N(0.2s/칸, displayed.position 한 칸씩 갱신) → passStart(별 +b, 짧게)
   → tileReveal(0.4s) → [event: banner + hop×M] → [quest: card flip 0.6s]
   각 비트 컴포넌트가 끝나면 completeBeat(id). 비트마다 watchdog을 걸어(budget+500ms) 강제로 완료
   ▼
큐가 비면 busy=false → HUD: awaitingJudgement면 QuestCard의 [성공][실패] 표시
   │
[강사: 성공 탭] → useGameStore.judge(true) → engine: stars += starsFor(diff), phase=turnResolved
   log = [judged(success), starsAwarded(quest, n)]
   ▼
beats: celebrate(캐릭터 점프·회전 + 컨페티 + 별 버스트 + 충격파 링, ~1.6s)
     → starFly(DOM: 말 투영 좌표 → 점수판 행, ~0.8s, 끝나면 displayed.stars += n)
     → banner("별 n개!", ~0.8s)
   ▼
busy=false → [다음 ➡️] → advanceTurn → log=[turnStarted | finalRound | gameEnded]
   → beats: turnBanner(카메라가 다음 말로 이동) 또는 gameEnded → 결과 오버레이
```

### 3.2 상태 소유권

| 상태 | 소유자 | 읽는 쪽 |
|---|---|---|
| 규칙의 진실(위치·별·라운드·단계) | `engine` GameState (useGameStore) | HUD 컨트롤 분기, 결과 계산 |
| **표시용** 위치·별 | `usePresentation.displayed` | Pawn, Scoreboard |
| 진행 중 연출 | `usePresentation.queue/current/busy` | 모든 씬 컴포넌트, ControlsBar |
| 프레임 단위 트윈 진행도 | 각 컴포넌트의 `useRef` (useFrame에서 직접 변경) | 해당 컴포넌트 |
| 3D → 화면 투영 앵커 | presentation의 **비반응형** ref 슬롯(`anchors.current[pid]`) | FlyingStarLayer (비트 시작 때 1회 읽음) |
| 강사 설정 | `store.settings` (persist) | SetupView(기본값), harness(스냅샷) |

핵심 규칙: **엔진은 즉시 커밋하고, 화면은 displayed 상태로 따라간다.** 엔진의 `stars`를 점수판이 바로 읽으면 큰 별이 날아가기 전에 숫자부터 올라간다. 엔진의 `position`을 Pawn이 바로 읽으면 말이 순간이동한다. 타임라인이 끝날 때 `displayed`를 엔진 값으로 강제 동기화(`resync`)한다. 비트가 watchdog으로 건너뛰어졌어도 화면이 스스로 맞춰진다.

---

## 4. 강사 설정: ContentSchema v2 + persist migrate + JSON 호환 (HIGH, 코드로 확인)

### 4.1 위치 결정

- **`Content.settings`에 둔다**(별도 persist 키 아님). 요구사항이 "설정을 콘텐츠와 함께 저장·내보내기"이고, 강사끼리 커리큘럼과 규칙을 한 파일로 공유하는 쪽이 자연스럽다.
- 편집기에 **⚙️ 설정 탭**(`SettingsTab`)을 추가한다. SetupView는 `settings.defaultRounds`를 **초깃값**으로만 쓰고, 이번 판에 바꾼 값은 다시 저장하지 않는다. 설정을 쓰는 곳은 편집기 하나로 둔다.

```ts
// src/schema.ts (v2)
export const SCHEMA_VERSION = 2;
export const FailRule = z.enum(['noStar', 'retryOnce', 'redrawOnce']);
export const SettingsSchema = z.object({
  defaultRounds: z.number().int().min(1).max(30).default(5),
  startBonusStars: z.number().int().min(0).max(3).default(1),
  failRule: FailRule.default('noStar'),
  timeLimitMin: z.number().int().min(1).max(90).nullable().default(null),
});
export const DEFAULT_SETTINGS = SettingsSchema.parse({});

const Base = { categories: z.array(z.string()), missions: z.array(MissionSchema), events: z.array(EventSchema) };
export const ContentSchemaV1 = z.object({ version: z.literal(1), ...Base });
export const ContentSchema   = z.object({ version: z.literal(2), ...Base, settings: SettingsSchema.default(DEFAULT_SETTINGS) });
export type Content = z.infer<typeof ContentSchema>;

// 가져오기·persist migrate 공용 진입점
export function parseAnyContent(raw: unknown, keepSettings?: Settings): Content | null {
  const v2 = ContentSchema.safeParse(raw);
  if (v2.success) return v2.data;
  const v1 = ContentSchemaV1.safeParse(raw);
  if (v1.success) return { ...v1.data, version: 2, settings: keepSettings ?? DEFAULT_SETTINGS };
  return null;
}
```

### 4.2 persist 마이그레이션: 반드시 고칠 버그 경로

zustand persist의 실제 수화 순서를 `node_modules/zustand/esm/middleware.mjs`(5.0.14)에서 확인했다. 저장된 version ≠ options.version이면 `migrate(state, fromVersion)`를 호출하고, 그 결과를 `merge(migrated, current)`에 넘긴 뒤 **`migrated === true`이면 즉시 `setItem()`으로 다시 쓴다.**

지금 코드에서는 `migrate: (p) => p as Content`(통과)이고 `merge`는 `ContentSchema.safeParse` 실패 시 `current`(=시드)를 돌려준다. 버전만 2로 올리면 다음 순서로 데이터가 사라진다.
1. v1 저장본 → 통과 migrate → `version:1`인 객체 → v2 `ContentSchema` 검증 실패
2. merge가 **시드**를 반환하고, migrated=true이므로 **시드를 localStorage에 덮어씀**
3. 강사가 만든 미션이 사라진다(되돌릴 수 없음).

**처방:**
- `migrate: (p, from) => from === 1 ? parseAnyContent(p) ?? p : p`. v1→v2를 실제로 변환한다.
- `merge`도 `parseAnyContent`를 쓴다(이중 안전장치).
- persist `name`은 **`'powerjumping_content_v1'` 그대로 둔다.** 키를 바꾸면 기존 데이터를 못 찾는다.
- `partialize`에 `settings`를 추가한다.
- **테스트를 필수로 둔다:** v1 형태 문자열을 localStorage에 심음 → 스토어 수화 → 미션 보존 + `settings === DEFAULT_SETTINGS` + 저장본이 `version:2`로 다시 쓰였는지 확인.
- (선택) merge 실패로 시드에 떨어질 때, 원본을 `powerjumping_content_backup`에 복사해 두면 복구 경로가 생긴다.

### 4.3 JSON 가져오기·내보내기 호환

| 경우 | 동작 |
|---|---|
| v2 앱이 **v1 파일**을 가져옴 | `parseAnyContent(raw, 현재 settings)`로 **현재 설정을 유지**하고 미션·이벤트만 교체한다. 확인 다이얼로그 문구에 "규칙 설정은 그대로 유지돼요"를 넣는다 |
| v2 앱이 v2 파일을 가져옴 | 설정까지 통째로 교체한다(기존 동작과 같음) |
| v1 앱(구버전 배포본)이 v2 파일을 가져옴 | `z.literal(1)` 때문에 거부되고 "형식/버전이 맞지 않아요"가 뜬다. 데이터는 안전하다. 허용 가능한 동작이며 문서에만 남긴다 |
| `replaceAll` | 시그니처를 `Content`(v2)로 바꾸고 `settings`도 교체한다 |

`io.ts`의 크기 제한 → JSON.parse → 검증 → 확인 → `replaceAll` 순서는 그대로 두고, 검증 단계만 `parseAnyContent`로 바꾼다.

---

## 5. R3F 컴포넌트 트리와 연출 시퀀싱

### 5.1 트리

```
GameApp
├─ SetupView (DOM, 수정: 동물 선택·판 크기·라운드(설정 기본값)·시간)
└─ GameShell (신규: game≠null인 동안 Canvas를 언마운트하지 않음)
   ├─ <Suspense> GameCanvas = lazy(() => import('./scene/GameCanvas'))   ← three 번들 분리
   │   └─ <Canvas dpr={[1,2]} shadows={false} frameloop="always" camera={{fov:35}}>
   │       ├─ SceneLights (hemi + key dir, 그림자는 ContactShadows 1개 정도로)
   │       ├─ CameraRig            mode: overview | follow(pid) | podium. OrbitControls 없음
   │       ├─ Board
   │       │   ├─ Tile ×L          kind별 색·아이콘(이벤트=↑↓★ 모양 메시), 출발=게이트
   │       │   ├─ StartGate        출발 칸 아치 + 진행 방향 화살표(순환 방향을 읽히게)
   │       │   └─ PathHighlight    현재 비트의 경로 칸 점·도착 링 (moveHighlight 개념 이식)
   │       ├─ Pawn ×n              displayed.position + slotOffset으로 위치, hop 비트 실행
   │       │   └─ ChibiAnimal      species 테이블 + expression + action (절차 생성)
   │       ├─ Dice                 dice 비트: 회전 → 미리 굴린 눈으로 스냅
   │       ├─ CelebrationFX        celebrate 비트: Confetti(instanced) · StarBurst · ShockRing
   │       └─ AnchorProjector      celebrate/starFly 동안 활성 말의 월드 좌표 → 화면 좌표 기록
   ├─ HUD (DOM 오버레이, Canvas 형제)
   │   ├─ TopBar: 라운드 n/N · 시간 · 지금 마치기
   │   ├─ Scoreboard: 참가자별 동물 아이콘(SVG) + displayed.stars, 현재 차례 강조, 행 ref 등록
   │   ├─ QuestCard: 미션 이름·설명·난이도별 별 수 미리보기 + [성공][실패] (awaitingJudgement && !busy)
   │   ├─ EventBanner / TurnBanner / StarBanner (비트 구동)
   │   ├─ ControlsBar: 🎲(awaitingRoll) · 다음(turnResolved). busy면 숨김
   │   └─ FlyingStarLayer: starFly 비트 → 앵커에서 점수판 행까지 WAAPI 애니메이션 → completeBeat
   └─ ResultOverlay (gameOver && !busy): 공동 우승 포함 별 순위, 다시 하기/처음으로
       (같은 Canvas에서 CameraRig=podium, 우승자 ChibiAnimal은 cheer 동작)
```

### 5.2 Director 패턴 (ANIM_DONE 계약 확장)

v1의 `usePresentation`은 busy 1비트 + watchdog 1개였다. 시퀀스 단계는 PlayView가 `useState<Seq>`와 setTimeout 세 개로 관리했다. 그래서 watchdog 예산에 `PREVIEW_S`를 빠뜨려 컨트롤이 너무 일찍 나타나는 버그가 실제로 있었다(PlayView 주석). v2는 축하 연출, 출발 보너스, 이벤트 2단계 이동이 더해져 비트가 2~3배로 늘어난다. 이 관리를 **데이터(Beat[])** 로 옮긴다.

```ts
// src/game/director/timeline.ts — 순수, 단위 테스트 대상
export type Beat =
  | { id: number; kind: 'dice'; face: number; ms: number }
  | { id: number; kind: 'hop'; pid: string; path: number[]; ms: number }
  | { id: number; kind: 'passStart'; pid: string; stars: number; ms: number }
  | { id: number; kind: 'tileReveal'; tile: number; ms: number }
  | { id: number; kind: 'eventBanner'; eff: Effect; steps: number; ms: number }
  | { id: number; kind: 'cardFlip'; ms: number }
  | { id: number; kind: 'celebrate'; pid: string; stars: number; ms: number }
  | { id: number; kind: 'starFly'; pid: string; stars: number; ms: number }
  | { id: number; kind: 'sad'; pid: string; ms: number }
  | { id: number; kind: 'turnBanner'; pid: string; round: number; ms: number };

export function buildTimeline(events: GameEvent[], opts: { reducedMotion: boolean }): Beat[];
```

```ts
// src/game/usePresentation.ts (v2) — 기존 API(busy, signalAnimDone, startWatchdog)를 대체
interface PresentationState {
  queue: Beat[]; current: Beat | null; busy: boolean;
  displayed: { positions: Record<string, number>; stars: Record<string, number> };
  play(beats: Beat[]): void;          // 큐 적재 + 첫 비트 시작 + 비트별 watchdog 무장
  completeBeat(id: number): void;     // 멱등: id가 current가 아니면 무시
  applyDisplayed(patch): void;        // hop 한 칸, starFly 착지 시 호출
  resync(game: GameState): void;      // 큐가 비거나 리셋될 때 엔진 값으로 강제 일치
}
```

계약:
1. **비트마다 watchdog**(`ms + 500`)을 건다. 막힌 비트 하나만 건너뛰고 다음 비트는 정상 재생한다. 전체 예산을 계산할 필요가 없어진다.
2. `completeBeat`는 **id로 멱등 처리**한다. 언마운트, 중복 콜백, watchdog과 정상 완료가 겹쳐도 안전하다.
3. 이동 거리가 0인 비트(`path.length===0`), 해당 컴포넌트가 없는 비트, reduced-motion이면 **즉시 완료**한다.
4. 씬 컴포넌트는 `usePresentation(s => s.current?.kind === 'hop' && s.current.pid === myId ? s.current : null)`처럼 **좁은 셀렉터**로 구독한다. 진행도는 `useFrame` + ref로 변경하고, 프레임마다 `set`을 부르지 않는다.
5. `GameApp`의 "gameOver를 busy 뒤로 미루는" 규칙은 유지한다. 마지막 축하 연출이 끝난 뒤에 결과 오버레이가 나온다.

### 5.3 DOM HUD 오버레이 vs drei `<Html>` → **DOM 오버레이** (HIGH)

| 기준 | DOM 오버레이(형제) | drei `<Html>` |
|---|---|---|
| 큰 버튼 터치·접근성(ART-04, aria-live) | 일반 DOM이라 그대로 된다 | transform 안에 있어 터치 영역·포커스가 불안정하다 |
| jsdom 테스트 | 기존 `hud.test.tsx` 방식(BoardScene mock) 그대로 | Canvas가 필요해서 test-renderer에서는 `document` 가드가 필요했다(v1) |
| iOS 성능 | 정적 레이아웃 | 매 프레임 CSS transform을 갱신하고, 말 8개면 8개를 갱신 |
| 한글 텍스트 | 시스템 폰트로 바로 나온다 | 같음(Html은 DOM). 다만 drei `<Text>`(troika)는 Hangul이 없는 기본 Roboto를 쓰고 jsDelivr CDN에서 폴백 폰트를 가져온다. 오프라인 교실에서 깨질 위험이 있다 |

결정: **모든 텍스트·버튼·점수판은 DOM**에 둔다. 말 위 이름표는 만들지 않는다. 말의 정체성은 동물 종 + 색 링으로 구분하고, 점수판에 같은 동물 아이콘을 둬서 대응시킨다. 3D 쪽에 꼭 신호가 필요하면 글자 없는 메시(현재 차례 화살표·링)를 쓴다. 3D와 DOM을 잇는 연출은 `starFly` 하나뿐이고, `AnchorProjector`(씬) → 비반응형 ref → `FlyingStarLayer`(DOM)로 넘긴다.

### 5.4 카메라

- 기본은 **판 전체가 보이는 고정 아이소 뷰**(메모리: 방향·순위가 즉시 읽혀야 함). 화면 비율(iPhone 세로 vs 노트북 가로)에 맞춰 판의 바운딩 반경으로 거리를 계산하는 순수 함수 `fitDistance(radius, fov, aspect)`를 쓴다.
- `hop`/`celebrate` 비트 동안 활성 말 쪽으로 살짝 줌인하고, idle이 되면 overview로 lerp 복귀한다.
- **사용자 카메라 조작(OrbitControls)은 넣지 않는다.** 아이들이 화면을 건드리면 시점이 망가진다.

---

## 6. 권장 프로젝트 구조

```
src/
├── engine/                     # 순수 규칙 (React/DOM/시계 금지)
│   ├── types.ts                # [수정] Tile, Participant(stars, animal), GameRules, MoveResult, GameEvent
│   ├── engine.ts               # [수정] 순환판 FSM + log 생성
│   ├── ring.ts                 # [신규] wrap / path / passesStart
│   ├── scoring.ts              # [신규] starsFor / winnersByStars
│   ├── placement.ts            # [재작성] buildBoard
│   ├── setup.ts                # [수정] 판 크기 프리셋, 동물 배정
│   └── rng.ts                  # [유지]
├── schema.ts                   # [수정] V1/V2, SettingsSchema, parseAnyContent
├── store.ts                    # [수정] migrate v1→v2, settings 액션
├── lib/io.ts                   # [수정] parseAnyContent 사용
├── components/SettingsTab.tsx  # [신규] + Tabs에 '설정' 키 추가
├── harness/useGameStore.ts     # [수정] contentSnapshot, requestEnd, judge/roll 시그니처
└── game/
    ├── GameApp.tsx             # [수정] Setup | GameShell 라우팅
    ├── GameShell.tsx           # [신규] Canvas + HUD + ResultOverlay, useDirector
    ├── usePresentation.ts      # [수정] beat 큐 + displayed
    ├── director/
    │   ├── timeline.ts         # [신규] GameEvent[] → Beat[]
    │   └── useDirector.ts      # [신규] log.seq 구독 → play()
    ├── layout/
    │   ├── ringLayout.ts       # [신규] tile → 좌표/회전, slotOffset, fitDistance
    │   └── diceFaces.ts        # [복원] v1 diceRotation.ts (git d7b9b73)
    ├── scene/
    │   ├── GameCanvas.tsx      # [신규, lazy 기본 export]
    │   ├── Board.tsx · Tile.tsx · StartGate.tsx · PathHighlight.tsx
    │   ├── Pawn.tsx · CameraRig.tsx · Dice.tsx(v1 복원·개조)
    │   ├── characters/
    │   │   ├── animals.ts      # [신규] 종별 파라미터 테이블(귀·꼬리·색) — 순수
    │   │   ├── expressions.ts  # [신규] 표정 → 눈/입 파라미터 — 순수
    │   │   └── ChibiAnimal.tsx # [신규] 프리미티브 조립 + action 모션
    │   └── fx/ Confetti.tsx · StarBurst.tsx · ShockRing.tsx · AnchorProjector.tsx
    └── hud/
        ├── Scoreboard.tsx · QuestCard.tsx(MissionOverlay 개조) · ControlsBar.tsx(수정)
        ├── Banners.tsx · FlyingStarLayer.tsx · AnimalIcon.tsx(SVG)
        ├── TopBar.tsx(TurnHud 개조) · SetupView.tsx(수정) · ResultOverlay.tsx(ResultView 개조)
```

### Structure Rationale

- **`director/`를 `scene/` 밖에 둔다.** 타임라인은 순수 로직이라 jsdom/vitest로 직접 테스트할 수 있다. 씬은 비트를 소비하기만 한다.
- **`layout/`·`characters/animals.ts`·`expressions.ts`는 순수 모듈**로 둔다. v1 Pattern 1(수학은 React 밖에서 단위 테스트)을 이어간다.
- **`GameCanvas`는 lazy 기본 export**로 둔다. v1 번들은 three 때문에 약 1.23MB(gzip 343KB)였다. 편집기 진입은 가볍게 유지한다.

---

## 7. 2D 렌더러에서 삭제·교체할 것

| 파일 | 처리 | 이유 |
|---|---|---|
| `game/scene/BoardScene.tsx` (2D DOM/SVG) | **삭제** | 3D 씬으로 대체 |
| `game/scene/scene.test.tsx` | **삭제 후 재작성** | test-renderer 기반 3D 구조 테스트로 |
| `game/boardLayout.ts` (+test) | **삭제** | 지그재그·결승 개념. `ringLayout.ts`로 대체 |
| `game/animation.ts` | **삭제** | `buildMovePath`/`clampSquare`는 선형·결승 클램프 전제. 경로는 엔진 `MoveResult.dicePath/eventPath`가 준다. 타이밍 상수는 `timeline.ts`로 |
| `game/diceRotation.test.ts` | **삭제** | 이름과 달리 `animation.ts` 테스트다. `diceFaces.test.ts`로 대체 |
| `game/moveHighlight.ts` (+test) | **개념만 이식 후 삭제** | 결승 클램프 로직은 쓸모없다. "경로 점 + 도착 링 + 이벤트 핀" 아이디어만 `PathHighlight`로 |
| `game/PlayView.tsx` | **삭제** → `GameShell.tsx` | 수동 seq/타이머/watchdog 예산 계산을 Director가 대체. DOM 카운트다운 effect만 옮긴다(`requestEnd`를 호출하도록 수정) |
| `game/hud/PositionReadout.tsx` | **삭제** → `Scoreboard` | "결승까지 남은 칸" 개념이 없어짐 |
| `game/hud/DiceResultPanel.tsx` | **삭제** → `EventBanner` | 결승/전진 문구 |
| `game/hud/MissionOverlay.tsx` | **개조** → `QuestCard` | 판정 버튼 구조는 재사용, 난이도 → 별 수 표시 추가 |
| `game/hud/TurnHud.tsx` | **개조** → `TopBar` | 라운드 n/N 추가 |
| `game/hud/ControlsBar.tsx` | **수정** | `awaitingDraw`(🎴) 분기 삭제 |
| `game/hud/ResultView.tsx` | **개조** → `ResultOverlay` | `position칸` → 별 순위, 공동 우승 표시 |
| `game/hud/SetupView.tsx` | **수정** | boy/girl → 동물, `boardLengthFor` → 판 크기, 라운드 입력 |
| `public/assets/cc0/kenney/toon-characters/*` | **Phase C 이후 삭제** | 코드 생성 캐릭터로 대체. `board-game-icons/dice_*.png`는 DOM 결과 아이콘으로 쓸 거면 남기고, 아니면 삭제. NOTICE.md도 정리 |
| `game/styles/game.css` | **부분 정리** | 2D 보드·토큰·스프라이트 규칙 삭제, HUD 토큰(--tap 등)은 유지 |
| `hud/hud.test.tsx`, `hud/shell.test.tsx` | **수정** | 단계 분기(🎴 제거)와 라우팅(GameShell) 반영 |

**v1 3D 코드 재활용:** `git show d7b9b73:src/game/scene/Dice.tsx`, `…/diceRotation.ts`, `…/BoardScene.tsx`(Canvas 설정: dpr, 조명, ContactShadows), `…/Token.tsx`(hop 트윈). 둥근 광택 캔디 재질과 pip geometry dispose 패턴이 들어 있다. 처음부터 다시 만들지 말고 복원해서 개조한다.

---

## 8. Architectural Patterns

### Pattern 1: 엔진은 즉시 커밋, 화면은 이벤트 로그를 재생

**What:** 엔진 전이는 결과를 즉시 확정하고 `log.events`를 남긴다. 연출은 그 로그로 비트를 만들어 따라간다. 연출이 결과를 정하는 일은 없다(주사위 눈도 엔진이 먼저 굴림).
**When:** 모든 엔진 전이(roll/judge/advance/end).
**Trade-offs:** 엔진 상태와 화면 상태를 두 벌(engine vs displayed) 유지해야 한다. 대신 테스트 가능성, 결정성, 되감기 없는 일관성을 얻는다. v1의 `handleJudge`처럼 엔진 커밋을 `setTimeout(REACTION_MS)`로 늦추는 방식은 버린다. 타이머가 PlayView에 흩어지고, 언마운트 레이스 버그가 생긴다.

```ts
// useDirector.ts
useEffect(() => useGameStore.subscribe((s, prev) => {
  if (!s.game || s.game.log.seq === prev.game?.log.seq) return;
  usePresentation.getState().play(buildTimeline(s.game.log.events, { reducedMotion: prefersReducedMotion() }));
}), []);
```

### Pattern 2: 비트 소비자 컴포넌트

```tsx
function Pawn({ pid }: { pid: string }) {
  const beat = usePresentation((s) => (s.current?.kind === 'hop' && s.current.pid === pid ? s.current : null));
  const tile = usePresentation((s) => s.displayed.positions[pid]);
  const t = useRef(0); const step = useRef(0);
  useEffect(() => { t.current = 0; step.current = 0; }, [beat?.id]);
  useFrame((_, dt) => {
    if (!beat) return;
    t.current += dt / HOP_S;
    // 포물선 hop 보간 → 한 칸 끝날 때마다 applyDisplayed({positions:{[pid]: beat.path[step]}})
    if (step.current >= beat.path.length) usePresentation.getState().completeBeat(beat.id);
  });
  …
}
```
`completeBeat`는 비트가 끝날 때 한 번 호출하고, `applyDisplayed`는 칸 경계에서만 호출한다(프레임당 호출 아님).

### Pattern 3: 절차 생성 치비 캐릭터 = 데이터 테이블 + 조립 컴포넌트

**What:** `animals.ts`(종별 머리·귀·꼬리·주둥이 파라미터·팔레트)와 `expressions.ts`(표정 → 눈 scaleY, 입 곡률, 볼터치, 눈썹 각도)를 순수 데이터로 둔다. `ChibiAnimal`은 공유 geometry(구·캡슐·토러스 소수)로 조립하고, `expression`은 즉시 전환하며, `action`(idle/hop/jumpSpin/sad/rope/cheer)은 useFrame 모션으로 처리한다.
**Trade-offs:** 모델 파일 로딩, 리깅, 라이선스 문제가 없고 표정을 무한히 바꿀 수 있다(.glb 대신 이 방식을 택한 이유). 단점은 "귀여움"이 수치 튜닝에 달려 있다는 것이다. 디자인 반복(스파이크/스케치)이 필요하다(메모리: "견본보다 확실히 더 귀엽게").
**자원:** geometry/material은 모듈 단위 싱글턴으로 공유한다(말 8개 × 메시 20개 = 드로우콜 약 160, iPhone에서 여유 있음). GameShell이 언마운트될 때 dispose한다. 선언형 JSX geometry는 R3F가 자동으로 dispose한다.

---

## 9. Anti-Patterns

| 하지 말 것 | 문제 | 대신 |
|---|---|---|
| persist 버전만 2로 올리고 `migrate` 통과 유지 | merge 검증 실패 → **시드가 강사 데이터를 덮어씀** | §4.2 실제 migrate + 수화 테스트 |
| 씬이 엔진 `position`/`stars`를 직접 렌더 | 순간이동, 점수가 연출보다 먼저 오름 | `displayed` + 타임라인 끝에서 `resync` |
| `useFrame` 안에서 Zustand `set`/React setState를 매 프레임 호출 | iPhone에서 리렌더 폭주 | ref 변경, 칸 경계·비트 경계에서만 set |
| 결과 화면 전환 때 Canvas 언마운트·재마운트 반복 | GPU 메모리 누적, iOS WebGL 컨텍스트 손실(v1 Pitfall 2) | GameShell이 게임 동안 Canvas를 유지하고 결과는 오버레이 + podium 카메라 |
| 점수판 아바타를 위해 **두 번째 Canvas** | iOS는 동시 WebGL 컨텍스트 수가 적고 메모리가 2배 | DOM SVG `AnimalIcon`(같은 팔레트 테이블 공유) |
| drei `<Text>`로 한글 표시 | troika 기본 폰트에 Hangul이 없고 CDN 폴백이라 오프라인에서 깨짐 | DOM 텍스트. 꼭 필요하면 self-host 한글 서브셋 폰트 |
| 시간 초과 시 즉시 `gameOver` | 퀘스트 도중 종료, 턴 수 불공정 | `requestEnd` → 라운드 끝에서 종료 + "마지막 라운드" 배너 |
| 게임 중 살아 있는 store에서 미션·이벤트 조회 | 편집기 수정으로 고아 eventId 발생 | 시작 시 스냅샷 |
| 물리 주사위(rapier) | 결과가 비결정적이고, 결과를 연출이 정하게 됨 | 트윈 + 미리 굴린 눈으로 스냅(v1 방식 유지) |
| OrbitControls 노출 | 아이들 터치로 시점이 망가짐 | 고정 리그 + 자동 줌 |

---

## 10. Integration Points (내부 경계)

| 경계 | 통신 | 비고 |
|---|---|---|
| store ↔ harness | `startGame`에서 `useStore.getState()`를 1회 읽어 스냅샷 | 이후 store를 읽지 않음 |
| harness ↔ engine | 순수 전이 호출 + `systemRng()` 주입 | 테스트는 `mulberry32` 시드 |
| harness → director | `log.seq` 변화 구독(zustand `subscribe`) | React 렌더 밖에서 처리해 중복 재생 방지 |
| director → scene/HUD | `usePresentation.current` 셀렉터 구독 | 비트 id 기반 멱등 완료 |
| scene → DOM(FlyingStar) | 비반응형 앵커 ref(화면 px) | 비트 시작 때 1회 샘플링 |
| HUD → harness | 버튼 → `roll/judge/next/end` | `busy`면 버튼을 숨김(현행 유지) |
| DOM 시계 → harness | `requestEnd('timeout')` | 엔진은 시계를 모른다(현행 계약) |
| editor(SettingsTab) → store | `updateSettings(patch)` | Zod `SettingsSchema`로 폼 검증 |
| io ↔ store | `parseAnyContent` → 확인 → `replaceAll` | v1 파일이면 settings 유지 |

## 11. Scaling Considerations (이 앱의 "규모" = 단일 기기 성능)

| 부하 | 대응 |
|---|---|
| 말 8개 × 치비(메시 약 20개) | 공유 geometry/material, 그림자 맵 대신 ContactShadows 1개 |
| 컨페티 | InstancedMesh 1개, 200~300개, 비트 동안만 갱신하고 끝나면 count=0 |
| iPhone 발열·배터리 | `dpr={[1,2]}`. idle 모션 때문에 `frameloop="always"`를 쓰되 `document.hidden`이면 일시정지. 필요하면 drei `PerformanceMonitor`로 dpr 하향 |
| 연속 여러 판 | Canvas 유지 + `resetGame`. 5판 연속 후 `gl.info.memory`가 평탄한지 UAT(v1 D7 항목 재사용) |
| 번들 | GameCanvas lazy 분리. 편집기 초기 로드에는 three를 포함하지 않음 |

---

## 12. 권장 빌드 순서 (의존성 기반)

```
A. 데이터·엔진·하네스 (3D 없음) ──► B. 3D 보드 골격 + Director + HUD ──► C. 치비 캐릭터 ──► D. 축하 연출·결과·정리
        │                                   ▲                                │                    ▲
        └─ schema v2 → store migrate → io ──┘                                └── (C와 D 일부 병행 가능) ┘
```

**Phase A — 규칙과 데이터 (헤드리스 검증)**
1. `schema.ts` v2 + `parseAnyContent` → `store.ts` migrate/merge + **v1 수화 테스트** → `io.ts` → `SettingsTab`
2. `ring.ts`, `scoring.ts` → `types.ts` → `placement.buildBoard` → `engine.ts` FSM + log → 새 `engine.test.ts`(wrap, 출발 통과, 이벤트 연쇄 1단계, extra 상한, 라운드·팀, requestEnd, 실패 규칙 3종, 동점)
3. `harness` 스냅샷·requestEnd → `SetupView` 수정
4. **임시 DOM 루프 화면**(버튼 + 텍스트 점수판)으로 PlayView 교체, 2D 보드 파일 삭제. 앱이 끝까지 플레이되는 상태를 유지한다.
   - 이유: 엔진 타입이 바뀌면 2D BoardScene은 어차피 컴파일되지 않는다. v1 Phase 2가 그랬듯 규칙을 3D 전에 확정한다.

**Phase B — 3D 골격 (플레이스홀더 말)**
1. R3F 스택 설치(STACK.md 버전, 정확한 버전으로 pin). `GameShell` + lazy `GameCanvas`
2. `ringLayout` + `Board/Tile/StartGate` + `CameraRig`(fit) + v1 `Dice` 복원
3. `timeline.ts` + `usePresentation` v2 + `useDirector` (**단위 테스트를 먼저**)
4. 캡슐 플레이스홀더 `Pawn` hop + `PathHighlight` + DOM HUD(Scoreboard, QuestCard, ControlsBar, Banners)
5. iPhone Safari 실기기 확인(세로 fit, 발열, 터치)
   - 이유: 연출 계약(Director)은 캐릭터·이펙트보다 먼저 굳어야 한다. C와 D는 이 계약에 비트 소비자를 추가하는 작업이다.

**Phase C — 치비 동물 캐릭터와 표정** (디자인 반복 위험이 가장 큼 → 스파이크나 스케치를 먼저)
1. `animals.ts`/`expressions.ts` 테이블 + `ChibiAnimal` 조립 + action 모션
2. Pawn에 장착, SetupView 동물 선택 + `AnimalIcon`(SVG) 점수판 대응
3. kenney toon-characters 자산 삭제

**Phase D — 축하 연출·결과·마감**
1. `CelebrationFX`(Confetti/StarBurst/ShockRing) + `AnchorProjector` + `FlyingStarLayer` → displayed.stars 착지 갱신
2. 실패 반응(sad), 출발 보너스 연출, 라운드·마지막 라운드 배너
3. `ResultOverlay` + podium 카메라(공동 우승)
4. reduced-motion, 연속 5판 메모리 UAT, 번들 확인, 남은 CSS·자산 정리

C와 D는 Director 계약이 있으므로 일부 병행할 수 있다(FX는 플레이스홀더 말로도 개발 가능). 다만 `celebrate` 비트의 캐릭터 jumpSpin은 C가 필요하다.

**리서치 플래그:**
- Phase A: 표준 패턴이라 추가 리서치는 필요 없다. 이벤트 연쇄·팀 라운드 정의·시간 종료 시점은 **discuss-phase에서 사용자 확인**이 필요하다.
- Phase B: iOS Safari WebGL 성능과 세로 화면 카메라 fit은 실기기 검증이 필요하다(MEDIUM).
- Phase C: 절차 생성 캐릭터의 "귀여움"은 디자인 스파이크가 필요하다(메모리 피드백).
- Phase D: 3D → DOM 별 비행의 좌표 정합(리사이즈, safe-area)에 짧은 스파이크를 권장한다.

---

## Sources

- 코드 직접 확인(HIGH): `src/engine/{types,engine,rng,placement,setup}.ts`, `src/harness/useGameStore.ts`, `src/game/{usePresentation,GameApp,PlayView,animation,boardLayout,moveHighlight}.ts(x)`, `src/game/hud/ControlsBar.tsx`, `src/schema.ts`, `src/store.ts`, `src/lib/io.ts`, `src/App.tsx`
- zustand persist 수화 순서(migrate → merge → migrated면 setItem): `node_modules/zustand/esm/middleware.mjs` (zustand 5.0.14) 직접 확인(HIGH)
- v1 3D 경험: `.planning/milestones/v1.0-phases/03-board-game-ui/03-01-SUMMARY.md`, `03-02-SUMMARY.md`, `03-RESEARCH.md` (Pitfall 1~6: ANIM_DONE 교착, GPU 메모리, jsdom WebGL, demand 프레임루프, three 타입 드리프트, R3F v9↔React 19). 3D 소스는 git `d7b9b73` (HIGH)
- npm registry(2026-10-22 확인): three 0.186.1, @react-three/fiber 9.8.2 (peer react `>=19 <19.4`), @react-three/drei 10.7.9 (peer fiber `^9`), @react-three/test-renderer 9.1.1, zustand 5.0.16 (HIGH)
- troika-three-text 문서(drei `<Text>` 내부): 기본 폰트는 Google Fonts의 Roboto이고, 없는 글리프는 unicode-font-resolver로 jsDelivr CDN에서 폴백을 가져온다. self-host하려면 약 300MB — https://protectwise.github.io/troika/troika-three-text/ (MEDIUM, 공식 문서지만 Hangul 커버리지는 명시되지 않음)
- 사용자 메모리: "보드는 방향·결승점·순위를 즉시 읽히게, 말은 캐릭터", "견본보다 확실히 더 귀엽게"

---
*Architecture research for: 파워점핑 v2.0 3D 블루마블 재구축*
*Researched: 2026-10-22*
