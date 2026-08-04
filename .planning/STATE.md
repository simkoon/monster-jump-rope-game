---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 4
current_phase_name: 닌텐도풍 아트 & 캐릭터
status: implementation
stopped_at: 04-01 complete — visual system + original logo implemented and browser-smoke verified
last_updated: "2026-08-04T14:46:39+09:00"
last_activity: 2026-08-04
last_activity_desc: "04-01 닌텐도풍 비주얼 시스템 + 오리지널 파워점핑 로고 구현/검증"
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 12
  completed_plans: 11
  percent: 80
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-25)

**Core value:** 카드로 뽑은 줄넘기 미션을 실제로 성공 → 주사위 → 전진 → 먼저 도착하면 승리 — 이 핵심 루프가 아이들에게 신나고 매끄럽게 돌아가고, 강사가 미션을 자유롭게 관리할 수 있는 것.
**Current focus:** Phase 4 — 닌텐도풍 아트 & 캐릭터

## Current Position

Phase: 4 (닌텐도풍 아트 & 캐릭터) — IN PROGRESS
Plan: 1 of 2 implemented for Phase 4
Status: 04-01 구현 및 자동/브라우저 smoke 검증 완료; 04-02 캐릭터 포즈/표정 전환 준비됨
Last activity: 2026-08-04 — 04-01 비주얼 시스템 + 오리지널 로고 구현/검증

**전환 배경:** 3D 캐릭터·표정 아트를 조달할 수단이 없는 반면 2D는 CC0 무료 에셋으로 즉시 조달 가능(Kenney 표정 12종×색상 6종 확보 검증됨). Phase 3의 R3F 씬은 Phase 3.1에서 DOM+SVG+CSS로 교체된다.

**전환으로 무효화되는 선행 작업:**
- Phase 3 검증(VERIFICATION.md 미작성) — 3D 씬 대상이라 2D 전환 후 재정의 필요
- quick `260726-lbq` 브라우저 human-check 5건 — 전부 R3F/`<Bounds>` 카메라 등 3D 전용 항목이라 무효
- `.planning/ASSET-REQUEST.md` 미확정 7건 — 3D(2×2 텍스처 아틀라스, Outfit tint) 전제라 2D 기준 재작성 필요

Progress: [█████████░] 90%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: — min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 1 P1 | 1 session | 3 tasks | 26 files |
| Phase 01 P02 | 9m | 3 tasks | 14 files |
| Phase 01 P03 | 1 session | 3 tasks | 9 files |
| Phase 02 P02 | 6 | 3 tasks | 6 files |
| Phase 02 P03 | 7 | 2 tasks | 5 files |
| Phase 02 P03 | 7 | 2 tasks | 5 files |
| Phase 03 P01 | 32 | 2 tasks | 19 files |
| Phase 03 P02 | 6min | 2 tasks | 25 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 헤드리스 게임 엔진을 3D 이전에 검증(Phase 2가 3D 없이 플레이 가능) — 프로젝트 최대 리스크 감소책.
- [Roadmap]: 콘텐츠 편집기(Phase 1)를 게임 루프보다 먼저 — 미션 없이는 카드를 뽑을 수 없고, 편집이 핵심 가치.
- [Roadmap]: 3D 캐릭터 아트는 Phase 4로 시간 상자 격리 — 플레이 가능 루프를 절대 막지 않도록.
- [Phase ?]: Added .npmrc legacy-peer-deps to resolve @hookform/resolvers optional valibot peer conflict
- [Phase ?]: Split vite.config.ts / vitest.config.ts to avoid Vitest bundled-Vite type clash (Vite 8 vs Vitest 3.2.4)
- [Phase ?]: Added @testing-library/dom@10.4.1 explicitly (react peer not auto-installed under legacy-peer-deps)
- [Phase ?]: 02-02: useGameStore is the single engine-content bridge; reset() returns to setup
- [Phase ?]: 02-02: App gains an additive 편집기/게임 top-level switch; Phase-1 Tabs untouched
- [Phase ?]: 03-01: R3F scene gates on a presentation busy flag (usePresentation) with a deadlock-proof watchdog; the pure engine stays unblocked (ANIM_DONE, D-07).
- [Phase ?]: 03-01: App defaults to 게임 mode routing to GameApp; 편집기 reachable via the mode switch (D-10).
- [Phase ?]: 03-01: R3F stack exact-pinned (three/@types/three 0.185.1 lockstep, Pitfall 5); no physics engine — tween dice (D-02/D-05).
- [Phase 03-02]: HUD components are presentational (props-driven); PlayView owns store wiring + ANIM_DONE sequence
- [Phase 03-02]: game.css declares only additive tokens (--tap/--tap-sm/--hud-h + 40/26/20/15), reusing Phase 1 hues verbatim (no palette fork)
- [quick-lbq]: 목적지 하이라이트는 <Bounds> 밖에 마운트한다 — 안에 넣으면 롤마다 카메라가 리프레임된다
- [quick-lbq]: planHighlight가 모든 반환 인덱스를 [0, boardLength]로 클램프한다 — 엔진은 오버슛 승리를 클램프하지 않으므로(D-03) 없으면 마커가 보드 밖에 생성된다
- [quick-lbq]: 애니메이션 시간을 늘리는 변경은 반드시 PlayView의 startWatchdog 예산에 더한다 — 누락 시 watchdog이 홉 도중 busy를 조기 해제한다

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

- [Roadmap]: REQUIREMENTS.md 헤더가 "34 total"로 기재되어 있으나 실제 열거된 v1 요구사항은 38개(SETUP 6 + LOOP 10 + MISSION 7 + EVENT 6 + DATA 4 + ART 5). 로드맵은 38개 전부를 매핑함. 헤더 수치 정정 필요.
- [Phase 1]: 이벤트 확률/가중치 입력·정규화 UX 모델 미정 (연구: --research-phase 대상).
- [Phase 3]: R3F vs 바닐라 Three.js 및 dispose/ANIM_DONE 패턴 확정 필요. 대상 태블릿 사양 확보로 성능 예산 설정 필요.
- [Phase 2]: 승리 조건(정확 도착 vs 초과 통과, 동시 도착 무승부) 엔진 설계에서 확정 필요.

### Roadmap Evolution

- Phase 3.1 inserted after Phase 3: 3D→2D 렌더링 전환 & CC0 에셋 파이프라인 (사용자 결정 2026-07-26) (URGENT)

## Quick Tasks Completed

| Date | Slug | Outcome |
|------|------|---------|
| 2026-07-26 | design-asset-request | `.planning/ASSET-REQUEST.md` — Phase 4(ART-01/02/03/05) 디자인 에셋 요구사항서. 코드 실측 규격 고정, 표정=2×2 텍스처 아틀라스 계약, `Outfit` 슬롯 tint 계약, 미확정 7건 회신 대기 |
| 2026-07-26 | 260726-lbq-move-destination | 주사위 확정 → 토큰 이동 전 목적지 하이라이트(LOOP-05/06/07). `planHighlight` 순수 모델 + `MoveHighlight` 씬 레이어(경유 점·목적지 링·이벤트 핀·칸 라벨) + `PlayView` `preview` 비트. 182 tests green. 브라우저 human-check 5건 대기 |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-08-04
Stopped at: 04-01 visual system + original logo implemented; build/test/browser smoke passed
Resume file: .planning/phases/04-nintendo-style-art-characters/04-01-SUMMARY.md
