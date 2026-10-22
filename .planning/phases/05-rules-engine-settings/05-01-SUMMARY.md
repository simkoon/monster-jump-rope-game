---
phase: 05-rules-engine-settings
plan: 01
subsystem: data-preservation, settings, editor-ui
tags: [zustand-persist, zod, vitest, react, tripwire]
status: complete

requires:
  - phase: 01-02 (v1 content store / io)
    provides: "powerjumping_content_v1 persist store, ContentSchema, importContent/exportContent"
provides:
  - "v1 raw fixtures + boot-simulation tests (DATA-05) and hash-free content-format tripwire (D-04)"
  - "v1 formal / field-missing backup import tests (DATA-06)"
  - "src/settings.ts: useSettings persist store on separate key powerjumping_settings_v1 with per-field Zod recovery (DATA-07)"
  - "Editor ⚙️ 설정 tab (SettingsTab + Stepper) for CFG-01~04"
affects: [05-02, 05-03, 05-04, 05-05, game engine snapshot of settings, start screen rounds default]

tech-stack:
  added: []
  patterns:
    - "Boot tests: localStorage raw → vi.resetModules() → dynamic import('./store') (never static import in that file)"
    - "Settings store: separate persist key, partialize 4 fields, merge = SettingsSchema.safeParse → per-field .catch recovery"
    - "Numeric settings through string-only SegmentedControl: string option values + Number() in exactly one onChange"

key-files:
  created:
    - src/test/fixtures/v1.ts
    - src/dataPreservation.test.ts
    - src/settings.ts
    - src/settings.test.ts
    - src/components/Stepper.tsx
    - src/components/SettingsTab.tsx
    - src/components/SettingsTab.test.tsx
  modified:
    - src/lib/io.test.ts
    - src/components/Tabs.tsx
    - src/App.tsx
    - src/App.test.tsx
    - src/styles/index.css

key-decisions:
  - "Settings merge returns in-memory current on non-object payloads (as planned); since boot state is DEFAULT_SETTINGS this yields defaults"
  - "setDefaultRounds maps non-finite input to DEFAULT_ROUNDS (5) before clamping to 1..20"
  - "Stepper root uses role=group with aria-label = valueLabel; value rendered in non-editable <output aria-live=polite>"

patterns-established:
  - "Content-format tripwire in src/dataPreservation.test.ts guards every later full vitest gate"

requirements-completed: [DATA-05, DATA-06, DATA-07, CFG-01, CFG-02, CFG-03, CFG-04]

coverage:
  - id: D1
    description: "v1 device storage boots unchanged, first edit keeps all v1 records, minimal/corrupt raw handled, storage not rewritten on hydrate"
    requirement: DATA-05
    verification:
      - kind: unit
        ref: "src/dataPreservation.test.ts#v1 기기 저장분 부팅 (DATA-05)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Content storage contract tripwire (persist name/version, partialize keys, SCHEMA_VERSION, schema key sets)"
    requirement: DATA-05
    verification:
      - kind: unit
        ref: "src/dataPreservation.test.ts#콘텐츠 저장 계약 tripwire (D-04)"
        status: pass
    human_judgment: false
  - id: D3
    description: "v1 formal export file and field-missing old backup both import through confirm with defaults filled"
    requirement: DATA-06
    verification:
      - kind: unit
        ref: "src/lib/io.test.ts#v1 백업 파일 가져오기 (DATA-06)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Settings persisted on separate key with per-field recovery; import and export never touch settings"
    requirement: DATA-07
    verification:
      - kind: unit
        ref: "src/settings.test.ts"
        status: pass
      - kind: automated_ui
        ref: "src/components/SettingsTab.test.tsx#내보내기 파일에 설정이 들어가지 않는다 (DATA-07)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Editor ⚙️ 설정 tab: fail rule 3-way, rounds stepper 1..20, start bonus 끔/+1/+2, board 16/20/24, instant save, in-progress banner"
    requirement: CFG-01
    verification:
      - kind: automated_ui
        ref: "src/components/SettingsTab.test.tsx#SettingsTab (S1, D-23, CFG-01~04)"
        status: pass
      - kind: automated_ui
        ref: "src/App.test.tsx#편집기 ⚙️ 설정 탭 (D-23)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Settings tab visual fit (editor scale, 48px stepper, ≤560px fail-rule stacking, dark theme)"
    verification: []
    human_judgment: true
    rationale: "Layout/visual polish against UI-SPEC S1 needs an eyes-on check; deferred to end-of-phase human verify"

duration: 4min
completed: 2026-10-23
---

# Phase 5 Plan 01: v1 데이터 보존 고정 + 강사 설정 저장소·⚙️ 설정 탭 Summary

v1 강사 데이터 보존을 원문 픽스처 부팅 테스트와 커밋 해시와 무관한 tripwire로 먼저 고정했다. 그다음 별도 persist 키(`powerjumping_settings_v1`)에 Zod 필드별 복구를 거는 설정 스토어를 만들고, 편집기 ⚙️ 설정 탭(실패 규칙·기본 라운드·출발 보너스·보드 크기)을 붙였다.

## Performance

- **Duration:** 약 4분
- **Started:** 2026-10-22T17:32:31Z
- **Completed:** 2026-10-22T17:36:27Z
- **Tasks:** 3
- **Files modified:** 12 (7개 생성, 5개 수정)

## Accomplishments
- `src/test/fixtures/v1.ts`: v1 콘텐츠, localStorage 원문(전체·필드 누락), 백업 파일 원문(정식·구형)
- `src/dataPreservation.test.ts`: `vi.resetModules()`와 동적 import로 부팅 테스트 4개(a~d), tripwire 1개(e), 설정 스토어 부팅 격리 1개
- `src/lib/io.test.ts`: DATA-06 `it.each` 2건 추가 (정식 내보내기·필드 누락 구형)
- `src/settings.ts`: `FailRule`, `SettingsSchema`(필드별 `.catch` 4개), `DEFAULT_SETTINGS` = retrySame/5/1/20, `useSettings`(라운드 클램프, partialize 4필드, merge에서 throw 없음)
- `Stepper` + `SettingsTab` 추가, `Tabs`에 세 번째 탭 `⚙️ 설정` 추가, `App`에서 분기, `index.css`에 토큰만 쓰는 "Phase 5 — 설정 탭" 섹션 추가
- 전체 게이트 결과: `npx tsc -b` 통과, `npx vitest run` 26개 파일·218개 테스트 통과(기존 183개 + 새 35개), `npm run build` 통과

## Task Commits

1. **Task 1: v1 보존 픽스처, 부팅·tripwire·백업 가져오기 테스트** — `b38a216` (test)
2. **Task 2: 강사 설정 persist 스토어** — `4f3296b` (test, RED) → `ebf87e9` (feat, GREEN)
3. **Task 3: ⚙️ 설정 탭, 스텝퍼, 탭·앱 연결, 백업 미포함 테스트** — `d37e1c9` (test, RED) → `3e83675` (feat, GREEN)

## Content-format gate record (D-04)

커밋할 때마다 `git diff --exit-code HEAD -- src/store.ts src/schema.ts src/lib/io.ts`를 돌렸고 매번 통과(GATE_OK)했다. Task 3은 `src/components/SegmentedControl.tsx`도 함께 확인했다. 이 계획에서 네 파일은 한 글자도 바뀌지 않았다.

## Files Created/Modified
- `src/test/fixtures/v1.ts`: v1 원문 픽스처. id는 시드와 겹치지 않음
- `src/dataPreservation.test.ts`: DATA-05 부팅, tripwire, 설정 부팅 격리 테스트
- `src/settings.ts`: 강사 설정 스토어. React·store·io import 없음
- `src/settings.test.ts`: 스키마 복구, 액션, 저장·rehydrate, 가져오기 후 설정 불변 테스트
- `src/components/Stepper.tsx`: −/`<output>`/+ 스텝퍼. 끝값에서 버튼 disabled
- `src/components/SettingsTab.tsx`: S1 화면. 문구는 UI-SPEC 문구표와 같음
- `src/components/SettingsTab.test.tsx`: S1 동작 테스트와 내보내기 키 4개 회귀 테스트
- `src/lib/io.test.ts`: DATA-06 케이스 추가. 기존 테스트는 손대지 않음
- `src/components/Tabs.tsx`: `TabKey`에 `'settings'` 추가, `⚙️ 설정` 탭(개수 알약 없음)
- `src/App.tsx`: 편집기 패널에 3분기 렌더 추가
- `src/App.test.tsx`: 설정 탭 진입 테스트 1개 추가
- `src/styles/index.css`: `.settings-*`, `.stepper` 규칙 추가. 기존 규칙은 그대로

## Decisions Made
- merge는 계획대로 비객체 payload를 받으면 `current`를 돌려준다. 부팅 시점 상태가 DEFAULT_SETTINGS라서 결과는 전부 기본값이다. 이에 맞춰 "state:null" 테스트는 부팅 상태(기본값)에서 rehydrate하는 상황으로 작성했다.
- `setDefaultRounds`는 NaN이나 Infinity가 들어오면 5로 처리한다(계획 명시사항).
- "토스트 없음"은 `useToastStore.seq`가 늘지 않는지로 단언했다. 렌더 트리에 Toast가 없으면 DOM 검사로는 의미가 없기 때문이다.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] tripwire의 partialize 반환 타입 오류(tsc)**
- **Found during:** Task 1
- **Issue:** `getOptions().partialize!()`의 반환 타입이 `unknown`이라 `Object.keys`에서 TS2769 발생
- **Fix:** 결과를 `Record<string, unknown>`으로 좁혀 변수에 담은 뒤 키 비교
- **Files modified:** src/dataPreservation.test.ts
- **Commit:** b38a216

**2. [Rule 1 - Bug] 설정 테스트가 계획한 merge 동작보다 엄격함**
- **Found during:** Task 2 GREEN
- **Issue:** 처음 쓴 테스트는 기본값이 아닌 in-memory 상태에서 `"state":null`로 rehydrate하면 기본값으로 돌아간다고 기대했다. 계획한 merge는 실패 시 `current`를 유지한다.
- **Fix:** 부팅 시점 상태(기본값)에서 rehydrate해도 throw 없이 기본값이 유지되는지를 단언하도록 테스트를 고침. 구현은 계획 그대로 둠.
- **Files modified:** src/settings.test.ts
- **Commit:** ebf87e9

## Known Stubs

없음. 설정 값은 아직 게임 엔진에서 읽지 않는다. 엔진이 설정 스냅샷을 쓰는 작업은 이후 계획(05-02~05-05)의 범위다.

## TDD Gate Compliance

Task 2: `test(...)` 4f3296b → `feat(...)` ebf87e9. Task 3: `test(...)` d37e1c9 → `feat(...)` 3e83675. 두 태스크 모두 RED 단계에서 실패를 확인했다(모듈 없음 또는 탭 없음).

## Issues Encountered
없음.

## Next Phase Readiness
- `useSettings`, `DEFAULT_SETTINGS`, `FailRule`, `ROUNDS_MIN`/`ROUNDS_MAX`/`DEFAULT_ROUNDS`, `StartBonusValue`, `BoardSizeValue`를 엔진과 시작 화면에서 쓸 수 있다.
- 이후 계획도 전체 vitest 게이트를 돌릴 때마다 콘텐츠 형식 tripwire가 다시 실행된다.

## Self-Check: PASSED
