# Phase 2: 플레이 가능한 핵심 루프 & 설정 - Research

**Researched:** 2026-07-25
**Domain:** Headless turn-based game engine (pure TS FSM) + injectable RNG + throwaway DOM harness
**Confidence:** HIGH (codebase-grounded; stack fully pinned and verified in package.json; algorithms are standard/stable)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (모드):** 시작 화면에서 개인전 / 팀전 둘 다 선택 (SETUP-02). 개인전 = 각자 말 하나. 팀전 = **팀이 말 하나를 공유**, 팀원이 번갈아 미션 수행(그 팀 턴에 지정 순번 팀원이 수행 → 성공 시 팀 말 전진). 각 플레이어/팀: 이름(SETUP-04), 캐릭터 남/여(SETUP-05), 인원/팀 수(SETUP-03).
- **D-02 (세션 길이):** ~20분 수업용. 게임 길이는 **보드 칸 수 프리셋**으로 조절("짧게"/"보통"), **기본값 = 짧게**. 칸 수가 게임 시간의 핵심 레버.
- **D-03 (정상 승리):** 결승선에 **먼저 닿거나 넘는** 사람/팀 (초과 통과 허용). **정확히 결승 칸에 안 떨어져도 됨** — 도달/초과 즉시 승리. exact-landing 강제 금지.
- **D-04 (시간 종료 승리):** 제한시간(기본 20분) 옵션 + 언제든 누르는 **"지금 순위로 마치기"** 버튼. 타이머 0 또는 강사 종료 → **결승에 가장 가까운(가장 앞선) 플레이어/팀 승리**.
- **D-05 (동점 처리 — Claude 판단):** 시간 종료 시 최선두 동점(같은 칸)이면 **공동 승리로 표시**, 강사가 최종 승자 선택 가능. 정상 승리는 턴제라 단일 승자.
- **D-06 (핵심 루프):** 현재 차례 → 카드 뽑기(미션 1장, 이름·설명·난이도 크게) → 강사 성공/실패 수동 판정 → 실패면 전진 없이 다음 차례 → 성공이면 주사위(1~6) → 전진 → 멈춘 칸 이벤트 적용 → "한 번 더"면 같은 플레이어/팀 추가 턴, 그 외 다음 차례 → 승리/시간종료 판정.
- **D-07 (이벤트 배치, EVENT-06):** 보드 칸 이벤트는 Phase 1 이벤트 라이브러리에서 **가중치(weight) 기반** 배치. 격리 RNG 모듈로 배치·주사위·카드 처리(분포 테스트 가능). 효과: forward/backward/extra (Phase 1 계약 그대로).
- **D-08 (빈 목록 안내, MISSION-07):** 카드 뽑기는 Phase 1 미션 목록에서. **목록이 비면 시작 전 안내**(편집기로 유도)하고 시작을 막는다.
- **D-09 (아키텍처):** **헤드리스 게임 엔진**(턴 FSM, 가중치 뽑기, 주사위, 이동, 이벤트 배치·적용, 승리·시간종료 판정)을 React/DOM과 분리해 단위 테스트. 격리 RNG는 분포 테스트 포함. UI는 엔진을 구독하는 **플레인 DOM 하네스**(Phase 3가 3D+실제 UI로 대체). Phase 1의 store/schema 재사용.

### Claude's Discretion (연구·계획에서 확정)
- 보드 칸 프리셋의 정확한 칸 수(예: 짧게 ~20칸 / 보통 ~30칸)와 기본 인원/팀 수 기본값.
- 타이머 표시 방식(카운트다운)과 "게임 종료" 버튼 위치(하네스라 최소).
- 팀전 팀원 순번 UI(이번에 누가 수행하는지 표시).
- 남/여 캐릭터는 이 단계에선 이름표/색상 등 플레이스홀더로만.

### Deferred Ideas (OUT OF SCOPE)
- 게임 도중 저장/이어하기(QOL-01, v2), 카테고리별 게임(QOL-02, v2), 승패 기록/통계(QOL-03, v2).
- 사운드/BGM(AUDIO, v2).
- 실제 아동용 UI·3D 연출은 Phase 3, 아트·캐릭터·로고는 Phase 4.
- LOOP-06 (3D 토큰 이동 애니메이션)은 Phase 3.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETUP-01 | 시작 화면 "파워점핑" 로고 + 시작 버튼 | 하네스는 로고 자리표시자만(실제 로고 Phase 4). 시작 버튼이 `createGame(config)` 호출. |
| SETUP-02 | 개인전/팀전 모드 선택 | `GameConfig.mode: 'solo' \| 'team'` (§Setup/config model) |
| SETUP-03 | 플레이어/팀 인원 수 설정 | `participantCount` → `buildParticipants()` (§Setup/config model) |
| SETUP-04 | 각 플레이어/팀 이름 입력 | `Participant.name`; 팀은 `memberNames[]` |
| SETUP-05 | 캐릭터(남/여) 배정 | `Participant.character: 'boy' \| 'girl'` (플레이스홀더) |
| SETUP-06 | 설정 완료 후 게임 시작 | `createGame()` 전이 → phase `'awaitingDraw'` |
| LOOP-01 | 턴 시작 → 미션 1장 뽑기 | `drawCard(state, missions, rng)` (§Headless engine). 카드 회전 연출은 Phase 3; Phase 2는 즉시 뽑기. |
| LOOP-02 | 미션 이름/설명/난이도 크게 표시 | `state.card.mission` (Mission from src/schema.ts: name/desc/diff) |
| LOOP-03 | 성공/실패 수동 판정 | `judge(state, success: boolean)` |
| LOOP-04 | 실패 시 전진 없이 다음 차례 | `judge(false)` → `advanceTurn` |
| LOOP-05 | 성공 시 주사위 1~6 | `judge(true)` → phase `'awaitingRoll'`; `rollDie(rng)` |
| LOOP-07 | 멈춘 칸 이벤트 효과 적용 | `boardEvents[]` 조회 + `applyLanding()` (forward/backward/extra) |
| LOOP-08 | "한 번 더"=추가 턴, 그 외 다음 플레이어 | `LandingResult.extraTurn` → `advanceTurn` 분기 |
| LOOP-09 | 결승 먼저 도달 → 승리·결과 화면 | `checkWin` on move (position ≥ boardLength); phase `'gameOver'` |
| LOOP-10 | 결과 화면에서 재시작/시작화면 복귀 | `resetGame()` / `createGame()` 재호출 |
| MISSION-07 | 미션 비면 시작 전 안내·차단 | `canStart(missions)` guard (§Setup/config model, D-08) |
| EVENT-06 | 이벤트 배치는 가중치 따름 | `placeEvents(events, boardLength, rng)` weighted (§Weighted selection) |
</phase_requirements>

## Summary

Phase 2는 새 라이브러리가 필요 없는 **순수 로직 phase**다. 스택은 이미 확정·검증됐고(package.json: react 19.2.8, zustand 5.0.14, zod 4.4.3, vitest 3.2.4), 3D/물리엔진은 Phase 3+로 유예됐다. 산출물은 (1) React/DOM import이 전혀 없는 **순수 TS 헤드리스 엔진**(불변 GameState + 순수 전이 함수), (2) **주입 가능한 시드형 RNG 모듈**(런타임은 crypto/Math.random, 테스트는 seed 고정 mulberry32 → 결정적 분포 테스트), (3) 엔진을 버튼으로 구동하는 **던져버릴 플레인 DOM 하네스**다.

핵심 설계 원칙은 Phase 1이 이미 확립한 패턴을 그대로 잇는 것이다: Phase 1의 store는 "PHASE 2 CONTRACT: this file MUST stay free of any React/DOM imports"라고 명시적으로 선언하며, 상태 전이를 부작용 없는 순수 함수로 만든다. 엔진도 동일하게 `(state, input, rng) => nextState` 형태의 순수 전이로 만들면 vitest로 루프 전체를 망라 테스트할 수 있다. 엔진은 미션·이벤트를 store에서 import하지 않고 **인자로 주입받아** 결합도를 낮춘다(테스트 용이 + Phase 3 재사용).

가장 중요한 리스크 관리 포인트: **벽시계 타이머(wall-clock)를 순수 엔진 밖에 두는 것**. 엔진은 `Date.now()`를 절대 읽지 않는다. DOM 하네스가 카운트다운을 소유하고, 0이 되거나 강사가 "지금 마치기"를 누르면 엔진의 `endGame(reason)` 전이를 호출한다. 이렇게 하면 엔진이 결정적으로 유지되고 시간 종료 승자 계산도 순수 함수로 단위 테스트된다.

**Primary recommendation:** 엔진을 `src/engine/`에 순수 모듈(types.ts / rng.ts / placement.ts / engine.ts)로 두고, RNG를 인자 주입, 미션·이벤트를 인자 주입, 타이머를 DOM에 위임하라. 하네스는 얇은 `useGameStore`(zustand) 또는 `useReducer`로 엔진 전이를 감싸고, 미션·이벤트는 `useStore.getState()`로 읽어 넘긴다. 새 npm 패키지는 설치하지 않는다.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 턴 상태 머신(FSM) | Pure engine (`src/engine/engine.ts`) | — | React/DOM 무관, 결정적 단위 테스트 대상 (D-09) |
| RNG(주사위·가중치 뽑기·배치) | Pure engine (`src/engine/rng.ts`) | — | 주입식; 테스트는 seed 고정, 런타임은 crypto/Math.random |
| 이벤트 배치(EVENT-06) | Pure engine (`src/engine/placement.ts`) | — | 가중치 로직, Phase 1 weight 모델 재사용 |
| 승리/시간종료 판정 | Pure engine | — | `checkWin`/`computeLeaders` 순수 함수 |
| 미션·이벤트 데이터 소스 | Content store (`src/store.ts`) | Pure engine (인자 주입) | store는 소유, 엔진은 소비만(import 금지) |
| **벽시계 카운트다운 타이머** | **DOM 하네스** | Pure engine (`endGame` 입력만) | 시간은 부작용 — 엔진 순수성 보존의 핵심 (§Pitfall 1) |
| 버튼 조작·상태 구독 | DOM 하네스 (`src/harness/`) | — | 던져버릴 UI; Phase 3가 3D+실제 UI로 대체 |
| 게임 상태 보관/구독 | 얇은 `useGameStore`(zustand) 또는 `useReducer` | Pure engine | Phase 1 단일 store 패턴 계승 |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 (installed) | 엔진 타입(GameState/전이) | Phase 1과 동일; 데이터 모델 계약 정확성 [VERIFIED: package.json] |
| Zustand | 5.0.14 (installed) | 얇은 게임 상태 store(선택) | Phase 1 store 패턴 계승; `useReducer`로도 충분 [VERIFIED: package.json] |
| Zod | 4.4.3 (installed) | 기존 Mission/Event 스키마 재사용(신규 스키마 불필요) | 엔진이 이미 검증된 `Mission`/`Event` 타입 소비 [VERIFIED: package.json] |
| Vitest | 3.2.4 (installed) | 엔진 단위·분포 테스트 | Phase 1에 이미 구성됨(jsdom/globals) [VERIFIED: vitest.config.ts] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| mulberry32 (인라인, ~6줄) | n/a — 코드에 직접 작성 | 시드형 결정적 PRNG(테스트용) | 항상. npm 패키지 아님 — `src/engine/rng.ts`에 인라인. 런타임 RNG는 crypto/Math.random. [CITED: gist.github.com/tommyettinger/46a874533244883189143505d203312c] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 인라인 mulberry32 | `seedrandom` npm 패키지 | 외부 의존성 추가·감사 필요; mulberry32는 6줄이라 인라인이 더 단순하고 감사 표면 0 |
| 인라인 mulberry32 | splitmix32 | splitmix32가 약간 빠르고 완전 주기(2³²)지만, 게임 규모에 무의미. 둘 다 무방; mulberry32가 가장 널리 인용됨 |
| 얇은 zustand `useGameStore` | `useReducer` (하네스 로컬) | 엔진이 순수 reducer라 `useReducer`가 가장 직접적. zustand는 Phase 1 패턴 일관성·구독 편의. 둘 다 가능 — **planner 확정** |
| RNG 인자 주입 | 전역 싱글턴 RNG | 전역은 테스트 결정성 파괴. 주입이 유일한 정답 (D-09 분포 테스트 요구) |

**Installation:**
```bash
# 신규 패키지 없음. 엔진은 순수 TS이고 vitest는 이미 설치됨.
# mulberry32는 src/engine/rng.ts에 인라인 작성.
```

**Version verification:** 모든 런타임 의존성은 Phase 1에서 설치·검증됨. [VERIFIED: package.json — react 19.2.8, react-dom 19.2.8, zustand 5.0.14, zod 4.4.3, react-hook-form 7.83.0, @hookform/resolvers 5.4.2, vitest 3.2.4, typescript 5.9.3, vite 8.1.5]

## Package Legitimacy Audit

> 이 phase는 **외부 패키지를 설치하지 않는다.** 엔진은 순수 TypeScript이며, RNG는 npm 패키지가 아니라 `src/engine/rng.ts`에 인라인으로 작성하는 ~6줄 함수다. vitest는 Phase 1에서 이미 설치·사용 중이다.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | — | — | — | — | — | 신규 설치 없음 |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*mulberry32는 패키지가 아니라 공개 도메인 알고리즘(인라인 코드)이므로 레지스트리 감사 대상이 아니다. `seedrandom` 등 외부 PRNG 패키지 설치는 **권장하지 않는다**(불필요한 감사 표면).*

## Architecture Patterns

### System Architecture Diagram

```
[Content Store (Phase 1)]                         [DOM Harness — throwaway]
  useStore.getState()                               ┌────────────────────────────┐
   .missions  .events  ──(주입, read-only)──▶       │  Start/Setup screen        │
                                                    │   mode/count/names/char    │
                                                    │   boardPreset/timeLimit    │
                                                    └──────────┬─────────────────┘
                                                               │ createGame(config, missions, events, rng)
                                                               ▼
   ┌───────────────────────── Pure Engine (src/engine, NO React/DOM) ──────────────────────────┐
   │                                                                                            │
   │  rng.ts   ── inject ──▶  engine.ts  transitions:  (state, input, rng) => nextState         │
   │  placement.ts (weighted board events, EVENT-06)                                            │
   │                                                                                            │
   │   FSM phases:                                                                               │
   │   awaitingDraw ─DRAW_CARD─▶ awaitingJudgement ─JUDGE(false)─▶ (advanceTurn) awaitingDraw    │
   │                                        └──JUDGE(true)──▶ awaitingRoll ─ROLL_DICE─┐          │
   │                                                                                  ▼          │
   │        gameOver ◀─checkWin(pos≥finish)─ turnResolved ◀─applyLanding(event)─ move(roll)      │
   │                                        │ extraTurn? ─yes─▶ same participant                 │
   │                                        └─ no ─▶ advanceTurn (next participant)              │
   │        gameOver ◀────────────── END_GAME(reason) [from harness timer/button] ──────────────│
   └──────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                               │ state emitted (subscribe)
                                               ▼
                                    ┌────────────────────────────┐
                                    │ Play harness: 턴/성공·실패/  │
                                    │ 주사위/위치/이벤트/결과 버튼 │
                                    │ + wall-clock countdown ─────┼──▶ calls END_GAME('timeout')
                                    └────────────────────────────┘        or END_GAME('manual')
```

### Recommended Project Structure
```
src/
├── engine/                 # 순수 TS, React/DOM import 금지 (D-09; store.ts 계약과 동일)
│   ├── types.ts            # GameState, GameConfig, Participant, LandingResult, Phase 등
│   ├── rng.ts              # Rng 인터페이스, mulberry32(seed), systemRng(), rollDie, weightedPick
│   ├── placement.ts        # placeEvents(events, boardLength, rng, density) — EVENT-06
│   ├── engine.ts           # createGame/drawCard/judge/rollDice/advanceTurn/endGame (순수 전이)
│   ├── setup.ts            # GameConfig 빌드: buildParticipants(), boardLengthFor(preset), canStart()
│   ├── rng.test.ts         # 분포 테스트(주사위 버킷, 가중치 비율)
│   ├── placement.test.ts   # 가중치 배치 + 엣지케이스(빈/전부0/짧은 보드)
│   ├── engine.test.ts      # FSM 전이 망라 + 승리/시간종료
│   └── setup.test.ts       # 프리셋·participant 빌드·canStart 가드
├── harness/                # 던져버릴 UI (Phase 3가 대체)
│   ├── useGameStore.ts     # zustand 또는 useReducer 래퍼 (엔진 전이 호출; systemRng 주입)
│   ├── SetupScreen.tsx     # 시작/설정 (SETUP-01~06, MISSION-07 가드)
│   ├── PlayHarness.tsx     # 턴/판정/주사위/이벤트/결과 버튼 + 카운트다운 타이머
│   └── ResultScreen.tsx    # 승자/공동승자 표시, 재시작/시작화면 (LOOP-10)
└── (기존 Phase 1 파일 그대로)
```

### Pattern 1: 불변 GameState + 순수 전이 함수 (Phase 1 store 스타일 계승)
**What:** 각 게임 진행 단계를 `(state, ...args, rng) => GameState` 순수 함수로. 부작용 없음, 새 객체 반환.
**When to use:** 엔진 전체. Phase 1 store 액션(`set((s) => ({...}))`)이 이미 이 불변 스타일.
**Example:**
```typescript
// src/engine/types.ts — 실제 Phase 1 심볼 재사용
import type { Mission, Event, Effect } from '../schema'; // [VERIFIED: src/schema.ts]

export type Phase =
  | 'awaitingDraw'        // 현재 차례, 카드 뽑기 대기 (LOOP-01)
  | 'awaitingJudgement'   // 카드 뽑힘, 성공/실패 대기 (LOOP-02/03)
  | 'awaitingRoll'        // 성공 판정됨, 주사위 대기 (LOOP-05)
  | 'turnResolved'        // 이동·이벤트 적용됨, 다음 진행 대기 (LOOP-07/08)
  | 'gameOver';           // 승리 또는 시간종료 (LOOP-09)

export interface Participant {
  id: string;
  name: string;
  character: 'boy' | 'girl';   // SETUP-05 플레이스홀더
  position: number;             // 0 = 시작칸, boardLength = 결승 (초과 허용, clamp X)
  // 팀전(D-01): 팀이 말 하나 공유, 팀원이 번갈아 수행
  memberNames: string[];        // solo면 [name], team이면 팀원들
  memberTurnIndex: number;      // 이번에 수행하는 팀원(팀 턴마다 회전)
}

export interface GameConfig {
  mode: 'solo' | 'team';        // SETUP-02 / D-01
  participants: Participant[];  // SETUP-03/04/05로 빌드됨
  boardLength: number;          // D-02 프리셋 → 결승 인덱스(칸 수)
  timeLimitMs: number | null;   // D-04 기본 20*60*1000; null = 무제한
}

export interface DrawnCard { mission: Mission; }

export interface LandingResult {   // LOOP-07/08 결과(하네스 렌더용)
  eventId: string | null;
  eff: Effect | null;              // 'forward' | 'backward' | 'extra' [VERIFIED: src/schema.ts]
  label: string;                   // '보너스' | '함정' | ''
  from: number;
  to: number;
  extraTurn: boolean;              // eff==='extra'
}

export type EndReason = 'reached-finish' | 'timeout' | 'manual';

export interface GameState {
  phase: Phase;
  config: GameConfig;
  boardEvents: (string | null)[]; // 길이 boardLength+1; 칸별 eventId (EVENT-06)
  currentIndex: number;            // config.participants 인덱스
  card: DrawnCard | null;
  lastRoll: number | null;
  lastLanding: LandingResult | null;
  winners: string[];               // 정상=1명; 시간종료 동점=n명 (D-05)
  endReason: EndReason | null;
}
```

### Pattern 2: RNG 인터페이스 주입 (런타임 vs 테스트 분리)
**What:** `Rng` 인터페이스 하나. 런타임은 crypto/Math.random, 테스트는 seed 고정 mulberry32.
**When to use:** 주사위·카드 뽑기·이벤트 배치 등 모든 무작위. 전역 RNG 금지.
**Example:**
```typescript
// src/engine/rng.ts
export interface Rng { next(): number; } // [0,1)

// mulberry32: 공개 도메인 시드형 PRNG (테스트 결정성용)
// [CITED: gist.github.com/tommyettinger/46a874533244883189143505d203312c]
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

// 런타임 RNG: crypto 우선, 없으면 Math.random
export function systemRng(): Rng {
  return {
    next() {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const u = new Uint32Array(1);
        crypto.getRandomValues(u);
        return u[0] / 4294967296;
      }
      return Math.random();
    },
  };
}

export function rollDie(rng: Rng): number {
  return 1 + Math.floor(rng.next() * 6); // 1..6 (LOOP-05)
}

// 가중치 뽑기(카드·이벤트 공용). total<=0 이면 null (엣지케이스 안전)
export function weightedPick<T>(items: T[], weightOf: (t: T) => number, rng: Rng): T | null {
  const weights = items.map((it) => Math.max(0, weightOf(it) || 0));
  const total = weights.reduce((s, w) => s + w, 0);
  if (items.length === 0 || total <= 0) return null;
  let r = rng.next() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1]; // 부동소수 안전망
}
```

### Pattern 3: 이동 + 승리 판정(초과 통과 허용, D-03)
**What:** `position += roll`. `position >= boardLength` 이면 승리. **clamp 하지 않음**(초과 허용). 뒤로 이벤트는 0 미만 방지로 clamp(하한만).
**Example:**
```typescript
// engine.ts 내부 (rollDice 전이의 핵심)
function moveAndResolve(state: GameState, roll: number, events: Event[], rng: Rng): GameState {
  const p = state.config.participants[state.currentIndex];
  const from = p.position;
  const afterRoll = from + roll;                 // D-03: 초과 통과 허용, 상한 clamp 안 함
  // 결승 도달/초과 → 즉시 승리 (이벤트 적용 전에 확정)
  if (afterRoll >= state.config.boardLength) {
    const moved = withPosition(state, afterRoll);
    return { ...moved, phase: 'gameOver', winners: [p.id],
             endReason: 'reached-finish', lastRoll: roll,
             lastLanding: { eventId: null, eff: null, label: '', from, to: afterRoll, extraTurn: false } };
  }
  // 이벤트 적용
  const eventId = state.boardEvents[afterRoll] ?? null;
  const ev = eventId ? events.find((e) => e.id === eventId) ?? null : null;
  let to = afterRoll;
  let extraTurn = false;
  if (ev) {
    if (ev.eff === 'forward') to = afterRoll + ev.steps;      // 다시 결승 초과 가능 → 아래서 재판정
    else if (ev.eff === 'backward') to = Math.max(0, afterRoll - ev.steps); // 하한만 clamp
    else if (ev.eff === 'extra') extraTurn = true;            // steps===0 (schema refine 보장)
  }
  const landing: LandingResult = { eventId, eff: ev?.eff ?? null, label: ev?.label ?? '', from, to, extraTurn };
  if (to >= state.config.boardLength) {                        // forward 이벤트로 결승 초과 시에도 승리
    return { ...withPosition(state, to), phase: 'gameOver', winners: [p.id],
             endReason: 'reached-finish', lastRoll: roll, lastLanding: landing };
  }
  return { ...withPosition(state, to), phase: 'turnResolved', lastRoll: roll, lastLanding: landing };
}
```

### Anti-Patterns to Avoid
- **엔진 안에서 `Date.now()`/`setInterval` 호출:** 순수성·결정성 파괴. 타이머는 DOM 소유, 엔진은 `endGame(reason)` 입력만 받는다 (§Pitfall 1).
- **엔진이 `useStore`를 직접 import:** 결합·테스트 난이도↑. 미션·이벤트는 전이 인자로 주입 (Phase 1 store가 "React/DOM import 금지"로 이미 결합 최소화).
- **전역/모듈 싱글턴 RNG:** 테스트 결정성 불가. 항상 인자 주입.
- **결승 정확 착지 강제(exact landing):** D-03 위반. 초과하면 승리.
- **position 상한 clamp:** 초과 통과 표시를 지움(D-03). 하한(0)만 clamp.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 미션/이벤트 스키마·검증 | 새 Zod 스키마 | 기존 `MissionSchema`/`EventSchema` (src/schema.ts) | Phase 1 계약 재사용; effect·steps refine 이미 검증됨 |
| 가중치→% 표시 | 새 정규화 | `normalizedPercents()` (src/lib/normalize.ts) | 배치 확률 UI 표시에 재사용 가능(0나눗셈 안전 이미 처리) |
| 미션·이벤트 영속 | 새 저장 계층 | `useStore` persist (src/store.ts) | 엔진은 읽기만; 게임 상태는 v1에서 비영속(QOL-01 v2 유예) |
| 시드형 PRNG | seedrandom 등 npm | 인라인 mulberry32(~6줄) | 감사 표면 0, 충분한 품질 |
| 접근성 다이얼로그/토스트 | 새 컴포넌트 | 기존 Modal/ConfirmDialog/Toast/SegmentedControl | 하네스에서 필요 시 재사용(선택) |

**Key insight:** 이 phase의 신규 코드는 전부 **로직**이다. 데이터·검증·영속·UI 프리미티브는 Phase 1이 이미 제공한다. 새 라이브러리를 도입할 이유가 없다.

## Common Pitfalls

### Pitfall 1: 벽시계 타이머를 엔진에 넣음 (D-04의 핵심 리스크)
**What goes wrong:** 엔진이 `setInterval`/`Date.now()`로 카운트다운을 돌리면 순수 함수가 아니게 되고, 시간종료 승자 계산을 결정적으로 테스트할 수 없다.
**Why it happens:** "제한시간"이 엔진 규칙처럼 느껴져서.
**How to avoid:** **시간은 부작용이다 → DOM 소유.** 하네스가 `Date.now()` 기준 남은 시간을 계산·표시하고, 0 도달 또는 "지금 마치기" 클릭 시 엔진의 `endGame(state, 'timeout' | 'manual')` 전이만 호출. 엔진은 오직 "종료됐다"는 입력과 현재 `participants[].position`으로 `computeLeaders()`를 순수 계산.
**Warning signs:** 엔진 파일에 `setInterval`, `Date`, `performance.now`가 등장하면 즉시 리팩터.

### Pitfall 2: 시간종료 동점 처리 누락 (D-05)
**What goes wrong:** 최선두가 여러 명 동점인데 첫 번째만 승자로 잡음.
**Why it happens:** `Math.max` 후 `find` 하나만 반환.
**How to avoid:** `const max = Math.max(...positions); winners = participants.filter(p => p.position === max).map(p => p.id)`. `winners.length > 1` 이면 하네스가 "공동 승리 — 강사가 선택" 표시.
**Warning signs:** 결과 화면이 항상 1명만 보여줌.

### Pitfall 3: 이벤트 배치 엣지케이스 미처리 (EVENT-06)
**What goes wrong:** 이벤트 0개 / 전부 weight 0 / 보드가 이벤트보다 짧음 → 0나눗셈·NaN·크래시.
**Why it happens:** 순진한 누적합 뽑기가 total 0을 못 다룸.
**How to avoid:** `weightedPick`이 `total<=0 || items.length===0`이면 `null` 반환(빈 칸). 배치는 결승·시작칸 제외 내부 칸에만. `normalizedPercents`가 이미 total 0을 0으로 처리하는 것과 동일 철학.
**Warning signs:** 이벤트 없는 시드로 게임 시작 시 크래시.

### Pitfall 4: 팀전 말 공유/순번 혼동 (D-01)
**What goes wrong:** 팀원마다 말을 따로 만들거나, 순번이 안 돌아감.
**Why it happens:** 개인전 모델을 팀에 그대로 적용.
**How to avoid:** 팀 = **Participant 1개**(말 1개), `memberNames[]` + `memberTurnIndex`. 그 팀 턴이 끝나 다시 돌아올 때 `memberTurnIndex = (memberTurnIndex+1) % memberNames.length`. 위치는 팀 Participant에 귀속.
**Warning signs:** 팀원 수만큼 말이 생김.

### Pitfall 5: "한 번 더" 후 턴 진행 오류 (LOOP-08)
**What goes wrong:** extra 이벤트인데 다음 플레이어로 넘어가거나, 무한 루프.
**Why it happens:** `advanceTurn`이 extraTurn 플래그를 무시.
**How to avoid:** `advanceTurn(state)`: `state.lastLanding?.extraTurn === true`면 `currentIndex` 유지(팀은 memberTurnIndex는 회전할지 여부 결정 — 권장: extra는 같은 팀 같은 순번 유지 or 다음 순번; **planner 확정**), 아니면 `currentIndex = (currentIndex+1) % participants.length` + 팀이면 해당 팀 memberTurnIndex 회전. phase는 `'awaitingDraw'`로.
**Warning signs:** extra 이벤트가 턴을 안 반복하거나 영원히 반복.

## Code Examples

### 이벤트 가중치 배치 (EVENT-06, src/lib/normalize.ts 철학 계승)
```typescript
// src/engine/placement.ts
import type { Event } from '../schema';
import { weightedPick, type Rng } from './rng';

// 내부 칸(1..boardLength-1)에 가중치로 이벤트 배치. 시작(0)·결승(boardLength)은 비움.
// density: 각 내부 칸이 이벤트 칸이 될 확률(Claude 재량, 기본 제안 0.5). 나머지는 빈 칸.
export function placeEvents(
  events: Event[], boardLength: number, rng: Rng, density = 0.5,
): (string | null)[] {
  const board: (string | null)[] = new Array(boardLength + 1).fill(null);
  if (events.length === 0) return board;                 // 이벤트 없음 → 전부 빈 칸
  for (let sq = 1; sq < boardLength; sq++) {              // 결승·시작 제외
    if (rng.next() >= density) continue;                 // 이 칸은 빈 칸
    const picked = weightedPick(events, (e) => e.weight, rng); // 전부 weight 0 → null
    board[sq] = picked ? picked.id : null;
  }
  return board;
}
```

### 시간종료 리더 계산 (D-04/D-05)
```typescript
// engine.ts
export function endGame(state: GameState, reason: 'timeout' | 'manual'): GameState {
  const ps = state.config.participants;
  const max = Math.max(...ps.map((p) => p.position));
  const winners = ps.filter((p) => p.position === max).map((p) => p.id); // 동점 → 공동
  return { ...state, phase: 'gameOver', winners, endReason: reason };
}
```

### Setup: 보드 프리셋 · participant 빌드 · 빈 목록 가드
```typescript
// src/engine/setup.ts
import type { Mission } from '../schema';

export type BoardPreset = 'short' | 'normal';        // "짧게" / "보통" (D-02)
// Claude 재량 기본값(planner 확정 가능): 짧게 20칸 / 보통 30칸
export function boardLengthFor(preset: BoardPreset): number {
  return preset === 'short' ? 20 : 30;
}

export const DEFAULT_TIME_LIMIT_MS = 20 * 60 * 1000; // D-04 기본 20분

// MISSION-07 / D-08: 미션 비면 시작 차단
export function canStart(missions: Mission[]): { ok: boolean; reason?: string } {
  if (missions.length === 0)
    return { ok: false, reason: '미션이 없어요. 편집기에서 미션을 먼저 추가해 주세요.' };
  return { ok: true };
}
```

### 하네스 타이머 (엔진 밖, Pitfall 1 회피)
```typescript
// PlayHarness.tsx (발췌) — 벽시계는 DOM 소유, 엔진은 endGame 입력만
useEffect(() => {
  const limit = state.config.timeLimitMs;
  if (limit == null || state.phase === 'gameOver') return;
  const startedAt = Date.now();
  const id = setInterval(() => {
    const remaining = limit - (Date.now() - startedAt);
    setRemainingMs(remaining);
    if (remaining <= 0) { clearInterval(id); dispatchEndGame('timeout'); }
  }, 250);
  return () => clearInterval(id);
}, [state.phase]);
// "지금 순위로 마치기" 버튼 → dispatchEndGame('manual')
```

## Testing Strategy (분포 테스트 — D-07)

> 참고: `.planning/config.json`의 `workflow.nyquist_validation`이 `false`이므로 정식 Validation Architecture 섹션은 생략한다. 아래는 D-07이 명시적으로 요구한 분포 테스트 지침이다.

**결정적 분포 테스트(주사위):** seed 고정 mulberry32로 N=60,000회 굴려 버킷 카운트. 각 면이 N/6 근방(허용 ±5%)인지 assert. seed 고정이므로 flakiness 없음.
```typescript
// rng.test.ts (발췌)
import { mulberry32, rollDie } from './rng';
it('dice 1..6 are ~uniform over 60000 seeded rolls', () => {
  const rng = mulberry32(12345);
  const buckets = [0,0,0,0,0,0,0];   // index 1..6
  const N = 60000;
  for (let i=0;i<N;i++) buckets[rollDie(rng)]++;
  for (let f=1; f<=6; f++) {
    expect(buckets[f]).toBeGreaterThan(N/6 * 0.95);
    expect(buckets[f]).toBeLessThan(N/6 * 1.05);
  }
});
```
**가중치 비율 테스트:** weight 3:2:1인 3개 이벤트를 seed 고정으로 60,000회 `weightedPick` → 관측 비율이 3/6·2/6·1/6 근방(±5%). **엣지:** 빈 배열→null, 전부 weight 0→null, 단일 양수 weight→항상 그것.
**FSM 망라(engine.test.ts):** 각 phase에서 유효/무효 입력 → 기대 phase. 실패 판정→전진 없음. 성공→주사위→이동. 결승 초과→gameOver·단일 승자. extra→같은 참가자. endGame(timeout) 동점→공동 승자. 팀전 순번 회전.
**샘플링:** 커밋당 `npm test`(vitest run, 이미 구성됨). 헤드리스라 빠름(<1s 수준).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 물리엔진 주사위(cannon/rapier) | 순수 로직 주사위 + (Phase 3) 트윈 연출 | 프로젝트 결정 | 결정적·테스트 가능, 번들↓ (CLAUDE.md 명시) |
| 전역 Math.random | 주입식 Rng 인터페이스 | 이 phase | 분포 테스트 결정성 확보 (D-09) |

**Deprecated/outdated:**
- 없음 — 스택은 Phase 1(2026-07)에서 최신으로 확정.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 보드 프리셋 기본값 짧게=20칸 / 보통=30칸 | Setup/config | 낮음 — Claude 재량(D-02), planner가 20분 목표에 맞게 조정 가능. 칸 수는 게임 시간 핵심 레버 |
| A2 | 이벤트 배치 density 기본 0.5(내부 칸의 절반이 이벤트) | placement.ts | 낮음 — Claude 재량. 강사 체감에 따라 조정; 모든 내부 칸에 배치도 대안 |
| A3 | 기본 인원/팀 수 기본값(예: 2) | Setup/config | 낮음 — Claude 재량; 하네스 기본값일 뿐 |
| A4 | extra("한 번 더") 시 팀 memberTurnIndex 유지 vs 회전 | Pitfall 5 | 중간 — 규칙 체감에 영향. planner/discuss가 강사 의도 확인 권장 |
| A5 | 게임 상태는 v1에서 비영속(새로고침 시 소실) | Don't Hand-Roll | 낮음 — QOL-01(도중 저장)은 v2로 명시 유예됨 |

**참고:** mulberry32는 [ASSUMED]가 아니라 [CITED]로 분류함(공개 gist 출처 확인). 버전·의존성은 package.json에서 [VERIFIED].

## Open Questions

1. **이벤트 배치 밀도/방식 (EVENT-06 해석)**
   - What we know: 배치는 weight를 따름(D-07). 시작·결승 칸은 비움.
   - What's unclear: 모든 내부 칸에 이벤트를 둘지, 일부만 둘지(density). 빈 칸 비율.
   - Recommendation: `density` 파라미터(기본 0.5)로 구현하고 planner가 확정. 분포 테스트는 density와 무관하게 weight 비율만 검증.

2. **extra 턴에서 팀 순번 처리 (D-01 + LOOP-08)**
   - What we know: 팀은 말 공유, 순번 회전. extra는 같은 팀 추가 턴.
   - What's unclear: 추가 턴을 같은 팀원이 하나(연속 수행) 다음 팀원이 하나.
   - Recommendation: 기본 "같은 팀원 유지"(가장 단순)로 두고 discuss-phase에서 강사 확인. 엔진은 플래그 하나로 양쪽 지원 가능.

3. **하네스 상태 보관: zustand vs useReducer**
   - What we know: 엔진은 순수 reducer. Phase 1은 단일 zustand store 패턴.
   - What's unclear: 순수한 선호.
   - Recommendation: 일관성 위해 얇은 `useGameStore`(zustand) 권장하되, `useReducer`도 완전 동등. planner 확정.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node/npm | 빌드·테스트 | ✓ | Phase 1에서 사용 중 | — |
| vitest | 엔진·분포 테스트 | ✓ | 3.2.4 (package.json) | — |
| TypeScript | 엔진 타입 | ✓ | 5.9.3 | — |
| crypto.getRandomValues | 런타임 RNG | ✓ (브라우저 표준) | — | Math.random (systemRng 내장 폴백) |

**Missing dependencies with no fallback:** 없음.
**Missing dependencies with fallback:** crypto 미지원 환경 → Math.random 자동 폴백(systemRng에 내장).

## Security Domain

> `security_enforcement: true`, ASVS level 1. 이 phase는 **서버·인증·네트워크·영속 쓰기 없음**(단일 기기 로컬, 게임 상태 인메모리). 공격 표면이 사실상 없다.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | 인증 없음(단일 기기, REQUIREMENTS Out of Scope) |
| V3 Session Management | no | 세션 없음 |
| V4 Access Control | no | 접근 제어 대상 없음 |
| V5 Input Validation | yes (경미) | 엔진 입력은 프로그램 내부(전이 인자). 미션·이벤트는 이미 `ContentSchema`(Zod)로 Phase 1 import 시 검증됨. 새 외부 입력 없음 |
| V6 Cryptography | no | crypto는 RNG 용도(보안 아님). 손으로 암호 구현 없음 |

### Known Threat Patterns for {pure TS engine + local DOM}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 오염된 미션/이벤트 데이터 | Tampering | Phase 1 `ContentSchema.safeParse` 이미 import 시 검증(io.ts). 엔진은 검증된 데이터만 소비 |
| RNG 예측(치팅) | — | 게임에 무의미(강습 도구). 보안 RNG 불필요; systemRng는 crypto 사용하나 요구사항 아님 |
| 대용량 입력 DoS | DoS | 이벤트 배치는 boardLength(≤30) 유한 루프. 무한 루프 방지: weightedPick 부동소수 안전망 |

## Sources

### Primary (HIGH confidence)
- 코드베이스 직접 판독: `src/schema.ts`, `src/store.ts`, `src/seed.ts`, `src/lib/normalize.ts`, `src/lib/io.ts`, `src/store.test.ts`, `src/lib/normalize.test.ts`, `vitest.config.ts`, `package.json` — 타입·심볼·버전·테스트 패턴의 근거.
- `.planning/phases/02-playable-core-loop/02-CONTEXT.md` (D-01~D-09), `.planning/phases/01-foundation-content-editor/01-CONTEXT.md` (데이터 모델 계약), `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`.

### Secondary (MEDIUM confidence)
- [CITED] Tommy Ettinger, "Mulberry32 PRNG" gist — 시드형 결정적 PRNG 구현·특성. https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
- [CITED] "Understanding Mulberry32 deterministic randomness in JavaScript" (Emanuele Feronato), "Mulberry32: A Tiny, Fast, Deterministic RNG" (4rknova) — 결정적 테스트 용도 확인, splitmix32 대안 언급.

### Tertiary (LOW confidence)
- 없음.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 신규 패키지 0, 모든 버전 package.json에서 검증.
- Architecture: HIGH — Phase 1 순수-store 패턴을 직접 계승, 실제 심볼(Mission/Event/Effect/useStore/normalizedPercents) 기반.
- Pitfalls: HIGH — D-01~D-09 결정과 코드 계약에서 직접 도출.
- RNG 선택: MEDIUM-HIGH — mulberry32는 널리 인용되나 npm 패키지가 아닌 인라인 코드(감사 표면 0).

**Research date:** 2026-07-25
**Valid until:** 2026-08-24 (30일 — 순수 로직·고정 스택이라 안정적)

Sources:
- [Mulberry32 PRNG gist (Tommy Ettinger)](https://gist.github.com/tommyettinger/46a874533244883189143505d203312c)
- [Understanding Mulberry32 deterministic randomness in JavaScript](https://emanueleferonato.com/2026/01/08/understanding-how-to-use-mulberry32-to-achieve-deterministic-randomness-in-javascript/)
- [Mulberry32: A Tiny, Fast, Deterministic RNG](https://www.4rknova.com/blog/2026/03/01/mulberry32-rng)
