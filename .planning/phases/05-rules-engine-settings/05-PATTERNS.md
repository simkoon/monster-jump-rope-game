# Phase 5: 새 규칙 엔진 & 강사 설정 - Pattern Map

**Mapped:** 2026-10-22
**Files analyzed:** 30 (신규 13 / 수정·재작성 12 / 삭제 7 묶음)
**Analogs found:** 27 / 30

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/settings.ts` (신규) | store/config | persist CRUD | `src/store.ts` | exact |
| `src/settings.test.ts` (신규) | test | persist | `src/store.test.ts` | exact |
| `src/test/fixtures/v1.ts` (신규) | test fixture | file-I/O | `src/seed.ts` + `src/store.test.ts` helpers | partial |
| `src/dataPreservation.test.ts` (신규) | test | boot/persist | `src/store.test.ts`, `src/lib/io.test.ts` | role-match |
| `src/engine/ring.ts` (신규) | utility (pure) | transform | `src/engine/rng.ts` | role-match |
| `src/engine/scoring.ts` (신규) | utility (pure) | transform | `src/engine/rng.ts` / `setup.ts` | role-match |
| `src/engine/board.ts` (신규, placement 대체) | utility (pure) | transform+RNG | `src/engine/placement.ts` | exact |
| `src/engine/animals.ts` (신규) | utility (pure) | transform | `src/engine/setup.ts` | role-match |
| `src/engine/*.test.ts` (ring/board/animals/fuzz) | test | — | `src/engine/engine.test.ts`, `rng.test.ts` | exact |
| `src/engine/types.ts` (수정) | model | — | 자기 자신 | exact |
| `src/engine/engine.ts` (재작성 FSM) | service (pure FSM) | event-driven/immutable | 자기 자신 (v1 FSM) | exact |
| `src/engine/setup.ts` (수정) | utility | transform | 자기 자신 | exact |
| `src/harness/useGameStore.ts` (재작성) | store/seam | request-response | 자기 자신 | exact |
| `src/components/Tabs.tsx` (수정) | component | — | 자기 자신 | exact |
| `src/components/SettingsTab.tsx` (신규) | component (editor) | CRUD(autosave) | `src/components/EventTab.tsx` | role-match |
| `src/components/Stepper.tsx` (신규) | component | controlled input | `src/components/SegmentedControl.tsx` | role-match |
| `src/App.tsx` (수정) | shell | — | 자기 자신 (L51-61) | exact |
| `src/game/hud/SetupView.tsx` (수정) | component | form | 자기 자신 | exact |
| `src/game/hud/AnimalPicker.tsx` (신규) | component | controlled input | `SegmentedControl.tsx` | role-match |
| `src/game/PlayView.tsx` (재작성 임시 DOM) | component | store-driven | 현 `PlayView.tsx` + `ControlsBar.tsx` | role-match |
| `src/game/hud/TurnHud.tsx`, `ControlsBar.tsx`, `MissionOverlay.tsx`, `DiceResultPanel.tsx`, `ResultView.tsx` (수정) | component | store-driven | 자기 자신 | exact |
| `src/game/hud/Scoreboard.tsx` (신규 임시) | component | read-only list | `PositionReadout.tsx` (삭제 대상) | exact |
| `src/game/hud/RingStrip.tsx` (신규 임시) | component | read-only list | `PositionReadout.tsx` | partial |
| `src/game/styles/game.css`, `src/styles/index.css` (수정) | config(css) | — | 기존 `.seg`, `.game-btn`, `.game-count-ctl` | exact |
| 삭제: `scene/BoardScene.tsx`, `boardLayout.ts`, `moveHighlight.ts`, `animation.ts`, `PositionReadout.tsx`, `engine/placement.ts` + 각 test | — | — | RESEARCH L558-583 표 | n/a |

## Pattern Assignments

### `src/settings.ts` (store, persist) — Analog `src/store.ts`

**헤더 계약 + imports** (L1-6): React/DOM import 금지 주석 유지.
```ts
// PHASE 2 CONTRACT: this file MUST stay free of any React/DOM imports.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
```
**persist 옵션 + Zod read-guard** (L76-97) — 새 키 이름(`powerjumping_settings_v1` 등)으로 복제. 단, 설정은 필드별 `.catch(default)`로 복구(RESEARCH Pattern 2, L291-340):
```ts
{
  name: 'powerjumping_content_v1',
  storage: createJSONStorage(() => localStorage),
  version: SCHEMA_VERSION,
  partialize: (s) => ({ ... }),
  migrate: (persisted, _from) => persisted as Content,
  merge: (persisted, current) => {
    const parsed = ContentSchema.safeParse(persisted);
    if (!parsed.success) return current;
    return { ...current, ...parsed.data };
  },
  onRehydrateStorage: () => (_state, error) => {
    if (error) console.warn('[powerjumping] storage rehydrate failed; using seed', error);
  },
}
```
**액션 스타일** (L26-31): `set((s) => ({ ... }))` 불변 패치. `src/store.ts`·`schema.ts`는 **수정 금지**(D-04).

### `src/settings.test.ts`, `src/dataPreservation.test.ts` — Analog `src/store.test.ts`
리셋 헬퍼(L6-10):
```ts
function resetToSeed() {
  localStorage.clear();
  const s = seedContent();
  useStore.setState({ version: s.version, categories: s.categories, missions: s.missions, events: s.events });
}
```
부팅 테스트는 정적 import 스토어가 이미 수화됨 → `vi.resetModules()` + localStorage 원문 세팅 후 동적 `import('./store')`(RESEARCH Pitfall 1, L624). 가져오기 픽스처는 `src/lib/io.test.ts` 흐름 그대로.

### `src/engine/ring.ts`, `scoring.ts`, `animals.ts` — Analog `src/engine/rng.ts`
헤더 계약(L1-4) 복제:
```ts
// PHASE 2/3 CONTRACT: no React/DOM imports. Every random draw in the engine goes
// through an injected Rng — never a module-global Math.random
```
RNG 사용은 `import { type Rng, uniformPick, weightedPick } from './rng'` 주입형. 동물 이모지·한글명은 엔진에 두지 말고 UI(`AnimalPicker.tsx`)에(UI-SPEC L379).

### `src/engine/board.ts` — Analog `src/engine/placement.ts` (27줄; `placeEvents(events, boardLength, rng)` 시그니처)
같은 형태 `buildBoard(missions, events, boardSize, rng)` 순수 함수로. weight 0 제외는 `weightedPick` 재사용. 알고리즘은 RESEARCH Pattern 4(L383-422).

### `src/engine/engine.ts` (FSM 재작성) — Analog 자기 자신 (L1-60)
헤더(L1-9) 유지: 불변 전이, 시계 없음, store import 금지. 전이 패턴:
```ts
function withPosition(state: GameState, pos: number): GameState {
  const participants = state.config.participants.map((p, i) =>
    i === state.currentIndex ? { ...p, position: pos } : p,
  );
  return { ...state, config: { ...state.config, participants } };
}
export function drawCard(state: GameState, missions: Mission[], rng: Rng): GameState {
  const mission = uniformPick(missions, rng);
  if (!mission) return state;
  return { ...state, card: { mission }, phase: 'awaitingJudgement' };
}
```
새 FSM: `awaitingRoll → awaitingJudgement → turnResolved → gameOver`; 각 전이는 phase 가드로 no-op 반환(Pitfall 5).

### `src/engine/types.ts` — 자기 자신 (L7-61)
`Phase`에서 `awaitingDraw` 삭제, `Participant.character` → `animal: AnimalId`, `GameConfig`의 `boardLength/timeLimitMs` → `rounds/failRule/startBonus/boardSize`, `EndReason = 'rounds-complete' | 'manual'`, `GameState`에 stars/round/tiles/log/undo 추가. 목표 형태는 RESEARCH Pattern 5(L424-482). L63-64 re-export 유지.

### `src/engine/setup.ts` — 자기 자신
삭제: L7-15 (`BoardPreset`, `boardLengthFor`, `DEFAULT_TIME_LIMIT_MS`). 유지: `MAX_PARTICIPANTS`, `clampCount`, `buildParticipants` 팀 모델(L27-58) — `characters` 인자를 `animals: AnimalId[]`로 교체. `canStart`(L61-65) 반환형에 난이도 누락 안내 추가(D-13).

### `src/harness/useGameStore.ts` — 자기 자신
유일 seam 패턴(L46-50, L60-68) 유지:
```ts
function content(override?: ContentOverride): ContentOverride {
  if (override) return override;
  const s = useStore.getState();
  return { missions: s.missions, events: s.events };
}
startGame: (config, contentOverride) => {
  const { missions, events } = content(contentOverride);
  const gate = canStart(missions);
  if (!gate.ok) { set({ game: null, startBlockedReason: gate.reason ?? '지금은 시작할 수 없어요.' }); return; }
  const game = createGame(config, missions, events, systemRng());
  ...
```
액션 형태 `const g = get().game; if (!g) return; set({ game: transition(g, ...) })`. 삭제: `remainingMs`, `setRemainingMs`, `draw`, `end('timeout')`. 게임 시작 시 content+settings 스냅샷을 GameState에 저장(이후 액션은 라이브 `content()` 대신 스냅샷 사용).

### `src/components/Tabs.tsx` — 자기 자신 (L1-33)
`TabKey = 'mission' | 'event' | 'settings'`, 버튼 블록(L22-30) 복제, `cnt` span 없이 `⚙️ 설정`.

### `src/App.tsx` — L53-61
`{tab === 'mission' ? <MissionTab /> : <EventTab />}` → 3분기로 `<SettingsTab />` 추가. 부제 문구 교체 + `App.test.tsx` 단언 수정(UI-SPEC L359).

### `src/components/SettingsTab.tsx` — Analog `EventTab.tsx` (L1-22) + `SegmentedControl.tsx`
스토어 셀렉터 구독 패턴:
```ts
const events = useStore((s) => s.events);
const deleteEvent = useStore((s) => s.deleteEvent);
```
→ `useSettings((s) => s.failRule)` 등. 숫자 설정(startBonus 0/1/2, boardSize 16/20/24)은 SegmentedControl이 `T extends string`이므로 문자열 변환 한 곳에서(Pitfall 6):
```ts
<SegmentedControl options={[{value:'16',label:'16칸'},...]} value={String(boardSize)} onChange={(v) => set(Number(v))} ariaLabel="보드 크기" />
```

### `src/components/Stepper.tsx`, `src/game/hud/AnimalPicker.tsx` — Analog `SegmentedControl.tsx` (L1-46)
props 인터페이스 + `type="button"` + `aria-pressed` + `role="group"` 접근성 패턴 그대로. AnimalPicker는 다른 참가자가 고른 동물 `disabled`.

### `src/game/hud/SetupView.tsx` — 자기 자신 (L1-60)
유지: `setAt` 헬퍼(L25-29), mode/count/names/members state, `clampedCount`, `handleStart`의 memberNames 파싱. 삭제: `Character`, `preset`, `timeLimitOn`, `boardLengthFor`, `DEFAULT_TIME_LIMIT_MS` import. 추가: rounds(초깃값 `useSettings` 기본값), 예상 시간(참가자×라운드×45초 올림), 누락 안내, AnimalPicker.

### `src/game/hud/ControlsBar.tsx` 등 HUD — 자기 자신
phase 분기 + `busy` 게이트(L15-17) 유지, `awaitingDraw` 분기 삭제:
```ts
if (busy) return null;
if (phase === 'awaitingRoll') return (<div className="game-controls"><button type="button" className="game-btn" onClick={onRoll}>🎲 주사위 굴리기</button></div>);
```
지금 끝내기는 `ConfirmDialog`(props `open,message,confirmLabel,cancelLabel,onConfirm,onCancel`, 기본 포커스=취소) 재사용, 되돌리기 알림은 `showToast`.

## Shared Patterns

### 순수 엔진 계약
**Source:** `src/engine/engine.ts` L1-9, `rng.ts` L1-4 — 모든 `src/engine/*` 신규 파일 헤더에 복제. React/DOM/store/Date.now 금지, RNG 주입, 불변 반환.

### 엔진 테스트 (결정적 RNG)
**Source:** `src/engine/engine.test.ts` L1-30
```ts
const fixedRng = (v: number): Rng => ({ next: () => v });
const mission = (id: string): Mission => ({ id, name: id, desc: '', diff: 'easy', cats: [] });
function soloConfig(...): GameConfig { const ps = buildParticipants('solo', 1, ['P1'], ['boy']); ... }
```
→ `['bear']` 등 동물 id로, config 필드는 새 GameConfig로. 주사위 스크립트 RNG·손으로 만든 보드는 RESEARCH L657-700.

### Persist + Zod 가드
**Source:** `src/store.ts` L76-97 — settings 스토어에 적용(별도 키, 콘텐츠 키·버전 불변).

### 빌드 green 유지
`tsc -b`가 테스트까지 검사 → 삭제 파일의 test도 같은 계획에서 삭제. 확인 grep: `reached-finish|timeout'|timeLimitMs|remainingMs|awaitingDraw|boardLength|character|clampSquare|PositionReadout|BoardScene` 0건(RESEARCH L583).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/engine/ring.ts` 순환 수학(travel/lapsCredited) | utility | transform | 순환 보드 개념 신규 — RESEARCH Pattern 3 (L342-381) 사용 |
| `src/test/fixtures/v1.ts` 원문 문자열 | fixture | — | 원문 localStorage/백업 픽스처 없음 — RESEARCH Pattern 1 (L225-289) |
| undo 스냅샷/이벤트 로그 | engine | event-driven | 기존 없음 — RESEARCH Pattern 6 (L484-524) |

## Metadata
**Analog search scope:** `src/engine`, `src/harness`, `src/components`, `src/game`, `src/store*`
**Files scanned:** ~20
**Pattern extraction date:** 2026-10-22
