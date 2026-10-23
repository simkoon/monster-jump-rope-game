---
phase: 08-success-fx-awards
plan: 02
subsystem: game-director-hud
status: complete
tags: [timeline, successPlan, banner, css, reduced-motion, tdd]
requires: []
provides:
  - "timeline.ts: STARS_MS {1:1600,2:1900,3:2200}, STARS_MS_REDUCED 1200, StarTier, starTier, starsBeatMs; miss.retry; isBannerBeat includes miss; BEAT_MS has no stars entry"
  - "director/successPlan.ts: SuccessPlan, SUCCESS_SIZE, SUCCESS_RATIO, REDUCED_FLY_TO_MS, successPlan(stars, ms, reduced)"
  - "labels.ts: BannerTone 'soft', BannerCopy.tier, MISS_COPY; stars → 퀘스트 성공! / ⭐+N; miss → soft one-liner"
  - "Banner.tsx: delayed stars banner at bannerMs, beat-banner--tier1/2/3, --banner-pop, --banner-at; soft miss banner"
  - "game.css block '=== Phase 8: banners (08-02) ===' with hud8-banner-pop / hud8-soft-in and its own reduced-motion rule"
affects: [08-03, 08-04, 08-05, 08-06, 08-07, 08-08]
tech-stack:
  added: []
  patterns:
    - "successPlan is the single timing/size table every success consumer reads (Character, FxPools, CameraRig, Banner, StarFlight, useSfx)"
    - "Banner delayed entry uses a second id-keyed timer; the completion timer still runs from the beat start"
    - "Delayed-mount banners offset their end fade with --banner-at so it still lands on the beat's last 160 ms"
key-files:
  created:
    - src/game/director/successPlan.ts
    - src/game/director/successPlan.test.ts
  modified:
    - src/game/director/timeline.ts
    - src/game/director/timeline.test.ts
    - src/game/scene/CharacterGallery.tsx
    - src/game/labels.ts
    - src/game/labels.test.ts
    - src/game/hud/Banner.tsx
    - src/game/hud/hud6.test.tsx
    - src/game/styles/game.css
    - src/game/stage.test.tsx
decisions:
  - "Reduced motion successPlan also zeroes burstRadius and ringRadius (all motion sizes 0), keeps gold of the tier"
  - "The stars banner sets --banner-at = bannerMs so the existing hud6-banner-out fade still ends at the beat end despite the late mount"
  - "CharacterGallery's success act plays at the ⭐2 length STARS_MS[2] (1900 ms)"
metrics:
  duration: "~8 min"
  completed: 2026-10-24
  tasks: 2
  files: 11
---

# Phase 8 Plan 02: Success timing skeleton + tiered success banner + soft miss banner Summary

성공 비트 길이를 별 등급별(⭐1 1600 / ⭐2 1900 / ⭐3 2200 ms, reduced motion 1200 ms)로 바꿨다. 모든 성공 연출이 같은 숫자를 읽도록 순수 시간표 `successPlan`을 만들었다. 배너는 "퀘스트 성공! ⭐+N"으로 바뀌었고, bannerMs에 늦게 등장하며 등급마다 크기가 다르다. 실패하면 연보라 soft 배너 한 줄이 나온다(재도전이 남았으면 "괜찮아! 다시 해 보자 💪", 아니면 "다음엔 꼭! 💪"). 판정과 2.5초 예산의 계약(D-01~D-04, D-08, D-09, FX-02, FX-05)은 그대로 지킨다.

## What Was Built

**Task 1: 등급별 stars 비트, miss 재도전 플래그, successPlan** (`0af6b5b` RED, `c774e23` GREEN)
- `timeline.ts`: BEAT_MS에서 stars 항목을 지우고 `STARS_MS`, `STARS_MS_REDUCED`, `StarTier`, `starTier`(0→1, 4+→3), `starsBeatMs`를 넣었다. `judged` 성공 비트는 `starsBeatMs`로 길이를 정한다. `motion()` 0 축소는 쓰지 않는다. 실패 비트에는 `retry`가 붙는다. 같은 전환에 같은 pid의 `questDrawn attempt 2`가 있으면 true다. `isBannerBeat`에 miss를 넣었다.
- `successPlan.ts`(신규, 순수, clock-free): 비율 30/35/40/92 %, 등급별 크기 표(컨페티 40/80/140, 버스트 8/12/18, 반경 0.9/1.1/1.4, 링 1/2/2, 반경 1.2/1.4/1.7, 점프 0.55/0.65/0.75, ⭐3만 흔들림 320 ms·0.06, 튐 1.04/1.08/1.12). reduced일 때는 bannerMs 0, flyToMs min(600, ms), 움직임 크기 0, 튐 1을 돌려주고 gold는 등급 값을 유지한다.
- 이전한 테스트: timeline.test(900 단언 → STARS_MS 표, reduced 경우, miss 객체에 retry 추가, 다른 pid는 재도전으로 치지 않음), stage.test(`STARS_MS[3]`), CharacterGallery(`STARS_MS[2]`).

**Task 2: 퀘스트 성공 배너와 soft 실패 배너** (`0ad3f40` RED, `885f9ad` GREEN)
- `labels.ts`: `BannerTone`에 'soft', `BannerCopy.tier`, `MISS_COPY`를 추가했다. stars는 `퀘스트 성공!` / `⭐+N` / grass / tier, miss는 soft 한 줄이다. ControlsBar의 `🎉 성공! ⭐+N` 결과 줄은 그대로 뒀다.
- `Banner.tsx`: 완료 타이머는 바꾸지 않았다(비트 시작부터 beat.ms, id로 가드). stars 비트는 `successPlan(...)`의 bannerMs가 될 때까지 아무것도 렌더하지 않는다. 등장 시점은 두 번째 타이머가 정하며 이 타이머는 beat id에 묶여 있다. 클래스 `beat-banner--tier{n}`과 CSS 변수 `--banner-pop`, `--banner-at`을 붙인다.
- `game.css` 블록 `=== Phase 8: banners (08-02) ===`: 등급별 폭과 테두리를 정하고 ⭐3에는 sun 테두리와 바깥 빛을 준다. `hud8-banner-pop`(scale 0.6 → var(--banner-pop) → 1, 240 ms)과 soft(라벤더 color-mix, `hud8-soft-in` 8 px 내려앉기, scale 없음)를 넣었다. 블록 안에 reduced-motion 규칙을 따로 뒀다. hex와 coral은 쓰지 않았다.
- 테스트: labels(문구, 금지어), hud6(⭐1/2/3 지연 등장, 클래스와 --banner-pop, 완료 시점 ms, reduced 0 ms, soft retry/last 700 ms 완료, CSS 블록 검사), stage(bannerMs 뒤 퀘스트 성공!, 재도전 miss의 soft 배너).

## Verification

- `npx tsc -b`: 통과
- `npx vitest run`: **67개 파일, 1252개 테스트 모두 통과**
- `npm run build`: 통과(GameCanvas 청크가 500 kB를 넘는다는 경고는 이번 플랜 전부터 있었다)
- 수용 기준 grep: `BEAT_MS.stars` 0건, STARS_MS / STARS_MS_REDUCED / `export function successPlan` 각 1건, successPlan에 React/three/시계 호출 0건, labels 문구 각 1건, CSS 마커 1건, soft 2건, tier3 3건, Banner의 `successPlan(` 2건

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 늦게 마운트된 배너의 퇴장 fade 시점 보정**
- **Found during:** Task 2
- **Issue:** 기존 `hud6-banner-out`은 마운트 시점부터 `--beat-ms − 160ms` 뒤에 시작한다. stars 배너는 bannerMs에 마운트되므로 fade 시작이 비트 끝보다 bannerMs만큼 늦어진다. 그러면 fade가 시작되기 전에 배너가 사라진다(UI-SPEC F4의 "마지막 160 ms fade" 위반).
- **Fix:** Banner가 `--banner-at: {bannerMs}ms`를 넣는다. tier 규칙의 fade 지연은 `calc(var(--beat-ms) - var(--banner-at, 0ms) - 160ms)`로 계산한다.
- **Files modified:** src/game/hud/Banner.tsx, src/game/styles/game.css
- **Commit:** 885f9ad

이것 말고는 플랜대로 진행했다.

## TDD Gate Compliance

두 태스크 모두 `test(08-02)` RED 커밋(0af6b5b, 0ad3f40) 다음에 `feat(08-02)` GREEN 커밋(c774e23, 885f9ad)이 있다. RED 단계에서 새 테스트는 모두 실패했다(12개, 16개).

## Known Stubs

없음.

## Threat Flags

없음. T-08-30(완료 타이머가 비트 시작 기준이라는 점을 hud6에서 ⭐1/2/3 모두 고정)과 T-08-31(successPlan 순서 불변식을 등급 × reduced 전 조합에서 고정) 완화책을 적용했다.

## Self-Check: PASSED
- FOUND: src/game/director/successPlan.ts, src/game/director/successPlan.test.ts
- FOUND commits: 0af6b5b, c774e23, 0ad3f40, 885f9ad
