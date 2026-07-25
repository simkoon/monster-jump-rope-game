<!-- GSD:project-start source:PROJECT.md -->

## Project

**파워점핑 — 신나는 줄넘기 미션**

줄넘기 강습용 3D 웹 보드게임이다. 아이들이 카드로 뽑은 줄넘기 미션(기술)을 실제로 수행해 성공하면 주사위를 굴려 보드 위를 전진하고, 결승점에 먼저 도착한 플레이어·팀이 승리한다. 강사가 미션과 이벤트 칸을 직접 추가·수정·삭제할 수 있어 수업 커리큘럼에 맞게 자유롭게 커스터마이징할 수 있다. 대상은 줄넘기 수업을 듣는 아동이며, 운영은 강사가 기기 1대로 진행한다.

**Core Value:** 카드로 뽑은 줄넘기 미션을 실제로 성공 → 주사위 → 전진 → 먼저 도착하면 승리, 이 핵심 게임 루프가 아이들에게 신나고 매끄럽게 돌아가는 것. 그리고 강사가 미션을 자유롭게 관리(추가/수정/삭제)할 수 있는 것.

### Constraints

- **Tech stack**: 웹 브라우저 + Three.js(WebGL) 3D 렌더링 — 사용자가 3D + 브라우저 실행을 원함, 설치 불필요
- **Platform**: 최신 브라우저(Chrome 등) 지원 — 강사 기기 1대 운영
- **Data**: 서버 없이 localStorage + 파일(JSON) 내보내기/가져오기 — 단일 기기 로컬 운영, 백업·공유 필요
- **Audience**: 아동 대상 — UI는 크고 단순하게, 색상은 밝고 경쾌하게(닌텐도풍), 텍스트 최소화
- **IP**: 실제 브랜드/상표/저작권 자산 미사용 — 오리지널 아트·로고만

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Executive Stance (read this first)

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

# Scaffold

# Core 3D + UI

# State + persistence + validation + forms

# Audio

# Styling (optional but recommended for the kid-friendly UI)

# OPTIONAL — only if you want physically-tumbling dice

# OPTIONAL — cartoon post-processing polish

# Dev/asset tooling (run on demand, not runtime deps)

## Facial Expressions & Character Asset Pipeline (design-critical, MEDIUM confidence)

- **Quaternius** and **Kenney** — CC0 low-poly stylized characters + props, the ideal Nintendo-ish base meshes.
- **Poly Pizza** — searchable CC0 low-poly model index (`.glb` ready).
- Body animation via **Mixamo** (idle/jump/cheer/sad), retargeted in Blender.

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

- Skip `@react-three/rapier`. Tween the die mesh, pre-roll the number in game logic. Smaller bundle, deterministic, easier to test.
- Add `@react-three/rapier@2`. Spawn the die as a rigid body, apply impulse/torque, detect rest, then read the up-face. Budget extra time for the "read the settled face" logic.
- localStorage + JSON export/import is the whole persistence story. No DB.
- Migrate the store's storage adapter to IndexedDB (Dexie) behind the same zustand `persist` interface; keep JSON export for backup/sharing.
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

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
