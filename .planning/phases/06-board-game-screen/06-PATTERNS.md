# Phase 6: 3D 순환판 & 게임 화면 - Pattern Map

**Mapped:** 2026-10-23
**Files analyzed:** 27 (new and modified)
**Analogs found:** 24 / 27

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/game/layout/ringLayout.ts` (new) | utility (pure) | transform | `git show d7b9b73:src/game/boardLayout.ts` + `src/engine/ring.ts` | role-match (snake layout, not a ring; **drop the `three` import**) |
| `src/game/layout/fitCamera.ts` (new) | utility (pure) | transform | none (v1 used drei `<Bounds>`) | no analog, use the RESEARCH section at line 403 |
| `src/game/director/timeline.ts` (new) `buildTimeline(events)→Beat[]` | utility (pure) | transform / batch | `src/engine/ring.ts` (pure-module header contract) | partial |
| `src/game/usePresentation.ts` (modify → beat queue v2) | store | event-driven | itself (current v1 busy + watchdog) | exact |
| `src/game/scene/contextLoss.ts` (new) `watchContextLoss` | utility (DOM) | event-driven | `src/game/useInputLock.ts` (header and guard style) | partial |
| `src/game/turnOrder.ts` (new) | utility (pure) | transform | `src/engine/game.ts` selectors (`willEndOnAdvance`, `currentParticipant`) | role-match |
| `src/game/palette.ts` (new) | config | — | `git show d7b9b73:src/game/scene/Token.tsx` L16-23 (`TOKEN_COLORS`) + `src/game/labels.ts` | role-match |
| `src/game/scene/GameCanvas.tsx` (new) | component (R3F root) | request-response | `git show d7b9b73:src/game/scene/BoardScene.tsx` | exact |
| `src/game/scene/Board.tsx` (new, tiles) | component (3D) | transform | `git show d7b9b73:src/game/scene/BoardTiles.tsx` | exact |
| `src/game/scene/StartGate.tsx`, `Arrows.tsx`, `TileIcons.tsx` (new) | component (3D) | static | BoardTiles (finish tile mesh + geometry dispose) | role-match |
| `src/game/scene/Pawn.tsx` (new) | component (3D) | event-driven (beat consumer) | `git show d7b9b73:src/game/scene/Token.tsx` | exact |
| `src/game/scene/Dice.tsx` (new, restored) | component (3D) | event-driven | `git show d7b9b73:src/game/scene/Dice.tsx` + `git show e230f7b:src/game/diceRotation.ts` | exact |
| `src/game/scene/PathPreview.tsx` (new) | component (3D) | event-driven | Token `buildPath` + `.planning/quick/*260726-lbq*` | partial |
| `src/game/scene/CameraRig.tsx` (new) | component (3D) | request-response (resize) | none | no analog, use fitCamera plus R3F `useThree(size)` |
| `src/game/scene/scene.test.tsx` (new) | test (node, test-renderer) | — | `git show d7b9b73:src/game/scene/scene.test.tsx` | exact |
| `src/game/GameStage.tsx` (new, replaces PlayView) | component (screen) | request-response | `src/game/PlayView.tsx` | exact |
| `src/game/GameApp.tsx` (modify) | route | request-response | itself | exact |
| `src/game/hud/TurnHud.tsx` (modify) | component | request-response | itself | exact |
| `src/game/hud/Scoreboard.tsx` (rewrite) | component | request-response | itself (`rankByStars`) | exact |
| `src/game/hud/ControlsBar.tsx` (modify) | component | request-response | itself (already has a `busy?` prop) | exact |
| `src/game/hud/StatusChips.tsx` (new) | component | request-response | `src/game/hud/DiceResultPanel.tsx` | role-match |
| `src/game/hud/Banner.tsx` (new) | component | event-driven | `src/game/hud/MissionOverlay.tsx` + `src/components/Toast.tsx` | role-match |
| `src/game/hud/MissionOverlay.tsx` (modify, position and entrance only) | component | request-response | itself | exact |
| `src/game/hud/ContextLostOverlay.tsx` (new) | component | event-driven | `src/components/ConfirmDialog.tsx` / MissionOverlay | role-match |
| `src/game/hud/RingStrip.tsx`, `DiceResultPanel.tsx` + `tempHud.test.tsx` (remove/clean) | — | — | — | D-26, planner's discretion |
| `src/game/styles/game.css` (Phase 6 block) | config/style | — | itself | exact |
| `src/test/setup.ts` (ResizeObserver stub), `package.json` | config | — | existing setup / lockfile | exact |

## Pattern Assignments

### `src/game/scene/GameCanvas.tsx` — analog: v1 `BoardScene.tsx` (d7b9b73)
**Keep the separation** (L38-76): a `SceneContents` graph without `<Canvas>`, so test-renderer can mount it without WebGL. Put `ContactShadows` only in the Canvas wrapper, never in `SceneContents`.
```tsx
export function SceneContents(props) { return (<>
  <hemisphereLight intensity={0.75} color="#ffffff" groundColor="#cfe4f5" />
  <directionalLight position={[6, 12, 6]} intensity={1.15} color="#fff6e0" />
  <pointLight position={[-6, 6, -4]} intensity={0.45} color="#8fd0ff" />
  ...</>); }
export default function BoardScene(props) {
  return (<Canvas className="board-canvas" dpr={[1, 2]} frameloop="always"
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [8, 11, 12], fov: 40 }}
      onCreated={({ gl }) => gl.setClearColor(themeClearColor())}>
    <SceneContents {...props} />
    <ContactShadows position={[0,-0.14,0]} scale={40} blur={2.6} far={4} opacity={0.34} resolution={512} color="#123a58" />
  </Canvas>);
}
```
Changes for Phase 6: remove `<Bounds>` (CameraRig/fitCamera replaces it); `flat`, `alpha`; DPR `[1, 1.5|2]`; in `onCreated`, call `watchContextLoss(gl.domElement, onLost)`; consider `frameloop` demand (D-28). Lazy-load from GameStage with `React.lazy(() => import('./scene/GameCanvas'))`, so the main chunk contains no three.

### `src/game/scene/Board.tsx` — analog: v1 `BoardTiles.tsx` L19-65
One shared geometry for the InstancedMesh, per-instance color, and **explicit dispose of useMemo geometry**:
```tsx
const tileGeo = useMemo(() => new RoundedBoxGeometry(0.94, 0.3, 0.94, 4, 0.1), []);
useEffect(() => () => { tileGeo.dispose(); }, [tileGeo]);
useLayoutEffect(() => {
  const mesh = meshRef.current; const dummy = new Object3D(); const col = new Color();
  for (let i = 0; i < n; i++) { const p = layout[i]; dummy.position.set(p.x, 0, p.z); dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix); col.set(colorOf(tile[i])); mesh.setColorAt(i, col); }
  mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}, [n]);
<instancedMesh ref={meshRef} name="path-tiles" args={[undefined, undefined, n]}>
  <primitive object={tileGeo} attach="geometry" /><meshStandardMaterial roughness={0.55} metalness={0.04} />
</instancedMesh>
```
Differences: import from `three/addons/geometries/RoundedBoxGeometry.js` instead of `three-stdlib` (RESEARCH Standard Stack). **Remove drei `<Html>`** and the finish flag (D-02). Get colors from `palette.ts`. Positions come from `ringLayout(n)`.

### `src/game/scene/Dice.tsx` — analog: v1 `Dice.tsx` L1-140 (restore almost unchanged)
- `PIP_GRID` + `pipWorld` (L25-46). The face-axis contract is `1:+Y 6:-Y 2:+Z 5:-Z 3:+X 4:-X`. `FACE_UP_EULER` comes from `git show e230f7b:src/game/diceRotation.ts` (RESEARCH L473).
- Spin: the `useFrame` ref timeline (L88-133). A new `rollId` starts the spin. Ease-out cubic `t + (1-ease)*spin`. At the end it snaps exactly and calls `onSettled()`. Under reduced motion it snaps immediately.
- Dispose (L74-78). `Float rotationIntensity={0}`.
- Changes: `DICE_S` 0.8 → about 1.0 (D-19), taken from the timeline data. Position at the board center. Replace `rollId` with the beat id, and replace `onSettled` with idempotent beat completion.

### `src/game/scene/Pawn.tsx` — analog: v1 `Token.tsx`
- Header principle (L1-5): **the position is a ref updated only in useFrame, with no per-frame setState**.
- `easeOutBack` (L54-58), `prefersReducedMotion` (L45-51). In `useFrame`, initialize the path when a new move id arrives (L104-110).
- `buildPath` (L36-43) is for a linear board. Replace it with `moved.path` from the engine event (`walkPath` in `src/engine/ring.ts` L15-21 already provides wrapped indices).
- Remove `TOKEN_COLORS`/`tokenColor` (L16-23) and move them to `palette.ts` (participant color). Remove the drei `Html` name label (D-02).

### `src/game/scene/scene.test.tsx` — analog: v1 `scene.test.tsx` L1-44
```tsx
// @vitest-environment node
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { SceneContents } from './GameCanvas';
const renderer = await ReactThreeTestRenderer.create(<SceneContents .../>);
const instanced = renderer.scene.findAll(n => (n.instance as {isInstancedMesh?:boolean})?.isInstancedMesh === true);
expect((instanced[0].instance as {count:number}).count).toBe(n);
```
Additional rules from RESEARCH: set `globalThis.IS_REACT_ACT_ENVIRONMENT = true`; wrap store changes in `await ReactThreeTestRenderer.act(async()=>…)`; drive the timeline with `advanceFrames(n, delta)`. Participants come from `buildParticipants` in `src/engine/setup` (match the current signature).

### `src/game/layout/ringLayout.ts` — analog: v1 `boardLayout.ts` L1-30
Copy the header contract ("PURE, no React/DOM, deterministic"). **Do not use `import { Vector3 } from 'three'` from v1.** Return `{x,z}` plain objects to keep the main chunk free of three (RESEARCH L378). The wrap math uses `wrap` from `src/engine/ring.ts` L9.

### `src/game/usePresentation.ts` (v2) — analog: itself (L1-58)
Keep: a Zustand `create`, a module-scoped `watchdogTimer`, `clearWatchdog`, idempotent `signalAnimDone`, and `durationMs + WATCHDOG_BUFFER_MS`.
```ts
startWatchdog: (durationMs) => { clearWatchdog();
  watchdogTimer = setTimeout(() => { watchdogTimer = null; if (get().busy) set({ busy: false }); }, durationMs + WATCHDOG_BUFFER_MS);
  return clearWatchdog; },
```
Extension: `queue: Beat[]`, `current`, `completeBeat(id)` (ignore a mismatched id, so it is idempotent), a per-beat watchdog (budget = `beat.duration` from the timeline, fixing the v1 PREVIEW_S omission), `displayed` (stars/positions), and `snapToEnd()` (on context loss). Update the existing tests in `usePresentation.test.ts` (`beforeEach setState` pattern L6-8).

### `src/game/GameStage.tsx` — analog: `src/game/PlayView.tsx` L1-86
Keep: harness actions through `useGameStore` selectors, `guard(() => useGameStore.getState().roll())` (input lock), `canUndo`/`willEndOnAdvance`/`activeMember`/`currentParticipant` from `engine/game`, `showToast` on undo, `aria-live="polite"`, the MissionOverlay condition `phase === 'awaitingJudgement' && card`.
Replace: `RingStrip`/`DiceResultPanel` → lazy `GameCanvas` + `StatusChips` + `Banner` + `ContextLostOverlay`. Add `canvasKey` state (`setCanvasKey(k=>k+1)` on recovery), `lost`, and `ready`. Hide ControlsBar while busy (D-25). After `roll()`, push the new events from `game.log.events` into `buildTimeline`.

### `src/game/GameApp.tsx` — analog: itself L16-23
```tsx
if (!game) return <SetupView />;
if (game.phase === 'gameOver' && !busy) return <ResultView />;
return <PlayView />;   // → <GameStage />
```
Only the component name changes. The busy hold already exists.

### HUD components — analog: the current files
- `Scoreboard.tsx` L19-31: keep `rankByStars(entries).map(({item, rank}) => …)` and `ANIMAL_EMOJI[item.animal]`. For v2, use `displayed.stars`, `--pc` inline color, and `.sb-*` classes.
- `ControlsBar.tsx` L1-28: keep the `Phase`/`NextKind`/`NEXT_LABEL` table and the "hide, never disable" rule. The `busy?` prop already exists, so give it a hidden meaning.
- `TurnHud.tsx`: keep the existing props (`animal,name,isTeam,activeMember,isExtra,round,totalRounds,onEndNow`). Add a color dot, `nextName` (from turnOrder.ts), round dots, and the last-round emphasis.
- `StatusChips.tsx`: take the content from `DiceResultPanel.tsx` (lastMove → face, start bonus, event) and render it as chips.
- `Banner.tsx` / `ContextLostOverlay.tsx`: follow MissionOverlay's props-only structure (JSX-text-only names, T-05-15). For recovery, use a big `--tap` button labeled "🔄 화면 다시 그리기".

### `src/game/scene/contextLoss.ts` / `turnOrder.ts` / `director/timeline.ts`
Pure modules. Copy the header contract comment from `src/engine/ring.ts` L1-6 (no React/DOM/clock, no mutation). contextLoss is a DOM function: `addEventListener('webglcontextlost', e => { e.preventDefault(); onLost(); })`, and it returns the unsubscribe function. Test it with `dispatchEvent(new Event('webglcontextlost',{cancelable:true}))` on a plain `<canvas>` (RESEARCH L340). turnOrder reuses the judgment from `advanceTurn` in `src/engine/game.ts` and **does not edit the engine file**.

## Shared Patterns

### Freeing GPU resources (all scene/* files)
**Source:** v1 Dice.tsx L72-78, BoardTiles.tsx L25-31. Geometry and materials created with `useMemo` are not disposed automatically, so dispose them in the `useEffect` cleanup. If you use a shared module geometry, dispose it once when the Canvas unmounts.

### Animation = `useFrame(delta)` ref timeline, no setState
**Source:** v1 Token.tsx header, Dice.tsx L88-133. Call `invalidate()` every frame (in demand mode). At the end, snap exactly and fire the completion callback once (guard with a ref flag).

### Reduced motion
**Source:** v1 Token.tsx L45-51 `prefersReducedMotion()`. Snap immediately and complete immediately.

### Input lock
**Source:** `src/game/useInputLock.ts` L19-30 (`INPUT_LOCK_MS = 400`). Wrap every play action as `guard(() => …)`.

### Purity contract (main-chunk safety)
**Source:** `src/engine/ring.ts` L1-6. Files under `layout/`, `director/`, `turnOrder.ts`, `palette.ts`, and `contextLoss.ts` must not import three. Verify with `grep -c WebGLRenderer dist/assets/index-*.js` = 0.

### Prohibitions (D-02/D-03)
v1 used drei `Html` (Token, BoardTiles). **Do not copy it.** Allowed drei imports are named imports only, such as `ContactShadows` and `Float`. Do not import `Text|Text3D|Environment|Stage|Cloud|useGLTF|Gltf|StatsGl|Html` (source-guard test, RESEARCH L573).

### CSS
**Source:** `src/game/styles/game.css` tokens (`--tap/--tap-sm/--hud-h`). Add new rules in the "Phase 6" block at the end, using only tokens and `color-mix`. Pass participant color through the inline `--pc` variable (UI-SPEC L435).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/game/layout/fitCamera.ts` | utility | transform | v1 framed the board automatically with drei `<Bounds>`. Use RESEARCH L403. |
| `src/game/scene/CameraRig.tsx` | component | resize | No fixed camera calculation exists. Combine fitCamera with `useThree(s => s.size)`. |
| `src/game/director/timeline.ts` beat model | utility | batch | There is no beat queue. Use RESEARCH L431 and ARCHITECTURE Director. |

## Metadata
**Analog search scope:** `src/game/**`, `src/engine/**`, git `d7b9b73:src/game/{scene,boardLayout.ts}`, `e230f7b:src/game/diceRotation.ts` (referenced)
**Files scanned:** about 20
**Pattern extraction date:** 2026-10-23
