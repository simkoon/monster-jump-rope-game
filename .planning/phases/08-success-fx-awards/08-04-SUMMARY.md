---
phase: 08-success-fx-awards
plan: 04
subsystem: game-scene-fx
status: complete
tags: [3d, instancedmesh, fx, confetti, camera-shake, reduced-motion, draw-budget, tdd]
requires: [08-01, 08-02]
provides:
  - "palette.ts FX_COLOR (confetti, confettiGold, burst, burstAlt, ring, ringGold, sparkle, puff = --line, puffAlt, podium, podiumEmissive, podiumGround)"
  - "layout/fxMotion.ts: CONFETTI_CAP 160, BURST_CAP 24, RING_CAP 3, PUFF_CAP 8, CONFETTI_LIFE_MS, BURST_LIFE_MS, RING_LIFE_MS, RING_STAGGER_MS, PUFF_LIFE_MS, BONUS_SPARKLE, EVENT_SPARKLE, EVENT_PUFF, fxRand, confettiPiece, burstPiece, ringState, puffPiece, shakeOffset"
  - "scene/FxPools.tsx: default FxPools({ points, slots }), meshes fx-confetti / fx-burst / fx-ring / fx-puff, module-scope FX_GEO / FX_MAT"
  - "CameraRig: fitted pose ref + ⭐3 shake with exact restore"
affects: [08-05, 08-06, 08-10, 08-11]
tech-stack:
  added: []
  patterns:
    - "Effect pools are always mounted with count 0; one module-scope Object3D writes all matrices"
    - "Pure piece functions take an optional `out` so the frame loop allocates nothing"
    - "Per-pool color fill is rewritten only when the tier / effect kind changes (attribute already exists → no shader recompile)"
    - "Camera shake = fitted pose ref + offset in CameraRig's own useFrame; restore writes the same fit values"
key-files:
  created:
    - src/game/layout/fxMotion.ts
    - src/game/layout/fxMotion.test.ts
    - src/game/scene/FxPools.tsx
    - src/game/scene/fx.test.tsx
  modified:
    - src/game/palette.ts
    - src/game/palette.test.ts
    - src/game/scene/SceneContents.tsx
    - src/game/scene/CameraRig.tsx
    - src/game/scene/actors.test.tsx
decisions:
  - "Puffs get their own fourth pool (PUFF_CAP 8, IcosahedronGeometry) as the plan says, not the burst pool (RESEARCH Pattern 4 variant)"
  - "The instanced RingGeometry keeps its 0.9 inner ratio; ringState.inner (0.9 → 0.96) is computed but the thinning is carried by the shared opacity fade, because instances cannot change vertex radii"
  - "Confetti is clamped to tile top + 0.02 so falling pieces rest on the board while they fade instead of sinking through it"
  - "The shake offsets world x / y (the fitted camera sits at x = 0, so world x = screen right); camera and lookAt target get the same offset"
  - "Effect origins: confetti at head height (tile top + HEAD_TOP × slot.scale), burst at tile top + 0.4, rings at tile top + 0.02, start-bonus sparkles + 0.3, lucky sparkles + 0.5, puffs + 0.1 — all at the character's tile + slot offset"
  - "Trap puffs start at +150 ms like the lucky sparkles (UI-SPEC gives no start time for puffs)"
metrics:
  duration: "~15 min"
  completed: 2026-10-24
  tasks: 3
  files: 9
---

# Phase 8 Plan 04: 3D success FX pools + ⭐3 camera shake Summary

퀘스트 성공이 착지하는 순간(successPlan.landMs) 판정받은 캐릭터의 칸에서 컨페티·별 버스트·충격파 링이 터진다. 이 효과들은 항상 마운트된 InstancedMesh 풀 4개로 그린다. 크기는 등급을 따른다(⭐1 40/8/1, ⭐2 80/12/2, ⭐3 140/18/2에 금색 섞기). ⭐3에서만 카메라가 320 ms 흔들리고, 끝나거나 건너뛰면 fit 자세로 정확히 돌아온다. 출발 보너스에는 금색 반짝이 6개, 이벤트에는 보너스 계열 반짝이 8개 또는 함정 계열 퍼프 6개가 같은 풀로 나온다. 비트 길이는 바뀌지 않았다.

## What Was Built

**Task 1: FX_COLOR + 순수 효과 곡선** (`326b748` RED, `0134219` GREEN)
- `palette.ts` `FX_COLOR`: 값은 모두 기존 index.css 토큰 hex다. palette.ts에 새로 들어온 값은 `puff` = `--line`(#D8EAF8) 하나다. 리스트 색은 인스턴스 인덱스 순으로 돌아가며 쓰므로 리스트 안의 비율이 곧 효과 안의 비율이다. confettiGold는 10칸 중 4칸이 sun/sun-deep(40 %)이고 나머지 6칸이 컨페티 6색이다. 컨페티에는 sky도 coral도 없다.
- `layout/fxMotion.ts`(신규, 순수, three/React/시계 없음): 풀 용량, 수명, D-10 소량 효과 상수, 해시 기반 `fxRand`(Math.random 없음), `confettiPiece`(위 3.5–5.0, 옆 1.0–2.2 t/s, 중력 −9, 두 축 3–6 rad/s, 마지막 20 % 축소), `burstPiece`(360°/n ± 8°, easeOutCubic 반경, 0.6→1→0), `ringState`(0.3→maxR, 불투명도 0.9→0, 지연 링도 같은 시각에 끝남), `puffPiece`(0.5 상승, ≤ 0.3 퍼짐, 0.4→1→0), `shakeOffset`(UI-SPEC F2 감쇠식). 이징은 charMotion에서 import했고 charMotion.ts는 건드리지 않았다.
- 테스트: palette 5개 추가(토큰 일치, puff = --line, 비율, sky/coral 금지), fxMotion 22개.

**Task 2: FxPools + SceneContents 연결 + 드로우콜 예산** (`c2cd6d0` RED, `4b2accf` GREEN)
- `scene/FxPools.tsx`(신규, lazy 3D 청크): `fx-confetti`(PlaneGeometry 0.07×0.12, DoubleSide), `fx-burst`(GEO.star 공유), `fx-ring`(RingGeometry 0.9/1.0/48, transparent, depthWrite false), `fx-puff`(IcosahedronGeometry 0.12). 지오메트리와 머티리얼은 모듈 스코프 `FX_GEO`/`FX_MAT`에 있다. 4개 모두 `dispose={null}`, `frustumCulled={false}`이고, 마운트 layout effect에서 모든 인스턴스 색을 미리 쓴다. 프레임 루프는 `usePresentation.getState()`를 읽고 비트 id마다 자기 시계를 다시 시작한다. stars는 `successPlan(...)`, event는 `isLuckyEvent(...)`로 판단한다. 할당은 프레임당 0이다(모듈 Object3D, 스크래치 객체, 모듈 함수). 쉬는 풀은 0으로 떨어지는 프레임에만 한 번 publish한다.
- `SceneContents.tsx`: `<FxPools points slots />`를 조건 없이 항상 렌더한다.
- 테스트: `fx.test.tsx` 12개(마운트 상태, ⭐1/2/3 landMs 경계와 개수, 판정 칸 위치, 빌보드 회전, 금색 링/컨페티, 자연 종료, completeBeat/skipAll 조기 종료, 5연속 객체·uuid 동일, 출발 보너스 120/450 ms, 행운 이벤트 150/500 ms, 함정·backward·막힌 extra는 퍼프, '보너스' 라벨 backward는 반짝이, 다른 비트는 방출 없음, reduced motion). `actors.test.tsx` 2개: 8마리일 때 풀 포함 메시 **97개**(≤ 100), ⭐3 연출 중 보이는 메시 최대 **93개**(≤ 104).

**Task 3: ⭐3 카메라 흔들림 + 정확 복원** (`2e2b670` RED, `9020832` GREEN)
- `CameraRig.tsx`: layout effect fit은 그대로 두고 fit 위치와 target을 ref에 보관한다. `useFrame`이 ⭐3 stars 비트의 [landMs, landMs + 320 ms] 동안 카메라와 lookAt target에 같은 `shakeOffset(...)`을 더한다(이동만, 회전·줌 없음). 흔들림이 끝나거나 비트가 바뀌면 그 프레임에 fit 값으로 정확히 복원한다. reduced motion이면 흔들지 않는다.
- 테스트 5개: 축마다 ≤ 0.06, 시선 방향 불변(쿼터니언 성분 차 ≤ 1e-9), 구간 밖 fit과 1e-9 이내로 일치, completeBeat와 skipAll 직후 프레임에 복원, ⭐1/⭐2와 reduced는 움직이지 않음, 흔들림 중 리사이즈하면 새 fit 기준으로 계속 흔들리다 새 fit으로 복원.

## Verification

- `npx vitest run src/game/palette.test.ts src/game/layout/fxMotion.test.ts`: 38/38
- `npx vitest run src/game/scene`: 22개 파일, 173개 테스트 통과(face occlusion, facePrewarm, starClearance 포함)
- `npx tsc -b`: exit 0
- `npm test`(전체): **71개 파일, 1330개 테스트 통과**(source guard (a)–(g) 포함)
- `npm run build`: 통과. GameCanvas lazy 청크 500 kB 경고(978.57 kB)는 이 플랜 전부터 있었다.
- 인수 grep: FX_COLOR 1, 용량 상수 4, fxMotion 순수성 0, `export function shakeOffset` 1, FxPools `frustumCulled={false}` 4, `dispose={null}` 4, 메시 이름 4, `<FxPools` 1, shadow/postprocessing 0, 모듈 스코프 생성자 7/7, CameraRig `shakeOffset(` 1, `useFrame` 2, OrbitControls/Bounds 0

## TDD Gate Compliance

세 태스크 모두 `test(08-04)` RED 커밋 다음에 `feat(08-04)` GREEN 커밋이 있다(326b748 → 0134219, c2cd6d0 → 4b2accf, 2e2b670 → 9020832). RED에서 Task 1은 fxMotion 모듈이 없고 FX_COLOR가 없어서 실패했다. Task 2는 풀 메시를 찾지 못해 실패했다. Task 3은 흔들림 테스트 3개가 실패했다. "⭐1/⭐2·reduced는 움직이지 않음" 테스트 2개는 이미 맞는 동작을 고정하는 것이라 RED에서도 통과했다.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 테스트 정밀도: -0과 Float32**
- **Found during:** Task 1, Task 2, Task 3
- **Issue:** `toEqual([0,0,0])`이 `-0`(cos·0)에서 실패했다. 인스턴스 행렬은 Float32라 1e-9 비교가 맞지 않았다. `Quaternion.angleTo`는 같은 쿼터니언에도 acos 정밀도 때문에 약 3e-8을 돌려준다.
- **Fix:** 원점 비교는 `toBeCloseTo(0, 12)`로 바꿨다. 링 높이는 6자리로 비교한다(Float32 주석). 카메라 복원은 쿼터니언 성분 차 ≤ 1e-9로 확인한다. 1e-9 기준 자체는 그대로다.
- **Files modified:** src/game/layout/fxMotion.test.ts, src/game/scene/fx.test.tsx
- **Commits:** 0134219, 4b2accf, 2e2b670

**2. [Rule 3 - Blocking] 헤더 주석 문구 조정**
- **Found during:** Task 2
- **Issue:** 헤더 주석에 `frustumCulled={false}`와 `dispose={null}` 문자열이 들어 있어서 인수 grep 값이 4가 아니라 5였다.
- **Fix:** 주석 문구만 바꿨다("frustum culling is off", "dispose disabled (null)").
- **Files modified:** src/game/scene/FxPools.tsx
- **Commit:** 4b2accf

### 설계상 근사(문서화)
- 링 안쪽 반지름 비율 0.9 → 0.96은 `ringState.inner`로 계산하고 테스트도 한다. 하지만 InstancedMesh 인스턴스는 정점 반지름을 바꿀 수 없어서 공유 RingGeometry는 0.9를 유지한다. "얇아지는 느낌"은 공유 opacity 페이드로 낸다.

이것 말고는 플랜대로 진행했다.

## Known Stubs

없음. `FX_COLOR.podium*`과 `RING_CAP`의 세 번째 칸은 시상식 플랜(08-06 이후)에서 쓰도록 미리 정해 둔 값이고, 지금 화면에는 영향이 없다.

## Threat Flags

없음. 새 네트워크, 저장, 입력 경로는 없다. 계획된 완화책은 적용했다. T-08-08은 풀을 한 번만 만들고 5연속 성공에서 객체와 uuid가 같은지 테스트로 확인한다. T-08-09는 프레임당 할당 0, frustumCulled false와 색 미리 쓰기, 메시 ≤ 100 / ≤ 104 테스트로 막는다. T-08-10은 1e-9 복원 테스트와 리사이즈 테스트로 확인한다. T-08-11은 씬에 텍스트가 없고 source guard (c)가 통과한다.

## Self-Check: PASSED
- FOUND: src/game/layout/fxMotion.ts, src/game/layout/fxMotion.test.ts, src/game/scene/FxPools.tsx, src/game/scene/fx.test.tsx
- FOUND commits: 326b748, 0134219, c2cd6d0, 4b2accf, 2e2b670, 9020832
