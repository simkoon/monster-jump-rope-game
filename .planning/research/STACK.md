# Stack Research

**Domain:** Browser-based 3D turn-based board game (no-install WebGL) with an in-app content editor (강사용 미션/이벤트 CRUD)
**Researched:** 2026-07-25
**Confidence:** HIGH (core rendering/build/state/audio verified against npm; MEDIUM on asset-pipeline + facial-expression specifics, which are design-dependent)

## Executive Stance (read this first)

This project is **90% a data-driven React app** (start menu, mode/player setup, card-draw flow, success/fail judging, a full missions/events admin with search + CRUD + probability, localStorage + JSON import/export) and **10% 3D scene** (a board, character tokens moving square-to-square, a dice-roll animation, a card-flip animation).

That ratio dictates the whole stack: **build it as a React app that happens to render 3D**, not as a Three.js game that bolts on UI. Use **React Three Fiber (R3F)** so the 3D board and the DOM editor live in one component tree and share one state store. Hand-writing the admin editor in vanilla Three.js/DOM would be the single biggest waste of effort in this project.

**Do NOT over-engineer.** This is turn-based. There is no real-time physics simulation, no netcode, no large open world. Resist rigid-body physics, game engines (Unity/Godot WebGL), and heavy state frameworks. The correct dice roll is a **canned/tweened animation**, not a physics sim.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **React** | 19.x (19.2+) | UI framework for menus + the missions/events editor | The editor is form-heavy CRUD with search/filter/validation — React's ecosystem (forms, state, lists) makes this fast to build. R3F v9 requires React 19. |
| **TypeScript** | 5.x | Type safety across game state + data model | Mission/Event/Player are structured records exported/imported as JSON — types prevent schema drift and catch import/export bugs. Non-negotiable for a data-driven app. |
| **three** | 0.185.x (r185) | WebGL 3D rendering (board, tokens, dice, camera, lights) | The de-facto browser 3D standard; every helper lib targets it. Right-sized for a stylized low-poly board scene. Verified latest on npm. |
| **@react-three/fiber (R3F)** | 9.6.x | React renderer for Three.js | Lets the 3D scene be declarative React components sharing the same store as the DOM UI. `v9` is the React-19 line. This is the load-bearing choice that unifies game + editor. |
| **@react-three/drei** | 10.7.x | R3F helper components (`useGLTF`, `useAnimations`, `OrbitControls`, `Text`, `Environment`, `Html`, `Bounds`) | Removes hundreds of lines of boilerplate for model loading, animation playback, camera framing, and overlaying DOM labels on 3D. Pairs with R3F v9 / React 19. |
| **Vite** | 8.0.x (Rolldown-powered) | Dev server + production bundler | Instant HMR, zero-config TS/JSX, trivial static hosting output. Vite 8 ships Rolldown (Rust) for much faster prod builds. The default for R3F apps. |
| **Zustand** | 5.x | Global game + editor state store | Minimal boilerplate, works identically inside R3F 3D components and DOM components, and its `persist` middleware gives you localStorage for free. This single choice covers both "state" and "persistence" requirements. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **zustand `persist` middleware** | (bundled in zustand 5) | Auto-save game/editor state to localStorage; drives JSON export/import | Always. `persist(store, { name: 'powerjumping', storage: createJSONStorage(() => localStorage) })`. Export = serialize the persisted slice to a `.json` Blob; import = `JSON.parse` + `store.setState`. Use its `version` + `migrate` to survive schema changes across strong. |
| **react-hook-form** | 7.x | Mission/Event add-edit forms | For the editor forms (name, difficulty, category, probability). Uncontrolled + fast, minimal re-renders on large lists. |
| **zod** | 4.x | Validate mission/event records on form submit AND on JSON import | Critical for import: a teacher's hand-edited/older JSON file must be validated before it corrupts state. One schema powers both form validation and import safety. |
| **howler.js** | 2.2.x | Sound effects + background music (card flip, dice, move, success fanfare, win jingle) | Reliable cross-browser playback, audio sprites, volume/mute, and it handles browser autoplay unlock. Simpler and more robust than raw Web Audio for asset playback. Game starts on a button press, so the autoplay-gesture requirement is satisfied naturally. |
| **@react-three/rapier** | 2.x | *(Optional)* real physics dice that tumble and bounce | ONLY if the client specifically wants a physically-bouncing die. v2 is the R3F-v9/React-19 line. Default recommendation is to **skip this** (see below). |
| **Tailwind CSS** | 4.x | Styling the child-friendly bright UI (big buttons, high contrast) | Fast to build large, bold, kid-friendly controls with consistent spacing/color tokens. Optional — plain CSS works too — but Tailwind speeds the "닌텐도풍 밝은" UI. |
| **@react-three/postprocessing** | latest | *(Optional)* bloom / outline for a punchy Nintendo look | Adds cartoon pop (glow on the finish line, selection outline on the active token). Optional polish, not core. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Blender** | 4.x | Author/adjust low-poly characters, export `.glb` | Free. Use the glTF exporter; enable Draco compression. The one tool for the whole 3D asset pipeline. |
| **gltfjsx** (`npx gltfjsx model.glb`) | Turn a `.glb` into a typed R3F component | Auto-generates a JSX component exposing named meshes, materials, and animation clips — huge time saver for wiring characters + expressions. |
| **Mixamo** (free web service) | Auto-rig + humanoid animations (idle / jump / cheer / sad) | Upload a character, get a skeleton + ready animations retargeted; export FBX → import to Blender → export `.glb`. Covers the success/fail/move reaction animations. |
| **glTF-Transform** (CLI) | Optimize `.glb` (Draco/Meshopt, texture resize) | Keep first-load small so the game opens instantly with no install. |
| **vite-plugin-pwa** *(optional)* | Offline / installable-to-home-screen | Nice-to-have for a single classroom device — the game keeps working without network once loaded. |

## Installation

```bash
# Scaffold
npm create vite@latest powerjumping -- --template react-ts

# Core 3D + UI
npm install three @react-three/fiber @react-three/drei

# State + persistence + validation + forms
npm install zustand react-hook-form zod

# Audio
npm install howler
npm install -D @types/howler @types/three

# Styling (optional but recommended for the kid-friendly UI)
npm install tailwindcss @tailwindcss/vite

# OPTIONAL — only if you want physically-tumbling dice
npm install @react-three/rapier

# OPTIONAL — cartoon post-processing polish
npm install @react-three/postprocessing postprocessing

# Dev/asset tooling (run on demand, not runtime deps)
npx gltfjsx@latest character.glb --types
npm install -g @gltf-transform/cli   # or use npx
```

## Facial Expressions & Character Asset Pipeline (design-critical, MEDIUM confidence)

The requirement is stylized male/female kids holding jump-ropes, with reactions (success / fail / moving). Two viable approaches — **pick the simpler one first**:

1. **Texture/material swap (RECOMMENDED for v1).** Model a simple face on a flat/low-poly head and put the eyes+mouth on a texture. Swap the texture (or toggle small mesh "sticker" planes) between `happy / sad / surprised / neutral`. Trivial to drive from game state, cheapest to author, and reads perfectly at the Nintendo-cartoon altitude. No rigging of the face needed.
2. **Morph targets / blend shapes.** Author a few shape keys in Blender (smile, frown, blink), export in the `.glb`, and drive `mesh.morphTargetInfluences` (exposed via gltfjsx). More expressive, more authoring effort. Use only if texture-swap feels too flat.

Do **not** reach for ARKit-style 52-blendshape facial rigs or Ready Player Me — that's adult-avatar tech, wrong art style, and adds a heavy dependency.

**Asset sourcing (all CC0 / commercially free — respects the "no real brand/IP" constraint):**
- **Quaternius** and **Kenney** — CC0 low-poly stylized characters + props, the ideal Nintendo-ish base meshes.
- **Poly Pizza** — searchable CC0 low-poly model index (`.glb` ready).
- Body animation via **Mixamo** (idle/jump/cheer/sad), retargeted in Blender.

**Format:** ship **`.glb`** (binary glTF) with **Draco** compression. Load with drei `useGLTF`, play clips with drei `useAnimations`.

**Title logo ("파워점핑"):** an original vector/raster art asset (SVG or PNG), not a library. Design in Figma/Illustrator/Inkscape; render as SVG for crispness. Out of scope for code deps — flag it as an art deliverable for the design phase.

## The Dice Decision (explicit — do not over-build)

| Option | Verdict | Notes |
|--------|---------|-------|
| **Canned/tweened dice animation** | ✅ **DEFAULT** | Spin the die mesh with a quick eased rotation, then snap to the face matching the pre-rolled random number (`Math.random`/`crypto`). Deterministic, controllable, zero physics deps, matches turn-based pacing. Outcome logic stays in game state, not in a physics engine. |
| **@react-three/rapier v2 physics dice** | ⚠️ optional | Only if a *real bouncing die* is a stated wow-factor. Cost: a physics world, non-deterministic settling, extra bundle. You'd still have to read the top face after it rests. Usually not worth it here. |
| **cannon-es** | ❌ don't | Older/lower-level; Rapier (Rust/WASM) is the modern, faster, maintained choice if you insist on physics. No reason to pick cannon for a new project. |

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| React Three Fiber | **Vanilla Three.js** | Only if you had *no* significant DOM UI. Here the heavy admin editor makes vanilla a net loss. |
| React Three Fiber | **Babylon.js** | If you needed a batteries-included engine (built-in physics, GUI, inspector) and were comfortable outside React. Heavier; overkill for a low-poly board. |
| Zustand | **Redux Toolkit** | Large team needing strict conventions/time-travel debugging. Overkill here; Zustand is lighter and R3F-friendly. |
| Zustand | **Jotai / Valtio** | Fine alternatives from the same authors; Zustand's `persist` + single-store model best fits the save/export/import requirement. |
| localStorage + JSON | **IndexedDB (Dexie)** | If mission/event datasets grew to thousands of records or stored images/blobs. For a class curriculum (dozens–hundreds of text records) localStorage is simpler and directly serializable to the required JSON export. |
| Howler.js | **Tone.js** | Only if you need generative/synth music. For playing fixed SFX/BGM files, Howler is simpler. |
| Vite | **Next.js** | If you needed SSR/routing/SEO. This is a single-page, client-only, no-server app — SSR is pure overhead. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Unity / Godot WebGL export** | Huge multi-MB downloads, long load, feels install-like — violates the "설치 없이 즉시 실행" constraint; massive overkill for a turn-based board game. | React Three Fiber + Three.js |
| **Vanilla Three.js for the whole app** | You'd hand-build the entire missions/events editor, forms, search, and list virtualization from scratch. | R3F so React owns the UI |
| **Rigid-body physics for dice (by default)** | Non-deterministic, extra bundle/complexity, no gameplay benefit in a turn-based game. | Canned/tweened dice roll |
| **Redux (classic) / MobX** | Boilerplate and ceremony disproportionate to a single-device local app. | Zustand |
| **IndexedDB/Dexie (for v1)** | Over-engineered for a few hundred text records that must round-trip as one JSON file. | localStorage via zustand `persist` |
| **Ready Player Me / ARKit blendshape rigs** | Wrong art style (realistic adult avatars), heavy dependency, IP/style mismatch with "닌텐도풍 아동". | CC0 low-poly (Quaternius/Kenney) + texture-swap faces |
| **FBX/OBJ at runtime** | Larger, no standard PBR/animation packaging, slower web loads. | `.glb` (glTF binary) + Draco |
| **Real brand/character assets** | Explicit IP constraint in PROJECT.md. | Original art + CC0 sources only |

## Stack Patterns by Variant

**If the client is fine with a stylized-but-simple die (default):**
- Skip `@react-three/rapier`. Tween the die mesh, pre-roll the number in game logic. Smaller bundle, deterministic, easier to test.

**If the client explicitly wants a "real" bouncing die as a wow moment:**
- Add `@react-three/rapier@2`. Spawn the die as a rigid body, apply impulse/torque, detect rest, then read the up-face. Budget extra time for the "read the settled face" logic.

**If mission/event data stays small (dozens–hundreds of text records — expected):**
- localStorage + JSON export/import is the whole persistence story. No DB.

**If a teacher accumulates thousands of records or wants images per mission:**
- Migrate the store's storage adapter to IndexedDB (Dexie) behind the same zustand `persist` interface; keep JSON export for backup/sharing.

**If offline/kiosk reliability matters on the classroom device:**
- Add `vite-plugin-pwa` so the app caches and runs without network after first load.

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| react@19.x | @react-three/fiber@9.x | R3F v9 is the React-19 line; do not pair with React 18 (that's R3F v8). |
| @react-three/fiber@9.x | @react-three/drei@10.x | drei 10 targets R3F v9 / React 19. |
| @react-three/fiber@9.x | @react-three/rapier@2.x | rapier v2 = R3F v9 / React 19; rapier v1 = R3F v8 / React 18. |
| @react-three/fiber@9.x | three@0.185.x | Current three works with R3F 9; keep three within the range R3F's peer deps declare — bump them together. |
| vite@8.x | @tailwindcss/vite@4.x | Tailwind v4 uses the first-party Vite plugin (no PostCSS config needed). |
| zustand@5.x | react@19.x | v5 supports React 18/19; `persist` + `createJSONStorage(() => localStorage)` is the persistence path. |

## Sources

- npm `three` — latest **0.185.1** (verified current). Confidence: HIGH
- GitHub pmndrs/react-three-fiber releases + docs — **@react-three/fiber@9** pairs with **react@19**; compatible with React 19.0–19.2. Confidence: HIGH
- npm/unpkg `@react-three/drei@10.7.x` — v10 line for R3F v9 / React 19. Confidence: HIGH
- GitHub pmndrs/react-three-rapier releases — **v2** adds R3F v9 + React 19 support; v1 for React 18. Confidence: HIGH
- vite.dev blog / releases — **Vite 8.0.x** (Rolldown-powered) current stable. Confidence: HIGH
- Zustand docs (persisting-store-data) — `persist` middleware defaults to localStorage, supports versioning/migration. Confidence: HIGH
- howlerjs.com / MDN Web Audio best practices — Howler 2.2.x for cross-browser SFX/BGM + autoplay unlock. Confidence: HIGH
- Quaternius.com, Kenney, Poly Pizza, Mixamo, Blender glTF exporter docs — CC0 low-poly pipeline to `.glb` + Draco; Mixamo rigging/animation. Confidence: MEDIUM (design-dependent choices)

---
*Stack research for: browser-based 3D turn-based board game with in-app content editor*
*Researched: 2026-07-25*
