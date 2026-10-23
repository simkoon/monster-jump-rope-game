# Phase 7: chibi-characters - Pattern Map

**Mapped:** 2026-10-23
**Files analyzed:** 27 (new 14, modified 12, deleted 1)
**Analogs found:** 26 / 27

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/game/layout/chibiDims.ts` (NEW) | utility (pure consts) | transform | `src/game/scene/actorGeometries.ts` L27-42 (dimension block) + `layout/pawnSlots.ts` header | role-match |
| `src/game/layout/pawnSlots.ts` (rewrite) | utility (pure) | transform | itself (v1) | exact |
| `src/game/layout/pawnSlots.test.ts` (rewrite) | test | - | itself | exact |
| `src/game/layout/slotOcclusion.test.ts` (NEW) | test (projection) | transform | `layout/fitCamera.test.ts` + `layout/pawnSlots.test.ts` | role-match |
| `src/game/layout/charMotion.ts` (+test) (NEW) | utility (pure curves) | transform | `Pawn.tsx` L35-41, L95-99, L123-128 (inline hop/squash/bounce math) + `layout/diceFaces.ts` | role-match |
| `src/game/director/reaction.ts` (+test) (NEW) | utility (pure) | event-driven mapping | `director/timeline.ts` (pure contract header, BeatSpec switch) | role-match |
| `src/game/director/timeline.ts` (+test) | utility (pure) | transform | itself | exact |
| `src/game/director/displayed.test.ts` | test | - | itself | exact |
| `src/game/director/useDirector.ts` (+test) | hook | event-driven | itself (L39-43 gameEnded branch) | exact |
| `src/game/hud/Banner.tsx` (+ `hud6.test.tsx`, `hud.test.tsx`) | component | event-driven | itself | exact |
| `src/game/labels.ts` (+test) | utility | transform | itself `bannerCopy` L205-228 | exact |
| `src/game/GameStage.tsx` (+ `stage.test.tsx`, `App.test.tsx`) | component | request-response | itself L163, L167 | exact |
| `src/game/styles/game.css` | config (CSS) | - | existing `.beat-banner--*` blocks | exact |
| `src/game/palette.ts` (+test) | config (pure consts) | - | itself `ANIMAL_COLOR`/`ANIMAL_EYE` L12-33 | exact |
| `src/game/scene/chibiParts.ts` (NEW) | utility (three) | transform | `scene/actorGeometries.ts` L44-91 (`at`, `headZ`, `flat`, merge helpers) | exact |
| `src/game/scene/chibiSpecies.ts` (NEW) | model (geometry singletons) | batch | `scene/actorGeometries.ts` `ACTOR_GEO` L105-129 | exact |
| `src/game/scene/chibiFaces.ts` (NEW) | model (lazy cache) | batch | `scene/actorGeometries.ts` `pawnMaterial`/`eyeMaterial` Map caches L148-171 | exact |
| `src/game/scene/chibi.test.ts` (NEW, node env) | test | - | `scene/actors.test.tsx` header L1-3 (`@vitest-environment node`) | role-match |
| `src/game/scene/ChibiModel.tsx` (NEW) | component (3D, view-only) | - | `scene/Pawn.tsx` JSX L135-165 | exact |
| `src/game/scene/Character.tsx` (NEW, replaces Pawn) | component (3D beat consumer) | event-driven | `scene/Pawn.tsx` (whole file) | exact |
| `src/game/scene/SceneContents.tsx` | component | - | itself | exact |
| `src/game/scene/actorGeometries.ts` | model | - | itself (drop pawn parts, keep blob/turnRing/crown/preview/dice) | exact |
| `src/game/scene/Pawn.tsx` | DELETE | - | - | - |
| `src/game/scene/actors.test.tsx` | test | - | itself | exact |
| `src/game/scene/Board.tsx` (+ `board.test.tsx`) | component | batch | itself L83-108 (star instancing) | exact |
| `src/game/scene/CharacterGallery.tsx` (NEW, dev) | component (owns its own Canvas) | - | `scene/GameCanvas.tsx` L76-99 | role-match |
| `src/gallery.tsx` (NEW, dev) | entry | - | `src/main.tsx` L1-12 | exact |
| `gallery.html` (NEW, repo root) | config | - | `index.html` | exact |
| `src/game/sourceGuard.test.ts` | test | - | itself rule (d) L93-104 | exact |
| `vite.config.ts` | config | - | itself — NO change expected (gallery.html is dev-server only, not a build input) | n/a |

## Pattern Assignments

### `src/game/layout/chibiDims.ts`, `charMotion.ts`, `pawnSlots.ts` v2, `director/reaction.ts` (pure modules)

**Analog:** `src/game/layout/pawnSlots.ts` L1-11 / `director/timeline.ts` L1-8 — copy the contract header verbatim style:
```ts
// PHASE 6 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of any runtime import of three / @react-three/*
//     (main-chunk safety — the HUD may read `leaders`), and
//   - pure: every function returns new values and never mutates its inputs.
```
timeline.ts adds `CLOCK-FREE (no wall-clock reads, no timers)` — reaction.ts/charMotion.ts must take time as a parameter (`t`, `phase`) and also be clock-free.

**Dimension constants style** (actorGeometries.ts L27-42) — move/replace into chibiDims.ts, export what slot test + geometry share:
```ts
const HEAD_R = 0.16;
export const HEAD_Y = 0.62;
...
export const CROWN_Y = HEAD_Y + HEAD_R + 0.03; // band center just above the head
```
New values from UI-SPEC §C1 (`HEAD_C_Y 0.62`, `HEAD_R 0.27`, `BODY_R 0.19`, `HEAD_TILT 0.6`).

**pawnSlots v2 core** — keep `PawnSlot`/`StandPoint` interfaces, `leaders`, `standPoints` unchanged; replace `slotFor`/`GRID_SLOTS` (L25-44) with the §C5 table, and the signature L47 becomes `pawnSlots(order, positions, currentId)`. Keep the grouping loop:
```ts
const byTile = new Map<number, string[]>();
for (const id of order) {
  const tile = positions[id] ?? 0;
  ...
}
```

**Motion constants to lift into charMotion.ts** (Pawn.tsx L35-41, L95-99, L123-128):
```ts
const HOP_HEIGHT = 0.5;
const SQUASH_FROM = 0.7; // last 30 % of each tile
const SQUASH_DEPTH = 0.12;
const IDLE_PERIOD = 0.8; // s
const IDLE_BOUNCE = 0.08;
b.position.y = HOP_HEIGHT * 4 * s * (1 - s);
const squash = s > SQUASH_FROM ? Math.sin((Math.PI * (s - SQUASH_FROM)) / (1 - SQUASH_FROM)) : 0;
bounce = IDLE_BOUNCE * Math.abs(Math.sin(Math.PI * phase));
```
Curves return a `Pose`; endpoint = `REST` (UI-SPEC §C4) so tests can assert `curve(1) == REST`.

**reaction.ts** — switch over `Beat['kind']` like `buildTimeline` (timeline.ts L60-101), default branch returns the situation face (excited if current, else idle).

---

### `src/game/director/timeline.ts` (modify)

**Analog:** itself.
- `BEAT_MS` L11-21: `stars: 600 → 900`, add `miss: 700`, `win: 1500`.
- `BeatSpec` union L27-43: add `| { kind: 'miss'; pid: string; ms: number }` and `| { kind: 'win'; pids: string[]; ms: number }`.
- `judged` case L89-91 currently drops failures: `if (e.success) out.push({ kind: 'stars', ... })` — add `else` → miss beat. Note: `miss`/`win` use raw `BEAT_MS` (NOT `motion()`), like banner beats L80/L86 (reduced motion keeps length).
- `gameEnded` currently in default no-beat comment L98 → win beat (only when rounds complete; ctx needs a flag or the director decides).
- Add `isTimedBeat` next to `isBannerBeat` L107-108 (same one-line predicate style).

### `src/game/director/useDirector.ts` (modify)

**Analog:** itself L39-43 — the branch to split:
```ts
if (next.log.events.some((e) => e.t === 'gameEnded')) {
  p.skipAll();
  return;
}
```
Only the manual "지금 끝내기" end calls `skipAll`; rounds-complete falls through to `p.play(buildTimeline(...))` L45. Extend `timelineCtx` L15-22 if timeline needs the end reason.

### `src/game/hud/Banner.tsx` (modify)

**Analog:** itself. Selector L15 swaps `isBannerBeat` → `isTimedBeat` (miss/win completed by timer too). The timer L17-22 is the completion pattern to keep (id-guarded `completeBeat(id)`). Render guard L24-26 already returns null when `bannerCopy` null — miss stays copy-less but still timed. Win class `beat-banner--win` via `copy.tone`, emoji row as JSX text only (T-06-08).

### `src/game/labels.ts` (modify)
Add `case 'win':` to `bannerCopy` L205-228 returning `{ top: null, big: '🏆 우승!', sub: null, tone: 'win', label: '' }` per UI-SPEC; `miss` hits `default: return null`.

### `src/game/GameStage.tsx` (modify)
L163 `onEndNow={() => useGameStore.getState().endNow()}` → also `usePresentation.getState().skipAll()` when gameOver; L167 `boardAria(...)` gains gameOver variant.

---

### `src/game/scene/chibiParts.ts` (NEW, three)

**Analog:** `src/game/scene/actorGeometries.ts` L9-25 imports + L44-91 helpers.
```ts
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const at = <G extends BufferGeometry>(g: G, x: number, y: number, z: number): G => { g.translate(x, y, z); return g; };
const headZ = (x: number, y: number, lift: number) =>
  Math.sqrt(Math.max(0, HEAD_R * HEAD_R - x * x - (y - HEAD_Y) * (y - HEAD_Y))) + lift;
const flat = <G extends BufferGeometry>(g: G, y: number): G => { g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g; };
// crown L94: mergeGeometries(parts.map((g) => g.toNonIndexed()))!
```
New: `part(geo, colorHex, matrix)` = `toNonIndexed()` → `deleteAttribute('uv')` → `color` attr from `new Color(hex)` r/g/b (linear, RESEARCH Pattern 1) → applyMatrix4. `hull()` replaces the BackSide outline mesh (outlineGeometry L74-80) with flipped-winding in-geometry hull. `surfaceZ()` generalizes `headZ` to an ellipsoid.

### `src/game/scene/chibiSpecies.ts` (NEW)
**Analog:** `ACTOR_GEO` object literal L105-129 (`as const`, built once at import, never disposed — header L2-4 "RESEARCH Pitfall 9"). Shape: `Record<AnimalId, { ground, torso, armL, armR, head, ears }>`. One shared `CHAR_MAT = new MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.05 })` (roughness from `pawnMaterial` L153).

### `src/game/scene/chibiFaces.ts` (NEW)
**Analog:** lazy Map cache L148-158:
```ts
const pawnMats = new Map<AnimalId, MeshStandardMaterial>();
export function pawnMaterial(animal: AnimalId): MeshStandardMaterial {
  let m = pawnMats.get(animal);
  if (!m) { m = new MeshStandardMaterial(...); pawnMats.set(animal, m); }
  return m;
}
```
Key = `${animal}:${faceKey}` → `faceGeo(animal, key)`. Eye color source = `ANIMAL_EYE` (palette L24-33) / new `CHAR_COLOR`. Eye/cheek merge pattern = `eyesGeometry`/`cheeksGeometry` L52-69.

### `src/game/scene/ChibiModel.tsx` (NEW) — view only
**Analog:** Pawn.tsx JSX L135-165. Keep `dispose={null}` on every mesh, `name=` on every node (tests find by name, actors.test.tsx L27-34). Node tree per RESEARCH Pattern 1 table: ground(`chibi-ground`, `turn-ring`) › body(`chibi-torso`, armL/armR pivots, head pivot › `chibi-head`, ears pivot › `chibi-ears`, `chibi-face`, `crown`). Crown positioning copies L155-163 (`position={[0, CROWN_Y, 0]}`, now inside head). Expose group refs via a `refs` prop/forwardRef so Character and Gallery drive them.

### `src/game/scene/Character.tsx` (NEW, replaces Pawn)
**Analog:** `src/game/scene/Pawn.tsx` — copy whole beat-consumer skeleton:
- Props L25-32 (`pid, animal, points, slot, isCurrent, isLeader`) + win flag.
- `restPoint` L43-46, mount `useLayoutEffect` L62-67.
- Ref bookkeeping L52-60 (`startedId`, `doneId`, `elapsed`, `from`, `lift`, `idle`, `reduced = useMemo(prefersReducedMotion)`).
- `useFrame` L69-133: `Math.min(delta, 0.25)`, `usePresentation.getState()` (never render closure), hop branch with `completeBeat(beat.id)` exactly once L86-93, watchdog fall-through L114-118, rest easing `1 - Math.exp(-SETTLE_RATE * d)` L106.
- Add: stars/miss/win beats are NOT completed by Character (Banner timer + watchdog own them, isTimedBeat) — Character only reads `cur.kind`/`cur.pid` to pick `reactionFor(...)` pose/face; face swap `faceRef.current.geometry = faceGeo(animal, key)` only on change.
- Reduced motion: keep L123 `isCurrent && !reduced` gating; blink allowed.

### `src/game/scene/SceneContents.tsx` (modify)
L37 `pawnSlots(order, positions)` → `pawnSlots(order, positions, currentId)`; L46-55 `<Pawn .../>` → `<Character .../>`; import L17 swap. Win beat: crowned = win pids during `win` beat else `leaders(stars)` L38.

### `src/game/scene/actorGeometries.ts` (modify)
Remove pawn-only `base/body/head/eyes/cheeks/outline`, `pawnMaterial`, `eyeMaterial`, `ACTOR_MAT.base/cheek/outline`, consts L27-42 (moved to chibiDims). Keep `blob` (or fold into chibi-ground), `turnRing`, `crown`, `pathDot/destRing/destCone`, `diceBody/dicePip`. Check PathPreview.tsx / Dice.tsx still compile. palette `SCENE_COLOR.pawnBase/cheek` then removable (UI-SPEC).

### `src/game/scene/Board.tsx` (modify — star lift)
**Analog:** itself L83-108 star loop: `const starY = tileTop('quest') + STAR_LIFT;` then `d.position.set(c.x + ax * off, starY, c.z + az * off)`. Add an `occupied: ReadonlySet<number>` prop (from `displayed.positions`) and raise `starY` for occupied tile indices (§C6); dependency array L125 gains it. Still one `instancedMesh` (no draw-call increase).

### `src/game/scene/CharacterGallery.tsx` (NEW, dev)
**Analog:** `src/game/scene/GameCanvas.tsx` L76-99 — `<Canvas flat dpr={...} camera={...}>` + lights from `SceneContents` L43-45 (`LIGHTS.hemi/key/rim`). Gallery MUST own the `<Canvas>` import (fiber) because `src/gallery.tsx` is outside `src/game/scene/` and guard (d) forbids it importing three/@react-three. No drei `Text`/`Html` (guard (c), FORBIDDEN_DREI L39-54) — labels, if any, as DOM outside Canvas in gallery.tsx.

### `src/gallery.tsx` + `gallery.html` (NEW, dev)
**Analog:** `src/main.tsx` L1-12 (createRoot + StrictMode + css imports) — without App and without `loadGameCanvas` preload. `gallery.html` = copy `index.html` (lang ko, viewport) with `<title>파워점핑 · 캐릭터 갤러리 (dev)</title>` and `src="/src/gallery.tsx"`. Do NOT add to `vite.config.ts` `build.rollupOptions.input` — dev-server serves root HTML files automatically; build only bundles index.html.

### `src/game/sourceGuard.test.ts` (modify)
**Analog:** rule (d) L93-104 and the GameCanvas static-import rule L106+. Add test: no file except `/src/gallery.tsx` imports `CharacterGallery` (basename match like L57 comment), and `src/main.tsx`/`App` graph never references `gallery`. Also `scans the real sources` L60 may assert `/src/game/scene/Character.tsx` exists.

### `src/game/scene/actors.test.tsx` / `chibi.test.ts`
**Analog:** actors.test.tsx L1-70: `// @vitest-environment node`, `ReactThreeTestRenderer.create`, `named()/one()` helpers L27-34, `play()` in `act` L45-49, `completeSpy` on `usePresentation` L58-63. Port Pawn hop tests to Character (`pawn-{pid}` → new names). chibi.test.ts: plain node env, import chibiSpecies/chibiFaces, assert no `null` merge, attribute keys `['position','normal','color']`, mesh count ≤ 7.

### `slotOcclusion.test.ts`
**Analog:** `fitCamera.ts` exports (`CAMERA_FOV`, `FitInput`, closed-form fit) — project head sphere centers (chibiDims `HEAD_C_Y`, `HEAD_R` × slot.scale) with fitCamera result; pure math, no three. Structure like pawnSlots.test.ts L1-5 (`boardWith` from `engine/testkit`).

## Shared Patterns

### Main-chunk safety (D-21)
**Source:** `sourceGuard.test.ts` L93-104. Anything outside `src/game/scene/` may only `import type` from three. Pure modules (chibiDims, charMotion, reaction, pawnSlots, palette) never import three at runtime.

### Beat consumption (D-22)
**Source:** `Pawn.tsx` L69-93 (3D) and `Banner.tsx` L17-22 (DOM timer). Read `usePresentation.getState()` in `useFrame`; `completeBeat(id)` once, id-guarded; watchdog may end beats first — always fall back to `displayed`.

### Geometry singletons (D-20)
**Source:** `actorGeometries.ts` L1-8 header + `dispose={null}` on every mesh in Pawn.tsx. Build at import or lazily cache in Map; never dispose.

### Single color source (D-01)
**Source:** `palette.ts` L12-33. Add `CHAR_COLOR` there; palette.test pins values.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| vertex-color merged hull/part pipeline inside `chibiParts.ts` | utility | transform | No vertex-color or hull geometry exists yet; use RESEARCH Pattern 1 (toNonIndexed + uv delete + linear Color) |

## Metadata

**Analog search scope:** src/game/{scene,layout,director,hud}, src/main.tsx, index.html, vite.config.ts
**Files scanned:** ~20
**Pattern extraction date:** 2026-10-23
