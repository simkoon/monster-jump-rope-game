# Stack Research — v2.0 3D 블루마블 재구축

**Domain:** 기존 React 19 + Zustand 앱에 3D 게임 화면(사각 순환판, 코드 생성 치비 동물 캐릭터, 퀘스트 성공 연출) 추가
**Researched:** 2026-10-22
**Confidence:** HIGH (버전·peer 호환성·테스트 방식은 npm 레지스트리 조회와 로컬 설치·Vitest 실행으로 직접 확인함) / MEDIUM (iOS Safari 후처리 판단은 근거를 바탕으로 한 추론임)

> 범위: v2.0 신규 기능에 필요한 **추가·변경 사항만** 다룬다. React 19.2.8, TypeScript 5.9.3, Vite 8.1.5, Zustand 5.0.14(persist), Zod 4.4.3, react-hook-form, Tailwind 4.3.3, Vitest 3.2.4 + Testing Library + jsdom 27은 이미 검증된 스택이므로 다시 조사하지 않는다.

## 결론 먼저

1. **3D 패키지 5개만 다시 넣는다.** `three@0.186.1`, `@react-three/fiber@9.8.2`, `@react-three/drei@10.7.9`, dev 의존성 `@types/three@0.186.0`, `@react-three/test-renderer@9.1.1`. v1 Phase 3 구성(0.185.1 / 9.6.1 / 10.7.7 / 9.1.0)과 같은 계열의 최신 패치·마이너 버전이다. **모두 exact pin**으로 고정한다(v1 Pitfall 5 참고).
2. **`@react-three/postprocessing`은 넣지 않는다.** 툰 외곽선은 drei `<Outlines>`(inverted hull)로, 반짝임은 `toneMapped={false}` + additive 블렌딩 머티리얼로 흉내 낸다. 강사가 쓰는 주 기기는 iPhone이고, iOS Safari에서는 탭 메모리 한도 때문에 WebGL 컨텍스트가 끊기는 사례가 반복해서 보고된다. 그런 환경에서 전체 화면 렌더 타깃을 여러 장 추가하는 것은 득보다 실이 크다.
3. **애니메이션 라이브러리도 넣지 않는다.** `useFrame` 안에서 `delta`를 누적하는 자체 tween/타임라인 모듈(순수 함수)을 쓴다. 이렇게 하면 `@react-three/test-renderer`의 `advanceFrames(n, delta)`로 연출 시퀀스 전체를 결정적으로 돌려 볼 수 있고, 끝나는 시점이 정확히 한 번 나오므로 ANIM_DONE 게이트와 바로 맞물린다. 이 동작은 로컬 테스트로 확인했다. react-spring과 GSAP은 자체 rAF 시계를 따로 돌리기 때문에 이 성질이 깨진다.
4. **사운드(howler)는 선택 사항이며 마지막 페이즈로 미룬다.** 넣게 되면 `howler@2.2.4`에 더해 `navigator.audioSession.type = 'playback'` 설정이 꼭 필요하다(iPhone 무음 스위치 문제).
5. **3D 공간에 한글 텍스트를 그리지 않는다.** drei `<Text>`(troika)는 기본 폰트를 Google Fonts CDN에서, 한글 fallback 폰트를 jsDelivr CDN에서 내려받는다. 수업 현장 네트워크에 기대게 되므로 쓰지 않는다. 글자는 모두 DOM HUD에서 처리한다.

## Recommended Stack

### Core Technologies (새로 추가)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **three** | `0.186.1` (exact) | WebGL 렌더링, `MeshToonMaterial`, `DataTexture` gradientMap, `InstancedMesh`, `ExtrudeGeometry`, `three/addons/geometries/RoundedBoxGeometry.js` | 2026-09-24 공개된 최신 버전이다. 검증된 vanilla 프로토타입(r170)에서 쓴 API는 r186에도 그대로 있다. `RoundedBoxGeometry`가 `three/addons/*` export에 있는 것도 tarball에서 확인했다. r163부터 WebGL1이 빠졌지만 iOS 15 이상은 WebGL2를 지원하므로 문제없다. |
| **@react-three/fiber** | `9.8.2` (exact) | Three.js용 React 렌더러. 3D 씬과 DOM HUD가 같은 Zustand 스토어를 공유한다 | peer 범위는 `react >=19 <19.4`이고 현재 쓰는 React 19.2.8이 이 안에 들어간다. 9.x가 React 19 라인이다. 10.0.0-alpha가 있지만 alpha이고 drei 11 alpha와 짝을 이루므로 쓰지 않는다. 9.8.2는 2026-10-14에 공개됐다. 문제가 생기면 9.8.1로 내린다. |
| **@react-three/drei** | `10.7.9` (exact) | `<Outlines>`(툰 외곽선), `<Html>`(필요한 곳에만), `<Bounds>`/카메라 보조 | peer는 `fiber ^9.0.0`, `react ^19`, `three >=0.159`다. `Outlines`의 d.ts(color/thickness/screenspace/angle)를 확인했고, `MeshToonMaterial` + `RoundedBoxGeometry` 메시에 붙여 headless 렌더까지 확인했다. 필요한 컴포넌트만 named import로 가져오면 tree-shaking된다. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@types/three** | `0.186.0` (dev, exact) | three 타입 | 항상 쓴다. three의 minor 버전과 맞춘다(0.186.x ↔ 0.186.x). 레지스트리의 최신 @types가 0.186.0이다. three를 올릴 때는 이 패키지도 같은 커밋에서 같이 올린다. |
| **@react-three/test-renderer** | `9.1.1` (dev, exact) | WebGL 없이 씬 그래프를 렌더하고 `advanceFrames`로 `useFrame` 구동 | 씬 구조 테스트와 연출 시퀀스 테스트에 쓴다. peer는 `fiber >=9.0.0`, `react ^19`다. 아래 "테스트 전략"에서 로컬 검증 결과를 정리했다. |
| **howler** | `2.2.4` (선택) | SFX(주사위, 이동 홉, 성공 팡파르, 별 획득) | **사운드를 넣기로 할 때만** 쓴다. 마지막 publish가 2023-09라 사실상 유지보수가 멈췄지만 API는 안정적이고, 첫 터치에 오디오를 unlock해 준다. `@types/howler@2.2.13`도 함께 설치한다. |

### 넣지 않지만 이미 트리에 있는 것

| 패키지 | 상태 | 지침 |
|--------|------|------|
| `maath@0.10.8` | drei의 transitive 의존성 | 직접 import하지 않는다(phantom dependency). 카메라를 부드럽게 따라가게 하는 데는 three 내장 `THREE.MathUtils.damp(x, y, lambda, dt)`로 충분하다. |
| `three-stdlib@2.36.1` | drei의 transitive 의존성 | 직접 import하지 않는다. 같은 기능은 `three/addons/*`(three 본체)에서 가져온다. |
| `stats-gl` → nested `three@0.170.0` | drei의 transitive 의존성이 **별도의 three 사본**을 끌고 들어온다 | drei의 `StatsGl`/`Perf` 계열을 import하지 않는다. import하면 three 인스턴스가 두 개가 되고 경고가 뜨며 번들도 커진다. FPS를 확인할 때는 Safari Web Inspector를 쓴다. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Safari Web Inspector (Mac ↔ iPhone USB) | 실기기 FPS, 메모리, 컨텍스트 손실 확인 | iOS Safari가 1차 타깃이다. 연출이 완성될 때마다 실기기에서 확인한다. `gl.info.memory`/`gl.info.render.calls`를 개발용 오버레이(DOM)에 띄워 둔다. |
| 기존 vanilla 프로토타입(three@0.170) | 캐릭터와 연출의 시각 기준 | R3F로 옮길 때 지오메트리 파라미터, 그라디언트 3단계 값, 타이밍을 그대로 상수 모듈로 옮겨 비교 기준으로 쓴다. |

## Installation

```bash
# Core 3D (exact pin — 캐럿 금지, three와 @types/three는 lockstep)
npm install --save-exact three@0.186.1 @react-three/fiber@9.8.2 @react-three/drei@10.7.9

# Dev
npm install --save-exact -D @types/three@0.186.0 @react-three/test-renderer@9.1.1

# OPTIONAL — 사운드 페이즈에서만
npm install --save-exact howler@2.2.4
npm install --save-exact -D @types/howler@2.2.13
```

> 검증 메모: 레포의 `package.json`과 `package-lock.json`을 그대로 복사해 위 조합을 설치해 보았고 peer 충돌이 없었다. lockfile 없이 새로 설치하면 `@hookform/resolvers`의 optional peer(valibot) 때문에 ERESOLVE가 날 수 있다. **반드시 기존 lockfile 위에서 `npm install`한다.**

## 핵심 결정 상세

### 1. 후처리(@react-three/postprocessing): 쓰지 않는다 (MEDIUM)

| 원하는 효과 | 후처리 없이 구현하는 방법 |
|-------------|---------------------------|
| 닌텐도풍 툰 외곽선 | drei `<Outlines thickness color />`를 몸통·머리·귀처럼 **실루엣을 만드는 파트에만** 붙인다. 눈, 볼, 입 같은 작은 파트에는 붙이지 않는다. 메시당 draw call이 하나 늘어난다. |
| 셀 셰이딩 | `MeshToonMaterial` + 3단계 `DataTexture` gradientMap(`RedFormat`, `NearestFilter`, `needsUpdate=true`). 프로토타입에서 검증했고 R3F에서도 headless 렌더로 확인했다. |
| 별, 충격파 링의 "빛남" | `MeshBasicMaterial({ toneMapped:false, transparent:true, blending: AdditiveBlending, depthWrite:false })` + 스케일·불투명도 tween. bloom 없이도 발광하는 느낌을 낸다. |
| 결승/점수 강조 | DOM 쪽 CSS(Tailwind) glow와 배너. 3D가 아니어도 된다. |

**쓰지 않는 이유:**
- EffectComposer는 drawing buffer 크기(DPR 반영)의 렌더 타깃을 여러 장 잡고, 기본 MSAA까지 더한다. iPhone의 높은 DPR에서는 GPU 메모리와 fill-rate 비용이 곧바로 커진다.
- iOS Safari는 탭 메모리 한도를 넘으면 WebGL 컨텍스트를 잃는다. 이 현상은 three.js 포럼, Apple Developer Forums, WebKit Bugzilla에 반복해서 보고된다. 수업 중에 화면이 꺼지는 것이 이 프로젝트에서 가장 피해야 할 실패다.
- `postprocessing@6.39.5`의 peer가 `three >=0.168 <0.187`이어서 three 업그레이드 경로가 묶인다. 또 `@react-three/postprocessing@3.2.2`는 이 조사 하루 전(2026-10-21)에 나온 버전이고, 2026-10에만 패치가 세 번 나왔다.
- 직접 찾아본 범위에서 "postprocessing이 iOS에서 깨진다"는 보고는 **찾지 못했다**. 그래서 이 판단은 비용과 위험을 따진 추론이며 신뢰도는 MEDIUM이다.

**다시 검토할 조건:** 데스크톱이나 iPad 전용으로 "피날레 bloom"을 꼭 넣고 싶다는 요구가 생기면, 그때 capability를 확인해 켜고 끄는 방식으로 Phase 단위 spike를 따로 잡는다.

### 2. 애니메이션: 자체 `useFrame` 타임라인을 쓰고 tween 라이브러리는 쓰지 않는다 (HIGH)

**권장 패턴:**
- `src/game3d/anim/` 아래에 **three/React를 import하지 않는 순수 모듈**을 둔다.
  - `easing.ts`: easeOutBack, easeOutCubic, easeOutElastic, easeInOutSine. Phase 3의 easeOutBack을 재사용한다.
  - `timeline.ts`: `{ key, start, dur, ease }[]` 세그먼트 정의와 `sample(elapsed) → { [key]: 0..1 }`, `totalDuration`.
  - 성공 연출 타임라인 예시: 점프+회전 0–0.6s, 충격파 링 0.15–0.75s, 별 버스트 0.2–1.0s, 컨페티 0.1–1.8s, 큰 별 비행 1.0–1.8s, 점수판 +1, 배너.
- R3F 컴포넌트는 `elapsed += delta`를 누적한 뒤 `sample()` 결과로 ref의 transform을 **직접 바꾼다**. 프레임마다 setState를 호출하지 않는다. `elapsed >= total`이 되면 가드 플래그를 세우고 `onDone()`을 **정확히 한 번** 호출한다. 그러면 기존 `usePresentation.signalAnimDone()`이 불린다.
- `state.clock.elapsedTime`은 읽지 않는다. 테스트의 `advanceFrames`는 `delta`만 결정적으로 넘겨준다. 참고로 three r186에서 `THREE.Clock`이 deprecated되어 R3F 9.8.2가 콘솔 경고를 낸다. 동작에는 영향이 없다.
- 카메라 따라가기처럼 끝나는 시점이 정해지지 않은 부드러운 움직임에는 `THREE.MathUtils.damp`를 쓴다. 이런 움직임으로는 게이트를 걸지 않는다.
- `prefers-reduced-motion`이면 `elapsed = total`로 바로 건너뛴다. 기존 `prefersReducedMotion()`을 재사용한다.
- 워치독은 기존 `usePresentation.startWatchdog(totalMs)`를 그대로 쓴다. 타임라인의 `totalDuration`을 예산으로 넘긴다.

**라이브러리를 쓰지 않는 이유:**

| 후보 | 버전 | 탈락 사유 |
|------|------|-----------|
| `@react-spring/three` | 10.1.2 | 스프링 물리라서 끝나는 시간이 고정되지 않는다(config에 따라 달라짐). R3F 프레임 루프 밖에서 **자체 rAF 루프**로 돌기 때문에 `advanceFrames`로 구동할 수 없다. `frameloop="demand"`와도 따로 연결해야 한다. ANIM_DONE 게이트를 결정적으로 테스트하기가 어렵다. |
| `gsap` | 3.15.0 | 타임라인 표현력은 가장 좋다. 하지만 자체 ticker라는 두 번째 시계가 생기고, 테스트에서 프레임을 직접 몰 수 없으며, 연출 1개를 위해 수십 KB를 더하게 된다. 연출 타임라인은 세그먼트 10개 안팎이라 자체 모듈 30~50줄이면 충분하다. |
| `maath/easing` (직접 사용) | 0.10.8 | `damp` 계열은 목표값에 점근하는 방식이라 "끝"이 epsilon 판정에 달려 있다. 게이트용으로 맞지 않는다. damping이 필요하면 three 내장 `MathUtils.damp`로 대체한다. |

### 3. 3D ↔ DOM 경계 (연출 마지막 단계: 큰 별 → 점수판 +1 → 배너)

- 점수판과 배너는 **DOM**(Tailwind)에서 처리한다. 한글 텍스트, 큰 글자, 접근성이 모두 DOM 쪽이 유리하다.
- 3D의 큰 별이 점수판으로 날아가는 장면은 두 가지 방식이 있다. (a) 3D 별의 마지막 위치를 `vector.project(camera)`로 화면 좌표로 바꾼 뒤, 그 자리에 DOM 별을 띄워 점수판 쪽으로 이동시키는 방식. (b) 처음부터 DOM 별로 그리는 방식. **(a)를 권장한다.** 3D에서 출발해 DOM으로 도착하는 연속성이 핵심 연출이기 때문이다.
- DOM 쪽 이동은 **Web Animations API**(`element.animate().finished` Promise)로 처리하고 라이브러리는 쓰지 않는다. jsdom에는 `Element.prototype.animate`가 없으므로 테스트 setup에서 stub을 둔다.
- 3D 컨페티는 **raw `<instancedMesh>` + `setMatrixAt`**(프로토타입 방식)으로 그린다. drei `<Instances>`는 인스턴스마다 React 컴포넌트를 만들기 때문에 파티클 100~200개에는 맞지 않는다.

### 4. 캐릭터 지오메트리와 머티리얼 공유 (HIGH)

- `RoundedBoxGeometry`는 drei `<RoundedBox>`(ExtrudeGeometry 기반)가 아니라 **`three/addons/geometries/RoundedBoxGeometry.js`**(BoxGeometry 서브클래스)를 쓴다. 프로토타입과 같은 클래스라 모양이 그대로 유지되고 버텍스 수도 적다.
- 지오메트리, 툰 gradient 텍스처, 동물별 머티리얼은 **모듈 스코프 싱글턴이나 `useMemo`로 공유**한다. 플레이어가 최대 8명이고 1명당 15~20개 파트로 만들기 때문이다.
- 표정(기본 눈 ↔ 성공 시 ^^ 눈, 입 모양)은 파트 메시를 **모두 미리 마운트해 두고 `visible`만 토글**한다. R3F pitfalls 문서에 따르면 mount/unmount는 셰이더 컴파일과 버퍼 업로드를 일으킨다.

### 5. 텍스트

- drei `<Text>`(troika-three-text 0.52.x)는 쓰지 않는다. 기본 폰트가 Google Fonts CDN의 Roboto이고, 한글은 unicode-font-resolver가 **jsDelivr CDN에서 Noto 폰트를 내려받는다**(README 기준. 자체 호스팅하려면 약 300MB). 오프라인이거나 느린 네트워크에서는 글자가 비거나 늦게 뜬다.
- 칸 표시는 아이콘, 색, 3D 심볼(별·번개 모양 등 Extrude)로 처리한다. 3D 칸 위에 꼭 글자를 써야 하면, 2D canvas에 **시스템 폰트로 그린 `CanvasTexture`**를 쓴다. 기기에 있는 한글 폰트를 쓰므로 다운로드가 없다.
- 칸마다 drei `<Html>`을 붙이는 방식은 피한다. 칸이 20개 이상이면 DOM 노드마다 프레임마다 위치를 다시 계산해야 해서 iOS에서 무겁다. `<Html>`은 활성 플레이어 이름표 정도로만 쓴다.

### 6. Canvas 설정 (iOS Safari 우선)

- `dpr={[1, 2]}`: iPhone의 DPR 3은 2로 상한을 건다(v1 D-08을 이어받음).
- `frameloop="demand"` + 애니메이션이 도는 동안 `invalidate()` 호출, 또는 단순하게 `frameloop="always"`. 수업 한 세션은 짧기 때문에, 처음에는 `always`로 만들어 연출 구현을 단순하게 하고 배터리 문제가 보이면 `demand`로 바꾼다. 결정은 Phase 계획 단계에서 내린다.
- `onCreated`에서 `gl.domElement`에 `webglcontextlost` 리스너를 붙이고(`preventDefault`) DOM에 "화면 다시 불러오기" 버튼을 띄운다. 버튼을 누르면 `<Canvas key>`를 바꿔 다시 마운트한다. 게임 상태는 Zustand persist에 있으므로 다시 마운트해도 진행 상황이 사라지지 않는다.
- 3D 게임 화면은 `React.lazy`로 동적 import한다. 그러면 Vite가 three와 R3F 청크를 따로 나누고, 편집기 화면은 three 없이 빨리 뜬다. GitHub Pages `base` 설정은 그대로 둔다.

## 테스트 전략 (Vitest 3.2.4, 로컬에서 직접 검증함)

scratch 디렉터리에서 실제 레포 lockfile 위에 위 버전들을 설치하고 Vitest를 돌려 확인했다.

| 계층 | 환경 | 방법 | 검증 결과 |
|------|------|------|-----------|
| 순수 로직(타임라인 `sample`, easing, 순환판 좌표, 별 점수, 라운드 종료·동점) | jsdom 또는 node | 일반 Vitest | 해당 없음(표준) |
| 씬 구조와 연출 시퀀스(`useFrame`) | **`// @vitest-environment node`** (파일 단위) | `ReactThreeTestRenderer.create(<SceneContents …/>)` → `await r.advanceFrames(n, fixedDelta)` → `onDone` 호출 횟수와 최종 transform 단언 | ✅ `advanceFrames(5, 0.1)` 후 미완료, `+6` 프레임 후 `onDone` 정확히 1회. `MeshToonMaterial`(DataTexture gradientMap), `three/addons` `RoundedBoxGeometry`, drei `<Outlines>`가 WebGL 없이 렌더됨 |
| DOM HUD와 GameApp 통합 | jsdom (기본) | RTL. **`src/test/setup.ts`에 `ResizeObserver` stub 추가** | ✅ stub이 없으면 `<Canvas>`가 "This browser does not support ResizeObserver"를 throw한다. stub이 있으면 크기가 0이라 R3F 루트가 구성되지 않고 **Canvas 자식이 마운트되지 않은 채(inert) 에러 없이 렌더**된다. 따라서 DOM 테스트에서는 ANIM_DONE이 저절로 오지 않으므로 `usePresentation.getState().signalAnimDone()`을 직접 호출해 진행시킨다. |

**setup과 관례:**
- test-renderer를 쓰는 파일에는 `globalThis.IS_REACT_ACT_ENVIRONMENT = true`를 넣는다. 없으면 "not configured to support act(...)" 경고가 난다(확인함).
- 연출 컴포넌트는 v1 Phase 3 패턴을 따라 **WebGL 없이 렌더 가능한 `SceneContents`를 export**하고, `<Canvas>` 래퍼는 얇게 유지한다.
- WAAPI를 쓰는 DOM 연출에 대비해 setup에 `Element.prototype.animate` stub을 넣는다. stub은 `finished`가 곧바로 resolve되는 객체를 반환한다.
- 콘솔 소음: node 환경에서 `[THREE_CJS_DEPRECATED] require("three")`와 `THREE.Clock deprecated` 경고가 나온다. 둘 다 test-renderer와 fiber 내부에서 생기는 것이고 테스트 결과에는 영향이 없다. 필요하면 setup에서 필터링한다.
- `vitest-canvas-mock`(1.2.0)은 **필요 없다.** 2D canvas mock일 뿐 WebGL을 해결해 주지 않는다. `CanvasTexture`로 텍스트를 만드는 코드는 순수 함수로 분리해서 테스트한다.
- 실제 3D 렌더 품질, 연출의 느낌, iPhone 성능은 **사람이 직접 하는 UAT**로 확인한다(v1과 같음).

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| drei `<Outlines>` + `MeshToonMaterial` | `@react-three/postprocessing@3.2.2` (Outline/Bloom) | 데스크톱이나 iPad 전용 고사양 모드를 따로 둘 때. 이 경우 `three <0.187` peer 제약을 감수해야 한다. |
| 자체 `useFrame` 타임라인 | `gsap@3.15.0` 타임라인 | 연출이 수십 개로 늘어나고 디자이너가 직접 타이밍을 조정해야 할 때. 테스트는 시각 UAT 위주로 바뀐다. |
| 자체 `useFrame` 타임라인 | `@react-spring/three@10.1.2` | 끝나는 시간이 중요하지 않은 UI 반응(hover, 드래그). 이 앱의 게이트 연출에는 맞지 않는다. |
| `THREE.MathUtils.damp` | `maath` easing.damp3 | 벡터나 쿼터니언 damping이 많이 필요해질 때. 그때는 `maath`를 **직접 의존성으로 명시**해서 설치한다. |
| raw `<instancedMesh>` 컨페티 | drei `<Sparkles>` | 배경에 은은하게 깔리는 반짝임(셰이더 기반, 저비용) 정도로만 쓴다. 버스트처럼 궤적을 제어해야 하는 효과에는 쓰지 않는다. |
| 시스템 폰트 `CanvasTexture` | drei `<Text>` + 번들에 넣은 한글 서브셋 woff | 3D 글자가 연출의 핵심이 될 때. 서브셋 폰트 파일을 직접 만들고 `font` prop으로 로컬 경로를 지정해야 한다. |
| howler 2.2.4 | 자체 Web Audio 래퍼(~60줄) | 의존성을 하나라도 줄이고 싶을 때. 효과음 몇 개뿐이라면 이쪽도 충분하다. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@react-three/postprocessing` / `postprocessing` | iOS 메모리 압박, three 버전 상한, 툰 룩에 꼭 필요하지 않음 | drei `<Outlines>`, additive 머티리얼 |
| `@react-spring/three`, `gsap`, `framer-motion-3d` | 별도의 rAF 시계가 생겨 `advanceFrames` 결정성과 ANIM_DONE 게이트가 깨짐 | 순수 `timeline.ts` + `useFrame(delta)` |
| `@react-three/fiber@10` alpha / `@react-three/drei@11` alpha | 아직 alpha이고 API가 바뀌는 중 | fiber 9.8.2 / drei 10.7.9 |
| drei `<Text>` / `<Text3D>` (한글) | CDN 폰트에 의존하고, CJK 폰트는 용량이 큼 | DOM HUD, 시스템 폰트 `CanvasTexture` |
| drei `StatsGl` / `r3f-perf` | 별도의 nested `three@0.170` 사본을 끌어옴 | Safari Web Inspector, `gl.info` 오버레이 |
| `@react-three/rapier`, `cannon-es` | 주사위는 v1에서 결정한 대로 tween으로 처리함. 물리 엔진은 결과가 비결정적이고 WASM 번들이 붙음 | 미리 굴린 값으로 정해 둔 면에 snap하는 tween |
| 외부 `.glb` 캐릭터, Mixamo, gltfjsx | v2.0에서 코드 생성 캐릭터로 결정함(표정 변경 가능) | primitive 조합 + 표정 파트 `visible` 토글 |
| `three-stdlib`, `maath` 직접 import | drei 내부 의존성을 버전 고정 없이 쓰는 셈 | `three/addons/*`, `THREE.MathUtils` |
| drei `<Instances>` (파티클 용도) | 인스턴스마다 React 컴포넌트가 생겨 오버헤드가 큼 | raw `<instancedMesh>` + `setMatrixAt` |
| `vitest-canvas-mock`, jsdom에서 `<Canvas>` 전체 마운트 시도 | WebGL 문제를 해결해 주지 않음 | node 환경 test-renderer, jsdom에는 RO stub만 |

## Stack Patterns by Variant

**강사 기기가 구형 iPhone이거나 프레임이 떨어질 때:**
- `dpr={[1, 1.5]}`로 낮추고, 외곽선을 몸통 파트로만 줄이고, 컨페티를 100개 이하로 줄인다.
- GPU 비용은 대부분 픽셀 수(DPR)와 draw call 수에서 나오기 때문이다.

**사운드를 넣기로 하면:**
- `howler@2.2.4`를 쓰고, 게임 시작 버튼 핸들러에서 `if ('audioSession' in navigator) navigator.audioSession.type = 'playback'`을 실행한다. 앱 안에 음소거 토글도 둔다.
- iOS는 Web Audio를 기본으로 "ambient"로 취급하므로 무음 스위치를 켜면 소리가 나지 않는다. 강사가 무음 모드로 수업하면 효과음이 모두 사라진다. 효과음 소스는 CC0(Kenney 오디오 팩 등)만 쓴다(IP 제약).

**배터리 문제가 보고되면:**
- `frameloop="demand"`로 바꾸고, 애니메이션이 활성일 때만 `invalidate()`를 프레임마다 호출한다(v1 Pitfall 4).

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@react-three/fiber@9.8.2` | `react@19.2.8`, `react-dom@19.2.8` | peer `>=19 <19.4`. React를 19.4로 올리면 fiber도 함께 올려야 한다. |
| `@react-three/fiber@9.8.2` | `three@0.186.1` | peer `three >=0.156`. three r186이 `Clock`을 deprecated로 바꿔 콘솔 경고가 나오지만 동작에는 문제없다. |
| `@react-three/drei@10.7.9` | `fiber ^9.0.0`, `three >=0.159`, `react ^19` | ✅ 로컬 설치로 확인했다. |
| `@react-three/test-renderer@9.1.1` | `fiber >=9.0.0`, `react ^19.0.0`, `three >=0.156` | ✅ Vitest 3.2.4 node 환경에서 동작을 확인했다. |
| `three@0.186.1` | `@types/three@0.186.0` | minor 버전을 맞춘다. exact pin으로 lockstep을 유지한다. |
| (참고) `postprocessing@6.39.5` | `three >=0.168 <0.187` | 쓰지 않는 이유 중 하나다. |
| `vitest@3.2.4` | test-renderer 9.1.1 | 파일 단위 `@vitest-environment node` 주석과 `IS_REACT_ACT_ENVIRONMENT`만 있으면 된다. |

## Integration Points (기존 코드와 맞물리는 곳)

- **`src/game/usePresentation.ts`(ANIM_DONE 게이트):** 그대로 재사용한다. 3D 연출 컴포넌트가 타임라인 종료 시 `signalAnimDone()`을 호출하고, 시작할 때 `beginAnim()`과 `startWatchdog(totalMs)`를 호출한다.
- **`src/game/animation.ts`:** `prefersReducedMotion`, `buildMovePath`를 재사용한다. 순환판에서는 경로 계산을 `(pos + i) % loopLength` 방식으로 바꿔야 한다(엔진 재설계 범위).
- **`src/harness/useGameStore.ts`:** 3D 씬은 이 스토어를 셀렉터로 구독한다. `useFrame` 안에서는 `useGameStore.getState()`로 읽어서 리렌더를 피한다.
- **`src/test/setup.ts`:** `ResizeObserver` stub과 `Element.prototype.animate` stub을 추가한다.
- **`vite.config.ts`:** 바꿀 것이 없다. `@vitejs/plugin-react`, Tailwind, `base`를 유지한다. 3D 화면은 `React.lazy`로 분리한다.

## Sources

- **npm registry** (`npm view`, 2026-10-22 조회) — `three@0.186.1`(2026-09-24), `@types/three@0.186.0`, `@react-three/fiber@9.8.2`(2026-10-14, peer react `>=19 <19.4`), `@react-three/drei@10.7.9`(2026-09-25, peer fiber `^9`), `@react-three/test-renderer@9.1.1`, `@react-three/postprocessing@3.2.2`(2026-10-21, peer fiber `>=9.7.0`), `postprocessing@6.39.5`(peer three `<0.187`), `@react-spring/three@10.1.2`, `maath@0.10.8`, `gsap@3.15.0`, `howler@2.2.4`(2023-09), `@types/howler@2.2.13`, dist-tags(fiber 10 alpha, drei 11 alpha) — **HIGH**
- **로컬 설치 + Vitest 실행** (레포의 lockfile 사용) — peer 충돌 없음, `advanceFrames` 결정성, jsdom `<Canvas>` + ResizeObserver 동작, `act` 환경 플래그, nested `three@0.170`(stats-gl) 확인 — **HIGH**
- **패키지 tarball 검사** — drei `core/Outlines.d.ts`, `RoundedBox.d.ts`; three `examples/jsm/geometries/RoundedBoxGeometry.js`, `exports["./addons/*"]`, `MathUtils.damp`; fiber 내부 `new THREE.Clock()`; troika-three-text README(기본 Roboto는 Google Fonts CDN, fallback은 jsDelivr, 자체 호스팅 시 약 300MB) — **HIGH**
- [R3F Pitfalls 문서](https://r3f.docs.pmnd.rs/advanced/pitfalls) — useFrame에서 setState 금지, delta 기반 애니메이션, 재사용, mount 대신 visible 토글, react-spring이 자체 루프로 돈다는 점 — **HIGH**
- [test-renderer API (rttr.md)](https://github.com/pmndrs/react-three-fiber/blob/master/packages/test-renderer/markdown/rttr.md) — `advanceFrames(frames, delta)`, `fireEvent`, `update` — **HIGH**
- iOS WebGL 컨텍스트 손실: [three.js forum: iOS 17 Context Lost](https://discourse.threejs.org/t/three-js-broken-on-ios-17-with-context-lost/58025), [Apple Developer Forums: Browser memory limit on iOS](https://developer.apple.com/forums/thread/741624), [three.js forum: iOS 18.2 WebGL Error](https://discourse.threejs.org/t/ios-18-2-causing-webgl-error/75143.md), [WebKit Bug 289601](https://bugs.webkit.org/show_bug.cgi?id=289601) — **MEDIUM** (postprocessing과의 직접적인 연관은 추론)
- [pmndrs/react-postprocessing README](https://github.com/pmndrs/react-postprocessing), [postprocessing README](https://cdn.jsdelivr.net/npm/postprocessing@6.39.4/README.md) — 기본 MSAA, 렌더러 설정 권고 — **MEDIUM**
- iOS 오디오: [WebKit Bug 251532 (audioSession)](https://bugs.webkit.org/show_bug.cgi?id=251532), [WebKit Bug 264473](https://bugs.webkit.org/show_bug.cgi?id=264473), [adactio: Web Audio API update on iOS](https://adactio.com/journal/19929) — **MEDIUM** (iOS 버전마다 동작이 다를 수 있으므로 실기기 검증 필요)
- v1 자료: `.planning/milestones/v1.0-research/STACK.md`, `.planning/milestones/v1.0-phases/03-board-game-ui/03-RESEARCH.md`(Pitfall 1–6, test-renderer 패턴), git `be1e459`(scene.test.tsx) — 재사용

---
*Stack research for: v2.0 3D 블루마블 재구축 (R3F 3D 순환판 + 코드 생성 치비 캐릭터 + 성공 연출)*
*Researched: 2026-10-22*
