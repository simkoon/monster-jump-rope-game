# Phase 8: success-fx-awards - Pattern Map

**Mapped:** 2026-10-24
**Files analyzed:** 38 (new 19, modified 18, deleted 1)
**Analogs found:** 36 / 38

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/engine/state.ts` (+ `PlayerStats`, `GameStateCore.stats`) | model | - | itself L97-112 | exact |
| `src/engine/stats.ts` (NEW, pure) | utility | transform | `src/engine/scoring.ts` (whole, 39 lines) | exact |
| `src/engine/game.ts` (createGame/judge/rollDice bump stats) | service (pure reducer) | transform | itself L103 / L143 / L257 | exact |
| `src/engine/fuzz.test.ts` (+ stats invariants) | test | - | itself | exact |
| `src/game/awards.ts` (NEW, pure) | utility | transform | `src/engine/scoring.ts` `rankByStars` L27-39 | role-match |
| `src/game/director/timeline.ts` (STARS_MS, starsBeatMs, miss.retry, isBannerBeat) | utility (pure) | transform | itself L12-26, L97-102, L128-135 | exact |
| `src/game/director/successPlan.ts` (NEW, pure) | utility (consts) | transform | `director/timeline.ts` `BEAT_MS` + contract header L1-7 | role-match |
| `src/game/layout/project.ts`, `headAnchor.ts`, `fxMotion.ts`, `podiumLayout.ts` (NEW, pure) | utility | transform | `layout/charMotion.ts` header L1-17 + `layout/fitCamera.ts` | role-match |
| `src/game/layout/charMotion.ts` (successPose tiered) | utility (pure curves) | transform | itself L71 `successPose`, L155 `actPose` | exact |
| `src/game/sfx/recipes.ts` (NEW, pure data) | config | - | `game/palette.ts` const tables | partial |
| `src/game/sfx/sfx.ts` (NEW) | service (AudioContext) | event-driven | none (no Web Audio in repo) — `reducedMotion.ts` guard style | none |
| `src/game/sfx/useSfx.ts` (NEW) | hook (store subscriber) | pub-sub | `director/useDirector.ts` (subscribe outside render) | role-match |
| `src/game/hud/StarFlight.tsx` (NEW, portal) | component | event-driven | `hud/Banner.tsx` (beat selector + key=beat.id) | role-match |
| `src/game/hud/CeremonyView.tsx` (NEW, replaces ResultView) | component | request-response | `hud/ResultView.tsx` (whole) | exact |
| `src/game/hud/DomPodium.tsx` (NEW) | component | - | `hud/ResultView.tsx` standings `<ol>` L40-46 + `Scoreboard.tsx` `--pc` L36-40 | role-match |
| `src/game/hud/SoundToggle.tsx` (NEW) | component | request-response | `ResultView.tsx` buttons L48-55 + `useSettings` selector | role-match |
| `src/game/hud/Banner.tsx` | component | event-driven | itself | exact |
| `src/game/hud/Scoreboard.tsx` (`data-pid`, `is-hit`) | component | - | itself L32-40 | exact |
| `src/game/hud/ResultView.tsx` | DELETE (tests move to CeremonyView) | - | - | - |
| `src/game/useSkipOnTap.ts` (NEW) | hook | event-driven | `game/useInputLock.ts` | role-match |
| `src/game/useInputLock.ts` (+ shared `lockInputFor`) | hook | - | itself | exact |
| `src/game/scene/FxPools.tsx` (NEW, lazy) | component (3D, instanced) | batch | `scene/Board.tsx` star InstancedMesh L116-120, L217-, L261-264 | exact |
| `src/game/scene/Podium.tsx` (NEW) | component (3D) | - | `scene/Board.tsx` base geos + `actorGeometries.ts` singletons | role-match |
| `src/game/scene/CameraRig.tsx` (+shake, +ceremony framing) | component (3D) | - | itself | exact |
| `src/game/scene/SceneContents.tsx` (+mode, visible toggle) | component | - | itself L34-70 | exact |
| `src/game/scene/Character.tsx` (tiered success, ceremony stand) | component (3D beat consumer) | event-driven | itself L100- useFrame | exact |
| `src/game/scene/GameCanvas.tsx` (ContactShadows visible, DEV renderInfo) | component | - | itself L81-88 | exact |
| `src/game/GameStage.tsx` (ceremony mode) | component | request-response | itself L100-200 | exact |
| `src/game/GameApp.tsx` (gameOver → GameStage) | component (router) | - | itself | exact |
| `src/game/labels.ts` (bannerCopy, badge copy, aria) | utility | transform | itself L200 `BannerTone`, `bannerCopy` | exact |
| `src/game/palette.ts` (+ `FX_COLOR`) + test | config | - | itself `CHAR_COLOR` L80 / `LIGHTS` L99 | exact |
| `src/settings.ts` (+ `soundOn`) | store (persist) | CRUD | itself | exact |
| `src/components/SettingsTab.tsx` (효과음 group) | component | CRUD | itself L67-78 (settings-group) | exact |
| `src/game/styles/game.css` (Phase 8 block) | config (CSS) | - | existing `.beat-banner--*` / `.sb-cell` blocks | exact |
| `soak.html` + `src/soak.tsx` (NEW, dev only) | entry | - | `gallery.html` + `src/gallery.tsx` | exact |
| `src/game/sourceGuard.test.ts` (new modules) | test | - | itself | exact |
| `public/assets/cc0/LICENSE.md` (sound notice) | doc | - | itself | exact |

## Pattern Assignments

### `src/engine/stats.ts` (pure) — analog `src/engine/scoring.ts`

Contract header to copy verbatim (L1-5):
```ts
// PHASE 5 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of src/store.ts / src/settings,
//   - CLOCK-FREE (no wall-clock reads, no timers), and
//   - pure: inputs are never mutated; results are new arrays/objects.
import type { Difficulty } from '../schema';
```
Small exported pure functions + `as const` tables (L8-13): `export const STARS_BY_DIFF = { easy: 1, normal: 2, hard: 3 } as const;`. `bump(stats, pid, key)` must return a new object (spread), never mutate.

### `src/engine/state.ts` — add `stats` to `GameStateCore` (L97-112)
`GameStateCore` is what undo snapshots store (`UndoSnapshot = GameStateCore`, L114), so putting `stats` there makes undo restore stats automatically. Add `stats: Record<string, PlayerStats>` next to `winners`/`endReason`.

### `src/engine/game.ts`
- `createGame` (L103): initialize `stats` from `config.participants` like `participants` mapping L105-110.
- `judge` (L257-263): `undo = snapshotOf(state)` is captured BEFORE the verdict — bump stats after it.
- `rollDice` (L143-149): bump lucky-event counters where the event resolves.

### `src/game/awards.ts` — analog `rankByStars` (`scoring.ts` L27-39)
Stable sort via `map((item, idx) => ({item, idx}))` + tie-break `a.idx - b.idx`; returns new array. Same purity header. `displayBadges` = priority list slice (UI-SPEC §F7).

### `src/game/director/timeline.ts` (exact)
Current pieces to replace:
```ts
// L20
  stars: 900, // D-12 ...
// L100-101
if (e.success) out.push({ kind: 'stars', pid: e.pid, stars: e.stars, ms: BEAT_MS.stars });
else out.push({ kind: 'miss', pid: e.pid, ms: BEAT_MS.miss });
// L128-129
export const isBannerBeat = (beat: BeatSpec): boolean =>
  beat.kind === 'startBonus' || beat.kind === 'event' || beat.kind === 'stars' || beat.kind === 'finalRound';
```
Replace with RESEARCH Pattern 1 (`STARS_MS`, `STARS_MS_REDUCED`, `starTier`, `starsBeatMs`, `miss.retry` from a same-transition `questDrawn attempt 2`), add `retry: boolean` to the `miss` BeatSpec union member (L52), add `'miss'` to `isBannerBeat`. `ctx.reducedMotion` already exists on `TimelineCtx` (L61). Note the existing `motion()` helper (L69) collapses to 0 — stars must NOT use it (1200 ms under reduced motion).

### `src/game/director/successPlan.ts` (NEW)
Copy the timeline.ts contract header L1-7 (no React/DOM/settings, clock-free, pure). Shape: `export const SUCCESS_PLAN = { 1: {...}, 2: {...}, 3: {...} } as const` keyed by `StarTier` imported from `./timeline`; every consumer (Banner, StarFlight, FxPools, Character, CameraRig, useSfx) reads it.

### `src/game/layout/{project,headAnchor,fxMotion,podiumLayout}.ts` — analog `layout/charMotion.ts` L1-17
```ts
// PHASE 7 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of any runtime import of three / @react-three/*
//     (main-chunk safety — the curves are unit-tested in jsdom),
//   - CLOCK-FREE: time always arrives as a parameter (u = beat progress, tSec = idle clock,
//     dt = frame delta); no wall-clock reads, no timers, and
//   - pure: every call returns a new Pose and never mutates its inputs.
```
`project.ts` may only take `import type` from three (a matrix array param), never a runtime import. Easings already exported in charMotion L59-61 (`easeOutCubic`, `easeInOutCubic`, `easeInOutSine`) — reuse, do not duplicate.

### `src/game/layout/charMotion.ts`
`successPose(u)` L71 and `actPose(act, u)` L155 → add tier param (heights 0.55/0.65/0.75) and switch progress to `landMs` basis; keep REST at both ends (header L8-11). `Act` union L19 gains `'stand' | 'celebrate'` for ceremony.

### `src/game/sfx/useSfx.ts` — subscribe outside render like `useDirector`
Read `usePresentation.getState()`/`subscribe` (store in `src/game/usePresentation.ts`), react to `current` changes by kind (`stars`, `miss`, `startBonus`, `event`, `win`), gate on `useSettings((s) => s.soundOn)`. Never call `completeBeat` (Banner owns timed beats).

### `src/game/sfx/sfx.ts` (no analog)
Use RESEARCH Web Audio pattern. Copy only the environment guard style of `src/game/reducedMotion.ts`:
```ts
if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
```
→ `typeof AudioContext === 'undefined'` → no-op (jsdom safe).

### `src/game/hud/Banner.tsx` (exact)
Keep the timer/complete pattern (L20-25):
```ts
useEffect(() => {
  if (!beat) return;
  const id = beat.id;
  const timer = setTimeout(() => usePresentation.getState().completeBeat(id), beat.ms);
  return () => clearTimeout(timer);
}, [beat]);
```
Class composition L33: `beat-banner beat-banner--${copy.tone}${copy.variant ? ...}` — add tier class `beat-banner--tier{n}` and `soft` tone. Delayed stars entry (`bannerMs`) = second state/timeout; render null until then but the completion timer still starts at beat start. `style={{ '--beat-ms': ... } as CSSProperties}` L35 pattern for CSS vars.

### `src/game/hud/StarFlight.tsx` (NEW) — analog Banner
Same selector form: `usePresentation((s) => (s.current?.kind === 'stars' ? s.current : null))`, `key={beat.id}`, `aria-hidden`, `createPortal(..., document.body)` (no existing portal in repo). Target found via `document.querySelector(`[data-pid="${pid}"]`)` → needs Scoreboard change. Must NOT complete the beat.

### `src/game/hud/Scoreboard.tsx` (L32-40)
```tsx
const cls = ['sb-cell', crowned && 'is-leader', item.id === currentId && 'is-current'].filter(Boolean).join(' ');
<li key={item.id} className={cls} style={{ '--pc': ANIMAL_COLOR[item.animal] } as CSSProperties} ...>
```
Add `data-pid={item.id}` and `'is-hit'` into the same filter array.

### `src/game/hud/CeremonyView.tsx` (NEW) — analog `hud/ResultView.tsx` (whole file)
Copy: store read + null guard (L20-21), `REASON_COPY` (L12-15), winner line single/co-winner (L28-29), `rankByStars` list (L40-46), action buttons (L48-55):
```tsx
<button type="button" className="game-btn" onClick={() => useGameStore.getState().restart()}>🔁 다시 하기</button>
<button type="button" className="game-btn--sm" onClick={() => useGameStore.getState().reset()}>처음으로</button>
```
Names as JSX text only (header L5, T-05-15). Winner line `role="status"`. Buttons and SoundToggle carry `data-skip-ignore`.

### `src/game/hud/DomPodium.tsx` / `SoundToggle.tsx`
DomPodium: `--pc` inline var per participant from `ANIMAL_COLOR` as in Scoreboard L38. SoundToggle: `const soundOn = useSettings((s) => s.soundOn)` + `useSettings.getState().setSoundOn(!soundOn)`, `aria-label` from labels.ts, `data-skip-ignore`.

### `src/game/useInputLock.ts` / `useSkipOnTap.ts`
Existing guard (L18-29) uses a per-hook `useRef(lockedUntil)`. To share with skip, hoist to module scope:
```ts
let lockedUntil = Number.NEGATIVE_INFINITY;
export const lockInputFor = (ms: number) => { lockedUntil = Math.max(lockedUntil, performance.now() + ms); };
```
and keep `useInputLock` reading it (`if (now < lockedUntil) return;`). Keep the wall-clock-confined comment (L10-11). `useSkipOnTap`: `useEffect` adding `document.addEventListener('click', h, true)` + `keydown` Escape, skip when `target.closest('[data-skip-ignore]')`, call `usePresentation.getState().skipAll()` then `lockInputFor(SKIP_LOCK_MS)`; cleanup removes both.

### `src/game/scene/FxPools.tsx` (NEW) — analog `scene/Board.tsx`
Fixed-capacity InstancedMesh JSX (L261-264):
```tsx
<instancedMesh ref={starRef} name="tile-stars" args={[GEO.star, MAT.star, STAR_CAP]} dispose={null} />
```
Commit helper (L116-120, exported — import it):
```ts
export function commit(mesh: InstancedMesh, count: number): void {
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}
```
Frame loop (L217-224): `const d = Math.min(delta, 0.25);` and read `usePresentation.getState()` inside `useFrame` ("never a stale render closure"), `reduced` from `prefersReducedMotion()` memoized once (Character.tsx L71). Scratch `Object3D` reuse as in `writeStars` L75-97. Positions from `fxMotion.ts`.

### `src/game/scene/Podium.tsx` (NEW)
Geometry singletons in module scope like `actorGeometries.ts`/`geometries.ts`; colors from `palette.ts` only; `visible` prop toggle, no remount.

### `src/game/scene/CameraRig.tsx` (whole, 34 lines)
Keep `useLayoutEffect` fit (L17-31). Shake = add `useFrame` that offsets from the fitted base pose (store fit in a ref) only during a ⭐3 `stars` beat and not when reduced; restore exact base after. Ceremony = `mode` prop choosing `podiumLayout` framing instead of `boardExtents(layout)`; then `invalidate()`.

### `src/game/scene/SceneContents.tsx` (L34-70)
`winBeat` selector pattern L40: `usePresentation((s) => (s.current?.kind === 'win' ? s.current : null))`. Add `mode: 'play' | 'ceremony'` to `SceneProps` (L26-31); wrap `<Board>`, `<Dice>`, `<PathPreview>` in a `<group visible={mode === 'play'}>` (never conditional unmount); mount `<FxPools/>` and `<Podium visible={mode==='ceremony'}/>`.

### `src/game/scene/Character.tsx` (L60-140)
Beat detection inside `useFrame` (L100-106) via `usePresentation.getState().current`; reactions use `source`/`actT` refs (L79-84). Add tier from `successPlan` for `stars` beats and ceremony stand/celebrate poses by podium slot position.

### `src/game/scene/GameCanvas.tsx`
`<ContactShadows ...>` L88 → `visible={mode === 'play'}`; DEV-only `if (import.meta.env.DEV) (window as any).__pjRenderInfo = gl.info` in onCreated.

### `src/game/GameApp.tsx` / `GameStage.tsx`
GameApp currently: `if (game.phase === 'gameOver' && !busy) return <ResultView />;` — remove that branch, always `<GameStage />` when game exists. GameStage: `over = phase === 'gameOver'` (L125) already exists; derive `ceremony = over && !busy`, pass `mode` into `canvasProps` (L134-142), add `stage--ceremony` to `<div className="game-stage stage">` (L163), render `<CeremonyView/>` in place of play HUD, `<StarFlight/>` next to `<Banner />` (L193), mount `useSkipOnTap()` and `useSfx()`. Keep `endNow` (L147-150) semantics.

### `src/game/labels.ts`
`BannerTone` L200 add `'soft'`; extend `bannerCopy` stars/miss cases. All new copy strings (badges, ceremony aria, sound toggle labels, settings hint) live here with tests in `labels.test.ts`.

### `src/game/palette.ts` (+test)
Add `export const FX_COLOR = { ... } as const` after `CHAR_COLOR` (L80) using only existing hexes; `palette.test.ts` asserts each equals an existing token.

### `src/settings.ts` (exact)
Four touch points: schema field with `.catch` (L22-27) `soundOn: z.boolean().catch(true)`; store interface + setter (L32-37, L46-52) `setSoundOn: (soundOn) => set({ soundOn })`; `partialize` (L58-63) add `soundOn: s.soundOn`. Keep `version: 1` — the `merge` safeParse (L66-69) already fills missing fields with defaults, so no migration needed.

### `src/components/SettingsTab.tsx` (L67-78)
```tsx
<div className="field settings-group">
  <label>미션에 실패하면</label>
  <SegmentedControl<FailRule> options={...} value={failRule} onChange={setFailRule} ariaLabel="실패 규칙" />
  <p className="hint">{...}</p>
</div>
```
Add a `효과음` group in same shape (SegmentedControl string options `'on'|'off'`, since it accepts strings only — L29 note).

### `soak.html` + `src/soak.tsx` — analog `gallery.html` + `src/gallery.tsx`
Copy both files' structure verbatim (title "파워점핑 · soak (dev)", `src="/src/soak.tsx"`), keep header rule: dev server only, not a `vite build` input, imported by no app module; add to sourceGuard rule (g).

### `src/game/styles/game.css`
Append a "Phase 8" block at file end; token vars + `color-mix` only; participant color via inline `--pc`; add every new animation into the existing `@media (prefers-reduced-motion: reduce)` block.

## Shared Patterns

### Purity contract headers
Source: `src/engine/scoring.ts` L1-5 (engine), `src/game/director/timeline.ts` L1-5 (director), `src/game/layout/charMotion.ts` L1-17 (layout). Apply to: stats.ts, awards.ts, successPlan.ts, all new layout/*.ts, sfx/recipes.ts.

### Beat consumption
Source: `src/game/usePresentation.ts`. Only the Banner completes timed beats (stars/miss/win); 3D and DOM effects read `current` and never call `completeBeat`. Watchdog = `ms + WATCHDOG_BUFFER_MS (500)`. Skip = `skipAll()` only.

### Frame-loop store reads
Source: `scene/Board.tsx` L217-224, `scene/Character.tsx` L100-104: `const d = Math.min(delta, 0.25); const store = usePresentation.getState();`.

### Reduced motion
Source: `src/game/reducedMotion.ts`, memoized once: `const reduced = useMemo(() => prefersReducedMotion(), []);` (Character.tsx L71).

### Visibility toggle, no remount
GameStage remount only via `canvasKey` (L100, L118-123). Ceremony switch uses `visible` props.

### Security
Names as JSX text only; CSS vars only computed values; no `dangerouslySetInnerHTML` / drei `Html` (ResultView header L5, Banner header L9-11).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/game/sfx/sfx.ts` | service | event-driven | No Web Audio code exists; use RESEARCH sfx pattern (AudioContext unlock, master gain + limiter, cleanup) |
| `createPortal` usage in `StarFlight.tsx` | component | - | No portal in repo; follow RESEARCH/React docs, Banner for beat selection |

## Metadata

**Analog search scope:** src/engine, src/game (director, hud, layout, scene), src/settings.ts, src/components, gallery.html
**Files scanned:** ~30
**Pattern extraction date:** 2026-10-24
