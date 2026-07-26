---
phase: quick-260726-lbq
plan: 01
type: execute
wave: 1
depends_on: []
quick: true
files_modified:
  - src/game/moveHighlight.ts
  - src/game/moveHighlight.test.ts
  - src/game/scene/MoveHighlight.tsx
  - src/game/scene/BoardScene.tsx
  - src/game/scene/Token.tsx
  - src/game/scene/scene.test.tsx
  - src/game/styles/game.css
  - src/game/PlayView.tsx
autonomous: true
requirements: [LOOP-05, LOOP-06, LOOP-07, ART-04]
user_setup: []

must_haves:
  truths:
    - "주사위가 멈춘 뒤 토큰이 움직이기 시작하기 전에, 목적지 칸이 보드 위에서 강조되어 보인다(정지 화면에서도 어디로 갈지 읽힌다)."
    - "출발 칸과 주사위 목적지 사이의 경유 칸이 점으로 표시되어 몇 칸 가는지 눈으로 셀 수 있다(점 개수 + 목적지 = 주사위 눈)."
    - "이벤트로 추가 이동이 있는 턴(to ≠ afterRoll)에는 최종 목적지가 주사위 목적지와 다른 색·다른 모양으로 구분되고, 전진(민트)과 후퇴(코랄)가 색으로 구분된다."
    - "토큰이 도착하면(onTokenArrive) 모든 하이라이트가 사라진다."
    - "prefers-reduced-motion: reduce 에서도 하이라이트는 사라지지 않고 정적으로 표시된다(맥동만 멈춘다)."
    - "오버슛 승리(afterRoll ≥ boardLength)에서도 마커가 보드 밖 허공에 뜨지 않고 결승 칸에 붙는다."
    - "기존 ANIM_DONE 흐름(D-07), watchdog 비고착, 승리 시 ResultView 전환이 전부 그대로 동작한다."
  artifacts:
    - src/game/moveHighlight.ts
    - src/game/moveHighlight.test.ts
    - src/game/scene/MoveHighlight.tsx
  key_links:
    - "PlayView.seq === 'preview' | 'token' → BoardScene.highlight → MoveHighlight (하이라이트가 홉 시작 전에 뜨는 유일한 경로)"
    - "PREVIEW_S 가 startWatchdog 예산에 더해지지 않으면 watchdog 이 홉 도중 busy 를 조기 해제한다"
    - "MoveHighlight 는 <Bounds> 밖에 마운트되어야 한다 — 안에 넣으면 매 롤마다 카메라가 리프레임되어 화면이 튄다"
    - "planHighlight 의 boardLength 클램프가 없으면 오버슛 승리 턴에서 마커가 보드 밖에 생성된다"
    - "Dice.onSettled → handleDiceSettled → PREVIEW 타이머 → seq 'token' (타이머가 새면 busy 고착)"
---

<objective>
주사위 눈이 확정된 순간, **토큰이 움직이기 전에** 보드 위에서 "어느 칸으로 가는지"가 한눈에 보이게 만든다.

현재 연출에는 목적지 어포던스가 전혀 없다. `PlayView.handleRoll()`이 `{ from, afterRoll, to }`를 만들고 주사위가 DICE_S 동안 도는 사이 토큰은 `from`에 멈춰 있다가 곧바로 홉을 시작한다. 그 사이 보드가 알려주는 것은 아무것도 없고, 유일한 링(Token의 active ring)은 *현재 위치*만 표시한다 — 게다가 그 링은 y=0.02 로 타일 상단(y=0.15) **아래**에 묻혀 있어 실제로는 보이지도 않는다.

Purpose: 아동 사용자가 "굴린 결과 → 갈 곳"을 보드에서 즉시 읽게 한다. 강사 설명 없이 시선이 목적지로 먼저 가고, 그 다음 토큰이 그 자리로 이동하는 순서를 만든다.

Output:
- `src/game/moveHighlight.ts` — 순수 하이라이트 모델(`planHighlight`)과 단위 테스트
- `src/game/scene/MoveHighlight.tsx` — 경유 점(instancedMesh 1개) + 주사위 목적지 링 + 이벤트 최종 목적지 핀 + `<Html>` 칸 라벨
- `PlayView`의 `preview` 비트 — 주사위 정착 후 PREVIEW_S 동안 하이라이트만 보이다가 토큰이 출발
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./.claude/CLAUDE.md

@src/game/PlayView.tsx
@src/game/scene/BoardScene.tsx
@src/game/scene/BoardTiles.tsx
@src/game/scene/Token.tsx
@src/game/scene/Dice.tsx
@src/game/scene/scene.test.tsx
@src/game/boardLayout.ts
@src/game/usePresentation.ts
@src/game/hud/DiceResultPanel.tsx
@src/game/styles/game.css
</context>

<interfaces>
실행자가 반드시 지켜야 할 기존 계약(코드에서 실측):

- `MoveSpec` (src/game/scene/Token.tsx): `{ id: number; from: number; afterRoll: number; to: number }`. `from→afterRoll`이 주사위 이동, `afterRoll→to`가 이벤트 이동(이벤트 없으면 동일).
- `squarePosition(index: number): Vector3` (src/game/boardLayout.ts) — 순수, y는 항상 0. 인덱스 범위를 검사하지 않는다(보드 밖 인덱스도 좌표를 반환한다).
- 엔진 `rollDice` (src/engine/engine.ts): `afterRoll = from + roll` 에 **상한 클램프가 없다**(D-03 오버슛 승리). 전진 이벤트의 `to`도 boardLength를 넘을 수 있다. 후진만 `Math.max(0, ...)` 하한 클램프가 있다.
- 타일 지오메트리 높이: 경로 타일 `RoundedBoxGeometry(0.94, 0.3, 0.94)` → 상단 y=+0.15. 결승 타일 높이 0.38 → 상단 y=+0.19.
- 팔레트(src/styles/index.css, 신규 색 금지): `--sky #22B0F2`, `--sun #FFCB2E` / `--sun-deep #FF9F1C`, `--coral #FF5C7A`, `--grass #25D6A0`, `--grape #9A7DFF`, `--ink #173A57`, `--panel #FFFFFF`. 결승 타일은 이미 `--sun` 계열, Token active ring은 이미 `--sky`.
- 타이밍 상수 관례: `DICE_S`는 Dice.tsx, `HOP_S`는 Token.tsx에서 export → PlayView가 watchdog 예산 계산에 사용.
- `usePresentation.startWatchdog(durationMs)`는 내부적으로 `WATCHDOG_BUFFER_MS = 500`을 더한다. 예산에는 애니메이션 시간만 넣는다.
- `scene.test.tsx`는 `@vitest-environment node` — `document`/`window`가 없다. 따라서 `<Html>`은 렌더되지 않고 `prefersReducedMotion()`은 false를 반환한다.
</interfaces>

<design_decisions>
플래너가 고정한 결정(실행자는 임의 변경 금지):

**D-A 색 언어 — 기존 토큰만 사용, 충돌 회피**
- 경유 칸 점 = `--sky #22B0F2`. Token의 active ring과 같은 하늘색 → "내 토큰이 지나갈 길"로 읽힌다.
- 주사위 목적지 링 = `--grape #9A7DFF`. `--sun`(결승 타일)과도, `--sky`(현재 위치 링)와도 겹치지 않는 유일한 고대비 선택.
- 이벤트 최종 목적지 핀 = 전진 `--grass #25D6A0` / 후퇴 `--coral #FF5C7A`. DiceResultPanel의 `.eff-forward`/`.eff-backward`와 **동일한 색 언어**라 DOM 문구와 보드가 같은 말을 한다.

**D-B 형태 구분** — 주사위 목적지는 바닥에 눕는 **링**, 이벤트 최종 목적지는 칸 위에 떠서 아래를 가리키는 **원뿔 핀**. 색뿐 아니라 형태로도 구분된다(색맹 접근성).

**D-C 드로우콜** — 경유 점은 **고정 용량 instancedMesh 1개**(BoardTiles 패턴). 칸마다 mesh를 만들지 않는다. 링/핀은 각각 mesh 1개. BoardTiles의 `path-tiles` instancedMesh는 손대지 않는다(`setColorAt` 갱신 없음).

**D-D 타이밍** — 주사위 정착(`onSettled`) 직후 `PREVIEW_S = 0.55`초 동안 하이라이트만 보이고 토큰은 `from`에 정지. 그 다음 홉 시작. 이 비트가 없으면 "본 다음 움직인다"는 요구가 성립하지 않는다.

**D-E 스포일러 방지** — 하이라이트는 `seq === 'dice'`(주사위 회전 중)에는 뜨지 않는다. 눈이 보이기 전에 목적지를 알려주면 주사위 연출이 무의미해진다.
</design_decisions>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: 순수 하이라이트 모델 planHighlight + 단위 테스트</name>
  <files>src/game/moveHighlight.ts, src/game/moveHighlight.test.ts</files>
  <behavior>
    - roll 4, from 0, 이벤트 없음(boardLength 20) → dest 4, steps [1,2,3], final null, finalDir null. (점 3개 + 목적지 = 4칸)
    - roll 1, from 5 → dest 6, steps [] (경유 칸 없음), final null.
    - 전진 이벤트: from 3, afterRoll 6, to 9 → dest 6, steps [4,5], final 9, finalDir 'forward'.
    - 후퇴 이벤트: from 3, afterRoll 6, to 2 → dest 6, steps [4,5], final 2, finalDir 'backward'.
    - 오버슛 승리: from 18, afterRoll 22, to 22, boardLength 20 → dest 20(결승 칸으로 클램프), steps [19], final null. 어떤 반환 인덱스도 20을 넘지 않는다.
    - 전진 이벤트 승리: from 15, afterRoll 18, to 24, boardLength 20 → final 20(클램프), finalDir 'forward'.
    - from === afterRoll === to (방어적) → steps [], final null.
    - steps 길이는 어떤 입력에서도 MAX_STEP_MARKERS 이하다.
  </behavior>
  <action>
    `src/game/moveHighlight.ts`를 새로 만든다. `boardLayout.ts`와 동일한 계약을 헤드 주석에 명시한다 — React/DOM/three import 없음, 결정적, 부수효과 없음, 단위 테스트 대상. `MoveSpec` 타입만 `./scene/Token`에서 `import type`으로 가져온다(타입 전용이므로 런타임 의존 없음).

    export 항목:
    - `MAX_STEP_MARKERS = 8` — 경유 점 instancedMesh의 고정 용량. 주사위 최대 6 → 경유 칸 최대 5이므로 여유가 있다. 이 상수는 Task 2의 instancedMesh args가 절대 변하지 않게(리마운트 방지) 하는 근거다.
    - `HighlightPlan` 인터페이스: `steps: number[]`, `dest: number`, `final: number | null`, `finalDir: 'forward' | 'backward' | null`.
    - `planHighlight(move: MoveSpec, boardLength: number): HighlightPlan`.

    구현 규칙:
    - 내부 clamp 헬퍼로 모든 반환 인덱스를 `[0, boardLength]`로 가둔다. 이유를 주석에 남긴다 — 엔진은 오버슛을 클램프하지 않으므로(D-03) 클램프 없이는 승리 턴마다 마커가 보드 끝 너머 허공에 생성된다.
    - `dest = clamp(move.afterRoll)`.
    - `steps`는 **클램프된 dest를 기준으로** 계산한다: `from`과 `dest` 사이를 진행 방향으로 순회하되 양 끝을 제외한 인덱스들. 이렇게 하면 오버슛에서도 중복·보드 밖 인덱스가 생기지 않는다. 마지막에 `slice(0, MAX_STEP_MARKERS)`로 방어적으로 자른다.
    - `final`은 `move.to === move.afterRoll`이면 null, 아니면 `clamp(move.to)`. `finalDir`은 `move.to > move.afterRoll`이면 'forward', 작으면 'backward', 같으면 null. 방향 판정은 **클램프 전 원본 값**으로 한다(클램프 후 dest와 final이 같아져도 이벤트 방향은 유지되어야 한다).
    - 이벤트 최종 목적지가 클램프 후 dest와 같은 칸이 되는 경우(둘 다 결승)에도 `final`은 null로 만들지 않는다 — 핀은 그대로 뜨고, 링과 겹쳐 보이는 것이 정상이다.

    `src/game/moveHighlight.test.ts`는 `boardLayout.test.ts`의 스타일(vitest describe/it, 순수 함수 직접 호출, R3F 미사용)을 그대로 따른다. behavior 블록의 8개 케이스를 각각 검증한다.
  </action>
  <verify>
    <automated>npx vitest run src/game/moveHighlight.test.ts</automated>
    <automated>npx tsc -b</automated>
  </verify>
  <done>planHighlight가 8개 케이스를 모두 통과하고, 반환되는 모든 칸 인덱스가 [0, boardLength] 범위 안이며, 타입체크가 통과한다.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: MoveHighlight 씬 컴포넌트 + BoardScene 배선 + 구조 테스트</name>
  <files>src/game/scene/MoveHighlight.tsx, src/game/scene/BoardScene.tsx, src/game/scene/Token.tsx, src/game/scene/scene.test.tsx, src/game/styles/game.css</files>
  <behavior>
    - `highlight={null}`로 마운트하면 `move-highlight` 노드가 씬에 없고, instancedMesh는 여전히 `path-tiles` 하나뿐이다(기존 D-08 단언 유지).
    - 이벤트 없는 move(from 0, afterRoll 4, to 4)로 마운트하면 `step-markers` instancedMesh의 count가 3이고, `dest-marker`가 1개, `final-marker`는 0개다.
    - 이벤트 있는 move(from 3, afterRoll 6, to 9)로 마운트하면 `final-marker`가 1개다.
    - 어떤 경우에도 `path-tiles`라는 이름의 instancedMesh 개수는 정확히 1이다(타일 구조를 깨지 않았다는 회귀 가드).
    - 오버슛 move(from 18, afterRoll 22, to 22, boardLength 20)에서도 헤드리스 마운트가 예외 없이 끝난다.
  </behavior>
  <action>
    **(a) Token.tsx 최소 수정 2건.**
    첫째, 기존 `prefersReducedMotion` 함수에 `export`를 붙인다(신규 구현 금지 — 재사용). 둘째, active ring mesh의 y를 0.02에서 0.22로 올린다. 근거를 한 줄 주석으로 남긴다: 경로 타일 상단이 y=0.15, 결승 타일 상단이 y=0.19이므로 0.02의 링은 타일 내부에 묻혀 화면에 나타나지 않았다. 0.22는 둘 다 넘긴다. 그 외 Token.tsx는 건드리지 않는다(홉 로직·onArrive 계약 불변).

    **(b) `src/game/scene/MoveHighlight.tsx` 신규.**
    헤드 주석에 역할을 적는다: 주사위 정착부터 토큰 도착까지 "어디로 가는지"를 보드에 표시하는 레이어. 상수 `PREVIEW_S = 0.55`를 export한다(DICE_S/HOP_S와 같은 관례 — PlayView의 watchdog 예산이 이 값을 쓴다).

    Props: `{ move: MoveSpec | null; boardLength: number; visible: boolean }`.

    **훅 규칙(중요):** 기본 export `MoveHighlight`는 훅을 하나도 쓰지 않는 얇은 게이트다 — `visible`이 false거나 `move`가 null이면 즉시 null을 반환하고, 아니면 내부 컴포넌트 `HighlightMarkers`를 렌더한다. 모든 훅(useMemo/useRef/useLayoutEffect/useFrame/useThree)은 `HighlightMarkers` 안에만 둔다. 조건부 훅 호출과 null-ref 가드를 동시에 피하는 구조다.

    `HighlightMarkers`가 렌더하는 것(모두 `<group name="move-highlight">` 안):
    1. **경유 점** — `<instancedMesh name="step-markers" args={[undefined, undefined, MAX_STEP_MARKERS]}>`. args의 세 번째 인자는 반드시 상수 MAX_STEP_MARKERS여야 한다(가변이면 롤마다 인스턴스 메시가 재생성된다). 자식으로 JSX intrinsic `cylinderGeometry`(반지름 0.14, 높이 0.06, 세그먼트 18)와 `meshStandardMaterial`(color/emissive 모두 `#22B0F2`, emissiveIntensity 0.5, roughness 0.35)을 둔다. JSX로 선언한 지오메트리는 R3F가 자동 dispose하므로 useMemo를 쓰지 않는다 — useMemo로 만들 경우에는 BoardTiles 25–31행과 동일한 명시적 dispose useEffect를 반드시 붙인다(Pitfall 2 / D-08). `useLayoutEffect`에서 `Object3D` 더미로 각 step 칸의 `squarePosition`을 써 matrix를 기록하고, `mesh.count = steps.length`, `mesh.instanceMatrix.needsUpdate = true`를 설정한다. 색은 인스턴스마다 다르지 않으므로 `setColorAt`을 호출하지 않는다(instanceColor 미사용).
    2. **주사위 목적지 링** — `<mesh name="dest-marker">`를 `squarePosition(dest)` 위치에 두고, `ringGeometry`(내경 0.40, 외경 0.58, 세그먼트 40)를 x축 -PI/2 회전으로 눕힌다. 재질은 color/emissive 모두 `#9A7DFF`, emissiveIntensity 0.85. 회전·위치는 부모 group에 주고 mesh 자체는 스케일 애니메이션 대상으로 삼는다.
    3. **이벤트 최종 목적지 핀** — `plan.final != null`일 때만 `<mesh name="final-marker">`. `coneGeometry`(반지름 0.22, 높이 0.42, 세그먼트 20)를 x축 PI 회전시켜 **뾰족한 끝이 아래를 향하게** 하고, `squarePosition(final)` 위 y≈0.95에 띄운다. 색은 `finalDir === 'forward'`면 `#25D6A0`, 아니면 `#FF5C7A`(emissive 동일 색, intensity 0.6).
    4. **칸 라벨** — `typeof document !== 'undefined'` 가드 안에서만(BoardTiles·Token의 기존 패턴) `<Html center distanceFactor={10}>`을 `plan.final ?? plan.dest` 칸 위 y≈1.35에 렌더하고, 내용은 `<span className="move-dest-label" aria-hidden="true">{(plan.final ?? plan.dest)}칸</span>`. **aria-hidden 필수** — 목적지 정보는 도착 후 DiceResultPanel의 `aria-live="polite"` 영역이 단독으로 안내하므로 중복 낭독을 만들면 안 된다.

    평면 마커의 y 좌표는 상수 `MARKER_Y = 0.22`로 뽑아 링과 점에 함께 쓴다(타일 상단 0.15·결승 0.19를 모두 넘기는 값이라는 주석 포함).

    **애니메이션:** `useFrame`에서 ref로만 조작한다 — **프레임마다 setState 금지**(Token.tsx에 명시된 anti-pattern). 링 mesh의 스케일을 `1 + sin(clock.elapsedTime * 4) * 0.12`로 맥동시키고, 핀의 y를 같은 위상으로 소폭 위아래 이동시킨다. `useThree().invalidate()`를 프레임마다 호출한다(Token/Dice와 동일 — frameloop이 demand로 바뀌어도 안전). `prefersReducedMotion()`이 true면 useFrame 콜백은 즉시 return하고, 대신 `useLayoutEffect`에서 스케일 1·기본 y를 한 번 세팅한다 — **표시 자체를 없애면 안 된다**(접근성 저하). `plan`은 `useMemo(() => planHighlight(move, boardLength), [move, boardLength])`로 계산한다.

    **(c) BoardScene.tsx 배선.** `BoardSceneProps`에 `highlight: MoveSpec | null`을 필수 필드로 추가하고(선택 필드로 만들면 PlayView 배선 누락을 타입체커가 못 잡는다), `SceneContents`에서 구조 분해한 뒤 `<MoveHighlight move={highlight} boardLength={boardLength} visible={highlight !== null} />`를 렌더한다. **배치 위치가 중요하다: `</Bounds>` 바로 다음, `participants.map` 위.** `<Bounds>` 안에 넣으면 하이라이트가 프레이밍 대상이 되어 롤마다 카메라가 다시 맞춰지며 화면이 튄다 — BoardScene 57–58행 주석이 명시한 제약이다. `<Bounds>` 블록 자체는 수정하지 않는다.

    **(d) game.css 추가.** 파일 끝에 `.move-dest-label` 한 블록만 추가한다 — 알약 형태(배경 `var(--panel)`, 글자 `var(--ink)`, 2px 테두리 `var(--grape)`, border-radius 999px, padding 2px 10px, font-size `var(--game-caption)`, font-weight 900, white-space nowrap, user-select none, pointer-events none). **새 hue/토큰을 선언하지 않는다** — 기존 변수만 참조한다(game.css 헤드 주석의 규칙).

    **(e) scene.test.tsx 갱신.** 기존 `renderScene` 헬퍼에 `highlight` 인자를 추가하고(기본값 null) `<SceneContents>`에 전달한다 — 기존 4개 테스트는 `highlight={null}`로 동작해야 하며 단언은 바꾸지 않는다. 단, 기존 두 테스트의 `findAll(isInstancedMesh)` 단언은 **`name === 'path-tiles'` 필터로 좁힌다** — 하이라이트가 두 번째 instancedMesh를 추가할 수 있으므로 "instancedMesh는 전역에서 1개"가 아니라 "경로 타일 instancedMesh는 1개"가 앞으로의 정확한 계약이다. 그 위에 behavior 블록의 새 케이스들을 `describe('move destination highlight')`로 추가한다.
  </action>
  <verify>
    <automated>npx vitest run src/game/scene/scene.test.tsx</automated>
    <automated>npx tsc -b</automated>
    <automated>grep -n "MoveHighlight" src/game/scene/BoardScene.tsx</automated>
    <human-check>`npm run dev` → 게임 시작 → 성공 판정 → 주사위 굴리기. 주사위가 멈춘 직후 (1) 보라색 링이 목적지 칸에 맥동하고 (2) 그 앞 칸들에 하늘색 점이 찍히며 (3) 링 위에 "N칸" 알약 라벨이 뜨는지 본다. 이벤트 칸에 걸리는 턴에서는 민트/코랄 원뿔 핀이 최종 목적지에 추가로 뜨는지 확인한다. **카메라가 롤마다 다시 줌/재프레임되지 않는지** 특히 확인한다(Bounds 밖 배치 검증). 시스템 설정에서 "동작 줄이기"를 켠 뒤 다시 굴려 하이라이트가 맥동 없이 그대로 보이는지 확인한다.</human-check>
  </verify>
  <done>헤드리스 씬 테스트가 신규·기존 케이스 모두 통과하고, `path-tiles` instancedMesh는 여전히 정확히 1개이며, 타입체크가 통과한다. 브라우저에서 링·점·핀·라벨이 보이고 카메라가 튀지 않는다.</done>
</task>

<task type="auto">
  <name>Task 3: PlayView preview 비트 + watchdog 예산 갱신</name>
  <files>src/game/PlayView.tsx</files>
  <action>
    `import MoveHighlight, { PREVIEW_S }`가 아니라 상수만 필요하므로 `import { PREVIEW_S } from './scene/MoveHighlight'`를 추가한다(DICE_S/HOP_S import 옆).

    **(a) 시퀀스 확장.** `Seq` 타입을 `'idle' | 'dice' | 'preview' | 'token'`으로 넓힌다. 헤드 주석의 시퀀스 설명도 "주사위 회전 → 목적지 프리뷰 → 토큰 홉"으로 갱신한다.

    **(b) preview 타이머.** `previewTimer` ref(`ReturnType<typeof setTimeout> | null`)를 추가한다. `handleDiceSettled()`는 이제 곧바로 `setSeq('token')` 하지 않고, 먼저 기존 타이머가 있으면 `clearTimeout`으로 정리한 뒤(방어적 재진입 가드) `setSeq('preview')`를 호출하고 `PREVIEW_S * 1000` 뒤에 `setSeq('token')` 하는 타이머를 건다. `handleTokenArrive()`와 언마운트 cleanup effect(현재 watchdog만 정리하는 61행 effect)에서도 이 타이머를 반드시 정리한다 — 승리 턴에서는 도착 직후 GameApp이 ResultView로 전환하며 PlayView가 언마운트되므로, 정리하지 않으면 언마운트된 컴포넌트의 setState 타이머가 남는다.

    **(c) watchdog 예산.** `startWatchdog` 인자에 프리뷰 시간을 더한다: 주사위 회전 + 프리뷰 + 홉 전체. 즉 `DICE_S * 1000 + PREVIEW_S * 1000 + hops * HOP_S * 1000`. 이 항을 빼먹으면 watchdog이 홉 도중 busy를 강제 해제해 컨트롤이 조기 노출되고 승리 화면이 이동 중에 튀어나온다. 계산 라인에 그 이유를 한 줄 주석으로 남긴다. `WATCHDOG_BUFFER_MS`는 스토어가 알아서 더하므로 여기서 더하지 않는다.

    **(d) 하이라이트 전달.** `<BoardScene>`에 `highlight={seq === 'preview' || seq === 'token' ? move : null}`을 넘긴다. `seq === 'dice'` 동안에는 null이어야 한다 — 주사위 눈이 보이기 전에 목적지를 노출하면 주사위 연출이 무의미해진다(D-E). `runToken={seq === 'token'}`은 그대로 둔다. `move`는 `handleTokenArrive`에서 이미 null로 초기화되므로 도착과 동시에 하이라이트가 사라진다.

    나머지(카운트다운 effect, 판정/뽑기 핸들러, HUD 구성)는 손대지 않는다.
  </action>
  <verify>
    <automated>npx tsc -b</automated>
    <automated>npx vitest run</automated>
    <human-check>`npm run dev`에서 한 게임을 끝까지 플레이한다. (1) 주사위가 도는 동안에는 목적지 표시가 **없다가** 눈이 확정되고 잠깐(약 0.5초) 하이라이트만 보인 뒤 토큰이 출발하는 순서를 확인한다. (2) 토큰이 도착하는 순간 하이라이트가 사라지고 🎲 결과 패널과 다음 버튼이 나타나는지 확인한다. (3) 이벤트로 뒤로 가는 턴에서 코랄 핀이 뒤쪽 칸에 뜨는지 확인한다. (4) 결승 칸을 넘겨 이기는 턴에서 마커가 보드 밖이 아니라 결승 칸에 붙고, 도착 후 결과 화면이 정상 전환되는지 확인한다(버튼이 잠기지 않는다). (5) 굴리기 → 도착 사이에 컨트롤이 조기 활성화되지 않는지 확인한다.</human-check>
  </verify>
  <done>주사위 정착 후 PREVIEW_S 동안 하이라이트만 보이다 토큰이 이동하고, 도착 시 하이라이트가 사라지며 기존 ANIM_DONE·승리 전환·전체 테스트 스위트가 그대로 통과한다.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (신규 없음) | 순수 클라이언트 렌더링 변경. 네트워크 호출·사용자 입력 파싱·저장소 스키마 변경·패키지 설치가 전혀 없다. 기존 localStorage/JSON 임포트 경계는 이 플랜이 건드리지 않는다. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-LBQ-01 | Denial of Service | PlayView preview 타이머 | medium | mitigate | PREVIEW_S를 watchdog 예산에 포함하고, 타이머를 handleTokenArrive·언마운트 cleanup에서 clearTimeout — busy 고착/누수 차단(Pitfall 1) |
| T-LBQ-02 | Denial of Service | MoveHighlight useFrame 맥동 | low | mitigate | 고정 용량 instancedMesh(MAX_STEP_MARKERS) + ref 전용 애니메이션(프레임당 setState 금지) + reduced-motion 시 프레임 콜백 조기 return |
| T-LBQ-03 | Tampering | 씬 GPU 리소스 수명 | low | mitigate | 지오메트리는 JSX intrinsic으로 선언해 R3F 자동 dispose에 맡기고, useMemo로 만든 경우에만 BoardTiles와 동일한 명시적 dispose useEffect 추가(D-08) |
| T-LBQ-04 | Information Disclosure | — | low | accept | 신규 데이터 흐름 없음. 표시되는 값은 이미 화면에 있는 칸 번호뿐 |
| T-LBQ-SC | Tampering | npm/pip/cargo installs | n/a | accept | 이 플랜은 의존성을 설치하지 않는다(package.json 미변경) — 공급망 검증 대상 없음 |
</threat_model>

<verification>
1. `npx tsc -b` — 타입체크 통과(BoardSceneProps.highlight 필수 필드가 배선 누락을 잡는다).
2. `npx vitest run` — 전체 스위트 통과. 특히 `scene.test.tsx`의 D-08 단언이 `path-tiles` 기준으로 살아 있고, 엔진/HUD 테스트에 회귀가 없다.
3. 브라우저 수동 확인(Task 2·3의 human-check 항목 전부).
4. 회귀 확인: 성공 판정 → 굴리기 → 도착 → 다음 흐름에서 컨트롤 조기 노출 없음, 승리 시 ResultView 정상 전환, 새로고침 후 재플레이 정상.
</verification>

<success_criteria>
- 주사위 눈이 확정된 순간부터 토큰 도착까지 목적지 칸이 보드 위에서 명확히 구분된다(보라 링 + 칸 라벨).
- 경유 칸 점 개수 + 목적지 = 주사위 눈이 되어 몇 칸 가는지 셀 수 있다.
- `to !== afterRoll`인 턴에서 최종 목적지가 다른 색·다른 형태(민트/코랄 원뿔 핀)로 구분되고 전진·후퇴가 색으로 읽힌다.
- 하이라이트는 토큰 홉 **이전에** 나타나고 도착과 동시에 사라진다.
- reduced-motion에서도 하이라이트가 정적으로 유지된다.
- 경로 타일은 여전히 단일 instancedMesh이고, 새 3D 에셋·라이브러리·팔레트 hue가 추가되지 않았다.
- ANIM_DONE·watchdog·승리 전환에 회귀가 없다.
</success_criteria>

<output>
Create `.planning/quick/260726-lbq-move-destination/260726-lbq-SUMMARY.md` when done
</output>
