# Phase 3: 3D 보드 & 실제 게임 UI - Research

**Researched:** 2026-07-25
**Domain:** React Three Fiber (R3F v9) 3D board visualization layered over an existing pure headless game engine; child-facing DOM HUD
**Confidence:** HIGH (stack/versions/wiring — verified against installed deps + npm registry), MEDIUM (R3F animation/dispose patterns — established framework idioms, Context7 unavailable this session)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (R3F):** React Three Fiber v9 + three r185 + @react-three/drei v10. R3F makes the 3D scene declarative React components sharing ONE store with the existing DOM UI/engine. Vanilla three rejected (heavy DOM UI present). Vite/React 19 compatible.
- **D-02 (new deps):** Install `three`, `@react-three/fiber@9`, `@react-three/drei@10` this phase (absent in Phase 1/2). Physics engines (rapier/cannon) **NOT installed** — dice is a tween (CLAUDE.md "The Dice Decision" default).
- **D-03 (board):** Low-poly stylized 3D board — a path of `boardLength` squares (short/normal preset from the engine). Finish square emphasized. Start with FORM (stylized low-poly primitives), not art.
- **D-04 (token):** Per-participant **placeholder tokens** (simple distinct-color pawn shapes). Character meshes are Phase 4. Team = one token (matches Phase 2 contract).
- **D-05 (dice):** **Tween (canned) dice** — spin the mesh fast then snap to the engine's pre-rolled 1–6 face. No physics, deterministic.
- **D-06 (card):** Card-draw flourish (rotate/flip tween) then show mission name/desc/difficulty large. 3D card OR DOM overlay by implementation convenience (drei `Html` overlay allowed).
- **D-07 (ANIM_DONE gating):** 3D flourishes (card/dice/token-move) sync to the engine via events/state — **the next progression happens only after the animation finishes (ANIM_DONE)** (Success Criterion 2). Engine stays PURE (Phase 2 contract); the 3D layer signals animation completion to permit the next transition. Wall-clock/timer stays UI-owned.
- **D-08 (dispose/reuse):** Consecutive games run with **no 3D resource leak** (stable GPU memory) (Success Criterion 4). Reuse geometries/materials, dispose on unmount, cap `dpr` (pixelRatio). Use R3F idioms (useMemo/cache, drei `<Bounds>`).
- **D-09 (app shell/HUD):** Replace Phase 2's plain-button harness with a **real child game UI** — big simple buttons, minimal text (ART-04), mission-card overlay, current-turn HUD, dice/success-fail buttons, time-limit/result screens. Reuse Phase 1 UI-SPEC bright Nintendo-ish tokens for cohesion. Whole flow (start→play→result) is driven by this UI (Success Criterion 3).
- **D-10 (coexist with editor):** Instructor editor (Phase 1) stays — app toggles "game" and "editor" modes (keep/improve the current App view switch). Game mode is the default entry.

### Claude's Discretion (research options, recommend)
- Camera angle (fixed isometric vs weak orbit) — child ease-of-use first; **fixed / slightly-tilted view recommended** (UI-SPEC resolved to fixed isometric, no free orbit).
- Token move tween path (per-square hop vs slide) and event effect (forward/back N squares) choreography — **UI-SPEC resolved to per-square hop ~0.18s**.
- drei `Html` overlay for mission-card/HUD vs pure 3D (implementation convenience — DOM HUD favored for accessibility + big buttons).
- `dpr` cap value, target-tablet perf check method — **UI-SPEC resolved dpr cap `[1,2]`**.

### Deferred Ideas (OUT OF SCOPE)
- Expressive boy/girl 3D jump-rope characters, Nintendo-ish art unification, original logo → **Phase 4**.
- Sound/BGM (AUDIO, v2), save/resume (QOL, v2).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LOOP-06 | 주사위 값만큼 3D 보드 위 토큰 이동 애니메이션 | Standard Stack (R3F/three/drei) + Architecture Pattern 2 (position-index→world-coord map) + Pattern 3 (useFrame hop tween driven by engine `lastLanding.from/to`) + Pattern 4 (ANIM_DONE gating so the engine's already-final state is only *revealed* after the visual completes) |
| ART-04 | 크고 단순한 최소 텍스트 버튼 | Architecture Pattern 6 (DOM overlay siblings of `<Canvas>` for big tap-target HUD/buttons; drei `<Html>` only for 3D-anchored token labels) — matches UI-SPEC `--tap` 72px controls |
</phase_requirements>

## Summary

Phase 3 adds a React Three Fiber (R3F v9) rendering layer on top of the already-verified pure engine in `src/engine/*`. The engine does **not change**: it is a synchronous immutable FSM (`awaitingDraw → awaitingJudgement → awaitingRoll → turnResolved → gameOver`) whose transitions run instantly inside `useGameStore` actions. The single most important architectural insight for this phase is that **the engine is not "paused" for animation** — a `roll()` call moves the token to its final `position` in state immediately. The 3D layer therefore animates a *separate, presentation-only* token value that lerps toward the engine's authoritative position, and "ANIM_DONE" is the signal that gates when the *next controls* become interactive — not a pause inside the pure engine. This keeps the Phase 2 contract intact (engine stays pure, clock stays UI-owned) while satisfying Success Criterion 2.

The recommended stack is fully pinned and peer-compatible with the installed React 19.2.8 / Vite 8.1.5: `three@0.185.1`, `@react-three/fiber@9.6.1`, `@react-three/drei@10.7.7`, plus dev deps `@types/three@0.185.1` and `@react-three/test-renderer@9.1.0`. No physics library (D-05). The board is a straight or snake path of `boardLength+1` low-poly tiles rendered as an **instanced mesh** (one geometry/material, one draw call for 21–31 identical tiles), with the finish tile drawn separately and highlighted. Tokens, dice spin, and card flip are hand-rolled `useFrame` + easing tweens — no animation dependency needed. Resource hygiene (Success Criterion 4) comes from `dpr={[1,2]}`, `useMemo`'d shared geometry/material, R3F's automatic disposal of declaratively-mounted objects, and a `renderer.info.memory` leak check across consecutive games.

**Primary recommendation:** Build a thin **presentation store** (or extend `useGameStore` with a `busy`/`animating` flag + `signalAnimDone()`) that sits between the pure engine and the R3F scene. The engine advances synchronously; the presentation layer plays the tween, holds a `busy` flag that hides/disables all action buttons, and only clears it on ANIM_DONE — after which the phase-appropriate big DOM buttons (siblings of `<Canvas>`, NOT drei `Html`) re-enable. Reuse `useGameStore` verbatim; delete `src/harness/*` once the new `GameApp` replaces `GameHarness`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Game rules / FSM / RNG / win judgement | Pure engine (`src/engine/*`) | — | Phase 2 contract; unchanged, reused. No React/DOM/clock. |
| Engine↔React bridge (actions, content injection) | `useGameStore` (Zustand) | — | Existing single seam; reuse verbatim. |
| Animation orchestration + ANIM_DONE `busy` gate | React presentation layer (new store/hook) | Zustand | Gating is a UI concern; the engine must stay pure (D-07). |
| 3D scene graph (board/token/dice/card meshes) | R3F `<Canvas>` components | three (via R3F reconciler) | Declarative React owns the scene, shares the store. |
| Per-frame tweens (token hop, dice spin, card flip) | R3F `useFrame` + refs | maath/easing or hand lerp | Frame loop is R3F-owned; mutate refs, don't setState per frame. |
| Big tap-target buttons / HUD / mission card / result | DOM overlay (siblings of Canvas) | Phase 1 tokens/components | Accessibility + large targets need real DOM `<button>` (ART-04). |
| 3D-anchored token name labels | drei `<Html>` inside Canvas | — | Labels must track token world position (color-independence a11y). |
| Countdown clock | DOM/UI layer (reuse harness pattern) | — | Wall clock is UI-owned (D-04); engine is clock-free. |
| GPU resource lifecycle (dispose/reuse/dpr) | R3F Canvas config + useMemo | three dispose APIs | Success Criterion 4; R3F auto-disposes declarative objects. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `three` | 0.185.1 | WebGL renderer, meshes, cameras, lights, math (Vector3/Quaternion/Euler) | De-facto browser 3D standard; every helper targets it. `[VERIFIED: npm registry]` published 2026-07-01, 13.1M weekly downloads, official `mrdoob/three.js`. |
| `@react-three/fiber` | 9.6.1 | React renderer for three (declarative scene, `useFrame`, `useThree`, `<Canvas>`) | The React-19 line (v9). Unifies the 3D scene and the DOM editor under one store. `[VERIFIED: npm registry]` peer `react >=19 <19.3`, `three >=0.156`. |
| `@react-three/drei` | 10.7.7 | Helper components: `<Bounds>`, `<Instances>/<Instance>`, `<Html>`, `<OrthographicCamera>`, `<RoundedBox>`, `<Text>`, `<Environment>` | Removes hundreds of lines of camera-framing / instancing / DOM-overlay boilerplate. `[VERIFIED: npm registry]` peer `react ^19`, `three >=0.159`, `@react-three/fiber ^9.0.0`. |

### Supporting (dev / optional)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/three` | 0.185.1 | TypeScript types for three (three ships no bundled types) | Always for a TS project. Pin to match `three` major.minor. `[VERIFIED: npm registry]` |
| `@react-three/test-renderer` | 9.1.0 | Render the R3F scene graph in tests WITHOUT a WebGL context; assert mesh counts/positions/props | Vitest scene-structure tests (jsdom has no WebGL). `[VERIFIED: npm registry]` peer `react ^19`, `@react-three/fiber >=9.0.0`. |
| `maath` | 0.10.8 | `easing.damp3` / `easing.dampE` frame-rate-independent smoothing (used internally by drei) | OPTIONAL — nice for smooth token/camera damping. Hand-rolled lerp is fine; avoid adding if bundle-conscious. `[VERIFIED: npm registry]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Instanced board tiles (`<Instances>`) | 21–31 individual `<mesh>` | Individual is simpler to read but 21–31 draw calls + 21–31 geometries; instancing = 1 draw call, 1 geometry. For this tile count either works on a tablet, but instancing is the leak-safe, perf-correct default (D-08). |
| Hand-rolled `useFrame` lerp | `maath` easing / a tween lib (gsap/tween.js) | Adding a tween lib is unnecessary weight for ~3 simple tweens; `useFrame` + easing is the R3F-idiomatic zero-dep path. `maath` is already a drei transitive dep if you want damping helpers. |
| drei `<Html>` for buttons | Pure-DOM overlay sibling of `<Canvas>` | `<Html>` is for 3D-anchored elements; using it for the main HUD adds transform/occlusion complexity and hurts a11y/focus. Plain DOM overlay wins for big buttons (see Pattern 6). |
| `frameloop="demand"` | `frameloop="always"` | `demand` saves tablet battery (renders only on `invalidate()`); needs an `invalidate()` pump while a tween is active. `always` is simpler but renders 60fps even when idle. Recommend `demand` + invalidate-while-animating (Pitfall 4). |

**Installation:**
```bash
# runtime
npm install three@0.185.1 @react-three/fiber@9.6.1 @react-three/drei@10.7.7
# dev
npm install -D @types/three@0.185.1 @react-three/test-renderer@9.1.0
```

**Version verification (done this session):**
- `three@0.185.1` — `npm view three version` → 0.185.1, modified 2026-07-01. `[VERIFIED: npm registry]`
- `@react-three/fiber@9.6.1` — peer `react >=19 <19.3` (installed **19.2.8** ✓), `three >=0.156` ✓. `[VERIFIED: npm registry]`
- `@react-three/drei@10.7.7` — peer `react ^19` ✓, `three >=0.159` ✓, `@react-three/fiber ^9.0.0` ✓. `[VERIFIED: npm registry]`
- `@types/three@0.185.1` — matches `three` 0.185. `[VERIFIED: npm registry]`
- `@react-three/test-renderer@9.1.0` — peer `@react-three/fiber >=9.0.0`, `react ^19` ✓. `[VERIFIED: npm registry]`
- Vite 8.1.5 is bundler-agnostic for R3F — three is pure ESM; **no special Vite config required** (`optimizeDeps` handles three automatically; the existing `@vitejs/plugin-react` + `@tailwindcss/vite` config is untouched). `[CITED: pmndrs r3f installation docs]`

## Package Legitimacy Audit

Ran `gsd-tools query package-legitimacy check --ecosystem npm ...`:

| Package | Registry | Age (latest publish) | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `three` | npm | 2026-07-01 | 13.1M/wk | github.com/mrdoob/three.js | **SUS** (`too-new`) | **Approved — recency false-positive.** 13.1M weekly downloads + canonical official repo; `too-new` only fires because the latest r185 patch published within the recency window. Pin `0.185.1`. |
| `@react-three/fiber` | npm | 2026-04-28 | 4.58M/wk | github.com/pmndrs/react-three-fiber | OK | Approved |
| `@react-three/drei` | npm | 2025-11-13 | 3.52M/wk | github.com/pmndrs/drei | OK | Approved |
| `@react-three/test-renderer` | npm | 2025-05-12 | 55.6k/wk | github.com/pmndrs/react-three-fiber | OK | Approved (dev) |
| `@types/three` | npm | 2026-07-09 | 8.37M/wk | github.com/DefinitelyTyped/DefinitelyTyped | **SUS** (`too-new`) | **Approved — recency false-positive.** 8.37M weekly downloads + DefinitelyTyped; `too-new` fires because types track three's frequent releases. Pin `0.185.1`. |

- `postinstall` scripts: **none** on any package (checked via legitimacy signals — all `postinstall: null`).
- **Packages removed due to [SLOP] verdict:** none.
- **Packages flagged as suspicious [SUS]:** `three`, `@types/three` — both are **recency false-positives** (multi-million weekly downloads, official/canonical repos, no postinstall). These are the exact versions in the already-researched CLAUDE.md version matrix. Recommendation: **no `checkpoint:human-verify` needed** — the SUS is purely the "published < N days ago" heuristic on the latest patch of the most-downloaded 3D library on npm. The planner may pin the versions above directly.

## Architecture Patterns

### System Architecture Diagram

```
                 ┌─────────────────────────────────────────────┐
   user tap ───► │  DOM HUD overlay (siblings of <Canvas>)      │
   (big button)  │  turn banner · mission card · 성공/실패 ·     │
                 │  🎲 roll · 다음 · result · timer · mode switch │
                 └───────────────┬─────────────────────────────┘
                                 │ calls action (draw/judge/roll/next/end)
                                 ▼
                 ┌─────────────────────────────────────────────┐
                 │  useGameStore (Zustand bridge — UNCHANGED)   │
                 │  injects systemRng + Phase-1 content         │
                 └───────────────┬─────────────────────────────┘
                                 │ (state,args,rng) => GameState  [SYNCHRONOUS, PURE]
                                 ▼
                 ┌─────────────────────────────────────────────┐
                 │  src/engine/* pure FSM (UNCHANGED)           │
                 │  → new GameState: phase, positions, lastRoll,│
                 │    lastLanding{from,to,eff}, winners          │
                 └───────────────┬─────────────────────────────┘
                                 │ state change observed
                                 ▼
                 ┌─────────────────────────────────────────────┐
                 │  Presentation layer (NEW): busy flag +        │
                 │  animation orchestrator                       │
                 │  • reads lastLanding.from/to, lastRoll        │
                 │  • sets busy=true, hides next-phase controls  │
                 │  • plays tween ──────────────┐                │
                 └──────────────────────────────┼───────────────┘
                                 │              ▼ useFrame (per frame, refs only)
                                 │   ┌──────────────────────────────────────┐
                                 │   │ R3F <Canvas> scene                     │
                                 │   │  • instanced board tiles (1 draw call) │
                                 │   │  • finish tile (highlight)             │
                                 │   │  • per-participant token meshes        │
                                 │   │    (lerp visual pos → engine position) │
                                 │   │  • dice mesh (spin→snap to face)       │
                                 │   │  • drei <Html> token name labels       │
                                 │   │  • fixed iso camera + <Bounds> fit     │
                                 │   └──────────────────────────────────────┘
                                 │              │ tween completes
                                 ▼              ▼
                        signalAnimDone() ──► busy=false ──► reveal next-phase DOM controls
```

The reader traces the primary use case (LOOP-06) by following: **tap 🎲 → `roll()` → engine sets final position + lastLanding → presentation sets busy, animates token `from→to` hop-by-hop via useFrame → ANIM_DONE clears busy → dice-result panel + 다음 button appear.**

### Recommended Project Structure
```
src/
├── engine/                 # UNCHANGED (Phase 2 pure engine)
├── game/                   # NEW — the real child game UI (replaces src/harness/*)
│   ├── GameApp.tsx         # root: routes setup / play / result (was GameHarness)
│   ├── useGameStore.ts     # MOVED from harness/, unchanged bridge
│   ├── usePresentation.ts  # NEW — busy flag, signalAnimDone, visual token positions
│   ├── boardLayout.ts      # NEW — pure: squareIndex → THREE.Vector3 world coord
│   ├── diceRotation.ts     # NEW — pure: face(1-6) → target Euler/Quaternion
│   ├── scene/
│   │   ├── BoardScene.tsx  # <Canvas>, camera, lights, <Bounds>, theme clear color
│   │   ├── BoardTiles.tsx  # instanced path tiles + finish highlight
│   │   ├── Token.tsx       # one placeholder pawn + drei <Html> name label + hop tween
│   │   ├── Dice.tsx        # cube + pips, spin→snap tween
│   │   └── Card3D.tsx      # OPTIONAL 3D card flip (or skip → DOM overlay per D-06)
│   ├── hud/
│   │   ├── TurnHud.tsx     # top bar (aria-live)
│   │   ├── MissionOverlay.tsx  # mission card + 성공/실패
│   │   ├── ControlsBar.tsx # phase-driven big buttons (draw/roll/next)
│   │   ├── ResultScreen.tsx    # re-skin of harness/ResultScreen
│   │   └── SetupScreen.tsx     # re-skin of harness/SetupScreen (reuse logic)
│   └── styles/game.css     # game-screen tokens extending Phase 1 index.css
└── harness/                # DELETE after GameApp replaces GameHarness
```
(Directory naming is Claude's discretion — the point is: pure layout/rotation math lives in testable non-React modules; React/R3F components stay thin.)

### Pattern 1: Canvas setup — fixed isometric camera, dpr cap, theme-driven, demand frameloop
**What:** One `<Canvas>` filling the viewport, orthographic-ish fixed camera, capped dpr, `frameloop="demand"`.
**When to use:** The board scene root (`BoardScene.tsx`).
**Example:**
```tsx
// Source: pmndrs r3f Canvas + drei Bounds patterns [CITED: docs.pmnd.rs/react-three-fiber]
import { Canvas } from '@react-three/fiber';
import { Bounds, OrthographicCamera } from '@react-three/drei';

<Canvas
  dpr={[1, 2]}                              // D-08 pixelRatio cap for tablets
  frameloop="demand"                        // render only on invalidate() (battery)
  gl={{ antialias: true, powerPreference: 'high-performance' }}
  onCreated={({ gl }) => gl.setClearColor(themeClearColor)} // light: sky / dark: navy
>
  <hemisphereLight intensity={0.9} />
  <directionalLight position={[5, 10, 5]} intensity={1.1} />
  <Bounds fit clip observe margin={1.2}>   {/* auto-frame whole path; re-fits on board-length change */}
    <BoardTiles />
    {participants.map((p) => <Token key={p.id} participant={p} />)}
    <Dice />
  </Bounds>
</Canvas>
```
**Note:** `frameloop="demand"` means nothing re-renders unless you call `useThree().invalidate()`. During an active tween the orchestrator must pump `invalidate()` each frame (see Pitfall 4). Simpler fallback: `frameloop="always"` — acceptable for short classroom sessions, at the cost of constant 60fps redraw.

### Pattern 2: Board layout — pure index→world-coordinate mapping (snake path)
**What:** A pure function mapping engine `position` index (0..boardLength) to a world coordinate, laid out as a snake (boustrophedon) so a 20–30-square path fits a fixed camera frame without going off-screen.
**When to use:** `boardLayout.ts` — unit-testable, no React.
**Example:**
```ts
// Source: standard boustrophedon layout [ASSUMED — synthesized, not from a doc]
import { Vector3 } from 'three';

const COLS = 6;          // squares per row before the snake turns
const GAP = 1.15;        // tile spacing (world units)

export function squarePosition(index: number): Vector3 {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  // even rows go left→right, odd rows right→left (snake)
  const x = (row % 2 === 0 ? col : COLS - 1 - col) * GAP;
  const z = row * GAP;
  return new Vector3(x, 0, z);
}
```
For a straight line (simplest, valid for `short`=20): drop `COLS` and use `x = index * GAP`. drei `<Bounds fit>` auto-frames whichever layout you choose. `boardLength` is `short`=20 / `normal`=30 (from `boardLengthFor`), so tiles = `boardLength + 1` (indices 0..boardLength, index 0 = start, `boardLength` = finish). `[VERIFIED: src/engine/setup.ts]`

### Pattern 3: Token move — presentation-only lerp toward engine position, hop-by-hop
**What:** The visual token position is a `ref`, animated via `useFrame` toward the engine's authoritative `participant.position`. The engine already holds the FINAL position; the visual lags and gates control reveal.
**When to use:** `Token.tsx`.
**Example:**
```tsx
// Source: R3F useFrame ref-mutation idiom [CITED: docs.pmnd.rs/react-three-fiber/api/hooks#useframe]
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3 } from 'three';

function Token({ participant, from, to, onArrive }: TokenProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const step = useRef(from);            // current hop target square (integer)
  const t = useRef(0);                  // 0..1 within the current hop
  const { invalidate } = useThree();

  useFrame((_, delta) => {
    if (step.current === to) return;    // idle — nothing to animate
    t.current += delta / 0.18;          // ~0.18s per square hop (UI-SPEC)
    const nextSquare = to > from ? step.current + 1 : step.current - 1;
    const a = squarePosition(step.current), b = squarePosition(nextSquare);
    const e = easeOutBack(Math.min(t.current, 1));           // playful pop
    meshRef.current.position.lerpVectors(a, b, e);
    meshRef.current.position.y = Math.sin(Math.min(t.current,1)*Math.PI)*0.4; // hop arc
    invalidate();                        // pump the demand loop
    if (t.current >= 1) { step.current = nextSquare; t.current = 0;
      if (step.current === to) onArrive(); }  // → ANIM_DONE for the whole move
  });
  // ...render pawn mesh + drei <Html> name label
}
```
**Key detail (two-stage move for event effects):** `lastLanding` gives only `from` and `to`, but `to` already includes any forward/backward event. To choreograph "dice move, THEN event bounce" you can recover the pre-event square as `afterRoll = from + lastRoll` and animate `from → afterRoll → to` (backward events run `afterRoll → to` in reverse). Extra-turn events have `from === to` → no move, fire ANIM_DONE immediately. `[VERIFIED: src/engine/engine.ts rollDice]`

### Pattern 4: ANIM_DONE gating — busy flag in a presentation store
**What:** A UI-side flag that hides/disables next-phase controls while any tween runs; only the tween's completion callback clears it. The pure engine is never blocked — the engine transition already happened synchronously; the flag gates *control visibility*, matching UI-SPEC's FSM-phase→controls table.
**When to use:** `usePresentation.ts` (a tiny Zustand store or `useReducer`).
**Example:**
```ts
// Source: Zustand + UI-SPEC interaction contract [CITED: 03-UI-SPEC.md Interaction & Motion]
import { create } from 'zustand';
export const usePresentation = create<{
  busy: boolean;
  beginAnim: () => void;
  signalAnimDone: () => void;
}>((set) => ({
  busy: false,
  beginAnim: () => set({ busy: true }),
  signalAnimDone: () => set({ busy: false }),
}));

// Controls render: disabled={busy} (or unmounted) for the CURRENT engine phase.
// Flow: press 🎲 → beginAnim() → useGameStore.roll() → Token/Dice tween →
//       onArrive → signalAnimDone() → turnResolved panel + 다음 enabled.
```
**Idempotence:** while `busy`, a double-tap can't advance (buttons disabled/hidden) — satisfies "no double-tap skips the engine forward" (UI-SPEC contract). **Reduced motion:** under `prefers-reduced-motion: reduce`, skip tweens, snap meshes to final state, and call `signalAnimDone()` immediately so gating still advances (UI-SPEC).

### Pattern 5: Dice tween — spin then snap to the engine's pre-rolled face
**What:** Map face value 1–6 to a target rotation that brings that face up, spin with extra full turns over ~0.8s, slerp-settle to the target, fire ANIM_DONE.
**When to use:** `diceRotation.ts` (pure map) + `Dice.tsx` (tween).
**Example:**
```ts
// Source: standard cube face-up rotation table [ASSUMED — synthesized]
import { Euler } from 'three';
// Face-up target Euler for a standard die (opposite faces sum to 7).
// Values below assume pip layout: +Y up = face N. Verify against the authored mesh.
export const FACE_UP_EULER: Record<number, Euler> = {
  1: new Euler(0, 0, 0),
  2: new Euler(-Math.PI / 2, 0, 0),
  3: new Euler(0, 0, Math.PI / 2),
  4: new Euler(0, 0, -Math.PI / 2),
  5: new Euler(Math.PI / 2, 0, 0),
  6: new Euler(Math.PI, 0, 0),
};
```
`Dice.tsx`: on `awaitingRoll → roll()`, read `game.lastRoll` (1–6), tween current rotation → `FACE_UP_EULER[lastRoll]` plus `2–3 * 2π` extra spin over ~0.8s ease-out, then call `signalAnimDone()`. The number shown in the DOM result panel (`🎲 N`) is the source of truth for a11y; the mesh is decorative. The exact Euler table **must be validated against the authored cube's pip placement** — flag as a manual check (Open Question 2).

### Pattern 6: DOM HUD overlay vs drei `<Html>` — which for what
**What:** Two overlay mechanisms; use each for its correct job.
**When to use:**
- **Plain DOM overlay** (a `<div>` positioned `absolute` as a SIBLING of `<Canvas>`, both inside a `position:relative` stage) → **all big buttons, turn HUD bar, mission-card overlay, dice-result panel, result screen, setup, mode switch.** These need real `<button>`/`<input>`, focus rings, `aria-live`, WCAG tap targets (ART-04, UI-SPEC Accessibility). Rendering untrusted mission text here is React-escaped (safe).
- **drei `<Html>`** (INSIDE `<Canvas>`, anchored to a 3D object) → **only** the floating token **name labels** that must track each token's world position (color-independence a11y). Use `<Html sprite distanceFactor={...} />` or `occlude` so labels scale/hide with the camera.
**Example:**
```tsx
// Source: R3F/drei overlay guidance [CITED: docs.pmnd.rs/drei Html + r3f "html-content" tutorial]
<div className="stage" style={{ position: 'relative', inset: 0 }}>
  <Canvas /* ... */>{/* ...board...; inside Token: */}
    {/* <Html center distanceFactor={8}><span className="token-label">{name}</span></Html> */}
  </Canvas>
  {/* DOM overlay — big tap targets, focus-managed, aria-live */}
  <div className="hud" aria-live="polite">{/* TurnHud, ControlsBar, MissionOverlay... */}</div>
</div>
```

### Anti-Patterns to Avoid
- **`setState` inside `useFrame`:** triggers a React re-render every frame → jank. Mutate `ref.current.position/rotation/quaternion` directly; only `setState`/store-set at animation boundaries (start/ANIM_DONE). `[CITED: r3f "pitfalls" docs]`
- **Trying to "pause" the pure engine for animation:** the engine is synchronous and already holds the final state. Don't add async/timers to `src/engine`. Gate the *UI controls*, not the engine (D-07). `[VERIFIED: src/engine/engine.ts]`
- **Recreating geometries/materials per render:** `new THREE.BoxGeometry()` in the render body leaks GPU memory across re-renders. `useMemo` shared geometry/material, or use `<Instances>`/JSX primitives R3F disposes automatically (D-08).
- **drei `<Html>` for the main buttons:** breaks focus order/tap targets and adds transform math; use it only for 3D-anchored labels.
- **Adding a physics or tween dependency:** D-05 says tween dice; ~3 simple tweens don't justify gsap/rapier/cannon. `useFrame` + easing suffices.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Camera framing the whole board | Manual camera position/zoom math per board length | drei `<Bounds fit clip observe>` | Auto-frames any path length; re-fits on `boardLength` change. |
| Rendering N identical tiles cheaply | N separate meshes/geometries | drei `<Instances>/<Instance>` or `<instancedMesh>` | 1 geometry + 1 draw call; leak-safe for D-08. |
| DOM labels tracking 3D objects | Manual project-to-screen + absolute divs updated each frame | drei `<Html>` | Handles projection, occlusion, distance scaling. |
| GPU disposal of declarative objects | Manual `.dispose()` traversal | R3F auto-dispose on unmount | R3F disposes geometries/materials/textures it created when the component unmounts. Manual dispose only for imperatively-created or cached (useLoader/useGLTF) resources. `[CITED: r3f "disposal" docs]` |
| Frame-rate-independent smoothing | Ad-hoc `lerp(a,b,0.1)` (frame-rate dependent) | `maath/easing damp3` (optional) or `lerp` scaled by `delta` | Consistent motion across 60/120Hz tablets. |
| Rounded low-poly primitives | Custom beveled geometry | drei `<RoundedBox>` | Instant Nintendo-ish rounded tiles/tokens without modeling. |

**Key insight:** R3F/drei already solve every non-gameplay 3D problem this phase touches (framing, instancing, labels, disposal). The only truly custom code is the ~3 gameplay tweens and the two pure math modules (`boardLayout`, `diceRotation`) — both plain, unit-testable functions.

## Common Pitfalls

### Pitfall 1: ANIM_DONE deadlock (game locks forever)
**What goes wrong:** `busy` is set true, the tween throws / a callback never fires, and every control stays disabled — the game is stuck.
**Why it happens:** ANIM_DONE relies on a `useFrame` completion callback; an early return, unmount mid-tween, or exception skips `signalAnimDone()`.
**How to avoid:** (1) Always fire ANIM_DONE on the SAME tick you detect `t>=1` and `step===to`; (2) fire immediately for zero-length moves (`from===to`, extra-turn) and under reduced-motion; (3) add a watchdog fallback (`setTimeout(signalAnimDone, animationDuration + 500ms)` cleared on normal completion) so a dropped frame can't permanently lock the game; (4) clear the flag on unmount.
**Warning signs:** After a roll, the dice-result panel/다음 button never appears; buttons stay greyed.

### Pitfall 2: GPU memory growth across consecutive games (Success Criterion 4)
**What goes wrong:** Playing several games in a row grows `renderer.info.memory.geometries/textures` monotonically → tablet slows/crashes.
**Why it happens:** Geometries/materials created imperatively (in `useMemo` without disposal, or `new` in render), or drei-cached loaders not cleared, survive unmount.
**How to avoid:** Prefer declarative JSX geometry/material (R3F auto-disposes) or shared `useMemo` singletons reused across tokens/tiles; cap `dpr={[1,2]}`; on "다시 시작" reuse the SAME scene/geometries rather than unmount+remount the whole Canvas.
**Warning signs / how to sanity-check:** In dev, log `gl.info.memory` (geometries, textures) and `gl.info.render.calls` after each game; the counts must return to a flat baseline across 5+ consecutive games. Chrome DevTools → Performance/Memory heap snapshots should not climb. `[CITED: three renderer.info + r3f disposal docs]`

### Pitfall 3: Canvas fails in jsdom/vitest (no WebGL)
**What goes wrong:** Mounting `<Canvas>` in a `@testing-library/react` + jsdom test throws (`WebGLRenderingContext` undefined).
**Why it happens:** jsdom has no WebGL/canvas 3D context.
**How to avoid:** Don't full-mount `<Canvas>` in jsdom. Test (a) pure modules (`boardLayout`, `diceRotation`, the `busy` reducer, ANIM_DONE state machine) directly in vitest, and (b) scene structure via `@react-three/test-renderer` (renders the graph without WebGL). DOM HUD components (buttons/overlays) test normally in jsdom. Full 3D render is a MANUAL/visual check.
**Warning signs:** `TypeError: Cannot read properties of null (reading 'getContext')` in test runs.

### Pitfall 4: `frameloop="demand"` freezes the animation
**What goes wrong:** With `frameloop="demand"`, the token/dice tween plays one frame then stops.
**Why it happens:** `demand` only renders when something calls `invalidate()`. A `useFrame` tween that doesn't pump `invalidate()` never gets a second frame.
**How to avoid:** Call `useThree().invalidate()` each frame WHILE a tween is active (see Pattern 3), or switch that scene to `frameloop="always"` during animation, or just use `frameloop="always"` globally (simpler, costs idle 60fps). Recommend demand + invalidate for tablet battery.
**Warning signs:** Token jumps one square then stops; dice spins one frame.

### Pitfall 5: three/@types/three version drift
**What goes wrong:** `@types/three` at a different minor than `three` produces phantom type errors (missing/changed classes).
**Why it happens:** three ships no bundled types; DefinitelyTyped tracks it separately and can lead/lag.
**How to avoid:** Pin `@types/three` to the same major.minor as `three` (both `0.185.x` here). Bump them together. `[VERIFIED: npm registry]`

### Pitfall 6: R3F v9 requires React 19 — do not mix with v8
**What goes wrong:** Installing `@react-three/fiber@8` (the React-18 line) against React 19 breaks the reconciler.
**Why it happens:** v8 = React 18, v9 = React 19. Peer range on 9.6.1 is `react >=19 <19.3`; installed React is 19.2.8 (in range). Keep React < 19.3 or bump R3F when upgrading React. `[VERIFIED: npm registry peerDependencies]`

## Code Examples

### Instanced board tiles + highlighted finish
```tsx
// Source: drei Instances pattern [CITED: docs.pmnd.rs/drei/performances/instances]
import { Instances, Instance, RoundedBox } from '@react-three/drei';
import { useMemo } from 'react';

function BoardTiles({ boardLength }: { boardLength: number }) {
  const positions = useMemo(
    () => Array.from({ length: boardLength }, (_, i) => squarePosition(i)),
    [boardLength],
  );
  return (
    <>
      <Instances limit={boardLength} range={boardLength}>
        <boxGeometry args={[1, 0.2, 1]} />
        <meshStandardMaterial color="#F4F8FD" />
        {positions.map((p, i) => <Instance key={i} position={p} />)}
      </Instances>
      {/* finish tile drawn separately, highlighted (--sun glow + 🏁 via Html) */}
      <RoundedBox args={[1, 0.25, 1]} position={squarePosition(boardLength)}>
        <meshStandardMaterial color="#FFC22E" emissive="#FFC22E" emissiveIntensity={0.4} />
      </RoundedBox>
    </>
  );
}
```

### Wiring the new GameApp to the existing store (replacing GameHarness)
```tsx
// Source: existing src/harness/GameHarness.tsx flow, re-skinned [VERIFIED: src/harness/*]
import { useGameStore } from './useGameStore';         // moved from harness/, unchanged
function GameApp() {
  const game = useGameStore((s) => s.game);
  if (!game) return <SetupScreen />;                    // reuse harness SetupScreen logic
  if (game.phase === 'gameOver') return <ResultView />; // reuse ResultScreen logic
  return <PlayView />;                                   // <BoardScene/> + DOM HUD overlay
}
// App.tsx: swap <GameHarness/> → <GameApp/> in the existing 'game' view branch (D-10).
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@react-three/fiber` v8 (React 18) | **v9 (React 19)** | 2024–2025 | Must use v9 with the installed React 19.2.8. |
| cannon-es / physics dice | **canned tween dice** | project decision (D-05) | No physics dep; deterministic, testable. |
| Manual `object.dispose()` traversal | **R3F auto-dispose + declarative scene** | R3F core behavior | Manual dispose only for imperative/cached resources. |
| Individual meshes per tile | **instanced meshes / drei `<Instances>`** | standard perf practice | 1 draw call for the tile path. |

**Deprecated/outdated:**
- `@react-three/fiber@8`, `@react-three/drei@9` — the React-18 line; do NOT pair with React 19.
- `three` `Geometry` (non-`BufferGeometry`) — long removed; only `BufferGeometry` (r185).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Snake (boustrophedon) board layout with `COLS=6`, `GAP≈1.15` fits a fixed iso camera for 20–30 squares | Pattern 2 | LOW — drei `<Bounds fit>` auto-frames any layout; values are tunable, not load-bearing. A straight line also works. |
| A2 | `FACE_UP_EULER` table maps die faces to up-rotations for a standard pip layout | Pattern 5 | MEDIUM — depends on how the cube mesh's pips are authored; must be validated visually against the actual mesh (Open Q2). Wrong table = dice shows wrong face vs the DOM number. |
| A3 | `frameloop="demand"` + per-frame `invalidate()` is the right battery/perf tradeoff for a tablet | Pattern 1 / Pitfall 4 | LOW — `frameloop="always"` is a safe, simpler fallback if invalidate pumping is fiddly. |
| A4 | `maath` is optional; hand-rolled `useFrame` easing is sufficient | Standard Stack | LOW — purely additive; omitting it removes nothing required. |

**No `[ASSUMED]` claim here creates a compliance/security/retention risk.** All are visual/perf tunables validated at implementation time.

## Open Questions

1. **Placeholder token colors for participants 7–8.**
   - What we know: engine `MAX_PARTICIPANTS = 8` (`src/engine/setup.ts`); UI-SPEC's fixed color-assignment order lists only **6** hues (sky/coral/grass/sun/grape/normal).
   - What's unclear: how to color tokens for a 7th/8th participant.
   - Recommendation: cycle the 6-color list (index % 6) OR derive 2 additional distinct hues from the Phase 1 palette; the `<Html>` name label already guarantees color-independent identity, so a repeat hue is acceptable. Planner should pick one and note it.

2. **Dice face→rotation table must be visually validated against the authored cube mesh.**
   - What we know: opposite faces sum to 7; the tween must snap the engine's `lastRoll` face up.
   - What's unclear: the exact Euler per face depends on where pips are painted on the mesh (Pattern 5 A2).
   - Recommendation: implement, then a MANUAL check — roll each 1–6 and confirm the top face matches the DOM `🎲 N`. Adjust the table. Cheap, one-time.

3. **`Card3D` (3D flip) vs DOM-only card overlay (D-06).**
   - What we know: D-06 allows either; UI-SPEC recommends the DOM overlay for a11y/big text.
   - Recommendation: ship the **DOM mission-card overlay** first (satisfies LOOP-01/02 + ART-04); treat a 3D card flip as optional polish. Reduces scope risk in 03-01.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| npm registry access | installing the R3F stack | ✓ | — | — |
| Node/npm (build) | Vite build/dev | ✓ | (existing project) | — |
| WebGL2-capable browser | R3F rendering | ✓ (target Chrome/tablet) | — | none — WebGL is mandatory for 3D (project constraint) |

**Missing dependencies with no fallback:** none — this phase is `npm install` + code. The only runtime requirement is a WebGL-capable browser, which is the project's stated platform (강사 태블릿/Chrome). Actual tablet-performance verification (Success Criterion 4) is a **manual on-device check** (frame pacing + `gl.info.memory` stability across consecutive games), not an automatable gate here.

## Testing Approach (nyquist_validation disabled — informational)

`workflow.nyquist_validation` is `false` in config, so no formal Validation Architecture section is required. For the planner's awareness (objective 7):

| Layer | Testable? | How |
|-------|-----------|-----|
| `boardLayout.ts` (index→coord) | ✅ automated (vitest) | Assert monotonic path, distinct coords, snake turn points. |
| `diceRotation.ts` (face→Euler map) | ✅ automated (vitest) | Assert all 6 faces present/distinct; opposite faces relationship. |
| ANIM_DONE `busy` reducer / presentation store | ✅ automated (vitest) | Assert busy true on beginAnim, false on signalAnimDone; idempotence. |
| DOM HUD (buttons, overlays, aria-live, focus) | ✅ automated (jsdom + @testing-library/react) | Reuse Phase 2 harness test style; assert phase→controls, disabled while busy. |
| R3F scene structure (mesh counts, token positions, tile count = boardLength+1) | ✅ automated (`@react-three/test-renderer`, no WebGL) | Render graph headless; assert instance/token counts + positions. |
| Actual 3D rendering, tween feel, tablet perf/leak | ⚠️ MANUAL | Visual review + `gl.info.memory` across 5+ consecutive games (Pitfall 2). |

jsdom has NO WebGL, so `<Canvas>` cannot be full-mounted in a standard RTL test (Pitfall 3) — split logic into pure modules and use test-renderer for graph assertions.

## Security Domain

`security_enforcement` is enabled (ASVS level 1). This phase is a **client-only, offline, no-network, no-auth** 3D board renderer over local state — it introduces essentially **no new attack surface** beyond what Phase 1/2 already handle.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth/accounts (single-device local app). |
| V3 Session Management | no | No sessions/network. |
| V4 Access Control | no | No server, no protected resources. |
| V5 Input Validation | yes (inherited) | Mission/event data validated by Phase 1 **zod** on import; Phase 3 only *renders* it. React auto-escapes text (mission name/desc in DOM overlay AND drei `<Html>`) — **no `dangerouslySetInnerHTML`**. |
| V6 Cryptography | no | RNG is gameplay dice only (engine `systemRng`), not security-sensitive. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via imported mission/event text rendered in HUD or `<Html>` | Tampering / Info disclosure | Render as React text nodes only (auto-escaped); never `dangerouslySetInnerHTML`; text already zod-validated at import (Phase 1). |
| Malicious/oversized imported JSON causing render DoS | DoS | Out of Phase 3 scope — bounded by Phase 1 import validation + engine `MAX_PARTICIPANTS`/board presets. No new import path added here. |

No new secrets, network calls, or persisted data are introduced by Phase 3. Reuse the existing zod-validated content path; do not add any raw-HTML rendering.

## Sources

### Primary (HIGH confidence)
- **npm registry** (`npm view`, `gsd-tools package-legitimacy`) — verified versions + peer deps: `three@0.185.1`, `@react-three/fiber@9.6.1` (peer `react >=19 <19.3`, `three >=0.156`), `@react-three/drei@10.7.7` (peer `react ^19`, `three >=0.159`, `fiber ^9`), `@types/three@0.185.1`, `@react-three/test-renderer@9.1.0`, `maath@0.10.8`.
- **Local codebase** (read this session): `src/engine/{types,engine,setup}.ts`, `src/harness/{GameHarness,PlayHarness,useGameStore}.tsx`, `src/App.tsx`, `vite.config.ts`, `package.json`, `03-CONTEXT.md`, `03-UI-SPEC.md`, `ROADMAP.md`, `.planning/config.json`.

### Secondary (MEDIUM confidence)
- Established R3F/drei framework idioms (Canvas/dpr, `useFrame` ref-mutation, `<Bounds>`, `<Instances>`, `<Html>`, disposal, `frameloop` demand) — `[CITED: docs.pmnd.rs/react-three-fiber, docs.pmnd.rs/drei]` from training knowledge; **Context7 and web-search providers were unavailable/disabled this session**, so these idioms were not re-fetched live — validate exact API signatures against installed d.ts during implementation.

### Tertiary (LOW confidence)
- `boardLayout` snake constants and `FACE_UP_EULER` table — synthesized `[ASSUMED]`, to be tuned/validated visually at implementation (Open Questions 1–2).

## Metadata

**Confidence breakdown:**
- Standard stack / versions / compatibility: **HIGH** — verified directly against npm registry peer-deps and the installed React 19.2.8 / Vite 8.1.5.
- Wiring to engine / harness replacement: **HIGH** — read the actual engine + store + harness source; the reuse seam (`useGameStore`) is unchanged.
- Architecture patterns (ANIM_DONE gating, layout, tweens, dispose): **MEDIUM** — sound, idiomatic R3F, but exact drei API signatures should be checked against installed types (Context7 unavailable this session).
- Pitfalls: **MEDIUM–HIGH** — deadlock/leak/jsdom/version-drift are well-established R3F failure modes.

**Research date:** 2026-07-25
**Valid until:** ~2026-08-24 (30 days — stable stack; re-verify only if React is bumped to ≥19.3, which would require an R3F upgrade).
