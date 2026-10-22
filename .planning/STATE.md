---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: 3D 블루마블 재구축
current_phase: 5
current_phase_name: 새 규칙 엔진 & 강사 설정
status: executing
stopped_at: Completed 05-02-PLAN.md
last_updated: "2026-10-22T17:55:19.580Z"
last_activity: 2026-10-22
last_activity_desc: Phase 5 execution started
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 5
  completed_plans: 4
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-22)

**Core value:** 주사위 → 이동 → 도착 칸 줄넘기 퀘스트 → 성공하면 성공 애니메이션과 별 — 이 핵심 루프가 아이들에게 신나고 매끄럽게 돌아가고, 강사가 미션을 자유롭게 관리할 수 있는 것.
**Current focus:** Phase 5 — 새 규칙 엔진 & 강사 설정

## Current Position

Phase: 5 (새 규칙 엔진 & 강사 설정) — EXECUTING
Plan: 5 of 5
Status: Ready to execute
Last activity: 2026-10-22 — Phase 5 execution started

Progress: [░░░░░░░░░░] 0%

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
| Phase 05 P01 | 4min | 3 tasks | 12 files |
| Phase 05 P02 | 4min | 3 tasks | 10 files |
| Phase 05 P03 | 6min | 2 tasks | 5 files |
| Phase 05 P04 | 4min | 2 tasks | 7 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v2.0 Roadmap]: 순서는 규칙·데이터 헤드리스 고정(Phase 5, 임시 DOM 화면으로 한 판 끝까지) → 3D 순환판·연출 디렉터·DOM 화면 정보(6) → 치비 동물 캐릭터(7) → 성공 연출·시상식·사운드·안정성(8). 연구 SUMMARY의 4단계 제안을 그대로 채택.
- [v2.0 Roadmap]: 데이터 보존(DATA-05/06/07)은 Phase 5에, 그것도 엔진 작업보다 먼저 — 강사 콘텐츠 손실은 복구 비용이 가장 크다. v1 픽스처(저장 데이터·백업 파일) 테스트가 선행 조건.
- [v2.0 Roadmap]: Phase 6의 말은 임시 말이고 Phase 7에서 치비 캐릭터로 교체한다. 3D 공간 안에는 한글 텍스트를 두지 않는다(글자는 모두 DOM, STAB-04).
- [v2.0 Roadmap]: 동물 선택(SETUP-07)은 데이터 모델 교체(boy/girl → animal) 때문에 Phase 5에서 처리하고, 실제 3D 동물 모습은 Phase 7에서 입힌다. 점수판 정렬·대응(HUD-01)은 Phase 6, 동물 아이콘화는 Phase 7.
- [v2.0 Roadmap]: 같은 칸 다중 말 구분(BOARD-05)은 캐릭터 크기에 좌우되므로 Phase 7.
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
- [Phase 05]: 05-01: Teacher settings live in separate persist key powerjumping_settings_v1 with per-field Zod .catch recovery; never in content backup (D-04, DATA-07)
- [Phase 05]: 05-01: Content-format tripwire (persist name/version, partialize keys, schema key sets) in src/dataPreservation.test.ts guards every later full vitest gate
- [Phase 05]: 05-02: Start bonus judged only in ring.moveBy; lapsCredited always raised to max(lap) even when the per-turn cap blocks payment (D-09, A1)
- [Phase 05]: 05-02: buildBoard stores event copies, uses only weight>0 events, square 1 = easiest available difficulty (A2), throws on zero missions
- [Phase 05]: 05-03: v2 FSM lives in new files state.ts/game.ts; v1 engine.ts/types.ts/placement.ts untouched until 05-05
- [Phase 05]: 05-03: Deck draw from the end, empty deck refills from pool snapshot, retryNew refills at most once
- [Phase 05]: 05-03: forward/backward event with steps 0 does not move and resolves on the event tile
- [Phase 05]: 05-03: rounds-complete keeps round = rules.rounds; finish clears card+undo, keeps lastMove
- [Phase 05]: 05-04: labels.ts is the single source of Phase 5 UI copy; emoji/Korean animal names live only in the UI module
- [Phase 05]: 05-04: AnimalPicker never disables the row's own current value even if it appears in taken

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

v1.0 시기의 항목(요구사항 개수 표기, 이벤트 확률 UX, R3F vs 바닐라, 승리 조건)은 v1.0 완료로 해소되어 정리함.

- [Phase 5]: discuss-phase에서 확정할 정책 — "한 번 더"를 마지막 라운드 마지막 플레이어에게 허용할지, 판정 되돌리기 범위(직전 1회 스냅샷이면 충분한지), 예상 소요 시간 계산식(참가자 × 라운드 × 약 45초 가정).
- [Phase 5]: 강사 설정은 별도 persist 키에 저장하고 콘텐츠 스키마 버전은 올리지 않는 방향(DATA-07: 백업 파일에 설정 미포함). 그래도 v1 픽스처 테스트는 필수 — 현재 `store.ts`의 identity `migrate`는 버전 상향 시 강사 미션을 시드로 덮어쓸 수 있다.
- [Phase 6]: 연구 플래그 — iOS Safari WebGL 컨텍스트 손실 복구(`<Canvas key>` 리마운트, R3F v9 내부 동작)와 세로 화면 카메라 맞춤은 공식 문서가 없어 실기기 스파이크 필요.
- [Phase 7]: 연구 플래그 — 코드로 만든 캐릭터의 "귀여움"은 디자인 스파이크/스케치 권장(견본보다 확실히 더 귀엽게). 동물 종 수(6~8종) 확정, 8인 드로우콜 예산(약 150, 추정) 실측.
- [Phase 8]: 연구 플래그 — 3D 앵커 → DOM 점수판 별 비행 좌표 정합(리사이즈·safe-area) 짧은 스파이크.
- [Phase 8]: STAB-03 실기기 UAT(iPhone·iPad Safari)가 완료 조건 — 강사(사용자) 기기 확인 일정 필요.

### Roadmap Evolution

- Phase 3.1 inserted after Phase 3: 3D→2D 렌더링 전환 & CC0 에셋 파이프라인 (사용자 결정 2026-07-26) (URGENT)
- 2026-10-22: v2.0 로드맵 작성 — Phases 5–8 (5 새 규칙 엔진 & 강사 설정 → 6 3D 순환판 & 게임 화면 → 7 치비 동물 캐릭터 & 표정 → 8 퀘스트 성공 연출 & 시상식 & 마감), 요구사항 49/49 매핑

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

Last session: 2026-10-22T17:55:15.989Z
Stopped at: Completed 05-02-PLAN.md
Resume file: None
