---
phase: quick-260726-lbq
plan: 01
subsystem: game-3d-presentation
tags: [3d, r3f, affordance, a11y, animation, LOOP-05, LOOP-06, LOOP-07, ART-04]
status: complete
quick: true

requires:
  - src/game/boardLayout.ts (squarePosition)
  - src/game/scene/Token.ts (MoveSpec, prefersReducedMotion, HOP_S)
  - src/game/scene/Dice.tsx (DICE_S)
  - src/game/usePresentation.ts (startWatchdog / ANIM_DONE gating)
provides:
  - planHighlight(move, boardLength) — pure move→marker-squares model
  - MAX_STEP_MARKERS — fixed step-dot instancedMesh capacity
  - PREVIEW_S — the dice-settled→token-hop hold, for watchdog budgets
  - BoardSceneProps.highlight — required prop carrying the previewed move
affects:
  - src/game/PlayView.tsx (Seq gains 'preview'; watchdog budget grew)
  - src/game/scene/BoardScene.tsx (new required prop — all call sites must pass it)
  - src/game/scene/Token.tsx (active ring y, exported helper)

tech-stack:
  added: []
  patterns:
    - hook-free gate component wrapping a hooks-only inner component
    - fixed-capacity instancedMesh (args never change → no remount per roll)
    - JSX-intrinsic geometries for automatic R3F disposal (no manual dispose needed)
    - ref-only useFrame animation (never setState per frame)

key-files:
  created:
    - src/game/moveHighlight.ts
    - src/game/moveHighlight.test.ts
    - src/game/scene/MoveHighlight.tsx
  modified:
    - src/game/scene/BoardScene.tsx
    - src/game/scene/Token.tsx
    - src/game/scene/scene.test.tsx
    - src/game/styles/game.css
    - src/game/PlayView.tsx

decisions:
  - "planHighlight clamps every returned index into [0, boardLength] — the engine deliberately does not clamp an overshoot win (D-03), so without it a winning roll spawns markers past the end of the board."
  - "Event direction is judged on the PRE-clamp values, so a forward event that wins still reads as mint 'forward' even after its final square clamps onto the dice destination."
  - "MoveHighlight mounts outside <Bounds> — inside, every roll would join the framing set and the camera would re-fit mid-turn."
  - "Highlight is suppressed during seq 'dice' (D-E) so the die's outcome is not spoiled before the face is readable."
  - "prefers-reduced-motion stops the pulse but keeps the markers — removing the affordance would penalise the users who most need it."
  - "The active-token ring moved from y=0.02 to y=0.22: at 0.02 it was inside the 0.3-high tile and had never actually been visible."

metrics:
  duration: ~7 min
  tasks: 3
  files: 8
  tests_before: 170
  tests_after: 182
  completed: 2026-07-26
---

# Quick Task 260726-lbq: 이동 목적지 하이라이트 Summary

주사위가 멈춘 순간 보드가 "어디로 가는지"를 먼저 보여주고 그 다음 토큰이 출발하도록, 순수 하이라이트 모델(`planHighlight`) + 씬 레이어(`MoveHighlight`) + `PlayView`의 `preview` 비트를 추가했다.

## What Was Built

**Task 1 — `planHighlight` 순수 모델** (`3649b8c`)

엔진이 이미 확정한 `{ from, afterRoll, to }`를 보드가 표시할 칸들로 변환한다: 경유 칸(`steps`), 주사위 목적지(`dest`), 이벤트 최종 칸(`final`) + 방향(`finalDir`). React/DOM/three 의존 없는 `boardLayout.ts`와 동일한 계약이라 단위 테스트가 직접 호출한다. 단위 테스트 8개(오버슛 승리, 전진 이벤트 승리 클램프, 용량 상한 전수 검사 포함).

**Task 2 — `MoveHighlight` 씬 레이어** (`e230f7b`)

- 경유 점: `--sky` 실린더, **instancedMesh 1개**(고정 용량 `MAX_STEP_MARKERS`)
- 주사위 목적지: `--grape` 링, 바닥에 눕힘
- 이벤트 최종 목적지: 원뿔 핀, 전진 `--grass` / 후퇴 `--coral` — DiceResultPanel의 `.eff-forward`/`.eff-backward`와 같은 색 언어
- `<Html>` "N칸" 알약 라벨 (`aria-hidden` — 낭독은 기존 `aria-live` 패널이 단독 담당)
- 기본 export는 훅이 하나도 없는 게이트, 모든 훅은 내부 `HighlightMarkers`에 격리

**Task 3 — `preview` 비트** (`85aec0b`)

`Seq`가 `'idle' | 'dice' | 'preview' | 'token'`으로 넓어졌다. `handleDiceSettled()`가 곧바로 홉을 시작하지 않고 `PREVIEW_S`(0.55초) 동안 하이라이트만 보여준 뒤 `'token'`으로 넘어간다.

## Key Decisions

frontmatter `decisions` 참조. 특히 두 가지가 눈에 보이지 않는 버그를 막는다:

1. **클램프** — 엔진은 오버슛 승리를 클램프하지 않으므로(D-03) `planHighlight`가 하지 않으면 이기는 턴마다 마커가 보드 밖 허공에 뜬다.
2. **watchdog 예산** — `PREVIEW_S`를 더하지 않으면 watchdog이 홉 도중 `busy`를 강제 해제해 컨트롤·승리 화면이 이동 중에 튀어나온다.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `highlight` 전달을 Task 2 커밋에 포함**

- **Found during:** Task 2
- **Issue:** 플랜대로 `BoardSceneProps.highlight`를 **필수** 필드로 만들자(배선 누락을 타입체커가 잡게 하려는 의도적 설계) `PlayView.tsx`가 즉시 타입 에러가 됐다. Task 2 단독 커밋은 red tree가 된다 — "각 커밋은 green" 제약과 충돌.
- **Fix:** Task 2 커밋에 `PlayView`의 한 줄 전달(`highlight={seq === 'token' ? move : null}`)만 포함시켰다. Task 3에서 이를 `seq === 'preview' || seq === 'token'`으로 확장했다. 최종 상태는 플랜과 정확히 동일하다.
- **Files modified:** `src/game/PlayView.tsx`
- **Commit:** `e230f7b`

**2. [Rule 1 - Bug] Token.tsx JSX 주석 위치 오류**

- **Found during:** Task 2
- **Issue:** 링 y 좌표 근거 주석을 `{active && ( ... )}` 괄호 **안쪽**에 `{/* */}`로 넣어 파싱 에러(TS1005 등 6건)가 났다. 해당 위치는 단일 표현식만 허용된다.
- **Fix:** 주석을 `{active && (` 위로 옮겼다. 내용은 동일.
- **Files modified:** `src/game/scene/Token.tsx`
- **Commit:** `e230f7b`

### Intentional Test Changes

`scene.test.tsx`의 기존 두 테스트에서 `findAll(isInstancedMesh)` 단언을 **`name === 'path-tiles'` 필터로 좁혔다**(플랜 지시). 하이라이트가 두 번째 instancedMesh(`step-markers`)를 추가하므로 "전역 instancedMesh 1개"는 더 이상 성립하지 않는다. 새 계약은 "**경로 타일** instancedMesh는 정확히 1개"이며, 신규 테스트 4개 전부에서도 이를 재확인한다. 단언의 의도(D-08 타일 인스턴싱 회귀 가드)는 그대로다.

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit -p tsconfig.app.json` | pass |
| `npx tsc -b` | pass |
| `npx vitest run` | 23 files / **182 tests pass** (before: 22 / 170) |
| `npm run build` | pass (440ms) |
| 파일 삭제 없음 | 확인 (`--diff-filter=D` empty) |
| 신규 의존성 | 없음 (`package.json` 미변경) |
| 신규 팔레트 hue | 없음 (`--sky/--grape/--grass/--coral/--panel/--ink`만 사용) |

## Outstanding — Human Verification Required

자동 검증으로는 커버되지 않는 항목(플랜의 human-check). 브라우저에서 확인이 필요하다:

1. `npm run dev` → 성공 판정 → 굴리기: 주사위가 도는 동안 목적지 표시가 **없다가**, 눈이 확정되고 약 0.5초 하이라이트만 보인 뒤 토큰이 출발하는 순서.
2. **카메라가 롤마다 재프레임되지 않는지** (`<Bounds>` 밖 배치 검증 — 헤드리스 테스트로는 잡히지 않음).
3. 이벤트 턴에서 민트/코랄 원뿔 핀이 최종 목적지에 뜨는지.
4. 결승 칸을 넘겨 이기는 턴에서 마커가 결승 칸에 붙고 ResultView가 정상 전환되는지(버튼 잠김 없음).
5. OS "동작 줄이기"를 켠 뒤 하이라이트가 맥동 없이 그대로 보이는지.

## Known Stubs

없음. 모든 마커가 실제 엔진 데이터(`MoveSpec`)로 구동된다.

## Threat Flags

없음. 신규 네트워크 경로·저장소 스키마·입력 파싱·의존성이 전혀 없다. 플랜 위협 등록부의 `mitigate` 3건은 모두 반영됐다: T-LBQ-01(PREVIEW_S watchdog 예산 + 도착·언마운트 타이머 정리), T-LBQ-02(고정 용량 instancedMesh + ref 전용 애니메이션 + reduced-motion 조기 return), T-LBQ-03(JSX intrinsic 지오메트리 → R3F 자동 dispose, `useMemo` 지오메트리 없음).

## Self-Check: PASSED

- `src/game/moveHighlight.ts` — FOUND
- `src/game/moveHighlight.test.ts` — FOUND
- `src/game/scene/MoveHighlight.tsx` — FOUND
- commits `3649b8c`, `e230f7b`, `85aec0b` — all FOUND
- working tree clean
