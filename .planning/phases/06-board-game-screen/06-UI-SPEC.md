---
phase: 6
slug: board-game-screen
status: draft
shadcn_initialized: false
preset: none
created: 2026-10-23
---

# Phase 6 — UI Design Contract

> 3D 사각 순환판과 게임 화면(DOM HUD)의 화면·상호작용 계약이다. gsd-ui-researcher가 만들고 gsd-ui-checker가 검증한다.
> **자동 모드:** 사용자 지시("ㄱㄱ 다음으로 해", "싹다 추천으로")에 따라 질문 없이 진행했다. CONTEXT.md(D-01~D-29)·RESEARCH.md·Phase 5 승인 계약·기존 토큰이 답하지 않은 항목은 추천안을 골라 **[자동 선택]**으로 표시했다. RESEARCH Open Questions 2~4는 권장안 그대로 채택했다(마지막 라운드 배너 = 버튼을 숨기는 1.5초 비트 / R ≤ 10이면 점, 넘으면 숫자 / 성공 시 600ms 별 비트).
> **목표 느낌:** 기능 시안이 아니라 **눈에 띄게 귀여운 3D 장난감 보드게임**이다. 둥글고 광택 있는 캔디 플라스틱 블록, 판 받침이 있는 보드게임 상자 느낌, 눈이 달린 통통 튀는 말을 쓴다. 판은 3초 안에 읽혀야 한다(출발 랜드마크 · 진행 방향 · 칸 종류 · 별 1등 · 지금 차례).

---

## Scope & Surfaces

| # | 화면/부품 | 출처 | 수명 | 디자인 투자 |
|---|-----------|------|------|-------------|
| S1 | **게임 무대 레이아웃** `GameStage`(`PlayView` 대체): 세로/가로 grid, 캔버스 셀, safe-area | D-22, BOARD-01, Pattern 5 | 유지 | 높음 |
| S2 | **3D 씬**: 판 받침, 칸 3종, 출발 게이트, 방향 셰브런, 칸 위 별, 이벤트 아이콘, 임시 말, 주사위, 목적지 미리보기, 조명 | D-07~D-20, BOARD-01~03 | 유지(말만 Phase 7이 교체) | **최고** |
| S3 | **차례 바** `TurnHud` v2: 지금 차례(색 점+이모지+이름), 팀원, 다음 차례, 라운드 점, 지금 끝내기 | D-22, HUD-02, ROUND-02 | 유지 | 높음 |
| S4 | **별 점수판** `Scoreboard` v2: 별 순, 동점 같은 등수, 말과 같은 색 원+이모지, 1등 왕관 | D-22, HUD-01 | 유지(Phase 7이 아이콘만 교체) | 높음 |
| S5 | **조작 영역** `ControlsBar` v2: 큰 🎲 / 다음 / 되돌리기, 판정 결과 줄 | D-21, D-25, HUD-03/04 | 유지 | 중간 |
| S6 | **캔버스 위 DOM 오버레이**: 상태 칩 줄, 비트 배너(출발 보너스·이벤트·성공·마지막 라운드), 퀘스트 카드(재스킨) | D-23, D-24 | 유지(Phase 8이 성공 연출 교체) | 높음 |
| S7 | **판 준비 중 / 화면 꺼짐 복구 오버레이** `ContextLostOverlay` | D-27, STAB-02/04 | 유지 | 중간 |

**범위 밖:** 치비 동물 모양·표정·같은 칸 8말 완전 구분(Phase 7), 컨페티·별 비행·시상식·효과음·연출 탭 건너뛰기(Phase 8), 시작·결과 화면·설정 탭(Phase 5 계약 그대로 둔다). `RingStrip`은 플레이 화면에서 제거한다(D-26).

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — **[자동 선택]** shadcn 게이트 "N". `components.json` 없음. v1부터 자체 CSS 토큰 시스템(`src/styles/index.css` + `src/game/styles/game.css`)을 쓰며 Phase 3·5 UI-SPEC도 Tool: none |
| Preset | not applicable |
| Component library | DOM: 자체 컴포넌트 재사용(`ConfirmDialog`, `Toast`, HUD 부품). 3D: three 0.186.1 + @react-three/fiber 9.8.2 + @react-three/drei 10.7.9(exact pin, D-05). drei는 `ContactShadows`만 사용 |
| Icon library | DOM: 시스템 이모지만(🎲 ⭐ 🏁 ➡️ ⬅️ 🔁 🔄 🔔 🎉 👑 ↩️ + 동물 🐻🐰🐱🐶🐼🦊🐷🐥). 3D: 코드로 만든 도형만(Shape+ExtrudeGeometry, Torus, Cone, RoundedBox). 이미지·.glb·텍스처 파일 없음 |
| Font | `var(--font)` 시스템 글꼴만. **3D 안에는 글자가 하나도 없다**(drei `Text`/`Text3D`/troika/`Html` 금지, 칸 번호 없음 — D-02, STAB-04) |
| Palette 규칙 | Phase 3·5 결정 유지: DOM CSS는 토큰 변수와 `color-mix`만 쓴다. 3D는 CSS 변수를 읽을 수 없으므로 **`src/game/palette.ts` 한 곳**에 hex 상수를 두고 DOM 색 점·3D 재질이 같이 쓴다. palette의 hex는 아래 표의 값만 쓰며, 토큰과 겹치는 값은 토큰 hex와 같아야 한다(일치 단언 테스트 1개) |

---

## Spacing Scale

v1 base-4 스케일을 그대로 상속한다.

| Token | Value | Usage (Phase 6) |
|-------|-------|-----------------|
| xs | 4px | 라운드 점 사이 간격, 점수판 셀 안 아바타↔글자 간격, 등수 배지 겹침 |
| sm | 8px | 상태 칩 사이, 점수판 셀 사이, 차례 바 행 사이, 캔버스 셀 안쪽 오버레이 여백 |
| md | 12px | 차례 바 안쪽 세로 패딩(상속), 칩 좌우 패딩 |
| base | 16px | 무대 grid 영역 사이 간격(태블릿·노트북), 배너 내부 줄 간격 |
| lg | 20px | 무대 좌우 거터(태블릿, 상속) |
| xl | 24px | 배너 세로 패딩, 조작 버튼 사이(태블릿) |
| 2xl | 32px | 배너 좌우 패딩, 퀘스트 카드 패딩(상속) |
| 3xl | 48px | 화면 꺼짐 오버레이 카드 세로 패딩 |

**터치 타깃 (상속 + Phase 6 지정):**

| 요소 | 태블릿·노트북 | 폰(≤560px) | 짧은 화면(max-height 760px) | 근거 |
|------|---------------|-------------|------------------------------|------|
| 🎲 주사위 / 다음 / ✅ / ❌ / 🔄 화면 다시 그리기 | 72px(`--tap`) | **64px** | 56px | HUD-04. Phase 4.1 폰 블록의 52/48px 축소를 **이 버튼들에는 덮어쓴다**(엄지·아동) |
| 보조 버튼(↩️ 판정 되돌리기, 지금 끝내기) | 56px(`--tap-sm`) | 44px(기존 폰 예외 유지) | 40px(기존) | 상속 |

**Phase 6이 새로 정하는 DOM 크기 (모두 4의 배수):**

| 요소 | 값 |
|------|----|
| 참가자 색 점(차례 바·다음 차례) | 12px 원, 테두리 2px `--ink` |
| 점수판 아바타 원(참가자 색 바탕 + 동물 이모지) | 40px(태블릿 가로 패널) / 32px(세로·폰) |
| 점수판 등수 배지 | 24px 원, 아바타 왼쪽 위에 4px 겹침 |
| 점수판 셀 높이 | 48px(세로·폰) / 56px(가로 패널, 폰 가로는 44px) |
| 라운드 점 | 지름 8px, 지금 라운드 점 12px, 간격 4px |
| 가로 레이아웃 오른쪽 패널 폭 | 240px(태블릿·노트북) / 200px(폰 가로, max-height 500px) |
| 배너 최대 폭 | 480px(캔버스 셀 폭의 90%를 넘지 않음) |
| 퀘스트 카드 최대 폭 | 560px(상속), 세로 화면에서는 캔버스 셀 높이의 72% 이하 |

**Exceptions:** (0) `md 12px`·`lg 20px`는 이어받은 토큰이다. (1) 반지름(`--radius 22px`, `--radius-sm 16px`, 카드 26px, 알약 999px)은 상속 예외다. (2) Phase 4.1의 `.app--playing` iPhone 블록 비-4 값(14px 패딩, 13px "끝내기" 등)은 기존 승인 예외로 둔다. 단 위 표의 주요 버튼 높이는 Phase 6 규칙이 우선한다. (3) 3D 치수는 px가 아니라 월드 단위(t = 칸 한 변 1.0)이며 아래 S2 표에서 정한다.

---

## Typography

게임 스케일(Phase 5 상속)만 쓴다. 크기 4개, 폰(≤560px)에서는 토큰이 30/22/17/14로 자동 축소된다. **굵기 2개: 800 / 900.**

| Role | Size | Weight | Line Height | Phase 6 적용 |
|------|------|--------|-------------|--------------|
| Display | 40px | 900 | 1.1 | 차례 바 이름(태블릿), 🎲 버튼의 주사위 이모지, 배너 큰 줄("마지막 라운드!", "⭐+2", "앞으로 3칸!"), 화면 꺼짐 오버레이 🔄 아이콘 |
| Heading | 26px | 900 | 1.2 | 상태 칩 `🎲 4`, 판정 결과 줄, 퀘스트 미션 이름(상속), 배너 위 줄(이벤트 이름·"출발 보너스"), 오버레이 제목 |
| Body | 20px | 900(주요 버튼, 별 수, 라운드 `r/R`) / 800(그 외) | 1.35 | 버튼 글자, 점수판 `⭐n`, 다음 차례 이름, 팀원 줄, 상태 칩(이벤트·보너스), 배너 아래 줄, 오버레이 본문 |
| Caption | 15px | 800 (등수 배지 숫자만 900) | 1.4 | "차례" 접미사, "다음" 라벨, "라운드" 라벨, 점수판 이름, 등수 배지, "판을 준비하고 있어요…" |

- 폰 차례 바 이름은 기존 Phase 4.1 규칙(20px, ellipsis)을 유지한다.
- 숫자(별·라운드·주사위 눈·등수)는 `font-variant-numeric: tabular-nums`를 쓴다.
- 사용자 입력 문자열(참가자·팀원·이벤트 이름)은 한 줄로 두고 `text-overflow: ellipsis`로 자른다. 배너의 이벤트 이름만 두 줄까지 허용한다.

---

## Color

### DOM (Phase 1/4 토큰 그대로)

| Role | Token | Value (light) | Usage |
|------|-------|---------------|-------|
| Dominant (60%) | `--bg` / `.game-stage` 그라디언트 | `#E7F5FF` → sun 섞은 크림 | 게임 무대 배경. **캔버스는 투명(alpha)**이라 이 배경이 3D 뒤에 그대로 보이고, 다크 테마도 자동으로 따라간다 |
| Secondary (30%) | `--panel` / `--panel-2` | `#FFFFFF` / `#EFF8FF` | 차례 바, 점수판 셀·패널, 조작 영역, 상태 칩, 배너, 퀘스트 카드, 오버레이 카드 |
| Accent (10%) | `--sky` / `--sky-deep` | `#22B0F2` / `#1183D6` | 아래 예약 목록만 |
| Destructive | `--coral` | `#FF5C7A` | ❌ 실패 버튼만(+ 의미 색으로서의 어려움·뒤로). 그 외 사용 금지 |

**Accent(`--sky`) 예약 목록 — 이 요소들에만 쓴다:**
1. 주요 진행 버튼 `🎲 주사위 굴리기`, 복구 버튼 `🔄 화면 다시 그리기`(`.game-btn` sky 그라디언트)
2. **지금 차례 강조**: 차례 알약 테두리 3px, 점수판에서 지금 차례 셀 테두리 3px, 3D 지금 차례 말 발밑 링
3. **지금 차례 말의 목적지 미리보기**: 3D 목적지 링, 목적지 위 표시 콘, 경로 점의 발광색
4. 포커스 링 `outline: 3px solid var(--sky)`

다음 요소는 **sky를 쓰지 않는다**: 다음 ➡️(neutral), ✅(grass), ❌(coral), 되돌리기·지금 끝내기(보조 panel), 방향 셰브런(흰색), 판 받침(파스텔 하늘색 `#BEE7FF`, accent가 아닌 바탕 틴트).

**의미 색 (10% 예산 밖, 항상 이모지·모양·글자와 함께 쓴다):**

| Token | Value | Phase 6 의미 |
|-------|-------|--------------|
| `--easy` / `--grass` | `#25D6A0` | 쉬움 퀘스트 칸, ✅, 앞으로 이벤트 아이콘·칩·배너, 성공 배너 |
| `--normal` | `#FFB020` | 보통 퀘스트 칸 |
| `--hard` / `--coral` | `#FF5C7A` | 어려움 퀘스트 칸, 뒤로 이벤트 아이콘(경고색)·칩·배너, 출발 게이트 아치 |
| `--grape` | `#9A7DFF` | 이벤트 발판, 한 번 더 아이콘·칩·배너, "🔁 한 번 더" 배지 |
| `--sun` / `--sun-deep` | `#FFCB2E` / `#FF9F1C` | 출발 칸, 칸 위 3D 별, 출발 보너스 칩·배너, 별 1등 왕관·등수 배지, **마지막 라운드 강조**(배너 + 이후 라운드 표시 테두리 `--sun-deep`) |
| `--ink` / `--ink-soft` | `#173A57` / `#6488A5` | 글자, 주사위 눈, 말 윤곽선, 색 점 테두리 / 라벨·다음 차례·실패 결과 줄 |

### 참가자 색 (HUD-01 "말과 같은 색") — `palette.ts` `ANIMAL_COLOR` **[자동 선택]**

동물 id 기준이다. 엔진이 게임 안에서 동물을 겹치지 않게 배정하므로 색도 겹치지 않는다. Phase 7 캐릭터도 같은 키를 쓴다. 동물 이미지와 어울리도록 정했고, 8개 중 7개는 기존 토큰 hex를 재사용한다.

| 동물 | hex | 출처 | 말 눈 색 |
|------|-----|------|----------|
| bear 🐻 | `#9C6644` | **신규(유일한 새 색)** — 갈색 계열이 토큰에 없음 | `#173A57` |
| rabbit 🐰 | `#FFFFFF` | panel(light) | `#173A57` |
| cat 🐱 | `#9A7DFF` | grape | `#173A57` |
| dog 🐶 | `#1183D6` | sky-deep | `#FFFFFF` |
| panda 🐼 | `#173A57` | ink(light) | `#FFFFFF` |
| fox 🦊 | `#FF9F1C` | sun-deep | `#173A57` |
| pig 🐷 | `#FF80B5` | pink | `#173A57` |
| chick 🐥 | `#FFCB2E` | sun | `#173A57` |

- 칸 색과 말 색이 같아도 구분되도록 **모든 말에 흰 받침 원판과 `#173A57` 윤곽선(inverted hull)**을 둔다(RESEARCH Pitfall 5).
- DOM 색 점과 아바타 원은 같은 hex를 인라인 CSS 변수(`style={{'--pc': hex}}`)로 받고 테두리 2px `var(--ink)`를 둔다. 흰 토끼도 패널 위에서 보인다.

### 3D 씬 색 (`palette.ts`) — `<Canvas flat>`(NoToneMapping)으로 토큰 hex가 탁해지지 않게 한다

| 대상 | 색 | 재질 |
|------|----|------|
| 판 받침 아래 층(옆면 띠) | `#BEE7FF`(v1 TILE_HUES 파스텔 하늘) | Standard, roughness 0.5 |
| 판 받침 위 층(트랙 바닥) | `#FFFDF4`(candy-cream) | Standard, roughness 0.6 |
| 판 안쪽 마당(주사위 구역) | `#DDFCED`(candy-mint) | Standard, roughness 0.7 |
| 퀘스트 칸 쉬움/보통/어려움 | `#25D6A0` / `#FFB020` / `#FF5C7A` | Standard, roughness 0.35, metalness 0 |
| 이벤트 발판(육각) | `#9A7DFF` | Standard, roughness 0.35 |
| 이벤트 발판 윗면 원판 | `#FFFDF4` | Standard, roughness 0.5 |
| 이벤트 아이콘 앞으로/뒤로/한 번 더 | `#25D6A0` / `#FF5C7A` / `#9A7DFF` | Standard, roughness 0.3 |
| 출발 칸 | `#FFCB2E` + emissive `#FF9F1C` 0.15 | Standard, roughness 0.3 |
| 출발 게이트 기둥 / 아치 / 깃발 / 꼭대기 별 | `#FFFFFF` / `#FF5C7A` / `#22B0F2` / `#FFCB2E`(emissive `#FF9F1C` 0.3) | Standard, roughness 0.3 |
| 칸 위 별 | `#FFCB2E` + emissive `#FF9F1C` 0.25 | Standard, roughness 0.3 |
| 방향 셰브런 / 꺾임 화살표 | `#FFFFFF` + 윤곽 `#173A57` | Standard, roughness 0.4 |
| 말 몸통·머리 | `ANIMAL_COLOR[animal]` | Standard, roughness 0.25, metalness 0.05 |
| 말 받침 원판 / 볼 터치 | `#FFFFFF` / `#FF80B5` 투명도 0.7 | Standard |
| 말 윤곽선 | `#173A57`, `side: BackSide` | Basic |
| 1등 왕관 | `#FFCB2E` + emissive `#FF9F1C` 0.3 | Standard, roughness 0.3 |
| 지금 차례 링 | `#22B0F2` + emissive `#22B0F2` 0.6 | Standard |
| 목적지 링·표시 콘 / 경로 점 | `#22B0F2` emissive 0.5 / `#FFFFFF` emissive `#22B0F2` 0.4 | Standard |
| 주사위 몸통 / 눈 | `#FFFDF4` / `#173A57` | Standard, roughness 0.28, metalness 0.1 |
| 바닥 그림자 | `#123A58` | ContactShadows / blob |

**조명 (밝은 장난감 캔디, 섀도맵·후처리·HDRI 없음 — D-03/D-04):**

| 라이트 | 값 |
|--------|-----|
| hemisphereLight | sky `#FFFFFF`, ground `#CFE4F5`, intensity 1.4 |
| directionalLight(키) | `#FFF6E0`, intensity 1.6, position (5, 10, 7), `castShadow` 없음 |
| directionalLight(림) | `#8FD0FF`, intensity 0.5, position (−6, 6, −6) |
| 그림자 | drei `ContactShadows frames={1}`(정적, 판 받침 바로 아래, opacity 0.35, blur 2.5, 색 `#123A58`, scale = 판 받침 폭 × 1.3) + 말·주사위 발밑 blob 원(반지름 0.28t, `#123A58`, opacity 0.22) |

**합격 기준:** 노트북 Chrome 라이트 테마에서 퀘스트 칸 윗면의 색이 점수판 색 점·편집기 난이도 배지와 "같은 색"으로 보여야 한다. 라이트 세기는 출발값이며, UAT에서 윗면이 하얗게 날아가거나 탁해지면 hemisphere를 1.1~1.6 사이에서만 조정한다.

**다크 테마:** DOM은 토큰이 자동으로 처리한다. 3D 판·말·주사위는 장난감 플라스틱이므로 같은 hex를 유지한다. 캔버스가 투명하므로 뒤 배경만 어두워진다.

---

## Screen Contracts

### S1 — 게임 무대 레이아웃 (`GameStage`, D-22, BOARD-01)

**초점(focal point):** 가운데 **3D 판**과 그 위의 **지금 차례 말**(통통 튀는 말 + 하늘색 링)이 첫 시선이다. 두 번째 시선은 아래 엄지 영역의 큰 🎲 버튼이다.

**공통:** `.app--playing .game-stage`(100dvh, overflow hidden, safe-area) 재사용. 무대는 CSS grid이고 캔버스 셀은 `position:relative; min-width:0; min-height:0`이다. 캔버스 래퍼는 `pointer-events:none; touch-action:manipulation`이다(3D 상호작용 없음, D-21). 캔버스 위 오버레이는 셀 안 `position:absolute`로 둔다. 무대 전체에 세로 스크롤이 없다.

**세로 (기본, `aspect-ratio < 5/4`) [자동 선택 — 거의 정사각인 창은 세로 배치]:**
```
┌───────────────────────────┐  grid-template-rows: auto 1fr auto
│ S3 차례 바                │  gap 8px(폰) / 16px(태블릿)
├───────────────────────────┤
│ [상태 칩 줄]              │  ← 캔버스 셀(1fr)
│        3D 판              │     오버레이: 칩(왼쪽 위), 배너(가운데),
│   (배너 / 퀘스트 카드)    │     퀘스트 카드(아래쪽 붙임), 복구 오버레이(전체)
├───────────────────────────┤
│ S5 조작 영역(🎲 / 다음)   │
│ S4 점수판(4열 × 최대 2행) │
└───────────────────────────┘
```
- 390×844 기준 캔버스 셀은 약 370×500(비율 ≈ 0.74)이다. `fitCamera`에는 이 셀 비율을 넣고 insets는 0을 넣는다.
- 아래 영역 순서는 **조작 버튼이 위, 점수판이 아래**다 **[자동 선택]**. 버튼이 판 바로 아래 엄지 위치에 오고, 점수판은 화면 맨 아래에서 늘 같은 자리를 지킨다.

**가로 (`orientation: landscape` 이고 `min-aspect-ratio: 5/4`):**
```
┌─────────────────────────┬──────────┐  grid-template-columns: 1fr 240px(폰 가로 200px)
│ S3 차례 바              │ S4 점수판 │  grid-template-rows: auto 1fr
├─────────────────────────┤ (세로 목록)│
│ [칩]                    │          │
│        3D 판            │──────────│
│   (배너 / 퀘스트 카드)  │ S5 조작   │  ← 오른쪽 패널 아래(오른손 엄지)
└─────────────────────────┴──────────┘
```
- **[자동 선택]** 가로에서는 조작 버튼도 오른쪽 패널 아래에 둔다. 폰 가로(높이 390px)에서 캔버스 높이를 최대한 확보하기 위해서다. 버튼은 패널 폭 전체를 쓴다.
- 오른쪽 패널은 `display:flex; flex-direction:column; gap:8px`이다. 점수판은 `flex:1; overflow-y:auto`(세로 스크롤만, 가로 스크롤 금지)이고 조작 영역은 아래에 붙는다.

**리사이즈·회전:** 캔버스 셀 크기가 바뀌면 `fitCamera`를 다시 계산한다. 판 전체가 셀 안에 들어오는 것이 합격 조건이다(390×844, 844×390, 768×1024, 1024×768, 1440×900, 360×640, 320×480).

### S2 — 3D 씬 (D-07~D-20, BOARD-01~03)

**배치 원칙:** 칸 한 변 t = 1.0, 칸 간격 pitch = 1.14(간격 0.14t, D-11 12~15%). 출발 칸 = index 0 = 화면 아래-오른쪽, 시계 방향(아래 변 왼쪽으로 → 왼쪽 변 위로 → 위 변 오른쪽으로 → 오른쪽 변 아래로, D-08). 카메라는 +Z 쪽 정면 고정 쿼터뷰이고, 세로 60° ~ 가로 50° 내려다보며 fov 35°다(D-09, `fitCamera`). 회전·줌·추적은 없다(D-10). **움직이는 것은 지금 차례 말(대기 바운스)과 연출 비트뿐이다.** 다른 모든 것은 정지해 있어서 시선이 지금 차례로 모인다.

**치수 표 (월드 단위):**

| 요소 | 형태 | 치수 | 위치 |
|------|------|------|------|
| 판 받침 아래 층 | RoundedBox, 반지름 0.3 | 반폭 B = `half + 0.95`, 높이 0.22 | y = −0.22 ~ 0 |
| 판 받침 위 층(트랙) | RoundedBox, 반지름 0.25 | 반폭 B − 0.12, 높이 0.08 | y = 0 ~ 0.08 |
| 안쪽 마당 | RoundedBox, 반지름 0.3 | 반폭 `half − 0.75`, 높이 0.02 | 위 층 위, 가운데 |
| 퀘스트 칸 | RoundedBox(`three/addons`), 반지름 0.14, 분할 4 | 1.0 × 0.32 × 1.0 | 트랙 위(y 0.08~0.40) |
| 이벤트 발판 | 육각 기둥(Cylinder 6분할), 꼭짓점이 진행 방향 | 외접 반지름 0.56, 높이 0.32 | 트랙 위 |
| 이벤트 윗면 원판 | Cylinder 32분할 | 반지름 0.40, 높이 0.02 | 발판 윗면 |
| 출발 칸 | RoundedBox, 반지름 0.18 | **1.4 × 0.5 × 1.4**(D-12) | 중심을 바깥 대각선(+x, +z)으로 0.2 이동(Pitfall 7, 최소 간격 ≥ 0.1t 단언) |
| 출발 게이트 | 기둥 2개 + 반원 아치 + 깃발 2개 + 꼭대기 별 | 기둥 Cylinder r 0.09 h 0.7, 아치 Torus(반지름 0.55, 굵기 0.09, 호 π), 깃발 0.22×0.14 삼각 Extrude, 별 외반지름 0.2 | 출발 칸 위. 게이트 면은 판 대각선(1,0,1) 방향을 바라보게 45° 돌려 카메라에서 아치가 보인다. 판 바깥 모서리 쪽에 세워 다른 칸을 가리지 않는다 |
| 칸 위 별 | 5각 별 Shape Extrude(깊이 0.05, bevel 0.02) | 외반지름 0.16, 내반지름 0.07 | 퀘스트 칸 윗면 위 0.55 높이. 개수 = 별 수(1/2/3), 진행 방향과 수직인 줄로 간격 0.30. 카메라를 향해 세우고 뒤로 20° 기울인다. **정지** |
| 방향 셰브런 | "›" Shape Extrude(팔 길이 0.22, 두께 0.07, 깊이 0.04) + 윤곽(1.12배) | — | **칸과 다음 칸 사이 간격의 가운데**, 칸 윗면 높이 + 0.02, heading 방향. n개 InstancedMesh. 출발 칸에서 나가는 셰브런만 2개 겹친 "»"로 크기 1.3배 |
| 모서리 꺾임 화살표(D-13) | 1/4 Torus(반지름 0.32, 굵기 0.06) + Cone 머리(r 0.1, h 0.16) + 윤곽 | — | 네 모서리 칸마다 **판 안쪽 대각선**(마당 쪽 0.85t)의 바닥 위에 평평하게 놓고, 들어오는 방향에서 나가는 방향으로 꺾는다. 칸 내용과 겹치지 않는다 |
| 이벤트 아이콘 앞으로/뒤로 | 화살표 Shape Extrude(길이 0.56, 머리 폭 0.44, 깊이 0.12, bevel 0.03) | — | 윗면 원판 위에 눕힌다. 앞으로 = heading 방향, 뒤로 = heading 반대(D-15) |
| 이벤트 아이콘 한 번 더 | Torus 호 300°(반지름 0.2, 굵기 0.06) + Cone 머리 | — | 윗면 원판 위에 눕힌다 |
| 임시 말 | 받침 원판 + 캡슐 몸통 + 구 머리 + 눈 2 + 볼 2 + 윤곽 | 받침 Cylinder r 0.24 h 0.06 / 몸통 Capsule r 0.17 길이 0.2 / 머리 Sphere r 0.16(중심 y 0.62) / 눈 Sphere r 0.028(간격 0.12) / 볼 Circle r 0.03 / 윤곽 1.06배 BackSide. 전체 높이 ≈ 0.8 | 칸 윗면 중앙. 얼굴은 항상 카메라(+Z)를 본다 **[자동 선택 — 아이가 얼굴을 보게]** |
| 같은 칸 여러 말(D-17) | — | 1개: 중앙 / 2~4개: 2×2 칸 ±0.2 / 5~8개: 반지름 0.3 원 배치, 0.8배 축소 | 참가자 순서대로 슬롯 고정(Phase 7이 개선) |
| 1등 왕관 | 열린 Cylinder 띠(r 0.12, h 0.08) + 작은 Cone 5개(r 0.035, h 0.08) | — | 별 1등(동점 포함) 말 머리 위. 그 말의 표시 별이 1개 이상일 때만 보인다 |
| 지금 차례 링 | Ring | 안 반지름 0.30, 바깥 반지름 0.42 | 지금 차례 말 발밑, 칸 윗면 + 0.01 |
| 주사위 | RoundedBox, 반지름 0.14 + 눈 Sphere r 0.075(v1 `d7b9b73` 배치·`FACE_UP_EULER`) | 한 변 16칸 0.9 / 20칸 1.0 / 24칸 1.1 | 마당 가운데, 쉴 때 바닥 위. 굴린 뒤에는 결과 면이 위로 온 채 다음 굴림까지 남는다 |
| 목적지 링 / 표시 콘 | Torus(반지름 0.5, 굵기 0.06) / Cone(r 0.14, h 0.3, 아래를 향함) | — | 목적지 칸 윗면 / 그 위 1.1 높이 |
| 경로 점 | Sphere r 0.07 | — | 지나가는 칸마다 윗면 + 0.08 |

**드로우콜 예산:** 말 8개 기준으로 씬 전체 ≤ 100이다. 칸·별·셰브런·윤곽은 InstancedMesh를 쓴다(용량 24 고정, `mesh.count`로 조절, Pitfall 8). geometry·material은 `geometries.ts` 모듈 싱글턴으로 공유한다.

**3초 읽기 체크(각 항목이 무엇으로 읽히는가):**

| 읽을 것 | 수단 |
|---------|------|
| 출발 | 1.4배 크기·높은 금색 칸 + 아치 게이트 + 꼭대기 별 + 판 아래-오른쪽 모서리 |
| 방향 | 칸 사이마다 흰 셰브런, 출발에서 나가는 "»", 네 모서리 안쪽 꺾임 화살표 |
| 칸 종류 | 퀘스트 = 둥근 사각 + 난이도 색 + 떠 있는 별 1/2/3개. 이벤트 = 보라 육각 발판 + 큰 아이콘(초록 앞 화살표 / 빨강 뒤 화살표 / 보라 회전 화살표) |
| 별 1등 | 3D 말 머리 위 금 왕관 + 점수판 첫 셀(👑 배지) |
| 지금 차례 | 하늘색 발밑 링 + 통통 튀는 말 + 차례 바 알약(같은 색 점·이모지) |

### S3 — 차례 바 (`TurnHud` v2, HUD-02, ROUND-02)

`.game-topbar` 재사용. 알약 `aria-live="polite"`.

**태블릿·노트북 (한 줄):** `[차례 알약] [라운드] [다음 차례] (spacer) [지금 끝내기]`
- **차례 알약**(테두리 3px `--sky`): 1줄 = 색 점 12px + `{이모지} {이름}`(Display) + ` 차례`(Caption `--ink-soft`). 2줄(팀전만) = `이번엔 {팀원} 님이 도전!`(Body 800 `--ink-soft`). 추가 턴이면 1줄 끝에 `🔁 한 번 더` 배지(grape 바탕, 흰 글자, Caption).
- **라운드 블록:** 위 = 라벨 `라운드`(Caption). 아래 = R ≤ 10이면 점 R개(채운 점 = 1..r, 지금 라운드 점은 12px, 나머지는 8px. 채움 `--ink`, 빈 점은 테두리 2px `--line`)와 그 오른쪽의 `{r}/{R}`(Body 900). R > 10이면 숫자 `{r}/{R}`만 쓴다. **마지막 라운드부터:** 라벨이 `마지막 라운드`로 바뀌고, 블록이 테두리 3px `--sun-deep` 알약(바탕 `color-mix(in srgb, var(--sun) 22%, var(--panel))`)이 된다. 지금 라운드 점도 `--sun-deep`으로 칠한다.
- **다음 차례 블록:** 위 = `다음`(Caption `--ink-soft`). 아래 = 색 점 + `{이모지} {이름}`(Body 800). 팀전이면 ` · {팀원}`을 붙인다. 이번 차례에 한 번 더가 확정됐으면(`nextUp.sameAgain`) `🔁 한 번 더: {이모지} {이름}`, 이번 차례가 게임의 마지막이면(`nextUp === null`) `🏁 이번이 마지막 차례!`(Body 900 `--ink`)를 보여 준다.
- **지금 끝내기:** 기존 보조 버튼 + `ConfirmDialog`(문구는 Phase 5 그대로).

**폰 (≤560px, 두 줄):**
- 1줄(grid `minmax(0,1fr) auto auto`): 차례 알약(색 점 + 이모지 + 이름 20px ellipsis + 차례) · 라운드 블록(점 + `r/R`, 라벨은 숨기고 `aria-label`로만 제공) · 지금 끝내기(기존 56px "끝내기").
- 2줄(전체 폭, Caption 800 `--ink-soft`, 한 줄 ellipsis): 왼쪽 = 팀원 줄(팀전만), 오른쪽 = `다음: {색 점}{이모지} {이름}`.

**차례가 바뀔 때:** 알약 내용이 scale .96→1 + fade로 160ms 동안 나타난다(reduced-motion이면 즉시).

### S4 — 별 점수판 (`Scoreboard` v2, HUD-01)

`<ol aria-label="별 순위">`. 정렬은 기존 `rankByStars`를 **`displayed.stars`**(연출이 끝난 값)에 적용한다. 동점은 같은 등수(1,1,3)다. 가로 스크롤은 없다.

**셀 구성:** 아바타 원(참가자 색 바탕 + 동물 이모지 Body 크기, 테두리 2px `--ink`) + 아바타 왼쪽 위의 등수 배지(24px 원) + 글자 열[`⭐{n}`(Body 900 tabular) / 이름(Caption 800 ellipsis)]. 셀 바탕은 `--panel`, 테두리 2px `--toy-edge`, 반지름 `--radius-sm`이다.
- 등수 배지: 1등이고 별이 1개 이상이면 `👑`(바탕 `--sun`), 그 밖에는 숫자(바탕 `--panel-2`, 글자 `--ink` Caption 900).
- 1등 셀(별 ≥ 1): 테두리 3px `--sun`. 지금 차례 셀: 테두리 3px `--sky`(1등이면서 지금 차례이면 sky가 이긴다. 왕관 배지는 남는다).
- 별 수가 바뀌면(별 비트 완료 시점) 셀이 scale 1→1.12→1로 240ms 동안 커졌다 돌아오고, 순서는 즉시 다시 정렬한다(이동 애니메이션은 Phase 8).

**배치:**
- 세로: grid. 참가자 n ≤ 4이면 n열, 5~8이면 4열 2행. 셀 높이 48px, 아바타 32px, 간격 8px.
- 가로 패널: 한 줄에 한 명, 셀 높이 56px(폰 가로 44px), 아바타 40px(폰 가로 32px). 글자 열은 이름(Body 800)이 왼쪽, `⭐{n}`이 오른쪽 정렬이다.

### S5 — 조작 영역 (`ControlsBar` v2, D-21, D-25, HUD-03/04)

**표시 조건(HUD-03):** `!busy && consumedLog === game.log && canvasReady && !contextLost`일 때만 렌더한다. 연출 중에는 **숨기고**(disabled가 아님), 비트가 끝나면 같은 자리에 나타난다(160ms fade-in, reduced-motion이면 즉시). 400ms `useInputLock`은 그대로 유지한다. "지금 끝내기"는 차례 바에 있으므로 항상 보인다.

| 엔진 단계 | 주요 버튼 | 보조 버튼 | 판정 결과 줄 |
|-----------|-----------|-----------|--------------|
| `awaitingRoll` | `🎲 주사위 굴리기` — sky, 전체 폭(폰)·최소 320px(태블릿), 높이는 Spacing 표대로. 🎲 이모지는 Display 크기, 글자는 Body 900 | `↩️ 판정 되돌리기`(되돌릴 판정이 있을 때만) | — |
| `awaitingJudgement` | 없음(퀘스트 카드의 ✅/❌) | `↩️ 판정 되돌리기`(재도전 중일 때만) | — |
| `turnResolved` | `다음 ➡️` / `🔁 한 번 더 하기` / `🏆 결과 보기`(neutral, 🎲와 같은 크기·같은 자리) | `↩️ 판정 되돌리기`(이번 차례에 판정이 있었을 때만) | 버튼 바로 위 한 줄(Heading 900, `aria-live="polite"`): 성공 `🎉 성공! ⭐+{n}`(grass) / 최종 실패 `아쉬워요! 이번엔 별 없이 다음 차례`(`--ink-soft`) / 판정 없는 차례는 표시 없음 |

판 위 주사위를 탭해서 굴리는 동작은 없다(D-21).

### S6 — 캔버스 위 DOM 오버레이 (D-23, D-24)

**(a) 상태 칩 줄** — 캔버스 셀 왼쪽 위, 안쪽 여백 8px, `flex-wrap`, 간격 8px, `pointer-events:none`, `aria-live="polite"`. 칩은 바탕 `--panel`, 테두리 2px `--toy-edge`, 알약, 패딩 4px 12px다. 이번 차례의 비트가 **끝날 때마다** 칩이 하나씩 붙고, 다음 차례가 시작되면 모두 지운다.

| 시점 | 칩 | 스타일 |
|------|-----|--------|
| 주사위 비트 끝 | `🎲 {n}` | Heading 900 tabular |
| 출발 보너스 비트 끝 | `🏁 ⭐+{n}` | Body 900, 바탕 `--sun`, 글자 `--ink` |
| 이벤트 비트 끝 | `➡️ 앞으로 {n}칸` / `⬅️ 뒤로 {n}칸` / `🔁 한 번 더!` / 제한 시 `🔁 이번엔 넘어가요` | Body 900, 글자색 grass / coral / grape / grape |
| 출발 칸에 멈춤(도착 비트 없음) | `🏁 출발 칸!` | Body 800 |

**(b) 비트 배너** — 캔버스 셀 가운데, 폭 min(90%, 480px), 패딩 24px 32px, 반지름 26px, `--shadow`, `pointer-events:none`, `role="status"`. 등장은 scale .85→1 + fade 160ms, 퇴장은 비트 마지막 160ms 동안 fade다. 배너가 떠 있는 시간 = 비트 길이이며, 그동안 조작 버튼은 숨겨진다.

| 비트 | ms | 위 줄 (Heading) | 큰 줄 (Display) | 바탕 / 테두리 3px |
|------|----|-----------------|-----------------|-------------------|
| `startBonus` | 800 | `🏁 출발 보너스` | `⭐+{n}` | `color-mix(sun 22%, panel)` / `--sun` |
| `event` forward | 1000 | `{이벤트 이름}` (+ 라벨 칩 🎁 보너스 / 🕳️ 함정, 기존) | `➡️ 앞으로 {n}칸!` | `color-mix(grass 18%, panel)` / `--grass` |
| `event` backward | 1000 | `{이벤트 이름}` (+ 라벨 칩) | `⬅️ 뒤로 {n}칸!` | `color-mix(coral 18%, panel)` / `--coral` |
| `event` extra | 1000 | `{이벤트 이름}` (+ 라벨 칩) | `🔁 한 번 더!` | `color-mix(grape 18%, panel)` / `--grape` |
| `event` extra 제한 | 1000 | `🔁 한 번 더는 연속 한 번까지!` | (Body 줄) `이번엔 넘어가요` | grape 계열 |
| `stars`(판정 성공) | 600 | `🎉 성공!` | `⭐+{n}` | `color-mix(grass 18%, panel)` / `--grass` |
| `finalRound` | 1500 | — | `🔔 마지막 라운드!` + (Body 줄) `이번 라운드가 마지막이에요` | `linear-gradient(180deg, var(--sun), var(--sun-deep))`, 글자 `--ink`, 테두리 `--toy-edge` |

- **마지막 라운드 비트 [자동 선택 — Open Q2]:** 마지막 라운드의 첫 정규 턴이 시작될 때 1500ms 동안 보여 주고, **그동안 🎲 버튼을 숨긴다**. 1라운드 게임이면 게임 시작 직후에 한 번 나온다(Assumption A5 채택). 되돌리기 후 다시 나오는 것은 허용한다(Pitfall 10).
- **성공 별 비트 [자동 선택 — Open Q4]:** 600ms 동안 보여 주고, 끝나는 순간 점수판 별이 오른다(S4 셀 pop). Phase 8은 이 자리를 celebrate 연출로 바꾼다.

**(c) 퀘스트 카드** — Phase 5 `MissionOverlay` 내용(재도전 배지, 미션 이름, 설명, 난이도 배지 + 받을 별, ✅/❌)을 재사용하고 위치만 바꾼다.
- 세로: 캔버스 셀 **아래쪽에 붙인다**(아래 여백 8px, 좌우 8px). 최대 높이는 셀의 72%이고 넘치면 카드 안에서 세로 스크롤한다. 판의 위쪽 절반(출발·말)은 카드 위로 계속 보인다. 화면을 어둡게 하는 막(scrim)은 없다.
- 가로: 캔버스 셀 가운데, 최대 560px.
- 등장: 아래에서 위로 24px 이동 + fade 200ms(reduced-motion이면 즉시). 카드는 `questDrawn` 이후 **모든 연출 비트가 끝난 뒤에** 나타난다(`controlsVisible` 조건과 같다).

### S7 — 판 준비 중 / 화면 꺼짐 복구 (D-27, STAB-02/04)

**판 준비 중(lazy 3D 청크 로딩 · 캔버스 생성 전):** 캔버스 셀 가운데에 🎲(Display, 0.8초 주기로 위아래 8px 통통) + `판을 준비하고 있어요…`(Caption `--ink-soft`)를 보여 준다. 이 동안 S5 조작 영역은 숨긴다. **8초 안에 준비되지 않으면** 아래 복구 오버레이로 바꾼다 **[자동 선택]**.

**화면 꺼짐 복구 오버레이** — 트리거는 `webglcontextlost`, 3D ErrorBoundary(청크 로드 실패·WebGL 생성 실패), 준비 시간 초과다. 캔버스 셀 전체를 `color-mix(in srgb, var(--panel) 86%, transparent)` 막으로 덮고 가운데에 카드를 둔다(`.game-mission-card` 스타일, 패딩 48px 32px, 최대 480px).
- `🔄`(Display) → 제목(Heading) → 본문(Body 800 `--ink-soft`) → 버튼 `🔄 화면 다시 그리기`(sky `.game-btn`, 전체 폭).
- 버튼을 누르면 `skipAll()` → 오버레이 닫기 → `canvasKey + 1` 순서로 처리하고, 별·위치·차례를 그대로 다시 그린다. 리마운트는 **이 버튼으로만** 한다(자동 재시도 없음, iOS 컨텍스트 누적 방지).
- 오버레이가 떠 있는 동안 S5 조작 영역은 숨긴다(보이지 않는 판으로 진행하지 않도록). 차례 바·점수판·지금 끝내기는 그대로 보인다.
- 버튼에 첫 포커스를 준다(이 화면에서 할 수 있는 유일한 행동이다).
- 탭이 숨겨지면 `frameloop='never'` + `skipAll()`, 다시 보이면 `'always'`로 돌린다. 이 전환에는 UI 문구가 없다.

---

## Motion Contract (비트 = 데이터, D-19)

| 비트 | ms | 화면 동작 | 완료 시 `displayed` |
|------|----|-----------|---------------------|
| `dice` | 1000 | 주사위가 마당 가운데에서 0~200ms 동안 1.2 위로 뛰어오르고, 200~850ms 동안 ease-out cubic으로 2~3바퀴 감속 회전한 뒤 `FACE_UP_EULER[face]`로 스냅하고, 850~1000ms 동안 내려앉아 0.9배로 눌렸다 돌아온다 | — |
| `preview` | 500 | 경로 점이 0→1 scale(120ms)로 한꺼번에 나타나고, 목적지 링과 표시 콘이 나타난다(콘은 0.1 진폭으로 위아래). 점과 링은 홉 동안 남아 있다가 말이 지나간 칸의 점부터 사라진다 | — |
| `hop` | `hopMs(len) × len`, `hopMs = clamp(2000/len, 100, 250)` | 칸마다 포물선 점프(높이 0.5t). 착지 때 y 0.88배로 눌렸다 돌아오며(칸당 시간의 마지막 30%), 마지막 칸에서 슬롯 위치로 미끄러져 선다. 이벤트 이동도 같은 홉을 쓴다(뒤로는 역방향 경로). 목적지 링은 착지 후 사라진다 | `positions[pid]` |
| `startBonus` | 800 | S6 배너 | `stars[pid] += n` |
| `event` | 1000 | S6 배너 | — |
| `stars` | 600 | S6 배너, 끝나면 점수판 셀 pop | `stars[pid] += n` |
| `finalRound` | 1500 | S6 배너 | — |
| 대기(비트 아님) | — | 지금 차례 말만 0.8초 주기로 y 0→0.08 통통 튀고, 링이 1.0→1.08배로 숨 쉰다. 다른 말·별·칸은 정지 | — |

- 모든 비트에 watchdog `ms + 500`을 건다. 완료는 id 멱등이다(RESEARCH Pattern 2).
- 보통 굴림 한 번은 약 2.4초, 최악은 6.8초 이하다(`budgetMs ≤ 7000` 단언).
- **reduced-motion:** `dice`·`preview`·`hop`은 0ms(즉시 스냅)다. 배너 비트(`startBonus`·`event`·`stars`·`finalRound`)는 **길이를 유지하되** scale·fade 없이 나타나고 사라진다(정보를 읽을 시간). 대기 바운스·링 숨쉬기·셀 pop·🎲 로딩 바운스는 끈다.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | `🎲 주사위 굴리기` (Phase 5 문구 유지, 🎲는 Display 크기) |
| Secondary CTA | `다음 ➡️` / `🔁 한 번 더 하기` / `🏆 결과 보기` (유지) |
| Recovery CTA | `🔄 화면 다시 그리기` |
| Empty state heading | 해당 없음 — 게임 화면은 항상 판과 참가자가 있다. 빈 화면에 해당하는 상태는 "판 준비 중"이다 |
| Empty state body (판 준비 중) | `판을 준비하고 있어요…` |
| Error state (화면 꺼짐) | 제목 `화면이 잠깐 꺼졌어요` / 본문 `별과 위치는 그대로예요. 아래 버튼을 눌러 다시 그려 주세요.` / 버튼 `🔄 화면 다시 그리기` |
| Error state (판 불러오기 실패·시간 초과) | 제목 `판을 그리지 못했어요` / 본문 `게임은 그대로예요. 버튼을 눌러 다시 시도해 주세요.` / 버튼 `🔄 화면 다시 그리기` |
| Destructive confirmation | **지금 끝내기**: `지금 게임을 끝낼까요? 지금까지 모은 별로 우승을 정해요.` / 확인 `게임 끝내기` / 취소 `계속하기` (Phase 5 그대로) |

### 플레이 화면 문구 (Phase 6 신규·변경만, 나머지는 Phase 5 S3 표 유지)

| 요소 | 문구 |
|------|------|
| 차례 | `{이모지} {이름}` + ` 차례` (유지) |
| 팀원 줄 | `이번엔 {팀원} 님이 도전!` (유지 — D-22의 "이번엔 ○○ 님!"을 기존 문구로 해석) |
| 다음 차례 라벨 | `다음` (폰: `다음: ` 접두) |
| 다음 차례 값 | 개인전 `{이모지} {이름}` / 팀전 `{이모지} {팀 이름} · {팀원}` |
| 다음 차례 — 한 번 더 확정 | `🔁 한 번 더: {이모지} {이름}` |
| 다음 차례 — 이번이 마지막 | `🏁 이번이 마지막 차례!` |
| 라운드 라벨 | `라운드` / 마지막 라운드부터 `마지막 라운드` |
| 라운드 값 | `{r}/{R}` |
| 라운드 aria | `라운드 {R}개 중 {r}번째` |
| 마지막 라운드 배너 | `🔔 마지막 라운드!` / `이번 라운드가 마지막이에요` |
| 상태 칩 | `🎲 {n}` · `🏁 ⭐+{n}` · `➡️ 앞으로 {n}칸` · `⬅️ 뒤로 {n}칸` · `🔁 한 번 더!` · `🔁 이번엔 넘어가요` · `🏁 출발 칸!` |
| 출발 보너스 배너 | `🏁 출발 보너스` / `⭐+{n}` |
| 이벤트 배너 | `{이벤트 이름}` / `➡️ 앞으로 {n}칸!` · `⬅️ 뒤로 {n}칸!` · `🔁 한 번 더!` |
| 한 번 더 제한 배너 | `🔁 한 번 더는 연속 한 번까지!` / `이번엔 넘어가요` |
| 성공 배너 | `🎉 성공!` / `⭐+{n}` |
| 판정 결과 줄 | `🎉 성공! ⭐+{n}` / `아쉬워요! 이번엔 별 없이 다음 차례` (유지) |
| 점수판 aria | `별 순위` (유지). 셀 aria `{등수}등 {동물 이름} {이름} 별 {n}개`, 1등이면 앞에 `1등 왕관,` |
| 캔버스 셀 aria | `role="img"` `aria-label="{L}칸 순환 보드, 지금 {이름} 차례"` (판의 모든 상태는 DOM HUD에도 있으므로 3D 전용 정보는 없다) |
| 되돌리기 | `↩️ 판정 되돌리기` / 토스트 `판정을 되돌렸어요. 다시 골라 주세요.` (유지) |

**문구 금지어(유지):** "결승", "칸 남음", "시간", "순위로 마치기", "남/여". **3D 안에는 어떤 글자도 두지 않는다.**

**파괴적 동작:** `지금 끝내기`만 있다(확인 대화상자 필수). `🔄 화면 다시 그리기`는 상태를 보존하는 복구 동작이라 확인이 없다. `판정 되돌리기`는 Phase 5 계약 그대로 확인 없이 토스트로 알린다.

---

## Component Inventory

| 컴포넌트 | 처리 | 계약 |
|----------|------|------|
| `game/GameStage.tsx` | **신규**(`PlayView` 대체) | S1 grid, 오버레이 슬롯, `canvasKey`/`lost`/`ready` 상태 |
| `game/palette.ts` | **신규** | `ANIMAL_COLOR`, `DIFF_COLOR`, `EVENT_COLOR`, 씬 색 상수. three import 금지 |
| `game/scene/*` | **신규**(lazy 청크) | S2. `Board`, `StartGate`, `Arrows`, `TileIcons`, `Pawn`, `Dice`, `PathPreview`, `CameraRig`, `GameCanvas`(`flat`, alpha, `dpr [1, 폰 1.5 / 그 외 2]`) |
| `game/hud/TurnHud.tsx` | 수정 | S3: 색 점, 다음 차례, 라운드 점, 마지막 라운드 강조, 폰 2줄 |
| `game/hud/Scoreboard.tsx` | 재작성 | S4: `displayed.stars`, 아바타 원, 등수/👑 배지, 세로 grid·가로 목록 |
| `game/hud/ControlsBar.tsx` | 수정 | S5: 표시 조건, 큰 버튼 크기, 판정 결과 줄 |
| `game/hud/StatusChips.tsx` | **신규** | S6(a) |
| `game/hud/Banner.tsx` | **신규** | S6(b) 비트 소비자 |
| `game/hud/MissionOverlay.tsx` | 수정(위치·등장만) | S6(c) |
| `game/hud/ContextLostOverlay.tsx` | **신규** | S7(준비 중 + 복구) |
| `game/hud/DiceResultPanel.tsx`, `game/hud/RingStrip.tsx` | **플레이 화면에서 제거** | 정보는 상태 칩·배너로 옮겼다. 파일·테스트 정리는 planner 재량(D-26) |
| `components/ConfirmDialog.tsx`, `components/Toast.tsx` | 재사용, 무수정 | — |

**새 CSS 위치:** `src/game/styles/game.css` 끝의 "Phase 6" 블록에 둔다. 새 클래스 접두사는 `.stage-*`(grid·셀), `.sb-*`(점수판 v2), `.turn-next`, `.round-dots`, `.status-chips`, `.beat-banner`, `.ctx-overlay`다. 삭제할 것은 `.game-stage.temp-play`, `.ring-strip`, `.ring-tile*`, 옛 `.scoreboard` 알약 규칙이다(테스트 갱신과 함께). 모든 새 규칙은 토큰 변수와 `color-mix`만 쓰고, 참가자 색만 인라인 `--pc` 변수로 받는다.

---

## Interaction & Accessibility

- **3D는 장식, DOM이 진실:** 지금 차례·다음 차례·라운드·별 순위·이번 차례 결과는 모두 DOM 텍스트로도 있다(차례 바·점수판·상태 칩·배너). 색만으로 구분하는 정보는 없다. 칸 종류 = 색 + 모양(사각/육각) + 별 개수/아이콘, 참가자 = 색 + 동물 이모지 + 이름.
- **live 영역:** 차례 알약·상태 칩 줄·판정 결과 줄은 `aria-live="polite"`, 배너는 `role="status"`, 복구 오버레이는 `role="alertdialog"` + 제목 `aria-labelledby`.
- **포커스:** 단계가 바뀔 때 포커스를 옮기지 않는다(태블릿 터치 우선). 복구 오버레이만 버튼에 포커스를 준다. 모든 버튼에 `:focus-visible` 3px `--sky`.
- **연타:** 버튼 숨김(HUD-03) + 400ms 입력 잠금 + 엔진 phase 가드의 3중 안전장치를 둔다.
- **터치:** 캔버스는 `pointer-events:none`이고 더블탭 확대를 막는다(`touch-action: manipulation`). 무대 전체에 스크롤이 없다.
- **입력 보안:** 사용자 문자열은 JSX 텍스트로만 렌더한다(`dangerouslySetInnerHTML`·drei `Html` 금지, T-05-15 유지).
- **오프라인(STAB-04):** 시스템 글꼴, 코드 도형, 코드 라이트만 쓴다. drei 금지 목록(`Text`, `Text3D`, `Environment`, `Stage`, `Cloud`, `useGLTF`/`Gltf`, `Ktx2`, `MatcapTexture`, `NormalTexture`, `StatsGl`, `Html`)을 지킨다. 3D 청크는 시작 화면에서 미리 받아 둔다.
- **반응형 기준점:** 폭 `max-width: 560px`(기존), 가로 `orientation: landscape and min-aspect-ratio: 5/4`, 짧은 화면 `max-height: 760px`, 폰 가로 `max-height: 500px`.

---

## Pre-Populated Sources

| 출처 | 쓴 결정 |
|------|---------|
| CONTEXT.md | D-02(3D 글자 금지), D-03(CDN·HDRI 없음), D-04(섀도맵·후처리 없음, 트윈), D-06(단일 Canvas), D-07(사각 순환판·16/20/24), D-08(출발 아래-오른쪽·시계 방향), D-09(고정 쿼터뷰 50~60°·fitCamera), D-10(추적 없음), D-11(간격 12~15%·RoundedBox·캔디 톤), D-12(출발 1.4배·게이트·금색), D-13(칸마다 셰브런·모서리 꺾임), D-14(난이도 색 + 3D 별), D-15(보라 육각 이벤트 + 아이콘 3종), D-16(번호 없음·목적지 하이라이트 + 경로 점), D-17(캡슐+머리 말·참가자 색·고정 오프셋), D-18(링 + 바운스), D-19(비트 타이밍), D-20(v1 광택 주사위·가운데·스냅), D-21(큰 🎲, 판 탭 없음), D-22(세로·가로 배치), D-23(DOM 오버레이 퀘스트 카드, 판 보임), D-24(마지막 라운드 배너 1.5초 + 강조 유지), D-25(버튼 숨김 + 400ms 잠금), D-26(RingStrip 제거), D-27(화면 다시 그리기·key 리마운트·visibility), D-28(DPR 상한·공유 geometry) — 27개 |
| RESEARCH.md | `flat` NoToneMapping(Pitfall 5), 출발 칸 대각 오프셋 0.2(Pitfall 7), InstancedMesh 용량 24(Pitfall 8), ContactShadows frames=1 + blob, pitch 1.13~1.15, fov 35·피치 60→50, 비트 표·`hopMs`·예산 ≤ 7초, `controlsVisible` 조건, ErrorBoundary를 같은 오버레이로 처리, 3D 청크 예열, drei 금지 목록, Open Q2~4 권장안, Assumption A5 — 14개 |
| Phase 5 UI-SPEC / 기존 코드 | 게임 타입 스케일 40/26/20/15·굵기 800/900, 토큰 hex 전체, accent 예약 방식, `.game-topbar`·`.game-turn-pill`·`.game-btn*`·`.game-mission-card`·`.game-event-chip`·`.game-judge-result` 재사용, 플레이 문구(차례·팀원·이벤트·판정·되돌리기·지금 끝내기), `rankByStars`, `ANIMAL_EMOJI`/`ANIMAL_NAME` |
| v1 (`d7b9b73`, 03-UI-SPEC) | 주사위 치수·눈 배치·광택 재질, 말 캡슐+머리 비율, 하늘색 차례 링, 라이트 색(`#FFF6E0`·`#8FD0FF`·`#CFE4F5`), 그림자 색 `#123A58`, 파스텔 하늘 `#BEE7FF` |
| 사용자 메모리 | 3초 읽기(방향·출발·순위·차례), 칸 간격, 견본보다 확실히 귀엽게 |
| 자동 선택 (사용자 위임) | shadcn 미사용, 거의 정사각 창은 세로 배치, 세로 아래 영역 순서(버튼 위·점수판 아래), 가로에서 조작 버튼을 오른쪽 패널에, 참가자 색 8개(새 색은 bear 갈색 1개), 말 흰 받침 + 윤곽선, 말 눈·볼 터치(귀여움), 얼굴은 카메라를 향함, 1등 왕관(3D + 👑 배지), 셰브런은 칸 사이 간격에·모서리 꺾임 화살표는 판 안쪽 바닥에, 출발 게이트 45° 회전, 판 받침 2층 + 민트 마당, 정지 원칙(지금 차례 말만 움직임), 상태 칩 줄, 배너 색 계약, 퀘스트 카드 세로 하단 붙임·scrim 없음, 🎲 버튼 폰 64px, 판 준비 중 8초 시간 초과, 복구 중 조작 숨김, 다음 차례 문구 3종, reduced-motion 시 배너 길이 유지 — 22개 |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | 없음 (shadcn 미초기화) | not applicable |
| third-party | 없음 | not applicable — UI 레지스트리 블록을 쓰지 않는다. npm 3D 패키지(three·fiber·drei, SUS `too-new`)의 확인은 RESEARCH Package Legitimacy Audit에 따라 planner가 설치 태스크 앞에 `checkpoint:human-verify`로 둔다 |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
